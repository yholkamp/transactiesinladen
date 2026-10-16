import { describe, expect, it } from 'vitest';
import { dateWindow, markDuplicates, normalizeMessage, type ExistingMutation } from '../../src/lib/dedupe';
import type { ParsedRow } from '../../src/lib/csv/mapping';

const row = (rowNumber: number, date: string, amountCents: number, message: string, status: ParsedRow['status'] = 'new'): ParsedRow =>
  ({ rowNumber, date, amountCents, message, status });
const existing = (id: string, date: string, amountCents: number, message: string): ExistingMutation => ({ id, date, amountCents, message });

describe('normalizeMessage', () => {
  it('lowercases, strips punctuation, collapses spaces', () => {
    expect(normalizeMessage('  GAMEHUB*GameHub  App, PLAY ')).toBe('gamehub gamehub app play');
  });
});

describe('markDuplicates', () => {
  it('flags exact matches', () => {
    const out = markDuplicates([row(2, '2026-10-01', -999, 'MUSICBOX.COM/BILL CORK IRL')], [existing('1', '2026-10-02', -999, 'MUSICBOX.COM/BILL CORK IRL')]);
    expect(out[0].status).toBe('duplicate');
  });
  it('matches on message prefix either way', () => {
    const out = markDuplicates(
      [row(2, '2026-10-01', -429, 'ACME* CLOUD PLAN SAN FRANCISCO USA · USD 4,85'), row(3, '2026-10-01', -100, 'X')],
      [existing('1', '2026-10-01', -429, 'ACME CLOUD PLAN SAN FRANCISCO USA'), existing('2', '2026-10-01', -100, 'X shop extra')],
    );
    expect(out.map((r) => r.status)).toEqual(['duplicate', 'duplicate']);
  });
  it('requires equal amount and date within tolerance', () => {
    const out = markDuplicates(
      [row(2, '2026-10-01', -999, 'A'), row(3, '2026-10-01', -999, 'A')],
      [existing('1', '2026-10-05', -999, 'A'), existing('2', '2026-10-01', -998, 'A')],
    );
    expect(out.map((r) => r.status)).toEqual(['new', 'new']);
  });
  it('is a multiset match', () => {
    const out = markDuplicates([row(2, '2026-10-01', -999, 'A'), row(3, '2026-10-01', -999, 'A')], [existing('1', '2026-10-01', -999, 'A')]);
    expect(out.map((r) => r.status)).toEqual(['duplicate', 'new']);
  });
  it('prefers the closest date', () => {
    const out = markDuplicates(
      [row(2, '2026-10-03', -999, 'A'), row(3, '2026-10-01', -999, 'A')],
      [existing('1', '2026-10-01', -999, 'A'), existing('2', '2026-10-03', -999, 'A')],
    );
    expect(out.map((r) => r.status)).toEqual(['duplicate', 'duplicate']);
  });
  it('leaves invalid rows alone and ignores empty messages', () => {
    const out = markDuplicates([row(2, '', 0, '', 'invalid'), row(3, '2026-10-01', -1, '')], [existing('1', '2026-10-01', -1, '')]);
    expect(out.map((r) => r.status)).toEqual(['invalid', 'new']);
  });
  it('allocates globally to avoid stealing from later rows', () => {
    const out = markDuplicates(
      [row(1, '2026-10-02', -999, 'A'), row(2, '2026-10-01', -999, 'A')],
      [existing('E1', '2026-10-01', -999, 'A'), existing('E2', '2026-10-05', -999, 'A')],
    );
    expect(out.map((r) => r.status)).toEqual(['duplicate', 'duplicate']);
  });
  it('matches at exact 3-day boundary', () => {
    const out = markDuplicates([row(2, '2026-10-01', -999, 'A')], [existing('1', '2026-10-04', -999, 'A')]);
    expect(out[0].status).toBe('duplicate');
  });
});

describe('dateWindow', () => {
  it('pads by 3 days across month boundaries', () => {
    expect(dateWindow([row(2, '2026-10-01', 1, 'a'), row(3, '2026-08-30', 1, 'b'), row(4, '', 0, '', 'invalid')])).toEqual({
      from: '20260827', to: '20261004', minDate: '2026-08-30', maxDate: '2026-10-01',
    });
  });
  it('returns null without valid rows', () => {
    expect(dateWindow([row(2, '', 0, '', 'invalid')])).toBeNull();
  });
});
