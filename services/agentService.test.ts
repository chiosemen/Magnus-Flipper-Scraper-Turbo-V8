import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agentService } from './agentService';
import { Listing } from '../types';

describe('agentService', () => {
  const mockListing: Listing = {
    id: 'test-listing-123',
    title: 'Sony WH-1000XM5',
    price: 250,
    currency: '$',
    location: 'New York, NY',
    link: 'https://example.com/item/123',
    imageUrl: 'https://example.com/img.jpg',
    rating: 4.8,
    reviews: 120,
    marketplace: 'facebook',
    condition: 'Used - Like New',
    sellerName: 'John Doe',
    isSpam: false,
    postedTime: '2 hours ago',
    automationStatus: 'idle',
    profitPotential: 80
  };

  const template = "Hi {seller}, I'm interested in your {item} ({condition}). Is it still available for {price}? Link: {link}";

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should correctly replace all placeholders in the template', async () => {
    // Spy on internal request to verify payload
    const executeSpy = vi.spyOn(agentService, '_executeRequest').mockResolvedValue({ success: true, messageId: 'msg_1' });

    await agentService.sendMessage(mockListing, template);

    const expectedMessage = "Hi John Doe, I'm interested in your Sony WH-1000XM5 (Used - Like New). Is it still available for $250? Link: https://example.com/item/123";

    expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
      content: expectedMessage,
      listingId: 'test-listing-123',
      recipient: {
        id: 'John Doe',
        platform: 'facebook'
      }
    }));
  });

  it('should retry on "Rate Limit Exceeded" error with exponential backoff', async () => {
    const executeSpy = vi.spyOn(agentService, '_executeRequest')
      .mockResolvedValueOnce({ success: false, error: 'Platform Error: Rate Limit Exceeded' }) // Fail 1
      .mockResolvedValueOnce({ success: false, error: 'Platform Error: Rate Limit Exceeded' }) // Fail 2
      .mockResolvedValueOnce({ success: true, messageId: 'msg_success' }); // Success

    const promise = agentService.sendMessage(mockListing, template);
    
    // Fast-forward timers to handle backoff
    await vi.runAllTimersAsync();
    
    const result = await promise;

    expect(executeSpy).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg_success');
  });

  it('should fail immediately on non-retryable errors', async () => {
    const executeSpy = vi.spyOn(agentService, '_executeRequest')
      .mockResolvedValue({ success: false, error: 'Platform Error: Captcha Challenge Required' });

    const result = await agentService.sendMessage(mockListing, template);

    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
  });

  it('should give up after max retries (3)', async () => {
    const executeSpy = vi.spyOn(agentService, '_executeRequest')
      .mockResolvedValue({ success: false, error: 'Platform Error: Rate Limit Exceeded' });

    const promise = agentService.sendMessage(mockListing, template);
    
    await vi.runAllTimersAsync();
    
    const result = await promise;

    // Initial attempt + 3 retries = 4 calls
    expect(executeSpy).toHaveBeenCalledTimes(4);
    expect(result.success).toBe(false);
  });
});