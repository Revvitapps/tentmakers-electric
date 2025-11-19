import type { ServiceFusionTokenResponse } from './sfTypes';
import { computeExpiryTimestamp, isExpired } from './timeUtils';
import { getServiceFusionConfig } from './validation';

const TOKEN_URL = 'https://api.servicefusion.com/oauth/access_token';

export interface SFToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type SFRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
};

let cachedToken: SFToken | null = null;

function getApiBase() {
  const { apiBase } = getServiceFusionConfig();
  return apiBase.replace(/\/$/, '');
}

function appendQueryParams(url: URL, query?: SFRequestOptions['query']) {
  if (!query) {
    return;
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    url.searchParams.append(key, String(value));
  });
}

async function exchangeToken(body: Record<string, unknown>): Promise<SFToken> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    cache: 'no-store',
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Service Fusion token request failed (${response.status})`);
  }

  const payload = (await response.json()) as ServiceFusionTokenResponse;
  const expiresAt = computeExpiryTimestamp(payload.expires_in);

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? '',
    expiresAt
  };
}

async function requestNewToken(): Promise<SFToken> {
  const { clientId, clientSecret } = getServiceFusionConfig();
  return exchangeToken({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });
}

async function requestRefreshToken(refreshToken: string): Promise<SFToken> {
  return exchangeToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
}

export function getCachedSFToken(): SFToken | null {
  return cachedToken;
}

export async function getSFToken(): Promise<string> {
  if (!cachedToken || isExpired(cachedToken.expiresAt)) {
    await refreshSFToken();
  }

  if (!cachedToken) {
    throw new Error('Unable to obtain Service Fusion token');
  }

  return cachedToken.accessToken;
}

export async function refreshSFToken(): Promise<string> {
  try {
    if (cachedToken?.refreshToken) {
      cachedToken = await requestRefreshToken(cachedToken.refreshToken);
      return cachedToken.accessToken;
    }
  } catch (error) {
    console.warn('Service Fusion refresh token failed, falling back to new token', error);
  }

  cachedToken = await requestNewToken();
  return cachedToken.accessToken;
}

export async function sfFetch<T>(path: string, options: SFRequestOptions = {}): Promise<T> {
  const { query, json, ...rest } = options;
  const url = new URL(path.startsWith('http') ? path : `${getApiBase()}/${path.replace(/^\/+/, '')}`);
  appendQueryParams(url, query);
  const accessToken = await getSFToken();

  const headers = new Headers(rest.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');

  let body = rest.body;

  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body,
    cache: rest.cache ?? 'no-store'
  });

  if (!response.ok) {
    const errorPayload = await parseErrorPayload(response);
    throw new Error(
      `Service Fusion API error (${response.status} ${response.statusText}): ${errorPayload}`
    );
  }

  const parsed = await parseSuccessPayload(response);
  return parsed as T;
}

async function parseErrorPayload(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const json = await response.json();
      return JSON.stringify(json);
    } catch {
      // fall through
    }
  }

  return await response.text();
}

async function parseSuccessPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}
