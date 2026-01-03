import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import routes from './routes';

const app = new Hono();

// Global Middleware
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use('*', secureHeaders());
app.use('*', loggerMiddleware);
app.use('*', rateLimitMiddleware);

// Routes
app.route('/api', routes);

// 404 Handler
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

// Error Handler
app.onError(errorHandler);

export default app;
