import { createScenarioPlayer } from '@/services/scenarios/player';
import type { DealEvent, DealFeed } from './types';

type Subscriber = (event: DealEvent) => void;

const subscribers = new Set<Subscriber>();

const emit = (event: DealEvent): void => {
  for (const cb of subscribers) cb(event);
};

const player = createScenarioPlayer({ emit });

export const dealFeed: DealFeed = {
  subscribe(cb) {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  },

  inject(scenarioId, overrides) {
    player.inject(scenarioId, overrides);
  },

  reset() {
    player.reset();
  },

  notifyDealState(dealId, siState) {
    player.notifyDealState(dealId, siState);
  },
};
