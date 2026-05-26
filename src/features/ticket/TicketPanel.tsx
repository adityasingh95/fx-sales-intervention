import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import StatusCell from '@/features/blotter/StatusCell';
import { derivedStatus } from '@/features/blotter/statusFromMachines';
import { formatTime } from '@/lib/format';
import type { PriceTick } from '@/services/feed/types';
import { usePrice } from '@/services/feed/usePrice';
import { getClientProfile } from '@/services/suggestion/clientProfiles';
import { suggestMargin } from '@/services/suggestion/engine';
import { getMarketContext } from '@/services/suggestion/marketContext';
import type { MarginSuggestion } from '@/services/suggestion/types';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import ClientSummaryPanel from './ClientSummaryPanel';
import DealSummaryPanel from './DealSummaryPanel';
import PricingPanel from './PricingPanel';
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
  // Margin is per-open-deal local state for now. FXSW-025 will source
  // it from an AI suggestion + Apply, and the deal-machine context
  // ultimately holds the canonical value (docs/03 §6) — at that point
  // this lifts into the store. Initialised from the deal's default
  // (3 pips per the dealFeed payload) when a new deal opens.
  const [margin, setMargin] = useState<number>(entry?.deal.defaultMarginPips ?? 3);
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
  // AI suggestion (FXSW-025). Computed once per PickedUp visit, snapshotting
  // the tick at compute time so live ticks don't recompute (per docs/09 §9).
  // FXSW-026 adds Recompute + vol-shift triggers + the credit-decline UI.
  const [suggestion, setSuggestion] = useState<MarginSuggestion | null>(null);
  const suggestionComputed = useRef(false);

  // Reset margin + pricing mode whenever a different deal opens.
  useEffect(() => {
    if (entry) {
      setMargin(entry.deal.defaultMarginPips);
      setPricingMode('streaming');
      setFixedSide(null);
      setFrozenTick(null);
      setSuggestion(null);
      suggestionComputed.current = false;
    }
  }, [openDealId, entry]);

  // Compute the suggestion on entry to PickedUp. Clears when SI leaves
  // PickedUp; will recompute on re-entry (e.g. after Withdraw).
  useEffect(() => {
    if (!entry || entry.siState !== 'PickedUp') {
      setSuggestion(null);
      suggestionComputed.current = false;
      return;
    }
    if (suggestionComputed.current) return;
    if (!liveTick) return;
    suggestionComputed.current = true;
    const profile = getClientProfile(entry.deal.clientName);
    const marketStatic = getMarketContext(entry.deal.pair);
    setSuggestion(
      suggestMargin({
        deal: {
          pair: entry.deal.pair,
          side: entry.deal.side,
          notional: entry.deal.notional,
          defaultMarginPips: entry.deal.defaultMarginPips,
          rejectionReasons: entry.rejectionReasons,
        },
        client: profile,
        market: {
          currentBid: liveTick.bid,
          currentAsk: liveTick.ask,
          ...marketStatic,
        },
      }),
    );
  }, [entry, liveTick]);

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
            onApply={setMargin}
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
            onRefresh={() => {
              if (liveTick) setFrozenTick(liveTick);
            }}
          />
          <ClientSummaryPanel
            tick={displayTick}
            margin={margin}
            notional={deal.notional}
            pair={deal.pair}
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
