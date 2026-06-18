import clsx from 'clsx';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Pill from '@/components/Pill';
import { isV4 } from '@/lib/devVersion';
import { formatTime } from '@/lib/format';
import { instrumentOf, type MarginPair } from '@/types/deal';
import { useHistoricDealById, type HistoricOutcome } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import type { AppliedMargin } from '@/types/lifecycle';
import DealSummaryPanel from './DealSummaryPanel';
import ReasonsPanel from './ReasonsPanel';
import SummaryPanel from './SummaryPanel';
import SwapLegDetail from './pricing/SwapLegDetail';
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

const formatMargin = (m: Exclude<AppliedMargin, { kind: 'swap' }>): string => {
  if (m.kind === 'spot') return `Bid ${m.margin.bid} / Ask ${m.margin.ask} pips`;
  return `Spot ${m.spot.bid}/${m.spot.ask} · Fwd ${m.fwd.bid}/${m.fwd.ask} pips`;
};

function SwapMarkupDetail({
  mode,
  net,
  components,
  quoteSide = 'BOTH',
}: {
  mode: 'PER_COMPONENT' | 'TOTAL';
  net: MarginPair;
  components?: { spot: MarginPair; near: MarginPair; far: MarginPair };
  quoteSide?: 'BID' | 'ASK' | 'BOTH';
}) {
  if (mode === 'TOTAL' || !components) {
    const modeLabel = mode === 'TOTAL' ? 'Total' : 'Per-component';
    return <>{`Net ${net.bid}/${net.ask} pips · ${modeLabel}`}</>;
  }
  const showBid = quoteSide !== 'ASK';
  const showAsk = quoteSide !== 'BID';
  const rows = [
    { label: 'Spot', bid: components.spot.bid, ask: components.spot.ask },
    { label: 'Near pts', bid: components.near.bid, ask: components.near.ask },
    { label: 'Far pts', bid: components.far.bid, ask: components.far.ask },
  ];
  return (
    <div className="flex flex-col gap-0.5 font-mono text-xs">
      <div className="flex text-[10px] uppercase tracking-tight text-text-mute">
        <span className="w-16" />
        {showBid && <span className="w-8 text-right">Bid</span>}
        {showAsk && <span className="ml-3 w-8 text-right">Ask</span>}
        <span className="ml-2 text-text-mute">pips</span>
      </div>
      {rows.map(({ label, bid, ask }) => (
        <div key={label} className="flex items-baseline">
          <span className="w-16 text-text-mute">{label}</span>
          {showBid && <span className="w-8 text-right tabular-nums text-text">{bid}</span>}
          {showAsk && <span className="ml-3 w-8 text-right tabular-nums text-text">{ask}</span>}
        </div>
      ))}
      <div className="flex items-baseline border-t border-border pt-0.5">
        <span className="w-16 font-medium text-text-mute">Net</span>
        {showBid && <span className="w-8 text-right tabular-nums text-text">{net.bid}</span>}
        {showAsk && <span className="ml-3 w-8 text-right tabular-nums text-text">{net.ask}</span>}
        <span className="ml-2 text-text-mute">pips</span>
      </div>
    </div>
  );
}

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
  const swapNetMargin =
    priceBack?.appliedMargin?.kind === 'swap' ? priceBack.appliedMargin.net : undefined;
  const isSwap = instrumentOf(deal) === 'SWAP';
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
            {isV4() ? (
              <span className="text-text-mute">
                Instrument{' '}
                <span data-testid="deal-instrument" className="font-mono uppercase text-text-dim">
                  {instrumentOf(deal)}
                </span>
              </span>
            ) : null}
          </div>

          <ReasonsPanel reasons={rejectionReasons} />
          <SummaryPanel deal={deal} />
          {isSwap && <SwapLegDetail deal={deal} executedNetMargin={swapNetMargin} />}

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
                <div className="text-sm text-text">
                  {priceBack.appliedMargin.kind === 'swap' ? (
                    <SwapMarkupDetail
                      mode={priceBack.appliedMargin.mode}
                      net={priceBack.appliedMargin.net}
                      components={priceBack.appliedMargin.components}
                      quoteSide={priceBack.appliedMargin.quoteSide}
                    />
                  ) : (
                    formatMargin(priceBack.appliedMargin)
                  )}
                </div>
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
