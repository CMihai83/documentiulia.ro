'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type CurrencyCode = 'RON' | 'EUR' | 'USD' | 'GBP' | 'CHF' | 'HUF' | 'PLN' | 'CZK' | 'BGN';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export interface CurrencyDisplayProps {
  value: number;
  currency?: CurrencyCode;
  showSymbol?: boolean;
  showCode?: boolean;
  showSign?: boolean;
  compact?: boolean;
  colorize?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
}

// ============================================================================
// Currency Configuration
// ============================================================================

const currencyConfig: Record<CurrencyCode, CurrencyConfig> = {
  RON: { code: 'RON', symbol: 'lei', name: 'Leu românesc', locale: 'ro-RO', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'Dolar american', locale: 'en-US', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'Liră sterlină', locale: 'en-GB', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Franc elvețian', locale: 'de-CH', decimals: 2 },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Forint maghiar', locale: 'hu-HU', decimals: 0 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Zlot polonez', locale: 'pl-PL', decimals: 2 },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Coroană cehă', locale: 'cs-CZ', decimals: 2 },
  BGN: { code: 'BGN', symbol: 'лв', name: 'Lev bulgar', locale: 'bg-BG', decimals: 2 },
};

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl font-semibold',
};

// ============================================================================
// Formatting Utilities
// ============================================================================

export function formatCurrency(
  value: number,
  currency: CurrencyCode = 'RON',
  options?: {
    compact?: boolean;
    showSign?: boolean;
  }
): string {
  const config = currencyConfig[currency];

  if (options?.compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    const formatted = formatter.format(value);
    return options?.showSign && value > 0 ? `+${formatted}` : formatted;
  }

  const formatter = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  const formatted = formatter.format(value);
  return options?.showSign && value > 0 ? `+${formatted}` : formatted;
}

export function formatNumber(
  value: number,
  locale: string = 'ro-RO',
  decimals: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ============================================================================
// Currency Display Component
// ============================================================================

export function CurrencyDisplay({
  value,
  currency = 'RON',
  showSymbol = true,
  showCode = false,
  showSign = false,
  compact = false,
  colorize = false,
  size = 'md',
  animate = false,
  className,
}: CurrencyDisplayProps) {
  const config = currencyConfig[currency];
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    if (animate && value !== displayValue) {
      const diff = value - displayValue;
      const steps = 20;
      const stepValue = diff / steps;
      let current = displayValue;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        current += stepValue;
        if (step >= steps) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(current);
        }
      }, 20);

      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [value, animate, displayValue]);

  const formattedValue = React.useMemo(() => {
    let result = formatNumber(Math.abs(displayValue), config.locale, config.decimals);

    if (showSign && displayValue !== 0) {
      result = displayValue > 0 ? `+${result}` : `-${result}`;
    } else if (displayValue < 0) {
      result = `-${result}`;
    }

    return result;
  }, [displayValue, config, showSign]);

  const colorClass = React.useMemo(() => {
    if (!colorize) return '';
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return '';
  }, [value, colorize]);

  return (
    <span className={cn(sizeClasses[size], colorClass, 'tabular-nums', className)}>
      {showSymbol && currency !== 'RON' && (
        <span className="mr-0.5">{config.symbol}</span>
      )}
      {formattedValue}
      {showSymbol && currency === 'RON' && (
        <span className="ml-1 text-muted-foreground">{config.symbol}</span>
      )}
      {showCode && !showSymbol && (
        <span className="ml-1 text-muted-foreground text-xs">{config.code}</span>
      )}
    </span>
  );
}

// ============================================================================
// Currency Comparison Component
// ============================================================================

