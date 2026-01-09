import { TierKey, getEntitlementsForTier } from './pricingGuardrails';

export type StripePlanId = string;

export type StripePlanDefinition = {
  priceId: StripePlanId;
  tier: TierKey;
  hardLimits: {
    maxFullScrapesPerDay: number;
    maxProxyGbPerDay: number;
    maxMonitors: number;
  };
  softDegradation: {
    order: ['full_scrape', 'partial_fetch', 'signal_check'];
  };
};

export const STRIPE_PRICE_ENV = {
  basic: 'STRIPE_PRICE_ID_BASIC',
  pro: 'STRIPE_PRICE_ID_PRO',
  elite: 'STRIPE_PRICE_ID_ELITE',
  enterprise: 'STRIPE_PRICE_ID_ENTERPRISE',
} as const;

// Paid tiers only - 'free' tier has no Stripe price ID
type PaidTierKey = Exclude<TierKey, 'free'>;

export const buildStripePlanMap = (
  env: Record<string, string | undefined> = process.env
): Record<StripePlanId, StripePlanDefinition> => {
  const tiers: PaidTierKey[] = ['basic', 'pro', 'elite', 'enterprise'];
  const map: Record<StripePlanId, StripePlanDefinition> = {};

  tiers.forEach((tier) => {
    const priceId = env[STRIPE_PRICE_ENV[tier]] ?? `missing_${tier}_price_id`;
    const entitlements = getEntitlementsForTier(tier);
    map[priceId] = {
      priceId,
      tier,
      hardLimits: {
        maxFullScrapesPerDay: entitlements.maxDailyRuns,
        maxProxyGbPerDay: entitlements.maxProxyGbPerDay,
        maxMonitors: entitlements.maxMonitors,
      },
      softDegradation: {
        order: ['full_scrape', 'partial_fetch', 'signal_check'],
      },
    };
  });

  return map;
};

export const resolveTierByPriceId = (
  priceId: StripePlanId,
  env: Record<string, string | undefined> = process.env
): TierKey | null => {
  const map = buildStripePlanMap(env);
  return map[priceId]?.tier ?? null;
};
