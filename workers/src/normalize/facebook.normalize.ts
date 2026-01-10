import { CreateDeal, DealCondition } from '@repo/types';

const mapFacebookCondition = (condition: string): DealCondition => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new')) return 'new';
  if (lower.includes('like new') || lower.includes('likenew')) return 'like_new';
  if (lower.includes('good')) return 'good';
  if (lower.includes('fair')) return 'fair';
  return 'unknown';
};

/**
 * Normalize Facebook Marketplace Apify actor output to CreateDeal schema
 * Input format from apify/facebook-marketplace-scraper actor
 */
export function normalizeFacebook(item: any): CreateDeal {
  const now = new Date();

  return {
    source: 'facebook',
    sourceId: item.id || item.listingId || String(item.url).split('/').pop() || 'unknown',
    sourceUrl: item.url || item.listingUrl || '',

    title: item.title || item.name || 'Unknown Listing',
    description: item.description || '',
    category: item.category || 'general',
    condition: mapFacebookCondition(item.condition),

    listPrice: item.price ?? 0,
    currency: item.currency || 'USD',
    shippingCost: 0, // Facebook Marketplace typically local pickup

    location: item.location || item.city,
    coordinates: item.latitude && item.longitude
      ? { latitude: item.latitude, longitude: item.longitude }
      : undefined,

    sellerName: item.seller?.name ?? item.sellerName ?? 'Unknown Seller',

    images: item.images || (item.image ? [item.image] : []),
    thumbnailUrl: item.image || item.images?.[0],

    status: 'active',
    firstSeenAt: now,
    lastSeenAt: now,
    scrapedAt: now,

    monitorId: '',
    userId: '',
  };
}
