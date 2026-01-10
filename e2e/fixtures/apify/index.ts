/**
 * Apify Mock Fixtures
 *
 * Pre-recorded Apify actor responses for E2E testing.
 * Use these mocks to simulate various scraping scenarios without actual API calls.
 */

import facebookMock from './facebook-marketplace.mock.json';
import vintedMock from './vinted.mock.json';
import emptyMock from './empty-results.mock.json';
import timeoutMock from './timeout.mock.json';

export interface ApifyMockItem {
  title: string;
  price: number;
  currency: string;
  url: string;
  location: string;
  seller: string;
  description: string;
  images: string[];
  postedAt: string;
  condition: string;
  category?: string;
  brand?: string;
  size?: string;
}

export interface ApifyMockResponse {
  actorRunId: string;
  datasetId: string | null;
  status: 'SUCCEEDED' | 'FAILED' | 'TIMEOUT';
  items: ApifyMockItem[];
  error?: {
    type: string;
    message: string;
    code: string;
  };
  stats: {
    totalItems: number;
    runtime: number;
    memoryUsage: number;
  };
}

/**
 * Facebook Marketplace mock response
 * 10 items, iPhone 13 search results
 */
export const FACEBOOK_MARKETPLACE_MOCK: ApifyMockResponse = facebookMock as ApifyMockResponse;

/**
 * Vinted mock response
 * 5 items, fashion/sneakers search results
 */
export const VINTED_MOCK: ApifyMockResponse = vintedMock as ApifyMockResponse;

/**
 * Empty results mock
 * 0 items, successful run but no results
 */
export const EMPTY_RESULTS_MOCK: ApifyMockResponse = emptyMock as ApifyMockResponse;

/**
 * Timeout mock
 * Actor run timed out after 120 seconds
 */
export const TIMEOUT_MOCK: ApifyMockResponse = timeoutMock as ApifyMockResponse;

/**
 * Get a mock response by marketplace
 */
export function getApifyMock(marketplace: string): ApifyMockResponse {
  switch (marketplace.toLowerCase()) {
    case 'facebook':
      return FACEBOOK_MARKETPLACE_MOCK;
    case 'vinted':
      return VINTED_MOCK;
    default:
      return EMPTY_RESULTS_MOCK;
  }
}

/**
 * Create a custom mock with specific item count
 */
export function createCustomMock(itemCount: number, marketplace: string = 'facebook'): ApifyMockResponse {
  const baseMock = getApifyMock(marketplace);
  return {
    ...baseMock,
    items: baseMock.items.slice(0, itemCount),
    stats: {
      ...baseMock.stats,
      totalItems: itemCount,
    },
  };
}
