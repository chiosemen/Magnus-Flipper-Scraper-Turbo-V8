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
  analytics: {
    dashboard: () => request<any>('/analytics/dashboard'),
  },
  // Add other endpoints as needed
};