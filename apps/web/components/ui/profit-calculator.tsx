'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  ArrowRight,
  ArrowLeftRight,
  RefreshCw,
  Copy,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Plus,
  Minus,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
  Lightbulb
} from 'lucide-react'

// ============================================================================
// Types & Interfaces
// ============================================================================

export type CalculationMode =
  | 'margin_from_cost'      // Cost + markup = price
  | 'margin_from_price'     // Price - cost = margin
  | 'cost_from_price'       // Price and margin -> cost
  | 'price_from_margin'     // Cost and desired margin -> price

export type MarginType = 'markup' | 'gross_margin' | 'net_margin'

export interface ProfitCalculation {
  id: string
  mode: CalculationMode
  costPrice: number
  sellingPrice: number
  profit: number
  markupPercent: number
  grossMarginPercent: number
  vatRate?: number
  netMargin?: number
  timestamp: Date
  description?: string
}

export interface ProfitBreakdown {
  costPrice: number
  profit: number
  vatAmount: number
  sellingPriceNet: number
  sellingPriceGross: number
  markupPercent: number
  grossMarginPercent: number
  netMarginPercent?: number
}

// ============================================================================
// Configuration
// ============================================================================

const modeConfig: Record<CalculationMode, {
  label: string
  description: string
  icon: React.ElementType
  inputLabels: { first: string; second: string }
}> = {
  margin_from_cost: {
    label: 'Preț din cost',
    description: 'Calculează prețul de vânzare pornind de la cost și adaos',
    icon: TrendingUp,
    inputLabels: { first: 'Cost achiziție', second: 'Adaos (%)' }
  },
  margin_from_price: {
    label: 'Marjă din preț',
    description: 'Calculează marja pornind de la preț și cost',
    icon: PieChart,
    inputLabels: { first: 'Preț vânzare', second: 'Cost achiziție' }
  },
  cost_from_price: {
    label: 'Cost din preț',
    description: 'Calculează costul maxim pentru o marjă dorită',
    icon: Target,
    inputLabels: { first: 'Preț vânzare', second: 'Marjă dorită (%)' }
  },
  price_from_margin: {
    label: 'Preț pentru marjă',
    description: 'Calculează prețul necesar pentru o marjă țintă',
    icon: BarChart3,
    inputLabels: { first: 'Cost achiziție', second: 'Marjă țintă (%)' }
  }
}

