'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ExpenseCategory =
  | 'office'
  | 'travel'
  | 'meals'
  | 'utilities'
  | 'rent'
  | 'salaries'
  | 'marketing'
  | 'software'
  | 'equipment'
  | 'supplies'
  | 'professional'
  | 'insurance'
  | 'taxes'
  | 'other';

export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'reimbursed';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  date: string;
  vendor?: string;
  receiptUrl?: string;
  hasReceipt?: boolean;
  vatAmount?: number;
  vatRate?: number;
  isDeductible?: boolean;
  deductiblePercent?: number;
  projectId?: string;
  projectName?: string;
  employeeId?: string;
  employeeName?: string;
  notes?: string;
  tags?: string[];
}

export interface ExpenseCardProps {
  expense: Expense;
  variant?: 'default' | 'compact' | 'detailed';
  selected?: boolean;
  onSelect?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onUploadReceipt?: () => void;
  className?: string;
}

export interface ExpenseListProps {
  expenses: Expense[];
  variant?: 'default' | 'compact';
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onExpenseClick?: (expense: Expense) => void;
  emptyMessage?: string;
  groupBy?: 'date' | 'category' | 'status' | 'none';
  className?: string;
}

export interface ExpenseSummaryProps {
  expenses: Expense[];
  currency?: string;
  period?: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const categoryConfig: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
  office: {
    label: 'Birou',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  travel: {
    label: 'Transport',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  meals: {
    label: 'Masă',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  utilities: {
    label: 'Utilități',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  rent: {
    label: 'Chirie',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  salaries: {
    label: 'Salarii',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  },
  marketing: {
    label: 'Marketing',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  software: {
    label: 'Software',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  equipment: {
    label: 'Echipamente',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
  supplies: {
    label: 'Consumabile',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  professional: {
    label: 'Servicii profesionale',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  insurance: {
    label: 'Asigurări',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  taxes: {
    label: 'Taxe și impozite',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  other: {
    label: 'Altele',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
};

const statusConfig: Record<ExpenseStatus, { label: string; className: string }> = {
  draft: { label: 'Ciornă', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  pending: { label: 'În așteptare', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { label: 'Aprobată', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Respinsă', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  paid: { label: 'Plătită', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  reimbursed: { label: 'Rambursată', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
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

// ============================================================================
// Expense Card Component
// ============================================================================

export function ExpenseCard({
  expense,
  variant = 'default',
  selected = false,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onUploadReceipt,
  className,
}: ExpenseCardProps) {
  const category = categoryConfig[expense.category];
  const status = statusConfig[expense.status];

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onView || onSelect}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all cursor-pointer',
          selected && 'ring-2 ring-primary',
          className
        )}
      >
        <div className={cn('w-10 h-10 flex items-center justify-center rounded-lg', category.color)}>
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{expense.description}</p>
          <p className="text-xs text-muted-foreground">
            {expense.vendor || category.label} • {formatDate(expense.date)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">{formatCurrency(expense.amount, expense.currency)}</p>
          {!expense.hasReceipt && (
            <span className="text-xs text-orange-600">Fără bon</span>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-5 rounded-xl border bg-card hover:shadow-md transition-all',
          selected && 'ring-2 ring-primary',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn('w-12 h-12 flex items-center justify-center rounded-xl', category.color)}>
            {category.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{expense.description}</h3>
              <span className={cn('px-2 py-0.5 text-xs rounded-full', status.className)}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{category.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
            {expense.vatAmount && (
              <p className="text-xs text-muted-foreground">
                TVA: {formatCurrency(expense.vatAmount, expense.currency)} ({expense.vatRate}%)
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">Data: </span>
            <span className="font-medium">{formatDate(expense.date)}</span>
          </div>
          {expense.vendor && (
            <div>
              <span className="text-muted-foreground">Furnizor: </span>
              <span className="font-medium">{expense.vendor}</span>
            </div>
          )}
          {expense.projectName && (
            <div>
              <span className="text-muted-foreground">Proiect: </span>
              <span className="font-medium">{expense.projectName}</span>
            </div>
          )}
          {expense.employeeName && (
            <div>
              <span className="text-muted-foreground">Angajat: </span>
              <span className="font-medium">{expense.employeeName}</span>
            </div>
          )}
        </div>

        {/* Deductibility */}
        {expense.isDeductible !== undefined && (
          <div className={cn(
            'p-3 rounded-lg mb-4',
            expense.isDeductible ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50'
          )}>
            <div className="flex items-center gap-2">
              {expense.isDeductible ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Deductibilă {expense.deductiblePercent ? `${expense.deductiblePercent}%` : '100%'}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Nedeductibilă</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Receipt Status */}
        {!expense.hasReceipt && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm">Bon fiscal lipsă</span>
              </div>
              {onUploadReceipt && (
                <button
                  onClick={onUploadReceipt}
                  className="text-xs text-orange-700 dark:text-orange-400 hover:underline"
                >
                  Încarcă bon
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {expense.tags && expense.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {expense.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-muted rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <p className="text-sm text-muted-foreground mb-4">{expense.notes}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          {expense.status === 'pending' && onApprove && (
            <button
              onClick={onApprove}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Aprobă
            </button>
          )}
          {expense.status === 'pending' && onReject && (
            <button
              onClick={onReject}
              className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Respinge
            </button>
          )}
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
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Editează"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
              title="Șterge"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onView || onSelect}
      className={cn(
        'p-4 rounded-lg border bg-card hover:shadow-sm transition-all cursor-pointer',
        selected && 'ring-2 ring-primary',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 flex items-center justify-center rounded-lg', category.color)}>
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{expense.description}</h4>
            <span className={cn('px-2 py-0.5 text-xs rounded-full', status.className)}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{expense.vendor || category.label}</span>
            <span>•</span>
            <span>{formatDate(expense.date)}</span>
            {!expense.hasReceipt && (
              <>
                <span>•</span>
                <span className="text-orange-600">Fără bon</span>
              </>
            )}
          </div>
        </div>
        <p className="font-semibold">{formatCurrency(expense.amount, expense.currency)}</p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Expense List Component
// ============================================================================

export function ExpenseList({
  expenses,
  variant = 'default',
  selectedIds = [],
  onSelect,
  onExpenseClick,
  emptyMessage = 'Nu există cheltuieli',
  groupBy = 'none',
  className,
}: ExpenseListProps) {
  const groupedExpenses = React.useMemo(() => {
    if (groupBy === 'none') return { '': expenses };

    return expenses.reduce((acc, expense) => {
      let key = '';
      if (groupBy === 'date') {
        key = formatDate(expense.date);
      } else if (groupBy === 'category') {
        key = categoryConfig[expense.category].label;
      } else if (groupBy === 'status') {
        key = statusConfig[expense.status].label;
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(expense);
      return acc;
    }, {} as Record<string, Expense[]>);
  }, [expenses, groupBy]);

  if (expenses.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(groupedExpenses).map(([group, groupExpenses]) => (
        <div key={group}>
          {group && (
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{group}</h3>
          )}
          <div className="space-y-2">
            <AnimatePresence>
              {groupExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  variant={variant}
                  selected={selectedIds.includes(expense.id)}
                  onSelect={onSelect ? () => onSelect(expense.id) : undefined}
                  onView={onExpenseClick ? () => onExpenseClick(expense) : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Expense Summary Component
// ============================================================================

export function ExpenseSummary({
  expenses,
  currency = 'RON',
  period,
  className,
}: ExpenseSummaryProps) {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalVat = expenses.reduce((sum, e) => sum + (e.vatAmount || 0), 0);
  const deductibleAmount = expenses
    .filter((e) => e.isDeductible)
    .reduce((sum, e) => sum + e.amount * ((e.deductiblePercent || 100) / 100), 0);

  const byCategory = expenses.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = 0;
    acc[e.category] += e.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Totals */}
      <div className="p-4 bg-card rounded-lg border">
        {period && <p className="text-sm text-muted-foreground mb-3">{period}</p>}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total cheltuieli</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount, currency)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">TVA</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalVat, currency)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Deductibil</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(deductibleAmount, currency)}</p>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="p-4 bg-card rounded-lg border">
        <h4 className="font-medium mb-3">Top categorii</h4>
        <div className="space-y-2">
          {topCategories.map(([cat, amount]) => {
            const config = categoryConfig[cat as ExpenseCategory];
            const percent = (amount / totalAmount) * 100;
            return (
              <div key={cat} className="flex items-center gap-3">
                <div className={cn('w-8 h-8 flex items-center justify-center rounded', config.color)}>
                  {config.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{config.label}</span>
                    <span className="font-medium">{formatCurrency(amount, currency)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Expense Category Badge Component
// ============================================================================

export interface ExpenseCategoryBadgeProps {
  category: ExpenseCategory;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExpenseCategoryBadge({
  category,
  showLabel = true,
  size = 'md',
  className,
}: ExpenseCategoryBadgeProps) {
  const config = categoryConfig[category];
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div className={cn('flex items-center justify-center rounded', config.color, sizeClasses[size])}>
        {config.icon}
      </div>
      {showLabel && <span className="text-sm">{config.label}</span>}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  categoryConfig as expenseCategoryConfig,
  statusConfig as expenseStatusConfig,
  formatDate as formatExpenseDate,
};
