import clsx from 'clsx';
import type { DealLeg } from '@/types/deal';

// Swap-extension seam (FXSW-057). v3 forwards are a single NEAR leg, so this
// renders nothing. A later swap (NEAR + FAR) renders one tab per leg with no
// other plumbing changes.
export interface LegTabsProps {
  legs: DealLeg[];
  activeIndex?: number;
  onSelect?: (index: number) => void;
}

export default function LegTabs({ legs, activeIndex = 0, onSelect }: LegTabsProps) {
  if (legs.length <= 1) return null;
  return (
    <div data-testid="leg-tabs" className="flex gap-1">
      {legs.map((leg, i) => (
        <button
          key={`${leg.kind}-${leg.tenor}`}
          type="button"
          data-testid={`leg-tab-${leg.kind.toLowerCase()}`}
          onClick={() => onSelect?.(i)}
          className={clsx(
            'rounded-sm border px-2 py-1 text-xs font-medium uppercase tracking-tight transition-colors',
            i === activeIndex
              ? 'border-border-focus text-text'
              : 'border-border text-text-dim hover:text-text',
          )}
        >
          {leg.kind} {leg.tenor}
        </button>
      ))}
    </div>
  );
}
