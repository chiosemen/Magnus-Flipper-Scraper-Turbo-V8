import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { Dashboard } from '../../src/pages/Dashboard';

vi.mock('../../src/stores/authStore', () => {
  const state = {
    user: { displayName: 'Jamie' },
    getToken: async () => null,
  };
  const useAuthStore = (selector: any) => selector(state);
  (useAuthStore as any).getState = () => state;
  return { useAuthStore };
});

const API_URL = 'http://localhost:8080/api';

describe('Dashboard', () => {
  it('renders normalized deals from live-shaped API responses', async () => {
    server.use(
      http.get(`${API_URL}/analytics/dashboard`, () => {
        return HttpResponse.json({
          success: true,
          data: {
            today: { dealsFound: 2, jobsRun: 1 },
            total: { deals: 12, monitors: 1, profitPotential: 210 },
          },
        });
      }),
      http.get(`${API_URL}/deals`, () => {
        return HttpResponse.json({
          success: true,
          items: [
            {
              id: 'd1c3b8f3-4a44-4e2a-8b4a-77f2b1c3a111',
              source: 'craigslist',
              sourceUrl: 'https://sfbay.craigslist.org/sfc/bik/d/san-francisco-trek-fx-2-disc/7777777777.html',
              sourceId: '7777777777',
              title: 'Trek FX 2 Disc Hybrid Bike',
              description: 'Well maintained commuter bike.',
              category: 'bikes',
              condition: 'good',
              listPrice: 380,
              currency: 'USD',
              shippingCost: 0,
              dealScore: 62,
              location: 'San Francisco, CA',
              sellerName: 'Alex R.',
              images: ['https://images.craigslist.org/00a0a_bike.jpg'],
              thumbnailUrl: 'https://images.craigslist.org/00a0a_bike.jpg',
              status: 'active',
              firstSeenAt: new Date().toISOString(),
              lastSeenAt: new Date().toISOString(),
              scrapedAt: new Date().toISOString(),
              monitorId: 'f3d8b2c1-1111-4444-8888-222233334444',
              userId: 'user_1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        });
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Trek FX 2 Disc Hybrid Bike')).toBeInTheDocument();
    });

    expect(screen.getByText('$380')).toBeInTheDocument();
  });
});
