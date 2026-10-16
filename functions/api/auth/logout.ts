import { clearCookie, SESSION_COOKIE } from '../../../server/cookies';
import type { Ctx } from '../../../server/env';
import { errorResponse, isSameOrigin, json } from '../../../server/http';
import { revokeToken } from '../../../server/oauth';
import { readSession } from '../../../server/session';

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, 'Invalid origin');
  const session = await readSession(request, env);
  if (session) await revokeToken(env, session.access_token);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(SESSION_COOKIE) });
}
