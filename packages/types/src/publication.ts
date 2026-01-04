import { z } from 'zod';

export const PublicationChannelSchema = z.enum([
  'UI_READ_MODEL',
  'ALERT_EVENT',
  'ARB_SIGNAL',
]);

export const RateClassSchema = z.enum([
  'CRITICAL',
  'HIGH',
  'NORMAL',
  'BULK',
]);

export const PublicationEnvelopeSchema = z.object({
  channel: PublicationChannelSchema,
  rateClass: RateClassSchema,
  version: z.string(),
  key: z.string(),
  emittedAt: z.string().datetime(),
  payloadRef: z.string(),
});

export type PublicationEnvelope = z.infer<typeof PublicationEnvelopeSchema>;
