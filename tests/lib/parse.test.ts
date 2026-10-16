import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeBytes, parseCsv } from '../../src/lib/csv/parse';

const fixture = readFileSync(new URL('../fixtures/ics-example.csv', import.meta.url));

describe('decodeBytes', () => {
  it('decodes UTF-8 and strips the BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Datum;Café')]);
    expect(decodeBytes(bytes)).toBe('Datum;Café');
  });
  it('falls back to windows-1252', () => {
    const bytes = new Uint8Array([0x43, 0x41, 0x46, 0xc9]); // "CAFÉ" in cp1252
    expect(decodeBytes(bytes)).toBe('CAFÉ');
  });
});

describe('parseCsv', () => {
  it('parses the ICS example', () => {
    const table = parseCsv(decodeBytes(new Uint8Array(fixture)));
    expect(table.delimiter).toBe(';');
    expect(table.headers[0]).toBe('Transactiedatum');
    expect(table.headers).toHaveLength(13);
    expect(table.rows).toHaveLength(9);
    expect(table.rows[7][2]).toBe('EXAMPLE AI, INC NEW YORK USA');
  });
  it('detects comma and tab delimiters', () => {
    expect(parseCsv('a,b\n1,2\n').delimiter).toBe(',');
    expect(parseCsv('a\tb\n1\t2\n').delimiter).toBe('\t');
  });
  it('skips blank lines and trims headers', () => {
    const table = parseCsv(' a ;b\n1;2\n\n\n');
    expect(table.headers).toEqual(['a', 'b']);
    expect(table.rows).toEqual([['1', '2']]);
  });
  it('strips a leading byte order mark before a quoted header', () => {
    expect(parseCsv('\uFEFF"Datum";"Bedrag"\n1;2\n').headers).toEqual(['Datum', 'Bedrag']);
  });
  it('returns empty table for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [], delimiter: expect.any(String) });
  });
});
