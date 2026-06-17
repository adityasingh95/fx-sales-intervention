import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { formatSettlementDate, valueDateForTenor } from '@/lib/time';
import {
  clientSwapNetPoints,
  estimatedProfitUsd,
  gateMarginToSide,
  type SwapMarkupMode,
} from '@/lib/pips';
import type { QuoteSide } from '@/lib/quoteSide';
import { swapPointsFeed } from '@/services/feed/swapPoints';
import type { PriceTick } from '@/services/feed/types';
import type { MarginSuggestion } from '@/services/suggestion/types';
import {
  oppositeSide,
  swapLegSide,
  type Deal,
  type MarginPair,
  type Side,
  type Tenor,
} from '@/types/deal';
import { BalanceZeroRow, MarginRow } from './MarginControls';
import SuggestionPanel from '../SuggestionPanel';
import SwapAdjustNote from './SwapAdjustNote';

// Swap pricing panel (FXSW-085 → redesigned). Organised by *dealing side* (the two
// prices the desk can show), not by leg: a Bid tile and an Ask tile sit side by
// side, each carrying one net-points markup, the marked-up client net + estimated
// P/L, and the per-leg (near/far) points underneath as read-only context. A
// one-sided request dims the whole non-quotable tile, so the lock reads as "this
// side isn't quotable" rather than a scatter of disabled steppers. Markup is
// net-only (docs/05 §18.4); the AI suggestion applies a single net margin.

const ZERO: MarginPair = { bid: 0, ask: 0 };
const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

const PROFIT_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface SideTileProps {
  scope: 'bid' | 'ask';
  directionLabel: string;
  quotable: boolean;
  locked: boolean;
  readOnly: boolean;
  marginValue: number;
  onMarginChange: (next: number) => void;
  clientNet: number;
  pnl: number;
  nearTenor: Tenor;
  farTenor: Tenor;
  nearPoint: number;
  farPoint: number;
}

