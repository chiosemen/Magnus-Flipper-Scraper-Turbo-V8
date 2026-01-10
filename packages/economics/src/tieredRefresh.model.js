export const TIERS = {
    free: { refreshIntervalSec: 43200, maxMonitors: 3 },
    basic: { refreshIntervalSec: 43200, maxMonitors: 25 },
    pro: { refreshIntervalSec: 21600, maxMonitors: 60 },
    elite: { refreshIntervalSec: 10800, maxMonitors: 100 },
    enterprise: { refreshIntervalSec: 7200, maxMonitors: 180 },
};
export const MARKETPLACE_PARAMS = {
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
export const REFRESH_COST_USD_PER_RUN = 0.5;
export const PROXY_GB_COST_USD = 1.5;
export const MARKETPLACE_COST_MULTIPLIERS = {
    facebook: 1.25,
    vinted: 1.05,
    ebay: 0.95,
    gumtree: 0.8,
};
export const TIER_COST_CEILING = {
    free: 3,
    basic: 12,
    pro: 35,
    elite: 90,
    enterprise: 260,
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const refreshesPerDay = (refreshIntervalSec) => 86400 / refreshIntervalSec;
export const expectedFullScrapeProbability = (marketplace, refreshIntervalSec, deltaRatePerHour) => {
    const params = MARKETPLACE_PARAMS[marketplace];
    const intervalHours = refreshIntervalSec / 3600;
    return clamp(params.fullScrapeBaseProb + params.fullScrapeSlope * (deltaRatePerHour * intervalHours), 0, 1);
};
export const expectedPartialFetchProbability = (marketplace, refreshIntervalSec, deltaRatePerHour, fullScrapeProb) => {
    const params = MARKETPLACE_PARAMS[marketplace];
    const intervalHours = refreshIntervalSec / 3600;
    return clamp(params.partialFetchBaseProb + params.partialFetchSlope * (deltaRatePerHour * intervalHours), 0, 1 - fullScrapeProb);
};
export const expectedCostPerRefresh = (marketplace, refreshIntervalSec, deltaRatePerHour) => {
    const params = MARKETPLACE_PARAMS[marketplace];
    const fullProb = expectedFullScrapeProbability(marketplace, refreshIntervalSec, deltaRatePerHour);
    const partialProb = expectedPartialFetchProbability(marketplace, refreshIntervalSec, deltaRatePerHour, fullProb);
    return (params.signalCheckCostUsd +
        partialProb * params.partialFetchCostUsd +
        fullProb * params.fullScrapeCostUsd);
};
export const expectedProxyGbPerRefresh = (marketplace, refreshIntervalSec, deltaRatePerHour) => {
    const params = MARKETPLACE_PARAMS[marketplace];
    const fullProb = expectedFullScrapeProbability(marketplace, refreshIntervalSec, deltaRatePerHour);
    const partialProb = expectedPartialFetchProbability(marketplace, refreshIntervalSec, deltaRatePerHour, fullProb);
    return (partialProb * params.proxyGbPerPartialFetch +
        fullProb * params.proxyGbPerFullScrape);
};
