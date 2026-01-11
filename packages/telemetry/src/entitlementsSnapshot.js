export const resolveConcurrencySnapshot = (entitlements) => ({
    maxConcurrentJobs: entitlements.maxConcurrencyUser,
    maxMarketplaceParallelism: entitlements.maxConcurrencyUser,
    maxBoostedJobs: entitlements.maxBoostedMonitors,
});
export const hasValidEntitlements = (entitlements) => !!entitlements
    && typeof entitlements.tierKey === 'string'
    && Number.isFinite(entitlements.maxConcurrencyUser)
    && Number.isFinite(entitlements.maxMonitors)
    && Number.isFinite(entitlements.maxBoostedMonitors)
    && Number.isFinite(entitlements.refreshIntervalFloorSeconds)
    && Number.isFinite(entitlements.maxDailyRuns)
    && Number.isFinite(entitlements.maxProxyGbPerDay);
