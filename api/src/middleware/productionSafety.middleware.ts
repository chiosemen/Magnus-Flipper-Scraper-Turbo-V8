import { Context, Next } from 'hono';
import { PRODUCTION_SAFE_MODE } from '../config/production';
import { isUnsafeInProduction, getRouteClassification } from '../config/routeSafety';
import { logger } from '@repo/logger';

/**
 * Production Safety Middleware
 *
 * Blocks UNSAFE routes when PRODUCTION_SAFE_MODE is enabled.
 * Returns 503 Service Unavailable with clear error message.
 */
export async function productionSafetyMiddleware(c: Context, next: Next) {
  if (!PRODUCTION_SAFE_MODE) {
    // Safety checks disabled in non-production
    return next();
  }

  const path = c.req.path;
  const method = c.req.method;

  if (isUnsafeInProduction(path, method)) {
    const classification = getRouteClassification(path, method);

    logger.warn('Blocked unsafe route in production', {
      path,
      method,
      reason: classification?.reason,
      mode: 'PRODUCTION_SAFE_MODE',
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'SERVICE_TEMPORARILY_DISABLED',
          message: 'This endpoint is temporarily disabled in production for safety',
          reason: classification?.reason || 'Route marked as unsafe',
          details: 'This operation is not yet validated for production use with 500+ users',
        },
      },
      503
    );
  }

  return next();
}
