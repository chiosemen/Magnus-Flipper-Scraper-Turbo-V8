import { runApifyActor, APIFY_ACTORS } from '../lib/apify';
import { normalizeEbay } from '../normalize/ebay.normalize';
import { SearchCriteria, CreateDeal } from '@repo/types';

/**
 * Pure Apify-first eBay scraper
 */
export async function scrapeEbay(criteria: SearchCriteria): Promise<CreateDeal[]> {
  const rawItems = await runApifyActor({
    actorId: APIFY_ACTORS.ebay,
    input: {
      search: criteria.keywords.join(' '),
      maxItems: 50,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      sortBy: 'bestMatch',
    },
  });

  return rawItems.map(normalizeEbay);
}
