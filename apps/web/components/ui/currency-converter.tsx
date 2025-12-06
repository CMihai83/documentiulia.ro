'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  ArrowLeftRight,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  History,
  Trash2,
  Star,
  StarOff,
  Search,
  ChevronDown,
  Globe,
  AlertTriangle,
  ExternalLink,
  Clock
} from 'lucide-react'

// ============================================================================
// Types & Interfaces
// ============================================================================

export type CurrencyCode =
  | 'RON' | 'EUR' | 'USD' | 'GBP' | 'CHF'
  | 'HUF' | 'PLN' | 'CZK' | 'BGN' | 'SEK'
  | 'NOK' | 'DKK' | 'JPY' | 'CNY' | 'CAD'
  | 'AUD' | 'TRY' | 'MDL' | 'UAH' | 'RSD'

export interface CurrencyInfo {
  code: CurrencyCode
  name: string
  symbol: string
  flag: string
  decimals: number
}

export interface ExchangeRate {
  from: CurrencyCode
  to: CurrencyCode
  rate: number
  date: Date
  source: string
  change?: number
  changePercent?: number
}

export interface ConversionResult {
  id: string
  from: CurrencyCode
  to: CurrencyCode
  amount: number
  result: number
  rate: number
  date: Date
  timestamp: Date
}

// ============================================================================
// Configuration
// ============================================================================

const currencyConfig: Record<CurrencyCode, CurrencyInfo> = {
  RON: { code: 'RON', name: 'Leu românesc', symbol: 'lei', flag: '🇷🇴', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2 },
  USD: { code: 'USD', name: 'Dolar american', symbol: '$', flag: '🇺🇸', decimals: 2 },
  GBP: { code: 'GBP', name: 'Liră sterlină', symbol: '£', flag: '🇬🇧', decimals: 2 },
  CHF: { code: 'CHF', name: 'Franc elvețian', symbol: 'CHF', flag: '🇨🇭', decimals: 2 },
  HUF: { code: 'HUF', name: 'Forint maghiar', symbol: 'Ft', flag: '🇭🇺', decimals: 0 },
  PLN: { code: 'PLN', name: 'Zlot polonez', symbol: 'zł', flag: '🇵🇱', decimals: 2 },
  CZK: { code: 'CZK', name: 'Coroană cehă', symbol: 'Kč', flag: '🇨🇿', decimals: 2 },
  BGN: { code: 'BGN', name: 'Leva bulgărească', symbol: 'лв', flag: '🇧🇬', decimals: 2 },
  SEK: { code: 'SEK', name: 'Coroană suedeză', symbol: 'kr', flag: '🇸🇪', decimals: 2 },
  NOK: { code: 'NOK', name: 'Coroană norvegiană', symbol: 'kr', flag: '🇳🇴', decimals: 2 },
  DKK: { code: 'DKK', name: 'Coroană daneză', symbol: 'kr', flag: '🇩🇰', decimals: 2 },
  JPY: { code: 'JPY', name: 'Yen japonez', symbol: '¥', flag: '🇯🇵', decimals: 0 },
  CNY: { code: 'CNY', name: 'Yuan chinezesc', symbol: '¥', flag: '🇨🇳', decimals: 2 },
  CAD: { code: 'CAD', name: 'Dolar canadian', symbol: 'C$', flag: '🇨🇦', decimals: 2 },
  AUD: { code: 'AUD', name: 'Dolar australian', symbol: 'A$', flag: '🇦🇺', decimals: 2 },
  TRY: { code: 'TRY', name: 'Liră turcească', symbol: '₺', flag: '🇹🇷', decimals: 2 },
  MDL: { code: 'MDL', name: 'Leu moldovenesc', symbol: 'L', flag: '🇲🇩', decimals: 2 },
  UAH: { code: 'UAH', name: 'Grivnă ucraineană', symbol: '₴', flag: '🇺🇦', decimals: 2 },
  RSD: { code: 'RSD', name: 'Dinar sârbesc', symbol: 'дин', flag: '🇷🇸', decimals: 2 }
}

