import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { validateBookRequest } from '@/lib/validation';
import { sendBookingEmail } from '@/lib/email';
import type { BookRequest, BookingPipelineResult } from '@/lib/sfTypes';

type PhotoInput = {
  name?: string;
  type?: string;
  dataUrl: string;
};

type StoredPhotoRef = {
  url: string;
  name: string;
  type?: string;
};

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; type?: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, type, base64] = match;
  return { buffer: Buffer.from(base64, 'base64'), type };
}

function sanitizeFilename(name: string, fallback: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned || fallback;
}

async function storePhotos(bookingId: string, photos: PhotoInput[]): Promise<StoredPhotoRef[]> {
  const stored: StoredPhotoRef[] = [];
  const slice = photos.slice(0, 4);
  for (let i = 0; i < slice.length; i += 1) {
    const photo = slice[i];
    const parsed = dataUrlToBuffer(photo.dataUrl);
    if (!parsed) continue;
    const fallback = `photo-${i + 1}`;
    const filename = sanitizeFilename(photo.name || fallback, fallback);
    const blob = await put(`ev-charger/photos/${bookingId}/${filename}`, parsed.buffer, {
      access: 'public',
      contentType: photo.type || parsed.type
    });
    stored.push({ url: blob.url, name: filename, type: photo.type || parsed.type });
  }
  return stored;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, result, photos } = body as {
      payload: BookRequest;
      result: BookingPipelineResult;
      photos: PhotoInput[];
    };

    if (!payload || !result) {
      return NextResponse.json({ error: 'Missing payload or booking result' }, { status: 400 });
    }

    const validatedPayload = validateBookRequest(payload);
    const bookingId = crypto.randomUUID();
    const storedPhotos = await storePhotos(bookingId, Array.isArray(photos) ? photos : []);

    const payloadWithPhotos: BookRequest = {
      ...validatedPayload,
      service: {
        ...validatedPayload.service,
        options: {
          ...(validatedPayload.service.options ?? {}),
          photos: photos?.length ? photos : undefined,
          photoRefs: storedPhotos.length ? storedPhotos : undefined
        }
      }
    };

    await sendBookingEmail(payloadWithPhotos, result);

    return NextResponse.json({ ok: true, stored: storedPhotos });
  } catch (error) {
    console.error('Failed to send photo upload email', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
