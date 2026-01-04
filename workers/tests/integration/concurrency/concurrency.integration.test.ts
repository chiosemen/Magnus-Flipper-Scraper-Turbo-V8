import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, schema } from '../../../src/lib/db';
import { resetDatabase, seedBaselineConfigs, seedUser } from '../../helpers/db';
import { assertConcurrencyWithinLimits, ConcurrencyBackoffError, EntitlementsMissingError } from '../../../src/services/concurrency.service';

const baseEntitlements = {
  tierKey: 'basic',
  maxConcurrencyUser: 2,
  maxMonitors: 25,
  maxBoostedMonitors: 2,
  refreshIntervalFloorSeconds: 43200,
  maxDailyRuns: 40,
  maxProxyGbPerDay: 1.0,
  entitlementsVersion: 1,
};

const seedSubscription = async (override?: Partial<typeof baseEntitlements>) => {
  const snapshot = { ...baseEntitlements, ...(override || {}) };
  await db.insert(schema.subscriptions)
    .values({
      userId: 'test_user_123',
      stripeCustomerId: 'cus_test_123',
      stripeSubscriptionId: 'sub_test_123',
      stripePriceId: 'price_basic',
      tier: snapshot.tierKey,
      status: 'active',
      entitlementsJson: snapshot,
      currentPeriodEnd: new Date(Date.now() + 86400 * 1000),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.stripeSubscriptionId,
      set: {
        tier: snapshot.tierKey,
        entitlementsJson: snapshot,
        updatedAt: new Date(),
      },
    });
};

describe('worker concurrency enforcement (integration)', () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedBaselineConfigs();
    await seedUser();
    await seedSubscription();
  });

  it('blocks when entitlements are missing', async () => {
    await db.delete(schema.subscriptions);

    const payload = {
      jobId: '11111111-1111-1111-1111-111111111111',
      type: 'monitor_search',
      source: 'craigslist',
      params: {},
      meta: { userId: 'test_user_123', attempt: 1 },
    } as any;

    await expect(assertConcurrencyWithinLimits(payload)).rejects.toBeInstanceOf(EntitlementsMissingError);
  });

  it('backoffs when user concurrency is exceeded', async () => {
    await db.insert(schema.jobs).values({
      userId: 'test_user_123',
      type: 'monitor_search',
      source: 'craigslist',
      status: 'running',
      progress: 10,
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const payload = {
      jobId: '22222222-2222-2222-2222-222222222222',
      type: 'monitor_search',
      source: 'craigslist',
      params: {},
      meta: { userId: 'test_user_123', attempt: 1 },
    } as any;

    await expect(assertConcurrencyWithinLimits(payload)).rejects.toBeInstanceOf(ConcurrencyBackoffError);
  });

  it('drops concurrency immediately after downgrade', async () => {
    const payload = {
      jobId: '33333333-3333-3333-3333-333333333333',
      type: 'monitor_search',
      source: 'craigslist',
      params: {},
      meta: { userId: 'test_user_123', attempt: 1 },
    } as any;

    await expect(assertConcurrencyWithinLimits(payload)).resolves.toBeDefined();

    await seedSubscription({ maxConcurrencyUser: 0 });

    await expect(assertConcurrencyWithinLimits(payload)).rejects.toBeInstanceOf(ConcurrencyBackoffError);
  });

  it('sets jittered backoff when throttled', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await db.insert(schema.jobs).values({
      userId: 'test_user_123',
      type: 'monitor_search',
      source: 'craigslist',
      status: 'running',
      progress: 10,
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const payload = {
      jobId: '44444444-4444-4444-4444-444444444444',
      type: 'monitor_search',
      source: 'craigslist',
      params: {},
      meta: { userId: 'test_user_123', attempt: 1 },
    } as any;

    try {
      await assertConcurrencyWithinLimits(payload);
    } catch (err) {
      const error = err as ConcurrencyBackoffError;
      expect(error.retryAfterSec).toBeGreaterThanOrEqual(24);
      expect(error.retryAfterSec).toBeLessThanOrEqual(36);
    }
  });
});
