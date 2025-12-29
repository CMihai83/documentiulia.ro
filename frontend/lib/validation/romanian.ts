/**
 * Romanian Data Validators - DocumentIulia.ro
 * Validation for CUI, IBAN, CNP, phone numbers, and other Romanian-specific data
 */

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  errorRo: string | null;
}

const valid = (): ValidationResult => ({ valid: true, error: null, errorRo: null });
const invalid = (error: string, errorRo: string): ValidationResult => ({
  valid: false,
  error,
  errorRo,
});

/**
 * Validate Romanian CUI (Cod Unic de Identificare)
 * Format: RO + 2-10 digits OR just 2-10 digits
 * Includes checksum validation
 */
export function validateCUI(cui: string): ValidationResult {
  if (!cui || typeof cui !== 'string') {
    return invalid('CUI is required', 'CUI este obligatoriu');
  }

  // Normalize: remove spaces, convert to uppercase
  const normalized = cui.replace(/\s/g, '').toUpperCase();

  // Extract numeric part
  const numericPart = normalized.startsWith('RO') ? normalized.slice(2) : normalized;

  // Check length (2-10 digits)
  if (!/^\d{2,10}$/.test(numericPart)) {
    return invalid(
      'CUI must be RO followed by 2-10 digits',
      'CUI trebuie să fie format din RO + 2-10 cifre sau doar 2-10 cifre'
    );
  }

  // Checksum validation (last digit is control digit)
  const controlKey = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = numericPart.padStart(10, '0').split('').map(Number);
  const controlDigit = digits.pop()!;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * controlKey[i];
  }

  const remainder = (sum * 10) % 11;
  const expectedControl = remainder === 10 ? 0 : remainder;

  if (controlDigit !== expectedControl) {
    return invalid('Invalid CUI checksum', 'CUI invalid - verificați cifra de control');
  }

  return valid();
}

/**
 * Validate Romanian IBAN
 * Format: ROxx XXXX xxxx xxxx xxxx xxxx (24 characters)
 */
export function validateIBAN(iban: string): ValidationResult {
  if (!iban || typeof iban !== 'string') {
    return invalid('IBAN is required', 'IBAN este obligatoriu');
  }

  // Normalize: remove spaces, convert to uppercase
  const normalized = iban.replace(/\s/g, '').toUpperCase();

  // Check format: RO + 2 check digits + 4 letter bank code + 16 alphanumeric
  if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(normalized)) {
    return invalid(
      'Invalid IBAN format. Expected: ROxx XXXX xxxx xxxx xxxx xxxx',
      'Format IBAN invalid. Așteptat: ROxx XXXX xxxx xxxx xxxx xxxx'
    );
  }

  // IBAN checksum validation (mod 97)
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numericIBAN = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());

  // Calculate mod 97 using string chunks (to handle large numbers)
  let remainder = 0;
  for (let i = 0; i < numericIBAN.length; i += 7) {
    const chunk = remainder.toString() + numericIBAN.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  if (remainder !== 1) {
    return invalid('Invalid IBAN checksum', 'IBAN invalid - verificați codul de control');
  }

  return valid();
}

/**
 * Validate Romanian CNP (Cod Numeric Personal)
 * 13-digit national identification number
 */
export function validateCNP(cnp: string): ValidationResult {
  if (!cnp || typeof cnp !== 'string') {
    return invalid('CNP is required', 'CNP este obligatoriu');
  }

  const normalized = cnp.replace(/\s/g, '');

  if (!/^\d{13}$/.test(normalized)) {
    return invalid('CNP must be 13 digits', 'CNP trebuie să aibă 13 cifre');
  }

  // Validate first digit (sex and century)
  const sexDigit = parseInt(normalized[0], 10);
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(sexDigit)) {
    return invalid('Invalid CNP sex digit', 'Prima cifră din CNP este invalidă');
  }

  // Validate birth date
  const year = parseInt(normalized.slice(1, 3), 10);
  const month = parseInt(normalized.slice(3, 5), 10);
  const day = parseInt(normalized.slice(5, 7), 10);

  if (month < 1 || month > 12) {
    return invalid('Invalid CNP month', 'Luna din CNP este invalidă');
  }

  if (day < 1 || day > 31) {
    return invalid('Invalid CNP day', 'Ziua din CNP este invalidă');
  }

  // Checksum validation
  const controlKey = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  const digits = normalized.split('').map(Number);
  const controlDigit = digits.pop()!;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * controlKey[i];
  }

  const remainder = sum % 11;
  const expectedControl = remainder === 10 ? 1 : remainder;

  if (controlDigit !== expectedControl) {
    return invalid('Invalid CNP checksum', 'CNP invalid - verificați cifra de control');
  }

  return valid();
}

