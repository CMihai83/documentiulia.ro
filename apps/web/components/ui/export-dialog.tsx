'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'xml' | 'saf-t';
export type ExportScope = 'current' | 'selected' | 'filtered' | 'all';

export interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
  premium?: boolean;
}

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void | Promise<void>;
  title?: string;
  description?: string;
  formats?: ExportFormat[];
  scope?: ExportScope;
  selectedCount?: number;
  filteredCount?: number;
  totalCount?: number;
  loading?: boolean;
  className?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  includeHeaders?: boolean;
  dateRange?: { from: Date; to: Date };
  columns?: string[];
}

// ============================================================================
// Format Configuration
// ============================================================================

const formatConfig: Record<ExportFormat, Omit<ExportOption, 'format'>> = {
  pdf: {
    label: 'PDF',
    description: 'Document portabil, ideal pentru tipărire',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  excel: {
    label: 'Excel',
    description: 'Format .xlsx pentru Microsoft Excel',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  csv: {
    label: 'CSV',
    description: 'Format text simplu, compatibil universal',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  json: {
    label: 'JSON',
    description: 'Format structurat pentru dezvoltatori',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  xml: {
    label: 'XML',
    description: 'Format XML pentru integrări',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  'saf-t': {
    label: 'SAF-T',
    description: 'Standard Audit File pentru ANAF',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    premium: true,
  },
};

// ============================================================================
// Export Dialog Component
// ============================================================================

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  title = 'Exportă date',
  description = 'Alegeți formatul și opțiunile de export',
  formats = ['pdf', 'excel', 'csv'],
  scope: initialScope = 'all',
  selectedCount = 0,
  filteredCount = 0,
  totalCount = 0,
  loading = false,
  className,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>(formats[0]);
  const [selectedScope, setSelectedScope] = React.useState<ExportScope>(initialScope);
  const [includeHeaders, setIncludeHeaders] = React.useState(true);

  const handleExport = async () => {
    await onExport({
      format: selectedFormat,
      scope: selectedScope,
      includeHeaders,
    });
  };

  const getScopeLabel = (scope: ExportScope): string => {
    switch (scope) {
      case 'current':
        return 'Pagina curentă';
      case 'selected':
        return `Selectate (${selectedCount})`;
      case 'filtered':
        return `Filtrate (${filteredCount})`;
      case 'all':
        return `Toate (${totalCount})`;
      default:
        return scope;
    }
  };

  const getScopeCount = (scope: ExportScope): number => {
    switch (scope) {
      case 'selected':
        return selectedCount;
      case 'filtered':
        return filteredCount;
      case 'all':
        return totalCount;
      default:
        return 0;
    }
  };

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-full max-w-lg bg-background rounded-lg shadow-xl',
              className
            )}
          >
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Format Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Format export</label>
                <div className="grid grid-cols-3 gap-2">
                  {formats.map((format) => {
                    const config = formatConfig[format];
                    return (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format)}
                        disabled={config.disabled}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all text-left',
                          selectedFormat === format
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50',
                          config.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-primary">{config.icon}</span>
                          <span className="font-medium text-sm">{config.label}</span>
                          {config.premium && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Ce să exportăm</label>
                <div className="space-y-2">
                  {(['selected', 'filtered', 'all'] as ExportScope[]).map((scope) => {
                    const count = getScopeCount(scope);
                    const isDisabled = scope === 'selected' && selectedCount === 0;

                    return (
                      <label
                        key={scope}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          selectedScope === scope
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <input
                          type="radio"
                          name="scope"
                          value={scope}
                          checked={selectedScope === scope}
                          onChange={() => setSelectedScope(scope)}
                          disabled={isDisabled}
                          className="w-4 h-4 text-primary"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm">{getScopeLabel(scope)}</span>
                          {count > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {count} înregistrări
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              {(selectedFormat === 'csv' || selectedFormat === 'excel') && (
                <div>
                  <label className="text-sm font-medium mb-3 block">Opțiuni</label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-all">
                    <input
                      type="checkbox"
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <div>
                      <span className="font-medium text-sm">Include anteturile coloanelor</span>
                      <p className="text-xs text-muted-foreground">
                        Prima linie va conține denumirile coloanelor
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-muted/30 flex items-center justify-end gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className={cn(
                  'px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md',
                  'hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Exportă {formatConfig[selectedFormat].label}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Quick Export Button Component
// ============================================================================

export interface QuickExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  formats?: ExportFormat[];
  loading?: boolean;
  className?: string;
}

export function QuickExportButton({
  onExport,
  formats = ['pdf', 'excel', 'csv'],
  loading = false,
  className,
}: QuickExportButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-medium',
          'border rounded-md hover:bg-muted transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        Exportă
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-background border rounded-lg shadow-lg z-10 py-1"
          >
            {formats.map((format) => {
              const config = formatConfig[format];
              return (
                <button
                  key={format}
                  onClick={() => {
                    setIsOpen(false);
                    onExport(format);
                  }}
                  disabled={config.disabled}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors',
                    config.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-muted-foreground">{config.icon}</span>
                  <span>{config.label}</span>
                  {config.premium && (
                    <span className="ml-auto px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Export Dialog
// ============================================================================

export interface InvoiceExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions & { includeAttachments?: boolean }) => void | Promise<void>;
  selectedCount?: number;
  filteredCount?: number;
  totalCount?: number;
  loading?: boolean;
  className?: string;
}

export function InvoiceExportDialog({
  open,
  onOpenChange,
  onExport,
  selectedCount = 0,
  filteredCount = 0,
  totalCount = 0,
  loading = false,
  className,
}: InvoiceExportDialogProps) {
  const [includeAttachments, setIncludeAttachments] = React.useState(false);

  const handleExport = async (options: ExportOptions) => {
    await onExport({
      ...options,
      includeAttachments,
    });
  };

  return (
    <ExportDialog
      open={open}
      onOpenChange={onOpenChange}
      onExport={handleExport}
      title="Exportă facturi"
      description="Exportați facturile în formatul dorit"
      formats={['pdf', 'excel', 'csv', 'xml', 'saf-t']}
      selectedCount={selectedCount}
      filteredCount={filteredCount}
      totalCount={totalCount}
      loading={loading}
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Report Export Dialog
// ============================================================================

export interface ReportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions & { reportType: string }) => void | Promise<void>;
  reportType: string;
  reportName: string;
  loading?: boolean;
  className?: string;
}

export function ReportExportDialog({
  open,
  onOpenChange,
  onExport,
  reportType,
  reportName,
  loading = false,
  className,
}: ReportExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('pdf');

  const handleExport = async () => {
    await onExport({
      format: selectedFormat,
      scope: 'all',
      reportType,
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-full max-w-md bg-background rounded-lg shadow-xl',
              className
            )}
          >
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Exportă raport</h2>
              <p className="text-sm text-muted-foreground mt-1">{reportName}</p>
            </div>

            <div className="p-6">
              <label className="text-sm font-medium mb-3 block">Format export</label>
              <div className="grid grid-cols-2 gap-2">
                {(['pdf', 'excel'] as ExportFormat[]).map((format) => {
                  const config = formatConfig[format];
                  return (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all text-center',
                        selectedFormat === format
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex justify-center mb-2 text-primary">
                        {config.icon}
                      </div>
                      <span className="font-medium text-sm">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t bg-muted/30 flex items-center justify-end gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className={cn(
                  'px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md',
                  'hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Exportă
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type ExportOption as ExportFormatOption,
  type ExportOptions as ExportDialogOptions,
  type QuickExportButtonProps as QuickExportProps,
  type InvoiceExportDialogProps as InvoiceExportProps,
  type ReportExportDialogProps as ReportExportProps,
};
