'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ReportType =
  | 'profit_loss'
  | 'balance_sheet'
  | 'cash_flow'
  | 'vat'
  | 'aging'
  | 'sales'
  | 'expenses'
  | 'tax'
  | 'custom';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  description?: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  status: 'draft' | 'generated' | 'scheduled';
  generatedAt?: string;
  fileSize?: number;
  downloadUrl?: string;
  isFavorite?: boolean;
  isScheduled?: boolean;
  scheduleFrequency?: ReportPeriod;
}

export interface ReportCardProps {
  report: Report;
  variant?: 'default' | 'compact' | 'detailed';
  onView?: () => void;
  onDownload?: () => void;
  onSchedule?: () => void;
  onFavorite?: () => void;
  onDelete?: () => void;
  className?: string;
}

export interface ReportListProps {
  reports: Report[];
  variant?: 'default' | 'compact' | 'detailed';
  onReportClick?: (report: Report) => void;
  emptyMessage?: string;
  className?: string;
}

export interface ReportGeneratorProps {
  onGenerate: (options: ReportGeneratorOptions) => void;
  onCancel?: () => void;
  isGenerating?: boolean;
  className?: string;
}

export interface ReportGeneratorOptions {
  type: ReportType;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  format: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  compareWithPrevious?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const reportTypeConfig: Record<ReportType, { label: string; icon: React.ReactNode; color: string }> = {
  profit_loss: {
    label: 'Profit și Pierdere',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  balance_sheet: {
    label: 'Bilanț',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  cash_flow: {
    label: 'Flux de Numerar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  vat: {
    label: 'Decont TVA',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  aging: {
    label: 'Vechime Creanțe',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  sales: {
    label: 'Raport Vânzări',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  expenses: {
    label: 'Raport Cheltuieli',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
  tax: {
    label: 'Raport Fiscal',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  custom: {
    label: 'Raport Personalizat',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
};

const periodLabels: Record<ReportPeriod, string> = {
  daily: 'Zilnic',
  weekly: 'Săptămânal',
  monthly: 'Lunar',
  quarterly: 'Trimestrial',
  yearly: 'Anual',
  custom: 'Personalizat',
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// Report Card Component
// ============================================================================

export function ReportCard({
  report,
  variant = 'default',
  onView,
  onDownload,
  onSchedule,
  onFavorite,
  onDelete,
  className,
}: ReportCardProps) {
  const config = reportTypeConfig[report.type];

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onView}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all cursor-pointer',
          className
        )}
      >
        <div className={cn('w-10 h-10 flex items-center justify-center rounded-lg', config.color)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{report.title}</p>
          <p className="text-xs text-muted-foreground">{periodLabels[report.period]}</p>
        </div>
        {report.status === 'generated' && onDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
      </motion.div>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('p-5 rounded-xl border bg-card hover:shadow-md transition-all', className)}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={cn('w-12 h-12 flex items-center justify-center rounded-lg', config.color)}>
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{report.title}</h3>
              {report.isFavorite && (
                <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{config.label}</p>
          </div>
          <span
            className={cn(
              'px-2 py-1 text-xs rounded-full',
              report.status === 'generated'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : report.status === 'scheduled'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {report.status === 'generated' ? 'Generat' : report.status === 'scheduled' ? 'Programat' : 'Ciornă'}
          </span>
        </div>

        {/* Description */}
        {report.description && (
          <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">Perioadă: </span>
            <span className="font-medium">{periodLabels[report.period]}</span>
          </div>
          {report.startDate && report.endDate && (
            <div>
              <span className="text-muted-foreground">Interval: </span>
              <span className="font-medium">
                {formatDate(report.startDate)} - {formatDate(report.endDate)}
              </span>
            </div>
          )}
          {report.generatedAt && (
            <div>
              <span className="text-muted-foreground">Generat: </span>
              <span className="font-medium">{formatDate(report.generatedAt)}</span>
            </div>
          )}
          {report.fileSize && (
            <div>
              <span className="text-muted-foreground">Mărime: </span>
              <span className="font-medium">{formatFileSize(report.fileSize)}</span>
            </div>
          )}
        </div>

        {/* Scheduled Badge */}
        {report.isScheduled && report.scheduleFrequency && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-4">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Generat automat: {periodLabels[report.scheduleFrequency]}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          {onView && (
            <button
              onClick={onView}
              className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Vizualizează
            </button>
          )}
          {report.status === 'generated' && onDownload && (
            <button
              onClick={onDownload}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Descarcă"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
          {onSchedule && (
            <button
              onClick={onSchedule}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Programează"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          {onFavorite && (
            <button
              onClick={onFavorite}
              className={cn(
                'p-2 rounded-lg transition-colors',
                report.isFavorite ? 'text-yellow-500' : 'hover:bg-muted'
              )}
              title={report.isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'}
            >
              <svg className={cn('w-4 h-4', report.isFavorite && 'fill-current')} viewBox="0 0 24 24" stroke="currentColor">
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
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onView}
      className={cn(
        'p-4 rounded-lg border bg-card hover:shadow-sm transition-all cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 flex items-center justify-center rounded-lg', config.color)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{report.title}</h4>
            {report.isFavorite && (
              <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {config.label} • {periodLabels[report.period]}
          </p>
          {report.generatedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Generat: {formatDate(report.generatedAt)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Report List Component
// ============================================================================

export function ReportList({
  reports,
  variant = 'default',
  onReportClick,
  emptyMessage = 'Nu există rapoarte',
  className,
}: ReportListProps) {
  if (reports.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', variant === 'detailed' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1', className)}>
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          variant={variant}
          onView={onReportClick ? () => onReportClick(report) : undefined}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Report Generator Component
// ============================================================================

export function ReportGenerator({
  onGenerate,
  onCancel,
  isGenerating = false,
  className,
}: ReportGeneratorProps) {
  const [options, setOptions] = React.useState<ReportGeneratorOptions>({
    type: 'profit_loss',
    period: 'monthly',
    format: 'pdf',
    includeCharts: true,
    compareWithPrevious: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(options);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={cn('p-6 bg-card rounded-lg border space-y-6', className)}
    >
      <h3 className="text-lg font-semibold">Generare Raport</h3>

      {/* Report Type */}
      <div>
        <label className="block text-sm font-medium mb-3">Tip raport</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(reportTypeConfig) as [ReportType, typeof reportTypeConfig[ReportType]][]).map(([type, config]) => (
            <button
              key={type}
              type="button"
              onClick={() => setOptions({ ...options, type })}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                options.type === type
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <span className={cn('w-8 h-8 flex items-center justify-center rounded', config.color)}>
                {config.icon}
              </span>
              <span className="text-xs text-center">{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Perioadă</label>
          <select
            value={options.period}
            onChange={(e) => setOptions({ ...options, period: e.target.value as ReportPeriod })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            {(Object.entries(periodLabels) as [ReportPeriod, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <select
            value={options.format}
            onChange={(e) => setOptions({ ...options, format: e.target.value as 'pdf' | 'excel' | 'csv' })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range */}
      {options.period === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Data început</label>
            <input
              type="date"
              value={options.startDate || ''}
              onChange={(e) => setOptions({ ...options, startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Data sfârșit</label>
            <input
              type="date"
              value={options.endDate || ''}
              onChange={(e) => setOptions({ ...options, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            />
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={options.includeCharts}
            onChange={(e) => setOptions({ ...options, includeCharts: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Include grafice</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={options.compareWithPrevious}
            onChange={(e) => setOptions({ ...options, compareWithPrevious: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Compară cu perioada anterioară</span>
        </label>
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
          disabled={isGenerating}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generare...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generează raport
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}

// ============================================================================
// Quick Report Buttons Component
// ============================================================================

export interface QuickReportButtonsProps {
  onGenerate: (type: ReportType) => void;
  className?: string;
}

export function QuickReportButtons({ onGenerate, className }: QuickReportButtonsProps) {
  const quickReports: ReportType[] = ['profit_loss', 'vat', 'sales', 'expenses'];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {quickReports.map((type) => {
        const config = reportTypeConfig[type];
        return (
          <button
            key={type}
            onClick={() => onGenerate(type)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors',
            )}
          >
            <span className={cn('w-6 h-6 flex items-center justify-center rounded', config.color)}>
              {config.icon}
            </span>
            <span className="text-sm">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { reportTypeConfig, periodLabels, formatFileSize };
