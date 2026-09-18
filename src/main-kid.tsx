import React from 'react';
import ReactDOM from 'react-dom/client';
import { KidApp } from '@appconchau/KidApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <div className="fixed inset-0 w-full h-full bg-slate-50 text-slate-800 flex flex-col overflow-hidden select-none">
    <KidApp />
  </div>
);
