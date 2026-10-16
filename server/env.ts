export interface Env {
  MONEYBIRD_CLIENT_ID: string;
  MONEYBIRD_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

export interface Ctx {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}

export type Handler = (ctx: Ctx) => Promise<Response>;
