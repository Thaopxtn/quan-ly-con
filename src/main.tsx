import React from 'react';
import ReactDOM from 'react-dom/client';
import { ParentWebPortal } from '@appchame/ParentWebPortal';
import { AppSimulator } from './AppSimulator';
import './index.css';

// Check if user or developer explicitly requested developer simulator
const isSimulator = typeof window !== 'undefined' && (
  window.location.search.includes('simulator') ||
  window.location.search.includes('mode=simulator') ||
  window.location.search.includes('mode=dual')
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSimulator ? <AppSimulator /> : <ParentWebPortal />}
  </React.StrictMode>
);
