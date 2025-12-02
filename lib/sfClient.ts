import type { ServiceFusionTokenResponse } from './sfTypes';

const TOKEN_URL = 'https://api.servicefusion.com/oauth/access_token';
const DEFAULT_API_BASE = 'https://api.servicefusion.com/v1';
const EXPIRY_BUFFER_SECONDS = 60;

export interface SFToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

export type SFRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
};

let cachedToken: SFToken | null = null;

function requireEnv(name: 'SF_CLIENT_ID' | 'SF_CLIENT_SECRET'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} for Service Fusion`);
  }
  return value;
}

function getApiBase() {
  const base = process.env.SF_API_BASE || DEFAULT_API_BASE;
  return base.replace(/\/$/, '');
}

function computeExpiresAt(expiresInSeconds: number): number {
  const safeSeconds = Math.max(expiresInSeconds - EXPIRY_BUFFER_SECONDS, 0);
  return Date.now() + safeSeconds * 1000;
}

function appendQueryParams(url: URL, query?: SFRequestOptions['query']) {
  if (!query) return;

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.append(key, String(value));
  });
}

function cacheToken(payload: ServiceFusionTokenResponse): SFToken {
  cachedToken = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: computeExpiresAt(payload.expires_in)
  };
  return cachedToken;
}

async function exchangeToken(body: Record<string, string>): Promise<SFToken> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    cache: 'no-store',
    body: new URLSearchParams(body)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Service Fusion token request failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as ServiceFusionTokenResponse;
  return cacheToken(payload);
}

async function requestNewToken(): Promise<SFToken> {
  const clientId = requireEnv('SF_CLIENT_ID');
  const clientSecret = requireEnv('SF_CLIENT_SECRET');

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
  if (!cachedToken || cachedToken.expiresAt <= Date.now()) {
    await refreshSFToken(cachedToken?.refreshToken);
  }

  if (!cachedToken) {
    throw new Error('Unable to obtain Service Fusion token');
  }

  return cachedToken.accessToken;
}

export async function refreshSFToken(currentRefreshToken?: string | null): Promise<string> {
  try {
    const refreshToken = currentRefreshToken ?? cachedToken?.refreshToken;
    if (refreshToken) {
      cachedToken = await requestRefreshToken(refreshToken);
      return cachedToken.accessToken;
    }
  } catch (error) {
    console.warn('Service Fusion refresh failed, falling back to client credentials', error);
  }

  cachedToken = await requestNewToken();
  return cachedToken.accessToken;
}

export async function sfFetch<T>(
  path: string,
  options: SFRequestOptions = {}
): Promise<T> {
  const { query, json, ...rest } = options;
  const url = new URL(
    path.startsWith('http') ? path : `${getApiBase()}/${path.replace(/^\/+/, '')}`
  );
  appendQueryParams(url, query);

  const headers = new Headers(rest.headers);
  headers.set('Authorization', `Bearer ${await getSFToken()}`);
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

  return (await parseSuccessPayload(response)) as T;
}

async function parseErrorPayload(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const json = await response.json();
      return JSON.stringify(json);
    } catch {
      // fall through to text
    }
  }

  return await response.text();
}

async function parseSuccessPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}
