import { ApiError } from '../lib/api';
import type { RowError } from '../lib/csv/mapping';
import type { KeyValueStore } from '../lib/csv/presets';
import { en } from './en';
import { nl, type Messages } from './nl';

export type { Messages };
export type Lang = 'nl' | 'en';

export const LANGS: Lang[] = ['nl', 'en'];
export const DEFAULT_LANG: Lang = 'nl';
export const messages: Record<Lang, Messages> = { nl, en };
export const LOCALES: Record<Lang, string> = { nl: 'nl-NL', en: 'en-GB' };

const STORAGE_KEY = 'mb-cc-import:lang';

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isLang(value: unknown): value is Lang {
  return LANGS.includes(value as Lang);
}

export function readLang(store: KeyValueStore | null = defaultStore()): Lang {
  try {
    const stored = store?.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function writeLang(lang: Lang, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage unavailable; the choice just isn't remembered.
  }
}

export function rowErrorText(t: Messages, error: RowError): string {
  const text = t.rowErrors[error.code];
  return typeof text === 'function' ? text(error.value ?? '') : text;
}

export function apiErrorText(t: Messages, e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return t.errors.rateLimited;
    if (e.status === 502) return t.errors.tooManyMutations;
    const base = t.errors.request(e.status);
    return e.details !== undefined ? `${base}: ${JSON.stringify(e.details)}` : base;
  }
  return e instanceof Error ? e.message : String(e);
}

export function oauthErrorText(t: Messages, code: string): string {
  return Object.hasOwn(t.errors.oauth, code) ? t.errors.oauth[code as keyof Messages['errors']['oauth']] : code;
}
