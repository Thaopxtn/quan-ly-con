import React from 'react';
import ReactDOM from 'react-dom/client';
import { ParentApp } from '@appchame/ParentApp';
import './index.css';
if (typeof window !== 'undefined') {
  (window as any).__APP_ROLE__ = 'parent';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      <ParentApp initialScreen="dashboard" />
    </div>
  </React.StrictMode>
);
