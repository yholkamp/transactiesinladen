import { suggestMapping, type Mapping } from './mapping';
import type { CsvTable } from './parse';
import { DATE_FORMATS, type DateFormat } from './values';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'mb-cc-import:mappings';
// MIGRATIONS[v] upgrades the mappings stored at version v to version v + 1. To change the stored
// Mapping shape, append a migration: the storage version is the number of migrations.
const MIGRATIONS: ((mappings: Record<string, unknown>) => Record<string, unknown>)[] = [
  (mappings) => mappings, // 0 → 1: wrapped in a { version, mappings } envelope; entries are unchanged.
];
const STORAGE_VERSION = MIGRATIONS.length;

export function headerFingerprint(headers: string[]): string {
  return headers.map((h) => h.trim().toLowerCase()).join('|');
}

export const ICS_PRESET: Mapping = {
  dateColumn: 'Transactiedatum',
  dateFormat: 'DD-MM-YYYY',
  amountColumn: 'Bedrag',
  decimalStyle: 'comma',
  signMode: { kind: 'debitCreditColumn', column: 'Debit/Credit', debitValue: 'D', creditValue: 'C' },
  invertSign: false,
  descriptionColumns: ['Omschrijving'],
  foreignAmount: { amountColumn: 'Bedrag in oorspronkelijke valuta', currencyColumn: 'Valuta', baseCurrency: 'EUR' },
  skipRules: [],
};

export type MappingSource = { kind: 'preset'; name: string } | { kind: 'saved' } | { kind: 'suggested' };

interface Preset {
  name: string;
  mapping: Mapping;
}

const BUILT_IN: Record<string, Preset> = {
  [headerFingerprint([
    'Transactiedatum', 'Boekingsdatum', 'Omschrijving', 'Naam Card-houder', 'Card nummer', 'Debit/Credit',
    'Bedrag', 'Merchant categorie', 'Land', 'Valuta', 'Bedrag in oorspronkelijke valuta', 'Type transactie', 'Wallet provider',
  ])]: { name: 'ICS', mapping: ICS_PRESET },
};

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isMapping(value: unknown): value is Mapping {
  if (!isRecord(value)) return false;
  const { signMode: sign, foreignAmount: foreign } = value;
  return isString(value.dateColumn)
    && (value.dateFormat === 'auto' || DATE_FORMATS.includes(value.dateFormat as DateFormat))
    && isString(value.amountColumn)
    && (value.decimalStyle === 'comma' || value.decimalStyle === 'dot')
    && isRecord(sign)
    && (sign.kind === 'signed'
      || (sign.kind === 'debitCreditColumn' && isString(sign.column) && isString(sign.debitValue) && isString(sign.creditValue)))
    && typeof value.invertSign === 'boolean'
    && Array.isArray(value.descriptionColumns) && value.descriptionColumns.every(isString)
    && (foreign === null
      || (isRecord(foreign) && isString(foreign.amountColumn) && isString(foreign.currencyColumn) && isString(foreign.baseCurrency)))
    && Array.isArray(value.skipRules) && value.skipRules.every((r) => isRecord(r) && isString(r.column) && isString(r.equals));
}

function readSaved(store: KeyValueStore | null): Record<string, Mapping> {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!isRecord(parsed)) return {};
    // Unversioned data is a bare fingerprint → mapping record written before versioning.
    const version = typeof parsed.version === 'number' ? parsed.version : 0;
    const stored = version === 0 ? parsed : parsed.mappings;
    if (!Number.isInteger(version) || version < 0 || version > STORAGE_VERSION || !isRecord(stored)) return {};
    const mappings = MIGRATIONS.slice(version).reduce((m, migrate) => migrate(m), stored);
    // Drop entries that don't match the current shape, e.g. edited by hand, rather than crash on them.
    return Object.fromEntries(Object.entries(mappings).filter((entry): entry is [string, Mapping] => isMapping(entry[1])));
  } catch {
    return {};
  }
}

export interface LoadedMapping {
  mapping: Mapping;
  source: MappingSource;
}

export function loadMapping(headers: string[], store: KeyValueStore | null = defaultStore()): LoadedMapping | null {
  const fingerprint = headerFingerprint(headers);
  const saved = readSaved(store);
  if (Object.hasOwn(saved, fingerprint)) return { mapping: saved[fingerprint], source: { kind: 'saved' } };
  if (!Object.hasOwn(BUILT_IN, fingerprint)) return null;
  const { name, mapping } = BUILT_IN[fingerprint];
  return { mapping, source: { kind: 'preset', name } };
}

export function saveMapping(headers: string[], mapping: Mapping, store: KeyValueStore | null = defaultStore()): void {
  try {
    const saved = readSaved(store);
    saved[headerFingerprint(headers)] = mapping;
    store?.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, mappings: saved }));
  } catch {
    // Storage unavailable; mappings simply aren't remembered.
  }
}

export function initialMapping(table: CsvTable, store: KeyValueStore | null = defaultStore()): LoadedMapping {
  return loadMapping(table.headers, store) ?? { mapping: suggestMapping(table), source: { kind: 'suggested' } };
}
