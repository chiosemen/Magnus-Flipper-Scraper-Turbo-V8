import { db, schema } from '../lib/db';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@repo/logger';
import {
  MARKETPLACE_RATE_ERROR_CODES,
  applyDemoOverrides,
  evaluateMarketplaceRate,
  type MarketplaceRateConfig,
  type MarketplaceRateMetrics,
} from './marketplaceRate.logic';

const CACHE_TTL_MS = 30_000;
const ERROR_WINDOW_MINUTES = 10;

let cachedConfig: { source: string; config: MarketplaceRateConfig } | null = null;
let cachedAt = 0;

const buildSafeConfig = (): MarketplaceRateConfig => ({
  enabled: false,
  maxConcurrency: 0,
  jobsPerMinute: 0,
  errorThreshold: 0,
  cooldownSeconds: 0,
  cooldownUntil: null,
});

const isValidConfig = (row: any) => {
  return row
    && typeof row.enabled === 'boolean'
    && Number.isFinite(row.maxConcurrency)
    && Number.isFinite(row.jobsPerMinute)
    && Number.isFinite(row.errorThreshold)
    && Number.isFinite(row.cooldownSeconds);
};

const loadConfig = async (source: string): Promise<MarketplaceRateConfig> => {
  const row = await db.query.marketplaceRateLimits.findFirst({
    where: eq(schema.marketplaceRateLimits.id, source),
  });

  const fallback = await db.query.marketplaceRateLimits.findFirst({
    where: eq(schema.marketplaceRateLimits.id, 'default'),
  });

  const target = row || fallback;

  if (!isValidConfig(target)) {
    logger.warn('Marketplace rate config missing or malformed, failing closed', { source });
    return buildSafeConfig();
  }

  // isValidConfig ensures target is defined and has required properties
  return {
    enabled: target!.enabled,
    maxConcurrency: Number(target!.maxConcurrency),
    jobsPerMinute: Number(target!.jobsPerMinute),
    errorThreshold: Number(target!.errorThreshold),
    cooldownSeconds: Number(target!.cooldownSeconds),
    cooldownUntil: target!.cooldownUntil ? new Date(target!.cooldownUntil) : null,
  };
};

const getConfig = async (source: string): Promise<MarketplaceRateConfig> => {
  const now = Date.now();
  if (cachedConfig && cachedConfig.source === source && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig.config;
  }

  const config = await loadConfig(source);
  cachedConfig = { source, config };
  cachedAt = now;
  return config;
};

const loadMetrics = async (source: string): Promise<MarketplaceRateMetrics> => {
  const windowStart = new Date(Date.now() - ERROR_WINDOW_MINUTES * 60 * 1000);
  const minuteStart = new Date(Date.now() - 60 * 1000);

  const counts = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'running') AS running,
      COUNT(*) FILTER (WHERE created_at >= ${minuteStart}) AS jobs_per_minute,
      COUNT(*) FILTER (WHERE created_at >= ${windowStart}) AS total_window,
      COUNT(*) FILTER (WHERE created_at >= ${windowStart} AND status = 'failed') AS failed_window
    FROM ${schema.jobs}
    WHERE ${schema.jobs.source} = ${source};
  `);

  const running = Number(counts[0]?.running || 0);
  const jobsPerMinute = Number(counts[0]?.jobs_per_minute || 0);
  const totalWindow = Number(counts[0]?.total_window || 0);
  const failedWindow = Number(counts[0]?.failed_window || 0);

  const errorRatePercent = totalWindow > 0 ? (failedWindow / totalWindow) * 100 : 0;

  return {
    running,
    jobsPerMinute,
    errorRatePercent,
  };
};

const updateCooldown = async (source: string, cooldownSeconds: number) => {
  const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000);
  await db.update(schema.marketplaceRateLimits)
    .set({ cooldownUntil, updatedAt: new Date() })
    .where(eq(schema.marketplaceRateLimits.id, source));
  return cooldownUntil;
};

export class MarketplaceRateError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const assertMarketplaceWithinLimits = async (
  source: string,
  overrides?: Partial<MarketplaceRateConfig>
) => {
  const config = applyDemoOverrides(await getConfig(source), overrides);

  if (!config.enabled) {
    throw new MarketplaceRateError(
      MARKETPLACE_RATE_ERROR_CODES.DISABLED,
      'Marketplace disabled by rate shaping'
    );
  }

  const metrics = await loadMetrics(source);
  const decision = evaluateMarketplaceRate(config, metrics, new Date());

  if (!decision.allowed) {
    if (decision.code === MARKETPLACE_RATE_ERROR_CODES.ERROR_SPIKE) {
      const cooldownUntil = await updateCooldown(source, config.cooldownSeconds);
      throw new MarketplaceRateError(
        MARKETPLACE_RATE_ERROR_CODES.ERROR_SPIKE,
        `Marketplace cooldown until ${cooldownUntil.toISOString()}`
      );
    }

    throw new MarketplaceRateError(
      decision.code || MARKETPLACE_RATE_ERROR_CODES.CONFIG_UNAVAILABLE,
      'Marketplace rate shaping blocked dispatch'
    );
  }
};
