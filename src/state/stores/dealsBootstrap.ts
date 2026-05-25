import { dealFeed } from '@/services/feed/dealFeed';
import { useDealsStore } from './dealsStore';

let unsubscribe: (() => void) | null = null;

// Wires NEW_*_DEAL events from the dealFeed into dealsStore.addDeal.
// Idempotent: a second call is a no-op so HMR / repeated mounts don't
// duplicate the subscription. Returns the unsubscribe function for tests.
export const wireDealFeedToStore = (): (() => void) => {
  if (unsubscribe) return unsubscribe;
  const off = dealFeed.subscribe((event) => {
    if (event.type === 'NEW_ESP_DEAL' || event.type === 'NEW_SI_DEAL') {
      useDealsStore.getState().addDeal(event.deal);
    }
  });
  unsubscribe = () => {
    off();
    unsubscribe = null;
  };
  return unsubscribe;
};
