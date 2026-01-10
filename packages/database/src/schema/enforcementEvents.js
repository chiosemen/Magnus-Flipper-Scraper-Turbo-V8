import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
export const enforcementEvents = pgTable('enforcement_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
    marketplace: varchar('marketplace', { length: 32 }).notNull(),
    tier: varchar('tier', { length: 32 }).notNull(),
    decision: varchar('decision', { length: 16 }).notNull(),
    mode: varchar('mode', { length: 16 }).notNull(),
    reasonCode: varchar('reason_code', { length: 64 }).notNull(),
    jobId: uuid('job_id'),
    audit: jsonb('audit'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('enforcement_events_user_id_idx').on(table.userId),
    marketplaceIdx: index('enforcement_events_marketplace_idx').on(table.marketplace),
    createdAtIdx: index('enforcement_events_created_at_idx').on(table.createdAt),
}));
