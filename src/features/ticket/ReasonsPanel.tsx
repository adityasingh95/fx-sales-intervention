import { Clock, Maximize2, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { RejectionReason } from '@/types/deal';

// Per docs/02 §4.1 — title, one chip per reason, each chip = icon +
// label + one-line explanation. Labels and explanations are verbatim
// from the spec.
type ReasonDef = {
  icon: LucideIcon;
  label: string;
  explanation: string;
};

const REASONS: Record<RejectionReason, ReasonDef> = {
  OFF_HOURS: {
    icon: Clock,
    label: 'Outside trading window',
    explanation:
      "Current time is outside the auto-pricer's configured hours for this pair.",
  },
  SIZE_LIMIT: {
    icon: Maximize2,
    label: 'Notional exceeds auto-pricing band',
    explanation:
      'Manual approval required for trades over the configured size threshold.',
  },
  CREDIT_LIMIT: {
    icon: ShieldAlert,
    label: 'Client credit limit would be breached',
    explanation: 'Manual approval required.',
  },
};

export interface ReasonsPanelProps {
  reasons: RejectionReason[];
}

export default function ReasonsPanel({ reasons }: ReasonsPanelProps) {
  if (reasons.length === 0) return null;
  return (
    <section
      data-testid="reasons-panel"
      aria-label="Risk Analysis"
      className="flex flex-col gap-2"
    >
      <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
        Risk Analysis
      </h2>
      <ul className="flex flex-col gap-2">
        {reasons.map((r) => {
          const def = REASONS[r];
          const Icon = def.icon;
          return (
            <li
              key={r}
              data-reason={r}
              className="flex items-start gap-3 rounded-sm border border-border bg-bg-elevated px-3 py-2"
            >
              <Icon
                size={16}
                aria-hidden
                className="mt-0.5 shrink-0 text-amber"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text">{def.label}</span>
                <span className="text-xs text-text-dim">{def.explanation}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
