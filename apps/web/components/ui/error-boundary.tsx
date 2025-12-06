'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// Main Error Boundary Component (Class-based for error catching)
// ============================================================================

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.reset}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Default Error Fallback Component
// ============================================================================

export interface ErrorFallbackProps {
  error: Error | null;
  onReset?: () => void;
  title?: string;
  description?: string;
  showDetails?: boolean;
  className?: string;
}

export function DefaultErrorFallback({
  error,
  onReset,
  title = 'Ceva nu a funcționat corect',
  description = 'A apărut o eroare neașteptată. Vă rugăm să încercați din nou.',
  showDetails = process.env.NODE_ENV === 'development',
  className,
}: ErrorFallbackProps) {
  const [showStack, setShowStack] = React.useState(false);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[300px] p-8 text-center',
        className
      )}
    >
      {/* Error Icon */}
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Title & Description */}
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Încearcă din nou
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
        >
          Reîncarcă pagina
        </button>
      </div>

      {/* Error Details (Development) */}
      {showDetails && error && (
        <div className="mt-6 w-full max-w-lg text-left">
          <button
            onClick={() => setShowStack(!showStack)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className={cn('w-4 h-4 transition-transform', showStack && 'rotate-90')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Detalii eroare
          </button>

          {showStack && (
            <div className="mt-2 p-4 bg-muted rounded-lg overflow-x-auto">
              <p className="text-sm font-mono text-red-600 dark:text-red-400 mb-2">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Inline Error Display Component
// ============================================================================

export interface InlineErrorProps {
  error: Error | string | null;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  className?: string;
}

const variantStyles = {
  default: 'bg-muted text-foreground',
  destructive: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
};

export function InlineError({
  error,
  onDismiss,
  variant = 'destructive',
  className,
}: InlineErrorProps) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        variantStyles[variant],
        className
      )}
    >
      <svg
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Error Message Component
// ============================================================================

export interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <p className={cn('text-sm text-red-600 dark:text-red-400', className)}>
      {message}
    </p>
  );
}

// ============================================================================
// Form Error Component
// ============================================================================

export interface FormErrorProps {
  errors?: Record<string, string | string[]>;
  className?: string;
}

export function FormError({ errors, className }: FormErrorProps) {
  if (!errors || Object.keys(errors).length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {Object.entries(errors).map(([field, messages]) => {
        const messageArray = Array.isArray(messages) ? messages : [messages];
        return messageArray.map((message, index) => (
          <p
            key={`${field}-${index}`}
            className="text-sm text-red-600 dark:text-red-400"
          >
            {message}
          </p>
        ));
      })}
    </div>
  );
}

// ============================================================================
// Not Found Component
// ============================================================================

export interface NotFoundProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function NotFound({
  title = 'Pagina nu a fost găsită',
  description = 'Ne pare rău, pagina pe care o căutați nu există sau a fost mutată.',
  actionLabel = 'Înapoi la pagina principală',
  onAction,
  className,
}: NotFoundProps) {
  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
        className
      )}
    >
      <div className="text-8xl font-bold text-muted-foreground/20 mb-4">404</div>
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      <button
        onClick={handleAction}
        className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ============================================================================
// Server Error Component
// ============================================================================

export interface ServerErrorProps {
  statusCode?: number;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ServerError({
  statusCode = 500,
  title = 'Eroare de server',
  description = 'A apărut o eroare la server. Vă rugăm să încercați din nou mai târziu.',
  onRetry,
  className,
}: ServerErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
        className
      )}
    >
      <div className="w-20 h-20 mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-orange-600 dark:text-orange-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      </div>
      <div className="text-4xl font-bold text-muted-foreground mb-2">{statusCode}</div>
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Încearcă din nou
          </button>
        )}
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
        >
          Pagina principală
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: API Error Component
// ============================================================================

export interface APIErrorProps {
  error: {
    message: string;
    code?: string;
    status?: number;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function APIError({
  error,
  onRetry,
  onDismiss,
  className,
}: APIErrorProps) {
  return (
    <div
      className={cn(
        'p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
            Eroare la comunicarea cu serverul
          </h4>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error.message}
          </p>
          {error.code && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Cod eroare: {error.code}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
          >
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {onRetry && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 rounded transition-colors"
          >
            Încearcă din nou
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type ErrorBoundaryState,
  type ErrorFallbackProps as DefaultErrorFallbackProps,
  type InlineErrorProps as InlineErrorDisplayProps,
  type FormErrorProps as FormErrorDisplayProps,
  type NotFoundProps as NotFoundPageProps,
  type ServerErrorProps as ServerErrorPageProps,
  type APIErrorProps as APIErrorDisplayProps,
};
