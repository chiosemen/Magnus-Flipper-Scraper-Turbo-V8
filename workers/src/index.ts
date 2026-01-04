import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { JobRouter } from './router';
import { JobPayloadSchema } from '@repo/types';
import { logger } from '@repo/logger';
import { assertScrapingEnabled } from './services/killSwitch.service';
import { assertGateOpen } from './services/observabilityGate.service';
import { assertMarketplaceWithinLimits } from './services/marketplaceRate.service';
import { assertDemoModeAllowsExecution, getDemoRateOverrides, DemoModeError, DEMO_ERROR_CODES } from './services/demoMode.service';
import { assertConcurrencyWithinLimits, ConcurrencyBackoffError } from './services/concurrency.service';

const app = new Hono();
const router = new JobRouter();

app.get('/health', (c) => c.json({ status: 'ok', worker: 'active' }));

app.post('/v1/process', async (c) => {
  try {
    const workerToken = c.req.header('x-worker-token');
    const sharedSecret = process.env.WORKER_SHARED_SECRET;
    if (!sharedSecret || !workerToken || workerToken !== sharedSecret) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    
    // Parse Payload
    const result = JobPayloadSchema.safeParse(body);
    if (!result.success) {
      logger.error('Invalid Job Payload', new Error('Validation Failed'), { errors: result.error });
      return c.json({ error: 'Invalid Payload', details: result.error }, 400);
    }

    const payload = result.data;
    logger.info(`Processing Job ${payload.jobId}`, {
      type: payload.type,
      source: payload.source,
      canary: payload.meta?.canary,
      demo: payload.meta?.demo,
    });

    await assertScrapingEnabled(payload);
    await assertGateOpen();

    const demoState = await assertDemoModeAllowsExecution(payload.meta.userId, payload.source);
    const rateOverrides = demoState.active ? getDemoRateOverrides() : undefined;
    await assertMarketplaceWithinLimits(payload.source, rateOverrides);
    await assertConcurrencyWithinLimits(payload);

    // Execute Job
    // Note: Cloud Tasks expects a 200 OK fast.
    // If we want to process async long-running, we might need to detach here
    // But since this IS the worker, we usually process here.
    // Cloud Tasks timeout is 10 mins (default) to 30 mins.
    
    const timeoutSec = payload.meta.timeoutSec || demoState.timeoutSec || null;
    if (timeoutSec) {
      await Promise.race([
        router.route(payload),
        new Promise((_, reject) => {
          setTimeout(() => reject(new DemoModeError(DEMO_ERROR_CODES.TIMEOUT, 'Demo mode timeout')), timeoutSec * 1000);
        }),
      ]);
    } else {
      await router.route(payload);
    }

    return c.json({ success: true, jobId: payload.jobId });
  } catch (error) {
    const errorCode = (error as any)?.code;
    if (error instanceof ConcurrencyBackoffError) {
      const retryAfter = error.retryAfterSec;
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: error.message, code: error.code, reason: error.reason, retryAfterSec: retryAfter }, 429);
    }
    if (errorCode) {
      logger.warn('Worker rejected job', { code: errorCode, message: (error as Error).message });
      return c.json({ error: (error as Error).message, code: errorCode }, 200);
    }
    logger.error('Worker Error', error as Error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

export const workerApp = app;
export const jobRouter = router;

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 8080;
  logger.info(`Worker listening on port ${port}`);

  serve({
    fetch: app.fetch,
    port
  });
}
