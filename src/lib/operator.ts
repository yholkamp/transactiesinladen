export interface Operator {
  name: string;
  email: string;
  street?: string;
  city?: string;
  kvk?: string;
  court?: string;
}

function value(env: Record<string, unknown>, key: string): string | undefined {
  const v = env[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

// Operator details for the legal pages and the contact link, set at build time via VITE_LEGAL_*.
// Without a name and email the legal pages, the consent notice and the contact link are left out.
export function operatorFromEnv(env: Record<string, unknown>): Operator | null {
  const name = value(env, 'VITE_LEGAL_NAME');
  const email = value(env, 'VITE_LEGAL_EMAIL');
  if (!name || !email) return null;
  return {
    name,
    email,
    street: value(env, 'VITE_LEGAL_STREET'),
    city: value(env, 'VITE_LEGAL_CITY'),
    kvk: value(env, 'VITE_LEGAL_KVK'),
    court: value(env, 'VITE_LEGAL_COURT'),
  };
}

export const OPERATOR = operatorFromEnv(import.meta.env);
