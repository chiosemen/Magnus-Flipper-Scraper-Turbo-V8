import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../helpers/supertest';
import { resetDatabase, seedBaselineConfigs, seedUser } from '../../helpers/db';
import { db, schema } from '../../../src/lib/db';
import { eq } from 'drizzle-orm';
import { buildCheckoutSession, buildStripeEvent, buildSubscription } from '../../mocks/stripe';

let stripeEvent: any;
const ORIGINAL_ENV = { ...process.env };

vi.mock('../../../src/lib/stripe', () => {
  const stubStripe = {
    webhooks: {
      constructEvent: vi.fn().mockImplementation(() => stripeEvent),
    },
  };
  return { getStripeClient: () => stubStripe };
});

const webhookHeaders = {
  'stripe-signature': 'sig_test',
  'content-type': 'application/json',
};

describe('Stripe webhook entitlements (integration)', () => {
  const client = createApiClient();

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_PRICE_ID_BASIC = 'price_basic_123';
    process.env.STRIPE_PRICE_ID_PRO = 'price_pro_123';
    process.env.STRIPE_PRICE_ID_ELITE = 'price_elite_123';
    process.env.STRIPE_PRICE_ID_ENTERPRISE = 'price_enterprise_123';

    await resetDatabase();
    await seedBaselineConfigs();
    await seedUser();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('checkout.session.completed updates user stripeCustomerId', async () => {
    stripeEvent = buildStripeEvent({
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: buildCheckoutSession({
          customer: 'cus_checkout_123',
          client_reference_id: 'test_user_123',
        }),
      },
    });

    const res = await client.post('/api/stripe/webhook')
      .set(webhookHeaders)
      .send(JSON.stringify({}));

    expect(res.status).toBe(200);
    const updated = await db.query.users.findFirst({
      where: eq(schema.users.id, 'test_user_123'),
    });
    expect(updated?.stripeCustomerId).toBe('cus_checkout_123');
  });

  it('subscription.created writes entitlements snapshot', async () => {
    stripeEvent = buildStripeEvent({
      id: 'evt_sub_create_1',
      type: 'customer.subscription.created',
      data: {
        object: buildSubscription({
          id: 'sub_create_1',
          priceId: 'price_pro_123',
          userId: 'test_user_123',
          status: 'active',
        }),
      },
    });

    const res = await client.post('/api/stripe/webhook')
      .set(webhookHeaders)
      .send(JSON.stringify({}));

    expect(res.status).toBe(200);

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.stripeSubscriptionId, 'sub_create_1'),
    });

    expect(subscription?.tier).toBe('pro');
    expect(subscription?.lastEventId).toBe('evt_sub_create_1');
    expect(subscription?.entitlementsJson).toBeTruthy();
    expect((subscription?.entitlementsJson as any)?.tierKey).toBe('pro');
  });

  it('subscription.updated downgrades entitlements', async () => {
    stripeEvent = buildStripeEvent({
      id: 'evt_sub_update_1',
      type: 'customer.subscription.updated',
      data: {
        object: buildSubscription({
          id: 'sub_update_1',
          priceId: 'price_basic_123',
          userId: 'test_user_123',
          status: 'active',
        }),
      },
    });

    const res = await client.post('/api/stripe/webhook')
      .set(webhookHeaders)
      .send(JSON.stringify({}));

    expect(res.status).toBe(200);
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.stripeSubscriptionId, 'sub_update_1'),
    });
    expect(subscription?.tier).toBe('basic');
    expect((subscription?.entitlementsJson as any)?.tierKey).toBe('basic');
  });

  it('subscription.deleted resets entitlements to free', async () => {
    stripeEvent = buildStripeEvent({
      id: 'evt_sub_delete_1',
      type: 'customer.subscription.deleted',
      data: {
        object: buildSubscription({
          id: 'sub_delete_1',
          priceId: 'price_pro_123',
          userId: 'test_user_123',
          status: 'canceled',
        }),
      },
    });

    const res = await client.post('/api/stripe/webhook')
      .set(webhookHeaders)
      .send(JSON.stringify({}));

    expect(res.status).toBe(200);
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.stripeSubscriptionId, 'sub_delete_1'),
    });
    expect(subscription?.tier).toBe('free');
    expect((subscription?.entitlementsJson as any)?.tierKey).toBe('free');
  });

  it('idempotency skips repeated webhook event', async () => {
    stripeEvent = buildStripeEvent({
      id: 'evt_sub_idem_1',
      type: 'customer.subscription.created',
      data: {
        object: buildSubscription({
          id: 'sub_idem_1',
          priceId: 'price_elite_123',
          userId: 'test_user_123',
          status: 'active',
        }),
      },
    });

    const firstRes = await client.post('/api/stripe/webhook')
      .set(webhookHeaders)
      .send(JSON.stringify({}));
    expect(firstRes.status).toBe(200);

    const first = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.stripeSubscriptionId, 'sub_idem_1'),
    });

    const secondRes = await client.post('/api/stripe/webhook')
      .set(webhookHeaders)
      .send(JSON.stringify({}));
    expect(secondRes.status).toBe(200);

    const second = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.stripeSubscriptionId, 'sub_idem_1'),
    });

    expect(first?.lastEventId).toBe('evt_sub_idem_1');
    expect(second?.lastEventId).toBe('evt_sub_idem_1');
    expect(first?.updatedAt?.getTime()).toBe(second?.updatedAt?.getTime());
  });
});
