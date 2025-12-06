'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
    isPositiveGood?: boolean;
  };
  subtitle?: string;
  loading?: boolean;
  href?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  loading,
  href,
  className = '',
}: StatCardProps) {
  const trendIsPositive = trend && trend.value > 0;
  const trendIsNegative = trend && trend.value < 0;
  const trendIsGood = trend?.isPositiveGood !== false ? trendIsPositive : trendIsNegative;

  const content = (
    <div
      className={`
        bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700
        ${href ? 'hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        {icon && (
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            {icon}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            {value}
          </motion.p>

          {(trend || subtitle) && (
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <span
                  className={`
                    inline-flex items-center gap-1 text-sm font-medium
                    ${trendIsGood
                      ? 'text-green-600 dark:text-green-400'
                      : trendIsPositive || trendIsNegative
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {trendIsPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : trendIsNegative ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  {Math.abs(trend.value)}%
                  {trend.label && (
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {trend.label}
                    </span>
                  )}
                </span>
              )}
              {subtitle && !trend && (
                <span className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}

// Stats Grid
interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className = '' }: StatsGridProps) {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${colClasses[columns]} ${className}`}>
      {children}
    </div>
  );
}

// Mini Stat (inline)
interface MiniStatProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number;
  className?: string;
}

export function MiniStat({ label, value, icon, trend, className = '' }: MiniStatProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {icon && (
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">{value}</span>
          {trend !== undefined && (
            <span
              className={`
                text-xs font-medium
                ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}
              `}
            >
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress Stat
interface ProgressStatProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: 'primary' | 'green' | 'yellow' | 'red' | 'blue';
  showPercentage?: boolean;
  className?: string;
}

const progressColors = {
  primary: 'bg-primary',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};

export function ProgressStat({
  label,
  value,
  max = 100,
  unit,
  color = 'primary',
  showPercentage = true,
  className = '',
}: ProgressStatProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {value}{unit && ` ${unit}`}
          {showPercentage && ` (${Math.round(percentage)}%)`}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${progressColors[color]}`}
        />
      </div>
    </div>
  );
}

// Comparison Stat
interface ComparisonStatProps {
  label: string;
  current: number;
  previous: number;
  format?: (value: number) => string;
  className?: string;
}

export function ComparisonStat({
  label,
  current,
  previous,
  format = (v) => v.toString(),
  className = '',
}: ComparisonStatProps) {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{format(current)}</p>
          <p className="text-xs text-gray-500">Curent</p>
        </div>
        <div className="text-right">
          <p className="text-lg text-gray-500 dark:text-gray-400">{format(previous)}</p>
          <p className="text-xs text-gray-500">Anterior</p>
        </div>
        <div
          className={`
            ml-auto px-2 py-1 rounded-full text-xs font-medium
            ${isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : isNegative
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
            }
          `}
        >
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

// KPI Card
interface KPICardProps {
  title: string;
  value: string | number;
  target?: number;
  unit?: string;
  status?: 'on-track' | 'at-risk' | 'off-track';
  description?: string;
  className?: string;
}

const kpiStatusStyles = {
  'on-track': {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Pe drum bun',
  },
  'at-risk': {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    label: 'La risc',
  },
  'off-track': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'În afara țintei',
  },
};

export function KPICard({
  title,
  value,
  target,
  unit,
  status,
  description,
  className = '',
}: KPICardProps) {
  const statusStyle = status ? kpiStatusStyles[status] : null;
  const percentage = target && typeof value === 'number' ? (value / target) * 100 : null;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        {statusStyle && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        )}
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
        {unit && <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">{unit}</span>}
        {target && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            / {target} {unit}
          </span>
        )}
      </div>

      {percentage !== null && (
        <div className="mb-3">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${statusStyle?.bg.replace('bg-', 'bg-').replace('/30', '') || 'bg-primary'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
}

// Metric Highlight
interface MetricHighlightProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

const metricVariants = {
  default: 'border-gray-200 dark:border-gray-700',
  success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
  warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
  error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
};

export function MetricHighlight({
  label,
  value,
  change,
  icon,
  variant = 'default',
  className = '',
}: MetricHighlightProps) {
  return (
    <div
      className={`
        flex items-center gap-4 p-4 rounded-xl border
        ${metricVariants[variant]}
        ${className}
      `}
    >
      {icon && (
        <div className="p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      {change && (
        <div className="text-right">
          <div
            className={`
              flex items-center gap-1 text-sm font-medium
              ${change.value >= 0 ? 'text-green-600' : 'text-red-600'}
            `}
          >
            {change.value >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(change.value)}%
          </div>
          <p className="text-xs text-gray-500">{change.period}</p>
        </div>
      )}
    </div>
  );
}

// Donut Chart (simple CSS-based)
interface DonutChartProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function DonutChart({
  value,
  max = 100,
  size = 120,
  strokeWidth = 12,
  color = 'var(--color-primary, #3b82f6)',
  label,
  sublabel,
  className = '',
}: DonutChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{label}</span>
        )}
        {sublabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

// Bar Chart (simple CSS-based)
interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  maxValue?: number;
  showValues?: boolean;
  horizontal?: boolean;
  height?: number;
  className?: string;
}

export function BarChart({
  data,
  maxValue,
  showValues = true,
  horizontal = false,
  height = 200,
  className = '',
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  if (horizontal) {
    return (
      <div className={`space-y-3 ${className}`}>
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
              {showValues && (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.value}
                </span>
              )}
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: item.color || 'var(--color-primary, #3b82f6)' }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${className}`} style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(item.value / max) * 100}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="w-full rounded-t-md"
            style={{ backgroundColor: item.color || 'var(--color-primary, #3b82f6)' }}
          />
          {showValues && (
            <span className="text-xs text-gray-500 mt-1">{item.value}</span>
          )}
          <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Legend
interface LegendItem {
  label: string;
  color: string;
  value?: string | number;
}

interface LegendProps {
  items: LegendItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Legend({ items, orientation = 'horizontal', className = '' }: LegendProps) {
  return (
    <div
      className={`
        flex gap-4
        ${orientation === 'vertical' ? 'flex-col' : 'flex-wrap'}
        ${className}
      `}
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Sparkline (mini line chart)
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  color = 'var(--color-primary, #3b82f6)',
  fillOpacity = 0.2,
  className = '',
}: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className={className}>
      {/* Fill */}
      <path d={fillD} fill={color} fillOpacity={fillOpacity} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// Trend Indicator
interface TrendIndicatorProps {
  value: number;
  period?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const trendSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function TrendIndicator({
  value,
  period,
  size = 'md',
  showIcon = true,
  className = '',
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium
        ${trendSizes[size]}
        ${isPositive
          ? 'text-green-600 dark:text-green-400'
          : isNegative
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-500 dark:text-gray-400'
        }
        ${className}
      `}
    >
      {showIcon && (
        isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : isNegative ? (
          <TrendingDown className="w-4 h-4" />
        ) : (
          <Minus className="w-4 h-4" />
        )
      )}
      {isPositive ? '+' : ''}{value}%
      {period && (
        <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
          {period}
        </span>
      )}
    </span>
  );
}
