import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, validateBookRequest } from '@/lib/validation';
import { captureLead } from '@/lib/sfBooking';

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
    const stage =
      typeof body?.stage === 'string' && body.stage.trim().length > 0
        ? body.stage.trim()
        : 'Lead - Partial';

    const payload = validateBookRequest(body);

    const result = await captureLead(
      {
        ...payload,
        service: {
          ...payload.service,
          options: {
            ...payload.service.options,
            estimateStatus: stage
          }
        }
      },
      { stageLabel: stage, createCalendarTask: false }
    );

    return NextResponse.json({ status: 'ok', stage, result }, { headers: corsHeaders });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        error: 'Failed to capture lead progress',
        details: (error as Error).message
      },
      { status: 502, headers: corsHeaders }
    );
  }
}
