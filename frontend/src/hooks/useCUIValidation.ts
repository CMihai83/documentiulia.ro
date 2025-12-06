import { useState, useCallback } from 'react';

// Types
export interface CUIValidationResult {
  cui: string;
  normalized_cui: string;
  format_valid: boolean;
  validation_errors: string[];
  formatted_cui?: string;
  anaf_lookup?: {
    success: boolean;
    source?: string;
    data?: CompanyData;
    error?: string;
    error_code?: string;
  };
  company?: CompanyData;
}

export interface CompanyData {
  cui: string;
  cif: string;
  name: string;
  address: string;
  registration_number: string;
  phone: string | null;
  fax: string | null;
  postal_code: string | null;
  status: string;
  caen_code: string | null;
  caen_name: string | null;
  vat_registered: boolean;
  vat_registration_date: string | null;
  vat_deregistration_date: string | null;
  vat_status: string;
  split_vat_registered: boolean;
  split_vat_date: string | null;
  is_inactive: boolean;
  inactive_from: string | null;
  inactive_until: string | null;
  inactive_status: string | null;
}

export interface BatchValidationResult {
  results: Record<string, CUIValidationResult>;
  statistics: {
    total: number;
    valid: number;
    invalid: number;
  };
}

/**
 * Hook for validating Romanian CUI/CIF numbers
 */
export function useCUIValidation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CUIValidationResult | null>(null);

  /**
   * Validate a single CUI
   */
  const validateCUI = useCallback(async (
    cui: string,
    lookupANAF: boolean = false
  ): Promise<CUIValidationResult | null> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        cui,
        ...(lookupANAF && { lookup: 'true' })
      });

      const response = await fetch(`/api/v1/validation/cui.php?${params}`);
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        return data.data;
      } else {
        setError(data.message || 'Validation failed');
        return null;
      }
    } catch (err) {
      setError('Network error during validation');
      console.error('CUI validation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate multiple CUIs in batch
   */
  const validateBatch = useCallback(async (
    cuis: string[],
    lookupANAF: boolean = false
  ): Promise<BatchValidationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/validation/cui.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cuis,
          lookup: lookupANAF
        })
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        setError(data.message || 'Batch validation failed');
        return null;
      }
    } catch (err) {
      setError('Network error during batch validation');
      console.error('Batch CUI validation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Quick format validation (local, no API call)
   */
  const isValidFormat = useCallback((cui: string): boolean => {
    // Remove RO prefix and whitespace
    let normalized = cui.replace(/\s+/g, '').replace(/^ro/i, '');
    normalized = normalized.replace(/[^0-9]/g, '');

    // Check length
    if (normalized.length < 2 || normalized.length > 10) {
      return false;
    }

    // Calculate check digit
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const cuiBase = normalized.slice(0, -1).padStart(9, '0');

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cuiBase[i]) * weights[i];
    }

    sum *= 10;
    let checkDigit = sum % 11;
    if (checkDigit === 10) checkDigit = 0;

    const lastDigit = parseInt(normalized.slice(-1));
    return checkDigit === lastDigit;
  }, []);

  /**
   * Normalize CUI (remove RO prefix, spaces, etc.)
   */
  const normalizeCUI = useCallback((cui: string): string => {
    return cui
      .replace(/\s+/g, '')
      .replace(/^ro/i, '')
      .replace(/[^0-9]/g, '');
  }, []);

  /**
   * Format CUI with RO prefix
   */
  const formatCUI = useCallback((cui: string): string => {
    const normalized = normalizeCUI(cui);
    return `RO${normalized}`;
  }, [normalizeCUI]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    validateCUI,
    validateBatch,
    isValidFormat,
    normalizeCUI,
    formatCUI,
    result,
    loading,
    error,
    reset
  };
}

export default useCUIValidation;
