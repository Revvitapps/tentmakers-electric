import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { put } from '@vercel/blob';
import { ValidationError, validateBookRequest } from '@/lib/validation';

type StoredPayload = {
  payload: ReturnType<typeof validateBookRequest>;
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_EV_DEPOSIT_PRICE_ID;
const successUrl = process.env.STRIPE_SUCCESS_URL ?? 'https://evcharger.tentmakerselectric.com/evcharger/complete';
const cancelUrl = process.env.STRIPE_CANCEL_URL;

const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2025-12-15.clover' })
  : null;

function appendParams(base: string, params: Record<string, string>) {
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${new URLSearchParams(params).toString()}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !priceId || !successUrl || !cancelUrl) {
      throw new Error('Stripe configuration is missing');
    }

    const body = await request.json();
    const bookingId = crypto.randomUUID();
    const payload = validateBookRequest(body);
    const storedPayload: StoredPayload = { payload };

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
      success_url: appendParams(successUrl, {
        session_id: '{CHECKOUT_SESSION_ID}',
        booking_id: bookingId
      }),
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
