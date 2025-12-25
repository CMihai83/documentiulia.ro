import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * International Tax Compliance Service
 * Handles tax compliance for multiple countries including VAT, GST, and other taxes
 *
 * Features:
 * - Multi-country VAT/GST rates
 * - Place of supply rules
 * - Reverse charge mechanism for B2B
 * - Tax exemptions management
 * - MOSS/OSS for digital services
 * - Intrastat reporting support
 * - Tax number validation (VAT IDs)
 */

// =================== TYPES & INTERFACES ===================

export type TaxType = 'VAT' | 'GST' | 'SST' | 'HST' | 'PST' | 'SALES_TAX';
export type TransactionType = 'B2B' | 'B2C' | 'B2G';
export type PlaceOfSupply = 'origin' | 'destination' | 'supplier_location';

export interface CountryTaxConfig {
  code: string;
  name: string;
  taxType: TaxType;
  standardRate: number;
  reducedRates: { rate: number; description: string; categories: string[] }[];
  zeroRatedCategories: string[];
  exemptCategories: string[];
  registrationThreshold: number;
  currency: string;
  taxNumberFormat: RegExp;
  taxNumberPrefix?: string;
  digitalServicesOSS: boolean;
  intrastatRequired: boolean;
  reverseChargeApplicable: boolean;
}

export interface TaxCalculationRequest {
  amount: number;
  currency: string;
  sellerCountry: string;
  buyerCountry: string;
  buyerTaxNumber?: string;
  transactionType: TransactionType;
  category?: string;
  isDigitalService?: boolean;
  isIntraEU?: boolean;
}

export interface TaxCalculationResult {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  taxRate: number;
  taxType: TaxType;
  sellerCountry: string;
  buyerCountry: string;
  placeOfTaxation: string;
  reverseCharge: boolean;
  exemptionApplied: boolean;
  exemptionReason?: string;
  ossApplicable: boolean;
  breakdown: {
    description: string;
    rate: number;
    amount: number;
  }[];
}

export interface TaxExemption {
  id: string;
  type: 'category' | 'entity' | 'transaction' | 'threshold';
  country: string;
  description: string;
  conditions: Record<string, any>;
  validFrom: Date;
  validTo?: Date;
}

export interface TaxValidationResult {
  valid: boolean;
  taxNumber: string;
  country: string;
  countryName?: string;
  companyName?: string;
  address?: string;
  validatedAt: Date;
  source: string;
}

export interface TaxReportData {
  period: { start: Date; end: Date };
  country: string;
  taxType: TaxType;
  totalSales: number;
  totalTaxCollected: number;
  domesticSales: number;
  domesticTax: number;
  intraCommunitySupplies: number;
  intraCommunityAcquisitions: number;
  exports: number;
  imports: number;
  reverseChargeSales: number;
  reverseChargePurchases: number;
  ossSales: Record<string, number>;
}

// =================== EU COUNTRY TAX CONFIGURATIONS ===================

