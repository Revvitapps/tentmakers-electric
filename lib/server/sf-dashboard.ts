import { sfFetch } from "@/lib/sfClient";

type AnyRecord = Record<string, unknown>;

type SfListPayload = {
  items?: unknown;
  data?: unknown;
  results?: unknown;
  _meta?: AnyRecord;
  meta?: AnyRecord;
  pagination?: AnyRecord;
};

export type SfDashboardData = {
  generatedAt: string;
  range: {
    start: string;
    end: string;
  };
  totals: {
    estimates: number;
    acceptedEstimates: number;
    estimateAcceptanceRate: number;
    jobs: number;
    completedJobs: number;
    projectedRevenue: number;
    bookedRevenue: number;
  };
  sourceRows: Array<{
    source: string;
    jobs: number;
    estimates: number;
    revenue: number;
    shareOfBookedRevenue: number;
  }>;
  ownerRows: Array<{
    owner: string;
    estimates: number;
    jobs: number;
    projectedRevenue: number;
    bookedRevenue: number;
  }>;
  topCustomers: Array<{
    customer: string;
    jobs: number;
    revenue: number;
  }>;
  recentJobs: Array<{
    id: string;
    customer: string;
    status: string;
    source: string;
    amount: number;
    date: string;
  }>;
};

const DEFAULT_PAGE_SIZE = 200;
const DEFAULT_MAX_PAGES = 8;

