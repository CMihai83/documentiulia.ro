import { Injectable, Logger, BadRequestException } from '@nestjs/common';

/**
 * Romanian VAT Rates (effective periods)
 *
 * Historical rates:
 * - Until July 31, 2025: 19% standard, 9% reduced, 5% special
 * - From August 1, 2025: 21% standard, 11% reduced, 5% special (Legea 141/2025)
 */
export interface VatRateConfig {
  standard: number;
  reduced: number;
  special: number;
  zero: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export enum VatCategory {
  STANDARD = 'STANDARD', // 19% / 21%
  REDUCED = 'REDUCED', // 9% / 11% (food, pharma, hotels, restaurants)
  SPECIAL = 'SPECIAL', // 5% (social housing, books, newspapers)
  ZERO = 'ZERO', // 0% (exports, intra-EU deliveries)
  EXEMPT = 'EXEMPT', // Scutit (healthcare, education, financial services)
}

export interface VatCalculationInput {
  amount: number; // Amount (taxable base or gross)
  category: VatCategory;
  date: Date; // Transaction date (determines rate)
  includesVat?: boolean; // If true, amount includes VAT; if false, amount is taxable base
  reverseCharge?: boolean; // Taxare inversă
  intraCommunity?: boolean; // Operațiune intracomunitară
}

export interface VatCalculationResult {
  taxableBase: number; // Bază impozabilă (fără TVA)
  vatRate: number; // Cotă TVA aplicată (%)
  vatAmount: number; // Valoare TVA
  totalAmount: number; // Total cu TVA
  category: VatCategory;
  isReverseCharge: boolean;
  isIntraCommunity: boolean;
  rateEffectiveDate: string;
}

/**
 * VAT Calculation Service
 *
 * Handles all VAT calculations for Romanian tax compliance
 * - Automatic rate selection based on transaction date (Legea 141/2025)
 * - Support for multiple VAT categories
 * - Reverse charge detection
 * - Intra-community operations
 * - D300 and D394 declaration calculations
 */
@Injectable()
export class VatCalculationService {
  private readonly logger = new Logger(VatCalculationService.name);

  /**
   * Romanian VAT rate history (Legea 141/2025)
   */
  private readonly VAT_RATES: VatRateConfig[] = [
    {
      standard: 19,
      reduced: 9,
      special: 5,
      zero: 0,
      effectiveFrom: new Date('2010-07-01'),
      effectiveTo: new Date('2025-07-31'),
    },
    {
      standard: 21,
      reduced: 11,
      special: 5,
      zero: 0,
      effectiveFrom: new Date('2025-08-01'),
      // No end date - current rate
    },
  ];

  /**
   * Get applicable VAT rates for a given date
   */
  getVatRates(date: Date): VatRateConfig {
    const applicableRate = this.VAT_RATES.find((rate) => {
      const isAfterStart = date >= rate.effectiveFrom;
      const isBeforeEnd = !rate.effectiveTo || date <= rate.effectiveTo;
      return isAfterStart && isBeforeEnd;
    });

    if (!applicableRate) {
      this.logger.warn(
        `No VAT rate found for date ${date.toISOString()}, using latest rates`,
      );
      return this.VAT_RATES[this.VAT_RATES.length - 1];
    }

    return applicableRate;
  }

  /**
   * Get VAT rate percentage for a category and date
   */
  getVatRatePercentage(category: VatCategory, date: Date): number {
    if (category === VatCategory.EXEMPT) {
      return 0;
    }

    const rates = this.getVatRates(date);

    switch (category) {
      case VatCategory.STANDARD:
        return rates.standard;
      case VatCategory.REDUCED:
        return rates.reduced;
      case VatCategory.SPECIAL:
        return rates.special;
      case VatCategory.ZERO:
        return rates.zero;
      default:
        throw new BadRequestException(`Invalid VAT category: ${category}`);
    }
  }

  /**
   * Calculate VAT for a transaction
   */
  calculateVat(input: VatCalculationInput): VatCalculationResult {
    const { amount, category, date, includesVat = false, reverseCharge = false, intraCommunity = false } = input;

    // Validation
    if (amount < 0) {
      throw new BadRequestException('Amount cannot be negative');
    }

    // Reverse charge and intra-community deliveries have 0% VAT
    if (reverseCharge || intraCommunity) {
      return {
        taxableBase: amount,
        vatRate: 0,
        vatAmount: 0,
        totalAmount: amount,
        category,
        isReverseCharge: reverseCharge,
        isIntraCommunity: intraCommunity,
        rateEffectiveDate: date.toISOString(),
      };
    }

    // Get applicable VAT rate
    const vatRate = this.getVatRatePercentage(category, date);

    let taxableBase: number;
    let vatAmount: number;
    let totalAmount: number;

    if (includesVat) {
      // Amount includes VAT - extract taxable base
      totalAmount = amount;
      taxableBase = this.roundToTwoDecimals(amount / (1 + vatRate / 100));
      vatAmount = this.roundToTwoDecimals(totalAmount - taxableBase);
    } else {
      // Amount is taxable base
      taxableBase = amount;
      vatAmount = this.roundToTwoDecimals(taxableBase * (vatRate / 100));
      totalAmount = this.roundToTwoDecimals(taxableBase + vatAmount);
    }

    return {
      taxableBase,
      vatRate,
      vatAmount,
      totalAmount,
      category,
      isReverseCharge: reverseCharge,
      isIntraCommunity: intraCommunity,
      rateEffectiveDate: this.getVatRates(date).effectiveFrom.toISOString(),
    };
  }

