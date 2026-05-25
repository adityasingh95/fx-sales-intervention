import { dealFeed } from '@/services/feed/dealFeed';
import { useDealsStore } from './dealsStore';

let unsubscribe: (() => void) | null = null;

// Wires NEW_*_DEAL events from the dealFeed into dealsStore.addDeal.
// Idempotent: a second call is a no-op so HMR / repeated mounts don't
// duplicate the subscription. Returns the unsubscribe function for tests.
export const wireDealFeedToStore = (): (() => void) => {
  if (unsubscribe) return unsubscribe;
  const off = dealFeed.subscribe((event) => {
    const store = useDealsStore.getState();
    switch (event.type) {
      case 'NEW_ESP_DEAL':
        store.addDeal(event.deal, [], 'ESP');
        return;
      case 'NEW_SI_DEAL':
        store.addDeal(event.deal, event.rejectionReasons, 'SI');
        return;
      case 'CLIENT_ACCEPT':
        store.forwardEvent(event.dealId, { type: 'TradeConfirmed' });
        return;
      case 'CLIENT_REJECT':
      case 'CLIENT_CANCEL':
        store.forwardEvent(event.dealId, { type: 'ClientReject' });
        return;
      case 'EXPIRE':
        // Expire is an RFS-side event in docs/03 §1; the dealMachine
        // parent doesn't currently forward it. Out of scope for FXSW-013
        // (no scenario in 07-scenario-pack.md uses it). Picked up by a
        // later ticket if/when needed.
        return;
    }
  });
  unsubscribe = () => {
    off();
    unsubscribe = null;
  };
  return unsubscribe;
};
