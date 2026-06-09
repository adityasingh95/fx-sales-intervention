import type { DealtCcy, Side } from '@/types/deal';

export type QuoteSide = 'BID' | 'ASK' | 'BOTH';

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
