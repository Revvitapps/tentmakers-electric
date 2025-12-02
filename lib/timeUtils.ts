export const MS_IN_MINUTE = 60_000;
export const WORKDAY_START_HOUR = 8;
export const WORKDAY_END_HOUR = 17;

export interface TimeInterval {
  start: Date;
  end: Date;
}

export function isIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function isIsoDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getWorkingWindow(
  date: string,
  startHour = WORKDAY_START_HOUR,
  endHour = WORKDAY_END_HOUR
): TimeInterval {
  const start = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`);
  const end = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`);
  return { start, end };
}

// Alias for older naming in specs.
export const buildWorkingWindow = getWorkingWindow;

export function clampInterval(interval: TimeInterval, bounds: TimeInterval): TimeInterval | null {
  const start = interval.start < bounds.start ? bounds.start : interval.start;
  const end = interval.end > bounds.end ? bounds.end : interval.end;
  if (end <= start) {
    return null;
  }
  return { start: new Date(start), end: new Date(end) };
}

export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: TimeInterval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
      continue;
    }

    if (interval.start <= last.end) {
      // Overlapping or adjacent
      last.end = new Date(Math.max(last.end.getTime(), interval.end.getTime()));
    } else {
      merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
    }
  }

  return merged;
}

export function subtractBusyFromWorking(
  workingWindow: TimeInterval,
  busyIntervals: TimeInterval[]
): TimeInterval[] {
  const clampedBusy = busyIntervals
    .map((interval) => clampInterval(interval, workingWindow))
    .filter((value): value is TimeInterval => Boolean(value));

  const mergedBusy = mergeIntervals(clampedBusy);
  const free: TimeInterval[] = [];
  let cursor = new Date(workingWindow.start);

  for (const busy of mergedBusy) {
    if (busy.start > cursor) {
      free.push({ start: new Date(cursor), end: new Date(busy.start) });
    }
    if (busy.end > cursor) {
      cursor = new Date(busy.end);
    }
  }

  if (cursor < workingWindow.end) {
    free.push({ start: new Date(cursor), end: new Date(workingWindow.end) });
  }

  return free;
}

export function generateSlots(
  freeWindows: TimeInterval[],
  durationMinutes: number
): TimeInterval[] {
  if (durationMinutes <= 0) return [];

  const minDurationMs = durationMinutes * MS_IN_MINUTE;
  return freeWindows.filter(
    (window) => window.end.getTime() - window.start.getTime() >= minDurationMs
  );
}

export function findAvailability(
  date: string,
  busyIntervals: TimeInterval[],
  durationMinutes: number
): TimeInterval[] {
  const working = getWorkingWindow(date);
  const free = subtractBusyFromWorking(working, busyIntervals);
  return generateSlots(free, durationMinutes);
}
