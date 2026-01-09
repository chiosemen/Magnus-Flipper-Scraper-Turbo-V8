import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import Constants from 'expo-constants';

/**
 * Firebase Client Configuration with React Native Persistence
 *
 * PRODUCTION SAFETY:
 * - Client-side only (no admin SDK)
 * - Uses AsyncStorage for auth persistence (React Native compatible)
 * - Environment variables from EXPO_PUBLIC_* prefix via expo-constants
 * - Auth only (no Firestore/Storage for now)
 *
 * NOTE: Firebase v10 automatically uses AsyncStorage for persistence in React Native
 * when @react-native-async-storage/async-storage is installed
 */

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY || '',
  authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN || '',
  projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID || '',
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Auth (Firebase auto-detects AsyncStorage in React Native)
export const auth = getAuth(app);
