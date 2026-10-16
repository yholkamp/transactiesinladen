import { describe, expect, it } from 'vitest';
import {
  detectDateFormat, detectDecimalStyle, formatCents, formatDisplay, parseAmountCents, parseDate,
} from '../../src/lib/csv/values';

describe('parseAmountCents', () => {
  it.each([
    ['9,99', 'comma', 999],
    ['-163,94', 'comma', -16394],
    ['1.234,56', 'comma', 123456],
    ['1234', 'comma', 123400],
    ['1,234.56', 'dot', 123456],
    ['+4.5', 'dot', 450],
    ['(12.00)', 'dot', -1200],
    ['12.00-', 'dot', -1200],
    ['€ 7,10', 'comma', 710],
    ['0,00', 'comma', 0],
  ] as const)('%s (%s) -> %d', (raw, style, cents) => {
    expect(parseAmountCents(raw, style)).toBe(cents);
  });

  it.each([[''], ['abc'], ['1,2,3'], ['12,345']])('rejects %s', (raw) => {
    expect(parseAmountCents(raw, 'comma')).toBeNull();
  });

  it('rejects misplaced thousands separators', () => {
    expect(parseAmountCents('12.50', 'comma')).toBeNull();
    expect(parseAmountCents('1.2.3', 'comma')).toBeNull();
    expect(parseAmountCents('12,50', 'dot')).toBeNull();
  });

  it('accepts valid thousands groups', () => {
    expect(parseAmountCents('1.234,56', 'comma')).toBe(123456);
    expect(parseAmountCents('12.345.678,90', 'comma')).toBe(1234567890);
    expect(parseAmountCents('1,234,567.89', 'dot')).toBe(123456789);
  });

  it('never returns negative zero', () => {
    expect(Object.is(parseAmountCents('-0,00', 'comma'), -0)).toBe(false);
  });
});

describe('formatCents', () => {
  it.each([[999, '9.99'], [-16394, '-163.94'], [5, '0.05'], [-5, '-0.05'], [0, '0.00']])(
    '%d -> %s', (cents, out) => expect(formatCents(cents)).toBe(out),
  );
});

describe('parseDate', () => {
  it('parses DD-MM-YYYY', () => expect(parseDate('01-10-2026', 'DD-MM-YYYY')).toBe('2026-10-01'));
  it('parses YYYY-MM-DD', () => expect(parseDate('2026-10-01', 'YYYY-MM-DD')).toBe('2026-10-01'));
  it('parses MM/DD/YYYY', () => expect(parseDate('10/01/2026', 'MM/DD/YYYY')).toBe('2026-10-01'));
  it('ignores a time part', () => expect(parseDate('2026-10-01 13:45', 'YYYY-MM-DD')).toBe('2026-10-01'));
  it('rejects impossible dates', () => expect(parseDate('31-02-2026', 'DD-MM-YYYY')).toBeNull());
  it('rejects garbage', () => expect(parseDate('yesterday', 'DD-MM-YYYY')).toBeNull());
});

describe('detectDateFormat', () => {
  it('detects DD-MM-YYYY', () => expect(detectDateFormat(['01-10-2026', '28-09-2026', ''])).toBe('DD-MM-YYYY'));
  it('detects ISO', () => expect(detectDateFormat(['2026-10-01'])).toBe('YYYY-MM-DD'));
  it('detects US when day > 12', () => expect(detectDateFormat(['10/25/2026'])).toBe('MM/DD/YYYY'));
  it('returns null when nothing fits', () => expect(detectDateFormat(['nope'])).toBeNull());
});

describe('detectDecimalStyle', () => {
  it('detects comma', () => expect(detectDecimalStyle(['9,99', '-163,94', '1.234,56'])).toBe('comma'));
  it('detects dot', () => expect(detectDecimalStyle(['9.99', '1,234.56'])).toBe('dot'));
  it('defaults to dot', () => expect(detectDecimalStyle(['12', ''])).toBe('dot'));
});

describe('formatDisplay', () => {
  it('formats euros in Dutch by default', () => {
    expect(formatDisplay(-16394).replace(/\s/g, ' ')).toBe('€ -163,94');
  });
  it('formats euros for another locale', () => {
    expect(formatDisplay(-16394, 'en-GB').replace(/\s/g, ' ')).toBe('-€163.94');
  });
});
