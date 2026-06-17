import { formatRate } from '@/lib/format';
import {
  allInRate,
  clientAskFromTrader,
  clientBidFromTrader,
  clientForwardPair,
  estimatedProfitUsd,
} from '@/lib/pips';
import type { QuoteSide } from '@/lib/quoteSide';
import type { ForwardPointsPair } from '@/services/feed/forwardPoints';
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
  // FXSW-057: forward deals pass the forward points + forward-points margin.
  // When `fwdPoints` is defined, client prices are all-in outright rates and
  // P/L uses the summed spot + forward margin. Spot deals omit both.
  // FXSW-075: forward points are two-sided — bid side uses bid points, ask uses
  // ask points; the mid is the P/L reference.
  fwdPoints?: ForwardPointsPair;
  fwdMarginPair?: MarginPair;
}

export default function ClientSummaryPanel({
  tick,
  marginPair,
  notional,
  pair,
  quoteSide,
  fwdPoints,
  fwdMarginPair,
}: ClientSummaryPanelProps) {
  const fwdBid = fwdMarginPair?.bid ?? 0;
  const fwdAsk = fwdMarginPair?.ask ?? 0;

  const fwdClient =
    tick !== null && fwdPoints !== undefined
      ? clientForwardPair(tick, fwdPoints, marginPair, { bid: fwdBid, ask: fwdAsk }, pair)
      : null;
  const clientBid =
    tick === null
      ? null
      : fwdClient
        ? fwdClient.bid
        : clientBidFromTrader(tick.bid, marginPair.bid, pair);
  const clientAsk =
    tick === null
      ? null
      : fwdClient
        ? fwdClient.ask
        : clientAskFromTrader(tick.ask, marginPair.ask, pair);

  // For forwards, P/L is referenced off the all-in mid (using the mid points).
  const profitMid =
    tick === null ? 0 : fwdPoints !== undefined ? allInRate(tick.mid, fwdPoints.mid, pair) : tick.mid;
  // Total margin per side folds in the forward-points component.
  const totalBid = marginPair.bid + fwdBid;
  const totalAsk = marginPair.ask + fwdAsk;

  const profitFor = (margin: number): number | null =>
    tick === null ? null : estimatedProfitUsd(margin, notional, pair, profitMid);

  const renderProfit = (): JSX.Element => {
    if (quoteSide === 'BID') {
      const p = profitFor(totalBid);
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
      const p = profitFor(totalAsk);
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
      const bp = profitFor(totalBid);
      const ap = profitFor(totalAsk);
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
    const blended = (totalBid + totalAsk) / 2;
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
