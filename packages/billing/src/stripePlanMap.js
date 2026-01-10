import { getEntitlementsForTier } from './pricingGuardrails';
export const STRIPE_PRICE_ENV = {
    basic: 'STRIPE_PRICE_ID_BASIC',
    pro: 'STRIPE_PRICE_ID_PRO',
    elite: 'STRIPE_PRICE_ID_ELITE',
    enterprise: 'STRIPE_PRICE_ID_ENTERPRISE',
};
export const buildStripePlanMap = (env = process.env) => {
    const tiers = ['basic', 'pro', 'elite', 'enterprise'];
    const map = {};
    tiers.forEach((tier) => {
        const priceId = env[STRIPE_PRICE_ENV[tier]] ?? `missing_${tier}_price_id`;
        const entitlements = getEntitlementsForTier(tier);
        map[priceId] = {
            priceId,
            tier,
            hardLimits: {
                maxFullScrapesPerDay: entitlements.maxDailyRuns,
                maxProxyGbPerDay: entitlements.maxProxyGbPerDay,
                maxMonitors: entitlements.maxMonitors,
            },
            softDegradation: {
                order: ['full_scrape', 'partial_fetch', 'signal_check'],
            },
        };
    });
    return map;
};
export const resolveTierByPriceId = (priceId, env = process.env) => {
    const map = buildStripePlanMap(env);
    return map[priceId]?.tier ?? null;
};
