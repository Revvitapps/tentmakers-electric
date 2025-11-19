import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { bookRequestSchema, ValidationError } from '@/lib/validation';
import type { BookRequest } from '@/lib/sfTypes';
import { runBookingPipeline } from '@/lib/sfBooking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = bookRequestSchema.parse(body);

    const result = await runBookingPipeline(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (error instanceof ZodError || error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Failed to create Service Fusion booking',
        details: (error as Error).message
      },
      { status: 502 }
    );
  }
}
