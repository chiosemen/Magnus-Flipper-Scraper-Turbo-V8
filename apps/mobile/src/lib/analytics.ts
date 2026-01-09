import { addBreadcrumb } from './sentry';

/**
 * Analytics Wrapper
 *
 * Unified interface for tracking user events and screen views.
 * Currently uses Sentry breadcrumbs, can be extended to:
 * - Google Analytics
 * - Mixpanel
 * - Amplitude
 * - Custom backend
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export interface ScreenViewEvent {
  screen: string;
  params?: Record<string, any>;
}

/**
 * Track a custom event
 *
 * @example
 * trackEvent('deal_viewed', { dealId: '123', source: 'home_screen' })
 */
export function trackEvent(name: string, properties?: Record<string, any>): void {
  if (__DEV__) {
    console.log('[Analytics] Event:', name, properties);
  }

  // Send to Sentry as breadcrumb
  addBreadcrumb(`Event: ${name}`, properties);

  // TODO: Add additional analytics providers here
  // Example: Google Analytics, Mixpanel, etc.
}

/**
 * Track a screen view
 *
 * @example
 * trackScreenView('DealDetail', { dealId: '123' })
 */
export function trackScreenView(screen: string, params?: Record<string, any>): void {
  if (__DEV__) {
    console.log('[Analytics] Screen View:', screen, params);
  }

  // Send to Sentry as breadcrumb
  addBreadcrumb(`Screen: ${screen}`, params);

  // TODO: Add additional analytics providers here
}

/**
 * Track user action
 *
 * @example
 * trackAction('button_click', { buttonName: 'sign_up' })
 */
export function trackAction(action: string, properties?: Record<string, any>): void {
  trackEvent(`action:${action}`, properties);
}

/**
 * Track API call
 *
 * @example
 * trackApiCall('/deals', 'GET', 200, 450)
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  status: number,
  duration: number
): void {
  trackEvent('api_call', {
    endpoint,
    method,
    status,
    duration,
  });
}

/**
 * Track error
 *
 * @example
 * trackError('api_error', { endpoint: '/deals', status: 500 })
 */
export function trackError(errorName: string, properties?: Record<string, any>): void {
  trackEvent(`error:${errorName}`, properties);
}

/**
 * Set user properties
 * Call this when user signs in
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (__DEV__) {
    console.log('[Analytics] User Properties:', properties);
  }

  // Send to Sentry as breadcrumb
  addBreadcrumb('User Properties Set', properties);

  // TODO: Add additional analytics providers here
}

/**
 * Clear user properties
 * Call this when user signs out
 */
export function clearUserProperties(): void {
  if (__DEV__) {
    console.log('[Analytics] User Properties Cleared');
  }

  addBreadcrumb('User Properties Cleared', {});

  // TODO: Add additional analytics providers here
}
