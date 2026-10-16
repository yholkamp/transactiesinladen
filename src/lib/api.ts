import type { ExistingMutation } from './dedupe';
import type { Administration, ChunkResult, FinancialAccount, ImportPayload } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;
  readonly retryAfter: number | null;

  constructor(status: number, message: string, details?: unknown, retryAfter: number | null = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
  if (!res.ok) {
    const retryAfter = Number(res.headers.get('Retry-After'));
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.details, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
  }
  return body as T;
}

export function isUnauthorized(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.details !== undefined) return `${e.message}: ${JSON.stringify(e.details)}`;
  return e instanceof Error ? e.message : String(e);
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, sleep = realSleep): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 429 || attempt >= attempts) throw e;
      await sleep((e.retryAfter ?? 5) * 1000);
    }
  }
}

export const api = {
  session: () => call<{ connected: boolean }>('/api/session'),
  administrations: () => call<Administration[]>('/api/administrations'),
  financialAccounts: (adminId: string) => call<FinancialAccount[]>(`/api/${adminId}/financial-accounts`),
  mutations: (adminId: string, accountId: string, from: string, to: string) =>
    call<ExistingMutation[]>(`/api/${adminId}/mutations?${new URLSearchParams({ account: accountId, from, to })}`),
  importStatement: (adminId: string, payload: ImportPayload) =>
    call<{ results: ChunkResult[] }>(`/api/${adminId}/statements`, { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => call<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
};
