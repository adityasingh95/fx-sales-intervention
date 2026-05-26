import clsx from 'clsx';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatRate } from '@/lib/format';
import { usePrice } from '@/services/feed/usePrice';
import type { Pair, PriceTick } from '@/services/feed/types';

// FXSW-017 (streaming) + FXSW-018 (fixed mode + margin controls).
// Spec: docs/02 §4.4 + docs/05 §4.
//
// - Bid + Ask cells render live from the PricingFeed via usePrice in
//   streaming mode; in fixed mode they show the rate captured at the
//   moment of mode entry, until the operator clicks Refresh or exits.
// - On a live tick in streaming mode, the cell briefly flashes 80ms
//   (`data-flash="up"`/`"down"`).
// - Stale-feed: if no tick lands within 3s, all cells render the em-dash
//   placeholder per docs/05 §8.
// - Margin: controlled (parent owns the value); +/- buttons + keyboard
//   `+`/`-` + numeric input. Floor of 1 pip. A programmatic margin
//   change (e.g. FXSW-025 AI-suggestion Apply) triggers a 600ms indigo
//   glow on the input via `data-margin-glow`.
// - Return-to-Stream action lives in the TicketFooter (FXSW-020) — for
//   now the panel exposes its own internal toggle for tests.

const STALE_MS = 3000;
const FLASH_MS = 80;
const GLOW_MS = 600;
const MIN_MARGIN = 1;

type FlashDir = 'up' | 'down' | null;
type PricingMode = 'streaming' | 'fixed';
type Side = 'bid' | 'ask';

export interface PricingPanelProps {
  pair: Pair;
  margin: number;
  onMarginChange: (next: number) => void;
}

export default function PricingPanel({ pair, margin, onMarginChange }: PricingPanelProps) {
  const tick = usePrice(pair);
  const prevBid = useRef<number | null>(null);
  const prevAsk = useRef<number | null>(null);
  const [bidFlash, setBidFlash] = useState<FlashDir>(null);
  const [askFlash, setAskFlash] = useState<FlashDir>(null);
  const [stale, setStale] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>('streaming');
  const [fixedSide, setFixedSide] = useState<Side | null>(null);
  const [frozenTick, setFrozenTick] = useState<PriceTick | null>(null);
  const [marginGlow, setMarginGlow] = useState(false);

  // Tick-direction flash + stale-feed timer reset. Only run when in
  // streaming mode — fixed mode freezes the displayed rate, so the
  // flash and stale signals would be misleading.
  useEffect(() => {
    if (!tick) return;
    let bidTimer: ReturnType<typeof setTimeout> | null = null;
    let askTimer: ReturnType<typeof setTimeout> | null = null;
    if (pricingMode === 'streaming') {
      if (prevBid.current !== null && tick.bid !== prevBid.current) {
        setBidFlash(tick.bid > prevBid.current ? 'up' : 'down');
        bidTimer = setTimeout(() => setBidFlash(null), FLASH_MS);
      }
      if (prevAsk.current !== null && tick.ask !== prevAsk.current) {
        setAskFlash(tick.ask > prevAsk.current ? 'up' : 'down');
        askTimer = setTimeout(() => setAskFlash(null), FLASH_MS);
      }
    }
    prevBid.current = tick.bid;
    prevAsk.current = tick.ask;
    setStale(false);
    const staleTimer = setTimeout(() => setStale(true), STALE_MS);
    return () => {
      if (bidTimer) clearTimeout(bidTimer);
      if (askTimer) clearTimeout(askTimer);
      clearTimeout(staleTimer);
    };
  }, [tick, pricingMode]);

  // Indigo glow on margin change (any source — internal buttons, keyboard,
  // typed input, or external prop push from FXSW-025 Apply).
  const lastMargin = useRef(margin);
  useEffect(() => {
    if (lastMargin.current === margin) return;
    lastMargin.current = margin;
    setMarginGlow(true);
    const id = setTimeout(() => setMarginGlow(false), GLOW_MS);
    return () => clearTimeout(id);
  }, [margin]);

  // Keyboard +/- adjusts margin while the panel is mounted. The panel
  // only lives inside the ticket overlay, which only ever shows one
  // deal at a time, so a document-level listener is unambiguous.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement) return; // don't intercept typing
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

  const enterFixed = (side: Side): void => {
    if (!tick) return;
    setPricingMode('fixed');
    setFixedSide(side);
    setFrozenTick(tick);
    setBidFlash(null);
    setAskFlash(null);
  };

  const refresh = (): void => {
    if (tick) setFrozenTick(tick);
  };

  const adjust = (delta: number): void => {
    onMarginChange(Math.max(MIN_MARGIN, margin + delta));
  };

  const displayTick = pricingMode === 'fixed' ? frozenTick : tick;
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
            onClick={refresh}
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
          onClick={() => enterFixed('bid')}
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
          onClick={() => enterFixed('ask')}
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
