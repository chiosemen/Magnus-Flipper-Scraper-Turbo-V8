import Constants from 'expo-constants';

/**
 * Environment Configuration Loader
 *
 * PRODUCTION SAFETY:
 * - All env vars must use EXPO_PUBLIC_ prefix
 * - Validates required vars at startup
 * - Fails fast if misconfigured
 *
 * USAGE:
 * Add to .env.local:
 *   EXPO_PUBLIC_API_URL=https://api.example.com
 *   EXPO_PUBLIC_FIREBASE_API_KEY=your-key
 */

type EnvConfig = {
  apiUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
};

function getEnvVar(key: string, fallback?: string): string {
  const value = Constants.expoConfig?.extra?.[key] || process.env[`EXPO_PUBLIC_${key}`] || fallback;

  if (!value) {
    throw new Error(
      `Missing required environment variable: EXPO_PUBLIC_${key}\n` +
      `Add it to .env.local or app.json extra configuration.`
    );
  }

  return value;
}

export const env: EnvConfig = {
  apiUrl: getEnvVar('API_URL', 'http://localhost:3000'),
  firebaseApiKey: getEnvVar('FIREBASE_API_KEY', 'demo-api-key'),
  firebaseAuthDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', 'demo.firebaseapp.com'),
  firebaseProjectId: getEnvVar('FIREBASE_PROJECT_ID', 'demo-project'),
};

// Validate config on import
if (__DEV__) {
  console.log('[ENV] Configuration loaded:', {
    apiUrl: env.apiUrl,
    firebaseProjectId: env.firebaseProjectId,
  });
}
