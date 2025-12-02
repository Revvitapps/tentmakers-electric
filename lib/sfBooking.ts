import { sfFetch } from './sfClient';
import type {
  BookRequest,
  BookingPipelineResult,
  CalendarTaskCreatePayload,
  CustomerCreatePayload,
  Customer,
  EstimateCreatePayload,
  EstimateCreateResponse
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
  const fullName = `${payload.customer.firstName} ${payload.customer.lastName}`.trim();
  const referralSource = mapReferralSource(payload.source);

  const contacts: CustomerCreatePayload['contacts'] = [
    {
      fname: payload.customer.firstName,
      lname: payload.customer.lastName,
      is_primary: true,
      phones: payload.customer.phone
        ? [
            {
              phone: payload.customer.phone
            }
          ]
        : undefined,
      emails: payload.customer.email
        ? [
            {
              email: payload.customer.email,
              class: 'Personal'
            }
          ]
        : undefined
    }
  ];

  const locations: CustomerCreatePayload['locations'] =
    payload.customer.addressLine1 || payload.customer.city || payload.customer.state || payload.customer.postalCode
      ? [
          {
            street_1: payload.customer.addressLine1,
            city: payload.customer.city,
            state_prov: payload.customer.state,
            postal_code: payload.customer.postalCode,
            country: 'USA',
            nickname: 'Primary',
            is_primary: true,
            is_bill_to: true
          }
        ]
      : undefined;

  const customerPayload: CustomerCreatePayload = {
    customer_name: fullName.slice(0, 44), // SF complains above 45 chars
    contacts,
    locations,
    referral_source: referralSource,
    private_notes: `Lead source: ${payload.source}`
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
  const estimatePayload = buildEstimatePayload(payload);

  const response = await sfFetch<EstimateCreateResponse>(ESTIMATES_ENDPOINT, {
    method: 'POST',
    json: estimatePayload
  });

  const id = response?.id ?? null;
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
    customers_id: [customerId],
    estimates_id: [estimateId],
    jobs_id: jobId ? [jobId] : undefined,
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

function buildEstimatePayload(req: BookRequest): EstimateCreatePayload {
  const { customer, service, schedule, source } = req;
  const startIso = schedule.start;
  const endIso = schedule.end;

  const startDate = startIso.slice(0, 10); // YYYY-MM-DD
  const startTime = startIso.slice(11, 16); // HH:MM
  const endTime = endIso.slice(11, 16); // HH:MM

  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000)
  );

  const fullName = `${customer.firstName} ${customer.lastName}`.trim().slice(0, 44);
  const sfSource = mapReferralSource(source);

  return {
    description: service?.type ? `Estimate – ${service.type}` : 'Estimate – Online request',
    tech_notes: service?.notes ?? undefined,
    duration: durationSeconds || undefined,
    time_frame_promised_start: startTime,
    time_frame_promised_end: endTime,
    start_date: startDate,
    customer_name: fullName,
    status: 'Estimate Requested',
    contact_first_name: customer.firstName,
    contact_last_name: customer.lastName,
    street_1: customer.addressLine1 ?? null,
    city: customer.city ?? null,
    state_prov: customer.state ?? null,
    postal_code: customer.postalCode ?? null,
    location_name: 'Primary',
    is_gated: false,
    source: sfSource ?? null,
    note_to_customer: service?.notes ?? null
  };
}

function mapReferralSource(source: string): string | undefined {
  const allowed = [
    'BNI Group',
    'Business Phone Line',
    'Existing Customer',
    'Google',
    'Home Depot',
    'Thumbtack',
    'Website',
    'Word of Mouth'
  ];

  const match = allowed.find(
    (candidate) => candidate.toLowerCase() === source.trim().toLowerCase()
  );

  if (match) {
    return match;
  }

  // Fallback to a generic allowed source; include original source in notes.
  return 'Website';
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
