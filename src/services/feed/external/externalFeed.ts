import { pricingFeed } from '../pricingFeed';
import { fetchMids } from './provider';
import { createPoller, type Poller } from './poller';
import type { ExternalFeedStatus } from './types';

// Singleton orchestrator (FXSW-051), module-singleton like dealFeed. Holds the
// active poller, bridges successful polls into the pricing feed's reference
// anchor, and broadcasts a coarse status for the UI indicator.
//
// OFF by default: nothing here runs until `enable(apiKey)` is called from the
// settings wiring, so tests/E2E (which never enable it) keep the simulated,
// deterministic feed.

let poller: Poller | null = null;
let status: ExternalFeedStatus = 'off';
const statusSubs = new Set<(s: ExternalFeedStatus) => void>();

const setStatus = (s: ExternalFeedStatus): void => {
  status = s;
  for (const cb of statusSubs) cb(s);
};

export type ExternalFeed = {
  enable: (apiKey: string) => void;
  disable: () => void;
  getStatus: () => ExternalFeedStatus;
  subscribeStatus: (cb: (s: ExternalFeedStatus) => void) => () => void;
};

export const externalFeed: ExternalFeed = {
  enable(apiKey) {
    if (poller) {
      poller.stop();
      poller = null;
    }
    setStatus('connecting');
    poller = createPoller({
      fetchMids: () => fetchMids(apiKey),
      onResult: (mids) => pricingFeed.setReferences(mids),
      onStatus: (s) => setStatus(s),
    });
    poller.start();
  },

  disable() {
    if (poller) {
      poller.stop();
      poller = null;
    }
    pricingFeed.clearReferences();
    setStatus('off');
  },

  getStatus: () => status,

  subscribeStatus(cb) {
    statusSubs.add(cb);
    cb(status);
    return () => {
      statusSubs.delete(cb);
    };
  },
};
