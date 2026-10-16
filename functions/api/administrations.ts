import { withMoneybird } from '../../server/handler';
import { json } from '../../server/http';

interface MbAdministration { id: string | number; name: string; currency: string }

export const onRequestGet = withMoneybird(async (_ctx, client) => {
  const list = await client.request<MbAdministration[]>('/administrations.json');
  return json(list.map((a) => ({ id: String(a.id), name: a.name, currency: a.currency })));
});
