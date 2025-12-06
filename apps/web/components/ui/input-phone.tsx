'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  format?: string;
}

const countries: Country[] = [
  { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴', format: '### ### ###' },
  { code: 'MD', name: 'Moldova', dialCode: '+373', flag: '🇲🇩', format: '## ### ###' },
  { code: 'DE', name: 'Germania', dialCode: '+49', flag: '🇩🇪', format: '### ########' },
  { code: 'FR', name: 'Franta', dialCode: '+33', flag: '🇫🇷', format: '# ## ## ## ##' },
  { code: 'IT', name: 'Italia', dialCode: '+39', flag: '🇮🇹', format: '### ### ####' },
  { code: 'ES', name: 'Spania', dialCode: '+34', flag: '🇪🇸', format: '### ## ## ##' },
  { code: 'GB', name: 'Marea Britanie', dialCode: '+44', flag: '🇬🇧', format: '#### ### ###' },
  { code: 'US', name: 'SUA', dialCode: '+1', flag: '🇺🇸', format: '(###) ###-####' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', format: '### ### ####' },
  { code: 'BE', name: 'Belgia', dialCode: '+32', flag: '🇧🇪', format: '### ## ## ##' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬', format: '## ### ####' },
  { code: 'CZ', name: 'Cehia', dialCode: '+420', flag: '🇨🇿', format: '### ### ###' },
  { code: 'DK', name: 'Danemarca', dialCode: '+45', flag: '🇩🇰', format: '## ## ## ##' },
  { code: 'GR', name: 'Grecia', dialCode: '+30', flag: '🇬🇷', format: '### ### ####' },
  { code: 'HU', name: 'Ungaria', dialCode: '+36', flag: '🇭🇺', format: '## ### ####' },
  { code: 'IE', name: 'Irlanda', dialCode: '+353', flag: '🇮🇪', format: '## ### ####' },
  { code: 'NL', name: 'Olanda', dialCode: '+31', flag: '🇳🇱', format: '# ## ## ## ##' },
  { code: 'PL', name: 'Polonia', dialCode: '+48', flag: '🇵🇱', format: '### ### ###' },
  { code: 'PT', name: 'Portugalia', dialCode: '+351', flag: '🇵🇹', format: '### ### ###' },
  { code: 'SE', name: 'Suedia', dialCode: '+46', flag: '🇸🇪', format: '## ### ## ##' },
  { code: 'CH', name: 'Elvetia', dialCode: '+41', flag: '🇨🇭', format: '## ### ## ##' },
  { code: 'UA', name: 'Ucraina', dialCode: '+380', flag: '🇺🇦', format: '## ### ## ##' },
];

export type InputPhoneSize = 'sm' | 'md' | 'lg';

// ============================================================================
// Utility Functions
// ============================================================================

function formatPhoneNumber(value: string, format?: string): string {
  if (!format) return value;

  const digits = value.replace(/\D/g, '');
  let result = '';
  let digitIndex = 0;

  for (const char of format) {
    if (digitIndex >= digits.length) break;
    if (char === '#') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += char;
    }
  }

  return result;
}

function parsePhoneNumber(value: string): { countryCode: string; number: string } | null {
  const cleaned = value.replace(/\D/g, '');

  for (const country of countries) {
    const dialDigits = country.dialCode.replace(/\D/g, '');
    if (cleaned.startsWith(dialDigits)) {
      return {
        countryCode: country.code,
        number: cleaned.slice(dialDigits.length),
      };
    }
  }

  return null;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses: Record<InputPhoneSize, { input: string; button: string; dropdown: string }> = {
  sm: {
    input: 'h-8 text-sm px-3',
    button: 'h-8 px-2 text-sm',
    dropdown: 'text-sm',
  },
  md: {
    input: 'h-10 text-base px-3',
    button: 'h-10 px-3',
    dropdown: 'text-base',
  },
  lg: {
    input: 'h-12 text-lg px-4',
    button: 'h-12 px-4 text-lg',
    dropdown: 'text-lg',
  },
};

// ============================================================================
// InputPhone Component
// ============================================================================

interface InputPhoneProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, country: Country) => void;
  defaultCountry?: string;
  onCountryChange?: (country: Country) => void;
  countries?: Country[];
  size?: InputPhoneSize;
  error?: boolean;
  showCountryName?: boolean;
}

export const InputPhone = React.forwardRef<HTMLInputElement, InputPhoneProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = '',
      onChange,
      defaultCountry = 'RO',
      onCountryChange,
      countries: customCountries,
      size = 'md',
      error = false,
      showCountryName = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const availableCountries = customCountries || countries;
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedCountry, setSelectedCountry] = React.useState<Country>(
      availableCountries.find((c) => c.code === defaultCountry) || availableCountries[0]
    );
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const [search, setSearch] = React.useState('');
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const isControlled = controlledValue !== undefined;
    const phoneValue = isControlled ? controlledValue : uncontrolledValue;

    // Parse initial value if it includes country code
    React.useEffect(() => {
      const parsed = parsePhoneNumber(phoneValue);
      if (parsed) {
        const country = availableCountries.find((c) => c.code === parsed.countryCode);
        if (country) {
          setSelectedCountry(country);
        }
      }
    }, []);

    // Close dropdown on outside click
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearch('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      const formattedValue = formatPhoneNumber(rawValue, selectedCountry.format);

      if (!isControlled) {
        setUncontrolledValue(formattedValue);
      }
      onChange?.(formattedValue, selectedCountry);
    };

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      setIsOpen(false);
      setSearch('');
      onCountryChange?.(country);
      inputRef.current?.focus();

      // Reformat existing number with new country format
      const rawValue = phoneValue.replace(/\D/g, '');
      const formattedValue = formatPhoneNumber(rawValue, country.format);

      if (!isControlled) {
        setUncontrolledValue(formattedValue);
      }
      onChange?.(formattedValue, country);
    };

    const filteredCountries = availableCountries.filter(
      (country) =>
        country.name.toLowerCase().includes(search.toLowerCase()) ||
        country.dialCode.includes(search) ||
        country.code.toLowerCase().includes(search.toLowerCase())
    );

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <div className={cn('relative flex', className)} ref={dropdownRef}>
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted/50 transition-colors',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size].button,
            error && 'border-destructive',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          {showCountryName && (
            <span className="hidden sm:inline text-sm">{selectedCountry.code}</span>
          )}
          <span className="text-muted-foreground">{selectedCountry.dialCode}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn('transition-transform', isOpen && 'rotate-180')}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* Phone Input */}
        <input
          ref={inputRef}
          type="tel"
          value={phoneValue}
          onChange={handleInputChange}
          disabled={disabled}
          className={cn(
            'flex-1 rounded-r-md border border-input bg-background transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size].input,
            error && 'border-destructive focus:ring-destructive',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          placeholder={selectedCountry.format?.replace(/#/g, '0')}
          {...props}
        />

        {/* Country Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-background shadow-lg',
                sizeClasses[size].dropdown
              )}
            >
              {/* Search */}
              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cauta tara..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              {/* Country List */}
              <div className="max-h-60 overflow-y-auto">
                {filteredCountries.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    Nicio tara gasita
                  </div>
                ) : (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                        'hover:bg-muted focus:bg-muted focus:outline-none',
                        selectedCountry.code === country.code && 'bg-muted'
                      )}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-muted-foreground">{country.dialCode}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
InputPhone.displayName = 'InputPhone';

// ============================================================================
// Simple Phone Input (Romanian only)
// ============================================================================

interface SimplePhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value?: string;
  onChange?: (value: string) => void;
  size?: InputPhoneSize;
  error?: boolean;
}

export const SimplePhoneInput = React.forwardRef<HTMLInputElement, SimplePhoneInputProps>(
  ({ className, value, onChange, size = 'md', error = false, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      const formatted = formatPhoneNumber(rawValue, '### ### ###');
      onChange?.(formatted);
    };

    return (
      <div className={cn('relative flex', className)}>
        <div
          className={cn(
            'flex items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted/50 px-3',
            sizeClasses[size].button,
            error && 'border-destructive',
            disabled && 'opacity-50'
          )}
        >
          <span>🇷🇴</span>
          <span className="text-muted-foreground">+40</span>
        </div>
        <input
          ref={ref}
          type="tel"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'flex-1 rounded-r-md border border-input bg-background transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size].input,
            error && 'border-destructive focus:ring-destructive',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          placeholder="7XX XXX XXX"
          {...props}
        />
      </div>
    );
  }
);
SimplePhoneInput.displayName = 'SimplePhoneInput';

// ============================================================================
// Phone Field (with label and validation)
// ============================================================================

interface PhoneFieldProps extends Omit<InputPhoneProps, 'error'> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}

export function PhoneField({
  label,
  description,
  error,
  required,
  className,
  ...props
}: PhoneFieldProps) {
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
      <InputPhone id={id} error={!!error} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// Hooks
// ============================================================================

export function usePhoneValidation(value: string, country: Country): { isValid: boolean; message?: string } {
  const digits = value.replace(/\D/g, '');
  const expectedLength = country.format?.replace(/[^#]/g, '').length || 10;

  if (!digits) {
    return { isValid: false, message: 'Numarul de telefon este obligatoriu' };
  }

  if (digits.length < expectedLength) {
    return { isValid: false, message: `Numarul trebuie sa aiba ${expectedLength} cifre` };
  }

  // Romanian mobile validation
  if (country.code === 'RO') {
    if (!digits.startsWith('7')) {
      return { isValid: false, message: 'Numerele mobile din Romania incep cu 7' };
    }
  }

  return { isValid: true };
}

// ============================================================================
// Exports
// ============================================================================

export { countries, formatPhoneNumber, parsePhoneNumber };
