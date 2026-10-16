import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoneybirdClient, MoneybirdError } from '../../server/moneybird';
import { env, jsonResponse, mockFetch } from '../helpers';

afterEach(() => vi.unstubAllGlobals());

describe('MoneybirdClient', () => {
  it('sends bearer token to the v2 API', async () => {
    const fetch = mockFetch(() => jsonResponse([{ id: '1' }]));
    const client = new MoneybirdClient(env, { access_token: 'at' });
    expect(await client.request('/administrations.json')).toEqual([{ id: '1' }]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://moneybird.com/api/v2/administrations.json');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer at');
  });

  it('refreshes once on 401 and retries', async () => {
    const calls: string[] = [];
    mockFetch((url, init) => {
      calls.push(url);
      if (url.endsWith('/oauth/token')) {
        const body = new URLSearchParams(String(init?.body));
        expect(body.get('grant_type')).toBe('refresh_token');
        expect(body.get('refresh_token')).toBe('rt');
        return jsonResponse({ access_token: 'new', refresh_token: 'rt2' });
      }
      const auth = new Headers(init?.headers).get('Authorization');
      return auth === 'Bearer new' ? jsonResponse({ ok: true }) : jsonResponse({ error: 'unauthorized' }, 401);
    });
    const client = new MoneybirdClient(env, { access_token: 'old', refresh_token: 'rt' });
    expect(await client.request('/x.json')).toEqual({ ok: true });
    expect(client.sessionChanged).toBe(true);
    expect(client.session).toEqual({ access_token: 'new', refresh_token: 'rt2' });
    expect(calls).toHaveLength(3);
  });

  it('throws 401 when refresh fails', async () => {
    mockFetch((url) => (url.endsWith('/oauth/token') ? jsonResponse({ error: 'invalid_grant' }, 400) : jsonResponse({}, 401)));
    const client = new MoneybirdClient(env, { access_token: 'old', refresh_token: 'rt' });
    await expect(client.request('/x.json')).rejects.toMatchObject({ status: 401 });
  });

  it('throws MoneybirdError with body and Retry-After', async () => {
    mockFetch(() => jsonResponse({ error: 'rate limited' }, 429, { 'Retry-After': '30' }));
    const client = new MoneybirdClient(env, { access_token: 'at' });
    const err = await client.request('/x.json').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MoneybirdError);
    expect(err).toMatchObject({ status: 429, body: { error: 'rate limited' }, retryAfter: '30' });
  });

  it('sends JSON bodies', async () => {
    const fetch = mockFetch(() => jsonResponse({ id: '9' }, 201));
    const client = new MoneybirdClient(env, { access_token: 'at' });
    await client.request('/1/financial_statements.json', { method: 'POST', body: { a: 1 } });
    const init = fetch.mock.calls[0][1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });
});
