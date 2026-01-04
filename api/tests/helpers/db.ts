import { db, schema } from '../../src/lib/db';
import { sql } from 'drizzle-orm';

export const resetDatabase = async () => {
  await db.execute(sql`
    TRUNCATE TABLE
      ${schema.deals},
      ${schema.jobs},
      ${schema.monitors},
      ${schema.scraperKillSwitches},
      ${schema.observabilityGates},
      ${schema.canaryRamps},
      ${schema.marketplaceRateLimits},
      ${schema.subscriptions},
      ${schema.users},
      ${schema.adminAuditLogs}
    RESTART IDENTITY CASCADE;
  `);
};

export const seedBaselineConfigs = async () => {
  await db.insert(schema.scraperKillSwitches)
    .values({
      id: 'default',
      scrapersEnabled: true,
      facebookEnabled: true,
      vintedEnabled: true,
      realtimeEnabled: true,
      scheduledEnabled: true,
      manualEnabled: true,
      demoModeEnabled: false,
      demoModeExpiresAt: null,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  await db.insert(schema.observabilityGates)
    .values({
      id: 'default',
      enabled: true,
      windowMinutes: 15,
      maxErrorRatePercent: 50,
      maxMedianMs: 20000,
      maxP95Ms: 40000,
      maxQueueDepth: 200,
      maxWorkerCrashes: 5,
      maxJobsPerMinute: 200,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  await db.insert(schema.canaryRamps)
    .values({
      id: 'default',
      rampPercent: 0,
      previousPercent: 0,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  await db.insert(schema.marketplaceRateLimits)
    .values({
      id: 'default',
      enabled: true,
      maxConcurrency: 5,
      jobsPerMinute: 60,
      errorThreshold: 90,
      cooldownSeconds: 60,
      cooldownUntil: null,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
};

export const seedUser = async (overrides?: Partial<typeof schema.users.$inferInsert>) => {
  const user = {
    id: 'test_user_123',
    email: 'jane.doe@example.com',
    displayName: 'Jane Doe',
    photoURL: 'https://lh3.googleusercontent.com/a/default-profile',
    tier: 'free',
    settings: {},
    monitorsUsed: 0,
    jobsUsedToday: 0,
    alertsSentToday: 0,
    quotaResetAt: new Date(),
    totalDealsFound: 0,
    totalProfitTracked: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    ...overrides,
  };

  await db.insert(schema.users).values(user).onConflictDoNothing();
  return user;
};

export const seedMonitor = async (overrides?: Partial<typeof schema.monitors.$inferInsert>) => {
  const monitor = {
    userId: 'test_user_123',
    name: 'Craigslist Bikes',
    sources: ['craigslist'],
    criteria: { keywords: ['bike'] },
    frequency: 'hourly',
    status: 'active',
    notifyEmail: false,
    notifyPush: true,
    notifyInApp: true,
    nextRunAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  const [result] = await db.insert(schema.monitors).values(monitor).returning();
  return result;
};

export const seedDeal = async (overrides?: Partial<typeof schema.deals.$inferInsert>) => {
  const deal = {
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
    ...overrides,
  };

  const [result] = await db.insert(schema.deals).values(deal).returning();
  return result;
};

export const seedJob = async (overrides?: Partial<typeof schema.jobs.$inferInsert>) => {
  const job = {
    userId: 'test_user_123',
    type: 'monitor_search',
    source: 'craigslist',
    status: 'running',
    progress: 10,
    scheduledAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  const [result] = await db.insert(schema.jobs).values(job).returning();
  return result;
};
