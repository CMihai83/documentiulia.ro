'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  FileText,
  Building2,
  Landmark,
  Receipt,
  Calculator,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Bell,
  BellRing,
  Download,
  Upload,
  ExternalLink,
  Info,
  HelpCircle,
  CalendarDays,
  Timer,
  Target,
  TrendingUp,
  Percent,
  Banknote,
  Flag,
} from 'lucide-react'

// Types
export type TaxType =
  | 'tva'
  | 'impozit_profit'
  | 'impozit_micro'
  | 'impozit_venit'
  | 'cas'
  | 'cass'
  | 'impozit_dividende'
  | 'impozit_salarii'
  | 'contributii_sociale'
  | 'd100'
  | 'd112'
  | 'd300'
  | 'd390'
  | 'd394'
  | 'd406'
  | 'other'

export type TaxStatus = 'upcoming' | 'due_soon' | 'due_today' | 'overdue' | 'submitted' | 'paid' | 'exempted'
export type TaxPeriod = 'monthly' | 'quarterly' | 'yearly' | 'on_demand'

export interface TaxObligation {
  id: string
  type: TaxType
  name: string
  description?: string
  dueDate: Date
  amount?: number
  estimatedAmount?: number
  status: TaxStatus
  period: TaxPeriod
  periodLabel: string
  daysUntilDue: number
  declarationRequired: boolean
  declarationSubmitted?: boolean
  paymentRequired: boolean
  paymentCompleted?: boolean
  anafFormCode?: string
  penaltyRate?: number
  reminderSet?: boolean
  notes?: string
  relatedDocuments?: string[]
}

export interface TaxSummary {
  totalDue: number
  overdueAmount: number
  upcomingCount: number
  overdueCount: number
  submittedCount: number
  nextDueDate?: Date
}

export interface TaxObligationsWidgetProps {
  obligations: TaxObligation[]
  summary?: TaxSummary
  currency?: string
  variant?: 'compact' | 'standard' | 'detailed' | 'full'
  showCalendar?: boolean
  showOverdueAlert?: boolean
  maxItems?: number
  onRefresh?: () => void
  onViewDetails?: () => void
  onSubmitDeclaration?: (obligationId: string) => void
  onPayTax?: (obligationId: string) => void
  onSetReminder?: (obligationId: string) => void
  onViewObligation?: (obligationId: string) => void
  onOpenAnaf?: () => void
  isLoading?: boolean
  className?: string
}

// Tax type config
const taxTypeConfig: Record<TaxType, { label: string; icon: React.ReactNode; color: string }> = {
  tva: {
    label: 'TVA',
    icon: <Percent className="h-4 w-4" />,
    color: 'bg-blue-500',
  },
  impozit_profit: {
    label: 'Impozit profit',
    icon: <Landmark className="h-4 w-4" />,
    color: 'bg-purple-500',
  },
  impozit_micro: {
    label: 'Impozit micro',
    icon: <Building2 className="h-4 w-4" />,
    color: 'bg-indigo-500',
  },
  impozit_venit: {
    label: 'Impozit venit',
    icon: <Banknote className="h-4 w-4" />,
    color: 'bg-green-500',
  },
  cas: {
    label: 'CAS',
    icon: <Receipt className="h-4 w-4" />,
    color: 'bg-orange-500',
  },
  cass: {
    label: 'CASS',
    icon: <Receipt className="h-4 w-4" />,
    color: 'bg-yellow-500',
  },
  impozit_dividende: {
    label: 'Impozit dividende',
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'bg-pink-500',
  },
  impozit_salarii: {
    label: 'Impozit salarii',
    icon: <Calculator className="h-4 w-4" />,
    color: 'bg-cyan-500',
  },
  contributii_sociale: {
    label: 'Contribuții sociale',
    icon: <Receipt className="h-4 w-4" />,
    color: 'bg-teal-500',
  },
  d100: {
    label: 'Declarația 100',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-red-500',
  },
  d112: {
    label: 'Declarația 112',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-red-500',
  },
  d300: {
    label: 'Declarația 300',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-blue-600',
  },
  d390: {
    label: 'Declarația 390',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-blue-600',
  },
  d394: {
    label: 'Declarația 394',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-blue-600',
  },
  d406: {
    label: 'Declarația 406',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-emerald-500',
  },
  other: {
    label: 'Altele',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-gray-500',
  },
}

