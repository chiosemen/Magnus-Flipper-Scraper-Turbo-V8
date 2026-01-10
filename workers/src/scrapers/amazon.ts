import { runApifyActor, APIFY_ACTORS } from '../lib/apify';
import { normalizeAmazon } from '../normalize/amazon.normalize';
import { SearchCriteria, CreateDeal } from '@repo/types';

/**
 * Pure Apify-first Amazon scraper
 * NO browsers, NO Playwright, NO local execution
 * Apify handles proxies, fingerprints, antibot
 */
export async function scrapeAmazon(criteria: SearchCriteria): Promise<CreateDeal[]> {
  const rawItems = await runApifyActor({
    actorId: APIFY_ACTORS.amazon,
    input: {
      search: criteria.keywords.join(' '),
      maxItems: 50,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      category: 'aps', // All departments
    },
  });

  return rawItems.map(normalizeAmazon);
}
