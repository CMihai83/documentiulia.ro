'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type NumberInputSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<NumberInputSize, { input: string; button: string; icon: string }> = {
  sm: { input: 'h-8 text-sm px-2', button: 'h-8 w-8', icon: 'w-3 h-3' },
  md: { input: 'h-10 text-base px-3', button: 'h-10 w-10', icon: 'w-4 h-4' },
  lg: { input: 'h-12 text-lg px-4', button: 'h-12 w-12', icon: 'w-5 h-5' },
};

// ============================================================================
// Number Input Component
// ============================================================================

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'type'> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  size?: NumberInputSize;
  error?: boolean;
  showControls?: boolean;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  thousandSeparator?: string;
  decimalSeparator?: string;
  prefix?: string;
  suffix?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue,
      onChange,
      min,
      max,
      step = 1,
      precision = 0,
      size = 'md',
      error = false,
      showControls = true,
      allowNegative = true,
      allowDecimal = true,
      thousandSeparator = '.',
      decimalSeparator = ',',
      prefix,
      suffix,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [internalValue, setInternalValue] = React.useState<number | undefined>(defaultValue);
    const [displayValue, setDisplayValue] = React.useState('');

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    // Format number for display
    const formatForDisplay = React.useCallback(
      (num: number | undefined): string => {
        if (num === undefined || num === null || isNaN(num)) return '';

        const fixed = num.toFixed(precision);
        const [intPart, decPart] = fixed.split('.');

        // Add thousand separators
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

        if (precision > 0 && decPart) {
          return `${formattedInt}${decimalSeparator}${decPart}`;
        }
        return formattedInt;
      },
      [precision, thousandSeparator, decimalSeparator]
    );

    // Parse display value to number
    const parseFromDisplay = React.useCallback(
      (str: string): number | undefined => {
        if (!str) return undefined;

        // Remove thousand separators and replace decimal separator
        let cleaned = str.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '');
        cleaned = cleaned.replace(decimalSeparator, '.');

        const num = parseFloat(cleaned);
        if (isNaN(num)) return undefined;

        return num;
      },
      [thousandSeparator, decimalSeparator]
    );

    // Update display value when controlled value changes
    React.useEffect(() => {
      setDisplayValue(formatForDisplay(currentValue));
    }, [currentValue, formatForDisplay]);

    const clampValue = (value: number): number => {
      let clamped = value;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      return clamped;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      // Allow empty input
      if (!rawValue) {
        setDisplayValue('');
        if (!isControlled) setInternalValue(undefined);
        onChange?.(undefined);
        return;
      }

      // Validate input characters
      const validChars = new RegExp(
        `^${allowNegative ? '-?' : ''}[0-9${thousandSeparator}${allowDecimal ? decimalSeparator : ''}]*$`
      );

      if (!validChars.test(rawValue)) return;

      setDisplayValue(rawValue);

      const parsed = parseFromDisplay(rawValue);
      if (parsed !== undefined) {
        if (!isControlled) setInternalValue(parsed);
        onChange?.(parsed);
      }
    };

    const handleBlur = () => {
      if (currentValue !== undefined) {
        const clamped = clampValue(currentValue);
        const rounded = Number(clamped.toFixed(precision));
        setDisplayValue(formatForDisplay(rounded));
        if (!isControlled) setInternalValue(rounded);
        onChange?.(rounded);
      }
    };

    const increment = () => {
      if (disabled) return;
      const current = currentValue ?? 0;
      const newValue = clampValue(current + step);
      const rounded = Number(newValue.toFixed(precision));
      if (!isControlled) setInternalValue(rounded);
      onChange?.(rounded);
    };

    const decrement = () => {
      if (disabled) return;
      const current = currentValue ?? 0;
      const newValue = clampValue(current - step);
      const rounded = Number(newValue.toFixed(precision));
      if (!isControlled) setInternalValue(rounded);
      onChange?.(rounded);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        increment();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        decrement();
      }
    };

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <div className={cn('relative inline-flex', className)}>
        {prefix && (
          <div
            className={cn(
              'flex items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/50 px-3',
              sizeClasses[size].input,
              error && 'border-destructive',
              disabled && 'opacity-50'
            )}
          >
            <span className="text-muted-foreground">{prefix}</span>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'flex-1 border border-input bg-background text-right transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size].input,
            !prefix && !showControls && 'rounded-md',
            prefix && !showControls && 'rounded-r-md',
            !prefix && showControls && 'rounded-l-md',
            prefix && showControls && 'rounded-none border-l-0',
            error && 'border-destructive focus:ring-destructive',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        />

        {suffix && !showControls && (
          <div
            className={cn(
              'flex items-center justify-center rounded-r-md border border-l-0 border-input bg-muted/50 px-3',
              sizeClasses[size].input,
              error && 'border-destructive',
              disabled && 'opacity-50'
            )}
          >
            <span className="text-muted-foreground">{suffix}</span>
          </div>
        )}

        {showControls && (
          <div className="flex flex-col">
            <motion.button
              type="button"
              onClick={increment}
              disabled={disabled || (max !== undefined && (currentValue ?? 0) >= max)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center justify-center border border-l-0 border-input bg-muted/50 rounded-tr-md',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                sizeClasses[size].button,
                'h-1/2',
                error && 'border-destructive'
              )}
            >
              <svg className={sizeClasses[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </motion.button>
            <motion.button
              type="button"
              onClick={decrement}
              disabled={disabled || (min !== undefined && (currentValue ?? 0) <= min)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center justify-center border border-l-0 border-t-0 border-input bg-muted/50 rounded-br-md',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                sizeClasses[size].button,
                'h-1/2',
                error && 'border-destructive'
              )}
            >
              <svg className={sizeClasses[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';

// ============================================================================
// Quantity Input (for inventory/products)
// ============================================================================

interface QuantityInputProps extends Omit<NumberInputProps, 'precision' | 'allowDecimal' | 'allowNegative'> {
  onIncrement?: () => void;
  onDecrement?: () => void;
}

export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  ({ min = 0, step = 1, ...props }, ref) => {
    return (
      <NumberInput
        ref={ref}
        min={min}
        step={step}
        precision={0}
        allowDecimal={false}
        allowNegative={false}
        {...props}
      />
    );
  }
);
QuantityInput.displayName = 'QuantityInput';

// ============================================================================
// Percentage Input
// ============================================================================

interface PercentageInputProps extends Omit<NumberInputProps, 'suffix' | 'min' | 'max'> {
  allowOver100?: boolean;
}

export const PercentageInput = React.forwardRef<HTMLInputElement, PercentageInputProps>(
  ({ allowOver100 = false, precision = 2, ...props }, ref) => {
    return (
      <NumberInput
        ref={ref}
        suffix="%"
        min={0}
        max={allowOver100 ? undefined : 100}
        precision={precision}
        showControls={false}
        {...props}
      />
    );
  }
);
PercentageInput.displayName = 'PercentageInput';

// ============================================================================
// TVA Input (Romanian VAT rates)
// ============================================================================

interface TVAInputProps extends Omit<NumberInputProps, 'suffix' | 'precision'> {}

export const TVAInput = React.forwardRef<HTMLInputElement, TVAInputProps>((props, ref) => {
  return (
    <NumberInput
      ref={ref}
      suffix="% TVA"
      precision={0}
      min={0}
      max={100}
      showControls={false}
      placeholder="19"
      {...props}
    />
  );
});
TVAInput.displayName = 'TVAInput';

// ============================================================================
// Weight Input
// ============================================================================

type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

interface WeightInputProps extends Omit<NumberInputProps, 'suffix'> {
  unit?: WeightUnit;
  onUnitChange?: (unit: WeightUnit) => void;
}

export const WeightInput = React.forwardRef<HTMLInputElement, WeightInputProps>(
  ({ unit = 'kg', onUnitChange, precision = 2, ...props }, ref) => {
    const [currentUnit, setCurrentUnit] = React.useState<WeightUnit>(unit);

    const units: { value: WeightUnit; label: string }[] = [
      { value: 'kg', label: 'kg' },
      { value: 'g', label: 'g' },
      { value: 'lb', label: 'lb' },
      { value: 'oz', label: 'oz' },
    ];

    return (
      <div className="flex">
        <NumberInput
          ref={ref}
          precision={precision}
          min={0}
          showControls={false}
          className="flex-1"
          {...props}
        />
        <select
          value={currentUnit}
          onChange={(e) => {
            const newUnit = e.target.value as WeightUnit;
            setCurrentUnit(newUnit);
            onUnitChange?.(newUnit);
          }}
          className="h-10 rounded-r-md border border-l-0 border-input bg-muted/50 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {units.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
WeightInput.displayName = 'WeightInput';

// ============================================================================
// Number Field (with label and validation)
// ============================================================================

interface NumberFieldProps extends Omit<NumberInputProps, 'error'> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

export function NumberField({
  label,
  description,
  error,
  required,
  className,
  ...props
}: NumberFieldProps) {
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
      <NumberInput id={id} error={!!error} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// Stepper Input (horizontal +/- buttons)
// ============================================================================

interface StepperInputProps extends Omit<NumberInputProps, 'showControls'> {}

export const StepperInput = React.forwardRef<HTMLInputElement, StepperInputProps>(
  ({ size = 'md', disabled, min, max, step = 1, value, defaultValue, onChange, className, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [internalValue, setInternalValue] = React.useState<number>(defaultValue ?? 0);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const clampValue = (val: number): number => {
      let clamped = val;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      return clamped;
    };

    const updateValue = (newValue: number) => {
      const clamped = clampValue(newValue);
      if (!isControlled) setInternalValue(clamped);
      onChange?.(clamped);
    };

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <div className={cn('inline-flex items-center', className)}>
        <motion.button
          type="button"
          onClick={() => updateValue((currentValue ?? 0) - step)}
          disabled={disabled || (min !== undefined && (currentValue ?? 0) <= min)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex items-center justify-center rounded-l-md border border-input bg-muted/50',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size].button
          )}
        >
          <svg className={sizeClasses[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </motion.button>

        <input
          ref={inputRef}
          type="text"
          value={currentValue ?? 0}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10);
            if (!isNaN(num)) updateValue(num);
          }}
          disabled={disabled}
          className={cn(
            'w-16 border-y border-input bg-background text-center',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size].input,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        />

        <motion.button
          type="button"
          onClick={() => updateValue((currentValue ?? 0) + step)}
          disabled={disabled || (max !== undefined && (currentValue ?? 0) >= max)}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex items-center justify-center rounded-r-md border border-input bg-muted/50',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size].button
          )}
        >
          <svg className={sizeClasses[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>
      </div>
    );
  }
);
StepperInput.displayName = 'StepperInput';

// ============================================================================
// Accounting-Specific Inputs
// ============================================================================

// Invoice Number Input
interface InvoiceNumberInputProps extends Omit<NumberInputProps, 'prefix' | 'precision' | 'allowDecimal'> {
  series?: string;
}

export const InvoiceNumberInput = React.forwardRef<HTMLInputElement, InvoiceNumberInputProps>(
  ({ series = 'FC', ...props }, ref) => {
    return (
      <NumberInput
        ref={ref}
        prefix={series}
        precision={0}
        allowDecimal={false}
        allowNegative={false}
        showControls={false}
        placeholder="0001"
        {...props}
      />
    );
  }
);
InvoiceNumberInput.displayName = 'InvoiceNumberInput';

// Days Input (for payment terms)
interface DaysInputProps extends Omit<NumberInputProps, 'suffix' | 'precision' | 'allowDecimal' | 'allowNegative'> {}

export const DaysInput = React.forwardRef<HTMLInputElement, DaysInputProps>((props, ref) => {
  return (
    <NumberInput
      ref={ref}
      suffix="zile"
      precision={0}
      allowDecimal={false}
      allowNegative={false}
      min={0}
      max={365}
      showControls={false}
      placeholder="30"
      {...props}
    />
  );
});
DaysInput.displayName = 'DaysInput';

// Exchange Rate Input
interface ExchangeRateInputProps extends Omit<NumberInputProps, 'precision'> {
  fromCurrency?: string;
  toCurrency?: string;
}

export const ExchangeRateInput = React.forwardRef<HTMLInputElement, ExchangeRateInputProps>(
  ({ fromCurrency = 'EUR', toCurrency = 'RON', ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">1 {fromCurrency} =</span>
        <NumberInput
          ref={ref}
          precision={4}
          min={0}
          showControls={false}
          className="w-32"
          {...props}
        />
        <span className="text-sm text-muted-foreground">{toCurrency}</span>
      </div>
    );
  }
);
ExchangeRateInput.displayName = 'ExchangeRateInput';
