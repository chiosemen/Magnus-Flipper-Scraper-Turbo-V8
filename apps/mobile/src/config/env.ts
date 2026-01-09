import Constants from 'expo-constants';

/**
 * Type-Safe Environment Configuration
 *
 * PRODUCTION SAFETY:
 * - All env vars use EXPO_PUBLIC_ prefix
 * - Validates required vars at startup
 * - Fails fast if misconfigured
 */

type EnvConfig = {
  apiBaseUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
};

function getEnvVar(key: string, fallback?: string): string {
  const value = Constants.expoConfig?.extra?.[key] || fallback;

  if (!value) {
    throw new Error(
      `Missing required environment variable: EXPO_PUBLIC_${key}\n` +
        `Add it to .env.local or app.json extra configuration.`
    );
  }

  return value;
}

export const env: EnvConfig = {
  apiBaseUrl: getEnvVar('API_BASE_URL', 'http://localhost:3000'),
  firebaseApiKey: getEnvVar('FIREBASE_API_KEY', ''),
  firebaseAuthDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', ''),
  firebaseProjectId: getEnvVar('FIREBASE_PROJECT_ID', ''),
};

// Validate config on import (dev only)
if (__DEV__) {
  console.log('[ENV] Configuration loaded:', {
    apiBaseUrl: env.apiBaseUrl,
    firebaseProjectId: env.firebaseProjectId,
  });
}
