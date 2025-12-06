'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Building2 } from 'lucide-react';

interface IBANInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onBankInfo?: (bank: BankInfo | null) => void;
  showValidation?: boolean;
  showBankInfo?: boolean;
  label?: string;
  error?: string;
}

interface BankInfo {
  code: string;
  name: string;
  bic?: string;
}

// Romanian bank codes mapping
const ROMANIAN_BANKS: Record<string, BankInfo> = {
  'BTRL': { code: 'BTRL', name: 'Banca Transilvania', bic: 'BTRLRO22' },
  'RNCB': { code: 'RNCB', name: 'BCR (Banca Comercială Română)', bic: 'RNCBROBU' },
  'BRDE': { code: 'BRDE', name: 'BRD - Groupe Société Générale', bic: 'BRDEROBU' },
  'INGB': { code: 'INGB', name: 'ING Bank', bic: 'INGBROBU' },
  'RZBB': { code: 'RZBB', name: 'Raiffeisen Bank', bic: 'RZBRROBU' },
  'BACX': { code: 'BACX', name: 'UniCredit Bank', bic: 'BACXROBU' },
  'CECE': { code: 'CECE', name: 'CEC Bank', bic: 'CECEROBU' },
  'PIRB': { code: 'PIRB', name: 'First Bank (ex-Piraeus)', bic: 'PIRBROBU' },
  'TREZ': { code: 'TREZ', name: 'Trezoreria Statului', bic: 'TABOROBU' },
  'MIND': { code: 'MIND', name: 'Idea Bank', bic: 'MINDROBU' },
  'EGNA': { code: 'EGNA', name: 'Garanti BBVA', bic: 'UGBIROBU' },
  'DARO': { code: 'DARO', name: 'Alpha Bank', bic: 'BUABOROBU' },
  'OTPV': { code: 'OTPV', name: 'OTP Bank', bic: 'OTPVROBU' },
  'PORL': { code: 'PORL', name: 'Patria Bank', bic: 'PORLROBU' },
  'BPOS': { code: 'BPOS', name: 'Banca Românească', bic: 'BPOSROBU' },
  'CRCO': { code: 'CRCO', name: 'Crédit Agricole', bic: 'CRCOROBU' },
  'NBOR': { code: 'NBOR', name: 'Banca Națională a României', bic: 'NABOROBU' },
  'EXIM': { code: 'EXIM', name: 'EximBank', bic: 'EABOROBU' },
  'LIBR': { code: 'LIBR', name: 'Libra Internet Bank', bic: 'LIBRROBU' },
  'BREL': { code: 'BREL', name: 'Banca de Export-Import', bic: 'BRELROBU' },
  'FNNB': { code: 'FNNB', name: 'Vista Bank', bic: 'FNNBROBU' },
  'REVO': { code: 'REVO', name: 'Revolut', bic: 'REVOLT21' },
  'BUNT': { code: 'BUNT', name: 'Bunq', bic: 'BUNQNL2A' },
  'WISE': { code: 'WISE', name: 'Wise', bic: 'TRWIBEB1' },
};

