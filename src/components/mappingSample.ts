import { rowErrorText, type Messages } from '../i18n';
import { cell, type Mapping, type ParsedRow, type RowErrorCode } from '../lib/csv/mapping';
import type { CsvTable } from '../lib/csv/parse';
import { formatDisplay } from '../lib/csv/values';

export interface SampleValue {
  raw: string;
  result: string | null;
  error: string | null;
}

export interface Sample {
  date: SampleValue;
  amount: SampleValue;
  description: SampleValue;
}

type Field = keyof Sample;

const ERROR_FIELD: Record<RowErrorCode, Field> = {
  invalidDate: 'date',
  invalidAmount: 'amount',
  unknownDebitCredit: 'amount',
  zeroAmount: 'amount',
  emptyDescription: 'description',
};

function formatDate(iso: string, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return format.format(new Date(`${iso}T00:00:00Z`));
}

// Describes how the first data row is read with the current mapping, field by field.
export function describeSample(t: Messages, locale: string, table: CsvTable, mapping: Mapping, row: ParsedRow | undefined): Sample | null {
  if (!row) return null;
  const raw = table.rows[row.rowNumber - 2] ?? [];
  const valid = row.status !== 'invalid';
  const errorField = row.error ? ERROR_FIELD[row.error.code] : null;
  const error = row.error ? rowErrorText(t, row.error) : null;
  const value = (field: Field, rawValue: string, result: string): SampleValue => ({
    raw: rawValue,
    result: valid ? result : null,
    error: errorField === field ? error : null,
  });

  const rawDate = cell(table, raw, mapping.dateColumn) ?? '';
  const sign = mapping.signMode;
  const rawAmount = [
    cell(table, raw, mapping.amountColumn),
    sign.kind === 'debitCreditColumn' ? cell(table, raw, sign.column) : undefined,
  ].filter(Boolean).join(' ');

  return {
    date: value('date', rawDate, valid ? formatDate(row.date, locale) : ''),
    amount: value('amount', rawAmount, formatDisplay(row.amountCents, locale)),
    description: value('description', row.message, row.message),
  };
}
