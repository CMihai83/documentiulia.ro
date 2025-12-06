import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { useCUIValidation, type CUIValidationResult, type CompanyData } from '../../hooks/useCUIValidation';

interface CUIValidatorProps {
  onValidated?: (result: CUIValidationResult) => void;
  onCompanySelected?: (company: CompanyData) => void;
  initialValue?: string;
  autoValidate?: boolean;
  showCompanyDetails?: boolean;
  className?: string;
}

/**
 * CUI/CIF Validation Component
 * Validates Romanian company tax identification numbers
 */
const CUIValidator: React.FC<CUIValidatorProps> = ({
  onValidated,
  onCompanySelected,
  initialValue = '',
  autoValidate = true,
  showCompanyDetails = true,
  className = ''
}) => {
  const { language } = useI18n();
  const isRo = language === 'ro';

  const [cui, setCui] = useState(initialValue);
  const [lookupANAF, setLookupANAF] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const {
    validateCUI,
    isValidFormat,
    result,
    loading,
    error,
    reset
  } = useCUIValidation();

  // Auto-validate on input change (debounced)
  useEffect(() => {
    if (!autoValidate || !cui || cui.length < 2) {
      reset();
      return;
    }

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      handleValidate();
    }, 500);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cui, lookupANAF]);

  // Notify parent when validation completes
  useEffect(() => {
    if (result && onValidated) {
      onValidated(result);
    }
  }, [result, onValidated]);

  const handleValidate = async () => {
    if (!cui || cui.trim().length < 2) return;

    const validationResult = await validateCUI(cui, lookupANAF);

    if (validationResult?.company && onCompanySelected) {
      onCompanySelected(validationResult.company);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCui(value);
  };

  // Quick format check for input styling
  const quickValid = cui.length >= 2 ? isValidFormat(cui) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Input field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isRo ? 'CUI/CIF' : 'Tax ID (CUI/CIF)'}
        </label>
        <div className="relative">
          <input
            type="text"
            value={cui}
            onChange={handleInputChange}
            placeholder={isRo ? 'ex: RO12345678 sau 12345678' : 'e.g., RO12345678 or 12345678'}
            className={`
              w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${quickValid === true ? 'border-green-500 bg-green-50' : ''}
              ${quickValid === false ? 'border-red-500 bg-red-50' : ''}
              ${quickValid === null ? 'border-gray-300' : ''}
            `}
          />

          {/* Loading indicator */}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Validation indicator */}
          {!loading && result && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {result.format_valid ? (
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {result && !result.format_valid && result.validation_errors.length > 0 && (
          <p className="mt-1 text-sm text-red-600">
            {result.validation_errors[0]}
          </p>
        )}

        {/* API error */}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* ANAF lookup toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="lookupANAF"
          checked={lookupANAF}
          onChange={(e) => setLookupANAF(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="lookupANAF" className="text-sm text-gray-600">
          {isRo ? 'Verifica datele companiei in ANAF' : 'Lookup company data in ANAF'}
        </label>
      </div>

      {/* Manual validate button (when autoValidate is off) */}
      {!autoValidate && (
        <button
          onClick={handleValidate}
          disabled={loading || !cui || cui.length < 2}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading
            ? (isRo ? 'Validare...' : 'Validating...')
            : (isRo ? 'Valideaza' : 'Validate')}
        </button>
      )}

      {/* Validation result */}
      {result && result.format_valid && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-green-800">
              {isRo ? 'CUI valid' : 'Valid CUI'}
            </span>
          </div>

          <div className="text-sm text-green-700 space-y-1">
            <p><strong>{isRo ? 'Format:' : 'Format:'}</strong> {result.formatted_cui}</p>
            <p><strong>{isRo ? 'Normalizat:' : 'Normalized:'}</strong> {result.normalized_cui}</p>
          </div>
        </div>
      )}

      {/* Company details from ANAF */}
      {showCompanyDetails && result?.company && (
        <CompanyDetailsCard company={result.company} isRo={isRo} />
      )}

      {/* ANAF lookup error */}
      {result?.anaf_lookup && !result.anaf_lookup.success && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-yellow-800">
              {isRo
                ? 'Nu s-au putut obtine datele din ANAF: '
                : 'Could not fetch ANAF data: '}
              {result.anaf_lookup.error}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Company details card component
interface CompanyDetailsCardProps {
  company: CompanyData;
  isRo: boolean;
}

const CompanyDetailsCard: React.FC<CompanyDetailsCardProps> = ({ company, isRo }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <h3 className="text-white font-semibold">
          {isRo ? 'Date companie' : 'Company details'}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Company name */}
        <div>
          <label className="text-xs text-gray-500 uppercase">
            {isRo ? 'Denumire' : 'Name'}
          </label>
          <p className="text-lg font-semibold text-gray-900">{company.name || '-'}</p>
        </div>

        {/* Registration info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase">CUI/CIF</label>
            <p className="font-medium">{company.cif || company.cui}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">
              {isRo ? 'Nr. Reg. Com.' : 'Reg. Number'}
            </label>
            <p className="font-medium">{company.registration_number || '-'}</p>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="text-xs text-gray-500 uppercase">
            {isRo ? 'Adresa' : 'Address'}
          </label>
          <p className="text-gray-700">{company.address || '-'}</p>
        </div>

        {/* VAT Status */}
        <div className="flex items-center gap-4">
          <div className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${company.vat_registered
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'}
          `}>
            {company.vat_registered
              ? (isRo ? 'Platitor TVA' : 'VAT Registered')
              : (isRo ? 'Neplatitor TVA' : 'Not VAT Registered')}
          </div>

          {company.is_inactive && (
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              {isRo ? 'Inactiv' : 'Inactive'}
            </div>
          )}

          {company.split_vat_registered && (
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              {isRo ? 'TVA Defalcat' : 'Split VAT'}
            </div>
          )}
        </div>

        {/* VAT dates */}
        {company.vat_registered && company.vat_registration_date && (
          <div className="text-sm text-gray-600">
            {isRo ? 'Inregistrat TVA din: ' : 'VAT registered since: '}
            {company.vat_registration_date}
          </div>
        )}

        {/* Contact */}
        {(company.phone || company.fax) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {company.phone && (
              <div>
                <label className="text-xs text-gray-500 uppercase">{isRo ? 'Telefon' : 'Phone'}</label>
                <p>{company.phone}</p>
              </div>
            )}
            {company.fax && (
              <div>
                <label className="text-xs text-gray-500 uppercase">Fax</label>
                <p>{company.fax}</p>
              </div>
            )}
          </div>
        )}

        {/* CAEN */}
        {company.caen_code && (
          <div className="text-sm">
            <label className="text-xs text-gray-500 uppercase">CAEN</label>
            <p className="font-medium">{company.caen_code}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CUIValidator;
