'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Loader2, Globe, Building2 } from 'lucide-react';

interface VATNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onVIESData?: (data: VIESData | null) => void;
  showValidation?: boolean;
  autoVerify?: boolean;
  label?: string;
  error?: string;
  allowedCountries?: string[]; // Limit to specific EU countries
}

interface VIESData {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  requestDate?: string;
}

// EU country codes and their VAT number patterns
const EU_VAT_PATTERNS: Record<string, { pattern: RegExp; example: string; name: string }> = {
  AT: { pattern: /^ATU\d{8}$/, example: 'ATU12345678', name: 'Austria' },
  BE: { pattern: /^BE0?\d{9,10}$/, example: 'BE0123456789', name: 'Belgia' },
  BG: { pattern: /^BG\d{9,10}$/, example: 'BG123456789', name: 'Bulgaria' },
  CY: { pattern: /^CY\d{8}[A-Z]$/, example: 'CY12345678A', name: 'Cipru' },
  CZ: { pattern: /^CZ\d{8,10}$/, example: 'CZ12345678', name: 'Cehia' },
  DE: { pattern: /^DE\d{9}$/, example: 'DE123456789', name: 'Germania' },
  DK: { pattern: /^DK\d{8}$/, example: 'DK12345678', name: 'Danemarca' },
  EE: { pattern: /^EE\d{9}$/, example: 'EE123456789', name: 'Estonia' },
  EL: { pattern: /^EL\d{9}$/, example: 'EL123456789', name: 'Grecia' },
  ES: { pattern: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, example: 'ESA12345678', name: 'Spania' },
  FI: { pattern: /^FI\d{8}$/, example: 'FI12345678', name: 'Finlanda' },
  FR: { pattern: /^FR[A-Z0-9]{2}\d{9}$/, example: 'FR12345678901', name: 'Franța' },
  HR: { pattern: /^HR\d{11}$/, example: 'HR12345678901', name: 'Croația' },
  HU: { pattern: /^HU\d{8}$/, example: 'HU12345678', name: 'Ungaria' },
  IE: { pattern: /^IE\d{7}[A-Z]{1,2}$|^IE\d[A-Z+*]\d{5}[A-Z]$/, example: 'IE1234567A', name: 'Irlanda' },
  IT: { pattern: /^IT\d{11}$/, example: 'IT12345678901', name: 'Italia' },
  LT: { pattern: /^LT(\d{9}|\d{12})$/, example: 'LT123456789', name: 'Lituania' },
  LU: { pattern: /^LU\d{8}$/, example: 'LU12345678', name: 'Luxemburg' },
  LV: { pattern: /^LV\d{11}$/, example: 'LV12345678901', name: 'Letonia' },
  MT: { pattern: /^MT\d{8}$/, example: 'MT12345678', name: 'Malta' },
  NL: { pattern: /^NL\d{9}B\d{2}$/, example: 'NL123456789B01', name: 'Olanda' },
  PL: { pattern: /^PL\d{10}$/, example: 'PL1234567890', name: 'Polonia' },
  PT: { pattern: /^PT\d{9}$/, example: 'PT123456789', name: 'Portugalia' },
  RO: { pattern: /^RO\d{2,10}$/, example: 'RO12345678', name: 'România' },
  SE: { pattern: /^SE\d{12}$/, example: 'SE123456789012', name: 'Suedia' },
  SI: { pattern: /^SI\d{8}$/, example: 'SI12345678', name: 'Slovenia' },
  SK: { pattern: /^SK\d{10}$/, example: 'SK1234567890', name: 'Slovacia' },
  // Northern Ireland (special case after Brexit)
  XI: { pattern: /^XI\d{9}$|^XI\d{12}$|^XIGD\d{3}$|^XIHA\d{3}$/, example: 'XI123456789', name: 'Irlanda de Nord' },
};

// Validate VAT number format
function validateVATNumber(vatNumber: string, allowedCountries?: string[]): {
  isValid: boolean;
  formatted: string;
  error?: string;
  countryCode?: string;
  countryName?: string;
} {
  // Remove whitespace and convert to uppercase
  const cleanVAT = vatNumber.replace(/[\s.-]/g, '').toUpperCase();

  if (cleanVAT.length < 4) {
    return { isValid: false, formatted: cleanVAT, error: 'Numărul de TVA este prea scurt' };
  }

  // Extract country code (first 2 characters)
  const countryCode = cleanVAT.substring(0, 2);

  // Check if country is in EU
  const countryInfo = EU_VAT_PATTERNS[countryCode];
  if (!countryInfo) {
    return {
      isValid: false,
      formatted: cleanVAT,
      error: `Codul de țară "${countryCode}" nu este valid pentru TVA UE`
    };
  }

  // Check if country is allowed (if restriction is set)
  if (allowedCountries && allowedCountries.length > 0 && !allowedCountries.includes(countryCode)) {
    return {
      isValid: false,
      formatted: cleanVAT,
      error: `Țara ${countryInfo.name} nu este permisă`
    };
  }

  // Validate format
  if (!countryInfo.pattern.test(cleanVAT)) {
    return {
      isValid: false,
      formatted: cleanVAT,
      error: `Format invalid pentru ${countryInfo.name}. Exemplu: ${countryInfo.example}`,
      countryCode,
      countryName: countryInfo.name,
    };
  }

  // Additional validation for Romanian VAT (CUI control digit)
  if (countryCode === 'RO') {
    const cuiPart = cleanVAT.substring(2);
    const controlKey = '753217532';
    const digits = cuiPart.padStart(10, '0').split('').map(Number);
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
      return {
        isValid: false,
        formatted: cleanVAT,
        error: 'CUI/CIF invalid - cifra de control nu corespunde',
        countryCode,
        countryName: countryInfo.name,
      };
    }
  }

  return {
    isValid: true,
    formatted: cleanVAT,
    countryCode,
    countryName: countryInfo.name,
  };
}

