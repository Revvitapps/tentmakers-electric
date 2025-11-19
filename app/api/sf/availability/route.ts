import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { CalendarTask, CalendarTaskList } from '@/lib/sfTypes';
import { sfFetch } from '@/lib/sfClient';
import { availabilityQuerySchema, ValidationError } from '@/lib/validation';
import { clampInterval, generateAvailabilitySlots, getWorkdayInterval, TimeInterval } from '@/lib/timeUtils';

const CALENDAR_TASKS_ENDPOINT = 'calendar-tasks';

export async function GET(request: NextRequest) {
  try {
    const query = availabilityQuerySchema.parse({
      date: request.nextUrl.searchParams.get('date'),
      durationMinutes: request.nextUrl.searchParams.get('durationMinutes') ?? undefined,
      techId: request.nextUrl.searchParams.get('techId') ?? undefined
    });

    const workWindow = getWorkdayInterval(query.date);
    const calendarQuery = buildCalendarQuery(query.date, query.techId);

    const raw = await sfFetch<CalendarTaskList | CalendarTask[]>(CALENDAR_TASKS_ENDPOINT, {
      query: calendarQuery
    });

    const tasks = normalizeTasks(raw);
    const filteredTasks =
      query.techId !== undefined && query.techId.trim().length > 0
        ? tasks.filter((task) => String(task.users_id ?? '') === query.techId)
        : tasks;

    const busyIntervals = filteredTasks
      .map(taskToInterval)
      .filter((interval): interval is TimeInterval => Boolean(interval))
      .map((interval) => clampInterval(interval, workWindow))
      .filter((interval): interval is TimeInterval => Boolean(interval));

    const slots = generateAvailabilitySlots(workWindow, busyIntervals, query.durationMinutes).map(
      (slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString()
      })
    );

    return NextResponse.json({
      date: query.date,
      durationMinutes: query.durationMinutes,
      slots
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to compute availability', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function buildCalendarQuery(date: string, techId?: string | null) {
  const filters: Record<string, string> = {
    limit: '200',
    'filters[start_date][from]': `${date} 00:00:00`,
    'filters[start_date][to]': `${date} 23:59:59`
  };

  if (techId) {
    // TODO: confirm the correct filter key with Service Fusion docs.
    filters['filters[users_id]'] = techId;
  }

  // TODO: include overlapping tasks that start before this date once we confirm SF filter options.
  return filters;
}

function normalizeTasks(input: CalendarTaskList | CalendarTask[]): CalendarTask[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (Array.isArray(input.data)) {
    return input.data;
  }

  if (Array.isArray(input.results)) {
    return input.results;
  }

  if (Array.isArray(input.items)) {
    return input.items;
  }

  return [];
}

function taskToInterval(task: CalendarTask): TimeInterval | null {
  if (!task.start_date || !task.end_date) {
    return null;
  }

  const interval: TimeInterval = {
    start: new Date(task.start_date),
    end: new Date(task.end_date)
  };

  if (Number.isNaN(interval.start.getTime()) || Number.isNaN(interval.end.getTime())) {
    return null;
  }

  if (interval.end <= interval.start) {
    return null;
  }

  return interval;
}
