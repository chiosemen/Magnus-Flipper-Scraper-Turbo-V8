import type Stripe from 'stripe';

export const buildStripeEvent = (
  overrides: Partial<Stripe.Event>
): Stripe.Event => ({
  id: overrides.id ?? 'evt_test_1',
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  type: overrides.type ?? 'checkout.session.completed',
  data: overrides.data ?? { object: {} },
});

export const buildCheckoutSession = (
  overrides: Partial<Stripe.Checkout.Session>
): Stripe.Checkout.Session => ({
  id: overrides.id ?? 'cs_test_1',
  object: 'checkout.session',
  customer: overrides.customer ?? 'cus_test_123',
  client_reference_id: overrides.client_reference_id ?? 'test_user_123',
  metadata: overrides.metadata ?? { userId: 'test_user_123' },
  ...overrides,
}) as Stripe.Checkout.Session;

export const buildSubscription = (
  overrides: Partial<Stripe.Subscription> & {
    priceId?: string;
    userId?: string;
  }
): Stripe.Subscription => ({
  id: overrides.id ?? 'sub_test_123',
  object: 'subscription',
  customer: overrides.customer ?? 'cus_test_123',
  status: overrides.status ?? 'active',
  current_period_start: overrides.current_period_start ?? Math.floor(Date.now() / 1000),
  current_period_end: overrides.current_period_end ?? Math.floor(Date.now() / 1000) + 86400,
  metadata: overrides.metadata ?? { userId: overrides.userId ?? 'test_user_123' },
  items: overrides.items ?? {
    object: 'list',
    data: [
      {
        id: 'si_test_1',
        object: 'subscription_item',
        price: { id: overrides.priceId ?? 'price_test_123', object: 'price' },
      },
    ],
    has_more: false,
    url: '/v1/subscription_items',
  },
  ...overrides,
}) as Stripe.Subscription;
