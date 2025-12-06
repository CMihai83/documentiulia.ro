// Romanian-specific form inputs
// Export all validation components and utilities for Romanian business requirements

// CUI/CIF Input - Romanian company identification
export { CUIInput, validateCUI } from './cui-input';
export type { } from './cui-input'; // Types are exported inline

// IBAN Input - Bank account validation with Romanian bank detection
export { IBANInput, validateIBAN, ROMANIAN_BANKS } from './iban-input';

// CNP Input - Romanian personal identification number
export { CNPInput, validateCNP, COUNTY_CODES } from './cnp-input';

// VAT Number Input - EU VAT validation with VIES integration
export { VATNumberInput, validateVATNumber, EU_VAT_PATTERNS } from './vat-number-input';

// Address Input - Romanian address with SIRUTA support
export {
  AddressInput,
  generateFullAddress,
  ROMANIAN_COUNTIES,
  MAJOR_CITIES
} from './address-input';
export type { AddressData, SIRUTALocation } from './address-input';
