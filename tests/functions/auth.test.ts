import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as login } from '../../functions/api/auth/login';
import { onRequestGet as callback } from '../../functions/api/auth/callback';
import { onRequestPost as logout } from '../../functions/api/auth/logout';
import { onRequestGet as session } from '../../functions/api/session';
import { decryptSession } from '../../server/session';
import { cookieHeader, ctx, env, jsonResponse, mockFetch, ORIGIN } from '../helpers';

afterEach(() => vi.unstubAllGlobals());

function setCookies(res: Response): string[] {
  return res.headers.getSetCookie();
}

describe('login', () => {
  it('redirects to Moneybird with state cookie', async () => {
    const res = await login(ctx(new Request(`${ORIGIN}/api/auth/login`)));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('Location')!);
    expect(location.origin + location.pathname).toBe('https://moneybird.com/oauth/authorize');
    expect(location.searchParams.get('client_id')).toBe('cid');
    expect(location.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/callback`);
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('scope')).toBe('bank settings');
    const state = location.searchParams.get('state');
    expect(state).toBeTruthy();
    expect(setCookies(res)[0]).toContain(`mb_oauth_state=${state}`);
  });
});

describe('callback', () => {
  const request = (query: string, cookie = 'mb_oauth_state=s1') =>
    new Request(`${ORIGIN}/api/auth/callback?${query}`, { headers: { Cookie: cookie } });

  it('rejects a state mismatch', async () => {
    const res = await callback(ctx(request('code=c&state=other')));
    expect(res.headers.get('Location')).toBe('/?error=invalid_state');
  });

  it('passes through provider errors', async () => {
    const res = await callback(ctx(request('error=access_denied&state=s1')));
    expect(res.headers.get('Location')).toBe('/?error=access_denied');
  });

  it('reports token exchange failure', async () => {
    mockFetch(() => jsonResponse({ error: 'invalid_grant' }, 400));
    const res = await callback(ctx(request('code=c&state=s1')));
    expect(res.headers.get('Location')).toBe('/?error=token_exchange_failed');
  });

  it('exchanges the code and sets the session cookie', async () => {
    const fetch = mockFetch(() => jsonResponse({ access_token: 'at', refresh_token: 'rt', token_type: 'bearer' }));
    const res = await callback(ctx(request('code=c&state=s1')));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
    const body = new URLSearchParams(String(fetch.mock.calls[0][1]?.body));
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'authorization_code', code: 'c', redirect_uri: `${ORIGIN}/api/auth/callback`, client_id: 'cid', client_secret: 'csecret',
    });
    const cookies = setCookies(res);
    const sessionValue = decodeURIComponent(cookies.find((c) => c.startsWith('mb_session='))!.split(';')[0].slice('mb_session='.length));
    expect(await decryptSession(sessionValue, env.SESSION_SECRET)).toEqual({ access_token: 'at', refresh_token: 'rt' });
    expect(cookies.some((c) => c.startsWith('mb_oauth_state=;'))).toBe(true);
  });
});

describe('session + logout', () => {
  it('reports connection state', async () => {
    const no = await session(ctx(new Request(`${ORIGIN}/api/session`)));
    expect(await no.json()).toEqual({ connected: false });
    const yes = await session(ctx(new Request(`${ORIGIN}/api/session`, { headers: { Cookie: await cookieHeader() } })));
    expect(await yes.json()).toEqual({ connected: true });
    const tampered = await session(ctx(new Request(`${ORIGIN}/api/session`, { headers: { Cookie: 'mb_session=garbage' } })));
    expect(await tampered.json()).toEqual({ connected: false });
  });

  it('rejects cross-origin logout', async () => {
    const res = await logout(ctx(new Request(`${ORIGIN}/api/auth/logout`, { method: 'POST', headers: { Origin: 'https://evil.example' } })));
    expect(res.status).toBe(403);
  });

  it('revokes and clears the cookie', async () => {
    const fetch = mockFetch(() => new Response(null, { status: 200 }));
    const res = await logout(ctx(new Request(`${ORIGIN}/api/auth/logout`, {
      method: 'POST', headers: { Origin: ORIGIN, Cookie: await cookieHeader() },
    })));
    expect(res.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe('https://moneybird.com/oauth/revoke');
    expect(setCookies(res)[0]).toMatch(/^mb_session=; Max-Age=0/);
  });
});
