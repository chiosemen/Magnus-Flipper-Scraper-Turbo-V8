import { CreateDeal, DealCondition } from '@repo/types';

const mapEbayCondition = (condition: string): DealCondition => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new')) return 'new';
  if (lower.includes('like new')) return 'like_new';
  if (lower.includes('good')) return 'good';
  if (lower.includes('fair')) return 'fair';
  if (lower.includes('poor')) return 'poor';
  if (lower.includes('parts')) return 'for_parts';
  return 'unknown';
};

/**
 * Normalize eBay Apify actor output to CreateDeal schema
 * Input format from mfr355/ebay-scraper actor
 */
export function normalizeEbay(item: any): CreateDeal {
  const now = new Date();

  return {
    source: 'ebay',
    sourceId: item.itemId || item.id || String(item.url).split('/').pop() || 'unknown',
    sourceUrl: item.url || item.itemUrl || '',

    title: item.title || item.name || 'Unknown Item',
    description: item.description || item.subtitle || '',
    category: item.categoryName || item.category || 'general',
    condition: mapEbayCondition(item.condition),

    listPrice: item.price?.value ?? item.currentPrice ?? item.price ?? 0,
    currency: item.price?.currency ?? item.currency ?? 'USD',
    shippingCost: item.shippingPrice?.value ?? item.shippingCost ?? 0,

    location: item.location || item.itemLocation,
    sellerName: item.seller?.name ?? item.sellerUsername ?? 'Unknown Seller',
    sellerRating: item.seller?.feedbackScore ? item.seller.feedbackScore / 20 : undefined, // Convert 0-100 to 0-5
    sellerReviews: item.seller?.feedbackScore,

    images: item.images || (item.image ? [item.image] : []),
    thumbnailUrl: item.thumbnailUrl || item.image || item.images?.[0],

    status: 'active',
    firstSeenAt: now,
    lastSeenAt: now,
    scrapedAt: now,

    monitorId: '',
    userId: '',
  };
}
