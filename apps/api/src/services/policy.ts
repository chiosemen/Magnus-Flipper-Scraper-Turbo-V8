import { db, schema } from '../lib/db';
import { and, eq } from 'drizzle-orm';

export type StripeTierKey = 'basic' | 'pro' | 'elite' | 'enterprise';

const DEFAULT_TIER = 'free';

const PRICE_ID_BY_TIER: Record<StripeTierKey, string | undefined> = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  pro: process.env.STRIPE_PRICE_ID_PRO,
  elite: process.env.STRIPE_PRICE_ID_ELITE,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
};

const tierByPriceId: Record<string, StripeTierKey> = Object.entries(PRICE_ID_BY_TIER)
  .reduce((acc, [tier, priceId]) => {
    if (priceId) acc[priceId] = tier as StripeTierKey;
    return acc;
  }, {} as Record<string, StripeTierKey>);

export const policyService = {
  getStripePriceIdForTier(tier: StripeTierKey): string | null {
    return PRICE_ID_BY_TIER[tier] || null;
  },

  getTierForStripePriceId(priceId?: string | null): StripeTierKey | null {
    if (!priceId) return null;
    return tierByPriceId[priceId] || null;
  },

  async getUserTier(userId: string): Promise<string> {
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.status, 'active')
      ),
    });

    const tier = this.getTierForStripePriceId(subscription?.stripePriceId || null);
    return tier || DEFAULT_TIER;
  },
};
