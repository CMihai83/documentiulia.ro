"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Info,
} from "lucide-react";

interface CompanyInfo {
  cui: string;
  name: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  regCom: string;
  vatPayer: boolean;
  vatNumber: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface CuiInputProps {
  value: string;
  onChange: (value: string) => void;
  onCompanyFound?: (company: CompanyInfo) => void;
  onError?: (error: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoLookup?: boolean;
  className?: string;
}

// Romanian CUI validation
function validateCUI(cui: string): { valid: boolean; error?: string } {
  // Remove RO prefix if present
  const cleanCui = cui.replace(/^RO/i, "").trim();

  // Check if it's numeric
  if (!/^\d+$/.test(cleanCui)) {
    return { valid: false, error: "CUI-ul trebuie să conțină doar cifre" };
  }

  // Check length (Romanian CUI is 2-10 digits)
  if (cleanCui.length < 2 || cleanCui.length > 10) {
    return { valid: false, error: "CUI-ul trebuie să aibă între 2 și 10 cifre" };
  }

  // Validate using Romanian CUI algorithm (control digit)
  const controlKey = "753217532";
  const digits = cleanCui.padStart(10, "0").split("").map(Number);
  const keyDigits = controlKey.split("").map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * keyDigits[i];
  }

  let controlDigit = (sum * 10) % 11;
  if (controlDigit === 10) controlDigit = 0;

  if (controlDigit !== digits[9]) {
    return { valid: false, error: "CUI invalid - cifra de control nu corespunde" };
  }

  return { valid: true };
}

// Format CUI for display
function formatCUI(cui: string): string {
  const cleanCui = cui.replace(/^RO/i, "").trim();
  return cleanCui;
}

export function CuiInput({
  value,
  onChange,
  onCompanyFound,
  onError,
  label = "CUI / Cod Fiscal",
  placeholder = "ex: 12345678 sau RO12345678",
  required = false,
  disabled = false,
  autoLookup = true,
  className = "",
}: CuiInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Validate on value change (debounced)
  useEffect(() => {
    if (!value || value.length < 2) {
      setValidationResult(null);
      setCompanyInfo(null);
      return;
    }

    setIsValidating(true);
    const timer = setTimeout(() => {
      const result = validateCUI(value);
      setValidationResult(result);
      setIsValidating(false);

      if (!result.valid && onError) {
        onError(result.error || "CUI invalid");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, onError]);

  // Auto-lookup company info
  const lookupCompany = useCallback(async () => {
    if (!validationResult?.valid || !value) return;

    setIsLookingUp(true);
    try {
      // Simulate API call - in production, this would call ANAF API or your backend
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock company data based on CUI
      const cleanCui = formatCUI(value);
      const mockCompany: CompanyInfo = {
        cui: cleanCui,
        name: `SC Test Company ${cleanCui.slice(-4)} SRL`,
        address: "Str. Exemplu nr. 123",
        city: "București",
        county: "București",
        postalCode: "010101",
        country: "RO",
        regCom: `J40/${cleanCui.slice(-3)}/2020`,
        vatPayer: cleanCui.length > 6,
        vatNumber: cleanCui.length > 6 ? `RO${cleanCui}` : null,
        phone: null,
        status: "ACTIVE",
      };

      setCompanyInfo(mockCompany);
      if (onCompanyFound) {
        onCompanyFound(mockCompany);
      }
    } catch (error) {
      if (onError) {
        onError("Eroare la căutarea companiei");
      }
    } finally {
      setIsLookingUp(false);
    }
  }, [validationResult?.valid, value, onCompanyFound, onError]);

  // Auto-lookup when valid
  useEffect(() => {
    if (autoLookup && validationResult?.valid && !companyInfo) {
      lookupCompany();
    }
  }, [autoLookup, validationResult?.valid, companyInfo, lookupCompany]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().replace(/[^0-9RO]/gi, "");
    onChange(newValue);
    setCompanyInfo(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-10 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg max-w-xs">
          <p className="mb-2">
            <strong>CUI (Codul Unic de Identificare)</strong> este codul fiscal atribuit
            persoanelor juridice din România.
          </p>
          <p>Poate fi introdus cu sau fără prefixul &quot;RO&quot;.</p>
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Building className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isLookingUp}
          className={`
            block w-full pl-10 pr-10 py-2.5
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${
              validationResult === null
                ? "border-slate-200"
                : validationResult.valid
                ? "border-emerald-500 bg-emerald-50"
                : "border-red-500 bg-red-50"
            }
          `}
          maxLength={12}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isValidating || isLookingUp ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : validationResult?.valid ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          ) : validationResult && !validationResult.valid ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : null}
        </div>
      </div>

      {/* Validation Error */}
      {validationResult && !validationResult.valid && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {validationResult.error}
        </p>
      )}

      {/* Company Info Card */}
      {companyInfo && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-slate-900">{companyInfo.name}</span>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                companyInfo.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-700"
                  : companyInfo.status === "INACTIVE"
                  ? "bg-slate-100 text-slate-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {companyInfo.status === "ACTIVE"
                ? "Activ"
                : companyInfo.status === "INACTIVE"
                ? "Inactiv"
                : "Suspendat"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500">CUI:</span>
              <span className="ml-2 text-slate-900">{companyInfo.cui}</span>
            </div>
            <div>
              <span className="text-slate-500">Reg. Com.:</span>
              <span className="ml-2 text-slate-900">{companyInfo.regCom}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Adresa:</span>
              <span className="ml-2 text-slate-900">
                {companyInfo.address}, {companyInfo.city}, {companyInfo.county}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Plătitor TVA:</span>
              <span
                className={`ml-2 font-medium ${
                  companyInfo.vatPayer ? "text-emerald-600" : "text-slate-600"
                }`}
              >
                {companyInfo.vatPayer ? `Da (${companyInfo.vatNumber})` : "Nu"}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4">
            <a
              href={`https://www.listafirme.ro/search?query=${companyInfo.cui}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Lista Firme
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://mfinante.gov.ro/static/10/eportal/consulta.php?cui=${companyInfo.cui}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              ANAF
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Manual Lookup Button */}
      {!autoLookup && validationResult?.valid && !companyInfo && (
        <button
          type="button"
          onClick={lookupCompany}
          disabled={isLookingUp}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isLookingUp ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Caută Companie
        </button>
      )}
    </div>
  );
}
