import { describe, expect, it } from 'vitest';
import { clearCookie, getCookie, setCookie } from '../../server/cookies';

describe('cookies', () => {
  it('reads a cookie among others', () => {
    const r = new Request('https://x/', { headers: { Cookie: 'a=1; b=hello%3Dworld; c=3' } });
    expect(getCookie(r, 'b')).toBe('hello=world');
    expect(getCookie(r, 'missing')).toBeNull();
  });
  it('serializes with secure attributes', () => {
    expect(setCookie('n', 'v=1', 60)).toBe('n=v%3D1; Max-Age=60; Path=/; HttpOnly; Secure; SameSite=Lax');
    expect(clearCookie('n')).toBe('n=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  });
});
