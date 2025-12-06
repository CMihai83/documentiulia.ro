'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type AutocompleteSize = 'sm' | 'md' | 'lg';

export interface AutocompleteOption<T = unknown> {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  data?: T;
}

export interface AutocompleteGroup<T = unknown> {
  label: string;
  options: AutocompleteOption<T>[];
}

const sizeClasses: Record<AutocompleteSize, { input: string; option: string; icon: string }> = {
  sm: { input: 'h-8 text-sm px-3', option: 'px-3 py-1.5 text-sm', icon: 'w-4 h-4' },
  md: { input: 'h-10 text-base px-3', option: 'px-3 py-2', icon: 'w-5 h-5' },
  lg: { input: 'h-12 text-lg px-4', option: 'px-4 py-3 text-lg', icon: 'w-6 h-6' },
};

// ============================================================================
// Autocomplete Component
// ============================================================================

interface AutocompleteProps<T = unknown> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'value'> {
  options: AutocompleteOption<T>[] | AutocompleteGroup<T>[];
  value?: string;
  onChange?: (value: string, option?: AutocompleteOption<T>) => void;
  onInputChange?: (inputValue: string) => void;
  size?: AutocompleteSize;
  loading?: boolean;
  error?: boolean;
  clearable?: boolean;
  freeSolo?: boolean;
  filterOptions?: (options: AutocompleteOption<T>[], inputValue: string) => AutocompleteOption<T>[];
  renderOption?: (option: AutocompleteOption<T>, isHighlighted: boolean) => React.ReactNode;
  emptyMessage?: string;
  loadingMessage?: string;
  minCharsToSearch?: number;
}

