import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[InvestIQ ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Dashboard View Interrupted</h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              An unexpected display issue occurred while rendering this view. Your account and portfolio data remain completely secure.
            </p>
            {this.state.error?.message && (
              <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-left font-mono text-[11px] text-slate-600 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3D2C] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#145A3E] transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </button>
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