// Validate IBAN using MOD-97 algorithm
function validateIBAN(iban: string): { isValid: boolean; formatted: string; error?: string; bankInfo?: BankInfo } {
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s+/g, '').toUpperCase();

  // Check minimum length
  if (cleanIBAN.length < 5) {
    return { isValid: false, formatted: cleanIBAN, error: 'IBAN-ul este prea scurt' };
  }

  // Check if starts with country code (RO for Romania)
  if (!cleanIBAN.startsWith('RO')) {
    // Allow non-RO IBANs but without bank info
    return validateInternationalIBAN(cleanIBAN);
  }

  // Romanian IBAN must be 24 characters
  if (cleanIBAN.length !== 24) {
    return { isValid: false, formatted: cleanIBAN, error: 'IBAN-ul românesc trebuie să aibă 24 de caractere' };
  }

  // Check format: RO + 2 digits + 4 letters (bank code) + 16 alphanumeric
  if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(cleanIBAN)) {
    return { isValid: false, formatted: cleanIBAN, error: 'Format IBAN invalid' };
  }

  // MOD-97 validation
  if (!validateMod97(cleanIBAN)) {
    return { isValid: false, formatted: cleanIBAN, error: 'IBAN invalid - verificare MOD-97 eșuată' };
  }

  // Extract bank code
  const bankCode = cleanIBAN.substring(4, 8);
  const bankInfo = ROMANIAN_BANKS[bankCode];

  // Format IBAN with spaces for display
  const formatted = cleanIBAN.replace(/(.{4})/g, '$1 ').trim();

  return {
    isValid: true,
    formatted: formatted,
    bankInfo: bankInfo || { code: bankCode, name: 'Bancă necunoscută' },
  };
}

function validateInternationalIBAN(iban: string): { isValid: boolean; formatted: string; error?: string } {
  // Basic validation for international IBANs
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return { isValid: false, formatted: iban, error: 'Format IBAN internațional invalid' };
  }

  if (!validateMod97(iban)) {
    return { isValid: false, formatted: iban, error: 'IBAN invalid - verificare MOD-97 eșuată' };
  }

  const formatted = iban.replace(/(.{4})/g, '$1 ').trim();
  return { isValid: true, formatted };
}

function validateMod97(iban: string): boolean {
  // Move first 4 characters to end
  const rearranged = iban.substring(4) + iban.substring(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  // MOD-97 calculation (handle large numbers by processing in chunks)
  let remainder = 0;
  for (const char of numericString) {
    remainder = (remainder * 10 + parseInt(char)) % 97;
  }

  return remainder === 1;
}

// Format IBAN for display (with spaces every 4 characters)
function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

export function IBANInput({
  value = '',
  onChange,
  onBankInfo,
  showValidation = true,
  showBankInfo = true,
  label = 'IBAN',
  error: externalError,
  className,
  disabled,
  ...props
}: IBANInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string; bankInfo?: BankInfo } | null>(null);

  const displayValue = value !== undefined ? value : internalValue;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formatted = formatIBAN(rawValue);
    setInternalValue(formatted);

    // Clear validation when typing
    if (rawValue.length < 5) {
      setValidation(null);
      onChange?.(rawValue, false);
      onBankInfo?.(null);
      return;
    }

    // Validate on change
    const result = validateIBAN(rawValue);
    setValidation({ isValid: result.isValid, error: result.error, bankInfo: result.bankInfo });
    onChange?.(rawValue, result.isValid);
    onBankInfo?.(result.bankInfo || null);
  }, [onChange, onBankInfo]);

  const handleBlur = useCallback(() => {
    const cleanValue = displayValue.replace(/\s+/g, '');
    if (cleanValue.length >= 5) {
      const result = validateIBAN(cleanValue);
      setValidation({ isValid: result.isValid, error: result.error, bankInfo: result.bankInfo });
    }
  }, [displayValue]);

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
          value={formatIBAN(displayValue)}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="RO49 BTRL 0000 0000 0000 0001"
          maxLength={34} // Max IBAN length + spaces
          className={cn(
            'w-full px-4 py-2.5 pr-12 rounded-lg border transition-colors font-mono text-sm',
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

        {/* Validation indicator */}
        {showValidation && displayValue.replace(/\s+/g, '').length >= 5 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validation?.isValid ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : validation?.error ? (
              <X className="w-5 h-5 text-red-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
      )}

      {/* Bank info preview */}
      {showBankInfo && validation?.isValid && validation.bankInfo && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="w-4 h-4" />
          <span>{validation.bankInfo.name}</span>
          {validation.bankInfo.bic && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
              BIC: {validation.bankInfo.bic}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Export validation function and bank list for use elsewhere
export { validateIBAN, ROMANIAN_BANKS };
