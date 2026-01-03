import { pgTable, uuid, varchar, text, real, timestamp, jsonb, integer, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { monitors } from './monitors';

export const deals = pgTable('deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: varchar('source', { length: 32 }).notNull(),
  sourceUrl: text('source_url').notNull(),
  sourceId: varchar('source_id', { length: 255 }).notNull(),
  
  title: varchar('title', { length: 512 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 128 }),
  condition: varchar('condition', { length: 64 }),
  
  listPrice: real('list_price').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  shippingCost: real('shipping_cost').default(0),
  
  marketPrice: real('market_price'),
  profitMargin: real('profit_margin'),
  profitAmount: real('profit_amount'),
  dealScore: integer('deal_score').default(0),
  
  location: varchar('location', { length: 255 }),
  latitude: real('latitude'),
  longitude: real('longitude'),
  
  sellerName: varchar('seller_name', { length: 255 }),
  sellerRating: real('seller_rating'),
  sellerReviews: integer('seller_reviews'),
  
  images: jsonb('images').default([]),
  thumbnailUrl: text('thumbnail_url'),
  
  status: varchar('status', { length: 32 }).default('active').notNull(),
  firstSeenAt: timestamp('first_seen_at').defaultNow(),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
  scrapedAt: timestamp('scraped_at').defaultNow(),
  
  monitorId: uuid('monitor_id').references(() => monitors.id),
  userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('deals_source_idx').on(table.source),
  statusIdx: index('deals_status_idx').on(table.status),
  userIdIdx: index('deals_user_id_idx').on(table.userId),
  monitorIdIdx: index('deals_monitor_id_idx').on(table.monitorId),
  dealScoreIdx: index('deals_score_idx').on(table.dealScore),
  createdAtIdx: index('deals_created_at_idx').on(table.createdAt),
  priceIdx: index('deals_price_idx').on(table.listPrice),
  uniqueSourceItem: unique('deals_source_item_unique').on(table.source, table.sourceId),
}));
