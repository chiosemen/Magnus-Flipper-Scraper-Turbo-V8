import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { JobRouter } from './router';
import { JobPayloadSchema } from '@repo/types';
import { logger } from '@repo/logger';

const app = new Hono();
const router = new JobRouter();

app.get('/health', (c) => c.json({ status: 'ok', worker: 'active' }));

app.post('/v1/process', async (c) => {
  try {
    const body = await c.req.json();
    
    // Parse Payload
    const result = JobPayloadSchema.safeParse(body);
    if (!result.success) {
      logger.error('Invalid Job Payload', new Error('Validation Failed'), { errors: result.error });
      return c.json({ error: 'Invalid Payload', details: result.error }, 400);
    }

    const payload = result.data;
    logger.info(`Processing Job ${payload.jobId}`, { type: payload.type, source: payload.source });

    // Execute Job
    // Note: Cloud Tasks expects a 200 OK fast.
    // If we want to process async long-running, we might need to detach here
    // But since this IS the worker, we usually process here.
    // Cloud Tasks timeout is 10 mins (default) to 30 mins.
    
    await router.route(payload);

    return c.json({ success: true, jobId: payload.jobId });
  } catch (error) {
    logger.error('Worker Error', error as Error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

const port = Number(process.env.PORT) || 8080;
logger.info(`Worker listening on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
