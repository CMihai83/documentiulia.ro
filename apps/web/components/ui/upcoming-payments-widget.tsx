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
  CreditCard,
  Banknote,
  Building2,
  Users,
  FileText,
  Receipt,
  Zap,
  Bell,
  BellRing,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  CalendarClock,
  Wallet,
  Send,
  Timer,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

// Types
export type PaymentType = 'invoice' | 'bill' | 'salary' | 'tax' | 'subscription' | 'loan' | 'rent' | 'utility' | 'other'
export type PaymentStatus = 'scheduled' | 'pending' | 'overdue' | 'paid' | 'cancelled'
export type PaymentPriority = 'low' | 'medium' | 'high' | 'critical'

export interface UpcomingPayment {
  id: string
  title: string
  description?: string
  amount: number
  dueDate: Date
  type: PaymentType
  status: PaymentStatus
  priority: PaymentPriority
  recipient?: string
  recipientType?: 'vendor' | 'employee' | 'government' | 'bank' | 'service'
  isRecurring?: boolean
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  autoPayEnabled?: boolean
  reminderSent?: boolean
  daysUntilDue: number
  relatedDocumentId?: string
  relatedDocumentType?: 'invoice' | 'bill' | 'contract'
}

export interface PaymentSummary {
  today: number
  thisWeek: number
  thisMonth: number
  overdue: number
  totalCount: number
}

export interface PaymentsByPeriod {
  period: string
  date: Date
  amount: number
  count: number
  payments: UpcomingPayment[]
}

export interface UpcomingPaymentsWidgetProps {
  payments: UpcomingPayment[]
  summary?: PaymentSummary
  groupedPayments?: PaymentsByPeriod[]
  currency?: string
  variant?: 'compact' | 'standard' | 'detailed' | 'full'
  showGrouped?: boolean
  showOverdueAlert?: boolean
  maxItems?: number
  onRefresh?: () => void
  onViewDetails?: () => void
  onPayNow?: (paymentId: string) => void
  onSchedulePayment?: (paymentId: string) => void
  onSetReminder?: (paymentId: string) => void
  onViewPayment?: (paymentId: string) => void
  isLoading?: boolean
  className?: string
}

// Payment type icons
const paymentTypeIcons: Record<PaymentType, React.ReactNode> = {
  invoice: <FileText className="h-4 w-4" />,
  bill: <Receipt className="h-4 w-4" />,
  salary: <Users className="h-4 w-4" />,
  tax: <Building2 className="h-4 w-4" />,
  subscription: <Zap className="h-4 w-4" />,
  loan: <Banknote className="h-4 w-4" />,
  rent: <Building2 className="h-4 w-4" />,
  utility: <Zap className="h-4 w-4" />,
  other: <CreditCard className="h-4 w-4" />,
}

// Payment type colors
const paymentTypeColors: Record<PaymentType, string> = {
  invoice: 'bg-blue-500',
  bill: 'bg-orange-500',
  salary: 'bg-green-500',
  tax: 'bg-red-500',
  subscription: 'bg-purple-500',
  loan: 'bg-yellow-500',
  rent: 'bg-indigo-500',
  utility: 'bg-cyan-500',
  other: 'bg-gray-500',
}

// Payment type labels in Romanian
const paymentTypeLabels: Record<PaymentType, string> = {
  invoice: 'Factură',
  bill: 'Factură furnizor',
  salary: 'Salariu',
  tax: 'Taxă/Impozit',
  subscription: 'Abonament',
  loan: 'Rată credit',
  rent: 'Chirie',
  utility: 'Utilități',
  other: 'Altele',
}

