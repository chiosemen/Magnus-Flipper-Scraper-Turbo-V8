/**
 * Stripe Price Mapping
 * Single source of truth for Stripe price IDs to usage components
 *
 * CRITICAL: Keep this in sync with Stripe dashboard price configuration
 * Any price ID change in Stripe requires update here
 */

// ============================================================================
// Types
// ============================================================================

export type TierKey = 'free' | 'basic' | 'pro' | 'elite' | 'enterprise';
export type MeterKey = 'full_runs' | 'partial_runs' | 'signal_checks' | 'proxy_gb';

export interface MeterConfig {
  priceId: string | null;
  label: string;
  unit: string;
  unitCostUsd?: number; // Cost per unit (optional, for estimation)
}

// ============================================================================
// Base Subscription Prices (Monthly)
// ============================================================================

/**
 * Maps tier to base subscription price ID
 * Read from environment variables for flexibility
 */
export const TIER_PRICE_MAP: Record<TierKey, string | null> = {
  free: null, // Free tier has no Stripe price
  basic: process.env.STRIPE_PRICE_ID_BASIC || null,
  pro: process.env.STRIPE_PRICE_ID_PRO || null,
  elite: process.env.STRIPE_PRICE_ID_ELITE || null,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || null,
};

// ============================================================================
// Metered Usage Prices
// ============================================================================

/**
 * Maps usage meter types to Stripe price IDs
 * These are usage-based pricing components
 *
 * NOTE: Update these when creating metered billing in Stripe dashboard
 */
export const METER_PRICE_MAP: Record<MeterKey, MeterConfig> = {
  full_runs: {
    priceId: process.env.STRIPE_PRICE_ID_FULL_RUNS || null,
    label: 'Full Scraper Runs',
    unit: 'run',
    unitCostUsd: 0.10, // Example: $0.10 per run
  },

  partial_runs: {
    priceId: process.env.STRIPE_PRICE_ID_PARTIAL_RUNS || null,
    label: 'Partial Scraper Runs',
    unit: 'run',
    unitCostUsd: 0.05, // Example: $0.05 per partial run
  },

  signal_checks: {
    priceId: process.env.STRIPE_PRICE_ID_SIGNAL_CHECKS || null,
    label: 'Signal Checks',
    unit: 'check',
    unitCostUsd: 0.01, // Example: $0.01 per check
  },

  proxy_gb: {
    priceId: process.env.STRIPE_PRICE_ID_PROXY_GB || null,
    label: 'Proxy Bandwidth',
    unit: 'GB',
    unitCostUsd: 2.00, // Example: $2.00 per GB
  },
};

// ============================================================================
// Reverse Lookup Maps
// ============================================================================

/**
 * Reverse map: price ID -> tier
 */
export const PRICE_ID_TO_TIER: Record<string, TierKey> = Object.entries(TIER_PRICE_MAP)
  .reduce((acc, [tier, priceId]) => {
    if (priceId) {
      acc[priceId] = tier as TierKey;
    }
    return acc;
  }, {} as Record<string, TierKey>);

/**
 * Reverse map: price ID -> meter
 */
export const PRICE_ID_TO_METER: Record<string, MeterKey> = Object.entries(METER_PRICE_MAP)
  .reduce((acc, [meter, config]) => {
    if (config.priceId) {
      acc[config.priceId] = meter as MeterKey;
    }
    return acc;
  }, {} as Record<string, MeterKey>);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get meter type from Stripe price ID
 * Returns null if price ID is not a metered price
 */
export function getMeterForPriceId(priceId: string): MeterKey | null {
  return PRICE_ID_TO_METER[priceId] || null;
}

/**
 * Get tier from Stripe price ID
 * Returns null if price ID is not a base subscription price
 */
export function getTierForPriceId(priceId: string): TierKey | null {
  return PRICE_ID_TO_TIER[priceId] || null;
}

/**
 * Get Stripe price ID for a meter type
 * Returns null if meter has no configured price ID
 */
export function getPriceIdForMeter(meter: MeterKey): string | null {
  return METER_PRICE_MAP[meter]?.priceId || null;
}

/**
 * Get Stripe price ID for a tier
 * Returns null if tier has no price (e.g., free tier)
 */
