import clsx from 'clsx';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Pill from '@/components/Pill';
import { isV4 } from '@/lib/devVersion';
import { formatTime } from '@/lib/format';
import { clientDirectionForDealtSide, clientSideLabelForDealtSide } from '@/lib/quoteSide';
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

// A column value, emphasized when it's the side the client actually dealt on and
// dimmed when it's the off (quoted-but-not-dealt) side (FXSW-092).
const colClass = (scope: 'bid' | 'ask', dealtSide?: 'bid' | 'ask'): string =>
  clsx(
    'text-right tabular-nums',
    dealtSide && scope === dealtSide
      ? 'font-semibold text-text'
      : dealtSide
        ? 'text-text-mute'
        : 'text-text',
  );

function SwapMarkupDetail({
  mode,
  net,
  components,
  quoteSide = 'BOTH',
  dealtSide,
}: {
  mode: 'PER_COMPONENT' | 'TOTAL';
  net: MarginPair;
  components?: { spot: MarginPair; near: MarginPair; far: MarginPair };
  quoteSide?: 'BID' | 'ASK' | 'BOTH';
  // The side the client dealt on (lower-cased), highlighted among the columns.
  dealtSide?: 'bid' | 'ask';
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
  const head = (scope: 'bid' | 'ask', label: string) => (
    <span
      className={clsx(
        'w-8 text-right',
        dealtSide === scope ? 'font-semibold text-text' : 'text-text-mute',
      )}
    >
      {label}
      {dealtSide === scope ? ' ◂' : ''}
    </span>
  );
  return (
    <div className="flex flex-col gap-0.5 font-mono text-xs">
      <div className="flex text-[10px] uppercase tracking-tight text-text-mute">
        <span className="w-16" />
        {showBid && head('bid', 'Bid')}
        {showAsk && <span className="ml-3 inline-block">{head('ask', 'Ask')}</span>}
        <span className="ml-2 text-text-mute">pips</span>
      </div>
      {rows.map(({ label, bid, ask }) => (
        <div key={label} className="flex items-baseline">
          <span className="w-16 text-text-mute">{label}</span>
          {showBid && <span className={clsx('w-8', colClass('bid', dealtSide))}>{bid}</span>}
          {showAsk && <span className={clsx('ml-3 w-8', colClass('ask', dealtSide))}>{ask}</span>}
        </div>
      ))}
      <div className="flex items-baseline border-t border-border pt-0.5">
        <span className="w-16 font-medium text-text-mute">Net</span>
        {showBid && <span className={clsx('w-8', colClass('bid', dealtSide))}>{net.bid}</span>}
        {showAsk && <span className={clsx('ml-3 w-8', colClass('ask', dealtSide))}>{net.ask}</span>}
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

  const { deal, rejectionReasons, outcome, archivedAt, events, requestId, tradeId, executedSide } =
    entry;
  const priceBack = [...events].reverse().find((e) => e.phase === 'PRICE_BACK');
  const swapNetMargin =
    priceBack?.appliedMargin?.kind === 'swap' ? priceBack.appliedMargin.net : undefined;
  const isSwap = instrumentOf(deal) === 'SWAP';
  // ESP deals are auto-priced — there's no trader markup to explain (FXSW-070).
  const autoPriced = events.some((e) => e.phase === 'AUTO_PRICE');
  // FXSW-092: a deal executes on exactly one side. Highlight it across the
  // pricing breakdowns, and note when the original request was two-way.
  const dealtScope = executedSide ? (executedSide === 'BID' ? 'bid' : 'ask') : undefined;
  const wasTwoWay = deal.side === 'BOTH';

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

          {outcome === 'Executed' && executedSide ? (
            <section
              data-testid="execution-side"
              data-executed-side={executedSide}
              aria-label="Executed side"
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm border border-border bg-bg-elevated/40 px-3 py-2 text-xs"
            >
              <span className="uppercase tracking-tight text-text-mute">Dealt</span>
              {!isSwap && (
                <span className="font-medium text-text">
                  {clientDirectionForDealtSide(executedSide, deal.pair)}
                </span>
              )}
              <span className="rounded-sm bg-bg-elevated px-1.5 py-0.5 font-mono uppercase tracking-tight text-text-dim">
                {clientSideLabelForDealtSide(executedSide)}
              </span>
              <span className="text-text-mute">·</span>
              <span className="rounded-sm bg-bg-elevated px-1.5 py-0.5 font-mono uppercase tracking-tight text-text-dim">
                Bank {executedSide.toLowerCase()}
              </span>
              {wasTwoWay ? (
                <span data-testid="execution-request-note" className="text-text-mute">
                  · two-way request, executed one side
                </span>
              ) : null}
            </section>
          ) : null}

          <ReasonsPanel reasons={rejectionReasons} />
          <SummaryPanel deal={deal} />
          {isSwap && (
            <SwapLegDetail deal={deal} executedNetMargin={swapNetMargin} dealtSide={dealtScope} />
          )}

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
                      dealtSide={dealtScope}
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
