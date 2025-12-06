'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  FileText,
  FileCheck,
  FileX,
  FileClock,
  FileWarning,
  Upload,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Plus,
  Copy,
  Printer,
  History,
  RefreshCw,
  Building2,
  Calculator,
  Receipt,
  Banknote,
  Users,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

// ============================================================================
// Types & Interfaces
// ============================================================================

export type DeclarationType =
  | 'd100'    // Declarație privind obligațiile de plată la bugetul de stat
  | 'd101'    // Declarație privind impozitul pe profit
  | 'd112'    // Declarație privind obligațiile de plată a contribuțiilor sociale
  | 'd300'    // Decont de taxă pe valoarea adăugată
  | 'd390'    // Declarație recapitulativă privind livrările/achizițiile intracomunitare
  | 'd394'    // Declarație informativă privind livrările/prestările și achizițiile efectuate pe teritoriul național
  | 'd406'    // SAF-T (Standard Audit File for Tax)
  | 'd207'    // Declarație informativă privind impozitul reținut la sursă/veniturile din jocuri de noroc
  | 'd200'    // Declarație privind veniturile realizate din România

export type DeclarationStatus =
  | 'draft'           // În lucru
  | 'pending_review'  // În așteptarea revizuirii
  | 'ready'           // Gata pentru depunere
  | 'submitted'       // Depusă
  | 'accepted'        // Acceptată de ANAF
  | 'rejected'        // Respinsă
  | 'rectified'       // Rectificată
  | 'cancelled'       // Anulată

export type DeclarationPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom'

