import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { formatSettlementDate, valueDateForTenor } from '@/lib/time';
import {
  clientSwapNetPoints,
  estimatedProfitUsd,
  gateMarginToSide,
  sumMargins,
  type SwapMarkupMode,
} from '@/lib/pips';
import type { QuoteSide } from '@/lib/quoteSide';
import { swapPointsFeed } from '@/services/feed/swapPoints';
import type { PriceTick } from '@/services/feed/types';
import type { MarginSuggestion } from '@/services/suggestion/types';
import { type Deal, type MarginPair } from '@/types/deal';
import { BalanceZeroRow, MarginRow } from './MarginControls';
import SwapLegsSection from './SwapLegsSection';
import SuggestionPanel from '../SuggestionPanel';
import SwapAdjustNote from './SwapAdjustNote';

// Swap pricing panel — two-layer markup (docs/05 §18.4).
//
// Layer 1 — per-component (SwapLegsSection): independent bid/ask margin on each
// leg (near + far). Produces a component-adjusted net shown prominently.
//
// Layer 2 — all-in (SideTile): a single bid/ask net-points margin per side tile
// applied on top of the component net. Client net = component net ± all-in margin.
//
// Side-first layout: Bid tile ("Buy/Sell {CCY}") and Ask tile ("Sell/Buy {CCY}")
// represent the two possible swap directions. A one-sided request dims the whole
// non-quotable tile. AI suggestion targets the all-in layer only.

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

      {/* Final client net (after component + all-in markup). Non-quotable → dash. */}
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

      {/* All-in net markup: applied on top of the component-adjusted net. */}
      {!readOnly && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-tight text-text-mute">All-in adj.</span>
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
    </section>
  );
}

export interface SwapPanelProps {
  deal: Deal;
  tick: PriceTick | null;
  quoteSide?: QuoteSide;
  restrictMarginSides?: boolean;
  readOnly?: boolean;
  // FXSW-086: total effective net-points margin (component + all-in, gated) and mode
  // reported upward for quote-context capture at QuoteSent.
  onPricingChange?: (pricing: { mode: SwapMarkupMode; net: MarginPair }) => void;
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
  // Layer 1: per-component margins (per leg, per side)
  const [nearMargin, setNearMargin] = useState<MarginPair>(ZERO);
  const [farMargin, setFarMargin] = useState<MarginPair>(ZERO);
  // Layer 2: all-in net margin (per side, applied on top of component net)
  const [totalMargin, setTotalMargin] = useState<MarginPair>(ZERO);
  const [savedTotalForUndo, setSavedTotalForUndo] = useState<MarginPair | null>(null);

  useEffect(() => {
    setNearMargin(ZERO);
    setFarMargin(ZERO);
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

  const bidQuotable = !(restrictMarginSides && quoteSide === 'ASK');
  const askQuotable = !(restrictMarginSides && quoteSide === 'BID');
  const bidLocked = readOnly || !bidQuotable;
  const askLocked = readOnly || !askQuotable;
  const showBalanceZero = !readOnly && !(restrictMarginSides && quoteSide !== 'BOTH');

  // Layer 1: sum near + far component margins, gate to quotable side.
  const componentMarginGated = gateMarginToSide(sumMargins(nearMargin, farMargin), quoteSide);
  // Intermediate: raw net after component markup. Shown prominently in SwapLegsSection.
  const componentNet = clientSwapNetPoints(swap.net, componentMarginGated);
  // Layer 2: all-in gate.
  const allInGated = gateMarginToSide(totalMargin, quoteSide);
  // Final client net = component net ± all-in adjustment.
  const clientNet = clientSwapNetPoints(componentNet, allInGated);
  // Total effective margin (component + all-in) for P/L and quote-context capture.
  const totalEffGated = gateMarginToSide(sumMargins(sumMargins(nearMargin, farMargin), totalMargin), quoteSide);

  useEffect(() => {
    onPricingChange?.({ mode: 'TOTAL', net: totalEffGated });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalEffGated.bid, totalEffGated.ask, onPricingChange]);

  const midRate = tick?.mid ?? 0;
  const plBid = estimatedProfitUsd(totalEffGated.bid, deal.notional, deal.pair, midRate);
  const plAsk = estimatedProfitUsd(totalEffGated.ask, deal.notional, deal.pair, midRate);

  const base = deal.pair.slice(0, 3);
  const directionLabel = (scope: 'bid' | 'ask'): string =>
    scope === 'bid' ? `Buy/Sell ${base}` : `Sell/Buy ${base}`;

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

      <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
        Swap · {nearTenor} → {farTenor}
      </h2>

      {/* Layer 1: per-component leg markup + prominent component-adjusted net. */}
      <SwapLegsSection
        nearTenor={nearTenor}
        farTenor={farTenor}
        nearDate={nearDate}
        farDate={farDate}
        nearPoints={swap.near}
        farPoints={swap.far}
        componentNet={componentNet}
        nearMargin={nearMargin}
        farMargin={farMargin}
        onNearMarginChange={setNearMargin}
        onFarMarginChange={setFarMargin}
        bidLocked={bidLocked}
        askLocked={askLocked}
        showBalanceZero={showBalanceZero}
        readOnly={readOnly}
      />

      {/* Layer 2: side-first tiles with all-in net markup → final client price. */}
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
