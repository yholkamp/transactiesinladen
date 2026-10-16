export interface Administration {
  id: string;
  name: string;
  currency: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  identifier: string | null;
  currency: string;
}

export interface StatementMutation {
  date: string;
  message: string;
  amount: string;
}

export interface ImportPayload {
  financial_account_id: string;
  reference: string;
  mutations: StatementMutation[];
}

export interface ChunkResult {
  reference: string;
  count: number;
  ok: boolean;
  id?: string;
  error?: unknown;
}
