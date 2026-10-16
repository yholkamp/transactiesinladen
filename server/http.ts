export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('Content-Type', 'application/json');
  h.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: h });
}

export function errorResponse(status: number, error: string, details?: unknown, headers: HeadersInit = {}): Response {
  return json(details === undefined ? { error } : { error, details }, status, headers);
}

export function redirect(location: string, cookies: string[] = []): Response {
  const h = new Headers({ Location: location });
  for (const cookie of cookies) h.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers: h });
}

export function isSameOrigin(request: Request): boolean {
  return request.headers.get('Origin') === new URL(request.url).origin;
}
