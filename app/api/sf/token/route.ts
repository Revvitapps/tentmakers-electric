import { NextResponse } from 'next/server';
import { getCachedSFToken, getSFToken } from '@/lib/sfClient';

const maskToken = (token: string) => {
  if (!token) {
    return token;
  }

  if (token.length <= 8) {
    return token;
  }

  return `${token.slice(0, 8)}…`;
};

export async function GET() {
  try {
    const accessToken = await getSFToken();
    const cached = getCachedSFToken();

    return NextResponse.json({
      accessToken: maskToken(accessToken),
      expiresAt: cached?.expiresAt ?? null,
      hasRefreshToken: Boolean(cached?.refreshToken)
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to fetch Service Fusion token', details: (error as Error).message },
      { status: 500 }
    );
  }
}
