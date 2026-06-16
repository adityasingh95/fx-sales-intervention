import clsx from 'clsx';
import { formatRate } from '@/lib/format';
import { allInRate, clientForwardPair } from '@/lib/pips';
import type { QuoteSide } from '@/lib/quoteSide';
import type { ForwardPointsPair } from '@/services/feed/forwardPoints';
import type { Pair, PriceTick } from '@/services/feed/types';
import type { MarginPair, Tenor } from '@/types/deal';
import { BalanceZeroRow, MarginRow } from './MarginControls';

// Forward outright pricing (v3, FXSW-057). Shows the forward points and the
// all-in outright (spot + points), plus a markup-mode toggle:
//   - all-in     → markup is applied via the Trader Rate (spot) margin; the
//                  forward-points margin row is hidden and held at zero.
//   - component  → an independent forward-points margin row is shown alongside
//                  the spot margin in the Trader Rate panel.
// Rendered only for non-SPOT deals.

export type MarkupMode = 'all-in' | 'component';

// Module-level so its identity is stable across the panel's ~300ms tick
// re-renders. Declaring it inside the component body remounted both buttons on
// every render, causing hover flicker and intermittently dropped clicks.
function ToggleButton({
  mode,
  label,
  active,
  onSelect,
}: {
  mode: MarkupMode;
  label: string;
  active: boolean;
  onSelect: (mode: MarkupMode) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`markup-mode-${mode}`}
      aria-pressed={active}
      onClick={() => onSelect(mode)}
      className={clsx(
        'rounded-sm border px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-border-focus text-text'
          : 'border-border text-text-dim hover:text-text',
      )}
    >
      {label}
    </button>
  );
}

export interface ForwardPointsPanelProps {
  pair: Pair;
  tenor: Tenor;
  tick: PriceTick | null;
  // FXSW-075: two-sided forward points — bid all-in uses bid points, ask uses
  // ask points, the mid is the un-marked outright reference.
  fwdPoints: ForwardPointsPair;
  markupMode: MarkupMode;
  onMarkupModeChange: (mode: MarkupMode) => void;
  // The spot (Trader Rate) margin — folded into the all-in figures so the
  // outright reflects the full client markup.
  marginPair: MarginPair;
  fwdMarginPair: MarginPair;
  onFwdMarginPairChange: (next: MarginPair) => void;
  marginGlow?: boolean;
  // FXSW-068 (v3): which side(s) the request can be quoted on, and whether to
  // lock the non-quotable side's forward-points markup + hide Balance/Zero.
  quoteSide?: QuoteSide;
  restrictMarginSides?: boolean;
}

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

export default function ForwardPointsPanel({
  pair,
  tenor,
  tick,
  fwdPoints,
  markupMode,
  onMarkupModeChange,
  marginPair,
  fwdMarginPair,
  onFwdMarginPairChange,
  marginGlow = false,
  quoteSide = 'BOTH',
  restrictMarginSides = false,
}: ForwardPointsPanelProps) {
  const bidMarginLocked = restrictMarginSides && quoteSide === 'ASK';
  const askMarginLocked = restrictMarginSides && quoteSide === 'BID';
  const showBalanceZero = !(restrictMarginSides && quoteSide !== 'BOTH');
  // All-in bid/ask are the *client* outright — spot + forward points marked up
  // by both margin components, per side — so Balance/Zero and the per-side
  // forward-points margin visibly move them (matches ClientSummaryPanel). The
  // mid stays the un-marked outright reference.
  const clientAllIn = tick ? clientForwardPair(tick, fwdPoints, marginPair, fwdMarginPair, pair) : null;
  const allInBid = clientAllIn?.bid ?? null;
  const allInAsk = clientAllIn?.ask ?? null;
  const allInMid = tick ? allInRate(tick.mid, fwdPoints.mid, pair) : null;

  return (
    <section
      data-testid="forward-points-panel"
      data-tenor={tenor}
      aria-label="Forward pricing"
      className="flex flex-col gap-3 rounded-sm border border-border bg-bg-elevated/40 p-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
          Forward {tenor}
        </h2>
        <div data-testid="markup-mode-toggle" className="flex gap-1">
          <ToggleButton
            mode="all-in"
            label="All-in"
            active={markupMode === 'all-in'}
            onSelect={onMarkupModeChange}
          />
          <ToggleButton
            mode="component"
            label="Per-component"
            active={markupMode === 'component'}
            onSelect={onMarkupModeChange}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-tight text-text-mute">Forward points</span>
        <div className="grid grid-cols-3 gap-x-4 text-center">
          <div>
            <span data-testid="fwd-points-bid" className="font-mono tabular-nums text-text">
              {fmtPoints(fwdPoints.bid)}
            </span>
            <span className="ml-1 text-xs text-text-mute">pips</span>
            <div className="text-[10px] uppercase tracking-tight text-text-mute">Bid</div>
          </div>
          <div>
            <span data-testid="fwd-points-mid" className="font-mono tabular-nums text-text-dim">
              {fmtPoints(fwdPoints.mid)}
            </span>
            <span className="ml-1 text-xs text-text-mute">pips</span>
            <div className="text-[10px] uppercase tracking-tight text-text-mute">Mid</div>
          </div>
          <div>
            <span data-testid="fwd-points-ask" className="font-mono tabular-nums text-text">
              {fmtPoints(fwdPoints.ask)}
            </span>
            <span className="ml-1 text-xs text-text-mute">pips</span>
            <div className="text-[10px] uppercase tracking-tight text-text-mute">Ask</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 text-center">
        <div>
          <div data-testid="all-in-bid" className="font-mono text-base tabular-nums text-text">
            {allInBid === null ? '—' : formatRate(allInBid, pair)}
          </div>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">All-in bid</div>
        </div>
        <div>
          <div data-testid="all-in-mid" className="font-mono text-base tabular-nums text-text-dim">
            {allInMid === null ? '—' : formatRate(allInMid, pair)}
          </div>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">All-in mid</div>
        </div>
        <div>
          <div data-testid="all-in-ask" className="font-mono text-base tabular-nums text-text">
            {allInAsk === null ? '—' : formatRate(allInAsk, pair)}
          </div>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">All-in ask</div>
        </div>
      </div>

      {markupMode === 'component' ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-tight text-text-mute">
            Forward points margin
          </span>
          <div className="flex items-start gap-4">
            <div className="flex flex-1 justify-center">
              <MarginRow
                testIdSuffix="bid"
                idPrefix="fwd-"
                labelPrefix="forward "
                value={fwdMarginPair.bid}
                onChange={(n) =>
                  onFwdMarginPairChange({ bid: Math.max(0, Math.floor(n)), ask: fwdMarginPair.ask })
                }
                glow={marginGlow}
                disabled={bidMarginLocked}
              />
            </div>
            <div className="flex flex-1 justify-center">
              <MarginRow
                testIdSuffix="ask"
                idPrefix="fwd-"
                labelPrefix="forward "
                value={fwdMarginPair.ask}
                onChange={(n) =>
                  onFwdMarginPairChange({ bid: fwdMarginPair.bid, ask: Math.max(0, Math.floor(n)) })
                }
                glow={marginGlow}
                disabled={askMarginLocked}
              />
            </div>
          </div>
          {showBalanceZero && (
            <BalanceZeroRow
              marginPair={fwdMarginPair}
              onMarginPairChange={onFwdMarginPairChange}
              idPrefix="fwd-"
              minMargin={0}
            />
          )}
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-text-mute">
          All-in markup: the Trader Rate margin applies to the full outright.
        </p>
      )}
    </section>
  );
}
