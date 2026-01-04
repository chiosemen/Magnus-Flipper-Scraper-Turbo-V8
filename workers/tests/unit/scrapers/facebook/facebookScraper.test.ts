import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FacebookScraper, detectFacebookBlocked, detectFacebookLoginWall, classifyFacebookHtml } from '../../../../src/scrapers/facebook.scraper';
import { CreateDealSchema } from '@repo/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, '../../../fixtures/html', name), 'utf-8');

describe('FacebookScraper (unit)', () => {
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

  it('parses listings from fixture and outputs normalized deals', async () => {
    await page.setContent(fixture('facebook-search.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-pagelet="MarketplaceSearchResults"]');

    const scraper = new FacebookScraper();
    const { listings } = await scraper.parseSearchResults(page);

    expect(listings.length).toBe(2);
    expect(listings[0].source).toBe('facebook');
    expect(listings[0].title).toContain('Xbox');
    expect(listings[0].listPrice).toBe(399);
    expect(listings[0].location).toBe('Austin, TX');

    const normalized = {
      ...listings[0],
      userId: 'user_123',
      monitorId: '11111111-1111-4111-8111-111111111111',
    };
    expect(CreateDealSchema.safeParse(normalized).success).toBe(true);
  });

  it('detects login wall and blocked pages', () => {
    const loginHtml = fixture('facebook-login.html');
    const blockedHtml = fixture('facebook-blocked.html');
    const consentHtml = fixture('facebook-consent.html');

    expect(detectFacebookLoginWall(loginHtml)).toBe(true);
    expect(detectFacebookBlocked(blockedHtml).blocked).toBe(true);
    expect(detectFacebookBlocked(consentHtml).blocked).toBe(true);
  });

  it('classifies empty results as empty', () => {
    const emptyHtml = fixture('facebook-empty.html');
    expect(classifyFacebookHtml(emptyHtml, 0)).toBe('empty');
  });

  it('parses fallback listings without data-testid fields', async () => {
    await page.setContent(fixture('facebook-search-fallback.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-pagelet=\"MarketplaceSearchResults\"]');

    const scraper = new FacebookScraper();
    const { listings } = await scraper.parseSearchResults(page);

    expect(listings.length).toBe(1);
    expect(listings[0].title).toContain('PlayStation 5');
    expect(listings[0].listPrice).toBe(499);
    expect(listings[0].location).toBe('Dallas, TX');
  });

  it('fails closed on login interstitial inside results container', () => {
    const loginInterstitial = fixture('facebook-login-interstitial.html');
    expect(detectFacebookLoginWall(loginInterstitial)).toBe(true);
    expect(classifyFacebookHtml(loginInterstitial, 0)).toBe('login');
  });
});
