import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, validateBookRequest } from '@/lib/validation';
import { runBookingPipeline, toSfDateFromIso } from '@/lib/sfBooking';

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

    const result = await runBookingPipeline(payload);
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
