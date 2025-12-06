'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';

const sizeClasses: Record<SpinnerSize, { spinner: string; text: string }> = {
  xs: { spinner: 'w-3 h-3', text: 'text-xs' },
  sm: { spinner: 'w-4 h-4', text: 'text-sm' },
  md: { spinner: 'w-6 h-6', text: 'text-base' },
  lg: { spinner: 'w-8 h-8', text: 'text-lg' },
  xl: { spinner: 'w-12 h-12', text: 'text-xl' },
};

const variantClasses: Record<SpinnerVariant, string> = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  destructive: 'text-destructive',
};

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  showLabel?: boolean;
}

export function Spinner({
  size = 'md',
  variant = 'default',
  label = 'Se incarca...',
  showLabel = false,
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    >
      <svg
        className={cn(
          'animate-spin',
          sizeClasses[size].spinner,
          variantClasses[variant]
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
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
      {showLabel && (
        <span className={cn(sizeClasses[size].text, variantClasses[variant])}>
          {label}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ============================================================================
// Dots Spinner
// ============================================================================

interface DotsSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

export function DotsSpinner({
  size = 'md',
  variant = 'default',
  className,
  ...props
}: DotsSpinnerProps) {
  const dotSizes: Record<SpinnerSize, string> = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const gapSizes: Record<SpinnerSize, string> = {
    xs: 'gap-0.5',
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
    xl: 'gap-3',
  };

  return (
    <div
      role="status"
      aria-label="Se incarca..."
      className={cn('inline-flex items-center', gapSizes[size], className)}
      {...props}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-current', dotSizes[size], variantClasses[variant])}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
      <span className="sr-only">Se incarca...</span>
    </div>
  );
}

// ============================================================================
// Pulse Spinner
// ============================================================================

interface PulseSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

export function PulseSpinner({
  size = 'md',
  variant = 'primary',
  className,
  ...props
}: PulseSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Se incarca..."
      className={cn('relative inline-flex', sizeClasses[size].spinner, className)}
      {...props}
    >
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full bg-current opacity-75',
          variantClasses[variant]
        )}
        animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className={cn(
          'relative w-full h-full rounded-full bg-current',
          variantClasses[variant]
        )}
      />
      <span className="sr-only">Se incarca...</span>
    </div>
  );
}

// ============================================================================
// Ring Spinner
// ============================================================================

interface RingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

export function RingSpinner({
  size = 'md',
  variant = 'primary',
  className,
  ...props
}: RingSpinnerProps) {
  const strokeWidths: Record<SpinnerSize, number> = {
    xs: 2,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 4,
  };

  return (
    <div
      role="status"
      aria-label="Se incarca..."
      className={cn('inline-flex', className)}
      {...props}
    >
      <motion.svg
        className={cn(sizeClasses[size].spinner, variantClasses[variant])}
        viewBox="0 0 50 50"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <circle
          className="opacity-25"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidths[size]}
        />
        <motion.circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidths[size]}
          strokeLinecap="round"
          strokeDasharray="80, 200"
          strokeDashoffset="0"
          animate={{ strokeDashoffset: [0, -125] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.svg>
      <span className="sr-only">Se incarca...</span>
    </div>
  );
}

// ============================================================================
// Loading Overlay
// ============================================================================

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  label?: string;
  spinnerSize?: SpinnerSize;
  spinnerVariant?: SpinnerVariant;
  blur?: boolean;
}

export function LoadingOverlay({
  isLoading = true,
  label = 'Se incarca...',
  spinnerSize = 'lg',
  spinnerVariant = 'primary',
  blur = true,
  children,
  className,
  ...props
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className={cn('relative', className)} {...props}>
      {children}
      <div
        className={cn(
          'absolute inset-0 z-50 flex items-center justify-center bg-background/80',
          blur && 'backdrop-blur-sm'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner size={spinnerSize} variant={spinnerVariant} />
          {label && (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Full Page Loading
// ============================================================================

interface FullPageLoadingProps {
  label?: string;
  spinnerSize?: SpinnerSize;
  spinnerVariant?: SpinnerVariant;
}

export function FullPageLoading({
  label = 'Se incarca...',
  spinnerSize = 'xl',
  spinnerVariant = 'primary',
}: FullPageLoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <RingSpinner size={spinnerSize} variant={spinnerVariant} />
        {label && (
          <span className="text-lg font-medium text-foreground">{label}</span>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// Button Loading State
// ============================================================================

interface ButtonLoadingProps {
  isLoading?: boolean;
  size?: SpinnerSize;
  children: React.ReactNode;
}

export function ButtonLoading({
  isLoading = false,
  size = 'sm',
  children,
}: ButtonLoadingProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size={size} variant="default" />
      <span>{children}</span>
    </span>
  );
}

// ============================================================================
// Skeleton Loading
// ============================================================================

interface SkeletonLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  rowHeight?: string;
  animate?: boolean;
}

export function SkeletonLoading({
  rows = 3,
  rowHeight = 'h-4',
  animate = true,
  className,
  ...props
}: SkeletonLoadingProps) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-md bg-muted',
            rowHeight,
            animate && 'animate-pulse',
            i === rows - 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Progress Loading
// ============================================================================

interface ProgressLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  progress?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: SpinnerVariant;
}

export function ProgressLoading({
  progress = 0,
  label,
  showPercentage = true,
  variant = 'primary',
  className,
  ...props
}: ProgressLoadingProps) {
  const progressVariants: Record<SpinnerVariant, string> = {
    default: 'bg-muted-foreground',
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    destructive: 'bg-destructive',
  };

  return (
    <div className={cn('w-full space-y-2', className)} {...props}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn('h-full rounded-full', progressVariants[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Indeterminate Progress
// ============================================================================

interface IndeterminateProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SpinnerVariant;
}

export function IndeterminateProgress({
  variant = 'primary',
  className,
  ...props
}: IndeterminateProgressProps) {
  const progressVariants: Record<SpinnerVariant, string> = {
    default: 'bg-muted-foreground',
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    destructive: 'bg-destructive',
  };

  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <motion.div
        className={cn('h-full w-1/3 rounded-full', progressVariants[variant])}
        animate={{ x: ['-100%', '400%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ============================================================================
// Accounting-Specific Loading States
// ============================================================================

export function InvoiceLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t pt-4">
        <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 border-b pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-24 animate-pulse rounded bg-muted" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="h-4 w-24 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}
