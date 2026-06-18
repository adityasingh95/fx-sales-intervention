import clsx from 'clsx';
import { formatRate } from '@/lib/format';
import type { SwapMarkupMode } from '@/lib/pips';
import type { Pair } from '@/services/feed/types';
import type { Tenor } from '@/types/deal';
import { MarginRow } from './MarginControls';

// One dealing side of a swap (docs/05 §18.4). A swap quotes two directions, each
// its own tile: Bid = "Buy/Sell {CCY}" (buy near, sell far); Ask = "Sell/Buy
// {CCY}" (sell near, buy far). Each tile carries a shared spot rate, its near/far
// forward points, the marked-up client net + estimated P/L, and — depending on
// the markup mode — either one all-in markup or a shared spot margin plus a
// forward-points margin on each leg. A non-quotable side (one-sided lock) is
// dimmed and its steppers disabled.

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

const PROFIT_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export interface SwapSideTileProps {
  scope: 'bid' | 'ask';
  directionLabel: string;
  pair: Pair;
  spotRate: number | null;
  nearTenor: Tenor;
  farTenor: Tenor;
  nearPoint: number;
  farPoint: number;
  clientNet: number;
  pnl: number;
  quotable: boolean;
  locked: boolean;
  readOnly: boolean;
  mode: SwapMarkupMode;
  // Markup values + setters for this side (this tile edits only its own scope).
  allIn: number;
  onAllIn: (next: number) => void;
  spot: number;
  onSpot: (next: number) => void;
  nearMargin: number;
  onNear: (next: number) => void;
  farMargin: number;
  onFar: (next: number) => void;
  onZero: () => void;
}

function MarkupLine({
  label,
  testIdSuffix,
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  label: string;
  testIdSuffix: 'bid' | 'ask';
  idPrefix: string;
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-tight text-text-mute">{label}</span>
      <MarginRow
        testIdSuffix={testIdSuffix}
        idPrefix={idPrefix}
        labelPrefix={`${label} `}
        value={value}
        onChange={(n) => onChange(Math.max(0, Math.floor(n)))}
        glow={false}
        disabled={disabled}
      />
    </div>
  );
}

export default function SwapSideTile({
  scope,
  directionLabel,
  pair,
  spotRate,
  nearTenor,
  farTenor,
  nearPoint,
  farPoint,
  clientNet,
  pnl,
  quotable,
  locked,
  readOnly,
  mode,
  allIn,
  onAllIn,
  spot,
  onSpot,
  nearMargin,
  onNear,
  farMargin,
  onFar,
  onZero,
}: SwapSideTileProps) {
  const perComponent = mode === 'PER_COMPONENT';
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
      <span
        data-testid={`swap-side-${scope}-direction`}
        className={clsx(
          'self-start rounded-sm px-1.5 py-0.5 text-[10px] font-semibold',
          scope === 'bid' ? 'bg-red/15 text-red' : 'bg-blue/15 text-blue',
        )}
      >
        {directionLabel}
      </span>

      {/* Shared spot rate for the side. */}
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-tight text-text-mute">Spot</span>
        <span data-testid={`swap-spot-${scope}`} className="font-mono text-sm tabular-nums text-text">
          {spotRate === null ? '—' : formatRate(spotRate, pair)}
        </span>
      </div>

      {/* Per-leg forward points (near + far) for this direction. */}
      <div className="grid grid-cols-2 gap-x-3 text-center">
        <div>
          <span
            data-testid={`leg-near-points-${scope}`}
            className="font-mono text-sm tabular-nums text-text"
          >
            {fmtPoints(nearPoint)}
          </span>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Near · {nearTenor}</div>
        </div>
        <div>
          <span
            data-testid={`leg-far-points-${scope}`}
            className="font-mono text-sm tabular-nums text-text"
          >
            {fmtPoints(farPoint)}
          </span>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Far · {farTenor}</div>
        </div>
      </div>

      {/* Marked-up client net + estimated P/L. Non-quotable → dash. */}
      <div className="border-t border-border pt-2 text-center">
        <div data-testid={`client-net-${scope}`} className="font-mono text-xl tabular-nums text-text">
          {quotable ? fmtPoints(clientNet) : '—'}
        </div>
        <div
          data-testid={`swap-pnl-${scope}`}
          className="text-[10px] uppercase tracking-tight text-text-mute"
        >
          {quotable ? PROFIT_FMT.format(pnl) : 'Net client points'}
        </div>
      </div>

      {/* Markup controls for this side. */}
      {!readOnly &&
        (perComponent ? (
          <div className="flex flex-col gap-1.5 border-t border-border pt-2">
            <MarkupLine
              label="Spot"
              testIdSuffix={scope}
              idPrefix="spot-"
              value={spot}
              onChange={onSpot}
              disabled={locked}
            />
            <MarkupLine
              label="Near pts"
              testIdSuffix={scope}
              idPrefix="near-"
              value={nearMargin}
              onChange={onNear}
              disabled={locked}
            />
            <MarkupLine
              label="Far pts"
              testIdSuffix={scope}
              idPrefix="far-"
              value={farMargin}
              onChange={onFar}
              disabled={locked}
            />
            {!locked && (
              <button
                type="button"
                data-testid={`swap-zero-${scope}`}
                onClick={onZero}
                className="self-end rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-red/60 hover:text-text"
              >
                Zero
              </button>
            )}
          </div>
        ) : (
          <div className="border-t border-border pt-2">
            <MarkupLine
              label="All-in"
              testIdSuffix={scope}
              idPrefix="net-"
              value={allIn}
              onChange={onAllIn}
              disabled={locked}
            />
          </div>
        ))}
    </section>
  );
}
