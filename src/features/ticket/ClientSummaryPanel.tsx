import { formatRate } from '@/lib/format';
import {
  clientAskFromTrader,
  clientBidFromTrader,
  estimatedProfitUsd,
} from '@/lib/pips';
import type { Pair, PriceTick } from '@/services/feed/types';
import type { MarginPair } from '@/types/deal';

// Per docs/02 §4.5: read-only preview of what the client sees + the
// estimated profit. Updates live in streaming mode; frozen in fixed
// mode. Parent (TicketPanel) decides which tick (live or frozen) by
// passing the appropriate one as `tick`.
//
// FXSW-039: accepts a MarginPair so bid + ask side markups can differ
// in v2. v1 callers pass both sides equal (the v1 single PricingPanel
// input writes both at once), so behaviour is unchanged for v1.

const PROFIT_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export interface ClientSummaryPanelProps {
  tick: PriceTick | null;
  marginPair: MarginPair;
  notional: number;
  pair: Pair;
}

export default function ClientSummaryPanel({
  tick,
  marginPair,
  notional,
  pair,
}: ClientSummaryPanelProps) {
  const clientBid =
    tick === null ? null : clientBidFromTrader(tick.bid, marginPair.bid, pair);
  const clientAsk =
    tick === null ? null : clientAskFromTrader(tick.ask, marginPair.ask, pair);
  // FXSW-039: still single-line P/L. Use the average of the two side
  // markups; in v1 (bid === ask) this is exactly the v1 number, in v2
  // it's a sensible single-line summary until FXSW-041 splits the
  // display by direction.
  const blendedMargin = (marginPair.bid + marginPair.ask) / 2;
  const profit =
    tick === null ? null : estimatedProfitUsd(blendedMargin, notional, pair, tick.mid);

  return (
    <section
      data-testid="client-summary-panel"
      aria-label="Client Summary"
      className="flex flex-col gap-2"
    >
      <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
        Client Summary
      </h2>
      <div className="grid grid-cols-3 gap-x-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-tight text-text-mute">Client Bid</div>
          <div data-testid="client-bid" className="font-mono tabular-nums text-text">
            {clientBid === null ? '—' : formatRate(clientBid, pair)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-tight text-text-mute">Client Ask</div>
          <div data-testid="client-ask" className="font-mono tabular-nums text-text">
            {clientAsk === null ? '—' : formatRate(clientAsk, pair)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-tight text-text-mute">
            Est. profit
          </div>
          <div
            data-testid="estimated-profit"
            className="font-mono tabular-nums text-text"
          >
            {profit === null ? '—' : PROFIT_FMT.format(profit)}
          </div>
        </div>
      </div>
    </section>
  );
}
