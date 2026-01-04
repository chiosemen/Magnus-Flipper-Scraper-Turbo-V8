import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AmazonScraper } from '../../../src/scrapers/amazon.scraper';
import { AntibotService } from '../../../src/services/antibot.service';
import { CreateDealSchema } from '@repo/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, '../../fixtures/html', name), 'utf-8');

describe('AmazonScraper (unit)', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await page.close();
    await browser.close();
  });

  it('parses title, price, availability, and normalized output', async () => {
    await page.setContent(fixture('amazon-search.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-component-type="s-search-result"]');

    const scraper = new AmazonScraper();
    const { listings } = await scraper.parseSearchResults(page);

    expect(listings.length).toBe(1);
    const listing = listings[0];

    expect(listing.title).toContain('Apple AirPods Pro');
    expect(listing.listPrice).toBe(199);
    expect(listing.source).toBe('amazon');

    const normalized = {
      ...listing,
      userId: 'user_123',
      monitorId: '11111111-1111-4111-8111-111111111111',
    };
    expect(CreateDealSchema.safeParse(normalized).success).toBe(true);
  });

  it('handles JS-rendered content after selector wait', async () => {
    await page.setContent(fixture('amazon-search-js.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-component-type="s-search-result"]');

    const scraper = new AmazonScraper();
    const { listings } = await scraper.parseSearchResults(page);

    expect(listings.length).toBe(1);
    expect(listings[0].title).toContain('Kindle Paperwhite');
  });

  it('detects anti-bot signals from blocked HTML', async () => {
    const antibot = new AntibotService();
    const blockedHtml = fixture('amazon-blocked.html');
    const decision = antibot.detectBlockSignals(blockedHtml);

    expect(decision.blocked).toBe(true);
    expect(decision.provider).toBe('datadome');
  });
});
