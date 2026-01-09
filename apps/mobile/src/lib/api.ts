import { auth } from '@/config/firebase';
import Constants from 'expo-constants';
import type { Deal, Monitor, User, DealFilters } from '@repo/types';

/**
 * API Client with Authenticated Fetch
 *
 * ARCHITECTURE CONTRACT:
 * 1. Base URL from EXPO_PUBLIC_API_BASE_URL
 * 2. Token Injection: Gets current user from Firebase, calls getIdToken(), sets Authorization header
 * 3. Error Handling: Logs "Session expired" on 401
 *
 * SECURITY:
 * - Fresh JWT token on every request via user.getIdToken()
 * - Automatic token injection for all authenticated requests
 */

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:3000';

/**
 * Authenticated fetch wrapper that auto-injects Firebase JWT token
 *
 * @param path - API path (e.g., '/auth/me')
 * @param options - Standard fetch options
 * @returns Promise with parsed JSON response
 */
export async function authenticatedFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Get current user from Firebase
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('[API] No authenticated user');
  }

  // Get fresh JWT token
  const token = await currentUser.getIdToken();

  // Prepare headers with token injection
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  // Make authenticated request
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    console.error('[API] Session expired');
    throw new Error('Session expired');
  }

  // Handle other errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Request failed');
  }

  // Parse and return JSON response
  return response.json();
}

/**
 * Get current user profile
 * GET /auth/me (or /users/me)
 */
export async function getProfile() {
  return authenticatedFetch('/users/me');
}

/**
 * Test API health endpoint
 * GET /health
 */
export async function testHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

// Additional API methods for compatibility with existing screens

/**
 * Fetch deals with optional filters
 * GET /deals
 */
export async function fetchDeals(filters?: Partial<DealFilters>): Promise<Deal[]> {
  const queryParams = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams.append(key, JSON.stringify(value));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
  }
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/deals?${queryString}` : '/deals';
  const response = await authenticatedFetch<{ data: Deal[] }>(endpoint);
  return response.data;
}

/**
 * Fetch single deal by ID
 * GET /deals/:id
 */
export async function fetchDealById(id: string): Promise<Deal> {
  const response = await authenticatedFetch<{ data: Deal }>(`/deals/${id}`);
  return response.data;
}

/**
 * Fetch monitors for authenticated user
 * GET /monitors
 */
export async function fetchMonitors(): Promise<Monitor[]> {
  const response = await authenticatedFetch<{ data: Monitor[] }>('/monitors');
  return response.data;
}

/**
 * Fetch current user profile (alias for getProfile)
 * GET /users/me
 */
export async function fetchUserProfile(): Promise<User> {
  return authenticatedFetch('/users/me');
}
