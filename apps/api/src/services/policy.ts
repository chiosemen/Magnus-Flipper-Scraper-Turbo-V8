import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';

export type StripeTierKey = 'basic' | 'pro' | 'elite' | 'enterprise';

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

  async getUserTier(userId: string): Promise<string | null> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    return user?.tier ?? null;
  },
};
