export type Marketplace = 'facebook' | 'vinted' | 'ebay' | 'gumtree';

export type TierKey = 'free' | 'basic' | 'pro' | 'elite' | 'enterprise';

export type RefreshStage = 'signal_check' | 'partial_fetch' | 'full_scrape';

export type TierConfig = {
  refreshIntervalSec: number;
  maxMonitors: number;
};

export type MarketplaceParams = {
  signalCheckCostUsd: number;
  partialFetchCostUsd: number;
  fullScrapeCostUsd: number;
  proxyGbPerPartialFetch: number;
  proxyGbPerFullScrape: number;
  fullScrapeBaseProb: number;
  fullScrapeSlope: number;
  partialFetchBaseProb: number;
  partialFetchSlope: number;
};

export const TIERS: Record<TierKey, TierConfig> = {
  free: { refreshIntervalSec: 43200, maxMonitors: 3 },
  basic: { refreshIntervalSec: 43200, maxMonitors: 25 },
  pro: { refreshIntervalSec: 21600, maxMonitors: 60 },
  elite: { refreshIntervalSec: 10800, maxMonitors: 100 },
  enterprise: { refreshIntervalSec: 7200, maxMonitors: 180 },
};

export const MARKETPLACE_PARAMS: Record<Marketplace, MarketplaceParams> = {
  facebook: {
    signalCheckCostUsd: 0.0020,
    partialFetchCostUsd: 0.0300,
    fullScrapeCostUsd: 0.1200,
    proxyGbPerPartialFetch: 0.006,
    proxyGbPerFullScrape: 0.024,
    fullScrapeBaseProb: 0.08,
    fullScrapeSlope: 0.12,
    partialFetchBaseProb: 0.18,
    partialFetchSlope: 0.35,
  },
  vinted: {
    signalCheckCostUsd: 0.0016,
    partialFetchCostUsd: 0.0220,
    fullScrapeCostUsd: 0.0850,
    proxyGbPerPartialFetch: 0.004,
    proxyGbPerFullScrape: 0.016,
    fullScrapeBaseProb: 0.06,
    fullScrapeSlope: 0.10,
    partialFetchBaseProb: 0.16,
    partialFetchSlope: 0.30,
  },
  ebay: {
    signalCheckCostUsd: 0.0012,
    partialFetchCostUsd: 0.0180,
    fullScrapeCostUsd: 0.0600,
    proxyGbPerPartialFetch: 0.003,
    proxyGbPerFullScrape: 0.012,
    fullScrapeBaseProb: 0.04,
    fullScrapeSlope: 0.08,
    partialFetchBaseProb: 0.12,
    partialFetchSlope: 0.25,
  },
  gumtree: {
    signalCheckCostUsd: 0.0010,
    partialFetchCostUsd: 0.0160,
    fullScrapeCostUsd: 0.0500,
    proxyGbPerPartialFetch: 0.0025,
    proxyGbPerFullScrape: 0.010,
    fullScrapeBaseProb: 0.03,
    fullScrapeSlope: 0.06,
    partialFetchBaseProb: 0.10,
    partialFetchSlope: 0.22,
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const refreshesPerDay = (refreshIntervalSec: number) =>
  86400 / refreshIntervalSec;

export const expectedFullScrapeProbability = (
  marketplace: Marketplace,
  refreshIntervalSec: number,
  deltaRatePerHour: number
) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  const intervalHours = refreshIntervalSec / 3600;
  return clamp(
    params.fullScrapeBaseProb + params.fullScrapeSlope * (deltaRatePerHour * intervalHours),
    0,
    1
  );
};

export const expectedPartialFetchProbability = (
  marketplace: Marketplace,
  refreshIntervalSec: number,
  deltaRatePerHour: number,
  fullScrapeProb: number
) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  const intervalHours = refreshIntervalSec / 3600;
  return clamp(
    params.partialFetchBaseProb + params.partialFetchSlope * (deltaRatePerHour * intervalHours),
    0,
    1 - fullScrapeProb
  );
};

export const expectedCostPerRefresh = (
  marketplace: Marketplace,
  refreshIntervalSec: number,
  deltaRatePerHour: number
) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  const fullProb = expectedFullScrapeProbability(marketplace, refreshIntervalSec, deltaRatePerHour);
  const partialProb = expectedPartialFetchProbability(marketplace, refreshIntervalSec, deltaRatePerHour, fullProb);
  return (
    params.signalCheckCostUsd +
    partialProb * params.partialFetchCostUsd +
    fullProb * params.fullScrapeCostUsd
  );
};

export const expectedProxyGbPerRefresh = (
  marketplace: Marketplace,
  refreshIntervalSec: number,
  deltaRatePerHour: number
) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  const fullProb = expectedFullScrapeProbability(marketplace, refreshIntervalSec, deltaRatePerHour);
  const partialProb = expectedPartialFetchProbability(marketplace, refreshIntervalSec, deltaRatePerHour, fullProb);
  return (
    partialProb * params.proxyGbPerPartialFetch +
    fullProb * params.proxyGbPerFullScrape
  );
};
