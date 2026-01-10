import { MARKETPLACE_PARAMS, } from '@repo/economics';
import { evaluatePricingGuardrails, TIER_GUARDRAILS, } from '@repo/billing';
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
export const downgradeAction = (action) => {
    if (action === 'full_scrape')
        return 'partial_fetch';
    return 'signal_check';
};
export const enforceBudget = (input) => {
    void input.userId;
    const { tier, marketplace, projectedAction } = input;
    const limits = TIER_GUARDRAILS[tier];
    const usage = projectedAction.currentUsage;
    let effective = projectedAction.kind;
    let decision = 'ALLOW';
    if (effective === 'full_scrape' && usage.fullScrapesToday + 1 > limits.maxFullScrapesPerDay) {
        effective = 'partial_fetch';
        decision = 'DOWNGRADE';
    }
    const projectedProxy = usage.proxyGbToday + actionProxyGb(marketplace, effective);
    if (projectedProxy > limits.maxProxyGbPerDay) {
        effective = 'signal_check';
        decision = 'DOWNGRADE';
    }
    const remaining = projectedAction.budgetRemainingUsd;
    const signalCost = actionCostUsd(marketplace, 'signal_check');
    const effectiveCost = actionCostUsd(marketplace, effective);
    if (remaining < signalCost)
        return 'DENY';
    if (remaining < effectiveCost)
        return 'DOWNGRADE';
    return decision;
};
const buildPricingUsageSnapshot = (usageTelemetry, jobContext) => {
    if (!usageTelemetry)
        return null;
    if (!Number.isFinite(jobContext.runningJobs))
        return null;
    if (!Number.isFinite(usageTelemetry.fullRuns))
        return null;
    if (!Number.isFinite(usageTelemetry.proxyGbEstimated))
        return null;
    return {
        runningJobs: jobContext.runningJobs,
        dailyRuns: usageTelemetry.fullRuns,
        proxyGbToday: usageTelemetry.proxyGbEstimated,
        lastRunAt: jobContext.monitorLastRunAt ?? null,
        marketplace: usageTelemetry.marketplace,
    };
};
export const evaluateEnforcementGate = (input) => {
    void input.userId;
    const usageSnapshot = buildPricingUsageSnapshot(input.usageTelemetry, input.jobContext);
    const pricingDecision = evaluatePricingGuardrails({
        entitlements: input.entitlements,
        usageSnapshot,
        now: input.jobContext.now,
    });
    const enforcement_mode = pricingDecision.decision === 'ALLOW'
        ? 'NORMAL'
        : pricingDecision.decision === 'THROTTLE'
            ? 'THROTTLED'
            : 'BLOCKED';
    return {
        allowed: enforcement_mode !== 'BLOCKED',
        enforcement_mode,
        reason_code: pricingDecision.reason_code,
        violated_limit: pricingDecision.violated_limit,
        suggested_action: pricingDecision.suggested_action,
        snapshot: {
            entitlements: input.entitlements,
            usage: usageSnapshot,
        },
    };
};
