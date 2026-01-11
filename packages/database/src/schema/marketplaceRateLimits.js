import { pgTable, varchar, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
export const marketplaceRateLimits = pgTable('marketplace_rate_limits', {
    id: varchar('id', { length: 64 }).primaryKey(),
    enabled: boolean('enabled').notNull().default(true),
    maxConcurrency: integer('max_concurrency').notNull().default(5),
    jobsPerMinute: integer('jobs_per_minute').notNull().default(30),
    errorThreshold: integer('error_threshold').notNull().default(20),
    cooldownSeconds: integer('cooldown_seconds').notNull().default(300),
    cooldownUntil: timestamp('cooldown_until'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    enabledIdx: index('marketplace_rate_enabled_idx').on(table.enabled),
}));
