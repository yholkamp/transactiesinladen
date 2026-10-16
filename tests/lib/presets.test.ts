import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeBytes, parseCsv } from '../../src/lib/csv/parse';
import { ICS_PRESET, headerFingerprint, initialMapping, loadMapping, saveMapping, type KeyValueStore } from '../../src/lib/csv/presets';
import { suggestMapping } from '../../src/lib/csv/mapping';

const ics = parseCsv(decodeBytes(new Uint8Array(readFileSync(new URL('../fixtures/ics-example.csv', import.meta.url)))));
const STORAGE_KEY = 'mb-cc-import:mappings';
const PRESET_SOURCE = { kind: 'preset', name: 'ICS' };

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('presets', () => {
  it('fingerprint ignores case and whitespace', () => {
    expect(headerFingerprint([' Date ', 'AMOUNT'])).toBe(headerFingerprint(['date', 'amount']));
  });
  it('uses the built-in ICS preset', () => {
    expect(loadMapping(ics.headers, memoryStore())).toEqual({ mapping: ICS_PRESET, source: PRESET_SOURCE });
  });
  it('prefers a saved mapping', () => {
    const store = memoryStore();
    const custom = { ...ICS_PRESET, invertSign: true };
    saveMapping(ics.headers, custom, store);
    expect(loadMapping(ics.headers, store)).toEqual({ mapping: custom, source: { kind: 'saved' } });
  });
  it('saves mappings with a storage version', () => {
    const store = memoryStore();
    saveMapping(ics.headers, ICS_PRESET, store);
    expect(JSON.parse(store.getItem(STORAGE_KEY)!)).toEqual({ version: 1, mappings: { [headerFingerprint(ics.headers)]: ICS_PRESET } });
  });
  it('reads unversioned mappings saved by earlier builds', () => {
    const store = memoryStore();
    const custom = { ...ICS_PRESET, invertSign: true };
    store.setItem(STORAGE_KEY, JSON.stringify({ [headerFingerprint(ics.headers)]: custom }));
    expect(loadMapping(ics.headers, store)).toEqual({ mapping: custom, source: { kind: 'saved' } });
  });
  it('ignores mappings saved by a newer version', () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 2, mappings: { [headerFingerprint(ics.headers)]: { ...ICS_PRESET, invertSign: true } } }));
    expect(loadMapping(ics.headers, store)).toEqual({ mapping: ICS_PRESET, source: PRESET_SOURCE });
  });
  it('ignores malformed saved mappings', () => {
    const { skipRules: _, ...withoutSkipRules } = ICS_PRESET;
    for (const entry of [null, { dateColumn: 'Transactiedatum' }, withoutSkipRules, { ...ICS_PRESET, signMode: { kind: 'other' } }]) {
      const store = memoryStore();
      store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, mappings: { [headerFingerprint(ics.headers)]: entry } }));
      expect(loadMapping(ics.headers, store)).toEqual({ mapping: ICS_PRESET, source: PRESET_SOURCE });
    }
  });
  it('returns null for unknown headers', () => {
    expect(loadMapping(['foo'], memoryStore())).toBeNull();
  });
  it('survives a broken store', () => {
    const broken: KeyValueStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(() => saveMapping(['foo'], ICS_PRESET, broken)).not.toThrow();
    expect(loadMapping(['foo'], broken)).toBeNull();
    const corrupt: KeyValueStore = { getItem: () => '{not json', setItem: () => {} };
    expect(loadMapping(['foo'], corrupt)).toBeNull();
  });
  it('ignores prototype keys as fingerprints', () => {
    expect(loadMapping(['constructor'], memoryStore())).toBeNull();
    expect(loadMapping(['__proto__'], memoryStore())).toBeNull();
  });
  it('initialMapping falls back to suggestion', () => {
    const table = { delimiter: ',', headers: ['Date', 'Amount'], rows: [['2026-01-01', '1.00']] };
    expect(initialMapping(table, memoryStore())).toEqual({ mapping: suggestMapping(table), source: { kind: 'suggested' } });
  });
});
