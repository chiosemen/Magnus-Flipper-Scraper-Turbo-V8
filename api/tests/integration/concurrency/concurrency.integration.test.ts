import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createApiClient } from '../../helpers/supertest';
import { resetDatabase, seedBaselineConfigs, seedUser } from '../../helpers/db';
import { db, schema } from '../../../src/lib/db';
import { desc, eq } from 'drizzle-orm';

const authHeader = { Authorization: 'Bearer test-token' };
const ORIGINAL_ENV = { ...process.env };

const entitlements = {
  tierKey: 'basic',
  maxConcurrencyUser: 1,
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

describe('API concurrency enforcement (integration)', () => {
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

  it('rejects job creation when user concurrency exceeds entitlements', async () => {
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

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });

    expect(res.status).toBe(201);

    const [event] = await db.query.enforcementEvents.findMany({
      orderBy: [desc(schema.enforcementEvents.createdAt)],
      limit: 1,
    });
    expect(event?.mode).toBe('THROTTLED');
    expect(event?.reasonCode).toBe('MAX_CONCURRENCY_EXCEEDED');
  });

  it('applies downgraded entitlements immediately', async () => {
    await seedSubscription({ maxConcurrencyUser: 3 });

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

    const allowRes = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'phone',
      });

    expect(allowRes.status).toBe(201);

    await seedSubscription({ maxConcurrencyUser: 1 });

    const blockRes = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'phone',
      });

    expect(blockRes.status).toBe(201);

    const [event] = await db.query.enforcementEvents.findMany({
      orderBy: [desc(schema.enforcementEvents.createdAt)],
      limit: 1,
    });
    expect(event?.mode).toBe('THROTTLED');
    expect(event?.reasonCode).toBe('MAX_CONCURRENCY_EXCEEDED');
  });

  it('fails closed when entitlements snapshot missing', async () => {
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
