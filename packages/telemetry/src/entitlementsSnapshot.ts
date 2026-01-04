export type EntitlementsSnapshot = {
  tierKey: string;
  maxConcurrencyUser: number;
  maxMonitors: number;
  maxBoostedMonitors: number;
  refreshIntervalFloorSeconds: number;
  maxDailyRuns: number;
  maxProxyGbPerDay: number;
  entitlementsVersion?: number;
};

export type ConcurrencySnapshot = {
  maxConcurrentJobs: number;
  maxMarketplaceParallelism: number;
  maxBoostedJobs: number;
};

export const resolveConcurrencySnapshot = (
  entitlements: EntitlementsSnapshot
): ConcurrencySnapshot => ({
  maxConcurrentJobs: entitlements.maxConcurrencyUser,
  maxMarketplaceParallelism: entitlements.maxConcurrencyUser,
  maxBoostedJobs: entitlements.maxBoostedMonitors,
});

export const hasValidEntitlements = (entitlements: EntitlementsSnapshot | null | undefined) =>
  !!entitlements
  && typeof entitlements.tierKey === 'string'
  && Number.isFinite(entitlements.maxConcurrencyUser)
  && Number.isFinite(entitlements.maxMonitors)
  && Number.isFinite(entitlements.maxBoostedMonitors)
  && Number.isFinite(entitlements.refreshIntervalFloorSeconds)
  && Number.isFinite(entitlements.maxDailyRuns)
  && Number.isFinite(entitlements.maxProxyGbPerDay);
