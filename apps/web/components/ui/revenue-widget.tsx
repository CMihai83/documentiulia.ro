'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Award,
  Star,
  ChevronRight,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal,
} from 'lucide-react'

// Types
export interface RevenueSource {
  id: string
  name: string
  amount: number
  percentage: number
  trend: number
  color?: string
  icon?: React.ReactNode
}

export interface RevenueByPeriod {
  period: string
  revenue: number
  target?: number
  invoiced: number
  collected: number
}

export interface TopClient {
  id: string
  name: string
  revenue: number
  invoiceCount: number
  trend: number
}

export interface TopProduct {
  id: string
  name: string
  revenue: number
  quantity: number
  trend: number
}

export interface RevenueWidgetProps {
  totalRevenue: number
  previousRevenue?: number
  target?: number
  currency?: string
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  sources?: RevenueSource[]
  periodData?: RevenueByPeriod[]
  topClients?: TopClient[]
  topProducts?: TopProduct[]
  invoicedAmount?: number
  collectedAmount?: number
  pendingAmount?: number
  variant?: 'compact' | 'standard' | 'detailed' | 'full'
  showChart?: boolean
  showSources?: boolean
  showTopClients?: boolean
  showTopProducts?: boolean
  onRefresh?: () => void
  onViewDetails?: () => void
  onPeriodChange?: (period: string) => void
  isLoading?: boolean
  className?: string
}

// Period labels in Romanian
const periodLabels: Record<string, string> = {
  day: 'Azi',
  week: 'Săptămâna aceasta',
  month: 'Luna aceasta',
  quarter: 'Trimestrul acesta',
  year: 'Anul acesta',
}

// Default source colors
const sourceColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
]

// Format currency
function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format percentage
function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

// Calculate change percentage
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

// Revenue Trend Indicator
export function RevenueTrendIndicator({
  value,
  size = 'md',
  showValue = true,
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
}) {
  const isPositive = value >= 0
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div className={cn(
      'flex items-center gap-1',
      sizeClasses[size],
      isPositive
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'
    )}>
      {isPositive ? (
        <TrendingUp className={iconSizes[size]} />
      ) : (
        <TrendingDown className={iconSizes[size]} />
      )}
      {showValue && <span>{formatPercentage(value)}</span>}
    </div>
  )
}

// Revenue Progress Bar
export function RevenueProgressBar({
  current,
  target,
  showLabels = true,
  size = 'md',
}: {
  current: number
  target: number
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const percentage = Math.min((current / target) * 100, 100)
  const isOverTarget = current >= target

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex items-center justify-between mb-1 text-xs">
          <span className="text-muted-foreground">
            {percentage.toFixed(0)}% din țintă
          </span>
          <span className={cn(
            'font-medium',
            isOverTarget ? 'text-green-600' : 'text-muted-foreground'
          )}>
            {isOverTarget && '🎯 '}Țintă atinsă
          </span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', heightClasses[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            isOverTarget
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : 'bg-gradient-to-r from-blue-500 to-primary'
          )}
        />
      </div>
    </div>
  )
}

