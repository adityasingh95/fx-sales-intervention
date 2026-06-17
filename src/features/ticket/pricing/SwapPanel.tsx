import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { formatSettlementDate, valueDateForTenor } from '@/lib/time';
import {
  clientSwapNetPoints,
  effectiveSwapMargin,
  estimatedProfitUsd,
  gateMarginToSide,
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

// Swap pricing panel (docs/05 §18.4). A markup-mode toggle switches between:
//
//   • Per-component — an independent bid/ask margin on each leg (near + far),
//     shown as steppers in the legs section; the marked-up net flows to the tiles.
//   • All-in (Total) — a single bid/ask net-points margin per side tile, applied
//     to the raw net; the legs section shows points read-only.
//
// Side-first layout: Bid tile ("Buy/Sell {CCY}") and Ask tile ("Sell/Buy {CCY}")
// represent the two possible swap directions. A one-sided request dims the whole
// non-quotable tile. AI suggestion targets the all-in layer (switches to Total).

const ZERO: MarginPair = { bid: 0, ask: 0 };
const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

const PROFIT_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function ModeButton({
  mode,
  label,
  active,
  onSelect,
}: {
  mode: SwapMarkupMode;
  label: string;
  active: boolean;
  onSelect: (mode: SwapMarkupMode) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`swap-markup-mode-${mode === 'PER_COMPONENT' ? 'per-component' : 'total'}`}
      aria-pressed={active}
      onClick={() => onSelect(mode)}
      className={clsx(
        'rounded-sm border px-2 py-1 text-xs font-medium transition-colors',
        active ? 'border-border-focus text-text' : 'border-border text-text-dim hover:text-text',
      )}
    >
      {label}
    </button>
  );
}

interface SideTileProps {
  scope: 'bid' | 'ask';
  directionLabel: string;
  quotable: boolean;
  locked: boolean;
  showMargin: boolean;
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
  showMargin,
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

      {/* Final client net (after the active markup). Non-quotable → dash. */}
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

      {/* All-in net markup — only in Total mode. */}
      {showMargin && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-tight text-text-mute">All-in markup</span>
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
  // FXSW-086: effective net-points margin (per active mode, gated) + mode reported
  // upward for quote-context capture at QuoteSent.
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
  const [mode, setMode] = useState<SwapMarkupMode>('PER_COMPONENT');
  // Per-component margins (per leg, per side)
  const [nearMargin, setNearMargin] = useState<MarginPair>(ZERO);
  const [farMargin, setFarMargin] = useState<MarginPair>(ZERO);
  // All-in net margin (per side)
  const [totalMargin, setTotalMargin] = useState<MarginPair>(ZERO);
  const [savedTotalForUndo, setSavedTotalForUndo] = useState<MarginPair | null>(null);

  useEffect(() => {
    setMode('PER_COMPONENT');
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
  const perComponent = mode === 'PER_COMPONENT';
  const showBalanceZero = !readOnly && !(restrictMarginSides && quoteSide !== 'BOTH');
  // Per-leg steppers show only in per-component mode (and when editable).
  const legsReadOnly = readOnly || !perComponent;

  // Effective margin under the active mode, gated to the quotable side.
  const effMargin = effectiveSwapMargin(
    mode,
    { total: totalMargin, near: nearMargin, far: farMargin },
    quoteSide,
  );
  const clientNet = clientSwapNetPoints(swap.net, effMargin);
  // Net shown in the legs section: the marked-up net in per-component mode, the raw
  // net in all-in mode (the all-in markup happens at the tile level).
  const rawNet = clientSwapNetPoints(swap.net, gateMarginToSide(ZERO, quoteSide));
  const sectionNet = perComponent ? clientNet : rawNet;

  useEffect(() => {
    onPricingChange?.({ mode, net: effMargin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, effMargin.bid, effMargin.ask, onPricingChange]);

  const midRate = tick?.mid ?? 0;
  const plBid = estimatedProfitUsd(effMargin.bid, deal.notional, deal.pair, midRate);
  const plAsk = estimatedProfitUsd(effMargin.ask, deal.notional, deal.pair, midRate);

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
            setMode('TOTAL');
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
        {!readOnly && (
          <div data-testid="swap-markup-mode" className="flex gap-1">
            <ModeButton
              mode="PER_COMPONENT"
              label="Per-component"
              active={perComponent}
              onSelect={setMode}
            />
            <ModeButton mode="TOTAL" label="All-in" active={!perComponent} onSelect={setMode} />
          </div>
        )}
      </div>

      {/* Legs section: per-leg points + (per-component) per-leg markup steppers. */}
      <SwapLegsSection
        nearTenor={nearTenor}
        farTenor={farTenor}
        nearDate={nearDate}
        farDate={farDate}
        nearPoints={swap.near}
        farPoints={swap.far}
        componentNet={sectionNet}
        nearMargin={nearMargin}
        farMargin={farMargin}
        onNearMarginChange={setNearMargin}
        onFarMarginChange={setFarMargin}
        bidLocked={bidLocked}
        askLocked={askLocked}
        showBalanceZero={showBalanceZero && perComponent}
        readOnly={legsReadOnly}
      />

      {/* Side-first tiles: client price + (all-in mode) net markup. */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <SideTile
          scope="bid"
          directionLabel={directionLabel('bid')}
          quotable={bidQuotable}
          locked={bidLocked}
          showMargin={!readOnly && !perComponent}
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
          showMargin={!readOnly && !perComponent}
          marginValue={totalMargin.ask}
          onMarginChange={(n) => setTotalMargin({ bid: totalMargin.bid, ask: n })}
          clientNet={clientNet.ask}
          pnl={plAsk}
        />
      </div>

      {showBalanceZero && !perComponent && (
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
