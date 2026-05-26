import clsx from 'clsx';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatRate } from '@/lib/format';
import type { Pair, PriceTick } from '@/services/feed/types';

// FXSW-017 (streaming) + FXSW-018 (fixed mode + margin controls), refactored
// in FXSW-019 to lift pricing-mode state up to the parent so both this
// panel and ClientSummaryPanel see the same display tick.
// Spec: docs/02 §4.4 + docs/05 §4.

const STALE_MS = 3000;
const FLASH_MS = 80;
const GLOW_MS = 600;
const MIN_MARGIN = 1;

type FlashDir = 'up' | 'down' | null;
type PricingMode = 'streaming' | 'fixed';
type Side = 'bid' | 'ask';

export interface PricingPanelProps {
  pair: Pair;
  liveTick: PriceTick | null;
  frozenTick: PriceTick | null;
  pricingMode: PricingMode;
  fixedSide: Side | null;
  margin: number;
  onMarginChange: (next: number) => void;
  onEnterFixed: (side: Side) => void;
  onRefresh: () => void;
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
  onRefresh,
}: PricingPanelProps) {
  const prevBid = useRef<number | null>(null);
  const prevAsk = useRef<number | null>(null);
  const [bidFlash, setBidFlash] = useState<FlashDir>(null);
  const [askFlash, setAskFlash] = useState<FlashDir>(null);
  const [stale, setStale] = useState(false);
  const [marginGlow, setMarginGlow] = useState(false);

  // Tick-direction flash + stale-feed timer reset — runs only in
  // streaming mode (fixed mode freezes the rate, so flash + stale would
  // be misleading).
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

  const adjust = (delta: number): void => {
    onMarginChange(Math.max(MIN_MARGIN, margin + delta));
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
        {pricingMode === 'fixed' && (
          <button
            type="button"
            data-testid="refresh-button"
            onClick={onRefresh}
            className="flex items-center gap-1 rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-blue/60 hover:text-text"
          >
            <RefreshCw size={12} aria-hidden /> Refresh
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Cell
          testId="bid-cell"
          label="Bid"
          flash={pricingMode === 'streaming' ? bidFlash : null}
          focused={fixedSide === 'bid'}
          value={showValues ? formatRate(displayTick.bid, pair) : '—'}
          onClick={() => onEnterFixed('bid')}
        />
        <div data-testid="mid-cell" className="flex flex-col items-center">
          <span className="font-mono text-base tabular-nums text-text-dim">
            {showValues ? formatRate(displayTick.mid, pair) : '—'}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
            Mid
          </span>
        </div>
        <Cell
          testId="ask-cell"
          label="Ask"
          flash={pricingMode === 'streaming' ? askFlash : null}
          focused={fixedSide === 'ask'}
          value={showValues ? formatRate(displayTick.ask, pair) : '—'}
          onClick={() => onEnterFixed('ask')}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-tight text-text-mute">
          Margin
        </span>
        <button
          type="button"
          data-testid="margin-minus"
          aria-label="Decrease margin"
          onClick={() => adjust(-1)}
          disabled={margin <= MIN_MARGIN}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-bg-elevated text-text-dim transition-colors hover:border-blue/60 hover:text-text disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-dim"
        >
          <Minus size={14} aria-hidden />
        </button>
        <input
          type="number"
          data-testid="margin-input"
          data-margin-glow={marginGlow ? 'true' : undefined}
          value={margin}
          min={MIN_MARGIN}
          step={1}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value));
            if (Number.isFinite(n)) onMarginChange(Math.max(MIN_MARGIN, n));
          }}
          className={clsx(
            'h-8 w-16 rounded-sm border bg-bg-elevated text-center font-mono text-sm text-text outline-none transition-all duration-[200ms]',
            marginGlow
              ? 'border-ai-accent shadow-[0_0_0_2px_rgba(129,140,248,0.35)]'
              : 'border-border',
          )}
        />
        <button
          type="button"
          data-testid="margin-plus"
          aria-label="Increase margin"
          onClick={() => adjust(1)}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-bg-elevated text-text-dim transition-colors hover:border-blue/60 hover:text-text"
        >
          <Plus size={14} aria-hidden />
        </button>
        <span className="text-xs text-text-mute">pips</span>
      </div>
    </section>
  );
}

interface CellProps {
  testId: string;
  label: string;
  flash: FlashDir;
  focused: boolean;
  value: string;
  onClick: () => void;
}

function Cell({ testId, label, flash, focused, value, onClick }: CellProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-flash={flash ?? undefined}
      data-focused={focused ? 'true' : undefined}
      onClick={onClick}
      className={clsx(
        'flex flex-1 flex-col items-center rounded-sm border bg-bg-elevated px-3 py-2 transition-colors duration-[80ms]',
        focused && 'border-border-focus shadow-[0_0_0_1px_rgba(99,102,241,0.5)]',
        !focused && flash === 'up' && 'border-green',
        !focused && flash === 'down' && 'border-red',
        !focused && !flash && 'border-border',
      )}
    >
      <span className="font-mono text-2xl tabular-nums text-text">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
        {label}
      </span>
    </button>
  );
}
