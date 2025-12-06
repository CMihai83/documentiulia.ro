"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Info,
  Building2,
} from "lucide-react";

// Romanian bank codes and names
const ROMANIAN_BANKS: Record<string, string> = {
  BTRL: "Banca Transilvania",
  BRDE: "BRD - Groupe Société Générale",
  RNCB: "BCR (Banca Comercială Română)",
  INGB: "ING Bank",
  RZBR: "Raiffeisen Bank",
  BACX: "UniCredit Bank",
  PIRB: "First Bank (fost Piraeus)",
  OTPV: "OTP Bank",
  CECE: "CEC Bank",
  DAFB: "Banca Românească",
  EGNA: "Garanti BBVA",
  NBOR: "Banca Națională a României",
  TREZ: "Trezoreria Statului",
  MIND: "Intesa Sanpaolo Bank",
  EXIM: "EximBank",
  PORL: "Patria Bank",
  LIBR: "Libra Internet Bank",
  BPOS: "Banca Comercială Feroviară",
  CARP: "Credit Agricole",
};

interface IbanInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidation?: (isValid: boolean, bankInfo?: { code: string; name: string }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showBankInfo?: boolean;
  allowedCountries?: string[];
  className?: string;
}

// IBAN validation with mod 97 algorithm
function validateIBAN(iban: string): { valid: boolean; error?: string; country?: string; bankCode?: string } {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();

  // Check minimum length
  if (cleanIban.length < 15) {
    return { valid: false, error: "IBAN prea scurt" };
  }

  // Check maximum length (Romanian IBAN is 24 characters)
  if (cleanIban.length > 34) {
    return { valid: false, error: "IBAN prea lung" };
  }

  // Check format (2 letters + 2 digits + alphanumeric)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
    return { valid: false, error: "Format IBAN invalid" };
  }

  const country = cleanIban.slice(0, 2);

  // Check country-specific length
  const countryLengths: Record<string, number> = {
    RO: 24, // Romania
    DE: 22, // Germany
    FR: 27, // France
    GB: 22, // UK
    IT: 27, // Italy
    ES: 24, // Spain
    NL: 18, // Netherlands
    BE: 16, // Belgium
    AT: 20, // Austria
    BG: 22, // Bulgaria
    HU: 28, // Hungary
    PL: 28, // Poland
    CZ: 24, // Czech Republic
  };

  if (countryLengths[country] && cleanIban.length !== countryLengths[country]) {
    return {
      valid: false,
      error: `IBAN pentru ${country} trebuie să aibă ${countryLengths[country]} caractere`,
    };
  }

  // Move first 4 chars to end for mod 97 check
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  const numeric = rearranged
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : char;
    })
    .join("");

  // Mod 97 check (must equal 1)
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i])) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, error: "IBAN invalid - verificare eșuată" };
  }

  // Extract bank code for Romanian IBANs
  let bankCode: string | undefined;
  if (country === "RO") {
    bankCode = cleanIban.slice(4, 8);
  }

  return { valid: true, country, bankCode };
}

// Format IBAN for display (groups of 4)
function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

export function IbanInput({
  value,
  onChange,
  onValidation,
  label = "IBAN",
  placeholder = "RO49 BTRL 0000 0000 0000 0001",
  required = false,
  disabled = false,
  showBankInfo = true,
  allowedCountries = ["RO"],
  className = "",
}: IbanInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    country?: string;
    bankCode?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Validate on value change (debounced)
  useEffect(() => {
    if (!value || value.replace(/\s/g, "").length < 5) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    const timer = setTimeout(() => {
      const result = validateIBAN(value);

      // Check allowed countries
      if (result.valid && result.country && allowedCountries.length > 0) {
        if (!allowedCountries.includes(result.country)) {
          result.valid = false;
          result.error = `Sunt acceptate doar IBAN-uri din: ${allowedCountries.join(", ")}`;
        }
      }

      setValidationResult(result);
      setIsValidating(false);

      if (onValidation) {
        const bankInfo =
          result.bankCode && ROMANIAN_BANKS[result.bankCode]
            ? { code: result.bankCode, name: ROMANIAN_BANKS[result.bankCode] }
            : undefined;
        onValidation(result.valid, bankInfo);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, allowedCountries, onValidation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only alphanumeric and spaces
    const newValue = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
    onChange(formatIBAN(newValue));
  };

  const handleCopy = async () => {
    const cleanIban = value.replace(/\s/g, "");
    await navigator.clipboard.writeText(cleanIban);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bankName = validationResult?.bankCode
    ? ROMANIAN_BANKS[validationResult.bankCode]
    : null;

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
            <strong>IBAN (International Bank Account Number)</strong> este un cod
            standardizat pentru identificarea conturilor bancare.
          </p>
          <p>IBAN-ul românesc are 24 de caractere și începe cu &quot;RO&quot;.</p>
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <CreditCard className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full pl-10 pr-20 py-2.5
            border rounded-lg font-mono text-sm tracking-wider
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
          maxLength={34}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          {isValidating ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : validationResult?.valid ? (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-600 transition"
                title="Copiază IBAN"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </>
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

      {/* Bank Info */}
      {showBankInfo && validationResult?.valid && bankName && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Building2 className="w-5 h-5 text-slate-500" />
          <div>
            <p className="text-sm font-medium text-slate-900">{bankName}</p>
            <p className="text-xs text-slate-500">Cod bancă: {validationResult.bankCode}</p>
          </div>
        </div>
      )}

      {/* Country Flag for non-Romanian IBANs */}
      {validationResult?.valid && validationResult.country && validationResult.country !== "RO" && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Țară: {validationResult.country}</span>
        </div>
      )}

      {/* Quick IBAN Templates */}
      {!value && (
        <div className="text-xs text-slate-500">
          <span>Format: </span>
          <button
            type="button"
            onClick={() => onChange("RO49 BTRL ")}
            className="text-blue-600 hover:text-blue-700"
          >
            Banca Transilvania
          </button>
          <span> | </span>
          <button
            type="button"
            onClick={() => onChange("RO49 RNCB ")}
            className="text-blue-600 hover:text-blue-700"
          >
            BCR
          </button>
          <span> | </span>
          <button
            type="button"
            onClick={() => onChange("RO49 BRDE ")}
            className="text-blue-600 hover:text-blue-700"
          >
            BRD
          </button>
        </div>
      )}
    </div>
  );
}
