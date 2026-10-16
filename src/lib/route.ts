export type Page = 'app' | 'privacy' | 'terms';

const PAGES: Record<string, Page> = {
  '/privacy': 'privacy',
  '/voorwaarden': 'terms',
};

export function pageForPath(pathname: string): Page {
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  return Object.hasOwn(PAGES, path) ? PAGES[path] : 'app';
}
