import { auth } from '@/lib/firebase';
import { env } from '@/config/env';
import type { Deal, Monitor, Job, User, DealFilters } from '@repo/types';

/**
 * Type-Safe API Client
 *
 * ARCHITECTURE:
 * - Generic fetch wrapper with Firebase token auto-injection
 * - Types imported from @repo/types (single source of truth)
 * - Environment-based base URL
 * - Fail-fast error handling
 *
 * USAGE:
 * const deals = await fetchDeals({ minScore: 50 });
 * const monitor = await fetchMonitorById('uuid');
 */

type ApiResponse<T> = {
  data: T;
};

type ApiError = {
  error: string;
  message?: string;
  statusCode?: number;
};

class ApiClientError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
  }
}

/**
 * Generic fetch wrapper with automatic Firebase token injection
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Auto-inject Firebase ID token if user is authenticated
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error('[API] Failed to get Firebase token:', error);
      // Continue without token for public endpoints
    }
  }

  const url = `${env.apiBaseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ApiError;
      throw new ApiClientError(
        errorData.error || errorData.message || 'Request failed',
        response.status
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network error'
    );
  }
}

/**
 * Fetch deals with optional filters
 * GET /deals
 */
export async function fetchDeals(
  filters?: Partial<DealFilters>
): Promise<Deal[]> {
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

  const response = await apiFetch<ApiResponse<Deal[]>>(endpoint);
  return response.data;
}

/**
 * Fetch single deal by ID
 * GET /deals/:id
 */
export async function fetchDealById(id: string): Promise<Deal> {
  const response = await apiFetch<ApiResponse<Deal>>(`/deals/${id}`);
  return response.data;
}

/**
 * Fetch monitors for authenticated user
 * GET /monitors
 */
export async function fetchMonitors(): Promise<Monitor[]> {
  const response = await apiFetch<ApiResponse<Monitor[]>>('/monitors');
  return response.data;
}

/**
 * Fetch single monitor by ID
 * GET /monitors/:id
 */
export async function fetchMonitorById(id: string): Promise<Monitor> {
  const response = await apiFetch<ApiResponse<Monitor>>(`/monitors/${id}`);
  return response.data;
}

/**
 * Fetch jobs for authenticated user
 * GET /jobs
 */
export async function fetchJobs(): Promise<Job[]> {
  const response = await apiFetch<ApiResponse<Job[]>>('/jobs');
  return response.data;
}

/**
 * Fetch single job by ID
 * GET /jobs/:id
 */
export async function fetchJobById(id: string): Promise<Job> {
  const response = await apiFetch<ApiResponse<Job>>(`/jobs/${id}`);
  return response.data;
}

/**
 * Fetch current user profile
 * GET /users/me
 */
export async function fetchUserProfile(): Promise<User> {
  const response = await apiFetch<ApiResponse<User>>('/users/me');
  return response.data;
}

/**
 * Export the generic fetch wrapper for advanced use cases
 */
export { apiFetch };
