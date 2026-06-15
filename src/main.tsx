import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { wireNotifications } from './features/notifications/dispatcher';
import { pricingFeed } from './services/feed/pricingFeed';
import { wireExternalFeed } from './services/feed/external/wireExternalFeed';
import { isV3 } from './lib/devVersion';
import { timings } from './state/machines/timings';
import { wireDealFeedToStore } from './state/stores/dealsBootstrap';
import './styles/global.css';

// E2E hook: Playwright sets window.__zeroAckDelay = true via
// addInitScript before navigation so the 250ms *Sent → * acks fire
// instantly. The 5-second blotter-removal rule is left intact because
// that's the wall-clock behaviour scenarios assert against (see
// docs/07-scenario-pack.md notes on test fidelity).
declare global {
  interface Window {
    __zeroAckDelay?: boolean;
  }
}

if (typeof window !== 'undefined' && window.__zeroAckDelay) {
  timings.ackDelayMs = 0;
}

wireDealFeedToStore();
wireNotifications();
pricingFeed.start();

// v3 only: bridge the GUI-entered external feed key to the pricing anchor.
// Off by default, so on the bare GA URL this never touches the simulated feed.
if (isV3()) {
  wireExternalFeed();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
