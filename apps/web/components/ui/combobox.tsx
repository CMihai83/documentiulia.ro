'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

export type ComboboxSize = 'sm' | 'md' | 'lg';

interface ComboboxContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  search: string;
  setSearch: (search: string) => void;
  multiple: boolean;
  size: ComboboxSize;
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useCombobox() {
  const context = React.useContext(ComboboxContext);
  if (!context) {
    throw new Error('useCombobox must be used within a Combobox');
  }
  return context;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<ComboboxSize, { trigger: string; input: string; item: string }> = {
  sm: {
    trigger: 'h-8 text-sm px-3',
    input: 'h-8 text-sm',
    item: 'py-1.5 px-2 text-sm',
  },
  md: {
    trigger: 'h-10 text-base px-3',
    input: 'h-10',
    item: 'py-2 px-3',
  },
  lg: {
    trigger: 'h-12 text-lg px-4',
    input: 'h-12 text-lg',
    item: 'py-2.5 px-4 text-lg',
  },
};

// ============================================================================
// Combobox
// ============================================================================

interface ComboboxProps {
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  size?: ComboboxSize;
  children: React.ReactNode;
}

export function Combobox({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  multiple = false,
  size = 'md',
  children,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | string[]>(
    multiple ? (Array.isArray(defaultValue) ? defaultValue : []) : (defaultValue as string)
  );

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string | string[]) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange]
  );

  return (
    <ComboboxContext.Provider
      value={{
        open,
        setOpen,
        value,
        onValueChange: handleValueChange,
        search,
        setSearch,
        multiple,
        size,
        highlightedIndex,
        setHighlightedIndex,
      }}
    >
      <div className="relative">{children}</div>
    </ComboboxContext.Provider>
  );
}

// ============================================================================
// ComboboxTrigger
// ============================================================================

interface ComboboxTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  placeholder?: string;
}

export const ComboboxTrigger = React.forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ className, placeholder = 'Selecteaza...', children, ...props }, ref) => {
    const { open, setOpen, value, multiple, size } = useCombobox();

    const displayValue = React.useMemo(() => {
      if (multiple && Array.isArray(value)) {
        if (value.length === 0) return placeholder;
        if (value.length === 1) return value[0];
        return `${value.length} selectate`;
      }
      return (value as string) || placeholder;
    }, [value, multiple, placeholder]);

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-background transition-colors',
          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          sizeClasses[size].trigger,
          className
        )}
        {...props}
      >
        <span className={cn(!value && 'text-muted-foreground')}>
          {children || displayValue}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn('ml-2 shrink-0 transition-transform', open && 'rotate-180')}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    );
  }
);
ComboboxTrigger.displayName = 'ComboboxTrigger';

// ============================================================================
// ComboboxContent
// ============================================================================

interface ComboboxContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

export const ComboboxContent = React.forwardRef<HTMLDivElement, ComboboxContentProps>(
  ({ className, align = 'start', children, ...props }, ref) => {
    const { open, setOpen, search, setSearch, size } = useCombobox();
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };

      if (open) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, setOpen]);

    // Close on escape
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, setOpen]);

    const alignClasses = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    };

    return (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-background shadow-lg',
              alignClasses[align],
              className
            )}
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cauta..."
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring',
                  sizeClasses[size].input
                )}
                autoFocus
              />
            </div>
            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
ComboboxContent.displayName = 'ComboboxContent';

// ============================================================================
// ComboboxEmpty
// ============================================================================

interface ComboboxEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ComboboxEmpty = React.forwardRef<HTMLDivElement, ComboboxEmptyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('py-6 text-center text-sm text-muted-foreground', className)}
        {...props}
      >
        {children || 'Niciun rezultat gasit.'}
      </div>
    );
  }
);
ComboboxEmpty.displayName = 'ComboboxEmpty';

// ============================================================================
// ComboboxGroup
// ============================================================================

interface ComboboxGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const ComboboxGroup = React.forwardRef<HTMLDivElement, ComboboxGroupProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('py-1', className)} {...props}>
        {label && (
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {label}
          </div>
        )}
        {children}
      </div>
    );
  }
);
ComboboxGroup.displayName = 'ComboboxGroup';

// ============================================================================
// ComboboxItem
// ============================================================================

interface ComboboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

