import { enforceBudget, buildTelemetryIncrement } from '@repo/telemetry';
import { Marketplace } from '@repo/economics';
import { TIER_GUARDRAILS, TierKey } from '@repo/billing';

export type EnforcementMode = 'FULL' | 'PARTIAL' | 'SIGNAL' | 'BLOCK';
export type EnforcementDecision = {
  allowed: boolean;
  mode: EnforcementMode;
  reason_code: string;
  counters_delta: {
    full?: 1;
    partial?: 1;
    signal?: 1;
    proxy_gb?: number;
  };
  next_allowed_at?: string;
  audit: {
    guardrails_hit: string[];
    degrade_path: string[];
  };
};

export type EnforcementInput = {
  userId: string;
  tier: TierKey;
  marketplace: Marketplace;
  requestedMode: 'FULL' | 'PARTIAL' | 'SIGNAL';
  now: Date;
  recentTelemetry: {
    fullRuns: number;
    partialRuns: number;
    signalChecks: number;
    proxyGbEstimated: number;
    cooldownUntil?: Date | null;
  };
};

const modeToAction = (mode: 'FULL' | 'PARTIAL' | 'SIGNAL') => {
  if (mode === 'FULL') return 'full_scrape' as const;
  if (mode === 'PARTIAL') return 'partial_fetch' as const;
  return 'signal_check' as const;
};

const actionToMode = (action: 'full_scrape' | 'partial_fetch' | 'signal_check'): 'FULL' | 'PARTIAL' | 'SIGNAL' => {
  if (action === 'full_scrape') return 'FULL';
  if (action === 'partial_fetch') return 'PARTIAL';
  return 'SIGNAL';
};

const detectGuardrailHits = (tier: TierKey, usage: EnforcementInput['recentTelemetry']) => {
  const limits = TIER_GUARDRAILS[tier];
  const hits: string[] = [];
  if (usage.fullRuns >= limits.maxFullScrapesPerDay) hits.push('full_scrape_cap');
  if (usage.proxyGbEstimated >= limits.maxProxyGbPerDay) hits.push('proxy_gb_cap');
  return hits;
};

export const evaluateEnforcement = (input: EnforcementInput): EnforcementDecision => {
  const { tier, marketplace, requestedMode, recentTelemetry, now } = input;

  if (recentTelemetry.cooldownUntil && recentTelemetry.cooldownUntil > now) {
    return {
      allowed: false,
      mode: 'BLOCK',
      reason_code: 'cooldown_active',
      counters_delta: {},
      next_allowed_at: recentTelemetry.cooldownUntil.toISOString(),
      audit: {
        guardrails_hit: ['cooldown'],
        degrade_path: [requestedMode, 'BLOCK'],
      },
    };
  }

  const guardrailsHit = detectGuardrailHits(tier, recentTelemetry);
  const projectedAction = modeToAction(requestedMode);
  const gate = enforceBudget({
    userId: input.userId,
    tier,
    marketplace,
    projectedAction: {
      kind: projectedAction,
      currentUsage: {
        fullScrapesToday: recentTelemetry.fullRuns,
        proxyGbToday: recentTelemetry.proxyGbEstimated,
        signalChecksToday: recentTelemetry.signalChecks,
        costUsdToday: 0,
      },
      budgetRemainingUsd: Number.POSITIVE_INFINITY,
    },
  });

  if (gate === 'DENY') {
    return {
      allowed: false,
      mode: 'BLOCK',
      reason_code: guardrailsHit[0] || 'budget_denied',
      counters_delta: {},
      audit: {
        guardrails_hit: guardrailsHit.length ? guardrailsHit : ['budget_denied'],
        degrade_path: [requestedMode, 'BLOCK'],
      },
    };
  }

  const nextAction = gate === 'DOWNGRADE'
    ? (projectedAction === 'full_scrape' ? 'partial_fetch' : 'signal_check')
    : projectedAction;
  const mode = actionToMode(nextAction);

  const increment = buildTelemetryIncrement({
    marketplace,
    action: nextAction,
  });

  return {
    allowed: true,
    mode,
    reason_code: gate === 'DOWNGRADE' ? 'budget_downgrade' : 'allowed',
    counters_delta: {
      full: increment.fullScrapes ? 1 : undefined,
      partial: increment.partialFetches ? 1 : undefined,
      signal: increment.signalChecks ? 1 : undefined,
      proxy_gb: increment.proxyGbEstimated,
    },
    audit: {
      guardrails_hit: guardrailsHit,
      degrade_path: gate === 'DOWNGRADE' ? [requestedMode, mode] : [requestedMode],
    },
  };
};