export interface TaxDeclaration {
  id: string
  type: DeclarationType
  status: DeclarationStatus
  period: DeclarationPeriod
  periodStart: Date
  periodEnd: Date
  dueDate: Date
  submittedAt?: Date
  acceptedAt?: Date
  cui: string
  companyName: string
  totalAmount?: number
  taxDue?: number
  taxCredit?: number
  isRectification?: boolean
  rectificationNumber?: number
  originalId?: string
  anafReference?: string
  xmlFile?: string
  pdfFile?: string
  errors?: DeclarationError[]
  warnings?: DeclarationWarning[]
  sections?: DeclarationSection[]
  history?: DeclarationHistoryEntry[]
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

export interface DeclarationError {
  code: string
  field?: string
  message: string
  severity: 'error' | 'critical'
}

export interface DeclarationWarning {
  code: string
  field?: string
  message: string
}

export interface DeclarationSection {
  id: string
  name: string
  code: string
  fields: DeclarationField[]
  subtotal?: number
}

export interface DeclarationField {
  id: string
  code: string
  label: string
  value: number | string
  type: 'amount' | 'count' | 'text' | 'percentage'
}

export interface DeclarationHistoryEntry {
  id: string
  action: 'created' | 'updated' | 'submitted' | 'accepted' | 'rejected' | 'rectified'
  timestamp: Date
  user?: string
  details?: string
}

// ============================================================================
// Configuration
// ============================================================================

const declarationTypeConfig: Record<DeclarationType, {
  label: string
  shortLabel: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  period: DeclarationPeriod
  anafLink: string
}> = {
  d100: {
    label: 'Declarația 100',
    shortLabel: 'D100',
    description: 'Obligații de plată la bugetul de stat',
    icon: Banknote,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    period: 'monthly',
    anafLink: 'https://www.anaf.ro/d100'
  },
  d101: {
    label: 'Declarația 101',
    shortLabel: 'D101',
    description: 'Impozit pe profit',
    icon: Building2,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    period: 'quarterly',
    anafLink: 'https://www.anaf.ro/d101'
  },
  d112: {
    label: 'Declarația 112',
    shortLabel: 'D112',
    description: 'Contribuții sociale (CAS, CASS, impozit salarii)',
    icon: Users,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    period: 'monthly',
    anafLink: 'https://www.anaf.ro/d112'
  },
  d300: {
    label: 'Declarația 300',
    shortLabel: 'D300',
    description: 'Decont TVA',
    icon: Receipt,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    period: 'monthly',
    anafLink: 'https://www.anaf.ro/d300'
  },
  d390: {
    label: 'Declarația 390',
    shortLabel: 'D390',
    description: 'Livrări/Achiziții intracomunitare',
    icon: ArrowUpRight,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    period: 'monthly',
    anafLink: 'https://www.anaf.ro/d390'
  },
  d394: {
    label: 'Declarația 394',
    shortLabel: 'D394',
    description: 'Livrări/Prestări și achiziții pe teritoriul național',
    icon: FileText,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    period: 'monthly',
    anafLink: 'https://www.anaf.ro/d394'
  },
  d406: {
    label: 'SAF-T (D406)',
    shortLabel: 'D406',
    description: 'Standard Audit File for Tax',
    icon: FileCheck,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    period: 'monthly',
    anafLink: 'https://www.anaf.ro/d406'
  },
  d207: {
    label: 'Declarația 207',
    shortLabel: 'D207',
    description: 'Impozit reținut la sursă',
    icon: Calculator,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    period: 'yearly',
    anafLink: 'https://www.anaf.ro/d207'
  },
  d200: {
    label: 'Declarația 200',
    shortLabel: 'D200',
    description: 'Venituri realizate din România',
    icon: Banknote,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    period: 'yearly',
    anafLink: 'https://www.anaf.ro/d200'
  }
}

const statusConfig: Record<DeclarationStatus, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  draft: {
    label: 'Ciornă',
    icon: FileText,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700'
  },
  pending_review: {
    label: 'În revizuire',
    icon: FileClock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  ready: {
    label: 'Gata pentru depunere',
    icon: FileCheck,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  submitted: {
    label: 'Depusă',
    icon: Send,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800'
  },
  accepted: {
    label: 'Acceptată',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  rejected: {
    label: 'Respinsă',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  rectified: {
    label: 'Rectificată',
    icon: RefreshCw,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  cancelled: {
    label: 'Anulată',
    icon: FileX,
    color: 'text-gray-500 dark:text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700'
  }
}

const periodConfig: Record<DeclarationPeriod, {
  label: string
  shortLabel: string
}> = {
  monthly: { label: 'Lunar', shortLabel: 'Lun.' },
  quarterly: { label: 'Trimestrial', shortLabel: 'Trim.' },
  yearly: { label: 'Anual', shortLabel: 'An' },
  custom: { label: 'Personalizat', shortLabel: 'Pers.' }
}

const monthNames = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function formatPeriod(declaration: TaxDeclaration): string {
  const start = new Date(declaration.periodStart)
  const end = new Date(declaration.periodEnd)

  if (declaration.period === 'monthly') {
    return `${monthNames[start.getMonth()]} ${start.getFullYear()}`
  }
  if (declaration.period === 'quarterly') {
    const quarter = Math.ceil((start.getMonth() + 1) / 3)
    return `T${quarter} ${start.getFullYear()}`
  }
  if (declaration.period === 'yearly') {
    return `${start.getFullYear()}`
  }
  return `${formatShortDate(start)} - ${formatShortDate(end)}`
}

function getDaysUntilDue(dueDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dueDate)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getDueStatus(declaration: TaxDeclaration): 'overdue' | 'due_soon' | 'ok' | 'submitted' {
  if (declaration.status === 'submitted' || declaration.status === 'accepted') {
    return 'submitted'
  }
  const daysUntil = getDaysUntilDue(declaration.dueDate)
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 5) return 'due_soon'
  return 'ok'
}

// ============================================================================
// Sub-Components
// ============================================================================

interface DeclarationTypeBadgeProps {
  type: DeclarationType
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
  className?: string
}

export function DeclarationTypeBadge({
  type,
  size = 'md',
  showDescription = false,
  className
}: DeclarationTypeBadgeProps) {
  const config = declarationTypeConfig[type]
  const Icon = config.icon

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.color,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        size === 'lg' && 'px-3 py-1.5 text-base'
      )}>
        <Icon className={cn(
          size === 'sm' && 'h-3 w-3',
          size === 'md' && 'h-4 w-4',
          size === 'lg' && 'h-5 w-5'
        )} />
        <span>{config.shortLabel}</span>
      </span>
      {showDescription && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {config.description}
        </span>
      )}
    </div>
  )
}

interface DeclarationStatusBadgeProps {
  status: DeclarationStatus
  size?: 'sm' | 'md'
  className?: string
}

