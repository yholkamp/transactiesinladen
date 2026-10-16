import type { Ctx } from '../../server/env';
import { json } from '../../server/http';
import { readSession } from '../../server/session';

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  return json({ connected: (await readSession(request, env)) !== null });
}
