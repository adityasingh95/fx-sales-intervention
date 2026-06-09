import clsx from 'clsx';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatRate } from '@/lib/format';
import type { QuoteSide } from '@/lib/quoteSide';
import type { Pair, PriceTick } from '@/services/feed/types';
import type { MarginPair } from '@/types/deal';

// FXSW-017 (streaming) + FXSW-018 (fixed mode + margin controls), refactored
// in FXSW-019 to lift pricing-mode state up to the parent so both this
// panel and ClientSummaryPanel see the same display tick. FXSW-038 adds
// v2 side-selection UX: dim the non-selected side, re-click the selected
// side to return to streaming, disable the non-quoteable side when the
// request is one-sided.
// Spec: docs/02 §4.4 + docs/05 §4 + docs/02 §7.1.

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
  // v2: when defined, re-clicking the currently focused cell returns to
  // streaming mode. v1 omits the prop and re-click is a no-op.
  onExitFixed?: () => void;
  onRefresh: () => void;
  // v2: restricts which side(s) the trader can quote on, based on the
  // client request's direction × dealt currency. Defaults to BOTH (no
  // restriction, v1-compatible).
  quoteSide?: QuoteSide;
  // FXSW-040 v2: when both are defined, the dual-input UI renders
  // (independent bid + ask margins, Balance, Zero). When absent, the
  // v1 single-input UI renders driven by `margin` + `onMarginChange`.
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
          dimmed={fixedSide === 'ask'}
          disabled={quoteSide === 'ASK'}
          value={showValues ? formatRate(displayTick.bid, pair) : '—'}
          onClick={() => handleCellClick('bid')}
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
          dimmed={fixedSide === 'bid'}
          disabled={quoteSide === 'BID'}
          value={showValues ? formatRate(displayTick.ask, pair) : '—'}
          onClick={() => handleCellClick('ask')}
        />
      </div>

      {useDualMargin ? (
        <DualMarginControls
          marginPair={marginPair}
          onMarginPairChange={onMarginPairChange}
          marginGlow={marginGlow}
        />
      ) : (
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
      )}
    </section>
  );
}

// FXSW-040 — v2 dual-margin block. Two `[label][−][input][+]` rows plus
// Balance + Zero shortcut buttons between them.
interface DualMarginControlsProps {
  marginPair: MarginPair;
  onMarginPairChange: (next: MarginPair) => void;
  marginGlow: boolean;
}

function DualMarginControls({
  marginPair,
  onMarginPairChange,
  marginGlow,
}: DualMarginControlsProps) {
  const setSide = (side: 'bid' | 'ask', value: number): void => {
    const clamped = Math.max(MIN_MARGIN, Math.floor(value));
    onMarginPairChange(
      side === 'bid'
        ? { bid: clamped, ask: marginPair.ask }
        : { bid: marginPair.bid, ask: clamped },
    );
  };

  const handleBalance = (): void => {
    const avg = Math.round((marginPair.bid + marginPair.ask) / 2);
    const clamped = Math.max(MIN_MARGIN, avg);
    onMarginPairChange({ bid: clamped, ask: clamped });
  };

  const handleZero = (): void => {
    onMarginPairChange({ bid: 0, ask: 0 });
  };

  return (
    <div className="flex flex-col gap-2">
      <MarginRow
        label="Bid"
        testIdSuffix="bid"
        value={marginPair.bid}
        onChange={(n) => setSide('bid', n)}
        glow={marginGlow}
      />
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          data-testid="margin-balance"
          onClick={handleBalance}
          className="rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-blue/60 hover:text-text"
        >
          Balance
        </button>
        <button
          type="button"
          data-testid="margin-zero"
          onClick={handleZero}
          className="rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-red/60 hover:text-text"
        >
          Zero
        </button>
      </div>
      <MarginRow
        label="Ask"
        testIdSuffix="ask"
        value={marginPair.ask}
        onChange={(n) => setSide('ask', n)}
        glow={marginGlow}
      />
    </div>
  );
}

interface MarginRowProps {
  label: string;
  testIdSuffix: 'bid' | 'ask';
  value: number;
  onChange: (next: number) => void;
  glow: boolean;
}

function MarginRow({ label, testIdSuffix, value, onChange, glow }: MarginRowProps) {
  const minusDisabled = value <= 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs font-medium uppercase tracking-tight text-text-mute">
        {label}
      </span>
      <button
        type="button"
        data-testid={`margin-minus-${testIdSuffix}`}
        aria-label={`Decrease ${label.toLowerCase()} margin`}
        onClick={() => onChange(value - 1)}
        disabled={minusDisabled}
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-bg-elevated text-text-dim transition-colors hover:border-blue/60 hover:text-text disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-dim"
      >
        <Minus size={14} aria-hidden />
      </button>
      <input
        type="number"
        data-testid={`margin-input-${testIdSuffix}`}
        data-margin-glow={glow ? 'true' : undefined}
        value={value}
        min={0}
        step={1}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (Number.isFinite(n)) onChange(n);
        }}
        onKeyDown={(e) => {
          if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            onChange(value + 1);
          } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            onChange(value - 1);
          }
        }}
        className={clsx(
          'h-8 w-16 rounded-sm border bg-bg-elevated text-center font-mono text-sm text-text outline-none transition-all duration-[200ms]',
          glow
            ? 'border-ai-accent shadow-[0_0_0_2px_rgba(129,140,248,0.35)]'
            : 'border-border',
        )}
      />
      <button
        type="button"
        data-testid={`margin-plus-${testIdSuffix}`}
        aria-label={`Increase ${label.toLowerCase()} margin`}
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-bg-elevated text-text-dim transition-colors hover:border-blue/60 hover:text-text"
      >
        <Plus size={14} aria-hidden />
      </button>
      <span className="text-xs text-text-mute">pips</span>
    </div>
  );
}

interface CellProps {
  testId: string;
  label: string;
  flash: FlashDir;
  focused: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  value: string;
  onClick: () => void;
}

function Cell({
  testId,
  label,
  flash,
  focused,
  dimmed = false,
  disabled = false,
  value,
  onClick,
}: CellProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-flash={flash ?? undefined}
      data-focused={focused ? 'true' : undefined}
      data-dimmed={dimmed ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      className={clsx(
        'flex flex-1 flex-col items-center rounded-sm border bg-bg-elevated px-3 py-2 transition-colors duration-[80ms]',
        focused && 'border-border-focus shadow-[0_0_0_1px_rgba(99,102,241,0.5)]',
        !focused && flash === 'up' && 'border-green',
        !focused && flash === 'down' && 'border-red',
        !focused && !flash && 'border-border',
        dimmed && !disabled && 'opacity-50',
        disabled && 'cursor-not-allowed opacity-[0.35]',
      )}
    >
      <span className="font-mono text-2xl tabular-nums text-text">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
        {label}
      </span>
    </button>
  );
}
