import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
export const scraperKillSwitches = pgTable('scraper_kill_switches', {
    id: varchar('id', { length: 64 }).primaryKey(),
    scrapersEnabled: boolean('scrapers_enabled').notNull().default(true),
    facebookEnabled: boolean('facebook_enabled').notNull().default(true),
    vintedEnabled: boolean('vinted_enabled').notNull().default(true),
    realtimeEnabled: boolean('realtime_enabled').notNull().default(true),
    scheduledEnabled: boolean('scheduled_enabled').notNull().default(true),
    manualEnabled: boolean('manual_enabled').notNull().default(true),
    demoModeEnabled: boolean('demo_mode_enabled').notNull().default(false),
    demoModeExpiresAt: timestamp('demo_mode_expires_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
