import { pgTable, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
export const observabilityGates = pgTable('observability_gates', {
    id: varchar('id', { length: 64 }).primaryKey(),
    enabled: boolean('enabled').notNull().default(true),
    windowMinutes: integer('window_minutes').notNull().default(15),
    maxErrorRatePercent: integer('max_error_rate_percent').notNull().default(20),
    maxMedianMs: integer('max_median_ms').notNull().default(15000),
    maxP95Ms: integer('max_p95_ms').notNull().default(30000),
    maxQueueDepth: integer('max_queue_depth').notNull().default(200),
    maxWorkerCrashes: integer('max_worker_crashes').notNull().default(5),
    maxJobsPerMinute: integer('max_jobs_per_minute').notNull().default(120),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
