import type { Env } from './env';
import type { Session } from './session';

export const MONEYBIRD_ORIGIN = 'https://moneybird.com';
export const SCOPES = 'bank settings';

const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };

export function callbackUrl(request: Request): string {
  return new URL('/api/auth/callback', request.url).toString();
}

export function authorizeUrl(env: Env, request: Request, state: string): string {
  const url = new URL('/oauth/authorize', MONEYBIRD_ORIGIN);
  url.searchParams.set('client_id', env.MONEYBIRD_CLIENT_ID);
  url.searchParams.set('redirect_uri', callbackUrl(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}

async function tokenRequest(params: Record<string, string>): Promise<Session | null> {
  try {
    const res = await fetch(`${MONEYBIRD_ORIGIN}/oauth/token`, { method: 'POST', headers: FORM_HEADERS, body: new URLSearchParams(params).toString() });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: unknown; refresh_token?: unknown };
    if (typeof data.access_token !== 'string') return null;
    return { access_token: data.access_token, refresh_token: typeof data.refresh_token === 'string' ? data.refresh_token : undefined };
  } catch {
    return null;
  }
}

export function exchangeCode(env: Env, code: string, redirectUri: string): Promise<Session | null> {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: env.MONEYBIRD_CLIENT_ID,
    client_secret: env.MONEYBIRD_CLIENT_SECRET,
  });
}

export async function refreshSession(env: Env, session: Session): Promise<Session | null> {
  if (!session.refresh_token) return null;
  const refreshed = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: session.refresh_token,
    client_id: env.MONEYBIRD_CLIENT_ID,
    client_secret: env.MONEYBIRD_CLIENT_SECRET,
  });
  return refreshed ? { ...refreshed, refresh_token: refreshed.refresh_token ?? session.refresh_token } : null;
}

export async function revokeToken(env: Env, token: string): Promise<void> {
  try {
    await fetch(`${MONEYBIRD_ORIGIN}/oauth/revoke`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: new URLSearchParams({ token, client_id: env.MONEYBIRD_CLIENT_ID, client_secret: env.MONEYBIRD_CLIENT_SECRET }).toString(),
    });
  } catch {
    // Best effort: the cookie is cleared regardless.
  }
}
