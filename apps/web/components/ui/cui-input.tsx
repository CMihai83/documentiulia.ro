'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Loader2, Search } from 'lucide-react';

interface CUIInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onCompanyData?: (data: ANAFCompanyData | null) => void;
  showValidation?: boolean;
  autoFetch?: boolean;
  label?: string;
  error?: string;
}

interface ANAFCompanyData {
  cui: string;
  denumire: string;
  adresa: string;
  nrRegCom: string;
  telefon?: string;
  codPostal?: string;
  judet?: string;
  localitate?: string;
  tvaAttr?: boolean;
  tvaDate?: string;
  stare?: string;
}

// Validate Romanian CUI/CIF
function validateCUI(cui: string): { isValid: boolean; formatted: string; error?: string } {
  // Remove whitespace and convert to uppercase
  let cleanCUI = cui.replace(/\s+/g, '').toUpperCase();

  // Remove "RO" prefix if present
  if (cleanCUI.startsWith('RO')) {
    cleanCUI = cleanCUI.substring(2);
  }

  // Check if it's only digits
  if (!/^\d+$/.test(cleanCUI)) {
    return { isValid: false, formatted: cleanCUI, error: 'CUI-ul trebuie să conțină doar cifre' };
  }

  // Check length (between 2 and 10 digits)
  if (cleanCUI.length < 2 || cleanCUI.length > 10) {
    return { isValid: false, formatted: cleanCUI, error: 'CUI-ul trebuie să aibă între 2 și 10 cifre' };
  }

  // Validate using control digit algorithm
  const controlKey = '753217532';
  const digits = cleanCUI.padStart(10, '0').split('').map(Number);
  const controlDigit = digits.pop()!;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * parseInt(controlKey[i]);
  }

  let calculatedControl = (sum * 10) % 11;
  if (calculatedControl === 10) {
    calculatedControl = 0;
  }

  if (calculatedControl !== controlDigit) {
    return { isValid: false, formatted: cleanCUI, error: 'CUI invalid - cifra de control nu corespunde' };
  }

  return { isValid: true, formatted: cleanCUI };
}

export function CUIInput({
  value = '',
  onChange,
  onCompanyData,
  showValidation = true,
  autoFetch = false,
  label = 'CUI / CIF',
  error: externalError,
  className,
  disabled,
  ...props
}: CUIInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<ANAFCompanyData | null>(null);

  const displayValue = value !== undefined ? value : internalValue;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInternalValue(newValue);
    setCompanyData(null);

    // Clear validation when typing
    if (newValue.length < 2) {
      setValidation(null);
      onChange?.(newValue, false);
      return;
    }

    // Validate on change
    const result = validateCUI(newValue);
    setValidation({ isValid: result.isValid, error: result.error });
    onChange?.(result.formatted, result.isValid);
  }, [onChange]);

  const fetchCompanyData = useCallback(async () => {
    const cleanCUI = displayValue.replace(/^RO/i, '').replace(/\s+/g, '');

    if (!cleanCUI || cleanCUI.length < 2) return;

    const validationResult = validateCUI(cleanCUI);
    if (!validationResult.isValid) {
      setValidation(validationResult);
      return;
    }

    setIsLoading(true);
    try {
      // Call ANAF API (this would be proxied through your backend)
      const response = await fetch(`/api/v1/anaf/company/${cleanCUI}`);

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setCompanyData(data.data);
          onCompanyData?.(data.data);
        }
      } else {
        // Company not found or API error
        setCompanyData(null);
        onCompanyData?.(null);
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setCompanyData(null);
      onCompanyData?.(null);
    } finally {
      setIsLoading(false);
    }
  }, [displayValue, onCompanyData]);

  const handleBlur = useCallback(() => {
    if (displayValue.length >= 2) {
      const result = validateCUI(displayValue);
      setValidation({ isValid: result.isValid, error: result.error });

      if (result.isValid && autoFetch) {
        fetchCompanyData();
      }
    }
  }, [displayValue, autoFetch, fetchCompanyData]);

  const displayError = externalError || validation?.error;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || isLoading}
          placeholder="Introdu CUI-ul (ex: 12345678 sau RO12345678)"
          className={cn(
            'w-full px-4 py-2.5 pr-20 rounded-lg border transition-colors',
            'bg-white dark:bg-gray-800',
            'focus:outline-none focus:ring-2',
            displayError
              ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
              : validation?.isValid
              ? 'border-green-300 dark:border-green-700 focus:ring-green-500 focus:border-green-500'
              : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Validation indicator */}
          {showValidation && displayValue.length >= 2 && (
            <>
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : validation?.isValid ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : validation?.error ? (
                <X className="w-5 h-5 text-red-500" />
              ) : null}
            </>
          )}

          {/* Fetch button */}
          {!autoFetch && validation?.isValid && !companyData && (
            <button
              type="button"
              onClick={fetchCompanyData}
              disabled={isLoading}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Caută firma în baza ANAF"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {displayError && (
        <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
      )}

      {/* Company data preview */}
      {companyData && (
        <div className="mt-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="font-medium text-green-800 dark:text-green-200">{companyData.denumire}</p>
          <p className="text-sm text-green-600 dark:text-green-400">{companyData.adresa}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            {companyData.nrRegCom && (
              <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300">
                Reg. Com.: {companyData.nrRegCom}
              </span>
            )}
            {companyData.tvaAttr && (
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                Plătitor TVA
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export validation function for use elsewhere
export { validateCUI };
