/**
 * API ROUTE SAFETY CLASSIFICATION
 *
 * Classification for 500-subscriber deployment:
 * - ✅ SAFE: Read-only, idempotent, validated
 * - ⚠️ CONDITIONAL: Writes with strict validation, safe for production
 * - ❌ UNSAFE: Experimental, incomplete, or high-risk operations
 *
 * UNSAFE routes return 503 in PRODUCTION_SAFE_MODE
 */

export type RouteStatus = 'SAFE' | 'CONDITIONAL' | 'UNSAFE';

export interface RouteClassification {
  path: string;
  method: string;
  status: RouteStatus;
  reason: string;
}

/**
 * Comprehensive route safety manifest
 */
export const ROUTE_SAFETY: RouteClassification[] = [
  // Health routes - Infrastructure monitoring
  { path: '/health/', method: 'GET', status: 'SAFE', reason: 'Read-only status check' },
  { path: '/health/ready', method: 'GET', status: 'SAFE', reason: 'Read-only health check' },
  { path: '/health/live', method: 'GET', status: 'SAFE', reason: 'Read-only liveness probe' },

  // Auth routes - User authentication
  { path: '/auth/verify', method: 'POST', status: 'CONDITIONAL', reason: 'Idempotent user creation with auth middleware' },
  { path: '/auth/me', method: 'GET', status: 'SAFE', reason: 'Read-only user profile' },
  { path: '/auth/logout', method: 'POST', status: 'CONDITIONAL', reason: 'Safe token revocation' },

  // Deals routes - User deal management
  { path: '/deals/', method: 'GET', status: 'SAFE', reason: 'Read-only with zod validation' },
  { path: '/deals/:id', method: 'GET', status: 'SAFE', reason: 'Read-only single resource' },
  { path: '/deals/:id', method: 'PATCH', status: 'CONDITIONAL', reason: 'Validated write with UpdateDealSchema' },
  { path: '/deals/:id', method: 'DELETE', status: 'CONDITIONAL', reason: 'User-scoped deletion' },
  { path: '/deals/:id/flag', method: 'POST', status: 'CONDITIONAL', reason: 'Validated flag operation' },

  // Monitors routes - Scraper monitor management
  { path: '/monitors/', method: 'GET', status: 'SAFE', reason: 'Read-only list' },
  { path: '/monitors/:id', method: 'GET', status: 'SAFE', reason: 'Read-only single resource' },
  { path: '/monitors/', method: 'POST', status: 'CONDITIONAL', reason: 'Validated write with CreateMonitorSchema' },
  { path: '/monitors/:id', method: 'PATCH', status: 'CONDITIONAL', reason: 'Validated write with UpdateMonitorSchema' },
  { path: '/monitors/:id', method: 'DELETE', status: 'CONDITIONAL', reason: 'User-scoped deletion' },
  { path: '/monitors/:id/pause', method: 'POST', status: 'CONDITIONAL', reason: 'Idempotent state change' },
  { path: '/monitors/:id/resume', method: 'POST', status: 'CONDITIONAL', reason: 'Idempotent state change' },

  // Jobs routes - Job queue management
  { path: '/jobs/', method: 'GET', status: 'SAFE', reason: 'Read-only list' },
  { path: '/jobs/:id', method: 'GET', status: 'SAFE', reason: 'Read-only single resource' },
  { path: '/jobs/', method: 'POST', status: 'CONDITIONAL', reason: 'Validated write with CreateJobSchema' },
  { path: '/jobs/:id', method: 'DELETE', status: 'CONDITIONAL', reason: 'Safe job cancellation' },

  // Analytics routes - Dashboard metrics
  { path: '/analytics/dashboard', method: 'GET', status: 'SAFE', reason: 'Read-only aggregated stats' },

  // Users routes - User profile
  { path: '/users/me', method: 'GET', status: 'SAFE', reason: 'Read-only user profile' },

  // Stripe routes - Payment processing (CRITICAL)
  { path: '/stripe/checkout', method: 'POST', status: 'CONDITIONAL', reason: 'Validated Stripe session creation with demo mode guard' },
  { path: '/stripe/portal', method: 'GET', status: 'CONDITIONAL', reason: 'Validated Stripe portal with demo mode guard' },
  {
    path: '/stripe/webhook',
    method: 'POST',
    status: 'CONDITIONAL',
    // CRITICAL: Stripe webhooks must ALWAYS be allowed in production
    // Revenue impact: Subscription activations, tier upgrades, payment confirmations
    // Safety measures: Signature verification (line 140 stripe.routes.ts), event deduplication (line 47 applyStripeTierChange.ts)
    // Idempotency: lastEventId prevents duplicate processing
    reason: 'ALWAYS_ALLOWED: Revenue-critical webhook with signature verification and event deduplication'
  },

  // Admin routes - Administrative controls (CRITICAL)
  { path: '/admin/status', method: 'GET', status: 'SAFE', reason: 'Read-only admin check' },
  { path: '/admin/controls', method: 'GET', status: 'SAFE', reason: 'Read-only admin controls, gated by adminMiddleware' },
  { path: '/admin/controls/kill-switches', method: 'PATCH', status: 'CONDITIONAL', reason: 'Validated admin operation with zod schema and admin middleware' },
  { path: '/admin/controls/canary', method: 'PATCH', status: 'CONDITIONAL', reason: 'Validated admin operation with zod schema and admin middleware' },

  // Telemetry routes - Usage monitoring
  { path: '/telemetry/usage', method: 'GET', status: 'SAFE', reason: 'Read-only telemetry data, admin-gated' },
];

/**
 * Get classification for a route
 */
export function getRouteClassification(path: string, method: string): RouteClassification | undefined {
  // Normalize path for matching
  const normalizedPath = path.endsWith('/') ? path : path + '/';

  return ROUTE_SAFETY.find(route => {
    const routePath = route.path.endsWith('/') ? route.path : route.path + '/';
    const pathMatches = routePath === normalizedPath ||
                       routePath.replace(/:\w+/g, '[^/]+') === normalizedPath;
    return pathMatches && route.method.toUpperCase() === method.toUpperCase();
  });
}

/**
 * Check if route is unsafe in production
 */
export function isUnsafeInProduction(path: string, method: string): boolean {
  const classification = getRouteClassification(path, method);
  return classification?.status === 'UNSAFE';
}

/**
 * Get all unsafe routes for reporting
 */
export function getUnsafeRoutes(): RouteClassification[] {
  return ROUTE_SAFETY.filter(route => route.status === 'UNSAFE');
}
