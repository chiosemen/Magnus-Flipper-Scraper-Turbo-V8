import { DEFAULT_TUNING, MARKETPLACE_TUNING, MarketplaceKey, TierKey, MarketplaceTuning } from './marketplaceTuning';

export type TelemetrySnapshot = {
  proxyUsageRatio?: number; // 0..1
  fullScrapeRatio?: number; // 0..1
};

export type ResolvedTuning = MarketplaceTuning & {
  enabled: boolean;
  reason?: string;
  concurrency: number;
  maxRps: number;
};

export const resolveTuning = (input: {
  marketplace: string;
  tier: TierKey;
  country?: string | null;
  telemetrySnapshot?: TelemetrySnapshot;
}): ResolvedTuning => {
  const marketplaceKey = input.marketplace as MarketplaceKey;
  const base = MARKETPLACE_TUNING[marketplaceKey] || DEFAULT_TUNING;

  const killGlobal = base.killSwitch.global;
  const killCountry = input.country ? base.killSwitch.countries[input.country] : false;
  const enabled = !(killGlobal || killCountry);

  const tier = input.tier;
  let concurrency = base.defaultConcurrencyByTier[tier] ?? 1;
  let maxRps = base.maxRpsByTier[tier] ?? 0.5;

  const proxyRatio = input.telemetrySnapshot?.proxyUsageRatio ?? 0;
  const fullRatio = input.telemetrySnapshot?.fullScrapeRatio ?? 0;

  if (proxyRatio >= 0.9 || fullRatio >= 0.9) {
    concurrency = Math.max(1, Math.floor(concurrency * 0.5));
    maxRps = Math.max(0.2, maxRps * 0.5);
  } else if (proxyRatio >= 0.75 || fullRatio >= 0.75) {
    concurrency = Math.max(1, Math.floor(concurrency * 0.75));
    maxRps = Math.max(0.3, maxRps * 0.75);
  }

  return {
    ...base,
    enabled,
    reason: killGlobal ? 'kill_switch_global' : killCountry ? 'kill_switch_country' : undefined,
    concurrency,
    maxRps,
  };
};
