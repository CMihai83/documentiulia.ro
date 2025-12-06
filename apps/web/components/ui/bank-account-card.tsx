'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type BankAccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
export type AccountStatus = 'active' | 'inactive' | 'pending' | 'error';

export interface BankAccount {
  id: string;
  name: string;
  type: BankAccountType;
  status: AccountStatus;
  balance: number;
  currency: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  bankLogo?: string;
  lastSynced?: string;
  accountNumber?: string;
  isDefault?: boolean;
  color?: string;
}

export interface BankAccountCardProps {
  account: BankAccount;
  variant?: 'default' | 'compact' | 'detailed' | 'mini';
  selected?: boolean;
  onSelect?: () => void;
  onSync?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  onViewTransactions?: () => void;
  className?: string;
}

export interface BankAccountListProps {
  accounts: BankAccount[];
  variant?: 'default' | 'compact' | 'detailed';
  selectedId?: string;
  onSelect?: (id: string) => void;
  onAddAccount?: () => void;
  emptyMessage?: string;
  className?: string;
}

export interface BankAccountSelectorProps {
  accounts: BankAccount[];
  selectedId?: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const accountTypeConfig: Record<BankAccountType, { label: string; icon: React.ReactNode; color: string }> = {
  checking: {
    label: 'Cont curent',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    color: 'bg-blue-500',
  },
  savings: {
    label: 'Cont economii',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: 'bg-green-500',
  },
  credit: {
    label: 'Card credit',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    color: 'bg-purple-500',
  },
  cash: {
    label: 'Numerar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-amber-500',
  },
  investment: {
    label: 'Investiții',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'bg-indigo-500',
  },
};

const statusConfig: Record<AccountStatus, { label: string; className: string }> = {
  active: { label: 'Activ', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  inactive: { label: 'Inactiv', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  pending: { label: 'În așteptare', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  error: { label: 'Eroare', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

// Romanian banks
const romanianBanks: Record<string, { name: string; color: string }> = {
  'BRDE': { name: 'BRD', color: '#E30613' },
  'BTRL': { name: 'Banca Transilvania', color: '#003366' },
  'RNCB': { name: 'BCR', color: '#002855' },
  'INGB': { name: 'ING Bank', color: '#FF6200' },
  'RZBR': { name: 'Raiffeisen Bank', color: '#FFE600' },
  'BACX': { name: 'UniCredit Bank', color: '#E31836' },
  'PIRB': { name: 'First Bank', color: '#00A6CE' },
  'CECE': { name: 'CEC Bank', color: '#004990' },
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

function formatIBAN(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function maskIBAN(iban: string): string {
  if (iban.length < 8) return iban;
  return `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;
}

function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} ore`;
  return `${diffDays} zile`;
}

function getBankFromIBAN(iban: string): { name: string; color: string } | null {
  if (!iban || iban.length < 8) return null;
  const bankCode = iban.slice(4, 8);
  return romanianBanks[bankCode] || null;
}

// ============================================================================
// Bank Account Card Component
// ============================================================================

export function BankAccountCard({
  account,
  variant = 'default',
  selected = false,
  onSelect,
  onSync,
  onEdit,
  onDelete,
  onSetDefault,
  onViewTransactions,
  className,
}: BankAccountCardProps) {
  const [showIBAN, setShowIBAN] = React.useState(false);
  const config = accountTypeConfig[account.type];
  const status = statusConfig[account.status];
  const bankInfo = account.iban ? getBankFromIBAN(account.iban) : null;

  if (variant === 'mini') {
    return (
      <div
        onClick={onSelect}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
          selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50',
          className
        )}
      >
        <div
          className="w-8 h-8 flex items-center justify-center rounded-full text-white"
          style={{ backgroundColor: account.color || config.color.replace('bg-', '#') }}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{account.name}</p>
        </div>
        <p className={cn('text-sm font-semibold', account.balance < 0 && 'text-red-600')}>
          {formatCurrency(account.balance, account.currency)}
        </p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onSelect}
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-all cursor-pointer',
          selected && 'ring-2 ring-primary',
          className
        )}
      >
        <div
          className="w-12 h-12 flex items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: account.color || config.color.replace('bg-', '#') }}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{account.name}</h4>
            {account.isDefault && (
              <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">Principal</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {config.label} • {account.iban ? maskIBAN(account.iban) : account.accountNumber}
          </p>
        </div>
        <div className="text-right">
          <p className={cn('font-semibold', account.balance < 0 && 'text-red-600')}>
            {formatCurrency(account.balance, account.currency)}
          </p>
          {account.lastSynced && (
            <p className="text-xs text-muted-foreground">
              Sincr. {getTimeAgo(account.lastSynced)}
            </p>
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
          'rounded-xl border bg-card overflow-hidden',
          selected && 'ring-2 ring-primary',
          className
        )}
      >
        {/* Card Header with gradient */}
        <div
          className="p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${account.color || bankInfo?.color || '#3b82f6'}, ${account.color || bankInfo?.color || '#3b82f6'}dd)`,
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{account.name}</h3>
                {account.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">Principal</span>
                )}
              </div>
              <p className="text-white/80 text-sm">{bankInfo?.name || account.bankName || config.label}</p>
            </div>
            <span className={cn('px-2 py-1 text-xs rounded-full bg-white/20')}>
              {status.label}
            </span>
          </div>

          {/* Balance */}
          <div className="mb-4">
            <p className="text-white/70 text-sm">Sold disponibil</p>
            <p className="text-3xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
          </div>

          {/* IBAN */}
          {account.iban && (
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowIBAN(!showIBAN)}
            >
              <p className="font-mono text-sm">
                {showIBAN ? formatIBAN(account.iban) : maskIBAN(account.iban)}
              </p>
              <button className="p-1 hover:bg-white/10 rounded">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showIBAN ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4">
          {/* Last Synced */}
          {account.lastSynced && (
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">Ultima sincronizare</span>
              <span className="font-medium">{getTimeAgo(account.lastSynced)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t mt-3">
            {onViewTransactions && (
              <button
                onClick={onViewTransactions}
                className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Tranzacții
              </button>
            )}
            {onSync && (
              <button
                onClick={onSync}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Sincronizează"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
            {!account.isDefault && onSetDefault && (
              <button
                onClick={onSetDefault}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Setează ca principal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onSelect}
      className={cn(
        'p-4 rounded-lg border bg-card hover:shadow-sm transition-all cursor-pointer',
        selected && 'ring-2 ring-primary',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 flex items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: account.color || bankInfo?.color || '#3b82f6' }}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{account.name}</h4>
            {account.isDefault && (
              <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {bankInfo?.name || account.bankName || config.label}
          </p>
        </div>
        <div className="text-right">
          <p className={cn('font-semibold', account.balance < 0 && 'text-red-600')}>
            {formatCurrency(account.balance, account.currency)}
          </p>
          <span className={cn('px-2 py-0.5 text-xs rounded-full', status.className)}>
            {status.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Bank Account List Component
// ============================================================================

export function BankAccountList({
  accounts,
  variant = 'default',
  selectedId,
  onSelect,
  onAddAccount,
  emptyMessage = 'Nu există conturi bancare',
  className,
}: BankAccountListProps) {
  const totalBalance = accounts.reduce((sum, acc) => {
    if (acc.currency === 'RON') return sum + acc.balance;
    return sum;
  }, 0);

  if (accounts.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p className="text-muted-foreground mb-4">{emptyMessage}</p>
        {onAddAccount && (
          <button
            onClick={onAddAccount}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Adaugă cont
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total Balance Header */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">Sold total</p>
        <p className="text-2xl font-bold">{formatCurrency(totalBalance, 'RON')}</p>
        <p className="text-xs text-muted-foreground">{accounts.length} conturi</p>
      </div>

      {/* Account List */}
      <div className={cn('space-y-3', variant === 'detailed' && 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0')}>
        <AnimatePresence>
          {accounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={account}
              variant={variant}
              selected={selectedId === account.id}
              onSelect={onSelect ? () => onSelect(account.id) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Add Account Button */}
      {onAddAccount && (
        <button
          onClick={onAddAccount}
          className="w-full p-4 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adaugă cont bancar
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Bank Account Selector Component
// ============================================================================

export function BankAccountSelector({
  accounts,
  selectedId,
  onSelect,
  placeholder = 'Selectează contul',
  className,
}: BankAccountSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedAccount = accounts.find((a) => a.id === selectedId);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
      >
        {selectedAccount ? (
          <>
            <div
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white text-xs"
              style={{ backgroundColor: selectedAccount.color || '#3b82f6' }}
            >
              {accountTypeConfig[selectedAccount.type].icon}
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">{selectedAccount.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
              </p>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <svg
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  onSelect(account.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors',
                  selectedId === account.id && 'bg-muted'
                )}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white text-xs"
                  style={{ backgroundColor: account.color || '#3b82f6' }}
                >
                  {accountTypeConfig[account.type].icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.iban ? maskIBAN(account.iban) : account.bankName}
                  </p>
                </div>
                <p className={cn('font-medium text-sm', account.balance < 0 && 'text-red-600')}>
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Account Balance Summary Component
// ============================================================================

export interface AccountBalanceSummaryProps {
  accounts: BankAccount[];
  className?: string;
}

export function AccountBalanceSummary({ accounts, className }: AccountBalanceSummaryProps) {
  const byCurrency = accounts.reduce((acc, account) => {
    if (!acc[account.currency]) acc[account.currency] = 0;
    acc[account.currency] += account.balance;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {Object.entries(byCurrency).map(([currency, total]) => (
        <div key={currency} className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">{currency}</p>
          <p className={cn('text-xl font-bold', total < 0 && 'text-red-600')}>
            {formatCurrency(total, currency)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  accountTypeConfig,
  statusConfig as accountStatusConfig,
  romanianBanks,
  formatIBAN,
  maskIBAN,
  getBankFromIBAN,
  getTimeAgo,
};