export const EU_TAX_CONFIGS: Record<string, CountryTaxConfig> = {
  RO: {
    code: 'RO',
    name: 'Romania',
    taxType: 'VAT',
    standardRate: 21, // Legea 141/2025: Increased from 19% to 21% effective Aug 2025
    reducedRates: [
      { rate: 11, description: 'Reduced rate (unified)', categories: ['food', 'water', 'medical', 'hospitality', 'books', 'cultural_events'] },
      { rate: 9, description: 'Housing transitional (until Aug 2026)', categories: ['social_housing'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services', 'insurance'],
    registrationThreshold: 300000, // RON
    currency: 'RON',
    taxNumberFormat: /^RO[0-9]{2,10}$/,
    taxNumberPrefix: 'RO',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    taxType: 'VAT',
    standardRate: 19,
    reducedRates: [
      { rate: 7, description: 'Reduced rate', categories: ['food', 'books', 'newspapers', 'cultural_events', 'hospitality'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services', 'insurance', 'real_estate'],
    registrationThreshold: 22000, // EUR
    currency: 'EUR',
    taxNumberFormat: /^DE[0-9]{9}$/,
    taxNumberPrefix: 'DE',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  FR: {
    code: 'FR',
    name: 'France',
    taxType: 'VAT',
    standardRate: 20,
    reducedRates: [
      { rate: 10, description: 'Intermediate rate', categories: ['hospitality', 'transport', 'renovation'] },
      { rate: 5.5, description: 'Reduced rate', categories: ['food', 'books', 'cultural_events'] },
      { rate: 2.1, description: 'Super reduced', categories: ['newspapers', 'medicine'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services', 'insurance'],
    registrationThreshold: 85800, // EUR for goods, 34400 for services
    currency: 'EUR',
    taxNumberFormat: /^FR[A-Z0-9]{2}[0-9]{9}$/,
    taxNumberPrefix: 'FR',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    taxType: 'VAT',
    standardRate: 22,
    reducedRates: [
      { rate: 10, description: 'Reduced rate', categories: ['hospitality', 'medical', 'renovation'] },
      { rate: 5, description: 'Super reduced', categories: ['food_staples', 'medical_devices'] },
      { rate: 4, description: 'Minimum rate', categories: ['food_basic', 'newspapers', 'books'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services'],
    registrationThreshold: 65000, // EUR
    currency: 'EUR',
    taxNumberFormat: /^IT[0-9]{11}$/,
    taxNumberPrefix: 'IT',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    taxType: 'VAT',
    standardRate: 21,
    reducedRates: [
      { rate: 10, description: 'Reduced rate', categories: ['hospitality', 'transport', 'renovation'] },
      { rate: 4, description: 'Super reduced', categories: ['food_basic', 'books', 'medicine', 'newspapers'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services', 'insurance'],
    registrationThreshold: 0, // No threshold in Spain
    currency: 'EUR',
    taxNumberFormat: /^ES[A-Z0-9][0-9]{7}[A-Z0-9]$/,
    taxNumberPrefix: 'ES',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    taxType: 'VAT',
    standardRate: 21,
    reducedRates: [
      { rate: 9, description: 'Reduced rate', categories: ['food', 'water', 'books', 'medicine', 'hospitality'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services', 'insurance'],
    registrationThreshold: 20000, // EUR
    currency: 'EUR',
    taxNumberFormat: /^NL[0-9]{9}B[0-9]{2}$/,
    taxNumberPrefix: 'NL',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    taxType: 'VAT',
    standardRate: 20,
    reducedRates: [
      { rate: 13, description: 'Intermediate rate', categories: ['cultural_events', 'wine'] },
      { rate: 10, description: 'Reduced rate', categories: ['food', 'books', 'hospitality', 'transport'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services'],
    registrationThreshold: 35000, // EUR
    currency: 'EUR',
    taxNumberFormat: /^ATU[0-9]{8}$/,
    taxNumberPrefix: 'ATU',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    taxType: 'VAT',
    standardRate: 23,
    reducedRates: [
      { rate: 8, description: 'Reduced rate', categories: ['hospitality', 'transport', 'renovation'] },
      { rate: 5, description: 'Super reduced', categories: ['food_basic', 'books', 'newspapers'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services'],
    registrationThreshold: 200000, // PLN
    currency: 'PLN',
    taxNumberFormat: /^PL[0-9]{10}$/,
    taxNumberPrefix: 'PL',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
  HU: {
    code: 'HU',
    name: 'Hungary',
    taxType: 'VAT',
    standardRate: 27,
    reducedRates: [
      { rate: 18, description: 'Reduced rate', categories: ['hospitality', 'internet'] },
      { rate: 5, description: 'Super reduced', categories: ['food_basic', 'books', 'medicine'] },
    ],
    zeroRatedCategories: ['exports', 'intra_community_supplies'],
    exemptCategories: ['medical_services', 'education', 'financial_services'],
    registrationThreshold: 12000000, // HUF
    currency: 'HUF',
    taxNumberFormat: /^HU[0-9]{8}$/,
    taxNumberPrefix: 'HU',
    digitalServicesOSS: true,
    intrastatRequired: true,
    reverseChargeApplicable: true,
  },
};

// Non-EU countries for comparison
export const NON_EU_TAX_CONFIGS: Record<string, CountryTaxConfig> = {
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    taxType: 'VAT',
    standardRate: 20,
    reducedRates: [
      { rate: 5, description: 'Reduced rate', categories: ['energy', 'children_car_seats'] },
    ],
    zeroRatedCategories: ['food_basic', 'books', 'children_clothing', 'exports'],
    exemptCategories: ['medical_services', 'education', 'financial_services', 'insurance'],
    registrationThreshold: 85000, // GBP
    currency: 'GBP',
    taxNumberFormat: /^GB[0-9]{9}$|^GB[0-9]{12}$|^GBGD[0-9]{3}$|^GBHA[0-9]{3}$/,
    taxNumberPrefix: 'GB',
    digitalServicesOSS: false,
    intrastatRequired: false,
    reverseChargeApplicable: true,
  },
  US: {
    code: 'US',
    name: 'United States',
    taxType: 'SALES_TAX',
    standardRate: 0, // Varies by state
    reducedRates: [],
    zeroRatedCategories: [],
    exemptCategories: [],
    registrationThreshold: 0, // Varies by state
    currency: 'USD',
    taxNumberFormat: /^[0-9]{2}-[0-9]{7}$/, // EIN format
    digitalServicesOSS: false,
    intrastatRequired: false,
    reverseChargeApplicable: false,
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    taxType: 'VAT',
    standardRate: 8.1,
    reducedRates: [
      { rate: 2.6, description: 'Reduced rate', categories: ['food', 'books', 'medicine'] },
      { rate: 3.8, description: 'Special rate', categories: ['hospitality'] },
    ],
    zeroRatedCategories: ['exports'],
    exemptCategories: ['medical_services', 'education', 'financial_services'],
    registrationThreshold: 100000, // CHF
    currency: 'CHF',
    taxNumberFormat: /^CHE[0-9]{9}$/,
    taxNumberPrefix: 'CHE',
    digitalServicesOSS: false,
    intrastatRequired: false,
    reverseChargeApplicable: true,
  },
};

const EU_COUNTRIES = Object.keys(EU_TAX_CONFIGS);

@Injectable()
export class TaxComplianceService {
  private readonly logger = new Logger(TaxComplianceService.name);
  private readonly allConfigs: Record<string, CountryTaxConfig>;
  private exemptions: TaxExemption[] = [];

  constructor(private readonly configService: ConfigService) {
    this.allConfigs = { ...EU_TAX_CONFIGS, ...NON_EU_TAX_CONFIGS };
    this.logger.log('Tax Compliance Service initialized with ' + Object.keys(this.allConfigs).length + ' countries');
  }

  // =================== TAX CALCULATION ===================

  /**
   * Calculate tax for a transaction
   */
  calculateTax(request: TaxCalculationRequest): TaxCalculationResult {
    const sellerConfig = this.allConfigs[request.sellerCountry];
    const buyerConfig = this.allConfigs[request.buyerCountry];

    if (!sellerConfig) {
      throw new BadRequestException(`Unknown seller country: ${request.sellerCountry}`);
    }

    // Determine place of taxation
    const placeOfTaxation = this.determinePlaceOfTaxation(request);
    const taxConfig = this.allConfigs[placeOfTaxation] || sellerConfig;

    // Check for reverse charge
    const reverseCharge = this.shouldApplyReverseCharge(request);

    // Check for exemptions
    const exemption = this.checkExemptions(request);

    // Determine applicable rate
    let taxRate = 0;
    let exemptionApplied = false;
    let exemptionReason: string | undefined;

    if (exemption) {
      exemptionApplied = true;
      exemptionReason = exemption.description;
    } else if (reverseCharge) {
      taxRate = 0; // Buyer accounts for VAT
    } else if (this.isZeroRated(request, taxConfig)) {
      taxRate = 0;
    } else {
      taxRate = this.getApplicableRate(request.category, taxConfig);
    }

    const taxAmount = Math.round(request.amount * taxRate) / 100;
    const grossAmount = request.amount + taxAmount;

    // Check OSS applicability
    const ossApplicable = this.isOSSApplicable(request);

    return {
      netAmount: request.amount,
      taxAmount,
      grossAmount,
      taxRate,
      taxType: taxConfig.taxType,
      sellerCountry: request.sellerCountry,
      buyerCountry: request.buyerCountry,
      placeOfTaxation,
      reverseCharge,
      exemptionApplied,
      exemptionReason,
      ossApplicable,
      breakdown: [{
        description: `${taxConfig.name} ${taxConfig.taxType} ${taxRate}%`,
        rate: taxRate,
        amount: taxAmount,
      }],
    };
  }

  /**
   * Determine place of taxation based on EU rules
   */
  private determinePlaceOfTaxation(request: TaxCalculationRequest): string {
    const isIntraEU = this.isIntraEUTransaction(request.sellerCountry, request.buyerCountry);

    // B2B intra-EU: destination principle
    if (isIntraEU && request.transactionType === 'B2B' && request.buyerTaxNumber) {
      return request.buyerCountry;
    }

    // B2C digital services to EU: destination (OSS)
    if (request.isDigitalService && request.transactionType === 'B2C' && EU_COUNTRIES.includes(request.buyerCountry)) {
      return request.buyerCountry;
    }

    // Default: origin principle
    return request.sellerCountry;
  }

  /**
   * Check if reverse charge should apply
   */
  private shouldApplyReverseCharge(request: TaxCalculationRequest): boolean {
    // B2B intra-EU with valid VAT number
    if (
      request.transactionType === 'B2B' &&
      request.buyerTaxNumber &&
      this.isIntraEUTransaction(request.sellerCountry, request.buyerCountry) &&
      request.sellerCountry !== request.buyerCountry
    ) {
      return true;
    }

    // Specific countries with domestic reverse charge (e.g., construction)
    const sellerConfig = this.allConfigs[request.sellerCountry];
    if (sellerConfig?.reverseChargeApplicable && request.category === 'construction') {
      return true;
    }

    return false;
  }

  /**
   * Check if transaction is zero-rated
   */
  private isZeroRated(request: TaxCalculationRequest, taxConfig: CountryTaxConfig): boolean {
    // Exports to non-EU
    if (
      EU_COUNTRIES.includes(request.sellerCountry) &&
      !EU_COUNTRIES.includes(request.buyerCountry)
    ) {
      return true;
    }

    // Intra-community supplies with reverse charge
    if (
      request.transactionType === 'B2B' &&
      request.buyerTaxNumber &&
      this.isIntraEUTransaction(request.sellerCountry, request.buyerCountry) &&
      request.sellerCountry !== request.buyerCountry
    ) {
      return true;
    }

    // Category-based zero rating
    if (request.category && taxConfig.zeroRatedCategories.includes(request.category)) {
      return true;
    }

    return false;
  }

  /**
   * Get applicable tax rate for category
   */
  private getApplicableRate(category: string | undefined, taxConfig: CountryTaxConfig): number {
    if (!category) {
      return taxConfig.standardRate;
    }

    // Check reduced rates
    for (const reduced of taxConfig.reducedRates) {
      if (reduced.categories.includes(category)) {
        return reduced.rate;
      }
    }

    // Check exempt categories
    if (taxConfig.exemptCategories.includes(category)) {
      return 0;
    }

    return taxConfig.standardRate;
  }

  /**
   * Check if OSS (One Stop Shop) is applicable
   */
  private isOSSApplicable(request: TaxCalculationRequest): boolean {
    return (
      request.isDigitalService === true &&
      request.transactionType === 'B2C' &&
      EU_COUNTRIES.includes(request.sellerCountry) &&
      EU_COUNTRIES.includes(request.buyerCountry) &&
      request.sellerCountry !== request.buyerCountry
    );
  }

  // =================== TAX NUMBER VALIDATION ===================

  /**
   * Validate a tax number (VAT ID)
   */
  async validateTaxNumber(taxNumber: string, country?: string): Promise<TaxValidationResult> {
    // Clean the tax number
    const cleanNumber = taxNumber.replace(/\s/g, '').toUpperCase();

    // Extract country code if not provided
    const detectedCountry = country || this.extractCountryFromTaxNumber(cleanNumber);

    if (!detectedCountry) {
      return {
        valid: false,
        taxNumber: cleanNumber,
        country: 'UNKNOWN',
        validatedAt: new Date(),
        source: 'format_check',
      };
    }

    const config = this.allConfigs[detectedCountry];
    if (!config) {
      return {
        valid: false,
        taxNumber: cleanNumber,
        country: detectedCountry,
        validatedAt: new Date(),
        source: 'unknown_country',
      };
    }

    // Format validation
    const formatValid = config.taxNumberFormat.test(cleanNumber);

    if (!formatValid) {
      return {
        valid: false,
        taxNumber: cleanNumber,
        country: detectedCountry,
        countryName: config.name,
        validatedAt: new Date(),
        source: 'format_check',
      };
    }

    // In production, would call VIES API for EU VAT validation
    // For now, return format validation result
    return {
      valid: true,
      taxNumber: cleanNumber,
      country: detectedCountry,
      countryName: config.name,
      validatedAt: new Date(),
      source: 'format_validation',
    };
  }

  /**
   * Extract country code from tax number
   */
  private extractCountryFromTaxNumber(taxNumber: string): string | null {
    for (const [code, config] of Object.entries(this.allConfigs)) {
      if (config.taxNumberPrefix && taxNumber.startsWith(config.taxNumberPrefix)) {
        return code;
      }
    }

    // Try first 2 characters as country code
    const prefix = taxNumber.substring(0, 2);
    if (this.allConfigs[prefix]) {
      return prefix;
    }

    return null;
  }

  // =================== EXEMPTIONS ===================

  /**
   * Check for applicable exemptions
   */
  private checkExemptions(request: TaxCalculationRequest): TaxExemption | null {
    const now = new Date();

    for (const exemption of this.exemptions) {
      if (exemption.validFrom > now) continue;
      if (exemption.validTo && exemption.validTo < now) continue;

      if (
        exemption.country === request.sellerCountry ||
        exemption.country === request.buyerCountry ||
        exemption.country === '*'
      ) {
        // Check conditions
        if (this.matchesExemptionConditions(exemption, request)) {
          return exemption;
        }
      }
    }

    return null;
  }

  private matchesExemptionConditions(exemption: TaxExemption, request: TaxCalculationRequest): boolean {
    for (const [key, value] of Object.entries(exemption.conditions)) {
      if ((request as any)[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Add a tax exemption
   */
  addExemption(exemption: Omit<TaxExemption, 'id'>): TaxExemption {
    const newExemption: TaxExemption = {
      ...exemption,
      id: `exemption_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };

    this.exemptions.push(newExemption);
    this.logger.log(`Tax exemption added: ${newExemption.id}`);

    return newExemption;
  }

  /**
   * Get all exemptions
   */
  getExemptions(): TaxExemption[] {
    return [...this.exemptions];
  }

  /**
   * Remove an exemption
   */
  removeExemption(id: string): boolean {
    const index = this.exemptions.findIndex((e) => e.id === id);
    if (index === -1) return false;

    this.exemptions.splice(index, 1);
    return true;
  }

  // =================== UTILITY METHODS ===================

  /**
   * Check if transaction is intra-EU
   */
  isIntraEUTransaction(sellerCountry: string, buyerCountry: string): boolean {
    return EU_COUNTRIES.includes(sellerCountry) && EU_COUNTRIES.includes(buyerCountry);
  }

  /**
   * Get country tax configuration
   */
  getCountryConfig(countryCode: string): CountryTaxConfig | null {
    return this.allConfigs[countryCode] || null;
  }

  /**
   * Get all supported countries
   */
  getSupportedCountries(): { code: string; name: string; taxType: TaxType; standardRate: number }[] {
    return Object.values(this.allConfigs).map((c) => ({
      code: c.code,
      name: c.name,
      taxType: c.taxType,
      standardRate: c.standardRate,
    }));
  }

  /**
   * Get EU member states
   */
  getEUCountries(): string[] {
    return [...EU_COUNTRIES];
  }

  /**
   * Check if country is in EU
   */
  isEUCountry(countryCode: string): boolean {
    return EU_COUNTRIES.includes(countryCode);
  }

  /**
   * Get all tax rates for a country
   */
  getTaxRates(countryCode: string): {
    standard: number;
    reduced: { rate: number; description: string; categories: string[] }[];
    zeroRated: string[];
    exempt: string[];
  } | null {
    const config = this.allConfigs[countryCode];
    if (!config) return null;

    return {
      standard: config.standardRate,
      reduced: config.reducedRates,
      zeroRated: config.zeroRatedCategories,
      exempt: config.exemptCategories,
    };
  }

  // =================== REPORTING ===================

  /**
   * Generate tax report data structure
   */
  generateReportTemplate(
    country: string,
    period: { start: Date; end: Date },
  ): TaxReportData {
    const config = this.allConfigs[country];
    if (!config) {
      throw new BadRequestException(`Unknown country: ${country}`);
    }

    return {
      period,
      country,
      taxType: config.taxType,
      totalSales: 0,
      totalTaxCollected: 0,
      domesticSales: 0,
      domesticTax: 0,
      intraCommunitySupplies: 0,
      intraCommunityAcquisitions: 0,
      exports: 0,
      imports: 0,
      reverseChargeSales: 0,
      reverseChargePurchases: 0,
      ossSales: {},
    };
  }

  /**
   * Get OSS threshold info
   */
  getOSSThresholdInfo(): {
    threshold: number;
    currency: string;
    description: string;
  } {
    return {
      threshold: 10000,
      currency: 'EUR',
      description: 'EU-wide threshold for B2C digital services before OSS registration required',
    };
  }

  /**
   * Get Intrastat threshold for a country
   */
  getIntrastatThreshold(countryCode: string): {
    dispatchThreshold: number;
    arrivalThreshold: number;
    currency: string;
  } | null {
    const thresholds: Record<string, { dispatch: number; arrival: number }> = {
      RO: { dispatch: 900000, arrival: 900000 }, // RON
      DE: { dispatch: 500000, arrival: 800000 }, // EUR
      FR: { dispatch: 460000, arrival: 460000 }, // EUR
      IT: { dispatch: 0, arrival: 0 }, // No threshold
      ES: { dispatch: 400000, arrival: 400000 }, // EUR
    };

    const threshold = thresholds[countryCode];
    if (!threshold) return null;

    const config = this.allConfigs[countryCode];

    return {
      dispatchThreshold: threshold.dispatch,
      arrivalThreshold: threshold.arrival,
      currency: config?.currency || 'EUR',
    };
  }
}
