import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { KidApp } from '@appconchau/KidApp';
import './index.css';

const KidPcClient = lazy(() => import('@appconchau/pc/KidPcClient').then((m) => ({ default: m.KidPcClient })));

if (typeof window !== 'undefined') {
  (window as any).__APP_ROLE__ = 'kid';
}

const isKidPc = typeof window !== 'undefined' && (
  window.location.pathname.includes('/kid-pc') ||
  window.location.search.includes('kid-pc') ||
  window.location.search.includes('mode=pc')
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  isKidPc ? (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3 font-medium">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Đang mở KidCare PC...</span>
      </div>
    }>
      <KidPcClient />
    </Suspense>
  ) : (
    <div className="fixed inset-0 w-full h-full bg-slate-50 text-slate-800 flex flex-col overflow-hidden select-none">
      <KidApp />
    </div>
  )
);
