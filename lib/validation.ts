import { z } from 'zod';
import { isIsoDate, isIsoDateOnly } from './timeUtils';

const sfEnvSchema = z.object({
  SF_CLIENT_ID: z.string().min(1, 'SF_CLIENT_ID is required'),
  SF_CLIENT_SECRET: z.string().min(1, 'SF_CLIENT_SECRET is required'),
  SF_API_BASE: z
    .string()
    .url('SF_API_BASE must be a valid URL')
    .optional()
});

const thumbtackEnvSchema = z.object({
  THUMBTACK_CLIENT_ID: z.string().min(1, 'THUMBTACK_CLIENT_ID is required'),
  THUMBTACK_CLIENT_SECRET: z.string().min(1, 'THUMBTACK_CLIENT_SECRET is required'),
  THUMBTACK_WEBHOOK_SECRET: z.string().min(1, 'THUMBTACK_WEBHOOK_SECRET is required')
});

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value;
}

export function assertISODate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !isIsoDate(value)) {
    throw new ValidationError(`${fieldName} must be an ISO-8601 datetime string`);
  }
  return value;
}

const isoDateTimeSchema = z
  .string()
  .refine((value) => isIsoDate(value), { message: 'Must be an ISO-8601 datetime string' });

const isoDateSchema = z
  .string()
  .refine((value) => isIsoDateOnly(value), {
    message: 'Must be a YYYY-MM-DD date string'
  });

const customerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional()
});

const serviceSchema = z.object({
  type: z.string().min(1),
  notes: z.string().optional(),
  estimatedPrice: z.number().optional(),
  options: z.record(z.any()).optional()
});

const scheduleSchema = z
  .object({
    start: isoDateTimeSchema,
    end: isoDateTimeSchema
  })
  .refine(
    (value) => new Date(value.end).getTime() > new Date(value.start).getTime(),
    'schedule.end must be after schedule.start'
  );

export const availabilityQuerySchema = z.object({
  date: isoDateSchema,
  durationMinutes: z.coerce.number().int().positive().optional().default(120),
  techId: z.string().optional()
});

export const bookRequestSchema = z.object({
  source: z.string().min(1),
  customer: customerSchema,
  service: serviceSchema,
  schedule: scheduleSchema.nullable().optional()
});

export const thumbtackWebhookSchema = z.object({
  event: z.string().optional(),
  data: z.record(z.any())
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type BookRequestInput = z.infer<typeof bookRequestSchema>;
export type ThumbtackWebhookInput = z.infer<typeof thumbtackWebhookSchema>;

export function getServiceFusionConfig() {
  const env = sfEnvSchema.parse(process.env);

  return {
    clientId: env.SF_CLIENT_ID,
    clientSecret: env.SF_CLIENT_SECRET,
    apiBase: env.SF_API_BASE ?? 'https://api.servicefusion.com/v1'
  };
}

export function getThumbtackConfig() {
  return thumbtackEnvSchema.parse(process.env);
}
