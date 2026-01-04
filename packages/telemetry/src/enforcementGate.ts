import {
  MARKETPLACE_PARAMS,
  Marketplace,
  TierKey,
} from '../../economics/src/tieredRefresh.model';
import {
  EntitlementsSnapshot as BillingEntitlementsSnapshot,
  evaluatePricingGuardrails,
  PricingUsageSnapshot,
  TIER_GUARDRAILS,
} from '../../billing/src/pricingGuardrails';

export type EnforcementAction = 'signal_check' | 'partial_fetch' | 'full_scrape';
export type EnforcementDecision = 'ALLOW' | 'DOWNGRADE' | 'DENY';

export type UsageSnapshot = {
  fullScrapesToday: number;
  proxyGbToday: number;
  signalChecksToday: number;
  costUsdToday: number;
};

export type ProjectedAction = {
  kind: EnforcementAction;
  currentUsage: UsageSnapshot;
  budgetRemainingUsd: number;
};

export type EnforcementMode = 'NORMAL' | 'THROTTLED' | 'BLOCKED';

export type UsageTelemetrySnapshot = {
  fullRuns: number;
  partialRuns: number;
  signalChecks: number;
  proxyGbEstimated: number;
  marketplace: Marketplace;
};

export type EnforcementJobContext = {
  runningJobs: number;
  monitorLastRunAt?: Date | null;
  now: Date;
};

export type EnforcementGateInput = {
  userId: string;
  entitlements: BillingEntitlementsSnapshot | null | undefined;
  usageTelemetry: UsageTelemetrySnapshot | null | undefined;
  jobContext: EnforcementJobContext;
};

export type EnforcementGateDecision = {
  allowed: boolean;
  enforcement_mode: EnforcementMode;
  reason_code: string;
  violated_limit?: string;
  suggested_action?: 'SOFT_LIMIT' | 'HARD_STOP';
  snapshot: {
    entitlements: BillingEntitlementsSnapshot | null | undefined;
    usage: PricingUsageSnapshot | null;
  };
};

const actionCostUsd = (marketplace: Marketplace, action: EnforcementAction) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  if (action === 'signal_check') return params.signalCheckCostUsd;
  if (action === 'partial_fetch') return params.partialFetchCostUsd;
  return params.fullScrapeCostUsd;
};

const actionProxyGb = (marketplace: Marketplace, action: EnforcementAction) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  if (action === 'partial_fetch') return params.proxyGbPerPartialFetch;
  if (action === 'full_scrape') return params.proxyGbPerFullScrape;
  return 0;
};

export const downgradeAction = (action: EnforcementAction): EnforcementAction => {
  if (action === 'full_scrape') return 'partial_fetch';
  return 'signal_check';
};

export const enforceBudget = (input: {
  userId: string;
  tier: TierKey;
  marketplace: Marketplace;
  projectedAction: ProjectedAction;
}): EnforcementDecision => {
  void input.userId;
  const { tier, marketplace, projectedAction } = input;
  const limits = TIER_GUARDRAILS[tier];
  const usage = projectedAction.currentUsage;

  let effective: EnforcementAction = projectedAction.kind;
  let decision: EnforcementDecision = 'ALLOW';

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

  if (remaining < signalCost) return 'DENY';
  if (remaining < effectiveCost) return 'DOWNGRADE';

  return decision;
};

const buildPricingUsageSnapshot = (
  usageTelemetry: UsageTelemetrySnapshot | null | undefined,
  jobContext: EnforcementJobContext
): PricingUsageSnapshot | null => {
  if (!usageTelemetry) return null;
  if (!Number.isFinite(jobContext.runningJobs)) return null;
  if (!Number.isFinite(usageTelemetry.fullRuns)) return null;
  if (!Number.isFinite(usageTelemetry.proxyGbEstimated)) return null;

  return {
    runningJobs: jobContext.runningJobs,
    dailyRuns: usageTelemetry.fullRuns,
    proxyGbToday: usageTelemetry.proxyGbEstimated,
    lastRunAt: jobContext.monitorLastRunAt ?? null,
    marketplace: usageTelemetry.marketplace,
  };
};

export const evaluateEnforcementGate = (input: EnforcementGateInput): EnforcementGateDecision => {
  void input.userId;
  const usageSnapshot = buildPricingUsageSnapshot(input.usageTelemetry, input.jobContext);
  const pricingDecision = evaluatePricingGuardrails({
    entitlements: input.entitlements,
    usageSnapshot,
    now: input.jobContext.now,
  });

  const enforcement_mode: EnforcementMode = pricingDecision.decision === 'ALLOW'
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
