'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  description: string;
  category?: string;
  date: string;
  reference?: string;
  counterparty?: string;
  bankAccount?: string;
  invoiceId?: string;
  expenseId?: string;
  tags?: string[];
  notes?: string;
  attachments?: number;
}

export interface TransactionRowProps {
  transaction: Transaction;
  selected?: boolean;
  onSelect?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCategorize?: () => void;
  onMatch?: () => void;
  showCheckbox?: boolean;
  className?: string;
}

export interface TransactionListProps {
  transactions: Transaction[];
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onTransaction?: (transaction: Transaction) => void;
  emptyMessage?: string;
  showDateHeaders?: boolean;
  className?: string;
}

export interface TransactionSummaryProps {
  income: number;
  expenses: number;
  currency?: string;
  period?: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const typeConfig: Record<TransactionType, { label: string; icon: React.ReactNode; className: string }> = {
  income: {
    label: 'Încasare',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ),
    className: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  expense: {
    label: 'Plată',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    ),
    className: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  transfer: {
    label: 'Transfer',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    className: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

const statusConfig: Record<TransactionStatus, { label: string; className: string }> = {
  pending: { label: 'În așteptare', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'Finalizată', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: 'Eșuată', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Anulată', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
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

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDateGroup(date: string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Astăzi';
  if (d.toDateString() === yesterday.toDateString()) return 'Ieri';

  return d.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================================================
// Transaction Row Component
// ============================================================================

export function TransactionRow({
  transaction,
  selected = false,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onCategorize,
  onMatch,
  showCheckbox = false,
  className,
}: TransactionRowProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const config = typeConfig[transaction.type];
  const status = statusConfig[transaction.status];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onView}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-all cursor-pointer',
        selected && 'ring-2 ring-primary bg-primary/5',
        className
      )}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      )}

      {/* Type Icon */}
      <div className={cn('w-10 h-10 flex items-center justify-center rounded-full', config.className)}>
        {config.icon}
      </div>

      {/* Description & Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{transaction.description}</h4>
          {transaction.status !== 'completed' && (
            <span className={cn('px-2 py-0.5 text-xs rounded-full', status.className)}>
              {status.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          {transaction.counterparty && (
            <>
              <span className="truncate max-w-[150px]">{transaction.counterparty}</span>
              <span>•</span>
            </>
          )}
          {transaction.category && (
            <>
              <span className="truncate">{transaction.category}</span>
              <span>•</span>
            </>
          )}
          <span>{formatDate(transaction.date)}</span>
          {transaction.reference && (
            <>
              <span>•</span>
              <span className="truncate max-w-[100px]">Ref: {transaction.reference}</span>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      {transaction.tags && transaction.tags.length > 0 && (
        <div className="hidden md:flex items-center gap-1">
          {transaction.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-xs bg-muted rounded-full">
              {tag}
            </span>
          ))}
          {transaction.tags.length > 2 && (
            <span className="px-2 py-0.5 text-xs bg-muted rounded-full">
              +{transaction.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Indicators */}
      <div className="flex items-center gap-2">
        {transaction.invoiceId && (
          <span className="w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded" title="Legat de factură">
            <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        )}
        {transaction.attachments && transaction.attachments > 0 && (
          <span className="w-6 h-6 flex items-center justify-center bg-muted rounded" title={`${transaction.attachments} atașamente`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </span>
        )}
      </div>

      {/* Amount */}
      <div className="text-right min-w-[100px]">
        <p
          className={cn(
            'font-semibold',
            transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : '',
            transaction.type === 'expense' ? 'text-red-600 dark:text-red-400' : ''
          )}
        >
          {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <p className="text-xs text-muted-foreground">{formatTime(transaction.date)}</p>
      </div>

      {/* Actions */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {!transaction.category && onCategorize && (
              <button
                onClick={onCategorize}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Categorizează"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
            )}
            {!transaction.invoiceId && onMatch && (
              <button
                onClick={onMatch}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Potrivește cu factură"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 hover:bg-muted rounded transition-colors"
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
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                title="Șterge"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Transaction List Component
// ============================================================================

export function TransactionList({
  transactions,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onTransaction,
  emptyMessage = 'Nu există tranzacții',
  showDateHeaders = true,
  className,
}: TransactionListProps) {
  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    if (!showDateHeaders) return { '': transactions };

    return transactions.reduce((acc, transaction) => {
      const group = getDateGroup(transaction.date);
      if (!acc[group]) acc[group] = [];
      acc[group].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [transactions, showDateHeaders]);

  if (transactions.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const allSelected = selectedIds.length === transactions.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Select All Header */}
      {onSelectAll && onSelect && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} selectate`
              : 'Selectează toate'}
          </span>
        </div>
      )}

      {/* Grouped Transactions */}
      {Object.entries(groupedTransactions).map(([group, groupTransactions]) => (
        <div key={group} className="space-y-2">
          {showDateHeaders && group && (
            <h3 className="text-sm font-medium text-muted-foreground px-1 capitalize">{group}</h3>
          )}
          <AnimatePresence mode="popLayout">
            {groupTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                selected={selectedIds.includes(transaction.id)}
                onSelect={onSelect ? () => onSelect(transaction.id) : undefined}
                onView={onTransaction ? () => onTransaction(transaction) : undefined}
                showCheckbox={!!onSelect}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Transaction Summary Component
// ============================================================================

export function TransactionSummary({
  income,
  expenses,
  currency = 'RON',
  period,
  className,
}: TransactionSummaryProps) {
  const balance = income - expenses;

  return (
    <div className={cn('p-4 bg-card rounded-lg border', className)}>
      {period && (
        <p className="text-sm text-muted-foreground mb-3">{period}</p>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Încasări</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            +{formatCurrency(income, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Plăți</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            -{formatCurrency(expenses, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sold</p>
          <p className={cn(
            'text-lg font-semibold',
            balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Transaction Row Component
// ============================================================================

export function CompactTransactionRow({
  transaction,
  onClick,
  className,
}: {
  transaction: Transaction;
  onClick?: () => void;
  className?: string;
}) {
  const config = typeConfig[transaction.type];

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer',
        className
      )}
    >
      <div className={cn('w-8 h-8 flex items-center justify-center rounded-full', config.className)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
      </div>
      <p
        className={cn(
          'font-medium text-sm',
          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
        )}
      >
        {transaction.type === 'expense' ? '-' : '+'}
        {formatCurrency(transaction.amount, transaction.currency)}
      </p>
    </div>
  );
}

// ============================================================================
// Transaction Category Badge Component
// ============================================================================

export interface TransactionCategoryBadgeProps {
  category: string;
  type?: TransactionType;
  onClick?: () => void;
  className?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Salarii': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  'Utilități': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  'Chirie': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  'Vânzări': <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
};

export function TransactionCategoryBadge({
  category,
  type,
  onClick,
  className,
}: TransactionCategoryBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full',
        type === 'income'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : type === 'expense'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-muted text-muted-foreground',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
    >
      {categoryIcons[category] || (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )}
      {category}
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  typeConfig as transactionTypeConfig,
  statusConfig as transactionStatusConfig,
  formatDate as formatTransactionDate,
  formatTime as formatTransactionTime,
  getDateGroup,
};
