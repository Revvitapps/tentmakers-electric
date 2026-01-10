import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ detail: 'lead-progress disabled' }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ detail: 'lead-progress disabled' }, { status: 404 });
}
