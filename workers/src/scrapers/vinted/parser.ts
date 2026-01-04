import { JSDOM } from 'jsdom';
import { CreateDeal } from '@repo/types';
import { PriceParser } from '../../parsers/price.parser';
import { TitleParser } from '../../parsers/title.parser';
import type { VintedClassification } from './types';

const LISTING_SELECTOR = 'article[data-testid="listing-card"], .vintage-listing-card';

const buildDealFromNode = (node: Element): CreateDeal | null => {
  const idAttr = node.getAttribute('data-item-id') || node.getAttribute('data-listing-id');
  const linkEl = node.querySelector<HTMLAnchorElement>('a[href*="vinted.com/item/"], a[href*="/item/"]');
  const link = linkEl?.href;
  const title = (node.querySelector('[data-testid="listing-card-title"], h3, .title')?.textContent || '').trim();
  const priceText = (node.querySelector('[data-testid="listing-card-price"], .price')?.textContent || '').trim();
  const priceValue = PriceParser.parse(priceText);
  const image = (node.querySelector('img') as HTMLImageElement | null)?.src;
  const location = node.querySelector('[data-testid="listing-card-location"], .location')?.textContent?.trim();
  const createdAt = node.querySelector('time')?.getAttribute('datetime');

  if (!idAttr || !link || !title || priceValue.value === null) {
    return null;
  }

  return {
    source: 'vinted',
    sourceId: idAttr,
    sourceUrl: link,
    title: TitleParser.clean(title),
    category: 'fashion',
    condition: TitleParser.extractCondition(title),
    listPrice: priceValue.value,
    currency: priceValue.currency as any,
    images: image ? [image] : [],
    thumbnailUrl: image || undefined,
    status: 'active',
    sellerName: 'Vinted Seller',
    location,
    monitorId: '',
    userId: '',
    dealScore: 70,
    scrapedAt: new Date(),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    updatedAt: new Date(),
  };
};

export const parseVintedListings = (html: string, classification: VintedClassification): CreateDeal[] => {
  if (classification.state !== 'OK') {
    throw new Error(`Vinted parser not allowed in state ${classification.state}`);
  }

  const dom = new JSDOM(html);
  const nodes = Array.from(dom.window.document.querySelectorAll(LISTING_SELECTOR));
  const listings: CreateDeal[] = [];

  for (const node of nodes) {
    const deal = buildDealFromNode(node);
    if (deal) listings.push(deal);
  }

  return listings;
};
