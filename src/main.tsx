import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initAnalytics } from './lib/analytics.ts';
import './index.css';

// Loads Google Analytics 4 only when VITE_GA_MEASUREMENT_ID is set at build
// time; otherwise this is a no-op and no tracking happens.
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