export function Autocomplete<T = unknown>({
  options,
  value,
  onChange,
  onInputChange,
  size = 'md',
  loading = false,
  error = false,
  clearable = true,
  freeSolo = false,
  filterOptions,
  renderOption,
  emptyMessage = 'Niciun rezultat',
  loadingMessage = 'Se incarca...',
  minCharsToSearch = 0,
  disabled,
  placeholder = 'Cauta...',
  className,
  ...props
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Flatten grouped options
  const flatOptions = React.useMemo(() => {
    const isGrouped = options.length > 0 && 'options' in options[0];
    if (isGrouped) {
      return (options as AutocompleteGroup<T>[]).flatMap((group) => group.options);
    }
    return options as AutocompleteOption<T>[];
  }, [options]);

  // Filter options based on input
  const filteredOptions = React.useMemo(() => {
    if (inputValue.length < minCharsToSearch) return [];

    if (filterOptions) {
      return filterOptions(flatOptions, inputValue);
    }

    return flatOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        option.description?.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [flatOptions, inputValue, filterOptions, minCharsToSearch]);

  // Set input value from selected value
  React.useEffect(() => {
    if (value) {
      const selectedOption = flatOptions.find((opt) => opt.value === value);
      if (selectedOption) {
        setInputValue(selectedOption.label);
      }
    }
  }, [value, flatOptions]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]');
      const item = items[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (option: AutocompleteOption<T>) => {
    if (option.disabled) return;
    setInputValue(option.label);
    onChange?.(option.value, option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.('', undefined);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (freeSolo && inputValue) {
          onChange?.(inputValue, undefined);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    if (inputValue.length >= minCharsToSearch) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border border-input bg-background transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size].input,
            error && 'border-destructive focus:ring-destructive',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        />

        {/* Icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <svg className={cn('animate-spin text-muted-foreground', sizeClasses[size].icon)} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}

          {clearable && inputValue && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className={sizeClasses[size].icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <svg className={cn('text-muted-foreground', sizeClasses[size].icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && inputValue.length >= minCharsToSearch && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-y-auto"
          >
            {loading ? (
              <div className={cn('text-muted-foreground text-center', sizeClasses[size].option)}>
                {loadingMessage}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className={cn('text-muted-foreground text-center', sizeClasses[size].option)}>
                {emptyMessage}
              </div>
            ) : (
              <div className="py-1">
                {filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    data-option
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    className={cn(
                      'flex w-full items-center gap-2 text-left transition-colors',
                      sizeClasses[size].option,
                      highlightedIndex === index && 'bg-muted',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                      !option.disabled && 'hover:bg-muted'
                    )}
                  >
                    {renderOption ? (
                      renderOption(option, highlightedIndex === index)
                    ) : (
                      <>
                        {option.icon && <span className="text-muted-foreground">{option.icon}</span>}
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{option.label}</div>
                          {option.description && (
                            <div className="text-sm text-muted-foreground truncate">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Async Autocomplete
// ============================================================================

interface AsyncAutocompleteProps<T = unknown> extends Omit<AutocompleteProps<T>, 'options' | 'loading'> {
  loadOptions: (inputValue: string) => Promise<AutocompleteOption<T>[]>;
  debounceMs?: number;
  cacheResults?: boolean;
}

export function AsyncAutocomplete<T = unknown>({
  loadOptions,
  debounceMs = 300,
  cacheResults = true,
  minCharsToSearch = 2,
  ...props
}: AsyncAutocompleteProps<T>) {
  const [options, setOptions] = React.useState<AutocompleteOption<T>[]>([]);
  const [loading, setLoading] = React.useState(false);
  const cacheRef = React.useRef<Map<string, AutocompleteOption<T>[]>>(new Map());
  const debounceRef = React.useRef<NodeJS.Timeout>();

  const handleInputChange = async (inputValue: string) => {
    props.onInputChange?.(inputValue);

    if (inputValue.length < minCharsToSearch) {
      setOptions([]);
      return;
    }

    // Check cache
    if (cacheResults && cacheRef.current.has(inputValue)) {
      setOptions(cacheRef.current.get(inputValue)!);
      return;
    }

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await loadOptions(inputValue);
        setOptions(results);
        if (cacheResults) {
          cacheRef.current.set(inputValue, results);
        }
      } catch (error) {
        console.error('Autocomplete load error:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <Autocomplete
      options={options}
      loading={loading}
      onInputChange={handleInputChange}
      minCharsToSearch={minCharsToSearch}
      {...props}
    />
  );
}

// ============================================================================
// Multi Autocomplete
// ============================================================================

interface MultiAutocompleteProps<T = unknown> extends Omit<AutocompleteProps<T>, 'value' | 'onChange'> {
  value?: string[];
  onChange?: (values: string[], options: AutocompleteOption<T>[]) => void;
  maxSelections?: number;
}

export function MultiAutocomplete<T = unknown>({
  options,
  value = [],
  onChange,
  maxSelections,
  size = 'md',
  disabled,
  placeholder = 'Cauta...',
  className,
  ...props
}: MultiAutocompleteProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Flatten options
  const flatOptions = React.useMemo(() => {
    const isGrouped = options.length > 0 && 'options' in options[0];
    if (isGrouped) {
      return (options as AutocompleteGroup<T>[]).flatMap((group) => group.options);
    }
    return options as AutocompleteOption<T>[];
  }, [options]);

  // Filter out already selected options
  const availableOptions = React.useMemo(() => {
    return flatOptions.filter(
      (opt) =>
        !value.includes(opt.value) &&
        opt.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [flatOptions, value, inputValue]);

  // Get selected options
  const selectedOptions = React.useMemo(() => {
    return value.map((v) => flatOptions.find((opt) => opt.value === v)).filter(Boolean) as AutocompleteOption<T>[];
  }, [value, flatOptions]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: AutocompleteOption<T>) => {
    if (option.disabled) return;
    if (maxSelections && value.length >= maxSelections) return;

    const newValues = [...value, option.value];
    const newOptions = [...selectedOptions, option];
    onChange?.(newValues, newOptions);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = (valueToRemove: string) => {
    const newValues = value.filter((v) => v !== valueToRemove);
    const newOptions = selectedOptions.filter((opt) => opt.value !== valueToRemove);
    onChange?.(newValues, newOptions);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemove(value[value.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex flex-wrap gap-1 p-2 rounded-md border border-input bg-background min-h-[40px]',
          isOpen && 'ring-2 ring-ring ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected Tags */}
        {selectedOptions.map((option) => (
          <span
            key={option.value}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-sm"
          >
            {option.label}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(option.value);
                }}
                className="hover:text-destructive"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled || (maxSelections !== undefined && value.length >= maxSelections)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
          {...props}
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && availableOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-60 overflow-y-auto"
          >
            <div className="py-1">
              {availableOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                  className={cn(
                    'flex w-full items-center gap-2 text-left transition-colors',
                    sizeClasses[size].option,
                    option.disabled && 'opacity-50 cursor-not-allowed',
                    !option.disabled && 'hover:bg-muted'
                  )}
                >
                  {option.icon && <span className="text-muted-foreground">{option.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-sm text-muted-foreground truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Accounting-Specific Autocompletes
// ============================================================================

// Client Autocomplete
interface ClientOption {
  id: string;
  name: string;
  cui?: string;
  email?: string;
}

interface ClientAutocompleteProps extends Omit<AutocompleteProps<ClientOption>, 'options' | 'renderOption'> {
  clients: ClientOption[];
}

export function ClientAutocomplete({ clients, ...props }: ClientAutocompleteProps) {
  const options: AutocompleteOption<ClientOption>[] = clients.map((client) => ({
    value: client.id,
    label: client.name,
    description: client.cui ? `CUI: ${client.cui}` : client.email,
    data: client,
  }));

  return (
    <Autocomplete
      options={options}
      placeholder="Cauta client..."
      renderOption={(option) => (
        <div className="flex-1">
          <div className="font-medium">{option.label}</div>
          {option.data?.cui && (
            <div className="text-sm text-muted-foreground">CUI: {option.data.cui}</div>
          )}
          {option.data?.email && (
            <div className="text-sm text-muted-foreground">{option.data.email}</div>
          )}
        </div>
      )}
      {...props}
    />
  );
}

// Product Autocomplete
interface ProductOption {
  id: string;
  name: string;
  code?: string;
  price?: number;
  unit?: string;
}

interface ProductAutocompleteProps extends Omit<AutocompleteProps<ProductOption>, 'options' | 'renderOption'> {
  products: ProductOption[];
}

export function ProductAutocomplete({ products, ...props }: ProductAutocompleteProps) {
  const options: AutocompleteOption<ProductOption>[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: product.code,
    data: product,
  }));

  return (
    <Autocomplete
      options={options}
      placeholder="Cauta produs..."
      renderOption={(option) => (
        <div className="flex-1 flex items-center justify-between">
          <div>
            <div className="font-medium">{option.label}</div>
            {option.data?.code && (
              <div className="text-sm text-muted-foreground">Cod: {option.data.code}</div>
            )}
          </div>
          {option.data?.price && (
            <div className="text-right">
              <div className="font-medium">{option.data.price.toFixed(2)} RON</div>
              {option.data.unit && (
                <div className="text-sm text-muted-foreground">/{option.data.unit}</div>
              )}
            </div>
          )}
        </div>
      )}
      {...props}
    />
  );
}

// Account Code Autocomplete (for accounting)
interface AccountOption {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

interface AccountAutocompleteProps extends Omit<AutocompleteProps<AccountOption>, 'options' | 'renderOption'> {
  accounts: AccountOption[];
}

export function AccountAutocomplete({ accounts, ...props }: AccountAutocompleteProps) {
  const typeLabels: Record<AccountOption['type'], string> = {
    asset: 'Activ',
    liability: 'Pasiv',
    equity: 'Capital',
    revenue: 'Venit',
    expense: 'Cheltuiala',
  };

  const typeColors: Record<AccountOption['type'], string> = {
    asset: 'text-blue-500',
    liability: 'text-red-500',
    equity: 'text-purple-500',
    revenue: 'text-green-500',
    expense: 'text-orange-500',
  };

  const options: AutocompleteOption<AccountOption>[] = accounts.map((account) => ({
    value: account.code,
    label: `${account.code} - ${account.name}`,
    data: account,
  }));

  return (
    <Autocomplete
      options={options}
      placeholder="Cauta cont contabil..."
      renderOption={(option) => (
        <div className="flex-1 flex items-center justify-between">
          <div>
            <span className="font-mono font-medium">{option.data?.code}</span>
            <span className="ml-2">{option.data?.name}</span>
          </div>
          {option.data && (
            <span className={cn('text-xs', typeColors[option.data.type])}>
              {typeLabels[option.data.type]}
            </span>
          )}
        </div>
      )}
      {...props}
    />
  );
}

// CUI Autocomplete (Romanian company lookup)
interface CUIAutocompleteProps extends Omit<AutocompleteProps, 'options'> {
  onCompanyFound?: (company: { cui: string; name: string; address?: string }) => void;
}

export function CUIAutocomplete({ onCompanyFound, ...props }: CUIAutocompleteProps) {
  return (
    <AsyncAutocomplete
      loadOptions={async (inputValue) => {
        // This would typically call an API to lookup Romanian companies by CUI
        // For now, returning empty array as placeholder
        return [];
      }}
      placeholder="Introdu CUI..."
      minCharsToSearch={4}
      onChange={(value, option) => {
        if (option?.data) {
          onCompanyFound?.(option.data as { cui: string; name: string; address?: string });
        }
        props.onChange?.(value, option);
      }}
      {...props}
    />
  );
}
