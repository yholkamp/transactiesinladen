import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, errorMessage, isUnauthorized, withRetry } from '../../src/lib/api';
import { jsonResponse, mockFetch } from '../helpers';

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('fetches mutations with query params', async () => {
    const fetch = mockFetch(() => jsonResponse([]));
    await api.mutations('1', '2', '20260101', '20260201');
    expect(fetch.mock.calls[0][0]).toBe('/api/1/mutations?account=2&from=20260101&to=20260201');
  });
  it('posts statements as JSON', async () => {
    const fetch = mockFetch(() => jsonResponse({ results: [] }));
    await api.importStatement('1', { financial_account_id: '2', reference: 'r', mutations: [] });
    const init = fetch.mock.calls[0][1];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ financial_account_id: '2', reference: 'r', mutations: [] });
  });
  it('throws ApiError with details and retryAfter', async () => {
    mockFetch(() => jsonResponse({ error: 'Moneybird request failed', details: { x: 1 } }, 429, { 'Retry-After': '7' }));
    const err = await api.administrations().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 429, details: { x: 1 }, retryAfter: 7, message: 'Moneybird request failed' });
  });
  it('detects unauthorized', () => {
    expect(isUnauthorized(new ApiError(401, 'x'))).toBe(true);
    expect(isUnauthorized(new Error('x'))).toBe(false);
  });
  it('formats error messages with details', () => {
    expect(errorMessage(new ApiError(422, 'Failed', { error: { amount: ['is invalid'] } }))).toBe('Failed: {"error":{"amount":["is invalid"]}}');
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });
});

describe('withRetry', () => {
  it('retries 429 using retryAfter', async () => {
    const sleep = vi.fn(async () => {});
    let n = 0;
    const result = await withRetry(async () => {
      if (++n < 3) throw new ApiError(429, 'slow down', undefined, 2);
      return 'ok';
    }, 3, sleep);
    expect(result).toBe('ok');
    expect(sleep).toHaveBeenCalledWith(2000);
  });
  it('gives up after the last attempt and does not retry other errors', async () => {
    const sleep = vi.fn(async () => {});
    await expect(withRetry(async () => { throw new ApiError(429, 'x'); }, 2, sleep)).rejects.toMatchObject({ status: 429 });
    expect(sleep).toHaveBeenCalledTimes(1);
    await expect(withRetry(async () => { throw new ApiError(500, 'x'); }, 3, sleep)).rejects.toMatchObject({ status: 500 });
    expect(sleep).toHaveBeenCalledTimes(1);
  });
});
