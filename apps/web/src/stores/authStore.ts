import { create } from 'zustand';
import { User } from '@repo/types';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => void;
  getToken: () => Promise<string | null>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    
    onAuthStateChanged(auth, async (fbUser) => {
      set({ firebaseUser: fbUser, loading: !!fbUser });
      
      if (fbUser) {
        try {
          // Sync with backend DB
          const token = await fbUser.getIdToken();
          // Backend verify endpoint creates user if missing
          const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080/api';
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await response.json();
          set({ user: json.data, loading: false, initialized: true });
        } catch (error) {
          console.error('Failed to sync user', error);
          set({ user: null, loading: false, initialized: true });
        }
      } else {
        set({ user: null, loading: false, initialized: true });
      }
    });
  },

  getToken: async () => {
    const fbUser = get().firebaseUser;
    if (!fbUser) return null;
    return fbUser.getIdToken();
  },

  setUser: (user) => set({ user }),
}));