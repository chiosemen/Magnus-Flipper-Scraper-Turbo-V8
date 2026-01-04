export const TIER_ERROR_CODES = {
  MONITOR_LIMIT: 'TIER_MONITOR_LIMIT',
  REFRESH_INTERVAL: 'TIER_REFRESH_INTERVAL',
  CONCURRENCY_LIMIT: 'TIER_CONCURRENCY_LIMIT',
} as const;

export type TierLimitKey = 'free' | 'basic' | 'pro' | 'elite' | 'enterprise';

const TIER_LIMITS: Record<TierLimitKey, { maxMonitors: number; minIntervalSec: number; maxConcurrency: number }> = {
  free: { maxMonitors: 3, minIntervalSec: 43200, maxConcurrency: 1 },
  basic: { maxMonitors: 25, minIntervalSec: 43200, maxConcurrency: 2 },
  pro: { maxMonitors: 60, minIntervalSec: 21600, maxConcurrency: 3 },
  elite: { maxMonitors: 100, minIntervalSec: 10800, maxConcurrency: 5 },
  enterprise: { maxMonitors: 180, minIntervalSec: 7200, maxConcurrency: 8 },
};

export const getTierLimits = (tier: string) => {
  return TIER_LIMITS[tier as TierLimitKey] || TIER_LIMITS.free;
};
