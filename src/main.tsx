import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { wireDealFeedToStore } from './state/stores/dealsBootstrap';
import './styles/global.css';

wireDealFeedToStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
