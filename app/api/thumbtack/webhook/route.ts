import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { runBookingPipeline } from '@/lib/sfBooking';
import type { BookRequest, ThumbtackWebhookEnvelope } from '@/lib/sfTypes';
import {
  getThumbtackSignature,
  parseThumbtackWebhook,
  verifyThumbtackSignature
} from '@/lib/thumbtackClient';
import { isIsoDate } from '@/lib/timeUtils';
import { bookRequestSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  console.log('Thumbtack webhook payload:', rawBody);
  const signature = getThumbtackSignature(request.headers);

  // TODO: Confirm which Thumbtack header is authoritative for signature validation.
  if (!verifyThumbtackSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid Thumbtack signature' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const parsedEnvelope = parseThumbtackWebhook(body);

    const mappedRequest = mapThumbtackToBookRequest(parsedEnvelope);
    const bookRequest = bookRequestSchema.parse(mappedRequest);
    const bookingResult = await runBookingPipeline(bookRequest);

    return NextResponse.json({
      status: 'received',
      forwardedToSF: bookingResult.status === 'ok',
      booking: bookingResult
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid Thumbtack payload structure', details: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to process Thumbtack webhook', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function mapThumbtackToBookRequest(envelope: ThumbtackWebhookEnvelope): BookRequest {
  const data = envelope.data ?? {};
  const lead = (data.lead ?? data) as Record<string, unknown>;
  const contact = (lead.contact ?? lead.customer ?? {}) as Record<string, unknown>;
  const address = (contact.address ?? lead.address ?? {}) as Record<string, unknown>;

  const fullName =
    getString(contact, 'name') ?? getString(lead, 'customerName') ?? getString(lead, 'name') ?? 'Thumbtack Lead';
  const { firstName, lastName } = splitName(fullName);

  const schedule = deriveSchedule(lead);

  return {
    source: 'thumbtack',
    customer: {
      firstName,
      lastName,
      email: getString(contact, 'email') ?? getString(lead, 'email'),
      phone: getString(contact, 'phone') ?? getString(lead, 'phone'),
      addressLine1: getString(address, 'line1') ?? getString(address, 'addressLine1'),
      city: getString(address, 'city'),
      state: getString(address, 'state'),
      postalCode: getString(address, 'postal_code') ?? getString(address, 'zip')
    },
    service: {
      type: getString(lead, 'jobType') ?? getString(lead, 'category') ?? 'thumbtack-lead',
      notes:
        getString(lead, 'description') ??
        getString(lead, 'details') ??
        getString(lead, 'message') ??
        'Thumbtack lead',
      options: {
        thumbtackLeadId: lead.id ?? contact.id,
        raw: lead
      }
    },
    schedule
  };
}

function splitName(value: string) {
  const [first, ...rest] = value.trim().split(/\s+/);
  return {
    firstName: first || 'Thumbtack',
    lastName: rest.join(' ') || 'Lead'
  };
}

function deriveSchedule(lead: Record<string, unknown>): BookRequest['schedule'] {
  const start =
    getString(lead, 'requestedStart') ??
    getString(lead, 'start_time') ??
    getString(lead, 'startDate') ??
    null;
  const end =
    getString(lead, 'requestedEnd') ??
    getString(lead, 'end_time') ??
    getString(lead, 'endDate') ??
    null;

  if (start && end && isIsoDate(start) && isIsoDate(end)) {
    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString()
    };
  }

  return null;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj?.[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
}
