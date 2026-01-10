import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserService } from '../../../src/services/browser.service';

/**
 * Unit tests for BrowserService production blocking
 *
 * Validates that BrowserService throws errors in production after Apify-first migration.
 */

describe('BrowserService - Production Blocking', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('should throw when instantiating in production', () => {
    process.env.NODE_ENV = 'production';

    expect(() => {
      new BrowserService();
    }).toThrow(/BLOCKED.*Browser automation is disabled in production/);
  });

  it('should allow instantiation in non-production environments', () => {
    process.env.NODE_ENV = 'development';

    // Should not throw in development
    expect(() => {
      new BrowserService();
    }).not.toThrow();
  });

  it('should throw when calling getBrowser() in production', async () => {
    process.env.NODE_ENV = 'development';
    const service = new BrowserService();

    // Switch to production after instantiation
    process.env.NODE_ENV = 'production';

    await expect(service.getBrowser()).rejects.toThrow(
      /BLOCKED.*getBrowser.*called in production/
    );
  });

  it('should throw when calling createContext() in production', async () => {
    process.env.NODE_ENV = 'development';
    const service = new BrowserService();

    // Switch to production after instantiation
    process.env.NODE_ENV = 'production';

    await expect(service.createContext()).rejects.toThrow(
      /BLOCKED.*createContext.*called in production/
    );
  });
});