// Status config
const statusConfig: Record<TaxStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  upcoming: {
    label: 'Viitor',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Calendar className="h-3 w-3" />,
  },
  due_soon: {
    label: 'În curând',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="h-3 w-3" />,
  },
  due_today: {
    label: 'Azi',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  overdue: {
    label: 'Restant',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  submitted: {
    label: 'Depus',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  paid: {
    label: 'Plătit',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  exempted: {
    label: 'Scutit',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: <Info className="h-3 w-3" />,
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

// Format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Format relative date
function formatRelativeDate(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return `${Math.abs(daysUntilDue)} zile restanță`
  }
  if (daysUntilDue === 0) {
    return 'Scadent azi!'
  }
  if (daysUntilDue === 1) {
    return 'Mâine'
  }
  if (daysUntilDue <= 7) {
    return `În ${daysUntilDue} zile`
  }
  if (daysUntilDue <= 30) {
    const weeks = Math.floor(daysUntilDue / 7)
    return `În ${weeks} săpt.`
  }
  return `În ${Math.floor(daysUntilDue / 30)} luni`
}

// Get urgency level
function getUrgencyLevel(daysUntilDue: number): 'critical' | 'high' | 'medium' | 'low' {
  if (daysUntilDue < 0) return 'critical'
  if (daysUntilDue === 0) return 'critical'
  if (daysUntilDue <= 3) return 'high'
  if (daysUntilDue <= 7) return 'medium'
  return 'low'
}

// Get urgency color
function getUrgencyColor(daysUntilDue: number): string {
  const level = getUrgencyLevel(daysUntilDue)
  switch (level) {
    case 'critical': return 'text-red-600 dark:text-red-400'
    case 'high': return 'text-orange-600 dark:text-orange-400'
    case 'medium': return 'text-yellow-600 dark:text-yellow-400'
    default: return 'text-muted-foreground'
  }
}

// Tax Summary Stats
export function TaxSummaryStats({
  summary,
  currency = 'RON',
}: {
  summary: TaxSummary
  currency?: string
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-muted-foreground">Restanțe</span>
        </div>
        <div className="text-lg font-bold text-red-600 dark:text-red-400">
          {summary.overdueCount}
        </div>
        <div className="text-xs text-red-600/70">
          {formatCurrency(summary.overdueAmount, currency)}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-orange-500" />
          <span className="text-xs text-muted-foreground">De depus</span>
        </div>
        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
          {summary.upcomingCount}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground">Depuse</span>
        </div>
        <div className="text-lg font-bold text-green-600 dark:text-green-400">
          {summary.submittedCount}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-1">
          <Banknote className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">Total datorat</span>
        </div>
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {formatCurrency(summary.totalDue, currency)}
        </div>
      </div>
    </div>
  )
}

// Tax Obligation Item
export function TaxObligationItem({
  obligation,
  currency = 'RON',
  onSubmit,
  onPay,
  onSetReminder,
  onView,
  compact = false,
}: {
  obligation: TaxObligation
  currency?: string
  onSubmit?: () => void
  onPay?: () => void
  onSetReminder?: () => void
  onView?: () => void
  compact?: boolean
}) {
  const typeConfig = taxTypeConfig[obligation.type]
  const status = statusConfig[obligation.status]
  const urgencyColor = getUrgencyColor(obligation.daysUntilDue)

  const showAmount = obligation.amount !== undefined || obligation.estimatedAmount !== undefined
  const displayAmount = obligation.amount ?? obligation.estimatedAmount ?? 0
  const isEstimated = obligation.amount === undefined && obligation.estimatedAmount !== undefined

  return (
    <div className={cn(
      'flex items-center justify-between py-3',
      !compact && 'border-b border-border/50 last:border-0'
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn('p-2 rounded-lg text-white', typeConfig.color)}>
          {typeConfig.icon}
        </div>
        {!compact && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{obligation.name}</span>
              {obligation.anafFormCode && (
                <span className="text-xs text-muted-foreground">
                  ({obligation.anafFormCode})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                status.bgColor,
                status.color
              )}>
                {status.icon}
                {status.label}
              </span>
              <span>•</span>
              <span className={urgencyColor}>
                {formatRelativeDate(obligation.daysUntilDue)}
              </span>
              <span>•</span>
              <span>{obligation.periodLabel}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {showAmount && (
          <div className="text-right">
            <div className="font-semibold">
              {formatCurrency(displayAmount, currency)}
              {isEstimated && <span className="text-xs text-muted-foreground ml-1">~</span>}
            </div>
            {!compact && (
              <div className="text-xs text-muted-foreground">
                {formatDate(obligation.dueDate)}
              </div>
            )}
          </div>
        )}
        {!compact && (
          <div className="flex items-center gap-1">
            {onSubmit && obligation.declarationRequired && !obligation.declarationSubmitted && (
              <button
                onClick={(e) => { e.stopPropagation(); onSubmit(); }}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="Depune declarația"
              >
                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>
            )}
            {onPay && obligation.paymentRequired && !obligation.paymentCompleted && (
              <button
                onClick={(e) => { e.stopPropagation(); onPay(); }}
                className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                title="Plătește"
              >
                <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
              </button>
            )}
            {onSetReminder && !obligation.reminderSet && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetReminder(); }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                title="Setează reminder"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                title="Vezi detalii"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Overdue Tax Alert
export function OverdueTaxAlert({
  count,
  amount,
  currency = 'RON',
  onViewOverdue,
}: {
  count: number
  amount: number
  currency?: string
  onViewOverdue?: () => void
}) {
  if (count === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
            <BellRing className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="font-medium text-red-800 dark:text-red-200">
              {count} obligații fiscale restante
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Penalități posibile: {formatCurrency(amount * 0.001, currency)}/zi
            </div>
          </div>
        </div>
        {onViewOverdue && (
          <button
            onClick={onViewOverdue}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Rezolvă acum
          </button>
        )}
      </div>
    </motion.div>
  )
}

// Tax Calendar Card
export function TaxCalendarCard({
  obligation,
  currency = 'RON',
  onAction,
}: {
  obligation: TaxObligation
  currency?: string
  onAction?: () => void
}) {
  const typeConfig = taxTypeConfig[obligation.type]
  const urgencyLevel = getUrgencyLevel(obligation.daysUntilDue)

  const urgencyColors = {
    critical: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    high: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    low: 'border-border bg-card',
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border-2',
      urgencyColors[urgencyLevel]
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg text-white', typeConfig.color)}>
            {typeConfig.icon}
          </div>
          <div>
            <div className="font-medium">{obligation.name}</div>
            <div className="text-xs text-muted-foreground">{obligation.periodLabel}</div>
          </div>
        </div>
        {obligation.anafFormCode && (
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
            {obligation.anafFormCode}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Scadență</div>
          <div className="text-lg font-bold">{formatDate(obligation.dueDate)}</div>
        </div>
        {(obligation.amount || obligation.estimatedAmount) && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Sumă</div>
            <div className="text-lg font-bold">
              {formatCurrency(obligation.amount ?? obligation.estimatedAmount ?? 0, currency)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {obligation.declarationRequired && (
          <div className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
            obligation.declarationSubmitted
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          )}>
            {obligation.declarationSubmitted ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Depusă
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                De depus
              </>
            )}
          </div>
        )}
        {obligation.paymentRequired && (
          <div className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
            obligation.paymentCompleted
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          )}>
            {obligation.paymentCompleted ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Plătit
              </>
            ) : (
              <>
                <Banknote className="h-3 w-3" />
                De plătit
              </>
            )}
          </div>
        )}
      </div>

      {onAction && !obligation.declarationSubmitted && !obligation.paymentCompleted && (
        <button
          onClick={onAction}
          className="w-full mt-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {obligation.declarationRequired && !obligation.declarationSubmitted
            ? 'Depune declarația'
            : 'Plătește acum'}
        </button>
      )}
    </div>
  )
}

// ANAF Quick Link
export function AnafQuickLink({
  onOpen,
}: {
  onOpen?: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors w-full"
    >
      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
        <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 text-left">
        <div className="font-medium">Portal ANAF</div>
        <div className="text-xs text-muted-foreground">SPV - Spațiul Privat Virtual</div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

// Main Widget
export function TaxObligationsWidget({
  obligations,
  summary,
  currency = 'RON',
  variant = 'standard',
  showCalendar = false,
  showOverdueAlert = true,
  maxItems = 5,
  onRefresh,
  onViewDetails,
  onSubmitDeclaration,
  onPayTax,
  onSetReminder,
  onViewObligation,
  onOpenAnaf,
  isLoading = false,
  className,
}: TaxObligationsWidgetProps) {
  const [hideAmount, setHideAmount] = React.useState(false)

  const overdueObligations = obligations.filter(o => o.status === 'overdue')
  const overdueAmount = overdueObligations.reduce((sum, o) => sum + (o.amount ?? o.estimatedAmount ?? 0), 0)
  const pendingObligations = obligations
    .filter(o => o.status !== 'paid' && o.status !== 'submitted' && o.status !== 'exempted')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  const totalPending = pendingObligations.reduce((sum, o) => sum + (o.amount ?? o.estimatedAmount ?? 0), 0)

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
              <Landmark className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="font-medium">Obligații fiscale</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {pendingObligations.length} active
          </span>
        </div>
        <div className="text-2xl font-bold">
          {hideAmount ? '••••••' : formatCurrency(totalPending, currency)}
        </div>
        {overdueObligations.length > 0 && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {overdueObligations.length} restante
          </div>
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
              <Landmark className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold">Obligații fiscale</h3>
              <p className="text-xs text-muted-foreground">
                {pendingObligations.length} de îndeplinit
              </p>
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

        {/* Summary Stats */}
        {summary && (
          <TaxSummaryStats summary={summary} currency={currency} />
        )}
      </div>

      {/* Overdue Alert */}
      {showOverdueAlert && overdueObligations.length > 0 && (
        <div className="p-4 border-b">
          <OverdueTaxAlert
            count={overdueObligations.length}
            amount={overdueAmount}
            currency={currency}
            onViewOverdue={onViewDetails}
          />
        </div>
      )}

      {/* Calendar View for urgent items */}
      {showCalendar && pendingObligations.filter(o => o.daysUntilDue <= 7).length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Urgente (7 zile)</span>
            <Flag className="h-4 w-4 text-red-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingObligations
              .filter(o => o.daysUntilDue <= 7)
              .slice(0, 4)
              .map((obligation) => (
                <TaxCalendarCard
                  key={obligation.id}
                  obligation={obligation}
                  currency={currency}
                  onAction={
                    onSubmitDeclaration && obligation.declarationRequired && !obligation.declarationSubmitted
                      ? () => onSubmitDeclaration(obligation.id)
                      : onPayTax && obligation.paymentRequired && !obligation.paymentCompleted
                        ? () => onPayTax(obligation.id)
                        : undefined
                  }
                />
              ))}
          </div>
        </div>
      )}

      {/* Obligations List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Toate obligațiile</span>
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
          {pendingObligations.slice(0, maxItems).map((obligation) => (
            <TaxObligationItem
              key={obligation.id}
              obligation={obligation}
              currency={currency}
              onSubmit={onSubmitDeclaration ? () => onSubmitDeclaration(obligation.id) : undefined}
              onPay={onPayTax ? () => onPayTax(obligation.id) : undefined}
              onSetReminder={onSetReminder ? () => onSetReminder(obligation.id) : undefined}
              onView={onViewObligation ? () => onViewObligation(obligation.id) : undefined}
              compact={variant === 'standard'}
            />
          ))}
        </div>
      </div>

      {/* ANAF Quick Link */}
      {(variant === 'detailed' || variant === 'full') && onOpenAnaf && (
        <div className="p-4 border-t">
          <AnafQuickLink onOpen={onOpenAnaf} />
        </div>
      )}

      {/* Footer */}
      {onViewDetails && (
        <div className="p-4 bg-muted/30 border-t">
          <button
            onClick={onViewDetails}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Calendar fiscal complet
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default TaxObligationsWidget
