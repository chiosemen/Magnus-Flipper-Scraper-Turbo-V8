import { CreateDeal } from '@repo/types';

/**
 * Normalize Craigslist Apify actor output to CreateDeal schema
 * Input format from apify/craigslist-scraper actor
 */
export function normalizeCraigslist(item: any): CreateDeal {
  const now = new Date();

  return {
    source: 'craigslist',
    sourceId: item.id || item.postingId || String(item.url).split('/').pop()?.replace('.html', '') || 'unknown',
    sourceUrl: item.url || '',

    title: item.title || 'Unknown Listing',
    description: item.description || item.body || '',
    category: item.category || 'general',
    condition: 'unknown', // Craigslist doesn't always specify condition

    listPrice: item.price ?? 0,
    currency: 'USD', // Craigslist is primarily US-based
    shippingCost: 0, // Craigslist is typically local pickup

    location: item.location || item.hood,
    coordinates: item.geotag
      ? { latitude: item.geotag.latitude, longitude: item.geotag.longitude }
      : undefined,

    sellerName: 'Craigslist Seller',

    images: item.images || [],
    thumbnailUrl: item.images?.[0] || item.image,

    status: 'active',
    firstSeenAt: now,
    lastSeenAt: now,
    scrapedAt: now,

    monitorId: '',
    userId: '',
  };
}
