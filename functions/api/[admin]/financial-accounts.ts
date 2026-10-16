import { param, withMoneybird } from '../../../server/handler';
import { errorResponse, json } from '../../../server/http';

interface MbFinancialAccount {
  id: string | number;
  name: string;
  type: string;
  identifier: string | null;
  currency: string;
  active: boolean;
}

export const onRequestGet = withMoneybird(async (ctx, client) => {
  const admin = param(ctx, 'admin');
  if (!/^\d+$/.test(admin)) return errorResponse(400, 'Invalid administration id');
  const list = await client.request<MbFinancialAccount[]>(`/${admin}/financial_accounts.json`);
  const accounts = list
    .filter((a) => a.active)
    .map((a) => ({ id: String(a.id), name: a.name, type: a.type, identifier: a.identifier, currency: a.currency }))
    .sort((a, b) => Number(b.type === 'CreditCardAccount') - Number(a.type === 'CreditCardAccount') || a.name.localeCompare(b.name));
  return json(accounts);
});
