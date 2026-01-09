import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { env } from '@/config/env';

/**
 * Firebase Client Configuration
 *
 * PRODUCTION SAFETY:
 * - Client-side only (no admin SDK)
 * - Uses environment variables
 * - Auth only (no Firestore/Storage for now)
 */

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