const marginHealthConfig = {
  excellent: { label: 'Excelentă', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', min: 40 },
  good: { label: 'Bună', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', min: 25 },
  moderate: { label: 'Moderată', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', min: 15 },
  low: { label: 'Scăzută', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20', min: 5 },
  negative: { label: 'Pierdere', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', min: -Infinity }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount)
}

function formatPercent(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value) + '%'
}

function calculateMarkup(cost: number, sellingPrice: number): number {
  if (cost === 0) return 0
  return ((sellingPrice - cost) / cost) * 100
}

function calculateGrossMargin(cost: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0
  return ((sellingPrice - cost) / sellingPrice) * 100
}

function priceFromMarkup(cost: number, markupPercent: number): number {
  return cost * (1 + markupPercent / 100)
}

function priceFromGrossMargin(cost: number, marginPercent: number): number {
  if (marginPercent >= 100) return Infinity
  return cost / (1 - marginPercent / 100)
}

function costFromPriceAndMargin(price: number, marginPercent: number): number {
  return price * (1 - marginPercent / 100)
}

function getMarginHealth(marginPercent: number): keyof typeof marginHealthConfig {
  if (marginPercent >= 40) return 'excellent'
  if (marginPercent >= 25) return 'good'
  if (marginPercent >= 15) return 'moderate'
  if (marginPercent >= 5) return 'low'
  return 'negative'
}

function calculateFullBreakdown(
  cost: number,
  sellingPrice: number,
  vatRate: number = 19
): ProfitBreakdown {
  const profit = sellingPrice - cost
  const vatAmount = sellingPrice * (vatRate / 100)
  const sellingPriceGross = sellingPrice + vatAmount

  return {
    costPrice: cost,
    profit,
    vatAmount,
    sellingPriceNet: sellingPrice,
    sellingPriceGross,
    markupPercent: calculateMarkup(cost, sellingPrice),
    grossMarginPercent: calculateGrossMargin(cost, sellingPrice)
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MarginIndicatorProps {
  marginPercent: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function MarginIndicator({
  marginPercent,
  size = 'md',
  showLabel = true,
  className
}: MarginIndicatorProps) {
  const health = getMarginHealth(marginPercent)
  const config = marginHealthConfig[health]
  const Icon = marginPercent >= 0 ? TrendingUp : TrendingDown

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
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
        {formatPercent(marginPercent)}
      </span>
      {showLabel && (
        <span className={cn('text-sm', config.color)}>
          {config.label}
        </span>
      )}
    </div>
  )
}

interface ResultCardProps {
  label: string
  value: string | number
  subValue?: string
  highlight?: boolean
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function ResultCard({
  label,
  value,
  subValue,
  highlight = false,
  trend,
  className
}: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    const copyValue = typeof value === 'number' ? value.toFixed(2) : value
    navigator.clipboard.writeText(copyValue.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <div className={cn(
      'rounded-xl border p-4',
      highlight
        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className={cn(
              'text-2xl font-bold',
              highlight ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
            )}>
              {typeof value === 'number' ? formatCurrency(value) : value}
              {typeof value === 'number' && ' RON'}
            </p>
            {trend && (
              <>
                {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
              </>
            )}
          </div>
          {subValue && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subValue}
            </p>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Copiază"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

interface MarginVisualizationProps {
  cost: number
  profit: number
  vat?: number
  className?: string
}

export function MarginVisualization({
  cost,
  profit,
  vat = 0,
  className
}: MarginVisualizationProps) {
  const total = cost + profit + vat
  const costPercent = total > 0 ? (cost / total) * 100 : 0
  const profitPercent = total > 0 ? (profit / total) * 100 : 0
  const vatPercent = total > 0 ? (vat / total) * 100 : 0

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-8 overflow-hidden rounded-lg">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${costPercent}%` }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center bg-gray-400 text-xs font-medium text-white"
          title={`Cost: ${formatPercent(costPercent)}`}
        >
          {costPercent > 15 && 'Cost'}
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${profitPercent}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={cn(
            'flex items-center justify-center text-xs font-medium text-white',
            profit >= 0 ? 'bg-green-500' : 'bg-red-500'
          )}
          title={`Profit: ${formatPercent(profitPercent)}`}
        >
          {profitPercent > 15 && 'Profit'}
        </motion.div>
        {vat > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${vatPercent}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center bg-blue-500 text-xs font-medium text-white"
            title={`TVA: ${formatPercent(vatPercent)}`}
          >
            {vatPercent > 10 && 'TVA'}
          </motion.div>
        )}
      </div>

      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">
            Cost ({formatPercent(costPercent, 1)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('h-3 w-3 rounded', profit >= 0 ? 'bg-green-500' : 'bg-red-500')} />
          <span className="text-gray-600 dark:text-gray-400">
            {profit >= 0 ? 'Profit' : 'Pierdere'} ({formatPercent(Math.abs(profitPercent), 1)})
          </span>
        </div>
        {vat > 0 && (
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">
              TVA ({formatPercent(vatPercent, 1)})
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Calculator Component
// ============================================================================

interface ProfitCalculatorProps {
  variant?: 'default' | 'compact' | 'full'
  defaultMode?: CalculationMode
  showHistory?: boolean
  showVat?: boolean
  defaultVatRate?: number
  maxHistoryItems?: number
  onCalculation?: (calculation: ProfitCalculation) => void
  className?: string
}

export function ProfitCalculator({
  variant = 'default',
  defaultMode = 'margin_from_cost',
  showHistory = true,
  showVat = true,
  defaultVatRate = 19,
  maxHistoryItems = 10,
  onCalculation,
  className
}: ProfitCalculatorProps) {
  const [mode, setMode] = useState<CalculationMode>(defaultMode)
  const [firstInput, setFirstInput] = useState<string>('')
  const [secondInput, setSecondInput] = useState<string>('')
  const [vatRate, setVatRate] = useState<number>(defaultVatRate)
  const [includeVat, setIncludeVat] = useState<boolean>(showVat)
  const [history, setHistory] = useState<ProfitCalculation[]>([])
  const [showTips, setShowTips] = useState(false)

  const config = modeConfig[mode]

  const result = useMemo(() => {
    const first = parseFloat(firstInput) || 0
    const second = parseFloat(secondInput) || 0

    if (first <= 0) return null

    let cost = 0
    let sellingPrice = 0

    switch (mode) {
      case 'margin_from_cost':
        cost = first
        sellingPrice = priceFromMarkup(first, second)
        break
      case 'margin_from_price':
        sellingPrice = first
        cost = second
        break
      case 'cost_from_price':
        sellingPrice = first
        cost = costFromPriceAndMargin(first, second)
        break
      case 'price_from_margin':
        cost = first
        sellingPrice = priceFromGrossMargin(first, second)
        break
    }

    if (!isFinite(sellingPrice) || sellingPrice <= 0) return null

    return calculateFullBreakdown(cost, sellingPrice, includeVat ? vatRate : 0)
  }, [mode, firstInput, secondInput, vatRate, includeVat])

  const handleClear = useCallback(() => {
    setFirstInput('')
    setSecondInput('')
  }, [])

  const handleSaveToHistory = useCallback(() => {
    if (!result) return

    const calculation: ProfitCalculation = {
      id: Date.now().toString(),
      mode,
      costPrice: result.costPrice,
      sellingPrice: result.sellingPriceNet,
      profit: result.profit,
      markupPercent: result.markupPercent,
      grossMarginPercent: result.grossMarginPercent,
      vatRate: includeVat ? vatRate : undefined,
      timestamp: new Date()
    }

    setHistory(prev => [calculation, ...prev].slice(0, maxHistoryItems))
    onCalculation?.(calculation)
  }, [result, mode, includeVat, vatRate, maxHistoryItems, onCalculation])

  if (variant === 'compact') {
    return (
      <div className={cn('rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900', className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
            <Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex flex-1 gap-2">
            <input
              type="number"
              value={firstInput}
              onChange={(e) => setFirstInput(e.target.value)}
              placeholder="Cost"
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              type="number"
              value={secondInput}
              onChange={(e) => setSecondInput(e.target.value)}
              placeholder="Adaos %"
              className="w-24 rounded-lg border bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>

        {result && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
              <p className="text-xs text-gray-500">Cost</p>
              <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(result.costPrice)}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2 dark:bg-green-900/20">
              <p className="text-xs text-green-600 dark:text-green-400">Profit</p>
              <p className="font-bold text-green-700 dark:text-green-300">{formatCurrency(result.profit)}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
              <p className="text-xs text-blue-600 dark:text-blue-400">Preț vânzare</p>
              <p className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(result.sellingPriceNet)}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="border-b p-5 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20">
            <Calculator className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Calculator Marjă Profit
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Calculează rapid marja și profitul
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="border-b p-4 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(modeConfig) as CalculationMode[]).map(m => {
            const conf = modeConfig[m]
            const Icon = conf.icon
            return (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  handleClear()
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {conf.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {config.description}
        </p>
      </div>

      {/* Calculator Body */}
      <div className="p-5">
        <div className="space-y-4">
          {/* First Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.inputLabels.first}
            </label>
            <div className="relative">
              <input
                type="number"
                value={firstInput}
                onChange={(e) => setFirstInput(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border bg-white px-4 py-3 pr-16 text-lg font-medium focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                {config.inputLabels.first.includes('%') ? '%' : 'RON'}
              </span>
            </div>
          </div>

          {/* Second Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.inputLabels.second}
            </label>
            <div className="relative">
              <input
                type="number"
                value={secondInput}
                onChange={(e) => setSecondInput(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border bg-white px-4 py-3 pr-16 text-lg font-medium focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                {config.inputLabels.second.includes('%') ? '%' : 'RON'}
              </span>
            </div>
          </div>

          {/* VAT Toggle */}
          {showVat && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeVat"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="includeVat" className="text-sm text-gray-700 dark:text-gray-300">
                  Include TVA în calcul
                </label>
              </div>
              {includeVat && (
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(parseInt(e.target.value))}
                  className="rounded-lg border bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={19}>TVA 19%</option>
                  <option value={9}>TVA 9%</option>
                  <option value={5}>TVA 5%</option>
                  <option value={0}>TVA 0%</option>
                </select>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Visualization */}
              <MarginVisualization
                cost={result.costPrice}
                profit={result.profit}
                vat={includeVat ? result.vatAmount : 0}
              />

              {/* Result Cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultCard
                  label="Cost achiziție"
                  value={result.costPrice}
                />
                <ResultCard
                  label="Profit"
                  value={result.profit}
                  trend={result.profit >= 0 ? 'up' : 'down'}
                  highlight={result.profit > 0}
                />
                <ResultCard
                  label="Preț vânzare (fără TVA)"
                  value={result.sellingPriceNet}
                />
                {includeVat && (
                  <ResultCard
                    label="Preț vânzare (cu TVA)"
                    value={result.sellingPriceGross}
                    subValue={`TVA: ${formatCurrency(result.vatAmount)} RON`}
                    highlight
                  />
                )}
              </div>

              {/* Margins */}
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
                  Indicatori de profitabilitate
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Adaos comercial</span>
                    <MarginIndicator marginPercent={result.markupPercent} size="sm" showLabel={false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Marjă brută</span>
                    <MarginIndicator marginPercent={result.grossMarginPercent} size="sm" />
                  </div>
                </div>

                {/* Health indicator */}
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-white p-3 dark:bg-gray-700">
                  {result.grossMarginPercent >= 15 ? (
                    <>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Marja de {formatPercent(result.grossMarginPercent)} este {getMarginHealth(result.grossMarginPercent) === 'excellent' ? 'excelentă' : getMarginHealth(result.grossMarginPercent) === 'good' ? 'bună' : 'acceptabilă'} pentru majoritatea afacerilor.
                      </p>
                    </>
                  ) : result.grossMarginPercent >= 0 ? (
                    <>
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Marja de {formatPercent(result.grossMarginPercent)} este scăzută. Consideră ajustarea prețului sau reducerea costurilor.
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Atenție! La acest preț vei avea o pierdere de {formatCurrency(Math.abs(result.profit))} RON pe unitate.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RefreshCw className="mr-2 inline-block h-4 w-4" />
              Resetare
            </button>
            {result && showHistory && (
              <button
                onClick={handleSaveToHistory}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <History className="mr-2 inline-block h-4 w-4" />
                Salvează
              </button>
            )}
          </div>

          {/* Tips */}
          {variant === 'full' && (
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <button
                onClick={() => setShowTips(!showTips)}
                className="flex w-full items-center justify-between text-sm font-medium text-blue-700 dark:text-blue-300"
              >
                <span className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Sfaturi pentru stabilirea prețurilor
                </span>
                {showTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              <AnimatePresence>
                {showTips && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 border-t border-blue-200 pt-3 dark:border-blue-800"
                  >
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      • Marja brută de 25-40% este recomandată pentru retail
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      • În servicii, marjele pot ajunge la 50-70%
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      • Nu uita să incluzi costurile indirecte în calcul
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      • Analizează prețurile competitorilor pentru referință
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="border-t p-5 dark:border-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Istoric calcule
            </h3>
            <button
              onClick={() => setHistory([])}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="mr-1 inline-block h-3 w-3" />
              Șterge tot
            </button>
          </div>

          <div className="space-y-2">
            {history.map(calc => (
              <div
                key={calc.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatCurrency(calc.costPrice)} → {formatCurrency(calc.sellingPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{formatCurrency(calc.profit)}
                  </span>
                  <MarginIndicator marginPercent={calc.grossMarginPercent} size="sm" showLabel={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Quick Margin Display
// ============================================================================

interface QuickMarginDisplayProps {
  cost: number
  sellingPrice: number
  showBreakdown?: boolean
  className?: string
}

export function QuickMarginDisplay({
  cost,
  sellingPrice,
  showBreakdown = true,
  className
}: QuickMarginDisplayProps) {
  const margin = calculateGrossMargin(cost, sellingPrice)
  const profit = sellingPrice - cost

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <MarginIndicator marginPercent={margin} size="sm" showLabel={false} />
      {showBreakdown && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({profit >= 0 ? '+' : ''}{formatCurrency(profit)} RON)
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Main Export
// ============================================================================

export default ProfitCalculator
