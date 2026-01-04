import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { classifyVintedHtml } from '../../../../src/scrapers/vinted/antibot';
import { parseVintedListings } from '../../../../src/scrapers/vinted/parser';

const fixturePath = (name: string) => path.join(__dirname, '../../../fixtures/html', name);

describe('Vinted antibot classification', () => {
  const fixtures = [
    { file: 'vinted-search-page1.html', state: 'OK' as const },
    { file: 'vinted-blocked.html', state: 'BLOCKED' as const },
    { file: 'vinted-login.html', state: 'LOGIN' as const },
    { file: 'vinted-consent.html', state: 'CONSENT' as const },
    { file: 'vinted-rate-limited.html', state: 'RATE_LIMIT' as const },
  ];

  for (const fixture of fixtures) {
    it(`classifies ${fixture.file} as ${fixture.state}`, () => {
      const html = readFileSync(fixturePath(fixture.file), 'utf-8');
      const classification = classifyVintedHtml(html);
      expect(classification.state).toBe(fixture.state);
    });
  }

  it('fails closed on ambiguous html content', () => {
    const classification = classifyVintedHtml('<html><body>unknown content</body></html>');
    expect(classification.state).toBe('BLOCKED');
    expect(classification.reason).toBe('ambiguous_state');
  });

  it('treats empty search results as blocked', () => {
    const html = readFileSync(fixturePath('vinted-empty.html'), 'utf-8');
    const classification = classifyVintedHtml(html);
    expect(classification.state).toBe('BLOCKED');
    expect(classification.reason).toBe('no_results');
  });
});

describe('Vinted parser (ok states only)', () => {
  it('parses listings from an OK fixture', () => {
    const html = readFileSync(fixturePath('vinted-search-page1.html'), 'utf-8');
    const classification = classifyVintedHtml(html);
    expect(classification.state).toBe('OK');

    const listings = parseVintedListings(html, classification);
    expect(listings.length).toBeGreaterThanOrEqual(2);
    expect(listings[0].sourceId).toBe('1');
    expect(listings[0].title).toContain('Leather Jacket');
    expect(listings[0].listPrice).toBeGreaterThan(0);
  });

  it('blocks when parser is invoked without OK state', () => {
    const html = readFileSync(fixturePath('vinted-search-page1.html'), 'utf-8');
    const blockedClassification = { state: 'BLOCKED' as const, reason: 'test' };
    expect(() => parseVintedListings(html, blockedClassification)).toThrow('Vinted parser not allowed');
  });
});
