import { pgTable, varchar, timestamp, jsonb, integer, index, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(), // Firebase UID
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }),
  photoURL: varchar('photo_url', { length: 512 }),
  
  tier: varchar('tier', { length: 32 }).default('free').notNull(),
  tierExpiresAt: timestamp('tier_expires_at'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 128 }),
  stripeSubscriptionStatus: varchar('stripe_subscription_status', { length: 32 }),
  
  settings: jsonb('settings').default({}),
  
  monitorsUsed: integer('monitors_used').default(0),
  jobsUsedToday: integer('jobs_used_today').default(0),
  alertsSentToday: integer('alerts_sent_today').default(0),
  quotaResetAt: timestamp('quota_reset_at'),
  
  totalDealsFound: integer('total_deals_found').default(0),
  totalProfitTracked: real('total_profit_tracked').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  tierIdx: index('users_tier_idx').on(table.tier),
}));
