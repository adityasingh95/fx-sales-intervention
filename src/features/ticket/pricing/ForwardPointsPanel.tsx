import clsx from 'clsx';
import { formatRate } from '@/lib/format';
import { allInRate } from '@/lib/pips';
import type { Pair, PriceTick } from '@/services/feed/types';
import type { MarginPair, Tenor } from '@/types/deal';
import { MarginRow } from './MarginControls';

// Forward outright pricing (v3, FXSW-057). Shows the forward points and the
// all-in outright (spot + points), plus a markup-mode toggle:
//   - all-in     → markup is applied via the Trader Rate (spot) margin; the
//                  forward-points margin row is hidden and held at zero.
//   - component  → an independent forward-points margin row is shown alongside
//                  the spot margin in the Trader Rate panel.
// Rendered only for non-SPOT deals.

export type MarkupMode = 'all-in' | 'component';

export interface ForwardPointsPanelProps {
  pair: Pair;
  tenor: Tenor;
  tick: PriceTick | null;
  fwdPoints: number;
  markupMode: MarkupMode;
  onMarkupModeChange: (mode: MarkupMode) => void;
  fwdMarginPair: MarginPair;
  onFwdMarginPairChange: (next: MarginPair) => void;
  marginGlow?: boolean;
}

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

export default function ForwardPointsPanel({
  pair,
  tenor,
  tick,
  fwdPoints,
  markupMode,
  onMarkupModeChange,
  fwdMarginPair,
  onFwdMarginPairChange,
  marginGlow = false,
}: ForwardPointsPanelProps) {
  const allInBid = tick ? allInRate(tick.bid, fwdPoints, pair) : null;
  const allInMid = tick ? allInRate(tick.mid, fwdPoints, pair) : null;
  const allInAsk = tick ? allInRate(tick.ask, fwdPoints, pair) : null;

  const ToggleButton = ({ mode, label }: { mode: MarkupMode; label: string }) => (
    <button
      type="button"
      data-testid={`markup-mode-${mode}`}
      aria-pressed={markupMode === mode}
      onClick={() => onMarkupModeChange(mode)}
      className={clsx(
        'rounded-sm border px-2 py-1 text-xs font-medium transition-colors',
        markupMode === mode
          ? 'border-border-focus text-text'
          : 'border-border text-text-dim hover:text-text',
      )}
    >
      {label}
    </button>
  );

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
          <ToggleButton mode="all-in" label="All-in" />
          <ToggleButton mode="component" label="Per-component" />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-xs uppercase tracking-tight text-text-mute">Forward points</span>
        <span data-testid="fwd-points" className="font-mono tabular-nums text-text">
          {fmtPoints(fwdPoints)}
        </span>
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
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-text-mute">
          All-in markup: the Trader Rate margin applies to the full outright.
        </p>
      )}
    </section>
  );
}
