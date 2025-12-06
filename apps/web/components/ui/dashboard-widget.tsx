'use client'

import React, { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  MoreVertical,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Info,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Download,
  Filter,
  Calendar
} from 'lucide-react'

// ============================================================================
// Types & Interfaces
// ============================================================================

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type WidgetVariant = 'default' | 'outline' | 'ghost' | 'gradient'
export type WidgetStatus = 'idle' | 'loading' | 'success' | 'error' | 'warning'
export type TrendDirection = 'up' | 'down' | 'neutral'

export interface WidgetAction {
  id: string
  label: string
  icon?: React.ElementType
  onClick: () => void
  variant?: 'default' | 'danger'
}

export interface WidgetConfig {
  refreshable?: boolean
  collapsible?: boolean
  expandable?: boolean
  removable?: boolean
  draggable?: boolean
  hasSettings?: boolean
  autoRefresh?: number // seconds
}

export interface WidgetHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ElementType
  iconColor?: string
  badge?: string | number
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  actions?: WidgetAction[]
  onRefresh?: () => void
  onExpand?: () => void
  onCollapse?: () => void
  onRemove?: () => void
  onSettings?: () => void
  config?: WidgetConfig
  isCollapsed?: boolean
  isExpanded?: boolean
  isLoading?: boolean
  className?: string
}

export interface WidgetFooterProps {
  children?: ReactNode
  updatedAt?: Date
  link?: { label: string; href: string }
  actions?: ReactNode
  className?: string
}

export interface WidgetProps {
  children: ReactNode
  title: string
  subtitle?: string
  icon?: React.ElementType
  iconColor?: string
  size?: WidgetSize
  variant?: WidgetVariant
  status?: WidgetStatus
  config?: WidgetConfig
  badge?: string | number
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  footer?: ReactNode
  updatedAt?: Date
  link?: { label: string; href: string }
  actions?: WidgetAction[]
  onRefresh?: () => void
  onRemove?: () => void
  onSettings?: () => void
  isLoading?: boolean
  error?: string
  emptyState?: ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
}

// ============================================================================
// Configuration
// ============================================================================

const sizeConfig: Record<WidgetSize, string> = {
  sm: 'col-span-1',
  md: 'col-span-1 md:col-span-2',
  lg: 'col-span-1 md:col-span-2 lg:col-span-3',
  xl: 'col-span-1 md:col-span-2 lg:col-span-4',
  full: 'col-span-full'
}

const variantConfig: Record<WidgetVariant, string> = {
  default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
  outline: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
  ghost: 'bg-gray-50 dark:bg-gray-800/50 border-0',
  gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-800'
}

const badgeVariantConfig: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'Acum câteva secunde'
  if (diff < 3600) return `Acum ${Math.floor(diff / 60)} minute`
  if (diff < 86400) return `Acum ${Math.floor(diff / 3600)} ore`
  return `Acum ${Math.floor(diff / 86400)} zile`
}

// ============================================================================
// Sub-Components
// ============================================================================

