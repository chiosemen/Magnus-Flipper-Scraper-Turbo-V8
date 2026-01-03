import { createMiddleware } from 'hono/factory';
import { redis } from '../lib/redis';
import { RateLimitError } from '../utils/errors';
import { logger } from '@repo/logger';

// Default limits (req/min)
const LIMITS: Record<string, number> = {
  free: 60,
  pro: 300,
  enterprise: 1000,
  default: 60,
};

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  
  // Key based on User ID if auth, else IP
  const key = user ? `ratelimit:user:${user.uid}` : `ratelimit:ip:${ip}`;
  
  // Determine limit (User tier would typically be fetched from DB or claims)
  // For now, assuming tier is in custom claims or defaulting
  const tier = (user?.tier as string) || 'default';
  const limit = LIMITS[tier] || LIMITS.default;
  const windowSeconds = 60;

  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, limit - current).toString());

    if (current > limit) {
      throw new RateLimitError();
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    // If Redis fails, log warning but allow request (fail open)
    logger.warn('Rate limit check failed (Redis error)', { error });
  }

  await next();
});
