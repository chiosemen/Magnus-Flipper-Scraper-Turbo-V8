import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import * as SecureStore from 'expo-secure-store';

/**
 * Production-Hardened Auth Context
 *
 * SECURITY FEATURES:
 * 1. Secure token storage via expo-secure-store
 * 2. Session persistence check on app launch
 * 3. Automatic cleanup on logout
 * 4. Zero business logic - Firebase Auth = identity only
 *
 * ARCHITECTURE:
 * - Firebase Client SDK for auth with AsyncStorage persistence
 * - SecureStore for sensitive token metadata
 * - Auto-syncs auth state via onAuthStateChanged
 * - Exposes: user, isLoading, isReady, signIn, signUp, signOut
 */

const SECURE_KEYS = {
  SESSION_TOKEN: 'firebase_session_token',
  USER_ID: 'firebase_user_id',
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check for existing session on mount
    const initializeAuth = async () => {
      try {
        // Check secure storage for existing session
        const storedUserId = await SecureStore.getItemAsync(SECURE_KEYS.USER_ID);

        if (storedUserId && mounted) {
          console.log('[Auth] Found stored session, waiting for Firebase sync...');
        }
      } catch (error) {
        console.error('[Auth] Failed to check stored session:', error);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      setUser(firebaseUser);

      if (firebaseUser) {
        // Store session metadata securely
        try {
          await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, firebaseUser.uid);
          const token = await firebaseUser.getIdToken();
          await SecureStore.setItemAsync(SECURE_KEYS.SESSION_TOKEN, token);
        } catch (error) {
          console.error('[Auth] Failed to store session:', error);
        }
      } else {
        // Clear secure storage on logout
        try {
          await SecureStore.deleteItemAsync(SECURE_KEYS.USER_ID);
          await SecureStore.deleteItemAsync(SECURE_KEYS.SESSION_TOKEN);
        } catch (error) {
          console.error('[Auth] Failed to clear session:', error);
        }
      }

      setIsLoading(false);
      setIsReady(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated via onAuthStateChanged
    } catch (error) {
      console.error('[Auth] Sign in failed:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // User state will be updated via onAuthStateChanged
    } catch (error) {
      console.error('[Auth] Sign up failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Secure storage will be cleared via onAuthStateChanged
    } catch (error) {
      console.error('[Auth] Sign out failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isReady,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
