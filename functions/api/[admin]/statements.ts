import { chunk } from '../../../server/chunk';
import { param, withMoneybird } from '../../../server/handler';
import { errorResponse, json } from '../../../server/http';
import { MoneybirdError } from '../../../server/moneybird';

const CHUNK_SIZE = 500;
const MAX_MUTATIONS = 5000;

interface MutationInput { date: string; message: string; amount: string }
interface StatementInput { financial_account_id: string; reference: string; mutations: MutationInput[] }

function isMutation(m: unknown): m is MutationInput {
  if (!m || typeof m !== 'object') return false;
  const { date, message, amount } = m as Record<string, unknown>;
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && typeof message === 'string' && message.trim() !== ''
    && typeof amount === 'string' && /^-?\d+\.\d{2}$/.test(amount);
}

function parseBody(body: unknown): StatementInput | null {
  if (!body || typeof body !== 'object') return null;
  const { financial_account_id, reference, mutations } = body as Record<string, unknown>;
  if (typeof financial_account_id !== 'string' || !/^\d+$/.test(financial_account_id)) return null;
  if (typeof reference !== 'string' || reference.trim() === '') return null;
  if (!Array.isArray(mutations) || mutations.length === 0 || mutations.length > MAX_MUTATIONS || !mutations.every(isMutation)) return null;
  return {
    financial_account_id,
    reference: reference.trim(),
    mutations: mutations.map(({ date, message, amount }) => ({ date, message, amount })),
  };
}

export const onRequestPost = withMoneybird(async (ctx, client) => {
  const admin = param(ctx, 'admin');
  if (!/^\d+$/.test(admin)) return errorResponse(400, 'Invalid administration id');
  const input = parseBody(await ctx.request.json().catch(() => null));
  if (!input) return errorResponse(400, 'Invalid statement');

  const chunks = chunk(input.mutations, CHUNK_SIZE);
  const results: { reference: string; count: number; ok: boolean; id?: string; error?: unknown }[] = [];
  for (const [i, part] of chunks.entries()) {
    const reference = chunks.length > 1 ? `${input.reference} (${i + 1}/${chunks.length})` : input.reference;
    try {
      const created = await client.request<{ id: string | number }>(`/${admin}/financial_statements.json`, {
        method: 'POST',
        body: {
          financial_statement: {
            financial_account_id: input.financial_account_id,
            reference,
            financial_mutations_attributes: Object.fromEntries(part.map((m, j) => [String(j), m])),
          },
        },
      });
      results.push({ reference, count: part.length, ok: true, id: String(created.id) });
    } catch (e) {
      const isApiError = e instanceof MoneybirdError;
      // Before any success, let 401s and unexpected errors propagate; afterwards keep partial results.
      if (results.length === 0 && (!isApiError || e.status === 401)) throw e;
      const error = isApiError ? e.body : e instanceof Error ? e.message : String(e);
      results.push({ reference, count: part.length, ok: false, error });
      break;
    }
  }
  return json({ results });
});
