import { BaseScraper, ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { Page } from 'playwright';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';
import { Buffer } from 'buffer';

export class CraigslistScraper extends BaseScraper {
  readonly source: DealSource = 'craigslist';
  readonly baseUrl = 'https://craigslist.org';

  buildSearchUrl(criteria: SearchCriteria): string {
    // Defaulting to sfbay for demo, in production should map location to CL subdomain
    const region = criteria.location ? 'sfbay' : 'sfbay'; 
    const baseUrl = `https://${region}.craigslist.org/search/sss`;
    const params = new URLSearchParams();
    
    if (criteria.keywords.length > 0) params.append('query', criteria.keywords.join(' '));
    if (criteria.minPrice) params.append('min_price', criteria.minPrice.toString());
    if (criteria.maxPrice) params.append('max_price', criteria.maxPrice.toString());
    params.append('sort', 'date'); // Newest first

    return `${baseUrl}?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    const url = this.buildSearchUrl(criteria);
    return this.scrapeUrl(url, options);
  }

  async parseSearchResults(page: Page): Promise<{ listings: CreateDeal[]; nextPageUrl: string | null }> {
    const listings: CreateDeal[] = [];
    
    // Select result rows
    const elements = await page.$$('.cl-search-result, .result-row');
    
    for (const el of elements) {
       try {
         const titleEl = await el.$('.titlestring, .result-title');
         const title = await titleEl?.innerText() || '';
         
         const url = await titleEl?.getAttribute('href') || '';
         if (!url) continue;

         const priceEl = await el.$('.priceinfo, .result-price');
         const priceText = await priceEl?.innerText() || '';
         const { value: price, currency } = PriceParser.parse(priceText);

         if (price === null) continue;

         // Extract ID from URL or data attribute
         const idMatch = url.match(/\/(\d+)\.html/);
         const sourceId = idMatch ? idMatch[1] : Buffer.from(url).toString('base64');

         // Image
         // CL often lazy loads, sometimes in data-ids attribute
         // Simplified: get first thumb if available
         const imgEl = await el.$('img');
         const imgUrl = await imgEl?.getAttribute('src') || '';

         listings.push({
           source: 'craigslist',
           sourceId,
           sourceUrl: url,
           title: TitleParser.clean(title),
           category: 'general',
           condition: TitleParser.extractCondition(title),
           listPrice: price,
           currency: currency as any,
           images: imgUrl ? [imgUrl] : [],
           thumbnailUrl: imgUrl,
           status: 'active',
           sellerName: 'Private Seller',
           monitorId: '', // Filled by orchestrator
           userId: '', // Filled by orchestrator
           dealScore: 50,
           scrapedAt: new Date(),
           firstSeenAt: new Date(),
           lastSeenAt: new Date(),
           createdAt: new Date(),
           updatedAt: new Date()
         });
       } catch (e) {
         // Skip malformed item
       }
    }

    const nextLink = await page.$('a.cl-next-page');
    const nextPageUrl = await nextLink?.getAttribute('href') || null;

    return { listings, nextPageUrl };
  }
}