  /**
   * Calculate VAT for multiple line items
   */
  calculateVatForItems(items: VatCalculationInput[]): {
    items: VatCalculationResult[];
    totals: {
      totalTaxableBase: number;
      totalVatAmount: number;
      totalAmount: number;
      byCategory: Record<VatCategory, { taxableBase: number; vatAmount: number }>;
    };
  } {
    const results = items.map((item) => this.calculateVat(item));

    const totals = {
      totalTaxableBase: 0,
      totalVatAmount: 0,
      totalAmount: 0,
      byCategory: {} as Record<VatCategory, { taxableBase: number; vatAmount: number }>,
    };

    // Initialize category totals
    Object.values(VatCategory).forEach((category) => {
      totals.byCategory[category] = { taxableBase: 0, vatAmount: 0 };
    });

    // Aggregate totals
    results.forEach((result) => {
      totals.totalTaxableBase += result.taxableBase;
      totals.totalVatAmount += result.vatAmount;
      totals.totalAmount += result.totalAmount;

      totals.byCategory[result.category].taxableBase += result.taxableBase;
      totals.byCategory[result.category].vatAmount += result.vatAmount;
    });

    // Round totals
    totals.totalTaxableBase = this.roundToTwoDecimals(totals.totalTaxableBase);
    totals.totalVatAmount = this.roundToTwoDecimals(totals.totalVatAmount);
    totals.totalAmount = this.roundToTwoDecimals(totals.totalAmount);

    Object.keys(totals.byCategory).forEach((category) => {
      totals.byCategory[category as VatCategory].taxableBase = this.roundToTwoDecimals(
        totals.byCategory[category as VatCategory].taxableBase,
      );
      totals.byCategory[category as VatCategory].vatAmount = this.roundToTwoDecimals(
        totals.byCategory[category as VatCategory].vatAmount,
      );
    });

    return { items: results, totals };
  }

  /**
   * Validate D300 declaration calculations
   */
  validateD300Calculations(declaration: {
    outputTaxableBase19: number;
    outputVat19: number;
    outputTaxableBase9: number;
    outputVat9: number;
    outputTaxableBase5: number;
    outputVat5: number;
    inputVat19: number;
    inputVat9: number;
    inputVat5: number;
    month: number;
    year: number;
  }): {
    isValid: boolean;
    errors: string[];
    calculatedOutputVat: number;
    calculatedInputVat: number;
    calculatedVatPayable: number;
  } {
    const errors: string[] = [];
    const declarationDate = new Date(declaration.year, declaration.month - 1, 1);
    const rates = this.getVatRates(declarationDate);

    // Validate output VAT calculations
    const expectedOutputVat19 = this.roundToTwoDecimals(
      declaration.outputTaxableBase19 * (rates.standard / 100),
    );
    const expectedOutputVat9 = this.roundToTwoDecimals(
      declaration.outputTaxableBase9 * (rates.reduced / 100),
    );
    const expectedOutputVat5 = this.roundToTwoDecimals(
      declaration.outputTaxableBase5 * (rates.special / 100),
    );

    // Allow 0.01 RON tolerance for rounding differences
    const tolerance = 0.01;

    if (Math.abs(declaration.outputVat19 - expectedOutputVat19) > tolerance) {
      errors.push(
        `TVA colectat 19%/21% incorect: așteptat ${expectedOutputVat19}, primit ${declaration.outputVat19}`,
      );
    }

    if (Math.abs(declaration.outputVat9 - expectedOutputVat9) > tolerance) {
      errors.push(
        `TVA colectat 9%/11% incorect: așteptat ${expectedOutputVat9}, primit ${declaration.outputVat9}`,
      );
    }

    if (Math.abs(declaration.outputVat5 - expectedOutputVat5) > tolerance) {
      errors.push(
        `TVA colectat 5% incorect: așteptat ${expectedOutputVat5}, primit ${declaration.outputVat5}`,
      );
    }

    const calculatedOutputVat = this.roundToTwoDecimals(
      declaration.outputVat19 + declaration.outputVat9 + declaration.outputVat5,
    );

    const calculatedInputVat = this.roundToTwoDecimals(
      declaration.inputVat19 + declaration.inputVat9 + declaration.inputVat5,
    );

    const calculatedVatPayable = this.roundToTwoDecimals(calculatedOutputVat - calculatedInputVat);

    return {
      isValid: errors.length === 0,
      errors,
      calculatedOutputVat,
      calculatedInputVat,
      calculatedVatPayable,
    };
  }

