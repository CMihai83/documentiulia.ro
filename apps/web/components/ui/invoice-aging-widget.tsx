'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  FileText,
  Users,
  Building2,
  Calendar,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  Send,
  Eye,
  EyeOff,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Bell,
  DollarSign,
  Percent,
  Target,
  Timer,
  Hourglass,
  XCircle,
  Banknote,
} from 'lucide-react'

// Types
export interface AgingBucket {
  id: string
  label: string
  labelRo: string
  minDays: number
  maxDays: number | null
  amount: number
  count: number
  percentage: number
  color: string
  severity: 'good' | 'warning' | 'danger' | 'critical'
}

export interface AgingInvoice {
  id: string
  invoiceNumber: string
  clientName: string
  clientId: string
  amount: number
  dueDate: Date
  daysOverdue: number
  status: 'current' | 'overdue' | 'critical' | 'disputed'
  lastReminder?: Date
  reminderCount: number
}

export interface ClientAging {
  clientId: string
  clientName: string
  totalOutstanding: number
  overdueAmount: number
  invoiceCount: number
  avgDaysOverdue: number
  oldestInvoiceDays: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface AgingTrend {
  period: string
  current: number
  overdue30: number
  overdue60: number
  overdue90: number
  overdue90Plus: number
}

export interface InvoiceAgingWidgetProps {
  totalOutstanding: number
  totalOverdue: number
  previousOverdue?: number
  avgDaysOutstanding?: number
  currency?: string
  buckets?: AgingBucket[]
  overdueInvoices?: AgingInvoice[]
  clientAging?: ClientAging[]
  trendData?: AgingTrend[]
  collectionRate?: number
  variant?: 'compact' | 'standard' | 'detailed' | 'full'
  showChart?: boolean
  showInvoices?: boolean
  showClients?: boolean
  showTrend?: boolean
  onRefresh?: () => void
  onViewDetails?: () => void
  onSendReminder?: (invoiceId: string) => void
  onViewInvoice?: (invoiceId: string) => void
  onViewClient?: (clientId: string) => void
  isLoading?: boolean
  className?: string
}

// Default aging buckets
const defaultBuckets: AgingBucket[] = [
  {
    id: 'current',
    label: 'Current',
    labelRo: 'La termen',
    minDays: 0,
    maxDays: 0,
    amount: 0,
    count: 0,
    percentage: 0,
    color: 'bg-green-500',
    severity: 'good',
  },
  {
    id: '1-30',
    label: '1-30 Days',
    labelRo: '1-30 zile',
    minDays: 1,
    maxDays: 30,
    amount: 0,
    count: 0,
    percentage: 0,
    color: 'bg-yellow-500',
    severity: 'warning',
  },
  {
    id: '31-60',
    label: '31-60 Days',
    labelRo: '31-60 zile',
    minDays: 31,
    maxDays: 60,
    amount: 0,
    count: 0,
    percentage: 0,
    color: 'bg-orange-500',
    severity: 'danger',
  },
  {
    id: '61-90',
    label: '61-90 Days',
    labelRo: '61-90 zile',
    minDays: 61,
    maxDays: 90,
    amount: 0,
    count: 0,
    percentage: 0,
    color: 'bg-red-500',
    severity: 'critical',
  },
  {
    id: '90+',
    label: '90+ Days',
    labelRo: 'Peste 90 zile',
    minDays: 91,
    maxDays: null,
    amount: 0,
    count: 0,
    percentage: 0,
    color: 'bg-red-700',
    severity: 'critical',
  },
]

// Risk level config
const riskLevelConfig = {
  low: {
    label: 'Risc scăzut',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  medium: {
    label: 'Risc mediu',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  high: {
    label: 'Risc ridicat',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  critical: {
    label: 'Risc critic',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <XCircle className="h-3 w-3" />,
  },
}

// Invoice status config
const invoiceStatusConfig = {
  current: {
    label: 'La termen',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  overdue: {
    label: 'Restant',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="h-3 w-3" />,
  },
  critical: {
    label: 'Critic',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  disputed: {
    label: 'Contestat',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
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

// Format days
function formatDays(days: number): string {
  if (days === 0) return 'Azi'
  if (days === 1) return '1 zi'
  return `${days} zile`
}

// Aging Bar Chart
export function AgingBarChart({
  buckets,
  height = 120,
  showLabels = true,
}: {
  buckets: AgingBucket[]
  height?: number
  showLabels?: boolean
}) {
  if (!buckets || buckets.length === 0) return null

  const maxAmount = Math.max(...buckets.map(b => b.amount))

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 justify-between" style={{ height }}>
        {buckets.map((bucket) => {
          const barHeight = maxAmount > 0
            ? (bucket.amount / maxAmount) * (height - 30)
            : 0

          return (
            <div
              key={bucket.id}
              className="flex-1 flex flex-col items-center"
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={cn(
                  'w-full rounded-t-md min-h-[4px]',
                  bucket.color
                )}
              />
              {showLabels && (
                <div className="mt-2 text-center">
                  <div className="text-xs font-medium truncate max-w-[60px]">
                    {bucket.labelRo}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bucket.count}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Aging Donut Chart
export function AgingDonutChart({
  buckets,
  size = 120,
  showCenter = true,
  centerLabel,
  centerValue,
}: {
  buckets: AgingBucket[]
  size?: number
  showCenter?: boolean
  centerLabel?: string
  centerValue?: string
}) {
  const total = buckets.reduce((sum, b) => sum + b.amount, 0)
  if (total === 0) return null

  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  let currentAngle = -90 // Start from top

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {buckets.map((bucket, index) => {
          const percentage = (bucket.amount / total) * 100
          const strokeLength = (percentage / 100) * circumference
          const gapLength = circumference - strokeLength
          const rotation = currentAngle
          currentAngle += (percentage / 100) * 360

          const colorClass = bucket.color.replace('bg-', '')

          return (
            <circle
              key={bucket.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth="16"
              className={`stroke-current text-${colorClass}`}
              style={{
                strokeDasharray: `${strokeLength} ${gapLength}`,
                strokeDashoffset: 0,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center',
              }}
            />
          )
        })}
      </svg>
      {showCenter && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{centerLabel || 'Total'}</span>
          <span className="text-lg font-bold">{centerValue || buckets.reduce((s, b) => s + b.count, 0)}</span>
        </div>
      )}
    </div>
  )
}

// Bucket Summary Card
export function BucketSummaryCard({
  bucket,
  currency = 'RON',
  onClick,
}: {
  bucket: AgingBucket
  currency?: string
  onClick?: () => void
}) {
  const severityIcons = {
    good: <CheckCircle className="h-4 w-4 text-green-500" />,
    warning: <Clock className="h-4 w-4 text-yellow-500" />,
    danger: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    critical: <AlertCircle className="h-4 w-4 text-red-500" />,
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border text-left transition-colors hover:bg-muted/50',
        bucket.severity === 'critical' && 'border-red-200 dark:border-red-800',
        bucket.severity === 'danger' && 'border-orange-200 dark:border-orange-800'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', bucket.color)} />
          <span className="text-sm font-medium">{bucket.labelRo}</span>
        </div>
        {severityIcons[bucket.severity]}
      </div>
      <div className="text-lg font-bold">{formatCurrency(bucket.amount, currency)}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
        <span>{bucket.count} facturi</span>
        <span>{bucket.percentage.toFixed(1)}%</span>
      </div>
    </button>
  )
}

// Overdue Invoice Row
export function OverdueInvoiceRow({
  invoice,
  currency = 'RON',
  onSendReminder,
  onViewInvoice,
  compact = false,
}: {
  invoice: AgingInvoice
  currency?: string
  onSendReminder?: () => void
  onViewInvoice?: () => void
  compact?: boolean
}) {
  const status = invoiceStatusConfig[invoice.status]

  return (
    <div className={cn(
      'flex items-center justify-between py-3',
      !compact && 'border-b border-border/50 last:border-0'
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          'p-2 rounded-lg',
          invoice.daysOverdue > 60
            ? 'bg-red-100 dark:bg-red-900/30'
            : invoice.daysOverdue > 30
              ? 'bg-orange-100 dark:bg-orange-900/30'
              : 'bg-yellow-100 dark:bg-yellow-900/30'
        )}>
          <FileText className={cn(
            'h-4 w-4',
            invoice.daysOverdue > 60
              ? 'text-red-600 dark:text-red-400'
              : invoice.daysOverdue > 30
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-yellow-600 dark:text-yellow-400'
          )} />
        </div>
        {!compact && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{invoice.invoiceNumber}</span>
              <span className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs',
                status.color
              )}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="truncate">{invoice.clientName}</span>
              <span>•</span>
              <span className={cn(
                'font-medium',
                invoice.daysOverdue > 60
                  ? 'text-red-600 dark:text-red-400'
                  : invoice.daysOverdue > 30
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-yellow-600 dark:text-yellow-400'
              )}>
                {formatDays(invoice.daysOverdue)} restanță
              </span>
              {invoice.reminderCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    {invoice.reminderCount} notificări
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold">{formatCurrency(invoice.amount, currency)}</span>
        {!compact && (
          <div className="flex items-center gap-1">
            {onSendReminder && (
              <button
                onClick={(e) => { e.stopPropagation(); onSendReminder(); }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                title="Trimite notificare"
              >
                <Send className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            {onViewInvoice && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewInvoice(); }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                title="Vezi factura"
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

// Client Aging Row
export function ClientAgingRow({
  client,
  currency = 'RON',
  onViewClient,
}: {
  client: ClientAging
  currency?: string
  onViewClient?: () => void
}) {
  const risk = riskLevelConfig[client.riskLevel]

  return (
    <button
      onClick={onViewClient}
      className="w-full flex items-center justify-between py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-muted">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{client.clientName}</span>
            <span className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs',
              risk.color
            )}>
              {risk.icon}
              {risk.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{client.invoiceCount} facturi</span>
            <span>•</span>
            <span>Media: {Math.round(client.avgDaysOverdue)} zile</span>
            <span>•</span>
            <span>Max: {client.oldestInvoiceDays} zile</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">{formatCurrency(client.totalOutstanding, currency)}</div>
        <div className="text-xs text-red-600 dark:text-red-400">
          {formatCurrency(client.overdueAmount, currency)} restant
        </div>
      </div>
    </button>
  )
}

// Aging Summary Stats
export function AgingSummaryStats({
  totalOutstanding,
  totalOverdue,
  avgDaysOutstanding,
  collectionRate,
  currency = 'RON',
}: {
  totalOutstanding: number
  totalOverdue: number
  avgDaysOutstanding?: number
  collectionRate?: number
  currency?: string
}) {
  const overduePercentage = totalOutstanding > 0
    ? (totalOverdue / totalOutstanding) * 100
    : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 mb-1">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">De încasat</span>
        </div>
        <div className="text-lg font-bold">{formatCurrency(totalOutstanding, currency)}</div>
      </div>
      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-red-500" />
          <span className="text-xs text-muted-foreground">Restanțe</span>
        </div>
        <div className="text-lg font-bold text-red-600 dark:text-red-400">
          {formatCurrency(totalOverdue, currency)}
        </div>
        <div className="text-xs text-red-600/70 dark:text-red-400/70">
          {overduePercentage.toFixed(1)}% din total
        </div>
      </div>
      {avgDaysOutstanding !== undefined && (
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Medie zile</span>
          </div>
          <div className="text-lg font-bold">{Math.round(avgDaysOutstanding)}</div>
          <div className="text-xs text-muted-foreground">DSO</div>
        </div>
      )}
      {collectionRate !== undefined && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Încasare</span>
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {collectionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-green-600/70 dark:text-green-400/70">
            Rata de încasare
          </div>
        </div>
      )}
    </div>
  )
}

// Main Invoice Aging Widget
export function InvoiceAgingWidget({
  totalOutstanding,
  totalOverdue,
  previousOverdue,
  avgDaysOutstanding,
  currency = 'RON',
  buckets = defaultBuckets,
  overdueInvoices = [],
  clientAging = [],
  trendData = [],
  collectionRate,
  variant = 'standard',
  showChart = true,
  showInvoices = true,
  showClients = false,
  showTrend = false,
  onRefresh,
  onViewDetails,
  onSendReminder,
  onViewInvoice,
  onViewClient,
  isLoading = false,
  className,
}: InvoiceAgingWidgetProps) {
  const [hideAmount, setHideAmount] = React.useState(false)

  const change = previousOverdue !== undefined
    ? calculateChange(totalOverdue, previousOverdue)
    : undefined

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
              <Hourglass className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="font-medium">Vechime facturi</span>
          </div>
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-sm',
              change <= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}>
              {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatPercentage(change)}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
          {hideAmount ? '••••••' : formatCurrency(totalOverdue, currency)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          din {formatCurrency(totalOutstanding, currency)} de încasat
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
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Hourglass className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold">Vechime facturi</h3>
              <p className="text-xs text-muted-foreground">Analiză restanțe</p>
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
        <AgingSummaryStats
          totalOutstanding={totalOutstanding}
          totalOverdue={totalOverdue}
          avgDaysOutstanding={avgDaysOutstanding}
          collectionRate={collectionRate}
          currency={currency}
        />
      </div>

      {/* Chart */}
      {showChart && buckets.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Distribuție pe vechime</span>
            <div className="flex items-center gap-2">
              {buckets.slice(0, 4).map((bucket) => (
                <div key={bucket.id} className="flex items-center gap-1 text-xs">
                  <div className={cn('w-2 h-2 rounded-full', bucket.color)} />
                  <span className="text-muted-foreground">{bucket.labelRo}</span>
                </div>
              ))}
            </div>
          </div>
          <AgingBarChart buckets={buckets} height={120} />
        </div>
      )}

      {/* Buckets Grid */}
      {buckets.length > 0 && (
        <div className="p-4 border-b">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {buckets.map((bucket) => (
              <BucketSummaryCard
                key={bucket.id}
                bucket={bucket}
                currency={currency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Overdue Invoices */}
      {showInvoices && overdueInvoices.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Facturi restante</span>
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
            {overdueInvoices.slice(0, variant === 'full' ? 10 : 5).map((invoice) => (
              <OverdueInvoiceRow
                key={invoice.id}
                invoice={invoice}
                currency={currency}
                onSendReminder={onSendReminder ? () => onSendReminder(invoice.id) : undefined}
                onViewInvoice={onViewInvoice ? () => onViewInvoice(invoice.id) : undefined}
                compact={variant === 'standard'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Client Aging */}
      {showClients && clientAging.length > 0 && (variant === 'detailed' || variant === 'full') && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Clienți cu restanțe</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            {clientAging.slice(0, 5).map((client) => (
              <ClientAgingRow
                key={client.clientId}
                client={client}
                currency={currency}
                onViewClient={onViewClient ? () => onViewClient(client.clientId) : undefined}
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
            Raport detaliat vechime
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Aging Alert Banner
export function AgingAlertBanner({
  criticalAmount,
  criticalCount,
  currency = 'RON',
  onViewDetails,
  className,
}: {
  criticalAmount: number
  criticalCount: number
  currency?: string
  onViewDetails?: () => void
  className?: string
}) {
  if (criticalCount === 0) return null

  return (
    <div className={cn(
      'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="font-medium text-red-800 dark:text-red-200">
              {criticalCount} facturi critice (&gt;90 zile)
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {formatCurrency(criticalAmount, currency)} în risc de neîncasare
            </div>
          </div>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Acțiune imediată
          </button>
        )}
      </div>
    </div>
  )
}

// Collection Performance Card
export function CollectionPerformanceCard({
  collected,
  target,
  period,
  currency = 'RON',
  className,
}: {
  collected: number
  target: number
  period: string
  currency?: string
  className?: string
}) {
  const percentage = (collected / target) * 100
  const isOnTrack = percentage >= 80

  return (
    <div className={cn(
      'p-4 rounded-xl border bg-card',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Performanță încasări</span>
        <span className="text-xs text-muted-foreground">{period}</span>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 1 }}
              className={cn(
                'h-full rounded-full',
                isOnTrack ? 'bg-green-500' : 'bg-yellow-500'
              )}
            />
          </div>
        </div>
        <span className={cn(
          'text-sm font-semibold',
          isOnTrack ? 'text-green-600' : 'text-yellow-600'
        )}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Încasat: <strong>{formatCurrency(collected, currency)}</strong>
        </span>
        <span className="text-muted-foreground">
          Țintă: {formatCurrency(target, currency)}
        </span>
      </div>
    </div>
  )
}

export default InvoiceAgingWidget
