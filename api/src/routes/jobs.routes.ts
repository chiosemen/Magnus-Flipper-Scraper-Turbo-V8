import { Hono } from 'hono';
import { DecodedIdToken } from 'firebase-admin/auth';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { jobsService } from '../services/jobs.service';
import { CreateJobSchema } from '@repo/types';

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
  const result = await jobsService.listJobs(user.uid);
  return c.json({ success: true, ...result });
});

app.get('/:id', async (c) => {
  const user = c.get('user');
  const job = await jobsService.getJob(c.req.param().id, user.uid);
  return c.json({ success: true, data: job });
});

app.post('/', zValidator('json', CreateJobSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json' as any);
  const job = await jobsService.createJob(user.uid, data);
  return c.json({ success: true, data: job }, 201);
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  await jobsService.cancelJob(c.req.param().id, user.uid);
  return c.json({ success: true, cancelled: true });
});

export default app;