import { describe, expect, it } from 'vitest';
import { summarize } from '../../src/lib/summary';

describe('summarize', () => {
  it('sums included rows only', () => {
    expect(summarize([
      { amountCents: -999, included: true },
      { amountCents: 16394, included: true },
      { amountCents: -500, included: false },
    ])).toEqual({ count: 2, debitCents: -999, creditCents: 16394, netCents: 15395 });
  });
});
