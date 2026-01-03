import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import Stripe from 'stripe';
import { DecodedIdToken } from 'firebase-admin/auth';
import { authMiddleware } from '../middleware/auth.middleware';
import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { policyService, StripeTierKey } from '../services/policy';
import { logger } from '@repo/logger';

type Env = {
  Variables: {
    user: DecodedIdToken;
    token: string;
  };
};

const checkoutSchema = z.object({
  tier: z.enum(['basic', 'pro', 'elite', 'enterprise']),
});

type StripeStatus = 'active' | 'canceled' | 'past_due';

const normalizeStatus = (status: Stripe.Subscription.Status): StripeStatus => {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due';
  return 'canceled';
};

let stripeClient: Stripe | null = null;
const getStripe = () => {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ValidationError('STRIPE_SECRET_KEY is not set');
  }
  stripeClient = new Stripe(secretKey, { apiVersion: '2024-04-10' });
  return stripeClient;
};

const getUserByStripeCustomerId = async (stripeCustomerId: string) => {
  return db.query.users.findFirst({
    where: eq(schema.users.stripeCustomerId, stripeCustomerId),
  });
};

const upsertSubscription = async (payload: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: StripeStatus;
  currentPeriodEnd: Date | null;
}) => {
  await db.insert(schema.subscriptions)
    .values({
      userId: payload.userId,
      stripeCustomerId: payload.stripeCustomerId,
      stripeSubscriptionId: payload.stripeSubscriptionId,
      stripePriceId: payload.stripePriceId,
      status: payload.status,
      currentPeriodEnd: payload.currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.stripeSubscriptionId,
      set: {
        userId: payload.userId,
        stripeCustomerId: payload.stripeCustomerId,
        stripePriceId: payload.stripePriceId,
        status: payload.status,
        currentPeriodEnd: payload.currentPeriodEnd,
      },
    });
};

const updateUserSubscriptionStatus = async (userId: string, status: StripeStatus) => {
  await db.update(schema.users)
    .set({ stripeSubscriptionStatus: status, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
};

const app = new Hono<Env>();

app.post('/checkout', authMiddleware, zValidator('json', checkoutSchema), async (c) => {
  const stripe = getStripe();
  const { tier } = c.req.valid('json' as any) as { tier: StripeTierKey };

  const priceId = policyService.getStripePriceIdForTier(tier);
  if (!priceId) {
    throw new ValidationError(`Stripe price ID not configured for tier: ${tier}`);
  }

  const user = c.get('user');
  const dbUser = await db.query.users.findFirst({
    where: eq(schema.users.id, user.uid),
  });

  if (!dbUser) {
    throw new UnauthorizedError('User not found');
  }

  let stripeCustomerId = dbUser.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email,
      metadata: { userId: user.uid },
    });
    stripeCustomerId = customer.id;
    await db.update(schema.users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(schema.users.id, user.uid));
  }

  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!successUrl || !cancelUrl) {
    throw new ValidationError('STRIPE_SUCCESS_URL or STRIPE_CANCEL_URL is not set');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user.uid,
    subscription_data: {
      metadata: { userId: user.uid },
    },
  });

  return c.json({ success: true, url: session.url });
});

app.get('/portal', authMiddleware, async (c) => {
  const stripe = getStripe();
  const user = c.get('user');

  const dbUser = await db.query.users.findFirst({
    where: eq(schema.users.id, user.uid),
  });

  if (!dbUser || !dbUser.stripeCustomerId) {
    throw new UnauthorizedError('Stripe customer not found');
  }

  const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL;
  if (!returnUrl) {
    throw new ValidationError('STRIPE_PORTAL_RETURN_URL is not set');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: returnUrl,
  });

  return c.json({ success: true, url: portalSession.url });
});

app.post('/webhook', async (c) => {
  const stripe = getStripe();
  const signature = c.req.header('stripe-signature') || c.req.header('Stripe-Signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    throw new ValidationError('Stripe webhook signature or secret missing');
  }

  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err as Error);
    return c.json({ success: false }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const userId = session.client_reference_id || session.metadata?.userId || null;

      if (stripeCustomerId && userId) {
        await db.update(schema.users)
          .set({ stripeCustomerId, updatedAt: new Date() })
          .where(eq(schema.users.id, userId));
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

      if (!stripeCustomerId) break;

      const user = await getUserByStripeCustomerId(stripeCustomerId);
      const userId = user?.id || subscription.metadata?.userId || null;

      if (!userId) {
        logger.warn('Stripe subscription event missing user mapping', { stripeCustomerId });
        break;
      }

      const priceId = subscription.items.data[0]?.price?.id;
      if (!priceId) {
        logger.warn('Stripe subscription missing price ID', { stripeCustomerId, subscriptionId: subscription.id });
        break;
      }

      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;

      await upsertSubscription({
        userId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: normalizeStatus(subscription.status),
        currentPeriodEnd,
      });

      await updateUserSubscriptionStatus(userId, normalizeStatus(subscription.status));
      break;
    }
    default:
      break;
  }

  return c.json({ received: true });
});

export default app;
