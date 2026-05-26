import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import StatusCell from '@/features/blotter/StatusCell';
import { derivedStatus } from '@/features/blotter/statusFromMachines';
import { formatAmount, formatTime } from '@/lib/format';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import ReasonsPanel from './ReasonsPanel';

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

        <div className="flex-1 overflow-auto px-5 py-4">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StatusCell status={status} />
              <span className="font-mono text-xs uppercase tracking-tight text-text-dim">
                {formatTime(deal.createdAt)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <div className="text-xs uppercase tracking-tight text-text-mute">Client</div>
                <div className="text-text">{deal.clientName}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-tight text-text-mute">Account</div>
                <div className="font-mono text-text">{deal.accountCode}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-tight text-text-mute">Pair</div>
                <div className="font-mono uppercase text-text">{deal.pair}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-tight text-text-mute">Side</div>
                <div
                  className={clsx(
                    'font-mono font-medium',
                    deal.side === 'BUY' ? 'text-green' : 'text-red',
                  )}
                >
                  {deal.side}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-tight text-text-mute">Amount</div>
                <div className="font-mono tabular-nums text-text">
                  {formatAmount(deal.notional, deal.pair)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-tight text-text-mute">Tenor</div>
                <div className="font-mono uppercase text-text">{deal.tenor}</div>
              </div>
            </div>

            <ReasonsPanel reasons={rejectionReasons} />

            <p className="mt-4 text-xs text-text-mute">
              Summary, Pricing, AI Suggestion, Client Summary, Deal Summary, and Footer
              panels land in FXSW-016 through FXSW-021.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
