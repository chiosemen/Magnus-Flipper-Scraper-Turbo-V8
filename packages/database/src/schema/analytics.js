import { pgTable, uuid, varchar, date, integer, real, index, unique, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
export const dailyStats = pgTable('daily_stats', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
    date: date('date').notNull(),
    dealsFound: integer('deals_found').default(0),
    dealsViewed: integer('deals_viewed').default(0),
    dealsPurchased: integer('deals_purchased').default(0),
    totalProfit: real('total_profit').default(0),
    jobsRun: integer('jobs_run').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    userDateIdx: index('daily_stats_user_date_idx').on(table.userId, table.date),
    uniqueUserDate: unique('daily_stats_unique_user_date').on(table.userId, table.date),
}));
export const scrapePerformance = pgTable('scrape_performance', {
    id: uuid('id').defaultRandom().primaryKey(),
    source: varchar('source', { length: 32 }).notNull(),
    date: date('date').notNull(),
    totalRequests: integer('total_requests').default(0),
    successCount: integer('success_count').default(0),
    failureCount: integer('failure_count').default(0),
    avgResponseTimeMs: integer('avg_response_time_ms').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    uniqueSourceDate: unique('scrape_perf_unique_source_date').on(table.source, table.date),
}));
