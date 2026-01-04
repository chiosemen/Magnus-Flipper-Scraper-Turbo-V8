export const MARKETPLACE_RATE_ERROR_CODES = {
  CONFIG_UNAVAILABLE: 'MARKETPLACE_CONFIG_UNAVAILABLE',
  DISABLED: 'MARKETPLACE_DISABLED',
  COOLDOWN: 'MARKETPLACE_COOLDOWN',
  CONCURRENCY_LIMIT: 'MARKETPLACE_CONCURRENCY_LIMIT',
  JOBS_PER_MINUTE: 'MARKETPLACE_RATE_LIMIT',
  ERROR_SPIKE: 'MARKETPLACE_ERROR_SPIKE',
} as const;

export type MarketplaceRateConfig = {
  enabled: boolean;
  maxConcurrency: number;
  jobsPerMinute: number;
  errorThreshold: number;
  cooldownSeconds: number;
  cooldownUntil?: Date | null;
};

export type MarketplaceRateMetrics = {
  running: number;
  jobsPerMinute: number;
  errorRatePercent: number;
};

export type MarketplaceDecision = {
  allowed: boolean;
  code?: string;
  reason?: string;
  cooldownUntil?: Date | null;
};

export const applyDemoOverrides = (
  config: MarketplaceRateConfig,
  demoOverrides?: Partial<MarketplaceRateConfig>
): MarketplaceRateConfig => {
  if (!demoOverrides) return config;

  return {
    ...config,
    maxConcurrency: Math.min(config.maxConcurrency, demoOverrides.maxConcurrency ?? config.maxConcurrency),
    jobsPerMinute: Math.min(config.jobsPerMinute, demoOverrides.jobsPerMinute ?? config.jobsPerMinute),
    errorThreshold: Math.min(config.errorThreshold, demoOverrides.errorThreshold ?? config.errorThreshold),
    cooldownSeconds: Math.max(config.cooldownSeconds, demoOverrides.cooldownSeconds ?? config.cooldownSeconds),
  };
};

export const evaluateMarketplaceRate = (
  config: MarketplaceRateConfig,
  metrics: MarketplaceRateMetrics,
  now: Date
): MarketplaceDecision => {
  if (!config.enabled) {
    return {
      allowed: false,
      code: MARKETPLACE_RATE_ERROR_CODES.DISABLED,
      reason: 'disabled',
    };
  }

  if (config.cooldownUntil && config.cooldownUntil > now) {
    return {
      allowed: false,
      code: MARKETPLACE_RATE_ERROR_CODES.COOLDOWN,
      reason: 'cooldown',
      cooldownUntil: config.cooldownUntil,
    };
  }

  if (metrics.running >= config.maxConcurrency) {
    return {
      allowed: false,
      code: MARKETPLACE_RATE_ERROR_CODES.CONCURRENCY_LIMIT,
      reason: 'max_concurrency',
    };
  }

  if (metrics.jobsPerMinute >= config.jobsPerMinute) {
    return {
      allowed: false,
      code: MARKETPLACE_RATE_ERROR_CODES.JOBS_PER_MINUTE,
      reason: 'jobs_per_minute',
    };
  }

  if (metrics.errorRatePercent >= config.errorThreshold) {
    return {
      allowed: false,
      code: MARKETPLACE_RATE_ERROR_CODES.ERROR_SPIKE,
      reason: 'error_spike',
    };
  }

  return { allowed: true };
};
