import { z } from 'zod';

export const ArbitrageSignalSchema = z.object({
  listingId: z.string(),
  marketplace: z.string(),
  estimatedResaleUSD: z.number(),
  expectedProfitUSD: z.number(),
  confidence: z.number().min(0).max(1),
  drivers: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

export type ArbitrageSignal = z.infer<typeof ArbitrageSignalSchema>;
