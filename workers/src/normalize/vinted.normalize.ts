import { CreateDeal, DealCondition } from '@repo/types';

const mapVintedCondition = (condition: string): DealCondition => {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new with tags') || lower.includes('brand new')) return 'new';
  if (lower.includes('very good') || lower.includes('like new')) return 'like_new';
  if (lower.includes('good')) return 'good';
  if (lower.includes('satisfactory') || lower.includes('fair')) return 'fair';
  return 'unknown';
};

/**
 * Normalize Vinted Apify actor output to CreateDeal schema
 * Input format from kliment/vinted-scraper actor
 */
export function normalizeVinted(item: any): CreateDeal {
  const now = new Date();

  return {
    source: 'vinted',
    sourceId: String(item.id || item.itemId || 'unknown'),
    sourceUrl: item.url || item.itemUrl || '',

    title: item.title || 'Unknown Item',
    description: item.description || '',
    category: item.brand || item.category || 'general',
    condition: mapVintedCondition(item.status),

    listPrice: item.price ?? 0,
    currency: item.currency || 'EUR',
    shippingCost: 0, // Vinted shipping varies

    location: item.user?.city,
    sellerName: item.user?.login ?? item.user?.name ?? 'Unknown Seller',

    images: item.photos?.map((p: any) => p.url || p.full_size_url) || [],
    thumbnailUrl: item.photo?.url || item.photos?.[0]?.url,

    status: 'active',
    firstSeenAt: now,
    lastSeenAt: now,
    scrapedAt: now,

    monitorId: '',
    userId: '',
  };
}
