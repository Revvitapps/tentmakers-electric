import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, validateBookRequest } from '@/lib/validation';
import { runBookingPipeline, toSfDateFromIso } from '@/lib/sfBooking';
import { sendBookingEmail } from '@/lib/email';
import type { BookingPipelineResult } from '@/lib/sfTypes';

const allowOrigin = process.env.CORS_ALLOW_ORIGIN || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export function OPTIONS() {
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = validateBookRequest(body);

    const debugDates = request.nextUrl.searchParams.get('debugDates');
    if (debugDates) {
      return NextResponse.json({
        debug: true,
        rawSchedule: body.schedule,
        startDate: toSfDateFromIso(body.schedule?.start),
        endDateCandidate: toSfDateFromIso(body.schedule?.end ?? body.schedule?.start)
      }, { headers: corsHeaders });
    }

    const paymentPreference =
      typeof payload.service?.options?.paymentPreference === 'string'
        ? payload.service.options.paymentPreference
        : null;
    const shouldCreateSfBooking = paymentPreference === 'deposit';

    const result: BookingPipelineResult = shouldCreateSfBooking
      ? await runBookingPipeline(payload, { includeCalendarTask: false })
      : {
          status: 'ok',
          message: 'Informational request – no Service Fusion booking created',
          customerId: null,
          estimateId: null,
          jobId: null,
          calendarTaskId: null
        };

    try {
      console.info('Email config present:', {
        hasApiKey: Boolean(process.env.SENDGRID_API_KEY),
        hasFrom: Boolean(process.env.EMAIL_FROM),
        hasTo: Boolean(process.env.EMAIL_TO)
      });
      const emailStatus = await sendBookingEmail(payload, result);
      console.info('Booking email status:', emailStatus);
    } catch (emailErr) {
      console.error('Failed to send booking email', emailErr);
    }

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        error: 'Failed to create Service Fusion booking',
        details: (error as Error).message
      },
      { status: 502, headers: corsHeaders }
    );
  }
}