export async function getSfDashboardData(range?: { start?: string; end?: string }): Promise<SfDashboardData> {
  const today = new Date();
  const start = range?.start ?? `${today.getUTCFullYear()}-01-01`;
  const end = range?.end ?? today.toISOString().slice(0, 10);

  const [estimatesRaw, jobsRaw] = await Promise.all([
    fetchCollection("estimates"),
    fetchCollection("jobs"),
  ]);

  const estimates = estimatesRaw.filter((item) => isInRange(extractDate(item), start, end));
  const jobs = jobsRaw.filter((item) => isInRange(extractDate(item), start, end));

  const acceptedEstimates = estimates.filter((item) => isAcceptedEstimateStatus(extractStatus(item))).length;
  const completedJobs = jobs.filter((item) => isCompletedJobStatus(extractStatus(item))).length;

  const projectedRevenue = round2(sumBy(estimates, (item) => extractAmount(item)));
  const bookedRevenue = round2(sumBy(jobs, (item) => extractAmount(item)));

  const totals = {
    estimates: estimates.length,
    acceptedEstimates,
    estimateAcceptanceRate: estimates.length ? round1((acceptedEstimates / estimates.length) * 100) : 0,
    jobs: jobs.length,
    completedJobs,
    projectedRevenue,
    bookedRevenue,
  };

  const sourceMap = new Map<string, { source: string; jobs: number; estimates: number; revenue: number }>();

  for (const job of jobs) {
    const source = extractSource(job);
    const row = sourceMap.get(source) ?? { source, jobs: 0, estimates: 0, revenue: 0 };
    row.jobs += 1;
    row.revenue += extractAmount(job);
    sourceMap.set(source, row);
  }

  for (const estimate of estimates) {
    const source = extractSource(estimate);
    const row = sourceMap.get(source) ?? { source, jobs: 0, estimates: 0, revenue: 0 };
    row.estimates += 1;
    sourceMap.set(source, row);
  }

  const sourceRows = [...sourceMap.values()]
    .map((row) => ({
      source: row.source,
      jobs: row.jobs,
      estimates: row.estimates,
      revenue: round2(row.revenue),
      shareOfBookedRevenue: bookedRevenue ? round1((row.revenue / bookedRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const ownerMap = new Map<string, { owner: string; estimates: number; jobs: number; projectedRevenue: number; bookedRevenue: number }>();

  for (const estimate of estimates) {
    const owner = extractOwner(estimate);
    const row = ownerMap.get(owner) ?? { owner, estimates: 0, jobs: 0, projectedRevenue: 0, bookedRevenue: 0 };
    row.estimates += 1;
    row.projectedRevenue += extractAmount(estimate);
    ownerMap.set(owner, row);
  }

  for (const job of jobs) {
    const owner = extractOwner(job);
    const row = ownerMap.get(owner) ?? { owner, estimates: 0, jobs: 0, projectedRevenue: 0, bookedRevenue: 0 };
    row.jobs += 1;
    row.bookedRevenue += extractAmount(job);
    ownerMap.set(owner, row);
  }

  const ownerRows = [...ownerMap.values()]
    .map((row) => ({
      ...row,
      projectedRevenue: round2(row.projectedRevenue),
      bookedRevenue: round2(row.bookedRevenue),
    }))
    .sort((a, b) => b.bookedRevenue - a.bookedRevenue);

  const customerMap = new Map<string, { customer: string; jobs: number; revenue: number }>();
  for (const job of jobs) {
    const customer = extractCustomer(job);
    const row = customerMap.get(customer) ?? { customer, jobs: 0, revenue: 0 };
    row.jobs += 1;
    row.revenue += extractAmount(job);
    customerMap.set(customer, row);
  }

  const topCustomers = [...customerMap.values()]
    .map((row) => ({ customer: row.customer, jobs: row.jobs, revenue: round2(row.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  const recentJobs = jobs
    .map((job) => ({
      id: extractId(job),
      customer: extractCustomer(job),
      status: extractStatus(job),
      source: extractSource(job),
      amount: round2(extractAmount(job)),
      date: extractDate(job) ?? "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  return {
    generatedAt: new Date().toISOString(),
    range: { start, end },
    totals,
    sourceRows,
    ownerRows,
    topCustomers,
    recentJobs,
  };
}

async function fetchCollection(path: string): Promise<AnyRecord[]> {
  const firstPage = await fetchPage(path, 1);
  const items = [...firstPage.items];
  const totalPages = Math.min(firstPage.pageCount ?? 1, DEFAULT_MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await fetchPage(path, page, firstPage.paramMode);
    items.push(...nextPage.items);
  }

  return items;
}

async function fetchPage(
  path: string,
  page: number,
  forcedMode?: "snake" | "dash" | "none"
): Promise<{ items: AnyRecord[]; pageCount?: number; paramMode: "snake" | "dash" | "none" }> {
  const modes: Array<"snake" | "dash" | "none"> = forcedMode ? [forcedMode] : ["snake", "dash", "none"];
  let lastError: unknown;

  for (const mode of modes) {
    try {
      const query =
        mode === "snake"
          ? { page, per_page: DEFAULT_PAGE_SIZE }
          : mode === "dash"
            ? { page, "per-page": DEFAULT_PAGE_SIZE }
            : undefined;

      const payload = await sfFetch<AnyRecord[] | SfListPayload>(path, {
        method: "GET",
        query,
      });

      const parsed = parseCollectionPayload(payload);
      return {
        items: parsed.items,
        pageCount: parsed.pageCount,
        paramMode: mode,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch Service Fusion collection: ${path}`);
}

function parseCollectionPayload(payload: unknown): { items: AnyRecord[]; pageCount?: number } {
  if (Array.isArray(payload)) {
    return { items: payload.filter(isRecord) as AnyRecord[] };
  }

  if (!isRecord(payload)) {
    return { items: [] };
  }

  const listPayload = payload as SfListPayload;
  const list = listPayload.items ?? listPayload.data ?? listPayload.results ?? [];
  const items = Array.isArray(list) ? (list.filter(isRecord) as AnyRecord[]) : [];

  const meta = (isRecord(listPayload._meta) ? listPayload._meta : null)
    ?? (isRecord(listPayload.meta) ? listPayload.meta : null)
    ?? (isRecord(listPayload.pagination) ? listPayload.pagination : null);

  const pageCount = meta ? toNumber(meta.pageCount ?? meta.page_count ?? meta.total_pages) : undefined;

  return {
    items,
    pageCount: Number.isFinite(pageCount) && pageCount > 0 ? Math.floor(pageCount) : undefined,
  };
}

function extractId(record: AnyRecord): string {
  const value = firstValue(record, ["id", "job_id", "estimate_id"]);
  return value === null ? "" : String(value);
}

function extractCustomer(record: AnyRecord): string {
  const value =
    firstValue(record, ["customer_name", "customer", "name", "customerName"])
    ?? getNestedValue(record, ["customer", "customer_name"])
    ?? getNestedValue(record, ["customer", "name"]);

  const text = toText(value);
  return text || "Unknown";
}

function extractSource(record: AnyRecord): string {
  const value = firstValue(record, ["source", "referral_source", "lead_source", "leadSource"]);
  const text = toText(value);
  return text || "Unattributed";
}

function extractOwner(record: AnyRecord): string {
  const value =
    firstValue(record, ["owner_name", "owner", "ownerName", "sales_rep", "assigned_to", "created_by", "user_name"])
    ?? getNestedValue(record, ["owner", "name"])
    ?? getNestedValue(record, ["assigned_user", "name"]);

  const text = toText(value);
  return text || "Unassigned";
}

function extractStatus(record: AnyRecord): string {
  const value = firstValue(record, ["status", "job_status", "estimate_status", "state"]);
  return toText(value) || "Unknown";
}

function extractDate(record: AnyRecord): string | null {
  const value = firstValue(record, [
    "job_date",
    "start_date",
    "date",
    "created_at",
    "requested_on",
    "requestedOn",
    "updated_at",
  ]);
  const text = toText(value);
  if (!text) return null;

  const isoDateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (isoDateMatch) return isoDateMatch[0];

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function extractAmount(record: AnyRecord): number {
  const direct = firstNumber(record, [
    "total",
    "grand_total",
    "amount",
    "job_total",
    "invoice_total",
    "payments_total",
    "subtotal",
    "revenue",
    "projected_revenue",
  ]);

  if (direct !== null) {
    return direct;
  }

  const products = firstNumber(record, ["products", "product_total"]) ?? 0;
  const services = firstNumber(record, ["services", "service_total"]) ?? 0;
  const labor = firstNumber(record, ["labor", "labor_total"]) ?? 0;
  const expenses = firstNumber(record, ["expenses", "expense_total"]) ?? 0;
  const combined = products + services + labor + expenses;

  return combined > 0 ? combined : 0;
}

function isAcceptedEstimateStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return ["accepted", "approved", "won", "converted", "closed won"].some((needle) => normalized.includes(needle));
}

function isCompletedJobStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return ["completed", "invoiced", "closed", "done"].some((needle) => normalized.includes(needle));
}

function isInRange(date: string | null, start: string, end: string): boolean {
  if (!date) return true;
  return date >= start && date <= end;
}

function sumBy<T>(rows: T[], getter: (row: T) => number): number {
  let total = 0;
  for (const row of rows) {
    total += getter(row);
  }
  return total;
}

function firstValue(record: AnyRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return null;
}

function firstNumber(record: AnyRecord, keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in record)) continue;
    const num = toNumber(record[key]);
    if (num !== null) return num;
  }
  return null;
}

function getNestedValue(record: AnyRecord, path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return current;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}
