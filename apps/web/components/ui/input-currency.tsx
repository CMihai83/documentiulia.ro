'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
}

const currencies: Currency[] = [
  { code: 'RON', symbol: 'lei', name: 'Leu romanesc', decimals: 2, symbolPosition: 'after' },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, symbolPosition: 'before' },
  { code: 'USD', symbol: '$', name: 'Dolar american', decimals: 2, symbolPosition: 'before' },
  { code: 'GBP', symbol: '£', name: 'Lira sterlina', decimals: 2, symbolPosition: 'before' },
  { code: 'CHF', symbol: 'CHF', name: 'Franc elvetian', decimals: 2, symbolPosition: 'before' },
  { code: 'HUF', symbol: 'Ft', name: 'Forint maghiar', decimals: 0, symbolPosition: 'after' },
  { code: 'PLN', symbol: 'zł', name: 'Zlot polonez', decimals: 2, symbolPosition: 'after' },
  { code: 'CZK', symbol: 'Kč', name: 'Coroana ceha', decimals: 2, symbolPosition: 'after' },
  { code: 'BGN', symbol: 'лв', name: 'Leva bulgara', decimals: 2, symbolPosition: 'after' },
];

export type InputCurrencySize = 'sm' | 'md' | 'lg';

// ============================================================================
// Utility Functions
// ============================================================================

