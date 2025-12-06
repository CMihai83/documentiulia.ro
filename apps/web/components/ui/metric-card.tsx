'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type MetricTrend = 'up' | 'down' | 'neutral';
export type MetricSize = 'sm' | 'md' | 'lg';
export type MetricVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: MetricTrend;
  trendValue?: string | number;
  trendLabel?: string;
  icon?: React.ReactNode;
  size?: MetricSize;
  variant?: MetricVariant;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Size Configuration
// ============================================================================

const sizeConfig = {
  sm: {
    padding: 'p-4',
    title: 'text-xs',
    value: 'text-xl font-bold',
    subtitle: 'text-xs',
    icon: 'w-8 h-8',
    trend: 'text-xs',
  },
  md: {
    padding: 'p-5',
    title: 'text-sm',
    value: 'text-2xl font-bold',
    subtitle: 'text-sm',
    icon: 'w-10 h-10',
    trend: 'text-sm',
  },
  lg: {
    padding: 'p-6',
    title: 'text-base',
    value: 'text-3xl font-bold',
    subtitle: 'text-base',
    icon: 'w-12 h-12',
    trend: 'text-base',
  },
};

const variantConfig = {
  default: {
    bg: 'bg-card',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    border: 'border',
  },
  primary: {
    bg: 'bg-primary/5',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    border: 'border-primary/20',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
};

// ============================================================================
// Metric Card Component
// ============================================================================

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  trendLabel,
  icon,
  size = 'md',
  variant = 'default',
  loading = false,
  onClick,
  className,
}: MetricCardProps) {
  const sConfig = sizeConfig[size];
  const vConfig = variantConfig[variant];

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground',
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'rounded-lg border transition-shadow',
        sConfig.padding,
        vConfig.bg,
        vConfig.border,
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
    >
      {loading ? (
        <MetricCardSkeleton size={size} />
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p className={cn('text-muted-foreground mb-1', sConfig.title)}>
              {title}
            </p>

            {/* Value */}
            <p className={cn('tabular-nums', sConfig.value)}>
              {value}
            </p>

            {/* Subtitle or Trend */}
            {(subtitle || trend) && (
              <div className="flex items-center gap-2 mt-2">
                {trend && (
                  <span className={cn('flex items-center gap-1', sConfig.trend, trendColors[trend])}>
                    {trend === 'up' && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                    {trend === 'down' && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                    {trend === 'neutral' && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                      </svg>
                    )}
                    {trendValue}
                  </span>
                )}
                {trendLabel && (
                  <span className={cn('text-muted-foreground', sConfig.subtitle)}>
                    {trendLabel}
                  </span>
                )}
                {subtitle && !trend && (
                  <span className={cn('text-muted-foreground', sConfig.subtitle)}>
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Icon */}
          {icon && (
            <div className={cn('rounded-lg flex items-center justify-center', sConfig.icon, vConfig.iconBg, vConfig.iconColor)}>
              {icon}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Metric Card Skeleton
// ============================================================================

function MetricCardSkeleton({ size }: { size: MetricSize }) {
  const sConfig = sizeConfig[size];

  return (
    <div className="animate-pulse">
      <div className={cn('h-4 bg-muted rounded w-1/3 mb-2', sConfig.title)} />
      <div className={cn('h-8 bg-muted rounded w-2/3 mb-2', sConfig.value)} />
      <div className={cn('h-4 bg-muted rounded w-1/2', sConfig.subtitle)} />
    </div>
  );
}

// ============================================================================
// Metric Card Group Component
// ============================================================================

export interface MetricCardGroupProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export function MetricCardGroup({
  children,
  columns = 4,
  className,
}: MetricCardGroupProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Sparkline Metric Card Component
// ============================================================================

export interface SparklineMetricCardProps extends Omit<MetricCardProps, 'icon'> {
  data: number[];
  sparklineColor?: string;
}

export function SparklineMetricCard({
  data,
  sparklineColor = 'text-primary',
  ...props
}: SparklineMetricCardProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <MetricCard
      {...props}
      icon={
        <svg viewBox="0 0 100 100" className={cn('w-full h-full', sparklineColor)} preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      }
    />
  );
}

// ============================================================================
// Progress Metric Card Component
// ============================================================================

export interface ProgressMetricCardProps extends Omit<MetricCardProps, 'icon'> {
  progress: number;
  target?: number;
  showPercentage?: boolean;
}

export function ProgressMetricCard({
  progress,
  target = 100,
  showPercentage = true,
  ...props
}: ProgressMetricCardProps) {
  const percentage = Math.min((progress / target) * 100, 100);

  return (
    <MetricCard
      {...props}
      icon={
        <div className="relative w-full h-full">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              className="text-primary"
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold">{Math.round(percentage)}%</span>
            </div>
          )}
        </div>
      }
    />
  );
}

// ============================================================================
// Comparison Metric Card Component
// ============================================================================

export interface ComparisonMetricCardProps extends Omit<MetricCardProps, 'trend' | 'trendValue'> {
  currentValue: number;
  previousValue: number;
  formatValue?: (value: number) => string;
}

export function ComparisonMetricCard({
  currentValue,
  previousValue,
  formatValue = (v) => v.toString(),
  ...props
}: ComparisonMetricCardProps) {
  const diff = currentValue - previousValue;
  const percentChange = previousValue !== 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : 0;

  const trend: MetricTrend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

  return (
    <MetricCard
      {...props}
      value={formatValue(currentValue)}
      trend={trend}
      trendValue={`${Math.abs(percentChange).toFixed(1)}%`}
      trendLabel="față de perioada anterioară"
    />
  );
}

// ============================================================================
// Accounting-Specific: Revenue Metric Card
// ============================================================================

export interface RevenueMetricCardProps {
  revenue: number;
  previousRevenue?: number;
  currency?: string;
  period?: string;
  className?: string;
}

export function RevenueMetricCard({
  revenue,
  previousRevenue,
  currency = 'RON',
  period = 'luna curentă',
  className,
}: RevenueMetricCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const trend: MetricTrend = previousRevenue
    ? revenue > previousRevenue
      ? 'up'
      : revenue < previousRevenue
      ? 'down'
      : 'neutral'
    : 'neutral';

  const trendValue = previousRevenue
    ? `${Math.abs(((revenue - previousRevenue) / previousRevenue) * 100).toFixed(1)}%`
    : undefined;

  return (
    <MetricCard
      title="Venituri"
      value={formatCurrency(revenue)}
      subtitle={period}
      trend={trend}
      trendValue={trendValue}
      variant="success"
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Expenses Metric Card
// ============================================================================

export interface ExpensesMetricCardProps {
  expenses: number;
  previousExpenses?: number;
  currency?: string;
  period?: string;
  className?: string;
}

export function ExpensesMetricCard({
  expenses,
  previousExpenses,
  currency = 'RON',
  period = 'luna curentă',
  className,
}: ExpensesMetricCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // For expenses, down is good (fewer expenses)
  const trend: MetricTrend = previousExpenses
    ? expenses < previousExpenses
      ? 'down'
      : expenses > previousExpenses
      ? 'up'
      : 'neutral'
    : 'neutral';

  const trendValue = previousExpenses
    ? `${Math.abs(((expenses - previousExpenses) / previousExpenses) * 100).toFixed(1)}%`
    : undefined;

  return (
    <MetricCard
      title="Cheltuieli"
      value={formatCurrency(expenses)}
      subtitle={period}
      trend={trend}
      trendValue={trendValue}
      variant="danger"
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      }
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Invoices Count Metric Card
// ============================================================================

export interface InvoicesMetricCardProps {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  className?: string;
}

export function InvoicesMetricCard({
  total,
  paid,
  pending,
  overdue,
  className,
}: InvoicesMetricCardProps) {
  const paidPercentage = total > 0 ? (paid / total) * 100 : 0;

  return (
    <MetricCard
      title="Facturi"
      value={total}
      subtitle={`${paid} plătite • ${pending} în așteptare • ${overdue} restante`}
      variant={overdue > 0 ? 'warning' : 'primary'}
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Cash Flow Metric Card
// ============================================================================

export interface CashFlowMetricCardProps {
  inflow: number;
  outflow: number;
  net: number;
  currency?: string;
  className?: string;
}

export function CashFlowMetricCard({
  inflow,
  outflow,
  net,
  currency = 'RON',
  className,
}: CashFlowMetricCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <MetricCard
      title="Flux de numerar"
      value={formatCurrency(net)}
      trend={net > 0 ? 'up' : net < 0 ? 'down' : 'neutral'}
      subtitle={`+${formatCurrency(inflow)} / -${formatCurrency(Math.abs(outflow))}`}
      variant={net >= 0 ? 'success' : 'danger'}
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      }
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type MetricCardGroupProps as MetricGroupProps,
  type SparklineMetricCardProps as SparklineMetricProps,
  type ProgressMetricCardProps as ProgressMetricProps,
  type ComparisonMetricCardProps as ComparisonMetricProps,
  type RevenueMetricCardProps as RevenueCardProps,
  type ExpensesMetricCardProps as ExpensesCardProps,
  type InvoicesMetricCardProps as InvoicesCardProps,
  type CashFlowMetricCardProps as CashFlowCardProps,
};
