import type { CsvTable } from './parse';
import {
  DATE_FORMATS, detectDateFormat, detectDecimalStyle, parseAmountCents, parseDate,
  type DateFormat, type DecimalStyle,
} from './values';

export type SignMode =
  | { kind: 'signed' }
  | { kind: 'debitCreditColumn'; column: string; debitValue: string; creditValue: string };

export interface ForeignAmount {
  amountColumn: string;
  currencyColumn: string;
  baseCurrency: string;
}

export interface SkipRule {
  column: string;
  equals: string;
}

export interface Mapping {
  dateColumn: string;
  dateFormat: DateFormat | 'auto';
  amountColumn: string;
  decimalStyle: DecimalStyle;
  signMode: SignMode;
  invertSign: boolean;
  descriptionColumns: string[];
  foreignAmount: ForeignAmount | null;
  skipRules: SkipRule[];
}

export type RowStatus = 'new' | 'duplicate' | 'invalid';

export type RowErrorCode = 'invalidDate' | 'invalidAmount' | 'unknownDebitCredit' | 'zeroAmount' | 'emptyDescription';

export interface RowError {
  code: RowErrorCode;
  value?: string;
}

export interface ParsedRow {
  rowNumber: number;
  date: string;
  amountCents: number;
  message: string;
  status: RowStatus;
  error?: RowError;
}

export function cell(table: CsvTable, row: string[], column: string): string | undefined {
  const index = table.headers.indexOf(column);
  return index < 0 ? undefined : row[index]?.trim();
}

function isPresent(value: string | undefined): value is string {
  return !!value && value.toLowerCase() !== 'null';
}

function buildMessage(table: CsvTable, row: string[], mapping: Mapping): string {
  const parts = mapping.descriptionColumns.map((c) => cell(table, row, c)).filter(isPresent);
  const foreign = mapping.foreignAmount;
  if (foreign) {
    const currency = cell(table, row, foreign.currencyColumn);
    const amount = cell(table, row, foreign.amountColumn);
    if (isPresent(currency) && isPresent(amount) && currency.toUpperCase() !== foreign.baseCurrency.toUpperCase()) {
      parts.push(`${currency} ${amount}`);
    }
  }
  return parts.join(' · ');
}

function resolveDateFormat(table: CsvTable, mapping: Mapping): DateFormat | null {
  if (mapping.dateFormat !== 'auto') return mapping.dateFormat;
  const values = table.rows
    .map((r) => cell(table, r, mapping.dateColumn) ?? '')
    .filter((v) => DATE_FORMATS.some((f) => parseDate(v, f) !== null));
  return detectDateFormat(values);
}

export function applyMapping(table: CsvTable, mapping: Mapping): ParsedRow[] {
  const dateFormat = resolveDateFormat(table, mapping);
  return table.rows.flatMap((row, i): ParsedRow[] => {
    if (mapping.skipRules.some((r) => (cell(table, row, r.column) ?? '') === r.equals.trim())) return [];
    const rowNumber = i + 2;
    const message = buildMessage(table, row, mapping);
    const invalid = (error: RowError): ParsedRow[] => [{ rowNumber, date: '', amountCents: 0, message, status: 'invalid', error }];

    const rawDate = cell(table, row, mapping.dateColumn) ?? '';
    const date = dateFormat ? parseDate(rawDate, dateFormat) : null;
    if (!date) return invalid({ code: 'invalidDate', value: rawDate });

    const rawAmount = cell(table, row, mapping.amountColumn) ?? '';
    let cents = parseAmountCents(rawAmount, mapping.decimalStyle);
    if (cents === null) return invalid({ code: 'invalidAmount', value: rawAmount });

    const sign = mapping.signMode;
    if (sign.kind === 'debitCreditColumn') {
      const value = (cell(table, row, sign.column) ?? '').toUpperCase();
      if (value === sign.debitValue.toUpperCase()) cents = -Math.abs(cents);
      else if (value === sign.creditValue.toUpperCase()) cents = Math.abs(cents);
      else return invalid({ code: 'unknownDebitCredit', value: cell(table, row, sign.column) ?? '' });
    }
    if (mapping.invertSign) cents = -cents;
    cents = cents || 0;
    if (cents === 0) return invalid({ code: 'zeroAmount' });
    if (!message) return invalid({ code: 'emptyDescription' });

    return [{ rowNumber, date, amountCents: cents, message, status: 'new' }];
  });
}

function findHeader(headers: string[], pattern: RegExp): string | undefined {
  return headers.find((h) => pattern.test(h));
}

export function suggestMapping(table: CsvTable): Mapping {
  const { headers } = table;
  const column = (name: string) => table.rows.map((r) => cell(table, r, name) ?? '');
  const dateColumn = findHeader(headers, /date|datum/i) ?? headers[0] ?? '';
  const amountColumn = findHeader(headers, /amount|bedrag/i) ?? headers[1] ?? headers[0] ?? '';
  const descriptionColumn = findHeader(headers, /omschrijving|description|memo|naam|name/i);

  let signMode: SignMode = { kind: 'signed' };
  const dcColumn = findHeader(headers, /debit.?\/?.?credit|af.?\/?.?bij/i);
  if (dcColumn) {
    const values = new Set(column(dcColumn).map((v) => v.toUpperCase()));
    if (values.has('D') || values.has('C')) signMode = { kind: 'debitCreditColumn', column: dcColumn, debitValue: 'D', creditValue: 'C' };
    else if (values.has('AF') || values.has('BIJ')) signMode = { kind: 'debitCreditColumn', column: dcColumn, debitValue: 'Af', creditValue: 'Bij' };
  }

  return {
    dateColumn,
    dateFormat: 'auto',
    amountColumn,
    decimalStyle: detectDecimalStyle(column(amountColumn)),
    signMode,
    invertSign: false,
    descriptionColumns: descriptionColumn ? [descriptionColumn] : [],
    foreignAmount: null,
    skipRules: [],
  };
}