function SideTile({
  scope,
  directionLabel,
  quotable,
  locked,
  readOnly,
  marginValue,
  onMarginChange,
  clientNet,
  pnl,
  nearTenor,
  farTenor,
  nearPoint,
  farPoint,
}: SideTileProps) {
  return (
    <section
      data-testid={`swap-side-${scope}`}
      data-quotable={quotable}
      aria-label={`Client ${scope}`}
      className={clsx(
        'flex flex-1 flex-col gap-2 rounded-sm border p-3',
        quotable
          ? 'border-border-focus/40 bg-bg-elevated/60'
          : 'border-border bg-bg-elevated/30 opacity-40',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          data-testid={`swap-side-${scope}-direction`}
          className={clsx(
            'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold',
            scope === 'bid' ? 'bg-red/15 text-red' : 'bg-blue/15 text-blue',
          )}
        >
          {directionLabel}
        </span>
        <span className="text-[10px] uppercase tracking-tight text-text-mute">Client {scope}</span>
      </div>

      {/* Headline marked-up net + estimated P/L. A non-quotable side shows a dash,
          never the raw un-marked net (FXSW-091 F-2). */}
      <div className="text-center">
        <div
          data-testid={`client-net-${scope}`}
          className="font-mono text-xl tabular-nums text-text"
        >
          {quotable ? fmtPoints(clientNet) : '—'}
        </div>
        <div
          data-testid={`swap-pnl-${scope}`}
          className="text-[10px] uppercase tracking-tight text-text-mute"
        >
          {quotable ? PROFIT_FMT.format(pnl) : '—'}
        </div>
      </div>

      {/* Single net-points markup for this side. */}
      {!readOnly && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-tight text-text-mute">Net markup</span>
          <MarginRow
            testIdSuffix={scope}
            idPrefix="net-"
            labelPrefix="net "
            value={marginValue}
            onChange={(n) => onMarginChange(Math.max(0, Math.floor(n)))}
            glow={false}
            disabled={locked}
          />
        </div>
      )}

      {/* Read-only per-leg points breakdown — the components behind the net. */}
      <div className="mt-1 flex justify-between border-t border-border pt-2 text-[10px] text-text-mute">
        <span>
          <span className="uppercase tracking-tight">Near {nearTenor}</span>{' '}
          <span
            data-testid={`leg-near-points-${scope}`}
            className="font-mono tabular-nums text-text-dim"
          >
            {fmtPoints(nearPoint)}
          </span>
        </span>
        <span>
          <span className="uppercase tracking-tight">Far {farTenor}</span>{' '}
          <span
            data-testid={`leg-far-points-${scope}`}
            className="font-mono tabular-nums text-text-dim"
          >
            {fmtPoints(farPoint)}
          </span>
        </span>
      </div>
    </section>
  );
}

export interface SwapPanelProps {
  deal: Deal;
  tick: PriceTick | null;
  quoteSide?: QuoteSide;
  restrictMarginSides?: boolean;
  readOnly?: boolean;
  // FXSW-086: report the effective net-points margin + mode upward so the quote-
  // context capture can record what was actually applied at QuoteSent. Markup is
  // net-only now, so the mode is always TOTAL (the field is kept for the captured
  // AppliedMargin shape + historic deals priced under the old per-component UI).
  onPricingChange?: (pricing: { mode: SwapMarkupMode; net: MarginPair }) => void;
  // AI Margin Suggestion for the swap net-points markup. Applying it writes the
  // suggested pips to both sides of the net margin; the panel reports the
  // AI-applied flag upward for the quote-context capture.
  suggestion?: MarginSuggestion | null;
  onRecompute?: () => void;
  onReject?: () => void;
  currentVolatility?: number;
  onAiAppliedChange?: (applied: boolean, rationale: string | null) => void;
}

export default function SwapPanel({
  deal,
  tick,
  quoteSide = 'BOTH',
  restrictMarginSides = false,
  readOnly = false,
  onPricingChange,
  suggestion = null,
  onRecompute,
  onReject,
  currentVolatility,
  onAiAppliedChange,
}: SwapPanelProps) {
  const [totalMargin, setTotalMargin] = useState<MarginPair>(ZERO);
  // Saved net margin captured before an AI Apply, restored losslessly on Undo.
  const [savedTotalForUndo, setSavedTotalForUndo] = useState<MarginPair | null>(null);

  // Reset markup state whenever a different deal opens.
  useEffect(() => {
    setTotalMargin(ZERO);
    setSavedTotalForUndo(null);
  }, [deal.dealId]);

  const legs = deal.legs ?? [];
  const nearTenor = legs[0]?.tenor ?? deal.tenor;
  const farTenor = legs[1]?.tenor ?? deal.tenor;
  const swap = swapPointsFeed.get(deal.pair, nearTenor, farTenor);

  const tradeDate = new Date(deal.createdAt);
  const nearDate = formatSettlementDate(valueDateForTenor(tradeDate, nearTenor));
  const farDate = formatSettlementDate(valueDateForTenor(tradeDate, farTenor));

  // Which sides the request can actually be quoted on (one-sided lock, §17.1).
  // `quotable` drives display suppression (FXSW-091 F-2); `locked` additionally
  // folds in readOnly to disable the steppers without blanking an auto-priced quote.
  const bidQuotable = !(restrictMarginSides && quoteSide === 'ASK');
  const askQuotable = !(restrictMarginSides && quoteSide === 'BID');
  const bidLocked = readOnly || !bidQuotable;
  const askLocked = readOnly || !askQuotable;
  const showBalanceZero = !readOnly && !(restrictMarginSides && quoteSide !== 'BOTH');

  const effMargin = gateMarginToSide(totalMargin, quoteSide);
  const clientNet = clientSwapNetPoints(swap.net, effMargin);

  // Report the effective (gated) net margin upward for quote-context capture.
  useEffect(() => {
    onPricingChange?.({ mode: 'TOTAL', net: effMargin });
    // effMargin is a fresh object each render; depend on its primitive parts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effMargin.bid, effMargin.ask, onPricingChange]);

  const midRate = tick?.mid ?? 0;
  const plBid = estimatedProfitUsd(effMargin.bid, deal.notional, deal.pair, midRate);
  const plAsk = estimatedProfitUsd(effMargin.ask, deal.notional, deal.pair, midRate);

  // The client-facing dealing direction for each tile. A directional request quotes
  // on a single side (quoteSide): that side carries the deal's own near/far
  // direction; the opposite tile inverts it. A two-sided request has no single
  // direction, so both tiles read "Two-way".
  const base = deal.pair.slice(0, 3);
  const word = (s: Side): string => (s === 'BUY' ? 'Buy' : s === 'SELL' ? 'Sell' : 'Two-way');
  const directionLabel = (scope: 'bid' | 'ask'): string => {
    if (deal.side === 'BOTH' || quoteSide === 'BOTH') return 'Two-way';
    const isPrimary = scope.toUpperCase() === quoteSide;
    const baseSide = isPrimary ? deal.side : oppositeSide(deal.side);
    return `${word(swapLegSide(baseSide, 'NEAR'))}/${word(swapLegSide(baseSide, 'FAR'))} ${base}`;
  };

  return (
    <section
      data-testid="swap-panel"
      aria-label="Swap pricing"
      className="flex flex-col gap-3 rounded-sm border border-border bg-bg-elevated/40 p-3"
    >
      <SwapAdjustNote deal={deal} />
      {!readOnly && (
        <SuggestionPanel
          suggestion={suggestion}
          currentMargin={totalMargin.bid}
          onApply={(pips) => {
            setSavedTotalForUndo(totalMargin);
            setTotalMargin({ bid: pips, ask: pips });
            onAiAppliedChange?.(true, suggestion?.kind === 'ready' ? suggestion.rationale : null);
          }}
          onUndo={() => {
            if (savedTotalForUndo) {
              setTotalMargin(savedTotalForUndo);
              setSavedTotalForUndo(null);
            }
            onAiAppliedChange?.(false, null);
          }}
          onRecompute={onRecompute}
          onReject={onReject}
          currentVolatility={currentVolatility}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
          Swap · {nearTenor} → {farTenor}
        </h2>
        <span className="flex gap-3 font-mono text-[10px] uppercase tracking-tight text-text-mute">
          <span>
            Near <span data-testid="leg-near-value-date">{nearDate}</span>
          </span>
          <span>
            Far <span data-testid="leg-far-value-date">{farDate}</span>
          </span>
        </span>
      </div>

      {/* Raw (un-marked) net differential — the reference both client prices widen from. */}
      <div className="flex items-center justify-between rounded-sm border border-border bg-bg-elevated/40 px-2 py-1">
        <span className="text-[10px] uppercase tracking-tight text-text-mute">Net swap points</span>
        <span className="font-mono text-xs tabular-nums text-text">
          <span data-testid="swap-net-bid">{fmtPoints(swap.net.bid)}</span>
          {' / '}
          <span data-testid="swap-net-ask">{fmtPoints(swap.net.ask)}</span>
        </span>
      </div>

      {/* Side-first tiles: Bid + Ask, each with its net markup and per-leg breakdown. */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <SideTile
          scope="bid"
          directionLabel={directionLabel('bid')}
          quotable={bidQuotable}
          locked={bidLocked}
          readOnly={readOnly}
          marginValue={totalMargin.bid}
          onMarginChange={(n) => setTotalMargin({ bid: n, ask: totalMargin.ask })}
          clientNet={clientNet.bid}
          pnl={plBid}
          nearTenor={nearTenor}
          farTenor={farTenor}
          nearPoint={swap.near.bid}
          farPoint={swap.far.bid}
        />
        <SideTile
          scope="ask"
          directionLabel={directionLabel('ask')}
          quotable={askQuotable}
          locked={askLocked}
          readOnly={readOnly}
          marginValue={totalMargin.ask}
          onMarginChange={(n) => setTotalMargin({ bid: totalMargin.bid, ask: n })}
          clientNet={clientNet.ask}
          pnl={plAsk}
          nearTenor={nearTenor}
          farTenor={farTenor}
          nearPoint={swap.near.ask}
          farPoint={swap.far.ask}
        />
      </div>

      {showBalanceZero && (
        <BalanceZeroRow
          marginPair={totalMargin}
          onMarginPairChange={setTotalMargin}
          idPrefix="net"
          minMargin={0}
        />
      )}
    </section>
  );
}
