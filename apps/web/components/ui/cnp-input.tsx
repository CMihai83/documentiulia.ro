'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, User, Calendar, MapPin } from 'lucide-react';

interface CNPInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onPersonInfo?: (info: PersonInfo | null) => void;
  showValidation?: boolean;
  showPersonInfo?: boolean;
  label?: string;
  error?: string;
}

interface PersonInfo {
  gender: 'masculin' | 'feminin';
  birthDate: Date;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  county: string;
  countyCode: string;
  age: number;
  isResident: boolean;
}

// Romanian county codes (first 2 digits after gender+year)
const COUNTY_CODES: Record<string, string> = {
  '01': 'Alba',
  '02': 'Arad',
  '03': 'Argeș',
  '04': 'Bacău',
  '05': 'Bihor',
  '06': 'Bistrița-Năsăud',
  '07': 'Botoșani',
  '08': 'Brașov',
  '09': 'Brăila',
  '10': 'Buzău',
  '11': 'Caraș-Severin',
  '12': 'Cluj',
  '13': 'Constanța',
  '14': 'Covasna',
  '15': 'Dâmbovița',
  '16': 'Dolj',
  '17': 'Galați',
  '18': 'Gorj',
  '19': 'Harghita',
  '20': 'Hunedoara',
  '21': 'Ialomița',
  '22': 'Iași',
  '23': 'Ilfov',
  '24': 'Maramureș',
  '25': 'Mehedinți',
  '26': 'Mureș',
  '27': 'Neamț',
  '28': 'Olt',
  '29': 'Prahova',
  '30': 'Satu Mare',
  '31': 'Sălaj',
  '32': 'Sibiu',
  '33': 'Suceava',
  '34': 'Teleorman',
  '35': 'Timiș',
  '36': 'Tulcea',
  '37': 'Vaslui',
  '38': 'Vâlcea',
  '39': 'Vrancea',
  '40': 'București',
  '41': 'București - Sector 1',
  '42': 'București - Sector 2',
  '43': 'București - Sector 3',
  '44': 'București - Sector 4',
  '45': 'București - Sector 5',
  '46': 'București - Sector 6',
  '51': 'Călărași',
  '52': 'Giurgiu',
};

// Validate Romanian CNP (Cod Numeric Personal)
function validateCNP(cnp: string): { isValid: boolean; formatted: string; error?: string; personInfo?: PersonInfo } {
  // Remove whitespace
  const cleanCNP = cnp.replace(/\s+/g, '');

  // Check if it's only digits
  if (!/^\d+$/.test(cleanCNP)) {
    return { isValid: false, formatted: cleanCNP, error: 'CNP-ul trebuie să conțină doar cifre' };
  }

  // Check length (must be exactly 13 digits)
  if (cleanCNP.length !== 13) {
    if (cleanCNP.length < 13) {
      return { isValid: false, formatted: cleanCNP, error: `CNP-ul trebuie să aibă 13 cifre (ai introdus ${cleanCNP.length})` };
    }
    return { isValid: false, formatted: cleanCNP, error: 'CNP-ul trebuie să aibă exact 13 cifre' };
  }

  // Extract components
  const S = parseInt(cleanCNP[0]); // Gender + century
  const AA = cleanCNP.substring(1, 3); // Year (last 2 digits)
  const LL = cleanCNP.substring(3, 5); // Month
  const ZZ = cleanCNP.substring(5, 7); // Day
  const JJ = cleanCNP.substring(7, 9); // County code
  const NNN = cleanCNP.substring(9, 12); // Sequential number
  const C = parseInt(cleanCNP[12]); // Control digit

  // Validate S (gender + century)
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(S)) {
    return { isValid: false, formatted: cleanCNP, error: 'Prima cifră (sex/secol) este invalidă' };
  }

  // Determine century and gender
  let century: number;
  let gender: 'masculin' | 'feminin';
  let isResident = true;

  switch (S) {
    case 1: century = 1900; gender = 'masculin'; break;
    case 2: century = 1900; gender = 'feminin'; break;
    case 3: century = 1800; gender = 'masculin'; break;
    case 4: century = 1800; gender = 'feminin'; break;
    case 5: century = 2000; gender = 'masculin'; break;
    case 6: century = 2000; gender = 'feminin'; break;
    case 7: century = 1900; gender = 'masculin'; isResident = false; break; // Resident foreigners
    case 8: century = 1900; gender = 'feminin'; isResident = false; break;
    case 9: century = 1900; gender = 'masculin'; isResident = false; break; // Foreigners
    default:
      return { isValid: false, formatted: cleanCNP, error: 'Prima cifră invalidă' };
  }

  // Calculate full year
  const year = century + parseInt(AA);

  // Validate month
  const month = parseInt(LL);
  if (month < 1 || month > 12) {
    return { isValid: false, formatted: cleanCNP, error: 'Luna nașterii este invalidă (01-12)' };
  }

  // Validate day
  const day = parseInt(ZZ);
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { isValid: false, formatted: cleanCNP, error: `Ziua nașterii este invalidă (01-${daysInMonth} pentru luna ${month})` };
  }

  // Validate county code
  const county = COUNTY_CODES[JJ];
  if (!county && JJ !== '00') {
    return { isValid: false, formatted: cleanCNP, error: 'Codul județului este invalid' };
  }

  // Validate control digit using the algorithm
  const controlKey = '279146358279';
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNP[i]) * parseInt(controlKey[i]);
  }
  let calculatedControl = sum % 11;
  if (calculatedControl === 10) {
    calculatedControl = 1;
  }

  if (calculatedControl !== C) {
    return { isValid: false, formatted: cleanCNP, error: 'CNP invalid - cifra de control nu corespunde' };
  }

  // Calculate age
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) {
    age--;
  }

  // Validate reasonable age (0-150 years)
  if (age < 0 || age > 150) {
    return { isValid: false, formatted: cleanCNP, error: 'Data nașterii este invalidă' };
  }

  return {
    isValid: true,
    formatted: cleanCNP,
    personInfo: {
      gender,
      birthDate,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      county: county || 'Necunoscut',
      countyCode: JJ,
      age,
      isResident,
    },
  };
}

