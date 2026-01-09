import { createMiddleware } from 'hono/factory';
import { logger } from '@repo/logger';
import { RateLimitError } from '../utils/errors';

/**
 * In-Process Rate Limiter (Memory-Based)
 *
 * Designed for 500-user production deployment without Redis dependency.
 * Uses sliding window counter algorithm with periodic cleanup.
 *
 * IMPORTANT: This is single-process only. For multi-process deployments,
 * ensure sticky sessions or use Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for rate limit counters
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory bloat
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Default limits (requests per minute)
const LIMITS: Record<string, number> = {
  free: 60,       // 1 req/second
  basic: 120,     // 2 req/second
  pro: 300,       // 5 req/second
  elite: 600,     // 10 req/second
  enterprise: 1000, // 16 req/second
  default: 60,
};

export const rateLimitInProcessMiddleware = createMiddleware(async (c, next) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  // Extract user or fall back to IP
  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
             c.req.header('x-real-ip') ||
             'unknown';

  // Create rate limit key
  const key = user ? `user:${user.uid}` : `ip:${ip}`;

  // Determine limit based on tier
  const tier = (user?.tier as string) || 'default';
  const limit = LIMITS[tier] || LIMITS.default;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new window
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment counter
  entry.count++;

  // Set rate limit headers
  c.header('X-RateLimit-Limit', limit.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, limit - entry.count).toString());
  c.header('X-RateLimit-Reset', Math.floor(entry.resetAt / 1000).toString());

  // Check if limit exceeded
  if (entry.count > limit) {
    logger.warn('Rate limit exceeded', {
      key,
      tier,
      limit,
      count: entry.count,
      ip,
      userId: user?.uid,
      path: c.req.path,
      method: c.req.method,
    });

    throw new RateLimitError('Rate limit exceeded. Please try again later.');
  }

  await next();
});

/**
 * Get current rate limit stats (for monitoring/debugging)
 */
export function getRateLimitStats() {
  return {
    totalKeys: rateLimitStore.size,
    memoryUsageEstimate: rateLimitStore.size * 100, // bytes (rough estimate)
  };
}

/**
 * Clear all rate limit entries (for testing or emergency reset)
 */
export function clearRateLimitStore() {
  rateLimitStore.clear();
  logger.info('Rate limit store cleared');
}
