import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Sentry Error Tracking Configuration
 *
 * Production-grade error monitoring with:
 * - Automatic error capture
 * - Performance monitoring
 * - Release tracking
 * - User context
 */

const SENTRY_DSN = Constants.expoConfig?.extra?.SENTRY_DSN;

/**
 * Initialize Sentry
 * Call this ONCE at app startup in App.tsx or _layout.tsx
 */
export function initializeSentry(): void {
  if (!SENTRY_DSN) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  if (__DEV__) {
    console.log('[Sentry] Skipping initialization in development mode');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,
    tracesSampleRate: 1.0, // Adjust for production (0.0 - 1.0)
    enableNative: true,
    enableNativeCrashHandling: true,
    enableAutoPerformanceTracing: true,
    environment: Constants.expoConfig?.extra?.ENV || 'production',
    release: Constants.expoConfig?.version || '1.0.0',
    dist: Constants.expoConfig?.android?.versionCode?.toString() || '1',
  });

  console.log('[Sentry] Initialized successfully');
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

/**
 * Clear user context on logout
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Manually capture an error
 * Use this for caught errors you want to track
 */
export function captureError(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.setContext('error_context', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

export default Sentry;
