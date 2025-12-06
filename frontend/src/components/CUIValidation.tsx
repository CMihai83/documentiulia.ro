import React, { useState, useCallback } from 'react';
import { Check, X, Loader2, Search, Building2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../contexts/AuthContext';

interface CompanyData {
  cui: string;
  cif: string;
  name: string;
  address: string;
  registration_number: string;
  phone: string | null;
  postal_code: string | null;
  status: string;
  caen_code: string | null;
  vat_registered: boolean;
  vat_status: string;
  is_inactive: boolean;
}

interface CUIValidationProps {
  value: string;
  onChange: (value: string) => void;
  onCompanyFound?: (company: CompanyData) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'not_found';

const CUIValidation: React.FC<CUIValidationProps> = ({
  value,
  onChange,
  onCompanyFound,
  className = '',
  placeholder,
  required = false
}) => {
  const { language } = useI18n();
  const { token } = useAuth();
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  const translations = {
    ro: {
      placeholder: 'Introdu CUI (ex: 12345678)',
      validating: 'Se verifica...',
      valid: 'CUI valid',
      invalid: 'CUI invalid',
      not_found: 'Firma negasita in ANAF',
      lookup: 'Cauta in ANAF',
      company_found: 'Firma gasita',
      vat_registered: 'Platitor TVA',
      not_vat_registered: 'Neplatitor TVA',
      inactive: 'Firma inactiva',
      use_data: 'Foloseste datele'
    },
    en: {
      placeholder: 'Enter CUI (e.g., 12345678)',
      validating: 'Validating...',
      valid: 'Valid CUI',
      invalid: 'Invalid CUI',
      not_found: 'Company not found in ANAF',
      lookup: 'Search ANAF',
      company_found: 'Company found',
      vat_registered: 'VAT Registered',
      not_vat_registered: 'Not VAT Registered',
      inactive: 'Inactive company',
      use_data: 'Use this data'
    }
  };

  const t = translations[language as 'ro' | 'en'] || translations.ro;

  const normalizeCUI = (cui: string): string => {
    return cui.replace(/\s+/g, '').replace(/^ro/i, '').replace(/[^0-9]/g, '');
  };

  const validateCUI = useCallback(async (cui: string, lookup: boolean = false) => {
    const normalized = normalizeCUI(cui);

    if (normalized.length < 2) {
      setValidationState('idle');
      setError(null);
      setCompanyData(null);
      return;
    }

    setValidationState('validating');
    setError(null);

    try {
      const url = `/api/v1/fiscal/validate-cui.php?cui=${normalized}${lookup ? '&lookup=true' : ''}`;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success && data.data.format_valid) {
        if (lookup && data.data.company) {
          setCompanyData(data.data.company);
          setValidationState('valid');
          if (onCompanyFound) {
            onCompanyFound(data.data.company);
          }
        } else if (lookup && data.data.anaf_lookup && !data.data.anaf_lookup.success) {
          setValidationState('not_found');
          setError(t.not_found);
        } else {
          setValidationState('valid');
        }
      } else {
        setValidationState('invalid');
        setError(data.data?.validation_errors?.[0] || t.invalid);
      }
    } catch (err) {
      setValidationState('invalid');
      setError('Network error');
    }
  }, [token, onCompanyFound, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Auto-validate when length is appropriate
    const normalized = normalizeCUI(newValue);
    if (normalized.length >= 6) {
      validateCUI(normalized, false);
    } else {
      setValidationState('idle');
      setError(null);
      setCompanyData(null);
    }
  };

  const handleLookup = () => {
    const normalized = normalizeCUI(value);
    if (normalized.length >= 2) {
      validateCUI(normalized, true);
    }
  };

  const handleUseCompanyData = () => {
    if (companyData && onCompanyFound) {
      onCompanyFound(companyData);
    }
  };

  const getStatusIcon = () => {
    switch (validationState) {
      case 'validating':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'valid':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'invalid':
      case 'not_found':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getInputBorderClass = () => {
    switch (validationState) {
      case 'valid':
        return 'border-green-500 focus:ring-green-500';
      case 'invalid':
      case 'not_found':
        return 'border-red-500 focus:ring-red-500';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder || t.placeholder}
            className={`input pr-10 ${getInputBorderClass()} ${className}`}
            required={required}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getStatusIcon()}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLookup}
          disabled={validationState === 'validating' || normalizeCUI(value).length < 2}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap"
        >
          <Search className="w-4 h-4" />
          {t.lookup}
        </button>
      </div>

      {/* Validation Status */}
      {validationState === 'valid' && !companyData && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <Check className="w-4 h-4" />
          {t.valid}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Company Data Card */}
      {companyData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-green-900 truncate">
                  {companyData.name}
                </h4>
                <div className="flex gap-2">
                  {companyData.vat_registered ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {t.vat_registered}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      {t.not_vat_registered}
                    </span>
                  )}
                  {companyData.is_inactive && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                      {t.inactive}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-green-700 mt-1">
                CIF: {companyData.cif} | Nr. Reg.: {companyData.registration_number}
              </p>
              {companyData.address && (
                <p className="text-sm text-green-600 mt-1 truncate">
                  {companyData.address}
                </p>
              )}
              {onCompanyFound && (
                <button
                  type="button"
                  onClick={handleUseCompanyData}
                  className="mt-2 text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  {t.use_data}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CUIValidation;
