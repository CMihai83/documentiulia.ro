'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Building2,
  Car,
  Utensils,
  Wifi,
  Phone,
  Briefcase,
  Users,
  Package,
  Wrench,
  Fuel,
  Home,
  ShoppingBag,
  Plane,
  Coffee,
  FileText,
  BarChart3,
  PieChart,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
  Target,
} from 'lucide-react'

// Types
export interface ExpenseCategory {
  id: string
  name: string
  nameRo: string
  amount: number
  percentage: number
  trend: number
  budget?: number
  count: number
  icon: string
  color: string
}

export interface ExpenseItem {
  id: string
  date: Date
  description: string
  amount: number
  category: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  vendor?: string
  hasReceipt: boolean
}

export interface ExpenseByPeriod {
  period: string
  amount: number
  budget?: number
  categoryBreakdown?: Record<string, number>
}

export interface ExpenseBudget {
  category: string
  allocated: number
  spent: number
  remaining: number
}

export interface ExpenseWidgetProps {
  totalExpenses: number
  previousExpenses?: number
  budget?: number
  currency?: string
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  categories?: ExpenseCategory[]
  recentExpenses?: ExpenseItem[]
  periodData?: ExpenseByPeriod[]
  budgets?: ExpenseBudget[]
  pendingApproval?: number
  pendingCount?: number
  variant?: 'compact' | 'standard' | 'detailed' | 'full'
  showChart?: boolean
  showCategories?: boolean
  showRecentExpenses?: boolean
  showBudgets?: boolean
  onRefresh?: () => void
  onViewDetails?: () => void
  onPeriodChange?: (period: string) => void
  onAddExpense?: () => void
  isLoading?: boolean
  className?: string
}

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  office: <Building2 className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  food: <Utensils className="h-4 w-4" />,
  utilities: <Wifi className="h-4 w-4" />,
  telecom: <Phone className="h-4 w-4" />,
  salaries: <Users className="h-4 w-4" />,
  supplies: <Package className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
  rent: <Home className="h-4 w-4" />,
  marketing: <ShoppingBag className="h-4 w-4" />,
  travel: <Plane className="h-4 w-4" />,
  meetings: <Coffee className="h-4 w-4" />,
  professional: <Briefcase className="h-4 w-4" />,
  other: <Receipt className="h-4 w-4" />,
}

// Category colors
const categoryColors: Record<string, string> = {
  office: 'bg-blue-500',
  transport: 'bg-green-500',
  food: 'bg-orange-500',
  utilities: 'bg-purple-500',
  telecom: 'bg-cyan-500',
  salaries: 'bg-pink-500',
  supplies: 'bg-yellow-500',
  maintenance: 'bg-red-500',
  fuel: 'bg-emerald-500',
  rent: 'bg-indigo-500',
  marketing: 'bg-rose-500',
  travel: 'bg-sky-500',
  meetings: 'bg-amber-500',
  professional: 'bg-violet-500',
  other: 'bg-gray-500',
}

// Period labels in Romanian
const periodLabels: Record<string, string> = {
  day: 'Azi',
  week: 'Săptămâna aceasta',
  month: 'Luna aceasta',
  quarter: 'Trimestrul acesta',
  year: 'Anul acesta',
}

// Status labels
const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'În așteptare',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: 'Aprobată',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    label: 'Respinsă',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  paid: {
    label: 'Plătită',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <CreditCard className="h-3 w-3" />,
  },
}

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

