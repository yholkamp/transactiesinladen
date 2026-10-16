import { getCookie, SESSION_COOKIE, SESSION_MAX_AGE, setCookie } from './cookies';
import type { Env } from './env';

export interface Session {
  access_token: string;
  refresh_token?: string;
}

const encoder = new TextEncoder();

async function deriveKey(secret: string): Promise<CryptoKey> {
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters');
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('mb-cc-import'), info: encoder.encode('session-v1') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function encryptSession(session: Session, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(session))));
  const out = new Uint8Array(iv.length + ciphertext.length);
  out.set(iv);
  out.set(ciphertext, iv.length);
  return toBase64Url(out);
}

export async function decryptSession(value: string, secret: string): Promise<Session | null> {
  const key = await deriveKey(secret);
  try {
    const bytes = fromBase64Url(value);
    if (bytes.length <= 12) return null;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    const parsed = JSON.parse(new TextDecoder().decode(plain)) as Partial<Session>;
    if (typeof parsed.access_token !== 'string') return null;
    return { access_token: parsed.access_token, refresh_token: parsed.refresh_token };
  } catch {
    return null;
  }
}

export async function readSession(request: Request, env: Env): Promise<Session | null> {
  const raw = getCookie(request, SESSION_COOKIE);
  return raw ? decryptSession(raw, env.SESSION_SECRET) : null;
}

export async function sessionCookie(session: Session, env: Env): Promise<string> {
  return setCookie(SESSION_COOKIE, await encryptSession(session, env.SESSION_SECRET), SESSION_MAX_AGE);
}
