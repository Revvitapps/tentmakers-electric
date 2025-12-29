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
    console.log('[thumbtack-oauth] environment', environment);
    console.log('[thumbtack-oauth] redirectUri', redirectUri);
    console.log('[thumbtack-oauth] tokenUrl', process.env.THUMBTACK_TOKEN_URL_STAGING && environment === 'staging' ? process.env.THUMBTACK_TOKEN_URL_STAGING : process.env.THUMBTACK_TOKEN_URL);
    console.log('[thumbtack-oauth] clientId', environment === 'staging' ? process.env.THUMBTACK_CLIENT_ID_STAGING : process.env.THUMBTACK_CLIENT_ID);
    const tokens = await exchangeThumbtackAuthorizationCode({
      code,
      redirectUri,
      environment
    });

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
