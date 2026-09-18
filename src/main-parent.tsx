import React from 'react';
import ReactDOM from 'react-dom/client';
import { ParentApp } from '@appchame/ParentApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      <ParentApp initialScreen="dashboard" />
    </div>
  </React.StrictMode>
);
