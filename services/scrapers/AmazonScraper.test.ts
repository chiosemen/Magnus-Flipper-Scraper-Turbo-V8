import { describe, it, expect, vi } from 'vitest';
import { amazonScraper } from './AmazonScraper';

describe('AmazonScraper', () => {
  it('should scrape and return listings', async () => {
    const logSpy = vi.fn();
    // Reduce delays for tests (though internal delay is not easily mocked without refactor, 
    // we rely on fast execution or mocked timers if strictly needed. 
    // Here we just await the async result)
    
    // We can mock setTimeout if the delays are too long
    vi.useFakeTimers();
    
    const scrapePromise = amazonScraper.scrape('job_123', 'https://amazon.com/test', logSpy);
    
    await vi.runAllTimersAsync();
    
    const results = await scrapePromise;

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].marketplace).toBe('amazon');
    expect(logSpy).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});