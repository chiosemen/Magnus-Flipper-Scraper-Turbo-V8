import { Hono } from 'hono';
import { DecodedIdToken } from 'firebase-admin/auth';
import { authMiddleware } from '../middleware/auth.middleware';
import { analyticsService } from '../services/analytics.service';

type Env = {
  Variables: {
    user: DecodedIdToken;
    token: string;
  };
};

const app = new Hono<Env>();
app.use('*', authMiddleware);

app.get('/dashboard', async (c) => {
  const user = c.get('user');
  const stats = await analyticsService.getDashboardStats(user.uid);
  return c.json({ success: true, data: stats });
});

export default app;