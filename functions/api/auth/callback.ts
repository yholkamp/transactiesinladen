import { clearCookie, getCookie, STATE_COOKIE } from '../../../server/cookies';
import type { Ctx } from '../../../server/env';
import { redirect } from '../../../server/http';
import { callbackUrl, exchangeCode } from '../../../server/oauth';
import { sessionCookie } from '../../../server/session';

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const url = new URL(request.url);
  const clearState = clearCookie(STATE_COOKIE);
  const fail = (error: string) => redirect(`/?error=${encodeURIComponent(error)}`, [clearState]);

  const error = url.searchParams.get('error');
  if (error) return fail(error);
  const state = url.searchParams.get('state');
  const expected = getCookie(request, STATE_COOKIE);
  if (!state || !expected || state !== expected) return fail('invalid_state');
  const code = url.searchParams.get('code');
  if (!code) return fail('missing_code');

  const session = await exchangeCode(env, code, callbackUrl(request));
  if (!session) return fail('token_exchange_failed');
  return redirect('/', [await sessionCookie(session, env), clearState]);
}