// Expense Trend Indicator
export function ExpenseTrendIndicator({
  value,
  size = 'md',
  showValue = true,
  invertColors = true, // For expenses, down is good
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  invertColors?: boolean
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

  // For expenses, negative trend (less spending) is usually good
  const goodTrend = invertColors ? !isPositive : isPositive

  return (
    <div className={cn(
      'flex items-center gap-1',
      sizeClasses[size],
      goodTrend
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

// Budget Progress Bar
export function BudgetProgressBar({
  spent,
  budget,
  showLabels = true,
  size = 'md',
}: {
  spent: number
  budget: number
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const percentage = Math.min((spent / budget) * 100, 100)
  const isOverBudget = spent > budget
  const isNearBudget = percentage >= 80 && !isOverBudget

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
            {percentage.toFixed(0)}% utilizat
          </span>
          <span className={cn(
            'font-medium',
            isOverBudget
              ? 'text-red-600'
              : isNearBudget
                ? 'text-yellow-600'
                : 'text-muted-foreground'
          )}>
            {isOverBudget && '⚠️ '}
            {isOverBudget ? 'Depășit' : isNearBudget ? 'Aproape de limită' : 'În buget'}
          </span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', heightClasses[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            isOverBudget
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : isNearBudget
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                : 'bg-gradient-to-r from-green-500 to-emerald-500'
          )}
        />
      </div>
    </div>
  )
}

// Category Item
export function ExpenseCategoryItem({
  category,
  currency = 'RON',
  showBudget = true,
  maxPercentage = 100,
}: {
  category: ExpenseCategory
  currency?: string
  showBudget?: boolean
  maxPercentage?: number
}) {
  const barWidth = (category.percentage / maxPercentage) * 100
  const icon = categoryIcons[category.icon] || categoryIcons.other
  const color = categoryColors[category.icon] || categoryColors.other

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded text-white', color)}>
            {icon}
          </div>
          <div>
            <span className="text-sm font-medium">{category.nameRo}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({category.count} tranzacții)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {formatCurrency(category.amount, currency)}
          </span>
          <ExpenseTrendIndicator value={category.trend} size="sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn('h-full rounded-full', color)}
          />
        </div>
        <span className="text-xs text-muted-foreground w-10 text-right">
          {category.percentage.toFixed(0)}%
        </span>
      </div>

      {showBudget && category.budget && (
        <div className="pl-8">
          <BudgetProgressBar
            spent={category.amount}
            budget={category.budget}
            size="sm"
            showLabels={false}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Buget: {formatCurrency(category.budget, currency)}</span>
            <span>Rămas: {formatCurrency(category.budget - category.amount, currency)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Mini Expense Chart
export function ExpenseMiniChart({
  data,
  height = 60,
  showBudget = true,
}: {
  data: ExpenseByPeriod[]
  height?: number
  showBudget?: boolean
}) {
  if (!data || data.length === 0) return null

  const maxAmount = Math.max(...data.map(d => Math.max(d.amount, d.budget || 0)))
  const barWidth = 100 / data.length

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Budget line */}
        {showBudget && data[0]?.budget && (
          <line
            x1="0"
            y1={height - (data[0].budget / maxAmount) * (height - 5)}
            x2="100"
            y2={height - (data[0].budget / maxAmount) * (height - 5)}
            className="stroke-yellow-500/50"
            strokeWidth="1"
            strokeDasharray="4"
          />
        )}
        {/* Expense bars */}
        {data.map((period, index) => {
          const barHeight = (period.amount / maxAmount) * (height - 5)
          const x = index * barWidth + barWidth * 0.2
          const width = barWidth * 0.6
          const isOverBudget = period.budget && period.amount > period.budget

          return (
            <rect
              key={index}
              x={x}
              y={height - barHeight}
              width={width}
              height={barHeight}
              className={cn(
                isOverBudget ? 'fill-red-500' : 'fill-blue-500'
              )}
              rx={2}
            />
          )
        })}
      </svg>
    </div>
  )
}

// Expense Item
export function ExpenseItemRow({
  expense,
  currency = 'RON',
  compact = false,
}: {
  expense: ExpenseItem
  currency?: string
  compact?: boolean
}) {
  const status = statusLabels[expense.status]
  const icon = categoryIcons[expense.category] || categoryIcons.other
  const color = categoryColors[expense.category] || categoryColors.other

  return (
    <div className={cn(
      'flex items-center justify-between py-2',
      !compact && 'border-b border-border/50 last:border-0'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg text-white', color)}>
          {icon}
        </div>
        {!compact && (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{expense.description}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                status.color
              )}>
                {status.icon}
                {status.label}
              </span>
              <span>
                {expense.date.toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
              {expense.vendor && (
                <>
                  <span>•</span>
                  <span>{expense.vendor}</span>
                </>
              )}
              {expense.hasReceipt && (
                <Receipt className="h-3 w-3 text-green-500" />
              )}
            </div>
          </div>
        )}
      </div>
      <span className="font-semibold text-red-600 dark:text-red-400">
        -{formatCurrency(expense.amount, currency)}
      </span>
    </div>
  )
}

// Budget Card
export function BudgetCard({
  budget,
  currency = 'RON',
}: {
  budget: ExpenseBudget
  currency?: string
}) {
  const percentage = (budget.spent / budget.allocated) * 100
  const isOverBudget = budget.spent > budget.allocated
  const isNearBudget = percentage >= 80 && !isOverBudget

  const icon = categoryIcons[budget.category] || categoryIcons.other
  const color = categoryColors[budget.category] || categoryColors.other

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isOverBudget
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
        : isNearBudget
          ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
          : 'border-border bg-card'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded text-white', color)}>
            {icon}
          </div>
          <span className="text-sm font-medium capitalize">{budget.category}</span>
        </div>
        {isOverBudget && <AlertTriangle className="h-4 w-4 text-red-500" />}
      </div>
      <BudgetProgressBar spent={budget.spent} budget={budget.allocated} size="sm" showLabels={false} />
      <div className="flex justify-between text-xs mt-2">
        <span className="text-muted-foreground">
          {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.allocated, currency)}
        </span>
        <span className={cn(
          'font-medium',
          budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {budget.remaining >= 0 ? 'Rămas: ' : 'Depășire: '}
          {formatCurrency(Math.abs(budget.remaining), currency)}
        </span>
      </div>
    </div>
  )
}

// Period Selector
export function ExpensePeriodSelector({
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

// Pending Approval Badge
export function PendingApprovalBadge({
  count,
  amount,
  currency = 'RON',
  onClick,
}: {
  count: number
  amount: number
  currency?: string
  onClick?: () => void
}) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
    >
      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <div className="text-left">
        <div className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
          {count} cheltuieli de aprobat
        </div>
        <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
          {formatCurrency(amount, currency)}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    </button>
  )
}

// Main Expense Widget
export function ExpenseWidget({
  totalExpenses,
  previousExpenses,
  budget,
  currency = 'RON',
  period = 'month',
  categories = [],
  recentExpenses = [],
  periodData = [],
  budgets = [],
  pendingApproval,
  pendingCount,
  variant = 'standard',
  showChart = true,
  showCategories = true,
  showRecentExpenses = true,
  showBudgets = false,
  onRefresh,
  onViewDetails,
  onPeriodChange,
  onAddExpense,
  isLoading = false,
  className,
}: ExpenseWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(period)
  const [hideAmount, setHideAmount] = React.useState(false)

  const change = previousExpenses !== undefined
    ? calculateChange(totalExpenses, previousExpenses)
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
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="font-medium">Cheltuieli</span>
          </div>
          {change !== undefined && <ExpenseTrendIndicator value={change} />}
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
          {hideAmount ? '••••••' : formatCurrency(totalExpenses, currency)}
        </div>
        {budget && (
          <BudgetProgressBar spent={totalExpenses} budget={budget} size="sm" showLabels={false} />
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
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold">Cheltuieli</h3>
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
          <ExpensePeriodSelector
            selected={selectedPeriod}
            onChange={handlePeriodChange}
          />
        )}
      </div>

      {/* Main Stats */}
      <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-xs text-muted-foreground">Cheltuieli totale</span>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
              {hideAmount ? '••••••' : formatCurrency(totalExpenses, currency)}
            </div>
          </div>
          {change !== undefined && !hideAmount && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
              change <= 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {formatPercentage(change)}
            </div>
          )}
        </div>

        {/* Budget Progress */}
        {budget && !hideAmount && (
          <BudgetProgressBar spent={totalExpenses} budget={budget} />
        )}
      </div>

      {/* Pending Approval */}
      {pendingCount && pendingCount > 0 && pendingApproval && (
        <div className="p-4 border-b">
          <PendingApprovalBadge
            count={pendingCount}
            amount={pendingApproval}
            currency={currency}
          />
        </div>
      )}

      {/* Chart */}
      {showChart && periodData.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Evoluție cheltuieli</span>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Cheltuieli</span>
              </div>
              {budget && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-yellow-500" />
                  <span>Buget</span>
                </div>
              )}
            </div>
          </div>
          <ExpenseMiniChart data={periodData} height={80} showBudget={!!budget} />
        </div>
      )}

      {/* Categories */}
      {showCategories && categories.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Categorii cheltuieli</span>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {categories.slice(0, variant === 'full' ? 10 : 5).map((category) => (
              <ExpenseCategoryItem
                key={category.id}
                category={category}
                currency={currency}
                showBudget={variant === 'detailed' || variant === 'full'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Budgets */}
      {showBudgets && budgets.length > 0 && (variant === 'detailed' || variant === 'full') && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Bugete pe categorii</span>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {budgets.map((budget) => (
              <BudgetCard key={budget.category} budget={budget} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      {showRecentExpenses && recentExpenses.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Cheltuieli recente</span>
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
            {recentExpenses.slice(0, variant === 'full' ? 10 : 5).map((expense) => (
              <ExpenseItemRow
                key={expense.id}
                expense={expense}
                currency={currency}
                compact={variant === 'standard'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-muted/30 flex items-center gap-3">
        {onAddExpense && (
          <button
            onClick={onAddExpense}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
          >
            <Receipt className="h-4 w-4" />
            Adaugă cheltuială
          </button>
        )}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Raport detaliat
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// Expense Summary Card
export function ExpenseSummaryCard({
  label,
  amount,
  count,
  trend,
  icon,
  currency = 'RON',
  variant = 'default',
}: {
  label: string
  amount: number
  count?: number
  trend?: number
  icon?: React.ReactNode
  currency?: string
  variant?: 'default' | 'warning' | 'danger'
}) {
  const variants = {
    default: 'bg-card border',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border',
      variants[variant]
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-bold">{formatCurrency(amount, currency)}</div>
      <div className="flex items-center justify-between mt-1 text-xs">
        {count !== undefined && (
          <span className="text-muted-foreground">{count} tranzacții</span>
        )}
        {trend !== undefined && <ExpenseTrendIndicator value={trend} size="sm" />}
      </div>
    </div>
  )
}

export default ExpenseWidget
