'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type RadioGroupSize = 'sm' | 'md' | 'lg';
export type RadioGroupVariant = 'default' | 'outline' | 'card' | 'button';

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
  disabled?: boolean;
  size: RadioGroupSize;
  variant: RadioGroupVariant;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroup() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error('useRadioGroup must be used within a RadioGroup');
  }
  return context;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<RadioGroupSize, { radio: string; indicator: string; label: string }> = {
  sm: {
    radio: 'h-4 w-4',
    indicator: 'h-2 w-2',
    label: 'text-sm',
  },
  md: {
    radio: 'h-5 w-5',
    indicator: 'h-2.5 w-2.5',
    label: 'text-base',
  },
  lg: {
    radio: 'h-6 w-6',
    indicator: 'h-3 w-3',
    label: 'text-lg',
  },
};

// ============================================================================
// RadioGroup
// ============================================================================

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  size?: RadioGroupSize;
  variant?: RadioGroupVariant;
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = '',
      onValueChange,
      name,
      disabled = false,
      size = 'md',
      variant = 'default',
      orientation = 'vertical',
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const generatedName = React.useId();
    const groupName = name || generatedName;

    const handleValueChange = React.useCallback(
      (newValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange]
    );

    return (
      <RadioGroupContext.Provider
        value={{
          value,
          onValueChange: handleValueChange,
          name: groupName,
          disabled,
          size,
          variant,
        }}
      >
        <div
          ref={ref}
          role="radiogroup"
          aria-orientation={orientation}
          className={cn(
            'flex',
            orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row flex-wrap gap-4',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

// ============================================================================
// RadioGroupItem
// ============================================================================

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  description?: string;
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, label, description, disabled: itemDisabled, id, ...props }, ref) => {
    const { value: groupValue, onValueChange, name, disabled: groupDisabled, size, variant } = useRadioGroup();
    const isChecked = groupValue === value;
    const isDisabled = groupDisabled || itemDisabled;
    const inputId = id || `${name}-${value}`;

    const handleChange = () => {
      if (!isDisabled && typeof value === 'string') {
        onValueChange(value);
      }
    };

    if (variant === 'card') {
      return (
        <label
          htmlFor={inputId}
          className={cn(
            'relative flex cursor-pointer rounded-lg border p-4 transition-all',
            isChecked
              ? 'border-primary bg-primary/5 ring-2 ring-primary'
              : 'border-border hover:border-primary/50',
            isDisabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          <input
            ref={ref}
            type="radio"
            id={inputId}
            name={name}
            value={value}
            checked={isChecked}
            disabled={isDisabled}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                sizeClasses[size].radio,
                isChecked ? 'border-primary bg-primary' : 'border-muted-foreground'
              )}
            >
              <AnimatePresence>
                {isChecked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={cn('rounded-full bg-primary-foreground', sizeClasses[size].indicator)}
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col">
              {label && (
                <span className={cn('font-medium', sizeClasses[size].label)}>{label}</span>
              )}
              {description && (
                <span className="text-sm text-muted-foreground">{description}</span>
              )}
            </div>
          </div>
        </label>
      );
    }

    if (variant === 'button') {
      return (
        <label
          htmlFor={inputId}
          className={cn(
            'inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 font-medium transition-all',
            isChecked
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
            isDisabled && 'cursor-not-allowed opacity-50',
            size === 'sm' && 'px-3 py-1.5 text-sm',
            size === 'lg' && 'px-5 py-2.5 text-lg',
            className
          )}
        >
          <input
            ref={ref}
            type="radio"
            id={inputId}
            name={name}
            value={value}
            checked={isChecked}
            disabled={isDisabled}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />
          {label}
        </label>
      );
    }

    return (
      <div className={cn('flex items-start gap-2', className)}>
        <label
          htmlFor={inputId}
          className={cn(
            'relative flex cursor-pointer items-center justify-center rounded-full border-2 transition-colors',
            sizeClasses[size].radio,
            isChecked
              ? 'border-primary bg-primary'
              : variant === 'outline'
                ? 'border-border bg-transparent'
                : 'border-muted-foreground bg-background',
            isDisabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <input
            ref={ref}
            type="radio"
            id={inputId}
            name={name}
            value={value}
            checked={isChecked}
            disabled={isDisabled}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />
          <AnimatePresence>
            {isChecked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={cn('rounded-full bg-primary-foreground', sizeClasses[size].indicator)}
              />
            )}
          </AnimatePresence>
        </label>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  'cursor-pointer font-medium',
                  sizeClasses[size].label,
                  isDisabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-sm text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

// ============================================================================
// Simple Radio Group (Pre-configured)
// ============================================================================

interface SimpleRadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SimpleRadioGroupProps extends Omit<RadioGroupProps, 'children'> {
  options: SimpleRadioOption[];
}

export function SimpleRadioGroup({ options, ...props }: SimpleRadioGroupProps) {
  return (
    <RadioGroup {...props}>
      {options.map((option) => (
        <RadioGroupItem
          key={option.value}
          value={option.value}
          label={option.label}
          description={option.description}
          disabled={option.disabled}
        />
      ))}
    </RadioGroup>
  );
}

// ============================================================================
// Card Radio Group
// ============================================================================

interface CardRadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface CardRadioGroupProps extends Omit<RadioGroupProps, 'children' | 'variant'> {
  options: CardRadioOption[];
}

export function CardRadioGroup({ options, ...props }: CardRadioGroupProps) {
  return (
    <RadioGroup {...props} variant="card">
      {options.map((option) => (
        <RadioGroupItem
          key={option.value}
          value={option.value}
          label={option.label}
          description={option.description}
          disabled={option.disabled}
        />
      ))}
    </RadioGroup>
  );
}

// ============================================================================
// Button Radio Group
// ============================================================================

interface ButtonRadioGroupProps extends Omit<RadioGroupProps, 'children' | 'variant' | 'orientation'> {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export function ButtonRadioGroup({ options, ...props }: ButtonRadioGroupProps) {
  return (
    <RadioGroup {...props} variant="button" orientation="horizontal">
      {options.map((option) => (
        <RadioGroupItem
          key={option.value}
          value={option.value}
          label={option.label}
          disabled={option.disabled}
        />
      ))}
    </RadioGroup>
  );
}

// ============================================================================
// Payment Method Radio (Accounting specific)
// ============================================================================

interface PaymentMethodOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

const defaultPaymentMethods: PaymentMethodOption[] = [
  { value: 'card', label: 'Card bancar', description: 'Visa, Mastercard, etc.' },
  { value: 'transfer', label: 'Transfer bancar', description: 'IBAN direct' },
  { value: 'cash', label: 'Numerar', description: 'Plata in numerar' },
  { value: 'crypto', label: 'Criptomonede', description: 'Bitcoin, Ethereum, etc.' },
];

interface PaymentMethodRadioProps extends Omit<RadioGroupProps, 'children' | 'variant'> {
  methods?: PaymentMethodOption[];
}

export function PaymentMethodRadio({
  methods = defaultPaymentMethods,
  ...props
}: PaymentMethodRadioProps) {
  return (
    <RadioGroup {...props} variant="card">
      {methods.map((method) => (
        <RadioGroupItem
          key={method.value}
          value={method.value}
          label={method.label}
          description={method.description}
        />
      ))}
    </RadioGroup>
  );
}

// ============================================================================
// Invoice Type Radio (Accounting specific)
// ============================================================================

const invoiceTypes = [
  { value: 'standard', label: 'Factura standard', description: 'Factura fiscala obisnuita' },
  { value: 'proforma', label: 'Factura proforma', description: 'Pentru oferte si estimari' },
  { value: 'avans', label: 'Factura de avans', description: 'Pentru plati in avans' },
  { value: 'storno', label: 'Factura storno', description: 'Pentru corectii si anulari' },
];

interface InvoiceTypeRadioProps extends Omit<RadioGroupProps, 'children' | 'variant'> {}

export function InvoiceTypeRadio(props: InvoiceTypeRadioProps) {
  return (
    <RadioGroup {...props} variant="card">
      {invoiceTypes.map((type) => (
        <RadioGroupItem
          key={type.value}
          value={type.value}
          label={type.label}
          description={type.description}
        />
      ))}
    </RadioGroup>
  );
}

// ============================================================================
// Tax Type Radio (Accounting specific)
// ============================================================================

const taxTypes = [
  { value: 'tva_19', label: 'TVA 19%', description: 'Cota standard' },
  { value: 'tva_9', label: 'TVA 9%', description: 'Cota redusa (alimente, etc.)' },
  { value: 'tva_5', label: 'TVA 5%', description: 'Cota super-redusa' },
  { value: 'tva_0', label: 'TVA 0%', description: 'Scutit cu drept de deducere' },
  { value: 'fara_tva', label: 'Fara TVA', description: 'Neplatitor de TVA' },
];

interface TaxTypeRadioProps extends Omit<RadioGroupProps, 'children' | 'variant'> {}

export function TaxTypeRadio(props: TaxTypeRadioProps) {
  return (
    <RadioGroup {...props} variant="card" orientation="horizontal">
      {taxTypes.map((tax) => (
        <RadioGroupItem
          key={tax.value}
          value={tax.value}
          label={tax.label}
          description={tax.description}
        />
      ))}
    </RadioGroup>
  );
}

// ============================================================================
// Export Hook
// ============================================================================

export { useRadioGroup };
