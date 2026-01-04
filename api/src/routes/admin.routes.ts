import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { DecodedIdToken } from 'firebase-admin/auth';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { getAdminControls, updateKillSwitches } from '../services/adminControls.service';
import { isAdminUser } from '../services/adminAuth.service';
import { updateCanaryRamp } from '../services/canary.service';

const app = new Hono<{ Variables: { user: DecodedIdToken } }>();

const killSwitchUpdateSchema = z.object({
  scrapersEnabled: z.boolean().optional(),
  facebookEnabled: z.boolean().optional(),
  vintedEnabled: z.boolean().optional(),
  realtimeEnabled: z.boolean().optional(),
  scheduledEnabled: z.boolean().optional(),
  manualEnabled: z.boolean().optional(),
  demoModeEnabled: z.boolean().optional(),
  demoModeTtlMinutes: z.number().int().positive().optional().nullable(),
});

const canaryUpdateSchema = z.object({
  target: z.string().min(1),
  rampPercent: z.number().int().min(0).max(100),
});

app.get('/status', authMiddleware, async (c) => {
  const user = c.get('user');
  const isAdmin = isAdminUser(user);
  return c.json({ success: true, data: { isAdmin } });
});

app.get('/controls', authMiddleware, adminMiddleware, async (c) => {
  const data = await getAdminControls();
  return c.json({ success: true, data });
});

app.patch('/controls/kill-switches', authMiddleware, adminMiddleware, zValidator('json', killSwitchUpdateSchema), async (c) => {
  const user = c.get('user');
  const payload = c.req.valid('json' as any) as z.infer<typeof killSwitchUpdateSchema>;
  const updated = await updateKillSwitches(user.uid, payload, process.env.NODE_ENV || 'unknown');
  return c.json({ success: true, data: updated });
});

app.patch('/controls/canary', authMiddleware, adminMiddleware, zValidator('json', canaryUpdateSchema), async (c) => {
  const user = c.get('user');
  const payload = c.req.valid('json' as any) as z.infer<typeof canaryUpdateSchema>;
  const updated = await updateCanaryRamp(payload.target, payload.rampPercent, {
    actorUserId: user.uid,
    env: process.env.NODE_ENV || 'unknown',
  });
  return c.json({ success: true, data: updated });
});

export default app;
