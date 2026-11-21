import { describe, expect, it } from 'vitest';
import { analyticsFromEnv, siteDomain } from '../../src/lib/analytics';

describe('analyticsFromEnv', () => {
  it('defaults to the default host when unset or empty', () => {
    const expected = { host: 'plausible.nextpulse.net', scriptUrl: 'https://plausible.nextpulse.net/js/script.js' };
    expect(analyticsFromEnv({})).toEqual(expected);
    expect(analyticsFromEnv({ VITE_PLAUSIBLE_HOST: ' ' })).toEqual(expected);
  });
  it('is disabled with off or an invalid host', () => {
    expect(analyticsFromEnv({ VITE_PLAUSIBLE_HOST: 'off' })).toBeNull();
    expect(analyticsFromEnv({ VITE_PLAUSIBLE_HOST: ' OFF ' })).toBeNull();
    expect(analyticsFromEnv({ VITE_PLAUSIBLE_HOST: 'not a host' })).toBeNull();
  });
  it('reads a host with or without scheme', () => {
    const expected = { host: 'plausible.example.com', scriptUrl: 'https://plausible.example.com/js/script.js' };
    expect(analyticsFromEnv({ VITE_PLAUSIBLE_HOST: 'plausible.example.com' })).toEqual(expected);
    expect(analyticsFromEnv({ VITE_PLAUSIBLE_HOST: ' https://plausible.example.com/ ' })).toEqual(expected);
  });
  it('keeps an explicit http scheme and port', () => {
    expect(analyticsFromEnv({ VITE_PLAUSIBLE_HOST: 'http://localhost:8000' })).toEqual({
      host: 'localhost:8000',
      scriptUrl: 'http://localhost:8000/js/script.js',
    });
  });
});

describe('siteDomain', () => {
  it('strips a leading www.', () => {
    expect(siteDomain('www.example.nl')).toBe('example.nl');
    expect(siteDomain('example.nl')).toBe('example.nl');
    expect(siteDomain('app.example.nl')).toBe('app.example.nl');
  });
});
