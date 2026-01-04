import { Hono } from 'hono';
import { DecodedIdToken } from 'firebase-admin/auth';
import { authMiddleware } from '../middleware/auth.middleware';
import { authService } from '../services/auth.service';

type Env = {
  Variables: {
    user: DecodedIdToken;
    token: string;
  };
};

const app = new Hono<Env>();
app.use('*', authMiddleware);

app.get('/me', async (c) => {
  const user = c.get('user');
  const dbUser = await authService.getUserProfile(user.uid);
  return c.json({ success: true, data: dbUser });
});

export default app;