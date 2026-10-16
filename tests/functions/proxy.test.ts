import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as administrations } from '../../functions/api/administrations';
import { onRequestGet as accounts } from '../../functions/api/[admin]/financial-accounts';
import { onRequestGet as mutations } from '../../functions/api/[admin]/mutations';
import { onRequestPost as statements } from '../../functions/api/[admin]/statements';
import { cookieHeader, ctx, jsonResponse, mockFetch, ORIGIN } from '../helpers';

afterEach(() => vi.unstubAllGlobals());

async function get(path: string) {
  return new Request(`${ORIGIN}${path}`, { headers: { Cookie: await cookieHeader() } });
}
async function post(path: string, body: unknown, origin = ORIGIN) {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST', body: JSON.stringify(body),
    headers: { Cookie: await cookieHeader(), Origin: origin, 'Content-Type': 'application/json' },
  });
}

describe('administrations', () => {
  it('requires a session', async () => {
    const res = await administrations(ctx(new Request(`${ORIGIN}/api/administrations`)));
    expect(res.status).toBe(401);
  });
  it('maps administrations and keeps ids as strings', async () => {
    mockFetch(() => jsonResponse([{ id: '123456789012345678', name: 'Acme', currency: 'EUR', language: 'nl' }]));
    const res = await administrations(ctx(await get('/api/administrations')));
    expect(await res.json()).toEqual([{ id: '123456789012345678', name: 'Acme', currency: 'EUR' }]);
  });
  it('passes through 429 with Retry-After', async () => {
    mockFetch(() => jsonResponse({ error: 'Too many requests' }, 429, { 'Retry-After': '12' }));
    const res = await administrations(ctx(await get('/api/administrations')));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('12');
    expect(await res.json()).toEqual({ error: 'Moneybird request failed', details: { error: 'Too many requests' } });
  });
  it('clears the cookie when Moneybird says 401', async () => {
    mockFetch(() => jsonResponse({}, 401));
    const res = await administrations(ctx(await get('/api/administrations')));
    expect(res.status).toBe(401);
    expect(res.headers.get('Set-Cookie')).toMatch(/^mb_session=; Max-Age=0/);
  });
});

describe('financial accounts', () => {
  it('rejects a non-numeric administration id', async () => {
    const res = await accounts(ctx(await get('/api/abc/financial-accounts'), { admin: 'abc' }));
    expect(res.status).toBe(400);
  });
  it('lists active accounts with credit cards first', async () => {
    const fetch = mockFetch(() => jsonResponse([
      { id: '1', name: 'Bank', type: 'BankAccount', identifier: 'NL01', currency: 'EUR', active: true },
      { id: '2', name: 'Old card', type: 'CreditCardAccount', identifier: null, currency: 'EUR', active: false },
      { id: '3', name: 'Card', type: 'CreditCardAccount', identifier: '1234', currency: 'EUR', active: true },
    ]));
    const res = await accounts(ctx(await get('/api/123/financial-accounts'), { admin: '123' }));
    expect(fetch.mock.calls[0][0]).toBe('https://moneybird.com/api/v2/123/financial_accounts.json');
    expect(await res.json()).toEqual([
      { id: '3', name: 'Card', type: 'CreditCardAccount', identifier: '1234', currency: 'EUR' },
      { id: '1', name: 'Bank', type: 'BankAccount', identifier: 'NL01', currency: 'EUR' },
    ]);
  });
});

describe('mutations', () => {
  it('validates query parameters', async () => {
    const res = await mutations(ctx(await get('/api/123/mutations?account=1&from=2026&to=20261004'), { admin: '123' }));
    expect(res.status).toBe(400);
  });
  it('pages through results and maps amounts to cents', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: String(i), date: '2026-10-01', amount: '-9.99', message: `m${i}` }));
    const page2 = [{ id: '100', date: '2026-10-02', amount: '163.94', message: null }];
    const fetch = mockFetch((url) => jsonResponse(new URL(url).searchParams.get('page') === '1' ? page1 : page2));
    const res = await mutations(ctx(await get('/api/123/mutations?account=77&from=20260901&to=20261004'), { admin: '123' }));
    const body = await res.json() as Array<{ id: string; amountCents: number; message: string }>;
    expect(body).toHaveLength(101);
    expect(body[0]).toEqual({ id: '0', date: '2026-10-01', amountCents: -999, message: 'm0' });
    expect(body[100]).toEqual({ id: '100', date: '2026-10-02', amountCents: 16394, message: '' });
    const firstUrl = new URL(fetch.mock.calls[0][0] as string);
    expect(firstUrl.pathname).toBe('/api/v2/123/financial_mutations.json');
    expect(firstUrl.searchParams.get('filter')).toBe('financial_account_id:77,period:20260901..20261004');
    expect(firstUrl.searchParams.get('per_page')).toBe('100');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('mutations limits', () => {
  it('fails instead of silently truncating at the page limit', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ id: String(i), date: '2026-10-01', amount: '1.00', message: 'x' }));
    mockFetch(() => jsonResponse(full));
    const res = await mutations(ctx(await get('/api/123/mutations?account=77&from=20260901&to=20261004'), { admin: '123' }));
    expect(res.status).toBe(502);
  });
});