export function VATNumberInput({
  value = '',
  onChange,
  onVIESData,
  showValidation = true,
  autoVerify = false,
  label = 'Cod TVA UE',
  error: externalError,
  className,
  disabled,
  allowedCountries,
  ...props
}: VATNumberInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    error?: string;
    countryCode?: string;
    countryName?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viesData, setViesData] = useState<VIESData | null>(null);

  const displayValue = value !== undefined ? value : internalValue;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setInternalValue(newValue);
    setViesData(null);

    // Clear validation when typing
    if (newValue.length < 4) {
      setValidation(null);
      onChange?.(newValue, false);
      return;
    }

    // Validate on change
    const result = validateVATNumber(newValue, allowedCountries);
    setValidation({
      isValid: result.isValid,
      error: result.error,
      countryCode: result.countryCode,
      countryName: result.countryName,
    });
    onChange?.(result.formatted, result.isValid);
  }, [onChange, allowedCountries]);

  const verifyWithVIES = useCallback(async () => {
    const cleanVAT = displayValue.replace(/[\s.-]/g, '').toUpperCase();

    if (!cleanVAT || cleanVAT.length < 4) return;

    const validationResult = validateVATNumber(cleanVAT, allowedCountries);
    if (!validationResult.isValid) {
      setValidation(validationResult);
      return;
    }

    setIsLoading(true);
    try {
      // Call VIES API (this would be proxied through your backend)
      const countryCode = cleanVAT.substring(0, 2);
      const vatNumber = cleanVAT.substring(2);

      const response = await fetch(`/api/v1/vies/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode, vatNumber }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setViesData(data.data);
          onVIESData?.(data.data);
        }
      } else {
        // VIES service unavailable or VAT not found
        setViesData(null);
        onVIESData?.(null);
      }
    } catch (err) {
      console.error('Error verifying VAT with VIES:', err);
      setViesData(null);
      onVIESData?.(null);
    } finally {
      setIsLoading(false);
    }
  }, [displayValue, onVIESData, allowedCountries]);

  const handleBlur = useCallback(() => {
    if (displayValue.length >= 4) {
      const result = validateVATNumber(displayValue, allowedCountries);
      setValidation({
        isValid: result.isValid,
        error: result.error,
        countryCode: result.countryCode,
        countryName: result.countryName,
      });

      if (result.isValid && autoVerify) {
        verifyWithVIES();
      }
    }
  }, [displayValue, autoVerify, verifyWithVIES, allowedCountries]);

  const displayError = externalError || validation?.error;

  // Get flag emoji for country
  const getCountryFlag = (countryCode: string): string => {
    // Convert country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

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
          placeholder="RO12345678"
          className={cn(
            'w-full px-4 py-2.5 pr-20 rounded-lg border transition-colors font-mono',
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
          {/* Country flag */}
          {validation?.countryCode && (
            <span className="text-lg" title={validation.countryName}>
              {getCountryFlag(validation.countryCode === 'EL' ? 'GR' : validation.countryCode)}
            </span>
          )}

          {/* Validation indicator */}
          {showValidation && displayValue.length >= 4 && (
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

          {/* Verify button */}
          {!autoVerify && validation?.isValid && !viesData && (
            <button
              type="button"
              onClick={verifyWithVIES}
              disabled={isLoading}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Verifică în sistemul VIES"
            >
              <Globe className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {displayError && (
        <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
      )}

      {/* Country info (when valid but no VIES data yet) */}
      {validation?.isValid && validation.countryName && !viesData && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Globe className="w-4 h-4" />
          <span>{validation.countryName}</span>
        </div>
      )}

      {/* VIES data preview */}
      {viesData && (
        <div className={cn(
          'mt-2 p-3 rounded-lg border',
          viesData.valid
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        )}>
          <div className="flex items-center gap-2 mb-2">
            {viesData.valid ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <X className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span className={cn(
              'font-medium',
              viesData.valid
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            )}>
              {viesData.valid ? 'TVA valid în VIES' : 'TVA invalid în VIES'}
            </span>
          </div>

          {viesData.valid && viesData.name && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-medium">{viesData.name}</span>
              </div>
              {viesData.address && (
                <p className="text-sm text-green-600 dark:text-green-400 ml-5">
                  {viesData.address}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Introdu codul de TVA cu prefixul țării (ex: RO pentru România, DE pentru Germania)
      </p>
    </div>
  );
}

// Export validation function and patterns for use elsewhere
export { validateVATNumber, EU_VAT_PATTERNS };
