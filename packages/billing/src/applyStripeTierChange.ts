import { resolveTierByPriceId } from './stripePlanMap';
import { TierKey, getEntitlementsForTier } from './pricingGuardrails';
import { eq, and } from 'drizzle-orm';

export type StripeStatus = 'active' | 'past_due' | 'canceled';

const TIER_ORDER: Record<TierKey, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  elite: 3,
  enterprise: 4,
};

const isUpgrade = (prev: TierKey, next: TierKey) => TIER_ORDER[next] > TIER_ORDER[prev];
const isDowngrade = (prev: TierKey, next: TierKey) => TIER_ORDER[next] < TIER_ORDER[prev];

export const applyStripeTierChange = async (input: {
  db: any;
  schema: any;
  eventId: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: StripeStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}): Promise<{ tier: TierKey; skipped: boolean }> => {
  const {
    db,
    schema,
    eventId,
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
  } = input;

  const existing = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });

  if (existing?.lastEventId && existing.lastEventId === eventId) {
    return { tier: (existing.tier || 'free') as TierKey, skipped: true };
  }

  const resolvedTier = resolveTierByPriceId(stripePriceId) || 'free';
  const nextTier: TierKey = status === 'active' ? resolvedTier : 'free';
  const prevTier: TierKey = (existing?.tier as TierKey) || 'free';
  const entitlements = getEntitlementsForTier(nextTier);

  await db.insert(schema.subscriptions)
    .values({
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      tier: nextTier,
      status,
      entitlementsJson: entitlements,
      currentPeriodStart: currentPeriodStart || null,
      currentPeriodEnd: currentPeriodEnd || null,
      lastEventId: eventId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.stripeSubscriptionId,
      set: {
        userId,
        stripeCustomerId,
        stripePriceId,
        tier: nextTier,
        status,
        entitlementsJson: entitlements,
        currentPeriodStart: currentPeriodStart || null,
        currentPeriodEnd: currentPeriodEnd || null,
        lastEventId: eventId,
        updatedAt: new Date(),
      },
    });

  await db.update(schema.users)
    .set({ tier: nextTier, stripeSubscriptionStatus: status, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));

  if (existing && isDowngrade(prevTier, nextTier)) {
    const cooldownUntil = new Date(Date.now() + 6 * 60 * 60 * 1000);
    await db.update(schema.usageTelemetry)
      .set({ cooldownUntil, updatedAt: new Date() })
      .where(eq(schema.usageTelemetry.userId, userId));
  }

  if (!existing || isUpgrade(prevTier, nextTier)) {
    const dayKey = new Date().toISOString().slice(0, 10);
    await db.update(schema.usageTelemetry)
      .set({
        fullRuns: 0,
        partialRuns: 0,
        signalChecks: 0,
        proxyGbEstimated: 0,
        costUsdEstimated: 0,
        lastResetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.usageTelemetry.userId, userId),
        eq(schema.usageTelemetry.dayKey, dayKey)
      ));
  }

  return { tier: nextTier, skipped: false };
};
