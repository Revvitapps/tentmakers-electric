export interface ServiceFusionConfig {
  clientId: string;
  clientSecret: string;
  apiBase: string;
}

export interface ServiceFusionTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Minimal subset of Service Fusion calendar task.
 * See SF docs for full schema.
 */
export interface CalendarTask {
  id: number | string;
  type?: string;
  description?: string;
  start_date: string;
  end_date: string;
  users_id?: number | string;
  customers_id?: number | string;
  jobs_id?: number | string;
  estimates_id?: number | string;
  is_completed?: boolean;
  [key: string]: unknown;
}

/**
 * API responses often wrap arrays under different keys.
 * This keeps it flexible until we have the exact contract.
 */
export interface CalendarTaskList {
  data?: CalendarTask[];
  results?: CalendarTask[];
  items?: CalendarTask[];
  total?: number;
  [key: string]: unknown;
}

export interface CustomerPayload {
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

export interface CustomerResponse {
  id?: number | string;
  customer_id?: number | string;
  [key: string]: unknown;
}

export interface EstimatePayload {
  customers_id: number | string;
  description?: string;
  notes?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EstimateResponse {
  id?: number | string;
  estimate_id?: number | string;
  [key: string]: unknown;
}

export interface CalendarTaskPayload {
  start_date: string;
  end_date: string;
  description: string;
  customers_id?: number | string;
  jobs_id?: number | string;
  estimates_id?: number | string;
  users_id?: number | string;
  type?: string;
  [key: string]: unknown;
}

export interface ScheduleWindow {
  start: string;
  end: string;
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
  schedule?: ScheduleWindow | null;
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
  data: Record<string, unknown>;
}
