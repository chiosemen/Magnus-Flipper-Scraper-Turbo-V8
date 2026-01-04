import { vi } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const testDecodedToken: DecodedIdToken = {
  uid: 'test_user_123',
  email: 'jane.doe@example.com',
  name: 'Jane Doe',
  picture: 'https://lh3.googleusercontent.com/a/default-profile',
  firebase: {
    sign_in_provider: 'google.com',
    identities: {},
  },
  aud: 'test-project',
  iss: 'https://securetoken.google.com/test-project',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  auth_time: Math.floor(Date.now() / 1000),
  sub: 'test_user_123',
} as DecodedIdToken;

export const createAuthStub = () => ({
  verifyIdToken: vi.fn().mockResolvedValue(testDecodedToken),
  getUser: vi.fn().mockResolvedValue({
    uid: testDecodedToken.uid,
    email: testDecodedToken.email,
    displayName: testDecodedToken.name,
    photoURL: testDecodedToken.picture,
  }),
  revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
});

export const getTestFirestore = () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST must be set for Firestore integration tests');
  }

  if (getApps().length === 0) {
    initializeApp({ projectId: 'magnus-flipper-test' });
  }

  return getFirestore();
};
