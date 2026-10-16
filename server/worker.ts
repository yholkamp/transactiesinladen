import { onRequestGet as financialAccounts } from '../functions/api/[admin]/financial-accounts';
import { onRequestGet as mutations } from '../functions/api/[admin]/mutations';
import { onRequestPost as statements } from '../functions/api/[admin]/statements';
import { onRequestGet as administrations } from '../functions/api/administrations';
import { onRequestGet as callback } from '../functions/api/auth/callback';
import { onRequestGet as login } from '../functions/api/auth/login';
import { onRequestPost as logout } from '../functions/api/auth/logout';
import { onRequestGet as session } from '../functions/api/session';
import type { Env, Handler } from './env';
import { errorResponse } from './http';

const routes: { method: string; pattern: RegExp; handler: Handler }[] = [
  { method: 'GET', pattern: /^\/api\/session$/, handler: session },
  { method: 'GET', pattern: /^\/api\/auth\/login$/, handler: login },
  { method: 'GET', pattern: /^\/api\/auth\/callback$/, handler: callback },
  { method: 'POST', pattern: /^\/api\/auth\/logout$/, handler: logout },
  { method: 'GET', pattern: /^\/api\/administrations$/, handler: administrations },
  { method: 'GET', pattern: /^\/api\/(?<admin>[^/]+)\/financial-accounts$/, handler: financialAccounts },
  { method: 'GET', pattern: /^\/api\/(?<admin>[^/]+)\/mutations$/, handler: mutations },
  { method: 'POST', pattern: /^\/api\/(?<admin>[^/]+)\/statements$/, handler: statements },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    let pathMatched = false;
    for (const route of routes) {
      const match = route.pattern.exec(pathname);
      if (!match) continue;
      pathMatched = true;
      if (route.method !== request.method) continue;
      let params: Record<string, string>;
      try {
        params = Object.fromEntries(Object.entries(match.groups ?? {}).map(([k, v]) => [k, decodeURIComponent(v)]));
      } catch {
        return errorResponse(400, 'Invalid path');
      }
      return route.handler({ request, env, params });
    }
    return pathMatched ? errorResponse(405, 'Method not allowed') : errorResponse(404, 'Not found');
  },
};
