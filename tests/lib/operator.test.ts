import { describe, expect, it } from 'vitest';
import { operatorFromEnv } from '../../src/lib/operator';

describe('operatorFromEnv', () => {
  it('is disabled without a name and email', () => {
    expect(operatorFromEnv({})).toBeNull();
    expect(operatorFromEnv({ VITE_LEGAL_NAME: 'Voorbeeld B.V.' })).toBeNull();
    expect(operatorFromEnv({ VITE_LEGAL_EMAIL: 'info@example.com' })).toBeNull();
    expect(operatorFromEnv({ VITE_LEGAL_NAME: ' ', VITE_LEGAL_EMAIL: 'info@example.com' })).toBeNull();
  });
  it('reads the operator details', () => {
    expect(operatorFromEnv({
      VITE_LEGAL_NAME: ' Voorbeeld B.V. ',
      VITE_LEGAL_EMAIL: 'info@example.com',
      VITE_LEGAL_STREET: 'Straat 1',
      VITE_LEGAL_CITY: '1234 AB Plaats',
      VITE_LEGAL_KVK: '12345678',
      VITE_LEGAL_COURT: 'Amsterdam',
    })).toEqual({
      name: 'Voorbeeld B.V.',
      email: 'info@example.com',
      street: 'Straat 1',
      city: '1234 AB Plaats',
      kvk: '12345678',
      court: 'Amsterdam',
    });
  });
  it('leaves out empty optional details', () => {
    expect(operatorFromEnv({
      VITE_LEGAL_NAME: 'Jan Jansen',
      VITE_LEGAL_EMAIL: 'jan@example.com',
      VITE_LEGAL_KVK: '',
      PROD: true,
    })).toEqual({ name: 'Jan Jansen', email: 'jan@example.com' });
  });
});
