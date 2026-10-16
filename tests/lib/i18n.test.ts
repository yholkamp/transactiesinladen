import { describe, expect, it } from 'vitest';
import {
  apiErrorText, DEFAULT_LANG, messages, oauthErrorText, readLang, rowErrorText, writeLang,
} from '../../src/i18n';
import { ApiError } from '../../src/lib/api';
import type { KeyValueStore } from '../../src/lib/csv/presets';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function shape(value: unknown): unknown {
  if (typeof value === 'function') return 'fn';
  if (typeof value === 'string') return 'string';
  return Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, shape(v)]).sort());
}

describe('language preference', () => {
  it('defaults to Dutch', () => {
    expect(DEFAULT_LANG).toBe('nl');
    expect(readLang(memoryStore())).toBe('nl');
    expect(readLang(null)).toBe('nl');
  });
  it('persists the chosen language', () => {
    const store = memoryStore();
    writeLang('en', store);
    expect(readLang(store)).toBe('en');
  });
  it('ignores unknown stored values and broken storage', () => {
    const store = memoryStore();
    store.setItem('mb-cc-import:lang', 'fr');
    expect(readLang(store)).toBe('nl');
    const broken: KeyValueStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readLang(broken)).toBe('nl');
    expect(() => writeLang('en', broken)).not.toThrow();
  });
});

describe('messages', () => {
  it('has the same keys in every language', () => {
    expect(shape(messages.en)).toEqual(shape(messages.nl));
  });
  it('interpolates values', () => {
    expect(messages.nl.review.importButton(1)).toBe('1 transactie importeren');
    expect(messages.nl.review.importButton(8)).toBe('8 transacties importeren');
    expect(messages.en.review.importButton(1)).toBe('Import 1 transaction');
    expect(messages.en.review.importButton(8)).toBe('Import 8 transactions');
    expect(messages.nl.preview.selected(8, 9)).toBe('8 van 9');
    expect(messages.en.result.imported(0)).toBe('0 transactions imported.');
  });
});

describe('error texts', () => {
  it('translates row errors', () => {
    expect(rowErrorText(messages.nl, { code: 'invalidDate', value: 'bad' })).toBe('Ongeldige datum "bad"');
    expect(rowErrorText(messages.en, { code: 'invalidDate', value: 'bad' })).toBe('Invalid date "bad"');
    expect(rowErrorText(messages.en, { code: 'zeroAmount' })).toBe('Amount is zero');
    expect(rowErrorText(messages.nl, { code: 'unknownDebitCredit', value: '?' })).toBe('Onbekende debet/credit-waarde "?"');
  });
  it('translates API errors by status', () => {
    expect(apiErrorText(messages.en, new ApiError(429, 'x'))).toBe(messages.en.errors.rateLimited);
    expect(apiErrorText(messages.nl, new ApiError(502, 'x'))).toBe(messages.nl.errors.tooManyMutations);
    expect(apiErrorText(messages.en, new ApiError(422, 'Moneybird request failed', { error: 'bad' }))).toBe('Moneybird error (422): {"error":"bad"}');
    expect(apiErrorText(messages.nl, new ApiError(500, 'x'))).toBe('Fout bij Moneybird (500)');
    expect(apiErrorText(messages.en, new Error('boom'))).toBe('boom');
  });
  it('translates OAuth error codes and falls back to the raw code', () => {
    expect(oauthErrorText(messages.en, 'access_denied')).toBe(messages.en.errors.oauth.access_denied);
    expect(oauthErrorText(messages.nl, 'something_else')).toBe('something_else');
    expect(oauthErrorText(messages.nl, 'constructor')).toBe('constructor');
  });
});