export const ComboboxItem = React.forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ className, value, disabled = false, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange, multiple, size, setOpen } = useCombobox();

    const isSelected = multiple
      ? Array.isArray(selectedValue) && selectedValue.includes(value)
      : selectedValue === value;

    const handleSelect = () => {
      if (disabled) return;

      if (multiple && Array.isArray(selectedValue)) {
        if (isSelected) {
          onValueChange(selectedValue.filter((v) => v !== value));
        } else {
          onValueChange([...selectedValue, value]);
        }
      } else {
        onValueChange(value);
        setOpen(false);
      }
    };

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        onClick={handleSelect}
        className={cn(
          'relative flex cursor-pointer items-center rounded-sm transition-colors',
          'hover:bg-muted focus:bg-muted',
          isSelected && 'bg-primary/10 text-primary',
          disabled && 'cursor-not-allowed opacity-50',
          sizeClasses[size].item,
          className
        )}
        {...props}
      >
        {multiple && (
          <div
            className={cn(
              'mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary',
              isSelected && 'bg-primary text-primary-foreground'
            )}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </div>
        )}
        <span className="flex-1">{children}</span>
        {!multiple && isSelected && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </div>
    );
  }
);
ComboboxItem.displayName = 'ComboboxItem';

// ============================================================================
// Pre-configured Comboboxes
// ============================================================================

// Simple Combobox
interface SimpleComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: ComboboxSize;
  className?: string;
  disabled?: boolean;
}

export function SimpleCombobox({
  options,
  value,
  onValueChange,
  placeholder = 'Selecteaza...',
  size = 'md',
  className,
  disabled,
}: SimpleComboboxProps) {
  const [search, setSearch] = React.useState('');

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <Combobox value={value} onValueChange={(v) => onValueChange?.(v as string)} size={size}>
      <ComboboxTrigger className={className} disabled={disabled}>
        {selectedLabel || placeholder}
      </ComboboxTrigger>
      <ComboboxContent>
        {filteredOptions.length === 0 ? (
          <ComboboxEmpty />
        ) : (
          filteredOptions.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.icon && <span className="mr-2">{option.icon}</span>}
              <div>
                <div>{option.label}</div>
                {option.description && (
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                )}
              </div>
            </ComboboxItem>
          ))
        )}
      </ComboboxContent>
    </Combobox>
  );
}

// Multi-select Combobox
interface MultiComboboxProps {
  options: ComboboxOption[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  size?: ComboboxSize;
  className?: string;
  maxDisplay?: number;
}

export function MultiCombobox({
  options,
  value = [],
  onValueChange,
  placeholder = 'Selecteaza...',
  size = 'md',
  className,
  maxDisplay = 3,
}: MultiComboboxProps) {
  const displayText = React.useMemo(() => {
    if (value.length === 0) return placeholder;
    const labels = value
      .slice(0, maxDisplay)
      .map((v) => options.find((o) => o.value === v)?.label || v);
    if (value.length > maxDisplay) {
      return `${labels.join(', ')} +${value.length - maxDisplay}`;
    }
    return labels.join(', ');
  }, [value, options, placeholder, maxDisplay]);

  return (
    <Combobox
      value={value}
      onValueChange={(v) => onValueChange?.(v as string[])}
      multiple
      size={size}
    >
      <ComboboxTrigger className={className}>{displayText}</ComboboxTrigger>
      <ComboboxContent>
        {options.length === 0 ? (
          <ComboboxEmpty />
        ) : (
          options.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </ComboboxItem>
          ))
        )}
      </ComboboxContent>
    </Combobox>
  );
}

// ============================================================================
// Accounting-specific Comboboxes
// ============================================================================

// Currency Combobox
const currencies: ComboboxOption[] = [
  { value: 'RON', label: 'RON', description: 'Leu romanesc' },
  { value: 'EUR', label: 'EUR', description: 'Euro' },
  { value: 'USD', label: 'USD', description: 'Dolar american' },
  { value: 'GBP', label: 'GBP', description: 'Lira sterlina' },
  { value: 'CHF', label: 'CHF', description: 'Franc elvetian' },
  { value: 'HUF', label: 'HUF', description: 'Forint maghiar' },
  { value: 'PLN', label: 'PLN', description: 'Zlot polonez' },
  { value: 'CZK', label: 'CZK', description: 'Coroana ceha' },
  { value: 'BGN', label: 'BGN', description: 'Leva bulgara' },
];

