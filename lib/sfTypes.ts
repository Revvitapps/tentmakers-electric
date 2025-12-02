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
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown; // see SF docs for full schema
}

export interface CustomerCreatePayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  source?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface Estimate {
  id: number | string;
  estimate_id?: number | string;
  description?: string;
  customers_id?: number;
  [key: string]: unknown;
}

export interface EstimateCreatePayload {
  customers_id: number | string;
  description?: string;
  notes?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
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
