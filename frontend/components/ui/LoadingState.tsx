'use client';

import { memo } from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  className?: string;
}

// Romanian default messages for different contexts
export const LOADING_MESSAGES = {
  default: 'Se încarcă datele...',
  dashboard: 'Se încarcă dashboard-ul...',
  invoices: 'Se încarcă facturile...',
  documents: 'Se încarcă documentele...',
  anaf: 'Se verifică statusul la ANAF...',
  efactura: 'Se verifică e-Factura...',
  saft: 'Se generează raportul SAF-T...',
  vat: 'Se calculează TVA...',
  submit: 'Se trimite...',
  save: 'Se salvează...',
  upload: 'Se încarcă fișierul...',
  processing: 'Se procesează...',
  ai: 'Se analizează cu AI...',
  ocr: 'Se extrag datele din document...',
} as const;

const SIZE_CLASSES = {
  sm: { spinner: 'h-4 w-4 border-2', text: 'text-xs', container: 'p-2' },
  md: { spinner: 'h-8 w-8 border-4', text: 'text-sm', container: 'p-4' },
  lg: { spinner: 'h-12 w-12 border-4', text: 'text-base', container: 'p-6' },
};

export const LoadingState = memo(function LoadingState({
  message = LOADING_MESSAGES.default,
  size = 'md',
  variant = 'spinner',
  className = '',
}: LoadingStateProps) {
  const sizeClasses = SIZE_CLASSES[size];

  if (variant === 'spinner') {
    return (
      <div
        className={`flex flex-col items-center justify-center ${sizeClasses.container} ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className={`animate-spin ${sizeClasses.spinner} border-blue-600 border-t-transparent rounded-full`}
          aria-hidden="true"
        />
        <p className={`mt-2 text-gray-600 dark:text-gray-400 ${sizeClasses.text}`}>
          {message}
        </p>
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div
        className={`flex flex-col items-center justify-center ${sizeClasses.container} ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex space-x-1" aria-hidden="true">
          <div className={`${size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
          <div className={`${size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
          <div className={`${size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
        </div>
        <p className={`mt-2 text-gray-600 dark:text-gray-400 ${sizeClasses.text}`}>
          {message}
        </p>
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={`flex flex-col items-center justify-center ${sizeClasses.container} ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className={`${sizeClasses.spinner} bg-blue-600 rounded-full animate-pulse`}
          aria-hidden="true"
        />
        <p className={`mt-2 text-gray-600 dark:text-gray-400 ${sizeClasses.text}`}>
          {message}
        </p>
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  // Skeleton variant
  return (
    <div
      className={`${sizeClasses.container} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="animate-pulse space-y-3" aria-hidden="true">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
      </div>
      <span className="sr-only">{message}</span>
    </div>
  );
});

// Specialized loading states for common contexts
export const DashboardLoading = memo(function DashboardLoading() {
  return <LoadingState message={LOADING_MESSAGES.dashboard} size="lg" />;
});

export const InvoicesLoading = memo(function InvoicesLoading() {
  return <LoadingState message={LOADING_MESSAGES.invoices} />;
});

export const AnafStatusLoading = memo(function AnafStatusLoading() {
  return <LoadingState message={LOADING_MESSAGES.anaf} variant="dots" />;
});

export const EFacturaLoading = memo(function EFacturaLoading() {
  return <LoadingState message={LOADING_MESSAGES.efactura} variant="dots" />;
});

export const OcrLoading = memo(function OcrLoading() {
  return <LoadingState message={LOADING_MESSAGES.ocr} variant="pulse" size="lg" />;
});

export const SubmitLoading = memo(function SubmitLoading() {
  return <LoadingState message={LOADING_MESSAGES.submit} size="sm" variant="spinner" />;
});

// Inline loading spinner for buttons
export const InlineSpinner = memo(function InlineSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
});

// Page-level skeleton loading
export const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6" role="status" aria-label="Se încarcă pagina...">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>

      <span className="sr-only">Se încarcă pagina...</span>
    </div>
  );
});

// Table skeleton loading
export const TableSkeleton = memo(function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse" role="status" aria-label="Se încarcă tabelul...">
      {/* Header */}
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-t-lg" />

      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className={`h-14 bg-gray-100 dark:bg-gray-800 ${i === rows - 1 ? 'rounded-b-lg' : ''}`}
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}

      <span className="sr-only">Se încarcă tabelul...</span>
    </div>
  );
});
