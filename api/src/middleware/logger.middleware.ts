import { createMiddleware } from 'hono/factory';
import { logger } from '@repo/logger';
import { randomUUID } from 'crypto';

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || randomUUID();
  c.set('requestId', requestId); // Assuming we extend context later or just rely on this scope

  const start = Date.now();
  const { method, path } = c.req;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Extract user ID if available from auth middleware
  const user = c.get('user');
  const userId = user ? user.uid : 'anonymous';

  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

  logger[level](`${method} ${path} ${status} - ${duration}ms`, {
    requestId,
    userId,
    status,
    duration,
    method,
    path
  });
});
