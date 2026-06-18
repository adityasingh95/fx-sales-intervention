import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { formatSettlementDate, valueDateForTenor } from '@/lib/time';
import {
  clientSwapNetPoints,
  effectiveSwapMargin,
  estimatedProfitUsd,
  type SwapMarkupMode,
} from '@/lib/pips';
import type { QuoteSide } from '@/lib/quoteSide';
import { swapPointsFeed } from '@/services/feed/swapPoints';
import type { PriceTick } from '@/services/feed/types';
import type { MarginSuggestion } from '@/services/suggestion/types';
import { type Deal, type MarginPair } from '@/types/deal';
import SwapSideTile from './SwapSideTile';
import SuggestionPanel from '../SuggestionPanel';
import SwapAdjustNote from './SwapAdjustNote';

// Swap pricing panel (docs/05 §18.4). A swap quotes two directions, each shown as
// its own tile (Bid = "Buy/Sell {CCY}" = buy near / sell far; Ask = "Sell/Buy
// {CCY}" = sell near / far buy). Each tile carries the shared spot, its near/far
// forward points, the marked-up client net + P/L, and per-side markup controls. A
// markup-mode toggle switches between:
//   • Per-component — a shared spot margin + a forward-points margin on each leg
//   • All-in        — one net-points margin per side
// AI suggestion targets the all-in layer (switches to All-in).

const ZERO: MarginPair = { bid: 0, ask: 0 };

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
  // Per-component: shared spot margin + per-leg forward-points margins (per side).
  const [spotMargin, setSpotMargin] = useState<MarginPair>(ZERO);
  const [nearMargin, setNearMargin] = useState<MarginPair>(ZERO);
  const [farMargin, setFarMargin] = useState<MarginPair>(ZERO);
  // All-in: one net-points margin per side.
  const [allInMargin, setAllInMargin] = useState<MarginPair>(ZERO);
  const [savedAllInForUndo, setSavedAllInForUndo] = useState<MarginPair | null>(null);

  useEffect(() => {
    setMode('PER_COMPONENT');
    setSpotMargin(ZERO);
    setNearMargin(ZERO);
    setFarMargin(ZERO);
    setAllInMargin(ZERO);
    setSavedAllInForUndo(null);
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

  // Effective net-points margin per side under the active mode (gated for one-sided).
  const effMargin = effectiveSwapMargin(
    mode,
    { total: allInMargin, near: nearMargin, far: farMargin, spot: spotMargin },
    quoteSide,
  );
  const clientNet = clientSwapNetPoints(swap.net, effMargin);

  useEffect(() => {
    onPricingChange?.({ mode, net: effMargin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, effMargin.bid, effMargin.ask, onPricingChange]);

  const midRate = tick?.mid ?? 0;
  const plBid = estimatedProfitUsd(effMargin.bid, deal.notional, deal.pair, midRate);
  const plAsk = estimatedProfitUsd(effMargin.ask, deal.notional, deal.pair, midRate);

  const base = deal.pair.slice(0, 3);

  const zeroSide = (scope: 'bid' | 'ask'): void => {
    const clear = (m: MarginPair): MarginPair =>
      scope === 'bid' ? { bid: 0, ask: m.ask } : { bid: m.bid, ask: 0 };
    setSpotMargin(clear);
    setNearMargin(clear);
    setFarMargin(clear);
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
          currentMargin={allInMargin.bid}
          onApply={(pips) => {
            setSavedAllInForUndo(allInMargin);
            setMode('TOTAL');
            setAllInMargin({ bid: pips, ask: pips });
            onAiAppliedChange?.(true, suggestion?.kind === 'ready' ? suggestion.rationale : null);
          }}
          onUndo={() => {
            if (savedAllInForUndo) {
              setAllInMargin(savedAllInForUndo);
              setSavedAllInForUndo(null);
            }
            onAiAppliedChange?.(false, null);
          }}
          onRecompute={onRecompute}
          onReject={onReject}
          currentVolatility={currentVolatility}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
            Swap · {nearTenor} → {farTenor}
          </h2>
          <span className="flex gap-2 font-mono text-[10px] uppercase tracking-tight text-text-mute">
            <span data-testid="leg-near-value-date">{nearDate}</span>
            <span aria-hidden>→</span>
            <span data-testid="leg-far-value-date">{farDate}</span>
          </span>
        </div>
        {!readOnly && (
          <div data-testid="swap-markup-mode" className="flex gap-1">
            <ModeButton
              mode="PER_COMPONENT"
              label="Per-component"
              active={mode === 'PER_COMPONENT'}
              onSelect={setMode}
            />
            <ModeButton mode="TOTAL" label="All-in" active={mode === 'TOTAL'} onSelect={setMode} />
          </div>
        )}
      </div>

      {/* Two dealing directions, each a full side tile. */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <SwapSideTile
          scope="bid"
          directionLabel={`Buy/Sell ${base}`}
          pair={deal.pair}
          spotRate={tick?.bid ?? null}
          nearTenor={nearTenor}
          farTenor={farTenor}
          nearPoint={swap.near.bid}
          farPoint={swap.far.bid}
          clientNet={clientNet.bid}
          pnl={plBid}
          quotable={bidQuotable}
          locked={bidLocked}
          readOnly={readOnly}
          mode={mode}
          allIn={allInMargin.bid}
          onAllIn={(n) => setAllInMargin({ bid: n, ask: allInMargin.ask })}
          spot={spotMargin.bid}
          onSpot={(n) => setSpotMargin({ bid: n, ask: spotMargin.ask })}
          nearMargin={nearMargin.bid}
          onNear={(n) => setNearMargin({ bid: n, ask: nearMargin.ask })}
          farMargin={farMargin.bid}
          onFar={(n) => setFarMargin({ bid: n, ask: farMargin.ask })}
          onZero={() => zeroSide('bid')}
        />
        <SwapSideTile
          scope="ask"
          directionLabel={`Sell/Buy ${base}`}
          pair={deal.pair}
          spotRate={tick?.ask ?? null}
          nearTenor={nearTenor}
          farTenor={farTenor}
          nearPoint={swap.near.ask}
          farPoint={swap.far.ask}
          clientNet={clientNet.ask}
          pnl={plAsk}
          quotable={askQuotable}
          locked={askLocked}
          readOnly={readOnly}
          mode={mode}
          allIn={allInMargin.ask}
          onAllIn={(n) => setAllInMargin({ bid: allInMargin.bid, ask: n })}
          spot={spotMargin.ask}
          onSpot={(n) => setSpotMargin({ bid: spotMargin.bid, ask: n })}
          nearMargin={nearMargin.ask}
          onNear={(n) => setNearMargin({ bid: nearMargin.bid, ask: n })}
          farMargin={farMargin.ask}
          onFar={(n) => setFarMargin({ bid: farMargin.bid, ask: n })}
          onZero={() => zeroSide('ask')}
        />
      </div>
    </section>
  );
}
