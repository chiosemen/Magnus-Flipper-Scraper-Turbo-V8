import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { classifyVintedHtml, parseVintedListings } from '../../../../src/scrapers/vinted/vinted.scraper';

const fixturePath = (name: string) => path.join(__dirname, '../../../fixtures/html', name);

describe('Vinted scraper parsing', () => {
  it('parses listings from page1 fixture', () => {
    const html = readFileSync(fixturePath('vinted-search-page1.html'), 'utf-8');
    const listings = parseVintedListings(html);
    expect(listings.length).toBeGreaterThanOrEqual(2);
    expect(listings[0].sourceId).toBe('1');
  });

  it('parses page2 with next link and single listing', () => {
    const html = readFileSync(fixturePath('vinted-search-page2.html'), 'utf-8');
    const listings = parseVintedListings(html);
    expect(listings.length).toBe(1);
    expect(listings[0].title).toContain('Sneakers');
  });

  it('classifies empty fixture', () => {
    const html = readFileSync(fixturePath('vinted-empty.html'), 'utf-8');
    const classification = classifyVintedHtml(html);
    expect(classification.state).toBe('empty');
  });

  it('classifies consent page', () => {
    const classification = classifyVintedHtml(readFileSync(fixturePath('vinted-consent.html'), 'utf-8'));
    expect(classification.state).toBe('consent');
  });

  it('classifies blocked page', () => {
    const classification = classifyVintedHtml(readFileSync(fixturePath('vinted-blocked.html'), 'utf-8'));
    expect(classification.state).toBe('blocked');
  });

  it('classifies login page', () => {
    const classification = classifyVintedHtml(readFileSync(fixturePath('vinted-login.html'), 'utf-8'));
    expect(classification.state).toBe('login');
 });

  it('classifies rate-limited page', () => {
    const classification = classifyVintedHtml(readFileSync(fixturePath('vinted-rate-limited.html'), 'utf-8'));
    expect(classification.state).toBe('rate_limited');
  });

  it('fails closed on malformed html', () => {
    const classification = classifyVintedHtml('<html></html>');
    expect(['blocked', 'empty']).toContain(classification.state);
  });
});
