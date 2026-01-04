import { db, schema } from '../lib/db';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '../utils/errors';
import { logger } from '@repo/logger';
import {
  evaluateGate,
  OBSERVABILITY_GATE_ERROR_CODES,
  type ConfigSource,
  type ObservabilityGateConfig,
  type ObservabilityMetrics,
} from './observabilityGate.logic';

const CACHE_TTL_MS = 30_000;
let cachedConfig: ObservabilityGateConfig | null = null;
let cachedAt = 0;
let cachedSource: ConfigSource = 'fallback';

const isValidConfig = (row: any): row is ObservabilityGateConfig => {
  return row
    && typeof row.enabled === 'boolean'
    && Number.isFinite(row.windowMinutes)
    && Number.isFinite(row.maxErrorRatePercent)
    && Number.isFinite(row.maxMedianMs)
    && Number.isFinite(row.maxP95Ms)
    && Number.isFinite(row.maxQueueDepth)
    && Number.isFinite(row.maxWorkerCrashes)
    && Number.isFinite(row.maxJobsPerMinute);
};

const loadConfigFromDb = async (): Promise<{ config: ObservabilityGateConfig; source: ConfigSource }> => {
  try {
    const row = await db.query.observabilityGates.findFirst({
      where: eq(schema.observabilityGates.id, 'default'),
    });

    if (!isValidConfig(row)) {
      logger.warn('Observability gate config missing or malformed, failing closed');
      return {
        config: {
          enabled: true,
          windowMinutes: 15,
          maxErrorRatePercent: 0,
          maxMedianMs: 0,
          maxP95Ms: 0,
          maxQueueDepth: 0,
          maxWorkerCrashes: 0,
          maxJobsPerMinute: 0,
        },
        source: 'fallback',
      };
    }

    return {
      config: {
        enabled: row.enabled,
        windowMinutes: Number(row.windowMinutes),
        maxErrorRatePercent: Number(row.maxErrorRatePercent),
        maxMedianMs: Number(row.maxMedianMs),
        maxP95Ms: Number(row.maxP95Ms),
        maxQueueDepth: Number(row.maxQueueDepth),
        maxWorkerCrashes: Number(row.maxWorkerCrashes),
        maxJobsPerMinute: Number(row.maxJobsPerMinute),
      },
      source: 'db',
    };
  } catch (error) {
    logger.error('Observability gate config fetch failed, failing closed', error as Error);
    return {
      config: {
        enabled: true,
        windowMinutes: 15,
        maxErrorRatePercent: 0,
        maxMedianMs: 0,
        maxP95Ms: 0,
        maxQueueDepth: 0,
        maxWorkerCrashes: 0,
        maxJobsPerMinute: 0,
      },
      source: 'fallback',
    };
  }
};

export const getGateConfig = async (): Promise<{ config: ObservabilityGateConfig; source: ConfigSource }> => {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) {
    return { config: cachedConfig, source: cachedSource };
  }

  const { config, source } = await loadConfigFromDb();
  cachedConfig = config;
  cachedAt = now;
  cachedSource = source;
  return { config, source };
};

export const __resetObservabilityGateCacheForTests = () => {
  cachedConfig = null;
  cachedAt = 0;
  cachedSource = 'fallback';
};

const zeroMetrics = (): ObservabilityMetrics => ({
  total: 0,
  failed: 0,
  errorRatePercent: 0,
  successRatePercent: 100,
  medianMs: 0,
  p95Ms: 0,
  queueDepth: 0,
  workerCrashes: 0,
  jobsPerMinute: 0,
});

const loadMetrics = async (windowMinutes: number): Promise<ObservabilityMetrics> => {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  const minuteStart = new Date(Date.now() - 60 * 1000);

  const counts = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= ${windowStart}) AS total,
      COUNT(*) FILTER (WHERE created_at >= ${windowStart} AND status = 'failed') AS failed,
      COUNT(*) FILTER (WHERE status IN ('queued', 'pending')) AS queue_depth,
      COUNT(*) FILTER (
        WHERE created_at >= ${windowStart}
          AND status = 'failed'
          AND (error ->> 'code') = 'WORKER_CRASH'
      ) AS worker_crashes,
      COUNT(*) FILTER (WHERE created_at >= ${minuteStart}) AS jobs_per_minute
    FROM ${schema.jobs};
  `);

  const durations = await db.execute(sql`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) AS p50_ms,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) AS p95_ms
    FROM ${schema.jobs}
    WHERE started_at IS NOT NULL AND completed_at IS NOT NULL AND created_at >= ${windowStart};
  `);

  const total = Number(counts[0]?.total || 0);
  const failed = Number(counts[0]?.failed || 0);
  const queueDepth = Number(counts[0]?.queue_depth || 0);
  const workerCrashes = Number(counts[0]?.worker_crashes || 0);
  const jobsPerMinute = Number(counts[0]?.jobs_per_minute || 0);
  const medianMs = Number(durations[0]?.p50_ms || 0);
  const p95Ms = Number(durations[0]?.p95_ms || 0);

  const errorRatePercent = total > 0 ? (failed / total) * 100 : 0;
  const successRatePercent = total > 0 ? 100 - errorRatePercent : 100;

  return {
    total,
    failed,
    errorRatePercent,
    successRatePercent,
    medianMs,
    p95Ms,
    queueDepth,
    workerCrashes,
    jobsPerMinute,
  };
};

export const getGateDecision = async () => {
  const { config, source } = await getGateConfig();

  try {
    if (source === 'fallback') {
      return evaluateGate(config, zeroMetrics(), source);
    }

    const metrics = await loadMetrics(config.windowMinutes);
    return evaluateGate(config, metrics, source);
  } catch (error) {
    logger.error('Observability metrics fetch failed, failing closed', error as Error);
    return evaluateGate(config, zeroMetrics(), 'fallback');
  }
};

export const assertGateOpen = async () => {
  const decision = await getGateDecision();

  if (!decision.allowed) {
    logger.warn('Observability gate closed', {
      reasons: decision.reasons,
      metrics: decision.metrics,
    });

    throw new AppError(
      'Observability gate closed',
      503,
      decision.code || OBSERVABILITY_GATE_ERROR_CODES.GATE_CLOSED,
      { reasons: decision.reasons, metrics: decision.metrics }
    );
  }
};
