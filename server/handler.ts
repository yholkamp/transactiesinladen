import { clearCookie, SESSION_COOKIE } from './cookies';
import type { Ctx, Handler } from './env';
import { errorResponse, isSameOrigin } from './http';
import { MoneybirdClient, MoneybirdError } from './moneybird';
import { readSession, sessionCookie } from './session';

export function withMoneybird(handler: (ctx: Ctx, client: MoneybirdClient) => Promise<Response>): Handler {
  return async (ctx) => {
    if (ctx.request.method !== 'GET' && !isSameOrigin(ctx.request)) return errorResponse(403, 'Invalid origin');
    const session = await readSession(ctx.request, ctx.env);
    if (!session) return errorResponse(401, 'Not connected');

    const client = new MoneybirdClient(ctx.env, session);
    let response: Response;
    try {
      response = await handler(ctx, client);
    } catch (e) {
      if (!(e instanceof MoneybirdError)) throw e;
      if (e.status === 401) return errorResponse(401, 'Not connected', undefined, { 'Set-Cookie': clearCookie(SESSION_COOKIE) });
      response = errorResponse(e.status, 'Moneybird request failed', e.body, e.retryAfter ? { 'Retry-After': e.retryAfter } : {});
    }
    if (client.sessionChanged) response.headers.append('Set-Cookie', await sessionCookie(client.session, ctx.env));
    return response;
  };
}

export function param(ctx: Ctx, name: string): string {
  const value = ctx.params[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
