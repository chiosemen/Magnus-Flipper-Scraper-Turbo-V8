import { MARKETPLACE_PARAMS, } from '@repo/economics';
export const telemetryKeys = (scope) => {
    const { userId, tier, marketplace, dateKey } = scope;
    return {
        userDaily: `telemetry:cost:${userId}:${dateKey}`,
        userMarketplaceDaily: `telemetry:cost:${userId}:${marketplace}:${dateKey}`,
        tierMarketplaceDaily: `telemetry:cost:${tier}:${marketplace}:${dateKey}`,
    };
};
export const telemetryFields = {
    signalChecks: 'signal_checks',
    partialFetches: 'partial_fetches',
    fullScrapes: 'full_scrapes',
    proxyGbEstimated: 'proxy_gb_estimated',
    costUsdEstimated: 'cost_usd_estimated',
};
const actionCostUsd = (marketplace, action) => {
    const params = MARKETPLACE_PARAMS[marketplace];
    if (action === 'signal_check')
        return params.signalCheckCostUsd;
    if (action === 'partial_fetch')
        return params.partialFetchCostUsd;
    return params.fullScrapeCostUsd;
};
const actionProxyGb = (marketplace, action) => {
    const params = MARKETPLACE_PARAMS[marketplace];
    if (action === 'partial_fetch')
        return params.proxyGbPerPartialFetch;
    if (action === 'full_scrape')
        return params.proxyGbPerFullScrape;
    return 0;
};
export const buildTelemetryIncrement = (input) => {
    const count = input.count ?? 1;
    const costUsd = actionCostUsd(input.marketplace, input.action) * count;
    const proxyGb = actionProxyGb(input.marketplace, input.action) * count;
    return {
        action: input.action,
        count,
        signalChecks: input.action === 'signal_check' ? count : 0,
        partialFetches: input.action === 'partial_fetch' ? count : 0,
        fullScrapes: input.action === 'full_scrape' ? count : 0,
        proxyGbEstimated: proxyGb,
        costUsdEstimated: costUsd,
    };
};
export const applyTelemetryIncrement = (base, increment) => ({
    signalChecks: base.signalChecks + increment.signalChecks,
    partialFetches: base.partialFetches + increment.partialFetches,
    fullScrapes: base.fullScrapes + increment.fullScrapes,
    proxyGbEstimated: base.proxyGbEstimated + increment.proxyGbEstimated,
    costUsdEstimated: base.costUsdEstimated + increment.costUsdEstimated,
});
export const emptyTelemetryCounters = () => ({
    signalChecks: 0,
    partialFetches: 0,
    fullScrapes: 0,
    proxyGbEstimated: 0,
    costUsdEstimated: 0,
});
export const toRedisHashIncrements = (increment) => ({
    [telemetryFields.signalChecks]: increment.signalChecks,
    [telemetryFields.partialFetches]: increment.partialFetches,
    [telemetryFields.fullScrapes]: increment.fullScrapes,
    [telemetryFields.proxyGbEstimated]: increment.proxyGbEstimated,
    [telemetryFields.costUsdEstimated]: increment.costUsdEstimated,
});
export const recordEnforcementEventIfNeeded = async (db, schema, input) => {
    if (input.enforcement_mode === 'NORMAL')
        return;
    await db.insert(schema.enforcementEvents).values({
        userId: input.userId,
        marketplace: input.marketplace,
        tier: input.tier,
        jobId: input.jobId ?? null,
        decision: input.decision,
        mode: input.enforcement_mode,
        reasonCode: input.reason_code,
        audit: {
            violated_limit: input.violated_limit || null,
            suggested_action: input.suggested_action || null,
            snapshot_json: input.snapshot,
        },
    });
};