// Sample BNR rates (in production, these would come from API)
const sampleBNRRates: Record<string, number> = {
  'EUR_RON': 4.9750,
  'USD_RON': 4.5820,
  'GBP_RON': 5.8150,
  'CHF_RON': 5.1200,
  'HUF_RON': 0.0126,
  'PLN_RON': 1.1550,
  'CZK_RON': 0.2015,
  'BGN_RON': 2.5430,
  'SEK_RON': 0.4380,
  'NOK_RON': 0.4220,
  'DKK_RON': 0.6670,
  'JPY_RON': 0.0305,
  'CNY_RON': 0.6350,
  'CAD_RON': 3.3750,
  'AUD_RON': 2.9850,
  'TRY_RON': 0.1340,
  'MDL_RON': 0.2520,
  'UAH_RON': 0.1110,
  'RSD_RON': 0.0425
}

const popularCurrencies: CurrencyCode[] = ['EUR', 'USD', 'GBP', 'CHF']

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number, currency: CurrencyCode): string {
  const config = currencyConfig[currency]
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  }).format(amount)
}

function formatCurrencyWithSymbol(amount: number, currency: CurrencyCode): string {
  const config = currencyConfig[currency]
  const formatted = formatCurrency(amount, currency)
  return `${formatted} ${config.symbol}`
}

function getRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1

  // Direct rate to RON
  if (to === 'RON') {
    const key = `${from}_RON`
    return sampleBNRRates[key] || 1
  }

  // Direct rate from RON
  if (from === 'RON') {
    const key = `${to}_RON`
    return 1 / (sampleBNRRates[key] || 1)
  }

  // Cross rate through RON
  const fromToRon = sampleBNRRates[`${from}_RON`] || 1
  const toToRon = sampleBNRRates[`${to}_RON`] || 1
  return fromToRon / toToRon
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// ============================================================================
// Sub-Components
// ============================================================================

interface CurrencySelectorProps {
  value: CurrencyCode
  onChange: (currency: CurrencyCode) => void
  exclude?: CurrencyCode
  favorites?: CurrencyCode[]
  onToggleFavorite?: (currency: CurrencyCode) => void
  className?: string
}

