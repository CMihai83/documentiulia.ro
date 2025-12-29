/**
 * Romanian VAT Rates Configuration
 *
 * Legea 141/2025 - VAT rate changes effective August 1, 2025:
 * - Standard rate: 19% → 21%
 * - Reduced rate: 9% → 11%
 * - Special reduced rate (housing): 5% (unchanged)
 *
 * This configuration automatically applies the correct rates based on date.
 */

// Effective date for new VAT rates (August 1, 2025)
export const VAT_CHANGE_DATE = new Date('2025-08-01T00:00:00+03:00'); // Romanian time (EEST)

// VAT Rate Types
export type VatRateType = 'standard' | 'reduced' | 'special' | 'exempt';

// VAT Rate Configuration
export interface VatRateConfig {
  code: VatRateType;
  rate: number;
  label: string;
  labelRo: string;
  description: string;
  descriptionRo: string;
  applicableCategories: string[];
}

// Pre-August 2025 rates (current)
export const VAT_RATES_CURRENT: Record<VatRateType, VatRateConfig> = {
  standard: {
    code: 'standard',
    rate: 19,
    label: 'Standard Rate',
    labelRo: 'Cota standard',
    description: 'Standard VAT rate for most goods and services',
    descriptionRo: 'Cota standard de TVA pentru majoritatea bunurilor și serviciilor',
    applicableCategories: ['general', 'electronics', 'clothing', 'services'],
  },
  reduced: {
    code: 'reduced',
    rate: 9,
    label: 'Reduced Rate',
    labelRo: 'Cota redusă',
    description: 'Reduced rate for food, pharmaceuticals, hotels, restaurants',
    descriptionRo: 'Cota redusă pentru alimente, medicamente, hoteluri, restaurante',
    applicableCategories: ['food', 'pharmaceuticals', 'hotels', 'restaurants', 'water', 'medical'],
  },
  special: {
    code: 'special',
    rate: 5,
    label: 'Special Reduced Rate',
    labelRo: 'Cota specială redusă',
    description: 'Special rate for social housing, books, cultural events',
    descriptionRo: 'Cota specială pentru locuințe sociale, cărți, evenimente culturale',
    applicableCategories: ['housing', 'books', 'newspapers', 'cultural', 'prostheses'],
  },
  exempt: {
    code: 'exempt',
    rate: 0,
    label: 'VAT Exempt',
    labelRo: 'Scutit de TVA',
    description: 'Exempt from VAT (financial, medical, educational services)',
    descriptionRo: 'Scutit de TVA (servicii financiare, medicale, educaționale)',
    applicableCategories: ['financial', 'insurance', 'healthcare', 'education', 'postal'],
  },
};

// Post-August 2025 rates (Legea 141/2025)
export const VAT_RATES_2025: Record<VatRateType, VatRateConfig> = {
  standard: {
    ...VAT_RATES_CURRENT.standard,
    rate: 21,
  },
  reduced: {
    ...VAT_RATES_CURRENT.reduced,
    rate: 11,
  },
  special: {
    ...VAT_RATES_CURRENT.special,
    // Special rate remains at 5%
  },
  exempt: {
    ...VAT_RATES_CURRENT.exempt,
  },
};

/**
 * Get the applicable VAT rates based on date
 * @param date - Date to check (defaults to current date)
 * @returns VAT rates configuration
 */
export function getVatRates(date: Date = new Date()): Record<VatRateType, VatRateConfig> {
  return date >= VAT_CHANGE_DATE ? VAT_RATES_2025 : VAT_RATES_CURRENT;
}

/**
 * Get a specific VAT rate
 * @param type - VAT rate type
 * @param date - Date to check (defaults to current date)
 * @returns VAT rate percentage
 */
export function getVatRate(type: VatRateType, date: Date = new Date()): number {
  const rates = getVatRates(date);
  return rates[type].rate;
}

/**
 * Calculate VAT amount
 * @param netAmount - Net amount (without VAT)
 * @param type - VAT rate type
 * @param date - Date to check (defaults to current date)
 * @returns VAT amount
 */
export function calculateVat(
  netAmount: number,
  type: VatRateType = 'standard',
  date: Date = new Date()
): number {
  const rate = getVatRate(type, date);
  return Math.round(netAmount * (rate / 100) * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate gross amount (net + VAT)
 * @param netAmount - Net amount (without VAT)
 * @param type - VAT rate type
 * @param date - Date to check (defaults to current date)
 * @returns Gross amount
 */
export function calculateGrossAmount(
  netAmount: number,
  type: VatRateType = 'standard',
  date: Date = new Date()
): number {
  const vat = calculateVat(netAmount, type, date);
  return Math.round((netAmount + vat) * 100) / 100;
}

/**
 * Extract net amount from gross (reverse VAT calculation)
 * @param grossAmount - Gross amount (with VAT)
 * @param type - VAT rate type
 * @param date - Date to check (defaults to current date)
 * @returns Net amount
 */
export function extractNetAmount(
  grossAmount: number,
  type: VatRateType = 'standard',
  date: Date = new Date()
): number {
  const rate = getVatRate(type, date);
  return Math.round((grossAmount / (1 + rate / 100)) * 100) / 100;
}

/**
 * Check if the new VAT rates are in effect
 * @param date - Date to check (defaults to current date)
 * @returns boolean
 */
export function isNewVatRatesActive(date: Date = new Date()): boolean {
  return date >= VAT_CHANGE_DATE;
}

/**
 * Get all VAT rate options for dropdowns/selects
 * @param date - Date to check (defaults to current date)
 * @returns Array of VAT rate options
 */
export function getVatRateOptions(date: Date = new Date()) {
  const rates = getVatRates(date);
  return Object.values(rates).map((config) => ({
    value: config.code,
    label: `${config.labelRo} (${config.rate}%)`,
    rate: config.rate,
  }));
}

/**
 * Format VAT rate for display
 * @param type - VAT rate type
 * @param date - Date to check (defaults to current date)
 * @returns Formatted string (e.g., "21%")
 */
export function formatVatRate(type: VatRateType, date: Date = new Date()): string {
  const rate = getVatRate(type, date);
  return `${rate}%`;
}

/**
 * Get warning message about upcoming VAT changes
 * @returns Warning message or null if changes already in effect
 */
export function getVatChangeWarning(): string | null {
  const now = new Date();
  const daysUntilChange = Math.ceil(
    (VAT_CHANGE_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilChange <= 0) {
    return null; // Changes already in effect
  }

  if (daysUntilChange <= 30) {
    return `Atenție: Cotele de TVA se modifică în ${daysUntilChange} zile (1 august 2025). Cota standard: 19% → 21%, Cota redusă: 9% → 11%.`;
  }

  if (daysUntilChange <= 90) {
    return `Notificare: Cotele de TVA se vor modifica la 1 august 2025 conform Legea 141/2025. Pregătiți-vă pentru tranziție.`;
  }

  return null;
}

// Export all VAT rate types for convenience
export const VAT_RATE_TYPES: VatRateType[] = ['standard', 'reduced', 'special', 'exempt'];

// Default export for convenience
export default {
  getVatRates,
  getVatRate,
  calculateVat,
  calculateGrossAmount,
  extractNetAmount,
  isNewVatRatesActive,
  getVatRateOptions,
  formatVatRate,
  getVatChangeWarning,
  VAT_CHANGE_DATE,
  VAT_RATES_CURRENT,
  VAT_RATES_2025,
  VAT_RATE_TYPES,
};
