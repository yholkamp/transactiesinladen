import { describe, expect, it } from 'vitest';
import { decryptSession, encryptSession, readSession } from '../../server/session';
import { cookieHeader, env } from '../helpers';

describe('session crypto', () => {
  it('round-trips', async () => {
    const value = await encryptSession({ access_token: 'a', refresh_token: 'r' }, 'secret-1-secret-1-secret-1-secret-1-xx');
    expect(await decryptSession(value, 'secret-1-secret-1-secret-1-secret-1-xx')).toEqual({ access_token: 'a', refresh_token: 'r' });
  });
  it('uses a random IV', async () => {
    const s = { access_token: 'a' };
    expect(await encryptSession(s, 'k-key-k-key-k-key-k-key-k-key-k-key-')).not.toBe(await encryptSession(s, 'k-key-k-key-k-key-k-key-k-key-k-key-'));
  });
  it('rejects a wrong secret', async () => {
    const value = await encryptSession({ access_token: 'a' }, 'secret-1-secret-1-secret-1-secret-1-xx');
    expect(await decryptSession(value, 'secret-2-secret-2-secret-2-secret-2-xx')).toBeNull();
  });
  it('rejects tampering and garbage', async () => {
    const value = await encryptSession({ access_token: 'a' }, 'k-key-k-key-k-key-k-key-k-key-k-key-');
    const i = 20; // inside the ciphertext, a char whose 6 bits are all significant
    const tampered = value.slice(0, i) + (value[i] === 'A' ? 'B' : 'A') + value.slice(i + 1);
    expect(await decryptSession(tampered, 'k-key-k-key-k-key-k-key-k-key-k-key-')).toBeNull();
    expect(await decryptSession('not-base64!!', 'k-key-k-key-k-key-k-key-k-key-k-key-')).toBeNull();
    expect(await decryptSession('', 'k-key-k-key-k-key-k-key-k-key-k-key-')).toBeNull();
  });
  it('fails closed on a missing or short secret', async () => {
    await expect(encryptSession({ access_token: 'a' }, '')).rejects.toThrow('SESSION_SECRET must be set');
    await expect(encryptSession({ access_token: 'a' }, 'short')).rejects.toThrow('SESSION_SECRET must be set');
    const value = await encryptSession({ access_token: 'a' }, 'k-key-k-key-k-key-k-key-k-key-k-key-');
    await expect(decryptSession(value, '')).rejects.toThrow('SESSION_SECRET must be set');
  });
  it('reads from a request cookie', async () => {
    const request = new Request('https://x/', { headers: { Cookie: `other=1; ${await cookieHeader()}` } });
    expect(await readSession(request, env)).toEqual({ access_token: 'at', refresh_token: 'rt' });
    expect(await readSession(new Request('https://x/'), env)).toBeNull();
  });
});
