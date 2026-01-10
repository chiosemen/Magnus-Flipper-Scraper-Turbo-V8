import { pgTable, varchar, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
export const subscriptions = pgTable('subscriptions', {
    userId: varchar('user_id', { length: 128 }).references(() => users.id).notNull(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 128 }).notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 128 }).primaryKey(),
    stripePriceId: varchar('stripe_price_id', { length: 128 }).notNull(),
    tier: varchar('tier', { length: 32 }),
    status: varchar('status', { length: 32 }).notNull(),
    entitlementsJson: jsonb('entitlements_json'),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    lastEventId: varchar('last_event_id', { length: 128 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
    stripeCustomerIdIdx: index('subscriptions_stripe_customer_id_idx').on(table.stripeCustomerId),
}));
