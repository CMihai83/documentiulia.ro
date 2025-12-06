'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CalendarDays,
  CalendarClock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bell,
  BellRing,
  FileText,
  Receipt,
  CreditCard,
  Building2,
  Users,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Filter,
  Search,
  Download,
  Plus,
  Eye,
  X,
  Repeat,
  Flag
} from 'lucide-react'

// ============================================================================
// Types & Interfaces
// ============================================================================

export type DeadlineType =
  | 'tva'           // TVA declaration
  | 'tva_payment'   // TVA payment
  | 'impozit_profit'// Profit tax
  | 'impozit_venit' // Income tax
  | 'contributii'   // Social contributions (CAS, CASS)
  | 'declaratie_112'// Form 112
  | 'declaratie_100'// Form 100
  | 'declaratie_101'// Form 101
  | 'declaratie_300'// Form 300 (TVA)
  | 'declaratie_390'// Form 390 (Recapitulative)
  | 'd406'          // SAF-T
  | 'efactura'      // E-Factura
  | 'inventar'      // Inventory
  | 'bilant'        // Balance sheet
  | 'raport_anual'  // Annual report
  | 'salarii'       // Salaries
  | 'custom'        // Custom deadline

export type DeadlineStatus =
  | 'upcoming'      // More than 7 days away
  | 'due_soon'      // 3-7 days away
  | 'urgent'        // 1-3 days away
  | 'due_today'     // Due today
  | 'overdue'       // Past due
  | 'completed'     // Completed
  | 'cancelled'     // Cancelled

export type DeadlinePriority = 'low' | 'medium' | 'high' | 'critical'

export type RecurrenceType = 'none' | 'monthly' | 'quarterly' | 'yearly'

export interface FiscalDeadline {
  id: string
  type: DeadlineType
  title: string
  description?: string
  dueDate: Date
  status: DeadlineStatus
  priority: DeadlinePriority
  amount?: number
  recurrence: RecurrenceType
  formCode?: string
  anafLink?: string
  reminderDays?: number[]
  completedAt?: Date
  completedBy?: string
  notes?: string
  attachments?: string[]
  isCustom?: boolean
}

export interface FiscalMonth {
  month: number
  year: number
  deadlines: FiscalDeadline[]
}

// ============================================================================
// Configuration
// ============================================================================

