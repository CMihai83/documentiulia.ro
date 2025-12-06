'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'check' | 'other';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  date: string;
  reference?: string;
  bankAccount?: string;
  notes?: string;
}

export interface PaymentFormProps {
  invoiceId?: string;
  invoiceTotal?: number;
  invoicePaid?: number;
  currency?: string;
  bankAccounts?: { id: string; name: string; iban: string }[];
  onSubmit: (payment: Omit<Payment, 'id'>) => void;
  onCancel?: () => void;
  className?: string;
}

export interface PaymentHistoryProps {
  payments: Payment[];
  currency?: string;
  onDelete?: (paymentId: string) => void;
  className?: string;
}

export interface QuickPaymentButtonProps {
  amount: number;
  currency?: string;
  label?: string;
  method?: PaymentMethod;
  onPay: (amount: number, method: PaymentMethod) => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  {
    value: 'cash',
    label: 'Numerar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 'bank_transfer',
    label: 'Transfer bancar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
  {
    value: 'card',
    label: 'Card',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    value: 'check',
    label: 'Cec',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    value: 'other',
    label: 'Altele',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// Payment Form Component
// ============================================================================

export function PaymentForm({
  invoiceId,
  invoiceTotal = 0,
  invoicePaid = 0,
  currency = 'RON',
  bankAccounts = [],
  onSubmit,
  onCancel,
  className,
}: PaymentFormProps) {
  const remainingAmount = invoiceTotal - invoicePaid;

  const [formData, setFormData] = React.useState({
    amount: remainingAmount > 0 ? remainingAmount : 0,
    method: 'bank_transfer' as PaymentMethod,
    date: new Date().toISOString().split('T')[0],
    reference: '',
    bankAccount: bankAccounts[0]?.id || '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      amount: formData.amount,
      currency,
      method: formData.method,
      date: formData.date,
      reference: formData.reference || undefined,
      bankAccount: formData.bankAccount || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleQuickAmount = (percentage: number) => {
    setFormData({ ...formData, amount: remainingAmount * percentage });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onSubmit={handleSubmit}
      className={cn('p-6 bg-card rounded-lg border space-y-6', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Înregistrare plată</h3>
          {invoiceId && (
            <p className="text-sm text-muted-foreground">Factură #{invoiceId}</p>
          )}
        </div>
        {remainingAmount > 0 && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Rest de plată</p>
            <p className="text-lg font-semibold text-primary">{formatCurrency(remainingAmount, currency)}</p>
          </div>
        )}
      </div>

      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-medium mb-3">Metodă de plată</label>
        <div className="grid grid-cols-5 gap-2">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => setFormData({ ...formData, method: method.value })}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                formData.method === method.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              {method.icon}
              <span className="text-xs">{method.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium mb-2">Sumă *</label>
        <div className="relative">
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 text-lg border rounded-lg bg-background pr-16"
            min="0"
            step="0.01"
            required
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {currency}
          </span>
        </div>
        {/* Quick Amount Buttons */}
        {remainingAmount > 0 && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleQuickAmount(1)}
              className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(0.5)}
              className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(0.25)}
              className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              25%
            </button>
          </div>
        )}
      </div>

      {/* Date and Reference */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Data plății *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Referință</label>
          <input
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
            placeholder="Nr. document / Referință"
          />
        </div>
      </div>

      {/* Bank Account (for bank transfer) */}
      {formData.method === 'bank_transfer' && bankAccounts.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Cont bancar</label>
          <select
            value={formData.bankAccount}
            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            <option value="">Selectează contul</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} - {account.iban}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">Note</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg bg-background resize-none"
          rows={2}
          placeholder="Note adiționale despre plată"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            Anulează
          </button>
        )}
        <button
          type="submit"
          disabled={formData.amount <= 0}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Înregistrează plata
        </button>
      </div>
    </motion.form>
  );
}

// ============================================================================
// Payment History Component
// ============================================================================

export function PaymentHistory({
  payments,
  currency = 'RON',
  onDelete,
  className,
}: PaymentHistoryProps) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const getMethodIcon = (method: PaymentMethod) => {
    const found = paymentMethods.find((m) => m.value === method);
    return found?.icon;
  };

  const getMethodLabel = (method: PaymentMethod) => {
    const found = paymentMethods.find((m) => m.value === method);
    return found?.label || method;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Istoric plăți</h4>
        <span className="text-sm text-muted-foreground">
          Total încasat: <span className="font-semibold text-foreground">{formatCurrency(totalPaid, currency)}</span>
        </span>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>Nu există plăți înregistrate</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {payments.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-background rounded-full border">
                  {getMethodIcon(payment.method)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(payment.amount, payment.currency)}</span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                      {getMethodLabel(payment.method)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{formatDate(payment.date)}</span>
                    {payment.reference && (
                      <>
                        <span>•</span>
                        <span>Ref: {payment.reference}</span>
                      </>
                    )}
                  </div>
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(payment.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                    title="Șterge plata"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Quick Payment Button Component
// ============================================================================

export function QuickPaymentButton({
  amount,
  currency = 'RON',
  label = 'Plătește',
  method = 'cash',
  onPay,
  className,
}: QuickPaymentButtonProps) {
  return (
    <button
      onClick={() => onPay(amount, method)}
      className={cn(
        'flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors',
        className
      )}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {label} {formatCurrency(amount, currency)}
    </button>
  );
}

// ============================================================================
// Payment Status Badge Component
// ============================================================================

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'refunded';

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  amount?: number;
  paidAmount?: number;
  currency?: string;
  className?: string;
}

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: 'Neplătită', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  partial: { label: 'Plătită parțial', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  paid: { label: 'Plătită', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  overdue: { label: 'Restantă', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  refunded: { label: 'Rambursată', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export function PaymentStatusBadge({
  status,
  amount,
  paidAmount,
  currency = 'RON',
  className,
}: PaymentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
        {config.label}
      </span>
      {status === 'partial' && amount && paidAmount !== undefined && (
        <span className="text-xs text-muted-foreground">
          ({formatCurrency(paidAmount, currency)} / {formatCurrency(amount, currency)})
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Payment Progress Component
// ============================================================================

export interface PaymentProgressProps {
  total: number;
  paid: number;
  currency?: string;
  className?: string;
}

export function PaymentProgress({
  total,
  paid,
  currency = 'RON',
  className,
}: PaymentProgressProps) {
  const percentage = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const remaining = Math.max(total - paid, 0);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Plătit</span>
        <span className="font-medium">{formatCurrency(paid, currency)} / {formatCurrency(total, currency)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          )}
        />
      </div>
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Rest de plată: {formatCurrency(remaining, currency)}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { paymentMethods, formatDate as formatPaymentDate };
