import { pgTable, uuid, real, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const priceHistory = pgTable('price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  
  price: real('price').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (table) => ({
  dealIdIdx: index('price_history_deal_id_idx').on(table.dealId),
  recordedAtIdx: index('price_history_recorded_at_idx').on(table.recordedAt),
}));
