import { Hono } from 'hono';
import { checkDbConnection } from '../lib/db';
import { checkRedisConnection } from '../lib/redis';

const app = new Hono();

app.get('/', (c) => c.json({ status: 'ok', version: '1.0.0' }));

app.get('/ready', async (c) => {
  const dbHealth = await checkDbConnection();
  const redisHealth = await checkRedisConnection();
  
  if (dbHealth && redisHealth) {
    return c.json({ status: 'ready', db: 'ok', redis: 'ok' });
  }
  return c.json({ status: 'not_ready', db: dbHealth ? 'ok' : 'fail', redis: redisHealth ? 'ok' : 'fail' }, 503);
});

app.get('/live', (c) => c.json({ status: 'live' }));

export default app;
