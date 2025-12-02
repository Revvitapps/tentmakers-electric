import { NextResponse } from 'next/server';
import { getCachedSFToken, getSFToken } from '@/lib/sfClient';

const maskToken = (token: string) => {
  if (!token) return token;
  if (token.length <= 6) return `${token.slice(0, 2)}****`;
  return `${token.slice(0, 8)}****`;
};

export async function GET() {
  try {
    const accessToken = await getSFToken();
    const cached = getCachedSFToken();

    return NextResponse.json({
      accessTokenPreview: maskToken(accessToken),
      expiresAt: cached?.expiresAt ?? null
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to fetch Service Fusion token', details: (error as Error).message },
      { status: 500 }
    );
  }
}
