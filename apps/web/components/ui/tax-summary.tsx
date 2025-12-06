'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type TaxType = 'vat' | 'income' | 'dividend' | 'social' | 'health' | 'cam' | 'local' | 'other';

export interface TaxItem {
  id: string;
  type: TaxType;
  name: string;
  amount: number;
  rate?: number;
  base?: number;
  dueDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  period?: string;
  description?: string;
}

export interface VatSummary {
  collectedVat: number;
  deductibleVat: number;
  netVat: number;
  sales: { rate: number; base: number; vat: number }[];
  purchases: { rate: number; base: number; vat: number }[];
}

export interface TaxSummaryProps {
  taxes: TaxItem[];
  currency?: string;
  period?: string;
  onPayTax?: (taxId: string) => void;
  onViewDetails?: (taxId: string) => void;
  className?: string;
}

export interface VatSummaryCardProps {
  summary: VatSummary;
  currency?: string;
  period?: string;
  onGenerateDecont?: () => void;
  className?: string;
}

export interface TaxCalendarProps {
  taxes: TaxItem[];
  currency?: string;
  onPayTax?: (taxId: string) => void;
  className?: string;
}

export interface TaxDeadlineAlertProps {
  taxes: TaxItem[];
  currency?: string;
  daysThreshold?: number;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const taxTypeConfig: Record<TaxType, { label: string; icon: React.ReactNode; color: string }> = {
  vat: {
    label: 'TVA',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  income: {
    label: 'Impozit pe venit',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  dividend: {
    label: 'Impozit pe dividende',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  social: {
    label: 'CAS',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  health: {
    label: 'CASS',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  cam: {
    label: 'CAM',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  local: {
    label: 'Taxe locale',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  other: {
    label: 'Alte taxe',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'De plată', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  paid: { label: 'Plătit', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  overdue: { label: 'Restant', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

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

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Tax Summary Component
// ============================================================================

export function TaxSummary({
  taxes,
  currency = 'RON',
  period,
  onPayTax,
  onViewDetails,
  className,
}: TaxSummaryProps) {
  const totalPending = taxes
    .filter((t) => t.status === 'pending' || t.status === 'overdue')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPaid = taxes
    .filter((t) => t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const overdueTaxes = taxes.filter((t) => t.status === 'overdue');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Totals */}
      <div className="p-4 bg-card rounded-lg border">
        {period && (
          <p className="text-sm text-muted-foreground mb-3">Perioadă: {period}</p>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">De plată</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(totalPending, currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Plătit</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid, currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Restante</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {overdueTaxes.length}
            </p>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueTaxes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-200">
                {overdueTaxes.length} taxe restante
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Total: {formatCurrency(overdueTaxes.reduce((s, t) => s + t.amount, 0), currency)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tax List */}
      <div className="space-y-3">
        <AnimatePresence>
          {taxes.map((tax) => (
            <TaxItemRow
              key={tax.id}
              tax={tax}
              currency={currency}
              onPay={onPayTax ? () => onPayTax(tax.id) : undefined}
              onView={onViewDetails ? () => onViewDetails(tax.id) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// Tax Item Row Component
// ============================================================================

interface TaxItemRowProps {
  tax: TaxItem;
  currency?: string;
  onPay?: () => void;
  onView?: () => void;
  className?: string;
}

function TaxItemRow({ tax, currency = 'RON', onPay, onView, className }: TaxItemRowProps) {
  const config = taxTypeConfig[tax.type];
  const status = statusConfig[tax.status];
  const daysUntil = tax.dueDate ? getDaysUntilDue(tax.dueDate) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-all',
        className
      )}
    >
      {/* Type Icon */}
      <div className={cn('w-10 h-10 flex items-center justify-center rounded-lg', config.color)}>
        {config.icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{tax.name}</h4>
          <span className={cn('px-2 py-0.5 text-xs rounded-full', status.className)}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>{config.label}</span>
          {tax.rate && (
            <>
              <span>•</span>
              <span>{tax.rate}%</span>
            </>
          )}
          {tax.period && (
            <>
              <span>•</span>
              <span>{tax.period}</span>
            </>
          )}
        </div>
      </div>

      {/* Due Date */}
      {tax.dueDate && tax.status !== 'paid' && (
        <div className="text-right">
          <p className="text-sm font-medium">{formatDate(tax.dueDate)}</p>
          {daysUntil !== null && (
            <p className={cn(
              'text-xs',
              daysUntil < 0 ? 'text-red-600' : daysUntil <= 7 ? 'text-orange-600' : 'text-muted-foreground'
            )}>
              {daysUntil < 0 ? `${Math.abs(daysUntil)} zile restant` : `${daysUntil} zile rămase`}
            </p>
          )}
        </div>
      )}

      {/* Amount */}
      <div className="text-right min-w-[100px]">
        <p className="font-semibold">{formatCurrency(tax.amount, currency)}</p>
        {tax.base && (
          <p className="text-xs text-muted-foreground">
            Bază: {formatCurrency(tax.base, currency)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onView && (
          <button
            onClick={onView}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Detalii"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
        {onPay && tax.status !== 'paid' && (
          <button
            onClick={onPay}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Plătește
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// VAT Summary Card Component
// ============================================================================

export function VatSummaryCard({
  summary,
  currency = 'RON',
  period,
  onGenerateDecont,
  className,
}: VatSummaryCardProps) {
  const isRefund = summary.netVat < 0;

  return (
    <div className={cn('p-6 bg-card rounded-xl border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Sumar TVA</h3>
          {period && <p className="text-sm text-muted-foreground">{period}</p>}
        </div>
        {onGenerateDecont && (
          <button
            onClick={onGenerateDecont}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Generează decont
          </button>
        )}
      </div>

      {/* Main Summary */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">TVA colectat</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {formatCurrency(summary.collectedVat, currency)}
          </p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-400">TVA deductibil</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {formatCurrency(summary.deductibleVat, currency)}
          </p>
        </div>
        <div className={cn(
          'p-4 rounded-lg',
          isRefund
            ? 'bg-purple-50 dark:bg-purple-900/20'
            : 'bg-orange-50 dark:bg-orange-900/20'
        )}>
          <p className={cn(
            'text-sm',
            isRefund ? 'text-purple-700 dark:text-purple-400' : 'text-orange-700 dark:text-orange-400'
          )}>
            {isRefund ? 'TVA de recuperat' : 'TVA de plată'}
          </p>
          <p className={cn(
            'text-2xl font-bold',
            isRefund ? 'text-purple-700 dark:text-purple-400' : 'text-orange-700 dark:text-orange-400'
          )}>
            {formatCurrency(Math.abs(summary.netVat), currency)}
          </p>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sales VAT */}
        <div>
          <h4 className="font-medium mb-3">Vânzări</h4>
          <div className="space-y-2">
            {summary.sales.map((item) => (
              <div key={item.rate} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">
                  TVA {item.rate}%
                  <span className="text-muted-foreground ml-2">
                    (bază: {formatCurrency(item.base, currency)})
                  </span>
                </span>
                <span className="font-medium">{formatCurrency(item.vat, currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Purchases VAT */}
        <div>
          <h4 className="font-medium mb-3">Achiziții</h4>
          <div className="space-y-2">
            {summary.purchases.map((item) => (
              <div key={item.rate} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">
                  TVA {item.rate}%
                  <span className="text-muted-foreground ml-2">
                    (bază: {formatCurrency(item.base, currency)})
                  </span>
                </span>
                <span className="font-medium">{formatCurrency(item.vat, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tax Deadline Alert Component
// ============================================================================

export function TaxDeadlineAlert({
  taxes,
  currency = 'RON',
  daysThreshold = 7,
  className,
}: TaxDeadlineAlertProps) {
  const upcomingTaxes = taxes
    .filter((tax) => {
      if (tax.status === 'paid' || !tax.dueDate) return false;
      const days = getDaysUntilDue(tax.dueDate);
      return days <= daysThreshold && days >= 0;
    })
    .sort((a, b) => getDaysUntilDue(a.dueDate!) - getDaysUntilDue(b.dueDate!));

  if (upcomingTaxes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            {upcomingTaxes.length} taxe cu termen aproape
          </p>
          <div className="mt-2 space-y-1">
            {upcomingTaxes.slice(0, 3).map((tax) => (
              <div key={tax.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-700 dark:text-amber-300">{tax.name}</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {formatCurrency(tax.amount, currency)} - {getDaysUntilDue(tax.dueDate!)} zile
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Tax Calendar Component
// ============================================================================

export function TaxCalendar({ taxes, currency = 'RON', onPayTax, className }: TaxCalendarProps) {
  const groupedByMonth = React.useMemo(() => {
    const groups: Record<string, TaxItem[]> = {};
    taxes
      .filter((t) => t.dueDate)
      .forEach((tax) => {
        const month = new Date(tax.dueDate!).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
        if (!groups[month]) groups[month] = [];
        groups[month].push(tax);
      });
    return groups;
  }, [taxes]);

  return (
    <div className={cn('space-y-6', className)}>
      {Object.entries(groupedByMonth).map(([month, monthTaxes]) => (
        <div key={month}>
          <h3 className="font-semibold mb-3 capitalize">{month}</h3>
          <div className="space-y-2">
            {monthTaxes.map((tax) => {
              const config = taxTypeConfig[tax.type];
              const status = statusConfig[tax.status];
              return (
                <div
                  key={tax.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-lg border"
                >
                  <div className="text-center min-w-[50px]">
                    <p className="text-2xl font-bold">
                      {new Date(tax.dueDate!).getDate()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tax.dueDate!).toLocaleDateString('ro-RO', { weekday: 'short' })}
                    </p>
                  </div>
                  <div className={cn('w-8 h-8 flex items-center justify-center rounded', config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{tax.name}</p>
                    <span className={cn('px-2 py-0.5 text-xs rounded-full', status.className)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="font-semibold">{formatCurrency(tax.amount, currency)}</p>
                  {onPayTax && tax.status !== 'paid' && (
                    <button
                      onClick={() => onPayTax(tax.id)}
                      className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Plătește
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Tax Rate Badge Component
// ============================================================================

export interface TaxRateBadgeProps {
  rate: number;
  type?: TaxType;
  className?: string;
}

export function TaxRateBadge({ rate, type = 'vat', className }: TaxRateBadgeProps) {
  const config = taxTypeConfig[type];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full', config.color, className)}>
      {config.icon}
      {rate}%
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  taxTypeConfig,
  statusConfig as taxStatusConfig,
  formatDate as formatTaxDate,
  getDaysUntilDue,
};
