import { sfFetch } from './sfClient';
import type {
  BookRequest,
  BookingPipelineResult,
  CalendarTaskCreatePayload,
  CustomerCreatePayload,
  Customer,
  EstimateCreatePayload,
  Estimate
} from './sfTypes';

const CUSTOMERS_ENDPOINT = 'customers';
const ESTIMATES_ENDPOINT = 'estimates';
const CALENDAR_TASKS_ENDPOINT = 'calendar-tasks';

export async function runBookingPipeline(payload: BookRequest): Promise<BookingPipelineResult> {
  const customerId = await createCustomer(payload);
  const estimateId = await createEstimate(payload, customerId);

  // TODO: Add /jobs creation once the exact fields are confirmed with Service Fusion.
  const jobId: string | number | null = null;

  const calendarTaskId = await createCalendarTask(payload, customerId, estimateId, jobId);

  const message = 'Booking created in Service Fusion';

  return {
    status: 'ok',
    customerId,
    estimateId,
    jobId,
    calendarTaskId,
    message
  };
}

async function createCustomer(payload: BookRequest): Promise<string | number> {
  const customerPayload: CustomerCreatePayload = {
    first_name: payload.customer.firstName,
    last_name: payload.customer.lastName,
    email: payload.customer.email,
    phone: payload.customer.phone,
    address_line_1: payload.customer.addressLine1,
    city: payload.customer.city,
    state: payload.customer.state,
    postal_code: payload.customer.postalCode,
    source: payload.source,
    // TODO: map to SF fields such as marketing campaigns, customer types, etc.
    notes: `Lead source: ${payload.source}`
  };

  // TODO: search by email/phone to avoid duplicate customers before creating a new record.

  const response = await sfFetch<Customer>(CUSTOMERS_ENDPOINT, {
    method: 'POST',
    json: customerPayload
  });

  const id = extractIdentifier(response as Record<string, unknown>, ['id', 'customer_id', 'customers_id']);
  if (id === null) {
    throw new Error('Customer response did not include an identifier');
  }

  return id;
}

async function createEstimate(
  payload: BookRequest,
  customerId: string | number
): Promise<string | number> {
  const estimatePayload: EstimateCreatePayload = {
    customers_id: customerId,
    description: `Estimate for ${payload.service.type}`,
    notes: [
      payload.service.notes,
      `Source: ${payload.source}`,
      payload.service.estimatedPrice
        ? `Estimated price: $${payload.service.estimatedPrice}`
        : undefined
    ]
      .filter(Boolean)
      .join('\n'),
    source: payload.source,
    metadata: {
      options: payload.service.options ?? {},
      // TODO: align metadata with SF custom fields once available.
      origin: payload.source
    }
  };

  const response = await sfFetch<Estimate>(ESTIMATES_ENDPOINT, {
    method: 'POST',
    json: estimatePayload
  });

  const id = extractIdentifier(response as Record<string, unknown>, ['id', 'estimate_id', 'estimates_id']);
  if (id === null) {
    throw new Error('Estimate response did not include an identifier');
  }

  return id;
}

async function createCalendarTask(
  payload: BookRequest,
  customerId: string | number,
  estimateId: string | number,
  jobId: string | number | null
): Promise<string | number | null> {
  const calendarPayload: CalendarTaskCreatePayload = {
    start_date: payload.schedule.start,
    end_date: payload.schedule.end,
    description: buildCalendarDescription(payload),
    customers_id: customerId,
    estimates_id: estimateId,
    jobs_id: jobId ?? undefined,
    type: payload.service.type
    // TODO: add technicians/users when Thumbtack provides those preferences.
  };

  const response = await sfFetch<Record<string, unknown>>(CALENDAR_TASKS_ENDPOINT, {
    method: 'POST',
    json: calendarPayload
  });

  return extractIdentifier(response, ['id', 'task_id', 'calendar_task_id']);
}

function buildCalendarDescription(payload: BookRequest) {
  const lines = [
    `${payload.service.type} via ${payload.source}`,
    payload.service.notes,
    payload.service.estimatedPrice ? `Est. price: $${payload.service.estimatedPrice}` : undefined
  ].filter(Boolean);

  return lines.join(' - ');
}

function extractIdentifier(
  record: Record<string, unknown>,
  fields: string[]
): string | number | null {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }
  }

  return null;
}