const deadlineTypeConfig: Record<DeadlineType, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  tva: {
    label: 'Declarație TVA',
    icon: Receipt,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  tva_payment: {
    label: 'Plată TVA',
    icon: CreditCard,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  impozit_profit: {
    label: 'Impozit Profit',
    icon: Building2,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  },
  impozit_venit: {
    label: 'Impozit Venit',
    icon: Wallet,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
  },
  contributii: {
    label: 'Contribuții Sociale',
    icon: Users,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20'
  },
  declaratie_112: {
    label: 'Declarația 112',
    icon: FileText,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20'
  },
  declaratie_100: {
    label: 'Declarația 100',
    icon: FileText,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20'
  },
  declaratie_101: {
    label: 'Declarația 101',
    icon: FileText,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20'
  },
  declaratie_300: {
    label: 'Declarația 300',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  declaratie_390: {
    label: 'Declarația 390',
    icon: FileText,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20'
  },
  d406: {
    label: 'SAF-T (D406)',
    icon: FileText,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20'
  },
  efactura: {
    label: 'E-Factura',
    icon: Receipt,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
  },
  inventar: {
    label: 'Inventar',
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20'
  },
  bilant: {
    label: 'Bilanț',
    icon: FileText,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20'
  },
  raport_anual: {
    label: 'Raport Anual',
    icon: FileText,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20'
  },
  salarii: {
    label: 'Salarii',
    icon: Users,
    color: 'text-lime-600 dark:text-lime-400',
    bgColor: 'bg-lime-50 dark:bg-lime-900/20'
  },
  custom: {
    label: 'Personalizat',
    icon: Flag,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800'
  }
}

const statusConfig: Record<DeadlineStatus, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  upcoming: {
    label: 'În așteptare',
    icon: Clock,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700'
  },
  due_soon: {
    label: 'Termen apropiat',
    icon: CalendarClock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  due_today: {
    label: 'Scadent azi',
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  overdue: {
    label: 'Întârziat',
    icon: AlertCircle,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700'
  },
  completed: {
    label: 'Finalizat',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  cancelled: {
    label: 'Anulat',
    icon: X,
    color: 'text-gray-500 dark:text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700'
  }
}

const priorityConfig: Record<DeadlinePriority, {
  label: string
  color: string
  dotColor: string
}> = {
  low: {
    label: 'Scăzută',
    color: 'text-gray-500',
    dotColor: 'bg-gray-400'
  },
  medium: {
    label: 'Medie',
    color: 'text-blue-500',
    dotColor: 'bg-blue-500'
  },
  high: {
    label: 'Ridicată',
    color: 'text-orange-500',
    dotColor: 'bg-orange-500'
  },
  critical: {
    label: 'Critică',
    color: 'text-red-500',
    dotColor: 'bg-red-500'
  }
}

const recurrenceConfig: Record<RecurrenceType, {
  label: string
  shortLabel: string
}> = {
  none: { label: 'O singură dată', shortLabel: 'O dată' },
  monthly: { label: 'Lunar', shortLabel: 'Lunar' },
  quarterly: { label: 'Trimestrial', shortLabel: 'Trim.' },
  yearly: { label: 'Anual', shortLabel: 'Anual' }
}

const monthNames = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

function getDaysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getDeadlineStatus(deadline: FiscalDeadline): DeadlineStatus {
  if (deadline.status === 'completed' || deadline.status === 'cancelled') {
    return deadline.status
  }

  const daysUntil = getDaysUntil(deadline.dueDate)

  if (daysUntil < 0) return 'overdue'
  if (daysUntil === 0) return 'due_today'
  if (daysUntil <= 3) return 'urgent'
  if (daysUntil <= 7) return 'due_soon'
  return 'upcoming'
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// ============================================================================
// Sub-Components
// ============================================================================

interface DeadlineTypeBadgeProps {
  type: DeadlineType
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function DeadlineTypeBadge({
  type,
  size = 'md',
  showLabel = true,
  className
}: DeadlineTypeBadgeProps) {
  const config = deadlineTypeConfig[type]
  const Icon = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      config.bgColor,
      config.color,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      className
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

interface DeadlineStatusBadgeProps {
  status: DeadlineStatus
  size?: 'sm' | 'md'
  className?: string
}

export function DeadlineStatusBadge({
  status,
  size = 'md',
  className
}: DeadlineStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      config.bgColor,
      config.color,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      className
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      <span>{config.label}</span>
    </span>
  )
}

interface PriorityIndicatorProps {
  priority: DeadlinePriority
  showLabel?: boolean
  className?: string
}

export function PriorityIndicator({
  priority,
  showLabel = false,
  className
}: PriorityIndicatorProps) {
  const config = priorityConfig[priority]

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      )}
    </span>
  )
}

interface DaysCountdownProps {
  dueDate: Date
  status: DeadlineStatus
  className?: string
}

export function DaysCountdown({
  dueDate,
  status,
  className
}: DaysCountdownProps) {
  const daysUntil = getDaysUntil(dueDate)

  if (status === 'completed' || status === 'cancelled') {
    return null
  }

  let text: string
  let colorClass: string

  if (daysUntil < 0) {
    const daysOverdue = Math.abs(daysUntil)
    text = `${daysOverdue} ${daysOverdue === 1 ? 'zi' : 'zile'} întârziere`
    colorClass = 'text-red-600 dark:text-red-400'
  } else if (daysUntil === 0) {
    text = 'Scadent azi!'
    colorClass = 'text-red-600 dark:text-red-400'
  } else if (daysUntil === 1) {
    text = 'Mâine'
    colorClass = 'text-orange-600 dark:text-orange-400'
  } else if (daysUntil <= 3) {
    text = `${daysUntil} zile rămase`
    colorClass = 'text-orange-600 dark:text-orange-400'
  } else if (daysUntil <= 7) {
    text = `${daysUntil} zile rămase`
    colorClass = 'text-yellow-600 dark:text-yellow-400'
  } else {
    text = `${daysUntil} zile rămase`
    colorClass = 'text-gray-600 dark:text-gray-400'
  }

  return (
    <span className={cn('text-sm font-medium', colorClass, className)}>
      {text}
    </span>
  )
}

// ============================================================================
// Main Component - Deadline Card
// ============================================================================

interface DeadlineCardProps {
  deadline: FiscalDeadline
  variant?: 'default' | 'compact' | 'detailed'
  onComplete?: (deadline: FiscalDeadline) => void
  onView?: (deadline: FiscalDeadline) => void
  onSetReminder?: (deadline: FiscalDeadline) => void
  className?: string
}

export function DeadlineCard({
  deadline,
  variant = 'default',
  onComplete,
  onView,
  onSetReminder,
  className
}: DeadlineCardProps) {
  const typeConfig = deadlineTypeConfig[deadline.type]
  const currentStatus = getDeadlineStatus(deadline)
  const statusConf = statusConfig[currentStatus]
  const Icon = typeConfig.icon

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3',
          statusConf.borderColor,
          statusConf.bgColor,
          className
        )}
      >
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          typeConfig.bgColor
        )}>
          <Icon className={cn('h-4 w-4', typeConfig.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {deadline.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatShortDate(deadline.dueDate)}
          </p>
        </div>

        <DaysCountdown dueDate={deadline.dueDate} status={currentStatus} />
      </motion.div>
    )
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-xl border p-5',
          statusConf.borderColor,
          'bg-white dark:bg-gray-900',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              typeConfig.bgColor
            )}>
              <Icon className={cn('h-6 w-6', typeConfig.color)} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {deadline.title}
                </h3>
                <PriorityIndicator priority={deadline.priority} />
              </div>

              {deadline.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {deadline.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <DeadlineTypeBadge type={deadline.type} size="sm" />
                <DeadlineStatusBadge status={currentStatus} size="sm" />
                {deadline.recurrence !== 'none' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    <Repeat className="h-3 w-3" />
                    {recurrenceConfig[deadline.recurrence].shortLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(deadline.dueDate)}
            </p>
            <DaysCountdown dueDate={deadline.dueDate} status={currentStatus} />
            {deadline.amount !== undefined && (
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(deadline.amount)}
              </p>
            )}
          </div>
        </div>

        {deadline.formCode && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Formular: <span className="font-medium">{deadline.formCode}</span>
            </span>
            {deadline.anafLink && (
              <a
                href={deadline.anafLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                ANAF <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {deadline.notes && (
          <div className="mt-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {deadline.notes}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t pt-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {deadline.reminderDays && deadline.reminderDays.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Bell className="h-3 w-3" />
                Memento: {deadline.reminderDays.join(', ')} zile înainte
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSetReminder && currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
              <button
                onClick={() => onSetReminder(deadline)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <BellRing className="h-4 w-4" />
                Memento
              </button>
            )}
            {onView && (
              <button
                onClick={() => onView(deadline)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Eye className="h-4 w-4" />
                Detalii
              </button>
            )}
            {onComplete && currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
              <button
                onClick={() => onComplete(deadline)}
                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Finalizează
              </button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'rounded-xl border p-4 transition-shadow hover:shadow-md',
        statusConf.borderColor,
        'bg-white dark:bg-gray-900',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          typeConfig.bgColor
        )}>
          <Icon className={cn('h-5 w-5', typeConfig.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {deadline.title}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {formatDate(deadline.dueDate)}
              </p>
            </div>
            <PriorityIndicator priority={deadline.priority} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeadlineStatusBadge status={currentStatus} size="sm" />
            <DaysCountdown dueDate={deadline.dueDate} status={currentStatus} />
          </div>

          {deadline.amount !== undefined && (
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(deadline.amount)}
            </p>
          )}
        </div>
      </div>

      {(onComplete || onView) && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3 dark:border-gray-800">
          {onView && (
            <button
              onClick={() => onView(deadline)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Eye className="h-4 w-4" />
              Detalii
            </button>
          )}
          {onComplete && currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
            <button
              onClick={() => onComplete(deadline)}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizează
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Calendar View Component
// ============================================================================

interface FiscalCalendarViewProps {
  deadlines: FiscalDeadline[]
  initialMonth?: number
  initialYear?: number
  onDeadlineClick?: (deadline: FiscalDeadline) => void
  onAddDeadline?: (date: Date) => void
  className?: string
}

export function FiscalCalendarView({
  deadlines,
  initialMonth = new Date().getMonth(),
  initialYear = new Date().getFullYear(),
  onDeadlineClick,
  onAddDeadline,
  className
}: FiscalCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [currentYear, setCurrentYear] = useState(initialYear)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, FiscalDeadline[]>()

    deadlines.forEach(deadline => {
      const date = new Date(deadline.dueDate)
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        const key = date.getDate().toString()
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(deadline)
      }
    })

    return map
  }, [deadlines, currentMonth, currentYear])

  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }, [currentMonth, currentYear])

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }, [currentMonth, currentYear])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }, [])

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  const selectedDateDeadlines = selectedDate
    ? deadlinesByDate.get(selectedDate.getDate().toString()) || []
    : []

  return (
    <div className={cn('rounded-xl border bg-white p-6 dark:border-gray-800 dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToToday}
            className="rounded-lg border px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Astăzi
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {dayNames.map(day => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before first day of month */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayDeadlines = deadlinesByDate.get(day.toString()) || []
          const hasDeadlines = dayDeadlines.length > 0
          const hasUrgent = dayDeadlines.some(d => {
            const status = getDeadlineStatus(d)
            return status === 'urgent' || status === 'due_today' || status === 'overdue'
          })
          const isSelected = selectedDate?.getDate() === day &&
            selectedDate?.getMonth() === currentMonth &&
            selectedDate?.getFullYear() === currentYear

          return (
            <button
              key={day}
              onClick={() => {
                const date = new Date(currentYear, currentMonth, day)
                setSelectedDate(date)
              }}
              className={cn(
                'aspect-square rounded-lg p-1 text-sm transition-colors',
                isToday(day) && 'ring-2 ring-blue-500',
                isSelected && 'bg-blue-100 dark:bg-blue-900/30',
                !isSelected && 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <div className={cn(
                'flex h-full flex-col items-center justify-center',
                isToday(day) && 'font-bold text-blue-600 dark:text-blue-400'
              )}>
                <span>{day}</span>
                {hasDeadlines && (
                  <div className="mt-1 flex gap-0.5">
                    {dayDeadlines.slice(0, 3).map((deadline, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          hasUrgent ? 'bg-red-500' : 'bg-blue-500'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected date deadlines */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 border-t pt-6 dark:border-gray-800"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {formatDate(selectedDate)}
              </h3>
              {onAddDeadline && (
                <button
                  onClick={() => onAddDeadline(selectedDate)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Adaugă termen
                </button>
              )}
            </div>

            {selectedDateDeadlines.length > 0 ? (
              <div className="space-y-3">
                {selectedDateDeadlines.map(deadline => (
                  <DeadlineCard
                    key={deadline.id}
                    deadline={deadline}
                    variant="compact"
                    onView={onDeadlineClick}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Nu există termene pentru această dată
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// List View Component
// ============================================================================

interface FiscalDeadlineListProps {
  deadlines: FiscalDeadline[]
  variant?: 'default' | 'compact' | 'detailed'
  filter?: DeadlineStatus | 'all'
  typeFilter?: DeadlineType | 'all'
  sortBy?: 'date' | 'priority' | 'type'
  showFilters?: boolean
  onComplete?: (deadline: FiscalDeadline) => void
  onView?: (deadline: FiscalDeadline) => void
  emptyMessage?: string
  className?: string
}

export function FiscalDeadlineList({
  deadlines,
  variant = 'default',
  filter = 'all',
  typeFilter = 'all',
  sortBy = 'date',
  showFilters = true,
  onComplete,
  onView,
  emptyMessage = 'Nu există termene fiscale',
  className
}: FiscalDeadlineListProps) {
  const [statusFilter, setStatusFilter] = useState<DeadlineStatus | 'all'>(filter)
  const [deadlineTypeFilter, setDeadlineTypeFilter] = useState<DeadlineType | 'all'>(typeFilter)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredDeadlines = useMemo(() => {
    let result = [...deadlines]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(d =>
        d.title.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term) ||
        d.formCode?.toLowerCase().includes(term)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(d => getDeadlineStatus(d) === statusFilter)
    }

    // Apply type filter
    if (deadlineTypeFilter !== 'all') {
      result = result.filter(d => d.type === deadlineTypeFilter)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return a.type.localeCompare(b.type)
    })

    return result
  }, [deadlines, statusFilter, deadlineTypeFilter, searchTerm, sortBy])

  return (
    <div className={cn('space-y-4', className)}>
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Caută termene..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeadlineStatus | 'all')}
            className="rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">Toate statusurile</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={deadlineTypeFilter}
            onChange={(e) => setDeadlineTypeFilter(e.target.value as DeadlineType | 'all')}
            className="rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">Toate tipurile</option>
            {Object.entries(deadlineTypeConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      )}

      {filteredDeadlines.length > 0 ? (
        <div className={cn(
          variant === 'compact' ? 'space-y-2' : 'space-y-4'
        )}>
          {filteredDeadlines.map(deadline => (
            <DeadlineCard
              key={deadline.id}
              deadline={deadline}
              variant={variant}
              onComplete={onComplete}
              onView={onView}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-12 text-center dark:border-gray-700">
          <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Summary Component
// ============================================================================

interface FiscalSummaryProps {
  deadlines: FiscalDeadline[]
  className?: string
}

export function FiscalSummary({ deadlines, className }: FiscalSummaryProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = deadlines.filter(d => {
      const date = new Date(d.dueDate)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })

    return {
      total: deadlines.length,
      thisMonth: thisMonth.length,
      overdue: deadlines.filter(d => getDeadlineStatus(d) === 'overdue').length,
      urgent: deadlines.filter(d => {
        const status = getDeadlineStatus(d)
        return status === 'urgent' || status === 'due_today'
      }).length,
      completed: deadlines.filter(d => d.status === 'completed').length,
      totalAmount: deadlines
        .filter(d => d.amount !== undefined && getDeadlineStatus(d) !== 'completed')
        .reduce((sum, d) => sum + (d.amount || 0), 0)
    }
  }, [deadlines])

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <div className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Luna aceasta</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Urgente</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.urgent}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Întârziate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">De plătit</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.totalAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Upcoming Deadlines Widget
// ============================================================================

interface UpcomingDeadlinesProps {
  deadlines: FiscalDeadline[]
  limit?: number
  onViewAll?: () => void
  onDeadlineClick?: (deadline: FiscalDeadline) => void
  className?: string
}

export function UpcomingDeadlines({
  deadlines,
  limit = 5,
  onViewAll,
  onDeadlineClick,
  className
}: UpcomingDeadlinesProps) {
  const upcomingDeadlines = useMemo(() => {
    return deadlines
      .filter(d => {
        const status = getDeadlineStatus(d)
        return status !== 'completed' && status !== 'cancelled'
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, limit)
  }, [deadlines, limit])

  return (
    <div className={cn('rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Termene apropiate
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Vezi toate
          </button>
        )}
      </div>

      {upcomingDeadlines.length > 0 ? (
        <div className="space-y-3">
          {upcomingDeadlines.map(deadline => (
            <DeadlineCard
              key={deadline.id}
              deadline={deadline}
              variant="compact"
              onView={onDeadlineClick}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Nu există termene apropiate
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Empty State
// ============================================================================

interface FiscalCalendarEmptyStateProps {
  onAddDeadline?: () => void
  className?: string
}

export function FiscalCalendarEmptyState({
  onAddDeadline,
  className
}: FiscalCalendarEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed py-16 dark:border-gray-700',
      className
    )}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <CalendarDays className="h-8 w-8 text-gray-400" />
      </div>

      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        Calendar fiscal gol
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
        Nu aveți niciun termen fiscal configurat. Adăugați termene pentru a primi notificări la timp.
      </p>

      {onAddDeadline && (
        <button
          onClick={onAddDeadline}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Adaugă termen fiscal
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Export Component
// ============================================================================

interface FiscalCalendarProps {
  deadlines: FiscalDeadline[]
  view?: 'calendar' | 'list'
  onComplete?: (deadline: FiscalDeadline) => void
  onView?: (deadline: FiscalDeadline) => void
  onAddDeadline?: (date?: Date) => void
  showSummary?: boolean
  className?: string
}

export function FiscalCalendar({
  deadlines,
  view = 'calendar',
  onComplete,
  onView,
  onAddDeadline,
  showSummary = true,
  className
}: FiscalCalendarProps) {
  const [currentView, setCurrentView] = useState<'calendar' | 'list'>(view)

  if (deadlines.length === 0) {
    return <FiscalCalendarEmptyState onAddDeadline={() => onAddDeadline?.()} className={className} />
  }

  return (
    <div className={cn('space-y-6', className)}>
      {showSummary && <FiscalSummary deadlines={deadlines} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg border bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setCurrentView('calendar')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              currentView === 'calendar'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            )}
          >
            <Calendar className="mr-1.5 inline-block h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => setCurrentView('list')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              currentView === 'list'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            )}
          >
            <FileText className="mr-1.5 inline-block h-4 w-4" />
            Listă
          </button>
        </div>

        {onAddDeadline && (
          <button
            onClick={() => onAddDeadline()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Adaugă termen
          </button>
        )}
      </div>

      {currentView === 'calendar' ? (
        <FiscalCalendarView
          deadlines={deadlines}
          onDeadlineClick={onView}
          onAddDeadline={onAddDeadline}
        />
      ) : (
        <FiscalDeadlineList
          deadlines={deadlines}
          variant="detailed"
          onComplete={onComplete}
          onView={onView}
        />
      )}
    </div>
  )
}

export default FiscalCalendar
