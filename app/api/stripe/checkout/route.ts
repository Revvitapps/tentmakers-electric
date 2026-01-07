import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { put } from '@vercel/blob';
import { ValidationError, validateBookRequest } from '@/lib/validation';

type PhotoInput = {
  name?: string;
  type?: string;
  dataUrl?: string;
};

type StoredPayload = {
  payload: ReturnType<typeof validateBookRequest>;
  photoRefs: Array<{ url: string; name: string; type?: string }>;
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_EV_DEPOSIT_PRICE_ID;
const successUrl = process.env.STRIPE_SUCCESS_URL;
const cancelUrl = process.env.STRIPE_CANCEL_URL;

const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2025-12-15.clover' })
  : null;

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, type, base64] = match;
  return { buffer: Buffer.from(base64, 'base64'), type };
}

function sanitizeFilename(name: string, fallback: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned || fallback;
}

async function uploadPhotos(bookingId: string, photos: PhotoInput[]) {
  const stored: Array<{ url: string; name: string; type?: string }> = [];
  const slice = photos.slice(0, 4);

  for (let i = 0; i < slice.length; i += 1) {
    const photo = slice[i];
    if (!photo?.dataUrl) continue;
    const parsed = dataUrlToBuffer(photo.dataUrl);
    if (!parsed) continue;
    const fallback = `photo-${i + 1}`;
    const filename = sanitizeFilename(photo.name || fallback, fallback);
    const blob = await put(`ev-charger/${bookingId}/${filename}`, parsed.buffer, {
      access: 'public',
      contentType: photo.type || parsed.type
    });
    stored.push({ url: blob.url, name: filename, type: photo.type || parsed.type });
  }

  return stored;
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !priceId || !successUrl || !cancelUrl) {
      throw new Error('Stripe configuration is missing');
    }

    const body = await request.json();
    const payload = validateBookRequest(body);
    const options = (payload.service.options ?? {}) as Record<string, unknown>;
    const photos = Array.isArray(options.photos) ? (options.photos as PhotoInput[]) : [];

    const bookingId = crypto.randomUUID();
    const photoRefs = await uploadPhotos(bookingId, photos);

    const storedPayload: StoredPayload = {
      payload: {
        ...payload,
        service: {
          ...payload.service,
          options: {
            ...options,
            photos: undefined,
            photoRefs
          }
        }
      },
      photoRefs
    };

    const payloadBlob = await put(
      `ev-charger/${bookingId}/payload.json`,
      JSON.stringify(storedPayload),
      {
        access: 'public',
        contentType: 'application/json'
      }
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: bookingId,
      customer_email: payload.customer.email ?? undefined,
      metadata: {
        bookingId,
        payloadUrl: payloadBlob.url
      }
    });

    if (!session.url) {
      throw new Error('Stripe session did not return a URL');
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Unable to start Stripe Checkout',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
