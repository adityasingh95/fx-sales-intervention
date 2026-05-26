import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import StatusCell from '@/features/blotter/StatusCell';
import { derivedStatus } from '@/features/blotter/statusFromMachines';
import { formatTime } from '@/lib/format';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import DealSummaryPanel from './DealSummaryPanel';
import PricingPanel from './PricingPanel';
import ReasonsPanel from './ReasonsPanel';
import SummaryPanel from './SummaryPanel';

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
  useEffect(() => {
    if (entry) setMargin(entry.deal.defaultMarginPips);
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
          <SummaryPanel deal={deal} />
          <PricingPanel pair={deal.pair} margin={margin} onMarginChange={setMargin} />
          <DealSummaryPanel deal={deal} />

          <p className="mt-2 text-xs text-text-mute">
            AI Suggestion, Client Summary, Margin controls, and Footer panels land in
            FXSW-018 through FXSW-021.
          </p>
        </div>
      </div>
    </div>
  );
}
