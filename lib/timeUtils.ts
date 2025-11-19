export const DEFAULT_TOKEN_SKEW_SECONDS = 90;
export const MS_IN_MINUTE = 60_000;
export const WORKDAY_START_HOUR = 8;
export const WORKDAY_END_HOUR = 17;

export interface TimeInterval {
  start: Date;
  end: Date;
}

export const nowMs = () => Date.now();

export function computeExpiryTimestamp(
  expiresInSeconds: number,
  skewSeconds: number = DEFAULT_TOKEN_SKEW_SECONDS
): number {
  const safeSeconds = Math.max(expiresInSeconds - skewSeconds, 0);
  return nowMs() + safeSeconds * 1000;
}

export function isExpired(timestampMs: number | undefined | null): boolean {
  if (!timestampMs) {
    return true;
  }

  return nowMs() >= timestampMs;
}

export function isIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function isIsoDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function ensureIsoDate(value: string, field: string): string {
  if (!isIsoDate(value)) {
    throw new Error(`Expected ${field} to be a valid ISO-8601 datetime string`);
  }

  return value;
}

export function toDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return date;
}

export function createDateAtTime(date: string, hour: number, minute = 0): Date {
  const normalized = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0'
  )}:00`;
  return new Date(normalized);
}

export function getWorkdayInterval(
  date: string,
  startHour = WORKDAY_START_HOUR,
  endHour = WORKDAY_END_HOUR
): TimeInterval {
  const start = createDateAtTime(date, startHour);
  const end = createDateAtTime(date, endHour);
  return { start, end };
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function clampInterval(interval: TimeInterval, bounds: TimeInterval): TimeInterval | null {
  const start = interval.start < bounds.start ? bounds.start : interval.start;
  const end = interval.end > bounds.end ? bounds.end : interval.end;
  if (end <= start) {
    return null;
  }
  return { start: new Date(start), end: new Date(end) };
}

export function sortIntervals(intervals: TimeInterval[]): TimeInterval[] {
  return [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function generateAvailabilitySlots(
  workWindow: TimeInterval,
  busyIntervals: TimeInterval[],
  durationMinutes: number
): TimeInterval[] {
  if (durationMinutes <= 0) {
    return [];
  }

  const minDurationMs = durationMinutes * MS_IN_MINUTE;
  const sortedBusy = sortIntervals(busyIntervals);
  const slots: TimeInterval[] = [];
  let cursor = new Date(workWindow.start);

  for (const interval of sortedBusy) {
    if (interval.end <= cursor) {
      continue;
    }

    if (interval.start > cursor) {
      const gap = interval.start.getTime() - cursor.getTime();
      if (gap >= minDurationMs) {
        slots.push({
          start: new Date(cursor),
          end: new Date(interval.start)
        });
      }
    }

    if (interval.end > cursor) {
      cursor = new Date(interval.end);
    }

    if (cursor >= workWindow.end) {
      break;
    }
  }

  if (workWindow.end.getTime() - cursor.getTime() >= minDurationMs) {
    slots.push({
      start: new Date(cursor),
      end: new Date(workWindow.end)
    });
  }

  return slots;
}
