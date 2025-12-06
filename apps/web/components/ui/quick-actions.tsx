'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string | number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface QuickActionsProps {
  actions: QuickAction[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'sm' | 'md' | 'lg';
  showShortcuts?: boolean;
  className?: string;
}

// ============================================================================
// Size Configuration
// ============================================================================

const sizeConfig = {
  sm: {
    padding: 'p-2',
    icon: 'w-4 h-4',
    text: 'text-xs',
    gap: 'gap-1',
  },
  md: {
    padding: 'p-3',
    icon: 'w-5 h-5',
    text: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    padding: 'p-4',
    icon: 'w-6 h-6',
    text: 'text-base',
    gap: 'gap-3',
  },
};

const variantStyles = {
  default: 'hover:bg-muted',
  primary: 'hover:bg-primary/10 hover:text-primary',
  success: 'hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600',
  warning: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-600',
  danger: 'hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600',
};

// ============================================================================
// Quick Actions Component
// ============================================================================

export function QuickActions({
  actions,
  layout = 'horizontal',
  size = 'md',
  showShortcuts = true,
  className,
}: QuickActionsProps) {
  const config = sizeConfig[size];

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!showShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if Ctrl/Cmd is pressed
      if (!(e.ctrlKey || e.metaKey)) return;

      const action = actions.find((a) => {
        if (!a.shortcut || a.disabled) return false;
        const key = a.shortcut.toLowerCase().replace('ctrl+', '').replace('cmd+', '');
        return e.key.toLowerCase() === key;
      });

      if (action) {
        e.preventDefault();
        action.onClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions, showShortcuts]);

  const layoutClasses = {
    horizontal: 'flex flex-row items-center flex-wrap gap-2',
    vertical: 'flex flex-col gap-1',
    grid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2',
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {actions.map((action) => (
        <QuickActionButton
          key={action.id}
          action={action}
          size={size}
          showShortcut={showShortcuts}
          layout={layout}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Quick Action Button Component
// ============================================================================

interface QuickActionButtonProps {
  action: QuickAction;
  size: 'sm' | 'md' | 'lg';
  showShortcut: boolean;
  layout: 'horizontal' | 'vertical' | 'grid';
}

function QuickActionButton({ action, size, showShortcut, layout }: QuickActionButtonProps) {
  const config = sizeConfig[size];
  const variant = variantStyles[action.variant || 'default'];

  const isCompact = layout === 'horizontal' && size === 'sm';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={action.onClick}
      disabled={action.disabled}
      className={cn(
        'relative flex items-center rounded-lg border transition-colors',
        config.padding,
        config.gap,
        variant,
        action.disabled && 'opacity-50 cursor-not-allowed',
        layout === 'grid' && 'flex-col text-center',
        layout === 'vertical' && 'w-full'
      )}
      title={action.description}
    >
      {/* Icon */}
      <span className={cn(config.icon, 'flex-shrink-0')}>
        {action.icon}
      </span>

      {/* Label */}
      {!isCompact && (
        <span className={cn(config.text, 'font-medium')}>
          {action.label}
        </span>
      )}

      {/* Shortcut */}
      {showShortcut && action.shortcut && !isCompact && (
        <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-muted rounded font-mono">
          {action.shortcut.replace('Ctrl+', '⌘')}
        </kbd>
      )}

      {/* Badge */}
      {action.badge !== undefined && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full min-w-[1.25rem] text-center">
          {action.badge}
        </span>
      )}
    </motion.button>
  );
}

// ============================================================================
// Floating Quick Actions Component
// ============================================================================

export interface FloatingQuickActionsProps {
  actions: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export function FloatingQuickActions({
  actions,
  position = 'bottom-right',
  className,
}: FloatingQuickActionsProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const menuPositionClasses = {
    'bottom-right': 'bottom-full right-0 mb-2',
    'bottom-left': 'bottom-full left-0 mb-2',
    'top-right': 'top-full right-0 mt-2',
    'top-left': 'top-full left-0 mt-2',
  };

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn('absolute bg-background border rounded-lg shadow-lg p-2', menuPositionClasses[position])}
          >
            <div className="flex flex-col gap-1 min-w-[200px]">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    'hover:bg-muted',
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="w-5 h-5 flex-shrink-0">{action.icon}</span>
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'hover:bg-primary/90 transition-colors'
        )}
      >
        <motion.svg
          animate={{ rotate: isOpen ? 45 : 0 }}
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </motion.svg>
      </motion.button>
    </div>
  );
}

