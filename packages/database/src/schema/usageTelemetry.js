import { pgTable, uuid, varchar, integer, real, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
export const usageTelemetry = pgTable('usage_telemetry', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
    marketplace: varchar('marketplace', { length: 32 }).notNull(),
    dayKey: varchar('day_key', { length: 10 }).notNull(), // YYYY-MM-DD
    fullRuns: integer('full_runs').default(0).notNull(),
    partialRuns: integer('partial_runs').default(0).notNull(),
    signalChecks: integer('signal_checks').default(0).notNull(),
    proxyGbEstimated: real('proxy_gb_estimated').default(0).notNull(),
    costUsdEstimated: real('cost_usd_estimated').default(0).notNull(),
    lastResetAt: timestamp('last_reset_at').defaultNow().notNull(),
    cooldownUntil: timestamp('cooldown_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('usage_telemetry_user_id_idx').on(table.userId),
    marketplaceIdx: index('usage_telemetry_marketplace_idx').on(table.marketplace),
    dayKeyIdx: index('usage_telemetry_day_key_idx').on(table.dayKey),
    uniqueScopeIdx: index('usage_telemetry_user_market_day_idx').on(table.userId, table.marketplace, table.dayKey),
}));
