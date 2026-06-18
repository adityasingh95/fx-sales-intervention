import type { DealtCcy, Side } from '@/types/deal';

export type QuoteSide = 'BID' | 'ASK' | 'BOTH';

// The single side a deal is actually dealt on at execution. A two-way ('BOTH')
// request is quoted on both sides but the client only ever trades on one of them
// (FXSW-092), so the executed side narrows to BID or ASK.
export type DealtSide = 'BID' | 'ASK';

// The client's trade direction implied by the bank's dealt side. Bank BID = bank
// buys base = client sells base; bank ASK = bank sells base = client buys base.
// Bid/ask are defined on the base-currency convention, so this is independent of
// which leg the notional is denominated in.
export function clientDirectionForDealtSide(side: DealtSide, pair: string): string {
  const base = pair.slice(0, 3);
  return side === 'BID' ? `Client sells ${base}` : `Client buys ${base}`;
}

// Given a client request direction + which leg of the pair the notional
// is denominated in, returns which side the bank quotes. See
// docs/02-functional-spec.md §7.3 for the full truth table.
//
// BUY  base  → bank sells base                    → ASK
// SELL base  → bank buys base                     → BID
// BUY  quote → bank buys base (= sells quote)     → BID
// SELL quote → bank sells base (= buys quote)     → ASK
// BOTH       → two-sided                          → BOTH
export function quoteSideFor(side: Side, dealtCcy: DealtCcy): QuoteSide {
  if (side === 'BOTH') return 'BOTH';
  if (dealtCcy === 'BASE') return side === 'BUY' ? 'ASK' : 'BID';
  return side === 'BUY' ? 'BID' : 'ASK';
}
