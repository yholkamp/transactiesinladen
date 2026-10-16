import { setCookie, STATE_COOKIE, STATE_MAX_AGE } from '../../../server/cookies';
import type { Ctx } from '../../../server/env';
import { redirect } from '../../../server/http';
import { authorizeUrl } from '../../../server/oauth';

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const state = crypto.randomUUID();
  return redirect(authorizeUrl(env, request, state), [setCookie(STATE_COOKIE, state, STATE_MAX_AGE)]);
}
