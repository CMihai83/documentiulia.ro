/**
 * Dynamic VAT Rate Configuration Service
 * Sprint 41: Dynamic VAT Rate Configuration (Legea 141/2025)
 *
 * Provides dynamic VAT rate management for Romanian and EU compliance.
 * Supports Legea 141/2025 changes (21%/11% effective Aug 2025).
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// VAT Rate Types
export enum VATRateType {
  STANDARD = 'STANDARD',
  REDUCED = 'REDUCED',
  SUPER_REDUCED = 'SUPER_REDUCED',
  ZERO = 'ZERO',
  EXEMPT = 'EXEMPT',
  REVERSE_CHARGE = 'REVERSE_CHARGE',
}

// Product/Service Categories for VAT
export enum VATCategory {
  GENERAL_GOODS = 'GENERAL_GOODS',
  FOOD_BEVERAGES = 'FOOD_BEVERAGES',
  BOOKS_PUBLICATIONS = 'BOOKS_PUBLICATIONS',
  MEDICAL_PHARMA = 'MEDICAL_PHARMA',
  ACCOMMODATION = 'ACCOMMODATION',
  TRANSPORT = 'TRANSPORT',
  CULTURAL_EVENTS = 'CULTURAL_EVENTS',
  AGRICULTURAL = 'AGRICULTURAL',
  CONSTRUCTION = 'CONSTRUCTION',
  DIGITAL_SERVICES = 'DIGITAL_SERVICES',
  FINANCIAL_SERVICES = 'FINANCIAL_SERVICES',
  EDUCATION = 'EDUCATION',
  EXPORTS = 'EXPORTS',
  INTRA_EU_B2B = 'INTRA_EU_B2B',
}

// Interfaces
export interface VATRate {
  id: string;
  country: string;
  type: VATRateType;
  category: VATCategory;
  rate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  legalReference?: string;
  notes?: string;
  isActive: boolean;
}

export interface CountryVATConfig {
  country: string;
  countryName: string;
  currencyCode: string;
  standardRate: number;
  reducedRates: number[];
  vatNumberPrefix: string;
  vatNumberFormat: RegExp;
  reverseChargeThreshold?: number;
  intraEUThreshold?: number;
  lastUpdated: Date;
}

export interface VATCalculation {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  vatType: VATRateType;
  country: string;
  category: VATCategory;
  reverseCharge: boolean;
  legalReference?: string;
}

export interface VATValidation {
  valid: boolean;
  vatNumber?: string;
  companyName?: string;
  address?: string;
  country?: string;
  validatedAt?: Date;
  source: 'VIES' | 'ANAF' | 'LOCAL';
}

@Injectable()
export class DynamicVATService implements OnModuleInit {
  private readonly logger = new Logger(DynamicVATService.name);

  // VAT rates storage
  private vatRates: Map<string, VATRate> = new Map();
  private countryConfigs: Map<string, CountryVATConfig> = new Map();

  // Rate ID counter
  private rateIdCounter = 0;

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    await this.initializeVATRates();
    this.logger.log('Dynamic VAT Service initialized with EU-27 rates');
  }

  /**
   * Initialize VAT rates for EU-27 + Romania specifics
   */
  private async initializeVATRates(): Promise<void> {
    // Romanian VAT rates (Legea 141/2025)
    this.initializeRomanianRates();

    // EU-27 country configurations
    this.initializeEUCountries();
  }

  /**
   * Initialize Romanian VAT rates per Legea 141/2025
   */
  private initializeRomanianRates(): void {
    const romaniaConfig: CountryVATConfig = {
      country: 'RO',
      countryName: 'Romania',
      currencyCode: 'RON',
      standardRate: 21, // Increased from 19% effective Aug 2025
      reducedRates: [11], // Unified reduced rate (from 9%/5%)
      vatNumberPrefix: 'RO',
      vatNumberFormat: /^RO\d{2,10}$/,
      reverseChargeThreshold: 300000, // RON
      lastUpdated: new Date(),
    };

    this.countryConfigs.set('RO', romaniaConfig);

    // Standard rate 21%
    this.addVATRate({
      country: 'RO',
      type: VATRateType.STANDARD,
      category: VATCategory.GENERAL_GOODS,
      rate: 21,
      effectiveFrom: new Date('2025-08-01'),
      legalReference: 'Legea 141/2025',
      notes: 'Standard VAT rate increased from 19% to 21%',
    });

    // Reduced rate 11% for food/beverages
    this.addVATRate({
      country: 'RO',
      type: VATRateType.REDUCED,
      category: VATCategory.FOOD_BEVERAGES,
      rate: 11,
      effectiveFrom: new Date('2025-08-01'),
      legalReference: 'Legea 141/2025',
      notes: 'Unified reduced rate for food and beverages',
    });

    // Reduced rate 11% for accommodation
    this.addVATRate({
      country: 'RO',
      type: VATRateType.REDUCED,
      category: VATCategory.ACCOMMODATION,
      rate: 11,
      effectiveFrom: new Date('2025-08-01'),
      legalReference: 'Legea 141/2025',
    });

    // Reduced rate 11% for books/publications
    this.addVATRate({
      country: 'RO',
      type: VATRateType.REDUCED,
      category: VATCategory.BOOKS_PUBLICATIONS,
      rate: 11,
      effectiveFrom: new Date('2025-08-01'),
      legalReference: 'Legea 141/2025',
    });

    // Reduced rate 11% for medical/pharma
    this.addVATRate({
      country: 'RO',
      type: VATRateType.REDUCED,
      category: VATCategory.MEDICAL_PHARMA,
      rate: 11,
      effectiveFrom: new Date('2025-08-01'),
      legalReference: 'Legea 141/2025',
    });

    // Zero rate for exports
    this.addVATRate({
      country: 'RO',
      type: VATRateType.ZERO,
      category: VATCategory.EXPORTS,
      rate: 0,
      effectiveFrom: new Date('2020-01-01'),
      notes: 'Zero-rated exports',
    });

    // Reverse charge for intra-EU B2B
    this.addVATRate({
      country: 'RO',
      type: VATRateType.REVERSE_CHARGE,
      category: VATCategory.INTRA_EU_B2B,
      rate: 0,
      effectiveFrom: new Date('2020-01-01'),
      notes: 'Reverse charge mechanism for intra-EU B2B transactions',
    });

    // Exempt - Financial services
    this.addVATRate({
      country: 'RO',
      type: VATRateType.EXEMPT,
      category: VATCategory.FINANCIAL_SERVICES,
      rate: 0,
      effectiveFrom: new Date('2020-01-01'),
      notes: 'Exempt without right to deduct',
    });

    // Exempt - Education
    this.addVATRate({
      country: 'RO',
      type: VATRateType.EXEMPT,
      category: VATCategory.EDUCATION,
      rate: 0,
      effectiveFrom: new Date('2020-01-01'),
      notes: 'Educational services exempt',
    });

    this.logger.log('Romanian VAT rates initialized (Legea 141/2025)');
  }

  /**
   * Initialize EU-27 country configurations
   */
  private initializeEUCountries(): void {
    const euCountries: Partial<CountryVATConfig>[] = [
      { country: 'AT', countryName: 'Austria', standardRate: 20, reducedRates: [10, 13], currencyCode: 'EUR' },
      { country: 'BE', countryName: 'Belgium', standardRate: 21, reducedRates: [6, 12], currencyCode: 'EUR' },
      { country: 'BG', countryName: 'Bulgaria', standardRate: 20, reducedRates: [9], currencyCode: 'BGN' },
      { country: 'HR', countryName: 'Croatia', standardRate: 25, reducedRates: [5, 13], currencyCode: 'EUR' },
      { country: 'CY', countryName: 'Cyprus', standardRate: 19, reducedRates: [5, 9], currencyCode: 'EUR' },
      { country: 'CZ', countryName: 'Czech Republic', standardRate: 21, reducedRates: [10, 15], currencyCode: 'CZK' },
      { country: 'DK', countryName: 'Denmark', standardRate: 25, reducedRates: [], currencyCode: 'DKK' },
      { country: 'EE', countryName: 'Estonia', standardRate: 22, reducedRates: [9], currencyCode: 'EUR' },
      { country: 'FI', countryName: 'Finland', standardRate: 24, reducedRates: [10, 14], currencyCode: 'EUR' },
      { country: 'FR', countryName: 'France', standardRate: 20, reducedRates: [5.5, 10], currencyCode: 'EUR' },
      { country: 'DE', countryName: 'Germany', standardRate: 19, reducedRates: [7], currencyCode: 'EUR' },
      { country: 'GR', countryName: 'Greece', standardRate: 24, reducedRates: [6, 13], currencyCode: 'EUR' },
      { country: 'HU', countryName: 'Hungary', standardRate: 27, reducedRates: [5, 18], currencyCode: 'HUF' },
      { country: 'IE', countryName: 'Ireland', standardRate: 23, reducedRates: [9, 13.5], currencyCode: 'EUR' },
      { country: 'IT', countryName: 'Italy', standardRate: 22, reducedRates: [4, 5, 10], currencyCode: 'EUR' },
      { country: 'LV', countryName: 'Latvia', standardRate: 21, reducedRates: [5, 12], currencyCode: 'EUR' },
      { country: 'LT', countryName: 'Lithuania', standardRate: 21, reducedRates: [5, 9], currencyCode: 'EUR' },
      { country: 'LU', countryName: 'Luxembourg', standardRate: 17, reducedRates: [3, 8], currencyCode: 'EUR' },
      { country: 'MT', countryName: 'Malta', standardRate: 18, reducedRates: [5, 7], currencyCode: 'EUR' },
      { country: 'NL', countryName: 'Netherlands', standardRate: 21, reducedRates: [9], currencyCode: 'EUR' },
      { country: 'PL', countryName: 'Poland', standardRate: 23, reducedRates: [5, 8], currencyCode: 'PLN' },
      { country: 'PT', countryName: 'Portugal', standardRate: 23, reducedRates: [6, 13], currencyCode: 'EUR' },
      { country: 'SK', countryName: 'Slovakia', standardRate: 20, reducedRates: [10], currencyCode: 'EUR' },
      { country: 'SI', countryName: 'Slovenia', standardRate: 22, reducedRates: [5, 9.5], currencyCode: 'EUR' },
      { country: 'ES', countryName: 'Spain', standardRate: 21, reducedRates: [4, 10], currencyCode: 'EUR' },
      { country: 'SE', countryName: 'Sweden', standardRate: 25, reducedRates: [6, 12], currencyCode: 'SEK' },
    ];

    for (const country of euCountries) {
      const config: CountryVATConfig = {
        country: country.country!,
        countryName: country.countryName!,
        currencyCode: country.currencyCode!,
        standardRate: country.standardRate!,
        reducedRates: country.reducedRates!,
        vatNumberPrefix: country.country!,
        vatNumberFormat: new RegExp(`^${country.country}[A-Z0-9]{8,12}$`),
        lastUpdated: new Date(),
      };

      this.countryConfigs.set(country.country!, config);

      // Add standard rate
      this.addVATRate({
        country: country.country!,
        type: VATRateType.STANDARD,
        category: VATCategory.GENERAL_GOODS,
        rate: country.standardRate!,
        effectiveFrom: new Date('2024-01-01'),
      });
    }

    this.logger.log(`Initialized ${this.countryConfigs.size} EU country VAT configurations`);
  }

  /**
   * Add a VAT rate
   */
  private addVATRate(rate: Omit<VATRate, 'id' | 'isActive'>): VATRate {
    const vatRate: VATRate = {
      ...rate,
      id: `vat-${++this.rateIdCounter}`,
      isActive: true,
    };

    this.vatRates.set(vatRate.id, vatRate);
    return vatRate;
  }

  // =================== PUBLIC API ===================

  /**
   * Get applicable VAT rate for a transaction
   */
  getApplicableRate(
    country: string,
    category: VATCategory,
    transactionDate: Date = new Date(),
  ): VATRate | null {
    // Find matching rate
    const rates = Array.from(this.vatRates.values()).filter(
      (rate) =>
        rate.country === country &&
        rate.category === category &&
        rate.isActive &&
        rate.effectiveFrom <= transactionDate &&
        (!rate.effectiveTo || rate.effectiveTo >= transactionDate),
    );

    if (rates.length === 0) {
      // Fall back to standard rate for the country
      return this.getStandardRate(country, transactionDate);
    }

    // Return most recent rate
    return rates.sort(
      (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime(),
    )[0];
  }

  /**
   * Get standard rate for a country
   */
  getStandardRate(country: string, transactionDate: Date = new Date()): VATRate | null {
    return this.getApplicableRate(country, VATCategory.GENERAL_GOODS, transactionDate);
  }

  /**
   * Calculate VAT for a transaction
   */
  calculateVAT(
    netAmount: number,
    country: string,
    category: VATCategory,
    options?: {
      transactionDate?: Date;
      isB2B?: boolean;
      buyerCountry?: string;
      buyerVATNumber?: string;
    },
  ): VATCalculation {
    const transactionDate = options?.transactionDate || new Date();

    // Check for reverse charge (intra-EU B2B)
    if (
      options?.isB2B &&
      options?.buyerCountry &&
      options.buyerCountry !== country &&
      this.isEUCountry(options.buyerCountry) &&
      options?.buyerVATNumber
    ) {
      return {
        netAmount,
        vatAmount: 0,
        grossAmount: netAmount,
        vatRate: 0,
        vatType: VATRateType.REVERSE_CHARGE,
        country,
        category: VATCategory.INTRA_EU_B2B,
        reverseCharge: true,
        legalReference: 'EU VAT Directive Art. 196',
      };
    }

    // Get applicable rate
    const rate = this.getApplicableRate(country, category, transactionDate);

    if (!rate) {
      // Default to standard rate if no specific rate found
      const config = this.countryConfigs.get(country);
      const standardRate = config?.standardRate || 21;

      return {
        netAmount,
        vatAmount: Math.round(netAmount * (standardRate / 100) * 100) / 100,
        grossAmount: Math.round(netAmount * (1 + standardRate / 100) * 100) / 100,
        vatRate: standardRate,
        vatType: VATRateType.STANDARD,
        country,
        category,
        reverseCharge: false,
      };
    }

    const vatAmount = Math.round(netAmount * (rate.rate / 100) * 100) / 100;

    return {
      netAmount,
      vatAmount,
      grossAmount: Math.round((netAmount + vatAmount) * 100) / 100,
      vatRate: rate.rate,
      vatType: rate.type,
      country,
      category,
      reverseCharge: false,
      legalReference: rate.legalReference,
    };
  }

  /**
   * Calculate VAT from gross amount (reverse calculation)
   */
  calculateVATFromGross(
    grossAmount: number,
    country: string,
    category: VATCategory,
    transactionDate: Date = new Date(),
  ): VATCalculation {
    const rate = this.getApplicableRate(country, category, transactionDate);
    const vatRate = rate?.rate || this.countryConfigs.get(country)?.standardRate || 21;

    const netAmount = Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100;
    const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100;

    return {
      netAmount,
      vatAmount,
      grossAmount,
      vatRate,
      vatType: rate?.type || VATRateType.STANDARD,
      country,
      category,
      reverseCharge: false,
      legalReference: rate?.legalReference,
    };
  }

  /**
   * Get all rates for a country
   */
  getCountryRates(country: string): VATRate[] {
    return Array.from(this.vatRates.values()).filter(
      (rate) => rate.country === country && rate.isActive,
    );
  }

  /**
   * Get country configuration
   */
  getCountryConfig(country: string): CountryVATConfig | null {
    return this.countryConfigs.get(country) || null;
  }

  /**
   * Get all EU country configurations
   */
  getAllCountryConfigs(): CountryVATConfig[] {
    return Array.from(this.countryConfigs.values());
  }

  /**
   * Check if country is EU member
   */
  isEUCountry(country: string): boolean {
    return this.countryConfigs.has(country);
  }

  /**
   * Validate VAT number format
   */
  validateVATNumberFormat(vatNumber: string): { valid: boolean; country?: string } {
    const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
    const countryCode = cleanVAT.substring(0, 2);

    const config = this.countryConfigs.get(countryCode);
    if (!config) {
      return { valid: false };
    }

    return {
      valid: config.vatNumberFormat.test(cleanVAT),
      country: countryCode,
    };
  }

  /**
   * Update VAT rate (for admin updates when laws change)
   */
  updateVATRate(
    rateId: string,
    updates: Partial<Omit<VATRate, 'id'>>,
  ): VATRate | null {
    const rate = this.vatRates.get(rateId);
    if (!rate) return null;

    const updated = { ...rate, ...updates };
    this.vatRates.set(rateId, updated);

    this.eventEmitter.emit('vat.rate.updated', { rateId, updates });
    this.logger.log(`VAT rate ${rateId} updated`);

    return updated;
  }

  /**
   * Add new VAT rate (for admin)
   */
  createVATRate(rate: Omit<VATRate, 'id' | 'isActive'>): VATRate {
    const newRate = this.addVATRate(rate);
    this.eventEmitter.emit('vat.rate.created', newRate);
    this.logger.log(`VAT rate created for ${rate.country} - ${rate.category}`);
    return newRate;
  }

  /**
   * Deactivate VAT rate
   */
  deactivateVATRate(rateId: string): boolean {
    const rate = this.vatRates.get(rateId);
    if (!rate) return false;

    rate.isActive = false;
    this.vatRates.set(rateId, rate);

    this.eventEmitter.emit('vat.rate.deactivated', { rateId });
    return true;
  }

  /**
   * Get VAT rate history for a country/category
   */
  getVATRateHistory(
    country: string,
    category: VATCategory,
  ): VATRate[] {
    return Array.from(this.vatRates.values())
      .filter((rate) => rate.country === country && rate.category === category)
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  }

  /**
   * Get Romanian rates summary (Legea 141/2025)
   */
  getRomanianRatesSummary(): {
    standard: number;
    reduced: number;
    effectiveDate: Date;
    legalReference: string;
    categories: { category: VATCategory; rate: number }[];
  } {
    const roRates = this.getCountryRates('RO');

    return {
      standard: 21,
      reduced: 11,
      effectiveDate: new Date('2025-08-01'),
      legalReference: 'Legea 141/2025',
      categories: roRates.map((r) => ({
        category: r.category,
        rate: r.rate,
      })),
    };
  }
}