export function CurrencySelector({
  value,
  onChange,
  exclude,
  favorites = [],
  onToggleFavorite,
  className
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCurrencies = useMemo(() => {
    const all = Object.values(currencyConfig).filter(c => c.code !== exclude)

    if (!search) {
      // Sort: favorites first, then popular, then alphabetical
      return all.sort((a, b) => {
        const aFav = favorites.includes(a.code) ? 0 : 1
        const bFav = favorites.includes(b.code) ? 0 : 1
        if (aFav !== bFav) return aFav - bFav

        const aPop = popularCurrencies.includes(a.code) ? 0 : 1
        const bPop = popularCurrencies.includes(b.code) ? 0 : 1
        if (aPop !== bPop) return aPop - bPop

        return a.name.localeCompare(b.name, 'ro')
      })
    }

    const term = search.toLowerCase()
    return all.filter(c =>
      c.code.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term)
    )
  }, [search, exclude, favorites])

  const selected = currencyConfig[value]

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{selected.flag}</span>
          <div>
            <span className="font-medium text-gray-900 dark:text-white">{selected.code}</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{selected.name}</span>
          </div>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-gray-400 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-hidden rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Search */}
              <div className="border-b p-2 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Caută monedă..."
                    className="w-full rounded-lg border-0 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    autoFocus
                  />
                </div>
              </div>

              {/* Currency List */}
              <div className="max-h-60 overflow-y-auto">
                {filteredCurrencies.map(currency => {
                  const isFavorite = favorites.includes(currency.code)
                  const isSelected = currency.code === value

                  return (
                    <div
                      key={currency.code}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                      onClick={() => {
                        onChange(currency.code)
                        setIsOpen(false)
                        setSearch('')
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{currency.flag}</span>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {currency.code}
                          </span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            {currency.name}
                          </span>
                        </div>
                      </div>
                      {onToggleFavorite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleFavorite(currency.code)
                          }}
                          className="p-1 text-gray-400 hover:text-yellow-500"
                        >
                          {isFavorite ? (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface RateDisplayProps {
  from: CurrencyCode
  to: CurrencyCode
  rate: number
  change?: number
  date?: Date
  showReverse?: boolean
  className?: string
}

export function RateDisplay({
  from,
  to,
  rate,
  change,
  date,
  showReverse = true,
  className
}: RateDisplayProps) {
  const fromConfig = currencyConfig[from]
  const toConfig = currencyConfig[to]
  const reverseRate = 1 / rate

  return (
    <div className={cn('rounded-lg bg-gray-50 p-3 dark:bg-gray-800', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{fromConfig.flag}</span>
          <span className="font-medium text-gray-900 dark:text-white">1 {from}</span>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <span className="text-lg">{toConfig.flag}</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {formatCurrency(rate, to)} {to}
          </span>
        </div>

        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            change >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {change >= 0 ? '+' : ''}{change.toFixed(4)}
          </div>
        )}
      </div>

      {showReverse && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>1 {to}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{formatCurrency(reverseRate, from)} {from}</span>
        </div>
      )}

      {date && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          Curs BNR din {formatDate(date)}
        </div>
      )}
    </div>
  )
}

interface ConversionResultDisplayProps {
  amount: number
  from: CurrencyCode
  result: number
  to: CurrencyCode
  rate: number
  className?: string
}

export function ConversionResultDisplay({
  amount,
  from,
  result,
  to,
  rate,
  className
}: ConversionResultDisplayProps) {
  const [copied, setCopied] = useState(false)
  const fromConfig = currencyConfig[from]
  const toConfig = currencyConfig[to]

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result.toFixed(toConfig.decimals))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result, toConfig.decimals])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border-2 border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-600 dark:text-blue-400">Rezultat conversie</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(result, to)}
            </span>
            <span className="text-xl text-blue-600 dark:text-blue-400">
              {toConfig.symbol}
            </span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-300 dark:hover:bg-blue-700"
          title="Copiază rezultatul"
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
        <span>{formatCurrencyWithSymbol(amount, from)}</span>
        <ArrowRight className="h-4 w-4" />
        <span>{formatCurrencyWithSymbol(result, to)}</span>
      </div>

      <p className="mt-2 text-xs text-blue-500 dark:text-blue-500">
        Curs: 1 {from} = {formatCurrency(rate, to)} {to}
      </p>
    </motion.div>
  )
}

// ============================================================================
// Main Converter Component
// ============================================================================

interface CurrencyConverterProps {
  variant?: 'default' | 'compact' | 'full'
  defaultFrom?: CurrencyCode
  defaultTo?: CurrencyCode
  showHistory?: boolean
  showRateInfo?: boolean
  maxHistoryItems?: number
  onConversion?: (result: ConversionResult) => void
  className?: string
}

export function CurrencyConverter({
  variant = 'default',
  defaultFrom = 'EUR',
  defaultTo = 'RON',
  showHistory = true,
  showRateInfo = true,
  maxHistoryItems = 10,
  onConversion,
  className
}: CurrencyConverterProps) {
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(defaultFrom)
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(defaultTo)
  const [amount, setAmount] = useState<string>('')
  const [favorites, setFavorites] = useState<CurrencyCode[]>(['EUR', 'USD', 'GBP'])
  const [history, setHistory] = useState<ConversionResult[]>([])

  const rate = useMemo(() => getRate(fromCurrency, toCurrency), [fromCurrency, toCurrency])

  const result = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    if (numAmount <= 0) return null
    return numAmount * rate
  }, [amount, rate])

  const handleSwap = useCallback(() => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }, [fromCurrency, toCurrency])

  const handleClear = useCallback(() => {
    setAmount('')
  }, [])

  const handleToggleFavorite = useCallback((currency: CurrencyCode) => {
    setFavorites(prev =>
      prev.includes(currency)
        ? prev.filter(c => c !== currency)
        : [...prev, currency]
    )
  }, [])

  const handleSaveToHistory = useCallback(() => {
    if (result === null) return

    const conversion: ConversionResult = {
      id: Date.now().toString(),
      from: fromCurrency,
      to: toCurrency,
      amount: parseFloat(amount),
      result,
      rate,
      date: new Date(),
      timestamp: new Date()
    }

    setHistory(prev => [conversion, ...prev].slice(0, maxHistoryItems))
    onConversion?.(conversion)
  }, [result, fromCurrency, toCurrency, amount, rate, maxHistoryItems, onConversion])

  if (variant === 'compact') {
    return (
      <div className={cn('rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900', className)}>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-24 rounded-lg border bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800"
          />

          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
            className="rounded-lg border bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {Object.keys(currencyConfig).map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

          <button
            onClick={handleSwap}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>

          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value as CurrencyCode)}
            className="rounded-lg border bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {Object.keys(currencyConfig).map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

          {result !== null && (
            <span className="font-bold text-purple-600 dark:text-purple-400">
              = {formatCurrency(result, toCurrency)} {toCurrency}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="border-b p-5 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Convertor Valutar
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cursuri BNR actualizate zilnic
            </p>
          </div>
        </div>
      </div>

      {/* Converter Body */}
      <div className="p-5">
        <div className="space-y-4">
          {/* From Currency */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Din
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <CurrencySelector
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  exclude={toCurrency}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
              <div className="relative w-40">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border bg-white px-4 py-2.5 pr-12 text-right text-lg font-medium focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {currencyConfig[fromCurrency].symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="rounded-full border-2 border-gray-200 bg-white p-2 text-gray-400 transition-all hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </button>
          </div>

          {/* To Currency */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              În
            </label>
            <CurrencySelector
              value={toCurrency}
              onChange={setToCurrency}
              exclude={fromCurrency}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>

          {/* Result */}
          {result !== null && parseFloat(amount) > 0 && (
            <ConversionResultDisplay
              amount={parseFloat(amount)}
              from={fromCurrency}
              result={result}
              to={toCurrency}
              rate={rate}
            />
          )}

          {/* Rate Info */}
          {showRateInfo && (
            <RateDisplay
              from={fromCurrency}
              to={toCurrency}
              rate={rate}
              date={new Date()}
            />
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
            {result !== null && showHistory && (
              <button
                onClick={handleSaveToHistory}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                <History className="mr-2 inline-block h-4 w-4" />
                Salvează
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Rates */}
      {variant === 'full' && (
        <div className="border-t p-5 dark:border-gray-800">
          <h3 className="mb-3 font-medium text-gray-900 dark:text-white">
            Cursuri principale BNR
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {popularCurrencies.map(currency => (
              <div
                key={currency}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span>{currencyConfig[currency].flag}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    1 {currency}
                  </span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">
                  {formatCurrency(getRate(currency, 'RON'), 'RON')} RON
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p>Cursurile sunt orientative și pot diferi de cele ale băncilor comerciale.</p>
              <a
                href="https://www.bnr.ro/Cursul-de-schimb--702.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-medium hover:underline"
              >
                Cursuri oficiale BNR <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="border-t p-5 dark:border-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Istoric conversii
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
            {history.map(conv => (
              <div
                key={conv.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span>{currencyConfig[conv.from].flag}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatCurrency(conv.amount, conv.from)} {conv.from}
                  </span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <span>{currencyConfig[conv.to].flag}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(conv.result, conv.to)} {conv.to}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatTime(conv.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Quick Convert Display
// ============================================================================

interface QuickConvertProps {
  amount: number
  from: CurrencyCode
  to?: CurrencyCode
  showRate?: boolean
  className?: string
}

export function QuickConvert({
  amount,
  from,
  to = 'RON',
  showRate = false,
  className
}: QuickConvertProps) {
  const rate = getRate(from, to)
  const result = amount * rate

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="font-medium">
        {formatCurrencyWithSymbol(result, to)}
      </span>
      {showRate && (
        <span className="text-xs text-gray-500">
          (1 {from} = {formatCurrency(rate, to)} {to})
        </span>
      )}
    </span>
  )
}

// ============================================================================
// Multi-Currency Display
// ============================================================================

interface MultiCurrencyDisplayProps {
  amount: number
  baseCurrency: CurrencyCode
  currencies?: CurrencyCode[]
  className?: string
}

export function MultiCurrencyDisplay({
  amount,
  baseCurrency,
  currencies = ['RON', 'EUR', 'USD'],
  className
}: MultiCurrencyDisplayProps) {
  const conversions = useMemo(() => {
    return currencies
      .filter(c => c !== baseCurrency)
      .map(currency => ({
        currency,
        amount: amount * getRate(baseCurrency, currency),
        config: currencyConfig[currency]
      }))
  }, [amount, baseCurrency, currencies])

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {conversions.map(conv => (
        <span
          key={conv.currency}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800"
        >
          <span>{conv.config.flag}</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(conv.amount, conv.currency)}
          </span>
          <span className="text-gray-500">{conv.config.symbol}</span>
        </span>
      ))}
    </div>
  )
}

// ============================================================================
// Main Export
// ============================================================================

export default CurrencyConverter
