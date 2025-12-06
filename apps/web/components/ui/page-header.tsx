'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Page Header Component
// ============================================================================

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  tabs?: React.ReactNode;
  backButton?: {
    label?: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon,
  badge,
  actions,
  breadcrumbs,
  tabs,
  backButton,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && <div className="text-sm">{breadcrumbs}</div>}

      {/* Back Button */}
      {backButton && (
        <motion.button
          type="button"
          onClick={backButton.onClick}
          whileHover={{ x: -2 }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backButton.label || 'Inapoi'}
        </motion.button>
      )}

      {/* Main Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Icon */}
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
          )}

          <div className="space-y-1">
            {/* Title with Badge */}
            <div className="flex items-center gap-3">
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                {title}
              </motion.h1>
              {badge}
            </div>

            {/* Description */}
            {description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground"
              >
                {description}
              </motion.p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-2"
          >
            {actions}
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      {tabs && <div className="border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6">{tabs}</div>}

      {/* Additional Content */}
      {children}
    </div>
  );
}

// ============================================================================
// Simple Page Header
// ============================================================================

interface SimplePageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SimplePageHeader({
  title,
  description,
  action,
  className,
}: SimplePageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ============================================================================
// Section Header
// ============================================================================

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  collapsible = false,
  defaultCollapsed = false,
  onCollapsedChange,
  children,
  className,
}: SectionHeaderProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapsedChange?.(newState);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {collapsible && (
            <motion.button
              type="button"
              onClick={toggleCollapse}
              animate={{ rotate: isCollapsed ? -90 : 0 }}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
          )}
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>

      {/* Collapsible Content */}
      {collapsible ? (
        <motion.div
          initial={false}
          animate={{ height: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </div>
  );
}

// ============================================================================
// Card Header
// ============================================================================

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ============================================================================
// Modal Header
// ============================================================================

interface ModalHeaderProps {
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

export function ModalHeader({
  title,
  description,
  onClose,
  className,
}: ModalHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 pb-4 border-b border-border', className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Stats Header
// ============================================================================

interface StatItem {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
}

interface StatsHeaderProps {
  title: string;
  description?: string;
  stats: StatItem[];
  action?: React.ReactNode;
  className?: string;
}

export function StatsHeader({
  title,
  description,
  stats,
  action,
  className,
}: StatsHeaderProps) {
  const changeColors = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {stat.icon && <span className="text-muted-foreground">{stat.icon}</span>}
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              {stat.change && (
                <span className={cn('text-sm', changeColors[stat.change.type])}>
                  {stat.change.type === 'increase' ? '+' : stat.change.type === 'decrease' ? '-' : ''}
                  {Math.abs(stat.change.value)}%
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific Headers
// ============================================================================

// Invoice Page Header
interface InvoiceHeaderProps {
  invoiceNumber: string;
  status: React.ReactNode;
  client: string;
  date: string;
  dueDate?: string;
  amount: string;
  onEdit?: () => void;
  onPrint?: () => void;
  onSend?: () => void;
  onDelete?: () => void;
  backHref?: string;
  onBack?: () => void;
}

export function InvoiceHeader({
  invoiceNumber,
  status,
  client,
  date,
  dueDate,
  amount,
  onEdit,
  onPrint,
  onSend,
  onDelete,
  onBack,
}: InvoiceHeaderProps) {
  return (
    <PageHeader
      title={invoiceNumber}
      description={client}
      badge={status}
      backButton={onBack ? { onClick: onBack, label: 'Inapoi la facturi' } : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editeaza
            </button>
          )}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Printeaza
            </button>
          )}
          {onSend && (
            <button
              type="button"
              onClick={onSend}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Trimite
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Data emiterii:</span>
          <span className="ml-2 font-medium">{date}</span>
        </div>
        {dueDate && (
          <div>
            <span className="text-muted-foreground">Scadenta:</span>
            <span className="ml-2 font-medium">{dueDate}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Total:</span>
          <span className="ml-2 font-bold text-lg">{amount}</span>
        </div>
      </div>
    </PageHeader>
  );
}

// Client Page Header
interface ClientHeaderProps {
  name: string;
  cui?: string;
  email?: string;
  phone?: string;
  status: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

export function ClientHeader({
  name,
  cui,
  email,
  phone,
  status,
  onEdit,
  onDelete,
  onBack,
}: ClientHeaderProps) {
  return (
    <PageHeader
      title={name}
      badge={status}
      backButton={onBack ? { onClick: onBack, label: 'Inapoi la clienti' } : undefined}
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      }
      actions={
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editeaza
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap gap-4 text-sm">
        {cui && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">CUI:</span>
            <span className="font-mono">{cui}</span>
          </div>
        )}
        {email && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{phone}</span>
          </div>
        )}
      </div>
    </PageHeader>
  );
}

// Reports Page Header
interface ReportsHeaderProps {
  title: string;
  period: string;
  onExport?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
  periodSelector?: React.ReactNode;
}

export function ReportsHeader({
  title,
  period,
  onExport,
  onPrint,
  onRefresh,
  periodSelector,
}: ReportsHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={`Perioada: ${period}`}
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {periodSelector}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 border border-input rounded-md hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Printeaza
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporta
            </button>
          )}
        </div>
      }
    />
  );
}
