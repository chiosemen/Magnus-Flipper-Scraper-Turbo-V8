import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agentService } from '../../../services/agentService';
import { Listing } from '../../../types';

const fixedPriceListing: Listing = {
  id: 'cl-2024-04-001',
  title: 'Trek FX 2 Disc Hybrid Bike',
  price: 380,
  currency: '$',
  location: 'San Francisco, CA',
  link: 'https://sfbay.craigslist.org/sfc/bik/d/san-francisco-trek-fx-2-disc/7777777777.html',
  imageUrl: 'https://images.craigslist.org/00a0a_bike.jpg',
  rating: 0,
  reviews: 0,
  marketplace: 'craigslist',
  pricingType: 'fixed',
  condition: 'Used - Good',
  sellerName: 'Alex R.',
  isSpam: false,
  postedTime: '2024-04-01T10:15:00Z',
  automationStatus: 'idle',
  profitPotential: 90,
  antiBot: { blocked: false },
};

const auctionListing: Listing = {
  id: 'ebay-itm-1234567890',
  title: 'Apple Watch Series 7 45mm (GPS) — Auction',
  price: 199,
  currency: '$',
  location: 'Chicago, IL',
  link: 'https://www.ebay.com/itm/1234567890',
  imageUrl: 'https://i.ebayimg.com/images/watch.jpg',
  rating: 4.9,
  reviews: 248,
  marketplace: 'ebay',
  pricingType: 'auction',
  condition: 'Very Good',
  sellerName: 'top-rated-seller',
  isSpam: false,
  postedTime: '2024-03-29T08:00:00Z',
  automationStatus: 'idle',
  profitPotential: 55,
  antiBot: { blocked: true, provider: 'datadome', signal: 'datadome.js' },
};

const template = 'Hi {seller}, I am interested in your {item} ({condition}). Is it still available for {price}? Link: {link}';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('agentService', () => {
  it('replaces all message template placeholders with listing data', async () => {
    const executeSpy = vi.spyOn(agentService, '_executeRequest').mockResolvedValue({ success: true, messageId: 'msg_1' });

    await agentService.sendMessage(fixedPriceListing, template);

    const expectedMessage = 'Hi Alex R., I am interested in your Trek FX 2 Disc Hybrid Bike (Used - Good). Is it still available for $380? Link: https://sfbay.craigslist.org/sfc/bik/d/san-francisco-trek-fx-2-disc/7777777777.html';

    expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
      listingId: fixedPriceListing.id,
      content: expectedMessage,
      meta: expect.objectContaining({
        condition: fixedPriceListing.condition,
        pricingType: 'fixed',
        antiBot: { blocked: false },
      }),
    }));
  });

  it('preserves auction vs fixed-price metadata in payload', async () => {
    const executeSpy = vi.spyOn(agentService, '_executeRequest').mockResolvedValue({ success: true, messageId: 'msg_2' });

    await agentService.sendMessage(auctionListing, template);

    expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
      listingId: auctionListing.id,
      meta: expect.objectContaining({
        pricingType: 'auction',
        antiBot: { blocked: true, provider: 'datadome', signal: 'datadome.js' },
      }),
    }));
  });

  it('retries on rate limit errors with exponential backoff', async () => {
    const executeSpy = vi.spyOn(agentService, '_executeRequest')
      .mockResolvedValueOnce({ success: false, error: 'Platform Error: Rate Limit Exceeded' })
      .mockResolvedValueOnce({ success: false, error: 'Platform Error: Rate Limit Exceeded' })
      .mockResolvedValueOnce({ success: true, messageId: 'msg_success' });

    const promise = agentService.sendMessage(fixedPriceListing, template);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(executeSpy).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg_success');
  });

  it('propagates quota errors without retry', async () => {
    const executeSpy = vi.spyOn(agentService, '_executeRequest')
      .mockResolvedValue({ success: false, error: 'Quota Exceeded' });

    const result = await agentService.sendMessage(fixedPriceListing, template);

    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Quota Exceeded');
  });
});
