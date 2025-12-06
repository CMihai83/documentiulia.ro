'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Percent,
  Zap,
  Award,
  Star,
  Flame,
  Calendar,
  Timer,
  CircleDollarSign,
  Receipt,
  FileText,
  Wallet,
} from 'lucide-react'

// Types
export type MetricTrend = 'up' | 'down' | 'stable'
export type MetricStatus = 'excellent' | 'good' | 'warning' | 'critical'
export type MetricPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'
export type MetricCategory = 'financial' | 'sales' | 'operations' | 'customers' | 'efficiency'

export interface KPIMetric {
  id: string
  name: string
  value: number
  previousValue?: number
  target?: number
  unit?: string
  prefix?: string
  suffix?: string
  trend: MetricTrend
  trendValue?: number
  status: MetricStatus
  category: MetricCategory
  description?: string
  sparklineData?: number[]
  icon?: React.ReactNode
}

export interface MetricComparison {
  current: number
  previous: number
  target?: number
  periodLabel: string
}

export interface PerformanceGoal {
  id: string
  name: string
  current: number
  target: number
  unit?: string
  deadline?: Date
  status: 'on_track' | 'at_risk' | 'behind' | 'completed'
}

export interface PerformanceMetricsWidgetProps {
  metrics: KPIMetric[]
  period?: MetricPeriod
  goals?: PerformanceGoal[]
  currency?: string
  variant?: 'compact' | 'standard' | 'detailed' | 'full'
  showSparklines?: boolean
  showGoals?: boolean
  showComparison?: boolean
  columns?: 2 | 3 | 4
  onRefresh?: () => void
  onViewDetails?: () => void
  onMetricClick?: (metricId: string) => void
  onPeriodChange?: (period: MetricPeriod) => void
  isLoading?: boolean
  className?: string
}

// Period labels in Romanian
const periodLabels: Record<MetricPeriod, string> = {
  day: 'Azi',
  week: 'Săptămâna',
  month: 'Luna',
  quarter: 'Trimestrul',
  year: 'Anul',
}

