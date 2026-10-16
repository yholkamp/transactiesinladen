import { param, withMoneybird } from '../../../server/handler';
import { errorResponse, json } from '../../../server/http';

interface MbMutation { id: string | number; date: string; amount: string; message: string | null }

const PER_PAGE = 100;
const MAX_PAGES = 45;

export const onRequestGet = withMoneybird(async (ctx, client) => {
  const admin = param(ctx, 'admin');
  const query = new URL(ctx.request.url).searchParams;
  const account = query.get('account') ?? '';
  const from = query.get('from') ?? '';
  const to = query.get('to') ?? '';
  if (!/^\d+$/.test(admin) || !/^\d+$/.test(account) || !/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) {
    return errorResponse(400, 'Invalid parameters');
  }

  const filter = `financial_account_id:${account},period:${from}..${to}`;
  const out: { id: string; date: string; amountCents: number; message: string }[] = [];
  let truncated = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({ filter, per_page: String(PER_PAGE), page: String(page) });
    const batch = await client.request<MbMutation[]>(`/${admin}/financial_mutations.json?${params}`);
    for (const m of batch) {
      out.push({ id: String(m.id), date: m.date, amountCents: Math.round(Number(m.amount) * 100), message: m.message ?? '' });
    }
    if (batch.length < PER_PAGE) break;
    if (page === MAX_PAGES) truncated = true;
  }
  if (truncated) return errorResponse(502, 'Too many existing mutations to check for duplicates; import a smaller date range');
  return json(out);
});
