export interface Analytics {
  host: string;
  scriptUrl: string;
}

export const DEFAULT_PLAUSIBLE_HOST = 'https://plausible.nextpulse.net';

// Plausible Analytics host, set at build time via VITE_PLAUSIBLE_HOST (e.g. https://plausible.example.com).
// Unset or empty uses DEFAULT_PLAUSIBLE_HOST; "off" loads no analytics script and leaves the statistics
// section out of the privacy policy.
export function analyticsFromEnv(env: Record<string, unknown>): Analytics | null {
  const v = env.VITE_PLAUSIBLE_HOST;
  const value = typeof v === 'string' && v.trim() ? v.trim() : DEFAULT_PLAUSIBLE_HOST;
  if (value.toLowerCase() === 'off') return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  return { host: url.host, scriptUrl: `${url.origin}/js/script.js` };
}

// The Plausible site is the hostname the tool is served on, without "www.".
export function siteDomain(hostname: string): string {
  return hostname.replace(/^www\./i, '');
}

export function loadAnalytics(analytics: Analytics | null): void {
  if (!analytics) return;
  const script = document.createElement('script');
  script.dataset.domain = siteDomain(window.location.hostname);
  script.src = analytics.scriptUrl;
  document.head.appendChild(script);
}

export const ANALYTICS = analyticsFromEnv(import.meta.env);
