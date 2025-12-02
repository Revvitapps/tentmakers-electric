import type { NextRequest } from 'next/server';
import { handleThumbtackOAuthCallback } from '../handler';

export async function GET(request: NextRequest) {
  return handleThumbtackOAuthCallback(request, 'production');
}
