import { MARKETPLACE_COST_MULTIPLIERS, PROXY_GB_COST_USD, REFRESH_COST_USD_PER_RUN, TIER_COST_CEILING, } from '@repo/economics';
export const ENTITLEMENTS_VERSION = 1;
const TIER_ENTITLEMENTS = {
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
export const getEntitlementsForTier = (tier) => ({
    tierKey: tier,
    entitlementsVersion: ENTITLEMENTS_VERSION,
    ...TIER_ENTITLEMENTS[tier],
});
export const TIER_GUARDRAILS = Object.fromEntries(Object.keys(TIER_ENTITLEMENTS).map((tier) => ([
    tier,
    {
        maxFullScrapesPerDay: TIER_ENTITLEMENTS[tier].maxDailyRuns,
        maxProxyGbPerDay: TIER_ENTITLEMENTS[tier].maxProxyGbPerDay,
    },
])));
export const enforceGuardrails = (input) => {
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
const hasValidEntitlementsSnapshot = (entitlements) => !!entitlements
    && typeof entitlements.tierKey === 'string'
    && Number.isFinite(entitlements.maxConcurrencyUser)
    && Number.isFinite(entitlements.maxMonitors)
    && Number.isFinite(entitlements.maxBoostedMonitors)
    && Number.isFinite(entitlements.refreshIntervalFloorSeconds)
    && Number.isFinite(entitlements.maxDailyRuns)
    && Number.isFinite(entitlements.maxProxyGbPerDay);
const hasValidPricingUsageSnapshot = (usage) => !!usage
    && Number.isFinite(usage.runningJobs)
    && Number.isFinite(usage.dailyRuns)
    && Number.isFinite(usage.proxyGbToday);
const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());
export const evaluatePricingGuardrails = (input) => {
    const { entitlements, usageSnapshot, now } = input;
    if (!hasValidEntitlementsSnapshot(entitlements) || !hasValidPricingUsageSnapshot(usageSnapshot) || !isValidDate(now)) {
        return {
            decision: 'BLOCK',
            reason_code: 'ENTITLEMENTS_MISSING',
        };
    }
    // Type assertion: After validation checks above, these are guaranteed non-null
    const validEntitlements = entitlements;
    const validUsageSnapshot = usageSnapshot;
    if (validUsageSnapshot.dailyRuns >= validEntitlements.maxDailyRuns) {
        return {
            decision: 'BLOCK',
            reason_code: 'MAX_DAILY_RUNS_EXCEEDED',
            violated_limit: 'maxDailyRuns',
            suggested_action: 'HARD_STOP',
        };
    }
    if (validUsageSnapshot.proxyGbToday >= validEntitlements.maxProxyGbPerDay) {
        return {
            decision: 'BLOCK',
            reason_code: 'MAX_PROXY_GB_EXCEEDED',
            violated_limit: 'maxProxyGbPerDay',
            suggested_action: 'HARD_STOP',
        };
    }
    if (validUsageSnapshot.lastRunAt && isValidDate(validUsageSnapshot.lastRunAt)) {
        const elapsedSec = (now.getTime() - validUsageSnapshot.lastRunAt.getTime()) / 1000;
        if (elapsedSec < validEntitlements.refreshIntervalFloorSeconds) {
            return {
                decision: 'BLOCK',
                reason_code: 'REFRESH_INTERVAL_FLOOR',
                violated_limit: 'refreshIntervalFloorSeconds',
                suggested_action: 'HARD_STOP',
            };
        }
    }
    if (validUsageSnapshot.runningJobs >= validEntitlements.maxConcurrencyUser) {
        return {
            decision: 'THROTTLE',
            reason_code: 'MAX_CONCURRENCY_EXCEEDED',
            violated_limit: 'maxConcurrencyUser',
            suggested_action: 'SOFT_LIMIT',
        };
    }
    const estimatedCost = estimateDailyCost(validEntitlements, validUsageSnapshot);
    const tierCeiling = TIER_COST_CEILING[validEntitlements.tierKey];
    if (Number.isFinite(tierCeiling) && estimatedCost > tierCeiling) {
        return {
            decision: 'THROTTLE',
            reason_code: 'DAILY_COST_LIMIT_EXCEEDED',
            violated_limit: 'tierCostCeiling',
            suggested_action: 'SOFT_LIMIT',
        };
    }
    return {
        decision: 'ALLOW',
        reason_code: 'ALLOWED',
    };
};
const resolveMultiplier = (marketplace) => {
    if (!marketplace)
        return 1;
    const multiplier = MARKETPLACE_COST_MULTIPLIERS[marketplace];
    return Number.isFinite(multiplier) ? multiplier : 1;
};
export const estimateDailyCost = (entitlements, usageSnapshot) => {
    const refreshCost = usageSnapshot.dailyRuns * REFRESH_COST_USD_PER_RUN;
    const proxyCost = usageSnapshot.proxyGbToday * PROXY_GB_COST_USD;
    const multiplier = resolveMultiplier(usageSnapshot.marketplace);
    return (refreshCost + proxyCost) * multiplier;
};
