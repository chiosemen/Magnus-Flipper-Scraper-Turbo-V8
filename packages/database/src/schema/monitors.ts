import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const monitors = pgTable('monitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  sources: jsonb('sources').notNull(), // Array of DealSource
  criteria: jsonb('criteria').notNull(), // SearchCriteria object
  
  frequency: varchar('frequency', { length: 32 }).default('hourly').notNull(),
  status: varchar('status', { length: 32 }).default('active').notNull(),
  
  notifyEmail: boolean('notify_email').default(false),
  notifyPush: boolean('notify_push').default(true),
  notifyInApp: boolean('notify_in_app').default(true),
  
  totalDealsFound: integer('total_deals_found').default(0),
  lastRunAt: timestamp('last_run_at'),
  lastDealFoundAt: timestamp('last_deal_found_at'),
  nextRunAt: timestamp('next_run_at'),
  consecutiveErrors: integer('consecutive_errors').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('monitors_user_id_idx').on(table.userId),
  statusIdx: index('monitors_status_idx').on(table.status),
  nextRunAtIdx: index('monitors_next_run_at_idx').on(table.nextRunAt),
}));
