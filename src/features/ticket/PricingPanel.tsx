import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatRate } from '@/lib/format';
import type { QuoteSide } from '@/lib/quoteSide';
import type { Pair, PriceTick } from '@/services/feed/types';
import type { MarginPair } from '@/types/deal';
import Cell from './pricing/Cell';
import {
  BalanceZeroRow,
  MarginRow,
  SingleMarginControl,
} from './pricing/MarginControls';
import { FLASH_MS, GLOW_MS, MIN_MARGIN, STALE_MS, type FlashDir, type PricingMode, type Side } from './pricing/types';

// FXSW-017 (streaming) + FXSW-018 (fixed mode + margin controls), refactored
// in FXSW-019 to lift pricing-mode state up to the parent so both this
// panel and ClientSummaryPanel see the same display tick. FXSW-038 adds
// v2 side-selection UX. FXSW-056 split the bid/ask Cell + margin controls into
// ./pricing/* sub-components (the file had outgrown the 300-line limit); this
// orchestrator owns the flash / stale / glow / keyboard state.
// Spec: docs/02 §4.4 + docs/05 §4 + docs/02 §7.1.

export interface PricingPanelProps {
  pair: Pair;
  liveTick: PriceTick | null;
  frozenTick: PriceTick | null;
  pricingMode: PricingMode;
  fixedSide: Side | null;
  margin: number;
  onMarginChange: (next: number) => void;
  onEnterFixed: (side: Side) => void;
  // v2: when defined, re-clicking the currently focused cell returns to
  // streaming mode. v1 omits the prop and re-click is a no-op.
  onExitFixed?: () => void;
  onRefresh: () => void;
  // v2: restricts which side(s) the trader can quote on, based on the
  // client request's direction × dealt currency. Defaults to BOTH.
  quoteSide?: QuoteSide;
  // FXSW-040 v2: when both are defined, the dual-input UI renders. When
  // absent, the v1 single-input UI renders driven by `margin`.
  marginPair?: MarginPair;
  onMarginPairChange?: (next: MarginPair) => void;
}

export default function PricingPanel({
  pair,
  liveTick,
  frozenTick,
  pricingMode,
  fixedSide,
  margin,
  onMarginChange,
  onEnterFixed,
  onExitFixed,
  onRefresh,
  quoteSide = 'BOTH',
  marginPair,
  onMarginPairChange,
}: PricingPanelProps) {
  const useDualMargin = marginPair !== undefined && onMarginPairChange !== undefined;
  const prevBid = useRef<number | null>(null);
  const prevAsk = useRef<number | null>(null);
  const [bidFlash, setBidFlash] = useState<FlashDir>(null);
  const [askFlash, setAskFlash] = useState<FlashDir>(null);
  const [stale, setStale] = useState(false);
  const [marginGlow, setMarginGlow] = useState(false);

  // Tick-direction flash + stale-feed timer reset — runs only in streaming
  // mode (fixed mode freezes the rate, so flash + stale would be misleading).
  useEffect(() => {
    if (!liveTick) return;
    let bidTimer: ReturnType<typeof setTimeout> | null = null;
    let askTimer: ReturnType<typeof setTimeout> | null = null;
    if (pricingMode === 'streaming') {
      if (prevBid.current !== null && liveTick.bid !== prevBid.current) {
        setBidFlash(liveTick.bid > prevBid.current ? 'up' : 'down');
        bidTimer = setTimeout(() => setBidFlash(null), FLASH_MS);
      }
      if (prevAsk.current !== null && liveTick.ask !== prevAsk.current) {
        setAskFlash(liveTick.ask > prevAsk.current ? 'up' : 'down');
        askTimer = setTimeout(() => setAskFlash(null), FLASH_MS);
      }
    }
    prevBid.current = liveTick.bid;
    prevAsk.current = liveTick.ask;
    setStale(false);
    const staleTimer = setTimeout(() => setStale(true), STALE_MS);
    return () => {
      if (bidTimer) clearTimeout(bidTimer);
      if (askTimer) clearTimeout(askTimer);
      clearTimeout(staleTimer);
    };
  }, [liveTick, pricingMode]);

  // Indigo glow on margin change (any source).
  const lastMargin = useRef(margin);
  useEffect(() => {
    if (lastMargin.current === margin) return;
    lastMargin.current = margin;
    setMarginGlow(true);
    const id = setTimeout(() => setMarginGlow(false), GLOW_MS);
    return () => clearTimeout(id);
  }, [margin]);

  // Keyboard +/- adjusts margin while the panel is mounted.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        onMarginChange(Math.max(MIN_MARGIN, margin + 1));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        onMarginChange(Math.max(MIN_MARGIN, margin - 1));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [margin, onMarginChange]);

  const handleCellClick = (side: Side): void => {
    if (side === 'bid' && quoteSide === 'ASK') return;
    if (side === 'ask' && quoteSide === 'BID') return;
    if (pricingMode === 'fixed' && fixedSide === side && onExitFixed) {
      onExitFixed();
      return;
    }
    onEnterFixed(side);
  };

  const displayTick = pricingMode === 'fixed' ? frozenTick : liveTick;
  const showValues = displayTick !== null && (pricingMode === 'fixed' || !stale);

  return (
    <section
      data-testid="pricing-panel"
      data-pricing-mode={pricingMode}
      aria-label="Pricing"
      className="flex flex-col gap-3"
    >
      <div className="flex items-end justify-between">
        <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
          Trader Rate
        </h2>
        <button
          type="button"
          data-testid="refresh-button"
          onClick={onRefresh}
          disabled={pricingMode !== 'fixed'}
          className="flex items-center gap-1 rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-blue/60 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-dim"
        >
          <RefreshCw size={12} aria-hidden /> Refresh
        </button>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Cell
            testId="bid-cell"
            label="Bid"
            flash={pricingMode === 'streaming' ? bidFlash : null}
            focused={fixedSide === 'bid'}
            dimmed={fixedSide === 'ask'}
            disabled={quoteSide === 'ASK'}
            value={showValues ? formatRate(displayTick.bid, pair) : '—'}
            onClick={() => handleCellClick('bid')}
          />
          {useDualMargin && (
            <MarginRow
              testIdSuffix="bid"
              value={marginPair.bid}
              onChange={(n) =>
                onMarginPairChange({ bid: Math.max(0, Math.floor(n)), ask: marginPair.ask })
              }
              glow={marginGlow}
            />
          )}
        </div>
        <div data-testid="mid-cell" className="flex flex-col items-center pt-2">
          <span className="font-mono text-base tabular-nums text-text-dim">
            {showValues ? formatRate(displayTick.mid, pair) : '—'}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
            Mid
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Cell
            testId="ask-cell"
            label="Ask"
            flash={pricingMode === 'streaming' ? askFlash : null}
            focused={fixedSide === 'ask'}
            dimmed={fixedSide === 'bid'}
            disabled={quoteSide === 'BID'}
            value={showValues ? formatRate(displayTick.ask, pair) : '—'}
            onClick={() => handleCellClick('ask')}
          />
          {useDualMargin && (
            <MarginRow
              testIdSuffix="ask"
              value={marginPair.ask}
              onChange={(n) =>
                onMarginPairChange({ bid: marginPair.bid, ask: Math.max(0, Math.floor(n)) })
              }
              glow={marginGlow}
            />
          )}
        </div>
      </div>

      {useDualMargin ? (
        <BalanceZeroRow marginPair={marginPair} onMarginPairChange={onMarginPairChange} />
      ) : (
        <SingleMarginControl margin={margin} onMarginChange={onMarginChange} glow={marginGlow} />
      )}
    </section>
  );
}
