'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: (selectedIds: string[]) => void | Promise<void>;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  selectedIds?: string[];
  className?: string;
}

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles = {
  default: 'hover:bg-muted',
  primary: 'hover:bg-primary/10 text-primary',
  success: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400',
  warning: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  danger: 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400',
};

// ============================================================================
// Bulk Actions Bar Component
// ============================================================================

export function BulkActionsBar({
  selectedCount,
  totalCount,
  actions,
  onSelectAll,
  onDeselectAll,
  selectedIds = [],
  className,
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = React.useState<BulkAction | null>(null);
  const [isLoading, setIsLoading] = React.useState<string | null>(null);

  const handleActionClick = async (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: BulkAction) => {
    setIsLoading(action.id);
    try {
      await action.onClick(selectedIds);
    } finally {
      setIsLoading(null);
      setConfirmAction(null);
    }
  };

  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-2 px-4 py-3',
            'bg-background border rounded-lg shadow-lg',
            className
          )}
        >
          {/* Selection Info */}
          <div className="flex items-center gap-3 pr-3 border-r">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{selectedCount}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                selectate din {totalCount}
              </span>
            </div>

            {/* Select All / Deselect All */}
            {onSelectAll && !isAllSelected && (
              <button
                onClick={onSelectAll}
                className="text-sm text-primary hover:underline"
              >
                Selectează toate
              </button>
            )}
            {onDeselectAll && selectedCount > 0 && (
              <button
                onClick={onDeselectAll}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Deselectează
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled || isLoading === action.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  variantStyles[action.variant || 'default'],
                  (action.disabled || isLoading === action.id) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isLoading === action.id ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <span className="w-4 h-4">{action.icon}</span>
                )}
                {action.label}
              </button>
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={onDeselectAll}
            className="ml-2 p-1.5 hover:bg-muted rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Confirmation Dialog */}
          {confirmAction && (
            <BulkActionConfirmation
              action={confirmAction}
              selectedCount={selectedCount}
              onConfirm={() => executeAction(confirmAction)}
              onCancel={() => setConfirmAction(null)}
              isLoading={isLoading === confirmAction.id}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Bulk Action Confirmation Component
// ============================================================================

interface BulkActionConfirmationProps {
  action: BulkAction;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function BulkActionConfirmation({
  action,
  selectedCount,
  onConfirm,
  onCancel,
  isLoading,
}: BulkActionConfirmationProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background rounded-lg shadow-xl p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            action.variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
          )}>
            <span className="w-6 h-6">{action.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold">Confirmare {action.label}</h3>
            <p className="text-sm text-muted-foreground">
              {action.confirmationMessage || `Această acțiune va afecta ${selectedCount} elemente selectate.`}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
              action.variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {action.label}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ============================================================================
// Bulk Selection Checkbox Component
// ============================================================================

export interface BulkSelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function BulkSelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  className,
}: BulkSelectionCheckboxProps) {
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className={cn('flex items-center', className)}>
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={cn(
          'w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      />
    </label>
  );
}

// ============================================================================
// Use Bulk Selection Hook
// ============================================================================

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const deselectAll = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRange = React.useCallback(
    (startId: string, endId: string) => {
      const startIndex = items.findIndex((item) => item.id === startId);
      const endIndex = items.findIndex((item) => item.id === endId);
      const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          next.add(items[i].id);
        }
        return next;
      });
    },
    [items]
  );

  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    selectedItems,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    selectRange,
    isAllSelected: selectedIds.size === items.length && items.length > 0,
    isPartiallySelected: selectedIds.size > 0 && selectedIds.size < items.length,
  };
}

// ============================================================================
// Accounting-Specific: Invoice Bulk Actions
// ============================================================================

export interface InvoiceBulkActionsProps {
  selectedIds: string[];
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSend: (ids: string[]) => Promise<void>;
  onMarkPaid: (ids: string[]) => Promise<void>;
  onExport: (ids: string[]) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  className?: string;
}