  /**
   * Validate D394 quarterly totals against monthly D300 declarations
   */
  validateD394Reconciliation(
    d394: {
      totalAcquisitionsBase: number;
      totalAcquisitionsVat: number;
      totalDeliveriesValue: number;
      totalServicesProvidedValue: number;
      totalServicesReceivedBase: number;
      totalServicesReceivedVat: number;
    },
    monthlyD300s: Array<{
      intraCommunityAcquisitionsBase: number;
      intraCommunityAcquisitionsVat: number;
      intraCommunityDeliveries: number;
    }>,
  ): {
    isReconciled: boolean;
    discrepancies: string[];
  } {
    const discrepancies: string[] = [];
    const tolerance = 0.01;

    // Sum monthly values
    const monthlyAcquisitionsBase = monthlyD300s.reduce(
      (sum, d300) => sum + d300.intraCommunityAcquisitionsBase,
      0,
    );
    const monthlyAcquisitionsVat = monthlyD300s.reduce(
      (sum, d300) => sum + d300.intraCommunityAcquisitionsVat,
      0,
    );
    const monthlyDeliveries = monthlyD300s.reduce(
      (sum, d300) => sum + d300.intraCommunityDeliveries,
      0,
    );

    // Compare with D394
    if (Math.abs(d394.totalAcquisitionsBase - monthlyAcquisitionsBase) > tolerance) {
      discrepancies.push(
        `Achiziții intracomunitare - bază: D394 ${d394.totalAcquisitionsBase} vs D300 ${monthlyAcquisitionsBase}`,
      );
    }

    if (Math.abs(d394.totalAcquisitionsVat - monthlyAcquisitionsVat) > tolerance) {
      discrepancies.push(
        `Achiziții intracomunitare - TVA: D394 ${d394.totalAcquisitionsVat} vs D300 ${monthlyAcquisitionsVat}`,
      );
    }

    if (Math.abs(d394.totalDeliveriesValue - monthlyDeliveries) > tolerance) {
      discrepancies.push(
        `Livrări intracomunitare: D394 ${d394.totalDeliveriesValue} vs D300 ${monthlyDeliveries}`,
      );
    }

    return {
      isReconciled: discrepancies.length === 0,
      discrepancies,
    };
  }

  /**
   * Check if reverse charge applies to a transaction
   */
  shouldApplyReverseCharge(params: {
    supplierCountry: string; // ISO country code
    customerCountry: string;
    customerVatRegistered: boolean;
    goodsOrServices: 'GOODS' | 'SERVICES';
  }): boolean {
    const { supplierCountry, customerCountry, customerVatRegistered, goodsOrServices } = params;

    // Romania code
    const RO = 'RO';

    // If supplier is not in Romania, not applicable
    if (supplierCountry !== RO) {
      return false;
    }

    // EU countries (excluding Romania)
    const EU_COUNTRIES = [
      'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
      'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
      'NL', 'PL', 'PT', 'SE', 'SI', 'SK',
    ];

    // Reverse charge for EU B2B services
    if (
      goodsOrServices === 'SERVICES' &&
      EU_COUNTRIES.includes(customerCountry) &&
      customerVatRegistered
    ) {
      return true;
    }

    // Reverse charge for specific domestic transactions (construction, scrap metal, etc.)
    // This requires additional business logic based on CAEN codes
    // For now, return false for domestic transactions

    return false;
  }

  /**
   * Round to 2 decimal places (Romanian RON standard)
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Get current VAT rates (for display purposes)
   */
  getCurrentVatRates(): VatRateConfig {
    return this.getVatRates(new Date());
  }

  /**
   * Check if a date is before or after VAT rate change (Aug 1, 2025)
   */
  isBeforeRateChange(date: Date): boolean {
    return date < new Date('2025-08-01');
  }

  /**
   * Get VAT rate change notification message
   */
  getVatRateChangeMessage(locale: string = 'ro'): string {
    if (locale === 'ro') {
      return 'ATENȚIE: Începând cu 1 august 2025, cotele de TVA se modifică conform Legii 141/2025: TVA standard de la 19% la 21%, TVA redusă de la 9% la 11%. Cota specială de 5% rămâne neschimbată.';
    }

    return 'NOTICE: Starting August 1, 2025, VAT rates change according to Law 141/2025: Standard VAT from 19% to 21%, Reduced VAT from 9% to 11%. Special rate of 5% remains unchanged.';
  }
}
