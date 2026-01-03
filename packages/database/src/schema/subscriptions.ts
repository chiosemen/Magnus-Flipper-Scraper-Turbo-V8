import { pgTable, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const subscriptions = pgTable('subscriptions', {
  userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 128 }).notNull(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 128 }).primaryKey(),
  stripePriceId: varchar('stripe_price_id', { length: 128 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  currentPeriodEnd: timestamp('current_period_end'),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  stripeCustomerIdIdx: index('subscriptions_stripe_customer_id_idx').on(table.stripeCustomerId),
}));
