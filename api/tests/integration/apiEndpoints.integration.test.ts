import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../helpers/supertest';
import { resetDatabase, seedBaselineConfigs, seedDeal, seedMonitor, seedUser, seedJob } from '../helpers/db';
import { mockCloudTasks } from '../mocks/cloudTasks';
import { getTestFirestore } from '../mocks/firebase';
import { db, schema } from '../../src/lib/db';
import { eq, sql } from 'drizzle-orm';

let stripeEvent: any;
const ORIGINAL_ENV = { ...process.env };

vi.mock('../../src/lib/stripe', () => {
  const stubStripe = {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_test_123' }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/session' }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.test/portal' }) } },
    webhooks: {
      constructEvent: vi.fn().mockImplementation(() => stripeEvent),
    },
  };

  return { getStripeClient: () => stubStripe };
});

const authHeader = { Authorization: 'Bearer test-token' };

describe('API endpoints (integration)', () => {
  const client = createApiClient();

  beforeEach(async () => {
    await resetDatabase();
    await seedBaselineConfigs();
    await seedUser();
    process.env.ADMIN_USER_IDS = 'test_user_123';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('GET /api/health returns ok', async () => {
    const res = await client.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/version returns build metadata', async () => {
    const res = await client.get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('api');
    expect(res.body.gitSha).toBeDefined();
    expect(res.body.buildTime).toBeDefined();
  });

  it('POST /api/auth/verify creates or returns user', async () => {
    const res = await client.post('/api/auth/verify').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('test_user_123');
  });

  it('rejects missing auth header on protected routes', async () => {
    const res = await client.get('/api/jobs');
    expect(res.status).toBe(401);
  });

  it('GET /api/users/me returns profile', async () => {
    const res = await client.get('/api/users/me').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('test_user_123');
  });

  it('GET /api/analytics/dashboard returns stats', async () => {
    const res = await client.get('/api/analytics/dashboard').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeDefined();
  });

  it('commits and rolls back database transactions', async () => {
    const before = await db.execute(sql`SELECT count(*) as count FROM ${schema.deals};`);
    const initialCount = Number(before[0]?.count || 0);

    await db.transaction(async (tx) => {
      await tx.insert(schema.deals).values({
        source: 'craigslist',
        sourceUrl: 'https://sfbay.craigslist.org/sfc/bik/d/san-francisco-trek-fx-2-disc/7777777777.html',
        sourceId: '7777777777',
        title: 'Trek FX 2 Disc Hybrid Bike',
        category: 'bikes',
        condition: 'good',
        listPrice: 380,
        currency: 'USD',
        images: ['https://images.craigslist.org/00a0a_bike.jpg'],
        thumbnailUrl: 'https://images.craigslist.org/00a0a_bike.jpg',
        status: 'active',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        scrapedAt: new Date(),
        monitorId: null,
        userId: 'test_user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    try {
      await db.transaction(async (tx) => {
        await tx.insert(schema.deals).values({
          source: 'craigslist',
          sourceUrl: 'https://sfbay.craigslist.org/sfc/bik/d/san-francisco-trek-fx-2-disc/7777777778.html',
          sourceId: '7777777778',
          title: 'Trek FX 3 Disc Hybrid Bike',
          category: 'bikes',
          condition: 'good',
          listPrice: 450,
          currency: 'USD',
          images: ['https://images.craigslist.org/00a0a_bike2.jpg'],
          thumbnailUrl: 'https://images.craigslist.org/00a0a_bike2.jpg',
          status: 'active',
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          scrapedAt: new Date(),
          monitorId: null,
          userId: 'test_user_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        throw new Error('force rollback');
      });
    } catch {
      // expected
    }

    const after = await db.execute(sql`SELECT count(*) as count FROM ${schema.deals};`);
    const finalCount = Number(after[0]?.count || 0);
    expect(finalCount).toBe(initialCount + 1);
  });

  it('Deals endpoints list/get/update/flag/delete', async () => {
    const deal = await seedDeal();

    const listRes = await client.get('/api/deals').set(authHeader);
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThan(0);

    const getRes = await client.get(`/api/deals/${deal.id}`).set(authHeader);
    expect(getRes.status).toBe(200);

    const patchRes = await client.patch(`/api/deals/${deal.id}`)
      .set(authHeader)
      .send({ status: 'flagged' });
    expect(patchRes.status).toBe(200);

    const flagRes = await client.post(`/api/deals/${deal.id}/flag`)
      .set(authHeader)
      .send({ reason: 'suspicious' });
    expect(flagRes.status).toBe(200);

    const deleteRes = await client.delete(`/api/deals/${deal.id}`).set(authHeader);
    expect(deleteRes.status).toBe(200);
  });

  it('Monitors endpoints create/list/pause/resume/delete', async () => {
    const createRes = await client.post('/api/monitors')
      .set(authHeader)
      .send({
        name: 'Craigslist Bikes',
        sources: ['craigslist'],
        criteria: { keywords: ['bike'] },
        frequency: 'hourly',
        status: 'active',
        notifyEmail: false,
        notifyPush: true,
        notifyInApp: true,
      });

    expect(createRes.status).toBe(201);
    const monitorId = createRes.body.data.id;

    const listRes = await client.get('/api/monitors').set(authHeader);
    expect(listRes.status).toBe(200);

    const pauseRes = await client.post(`/api/monitors/${monitorId}/pause`).set(authHeader);
    expect(pauseRes.status).toBe(200);

    const resumeRes = await client.post(`/api/monitors/${monitorId}/resume`).set(authHeader);
    expect(resumeRes.status).toBe(200);

    const deleteRes = await client.delete(`/api/monitors/${monitorId}`).set(authHeader);
    expect(deleteRes.status).toBe(200);
  });

  it('Jobs endpoints create/list/cancel and dispatch task', async () => {
    const createRes = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });

    expect(createRes.status).toBe(201);

    const listRes = await client.get('/api/jobs').set(authHeader);
    expect(listRes.status).toBe(200);

    const jobId = createRes.body.data.id;
    const firestore = getTestFirestore();
    const jobDoc = await firestore.collection('jobs').doc(jobId).get();
    expect(jobDoc.exists).toBe(true);

    const cancelRes = await client.delete(`/api/jobs/${jobId}`).set(authHeader);
    expect(cancelRes.status).toBe(200);

    expect(mockCloudTasks.getPendingTasks().length).toBeGreaterThan(0);
  });

  it('rejects invalid job payloads and enforces concurrency limit', async () => {
    const invalidRes = await client.post('/api/jobs')
      .set(authHeader)
      .send({ source: 'craigslist' });
    expect(invalidRes.status).toBe(400);

    await seedJob({ status: 'running' });

    const limitRes = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });
    expect(limitRes.status).toBe(429);
  });

  it('blocks job creation when kill switch disables scrapers', async () => {
    await db.update(schema.scraperKillSwitches)
      .set({ scrapersEnabled: false, updatedAt: new Date() })
      .where(eq(schema.scraperKillSwitches.id, 'default'));

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SCRAPERS_DISABLED');
  });

  it('blocks dispatch when observability gate is closed', async () => {
    await db.update(schema.observabilityGates)
      .set({ maxJobsPerMinute: 0, updatedAt: new Date() })
      .where(eq(schema.observabilityGates.id, 'default'));

    await seedJob({ status: 'queued', createdAt: new Date() });

    const res = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('OBSERVABILITY_GATE_CLOSED');
  });

  it('Stripe checkout + portal + webhook update subscription', async () => {
    const checkoutRes = await client.post('/api/stripe/checkout')
      .set(authHeader)
      .send({ tier: 'pro' });
    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.url).toContain('https://checkout.stripe.test');

    const portalRes = await client.get('/api/stripe/portal').set(authHeader);
    expect(portalRes.status).toBe(200);
    expect(portalRes.body.url).toContain('https://billing.stripe.test');

    stripeEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          items: { data: [{ price: { id: process.env.STRIPE_PRICE_ID_PRO } }] },
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
          metadata: { userId: 'test_user_123' },
        },
      },
    };

    const webhookRes = await client.post('/api/stripe/webhook')
      .set('stripe-signature', 'sig_test')
      .send('test-body');

    expect(webhookRes.status).toBe(200);
  });

  it('blocks Stripe actions and routes demo jobs to demo queue', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(schema.scraperKillSwitches)
      .set({ demoModeEnabled: true, demoModeExpiresAt: future, updatedAt: new Date() })
      .where(eq(schema.scraperKillSwitches.id, 'default'));

    process.env.DEMO_GCP_QUEUE_NAME = 'demo-queue';
    process.env.DEMO_ALLOWED_SOURCES = 'craigslist';

    const jobRes = await client.post('/api/jobs')
      .set(authHeader)
      .send({
        type: 'monitor_search',
        source: 'craigslist',
        searchQuery: 'bike',
      });

    expect(jobRes.status).toBe(201);
    const tasks = mockCloudTasks.getPendingTasks();
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].name).toContain('queues/demo-queue');

    const checkoutRes = await client.post('/api/stripe/checkout')
      .set(authHeader)
      .send({ tier: 'pro' });
    expect(checkoutRes.status).toBe(403);
  });

  it('Admin endpoints status + controls + kill-switch update', async () => {
    const statusRes = await client.get('/api/admin/status').set(authHeader);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.isAdmin).toBe(true);

    const controlsRes = await client.get('/api/admin/controls').set(authHeader);
    expect(controlsRes.status).toBe(200);

    const patchRes = await client.patch('/api/admin/controls/kill-switches')
      .set(authHeader)
      .send({ scrapersEnabled: false });
    expect(patchRes.status).toBe(200);
  });
});
