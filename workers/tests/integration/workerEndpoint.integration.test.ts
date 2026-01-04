import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createWorkerClient } from '../helpers/supertest';
import { resetDatabase, seedBaselineConfigs, seedMonitor, seedUser } from '../helpers/db';
import { jobRouter } from '../../src/index';
import { CraigslistScraper } from '../../src/scrapers/craigslist.scraper';
import { db, schema } from '../../src/lib/db';
import { eq } from 'drizzle-orm';

class FixtureCraigslistScraper extends CraigslistScraper {
  private html: string;
  constructor(html: string) {
    super();
    this.html = html;
  }

  buildSearchUrl(): string {
    const encoded = encodeURIComponent(this.html);
    return `data:text/html,${encoded}`;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, '../fixtures/html', name), 'utf-8');

describe('worker /v1/process (integration)', () => {
  const client = createWorkerClient();
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(async () => {
    await resetDatabase();
    await seedBaselineConfigs();
    await seedUser();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('rejects missing worker token', async () => {
    const res = await client.post('/v1/process').send({ any: 'payload' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid payloads', async () => {
    const res = await client.post('/v1/process')
      .set('x-worker-token', 'test-worker-secret')
      .send({ bad: 'payload' });
    expect(res.status).toBe(400);
  });

  it('executes a real scrape path and persists deals', async () => {
    const monitor = await seedMonitor();

    const scraper = new FixtureCraigslistScraper(fixture('craigslist-search.html'));
    const routerAny = jobRouter as any;
    routerAny.scrapers = { ...routerAny.scrapers, craigslist: scraper };

    const payload = {
      jobId: crypto.randomUUID(),
      type: 'monitor_search',
      source: 'craigslist',
      params: {
        monitorId: monitor.id,
        searchQuery: 'bike',
      },
      meta: {
        userId: 'test_user_123',
        attempt: 1,
      },
    };

    const res = await client.post('/v1/process')
      .set('x-worker-token', 'test-worker-secret')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stored = await db.query.deals.findMany({
      where: (fields, { eq }) => eq(fields.userId, 'test_user_123'),
    });
    expect(stored.length).toBeGreaterThan(0);

    const res2 = await client.post('/v1/process')
      .set('x-worker-token', 'test-worker-secret')
      .send({ ...payload, jobId: crypto.randomUUID() });
    expect(res2.status).toBe(200);

    const storedAfter = await db.query.deals.findMany({
      where: (fields, { eq }) => eq(fields.userId, 'test_user_123'),
    });
    expect(storedAfter.length).toBe(stored.length);
  });

  it('returns tier limit errors for over-quota users', async () => {
    const monitor = await seedMonitor();
    await seedMonitor();
    await seedMonitor();
    await seedMonitor();

    const scraper = new FixtureCraigslistScraper(fixture('craigslist-search.html'));
    const routerAny = jobRouter as any;
    routerAny.scrapers = { ...routerAny.scrapers, craigslist: scraper };

    const payload = {
      jobId: crypto.randomUUID(),
      type: 'monitor_search',
      source: 'craigslist',
      params: {
        monitorId: monitor.id,
        searchQuery: 'bike',
      },
      meta: {
        userId: 'test_user_123',
        attempt: 1,
      },
    };

    const res = await client.post('/v1/process')
      .set('x-worker-token', 'test-worker-secret')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('TIER_MONITOR_LIMIT');
  });

  it('rejects when kill switch disables scrapers', async () => {
    await db.update(schema.scraperKillSwitches)
      .set({ scrapersEnabled: false, updatedAt: new Date() })
      .where(eq(schema.scraperKillSwitches.id, 'default'));

    const payload = {
      jobId: crypto.randomUUID(),
      type: 'monitor_search',
      source: 'craigslist',
      params: {
        searchQuery: 'bike',
      },
      meta: {
        userId: 'test_user_123',
        attempt: 1,
      },
    };

    const res = await client.post('/v1/process')
      .set('x-worker-token', 'test-worker-secret')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('SCRAPERS_DISABLED');
  });

  it('rejects when observability gate is closed', async () => {
    await db.update(schema.observabilityGates)
      .set({ maxJobsPerMinute: 0, updatedAt: new Date() })
      .where(eq(schema.observabilityGates.id, 'default'));

    await db.insert(schema.jobs).values({
      type: 'monitor_search',
      source: 'craigslist',
      status: 'queued',
      userId: 'test_user_123',
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const payload = {
      jobId: crypto.randomUUID(),
      type: 'monitor_search',
      source: 'craigslist',
      params: {
        searchQuery: 'bike',
      },
      meta: {
        userId: 'test_user_123',
        attempt: 1,
      },
    };

    const res = await client.post('/v1/process')
      .set('x-worker-token', 'test-worker-secret')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('OBSERVABILITY_GATE_CLOSED');
  });

  it('blocks demo mode sources not on allowlist', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(schema.scraperKillSwitches)
      .set({ demoModeEnabled: true, demoModeExpiresAt: future, updatedAt: new Date() })
      .where(eq(schema.scraperKillSwitches.id, 'default'));

    process.env.DEMO_ALLOWED_SOURCES = 'facebook';

    const payload = {
      jobId: crypto.randomUUID(),
      type: 'monitor_search',
      source: 'craigslist',
      params: {
        searchQuery: 'bike',
      },
      meta: {
        userId: 'test_user_123',
        attempt: 1,
      },
    };

    const res = await client.post('/v1/process')
      .set('x-worker-token', 'test-worker-secret')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('DEMO_SOURCE_BLOCKED');
  });
});
