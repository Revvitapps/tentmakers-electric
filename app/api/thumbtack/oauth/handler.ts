import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeThumbtackAuthorizationCode,
  getThumbtackRedirectUri,
  type ThumbtackOAuthEnvironment
} from '@/lib/thumbtackOAuth';

export async function handleThumbtackOAuthCallback(
  request: NextRequest,
  environment: ThumbtackOAuthEnvironment
) {
  const params = request.nextUrl.searchParams;
  const error = params.get('error');

  if (error) {
    return NextResponse.json(
      {
        error: 'Thumbtack authorization failed',
        code: error,
        description: params.get('error_description') ?? null,
        environment
      },
      { status: 400 }
    );
  }

  const code = params.get('code');
  if (!code) {
    return NextResponse.json(
      { error: 'Missing code parameter from Thumbtack', environment },
      { status: 400 }
    );
  }

  try {
    const redirectUri = getThumbtackRedirectUri(environment);
    const tokens = await exchangeThumbtackAuthorizationCode({ code, redirectUri });

    return NextResponse.json({
      status: 'ok',
      environment,
      message: 'Thumbtack OAuth successful. Store these tokens securely.',
      tokens,
      state: params.get('state')
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to exchange Thumbtack authorization code',
        environment,
        details: (err as Error).message
      },
      { status: 500 }
    );
  }
}