export function DeclarationStatusBadge({
  status,
  size = 'md',
  className
}: DeclarationStatusBadgeProps) {
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

interface DueDateIndicatorProps {
  declaration: TaxDeclaration
  className?: string
}

export function DueDateIndicator({ declaration, className }: DueDateIndicatorProps) {
  const dueStatus = getDueStatus(declaration)
  const daysUntil = getDaysUntilDue(declaration.dueDate)

  if (dueStatus === 'submitted') {
    return (
      <span className={cn('text-sm text-green-600 dark:text-green-400', className)}>
        <CheckCircle2 className="mr-1 inline-block h-4 w-4" />
        Depusă la timp
      </span>
    )
  }

  if (dueStatus === 'overdue') {
    return (
      <span className={cn('text-sm font-medium text-red-600 dark:text-red-400', className)}>
        <AlertCircle className="mr-1 inline-block h-4 w-4" />
        Întârziere {Math.abs(daysUntil)} {Math.abs(daysUntil) === 1 ? 'zi' : 'zile'}
      </span>
    )
  }

  if (dueStatus === 'due_soon') {
    return (
      <span className={cn('text-sm font-medium text-orange-600 dark:text-orange-400', className)}>
        <AlertTriangle className="mr-1 inline-block h-4 w-4" />
        {daysUntil === 0 ? 'Scadentă azi!' : `${daysUntil} ${daysUntil === 1 ? 'zi' : 'zile'} rămase`}
      </span>
    )
  }

  return (
    <span className={cn('text-sm text-gray-600 dark:text-gray-400', className)}>
      <Clock className="mr-1 inline-block h-4 w-4" />
      Termen: {formatShortDate(declaration.dueDate)}
    </span>
  )
}

interface ErrorsWarningsListProps {
  errors?: DeclarationError[]
  warnings?: DeclarationWarning[]
  className?: string
}

export function ErrorsWarningsList({ errors, warnings, className }: ErrorsWarningsListProps) {
  const hasErrors = errors && errors.length > 0
  const hasWarnings = warnings && warnings.length > 0

  if (!hasErrors && !hasWarnings) return null

  return (
    <div className={cn('space-y-2', className)}>
      {hasErrors && (
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
            <XCircle className="h-4 w-4" />
            {errors.length} {errors.length === 1 ? 'eroare' : 'erori'}
          </div>
          <ul className="mt-2 space-y-1">
            {errors.map((error, idx) => (
              <li key={idx} className="text-sm text-red-600 dark:text-red-400">
                • {error.message}
                {error.field && <span className="text-red-500"> ({error.field})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasWarnings && (
        <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="h-4 w-4" />
            {warnings.length} {warnings.length === 1 ? 'avertisment' : 'avertismente'}
          </div>
          <ul className="mt-2 space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-yellow-600 dark:text-yellow-400">
                • {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component - Declaration Card
// ============================================================================

interface DeclarationCardProps {
  declaration: TaxDeclaration
  variant?: 'default' | 'compact' | 'detailed'
  onView?: (declaration: TaxDeclaration) => void
  onEdit?: (declaration: TaxDeclaration) => void
  onSubmit?: (declaration: TaxDeclaration) => void
  onDownloadXml?: (declaration: TaxDeclaration) => void
  onDownloadPdf?: (declaration: TaxDeclaration) => void
  onRectify?: (declaration: TaxDeclaration) => void
  className?: string
}

export function DeclarationCard({
  declaration,
  variant = 'default',
  onView,
  onEdit,
  onSubmit,
  onDownloadXml,
  onDownloadPdf,
  onRectify,
  className
}: DeclarationCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const typeConfig = declarationTypeConfig[declaration.type]
  const statusConf = statusConfig[declaration.status]
  const Icon = typeConfig.icon

  const canEdit = declaration.status === 'draft' || declaration.status === 'pending_review'
  const canSubmit = declaration.status === 'ready'
  const canRectify = declaration.status === 'accepted'

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3',
          statusConf.borderColor,
          'bg-white dark:bg-gray-900',
          className
        )}
      >
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          typeConfig.bgColor
        )}>
          <Icon className={cn('h-5 w-5', typeConfig.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {typeConfig.shortLabel}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatPeriod(declaration)}
            </span>
          </div>
          <DueDateIndicator declaration={declaration} />
        </div>

        <DeclarationStatusBadge status={declaration.status} size="sm" />
      </motion.div>
    )
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-xl border p-6',
          statusConf.borderColor,
          'bg-white dark:bg-gray-900',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
              typeConfig.bgColor
            )}>
              <Icon className={cn('h-7 w-7', typeConfig.color)} />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {typeConfig.label}
                </h3>
                {declaration.isRectification && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    Rectificativă #{declaration.rectificationNumber}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {typeConfig.description}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Perioada: <span className="font-medium">{formatPeriod(declaration)}</span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  CUI: <span className="font-medium">{declaration.cui}</span>
                </span>
              </div>
            </div>
          </div>

          <DeclarationStatusBadge status={declaration.status} />
        </div>

        {/* Amounts */}
        {(declaration.totalAmount !== undefined || declaration.taxDue !== undefined) && (
          <div className="mt-6 grid gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 sm:grid-cols-3">
            {declaration.totalAmount !== undefined && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bază impozabilă</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(declaration.totalAmount)}
                </p>
              </div>
            )}
            {declaration.taxDue !== undefined && declaration.taxDue > 0 && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Taxă de plată</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(declaration.taxDue)}
                </p>
              </div>
            )}
            {declaration.taxCredit !== undefined && declaration.taxCredit > 0 && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TVA de recuperat</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(declaration.taxCredit)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Due date & ANAF reference */}
        <div className="mt-4 flex items-center justify-between">
          <DueDateIndicator declaration={declaration} />
          {declaration.anafReference && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Ref. ANAF: <span className="font-mono">{declaration.anafReference}</span>
            </span>
          )}
        </div>

        {/* Errors & Warnings */}
        <ErrorsWarningsList
          errors={declaration.errors}
          warnings={declaration.warnings}
          className="mt-4"
        />

        {/* ANAF Link */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Informații oficiale ANAF pentru {typeConfig.shortLabel}
          </span>
          <a
            href={typeConfig.anafLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Accesează <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between border-t pt-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {onDownloadXml && declaration.xmlFile && (
              <button
                onClick={() => onDownloadXml(declaration)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
                XML
              </button>
            )}
            {onDownloadPdf && declaration.pdfFile && (
              <button
                onClick={() => onDownloadPdf(declaration)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onView && (
              <button
                onClick={() => onView(declaration)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Eye className="h-4 w-4" />
                Vizualizare
              </button>
            )}
            {onEdit && canEdit && (
              <button
                onClick={() => onEdit(declaration)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Edit className="h-4 w-4" />
                Editare
              </button>
            )}
            {onRectify && canRectify && (
              <button
                onClick={() => onRectify(declaration)}
                className="inline-flex items-center gap-1 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
              >
                <RefreshCw className="h-4 w-4" />
                Rectificare
              </button>
            )}
            {onSubmit && canSubmit && (
              <button
                onClick={() => onSubmit(declaration)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                Depune la ANAF
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
      <div className="flex items-start gap-4">
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
          typeConfig.bgColor
        )}>
          <Icon className={cn('h-6 w-6', typeConfig.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {typeConfig.label}
              </h3>
              {declaration.isRectification && (
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  R{declaration.rectificationNumber}
                </span>
              )}
            </div>
            <DeclarationStatusBadge status={declaration.status} size="sm" />
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatPeriod(declaration)} • {declaration.companyName}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <DueDateIndicator declaration={declaration} />
            {declaration.taxDue !== undefined && declaration.taxDue > 0 && (
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(declaration.taxDue)}
              </span>
            )}
            {declaration.taxCredit !== undefined && declaration.taxCredit > 0 && (
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                +{formatCurrency(declaration.taxCredit)}
              </span>
            )}
          </div>
        </div>
      </div>

      {(declaration.errors?.length ?? 0) > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {declaration.errors?.length} {(declaration.errors?.length ?? 0) === 1 ? 'eroare' : 'erori'} de corectat
          </span>
        </div>
      )}

      {(onView || onEdit || onSubmit) && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3 dark:border-gray-800">
          {onView && (
            <button
              onClick={() => onView(declaration)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Eye className="h-4 w-4" />
              Detalii
            </button>
          )}
          {onEdit && canEdit && (
            <button
              onClick={() => onEdit(declaration)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Edit className="h-4 w-4" />
              Editare
            </button>
          )}
          {onSubmit && canSubmit && (
            <button
              onClick={() => onSubmit(declaration)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
              Depune
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// List Component
// ============================================================================

interface DeclarationListProps {
  declarations: TaxDeclaration[]
  variant?: 'default' | 'compact' | 'detailed'
  showFilters?: boolean
  onView?: (declaration: TaxDeclaration) => void
  onEdit?: (declaration: TaxDeclaration) => void
  onSubmit?: (declaration: TaxDeclaration) => void
  emptyMessage?: string
  className?: string
}

export function DeclarationList({
  declarations,
  variant = 'default',
  showFilters = true,
  onView,
  onEdit,
  onSubmit,
  emptyMessage = 'Nu există declarații',
  className
}: DeclarationListProps) {
  const [typeFilter, setTypeFilter] = useState<DeclarationType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DeclarationStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredDeclarations = useMemo(() => {
    let result = [...declarations]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(d =>
        d.companyName.toLowerCase().includes(term) ||
        d.cui.includes(term) ||
        d.anafReference?.toLowerCase().includes(term)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter(d => d.type === typeFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter)
    }

    // Sort by due date
    result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    return result
  }, [declarations, typeFilter, statusFilter, searchTerm])

  return (
    <div className={cn('space-y-4', className)}>
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Caută după firmă, CUI sau referință..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DeclarationType | 'all')}
            className="rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">Toate tipurile</option>
            {Object.entries(declarationTypeConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.shortLabel} - {config.description}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeclarationStatus | 'all')}
            className="rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">Toate statusurile</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      )}

      {filteredDeclarations.length > 0 ? (
        <div className={cn(variant === 'compact' ? 'space-y-2' : 'space-y-4')}>
          {filteredDeclarations.map(declaration => (
            <DeclarationCard
              key={declaration.id}
              declaration={declaration}
              variant={variant}
              onView={onView}
              onEdit={onEdit}
              onSubmit={onSubmit}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-12 text-center dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Summary Component
// ============================================================================

interface DeclarationSummaryProps {
  declarations: TaxDeclaration[]
  className?: string
}

export function DeclarationSummary({ declarations, className }: DeclarationSummaryProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return {
      total: declarations.length,
      pending: declarations.filter(d =>
        d.status === 'draft' || d.status === 'pending_review' || d.status === 'ready'
      ).length,
      overdue: declarations.filter(d => {
        if (d.status === 'submitted' || d.status === 'accepted') return false
        return getDaysUntilDue(d.dueDate) < 0
      }).length,
      dueSoon: declarations.filter(d => {
        if (d.status === 'submitted' || d.status === 'accepted') return false
        const days = getDaysUntilDue(d.dueDate)
        return days >= 0 && days <= 5
      }).length,
      submitted: declarations.filter(d => d.status === 'submitted').length,
      accepted: declarations.filter(d => d.status === 'accepted').length,
      totalTaxDue: declarations
        .filter(d => d.taxDue !== undefined && d.status !== 'accepted')
        .reduce((sum, d) => sum + (d.taxDue || 0), 0)
    }
  }, [declarations])

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <div className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">În lucru</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Termen apropiat</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.dueSoon}</p>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Acceptate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.accepted}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Quick Actions Component
// ============================================================================

interface DeclarationQuickActionsProps {
  onCreateDeclaration?: (type: DeclarationType) => void
  className?: string
}

export function DeclarationQuickActions({
  onCreateDeclaration,
  className
}: DeclarationQuickActionsProps) {
  const commonTypes: DeclarationType[] = ['d300', 'd112', 'd100', 'd390', 'd394', 'd406']

  return (
    <div className={cn('rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900', className)}>
      <h3 className="font-semibold text-gray-900 dark:text-white">
        Creare rapidă declarație
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Selectează tipul de declarație pentru a începe
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {commonTypes.map(type => {
          const config = declarationTypeConfig[type]
          const Icon = config.icon

          return (
            <button
              key={type}
              onClick={() => onCreateDeclaration?.(type)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-800 dark:hover:bg-blue-900/20',
                'border-gray-200 dark:border-gray-700'
              )}
            >
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                config.bgColor
              )}>
                <Icon className={cn('h-5 w-5', config.color)} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">
                  {config.shortLabel}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {config.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Empty State
// ============================================================================

interface DeclarationEmptyStateProps {
  onCreateDeclaration?: () => void
  className?: string
}

export function DeclarationEmptyState({
  onCreateDeclaration,
  className
}: DeclarationEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed py-16 dark:border-gray-700',
      className
    )}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <FileText className="h-8 w-8 text-gray-400" />
      </div>

      <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        Nicio declarație fiscală
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
        Nu aveți nicio declarație fiscală în lucru. Începeți prin a crea prima declarație.
      </p>

      {onCreateDeclaration && (
        <button
          onClick={onCreateDeclaration}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Creează declarație
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Export
// ============================================================================

export default DeclarationCard
