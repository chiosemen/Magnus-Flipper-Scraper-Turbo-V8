import { EnforcementDecision } from './runtimeEnforcer';

export type EnforcementAuditInput = {
  userId: string;
  marketplace: string;
  tier: string;
  jobId?: string | null;
  decision: EnforcementDecision;
};

export const recordEnforcementEvent = async (db: any, schema: any, input: EnforcementAuditInput) => {
  const { userId, marketplace, tier, jobId, decision } = input;
  const isDowngrade = decision.audit.degrade_path.length > 1;
  const outcome = decision.allowed
    ? (isDowngrade ? 'DOWNGRADE' : 'ALLOW')
    : 'DENY';

  await db.insert(schema.enforcementEvents).values({
    userId,
    marketplace,
    tier,
    jobId: jobId || null,
    decision: outcome,
    mode: decision.mode,
    reasonCode: decision.reason_code,
    audit: decision.audit,
  });
};