// Format CNP for display (with spaces for readability)
function formatCNP(cnp: string): string {
  const clean = cnp.replace(/\s+/g, '');
  if (clean.length <= 1) return clean;
  if (clean.length <= 7) return `${clean.substring(0, 1)} ${clean.substring(1)}`;
  if (clean.length <= 9) return `${clean.substring(0, 1)} ${clean.substring(1, 7)} ${clean.substring(7)}`;
  return `${clean.substring(0, 1)} ${clean.substring(1, 7)} ${clean.substring(7, 9)} ${clean.substring(9)}`;
}

export function CNPInput({
  value = '',
  onChange,
  onPersonInfo,
  showValidation = true,
  showPersonInfo = true,
  label = 'CNP',
  error: externalError,
  className,
  disabled,
  ...props
}: CNPInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string; personInfo?: PersonInfo } | null>(null);

  const displayValue = value !== undefined ? value : internalValue;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '').substring(0, 13);
    setInternalValue(rawValue);

    // Clear validation when typing
    if (rawValue.length < 13) {
      setValidation(null);
      onChange?.(rawValue, false);
      onPersonInfo?.(null);
      return;
    }

    // Validate on change
    const result = validateCNP(rawValue);
    setValidation({ isValid: result.isValid, error: result.error, personInfo: result.personInfo });
    onChange?.(rawValue, result.isValid);
    onPersonInfo?.(result.personInfo || null);
  }, [onChange, onPersonInfo]);

  const handleBlur = useCallback(() => {
    const cleanValue = displayValue.replace(/\s+/g, '');
    if (cleanValue.length === 13) {
      const result = validateCNP(cleanValue);
      setValidation({ isValid: result.isValid, error: result.error, personInfo: result.personInfo });
    }
  }, [displayValue]);

  const displayError = externalError || validation?.error;

  // Format birth date for display
  const formattedBirthDate = useMemo(() => {
    if (!validation?.personInfo) return '';
    const { birthDay, birthMonth, birthYear } = validation.personInfo;
    return `${birthDay.toString().padStart(2, '0')}.${birthMonth.toString().padStart(2, '0')}.${birthYear}`;
  }, [validation?.personInfo]);

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
          value={formatCNP(displayValue)}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="X YYMMDD JJ NNN C"
          maxLength={16} // 13 digits + 3 spaces
          className={cn(
            'w-full px-4 py-2.5 pr-12 rounded-lg border transition-colors font-mono text-sm tracking-wider',
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
        {showValidation && displayValue.replace(/\s+/g, '').length === 13 && (
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

      {/* Person info preview */}
      {showPersonInfo && validation?.isValid && validation.personInfo && (
        <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-800 dark:text-blue-200">
              {validation.personInfo.gender === 'masculin' ? 'Bărbat' : 'Femeie'}
              {!validation.personInfo.isResident && ' (rezident străin)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Născut: {formattedBirthDate}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <span className="font-medium">{validation.personInfo.age} ani</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 col-span-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>{validation.personInfo.county}</span>
            </div>
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Format: S AALLZZ JJ NNN C (13 cifre)
      </p>
    </div>
  );
}

// Export validation function for use elsewhere
export { validateCNP, COUNTY_CODES };
