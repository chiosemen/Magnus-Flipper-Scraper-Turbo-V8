import { db, schema } from '../lib/db';
import { eq, sql, desc } from 'drizzle-orm';
import type { JobPayload } from '@repo/types';

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

export class ConcurrencyBackoffError extends Error {
  code: string;
  reason: string;
  retryAfterSec: number;

  constructor(message: string, reason: string, retryAfterSec: number) {
    super(message);
    this.code = 'CONCURRENCY_BACKOFF';
    this.reason = reason;
    this.retryAfterSec = retryAfterSec;
  }
}

export class EntitlementsMissingError extends Error {
  code: string;

  constructor(message: string) {
    super(message);
    this.code = 'ENTITLEMENTS_MISSING';
  }
}

const hasValidEntitlements = (entitlements: EntitlementsSnapshot | null | undefined): entitlements is EntitlementsSnapshot =>
  !!entitlements
  && typeof entitlements.tierKey === 'string'
  && Number.isFinite(entitlements.maxConcurrencyUser)
  && Number.isFinite(entitlements.maxMonitors)
  && Number.isFinite(entitlements.maxBoostedMonitors)
  && Number.isFinite(entitlements.refreshIntervalFloorSeconds)
  && Number.isFinite(entitlements.maxDailyRuns)
  && Number.isFinite(entitlements.maxProxyGbPerDay);

const resolveConcurrencySnapshot = (entitlements: EntitlementsSnapshot): ConcurrencySnapshot => ({
  maxConcurrentJobs: entitlements.maxConcurrencyUser,
  maxMarketplaceParallelism: entitlements.maxConcurrencyUser,
  maxBoostedJobs: entitlements.maxBoostedMonitors,
});

const computeBackoffSeconds = (attempt?: number) => {
  const base = 30;
  const multiplier = Math.max(1, attempt ?? 1);
  const raw = Math.min(900, base * Math.pow(2, multiplier - 1));
  const jitter = raw * (0.8 + Math.random() * 0.4);
  return Math.max(5, Math.round(jitter));
};

export const assertConcurrencyWithinLimits = async (payload: JobPayload) => {
  const userId = payload.meta.userId;
  const marketplace = payload.source;
  const attempt = payload.meta.attempt ?? 1;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, userId),
    orderBy: [desc(schema.subscriptions.updatedAt)],
  });

  const entitlements = subscription?.entitlementsJson as EntitlementsSnapshot | null;
  if (!hasValidEntitlements(entitlements)) {
    throw new EntitlementsMissingError('Entitlements snapshot missing');
  }

  const limits = resolveConcurrencySnapshot(entitlements);
  const runningJobs = await db.execute(sql`
    SELECT count(*) as count FROM ${schema.jobs}
    WHERE user_id = ${userId} AND status = 'running'
  `);
  const runningCount = Number(runningJobs[0]?.count || 0);
  if (runningCount >= limits.maxConcurrentJobs) {
    throw new ConcurrencyBackoffError(
      'User concurrency limit reached',
      'USER_CONCURRENCY_LIMIT',
      computeBackoffSeconds(attempt)
    );
  }

  const runningMarketplace = await db.execute(sql`
    SELECT count(*) as count FROM ${schema.jobs}
    WHERE user_id = ${userId} AND status = 'running' AND source = ${marketplace}
  `);
  const marketplaceCount = Number(runningMarketplace[0]?.count || 0);
  if (marketplaceCount >= limits.maxMarketplaceParallelism) {
    throw new ConcurrencyBackoffError(
      'Marketplace concurrency limit reached',
      'MARKETPLACE_CONCURRENCY_LIMIT',
      computeBackoffSeconds(attempt)
    );
  }

  return { entitlements, limits };
};
