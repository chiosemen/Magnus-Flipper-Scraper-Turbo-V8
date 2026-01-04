import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';
import { logger } from '@repo/logger';
import { JobPayload } from '@repo/types';
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

export const __resetKillSwitchCacheForTests = () => {
  cachedConfig = null;
  cachedAt = 0;
  cachedSource = 'fallback';
};

export const resolveWorkerClass = (payload: JobPayload): WorkerClass => {
  if (payload.params.monitorId) return 'scheduled';
  if (payload.type === 'price_check') return 'realtime';
  return 'manual';
};

export class KillSwitchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const assertScrapingEnabled = async (payload: JobPayload) => {
  const { config, source: configSource } = await getKillSwitchConfig();
  const workerClass = resolveWorkerClass(payload);
  const decision = evaluateKillSwitch(config, payload.source, workerClass, configSource);

  if (!decision.allowed) {
    throw new KillSwitchError(
      decision.code || KILL_SWITCH_ERROR_CODES.SCRAPERS_DISABLED,
      decision.message || 'Scraping disabled by kill switch'
    );
  }
};
