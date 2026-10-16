import type { Env } from './env';
import { MONEYBIRD_ORIGIN, refreshSession } from './oauth';
import type { Session } from './session';

export class MoneybirdError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly retryAfter: string | null;

  constructor(status: number, body: unknown, retryAfter: string | null = null) {
    super(`Moneybird API error ${status}`);
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }
}

interface RequestInit {
  method?: string;
  body?: unknown;
}

export class MoneybirdClient {
  session: Session;
  sessionChanged = false;
  private readonly env: Env;

  constructor(env: Env, session: Session) {
    this.env = env;
    this.session = session;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res = await this.send(path, init);
    if (res.status === 401) {
      const refreshed = await refreshSession(this.env, this.session);
      if (refreshed) {
        this.session = refreshed;
        this.sessionChanged = true;
        res = await this.send(path, init);
      }
    }
    if (!res.ok) {
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // keep raw text
      }
      throw new MoneybirdError(res.status, body, res.headers.get('Retry-After'));
    }
    return (res.status === 204 ? null : await res.json()) as T;
  }

  private send(path: string, init: RequestInit): Promise<Response> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.session.access_token}`, Accept: 'application/json' };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(`${MONEYBIRD_ORIGIN}/api/v2${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  }
}