// ============================================================================
// Command Palette Component
// ============================================================================

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: QuickAction[];
  placeholder?: string;
  className?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  actions,
  placeholder = 'Căutați comenzi...',
  className,
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredActions = React.useMemo(() => {
    if (!search) return actions;
    const query = search.toLowerCase();
    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(query) ||
        action.description?.toLowerCase().includes(query)
    );
  }, [actions, search]);

  React.useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].onClick();
          onOpenChange(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };

  // Global keyboard shortcut to open
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className={cn(
              'fixed left-1/2 top-1/4 -translate-x-1/2 z-50',
              'w-full max-w-lg bg-background rounded-lg shadow-xl overflow-hidden',
              className
            )}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 border-b">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 py-4 bg-transparent outline-none text-sm"
              />
              <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filteredActions.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nu s-au găsit comenzi
                </div>
              ) : (
                filteredActions.map((action, index) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.onClick();
                      onOpenChange(false);
                    }}
                    disabled={action.disabled}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                      selectedIndex === index && 'bg-muted',
                      action.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className="w-5 h-5 flex-shrink-0 text-muted-foreground">
                      {action.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{action.label}</p>
                      {action.description && (
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      )}
                    </div>
                    {action.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded font-mono">
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded">↑</kbd>
                <kbd className="px-1 py-0.5 bg-muted rounded">↓</kbd>
                navigare
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd>
                selectează
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd>
                închide
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Quick Actions
// ============================================================================

export interface InvoiceQuickActionsProps {
  onCreateInvoice: () => void;
  onCreateQuote: () => void;
  onImport: () => void;
  onExport: () => void;
  className?: string;
}

export function InvoiceQuickActions({
  onCreateInvoice,
  onCreateQuote,
  onImport,
  onExport,
  className,
}: InvoiceQuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: 'create-invoice',
      label: 'Factură nouă',
      description: 'Creează o factură nouă',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      shortcut: 'Ctrl+N',
      onClick: onCreateInvoice,
      variant: 'primary',
    },
    {
      id: 'create-quote',
      label: 'Proformă nouă',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: onCreateQuote,
    },
    {
      id: 'import',
      label: 'Importă',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      onClick: onImport,
    },
    {
      id: 'export',
      label: 'Exportă',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      shortcut: 'Ctrl+E',
      onClick: onExport,
    },
  ];

  return <QuickActions actions={actions} className={className} />;
}

// ============================================================================
// Accounting-Specific: Dashboard Quick Actions
// ============================================================================

export interface DashboardQuickActionsProps {
  onCreateInvoice: () => void;
  onRecordExpense: () => void;
  onAddContact: () => void;
  onGenerateReport: () => void;
  className?: string;
}

export function DashboardQuickActions({
  onCreateInvoice,
  onRecordExpense,
  onAddContact,
  onGenerateReport,
  className,
}: DashboardQuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: 'invoice',
      label: 'Factură nouă',
      description: 'Emite o factură către client',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: onCreateInvoice,
      variant: 'primary',
    },
    {
      id: 'expense',
      label: 'Cheltuială nouă',
      description: 'Înregistrează o cheltuială',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      ),
      onClick: onRecordExpense,
      variant: 'danger',
    },
    {
      id: 'contact',
      label: 'Contact nou',
      description: 'Adaugă un client sau furnizor',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      onClick: onAddContact,
    },
    {
      id: 'report',
      label: 'Generează raport',
      description: 'Rapoarte financiare',
      icon: (
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: onGenerateReport,
      variant: 'success',
    },
  ];

  return (
    <QuickActions
      actions={actions}
      layout="grid"
      size="lg"
      showShortcuts={false}
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type QuickAction as QuickActionItem,
  type FloatingQuickActionsProps as FloatingActionsProps,
  type CommandPaletteProps as CommandDialogProps,
  type InvoiceQuickActionsProps as InvoiceActionsProps,
  type DashboardQuickActionsProps as DashboardActionsProps,
};
