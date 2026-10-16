export interface Summary {
  count: number;
  debitCents: number;
  creditCents: number;
  netCents: number;
}

export function summarize(rows: { amountCents: number; included: boolean }[]): Summary {
  const included = rows.filter((r) => r.included);
  const debitCents = included.filter((r) => r.amountCents < 0).reduce((s, r) => s + r.amountCents, 0);
  const creditCents = included.filter((r) => r.amountCents > 0).reduce((s, r) => s + r.amountCents, 0);
  return { count: included.length, debitCents, creditCents, netCents: debitCents + creditCents };
}
