'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  CreditCard,
  Banknote,
  Calendar,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  BarChart3,
  Activity,
  Minus,
} from 'lucide-react'

// Types
export interface CashFlowTransaction {
  id: string
  date: Date
  description: string
  amount: number
  type: 'inflow' | 'outflow'
  category: string
  status: 'completed' | 'pending' | 'scheduled'
  source?: string
}

export interface CashFlowPeriod {
  label: string
  startDate: Date
  endDate: Date
  inflow: number
  outflow: number
  netFlow: number
}

export interface CashFlowForecast {
  date: Date
  projectedBalance: number
  confidence: 'high' | 'medium' | 'low'
  scheduledInflows: number
  scheduledOutflows: number
}

export interface CashFlowWidgetProps {
  currentBalance: number
  previousBalance?: number
  periodInflow: number
  periodOutflow: number
  currency?: string
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  transactions?: CashFlowTransaction[]
  historicalData?: CashFlowPeriod[]
  forecast?: CashFlowForecast[]
  variant?: 'compact' | 'standard' | 'detailed' | 'full'
  showChart?: boolean
  showTransactions?: boolean
  showForecast?: boolean
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

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  sales: <Banknote className="h-4 w-4" />,
  services: <Activity className="h-4 w-4" />,
  investments: <TrendingUp className="h-4 w-4" />,
  expenses: <CreditCard className="h-4 w-4" />,
  salaries: <Wallet className="h-4 w-4" />,
  taxes: <PiggyBank className="h-4 w-4" />,
  other: <BarChart3 className="h-4 w-4" />,
}

// Format currency
function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// Cash Flow Indicator
export function CashFlowIndicator({
  value,
  type,
  size = 'md',
  showLabel = true,
}: {
  value: number
  type: 'inflow' | 'outflow' | 'net'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  const isPositive = value >= 0
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const labels: Record<string, string> = {
    inflow: 'Încasări',
    outflow: 'Plăți',
    net: 'Flux net',
  }

  const colors: Record<string, { positive: string; negative: string }> = {
    inflow: { positive: 'text-green-600 dark:text-green-400', negative: 'text-red-600 dark:text-red-400' },
    outflow: { positive: 'text-red-600 dark:text-red-400', negative: 'text-green-600 dark:text-green-400' },
    net: { positive: 'text-green-600 dark:text-green-400', negative: 'text-red-600 dark:text-red-400' },
  }

  const Icon = type === 'inflow'
    ? ArrowUpRight
    : type === 'outflow'
      ? ArrowDownRight
      : isPositive
        ? TrendingUp
        : TrendingDown

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <span className="text-xs text-muted-foreground">{labels[type]}</span>
      )}
      <div className={cn(
        'flex items-center gap-1 font-semibold',
        sizeClasses[size],
        type === 'outflow'
          ? colors[type].positive
          : isPositive
            ? colors[type].positive
            : colors[type].negative
      )}>
        <Icon className="h-4 w-4" />
        <span>{formatCurrency(Math.abs(value))}</span>
      </div>
    </div>
  )
}

