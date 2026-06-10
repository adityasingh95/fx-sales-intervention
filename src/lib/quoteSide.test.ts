import { describe, expect, it } from 'vitest';
import { quoteSideFor } from './quoteSide';

describe('quoteSideFor', () => {
  it('BUY base → ASK (bank sells base)', () => {
    expect(quoteSideFor('BUY', 'BASE')).toBe('ASK');
  });

  it('SELL base → BID (bank buys base)', () => {
    expect(quoteSideFor('SELL', 'BASE')).toBe('BID');
  });

  it('BUY quote → BID (bank buys base = sells quote)', () => {
    expect(quoteSideFor('BUY', 'QUOTE')).toBe('BID');
  });

  it('SELL quote → ASK (bank sells base = buys quote)', () => {
    expect(quoteSideFor('SELL', 'QUOTE')).toBe('ASK');
  });

  it('BOTH (any dealtCcy) → BOTH', () => {
    expect(quoteSideFor('BOTH', 'BASE')).toBe('BOTH');
    expect(quoteSideFor('BOTH', 'QUOTE')).toBe('BOTH');
  });
});
