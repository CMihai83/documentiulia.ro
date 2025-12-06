'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Calculator,
  Percent,
  ArrowRight,
  ArrowLeftRight,
  RefreshCw,
  Copy,
  Check,
  Info,
  ChevronDown,
  History,
  Trash2,
  Plus,
  Minus,
  Receipt,
  FileText,
  ExternalLink
} from 'lucide-react'

// ============================================================================
// Types & Interfaces
// ============================================================================

export type VatRate = 0 | 5 | 9 | 19

export type CalculationMode = 'add_vat' | 'extract_vat' | 'between_rates'

export interface VatCalculation {
  id: string
  mode: CalculationMode
  inputAmount: number
  vatRate: VatRate
  targetRate?: VatRate
  netAmount: number
  vatAmount: number
  grossAmount: number
  timestamp: Date
  description?: string
}

export interface VatRateInfo {
  rate: VatRate
  label: string
  description: string
  examples: string[]
  legalBasis: string
}

// ============================================================================
// Configuration
// ============================================================================

const vatRatesConfig: Record<VatRate, VatRateInfo> = {
  0: {
    rate: 0,
    label: '0%',
    description: 'Scutit cu drept de deducere',
    examples: [
      'Export de bunuri',
      'Transport internațional',
      'Livrări intracomunitare'
    ],
    legalBasis: 'Art. 294 Cod Fiscal'
  },
  5: {
    rate: 5,
    label: '5%',
    description: 'Cotă redusă pentru locuințe',
    examples: [
      'Livrare de locuințe sociale',
      'Locuințe cu suprafață sub 120mp',
      'Prima casă pentru tineri'
    ],
    legalBasis: 'Art. 291 alin. (3) lit. c) Cod Fiscal'
  },
  9: {
    rate: 9,
    label: '9%',
    description: 'Cotă redusă',
    examples: [
      'Cazare hotelieră',
      'Servicii de restaurant',
      'Alimente de bază',
      'Medicamente',
      'Cărți, ziare, reviste'
    ],
    legalBasis: 'Art. 291 alin. (2) Cod Fiscal'
  },
  19: {
    rate: 19,
    label: '19%',
    description: 'Cotă standard',
    examples: [
      'Majoritatea bunurilor și serviciilor',
      'Electronice',
      'Mobilier',
      'Servicii profesionale'
    ],
    legalBasis: 'Art. 291 alin. (1) Cod Fiscal'
  }
}

const modeConfig: Record<CalculationMode, {
  label: string
  description: string
  icon: React.ElementType
}> = {
  add_vat: {
    label: 'Adaugă TVA',
    description: 'Calculează prețul cu TVA pornind de la prețul fără TVA',
    icon: Plus
  },
  extract_vat: {
    label: 'Extrage TVA',
    description: 'Calculează TVA-ul din prețul cu TVA inclus',
    icon: Minus
  },
  between_rates: {
    label: 'Conversie cotă',
    description: 'Convertește între diferite cote de TVA',
    icon: ArrowLeftRight
  }
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

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function calculateVat(
  amount: number,
  rate: VatRate,
  mode: 'add' | 'extract'
): { net: number; vat: number; gross: number } {
  if (mode === 'add') {
    const net = amount
    const vat = amount * (rate / 100)
    const gross = net + vat
    return { net, vat, gross }
  } else {
    const gross = amount
    const net = gross / (1 + rate / 100)
    const vat = gross - net
    return { net, vat, gross }
  }
}

function convertBetweenRates(
  grossAmount: number,
  fromRate: VatRate,
  toRate: VatRate
): { net: number; vat: number; gross: number } {
  // Extract net from original gross
  const net = grossAmount / (1 + fromRate / 100)
  // Calculate new VAT and gross
  const vat = net * (toRate / 100)
  const gross = net + vat
  return { net, vat, gross }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface VatRateButtonProps {
  rate: VatRate
  isSelected: boolean
  onClick: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function VatRateButton({
  rate,
  isSelected,
  onClick,
  size = 'md',
  className
}: VatRateButtonProps) {
  const config = vatRatesConfig[rate]

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border font-medium transition-all',
        isSelected
          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-base',
        size === 'lg' && 'px-5 py-3 text-lg',
        className
      )}
    >
      {config.label}
    </button>
  )
}

interface VatRateSelectorProps {
  value: VatRate
  onChange: (rate: VatRate) => void
  showInfo?: boolean
  className?: string
}

