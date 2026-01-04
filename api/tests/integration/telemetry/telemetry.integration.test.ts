import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApiClient } from '../../helpers/supertest';
import { resetDatabase, seedBaselineConfigs, seedUser } from '../../helpers/db';
import { db, schema } from '../../../src/lib/db';

const authHeader = { Authorization: 'Bearer test-token' };
const ORIGINAL_ENV = { ...process.env };

const entitlements = {
  tierKey: 'basic',
  maxConcurrencyUser: 2,
  maxMonitors: 25,
  maxBoostedMonitors: 2,
  refreshIntervalFloorSeconds: 43200,
  maxDailyRuns: 40,
  maxProxyGbPerDay: 1.0,
  entitlementsVersion: 1,
};

const seedSubscription = async (
  userId: string,
  override?: Partial<typeof entitlements>
) => {
  const snapshot = { ...entitlements, ...(override || {}) };
  await db.insert(schema.subscriptions)
    .values({
      userId,
      stripeCustomerId: `cus_${userId}`,
      stripeSubscriptionId: `sub_${userId}`,
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

const seedUsageTelemetry = async (input: {
  userId: string;
  dayKey: string;
  fullRuns: number;
  partialRuns: number;
  signalChecks: number;
  proxyGbEstimated: number;
  costUsdEstimated: number;
}) => {
  await db.insert(schema.usageTelemetry).values({
    userId: input.userId,
    marketplace: 'ebay',
    dayKey: input.dayKey,
    fullRuns: input.fullRuns,
    partialRuns: input.partialRuns,
    signalChecks: input.signalChecks,
    proxyGbEstimated: input.proxyGbEstimated,
    costUsdEstimated: input.costUsdEstimated,
    lastResetAt: new Date(`${input.dayKey}T00:00:00.000Z`),
    updatedAt: new Date(`${input.dayKey}T03:00:00.000Z`),
  });
};

const seedEnforcementEvent = async (input: {
  userId: string;
  createdAt: Date;
  reasonCode: string;
  decision: string;
  mode: string;
}) => {
  await db.insert(schema.enforcementEvents).values({
    userId: input.userId,
    marketplace: 'ebay',
    tier: entitlements.tierKey,
    decision: input.decision,
    mode: input.mode,
    reasonCode: input.reasonCode,
    jobId: null,
    audit: { sample: true },
    createdAt: input.createdAt,
  });
};

describe('API telemetry usage route (integration)', () => {
  const client = createApiClient();

  beforeEach(async () => {
    await resetDatabase();
    await seedBaselineConfigs();
    await seedUser();
    await seedUser({ id: 'test_user_456', email: 'john.doe@example.com' });
    await db.delete(schema.usageTelemetry);
    await db.delete(schema.enforcementEvents);
    process.env.ADMIN_USER_IDS = 'test_user_123';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns deterministic telemetry snapshots and fails closed on missing telemetry', async () => {
    const dateWithData = '2024-01-01';
    const dateMissing = '2024-01-02';

    await seedSubscription('test_user_123');
    await seedSubscription('test_user_456');

    await seedUsageTelemetry({
      userId: 'test_user_123',
      dayKey: dateWithData,
      fullRuns: 3,
      partialRuns: 1,
      signalChecks: 2,
      proxyGbEstimated: 0.6,
      costUsdEstimated: 1.2,
    });

    await seedEnforcementEvent({
      userId: 'test_user_123',
      createdAt: new Date('2024-01-01T01:00:00.000Z'),
      reasonCode: 'test_reason_1',
      decision: 'THROTTLE',
      mode: 'THROTTLED',
    });
    await seedEnforcementEvent({
      userId: 'test_user_123',
      createdAt: new Date('2024-01-01T02:00:00.000Z'),
      reasonCode: 'test_reason_2',
      decision: 'BLOCK',
      mode: 'BLOCKED',
    });

    const res = await client.get(`/api/telemetry/usage?userId=test_user_123&date=${dateWithData}`)
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body?.data?.usageTelemetry).toHaveLength(1);
    expect(res.body?.data?.usageTelemetry[0]).toMatchObject({
      userId: 'test_user_123',
      marketplace: 'ebay',
      dayKey: dateWithData,
      fullRuns: 3,
      partialRuns: 1,
      signalChecks: 2,
      proxyGbEstimated: 0.6,
      costUsdEstimated: 1.2,
    });
    expect(res.body?.data?.enforcementEvents).toHaveLength(2);
    expect(res.body?.data?.enforcementEvents[0]?.reasonCode).toBe('test_reason_2');
    expect(res.body?.data?.entitlements?.tierKey).toBe(entitlements.tierKey);

    const resMissing = await client.get(`/api/telemetry/usage?userId=test_user_456&date=${dateMissing}`)
      .set(authHeader);

    expect(resMissing.status).toBe(200);
    expect(resMissing.body?.data?.usageTelemetry).toEqual([]);
    expect(resMissing.body?.data?.enforcementEvents).toEqual([]);
    expect(resMissing.body?.data?.entitlements?.tierKey).toBe(entitlements.tierKey);
  });
});
