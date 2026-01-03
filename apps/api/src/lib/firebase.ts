import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '@repo/logger';
import { Buffer } from 'buffer';

// Initialize Firebase Admin SDK
// It automatically uses GOOGLE_APPLICATION_CREDENTIALS env var
// Or we can parse FIREBASE_SERVICE_ACCOUNT_BASE64 if provided
const initFirebase = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
      return initializeApp({
        credential: cert(serviceAccount),
      });
    }

    return initializeApp(); // Fallback to ADC
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin', error as Error);
    throw error;
  }
};

const app = initFirebase();

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const firebaseApp = app;