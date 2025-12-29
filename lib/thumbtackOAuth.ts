import type { ThumbtackTokenResponse } from './sfTypes';
import { getThumbtackConfig } from './validation';

export type ThumbtackOAuthEnvironment = 'production' | 'staging';

const DEFAULT_REDIRECTS: Record<ThumbtackOAuthEnvironment, string> = {
  production: 'https://tentmakers-electric.vercel.app/api/thumbtack/oauth/callback',
  staging: 'https://tentmakers-electric.vercel.app/api/thumbtack/oauth/callback-staging'
};

const DEFAULT_TOKEN_URL = 'https://auth.thumbtack.com/oauth2/token';

function getTokenUrl() {
  return process.env.THUMBTACK_TOKEN_URL ?? DEFAULT_TOKEN_URL;
}

function getThumbtackCredentials(environment: ThumbtackOAuthEnvironment) {
  const config = getThumbtackConfig();
  if (environment === 'staging') {
    const clientId = config.THUMBTACK_CLIENT_ID_STAGING ?? config.THUMBTACK_CLIENT_ID;
    const clientSecret =
      config.THUMBTACK_CLIENT_SECRET_STAGING ?? config.THUMBTACK_CLIENT_SECRET;
    if (!config.THUMBTACK_CLIENT_ID_STAGING || !config.THUMBTACK_CLIENT_SECRET_STAGING) {
      console.warn(
        'THUMBTACK_CLIENT_ID_STAGING/THUMBTACK_CLIENT_SECRET_STAGING missing; falling back to production credentials.'
      );
    }
    return { clientId, clientSecret };
  }

  return {
    clientId: config.THUMBTACK_CLIENT_ID,
    clientSecret: config.THUMBTACK_CLIENT_SECRET
  };
}

export function getThumbtackRedirectUri(environment: ThumbtackOAuthEnvironment): string {
  const config = getThumbtackConfig();
  if (environment === 'production') {
    return config.THUMBTACK_REDIRECT_URI ?? DEFAULT_REDIRECTS.production;
  }

  return config.THUMBTACK_REDIRECT_URI_STAGING ?? config.THUMBTACK_REDIRECT_URI ?? DEFAULT_REDIRECTS.staging;
}

export async function exchangeThumbtackAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  environment: ThumbtackOAuthEnvironment;
}): Promise<ThumbtackTokenResponse> {
  const { clientId, clientSecret } = getThumbtackCredentials(params.environment);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri
  });
  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString('base64');

  const response = await fetch(getTokenUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Thumbtack token exchange failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  return (await response.json()) as ThumbtackTokenResponse;
}
