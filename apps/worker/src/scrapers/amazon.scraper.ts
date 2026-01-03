import { BaseScraper, ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { Page } from 'playwright';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';

export class AmazonScraper extends BaseScraper {
  readonly source: DealSource = 'amazon';
  readonly baseUrl = 'https://www.amazon.com';

  buildSearchUrl(criteria: SearchCriteria): string {
    const params = new URLSearchParams();
    params.append('k', criteria.keywords.join(' '));
    params.append('s', 'date-desc-rank'); // Newest arrivals
    // Price range logic for Amazon URL is complex (uses encrypted params usually), skipping for basic implementation
    return `${this.baseUrl}/s?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    const url = this.buildSearchUrl(criteria);
    return this.scrapeUrl(url, options);
  }

  async parseSearchResults(page: Page): Promise<{ listings: CreateDeal[]; nextPageUrl: string | null }> {
    const listings: CreateDeal[] = [];
    const elements = await page.$$('[data-component-type="s-search-result"]');

    for (const el of elements) {
      try {
        const asin = await el.getAttribute('data-asin');
        if (!asin) continue;

        const titleEl = await el.$('h2 a span');
        const title = await titleEl?.innerText() || '';

        const priceEl = await el.$('.a-price .a-offscreen');
        const priceText = await priceEl?.innerText() || '';
        const { value: price, currency } = PriceParser.parse(priceText);

        if (price === null) continue;

        const linkEl = await el.$('h2 a');
        const relUrl = await linkEl?.getAttribute('href');
        const url = relUrl ? `${this.baseUrl}${relUrl}` : '';

        const imgEl = await el.$('.s-image');
        const imgUrl = await imgEl?.getAttribute('src') || '';

        listings.push({
           source: 'amazon',
           sourceId: asin,
           sourceUrl: url,
           title: TitleParser.clean(title),
           category: 'general',
           condition: 'new', // Amazon search usually returns new
           listPrice: price,
           currency: currency as any,
           images: imgUrl ? [imgUrl] : [],
           thumbnailUrl: imgUrl,
           status: 'active',
           sellerName: 'Amazon',
           monitorId: '',
           userId: '',
           dealScore: 50,
           scrapedAt: new Date(),
           firstSeenAt: new Date(),
           lastSeenAt: new Date(),
           createdAt: new Date(),
           updatedAt: new Date()
        });

      } catch (e) {
        // skip
      }
    }

    // Pagination on Amazon is often tricky with bots
    return { listings, nextPageUrl: null };
  }
}
