import { runApifyActor, APIFY_ACTORS } from '../lib/apify';
import { normalizeVinted } from '../normalize/vinted.normalize';
import { SearchCriteria, CreateDeal } from '@repo/types';

/**
 * Pure Apify-first Vinted scraper
 */
export async function scrapeVinted(criteria: SearchCriteria): Promise<CreateDeal[]> {
  const rawItems = await runApifyActor({
    actorId: APIFY_ACTORS.vinted,
    input: {
      search: criteria.keywords.join(' '),
      maxItems: 50,
      priceFrom: criteria.minPrice,
      priceTo: criteria.maxPrice,
      order: 'newest_first',
    },
  });

  return rawItems.map(normalizeVinted);
}
