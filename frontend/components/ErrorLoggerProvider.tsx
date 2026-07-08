'use client';

import React, { useEffect } from 'react';
import { installErrorLogger, logClientError } from '@/lib/error-logger';

/** Installs the global capture hooks once on mount. */
export function ErrorLoggerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installErrorLogger();
  }, []);
  return <GlobalErrorBoundary>{children}</GlobalErrorBoundary>;
}

/** Catches React render crashes (which also appear in the DevTools console). */
class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logClientError({
      message: `React crash: ${error.message}`,
      stack: error.stack,
      meta: { kind: 'react-boundary', componentStack: info.componentStack?.slice(0, 2000) },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-lg font-semibold">A apărut o eroare / Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">
              Eroarea a fost înregistrată automat. / The error was logged automatically.
            </p>
            <button
              className="mt-4 px-4 py-2 rounded-md bg-teal-600 text-white text-sm"
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            >
              Reîncarcă / Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
