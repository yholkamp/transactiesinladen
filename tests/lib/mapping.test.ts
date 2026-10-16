import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeBytes, parseCsv, type CsvTable } from '../../src/lib/csv/parse';
import { applyMapping, suggestMapping, type Mapping } from '../../src/lib/csv/mapping';

const ics = parseCsv(decodeBytes(new Uint8Array(readFileSync(new URL('../fixtures/ics-example.csv', import.meta.url)))));

const icsMapping: Mapping = {
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

describe('applyMapping on ICS example', () => {
  const rows = applyMapping(ics, icsMapping);

  it('maps all 9 rows as new', () => {
    expect(rows).toHaveLength(9);
    expect(rows.every((r) => r.status === 'new')).toBe(true);
  });
  it('maps the first row', () => {
    expect(rows[0]).toEqual({ rowNumber: 2, date: '2026-10-01', amountCents: -999, message: 'MUSICBOX.COM/BILL CORK IRL', status: 'new' });
  });
  it('treats the repayment as a positive credit', () => {
    expect(rows[2]).toMatchObject({ date: '2026-09-12', amountCents: 16394, message: 'GEINCASSEERD VORIG SALDO' });
  });
  it('appends foreign currency amounts', () => {
    expect(rows[3].message).toBe('ACME* CLOUD PLAN SAN FRANCISCO USA · USD 4,85');
    expect(rows[7].message).toBe('EXAMPLE AI, INC NEW YORK USA · USD 52,97');
  });
  it('totals match', () => {
    const debit = rows.filter((r) => r.amountCents < 0).reduce((s, r) => s + r.amountCents, 0);
    const credit = rows.filter((r) => r.amountCents > 0).reduce((s, r) => s + r.amountCents, 0);
    expect(debit).toBe(-18121);
    expect(credit).toBe(16394);
  });
});

describe('applyMapping edge cases', () => {
  const table: CsvTable = {
    delimiter: ',',
    headers: ['Date', 'Amount', 'Text', 'Type'],
    rows: [
      ['2026-01-02', '-10.00', 'Shop', 'card'],
      ['bad', '1.00', 'X', 'card'],
      ['2026-01-03', 'abc', 'Y', 'card'],
      ['2026-01-04', '5.00', 'Fee'],
      ['2026-01-05', '0.00', 'Zero', 'card'],
      ['2026-01-06', '1.00', '', 'card'],
      ['2026-01-07', '3.00', 'Skip me', 'internal'],
      ['2026-01-08'],
    ],
  };
  const base: Mapping = {
    dateColumn: 'Date', dateFormat: 'auto', amountColumn: 'Amount', decimalStyle: 'dot',
    signMode: { kind: 'signed' }, invertSign: false, descriptionColumns: ['Text'],
    foreignAmount: null, skipRules: [{ column: 'Type', equals: 'internal' }],
  };
  const rows = applyMapping(table, base);

  it('omits skipped rows', () => expect(rows.map((r) => r.rowNumber)).not.toContain(8));
  it('keeps valid rows', () => expect(rows[0]).toMatchObject({ rowNumber: 2, amountCents: -1000, status: 'new' }));
  it('flags invalid date', () => expect(rows[1]).toMatchObject({ status: 'invalid', error: { code: 'invalidDate', value: 'bad' } }));
  it('flags invalid amount', () => expect(rows[2]).toMatchObject({ status: 'invalid', error: { code: 'invalidAmount', value: 'abc' } }));
  it('accepts short rows when needed columns exist', () => expect(rows[3]).toMatchObject({ status: 'new', amountCents: 500 }));
  it('flags zero amount', () => expect(rows[4]).toMatchObject({ status: 'invalid', error: { code: 'zeroAmount' } }));
  it('flags empty description', () => expect(rows[5]).toMatchObject({ status: 'invalid', error: { code: 'emptyDescription' } }));
  it('flags rows missing the amount column', () => expect(rows[6]).toMatchObject({ rowNumber: 9, status: 'invalid' }));
  it('auto date format falls back to valid rows only', () => expect(rows[0].date).toBe('2026-01-02'));

  it('trims skip rule values', () => {
    const r = applyMapping(table, { ...base, skipRules: [{ column: 'Type', equals: ' internal ' }] });
    expect(r.map((x) => x.rowNumber)).not.toContain(8);
  });

  it('inverts sign', () => {
    expect(applyMapping(table, { ...base, invertSign: true })[0].amountCents).toBe(1000);
  });
  it('flags unknown debit/credit value', () => {
    const t: CsvTable = { delimiter: ';', headers: ['d', 'a', 'm', 's'], rows: [['2026-01-01', '1.00', 'x', '?']] };
    const r = applyMapping(t, { ...base, dateColumn: 'd', amountColumn: 'a', descriptionColumns: ['m'], skipRules: [],
      signMode: { kind: 'debitCreditColumn', column: 's', debitValue: 'D', creditValue: 'C' } });
    expect(r[0]).toMatchObject({ status: 'invalid', error: { code: 'unknownDebitCredit', value: '?' } });
  });
  it('drops null description values and joins columns', () => {
    const t: CsvTable = { delimiter: ';', headers: ['d', 'a', 'm1', 'm2'], rows: [['2026-01-01', '1.00', 'A', 'null'], ['2026-01-01', '1.00', 'A', 'B']] };
    const r = applyMapping(t, { ...base, dateColumn: 'd', amountColumn: 'a', descriptionColumns: ['m1', 'm2'], skipRules: [] });
    expect(r.map((x) => x.message)).toEqual(['A', 'A · B']);
  });
});

describe('suggestMapping', () => {
  it('suggests a working mapping for the ICS example', () => {
    const m = suggestMapping(ics);
    expect(m).toMatchObject({
      dateColumn: 'Transactiedatum', amountColumn: 'Bedrag', decimalStyle: 'comma',
      signMode: { kind: 'debitCreditColumn', column: 'Debit/Credit', debitValue: 'D', creditValue: 'C' },
      descriptionColumns: ['Omschrijving'],
    });
    expect(applyMapping(ics, m).filter((r) => r.status === 'invalid')).toHaveLength(0);
  });
  it('falls back to signed mode and first columns', () => {
    const m = suggestMapping({ delimiter: ',', headers: ['x', 'y'], rows: [['1', '2']] });
    expect(m.signMode).toEqual({ kind: 'signed' });
    expect(m.dateColumn).toBe('x');
    expect(m.amountColumn).toBe('y');
  });
});
