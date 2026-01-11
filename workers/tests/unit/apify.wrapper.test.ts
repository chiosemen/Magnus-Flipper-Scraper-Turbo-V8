import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set environment variable BEFORE any modules are imported
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock services that depend on db FIRST
vi.mock('../../src/services/killSwitch.service', () => ({
  __resetKillSwitchCacheForTests: vi.fn(),
}));

vi.mock('../../src/services/observabilityGate.service', () => ({
  __resetObservabilityGateCacheForTests: vi.fn(),
}));

// Mock database
vi.mock('../../src/lib/db', () => ({
  db: {},
  schema: {},
}));

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ApifyClient
vi.mock('apify-client', () => {
  const mockActor = vi.fn();
  const mockCall = vi.fn();
  const mockListItems = vi.fn();
  
  return {
    ApifyClient: vi.fn().mockImplementation(() => {
      // Reset mocks on each instantiation for test isolation
      mockActor.mockClear();
      mockCall.mockClear();
      mockListItems.mockClear();
      
      return {
        actor: mockActor.mockReturnValue({
          call: mockCall,
        }),
        dataset: vi.fn().mockReturnValue({
          listItems: mockListItems,
        }),
        // Expose mocks for test inspection
        _mockCall: mockCall,
        _mockListItems: mockListItems,
        _mockActor: mockActor,
      };
    }),
  };
});

import { runApifyActor } from '../../src/lib/apify';
import { ApifyClient } from 'apify-client';

describe('runApifyActor', () => {
  let mockClient: any;
  let mockCall: any;
  let mockListItems: any;
  let mockActor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh mock client instance
    mockClient = new ApifyClient({ token: 'test-token' });
    
    // Get references to the mocks attached to the client
    mockCall = mockClient._mockCall;
    mockListItems = mockClient._mockListItems;
    mockActor = mockClient._mockActor;
  });

  it('should successfully run actor and return items', async () => {
    const mockRun = {
      id: 'run-123',
      status: 'SUCCEEDED',
      defaultDatasetId: 'dataset-123',
    };

    const mockItems = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    mockCall.mockResolvedValue(mockRun);
    mockListItems.mockResolvedValue({ items: mockItems });

    const result = await runApifyActor({
      actorId: 'test/actor',
      input: { search: 'test query' },
      timeout: 300,
    });

    expect(mockCall).toHaveBeenCalledWith(
      { search: 'test query' },
      { timeout: 300, waitSecs: 300 }
    );
    expect(mockListItems).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockItems);
  });

  it('should pass actorId correctly', async () => {
    const mockRun = {
      id: 'run-123',
      status: 'SUCCEEDED',
      defaultDatasetId: 'dataset-123',
    };

    mockCall.mockResolvedValue(mockRun);
    mockListItems.mockResolvedValue({ items: [] });

    await runApifyActor({
      actorId: 'apify/facebook-marketplace-scraper',
      input: { search: 'test' },
    });

    expect(mockClient.actor).toHaveBeenCalledWith('apify/facebook-marketplace-scraper');
  });

  it('should forward timeout and waitSecs correctly', async () => {
    const mockRun = {
      id: 'run-123',
      status: 'SUCCEEDED',
      defaultDatasetId: 'dataset-123',
    };

    mockCall.mockResolvedValue(mockRun);
    mockListItems.mockResolvedValue({ items: [] });

    await runApifyActor({
      actorId: 'test/actor',
      input: { search: 'test' },
      timeout: 120,
    });

    expect(mockCall).toHaveBeenCalledWith(
      { search: 'test' },
      { timeout: 120, waitSecs: 120 }
    );
  });

  it('should use default timeout when not provided', async () => {
    const mockRun = {
      id: 'run-123',
      status: 'SUCCEEDED',
      defaultDatasetId: 'dataset-123',
    };

    mockCall.mockResolvedValue(mockRun);
    mockListItems.mockResolvedValue({ items: [] });

    await runApifyActor({
      actorId: 'test/actor',
      input: { search: 'test' },
    });

    expect(mockCall).toHaveBeenCalledWith(
      { search: 'test' },
      { timeout: 300, waitSecs: 300 }
    );
  });

  it('should throw when run fails to start', async () => {
    mockCall.mockResolvedValue(null);

    await expect(
      runApifyActor({
        actorId: 'test/actor',
        input: { search: 'test' },
      })
    ).rejects.toThrow('Apify run failed to start');
  });

  it('should throw when run has no id', async () => {
    mockCall.mockResolvedValue({ status: 'SUCCEEDED' });

    await expect(
      runApifyActor({
        actorId: 'test/actor',
        input: { search: 'test' },
      })
    ).rejects.toThrow('Apify run failed to start');
  });

  it('should return empty array when dataset has no items', async () => {
    const mockRun = {
      id: 'run-123',
      status: 'SUCCEEDED',
      defaultDatasetId: 'dataset-123',
    };

    mockCall.mockResolvedValue(mockRun);
    mockListItems.mockResolvedValue({ items: [] });

    const result = await runApifyActor({
      actorId: 'test/actor',
      input: { search: 'test' },
    });

    expect(result).toEqual([]);
  });

  it('should handle actor execution errors', async () => {
    mockCall.mockRejectedValue(new Error('Actor execution failed'));

    await expect(
      runApifyActor({
        actorId: 'test/actor',
        input: { search: 'test' },
      })
    ).rejects.toThrow('Actor execution failed');
  });

  it('should handle dataset fetch errors', async () => {
    const mockRun = {
      id: 'run-123',
      status: 'SUCCEEDED',
      defaultDatasetId: 'dataset-123',
    };

    mockCall.mockResolvedValue(mockRun);
    mockListItems.mockRejectedValue(new Error('Dataset fetch failed'));

    await expect(
      runApifyActor({
        actorId: 'test/actor',
        input: { search: 'test' },
      })
    ).rejects.toThrow('Dataset fetch failed');
  });

  it('should pass complex input objects correctly', async () => {
    const mockRun = {
      id: 'run-123',
      status: 'SUCCEEDED',
      defaultDatasetId: 'dataset-123',
    };

    const complexInput = {
      search: 'test query',
      maxItems: 50,
      minPrice: 10,
      maxPrice: 100,
      location: 'New York',
    };

    mockCall.mockResolvedValue(mockRun);
    mockListItems.mockResolvedValue({ items: [] });

    await runApifyActor({
      actorId: 'test/actor',
      input: complexInput,
    });

    expect(mockCall).toHaveBeenCalledWith(
      complexInput,
      expect.any(Object)
    );
  });
});
