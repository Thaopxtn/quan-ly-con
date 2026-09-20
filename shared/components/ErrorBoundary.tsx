import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  showHomeButton?: boolean;
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Đã có lỗi xảy ra',
        fallbackMessage = 'Tính năng này đang gặp sự cố tạm thời khi tải dữ liệu.',
        showHomeButton = true,
        onGoHome,
      } = this.props;

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 min-h-[300px] select-none">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
            <AlertTriangle size={32} />
          </div>

          <h3 className="text-base font-black text-slate-900 mb-1">{fallbackTitle}</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
            {fallbackMessage}
          </p>

          {Boolean(import.meta.env?.DEV) && this.state.error && (
            <div className="w-full max-w-md bg-rose-950/5 border border-rose-200/80 rounded-xl p-3 mb-5 text-left overflow-x-auto">
              <p className="text-[11px] font-mono text-rose-800 font-bold truncate">
                {this.state.error.name}: {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/20 flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Thử lại</span>
            </button>

            {showHomeButton && onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 transition cursor-pointer"
              >
                <Home size={14} />
                <span>Trang chủ</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
