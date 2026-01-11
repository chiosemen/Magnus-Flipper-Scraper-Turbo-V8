import { CreateDeal } from '@repo/types';

/**
 * Normalize Amazon Apify actor output to CreateDeal schema
 * Input format from apify/amazon-scraper actor
 */
export function normalizeAmazon(item: any): CreateDeal {
  const now = new Date();

  return {
    source: 'amazon',
    sourceId: item.asin || item.id || String(item.url).split('/').pop() || 'unknown',
    sourceUrl: item.url || item.detailUrl || '',

    title: item.title || item.name || 'Unknown Product',
    description: item.description || '',
    category: item.category || 'general',
    condition: 'new', // Amazon search typically returns new items

    listPrice: item.price?.value ?? item.price ?? 0,
    currency: item.price?.currency ?? item.currency ?? 'USD',
    shippingCost: item.shippingPrice?.value ?? 0,

    location: item.seller?.location,
    sellerName: item.seller?.name ?? 'Amazon',
    sellerRating: item.seller?.rating,
    sellerReviews: item.seller?.reviewsCount,

    images: item.images || (item.thumbnailUrl ? [item.thumbnailUrl] : []),
    thumbnailUrl: item.thumbnailUrl || item.image || item.images?.[0],

    status: 'active',
    firstSeenAt: now,
    lastSeenAt: now,
    scrapedAt: now,

    monitorId: '', // Set by caller
    userId: '',    // Set by caller
  };
}
