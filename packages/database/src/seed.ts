import { db } from './index';
import { users, monitors, deals, jobs } from './index';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create User
  const userId = 'user_dev_123';
  await db.insert(users).values({
    id: userId,
    email: 'dev@magnusflipper.ai',
    displayName: 'Dev User',
    tier: 'pro',
    settings: {
        display: { theme: 'dark', currency: 'USD', timezone: 'UTC' },
        notifications: { email: true, push: true, sms: false, minDealScore: 50 },
        scraping: {}
    },
    quotaResetAt: new Date(Date.now() + 86400000), // Tomorrow
  }).onConflictDoNothing();

  // 2. Create Monitor
  const monitorId = uuidv4();
  await db.insert(monitors).values({
    id: monitorId,
    userId: userId,
    name: 'Sony Headphones (eBay)',
    sources: ['ebay'],
    criteria: {
      keywords: ['Sony WH-1000XM5'],
      minPrice: 150,
      maxPrice: 300,
      conditions: ['used', 'open_box']
    },
    frequency: 'hourly',
    status: 'active',
  });

  // 3. Create Deals
  const dealId = uuidv4();
  await db.insert(deals).values({
    id: dealId,
    monitorId: monitorId,
    userId: userId,
    source: 'ebay',
    sourceUrl: 'https://ebay.com/itm/123456',
    sourceId: 'itm_123456',
    title: 'Sony WH-1000XM5 Wireless Headphones - Black',
    listPrice: 220.00,
    currency: 'USD',
    dealScore: 85,
    condition: 'used',
    sellerName: 'audio_flipper_99',
    sellerRating: 4.9,
    status: 'active',
    images: ['https://example.com/sony.jpg'],
  });

  // 4. Create Job
  await db.insert(jobs).values({
    type: 'monitor_search',
    source: 'ebay',
    monitorId: monitorId,
    userId: userId,
    status: 'completed',
    dealsFound: 1,
    dealsNew: 1,
  });

  console.log('✅ Seeding complete.');
  (process as any).exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  (process as any).exit(1);
});