function formatNumber(value: number, decimals: number, locale: string = 'ro-RO'): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function parseNumber(value: string): number {
  // Handle Romanian format (1.234,56) and international format (1,234.56)
  const cleaned = value
    .replace(/[^\d,.\-]/g, '')
    .replace(/\.(?=.*\.)/g, '') // Remove all dots except last one
    .replace(/,(?=.*,)/g, ''); // Remove all commas except last one

  // Determine decimal separator
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  let normalized: string;
  if (lastComma > lastDot) {
    // Romanian format: comma is decimal separator
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // International format: dot is decimal separator
    normalized = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function formatCurrency(value: number, currency: Currency): string {
  const formatted = formatNumber(value, currency.decimals);
  if (currency.symbolPosition === 'before') {
    return `${currency.symbol}${formatted}`;
  }
  return `${formatted} ${currency.symbol}`;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<InputCurrencySize, { wrapper: string; input: string; addon: string }> = {
  sm: {
    wrapper: 'h-8',
    input: 'h-8 text-sm px-3',
    addon: 'h-8 px-2 text-sm',
  },
  md: {
    wrapper: 'h-10',
    input: 'h-10 px-3',
    addon: 'h-10 px-3',
  },
  lg: {
    wrapper: 'h-12',
    input: 'h-12 text-lg px-4',
    addon: 'h-12 px-4 text-lg',
  },
};

// ============================================================================
// InputCurrency Component
// ============================================================================

interface InputCurrencyProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'value'> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number, formatted: string) => void;
  currency?: string;
  onCurrencyChange?: (currency: Currency) => void;
  showCurrencySelector?: boolean;
  size?: InputCurrencySize;
  error?: boolean;
  locale?: string;
  allowNegative?: boolean;
}

export const InputCurrency = React.forwardRef<HTMLInputElement, InputCurrencyProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = 0,
      onChange,
      currency: currencyCode = 'RON',
      onCurrencyChange,
      showCurrencySelector = false,
      size = 'md',
      error = false,
      locale = 'ro-RO',
      allowNegative = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedCurrency, setSelectedCurrency] = React.useState<Currency>(
      currencies.find((c) => c.code === currencyCode) || currencies[0]
    );
    const [displayValue, setDisplayValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const isControlled = controlledValue !== undefined;
    const numericValue = isControlled ? controlledValue : parseNumber(displayValue) || defaultValue;

    // Initialize display value
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatNumber(numericValue, selectedCurrency.decimals, locale));
      }
    }, [numericValue, selectedCurrency.decimals, locale, isFocused]);

    // Update currency when prop changes
    React.useEffect(() => {
      const newCurrency = currencies.find((c) => c.code === currencyCode);
      if (newCurrency) {
        setSelectedCurrency(newCurrency);
      }
    }, [currencyCode]);

    // Close dropdown on outside click
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Allow only valid characters
      const validChars = allowNegative ? /[^\d,.\-]/g : /[^\d,.]/g;
      inputValue = inputValue.replace(validChars, '');

      setDisplayValue(inputValue);

      const parsed = parseNumber(inputValue);
      onChange?.(parsed, formatCurrency(parsed, selectedCurrency));
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Select all text on focus
      setTimeout(() => inputRef.current?.select(), 0);
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Format the value on blur
      const parsed = parseNumber(displayValue);
      setDisplayValue(formatNumber(parsed, selectedCurrency.decimals, locale));
      onChange?.(parsed, formatCurrency(parsed, selectedCurrency));
    };

    const handleCurrencySelect = (currency: Currency) => {
      setSelectedCurrency(currency);
      setIsOpen(false);
      onCurrencyChange?.(currency);
      inputRef.current?.focus();
    };

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <div className={cn('relative flex', sizeClasses[size].wrapper, className)} ref={dropdownRef}>
        {/* Currency Symbol/Selector (Before) */}
        {selectedCurrency.symbolPosition === 'before' && (
          showCurrencySelector ? (
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted/50 transition-colors',
                'hover:bg-muted focus:outline-none',
                sizeClasses[size].addon,
                error && 'border-destructive',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="font-medium">{selectedCurrency.symbol}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          ) : (
            <div
              className={cn(
                'flex items-center rounded-l-md border border-r-0 border-input bg-muted/50',
                sizeClasses[size].addon,
                error && 'border-destructive',
                disabled && 'opacity-50'
              )}
            >
              <span className="font-medium">{selectedCurrency.symbol}</span>
            </div>
          )
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            'flex-1 border border-input bg-background text-right transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            selectedCurrency.symbolPosition === 'before' ? 'rounded-r-md' : 'rounded-l-md',
            !showCurrencySelector && selectedCurrency.symbolPosition === 'before' && 'rounded-l-none',
            !showCurrencySelector && selectedCurrency.symbolPosition === 'after' && 'rounded-r-none',
            showCurrencySelector && 'rounded-none',
            sizeClasses[size].input,
            error && 'border-destructive focus:ring-destructive',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        />

        {/* Currency Symbol/Selector (After) */}
        {selectedCurrency.symbolPosition === 'after' && (
          showCurrencySelector ? (
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1 rounded-r-md border border-l-0 border-input bg-muted/50 transition-colors',
                'hover:bg-muted focus:outline-none',
                sizeClasses[size].addon,
                error && 'border-destructive',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="font-medium">{selectedCurrency.symbol}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          ) : (
            <div
              className={cn(
                'flex items-center rounded-r-md border border-l-0 border-input bg-muted/50',
                sizeClasses[size].addon,
                error && 'border-destructive',
                disabled && 'opacity-50'
              )}
            >
              <span className="font-medium">{selectedCurrency.symbol}</span>
            </div>
          )
        )}

        {/* Currency Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-background shadow-lg"
            >
              <div className="max-h-60 overflow-y-auto p-1">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => handleCurrencySelect(currency)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left transition-colors',
                      'hover:bg-muted focus:bg-muted focus:outline-none',
                      selectedCurrency.code === currency.code && 'bg-muted'
                    )}
                  >
                    <span className="font-medium w-8">{currency.symbol}</span>
                    <span className="flex-1">{currency.code}</span>
                    <span className="text-xs text-muted-foreground">{currency.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
InputCurrency.displayName = 'InputCurrency';

// ============================================================================
// Simple Currency Input (RON only)
// ============================================================================

interface SimpleRONCurrencyInputProps extends Omit<InputCurrencyProps, 'currency' | 'showCurrencySelector' | 'onCurrencyChange'> {}

export const SimpleRONCurrencyInput = React.forwardRef<HTMLInputElement, SimpleRONCurrencyInputProps>(
  (props, ref) => {
    return <InputCurrency ref={ref} {...props} currency="RON" showCurrencySelector={false} />;
  }
);
SimpleRONCurrencyInput.displayName = 'SimpleRONCurrencyInput';

// ============================================================================
// Currency Field (with label and validation)
// ============================================================================

interface CurrencyFieldProps extends InputCurrencyProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  required?: boolean;
}

export function CurrencyField({
  label,
  description,
  errorMessage,
  required,
  className,
  error,
  ...props
}: CurrencyFieldProps) {
  const id = React.useId();

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <InputCurrency id={id} error={error || !!errorMessage} {...props} />
      {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  );
}

// ============================================================================
// Currency Range Input
// ============================================================================

interface CurrencyRangeInputProps {
  minValue?: number;
  maxValue?: number;
  onMinChange?: (value: number) => void;
  onMaxChange?: (value: number) => void;
  currency?: string;
  size?: InputCurrencySize;
  className?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

export function CurrencyRangeInput({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  currency = 'RON',
  size = 'md',
  className,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
}: CurrencyRangeInputProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <InputCurrency
        value={minValue}
        onChange={(v) => onMinChange?.(v)}
        currency={currency}
        size={size}
        placeholder={minPlaceholder}
        className="flex-1"
      />
      <span className="text-muted-foreground">-</span>
      <InputCurrency
        value={maxValue}
        onChange={(v) => onMaxChange?.(v)}
        currency={currency}
        size={size}
        placeholder={maxPlaceholder}
        className="flex-1"
      />
    </div>
  );
}

// ============================================================================
// Currency Display (Read-only)
// ============================================================================

interface CurrencyDisplayProps {
  value: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showSign?: boolean;
  colorBySign?: boolean;
}

export function CurrencyDisplay({
  value,
  currency: currencyCode = 'RON',
  size = 'md',
  className,
  showSign = false,
  colorBySign = false,
}: CurrencyDisplayProps) {
  const currencyData = currencies.find((c) => c.code === currencyCode) || currencies[0];
  const formatted = formatNumber(Math.abs(value), currencyData.decimals);
  const sign = value < 0 ? '-' : value > 0 && showSign ? '+' : '';

  const sizeClassesDisplay = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl font-semibold',
  };

  const colorClass = colorBySign
    ? value > 0
      ? 'text-green-600 dark:text-green-400'
      : value < 0
        ? 'text-red-600 dark:text-red-400'
        : ''
    : '';

  return (
    <span className={cn('font-mono', sizeClassesDisplay[size], colorClass, className)}>
      {sign}
      {currencyData.symbolPosition === 'before' && currencyData.symbol}
      {formatted}
      {currencyData.symbolPosition === 'after' && ` ${currencyData.symbol}`}
    </span>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { currencies, formatNumber, parseNumber, formatCurrency };