interface CurrencyComboboxProps extends Omit<SimpleComboboxProps, 'options'> {}

export function CurrencyCombobox(props: CurrencyComboboxProps) {
  return <SimpleCombobox {...props} options={currencies} placeholder="Moneda..." />;
}

// Tax Rate Combobox
const taxRates: ComboboxOption[] = [
  { value: '19', label: 'TVA 19%', description: 'Cota standard' },
  { value: '9', label: 'TVA 9%', description: 'Cota redusa' },
  { value: '5', label: 'TVA 5%', description: 'Cota super-redusa' },
  { value: '0', label: 'TVA 0%', description: 'Scutit cu drept de deducere' },
  { value: 'none', label: 'Fara TVA', description: 'Neplatitor' },
];

interface TaxRateComboboxProps extends Omit<SimpleComboboxProps, 'options'> {}

export function TaxRateCombobox(props: TaxRateComboboxProps) {
  return <SimpleCombobox {...props} options={taxRates} placeholder="Cota TVA..." />;
}

// Payment Terms Combobox
const paymentTerms: ComboboxOption[] = [
  { value: 'immediate', label: 'Plata imediata', description: 'La livrare' },
  { value: 'net7', label: 'Net 7', description: '7 zile' },
  { value: 'net15', label: 'Net 15', description: '15 zile' },
  { value: 'net30', label: 'Net 30', description: '30 zile' },
  { value: 'net45', label: 'Net 45', description: '45 zile' },
  { value: 'net60', label: 'Net 60', description: '60 zile' },
  { value: 'net90', label: 'Net 90', description: '90 zile' },
  { value: 'eom', label: 'Sfarsit de luna', description: 'End of month' },
];

interface PaymentTermsComboboxProps extends Omit<SimpleComboboxProps, 'options'> {}

export function PaymentTermsCombobox(props: PaymentTermsComboboxProps) {
  return <SimpleCombobox {...props} options={paymentTerms} placeholder="Termen plata..." />;
}

// Account Type Combobox
const accountTypes: ComboboxOption[] = [
  { value: 'asset', label: 'Activ', description: 'Conturi de activ', group: 'Bilant' },
  { value: 'liability', label: 'Pasiv', description: 'Conturi de pasiv', group: 'Bilant' },
  { value: 'equity', label: 'Capital propriu', description: 'Capital social', group: 'Bilant' },
  { value: 'revenue', label: 'Venituri', description: 'Conturi de venituri', group: 'Rezultat' },
  { value: 'expense', label: 'Cheltuieli', description: 'Conturi de cheltuieli', group: 'Rezultat' },
];

interface AccountTypeComboboxProps extends Omit<SimpleComboboxProps, 'options'> {}

export function AccountTypeCombobox(props: AccountTypeComboboxProps) {
  return <SimpleCombobox {...props} options={accountTypes} placeholder="Tip cont..." />;
}

// ============================================================================
// Async Combobox (for remote data)
// ============================================================================

interface AsyncComboboxProps {
  loadOptions: (search: string) => Promise<ComboboxOption[]>;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: ComboboxSize;
  className?: string;
  debounceMs?: number;
}

export function AsyncCombobox({
  loadOptions,
  value,
  onValueChange,
  placeholder = 'Cauta...',
  size = 'md',
  className,
  debounceMs = 300,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!search) {
      setOptions([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await loadOptions(search);
        setOptions(results);
      } catch (error) {
        console.error('Error loading options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, loadOptions, debounceMs]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || value;

  return (
    <Combobox value={value} onValueChange={(v) => onValueChange?.(v as string)} size={size}>
      <ComboboxTrigger className={className}>{selectedLabel || placeholder}</ComboboxTrigger>
      <ComboboxContent>
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <svg className="mx-auto h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-2">Se incarca...</p>
          </div>
        ) : options.length === 0 ? (
          <ComboboxEmpty>
            {search ? 'Niciun rezultat gasit' : 'Introduceti text pentru cautare'}
          </ComboboxEmpty>
        ) : (
          options.map((option) => (
            <ComboboxItem key={option.value} value={option.value}>
              {option.label}
            </ComboboxItem>
          ))
        )}
      </ComboboxContent>
    </Combobox>
  );
}

// ============================================================================
// Export hook
// ============================================================================

export { useCombobox };
