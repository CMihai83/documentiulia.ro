'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ConfirmationVariant = 'default' | 'destructive' | 'warning' | 'info' | 'success';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: ConfirmationVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Variant Configuration
// ============================================================================

const variantConfig: Record<ConfirmationVariant, {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  confirmButtonClass: string;
}> = {
  default: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-muted',
    iconColor: 'text-foreground',
    confirmButtonClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
  destructive: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmButtonClass: 'bg-red-600 text-white hover:bg-red-700',
  },
  warning: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    confirmButtonClass: 'bg-yellow-600 text-white hover:bg-yellow-700',
  },
  info: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmButtonClass: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  success: {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    confirmButtonClass: 'bg-green-600 text-white hover:bg-green-700',
  },
};

// ============================================================================
// Main Confirmation Dialog Component
// ============================================================================

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
  icon,
  children,
  className,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const config = variantConfig[variant];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const actualLoading = loading || isLoading;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !actualLoading && onOpenChange(false)}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div
              className={cn(
                'w-full max-w-md bg-background rounded-lg shadow-xl overflow-hidden',
                className
              )}
            >
              <div className="p-6">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className={cn('p-3 rounded-full', config.iconBg, config.iconColor)}>
                    {icon || config.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2">{title}</h2>
                  {description && (
                    <p className="text-sm text-muted-foreground mb-4">{description}</p>
                  )}
                  {children}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-6 py-4 bg-muted/30 border-t">
                <button
                  onClick={handleCancel}
                  disabled={actualLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={actualLoading}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50',
                    config.confirmButtonClass
                  )}
                >
                  {actualLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Se procesează...
                    </span>
                  ) : (
                    confirmLabel
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

export interface DeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function DeleteConfirmation({
  open,
  onOpenChange,
  itemName,
  itemType = 'element',
  onConfirm,
  loading,
  className,
}: DeleteConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Șterge ${itemType}`}
      description={`Sigur doriți să ștergeți "${itemName}"? Această acțiune nu poate fi anulată.`}
      confirmLabel="Șterge"
      cancelLabel="Anulează"
      onConfirm={onConfirm}
      variant="destructive"
      loading={loading}
      className={className}
    />
  );
}

// ============================================================================
// Discard Changes Confirmation
// ============================================================================

export interface DiscardChangesConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSave?: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function DiscardChangesConfirmation({
  open,
  onOpenChange,
  onConfirm,
  onSave,
  loading,
  className,
}: DiscardChangesConfirmationProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && onOpenChange(false)}
            className="fixed inset-0 bg-black/50 z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div className={cn('w-full max-w-md bg-background rounded-lg shadow-xl', className)}>
              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2">Modificări nesalvate</h2>
                  <p className="text-sm text-muted-foreground">
                    Aveți modificări nesalvate. Ce doriți să faceți?
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 px-6 py-4 bg-muted/30 border-t">
                {onSave && (
                  <button
                    onClick={async () => {
                      await onSave();
                      onOpenChange(false);
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Salvează modificările
                  </button>
                )}
                <button
                  onClick={() => {
                    onConfirm();
                    onOpenChange(false);
                  }}
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                >
                  Renunță la modificări
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Continuă editarea
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Delete Confirmation
// ============================================================================

export interface InvoiceDeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  invoiceAmount?: number;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function InvoiceDeleteConfirmation({
  open,
  onOpenChange,
  invoiceNumber,
  invoiceAmount,
  onConfirm,
  loading,
  className,
}: InvoiceDeleteConfirmationProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Șterge factură"
      confirmLabel="Șterge factura"
      cancelLabel="Anulează"
      onConfirm={onConfirm}
      variant="destructive"
      loading={loading}
      className={className}
    >
      <div className="p-4 bg-muted/50 rounded-lg mb-4">
        <p className="text-sm font-medium">Factură: {invoiceNumber}</p>
        {invoiceAmount !== undefined && (
          <p className="text-lg font-semibold text-primary mt-1">
            {formatCurrency(invoiceAmount)}
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Această acțiune va șterge definitiv factura și toate datele asociate.
        Această operațiune nu poate fi anulată.
      </p>
    </ConfirmationDialog>
  );
}

// ============================================================================
// Accounting-Specific: Send Invoice Confirmation
// ============================================================================

export interface SendInvoiceConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  recipientEmail: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function SendInvoiceConfirmation({
  open,
  onOpenChange,
  invoiceNumber,
  recipientEmail,
  onConfirm,
  loading,
  className,
}: SendInvoiceConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Trimite factură"
      confirmLabel="Trimite"
      cancelLabel="Anulează"
      onConfirm={onConfirm}
      variant="info"
      loading={loading}
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
      className={className}
    >
      <div className="p-4 bg-muted/50 rounded-lg mb-4 text-left">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Factură:</span>
          <span className="text-sm font-medium">{invoiceNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Destinatar:</span>
          <span className="text-sm font-medium">{recipientEmail}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Factura va fi trimisă ca atașament PDF la adresa de email specificată.
      </p>
    </ConfirmationDialog>
  );
}

// ============================================================================
// Accounting-Specific: Mark as Paid Confirmation
// ============================================================================

export interface MarkAsPaidConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  amount: number;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function MarkAsPaidConfirmation({
  open,
  onOpenChange,
  invoiceNumber,
  amount,
  onConfirm,
  loading,
  className,
}: MarkAsPaidConfirmationProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(value);
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Marchează ca plătită"
      confirmLabel="Confirmă plata"
      cancelLabel="Anulează"
      onConfirm={onConfirm}
      variant="success"
      loading={loading}
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      className={className}
    >
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
        <p className="text-sm text-muted-foreground mb-1">Factură: {invoiceNumber}</p>
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(amount)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Confirmați că ați primit plata pentru această factură?
      </p>
    </ConfirmationDialog>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type DeleteConfirmationProps as DeleteDialogProps,
  type DiscardChangesConfirmationProps as DiscardDialogProps,
  type InvoiceDeleteConfirmationProps as InvoiceDeleteDialogProps,
  type SendInvoiceConfirmationProps as SendInvoiceDialogProps,
  type MarkAsPaidConfirmationProps as MarkAsPaidDialogProps,
};