/**
 * Validate Romanian phone number
 * Formats: 07xxxxxxxx, +407xxxxxxxx, 004xxxxxxxx
 */
export function validatePhoneRO(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return invalid('Phone number is required', 'Numărul de telefon este obligatoriu');
  }

  const normalized = phone.replace(/[\s\-\(\)]/g, '');

  // Mobile: 07xxxxxxxx or +407xxxxxxxx or 00407xxxxxxxx
  const mobileRegex = /^(\+40|0040|0)7\d{8}$/;

  // Landline: 02x xxxxxxx or 03x xxxxxxx
  const landlineRegex = /^(\+40|0040|0)(2|3)\d{8}$/;

  if (!mobileRegex.test(normalized) && !landlineRegex.test(normalized)) {
    return invalid(
      'Invalid phone number. Expected: 07xxxxxxxx or +407xxxxxxxx',
      'Număr de telefon invalid. Format așteptat: 07xxxxxxxx sau +407xxxxxxxx'
    );
  }

  return valid();
}

/**
 * Validate Romanian postal code
 * 6 digits
 */
export function validatePostalCode(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return invalid('Postal code is required', 'Codul poștal este obligatoriu');
  }

  const normalized = code.replace(/\s/g, '');

  if (!/^\d{6}$/.test(normalized)) {
    return invalid('Postal code must be 6 digits', 'Codul poștal trebuie să aibă 6 cifre');
  }

  // First digit must be 0-9 (county code)
  const countyCode = parseInt(normalized[0], 10);
  if (countyCode < 0 || countyCode > 9) {
    return invalid('Invalid postal code', 'Cod poștal invalid');
  }

  return valid();
}

/**
 * Validate Romanian car registration number
 * Formats: B 123 ABC, CJ 12 ABC, etc.
 */
export function validateCarRegistration(plate: string): ValidationResult {
  if (!plate || typeof plate !== 'string') {
    return invalid('Registration number is required', 'Numărul de înmatriculare este obligatoriu');
  }

  const normalized = plate.replace(/[\s\-]/g, '').toUpperCase();

  // Bucharest: B + 2-3 digits + 3 letters
  // Other counties: 2 letters + 2 digits + 3 letters
  const bucharestRegex = /^B\d{2,3}[A-Z]{3}$/;
  const countyRegex = /^[A-Z]{2}\d{2}[A-Z]{3}$/;

  if (!bucharestRegex.test(normalized) && !countyRegex.test(normalized)) {
    return invalid(
      'Invalid registration format',
      'Format invalid. Așteptat: B 123 ABC sau CJ 12 ABC'
    );
  }

  return valid();
}

/**
 * Validate email (standard + Romanian-friendly)
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return invalid('Email is required', 'Email-ul este obligatoriu');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return invalid('Invalid email format', 'Format email invalid');
  }

  return valid();
}

/**
 * Validate invoice number (Romanian format)
 * Common formats: ABC-123, ABC123, 2024-001, etc.
 */
export function validateInvoiceNumber(number: string): ValidationResult {
  if (!number || typeof number !== 'string') {
    return invalid('Invoice number is required', 'Numărul facturii este obligatoriu');
  }

  const normalized = number.trim();

  if (normalized.length < 1 || normalized.length > 50) {
    return invalid(
      'Invoice number must be 1-50 characters',
      'Numărul facturii trebuie să aibă între 1 și 50 de caractere'
    );
  }

  // Allow alphanumeric, dashes, underscores, slashes
  if (!/^[A-Za-z0-9\-_\/]+$/.test(normalized)) {
    return invalid(
      'Invoice number contains invalid characters',
      'Numărul facturii conține caractere invalide'
    );
  }

  return valid();
}

/**
 * Validate Romanian bank code (BIC/SWIFT)
 */
export function validateBIC(bic: string): ValidationResult {
  if (!bic || typeof bic !== 'string') {
    return invalid('BIC code is required', 'Codul BIC este obligatoriu');
  }

  const normalized = bic.replace(/\s/g, '').toUpperCase();

  // BIC format: 8 or 11 characters
  if (!/^[A-Z]{4}RO[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized)) {
    return invalid(
      'Invalid BIC format. Expected: XXXXROXX or XXXXROXXXXX',
      'Format BIC invalid. Așteptat: XXXXROXX sau XXXXROXXXXX'
    );
  }

  return valid();
}

// Export all validators as a single object for convenience
export const validators = {
  cui: validateCUI,
  iban: validateIBAN,
  cnp: validateCNP,
  phone: validatePhoneRO,
  postalCode: validatePostalCode,
  carRegistration: validateCarRegistration,
  email: validateEmail,
  invoiceNumber: validateInvoiceNumber,
  bic: validateBIC,
};

export default validators;
