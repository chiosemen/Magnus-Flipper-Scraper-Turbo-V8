import { BaseScraper, ScrapeResult, ScrapeOptions } from './base.scraper';
import { SearchCriteria, CreateDeal, DealSource } from '@repo/types';
import { Page } from 'playwright';
import { PriceParser } from '../parsers/price.parser';
import { TitleParser } from '../parsers/title.parser';

export class EbayScraper extends BaseScraper {
  readonly source: DealSource = 'ebay';
  readonly baseUrl = 'https://www.ebay.com';

  buildSearchUrl(criteria: SearchCriteria): string {
    const params = new URLSearchParams();
    params.append('_nkw', criteria.keywords.join(' '));
    if (criteria.minPrice) params.append('_udlo', criteria.minPrice.toString());
    if (criteria.maxPrice) params.append('_udhi', criteria.maxPrice.toString());
    params.append('_sop', '10'); // Newly Listed
    params.append('LH_BIN', '1'); // Buy It Now (optional, mostly preferred for flipping)

    return `${this.baseUrl}/sch/i.html?${params.toString()}`;
  }

  async search(criteria: SearchCriteria, options: ScrapeOptions): Promise<ScrapeResult> {
    const url = this.buildSearchUrl(criteria);
    return this.scrapeUrl(url, options);
  }

  async parseSearchResults(page: Page): Promise<{ listings: CreateDeal[]; nextPageUrl: string | null }> {
    const listings: CreateDeal[] = [];
    const elements = await page.$$('.s-item');

    for (const el of elements) {
      try {
        const titleEl = await el.$('.s-item__title');
        const title = await titleEl?.innerText() || '';
        if (title.toLowerCase().includes('shop on ebay')) continue; // Skip header

        const linkEl = await el.$('.s-item__link');
        const url = await linkEl?.getAttribute('href') || '';
        
        // ID
        const idMatch = url.match(/\/(\d+)\?/);
        const sourceId = idMatch ? idMatch[1] : '';
        if (!sourceId) continue;

        const priceEl = await el.$('.s-item__price');
        const priceText = await priceEl?.innerText() || '';
        const { value: price, currency } = PriceParser.parse(priceText);

        if (price === null) continue;

        const imgEl = await el.$('.s-item__image-img');
        const imgUrl = await imgEl?.getAttribute('src') || '';

        const sellerEl = await el.$('.s-item__seller-info-text');
        const sellerText = await sellerEl?.innerText() || 'Unknown';
        const sellerName = sellerText.split(' ')[0] || 'eBay User';

        listings.push({
           source: 'ebay',
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
           sellerName: sellerName,
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

    const nextLink = await page.$('a.pagination__next');
    const nextPageUrl = await nextLink?.getAttribute('href') || null;

    return { listings, nextPageUrl };
  }
}