// Mini Cash Flow Chart
export function CashFlowMiniChart({
  data,
  height = 60,
  showLabels = false,
}: {
  data: CashFlowPeriod[]
  height?: number
  showLabels?: boolean
}) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data.map(d => Math.max(d.inflow, d.outflow)))
  const barWidth = 100 / data.length

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {data.map((period, index) => {
          const inflowHeight = (period.inflow / maxValue) * (height - 10)
          const outflowHeight = (period.outflow / maxValue) * (height - 10)
          const x = index * barWidth + barWidth * 0.1
          const width = barWidth * 0.35

          return (
            <g key={index}>
              {/* Inflow bar */}
              <rect
                x={x}
                y={height - inflowHeight}
                width={width}
                height={inflowHeight}
                className="fill-green-500/80"
                rx={1}
              />
              {/* Outflow bar */}
              <rect
                x={x + width + 1}
                y={height - outflowHeight}
                width={width}
                height={outflowHeight}
                className="fill-red-500/80"
                rx={1}
              />
            </g>
          )
        })}
      </svg>
      {showLabels && (
        <div className="flex justify-between mt-1">
          {data.map((period, index) => (
            <span key={index} className="text-[10px] text-muted-foreground">
              {period.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Transaction Item
export function TransactionItem({
  transaction,
  currency = 'RON',
  compact = false,
}: {
  transaction: CashFlowTransaction
  currency?: string
  compact?: boolean
}) {
  const isInflow = transaction.type === 'inflow'

  const statusIcons = {
    completed: <CheckCircle className="h-3 w-3 text-green-500" />,
    pending: <Clock className="h-3 w-3 text-yellow-500" />,
    scheduled: <Calendar className="h-3 w-3 text-blue-500" />,
  }

  return (
    <div className={cn(
      'flex items-center justify-between py-2',
      !compact && 'border-b border-border/50 last:border-0'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          isInflow
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        )}>
          {categoryIcons[transaction.category] || categoryIcons.other}
        </div>
        {!compact && (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{transaction.description}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {statusIcons[transaction.status]}
              <span>
                {transaction.date.toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
              {transaction.source && (
                <>
                  <span>•</span>
                  <span>{transaction.source}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <span className={cn(
        'font-semibold',
        isInflow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}>
        {isInflow ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), currency)}
      </span>
    </div>
  )
}

// Forecast Card
export function ForecastCard({
  forecast,
  currency = 'RON',
}: {
  forecast: CashFlowForecast
  currency?: string
}) {
  const confidenceColors = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const confidenceLabels = {
    high: 'Încredere ridicată',
    medium: 'Încredere medie',
    low: 'Încredere scăzută',
  }

  return (
    <div className="p-3 rounded-lg border bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {forecast.date.toLocaleDateString('ro-RO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          confidenceColors[forecast.confidence]
        )}>
          {confidenceLabels[forecast.confidence]}
        </span>
      </div>
      <div className="text-lg font-bold mb-2">
        {formatCurrency(forecast.projectedBalance, currency)}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3 text-green-500" />
          <span>{formatCurrency(forecast.scheduledInflows, currency)}</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowDownRight className="h-3 w-3 text-red-500" />
          <span>{formatCurrency(forecast.scheduledOutflows, currency)}</span>
        </div>
      </div>
    </div>
  )
}

// Balance Display
export function BalanceDisplay({
  balance,
  previousBalance,
  currency = 'RON',
  showChange = true,
  size = 'lg',
  hideAmount = false,
}: {
  balance: number
  previousBalance?: number
  currency?: string
  showChange?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideAmount?: boolean
}) {
  const change = previousBalance !== undefined
    ? calculateChange(balance, previousBalance)
    : undefined

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground mb-1">Sold curent</span>
      <div className={cn('font-bold', sizeClasses[size])}>
        {hideAmount ? '••••••' : formatCurrency(balance, currency)}
      </div>
      {showChange && change !== undefined && !hideAmount && (
        <div className={cn(
          'flex items-center gap-1 text-sm mt-1',
          change >= 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        )}>
          {change >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{formatPercentage(change)}</span>
          <span className="text-muted-foreground">vs. per. ant.</span>
        </div>
      )}
    </div>
  )
}

// Period Selector
export function PeriodSelector({
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

// Main Cash Flow Widget
export function CashFlowWidget({
  currentBalance,
  previousBalance,
  periodInflow,
  periodOutflow,
  currency = 'RON',
  period = 'month',
  transactions = [],
  historicalData = [],
  forecast = [],
  variant = 'standard',
  showChart = true,
  showTransactions = true,
  showForecast = false,
  onRefresh,
  onViewDetails,
  onPeriodChange,
  isLoading = false,
  className,
}: CashFlowWidgetProps) {
  const [hideAmount, setHideAmount] = React.useState(false)
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(period)

  const netFlow = periodInflow - periodOutflow

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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">Flux numerar</span>
          </div>
          <span className={cn(
            'text-sm font-semibold',
            netFlow >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          )}>
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <ArrowUpRight className="h-4 w-4" />
            <span>{formatCurrency(periodInflow, currency)}</span>
          </div>
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <ArrowDownRight className="h-4 w-4" />
            <span>{formatCurrency(periodOutflow, currency)}</span>
          </div>
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
              <h3 className="font-semibold">Flux de numerar</h3>
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
          <PeriodSelector
            selected={selectedPeriod}
            onChange={handlePeriodChange}
          />
        )}
      </div>

      {/* Balance */}
      <div className="p-4 bg-muted/30">
        <BalanceDisplay
          balance={currentBalance}
          previousBalance={previousBalance}
          currency={currency}
          hideAmount={hideAmount}
          size={variant === 'detailed' || variant === 'full' ? 'xl' : 'lg'}
        />
      </div>

      {/* Flow Summary */}
      <div className="p-4 grid grid-cols-3 gap-4 border-b">
        <CashFlowIndicator value={periodInflow} type="inflow" />
        <CashFlowIndicator value={periodOutflow} type="outflow" />
        <CashFlowIndicator value={netFlow} type="net" />
      </div>

      {/* Chart */}
      {showChart && historicalData.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Evoluție</span>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Încasări</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Plăți</span>
              </div>
            </div>
          </div>
          <CashFlowMiniChart data={historicalData} height={80} showLabels />
        </div>
      )}

      {/* Transactions */}
      {showTransactions && transactions.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Tranzacții recente</span>
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Vezi toate
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {transactions.slice(0, variant === 'full' ? 10 : 5).map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                currency={currency}
                compact={variant === 'standard'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Forecast */}
      {showForecast && forecast.length > 0 && (variant === 'detailed' || variant === 'full') && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Prognoză</span>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {forecast.slice(0, 4).map((item, index) => (
              <ForecastCard key={index} forecast={item} currency={currency} />
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
            Raport detaliat flux numerar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Cash Flow Summary Card
export function CashFlowSummaryCard({
  inflow,
  outflow,
  period,
  currency = 'RON',
  trend,
  className,
}: {
  inflow: number
  outflow: number
  period: string
  currency?: string
  trend?: 'up' | 'down' | 'stable'
  className?: string
}) {
  const netFlow = inflow - outflow
  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-500" />,
    down: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <Minus className="h-4 w-4 text-muted-foreground" />,
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border bg-card shadow-sm',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{period}</span>
        {trend && trendIcons[trend]}
      </div>
      <div className={cn(
        'text-2xl font-bold mb-2',
        netFlow >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      )}>
        {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, currency)}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-green-600 dark:text-green-400">
          +{formatCurrency(inflow, currency)}
        </span>
        <span className="text-red-600 dark:text-red-400">
          -{formatCurrency(outflow, currency)}
        </span>
      </div>
    </div>
  )
}

// Cash Flow Comparison
export function CashFlowComparison({
  current,
  previous,
  currency = 'RON',
  className,
}: {
  current: { inflow: number; outflow: number; label: string }
  previous: { inflow: number; outflow: number; label: string }
  currency?: string
  className?: string
}) {
  const currentNet = current.inflow - current.outflow
  const previousNet = previous.inflow - previous.outflow
  const change = calculateChange(currentNet, previousNet)

  return (
    <div className={cn(
      'p-4 rounded-xl border bg-card shadow-sm',
      className
    )}>
      <h4 className="text-sm font-medium mb-4">Comparație flux numerar</h4>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{current.label}</span>
          <span className={cn(
            'font-semibold',
            currentNet >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {formatCurrency(currentNet, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{previous.label}</span>
          <span className={cn(
            'font-semibold',
            previousNet >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {formatCurrency(previousNet, currency)}
          </span>
        </div>
        <div className="pt-3 border-t flex items-center justify-between">
          <span className="text-sm font-medium">Variație</span>
          <span className={cn(
            'font-bold flex items-center gap-1',
            change >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {formatPercentage(change)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CashFlowWidget
