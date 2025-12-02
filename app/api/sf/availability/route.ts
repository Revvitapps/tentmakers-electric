import { NextRequest, NextResponse } from 'next/server';
import type { CalendarTask, CalendarTaskList } from '@/lib/sfTypes';
import { sfFetch } from '@/lib/sfClient';
import { validateAvailabilityQuery, ValidationError } from '@/lib/validation';
import { findAvailability, TimeInterval } from '@/lib/timeUtils';

const CALENDAR_TASKS_ENDPOINT = 'calendar-tasks';

export async function GET(request: NextRequest) {
  try {
    const query = validateAvailabilityQuery({
      date: request.nextUrl.searchParams.get('date'),
      durationMinutes: request.nextUrl.searchParams.get('durationMinutes') ?? undefined
    });

    const calendarQuery = buildCalendarQuery(query.date);

    const raw = await sfFetch<CalendarTaskList | CalendarTask[]>(CALENDAR_TASKS_ENDPOINT, {
      query: calendarQuery
    });

    const tasks = normalizeTasks(raw);

    const busyIntervals = tasks
      .map(taskToInterval)
      .filter((interval): interval is TimeInterval => Boolean(interval));

    const slots = findAvailability(query.date, busyIntervals, query.durationMinutes).map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString()
    }));

    return NextResponse.json({
      date: query.date,
      durationMinutes: query.durationMinutes,
      slots
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to compute availability', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function buildCalendarQuery(date: string) {
  return {
    limit: '200',
    'filters[start_date][from]': `${date} 00:00:00`,
    'filters[start_date][to]': `${date} 23:59:59`
    // TODO: refine filters for overlapping tasks and technician assignment once SF contract is confirmed.
  };
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
