import clsx from 'clsx';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import StatusCell from '@/features/blotter/StatusCell';
import { derivedStatus } from '@/features/blotter/statusFromMachines';
import { formatTime } from '@/lib/format';
import { quoteSideFor } from '@/lib/quoteSide';
import type { PriceTick } from '@/services/feed/types';
import { usePrice } from '@/services/feed/usePrice';
import { getMarketContext } from '@/services/suggestion/marketContext';
import { forwardPointsFeed } from '@/services/feed/forwardPoints';
import { useSuggestionState } from './useSuggestionState';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import { isForwardTenor, type MarginPair } from '@/types/deal';
import ClientSummaryPanel from './ClientSummaryPanel';
import DealSummaryPanel from './DealSummaryPanel';
import PricingPanel from './PricingPanel';
import ForwardPointsPanel, { type MarkupMode } from './pricing/ForwardPointsPanel';
import LegTabs from './pricing/LegTabs';
import ReasonsPanel from './ReasonsPanel';
import SuggestionPanel from './SuggestionPanel';
import SummaryPanel from './SummaryPanel';
import TicketFooter from './TicketFooter';

// FXSW-014 shell. Renders only when uiStore.openDealId is set. Slides in
// from the right via transform: translateX over 240ms per docs/02 §1 +
// docs/05 §2; backdrop click + Esc both close. Opening fires SI PickUp
// for the deal (only if SI is still in Initial — re-opening a PickedUp
// deal does not double-fire). Closing does not auto-Hold per
// docs/02 §4.8 — the operator releases explicitly via the Release button
// (Footer is FXSW-019/021, out of scope here).
export default function TicketPanel() {
  const openDealId = useUiStore((s) => s.openDealId);
  const entry = useDealsStore((s) => (openDealId ? s.deals.get(openDealId) : undefined));
  const [slidIn, setSlidIn] = useState(false);
  // FXSW-039: dual-margin state. Each side carries an independent pip
  // markup. The AI suggestion engine returns a single value applied to
  // both sides on Apply; Undo restores the prior pair losslessly via
  // the saved pair below.
  const defaultPips = entry?.deal.defaultMarginPips ?? 3;
  const [marginPair, setMarginPair] = useState<MarginPair>({
    bid: defaultPips,
    ask: defaultPips,
  });
  const [savedPairForUndo, setSavedPairForUndo] = useState<MarginPair | null>(null);
  // FXSW-057: forward-points margin (component mode) + markup mode. Spot deals
  // ignore both.
  const [fwdMarginPair, setFwdMarginPair] = useState<MarginPair>({ bid: 0, ask: 0 });
  const [markupMode, setMarkupMode] = useState<MarkupMode>('component');
  // Convenience setter for the AI-suggestion Apply path — writes both
  // sides equal so a single suggested pip value applies symmetrically.
  const setMargin = useCallback((n: number) => {
    setMarginPair({ bid: n, ask: n });
  }, []);
  const margin = marginPair.bid;
  // Pricing mode is per-open-deal local state. Lifted from PricingPanel
  // in FXSW-019 so ClientSummaryPanel can read the same display tick.
  const [pricingMode, setPricingMode] = useState<'streaming' | 'fixed'>('streaming');
  const [fixedSide, setFixedSide] = useState<'bid' | 'ask' | null>(null);
  const [frozenTick, setFrozenTick] = useState<PriceTick | null>(null);
  // We always subscribe to the live tick (cheap, single subscription
  // per ticket session); the display tick switches based on
  // pricingMode.
  const liveTick = usePrice(entry?.deal.pair ?? 'EURUSD');
  const displayTick = pricingMode === 'fixed' ? frozenTick : liveTick;
  // AI suggestion lifecycle (FXSW-025/026), extracted to a hook in FXSW-057.
  const { suggestion, recompute: computeAndSetSuggestion } = useSuggestionState(entry, liveTick);

  // Reset margin + pricing mode whenever a different deal opens.
  useEffect(() => {
    if (entry) {
      setMarginPair({
        bid: entry.deal.defaultMarginPips,
        ask: entry.deal.defaultMarginPips,
      });
      setSavedPairForUndo(null);
      setFwdMarginPair({ bid: 0, ask: 0 });
      setMarkupMode('component');
      setPricingMode('streaming');
      setFixedSide(null);
      setFrozenTick(null);
    }
  }, [openDealId, entry]);

  // Esc closes. Listener only active while open.
  useEffect(() => {
    if (!openDealId) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') useUiStore.getState().closeTicket();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openDealId]);

  // Fire SI PickUp once per open, only if the deal is still in Initial.
  useEffect(() => {
    if (!openDealId) return;
    const cur = useDealsStore.getState().deals.get(openDealId);
    if (cur && cur.siState === 'Initial') {
      useDealsStore.getState().forwardEvent(openDealId, { type: 'PickUp' });
    }
  }, [openDealId]);

  // Two-pass mount so the slide-in animates from `translate-x-full` to
  // `translate-x-0`. Reset whenever a different deal opens.
  useEffect(() => {
    if (!openDealId) {
      setSlidIn(false);
      return;
    }
    const handle = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(handle);
  }, [openDealId]);

  if (!openDealId || !entry) return null;

  const { deal, rejectionReasons, siState, rfsState, dealable } = entry;
  const status = derivedStatus(rfsState, siState, dealable);
  // Forward pricing (FXSW-057). Forward points are stable per (pair, tenor).
  // In all-in markup mode the forward-points margin is held at zero (the spot
  // margin applies to the whole outright).
  const isForward = isForwardTenor(deal.tenor);
  const fwdPoints = isForward ? forwardPointsFeed.get(deal.pair, deal.tenor) : 0;
  const effectiveFwdMargin: MarginPair =
    markupMode === 'all-in' ? { bid: 0, ask: 0 } : fwdMarginPair;

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={() => useUiStore.getState().closeTicket()}
      role="presentation"
    >
      <div
        data-testid="ticket-panel"
        data-deal-id={deal.dealId}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Sales Intervention ticket"
        className={clsx(
          'absolute right-0 top-0 flex h-full w-full max-w-full flex-col border-l border-border bg-bg-glass shadow-2xl backdrop-blur-xl backdrop-saturate-150 transition-transform duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[640px]',
          slidIn ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="font-sans text-sm font-medium text-text">
              Sales Intervention
            </span>
            <span className="font-mono text-xs text-text-mute">{deal.dealId}</span>
          </div>
          <button
            type="button"
            aria-label="Close ticket"
            onClick={() => useUiStore.getState().closeTicket()}
            className="rounded-sm p-1 text-text-dim transition-colors hover:bg-bg-row-hover hover:text-text"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <StatusCell status={status} />
            <span className="font-mono text-xs uppercase tracking-tight text-text-dim">
              {formatTime(deal.createdAt)}
            </span>
          </div>

          <ReasonsPanel reasons={rejectionReasons} />
          <SuggestionPanel
            suggestion={suggestion}
            currentMargin={margin}
            onApply={(pips) => {
              setSavedPairForUndo(marginPair);
              setMarginPair({ bid: pips, ask: pips });
            }}
            onUndo={() => {
              if (savedPairForUndo) {
                setMarginPair(savedPairForUndo);
                setSavedPairForUndo(null);
              }
            }}
            onRecompute={computeAndSetSuggestion}
            onReject={() =>
              useDealsStore.getState().forwardEvent(deal.dealId, { type: 'Reject' })
            }
            currentVolatility={getMarketContext(deal.pair).pairVolatility}
          />
          <SummaryPanel deal={deal} />
          <PricingPanel
            pair={deal.pair}
            liveTick={liveTick}
            frozenTick={frozenTick}
            pricingMode={pricingMode}
            fixedSide={fixedSide}
            margin={margin}
            onMarginChange={setMargin}
            onEnterFixed={(side) => {
              if (!liveTick) return;
              setPricingMode('fixed');
              setFixedSide(side);
              setFrozenTick(liveTick);
            }}
            onExitFixed={() => {
              setPricingMode('streaming');
              setFixedSide(null);
              setFrozenTick(null);
            }}
            quoteSide={quoteSideFor(deal.side, deal.dealtCcy)}
            marginPair={marginPair}
            onMarginPairChange={setMarginPair}
            onRefresh={() => {
              if (liveTick) setFrozenTick(liveTick);
            }}
          />
          {isForward && (
            <>
              <LegTabs legs={deal.legs ?? []} />
              <ForwardPointsPanel
                pair={deal.pair}
                tenor={deal.tenor}
                tick={displayTick}
                fwdPoints={fwdPoints}
                markupMode={markupMode}
                onMarkupModeChange={setMarkupMode}
                fwdMarginPair={effectiveFwdMargin}
                onFwdMarginPairChange={setFwdMarginPair}
              />
            </>
          )}
          <ClientSummaryPanel
            tick={displayTick}
            marginPair={marginPair}
            notional={deal.notional}
            pair={deal.pair}
            quoteSide={quoteSideFor(deal.side, deal.dealtCcy)}
            fwdPoints={isForward ? fwdPoints : undefined}
            fwdMarginPair={effectiveFwdMargin}
          />
          <DealSummaryPanel deal={deal} />
        </div>
        <TicketFooter
          dealId={deal.dealId}
          siState={siState}
          pricingMode={pricingMode}
          onReturnToStream={() => {
            setPricingMode('streaming');
            setFixedSide(null);
            setFrozenTick(null);
          }}
        />
      </div>
    </div>
  );
}
