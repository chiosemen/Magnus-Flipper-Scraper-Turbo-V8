import { 
  Deal, DealFilters, Monitor, CreateMonitor, UpdateMonitor, 
  Job, CreateJob, User, UserSettings, DashboardStats 
} from '@repo/types';
import { useAuthStore } from '../stores/authStore';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await useAuthStore.getState().getToken();
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  const json = await response.json();
  return json.data || json; // Handle { success: true, data: ... } wrapper
}

export const api = {
  deals: {
    list: (filters: DealFilters) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
      return request<{ items: Deal[], pagination: any }>(`/deals?${params.toString()}`);
    },
    get: (id: string) => request<Deal>(`/deals/${id}`),
    update: (id: string, data: Partial<Deal>) => request<Deal>(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/deals/${id}`, { method: 'DELETE' }),
  },
  
  monitors: {
    list: () => request<{ items: Monitor[] }>('/monitors'),
    get: (id: string) => request<Monitor>(`/monitors/${id}`),
    create: (data: CreateMonitor) => request<Monitor>('/monitors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateMonitor) => request<Monitor>(`/monitors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/monitors/${id}`, { method: 'DELETE' }),
    pause: (id: string) => request<Monitor>(`/monitors/${id}/pause`, { method: 'POST' }),
    resume: (id: string) => request<Monitor>(`/monitors/${id}/resume`, { method: 'POST' }),
  },

  jobs: {
    list: (monitorId?: string) => {
      const params = monitorId ? `?monitorId=${monitorId}` : '';
      return request<{ items: Job[] }>(`/jobs${params}`);
    },
    get: (id: string) => request<Job>(`/jobs/${id}`),
    create: (data: CreateJob) => request<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string) => request(`/jobs/${id}`, { method: 'DELETE' }),
  },

  analytics: {
    dashboard: () => request<DashboardStats>('/analytics/dashboard'),
  },

  users: {
    me: () => request<User>('/users/me'),
    updateSettings: (settings: UserSettings) => request<User>('/users/me/settings', { method: 'POST', body: JSON.stringify(settings) }),
  },

  stripe: {
    checkout: (tier: 'basic' | 'pro' | 'elite' | 'enterprise') =>
      request<{ url: string }>('/stripe/checkout', { method: 'POST', body: JSON.stringify({ tier }) }),
    portal: () => request<{ url: string }>('/stripe/portal'),
  },

  admin: {
    status: () => request<{ isAdmin: boolean }>('/admin/status'),
    controls: () => request('/admin/controls'),
    updateKillSwitches: (payload: Record<string, any>) =>
      request('/admin/controls/kill-switches', { method: 'PATCH', body: JSON.stringify(payload) }),
  },
};
