export type TierKey = 'free' | 'basic' | 'pro' | 'elite' | 'enterprise';
export type GuardrailAction = 'SIGNAL_ONLY' | 'PARTIAL_FETCH' | 'FULL_SCRAPE';

export type EntitlementsSnapshot = {
  tierKey: TierKey;
  maxConcurrencyUser: number;
  maxMonitors: number;
  maxBoostedMonitors: number;
  refreshIntervalFloorSeconds: number;
  maxDailyRuns: number;
  maxProxyGbPerDay: number;
  entitlementsVersion: number;
};

export type UsageSnapshot = {
  fullScrapesToday: number;
  proxyGbToday: number;
};

export type PricingUsageSnapshot = {
  runningJobs: number;
  dailyRuns: number;
  proxyGbToday: number;
  lastRunAt?: Date | null;
};

export type PricingGuardrailsDecision = 'ALLOW' | 'THROTTLE' | 'BLOCK';

export type PricingGuardrailsResult = {
  decision: PricingGuardrailsDecision;
  reason_code: string;
  violated_limit?: string;
  suggested_action?: 'SOFT_LIMIT' | 'HARD_STOP';
};

export type GuardrailConfig = {
  maxFullScrapesPerDay: number;
  maxProxyGbPerDay: number;
};

export const ENTITLEMENTS_VERSION = 1;

const TIER_ENTITLEMENTS: Record<TierKey, Omit<EntitlementsSnapshot, 'tierKey' | 'entitlementsVersion'>> = {
  free: {
    maxConcurrencyUser: 1,
    maxMonitors: 3,
    maxBoostedMonitors: 0,
    refreshIntervalFloorSeconds: 43200,
    maxDailyRuns: 8,
    maxProxyGbPerDay: 0.2,
  },
  basic: {
    maxConcurrencyUser: 2,
    maxMonitors: 25,
    maxBoostedMonitors: 2,
    refreshIntervalFloorSeconds: 43200,
    maxDailyRuns: 40,
    maxProxyGbPerDay: 1.0,
  },
  pro: {
    maxConcurrencyUser: 3,
    maxMonitors: 60,
    maxBoostedMonitors: 6,
    refreshIntervalFloorSeconds: 21600,
    maxDailyRuns: 120,
    maxProxyGbPerDay: 3.0,
  },
  elite: {
    maxConcurrencyUser: 5,
    maxMonitors: 100,
    maxBoostedMonitors: 12,
    refreshIntervalFloorSeconds: 10800,
    maxDailyRuns: 240,
    maxProxyGbPerDay: 7.5,
  },
  enterprise: {
    maxConcurrencyUser: 8,
    maxMonitors: 180,
    maxBoostedMonitors: 30,
    refreshIntervalFloorSeconds: 7200,
    maxDailyRuns: 600,
    maxProxyGbPerDay: 20.0,
  },
};

export const getEntitlementsForTier = (tier: TierKey): EntitlementsSnapshot => ({
  tierKey: tier,
  entitlementsVersion: ENTITLEMENTS_VERSION,
  ...TIER_ENTITLEMENTS[tier],
});

export const TIER_GUARDRAILS: Record<TierKey, GuardrailConfig> = Object.fromEntries(
  (Object.keys(TIER_ENTITLEMENTS) as TierKey[]).map((tier) => ([
    tier,
    {
      maxFullScrapesPerDay: TIER_ENTITLEMENTS[tier].maxDailyRuns,
      maxProxyGbPerDay: TIER_ENTITLEMENTS[tier].maxProxyGbPerDay,
    },
  ]))
) as Record<TierKey, GuardrailConfig>;

export const enforceGuardrails = (input: {
  tier: TierKey;
  usage: UsageSnapshot;
  requested: GuardrailAction;
}): GuardrailAction => {
  const { tier, usage, requested } = input;
  const limits = TIER_GUARDRAILS[tier];

  if (usage.proxyGbToday >= limits.maxProxyGbPerDay) {
    return 'SIGNAL_ONLY';
  }

  if (requested === 'FULL_SCRAPE' && usage.fullScrapesToday >= limits.maxFullScrapesPerDay) {
    return 'PARTIAL_FETCH';
  }

  return requested;
};

const hasValidEntitlementsSnapshot = (entitlements: EntitlementsSnapshot | null | undefined) =>
  !!entitlements
  && typeof entitlements.tierKey === 'string'
  && Number.isFinite(entitlements.maxConcurrencyUser)
  && Number.isFinite(entitlements.maxMonitors)
  && Number.isFinite(entitlements.maxBoostedMonitors)
  && Number.isFinite(entitlements.refreshIntervalFloorSeconds)
  && Number.isFinite(entitlements.maxDailyRuns)
  && Number.isFinite(entitlements.maxProxyGbPerDay);

const hasValidPricingUsageSnapshot = (usage: PricingUsageSnapshot | null | undefined) =>
  !!usage
  && Number.isFinite(usage.runningJobs)
  && Number.isFinite(usage.dailyRuns)
  && Number.isFinite(usage.proxyGbToday);

const isValidDate = (value: Date) => value instanceof Date && !Number.isNaN(value.getTime());

export const evaluatePricingGuardrails = (input: {
  entitlements: EntitlementsSnapshot | null | undefined;
  usageSnapshot: PricingUsageSnapshot | null | undefined;
  now: Date;
}): PricingGuardrailsResult => {
  const { entitlements, usageSnapshot, now } = input;

  if (!hasValidEntitlementsSnapshot(entitlements) || !hasValidPricingUsageSnapshot(usageSnapshot) || !isValidDate(now)) {
    return {
      decision: 'BLOCK',
      reason_code: 'ENTITLEMENTS_MISSING',
    };
  }

  if (usageSnapshot.dailyRuns >= entitlements.maxDailyRuns) {
    return {
      decision: 'BLOCK',
      reason_code: 'MAX_DAILY_RUNS_EXCEEDED',
      violated_limit: 'maxDailyRuns',
      suggested_action: 'HARD_STOP',
    };
  }

  if (usageSnapshot.proxyGbToday >= entitlements.maxProxyGbPerDay) {
    return {
      decision: 'BLOCK',
      reason_code: 'MAX_PROXY_GB_EXCEEDED',
      violated_limit: 'maxProxyGbPerDay',
      suggested_action: 'HARD_STOP',
    };
  }

  if (usageSnapshot.lastRunAt && isValidDate(usageSnapshot.lastRunAt)) {
    const elapsedSec = (now.getTime() - usageSnapshot.lastRunAt.getTime()) / 1000;
    if (elapsedSec < entitlements.refreshIntervalFloorSeconds) {
      return {
        decision: 'BLOCK',
        reason_code: 'REFRESH_INTERVAL_FLOOR',
        violated_limit: 'refreshIntervalFloorSeconds',
        suggested_action: 'HARD_STOP',
      };
    }
  }

  if (usageSnapshot.runningJobs >= entitlements.maxConcurrencyUser) {
    return {
      decision: 'THROTTLE',
      reason_code: 'MAX_CONCURRENCY_EXCEEDED',
      violated_limit: 'maxConcurrencyUser',
      suggested_action: 'SOFT_LIMIT',
    };
  }

  return {
    decision: 'ALLOW',
    reason_code: 'ALLOWED',
  };
};
