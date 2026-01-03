import { Hono } from 'hono';
import { DecodedIdToken } from 'firebase-admin/auth';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { dealsService } from '../services/deals.service';
import { DealFiltersSchema, UpdateDealSchema } from '@repo/types';
import { z } from 'zod';

type Env = {
  Variables: {
    user: DecodedIdToken;
    token: string;
  };
};

const app = new Hono<Env>();
app.use('*', authMiddleware);

app.get('/', zValidator('query', DealFiltersSchema.partial()), async (c) => {
  const user = c.get('user');
  const filters = c.req.valid('query' as any);
  const result = await dealsService.listDeals(user.uid, filters);
  return c.json({ success: true, ...result });
});

app.get('/:id', async (c) => {
  const user = c.get('user');
  const dealId = c.req.param().id;
  const deal = await dealsService.getDeal(dealId, user.uid);
  return c.json({ success: true, data: deal });
});

app.patch('/:id', zValidator('json', UpdateDealSchema.omit({ id: true })), async (c) => {
  const user = c.get('user');
  const dealId = c.req.param().id;
  const data = c.req.valid('json' as any);
  const deal = await dealsService.updateDeal(dealId, user.uid, data);
  return c.json({ success: true, data: deal });
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const dealId = c.req.param().id;
  await dealsService.deleteDeal(dealId, user.uid);
  return c.json({ success: true, deleted: true });
});

app.post('/:id/flag', zValidator('json', z.object({ reason: z.string() })), async (c) => {
  const user = c.get('user');
  const dealId = c.req.param().id;
  const deal = await dealsService.flagDeal(dealId, user.uid);
  return c.json({ success: true, data: deal });
});

export default app;