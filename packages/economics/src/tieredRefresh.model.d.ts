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
export declare const TIERS: Record<TierKey, TierConfig>;
export declare const MARKETPLACE_PARAMS: Record<Marketplace, MarketplaceParams>;
export declare const REFRESH_COST_USD_PER_RUN = 0.5;
export declare const PROXY_GB_COST_USD = 1.5;
export declare const MARKETPLACE_COST_MULTIPLIERS: Record<Marketplace, number>;
export declare const TIER_COST_CEILING: Record<TierKey, number>;
export declare const refreshesPerDay: (refreshIntervalSec: number) => number;
export declare const expectedFullScrapeProbability: (marketplace: Marketplace, refreshIntervalSec: number, deltaRatePerHour: number) => number;
export declare const expectedPartialFetchProbability: (marketplace: Marketplace, refreshIntervalSec: number, deltaRatePerHour: number, fullScrapeProb: number) => number;
export declare const expectedCostPerRefresh: (marketplace: Marketplace, refreshIntervalSec: number, deltaRatePerHour: number) => number;
export declare const expectedProxyGbPerRefresh: (marketplace: Marketplace, refreshIntervalSec: number, deltaRatePerHour: number) => number;
//# sourceMappingURL=tieredRefresh.model.d.ts.map