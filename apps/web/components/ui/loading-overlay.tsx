'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'progress' | 'skeleton';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingOverlayProps {
  loading: boolean;
  variant?: LoadingVariant;
  size?: LoadingSize;
  text?: string;
  subtext?: string;
  progress?: number;
  blur?: boolean;
  transparent?: boolean;
  fullScreen?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// ============================================================================
// Size Configuration
// ============================================================================

const sizeConfig: Record<LoadingSize, { spinner: string; text: string; subtext: string }> = {
  sm: { spinner: 'w-6 h-6', text: 'text-sm', subtext: 'text-xs' },
  md: { spinner: 'w-8 h-8', text: 'text-base', subtext: 'text-sm' },
  lg: { spinner: 'w-12 h-12', text: 'text-lg', subtext: 'text-base' },
  xl: { spinner: 'w-16 h-16', text: 'text-xl', subtext: 'text-lg' },
};

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps {
  size?: LoadingSize;
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin', sizeConfig[size].spinner, className)}
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
  );
}

// ============================================================================
// Dots Loader Component
// ============================================================================

interface DotsLoaderProps {
  size?: LoadingSize;
  className?: string;
}

export function DotsLoader({ size = 'md', className }: DotsLoaderProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-primary', dotSize)}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Pulse Loader Component
// ============================================================================

interface PulseLoaderProps {
  size?: LoadingSize;
  className?: string;
}

export function PulseLoader({ size = 'md', className }: PulseLoaderProps) {
  return (
    <div className={cn('relative', sizeConfig[size].spinner, className)}>
      <motion.div
        className="absolute inset-0 rounded-full bg-primary"
        animate={{
          scale: [1, 2],
          opacity: [0.5, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1/2 h-1/2 rounded-full bg-primary" />
      </div>
    </div>
  );
}

// ============================================================================
// Progress Loader Component
// ============================================================================

interface ProgressLoaderProps {
  progress: number;
  size?: LoadingSize;
  className?: string;
}

export function ProgressLoader({ progress, size = 'md', className }: ProgressLoaderProps) {
  const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : size === 'lg' ? 8 : 10;
  const sizeValue = size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 48 : 64;
  const radius = (sizeValue - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative', className)} style={{ width: sizeValue, height: sizeValue }}>
      <svg className="transform -rotate-90" width={sizeValue} height={sizeValue}>
        {/* Background circle */}
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={sizeValue / 2}
          cy={sizeValue / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className="text-primary"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={sizeValue / 2}
          cy={sizeValue / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          style={{
            strokeDasharray: circumference,
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton Loader Component
// ============================================================================

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export function SkeletonLoader({ lines = 3, className }: SkeletonLoaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-muted rounded animate-pulse',
            i === lines - 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Main Loading Overlay Component
// ============================================================================

export function LoadingOverlay({
  loading,
  variant = 'spinner',
  size = 'md',
  text,
  subtext,
  progress = 0,
  blur = false,
  transparent = false,
  fullScreen = false,
  className,
  children,
}: LoadingOverlayProps) {
  const config = sizeConfig[size];

  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return <Spinner size={size} className="text-primary" />;
      case 'dots':
        return <DotsLoader size={size} />;
      case 'pulse':
        return <PulseLoader size={size} />;
      case 'progress':
        return <ProgressLoader progress={progress} size={size} />;
      case 'skeleton':
        return <SkeletonLoader lines={4} />;
      default:
        return <Spinner size={size} className="text-primary" />;
    }
  };

  return (
    <div className={cn('relative', fullScreen && 'fixed inset-0 z-50', className)}>
      {children}

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center z-10',
              !transparent && 'bg-background/80',
              blur && 'backdrop-blur-sm'
            )}
          >
            {renderLoader()}

            {text && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn('mt-4 font-medium', config.text)}
              >
                {text}
              </motion.p>
            )}

            {subtext && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn('mt-1 text-muted-foreground', config.subtext)}
              >
                {subtext}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Page Loading Component
// ============================================================================

export interface PageLoadingProps {
  text?: string;
  className?: string;
}

export function PageLoading({ text = 'Se încarcă...', className }: PageLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[400px]', className)}>
      <Spinner size="lg" className="text-primary" />
      <p className="mt-4 text-muted-foreground">{text}</p>
    </div>
  );
}

// ============================================================================
// Button Loading Component
// ============================================================================

export interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export function ButtonLoading({
  loading,
  children,
  loadingText = 'Se procesează...',
  className,
}: ButtonLoadingProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {loading && <Spinner size="sm" />}
      {loading ? loadingText : children}
    </span>
  );
}

// ============================================================================
// Inline Loading Component
// ============================================================================

export interface InlineLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  variant?: 'spinner' | 'dots';
  className?: string;
}

export function InlineLoading({
  loading,
  children,
  variant = 'spinner',
  className,
}: InlineLoadingProps) {
  if (!loading) return <>{children}</>;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {variant === 'spinner' ? (
        <Spinner size="sm" />
      ) : (
        <DotsLoader size="sm" />
      )}
    </span>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Processing Overlay
// ============================================================================

export interface InvoiceProcessingOverlayProps {
  loading: boolean;
  stage?: 'validating' | 'generating' | 'sending' | 'complete';
  progress?: number;
  className?: string;
}

const stageConfig: Record<string, { text: string; subtext: string }> = {
  validating: { text: 'Se validează datele...', subtext: 'Verificăm informațiile facturii' },
  generating: { text: 'Se generează PDF-ul...', subtext: 'Creăm documentul facturii' },
  sending: { text: 'Se trimite factura...', subtext: 'Trimitem email-ul cu factura' },
  complete: { text: 'Factură procesată!', subtext: 'Operațiunea s-a finalizat cu succes' },
};

export function InvoiceProcessingOverlay({
  loading,
  stage = 'validating',
  progress,
  className,
}: InvoiceProcessingOverlayProps) {
  const config = stageConfig[stage];

  return (
    <LoadingOverlay
      loading={loading}
      variant={progress !== undefined ? 'progress' : 'spinner'}
      progress={progress}
      size="lg"
      text={config.text}
      subtext={config.subtext}
      blur
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Data Sync Overlay
// ============================================================================

export interface DataSyncOverlayProps {
  loading: boolean;
  syncType?: 'bank' | 'invoices' | 'expenses' | 'all';
  itemsProcessed?: number;
  totalItems?: number;
  className?: string;
}

const syncTypeLabels: Record<string, string> = {
  bank: 'Sincronizare conturi bancare',
  invoices: 'Sincronizare facturi',
  expenses: 'Sincronizare cheltuieli',
  all: 'Sincronizare date',
};

export function DataSyncOverlay({
  loading,
  syncType = 'all',
  itemsProcessed,
  totalItems,
  className,
}: DataSyncOverlayProps) {
  const progress = totalItems ? (itemsProcessed || 0) / totalItems * 100 : undefined;

  return (
    <LoadingOverlay
      loading={loading}
      variant={progress !== undefined ? 'progress' : 'dots'}
      progress={progress}
      size="lg"
      text={syncTypeLabels[syncType]}
      subtext={
        itemsProcessed !== undefined && totalItems !== undefined
          ? `${itemsProcessed} din ${totalItems} elemente procesate`
          : 'Vă rugăm așteptați...'
      }
      blur
      className={className}
    />
  );
}

// ============================================================================
// Loading Wrapper Component
// ============================================================================

export interface LoadingWrapperProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string | number;
  className?: string;
}

export function LoadingWrapper({
  loading,
  children,
  fallback,
  minHeight = 200,
  className,
}: LoadingWrapperProps) {
  if (loading) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ minHeight }}
      >
        {fallback || <Spinner size="lg" className="text-primary" />}
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// Exports
// ============================================================================

export {
  type SpinnerProps,
  type DotsLoaderProps,
  type PulseLoaderProps,
  type ProgressLoaderProps,
  type SkeletonLoaderProps,
  type PageLoadingProps as PageLoadingComponentProps,
  type ButtonLoadingProps as ButtonLoadingComponentProps,
  type InlineLoadingProps as InlineLoadingComponentProps,
  type InvoiceProcessingOverlayProps as InvoiceProcessingProps,
  type DataSyncOverlayProps as DataSyncProps,
  type LoadingWrapperProps as LoadingWrapperComponentProps,
};
