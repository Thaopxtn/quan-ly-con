import React from 'react';
import ReactDOM from 'react-dom/client';
import { KidApp } from '@appconchau/KidApp';
import './index.css';

if (typeof window !== 'undefined') {
  (window as any).__APP_ROLE__ = 'kid';
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', backgroundColor: 'white', height: '100vh', overflow: 'auto', zIndex: 99999, position: 'relative' }}>
          <h2>App Crashed in React!</h2>
          <pre style={{ fontSize: 10 }}>{String(this.state.error)}</pre>
          <pre style={{ fontSize: 10 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <div className="fixed inset-0 w-full h-full bg-slate-50 text-slate-800 flex flex-col overflow-hidden select-none">
      <KidApp />
    </div>
  </ErrorBoundary>
);
