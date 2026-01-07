import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ValidationError, validateBookRequest } from '@/lib/validation';
import { runBookingPipeline } from '@/lib/sfBooking';
import { sendBookingEmail } from '@/lib/email';

type StoredPayload = {
  payload: ReturnType<typeof validateBookRequest>;
  photoRefs?: Array<{ url: string; name: string; type?: string }>;
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
  : null;

async function fetchPhotoAsDataUrl(ref: { url: string; type?: string }) {
  const res = await fetch(ref.url);
  if (!res.ok) {
    throw new Error(`Failed to fetch photo blob (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = ref.type || res.headers.get('content-type') || 'image/jpeg';
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !webhookSecret) {
      throw new Error('Stripe webhook configuration is missing');
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const payloadUrl = session.metadata?.payloadUrl;
    if (!payloadUrl) {
      throw new Error('Missing payload URL in Stripe session metadata');
    }

    const payloadRes = await fetch(payloadUrl);
    if (!payloadRes.ok) {
      throw new Error(`Unable to read stored payload (${payloadRes.status})`);
    }
    const stored = (await payloadRes.json()) as StoredPayload;
    const payload = stored.payload;
    const options = (payload.service.options ?? {}) as Record<string, unknown>;
    const photoRefs = stored.photoRefs ?? [];

    let photos: Array<{ name: string; type?: string; dataUrl: string }> = [];
    if (photoRefs.length) {
      photos = await Promise.all(
        photoRefs.map(async (ref) => ({
          name: ref.name,
          type: ref.type,
          dataUrl: await fetchPhotoAsDataUrl(ref)
        }))
      );
    }

    const enrichedPayload = validateBookRequest({
      ...payload,
      service: {
        ...payload.service,
        options: {
          ...options,
          photos: photos.length ? photos : undefined,
          depositPaid: true,
          estimateStatus: 'Estimate Won'
        }
      }
    });

    const result = await runBookingPipeline(enrichedPayload);

    try {
      await sendBookingEmail(enrichedPayload, result);
    } catch (emailErr) {
      console.error('Failed to send booking email', emailErr);
    }

    return NextResponse.json({ received: true, status: result.status });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Stripe webhook failed',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
