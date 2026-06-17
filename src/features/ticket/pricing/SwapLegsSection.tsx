import type { ForwardPointsPair } from '@/services/feed/forwardPoints';
import type { MarginPair, Tenor } from '@/types/deal';
import { BalanceZeroRow, MarginRow } from './MarginControls';

// Per-component legs display for the swap ticket. Replaces the compact "Net swap
// points" row with a prominent two-column layout: each leg shows its raw bid/ask
// forward points plus independent bid/ask margin steppers. The resulting
// component-adjusted net (after per-leg margins, before the all-in tile margin)
// appears as a highlighted band at the bottom.

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

export interface SwapLegsSectionProps {
  nearTenor: Tenor;
  farTenor: Tenor;
  nearDate: string;
  farDate: string;
  nearPoints: ForwardPointsPair;
  farPoints: ForwardPointsPair;
  // Component-adjusted net: raw swap net after per-leg margins, before the all-in
  // tile-level margin. Equals raw net at zero component margins.
  componentNet: { bid: number; ask: number };
  nearMargin: MarginPair;
  farMargin: MarginPair;
  onNearMarginChange: (m: MarginPair) => void;
  onFarMarginChange: (m: MarginPair) => void;
  bidLocked: boolean;
  askLocked: boolean;
  showBalanceZero: boolean;
  readOnly: boolean;
}

interface LegColProps {
  id: 'near' | 'far';
  tenor: Tenor;
  date: string;
  points: ForwardPointsPair;
  margin: MarginPair;
  onMarginChange: (m: MarginPair) => void;
  bidLocked: boolean;
  askLocked: boolean;
  showBalanceZero: boolean;
  readOnly: boolean;
}

function LegCol({
  id,
  tenor,
  date,
  points,
  margin,
  onMarginChange,
  bidLocked,
  askLocked,
  showBalanceZero,
  readOnly,
}: LegColProps) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
          {id === 'near' ? 'Near' : 'Far'} · {tenor}
        </span>
        <span
          data-testid={`leg-${id}-value-date`}
          className="font-mono text-[10px] uppercase tracking-tight text-text-mute"
        >
          {date}
        </span>
      </div>

      {/* Raw forward points (bid | ask) */}
      <div className="grid grid-cols-2 gap-x-2 text-center">
        <div>
          <span
            data-testid={`leg-${id}-points-bid`}
            className="font-mono text-sm tabular-nums text-text"
          >
            {fmtPoints(points.bid)}
          </span>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Bid pips</div>
        </div>
        <div>
          <span
            data-testid={`leg-${id}-points-ask`}
            className="font-mono text-sm tabular-nums text-text"
          >
            {fmtPoints(points.ask)}
          </span>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Ask pips</div>
        </div>
      </div>

      {/* Per-leg bid/ask margin steppers (stacked to prevent overflow) */}
      {!readOnly && (
        <div className="flex flex-col gap-1.5">
          <span className="text-center text-[10px] uppercase tracking-tight text-text-mute">
            {id} margin
          </span>
          <div className="flex justify-center">
            <MarginRow
              testIdSuffix="bid"
              idPrefix={`${id}-`}
              labelPrefix={`${id} `}
              value={margin.bid}
              onChange={(n) => onMarginChange({ bid: Math.max(0, Math.floor(n)), ask: margin.ask })}
              glow={false}
              disabled={bidLocked}
            />
          </div>
          <div className="flex justify-center">
            <MarginRow
              testIdSuffix="ask"
              idPrefix={`${id}-`}
              labelPrefix={`${id} `}
              value={margin.ask}
              onChange={(n) => onMarginChange({ bid: margin.bid, ask: Math.max(0, Math.floor(n)) })}
              glow={false}
              disabled={askLocked}
            />
          </div>
          {showBalanceZero && (
            <BalanceZeroRow
              marginPair={margin}
              onMarginPairChange={onMarginChange}
              idPrefix={id}
              minMargin={0}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function SwapLegsSection({
  nearTenor,
  farTenor,
  nearDate,
  farDate,
  nearPoints,
  farPoints,
  componentNet,
  nearMargin,
  farMargin,
  onNearMarginChange,
  onFarMarginChange,
  bidLocked,
  askLocked,
  showBalanceZero,
  readOnly,
}: SwapLegsSectionProps) {
  return (
    <section
      data-testid="swap-legs-section"
      aria-label="Swap legs and component markup"
      className="flex flex-col gap-3 rounded-sm border border-border bg-bg-elevated/40 p-3"
    >
      <div className="flex gap-3">
        <LegCol
          id="near"
          tenor={nearTenor}
          date={nearDate}
          points={nearPoints}
          margin={nearMargin}
          onMarginChange={onNearMarginChange}
          bidLocked={bidLocked}
          askLocked={askLocked}
          showBalanceZero={showBalanceZero}
          readOnly={readOnly}
        />
        <div className="w-px self-stretch bg-border" />
        <LegCol
          id="far"
          tenor={farTenor}
          date={farDate}
          points={farPoints}
          margin={farMargin}
          onMarginChange={onFarMarginChange}
          bidLocked={bidLocked}
          askLocked={askLocked}
          showBalanceZero={showBalanceZero}
          readOnly={readOnly}
        />
      </div>

      {/* Component-adjusted net — prominent anchor the side tiles mark up from. */}
      <div className="flex items-center justify-between rounded-sm border border-border-focus/40 bg-bg-elevated/60 px-3 py-2">
        <span className="text-[10px] uppercase tracking-tight text-text-mute">Net swap points</span>
        <div className="flex gap-6">
          <div className="text-center">
            <span
              data-testid="swap-net-bid"
              className="font-mono text-base tabular-nums text-text"
            >
              {fmtPoints(componentNet.bid)}
            </span>
            <div className="text-[10px] uppercase tracking-tight text-text-mute">Bid</div>
          </div>
          <div className="text-center">
            <span
              data-testid="swap-net-ask"
              className="font-mono text-base tabular-nums text-text"
            >
              {fmtPoints(componentNet.ask)}
            </span>
            <div className="text-[10px] uppercase tracking-tight text-text-mute">Ask</div>
          </div>
        </div>
      </div>
    </section>
  );
}
