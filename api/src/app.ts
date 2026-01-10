import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import { rateLimitInProcessMiddleware } from './middleware/rateLimitInProcess.middleware';
import { productionSafetyMiddleware } from './middleware/productionSafety.middleware';
import routes from './routes';

const app = new Hono();

// Validate required environment variables
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error('CORS_ORIGIN environment variable is required');
}

// Global Middleware
app.use('*', cors({
  origin: corsOrigin,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use('*', secureHeaders());
app.use('*', productionSafetyMiddleware);
app.use('*', loggerMiddleware);
app.use('*', rateLimitInProcessMiddleware);

// Routes
app.route('/api', routes);

// 404 Handler
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

// Error Handler
app.onError(errorHandler);

export default app;
