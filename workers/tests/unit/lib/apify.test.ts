import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for Apify client wrapper
 *
 * P0 Tests for production readiness:
 * - Non-SUCCEEDED actor runs throw errors
 * - Missing dataset ID throws errors
 * - Configuration validation
 *
 * These tests validate the core Apify integration behavior.
 * Integration tests with actual Apify actors should be done separately.
 */

// Mock the ApifyClient before importing the module
vi.mock('apify-client', () => {
  return {
    ApifyClient: vi.fn().mockImplementation(() => {
      return {
        actor: vi.fn(),
        dataset: vi.fn(),
      };
    }),
  };
});

describe('Apify Client Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure APIFY_TOKEN is set for tests
    process.env.APIFY_TOKEN = 'test_token';
  });

  describe('Configuration', () => {
    it('should export actor configuration constants', () => {
      const { APIFY_ACTORS, APIFY_DEFAULTS } = require('../../../src/lib/apify');

      expect(APIFY_ACTORS).toBeDefined();
      expect(APIFY_ACTORS.AMAZON).toBeDefined();
      expect(APIFY_ACTORS.EBAY).toBeDefined();
      expect(APIFY_ACTORS.FACEBOOK).toBeDefined();
      expect(APIFY_ACTORS.VINTED).toBeDefined();
      expect(APIFY_ACTORS.CRAIGSLIST).toBeDefined();

      expect(APIFY_DEFAULTS).toBeDefined();
      expect(APIFY_DEFAULTS.TIMEOUT_SECS).toBeGreaterThan(0);
      expect(APIFY_DEFAULTS.MAX_ITEMS).toBeGreaterThan(0);
    });
  });

  describe('runApifyActor - P0 Error Handling', () => {
    it('throws when actor run status is not SUCCEEDED', async () => {
      const { ApifyClient } = await import('apify-client');
      const mockClient = new ApifyClient({ token: 'test' });

      // Mock actor run that returns FAILED status
      const mockCall = vi.fn().mockResolvedValue({
        id: 'run_123',
        status: 'FAILED',
        defaultDatasetId: 'dataset_123',
      });

      (mockClient.actor as any).mockReturnValue({ call: mockCall });

      // Need to reload module to use mocked client
      vi.doMock('apify-client', () => ({
        ApifyClient: vi.fn(() => mockClient),
      }));

      const { runApifyActor } = await import('../../../src/lib/apify');

      await expect(
        runApifyActor({
          actorId: 'test/actor',
          input: { query: 'test' },
        })
      ).rejects.toThrow(/Actor run failed with status: FAILED/);

      expect(mockCall).toHaveBeenCalled();
    });

    it('throws when actor run succeeds but no dataset is created', async () => {
      const { ApifyClient } = await import('apify-client');
      const mockClient = new ApifyClient({ token: 'test' });

      // Mock actor run that returns SUCCEEDED but no dataset
      const mockCall = vi.fn().mockResolvedValue({
        id: 'run_456',
        status: 'SUCCEEDED',
        defaultDatasetId: null, // Missing dataset
      });

      (mockClient.actor as any).mockReturnValue({ call: mockCall });

      vi.doMock('apify-client', () => ({
        ApifyClient: vi.fn(() => mockClient),
      }));

      const { runApifyActor } = await import('../../../src/lib/apify');

      await expect(
        runApifyActor({
          actorId: 'test/actor',
          input: { query: 'test' },
        })
      ).rejects.toThrow(/Actor run succeeded but no dataset was created/);

      expect(mockCall).toHaveBeenCalled();
    });

    it('throws when actor run status is ABORTED', async () => {
      const { ApifyClient } = await import('apify-client');
      const mockClient = new ApifyClient({ token: 'test' });

      const mockCall = vi.fn().mockResolvedValue({
        id: 'run_789',
        status: 'ABORTED',
        defaultDatasetId: 'dataset_789',
      });

      (mockClient.actor as any).mockReturnValue({ call: mockCall });

      vi.doMock('apify-client', () => ({
        ApifyClient: vi.fn(() => mockClient),
      }));

      const { runApifyActor } = await import('../../../src/lib/apify');

      await expect(
        runApifyActor({
          actorId: 'test/actor',
          input: { query: 'test' },
        })
      ).rejects.toThrow(/Actor run failed with status: ABORTED/);
    });

    it('throws when actor run status is TIMED-OUT', async () => {
      const { ApifyClient } = await import('apify-client');
      const mockClient = new ApifyClient({ token: 'test' });

      const mockCall = vi.fn().mockResolvedValue({
        id: 'run_999',
        status: 'TIMED-OUT',
        defaultDatasetId: 'dataset_999',
      });

      (mockClient.actor as any).mockReturnValue({ call: mockCall });

      vi.doMock('apify-client', () => ({
        ApifyClient: vi.fn(() => mockClient),
      }));

      const { runApifyActor } = await import('../../../src/lib/apify');

      await expect(
        runApifyActor({
          actorId: 'test/actor',
          input: { query: 'test' },
        })
      ).rejects.toThrow(/Actor run failed with status: TIMED-OUT/);
    });
  });
});
