import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ParentWebPortal } from '@appchame/ParentWebPortal';
import './index.css';

const AppSimulator = lazy(() => import('./AppSimulator').then((m) => ({ default: m.AppSimulator })));
const KidPcClient = lazy(() => import('@appconchau/pc/KidPcClient').then((m) => ({ default: m.KidPcClient })));

// Explicitly declare application role
if (typeof window !== 'undefined') {
  (window as any).__APP_ROLE__ = 'parent';
}

// Check if user or developer explicitly requested developer simulator
const isSimulator = typeof window !== 'undefined' && (
  window.location.search.includes('simulator') ||
  window.location.search.includes('mode=simulator') ||
  window.location.search.includes('mode=dual')
);

const isKidPc = typeof window !== 'undefined' && (
  window.location.pathname.includes('/kid-pc') ||
  window.location.search.includes('kid-pc') ||
  window.location.search.includes('mode=pc')
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSimulator ? (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3 font-medium">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang khởi tạo Trình Giả Lập...</span>
        </div>
      }>
        <AppSimulator />
      </Suspense>
    ) : isKidPc ? (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3 font-medium">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang mở KidCare PC...</span>
        </div>
      }>
        <KidPcClient />
      </Suspense>
    ) : (
      <ParentWebPortal />
    )}
  </React.StrictMode>
);
