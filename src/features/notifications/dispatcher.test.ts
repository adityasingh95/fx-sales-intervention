import { describe, expect, it } from 'vitest';
import type { DealEntry } from '@/state/stores/dealsStore';
import type { Deal } from '@/types/deal';
import { buildMessage } from './dispatcher';

// formatAmount inserts a NBSP (U+00A0) between value and ccy. Match it.
const NBSP = ' ';

const makeEntry = (deal: Partial<Deal> = {}): DealEntry => ({
  deal: {
    dealId: 'd_1',
    clientName: 'Test Client',
    accountCode: 'TEST-1',
    pair: 'EURUSD',
    side: 'BUY',
    dealtCcy: 'BASE',
    notional: 1_000_000,
    tenor: 'SPOT',
    defaultMarginPips: 3,
    createdAt: 0,
    ...deal,
  },
  // Remaining DealEntry fields aren't read by buildMessage; cast to keep
  // the test scoped to message-formatting logic only.
} as unknown as DealEntry);

describe('buildMessage', () => {
  it('formats a BUY base-dealt request', () => {
    const msg = buildMessage(
      makeEntry({
        clientName: 'Acme Corp',
        pair: 'EURUSD',
        side: 'BUY',
        dealtCcy: 'BASE',
        notional: 1_000_000,
      }),
    );
    expect(msg).toBe(`New SI request: Acme Corp wants to buy 1,000,000${NBSP}EUR EURUSD.`);
  });

  it('formats a SELL base-dealt request with USD notional in USDJPY', () => {
    const msg = buildMessage(
      makeEntry({
        clientName: 'Globex Industries',
        pair: 'USDJPY',
        side: 'SELL',
        dealtCcy: 'BASE',
        notional: 5_000_000,
      }),
    );
    expect(msg).toBe(`New SI request: Globex Industries wants to sell 5,000,000${NBSP}USD USDJPY.`);
  });

  it('formats a SELL quote-dealt request — uses the quote currency code', () => {
    const msg = buildMessage(
      makeEntry({
        clientName: 'Northwind FX',
        pair: 'USDJPY',
        side: 'SELL',
        dealtCcy: 'QUOTE',
        notional: 1_000_000_000,
      }),
    );
    expect(msg).toBe(`New SI request: Northwind FX wants to sell 1,000,000,000${NBSP}JPY USDJPY.`);
  });

  it('formats a BOTH request — uses the neutral verb "trade"', () => {
    const msg = buildMessage(
      makeEntry({
        clientName: 'Acme Corp',
        pair: 'EURUSD',
        side: 'BOTH',
        dealtCcy: 'BASE',
        notional: 8_000_000,
      }),
    );
    expect(msg).toBe(`New SI request: Acme Corp wants to trade 8,000,000${NBSP}EUR EURUSD.`);
  });
});
