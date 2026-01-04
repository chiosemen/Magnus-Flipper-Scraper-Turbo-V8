import {
  MARKETPLACE_PARAMS,
  Marketplace,
  TierKey,
} from '../../economics/src/tieredRefresh.model';

export type TelemetryAction = 'signal_check' | 'partial_fetch' | 'full_scrape';

export type TelemetryCounters = {
  signalChecks: number;
  partialFetches: number;
  fullScrapes: number;
  proxyGbEstimated: number;
  costUsdEstimated: number;
};

export type TelemetryIncrement = TelemetryCounters & {
  action: TelemetryAction;
  count: number;
};

export type TelemetryScope = {
  userId: string;
  tier: TierKey;
  marketplace: Marketplace;
  dateKey: string; // YYYY-MM-DD
};

export const telemetryKeys = (scope: TelemetryScope) => {
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
} as const;

const actionCostUsd = (marketplace: Marketplace, action: TelemetryAction) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  if (action === 'signal_check') return params.signalCheckCostUsd;
  if (action === 'partial_fetch') return params.partialFetchCostUsd;
  return params.fullScrapeCostUsd;
};

const actionProxyGb = (marketplace: Marketplace, action: TelemetryAction) => {
  const params = MARKETPLACE_PARAMS[marketplace];
  if (action === 'partial_fetch') return params.proxyGbPerPartialFetch;
  if (action === 'full_scrape') return params.proxyGbPerFullScrape;
  return 0;
};

export const buildTelemetryIncrement = (input: {
  marketplace: Marketplace;
  action: TelemetryAction;
  count?: number;
}): TelemetryIncrement => {
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

export const applyTelemetryIncrement = (
  base: TelemetryCounters,
  increment: TelemetryIncrement
): TelemetryCounters => ({
  signalChecks: base.signalChecks + increment.signalChecks,
  partialFetches: base.partialFetches + increment.partialFetches,
  fullScrapes: base.fullScrapes + increment.fullScrapes,
  proxyGbEstimated: base.proxyGbEstimated + increment.proxyGbEstimated,
  costUsdEstimated: base.costUsdEstimated + increment.costUsdEstimated,
});

export const emptyTelemetryCounters = (): TelemetryCounters => ({
  signalChecks: 0,
  partialFetches: 0,
  fullScrapes: 0,
  proxyGbEstimated: 0,
  costUsdEstimated: 0,
});

export const toRedisHashIncrements = (increment: TelemetryIncrement) => ({
  [telemetryFields.signalChecks]: increment.signalChecks,
  [telemetryFields.partialFetches]: increment.partialFetches,
  [telemetryFields.fullScrapes]: increment.fullScrapes,
  [telemetryFields.proxyGbEstimated]: increment.proxyGbEstimated,
  [telemetryFields.costUsdEstimated]: increment.costUsdEstimated,
});

export type EnforcementEventSnapshot = {
  entitlements: Record<string, unknown> | null | undefined;
  usage: Record<string, unknown> | null | undefined;
};

export type EnforcementEventInput = {
  userId: string;
  marketplace: Marketplace;
  tier: TierKey;
  jobId?: string | null;
  enforcement_mode: 'NORMAL' | 'THROTTLED' | 'BLOCKED';
  decision: 'ALLOW' | 'THROTTLE' | 'BLOCK';
  reason_code: string;
  violated_limit?: string;
  suggested_action?: 'SOFT_LIMIT' | 'HARD_STOP';
  snapshot: EnforcementEventSnapshot;
};

export const recordEnforcementEventIfNeeded = async (
  db: any,
  schema: any,
  input: EnforcementEventInput
) => {
  if (input.enforcement_mode === 'NORMAL') return;

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