export interface CurrencyComparisonProps {
  current: number;
  previous: number;
  currency?: CurrencyCode;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CurrencyComparison({
  current,
  previous,
  currency = 'RON',
  showPercentage = true,
  size = 'md',
  className,
}: CurrencyComparisonProps) {
  const diff = current - previous;
  const percentChange = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = diff > 0;
  const isZero = diff === 0;

  const sizeConfig = {
    sm: { text: 'text-xs', icon: 'w-3 h-3' },
    md: { text: 'text-sm', icon: 'w-4 h-4' },
    lg: { text: 'text-base', icon: 'w-5 h-5' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CurrencyDisplay value={current} currency={currency} size={size} />

      {!isZero && (
        <span
          className={cn(
            'flex items-center gap-0.5',
            sizeConfig[size].text,
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}
        >
          {isPositive ? (
            <svg className={sizeConfig[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : (
            <svg className={sizeConfig[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {showPercentage && (
            <span>{Math.abs(percentChange).toFixed(1)}%</span>
          )}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Currency Input Component
// ============================================================================

export interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: CurrencyCode;
  min?: number;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({
  value,
  onChange,
  currency = 'RON',
  min,
  max,
  disabled = false,
  placeholder = '0,00',
  className,
}: CurrencyInputProps) {
  const config = currencyConfig[currency];
  const [inputValue, setInputValue] = React.useState(
    value ? formatNumber(value, config.locale, config.decimals) : ''
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,.-]/g, '');
    setInputValue(raw);

    // Parse the value
    const parsed = parseFloat(raw.replace(',', '.'));
    if (!isNaN(parsed)) {
      let newValue = parsed;
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    if (value) {
      setInputValue(formatNumber(value, config.locale, config.decimals));
    } else {
      setInputValue('');
    }
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      {currency !== 'RON' && (
        <span className="absolute left-3 text-muted-foreground">
          {config.symbol}
        </span>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2 border rounded-md bg-background text-right',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          currency !== 'RON' && 'pl-8'
        )}
      />
      {currency === 'RON' && (
        <span className="absolute right-3 text-muted-foreground text-sm">
          {config.symbol}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Currency Selector Component
// ============================================================================

export interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  currencies?: CurrencyCode[];
  disabled?: boolean;
  className?: string;
}

export function CurrencySelector({
  value,
  onChange,
  currencies = ['RON', 'EUR', 'USD', 'GBP'],
  disabled = false,
  className,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedConfig = currencyConfig[value];

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 border rounded-md bg-background',
          'hover:bg-muted transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <span className="font-medium">{selectedConfig.code}</span>
        <span className="text-muted-foreground text-sm">{selectedConfig.symbol}</span>
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-lg shadow-lg z-10 py-1"
          >
            {currencies.map((currency) => {
              const config = currencyConfig[currency];
              return (
                <button
                  key={currency}
                  onClick={() => {
                    onChange(currency);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors',
                    value === currency && 'bg-primary/5 text-primary'
                  )}
                >
                  <span className="font-medium w-10">{config.code}</span>
                  <span className="text-muted-foreground">{config.symbol}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{config.name}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Currency Exchange Rate Display
// ============================================================================

export interface ExchangeRateDisplayProps {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  previousRate?: number;
  date?: Date;
  source?: string;
  className?: string;
}

export function ExchangeRateDisplay({
  fromCurrency,
  toCurrency,
  rate,
  previousRate,
  date,
  source = 'BNR',
  className,
}: ExchangeRateDisplayProps) {
  const fromConfig = currencyConfig[fromCurrency];
  const toConfig = currencyConfig[toCurrency];
  const change = previousRate ? ((rate - previousRate) / previousRate) * 100 : 0;

  return (
    <div className={cn('p-4 bg-muted/50 rounded-lg', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{fromConfig.code}</span>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-semibold">{toConfig.code}</span>
        </div>
        {date && (
          <span className="text-xs text-muted-foreground">
            {date.toLocaleDateString('ro-RO')}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">
          {rate.toFixed(4)}
        </span>
        <span className="text-muted-foreground">{toConfig.symbol}</span>

        {change !== 0 && (
          <span
            className={cn(
              'text-sm flex items-center gap-1',
              change > 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {change > 0 ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Sursă: {source}
      </p>
    </div>
  );
}

// ============================================================================
// Currency Conversion Component
// ============================================================================

export interface CurrencyConverterProps {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  amount?: number;
  onAmountChange?: (amount: number) => void;
  className?: string;
}

export function CurrencyConverter({
  fromCurrency,
  toCurrency,
  rate,
  amount = 0,
  onAmountChange,
  className,
}: CurrencyConverterProps) {
  const [localAmount, setLocalAmount] = React.useState(amount);
  const convertedAmount = localAmount * rate;

  const handleAmountChange = (value: number) => {
    setLocalAmount(value);
    onAmountChange?.(value);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Din</label>
          <CurrencyInput
            value={localAmount}
            onChange={handleAmountChange}
            currency={fromCurrency}
          />
        </div>

        <div className="pt-6">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">În</label>
          <div className="px-3 py-2 border rounded-md bg-muted/50 text-right">
            <CurrencyDisplay value={convertedAmount} currency={toCurrency} />
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        1 {currencyConfig[fromCurrency].code} = {rate.toFixed(4)} {currencyConfig[toCurrency].code}
      </p>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Amount Display
// ============================================================================

export interface InvoiceAmountDisplayProps {
  subtotal: number;
  vatAmount: number;
  total: number;
  currency?: CurrencyCode;
  showBreakdown?: boolean;
  className?: string;
}

export function InvoiceAmountDisplay({
  subtotal,
  vatAmount,
  total,
  currency = 'RON',
  showBreakdown = true,
  className,
}: InvoiceAmountDisplayProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {showBreakdown && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <CurrencyDisplay value={subtotal} currency={currency} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">TVA:</span>
            <CurrencyDisplay value={vatAmount} currency={currency} />
          </div>
          <div className="border-t pt-2 mt-2" />
        </>
      )}
      <div className="flex justify-between font-semibold">
        <span>Total:</span>
        <CurrencyDisplay value={total} currency={currency} size="lg" />
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Balance Display
// ============================================================================

export interface BalanceDisplayProps {
  balance: number;
  currency?: CurrencyCode;
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function BalanceDisplay({
  balance,
  currency = 'RON',
  label = 'Sold curent',
  trend,
  className,
}: BalanceDisplayProps) {
  return (
    <div className={cn('p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5', className)}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <CurrencyDisplay
          value={balance}
          currency={currency}
          size="xl"
          colorize={balance < 0}
        />
        {trend && trend !== 'neutral' && (
          <span
            className={cn(
              'p-1 rounded-full',
              trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            )}
          >
            {trend === 'up' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  currencyConfig,
  type CurrencyConfig as CurrencyConfiguration,
  type CurrencyComparisonProps as CurrencyCompareProps,
  type CurrencyInputProps as CurrencyFieldProps,
  type CurrencySelectorProps as CurrencyPickerProps,
  type ExchangeRateDisplayProps as ExchangeRateProps,
  type CurrencyConverterProps as CurrencyConvertProps,
  type InvoiceAmountDisplayProps as InvoiceTotalProps,
  type BalanceDisplayProps as AccountBalanceProps,
};
