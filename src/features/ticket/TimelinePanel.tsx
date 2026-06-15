import { Clock } from 'lucide-react';
import { formatTime } from '@/lib/format';
import type { DealLifecycleEvent, LifecyclePhase } from '@/types/lifecycle';

// Timestamped lifecycle timeline for the historic detail view (FXSW-060):
// request → pickup → release → price-back → response.

const PHASE_LABEL: Record<LifecyclePhase, string> = {
  REQUEST: 'Request',
  PICKUP: 'Picked up',
  RELEASE: 'Released',
  PRICE_BACK: 'Priced back',
  WITHDRAWN: 'Quote withdrawn',
  RESPONSE: 'Response',
};

export interface TimelinePanelProps {
  events: DealLifecycleEvent[];
}

export default function TimelinePanel({ events }: TimelinePanelProps) {
  return (
    <section
      data-testid="timeline-panel"
      aria-label="Lifecycle timeline"
      className="flex flex-col gap-2"
    >
      <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">Timeline</h2>
      {events.length === 0 ? (
        <p className="text-sm text-text-mute">No lifecycle events recorded.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {events.map((e, i) => (
            <li
              key={`${e.phase}-${e.at}-${i}`}
              data-phase={e.phase}
              className="flex items-center gap-3 rounded-sm border border-border bg-bg-elevated px-3 py-2"
            >
              <Clock size={14} className="shrink-0 text-text-mute" aria-hidden />
              <span className="w-20 shrink-0 font-mono text-xs tabular-nums text-text-dim">
                {formatTime(e.at)}
              </span>
              <span className="flex-1 text-sm text-text">{PHASE_LABEL[e.phase]}</span>
              <span className="font-mono text-xs uppercase tracking-tight text-text-mute">
                {e.toState}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
