import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  const gitSha = process.env.GIT_SHA || 'unknown';
  const buildTime = process.env.BUILD_TIME || 'unknown';

  return c.json({
    service: 'api',
    gitSha,
    buildTime,
  });
});

export default app;
