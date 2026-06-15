import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
import type { MarginPair } from '@/types/deal';
import { MIN_MARGIN } from './types';

// Margin controls extracted from PricingPanel (FXSW-056). Three pieces:
//  - SingleMarginControl: v1 single-input UI (kept for the dead-but-tested path)
//  - MarginRow: one side's dual-margin stepper (bid or ask)
//  - BalanceZeroRow: Balance + Zero buttons for the dual-margin UI
// All data-testids are preserved verbatim.

const stepperInput =
  'rounded-sm border bg-bg-elevated text-center font-mono text-sm text-text outline-none transition-all duration-[200ms]';
const glowBorder = 'border-ai-accent shadow-[0_0_0_2px_rgba(129,140,248,0.35)]';
const stepBtn =
  'flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-bg-elevated text-text-dim transition-colors hover:border-blue/60 hover:text-text disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-dim';

export interface SingleMarginControlProps {
  margin: number;
  onMarginChange: (next: number) => void;
  glow: boolean;
}

export function SingleMarginControl({ margin, onMarginChange, glow }: SingleMarginControlProps) {
  const adjust = (delta: number): void => {
    onMarginChange(Math.max(MIN_MARGIN, margin + delta));
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-tight text-text-mute">Margin</span>
      <button
        type="button"
        data-testid="margin-minus"
        aria-label="Decrease margin"
        onClick={() => adjust(-1)}
        disabled={margin <= MIN_MARGIN}
        className={stepBtn}
      >
        <Minus size={14} aria-hidden />
      </button>
      <input
        type="number"
        data-testid="margin-input"
        data-margin-glow={glow ? 'true' : undefined}
        value={margin}
        min={MIN_MARGIN}
        step={1}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (Number.isFinite(n)) onMarginChange(Math.max(MIN_MARGIN, n));
        }}
        className={clsx('h-8 w-16', stepperInput, glow ? glowBorder : 'border-border')}
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
  );
}

export interface MarginRowProps {
  testIdSuffix: 'bid' | 'ask';
  value: number;
  onChange: (next: number) => void;
  glow: boolean;
  // Optional testid/aria prefix so the forward-points margin row (FXSW-057)
  // gets distinct ids (e.g. margin-input-fwd-bid) without colliding with the
  // spot margin row. Defaults to '' — existing spot ids are unchanged.
  idPrefix?: string;
  labelPrefix?: string;
}

export function MarginRow({
  testIdSuffix,
  value,
  onChange,
  glow,
  idPrefix = '',
  labelPrefix = '',
}: MarginRowProps) {
  const minusDisabled = value <= 0;
  const sideLabel = `${labelPrefix}${testIdSuffix === 'bid' ? 'bid' : 'ask'}`;
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        data-testid={`margin-minus-${idPrefix}${testIdSuffix}`}
        aria-label={`Decrease ${sideLabel} margin`}
        onClick={() => onChange(value - 1)}
        disabled={minusDisabled}
        className={stepBtn}
      >
        <Minus size={14} aria-hidden />
      </button>
      <input
        type="number"
        data-testid={`margin-input-${idPrefix}${testIdSuffix}`}
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
        className={clsx('h-8 w-14', stepperInput, glow ? glowBorder : 'border-border')}
      />
      <button
        type="button"
        data-testid={`margin-plus-${idPrefix}${testIdSuffix}`}
        aria-label={`Increase ${sideLabel} margin`}
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-bg-elevated text-text-dim transition-colors hover:border-blue/60 hover:text-text"
      >
        <Plus size={14} aria-hidden />
      </button>
      <span className="text-[10px] text-text-mute">pips</span>
    </div>
  );
}

export interface BalanceZeroRowProps {
  marginPair: MarginPair;
  onMarginPairChange: (next: MarginPair) => void;
}

export function BalanceZeroRow({ marginPair, onMarginPairChange }: BalanceZeroRowProps) {
  const handleBalance = (): void => {
    const avg = Math.round((marginPair.bid + marginPair.ask) / 2);
    const clamped = Math.max(MIN_MARGIN, avg);
    onMarginPairChange({ bid: clamped, ask: clamped });
  };
  const handleZero = (): void => {
    onMarginPairChange({ bid: 0, ask: 0 });
  };
  return (
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
  );
}
