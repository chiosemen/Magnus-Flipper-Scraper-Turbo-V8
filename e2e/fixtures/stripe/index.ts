/**
 * Stripe Test-Mode Event Fixtures
 *
 * Pre-recorded Stripe webhook events for E2E testing.
 * All events use test-mode data (livemode: false).
 */

import checkoutCompleted from './checkout.session.completed.json';
import subscriptionCreated from './customer.subscription.created.json';
import subscriptionUpdated from './customer.subscription.updated.json';
import subscriptionDeleted from './customer.subscription.deleted.json';

export interface StripeEvent {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  type: string;
  data: {
    object: Record<string, any>;
    previous_attributes?: Record<string, any>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string;
    idempotency_key: string;
  };
}

/**
 * Checkout session completed event
 * Triggered when a customer completes a Stripe Checkout session
 */
export const CHECKOUT_SESSION_COMPLETED: StripeEvent = checkoutCompleted as StripeEvent;

/**
 * Subscription created event
 * Triggered when a new subscription is created
 */
export const CUSTOMER_SUBSCRIPTION_CREATED: StripeEvent = subscriptionCreated as StripeEvent;

/**
 * Subscription updated event
 * Triggered when a subscription is modified (e.g., tier upgrade)
 */
export const CUSTOMER_SUBSCRIPTION_UPDATED: StripeEvent = subscriptionUpdated as StripeEvent;

/**
 * Subscription deleted event
 * Triggered when a subscription is canceled
 */
export const CUSTOMER_SUBSCRIPTION_DELETED: StripeEvent = subscriptionDeleted as StripeEvent;

/**
 * Get a Stripe event by type
 */
export function getStripeEvent(eventType: string): StripeEvent | null {
  switch (eventType) {
    case 'checkout.session.completed':
      return CHECKOUT_SESSION_COMPLETED;
    case 'customer.subscription.created':
      return CUSTOMER_SUBSCRIPTION_CREATED;
    case 'customer.subscription.updated':
      return CUSTOMER_SUBSCRIPTION_UPDATED;
    case 'customer.subscription.deleted':
      return CUSTOMER_SUBSCRIPTION_DELETED;
    default:
      return null;
  }
}

/**
 * Create a custom Stripe event for a specific user
 */
export function createStripeEventForUser(
  eventType: string,
  userId: string,
  customerId: string,
  tier: string = 'pro'
): StripeEvent | null {
  const baseEvent = getStripeEvent(eventType);
  if (!baseEvent) return null;

  return {
    ...baseEvent,
    id: `evt_test_${eventType.replace(/\./g, '_')}_${userId}`,
    data: {
      ...baseEvent.data,
      object: {
        ...baseEvent.data.object,
        customer: customerId,
        metadata: {
          ...baseEvent.data.object.metadata,
          userId,
          tier,
        },
      },
    },
  };
}

/**
 * Stripe test cards for checkout testing
 */
export const STRIPE_TEST_CARDS = {
  SUCCESS: '4242424242424242', // Always succeeds
  DECLINE: '4000000000000002', // Always declines
  INSUFFICIENT_FUNDS: '4000000000009995', // Insufficient funds
  EXPIRED_CARD: '4000000000000069', // Expired card
  PROCESSING_ERROR: '4000000000000119', // Processing error
  REQUIRE_3DS: '4000002500003155', // Requires 3D Secure authentication
} as const;

/**
 * Stripe test price IDs (from packages/billing/stripePriceMap.ts)
 */
export const STRIPE_TEST_PRICES = {
  FREE: null, // No price for free tier
  BASIC: 'price_test_basic_monthly',
  PRO: 'price_test_pro_monthly',
  ELITE: 'price_test_elite_monthly',
  ENTERPRISE: 'price_test_enterprise_monthly',
} as const;
