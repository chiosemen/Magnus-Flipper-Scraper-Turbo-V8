import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const canaryRamps = pgTable('canary_ramps', {
  id: varchar('id', { length: 64 }).primaryKey(),
  rampPercent: integer('ramp_percent').notNull().default(0),
  previousPercent: integer('previous_percent').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
