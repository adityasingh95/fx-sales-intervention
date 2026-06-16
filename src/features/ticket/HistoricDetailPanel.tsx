import clsx from 'clsx';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Pill from '@/components/Pill';
import { formatTime } from '@/lib/format';
import { useHistoricDealById, type HistoricOutcome } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import type { AppliedMargin } from '@/types/lifecycle';
import DealSummaryPanel from './DealSummaryPanel';
import ReasonsPanel from './ReasonsPanel';
import SummaryPanel from './SummaryPanel';
import TimelinePanel from './TimelinePanel';

// Read-only historic trade detail (FXSW-060). Reuses the TicketPanel overlay
// shell (fixed inset, slide-in, Esc + backdrop close) but has no footer and no
// machine wiring — it renders a snapshot.

const OUTCOME_PILL: Record<HistoricOutcome, 'green' | 'red' | 'grey'> = {
  Executed: 'green',
  'Rejected by Trader': 'red',
  'Rejected by Client': 'red',
  Expired: 'grey',
  Cancelled: 'grey',
};

const formatMargin = (m: AppliedMargin): string => {
  if (m.kind === 'spot') return `Bid ${m.margin.bid} / Ask ${m.margin.ask} pips`;
  return `Spot ${m.spot.bid}/${m.spot.ask} · Fwd ${m.fwd.bid}/${m.fwd.ask} pips`;
};

export default function HistoricDetailPanel() {
  const openHistoricId = useUiStore((s) => s.openHistoricId);
  const entry = useHistoricDealById(openHistoricId ?? '');
  const [slidIn, setSlidIn] = useState(false);

  useEffect(() => {
    if (!openHistoricId) {
      setSlidIn(false);
      return;
    }
    const handle = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(handle);
  }, [openHistoricId]);

  useEffect(() => {
    if (!openHistoricId) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') useUiStore.getState().closeHistoric();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openHistoricId]);

  if (!openHistoricId || !entry) return null;

  const { deal, rejectionReasons, outcome, archivedAt, events, requestId, tradeId } = entry;
  const priceBack = [...events].reverse().find((e) => e.phase === 'PRICE_BACK');
  // ESP deals are auto-priced — there's no trader markup to explain (FXSW-070).
  const autoPriced = events.some((e) => e.phase === 'AUTO_PRICE');

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={() => useUiStore.getState().closeHistoric()}
      role="presentation"
    >
      <div
        data-testid="historic-detail-panel"
        data-deal-id={deal.dealId}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Trade detail"
        className={clsx(
          'absolute right-0 top-0 flex h-full w-full max-w-full flex-col border-l border-border bg-bg-glass shadow-2xl backdrop-blur-xl backdrop-saturate-150 transition-transform duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[640px]',
          slidIn ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="font-sans text-sm font-medium text-text">Trade Detail</span>
            <span className="font-mono text-xs text-text-mute">{deal.dealId}</span>
          </div>
          <button
            type="button"
            aria-label="Close detail"
            onClick={() => useUiStore.getState().closeHistoric()}
            className="rounded-sm p-1 text-text-dim transition-colors hover:bg-bg-row-hover hover:text-text"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <span data-testid="detail-outcome" data-outcome={outcome}>
              <Pill color={OUTCOME_PILL[outcome]}>{outcome}</Pill>
            </span>
            <span className="font-mono text-xs uppercase tracking-tight text-text-dim">
              {formatTime(archivedAt)}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span className="text-text-mute">
              Request ID{' '}
              <span data-testid="detail-request-id" className="font-mono text-text-dim">
                {requestId}
              </span>
            </span>
            {tradeId ? (
              <span className="text-text-mute">
                Trade ID{' '}
                <span data-testid="detail-trade-id" className="font-mono text-text-dim">
                  {tradeId}
                </span>
              </span>
            ) : null}
          </div>

          <ReasonsPanel reasons={rejectionReasons} />
          <SummaryPanel deal={deal} />

          <section
            data-testid="markup-reason"
            aria-label="Markup reason"
            className="flex flex-col gap-2 rounded-sm border border-ai-border bg-ai-bg p-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-ai-accent" aria-hidden />
              <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
                Markup reason
              </h2>
            </div>
            {priceBack?.appliedMargin ? (
              <>
                <div className="text-sm text-text">{formatMargin(priceBack.appliedMargin)}</div>
                <div className="text-xs text-text-dim">
                  {priceBack.aiSuggested ? 'AI-suggested' : 'Manual'}
                  {priceBack.rationale ? ` — ${priceBack.rationale}` : ''}
                </div>
              </>
            ) : autoPriced ? (
              <p className="text-sm text-text-mute">
                Auto-priced — streamed to the client within tolerance, no manual markup
                applied.
              </p>
            ) : (
              <p className="text-sm text-text-mute">
                No price was sent to the client for this deal.
              </p>
            )}
          </section>

          <DealSummaryPanel deal={deal} />
          <TimelinePanel events={events} />
        </div>
      </div>
    </div>
  );
}