// Priority config
const priorityConfig: Record<PaymentPriority, { label: string; color: string; bgColor: string }> = {
  low: {
    label: 'Scăzută',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  medium: {
    label: 'Medie',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  high: {
    label: 'Ridicată',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  critical: {
    label: 'Critică',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
}

// Status config
const statusConfig: Record<PaymentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: {
    label: 'Programat',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <CalendarClock className="h-3 w-3" />,
  },
  pending: {
    label: 'În așteptare',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="h-3 w-3" />,
  },
  overdue: {
    label: 'Restant',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  paid: {
    label: 'Plătit',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Anulat',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    icon: <AlertCircle className="h-3 w-3" />,
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
  })
}

// Format relative date
function formatRelativeDate(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return `${Math.abs(daysUntilDue)} zile restanță`
  }
  if (daysUntilDue === 0) {
    return 'Azi'
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

// Get urgency color
function getUrgencyColor(daysUntilDue: number): string {
  if (daysUntilDue < 0) return 'text-red-600 dark:text-red-400'
  if (daysUntilDue === 0) return 'text-red-600 dark:text-red-400'
  if (daysUntilDue <= 3) return 'text-orange-600 dark:text-orange-400'
  if (daysUntilDue <= 7) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-muted-foreground'
}

// Payment Summary Stats
export function PaymentSummaryStats({
  summary,
  currency = 'RON',
}: {
  summary: PaymentSummary
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
          {formatCurrency(summary.overdue, currency)}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-orange-500" />
          <span className="text-xs text-muted-foreground">Azi</span>
        </div>
        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
          {formatCurrency(summary.today, currency)}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-4 w-4 text-yellow-500" />
          <span className="text-xs text-muted-foreground">Săptămâna</span>
        </div>
        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
          {formatCurrency(summary.thisWeek, currency)}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">Luna</span>
        </div>
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {formatCurrency(summary.thisMonth, currency)}
        </div>
      </div>
    </div>
  )
}

// Payment Item
export function PaymentItem({
  payment,
  currency = 'RON',
  onPayNow,
  onSetReminder,
  onViewPayment,
  compact = false,
}: {
  payment: UpcomingPayment
  currency?: string
  onPayNow?: () => void
  onSetReminder?: () => void
  onViewPayment?: () => void
  compact?: boolean
}) {
  const typeIcon = paymentTypeIcons[payment.type]
  const typeColor = paymentTypeColors[payment.type]
  const typeLabel = paymentTypeLabels[payment.type]
  const status = statusConfig[payment.status]
  const priority = priorityConfig[payment.priority]
  const urgencyColor = getUrgencyColor(payment.daysUntilDue)

  return (
    <div className={cn(
      'flex items-center justify-between py-3',
      !compact && 'border-b border-border/50 last:border-0'
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn('p-2 rounded-lg text-white', typeColor)}>
          {typeIcon}
        </div>
        {!compact && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{payment.title}</span>
              {payment.isRecurring && (
                <span className="text-xs text-muted-foreground">(recurent)</span>
              )}
              {payment.autoPayEnabled && (
                <span title="Plată automată">
                  <Zap className="h-3 w-3 text-green-500" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                status.color
              )}>
                {status.icon}
                {status.label}
              </span>
              <span>•</span>
              <span className={urgencyColor}>
                {formatRelativeDate(payment.daysUntilDue)}
              </span>
              {payment.recipient && (
                <>
                  <span>•</span>
                  <span className="truncate">{payment.recipient}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(payment.amount, currency)}</div>
          {!compact && (
            <div className="text-xs text-muted-foreground">
              {formatDate(payment.dueDate)}
            </div>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-1">
            {onPayNow && payment.status !== 'paid' && (
              <button
                onClick={(e) => { e.stopPropagation(); onPayNow(); }}
                className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                title="Plătește acum"
              >
                <Send className="h-4 w-4 text-green-600 dark:text-green-400" />
              </button>
            )}
            {onSetReminder && !payment.reminderSent && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetReminder(); }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                title="Setează reminder"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {onViewPayment && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewPayment(); }}
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

// Grouped Payments Section
export function GroupedPaymentsSection({
  group,
  currency = 'RON',
  onPayNow,
  onViewPayment,
}: {
  group: PaymentsByPeriod
  currency?: string
  onPayNow?: (id: string) => void
  onViewPayment?: (id: string) => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(true)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{group.period}</span>
          <span className="text-xs text-muted-foreground">
            ({group.count} plăți)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{formatCurrency(group.amount, currency)}</span>
          <ChevronRight className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )} />
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-1">
              {group.payments.map((payment) => (
                <PaymentItem
                  key={payment.id}
                  payment={payment}
                  currency={currency}
                  onPayNow={onPayNow ? () => onPayNow(payment.id) : undefined}
                  onViewPayment={onViewPayment ? () => onViewPayment(payment.id) : undefined}
                  compact
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Overdue Alert Banner
export function OverdueAlertBanner({
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
              {count} plăți restante
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Total: {formatCurrency(amount, currency)}
            </div>
          </div>
        </div>
        {onViewOverdue && (
          <button
            onClick={onViewOverdue}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Vezi restanțe
          </button>
        )}
      </div>
    </motion.div>
  )
}

// Quick Pay Card
export function QuickPayCard({
  payment,
  currency = 'RON',
  onPay,
}: {
  payment: UpcomingPayment
  currency?: string
  onPay?: () => void
}) {
  const typeIcon = paymentTypeIcons[payment.type]
  const typeColor = paymentTypeColors[payment.type]
  const urgencyColor = getUrgencyColor(payment.daysUntilDue)

  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg text-white', typeColor)}>
            {typeIcon}
          </div>
          <div>
            <div className="font-medium">{payment.title}</div>
            <div className={cn('text-xs', urgencyColor)}>
              {formatRelativeDate(payment.daysUntilDue)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">{formatCurrency(payment.amount, currency)}</div>
        {onPay && (
          <button
            onClick={onPay}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Plătește
          </button>
        )}
      </div>
    </div>
  )
}

// Main Widget
export function UpcomingPaymentsWidget({
  payments,
  summary,
  groupedPayments,
  currency = 'RON',
  variant = 'standard',
  showGrouped = false,
  showOverdueAlert = true,
  maxItems = 5,
  onRefresh,
  onViewDetails,
  onPayNow,
  onSchedulePayment,
  onSetReminder,
  onViewPayment,
  isLoading = false,
  className,
}: UpcomingPaymentsWidgetProps) {
  const [hideAmount, setHideAmount] = React.useState(false)

  const overduePayments = payments.filter(p => p.status === 'overdue')
  const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)
  const upcomingPayments = payments
    .filter(p => p.status !== 'paid' && p.status !== 'cancelled')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  const totalUpcoming = upcomingPayments.reduce((sum, p) => sum + p.amount, 0)

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
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <CalendarClock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="font-medium">Plăți următoare</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {upcomingPayments.length} plăți
          </span>
        </div>
        <div className="text-2xl font-bold">
          {hideAmount ? '••••••' : formatCurrency(totalUpcoming, currency)}
        </div>
        {overduePayments.length > 0 && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {overduePayments.length} restante
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
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <CalendarClock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold">Plăți următoare</h3>
              <p className="text-xs text-muted-foreground">
                {upcomingPayments.length} plăți programate
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
          <PaymentSummaryStats summary={summary} currency={currency} />
        )}
      </div>

      {/* Overdue Alert */}
      {showOverdueAlert && overduePayments.length > 0 && (
        <div className="p-4 border-b">
          <OverdueAlertBanner
            count={overduePayments.length}
            amount={overdueAmount}
            currency={currency}
            onViewOverdue={onViewDetails}
          />
        </div>
      )}

      {/* Grouped or List View */}
      {showGrouped && groupedPayments && groupedPayments.length > 0 ? (
        <div className="p-4 space-y-3">
          {groupedPayments.map((group, index) => (
            <GroupedPaymentsSection
              key={index}
              group={group}
              currency={currency}
              onPayNow={onPayNow}
              onViewPayment={onViewPayment}
            />
          ))}
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Următoarele plăți</span>
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
            {upcomingPayments.slice(0, maxItems).map((payment) => (
              <PaymentItem
                key={payment.id}
                payment={payment}
                currency={currency}
                onPayNow={onPayNow ? () => onPayNow(payment.id) : undefined}
                onSetReminder={onSetReminder ? () => onSetReminder(payment.id) : undefined}
                onViewPayment={onViewPayment ? () => onViewPayment(payment.id) : undefined}
                compact={variant === 'standard'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Pay Section (for detailed/full variants) */}
      {(variant === 'detailed' || variant === 'full') && upcomingPayments.length > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Plată rapidă</span>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingPayments
              .filter(p => p.daysUntilDue <= 3 && p.status !== 'paid')
              .slice(0, 2)
              .map((payment) => (
                <QuickPayCard
                  key={payment.id}
                  payment={payment}
                  currency={currency}
                  onPay={onPayNow ? () => onPayNow(payment.id) : undefined}
                />
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
            <Calendar className="h-4 w-4" />
            Calendar plăți
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Payment Calendar Mini
export function PaymentCalendarMini({
  payments,
  currency = 'RON',
  onDayClick,
  className,
}: {
  payments: UpcomingPayment[]
  currency?: string
  onDayClick?: (date: Date) => void
  className?: string
}) {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  // Group payments by day
  const paymentsByDay: Record<number, UpcomingPayment[]> = {}
  payments.forEach(payment => {
    const day = payment.dueDate.getDate()
    if (payment.dueDate.getMonth() === today.getMonth()) {
      if (!paymentsByDay[day]) paymentsByDay[day] = []
      paymentsByDay[day].push(payment)
    }
  })

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  return (
    <div className={cn('p-4 rounded-xl border bg-card', className)}>
      <div className="text-sm font-medium mb-3">
        {today.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
          <div key={i} className="text-center text-muted-foreground py-1">
            {day}
          </div>
        ))}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const hasPayments = paymentsByDay[day]?.length > 0
          const isToday = day === today.getDate()
          const isPast = day < today.getDate()
          const totalAmount = paymentsByDay[day]?.reduce((sum, p) => sum + p.amount, 0) || 0

          return (
            <button
              key={day}
              onClick={() => onDayClick?.(new Date(today.getFullYear(), today.getMonth(), day))}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors',
                isToday && 'bg-primary text-primary-foreground',
                !isToday && hasPayments && 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                !isToday && !hasPayments && 'hover:bg-muted',
                isPast && !hasPayments && 'text-muted-foreground'
              )}
              title={hasPayments ? `${paymentsByDay[day].length} plăți: ${formatCurrency(totalAmount, currency)}` : undefined}
            >
              <span>{day}</span>
              {hasPayments && !isToday && (
                <span className="w-1 h-1 rounded-full bg-current mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default UpcomingPaymentsWidget
