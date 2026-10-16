import type { ParsedRow } from './csv/mapping';

export interface ExistingMutation {
  id: string;
  date: string;
  amountCents: number;
  message: string;
}

export interface DateWindow {
  from: string;
  to: string;
  minDate: string;
  maxDate: string;
}

const DAY_MS = 86_400_000;

export function normalizeMessage(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function messagesMatch(a: string, b: string): boolean {
  const x = normalizeMessage(a);
  const y = normalizeMessage(b);
  if (!x || !y) return false;
  return x.startsWith(y) || y.startsWith(x);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / DAY_MS;
}

export function markDuplicates(rows: ParsedRow[], existing: ExistingMutation[], toleranceDays = 3): ParsedRow[] {
  // Build all candidate pairs (row index, existing index, distance)
  interface Candidate {
    rowIndex: number;
    existingIndex: number;
    distance: number;
  }
  const candidates: Candidate[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    if (row.status === 'invalid') continue;

    for (let ei = 0; ei < existing.length; ei++) {
      const m = existing[ei];
      if (m.amountCents !== row.amountCents) continue;

      const distance = daysBetween(row.date, m.date);
      if (distance > toleranceDays || !messagesMatch(row.message, m.message)) continue;

      candidates.push({ rowIndex: ri, existingIndex: ei, distance });
    }
  }

  // Sort by distance (stable: ties broken by row index, then existing index)
  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
    return a.existingIndex - b.existingIndex;
  });

  // Assign greedily
  const usedRows = new Set<number>();
  const usedExisting = new Set<number>();
  for (const { rowIndex, existingIndex } of candidates) {
    if (!usedRows.has(rowIndex) && !usedExisting.has(existingIndex)) {
      usedRows.add(rowIndex);
      usedExisting.add(existingIndex);
    }
  }

  // Build result
  return rows.map((row, index) => {
    if (row.status === 'invalid') return row;
    return { ...row, status: usedRows.has(index) ? 'duplicate' : 'new' };
  });
}

function shift(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export function dateWindow(rows: ParsedRow[], padDays = 3): DateWindow | null {
  const dates = rows.filter((r) => r.status !== 'invalid').map((r) => r.date).sort();
  if (dates.length === 0) return null;
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  return {
    from: shift(minDate, -padDays).replaceAll('-', ''),
    to: shift(maxDate, padDays).replaceAll('-', ''),
    minDate,
    maxDate,
  };
}
