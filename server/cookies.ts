export const SESSION_COOKIE = 'mb_session';
export const STATE_COOKIE = 'mb_oauth_state';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const STATE_MAX_AGE = 600;

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name: string): string {
  return setCookie(name, '', 0);
}
