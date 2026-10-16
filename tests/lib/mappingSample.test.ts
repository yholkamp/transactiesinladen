import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { describeSample } from '../../src/components/mappingSample';
import { messages } from '../../src/i18n';
import { applyMapping } from '../../src/lib/csv/mapping';
import { decodeBytes, parseCsv } from '../../src/lib/csv/parse';
import { ICS_PRESET } from '../../src/lib/csv/presets';

const ics = parseCsv(decodeBytes(new Uint8Array(readFileSync(new URL('../fixtures/ics-example.csv', import.meta.url)))));
const t = messages.nl;
const nbsp = (s: string | null) => s?.replace(/\s/g, ' ');

describe('describeSample', () => {
  it('shows raw and parsed values of the first row', () => {
    const sample = describeSample(t, 'nl-NL', ics, ICS_PRESET, applyMapping(ics, ICS_PRESET)[0]);
    expect(sample?.date).toEqual({ raw: '01-10-2026', result: '1 okt 2026', error: null });
    expect(sample?.amount.raw).toBe('9,99 D');
    expect(nbsp(sample!.amount.result)).toBe('€ -9,99');
    expect(sample?.description).toEqual({ raw: 'MUSICBOX.COM/BILL CORK IRL', result: 'MUSICBOX.COM/BILL CORK IRL', error: null });
  });

  it('puts the error on the field that failed', () => {
    const mapping = { ...ICS_PRESET, amountColumn: 'Omschrijving' };
    const sample = describeSample(t, 'nl-NL', ics, mapping, applyMapping(ics, mapping)[0]);
    expect(sample?.amount.error).toBe('Ongeldig bedrag "MUSICBOX.COM/BILL CORK IRL"');
    expect(sample?.amount.result).toBeNull();
    expect(sample?.date).toEqual({ raw: '01-10-2026', result: null, error: null });
  });

  it('returns null without rows', () => {
    expect(describeSample(t, 'nl-NL', ics, ICS_PRESET, undefined)).toBeNull();
  });
});
