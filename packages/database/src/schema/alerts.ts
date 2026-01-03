import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { deals } from './deals';
import { monitors } from './monitors';

export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  monitorId: uuid('monitor_id').references(() => monitors.id),
  
  type: varchar('type', { length: 32 }).notNull(), // new_deal, price_drop, back_in_stock
  message: text('message').notNull(),
  
  read: boolean('read').default(false),
  sentVia: jsonb('sent_via').default([]), // ['email', 'push', 'sms']
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('alerts_user_id_idx').on(table.userId),
  readIdx: index('alerts_read_idx').on(table.read),
  createdAtIdx: index('alerts_created_at_idx').on(table.createdAt),
}));
