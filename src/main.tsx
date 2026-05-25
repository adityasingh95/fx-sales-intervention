import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { pricingFeed } from './services/feed/pricingFeed';
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
pricingFeed.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
