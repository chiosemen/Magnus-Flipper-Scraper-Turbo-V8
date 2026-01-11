import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { monitors } from './monitors';
export const jobs = pgTable('jobs', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 32 }).notNull(),
    source: varchar('source', { length: 32 }).notNull(),
    monitorId: uuid('monitor_id').references(() => monitors.id),
    userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
    urls: jsonb('urls'), // Array of URLs to scrape
    searchQuery: text('search_query'),
    status: varchar('status', { length: 32 }).default('pending').notNull(),
    progress: integer('progress').default(0),
    dealsFound: integer('deals_found').default(0),
    dealsNew: integer('deals_new').default(0),
    dealsUpdated: integer('deals_updated').default(0),
    pagesScraped: integer('pages_scraped').default(0),
    error: jsonb('error'),
    retries: integer('retries').default(0),
    maxRetries: integer('max_retries').default(3),
    scheduledAt: timestamp('scheduled_at').defaultNow(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    workerId: varchar('worker_id', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('jobs_user_id_idx').on(table.userId),
    statusIdx: index('jobs_status_idx').on(table.status),
    monitorIdIdx: index('jobs_monitor_id_idx').on(table.monitorId),
    scheduledAtIdx: index('jobs_scheduled_at_idx').on(table.scheduledAt),
    createdAtIdx: index('jobs_created_at_idx').on(table.createdAt),
}));