// Status config
const statusConfig: Record<MetricStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  excellent: {
    label: 'Excelent',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <Star className="h-4 w-4" />,
  },
  good: {
    label: 'Bun',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  warning: {
    label: 'Atenție',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  critical: {
    label: 'Critic',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <Flame className="h-4 w-4" />,
  },
}

// Category config
const categoryConfig: Record<MetricCategory, { label: string; icon: React.ReactNode; color: string }> = {
  financial: {
    label: 'Financiar',
    icon: <CircleDollarSign className="h-4 w-4" />,
    color: 'bg-green-500',
  },
  sales: {
    label: 'Vânzări',
    icon: <ShoppingCart className="h-4 w-4" />,
    color: 'bg-blue-500',
  },
  operations: {
    label: 'Operațiuni',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-purple-500',
  },
  customers: {
    label: 'Clienți',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-orange-500',
  },
  efficiency: {
    label: 'Eficiență',
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-cyan-500',
  },
}

// Goal status config
const goalStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  on_track: {
    label: 'Pe drum bun',
    color: 'text-green-600 dark:text-green-400',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  at_risk: {
    label: 'La risc',
    color: 'text-yellow-600 dark:text-yellow-400',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  behind: {
    label: 'În urmă',
    color: 'text-red-600 dark:text-red-400',
    icon: <TrendingDown className="h-4 w-4" />,
  },
  completed: {
    label: 'Completat',
    color: 'text-green-600 dark:text-green-400',
    icon: <Award className="h-4 w-4" />,
  },
}

// Format value
function formatValue(value: number, prefix?: string, suffix?: string, unit?: string): string {
  let formatted: string

  if (Math.abs(value) >= 1000000) {
    formatted = (value / 1000000).toFixed(1) + 'M'
  } else if (Math.abs(value) >= 1000) {
    formatted = (value / 1000).toFixed(1) + 'K'
  } else if (Number.isInteger(value)) {
    formatted = value.toString()
  } else {
    formatted = value.toFixed(2)
  }

  return `${prefix || ''}${formatted}${suffix || unit || ''}`
}

// Format percentage
function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

// Calculate change
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

// Mini Sparkline
export function Sparkline({
  data,
  width = 60,
  height = 24,
  trend,
}: {
  data: number[]
  width?: number
  height?: number
  trend: MetricTrend
}) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4)
    return `${x},${y}`
  }).join(' ')

  const strokeColor = trend === 'up' ? 'stroke-green-500' : trend === 'down' ? 'stroke-red-500' : 'stroke-gray-400'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        className={cn(strokeColor)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// KPI Card
export function KPICard({
  metric,
  showSparkline = true,
  onClick,
  compact = false,
}: {
  metric: KPIMetric
  showSparkline?: boolean
  onClick?: () => void
  compact?: boolean
}) {
  const status = statusConfig[metric.status]
  const category = categoryConfig[metric.category]
  const change = metric.previousValue !== undefined
    ? calculateChange(metric.value, metric.previousValue)
    : metric.trendValue

  const trendIcon = metric.trend === 'up'
    ? <ArrowUpRight className="h-4 w-4" />
    : metric.trend === 'down'
      ? <ArrowDownRight className="h-4 w-4" />
      : <Minus className="h-4 w-4" />

  const trendColor = metric.trend === 'up'
    ? 'text-green-600 dark:text-green-400'
    : metric.trend === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground'

  // Target progress
  const targetProgress = metric.target
    ? Math.min((metric.value / metric.target) * 100, 100)
    : undefined

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left w-full"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground truncate">{metric.name}</span>
          {metric.icon || category.icon}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">
            {formatValue(metric.value, metric.prefix, metric.suffix, metric.unit)}
          </span>
          {change !== undefined && (
            <span className={cn('flex items-center gap-0.5 text-xs', trendColor)}>
              {trendIcon}
              {formatPercentage(change)}
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-xl border bg-card hover:shadow-md transition-all text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg text-white', category.color)}>
            {metric.icon || category.icon}
          </div>
          <div>
            <div className="text-sm font-medium">{metric.name}</div>
            <div className="text-xs text-muted-foreground">{category.label}</div>
          </div>
        </div>
        <div className={cn('p-1 rounded-full', status.bgColor, status.color)}>
          {status.icon}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold">
            {formatValue(metric.value, metric.prefix, metric.suffix, metric.unit)}
          </div>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm mt-1', trendColor)}>
              {trendIcon}
              <span>{formatPercentage(change)}</span>
              <span className="text-muted-foreground text-xs">vs. per. ant.</span>
            </div>
          )}
        </div>
        {showSparkline && metric.sparklineData && (
          <Sparkline data={metric.sparklineData} trend={metric.trend} />
        )}
      </div>

      {targetProgress !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Țintă</span>
            <span className="font-medium">{targetProgress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${targetProgress}%` }}
              transition={{ duration: 1 }}
              className={cn(
                'h-full rounded-full',
                targetProgress >= 100 ? 'bg-green-500' : targetProgress >= 75 ? 'bg-blue-500' : 'bg-yellow-500'
              )}
            />
          </div>
        </div>
      )}

      {metric.description && (
        <div className="mt-2 text-xs text-muted-foreground">
          {metric.description}
        </div>
      )}
    </motion.button>
  )
}

// Goal Progress Card
export function GoalProgressCard({
  goal,
}: {
  goal: PerformanceGoal
}) {
  const status = goalStatusConfig[goal.status]
  const progress = Math.min((goal.current / goal.target) * 100, 100)
  const remaining = goal.target - goal.current

  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <span className="font-medium">{goal.name}</span>
        </div>
        <div className={cn('flex items-center gap-1 text-sm', status.color)}>
          {status.icon}
          <span>{status.label}</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-end justify-between mb-1">
          <span className="text-2xl font-bold">
            {goal.current.toLocaleString()}{goal.unit}
          </span>
          <span className="text-sm text-muted-foreground">
            / {goal.target.toLocaleString()}{goal.unit}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1 }}
            className={cn(
              'h-full rounded-full',
              goal.status === 'completed' || progress >= 100
                ? 'bg-green-500'
                : goal.status === 'on_track'
                  ? 'bg-blue-500'
                  : goal.status === 'at_risk'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {progress.toFixed(0)}% completat
        </span>
        {goal.deadline && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {goal.deadline.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {remaining > 0 && goal.status !== 'completed' && (
        <div className="mt-2 text-xs text-muted-foreground">
          Mai sunt de realizat: {remaining.toLocaleString()}{goal.unit}
        </div>
      )}
    </div>
  )
}

// Period Selector
export function MetricPeriodSelector({
  selected,
  onChange,
}: {
  selected: MetricPeriod
  onChange: (period: MetricPeriod) => void
}) {
  const periods: MetricPeriod[] = ['day', 'week', 'month', 'quarter', 'year']

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            selected === period
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {periodLabels[period]}
        </button>
      ))}
    </div>
  )
}

// Summary Stats Bar
export function MetricsSummaryBar({
  metrics,
}: {
  metrics: KPIMetric[]
}) {
  const statusCounts = {
    excellent: metrics.filter(m => m.status === 'excellent').length,
    good: metrics.filter(m => m.status === 'good').length,
    warning: metrics.filter(m => m.status === 'warning').length,
    critical: metrics.filter(m => m.status === 'critical').length,
  }

  const upTrend = metrics.filter(m => m.trend === 'up').length
  const downTrend = metrics.filter(m => m.trend === 'down').length

  return (
    <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">{statusCounts.excellent} excelent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-muted-foreground">{statusCounts.good} bun</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-muted-foreground">{statusCounts.warning} atenție</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-muted-foreground">{statusCounts.critical} critic</span>
        </div>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs">{upTrend} în creștere</span>
        </div>
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs">{downTrend} în scădere</span>
        </div>
      </div>
    </div>
  )
}

// Main Widget
export function PerformanceMetricsWidget({
  metrics,
  period = 'month',
  goals = [],
  currency = 'RON',
  variant = 'standard',
  showSparklines = true,
  showGoals = true,
  showComparison = false,
  columns = 3,
  onRefresh,
  onViewDetails,
  onMetricClick,
  onPeriodChange,
  isLoading = false,
  className,
}: PerformanceMetricsWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<MetricPeriod>(period)
  const [hideValues, setHideValues] = React.useState(false)

  const handlePeriodChange = (newPeriod: MetricPeriod) => {
    setSelectedPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-4 rounded-xl border bg-card shadow-sm',
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">Performanță</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {metrics.length} KPIs
          </span>
        </div>
        <div className={cn('grid gap-2', gridCols[2])}>
          {metrics.slice(0, 4).map((metric) => (
            <KPICard
              key={metric.id}
              metric={metric}
              compact
              onClick={onMetricClick ? () => onMetricClick(metric.id) : undefined}
            />
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border bg-card shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Indicatori de performanță</h3>
              <p className="text-xs text-muted-foreground">{periodLabels[selectedPeriod]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideValues(!hideValues)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {hideValues ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <RefreshCw className={cn(
                  'h-4 w-4 text-muted-foreground',
                  isLoading && 'animate-spin'
                )} />
              </button>
            )}
          </div>
        </div>

        {/* Period Selector */}
        {onPeriodChange && (
          <MetricPeriodSelector
            selected={selectedPeriod}
            onChange={handlePeriodChange}
          />
        )}
      </div>

      {/* Summary Bar */}
      {(variant === 'detailed' || variant === 'full') && (
        <div className="p-4 border-b">
          <MetricsSummaryBar metrics={metrics} />
        </div>
      )}

      {/* Metrics Grid */}
      <div className="p-4">
        <div className={cn('grid gap-4', gridCols[columns])}>
          {metrics.map((metric) => (
            <KPICard
              key={metric.id}
              metric={metric}
              showSparkline={showSparklines}
              onClick={onMetricClick ? () => onMetricClick(metric.id) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Goals Section */}
      {showGoals && goals.length > 0 && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Obiective active</span>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.slice(0, 4).map((goal) => (
              <GoalProgressCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {onViewDetails && (
        <div className="p-4 bg-muted/30 border-t">
          <button
            onClick={onViewDetails}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Raport complet performanță
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Quick KPI Display
export function QuickKPIDisplay({
  metrics,
  className,
}: {
  metrics: KPIMetric[]
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-6 overflow-x-auto', className)}>
      {metrics.map((metric) => {
        const trendColor = metric.trend === 'up'
          ? 'text-green-600'
          : metric.trend === 'down'
            ? 'text-red-600'
            : 'text-muted-foreground'

        return (
          <div key={metric.id} className="flex items-center gap-3 min-w-max">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{metric.name}</div>
              <div className="text-lg font-bold">
                {formatValue(metric.value, metric.prefix, metric.suffix, metric.unit)}
              </div>
              {metric.trendValue !== undefined && (
                <div className={cn('text-xs flex items-center justify-center gap-1', trendColor)}>
                  {metric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPercentage(metric.trendValue)}
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-border" />
          </div>
        )
      })}
    </div>
  )
}

// KPI Comparison Card
export function KPIComparisonCard({
  name,
  current,
  previous,
  target,
  unit = '',
  className,
}: {
  name: string
  current: number
  previous: number
  target?: number
  unit?: string
  className?: string
}) {
  const change = calculateChange(current, previous)
  const isPositive = change >= 0

  return (
    <div className={cn('p-4 rounded-xl border bg-card', className)}>
      <div className="text-sm text-muted-foreground mb-2">{name}</div>
      <div className="flex items-end justify-between mb-3">
        <div className="text-2xl font-bold">
          {current.toLocaleString()}{unit}
        </div>
        <div className={cn(
          'flex items-center gap-1 text-sm',
          isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {formatPercentage(change)}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Anterior: {previous.toLocaleString()}{unit}</span>
        {target && <span>Țintă: {target.toLocaleString()}{unit}</span>}
      </div>
    </div>
  )
}

export default PerformanceMetricsWidget
