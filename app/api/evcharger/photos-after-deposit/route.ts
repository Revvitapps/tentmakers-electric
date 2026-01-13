import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { validateBookRequest } from '@/lib/validation';
import { sendPhotoUploadEmail } from '@/lib/email';

type PhotoInput = {
  name?: string;
  type?: string;
  dataUrl?: string;
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2025-12-15.clover' })
  : null;

async function fetchStoredPayload(payloadUrl: string) {
  const res = await fetch(payloadUrl);
  if (!res.ok) {
    throw new Error(`Unable to fetch stored payload (${res.status})`);
  }
  const payload = (await res.json()) as ReturnType<typeof validateBookRequest>;
  return validateBookRequest(payload);
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured for this environment');
    }

    const body = await request.json();
    const sessionId = String(body.sessionId ?? '').trim();
    const bookingId = String(body.bookingId ?? '').trim();
    const photos = Array.isArray(body.photos) ? (body.photos as PhotoInput[]) : [];

    if (!sessionId || !bookingId) {
      return NextResponse.json({ error: 'Missing session_id or booking_id' }, { status: 400 });
    }

    if (!photos.length) {
      return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.bookingId !== bookingId) {
      return NextResponse.json({ error: 'Booking mismatch' }, { status: 400 });
    }

    const payloadUrl = session.metadata?.payloadUrl;
    if (!payloadUrl) {
      throw new Error('Stored payload URL missing from Stripe metadata');
    }

    const payload = await fetchStoredPayload(payloadUrl);
    const filteredPhotos = photos
      .slice(0, 4)
      .filter((photo): photo is PhotoInput => Boolean(photo?.dataUrl));

    if (!filteredPhotos.length) {
      return NextResponse.json({ error: 'No valid photos provided' }, { status: 400 });
    }

    await sendPhotoUploadEmail(payload, bookingId, filteredPhotos);

    return NextResponse.json({ status: 'queued' });
  } catch (error) {
    console.error('photo-after-deposit failed', error);
    return NextResponse.json(
      { error: (error as Error).message ?? 'Failed to handle photo upload' },
      { status: 500 }
    );
  }
}
