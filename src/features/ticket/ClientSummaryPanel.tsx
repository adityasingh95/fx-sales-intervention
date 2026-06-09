import { formatRate } from '@/lib/format';
import {
  clientAskFromTrader,
  clientBidFromTrader,
  estimatedProfitUsd,
} from '@/lib/pips';
import type { QuoteSide } from '@/lib/quoteSide';
import type { Pair, PriceTick } from '@/services/feed/types';
import type { MarginPair } from '@/types/deal';

// Per docs/02 §4.5: read-only preview of what the client sees + the
// estimated profit. Updates live in streaming mode; frozen in fixed
// mode. Parent (TicketPanel) decides which tick (live or frozen) by
// passing the appropriate one as `tick`.
//
// FXSW-039 introduced MarginPair so bid/ask side markups can differ.
// FXSW-041 makes the P/L display direction-aware via the optional
// `quoteSide` prop:
//   - BID  → single P/L line using marginPair.bid
//   - ASK  → single P/L line using marginPair.ask
//   - BOTH → two P/L lines side-by-side
//   - undef (v1) → single line using the blended average margin

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
  // FXSW-041: v2 callers pass `quoteSide` to split P/L by direction.
  // v1 omits and falls back to a single blended-margin line.
  quoteSide?: QuoteSide;
}

export default function ClientSummaryPanel({
  tick,
  marginPair,
  notional,
  pair,
  quoteSide,
}: ClientSummaryPanelProps) {
  const clientBid =
    tick === null ? null : clientBidFromTrader(tick.bid, marginPair.bid, pair);
  const clientAsk =
    tick === null ? null : clientAskFromTrader(tick.ask, marginPair.ask, pair);

  const profitFor = (margin: number): number | null =>
    tick === null ? null : estimatedProfitUsd(margin, notional, pair, tick.mid);

  const renderProfit = (): JSX.Element => {
    if (quoteSide === 'BID') {
      const p = profitFor(marginPair.bid);
      return (
        <div>
          <div className="text-xs uppercase tracking-tight text-text-mute">Est. P/L</div>
          <div data-testid="pnl-bid" className="font-mono tabular-nums text-text">
            {p === null ? '—' : PROFIT_FMT.format(p)}
          </div>
        </div>
      );
    }
    if (quoteSide === 'ASK') {
      const p = profitFor(marginPair.ask);
      return (
        <div>
          <div className="text-xs uppercase tracking-tight text-text-mute">Est. P/L</div>
          <div data-testid="pnl-ask" className="font-mono tabular-nums text-text">
            {p === null ? '—' : PROFIT_FMT.format(p)}
          </div>
        </div>
      );
    }
    if (quoteSide === 'BOTH') {
      const bp = profitFor(marginPair.bid);
      const ap = profitFor(marginPair.ask);
      return (
        <div data-testid="pnl-both" className="col-span-1">
          <div className="text-xs uppercase tracking-tight text-text-mute">Est. P/L</div>
          <div className="flex gap-3 font-mono tabular-nums text-text">
            <span>
              <span className="text-text-mute">Bid </span>
              {bp === null ? '—' : PROFIT_FMT.format(bp)}
            </span>
            <span>
              <span className="text-text-mute">Ask </span>
              {ap === null ? '—' : PROFIT_FMT.format(ap)}
            </span>
          </div>
        </div>
      );
    }
    // v1 fallback: blended average margin, single line.
    const blended = (marginPair.bid + marginPair.ask) / 2;
    const p = profitFor(blended);
    return (
      <div>
        <div className="text-xs uppercase tracking-tight text-text-mute">Est. profit</div>
        <div data-testid="estimated-profit" className="font-mono tabular-nums text-text">
          {p === null ? '—' : PROFIT_FMT.format(p)}
        </div>
      </div>
    );
  };

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
        {renderProfit()}
      </div>
    </section>
  );
}
