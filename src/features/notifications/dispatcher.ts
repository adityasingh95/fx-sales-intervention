import { formatAmount } from '@/lib/format';
import { useDealsStore, type DealEntry } from '@/state/stores/dealsStore';
import { useNotificationsStore } from '@/state/stores/notificationsStore';
import { flashDocumentTitle } from '@/features/notifications/titleFlash';

// Subscribes to dealsStore. When a deal first appears in Active with
// siState='Initial' AND dealable=true AND has rejectionReasons (i.e. SI
// channel, not ESP), fires the visual notification: toast + title flash.
// Audio chime is wired separately by `useNotificationSound` (FXSW-029),
// which subscribes to the notifications store's `notifiedDealIds.size`
// growth.
//
// Per docs/02 §5.1, the notification does NOT re-fire when a previously-
// picked-up deal is Released back to dealable. The notifications store's
// `notifiedDealIds` Set is the source of truth for "have we already
// notified for this deal."

function actionVerb(side: DealEntry['deal']['side']): string {
  if (side === 'BUY') return 'buy';
  if (side === 'SELL') return 'sell';
  return 'trade';
}

// Exported for unit tests; consumers should use `dispatchNotifications`.
export function buildMessage(entry: DealEntry): string {
  const verb = actionVerb(entry.deal.side);
  const amount = formatAmount(entry.deal.notional, entry.deal.pair, entry.deal.dealtCcy);
  return `New SI request: ${entry.deal.clientName} wants to ${verb} ${amount} ${entry.deal.pair}.`;
}

export function dispatchNotifications(deals: ReadonlyMap<string, DealEntry>): void {
  const store = useNotificationsStore.getState();
  for (const entry of deals.values()) {
    // SI-only — ESP deals are auto-priced and don't need trader attention.
    if (entry.rejectionReasons.length === 0) continue;
    if (entry.siState !== 'Initial') continue;
    if (!entry.dealable) continue;
    if (store.hasNotified(entry.deal.dealId)) continue;
    store.markNotified(entry.deal.dealId);
    store.addToast({
      dealId: entry.deal.dealId,
      message: buildMessage(entry),
    });
    flashDocumentTitle();
  }
}

let unsubscribe: (() => void) | null = null;

export function wireNotifications(): void {
  if (unsubscribe) return;
  // Initial pass for any deals already in the store at wire-time.
  dispatchNotifications(useDealsStore.getState().deals);
  unsubscribe = useDealsStore.subscribe((state) => {
    dispatchNotifications(state.deals);
  });
}

export function unwireNotifications(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
