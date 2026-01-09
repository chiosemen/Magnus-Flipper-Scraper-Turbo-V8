import { createMiddleware } from 'hono/factory';
import { logger } from '@repo/logger';
import { randomUUID } from 'crypto';

/**
 * Enhanced Logger Middleware with Operator Visibility
 *
 * Logs all requests with critical context for production debugging:
 * - Request ID (for tracing across services)
 * - User ID (for user-specific issues)
 * - IP address (for abuse detection)
 * - User agent (for client compatibility)
 * - Route name (for route-level metrics)
 * - Error details (for failure diagnosis)
 * - Performance metrics (for bottleneck identification)
 */
export const loggerMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || randomUUID();
  c.set('requestId', requestId);

  const start = Date.now();
  const { method, path } = c.req;

  // Extract client info for operator visibility
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
             c.req.header('x-real-ip') ||
             c.req.header('cf-connecting-ip') ||
             'unknown';

  const userAgent = c.req.header('user-agent') || 'unknown';

  // Extract route name (strip /api prefix and params)
  const routeName = path.replace('/api/', '').split('/')[0] || 'root';

  let error: Error | undefined;

  try {
    await next();
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
    throw err; // Re-throw to error handler
  } finally {
    const duration = Date.now() - start;
    const status = c.res.status;

    // Extract user ID if available from auth middleware
    const user = c.get('user');
    const userId = user ? user.uid : 'anonymous';
    const userTier = user?.tier || 'unknown';

    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    const logContext = {
      requestId,
      userId,
      userTier,
      status,
      duration,
      method,
      path,
      routeName,
      ip,
      userAgent: userAgent.substring(0, 100), // Truncate long user agents
    };

    // Add error details if present
    if (error || status >= 400) {
      Object.assign(logContext, {
        errorName: error?.name,
        errorMessage: error?.message,
        errorCode: (error as any)?.code,
        errorStack: error?.stack?.split('\n')[0], // First line only
      });
    }

    // Add performance warning for slow requests
    if (duration > 3000) {
      Object.assign(logContext, {
        performanceWarning: 'SLOW_REQUEST',
        durationMs: duration,
      });
    }

    logger[level](
      `${method} ${routeName} ${status} - ${duration}ms [${userId}]`,
      logContext
    );
  }
});
