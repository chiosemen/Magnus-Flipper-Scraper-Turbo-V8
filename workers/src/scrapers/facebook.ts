import { runApifyActor, APIFY_ACTORS } from '../lib/apify';
import { normalizeFacebook } from '../normalize/facebook.normalize';
import { SearchCriteria, CreateDeal } from '@repo/types';

/**
 * Pure Apify-first Facebook Marketplace scraper
 */
export async function scrapeFacebook(criteria: SearchCriteria): Promise<CreateDeal[]> {
  const rawItems = await runApifyActor({
    actorId: APIFY_ACTORS.facebook,
    input: {
      search: criteria.keywords.join(' '),
      maxItems: 50,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      location: criteria.location,
      radius: criteria.maxDistance,
    },
  });

  return rawItems.map(normalizeFacebook);
}