describe('statements', () => {
  const mutation = { date: '2026-10-01', message: 'APPLE', amount: '-9.99' };

  it('rejects cross-origin posts', async () => {
    const res = await statements(ctx(await post('/api/123/statements', {}, 'https://evil.example'), { admin: '123' }));
    expect(res.status).toBe(403);
  });
  it('validates the body', async () => {
    const res = await statements(ctx(await post('/api/123/statements', {
      financial_account_id: '1', reference: 'r', mutations: [{ ...mutation, amount: '9,99' }],
    }), { admin: '123' }));
    expect(res.status).toBe(400);
  });
  it('posts one statement with keyed mutations', async () => {
    const fetch = mockFetch(() => jsonResponse({ id: 's1' }, 201));
    const res = await statements(ctx(await post('/api/123/statements', {
      financial_account_id: '77', reference: 'CSV import', mutations: [{ ...mutation, foo: 1 }, { ...mutation, amount: '163.94' }],
    }), { admin: '123' }));
    expect(await res.json()).toEqual({ results: [{ reference: 'CSV import', count: 2, ok: true, id: 's1' }] });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://moneybird.com/api/v2/123/financial_statements.json');
    expect(JSON.parse(String(init?.body))).toEqual({
      financial_statement: {
        financial_account_id: '77', reference: 'CSV import',
        financial_mutations_attributes: { 0: mutation, 1: { ...mutation, amount: '163.94' } },
      },
    });
  });
  it('chunks large imports and stops on first failure', async () => {
    let n = 0;
    mockFetch(() => (++n === 2 ? jsonResponse({ error: 'invalid' }, 422) : jsonResponse({ id: `s${n}` }, 201)));
    const many = Array.from({ length: 1200 }, () => mutation);
    const res = await statements(ctx(await post('/api/123/statements', { financial_account_id: '77', reference: 'R', mutations: many }), { admin: '123' }));
    expect(await res.json()).toEqual({ results: [
      { reference: 'R (1/3)', count: 500, ok: true, id: 's1' },
      { reference: 'R (2/3)', count: 500, ok: false, error: { error: 'invalid' } },
    ] });
    expect(n).toBe(2);
  });
  const many = () => Array.from({ length: 1200 }, () => mutation);
  const partial = [
    { reference: 'R (1/3)', count: 500, ok: true, id: 's1' },
    { reference: 'R (2/3)', count: 500, ok: false },
  ];

  it('keeps partial results when a later chunk hits a network error', async () => {
    let n = 0;
    mockFetch(() => {
      if (++n === 2) throw new TypeError('network down');
      return jsonResponse({ id: `s${n}` }, 201);
    });
    const res = await statements(ctx(await post('/api/123/statements', { financial_account_id: '77', reference: 'R', mutations: many() }), { admin: '123' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [partial[0], { ...partial[1], error: 'network down' }] });
  });
  it('keeps partial results when a later chunk gets 401 and refresh fails', async () => {
    let n = 0;
    mockFetch((url) => {
      if (url.endsWith('/oauth/token')) return jsonResponse({ error: 'invalid_grant' }, 400);
      return ++n === 1 ? jsonResponse({ id: 's1' }, 201) : jsonResponse({}, 401);
    });
    const res = await statements(ctx(await post('/api/123/statements', { financial_account_id: '77', reference: 'R', mutations: many() }), { admin: '123' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Array<{ ok: boolean }> };
    expect(body.results).toHaveLength(2);
    expect(body.results[0].ok).toBe(true);
    expect(body.results[1].ok).toBe(false);
  });
});