export function WidgetHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-gray-600 dark:text-gray-400',
  badge,
  badgeVariant = 'default',
  actions,
  onRefresh,
  onExpand,
  onCollapse,
  onRemove,
  onSettings,
  config = {},
  isCollapsed,
  isExpanded,
  isLoading,
  className
}: WidgetHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const hasActions = actions && actions.length > 0
  const hasControls = config.refreshable || config.collapsible || config.expandable || config.removable || config.hasSettings

  return (
    <div className={cn(
      'flex items-start justify-between gap-3 px-5 py-4',
      className
    )}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800',
            iconColor
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {badge !== undefined && (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                badgeVariantConfig[badgeVariant]
              )}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {(hasActions || hasControls) && (
        <div className="flex items-center gap-1">
          {config.refreshable && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={cn(
                'rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300',
                isLoading && 'animate-spin'
              )}
              title="Reîmprospătează"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          {config.collapsible && (
            <button
              onClick={isCollapsed ? onExpand : onCollapse}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title={isCollapsed ? 'Extinde' : 'Restrânge'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}

          {config.expandable && onExpand && (
            <button
              onClick={onExpand}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title={isExpanded ? 'Minimizează' : 'Maximizează'}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          )}

          {config.hasSettings && onSettings && (
            <button
              onClick={onSettings}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Setări"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}

          {hasActions && (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                    >
                      {actions.map(action => {
                        const ActionIcon = action.icon
                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              action.onClick()
                              setIsMenuOpen(false)
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 text-sm',
                              action.variant === 'danger'
                                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            )}
                          >
                            {ActionIcon && <ActionIcon className="h-4 w-4" />}
                            {action.label}
                          </button>
                        )
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {config.removable && onRemove && (
            <button
              onClick={onRemove}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Elimină"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function WidgetFooter({
  children,
  updatedAt,
  link,
  actions,
  className
}: WidgetFooterProps) {
  return (
    <div className={cn(
      'flex items-center justify-between border-t px-5 py-3 dark:border-gray-800',
      className
    )}>
      <div className="flex items-center gap-4">
        {updatedAt && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(updatedAt)}
          </span>
        )}
        {children}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {link && (
          <a
            href={link.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {link.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

export function WidgetBody({
  children,
  isLoading,
  error,
  emptyState,
  className
}: {
  children: ReactNode
  isLoading?: boolean
  error?: string
  emptyState?: ReactNode
  className?: string
}) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center px-5 py-12', className)}>
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Se încarcă...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center px-5 py-12', className)}>
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      </div>
    )
  }

  if (emptyState && !React.Children.count(children)) {
    return (
      <div className={cn('px-5 py-8', className)}>
        {emptyState}
      </div>
    )
  }

  return (
    <div className={cn('px-5 pb-5', className)}>
      {children}
    </div>
  )
}

// ============================================================================
// Stat Display Components
// ============================================================================

interface WidgetStatProps {
  value: string | number
  label: string
  trend?: TrendDirection
  trendValue?: string | number
  trendLabel?: string
  icon?: React.ElementType
  iconColor?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function WidgetStat({
  value,
  label,
  trend,
  trendValue,
  trendLabel,
  icon: Icon,
  iconColor = 'text-gray-400',
  size = 'md',
  className
}: WidgetStatProps) {
  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    down: { icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
    neutral: { icon: Minus, color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800' }
  }

  const TrendIcon = trend ? trendConfig[trend].icon : null

  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div>
        <p className={cn(
          'font-bold text-gray-900 dark:text-white',
          size === 'sm' && 'text-xl',
          size === 'md' && 'text-2xl',
          size === 'lg' && 'text-3xl'
        )}>
          {value}
        </p>
        <p className={cn(
          'text-gray-500 dark:text-gray-400',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          {label}
        </p>
        {trend && trendValue !== undefined && (
          <div className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5',
            trendConfig[trend].bgColor
          )}>
            {TrendIcon && <TrendIcon className={cn('h-3 w-3', trendConfig[trend].color)} />}
            <span className={cn('text-xs font-medium', trendConfig[trend].color)}>
              {trendValue}
              {trendLabel && <span className="ml-1 text-gray-500">{trendLabel}</span>}
            </span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={cn('rounded-lg bg-gray-100 p-2 dark:bg-gray-800', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}

interface WidgetStatsGridProps {
  stats: Array<{
    value: string | number
    label: string
    trend?: TrendDirection
    trendValue?: string | number
    icon?: React.ElementType
    iconColor?: string
  }>
  columns?: 2 | 3 | 4
  className?: string
}

export function WidgetStatsGrid({
  stats,
  columns = 2,
  className
}: WidgetStatsGridProps) {
  return (
    <div className={cn(
      'grid gap-4',
      columns === 2 && 'grid-cols-2',
      columns === 3 && 'grid-cols-3',
      columns === 4 && 'grid-cols-2 sm:grid-cols-4',
      className
    )}>
      {stats.map((stat, idx) => (
        <WidgetStat
          key={idx}
          value={stat.value}
          label={stat.label}
          trend={stat.trend}
          trendValue={stat.trendValue}
          icon={stat.icon}
          iconColor={stat.iconColor}
          size="sm"
        />
      ))}
    </div>
  )
}

// ============================================================================
// Progress Components
// ============================================================================

interface WidgetProgressProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  color?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function WidgetProgress({
  value,
  max = 100,
  label,
  showPercent = true,
  color = 'default',
  size = 'md',
  className
}: WidgetProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  const colorConfig = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-cyan-500'
  }

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-gray-600 dark:text-gray-400">{label}</span>}
          {showPercent && (
            <span className="font-medium text-gray-900 dark:text-white">
              {percent.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={cn(
        'overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800',
        size === 'sm' && 'h-1.5',
        size === 'md' && 'h-2',
        size === 'lg' && 'h-3'
      )}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colorConfig[color])}
        />
      </div>
    </div>
  )
}

// ============================================================================
// List Components
// ============================================================================

interface WidgetListItemProps {
  title: string
  subtitle?: string
  value?: string | number
  valueColor?: 'default' | 'success' | 'warning' | 'error'
  icon?: React.ElementType
  iconColor?: string
  iconBgColor?: string
  onClick?: () => void
  className?: string
}

export function WidgetListItem({
  title,
  subtitle,
  value,
  valueColor = 'default',
  icon: Icon,
  iconColor = 'text-gray-600 dark:text-gray-400',
  iconBgColor = 'bg-gray-100 dark:bg-gray-800',
  onClick,
  className
}: WidgetListItemProps) {
  const valueColorConfig = {
    default: 'text-gray-900 dark:text-white',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400'
  }

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 py-2',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 rounded-lg',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBgColor)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        )}
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {value !== undefined && (
        <span className={cn('text-sm font-semibold', valueColorConfig[valueColor])}>
          {value}
        </span>
      )}
    </Component>
  )
}

interface WidgetListProps {
  items: Array<WidgetListItemProps & { id: string }>
  maxItems?: number
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

export function WidgetList({
  items,
  maxItems = 5,
  showViewAll = false,
  onViewAll,
  className
}: WidgetListProps) {
  const displayedItems = items.slice(0, maxItems)
  const hasMore = items.length > maxItems

  return (
    <div className={cn('divide-y dark:divide-gray-800', className)}>
      {displayedItems.map(item => (
        <WidgetListItem key={item.id} {...item} />
      ))}
      {(showViewAll || hasMore) && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Vezi toate ({items.length})
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Widget Component
// ============================================================================

export function DashboardWidget({
  children,
  title,
  subtitle,
  icon,
  iconColor,
  size = 'md',
  variant = 'default',
  status = 'idle',
  config = {},
  badge,
  badgeVariant,
  footer,
  updatedAt,
  link,
  actions,
  onRefresh,
  onRemove,
  onSettings,
  isLoading: propIsLoading,
  error,
  emptyState,
  className,
  headerClassName,
  bodyClassName,
  footerClassName
}: WidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)

  const isLoading = propIsLoading || internalLoading

  const handleRefresh = async () => {
    if (onRefresh) {
      setInternalLoading(true)
      try {
        await onRefresh()
      } finally {
        setInternalLoading(false)
      }
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'rounded-xl shadow-sm',
        sizeConfig[size],
        variantConfig[variant],
        isExpanded && 'fixed inset-4 z-50 col-span-full overflow-auto',
        config.draggable && 'cursor-move',
        className
      )}
    >
      <WidgetHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
        badge={badge}
        badgeVariant={badgeVariant}
        actions={actions}
        config={config}
        isCollapsed={isCollapsed}
        isExpanded={isExpanded}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onCollapse={() => setIsCollapsed(true)}
        onExpand={() => {
          if (config.collapsible && isCollapsed) {
            setIsCollapsed(false)
          } else if (config.expandable) {
            setIsExpanded(!isExpanded)
          }
        }}
        onRemove={onRemove}
        onSettings={onSettings}
        className={headerClassName}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <WidgetBody
              isLoading={isLoading}
              error={error}
              emptyState={emptyState}
              className={bodyClassName}
            >
              {children}
            </WidgetBody>

            {(footer || updatedAt || link) && (
              <WidgetFooter
                updatedAt={updatedAt}
                link={link}
                className={footerClassName}
              >
                {footer}
              </WidgetFooter>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================================
// Widget Grid Container
// ============================================================================

interface WidgetGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4 | 6
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export function WidgetGrid({
  children,
  columns = 4,
  gap = 'md',
  className
}: WidgetGridProps) {
  const columnConfig = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  }

  const gapConfig = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return (
    <div className={cn(
      'grid',
      columnConfig[columns],
      gapConfig[gap],
      className
    )}>
      {children}
    </div>
  )
}

// ============================================================================
// Empty Widget State
// ============================================================================

interface WidgetEmptyStateProps {
  icon?: React.ElementType
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function WidgetEmptyState({
  icon: Icon = Info,
  title = 'Nicio dată disponibilă',
  description,
  action,
  className
}: WidgetEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <h4 className="mt-3 font-medium text-gray-900 dark:text-white">{title}</h4>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Export
// ============================================================================

export default DashboardWidget
