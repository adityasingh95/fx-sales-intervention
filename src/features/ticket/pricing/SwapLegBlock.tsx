import clsx from 'clsx';
import type { ForwardPointsPair } from '@/services/feed/forwardPoints';
import type { MarginPair, Side, Tenor } from '@/types/deal';
import { BalanceZeroRow, MarginRow } from './MarginControls';

// One leg of a swap ticket (FXSW-085). Shows the leg's tenor + value date and its
// two-sided forward points (§18.1). In per-component markup mode it also exposes
// an independent bid/ask points margin for the leg (up to four steppers across
// the two legs), with Balance/Zero — all respecting the one-sided lock (§17.1).

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

export interface SwapLegBlockProps {
  kind: 'NEAR' | 'FAR';
  tenor: Tenor;
  // The trade direction for this leg. A swap deals opposite ways per leg, so the
  // NEAR/FAR sides differ (e.g. near buy / far sell). BOTH renders a two-sided tag.
  side: Side;
  valueDate: string;
  points: ForwardPointsPair;
  // Per-component mode shows the leg's own margin controls; total mode hides them.
  showMargin: boolean;
  margin: MarginPair;
  onMarginChange: (next: MarginPair) => void;
  bidLocked: boolean;
  askLocked: boolean;
  showBalanceZero: boolean;
}

const SIDE_LABEL: Record<Side, string> = { BUY: 'Buy', SELL: 'Sell', BOTH: 'Two-way' };

export default function SwapLegBlock({
  kind,
  tenor,
  side,
  valueDate,
  points,
  showMargin,
  margin,
  onMarginChange,
  bidLocked,
  askLocked,
  showBalanceZero,
}: SwapLegBlockProps) {
  const idPrefix = kind.toLowerCase(); // 'near' | 'far'
  return (
    <section
      data-testid={`leg-${idPrefix}`}
      data-tenor={tenor}
      data-side={side}
      aria-label={`${kind} leg`}
      className="flex flex-col gap-2 rounded-sm border border-border bg-bg-elevated/40 p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-tight text-text-mute">
          {kind} · {tenor}
          <span
            data-testid={`leg-${idPrefix}-side`}
            className={clsx(
              'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold',
              side === 'BUY'
                ? 'bg-blue/15 text-blue'
                : side === 'SELL'
                  ? 'bg-red/15 text-red'
                  : 'bg-bg-elevated text-text-dim',
            )}
          >
            {SIDE_LABEL[side]}
          </span>
        </h3>
        <span
          data-testid={`leg-${idPrefix}-value-date`}
          className="font-mono text-[10px] uppercase tracking-tight text-text-mute"
        >
          {valueDate}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 text-center">
        <div>
          <span
            data-testid={`leg-${idPrefix}-points-bid`}
            className="font-mono tabular-nums text-text"
          >
            {fmtPoints(points.bid)}
          </span>
          <span className="ml-1 text-xs text-text-mute">pips</span>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Bid</div>
        </div>
        <div>
          <span
            data-testid={`leg-${idPrefix}-points-ask`}
            className="font-mono tabular-nums text-text"
          >
            {fmtPoints(points.ask)}
          </span>
          <span className="ml-1 text-xs text-text-mute">pips</span>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Ask</div>
        </div>
      </div>

      {showMargin && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-tight text-text-mute">
            {kind} points margin
          </span>
          <div className="flex items-start gap-4">
            <div className="flex flex-1 justify-center">
              <MarginRow
                testIdSuffix="bid"
                idPrefix={`${idPrefix}-`}
                labelPrefix={`${idPrefix} `}
                value={margin.bid}
                onChange={(n) => onMarginChange({ bid: Math.max(0, Math.floor(n)), ask: margin.ask })}
                glow={false}
                disabled={bidLocked}
              />
            </div>
            <div className="flex flex-1 justify-center">
              <MarginRow
                testIdSuffix="ask"
                idPrefix={`${idPrefix}-`}
                labelPrefix={`${idPrefix} `}
                value={margin.ask}
                onChange={(n) => onMarginChange({ bid: margin.bid, ask: Math.max(0, Math.floor(n)) })}
                glow={false}
                disabled={askLocked}
              />
            </div>
          </div>
          {showBalanceZero && (
            <BalanceZeroRow
              marginPair={margin}
              onMarginPairChange={onMarginChange}
              idPrefix={idPrefix}
              minMargin={0}
            />
          )}
        </div>
      )}
    </section>
  );
}