// Revenue Source Item
export function RevenueSourceItem({
  source,
  currency = 'RON',
  showBar = true,
  maxPercentage = 100,
}: {
  source: RevenueSource
  currency?: string
  showBar?: boolean
  maxPercentage?: number
}) {
  const barWidth = (source.percentage / maxPercentage) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {source.icon && (
            <div className={cn('p-1.5 rounded', source.color || 'bg-muted')}>
              {source.icon}
            </div>
          )}
          <span className="text-sm font-medium">{source.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {formatCurrency(source.amount, currency)}
          </span>
          <RevenueTrendIndicator value={source.trend} size="sm" />
        </div>
      </div>
      {showBar && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={cn('h-full rounded-full', source.color || 'bg-primary')}
            />
          </div>
          <span className="text-xs text-muted-foreground w-10 text-right">
            {source.percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

// Mini Revenue Chart
export function RevenueMiniChart({
  data,
  height = 60,
  showTarget = true,
}: {
  data: RevenueByPeriod[]
  height?: number
  showTarget?: boolean
}) {
  if (!data || data.length === 0) return null

  const maxRevenue = Math.max(...data.map(d => Math.max(d.revenue, d.target || 0)))
  const barWidth = 100 / data.length

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Target line */}
        {showTarget && data[0]?.target && (
          <line
            x1="0"
            y1={height - (data[0].target / maxRevenue) * (height - 5)}
            x2="100"
            y2={height - (data[0].target / maxRevenue) * (height - 5)}
            className="stroke-primary/30"
            strokeWidth="1"
            strokeDasharray="4"
          />
        )}
        {/* Revenue bars */}
        {data.map((period, index) => {
          const barHeight = (period.revenue / maxRevenue) * (height - 5)
          const x = index * barWidth + barWidth * 0.2
          const width = barWidth * 0.6
          const isOverTarget = period.target && period.revenue >= period.target

          return (
            <rect
              key={index}
              x={x}
              y={height - barHeight}
              width={width}
              height={barHeight}
              className={cn(
                isOverTarget ? 'fill-green-500' : 'fill-primary'
              )}
              rx={2}
            />
          )
        })}
      </svg>
    </div>
  )
}

// Top Client Item
export function TopClientItem({
  client,
  rank,
  currency = 'RON',
}: {
  client: TopClient
  rank: number
  currency?: string
}) {
  const rankBadges: Record<number, { bg: string; text: string; icon?: React.ReactNode }> = {
    1: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: <Award className="h-3 w-3" /> },
    2: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
    3: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  }

  const badge = rankBadges[rank] || { bg: 'bg-muted', text: 'text-muted-foreground' }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
        badge.bg,
        badge.text
      )}>
        {badge.icon || rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{client.name}</span>
          <span className="text-sm font-semibold ml-2">
            {formatCurrency(client.revenue, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{client.invoiceCount} facturi</span>
          <RevenueTrendIndicator value={client.trend} size="sm" />
        </div>
      </div>
    </div>
  )
}

// Top Product Item
export function TopProductItem({
  product,
  rank,
  currency = 'RON',
}: {
  product: TopProduct
  rank: number
  currency?: string
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{product.name}</span>
          <span className="text-sm font-semibold ml-2">
            {formatCurrency(product.revenue, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{product.quantity} unități vândute</span>
          <RevenueTrendIndicator value={product.trend} size="sm" />
        </div>
      </div>
    </div>
  )
}

// Revenue Stats Card
export function RevenueStatsCard({
  label,
  value,
  trend,
  icon,
  currency = 'RON',
  variant = 'default',
}: {
  label: string
  value: number
  trend?: number
  icon?: React.ReactNode
  currency?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variants = {
    default: 'bg-card border',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  }

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      variants[variant]
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{formatCurrency(value, currency)}</span>
        {trend !== undefined && <RevenueTrendIndicator value={trend} size="sm" />}
      </div>
    </div>
  )
}

// Period Selector
export function RevenuePeriodSelector({
  selected,
  onChange,
}: {
  selected: string
  onChange: (period: string) => void
}) {
  const periods = ['day', 'week', 'month', 'quarter', 'year']

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
          {period === 'day' && 'Zi'}
          {period === 'week' && 'Săpt.'}
          {period === 'month' && 'Lună'}
          {period === 'quarter' && 'Trim.'}
          {period === 'year' && 'An'}
        </button>
      ))}
    </div>
  )
}

