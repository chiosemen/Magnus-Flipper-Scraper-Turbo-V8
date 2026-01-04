import { z } from 'zod';

export const UiListingCardSchema = z.object({
  listingId: z.string(),
  marketplace: z.string(),
  title: z.string(),
  priceUSD: z.number(),
  score: z.number(),
  signals: z.record(z.number()),
  updatedAt: z.string().datetime(),
});

export type UiListingCard = z.infer<typeof UiListingCardSchema>;
