export type MarketplaceKey = 'facebook' | 'vinted' | 'ebay' | 'gumtree';
export type TierKey = 'free' | 'basic' | 'pro' | 'elite' | 'enterprise';

export type MarketplaceTuning = {
  defaultConcurrencyByTier: Record<TierKey, number>;
  maxRpsByTier: Record<TierKey, number>;
  proxyProfile: 'residential' | 'datacenter' | 'mixed';
  killSwitch: {
    global: boolean;
    countries: Record<string, boolean>;
  };
  degradeBias: number; // 0 (lenient) -> 1 (aggressive)
  retryPolicy: {
    maxRetries: number;
    backoffSec: number;
    jitterPct: number;
  };
};

export const MARKETPLACE_TUNING: Record<MarketplaceKey, MarketplaceTuning> = {
  facebook: {
    defaultConcurrencyByTier: { free: 1, basic: 1, pro: 2, elite: 3, enterprise: 4 },
    maxRpsByTier: { free: 0.3, basic: 0.5, pro: 0.8, elite: 1.2, enterprise: 1.5 },
    proxyProfile: 'residential',
    killSwitch: { global: false, countries: {} },
    degradeBias: 0.85,
    retryPolicy: { maxRetries: 3, backoffSec: 45, jitterPct: 0.2 },
  },
  vinted: {
    defaultConcurrencyByTier: { free: 1, basic: 2, pro: 3, elite: 4, enterprise: 6 },
    maxRpsByTier: { free: 0.6, basic: 0.8, pro: 1.0, elite: 1.4, enterprise: 1.8 },
    proxyProfile: 'mixed',
    killSwitch: { global: false, countries: {} },
    degradeBias: 0.55,
    retryPolicy: { maxRetries: 4, backoffSec: 35, jitterPct: 0.2 },
  },
  ebay: {
    defaultConcurrencyByTier: { free: 1, basic: 2, pro: 3, elite: 4, enterprise: 6 },
    maxRpsByTier: { free: 0.8, basic: 1.0, pro: 1.4, elite: 1.8, enterprise: 2.2 },
    proxyProfile: 'datacenter',
    killSwitch: { global: false, countries: {} },
    degradeBias: 0.4,
    retryPolicy: { maxRetries: 3, backoffSec: 25, jitterPct: 0.15 },
  },
  gumtree: {
    defaultConcurrencyByTier: { free: 1, basic: 2, pro: 3, elite: 4, enterprise: 5 },
    maxRpsByTier: { free: 0.7, basic: 0.9, pro: 1.2, elite: 1.6, enterprise: 2.0 },
    proxyProfile: 'datacenter',
    killSwitch: { global: false, countries: {} },
    degradeBias: 0.45,
    retryPolicy: { maxRetries: 3, backoffSec: 30, jitterPct: 0.2 },
  },
};

export const DEFAULT_TUNING: MarketplaceTuning = {
  defaultConcurrencyByTier: { free: 1, basic: 1, pro: 2, elite: 3, enterprise: 4 },
  maxRpsByTier: { free: 0.5, basic: 0.6, pro: 0.8, elite: 1.1, enterprise: 1.3 },
  proxyProfile: 'mixed',
  killSwitch: { global: false, countries: {} },
  degradeBias: 0.6,
  retryPolicy: { maxRetries: 3, backoffSec: 30, jitterPct: 0.2 },
};
