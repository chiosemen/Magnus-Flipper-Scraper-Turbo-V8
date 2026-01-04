import { serve } from '@hono/node-server';
import app from './app';
import { logger } from '@repo/logger';

const port = Number(process.env.PORT) || 8080;

logger.info(`Starting server on port ${port}...`);

const server = serve({
  fetch: app.fetch,
  port
});

// Graceful Shutdown
const shutdown = () => {
  logger.info('Shutting down server...');
  server.close(() => {
    logger.info('Server closed');
    (process as any).exit(0);
  });
};

(process as any).on('SIGINT', shutdown);
(process as any).on('SIGTERM', shutdown);