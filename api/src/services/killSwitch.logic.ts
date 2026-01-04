export type WorkerClass = 'realtime' | 'scheduled' | 'manual';

export const KILL_SWITCH_ERROR_CODES = {
  CONFIG_UNAVAILABLE: 'KILL_SWITCH_CONFIG_UNAVAILABLE',
  SCRAPERS_DISABLED: 'SCRAPERS_DISABLED',
  MARKETPLACE_DISABLED: 'MARKETPLACE_DISABLED',
  WORKER_DISABLED: 'WORKER_DISABLED',
} as const;

export type KillSwitchConfig = {
  scrapersEnabled: boolean;
  facebookEnabled: boolean;
  vintedEnabled: boolean;
  realtimeEnabled: boolean;
  scheduledEnabled: boolean;
  manualEnabled: boolean;
  demoModeEnabled?: boolean;
  demoModeExpiresAt?: Date | null;
};

export type ConfigSource = 'cache' | 'db' | 'fallback';

export type KillSwitchDecision = {
  allowed: boolean;
  code?: string;
  message?: string;
  reason?: string;
};

export const SAFE_OFF_CONFIG: KillSwitchConfig = {
  scrapersEnabled: false,
  facebookEnabled: false,
  vintedEnabled: false,
  realtimeEnabled: false,
  scheduledEnabled: false,
  manualEnabled: false,
  demoModeEnabled: false,
  demoModeExpiresAt: null,
};

export const resolveWorkerClass = (input: { type: string; monitorId?: string | null }): WorkerClass => {
  if (input.monitorId) return 'scheduled';
  if (input.type === 'price_check') return 'realtime';
  return 'manual';
};

export const evaluateKillSwitch = (
  config: KillSwitchConfig,
  source: string,
  workerClass: WorkerClass,
  configSource: ConfigSource
): KillSwitchDecision => {
  if (configSource === 'fallback') {
    return {
      allowed: false,
      code: KILL_SWITCH_ERROR_CODES.CONFIG_UNAVAILABLE,
      message: 'Kill-switch config unavailable; scraping disabled',
      reason: 'config_unavailable',
    };
  }

  if (!config.scrapersEnabled) {
    return {
      allowed: false,
      code: KILL_SWITCH_ERROR_CODES.SCRAPERS_DISABLED,
      message: 'Scraping disabled by global kill switch',
      reason: 'scrapers_disabled',
    };
  }

  if (source === 'facebook' && !config.facebookEnabled) {
    return {
      allowed: false,
      code: KILL_SWITCH_ERROR_CODES.MARKETPLACE_DISABLED,
      message: 'Facebook scraping disabled by kill switch',
      reason: 'facebook_disabled',
    };
  }

  if (source === 'vinted' && !config.vintedEnabled) {
    return {
      allowed: false,
      code: KILL_SWITCH_ERROR_CODES.MARKETPLACE_DISABLED,
      message: 'Vinted scraping disabled by kill switch',
      reason: 'vinted_disabled',
    };
  }

  if (workerClass === 'realtime' && !config.realtimeEnabled) {
    return {
      allowed: false,
      code: KILL_SWITCH_ERROR_CODES.WORKER_DISABLED,
      message: 'Realtime worker disabled by kill switch',
      reason: 'realtime_disabled',
    };
  }

  if (workerClass === 'scheduled' && !config.scheduledEnabled) {
    return {
      allowed: false,
      code: KILL_SWITCH_ERROR_CODES.WORKER_DISABLED,
      message: 'Scheduled worker disabled by kill switch',
      reason: 'scheduled_disabled',
    };
  }

  if (workerClass === 'manual' && !config.manualEnabled) {
    return {
      allowed: false,
      code: KILL_SWITCH_ERROR_CODES.WORKER_DISABLED,
      message: 'Manual worker disabled by kill switch',
      reason: 'manual_disabled',
    };
  }

  return { allowed: true };
};
