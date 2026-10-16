export type DecimalStyle = 'comma' | 'dot';
export type DateFormat = 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';

export const DATE_FORMATS: DateFormat[] = ['DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'];

export function parseAmountCents(raw: string, style: DecimalStyle): number | null {
  let s = raw.replace(/[\s€$£]/g, '');
  if (!s) return null;
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (s.endsWith('-')) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  const [thousands, decimal] = style === 'comma' ? ['.', ','] : [',', '.'];
  const esc = (c: string) => `\\${c}`;
  const re = new RegExp(`^(\\d+|\\d{1,3}(?:${esc(thousands)}\\d{3})+)(?:${esc(decimal)}(\\d{1,2}))?$`);
  const match = s.match(re);
  if (!match) return null;
  const cents = Number(match[1].split(thousands).join('')) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return negative && cents !== 0 ? -cents : cents;
}

export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

const displayFormats = new Map<string, Intl.NumberFormat>();

export function formatDisplay(cents: number, locale = 'nl-NL'): string {
  let format = displayFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
    displayFormats.set(locale, format);
  }
  return format.format(cents / 100);
}

const DATE_PATTERNS: Record<DateFormat, { re: RegExp; order: ['d' | 'm' | 'y', 'd' | 'm' | 'y', 'd' | 'm' | 'y'] }> = {
  'DD-MM-YYYY': { re: /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/, order: ['d', 'm', 'y'] },
  'YYYY-MM-DD': { re: /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/, order: ['y', 'm', 'd'] },
  'MM/DD/YYYY': { re: /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/, order: ['m', 'd', 'y'] },
};

export function parseDate(raw: string, format: DateFormat): string | null {
  const value = raw.trim().split(/[ T]/)[0];
  const { re, order } = DATE_PATTERNS[format];
  const match = value.match(re);
  if (!match) return null;
  const parts: Record<string, number> = {};
  order.forEach((key, i) => { parts[key] = Number(match[i + 1]); });
  const { y, m, d } = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function detectDateFormat(values: string[]): DateFormat | null {
  const present = values.map((v) => v.trim()).filter(Boolean);
  if (present.length === 0) return null;
  return DATE_FORMATS.find((f) => present.every((v) => parseDate(v, f) !== null)) ?? null;
}

export function detectDecimalStyle(values: string[]): DecimalStyle {
  let comma = 0;
  let dot = 0;
  for (const v of values) {
    const m = v.trim().match(/([.,])(\d{1,2})\)?-?$/);
    if (!m) continue;
    if (m[1] === ',') comma++;
    else dot++;
  }
  return comma > dot ? 'comma' : 'dot';
}