export function InvoiceBulkActions({
  selectedIds,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onSend,
  onMarkPaid,
  onExport,
  onDelete,
  className,
}: InvoiceBulkActionsProps) {
  const actions: BulkAction[] = [
    {
      id: 'send',
      label: 'Trimite',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      onClick: onSend,
      variant: 'primary',
    },
    {
      id: 'mark-paid',
      label: 'Marchează plătite',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      onClick: onMarkPaid,
      variant: 'success',
    },
    {
      id: 'export',
      label: 'Exportă',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onClick: onExport,
    },
    {
      id: 'delete',
      label: 'Șterge',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: onDelete,
      variant: 'danger',
      requiresConfirmation: true,
      confirmationMessage: `Sigur doriți să ștergeți ${selectedCount} facturi selectate? Această acțiune nu poate fi anulată.`,
    },
  ];

  return (
    <BulkActionsBar
      selectedCount={selectedCount}
      totalCount={totalCount}
      actions={actions}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      selectedIds={selectedIds}
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Expense Bulk Actions
// ============================================================================

export interface ExpenseBulkActionsProps {
  selectedIds: string[];
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCategorize: (ids: string[]) => Promise<void>;
  onApprove: (ids: string[]) => Promise<void>;
  onExport: (ids: string[]) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  className?: string;
}

export function ExpenseBulkActions({
  selectedIds,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onCategorize,
  onApprove,
  onExport,
  onDelete,
  className,
}: ExpenseBulkActionsProps) {
  const actions: BulkAction[] = [
    {
      id: 'categorize',
      label: 'Categorizează',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      onClick: onCategorize,
      variant: 'primary',
    },
    {
      id: 'approve',
      label: 'Aprobă',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: onApprove,
      variant: 'success',
    },
    {
      id: 'export',
      label: 'Exportă',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onClick: onExport,
    },
    {
      id: 'delete',
      label: 'Șterge',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: onDelete,
      variant: 'danger',
      requiresConfirmation: true,
      confirmationMessage: `Sigur doriți să ștergeți ${selectedCount} cheltuieli selectate?`,
    },
  ];

  return (
    <BulkActionsBar
      selectedCount={selectedCount}
      totalCount={totalCount}
      actions={actions}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      selectedIds={selectedIds}
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Contact Bulk Actions
// ============================================================================

export interface ContactBulkActionsProps {
  selectedIds: string[];
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSendEmail: (ids: string[]) => Promise<void>;
  onAddTag: (ids: string[]) => Promise<void>;
  onExport: (ids: string[]) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  className?: string;
}

export function ContactBulkActions({
  selectedIds,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onSendEmail,
  onAddTag,
  onExport,
  onDelete,
  className,
}: ContactBulkActionsProps) {
  const actions: BulkAction[] = [
    {
      id: 'email',
      label: 'Trimite email',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      onClick: onSendEmail,
      variant: 'primary',
    },
    {
      id: 'tag',
      label: 'Adaugă etichetă',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      onClick: onAddTag,
    },
    {
      id: 'export',
      label: 'Exportă',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      onClick: onExport,
    },
    {
      id: 'delete',
      label: 'Șterge',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: onDelete,
      variant: 'danger',
      requiresConfirmation: true,
      confirmationMessage: `Sigur doriți să ștergeți ${selectedCount} contacte selectate?`,
    },
  ];

  return (
    <BulkActionsBar
      selectedCount={selectedCount}
      totalCount={totalCount}
      actions={actions}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      selectedIds={selectedIds}
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type BulkAction as BulkActionItem,
  type BulkActionsBarProps as BulkActionsProps,
  type BulkSelectionCheckboxProps as SelectionCheckboxProps,
  type InvoiceBulkActionsProps as InvoiceBulkProps,
  type ExpenseBulkActionsProps as ExpenseBulkProps,
  type ContactBulkActionsProps as ContactBulkProps,
};