export function VatRateSelector({
  value,
  onChange,
  showInfo = false,
  className
}: VatRateSelectorProps) {
  const [showDetails, setShowDetails] = useState(false)
  const rates: VatRate[] = [0, 5, 9, 19]
  const selectedConfig = vatRatesConfig[value]

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        {rates.map(rate => (
          <VatRateButton
            key={rate}
            rate={rate}
            isSelected={rate === value}
            onClick={() => onChange(rate)}
          />
        ))}
      </div>

      {showInfo && (
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                TVA {selectedConfig.label} - {selectedConfig.description}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {selectedConfig.legalBasis}
              </p>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {showDetails ? 'Ascunde' : 'Exemple'}
            </button>
          </div>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 border-t pt-2 dark:border-gray-700"
              >
                <ul className="space-y-1">
                  {selectedConfig.examples.map((example, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      {example}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

interface ResultDisplayProps {
  label: string
  value: number
  highlight?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ResultDisplay({
  label,
  value,
  highlight = false,
  size = 'md',
  className
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value.toFixed(2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg border p-3',
      highlight
        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
      className
    )}>
      <span className={cn(
        'text-gray-600 dark:text-gray-400',
        size === 'sm' && 'text-sm',
        size === 'lg' && 'text-lg'
      )}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className={cn(
          'font-bold',
          highlight ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-xl',
          size === 'lg' && 'text-2xl'
        )}>
          {formatCurrency(value)} RON
        </span>
        <button
          onClick={handleCopy}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Copiază"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Calculator Component
// ============================================================================

interface VatCalculatorProps {
  variant?: 'default' | 'compact' | 'full'
  defaultMode?: CalculationMode
  defaultRate?: VatRate
  showHistory?: boolean
  maxHistoryItems?: number
  onCalculation?: (calculation: VatCalculation) => void
  className?: string
}

export function VatCalculator({
  variant = 'default',
  defaultMode = 'add_vat',
  defaultRate = 19,
  showHistory = true,
  maxHistoryItems = 10,
  onCalculation,
  className
}: VatCalculatorProps) {
  const [mode, setMode] = useState<CalculationMode>(defaultMode)
  const [amount, setAmount] = useState<string>('')
  const [vatRate, setVatRate] = useState<VatRate>(defaultRate)
  const [targetRate, setTargetRate] = useState<VatRate>(9)
  const [history, setHistory] = useState<VatCalculation[]>([])
  const [showRateInfo, setShowRateInfo] = useState(false)

  const result = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    if (numAmount <= 0) return null

    if (mode === 'add_vat') {
      return calculateVat(numAmount, vatRate, 'add')
    } else if (mode === 'extract_vat') {
      return calculateVat(numAmount, vatRate, 'extract')
    } else {
      return convertBetweenRates(numAmount, vatRate, targetRate)
    }
  }, [amount, vatRate, targetRate, mode])

  const handleCalculate = useCallback(() => {
    if (!result) return

    const calculation: VatCalculation = {
      id: Date.now().toString(),
      mode,
      inputAmount: parseFloat(amount),
      vatRate,
      targetRate: mode === 'between_rates' ? targetRate : undefined,
      netAmount: result.net,
      vatAmount: result.vat,
      grossAmount: result.gross,
      timestamp: new Date()
    }

    setHistory(prev => [calculation, ...prev].slice(0, maxHistoryItems))
    onCalculation?.(calculation)
  }, [result, mode, amount, vatRate, targetRate, maxHistoryItems, onCalculation])

  const handleClear = useCallback(() => {
    setAmount('')
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
  }, [])

  if (variant === 'compact') {
    return (
      <div className={cn('rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900', className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Sumă..."
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <div className="flex items-center gap-1">
            {([19, 9, 5, 0] as VatRate[]).map(rate => (
              <VatRateButton
                key={rate}
                rate={rate}
                isSelected={rate === vatRate}
                onClick={() => setVatRate(rate)}
                size="sm"
              />
            ))}
          </div>
        </div>

        {result && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
              <p className="text-xs text-gray-500">Fără TVA</p>
              <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(result.net)}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
              <p className="text-xs text-blue-600 dark:text-blue-400">TVA {vatRate}%</p>
              <p className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(result.vat)}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2 dark:bg-green-900/20">
              <p className="text-xs text-green-600 dark:text-green-400">Cu TVA</p>
              <p className="font-bold text-green-700 dark:text-green-300">{formatCurrency(result.gross)}</p>
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Calculator TVA
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Calculează rapid TVA pentru orice sumă
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="border-b p-4 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(modeConfig) as CalculationMode[]).map(m => {
            const config = modeConfig[m]
            const Icon = config.icon
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {modeConfig[mode].description}
        </p>
      </div>

      {/* Calculator Body */}
      <div className="p-5">
        <div className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'add_vat' ? 'Sumă fără TVA' : 'Sumă cu TVA'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border bg-white px-4 py-3 pr-16 text-lg font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                RON
              </span>
            </div>
          </div>

          {/* VAT Rate Selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {mode === 'between_rates' ? 'Cotă TVA sursă' : 'Cotă TVA'}
              </label>
              <button
                onClick={() => setShowRateInfo(!showRateInfo)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {showRateInfo ? 'Ascunde info' : 'Info cote'}
              </button>
            </div>
            <VatRateSelector
              value={vatRate}
              onChange={setVatRate}
              showInfo={showRateInfo}
            />
          </div>

          {/* Target Rate for conversion mode */}
          {mode === 'between_rates' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cotă TVA țintă
              </label>
              <VatRateSelector
                value={targetRate}
                onChange={setTargetRate}
              />
            </div>
          )}

          {/* Results */}
          {result && parseFloat(amount) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800"
            >
              <ResultDisplay
                label="Sumă fără TVA (net)"
                value={result.net}
                highlight={mode === 'extract_vat'}
              />
              <ResultDisplay
                label={`TVA ${mode === 'between_rates' ? targetRate : vatRate}%`}
                value={result.vat}
              />
              <ResultDisplay
                label="Sumă cu TVA (brut)"
                value={result.gross}
                highlight={mode === 'add_vat' || mode === 'between_rates'}
                size="lg"
              />

              {mode === 'between_rates' && (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span>Conversie: TVA {vatRate}%</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>TVA {targetRate}%</span>
                </div>
              )}
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
                onClick={handleCalculate}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <History className="mr-2 inline-block h-4 w-4" />
                Salvează în istoric
              </button>
            )}
          </div>
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
              onClick={handleClearHistory}
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
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium dark:bg-gray-700">
                    {modeConfig[calc.mode].label}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatCurrency(calc.inputAmount)} → {formatCurrency(calc.grossAmount)}
                  </span>
                </div>
                <span className="text-gray-500 dark:text-gray-500">
                  TVA: {formatCurrency(calc.vatAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer with legal info */}
      {variant === 'full' && (
        <div className="border-t p-4 dark:border-gray-800">
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p>Cotele TVA sunt reglementate de Codul Fiscal - Legea 227/2015.</p>
              <a
                href="https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/tva"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-medium hover:underline"
              >
                Informații oficiale ANAF <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Quick VAT Display Component
// ============================================================================

interface QuickVatDisplayProps {
  amount: number
  rate?: VatRate
  mode?: 'net' | 'gross'
  showBreakdown?: boolean
  className?: string
}

export function QuickVatDisplay({
  amount,
  rate = 19,
  mode = 'gross',
  showBreakdown = true,
  className
}: QuickVatDisplayProps) {
  const result = useMemo(() => {
    return calculateVat(amount, rate, mode === 'net' ? 'add' : 'extract')
  }, [amount, rate, mode])

  return (
    <div className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <span className="font-medium text-gray-900 dark:text-white">
        {formatCurrency(result.gross)} RON
      </span>
      {showBreakdown && (
        <span className="text-gray-500 dark:text-gray-400">
          (Net: {formatCurrency(result.net)} + TVA {rate}%: {formatCurrency(result.vat)})
        </span>
      )}
    </div>
  )
}

// ============================================================================
// VAT Breakdown Table
// ============================================================================

interface VatBreakdownTableProps {
  items: Array<{
    description: string
    amount: number
    rate: VatRate
  }>
  showTotals?: boolean
  className?: string
}

export function VatBreakdownTable({
  items,
  showTotals = true,
  className
}: VatBreakdownTableProps) {
  const calculations = useMemo(() => {
    return items.map(item => ({
      ...item,
      ...calculateVat(item.amount, item.rate, 'add')
    }))
  }, [items])

  const totals = useMemo(() => {
    return calculations.reduce(
      (acc, item) => ({
        net: acc.net + item.net,
        vat: acc.vat + item.vat,
        gross: acc.gross + item.gross
      }),
      { net: 0, vat: 0, gross: 0 }
    )
  }, [calculations])

  return (
    <div className={cn('rounded-xl border bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="px-4 py-3">Descriere</th>
            <th className="px-4 py-3 text-right">Net</th>
            <th className="px-4 py-3 text-right">TVA</th>
            <th className="px-4 py-3 text-right">Brut</th>
          </tr>
        </thead>
        <tbody>
          {calculations.map((item, idx) => (
            <tr key={idx} className="border-b dark:border-gray-800">
              <td className="px-4 py-3">
                <span className="text-gray-900 dark:text-white">{item.description}</span>
                <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {item.rate}%
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.net)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                {formatCurrency(item.vat)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.gross)}
              </td>
            </tr>
          ))}
        </tbody>
        {showTotals && (
          <tfoot>
            <tr className="bg-gray-50 font-medium dark:bg-gray-800">
              <td className="px-4 py-3 text-gray-900 dark:text-white">Total</td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                {formatCurrency(totals.net)}
              </td>
              <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                {formatCurrency(totals.vat)}
              </td>
              <td className="px-4 py-3 text-right text-lg text-gray-900 dark:text-white">
                {formatCurrency(totals.gross)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ============================================================================
// Main Export
// ============================================================================

export default VatCalculator
