import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApiClient } from '../helpers/supertest';
import { resetDatabase, seedBaselineConfigs, seedDeal, seedUser } from '../helpers/db';
import { DealSchema, PaginationSchema } from '@repo/types';

const authHeader = { Authorization: 'Bearer test-token' };

const DealsListResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(DealSchema),
  pagination: PaginationSchema,
});

describe('UI contract (integration)', () => {
  const client = createApiClient();

  beforeEach(async () => {
    await resetDatabase();
    await seedBaselineConfigs();
    await seedUser();
    await seedDeal();
  });

  it('GET /api/deals matches Deal contract for UI consumers', async () => {
    const res = await client.get('/api/deals').set(authHeader);
    expect(res.status).toBe(200);

    const parsed = DealsListResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });
});
