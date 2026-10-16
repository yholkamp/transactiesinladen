import { describe, expect, it } from 'vitest';
import worker from '../../server/worker';
import { env, ORIGIN } from '../helpers';

const call = (path: string, method = 'GET') => worker.fetch(new Request(`${ORIGIN}${path}`, { method }), env);

describe('worker router', () => {
  it('routes to a handler', async () => {
    const res = await call('/api/session');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });

  it('passes path params', async () => {
    const res = await call('/api/abc/financial-accounts');
    expect(res.status).toBe(401);
  });

  it('rejects the wrong method', async () => {
    expect((await call('/api/auth/logout')).status).toBe(405);
  });

  it('returns 404 for unknown api paths', async () => {
    expect((await call('/api/nope')).status).toBe(404);
  });
});
