import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { pricingFeed } from './services/feed/pricingFeed';
import { wireDealFeedToStore } from './state/stores/dealsBootstrap';
import './styles/global.css';

wireDealFeedToStore();
pricingFeed.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
