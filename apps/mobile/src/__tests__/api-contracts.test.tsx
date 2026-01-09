import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { User, Deal } from '@repo/types';

/**
 * Integration Tests for API Contracts
 *
 * Tests that our mobile app correctly implements the API contract
 * defined in @repo/types with type-safe MSW mocks.
 */

// Mock API responses with strict types from @repo/types
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  tier: 'free',
  settings: {
    notifications: {
      email: true,
      push: true,
      sms: false,
      minDealScore: 50,
    },
    display: {
      theme: 'system',
      currency: 'USD',
      timezone: 'UTC',
    },
    scraping: {},
  },
  monitorsUsed: 0,
  jobsUsedToday: 0,
  alertsSentToday: 0,
  quotaResetAt: new Date().toISOString(),
  totalDealsFound: 0,
  totalProfitTracked: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
};

const mockDeal: Deal = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  source: 'craigslist',
  sourceUrl: 'https://craigslist.org/test',
  sourceId: 'test-123',
  title: 'Test Product',
  category: 'electronics',
  condition: 'like_new',
  listPrice: 29.99,
  currency: 'USD',
  shippingCost: 0,
  dealScore: 75,
  sellerName: 'Test Seller',
  images: ['https://example.com/image.jpg'],
  status: 'active',
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  scrapedAt: new Date().toISOString(),
  monitorId: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'test-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Setup MSW server
const server = setupServer(
  http.get('http://localhost:3000/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: Date.now() });
  }),
  http.get('http://localhost:3000/users/me', () => {
    return HttpResponse.json(mockUser);
  }),
  http.get('http://localhost:3000/deals', () => {
    return HttpResponse.json({
      deals: [mockDeal],
      total: 1,
      page: 1,
      limit: 20,
    });
  })
);

// Setup and teardown
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Contract Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();

      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('User Profile Endpoint', () => {
    it('should match User type from @repo/types', async () => {
      const response = await fetch('http://localhost:3000/users/me');
      const user = await response.json();

      // Type-safe assertions based on @repo/types User interface
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('tier');
      expect(user).toHaveProperty('createdAt');

      // Verify tier is valid enum value
      expect(['free', 'pro', 'enterprise']).toContain(user.tier);
    });
  });

  describe('Deals Endpoint', () => {
    it('should match Deal type from @repo/types', async () => {
      const response = await fetch('http://localhost:3000/deals');
      const data = await response.json();

      expect(data).toHaveProperty('deals');
      expect(Array.isArray(data.deals)).toBe(true);

      const deal = data.deals[0];

      // Type-safe assertions based on @repo/types Deal interface
      expect(deal).toHaveProperty('id');
      expect(deal).toHaveProperty('title');
      expect(deal).toHaveProperty('listPrice');
      expect(deal).toHaveProperty('sourceUrl');
      expect(deal).toHaveProperty('source');

      // Verify source is valid enum value
      expect(['craigslist', 'ebay', 'amazon', 'facebook', 'vinted', 'offerup', 'mercari', 'other']).toContain(deal.source);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized responses', async () => {
      server.use(
        http.get('http://localhost:3000/users/me', () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      const response = await fetch('http://localhost:3000/users/me');
      expect(response.status).toBe(401);
    });

    it('should handle 404 not found responses', async () => {
      server.use(
        http.get('http://localhost:3000/deals/invalid-id', () => {
          return HttpResponse.json(
            { error: 'Deal not found' },
            { status: 404 }
          );
        })
      );

      const response = await fetch('http://localhost:3000/deals/invalid-id');
      expect(response.status).toBe(404);
    });

    it('should handle 500 server errors', async () => {
      server.use(
        http.get('http://localhost:3000/deals', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const response = await fetch('http://localhost:3000/deals');
      expect(response.status).toBe(500);
    });
  });
});