export function getPriceIdForTier(tier: TierKey): string | null {
  return TIER_PRICE_MAP[tier] || null;
}

/**
 * Get meter configuration (label, unit, cost)
 * Returns null if meter is not recognized
 */
export function getMeterConfig(meter: string): MeterConfig | null {
  return METER_PRICE_MAP[meter as MeterKey] || null;
}

/**
 * Calculate expected cost for usage units
 * Returns null if meter has no configured unit cost
 */
export function calculateExpectedCost(meter: MeterKey, units: number): number | null {
  const config = METER_PRICE_MAP[meter];
  if (!config?.unitCostUsd) return null;
  return units * config.unitCostUsd;
}

/**
 * Get all configured meter keys
 */
export function getAllMeters(): MeterKey[] {
  return Object.keys(METER_PRICE_MAP) as MeterKey[];
}

/**
 * Get all configured tier keys
 */
export function getAllTiers(): TierKey[] {
  return Object.keys(TIER_PRICE_MAP) as TierKey[];
}

/**
 * Check if a price ID is a metered price
 */
export function isMeteredPrice(priceId: string): boolean {
  return priceId in PRICE_ID_TO_METER;
}

/**
 * Check if a price ID is a base subscription price
 */
export function isSubscriptionPrice(priceId: string): boolean {
  return priceId in PRICE_ID_TO_TIER;
}

/**
 * Categorize a Stripe price ID
 * Returns the type and key (tier or meter)
 */
export function categorizePriceId(
  priceId: string
): { type: 'subscription'; key: TierKey } | { type: 'metered'; key: MeterKey } | { type: 'unknown' } {
  const tier = getTierForPriceId(priceId);
  if (tier) {
    return { type: 'subscription', key: tier };
  }

  const meter = getMeterForPriceId(priceId);
  if (meter) {
    return { type: 'metered', key: meter };
  }

  return { type: 'unknown' };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that all required environment variables are set
 * Returns array of missing variables
 */
export function validatePriceConfiguration(): string[] {
  const missing: string[] = [];

  // Check tier prices (basic, pro, elite, enterprise required)
  const requiredTiers: TierKey[] = ['basic', 'pro', 'elite', 'enterprise'];
  for (const tier of requiredTiers) {
    if (!TIER_PRICE_MAP[tier]) {
      missing.push(`STRIPE_PRICE_ID_${tier.toUpperCase()}`);
    }
  }

  // Check metered prices (optional but recommended)
  const meters: MeterKey[] = ['full_runs', 'signal_checks', 'proxy_gb'];
  for (const meter of meters) {
    if (!METER_PRICE_MAP[meter].priceId) {
      // These are optional, just log a warning
      console.warn(`[Stripe Price Map] Missing meter price ID: ${meter}`);
    }
  }

  return missing;
}

/**
 * Get a summary of configured prices for debugging
 */
export function getPriceConfigurationSummary(): {
  tiers: Record<TierKey, string | null>;
  meters: Record<MeterKey, { priceId: string | null; label: string }>;
  missing: string[];
} {
  return {
    tiers: TIER_PRICE_MAP,
    meters: Object.entries(METER_PRICE_MAP).reduce(
      (acc, [key, config]) => {
        acc[key as MeterKey] = {
          priceId: config.priceId,
          label: config.label,
        };
        return acc;
      },
      {} as Record<MeterKey, { priceId: string | null; label: string }>
    ),
    missing: validatePriceConfiguration(),
  };
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Get meter from invoice line item price ID
const meter = getMeterForPriceId('price_1234567890');
console.log(meter); // 'full_runs'

// Get meter configuration
const config = getMeterConfig('full_runs');
console.log(config);
// {
//   priceId: 'price_1234567890',
//   label: 'Full Scraper Runs',
//   unit: 'run',
//   unitCostUsd: 0.10
// }

// Calculate expected cost
const expectedCost = calculateExpectedCost('full_runs', 1250);
console.log(expectedCost); // 125.00

// Categorize a price ID
const category = categorizePriceId('price_1234567890');
console.log(category);
// { type: 'metered', key: 'full_runs' }

// Validate configuration
const missing = validatePriceConfiguration();
if (missing.length > 0) {
  console.error('Missing price IDs:', missing);
}
*/