// Main Revenue Widget
export function RevenueWidget({
  totalRevenue,
  previousRevenue,
  target,
  currency = 'RON',
  period = 'month',
  sources = [],
  periodData = [],
  topClients = [],
  topProducts = [],
  invoicedAmount,
  collectedAmount,
  pendingAmount,
  variant = 'standard',
  showChart = true,
  showSources = true,
  showTopClients = false,
  showTopProducts = false,
  onRefresh,
  onViewDetails,
  onPeriodChange,
  isLoading = false,
  className,
}: RevenueWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(period)
  const [hideAmount, setHideAmount] = React.useState(false)

  const change = previousRevenue !== undefined
    ? calculateChange(totalRevenue, previousRevenue)
    : undefined

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="font-medium">Venituri</span>
          </div>
          {change !== undefined && <RevenueTrendIndicator value={change} />}
        </div>
        <div className="text-2xl font-bold">
          {hideAmount ? '••••••' : formatCurrency(totalRevenue, currency)}
        </div>
        {target && (
          <RevenueProgressBar current={totalRevenue} target={target} size="sm" showLabels={false} />
        )}
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
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">Venituri</h3>
              <p className="text-xs text-muted-foreground">{periodLabels[selectedPeriod]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideAmount(!hideAmount)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {hideAmount ? (
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
          <RevenuePeriodSelector
            selected={selectedPeriod}
            onChange={handlePeriodChange}
          />
        )}
      </div>

      {/* Main Stats */}
      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-xs text-muted-foreground">Venituri totale</span>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {hideAmount ? '••••••' : formatCurrency(totalRevenue, currency)}
            </div>
          </div>
          {change !== undefined && !hideAmount && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
              change >= 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {formatPercentage(change)}
            </div>
          )}
        </div>

        {/* Target Progress */}
        {target && !hideAmount && (
          <RevenueProgressBar current={totalRevenue} target={target} />
        )}
      </div>

      {/* Invoice Stats */}
      {(invoicedAmount !== undefined || collectedAmount !== undefined || pendingAmount !== undefined) && (
        <div className="p-4 grid grid-cols-3 gap-3 border-b">
          {invoicedAmount !== undefined && (
            <RevenueStatsCard
              label="Facturat"
              value={invoicedAmount}
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              currency={currency}
            />
          )}
          {collectedAmount !== undefined && (
            <RevenueStatsCard
              label="Încasat"
              value={collectedAmount}
              icon={<DollarSign className="h-4 w-4 text-green-500" />}
              currency={currency}
              variant="success"
            />
          )}
          {pendingAmount !== undefined && (
            <RevenueStatsCard
              label="De încasat"
              value={pendingAmount}
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
              currency={currency}
              variant="warning"
            />
          )}
        </div>
      )}

      {/* Chart */}
      {showChart && periodData.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Evoluție venituri</span>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Realizat</span>
              </div>
              {target && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-primary/30" style={{ borderStyle: 'dashed' }} />
                  <span>Țintă</span>
                </div>
              )}
            </div>
          </div>
          <RevenueMiniChart data={periodData} height={80} showTarget={!!target} />
        </div>
      )}

      {/* Revenue Sources */}
      {showSources && sources.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Surse de venit</span>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {sources.slice(0, variant === 'full' ? 10 : 5).map((source, index) => (
              <RevenueSourceItem
                key={source.id}
                source={{
                  ...source,
                  color: source.color || sourceColors[index % sourceColors.length],
                }}
                currency={currency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Clients */}
      {showTopClients && topClients.length > 0 && (variant === 'detailed' || variant === 'full') && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Top clienți</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y">
            {topClients.slice(0, 5).map((client, index) => (
              <TopClientItem
                key={client.id}
                client={client}
                rank={index + 1}
                currency={currency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {showTopProducts && topProducts.length > 0 && (variant === 'detailed' || variant === 'full') && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Top produse/servicii</span>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y">
            {topProducts.slice(0, 5).map((product, index) => (
              <TopProductItem
                key={product.id}
                product={product}
                rank={index + 1}
                currency={currency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {onViewDetails && (
        <div className="p-4 bg-muted/30">
          <button
            onClick={onViewDetails}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Raport detaliat venituri
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Revenue Comparison Widget
export function RevenueComparisonWidget({
  current,
  previous,
  currentLabel = 'Luna curentă',
  previousLabel = 'Luna anterioară',
  currency = 'RON',
  className,
}: {
  current: number
  previous: number
  currentLabel?: string
  previousLabel?: string
  currency?: string
  className?: string
}) {
  const change = calculateChange(current, previous)
  const diff = current - previous

  return (
    <div className={cn(
      'p-4 rounded-xl border bg-card shadow-sm',
      className
    )}>
      <h4 className="text-sm font-medium mb-4">Comparație venituri</h4>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">{currentLabel}</span>
            <div className="text-xl font-bold">{formatCurrency(current, currency)}</div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">{previousLabel}</span>
            <div className="text-xl font-bold text-muted-foreground">
              {formatCurrency(previous, currency)}
            </div>
          </div>
        </div>
        <div className="pt-3 border-t flex items-center justify-between">
          <span className="text-sm">Diferență</span>
          <div className={cn(
            'flex items-center gap-2 font-bold',
            diff >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            <span>{diff >= 0 ? '+' : ''}{formatCurrency(diff, currency)}</span>
            <span className="text-sm">({formatPercentage(change)})</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Revenue Goal Tracker
export function RevenueGoalTracker({
  current,
  target,
  currency = 'RON',
  deadline,
  className,
}: {
  current: number
  target: number
  currency?: string
  deadline?: Date
  className?: string
}) {
  const percentage = (current / target) * 100
  const remaining = target - current
  const isComplete = current >= target

  const daysRemaining = deadline
    ? Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : undefined

  return (
    <div className={cn(
      'p-4 rounded-xl border bg-card shadow-sm',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className={cn(
            'h-5 w-5',
            isComplete ? 'text-green-500' : 'text-primary'
          )} />
          <span className="font-medium">Obiectiv venituri</span>
        </div>
        {isComplete && (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
            <Star className="h-3 w-3" /> Atins!
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-xs text-muted-foreground">Realizat</span>
            <div className="text-2xl font-bold">{formatCurrency(current, currency)}</div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Țintă</span>
            <div className="text-xl font-semibold text-muted-foreground">
              {formatCurrency(target, currency)}
            </div>
          </div>
        </div>
        <RevenueProgressBar current={current} target={target} showLabels={false} size="lg" />
      </div>

      <div className="flex items-center justify-between text-sm">
        {!isComplete && (
          <span className="text-muted-foreground">
            Mai sunt de realizat: <strong>{formatCurrency(remaining, currency)}</strong>
          </span>
        )}
        {daysRemaining !== undefined && daysRemaining > 0 && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {daysRemaining} zile rămase
          </span>
        )}
      </div>
    </div>
  )
}

// Clock icon component
function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  )
}

export default RevenueWidget
