import { z } from 'zod';

export const TimestampSchema = z.union([z.date(), z.string(), z.number()]);
export type Timestamp = z.infer<typeof TimestampSchema>;

export const CurrencyEnum = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']);
export type Currency = z.infer<typeof CurrencyEnum>;

export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const GeoLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  city: z.string().optional(),
  country: z.string().optional(),
});
export type GeoLocation = z.infer<typeof GeoLocationSchema>;
