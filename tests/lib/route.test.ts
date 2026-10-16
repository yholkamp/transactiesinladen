import { describe, expect, it } from 'vitest';
import { pageForPath } from '../../src/lib/route';

describe('pageForPath', () => {
  it('maps legal paths', () => {
    expect(pageForPath('/privacy')).toBe('privacy');
    expect(pageForPath('/privacy/')).toBe('privacy');
    expect(pageForPath('/voorwaarden')).toBe('terms');
    expect(pageForPath('/VOORWAARDEN')).toBe('terms');
  });
  it('falls back to the app', () => {
    expect(pageForPath('/')).toBe('app');
    expect(pageForPath('/index.html')).toBe('app');
    expect(pageForPath('/something-else')).toBe('app');
  });
});
