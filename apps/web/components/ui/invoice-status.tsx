'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export interface InvoiceStatusTimelineProps {
  currentStatus: InvoiceStatus;
  events?: InvoiceStatusEvent[];
  className?: string;
}

export interface InvoiceStatusEvent {
  status: InvoiceStatus;
  date: string;
  description?: string;
  user?: string;
}

export interface InvoicePaymentStatusProps {
  total: number;
  paid: number;
  currency?: string;
  dueDate?: string;
  status: InvoiceStatus;
  className?: string;
}

export interface InvoiceStatusFilterProps {
  selectedStatuses: InvoiceStatus[];
  onChange: (statuses: InvoiceStatus[]) => void;
  counts?: Record<InvoiceStatus, number>;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const statusConfig: Record<InvoiceStatus, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  draft: {
    label: 'Ciornă',
    description: 'Factura nu a fost încă trimisă',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
  sent: {
    label: 'Trimisă',
    description: 'Factura a fost trimisă clientului',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  viewed: {
    label: 'Vizualizată',
    description: 'Clientul a vizualizat factura',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-700 dark:text-indigo-400',
  },
  paid: {
    label: 'Plătită',
    description: 'Factura a fost plătită integral',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  partial: {
    label: 'Plătită parțial',
    description: 'S-a efectuat o plată parțială',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  overdue: {
    label: 'Restantă',
    description: 'Termenul de plată a expirat',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
  cancelled: {
    label: 'Anulată',
    description: 'Factura a fost anulată',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
  refunded: {
    label: 'Rambursată',
    description: 'Suma a fost returnată clientului',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    color: 'bg-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
  },
};

const statusOrder: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'partial', 'paid'];

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Invoice Status Badge Component
// ============================================================================

export function InvoiceStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: InvoiceStatusBadgeProps) {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className={iconSizes[size]}>{config.icon}</span>
      )}
      {config.label}
    </span>
  );
}

// ============================================================================
// Invoice Status Timeline Component
// ============================================================================

export function InvoiceStatusTimeline({
  currentStatus,
  events = [],
  className,
}: InvoiceStatusTimelineProps) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isFinalStatus = ['paid', 'cancelled', 'refunded'].includes(currentStatus);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Steps */}
      <div className="flex items-center">
        {statusOrder.map((status, index) => {
          const config = statusConfig[status];
          const isCompleted = index < currentIndex || (index === currentIndex && isFinalStatus);
          const isCurrent = index === currentIndex && !isFinalStatus;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={status}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    isCompleted && config.color + ' text-white',
                    isCurrent && 'ring-4 ring-primary/30 ' + config.color + ' text-white',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    config.icon
                  )}
                </motion.div>
                <span className={cn(
                  'text-xs mt-1',
                  (isCompleted || isCurrent) ? 'font-medium' : 'text-muted-foreground'
                )}>
                  {config.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < statusOrder.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={cn(
                      'h-1 rounded-full',
                      index < currentIndex ? config.color : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Event History */}
      {events.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Istoric</h4>
          <div className="space-y-3">
            {events.map((event, index) => {
              const config = statusConfig[event.status];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', config.bgColor, config.textColor)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{config.label}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(event.date)}</span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    {event.user && (
                      <p className="text-xs text-muted-foreground">de {event.user}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Invoice Payment Status Component
// ============================================================================

export function InvoicePaymentStatus({
  total,
  paid,
  currency = 'RON',
  dueDate,
  status,
  className,
}: InvoicePaymentStatusProps) {
  const remaining = total - paid;
  const percentage = total > 0 ? (paid / total) * 100 : 0;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'paid';
  const daysOver = dueDate ? getDaysOverdue(dueDate) : 0;

  return (
    <div className={cn('p-4 bg-card rounded-lg border', className)}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <InvoiceStatusBadge status={status} />
        {isOverdue && daysOver > 0 && (
          <span className="text-sm text-red-600 font-medium">
            {daysOver} {daysOver === 1 ? 'zi' : 'zile'} restant
          </span>
        )}
      </div>

      {/* Amount Details */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total factură</span>
          <span className="font-medium">{formatCurrency(total, currency)}</span>
        </div>

        {paid > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plătit</span>
            <span className="font-medium text-green-600">{formatCurrency(paid, currency)}</span>
          </div>
        )}

        {remaining > 0 && status !== 'paid' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rest de plată</span>
            <span className={cn('font-medium', isOverdue ? 'text-red-600' : 'text-orange-600')}>
              {formatCurrency(remaining, currency)}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {status !== 'draft' && status !== 'cancelled' && (
          <div className="pt-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  percentage >= 100 ? 'bg-green-500' : 'bg-primary'
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {percentage.toFixed(0)}% plătit
            </p>
          </div>
        )}

        {/* Due Date */}
        {dueDate && status !== 'paid' && (
          <div className={cn(
            'p-2 rounded text-sm text-center',
            isOverdue ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-muted'
          )}>
            {isOverdue ? 'Scadent' : 'Scadență'}: {formatDate(dueDate)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Invoice Status Filter Component
// ============================================================================

export function InvoiceStatusFilter({
  selectedStatuses,
  onChange,
  counts,
  className,
}: InvoiceStatusFilterProps) {
  const allStatuses: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled'];

  const toggleStatus = (status: InvoiceStatus) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  const selectAll = () => onChange(allStatuses);
  const clearAll = () => onChange([]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Status</span>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Toate
          </button>
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:underline"
          >
            Niciunul
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {allStatuses.map((status) => {
          const config = statusConfig[status];
          const isSelected = selectedStatuses.includes(status);
          const count = counts?.[status];

          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all',
                isSelected
                  ? cn(config.bgColor, config.textColor)
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {config.icon}
              {config.label}
              {count !== undefined && (
                <span className={cn(
                  'ml-1 px-1.5 py-0.5 rounded-full text-xs',
                  isSelected ? 'bg-white/20' : 'bg-background'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Invoice Status Summary Component
// ============================================================================

export interface InvoiceStatusSummaryProps {
  counts: Record<InvoiceStatus, number>;
  amounts?: Record<InvoiceStatus, number>;
  currency?: string;
  onStatusClick?: (status: InvoiceStatus) => void;
  className?: string;
}

export function InvoiceStatusSummary({
  counts,
  amounts,
  currency = 'RON',
  onStatusClick,
  className,
}: InvoiceStatusSummaryProps) {
  const displayStatuses: InvoiceStatus[] = ['draft', 'sent', 'overdue', 'paid'];

  return (
    <div className={cn('grid grid-cols-4 gap-4', className)}>
      {displayStatuses.map((status) => {
        const config = statusConfig[status];
        const count = counts[status] || 0;
        const amount = amounts?.[status];

        return (
          <button
            key={status}
            onClick={() => onStatusClick?.(status)}
            className={cn(
              'p-4 rounded-lg border text-left transition-all hover:shadow-sm',
              config.bgColor
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={config.textColor}>{config.icon}</span>
              <span className={cn('font-medium text-sm', config.textColor)}>{config.label}</span>
            </div>
            <p className="text-2xl font-bold">{count}</p>
            {amount !== undefined && (
              <p className="text-sm text-muted-foreground">{formatCurrency(amount, currency)}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Status Indicator Dot Component
// ============================================================================

export interface StatusDotProps {
  status: InvoiceStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status, size = 'md', pulse = false, className }: StatusDotProps) {
  const config = statusConfig[status];
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span className={cn('relative inline-flex', className)}>
      <span className={cn('rounded-full', config.color, sizeClasses[size])} />
      {pulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            config.color
          )}
        />
      )}
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  statusConfig as invoiceStatusConfig,
  statusOrder as invoiceStatusOrder,
  formatDate as formatInvoiceStatusDate,
  formatDateTime as formatInvoiceStatusDateTime,
  getDaysOverdue,
};
