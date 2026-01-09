import { Hono } from 'hono';
import { DecodedIdToken } from 'firebase-admin/auth';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { monitorsService } from '../services/monitors.service';
import { CreateMonitorSchema, UpdateMonitorSchema } from '@repo/types';
import { validateUuidParam } from '../utils/validation';

type Env = {
  Variables: {
    user: DecodedIdToken;
    token: string;
  };
};

const app = new Hono<Env>();
app.use('*', authMiddleware);

app.get('/', async (c) => {
  const user = c.get('user');
  const result = await monitorsService.listMonitors(user.uid);
  return c.json({ success: true, ...result });
});

app.get('/:id', validateUuidParam('id'), async (c) => {
  const user = c.get('user');
  const monitor = await monitorsService.getMonitor(c.req.param().id, user.uid);
  return c.json({ success: true, data: monitor });
});

app.post('/', zValidator('json', CreateMonitorSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const monitor = await monitorsService.createMonitor(user.uid, data);
  return c.json({ success: true, data: monitor }, 201);
});

app.patch('/:id', validateUuidParam('id'), zValidator('json', UpdateMonitorSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const monitor = await monitorsService.updateMonitor(c.req.param().id, user.uid, data);
  return c.json({ success: true, data: monitor });
});

app.delete('/:id', validateUuidParam('id'), async (c) => {
  const user = c.get('user');
  await monitorsService.deleteMonitor(c.req.param().id, user.uid);
  return c.json({ success: true, deleted: true });
});

app.post('/:id/pause', validateUuidParam('id'), async (c) => {
  const user = c.get('user');
  const monitor = await monitorsService.pauseMonitor(c.req.param().id, user.uid);
  return c.json({ success: true, data: monitor });
});

app.post('/:id/resume', validateUuidParam('id'), async (c) => {
  const user = c.get('user');
  const monitor = await monitorsService.resumeMonitor(c.req.param().id, user.uid);
  return c.json({ success: true, data: monitor });
});

export default app;