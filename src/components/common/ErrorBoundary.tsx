import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] w-full p-6 flex flex-col items-center justify-center text-center rounded-3xl bg-white border border-rose-100 shadow-sm space-y-4 my-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-slate-900">
              {this.props.fallbackTitle || 'Something went wrong while rendering this section'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {this.props.fallbackMessage ||
                'An unexpected error occurred. You can reload this view without losing your other data.'}
            </p>
          </div>

          {this.state.error && (
            <div className="w-full max-w-lg p-3 rounded-xl bg-slate-900 text-slate-200 text-left font-mono text-[11px] overflow-x-auto">
              <span className="text-rose-400 font-bold block">Error:</span>
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Section</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.href = '/';
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Go to Feed</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
