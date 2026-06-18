import { describe, expect, it } from 'vitest';
import { clientSideLabelForDealtSide, quoteSideFor } from './quoteSide';

describe('clientSideLabelForDealtSide', () => {
  it('bank BID → Client Ask (bank buying, client offering)', () => {
    expect(clientSideLabelForDealtSide('BID')).toBe('Client Ask');
  });

  it('bank ASK → Client Bid (bank selling, client buying)', () => {
    expect(clientSideLabelForDealtSide('ASK')).toBe('Client Bid');
  });
});

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
