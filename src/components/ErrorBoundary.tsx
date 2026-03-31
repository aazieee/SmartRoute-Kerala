import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
          <div className="glass-card p-12 rounded-[3rem] border-rose-500/20 max-w-2xl w-full text-center space-y-8">
            <div className="w-24 h-24 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="text-rose-500" size={48} />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-black text-white tracking-tight uppercase">System Failure</h1>
              <p className="text-slate-400 leading-relaxed">
                The SmartRoute neural network encountered a critical exception. Our engineers have been notified.
              </p>
              {this.state.error && (
                <div className="p-4 rounded-2xl bg-black/50 border border-white/5 text-rose-400 text-xs font-mono break-all">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 mx-auto hover:bg-slate-200 transition-all active:scale-95"
            >
              <RefreshCcw size={18} />
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
