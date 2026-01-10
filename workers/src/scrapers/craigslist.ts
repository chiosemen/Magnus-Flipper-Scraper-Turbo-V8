import { runApifyActor, APIFY_ACTORS } from '../lib/apify';
import { normalizeCraigslist } from '../normalize/craigslist.normalize';
import { SearchCriteria, CreateDeal } from '@repo/types';

/**
 * Pure Apify-first Craigslist scraper
 */
export async function scrapeCraigslist(criteria: SearchCriteria): Promise<CreateDeal[]> {
  const rawItems = await runApifyActor({
    actorId: APIFY_ACTORS.craigslist,
    input: {
      search: criteria.keywords.join(' '),
      maxItems: 50,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      location: criteria.location || 'sfbay', // Default to SF Bay Area
    },
  });

  return rawItems.map(normalizeCraigslist);
}
