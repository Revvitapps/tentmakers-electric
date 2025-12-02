import crypto from 'node:crypto';
import type { ThumbtackWebhookEnvelope } from './sfTypes';
import { getThumbtackConfig, ValidationError } from './validation';

const SIGNATURE_HEADER_CANDIDATES = ['x-thumbtack-signature', 'thumbtack-signature'];

export function getThumbtackSignature(reqHeaders: Headers): string | null {
  for (const header of SIGNATURE_HEADER_CANDIDATES) {
    const value = reqHeaders.get(header);
    if (value) {
      return value;
    }
  }
  return null;
}

export function verifyThumbtackSignature(payload: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }

  const { THUMBTACK_WEBHOOK_SECRET } = getThumbtackConfig();
  const normalizedSignature = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  const digest = crypto.createHmac('sha256', THUMBTACK_WEBHOOK_SECRET).update(payload).digest('hex');

  const expected = Buffer.from(digest, 'hex');
  let received: Buffer;

  try {
    received = Buffer.from(normalizedSignature, 'hex');
  } catch {
    received = Buffer.from(normalizedSignature, 'utf8');
  }

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

export function parseThumbtackWebhook(body: unknown): ThumbtackWebhookEnvelope {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Thumbtack webhook payload must be an object');
  }

  const envelope = body as Record<string, unknown>;
  const data = envelope.data;

  if (!data || typeof data !== 'object') {
    throw new ValidationError('Thumbtack webhook payload missing data');
  }

  return {
    event: typeof envelope.event === 'string' ? envelope.event : undefined,
    data: data as Record<string, unknown>
  };
}
