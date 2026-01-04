import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const getTestFirestore = () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST must be set for Firestore integration tests');
  }

  if (getApps().length === 0) {
    initializeApp({ projectId: 'magnus-flipper-test' });
  }

  return getFirestore();
};
