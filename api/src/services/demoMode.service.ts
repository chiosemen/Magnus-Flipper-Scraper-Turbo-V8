import { db, schema } from '../lib/db';
import { and, eq, sql } from 'drizzle-orm';
import { AppError, ForbiddenError } from '../utils/errors';
import { getKillSwitchConfig } from './killSwitch.service';
import { logger } from '@repo/logger';
import crypto from 'crypto';
import { type MarketplaceRateConfig } from './marketplaceRate.logic';

export const DEMO_ERROR_CODES = {
  MODE_DISABLED: 'DEMO_MODE_DISABLED',
  SOURCE_BLOCKED: 'DEMO_SOURCE_BLOCKED',
  MAX_JOBS: 'DEMO_MAX_JOBS',
  MAX_CONCURRENCY: 'DEMO_MAX_CONCURRENCY',
  QUEUE_UNAVAILABLE: 'DEMO_QUEUE_UNAVAILABLE',
} as const;

type DemoState = {
  active: boolean;
  expiresAt: Date | null;
};

const parseAllowedSources = () => {
  const raw = process.env.DEMO_ALLOWED_SOURCES || 'facebook';
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
};

const getDemoLimits = () => {
  return {
    maxJobsPerUser: Number(process.env.DEMO_MAX_JOBS_PER_USER || 3),
    maxConcurrentJobs: Number(process.env.DEMO_MAX_CONCURRENT || 1),
    windowMinutes: Number(process.env.DEMO_SESSION_WINDOW_MINUTES || 60),
    timeoutSec: Number(process.env.DEMO_JOB_TIMEOUT_SEC || 60),
  };
};

export const getDemoRateOverrides = (): Partial<MarketplaceRateConfig> => ({
  maxConcurrency: Number(process.env.DEMO_RATE_MAX_CONCURRENCY || 1),
  jobsPerMinute: Number(process.env.DEMO_RATE_JOBS_PER_MINUTE || 2),
  errorThreshold: Number(process.env.DEMO_RATE_ERROR_THRESHOLD || 5),
  cooldownSeconds: Number(process.env.DEMO_RATE_COOLDOWN_SECONDS || 300),
});

const requireDemoQueue = () => {
  if (!process.env.DEMO_GCP_QUEUE_NAME) {
    throw new AppError(
      'Demo mode requires DEMO_GCP_QUEUE_NAME',
      503,
      DEMO_ERROR_CODES.QUEUE_UNAVAILABLE
    );
  }
};

const disableExpiredDemoMode = async () => {
  await db.update(schema.scraperKillSwitches)
    .set({ demoModeEnabled: false, demoModeExpiresAt: null, updatedAt: new Date() })
    .where(eq(schema.scraperKillSwitches.id, 'default'));
};

export const getDemoModeState = async (): Promise<DemoState> => {
  const { config } = await getKillSwitchConfig();
  const expiresAt = config.demoModeExpiresAt ? new Date(config.demoModeExpiresAt) : null;

  if (config.demoModeEnabled && expiresAt && expiresAt.getTime() <= Date.now()) {
    logger.warn('Demo mode expired; disabling');
    await disableExpiredDemoMode();
    return { active: false, expiresAt: null };
  }

  return { active: !!config.demoModeEnabled, expiresAt };
};

export const assertDemoModeAllowsDispatch = async (userId: string, source: string) => {
  const state = await getDemoModeState();
  if (!state.active) return { active: false };

  const allowedSources = parseAllowedSources();
  if (!allowedSources.includes(source)) {
    throw new AppError(
      'Marketplace blocked in demo mode',
      403,
      DEMO_ERROR_CODES.SOURCE_BLOCKED,
      { source }
    );
  }

  requireDemoQueue();

  const limits = getDemoLimits();
  const windowStart = new Date(Date.now() - limits.windowMinutes * 60 * 1000);

  const counts = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= ${windowStart}) AS total_window,
      COUNT(*) FILTER (WHERE status = 'running') AS running
    FROM ${schema.jobs}
    WHERE ${schema.jobs.userId} = ${userId};
  `);

  const totalWindow = Number(counts[0]?.total_window || 0);
  const running = Number(counts[0]?.running || 0);

  if (totalWindow >= limits.maxJobsPerUser) {
    throw new AppError(
      'Demo mode job limit reached',
      429,
      DEMO_ERROR_CODES.MAX_JOBS,
      { limit: limits.maxJobsPerUser }
    );
  }

  if (running >= limits.maxConcurrentJobs) {
    throw new AppError(
      'Demo mode concurrency limit reached',
      429,
      DEMO_ERROR_CODES.MAX_CONCURRENCY,
      { limit: limits.maxConcurrentJobs }
    );
  }

  return {
    active: true,
    demoSessionId: crypto.randomUUID(),
    timeoutSec: limits.timeoutSec,
  };
};

export const assertDemoModeAllowsStripe = async () => {
  const state = await getDemoModeState();
  if (!state.active) return;

  throw new ForbiddenError('Stripe actions are disabled in demo mode');
};
