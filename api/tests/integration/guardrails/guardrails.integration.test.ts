import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApiClient } from '../../helpers/supertest';
import { resetDatabase, seedBaselineConfigs, seedUser } from '../../helpers/db';
import { db, schema } from '../../../src/lib/db';
import { desc, eq } from 'drizzle-orm';

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

const seedSubscription = async (override?: Partial<typeof entitlements>) => {
  const snapshot = { ...entitlements, ...(override || {}) };
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

const seedUsageTelemetry = async (
  overrides?: Partial<typeof schema.usageTelemetry.$inferInsert>
) => {
  const dayKey = new Date().toISOString().slice(0, 10);
  const base = {
    userId: 'test_user_123',
    marketplace: 'ebay',
    dayKey,
    fullRuns: 0,
    partialRuns: 0,
    signalChecks: 0,
    proxyGbEstimated: 0,
    costUsdEstimated: 0,
    lastResetAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  await db.insert(schema.usageTelemetry).values(base);
};

describe('API pricing guardrails (integration)', () => {
  const client = createApiClient();

  beforeEach(async () => {
    await resetDatabase();
    await seedBaselineConfigs();
    await seedUser();
    await seedSubscription();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('blocks when daily runs exceed entitlements', async () => {
    await seedUsageTelemetry({ fullRuns: entitlements.maxDailyRuns });

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });

    expect(res.status).toBe(429);
    expect(res.body?.error?.code).toBe('ENFORCEMENT_BLOCKED');

    const [event] = await db.query.enforcementEvents.findMany({
      orderBy: [desc(schema.enforcementEvents.createdAt)],
      limit: 1,
    });
    expect(event?.decision).toBe('BLOCK');
    expect(event?.reasonCode).toBe('MAX_DAILY_RUNS_EXCEEDED');
  });

  it('blocks when proxy GB exceeds entitlements', async () => {
    await seedUsageTelemetry({ proxyGbEstimated: entitlements.maxProxyGbPerDay });

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'phone',
      });

    expect(res.status).toBe(429);
    expect(res.body?.error?.code).toBe('ENFORCEMENT_BLOCKED');

    const [event] = await db.query.enforcementEvents.findMany({
      orderBy: [desc(schema.enforcementEvents.createdAt)],
      limit: 1,
    });
    expect(event?.decision).toBe('BLOCK');
    expect(event?.reasonCode).toBe('MAX_PROXY_GB_EXCEEDED');
  });

  it('throttles when concurrency exceeds entitlements', async () => {
    await seedUsageTelemetry();
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

    await seedSubscription({ maxConcurrencyUser: 1 });

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'camera',
      });

    expect(res.status).toBe(201);

    const [event] = await db.query.enforcementEvents.findMany({
      orderBy: [desc(schema.enforcementEvents.createdAt)],
      limit: 1,
    });
    expect(event?.decision).toBe('THROTTLE');
    expect(event?.mode).toBe('THROTTLED');
    expect(event?.reasonCode).toBe('MAX_CONCURRENCY_EXCEEDED');
  });

  it('allows when under pricing limits', async () => {
    await seedUsageTelemetry();

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'headphones',
      });

    expect(res.status).toBe(201);

    const events = await db.query.enforcementEvents.findMany();
    expect(events.length).toBe(0);
  });

  it('throttles when estimated daily cost exceeds tier ceiling', async () => {
    await seedUsageTelemetry({
      fullRuns: 30,
      proxyGbEstimated: 0.5,
      marketplace: 'facebook',
    });

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'facebook',
        searchQuery: 'luxury watch',
      });

    expect(res.status).toBe(201);

    const [event] = await db.query.enforcementEvents.findMany({
      orderBy: [desc(schema.enforcementEvents.createdAt)],
      limit: 1,
    });
    expect(event?.decision).toBe('THROTTLE');
    expect(event?.mode).toBe('THROTTLED');
    expect(event?.reasonCode).toBe('DAILY_COST_LIMIT_EXCEEDED');
  });

  it('blocks when entitlements snapshot is missing', async () => {
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, 'test_user_123'));

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('ENTITLEMENTS_MISSING');
  });
});
