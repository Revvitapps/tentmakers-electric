import type { BookRequest } from './sfTypes';
import { isIsoDate, isIsoDateOnly } from './timeUtils';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

export function assertISODate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isIsoDate(value)) {
    throw new ValidationError(`${field} must be an ISO-8601 datetime string`);
  }
  return value;
}

export function assertISODateOnly(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isIsoDateOnly(value)) {
    throw new ValidationError(`${field} must be a YYYY-MM-DD date string`);
  }
  return value;
}

export function validateAvailabilityQuery(input: {
  date?: unknown;
  durationMinutes?: unknown;
}): { date: string; durationMinutes: number } {
  const date = assertISODateOnly(input.date, 'date');

  const durationRaw = input.durationMinutes;
  const duration =
    durationRaw === undefined || durationRaw === null ? 120 : Number(durationRaw);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new ValidationError('durationMinutes must be a positive number');
  }

  return { date, durationMinutes: duration };
}

export function validateBookRequest(body: any): BookRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const source = assertString(body.source, 'source');

  if (!body.customer || typeof body.customer !== 'object') {
    throw new ValidationError('customer is required');
  }

  const customer = {
    firstName: assertString(body.customer.firstName, 'customer.firstName'),
    lastName: assertString(body.customer.lastName, 'customer.lastName'),
    email: typeof body.customer.email === 'string' ? body.customer.email : undefined,
    phone: typeof body.customer.phone === 'string' ? body.customer.phone : undefined,
    addressLine1:
      typeof body.customer.addressLine1 === 'string' ? body.customer.addressLine1 : undefined,
    city: typeof body.customer.city === 'string' ? body.customer.city : undefined,
    state: typeof body.customer.state === 'string' ? body.customer.state : undefined,
    postalCode:
      typeof body.customer.postalCode === 'string' ? body.customer.postalCode : undefined
  };

  if (!body.service || typeof body.service !== 'object') {
    throw new ValidationError('service is required');
  }

  const service = {
    type: assertString(body.service.type, 'service.type'),
    notes: typeof body.service.notes === 'string' ? body.service.notes : undefined,
    estimatedPrice:
      typeof body.service.estimatedPrice === 'number' ? body.service.estimatedPrice : undefined,
    options:
      body.service.options && typeof body.service.options === 'object'
        ? (body.service.options as Record<string, unknown>)
        : undefined
  };

  if (!body.schedule || typeof body.schedule !== 'object') {
    throw new ValidationError('schedule is required');
  }

  const scheduleStart = assertISODate(body.schedule.start, 'schedule.start');
  const scheduleEnd = assertISODate(body.schedule.end, 'schedule.end');

  if (new Date(scheduleEnd).getTime() <= new Date(scheduleStart).getTime()) {
    throw new ValidationError('schedule.end must be after schedule.start');
  }

  return {
    source,
    customer,
    service,
    schedule: {
      start: scheduleStart,
      end: scheduleEnd
    }
  };
}

export function getThumbtackConfig() {
  return {
    THUMBTACK_CLIENT_ID: assertString(
      process.env.THUMBTACK_CLIENT_ID,
      'THUMBTACK_CLIENT_ID'
    ),
    THUMBTACK_CLIENT_SECRET: assertString(
      process.env.THUMBTACK_CLIENT_SECRET,
      'THUMBTACK_CLIENT_SECRET'
    ),
    THUMBTACK_WEBHOOK_SECRET:
      typeof process.env.THUMBTACK_WEBHOOK_SECRET === 'string'
        ? process.env.THUMBTACK_WEBHOOK_SECRET
        : undefined,
    THUMBTACK_REDIRECT_URI:
      typeof process.env.THUMBTACK_REDIRECT_URI === 'string'
        ? process.env.THUMBTACK_REDIRECT_URI
        : undefined,
    THUMBTACK_REDIRECT_URI_STAGING:
      typeof process.env.THUMBTACK_REDIRECT_URI_STAGING === 'string'
        ? process.env.THUMBTACK_REDIRECT_URI_STAGING
        : undefined
  };
}
