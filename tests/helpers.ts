import { vi } from 'vitest';
import type { Ctx, Env } from '../server/env';
import { SESSION_COOKIE } from '../server/cookies';
import { encryptSession, type Session } from '../server/session';

export const env: Env = {
  MONEYBIRD_CLIENT_ID: 'cid',
  MONEYBIRD_CLIENT_SECRET: 'csecret',
  SESSION_SECRET: 'test-secret-test-secret-test-secret',
};

export const ORIGIN = 'https://app.example';

export function ctx(request: Request, params: Record<string, string> = {}): Ctx {
  return { request, env, params };
}

export async function cookieHeader(session: Session = { access_token: 'at', refresh_token: 'rt' }): Promise<string> {
  return `${SESSION_COOKIE}=${encodeURIComponent(await encryptSession(session, env.SESSION_SECRET))}`;
}

export type FetchHandler = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

export function mockFetch(handler: FetchHandler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input instanceof Request ? input.url : String(input), init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

export function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
