'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type ActionBarPosition = 'top' | 'bottom' | 'floating';
export type ActionBarVariant = 'default' | 'primary' | 'destructive';

const positionClasses: Record<ActionBarPosition, string> = {
  top: 'top-0 left-0 right-0 border-b',
  bottom: 'bottom-0 left-0 right-0 border-t',
  floating: 'bottom-6 left-1/2 -translate-x-1/2 rounded-lg border shadow-lg max-w-fit',
};

const variantClasses: Record<ActionBarVariant, string> = {
  default: 'bg-background',
  primary: 'bg-primary text-primary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

// ============================================================================
// Main Action Bar Component
// ============================================================================

interface ActionBarProps {
  children: React.ReactNode;
  position?: ActionBarPosition;
  variant?: ActionBarVariant;
  visible?: boolean;
  className?: string;
}

export function ActionBar({
  children,
  position = 'bottom',
  variant = 'default',
  visible = true,
  className,
}: ActionBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed z-50 flex items-center gap-3 px-4 py-3',
            positionClasses[position],
            variantClasses[variant],
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Action Bar Content
// ============================================================================

interface ActionBarContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ActionBarContent({ children, className }: ActionBarContentProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-1', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Action Bar Title
// ============================================================================

interface ActionBarTitleProps {
  children: React.ReactNode;
  count?: number;
  className?: string;
}

export function ActionBarTitle({ children, count, className }: ActionBarTitleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {count !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-primary/20 text-primary text-sm font-medium">
          {count}
        </span>
      )}
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

// ============================================================================
// Action Bar Actions
// ============================================================================

interface ActionBarActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function ActionBarActions({ children, className }: ActionBarActionsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Action Bar Button
// ============================================================================

interface ActionBarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

const buttonVariantClasses = {
  default: 'bg-background border hover:bg-accent text-foreground',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

const buttonSizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
};

export const ActionBarButton = React.forwardRef<HTMLButtonElement, ActionBarButtonProps>(
  ({ className, variant = 'default', size = 'md', icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          buttonVariantClasses[variant],
          buttonSizeClasses[size],
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);
ActionBarButton.displayName = 'ActionBarButton';

// ============================================================================
// Action Bar Separator
// ============================================================================

interface ActionBarSeparatorProps {
  className?: string;
}

export function ActionBarSeparator({ className }: ActionBarSeparatorProps) {
  return <div className={cn('w-px h-6 bg-border', className)} />;
}

// ============================================================================
// Action Bar Close
// ============================================================================

interface ActionBarCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const ActionBarClose = React.forwardRef<HTMLButtonElement, ActionBarCloseProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center w-8 h-8 rounded-md',
          'hover:bg-accent hover:text-accent-foreground transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="sr-only">Închide</span>
      </button>
    );
  }
);
ActionBarClose.displayName = 'ActionBarClose';

// ============================================================================
// Selection Action Bar
// ============================================================================

interface SelectionActionBarProps {
  selectedCount: number;
  totalCount?: number;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onArchive?: () => void;
  actions?: React.ReactNode;
  visible?: boolean;
  className?: string;
}

export function SelectionActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onArchive,
  actions,
  visible = true,
  className,
}: SelectionActionBarProps) {
  return (
    <ActionBar position="floating" visible={visible && selectedCount > 0} className={className}>
      <ActionBarContent>
        <ActionBarTitle count={selectedCount}>
          {selectedCount === 1 ? 'element selectat' : 'elemente selectate'}
        </ActionBarTitle>

        {totalCount && onSelectAll && selectedCount < totalCount && (
          <button
            onClick={onSelectAll}
            className="text-sm text-primary hover:underline"
          >
            Selectează toate ({totalCount})
          </button>
        )}

        {onDeselectAll && (
          <button
            onClick={onDeselectAll}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Deselectează
          </button>
        )}
      </ActionBarContent>

      <ActionBarSeparator />

      <ActionBarActions>
        {actions}

        {onExport && (
          <ActionBarButton
            variant="ghost"
            size="sm"
            onClick={onExport}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Exportă
          </ActionBarButton>
        )}

        {onArchive && (
          <ActionBarButton
            variant="ghost"
            size="sm"
            onClick={onArchive}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            }
          >
            Arhivează
          </ActionBarButton>
        )}

        {onDelete && (
          <ActionBarButton
            variant="destructive"
            size="sm"
            onClick={onDelete}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Șterge
          </ActionBarButton>
        )}
      </ActionBarActions>

      <ActionBarClose onClick={onDeselectAll} />
    </ActionBar>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Action Bar
// ============================================================================

interface InvoiceActionBarProps {
  selectedCount: number;
  onDeselectAll?: () => void;
  onSendEmail?: () => void;
  onMarkPaid?: () => void;
  onExportPdf?: () => void;
  onDelete?: () => void;
  visible?: boolean;
  className?: string;
}

export function InvoiceActionBar({
  selectedCount,
  onDeselectAll,
  onSendEmail,
  onMarkPaid,
  onExportPdf,
  onDelete,
  visible = true,
  className,
}: InvoiceActionBarProps) {
  return (
    <ActionBar position="floating" visible={visible && selectedCount > 0} className={className}>
      <ActionBarContent>
        <ActionBarTitle count={selectedCount}>
          {selectedCount === 1 ? 'factură selectată' : 'facturi selectate'}
        </ActionBarTitle>
      </ActionBarContent>

      <ActionBarSeparator />

      <ActionBarActions>
        {onSendEmail && (
          <ActionBarButton
            variant="ghost"
            size="sm"
            onClick={onSendEmail}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          >
            Trimite email
          </ActionBarButton>
        )}

        {onMarkPaid && (
          <ActionBarButton
            variant="primary"
            size="sm"
            onClick={onMarkPaid}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            Marchează plătit
          </ActionBarButton>
        )}

        {onExportPdf && (
          <ActionBarButton
            variant="ghost"
            size="sm"
            onClick={onExportPdf}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Export PDF
          </ActionBarButton>
        )}

        {onDelete && (
          <ActionBarButton
            variant="destructive"
            size="sm"
            onClick={onDelete}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Șterge
          </ActionBarButton>
        )}
      </ActionBarActions>

      <ActionBarClose onClick={onDeselectAll} />
    </ActionBar>
  );
}

// ============================================================================
// Accounting-Specific: Bulk Edit Action Bar
// ============================================================================

interface BulkEditActionBarProps {
  selectedCount: number;
  onDeselectAll?: () => void;
  onBulkEdit?: () => void;
  onBulkTag?: () => void;
  onBulkAssign?: () => void;
  onBulkStatus?: () => void;
  visible?: boolean;
  className?: string;
}

export function BulkEditActionBar({
  selectedCount,
  onDeselectAll,
  onBulkEdit,
  onBulkTag,
  onBulkAssign,
  onBulkStatus,
  visible = true,
  className,
}: BulkEditActionBarProps) {
  return (
    <ActionBar position="floating" visible={visible && selectedCount > 0} className={className}>
      <ActionBarContent>
        <ActionBarTitle count={selectedCount}>
          selectate pentru editare
        </ActionBarTitle>
      </ActionBarContent>

      <ActionBarSeparator />

      <ActionBarActions>
        {onBulkEdit && (
          <ActionBarButton
            variant="primary"
            size="sm"
            onClick={onBulkEdit}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Editare în masă
          </ActionBarButton>
        )}

        {onBulkTag && (
          <ActionBarButton
            variant="ghost"
            size="sm"
            onClick={onBulkTag}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          >
            Adaugă tag
          </ActionBarButton>
        )}

        {onBulkAssign && (
          <ActionBarButton
            variant="ghost"
            size="sm"
            onClick={onBulkAssign}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            Asignează
          </ActionBarButton>
        )}

        {onBulkStatus && (
          <ActionBarButton
            variant="ghost"
            size="sm"
            onClick={onBulkStatus}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            Schimbă status
          </ActionBarButton>
        )}
      </ActionBarActions>

      <ActionBarClose onClick={onDeselectAll} />
    </ActionBar>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type ActionBarProps,
  type ActionBarContentProps,
  type ActionBarTitleProps,
  type ActionBarActionsProps,
  type ActionBarButtonProps,
  type ActionBarSeparatorProps,
  type ActionBarCloseProps,
  type SelectionActionBarProps,
  type InvoiceActionBarProps,
  type BulkEditActionBarProps,
};
