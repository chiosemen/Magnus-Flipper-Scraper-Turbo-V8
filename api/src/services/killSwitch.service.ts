import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';
import { AppError } from '../utils/errors';
import { logger } from '@repo/logger';
import {
  KILL_SWITCH_ERROR_CODES,
  SAFE_OFF_CONFIG,
  evaluateKillSwitch,
  type ConfigSource,
  type KillSwitchConfig,
  type WorkerClass,
} from './killSwitch.logic';

const CACHE_TTL_MS = 30_000;
let cachedConfig: KillSwitchConfig | null = null;
let cachedAt = 0;
let cachedSource: ConfigSource = 'fallback';

const isValidConfig = (row: any): row is KillSwitchConfig => {
  return row
    && typeof row.scrapersEnabled === 'boolean'
    && typeof row.facebookEnabled === 'boolean'
    && typeof row.vintedEnabled === 'boolean'
    && typeof row.realtimeEnabled === 'boolean'
    && typeof row.scheduledEnabled === 'boolean'
    && typeof row.manualEnabled === 'boolean';
};

const loadConfigFromDb = async (): Promise<{ config: KillSwitchConfig; source: ConfigSource }> => {
  try {
    const row = await db.query.scraperKillSwitches.findFirst({
      where: eq(schema.scraperKillSwitches.id, 'default'),
    });

    if (!isValidConfig(row)) {
      logger.warn('Kill-switch config missing or malformed, defaulting to SAFE OFF');
      return { config: SAFE_OFF_CONFIG, source: 'fallback' };
    }

    return {
      config: {
        scrapersEnabled: row.scrapersEnabled,
        facebookEnabled: row.facebookEnabled,
        vintedEnabled: row.vintedEnabled,
        realtimeEnabled: row.realtimeEnabled,
        scheduledEnabled: row.scheduledEnabled,
        manualEnabled: row.manualEnabled,
        demoModeEnabled: typeof row.demoModeEnabled === 'boolean' ? row.demoModeEnabled : false,
        demoModeExpiresAt: row.demoModeExpiresAt ? new Date(row.demoModeExpiresAt) : null,
      },
      source: 'db',
    };
  } catch (error) {
    logger.error('Kill-switch config fetch failed, defaulting to SAFE OFF', error as Error);
    return { config: SAFE_OFF_CONFIG, source: 'fallback' };
  }
};

export const getKillSwitchConfig = async (): Promise<{ config: KillSwitchConfig; source: ConfigSource }> => {
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

export { resolveWorkerClass } from './killSwitch.logic';

export const __resetKillSwitchCacheForTests = () => {
  cachedConfig = null;
  cachedAt = 0;
  cachedSource = 'fallback';
};

export const assertScrapingEnabled = async (source: string, workerClass: WorkerClass) => {
  const { config, source: configSource } = await getKillSwitchConfig();
  const decision = evaluateKillSwitch(config, source, workerClass, configSource);

  if (!decision.allowed) {
    throw new AppError(
      decision.message || 'Scraping disabled by kill switch',
      503,
      decision.code || KILL_SWITCH_ERROR_CODES.SCRAPERS_DISABLED,
      { reason: decision.reason }
    );
  }
};
