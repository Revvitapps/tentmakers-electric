export interface ServiceFusionTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type?: string;
}

/**
 * Minimal subset of Service Fusion calendar task.
 * See SF docs for full schema.
 */
export interface CalendarTask {
  id: number | string;
  type?: string;
  description?: string;
  start_date?: string; // ISO datetime
  end_date?: string; // ISO datetime
  is_completed?: boolean;
  users_id?: number[];
  customers_id?: number[];
  jobs_id?: number[];
  estimates_id?: number[];
  [key: string]: unknown;
}

export interface CalendarTaskListMeta {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
}

export interface CalendarTaskList {
  items?: CalendarTask[];
  _meta?: CalendarTaskListMeta;
  // Some SF responses wrap under different keys; keep flexible until confirmed.
  data?: CalendarTask[];
  results?: CalendarTask[];
  [key: string]: unknown;
}

export interface CalendarTaskCreatePayload {
  start_date: string;
  end_date: string;
  description: string;
  customers_id?: number | string | Array<number | string>;
  jobs_id?: number | string | Array<number | string>;
  estimates_id?: number | string | Array<number | string>;
  users_id?: number | string | Array<number | string>;
  type?: string;
  [key: string]: unknown;
}

export interface Customer {
  id: number | string;
  customer_id?: number | string;
  customer_name?: string;
  [key: string]: unknown; // see SF docs for full schema
}

export type CustomerPhone = {
  phone: string;
};

export interface CustomerCreatePayload {
  customer_name: string;
  contacts?: Array<{
    fname?: string;
    lname?: string;
    prefix?: string;
    suffix?: string;
    contact_type?: string;
    is_primary?: boolean;
    phones?: CustomerPhone[];
    emails?: Array<{
      email: string;
      class?: string;
      types_accepted?: string;
    }>;
  }>;
  locations?: Array<{
    street_1?: string;
    street_2?: string;
    city?: string;
    state_prov?: string;
    postal_code?: string;
    country?: string;
    nickname?: string;
    is_primary?: boolean;
    is_bill_to?: boolean;
    is_gated?: boolean;
    customer_contact?: string;
  }>;
  referral_source?: string;
  account_number?: string;
  private_notes?: string;
  public_notes?: string;
  [key: string]: unknown;
}

// Minimal SF estimate create payload, matching SF docs
export interface EstimateCreatePayload {
  description: string;
  tech_notes?: string;
  duration?: number;
  time_frame_promised_start?: string; // "HH:MM"
  time_frame_promised_end?: string; // "HH:MM"
  start_date?: string; // "YYYY-MM-DD"
  customer_name: string; // "First Last"
  status?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  street_1?: string | null;
  street_2?: string | null;
  city?: string | null;
  state_prov?: string | null;
  postal_code?: string | null;
  location_name?: string | null;
  is_gated?: boolean;
  gate_instructions?: string | null;
  category?: string | null;
  source?: string | null; // must be one of: Website, Thumbtack, Google, etc.
  note_to_customer?: string | null;
}

// Simple response type – SF returns an id
export interface EstimateCreateResponse {
  id: number | string;
}

export interface ScheduleWindow {
  start: string;
  end: string;
}

export interface Job {
  id: number | string;
  job_id?: number | string;
  description?: string;
  customers_id?: number;
  estimates_id?: number;
  [key: string]: unknown;
}

export interface JobCreatePayload {
  description?: string;
  customers_id?: number | string;
  estimates_id?: number | string;
  start_date?: string;
  end_date?: string;
  users_id?: number | string | Array<number | string>;
  [key: string]: unknown;
}

export interface BookRequest {
  source: string;
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  service: {
    type: string;
    notes?: string;
    estimatedPrice?: number;
    options?: Record<string, unknown>;
  };
  schedule: ScheduleWindow;
}

export interface BookingPipelineResult {
  status: 'ok' | 'error';
  customerId?: string | number | null;
  estimateId?: string | number | null;
  jobId?: string | number | null;
  calendarTaskId?: string | number | null;
  message?: string;
  error?: string;
}

export interface ThumbtackWebhookEnvelope {
  event?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ThumbtackTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}
