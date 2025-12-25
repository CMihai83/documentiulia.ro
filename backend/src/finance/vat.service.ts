import { Injectable, Logger } from '@nestjs/common';

export interface VATCalculation {
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  law: string;
  rateCode: string;
  rateDescription: string;
}

export interface VATRateInfo {
  rate: number;
  code: string;
  description: string;
  law: string;
  applicableFrom: string;
  categories: string[];
}

export interface ReverseChargeResult {
  isReverseCharge: boolean;
  reason?: string;
  buyerReportsVAT: boolean;
  sellerVATAmount: number;
  buyerVATAmount: number;
}

@Injectable()
export class VatService {
  private readonly logger = new Logger(VatService.name);

  // Legea 141/2025 transition date
  private readonly TRANSITION_DATE = new Date('2025-08-01');

  // VAT rates BEFORE Aug 2025 (current rates)
  private readonly VAT_RATES_PRE_AUG_2025: Record<string, VATRateInfo> = {
    STANDARD: {
      rate: 19,
      code: 'S',
      description: 'TVA standard 19%',
      law: 'Codul Fiscal Art. 291 alin. (1)',
      applicableFrom: '2016-01-01',
      categories: ['general', 'services', 'goods'],
    },
    REDUCED_9: {
      rate: 9,
      code: 'R1',
      description: 'TVA redus 9% - alimente, medicamente, cărți',
      law: 'Codul Fiscal Art. 291 alin. (2)',
      applicableFrom: '2016-01-01',
      categories: [
        'food', 'alimente',
        'medicine', 'medicamente', 'pharmaceutical',
        'books', 'carti', 'publications',
        'newspapers', 'ziare', 'magazines', 'reviste',
        'hotel', 'accommodation', 'cazare',
        'restaurant', 'catering',
        'water_supply', 'apa',
      ],
    },
    REDUCED_5: {
      rate: 5,
      code: 'R2',
      description: 'TVA redus 5% - locuințe sociale, evenimente culturale',
      law: 'Codul Fiscal Art. 291 alin. (3)',
      applicableFrom: '2016-01-01',
      categories: [
        'social_housing', 'locuinte_sociale',
        'cultural_events', 'evenimente_culturale',
        'cinema', 'theater', 'teatru',
        'museums', 'muzee',
        'sports_events', 'evenimente_sportive',
        'prosthetics', 'proteze',
        'orthopedic', 'ortopedice',
      ],
    },
    ZERO: {
      rate: 0,
      code: 'Z',
      description: 'TVA 0% - exporturi, livrări intracomunitare',
      law: 'Codul Fiscal Art. 294',
      applicableFrom: '2016-01-01',
      categories: [
        'export', 'exports', 'exporturi',
        'intra_community', 'intracomunitar',
        'international_transport', 'transport_international',
        'diplomatic', 'diplomatic_missions',
      ],
    },
    EXEMPT: {
      rate: 0,
      code: 'E',
      description: 'Scutit de TVA - servicii financiare, medicale, educaționale',
      law: 'Codul Fiscal Art. 292',
      applicableFrom: '2016-01-01',
      categories: [
        'financial_services', 'servicii_financiare',
        'banking', 'bancare',
        'insurance', 'asigurari',
        'medical_services', 'servicii_medicale',
        'education', 'educatie',
        'postal', 'servicii_postale',
        'real_estate_rental', 'inchiriere_imobiliare',
      ],
    },
  };

  // VAT rates AFTER Aug 2025 per Legea 141/2025
  private readonly VAT_RATES_POST_AUG_2025: Record<string, VATRateInfo> = {
    STANDARD: {
      rate: 21,
      code: 'S',
      description: 'TVA standard 21%',
      law: 'Legea 141/2025 Art. 291 alin. (1)',
      applicableFrom: '2025-08-01',
      categories: ['general', 'services', 'goods'],
    },
    REDUCED_11: {
      rate: 11,
      code: 'R1',
      description: 'TVA redus 11% - alimente, medicamente, cărți',
      law: 'Legea 141/2025 Art. 291 alin. (2)',
      applicableFrom: '2025-08-01',
      categories: [
        'food', 'alimente',
        'medicine', 'medicamente', 'pharmaceutical',
        'books', 'carti', 'publications',
        'newspapers', 'ziare', 'magazines', 'reviste',
        'hotel', 'accommodation', 'cazare',
        'restaurant', 'catering',
        'water_supply', 'apa',
      ],
    },
    REDUCED_5: {
      rate: 5,
      code: 'R2',
      description: 'TVA redus 5% - locuințe sociale, evenimente culturale',
      law: 'Legea 141/2025 Art. 291 alin. (3)',
      applicableFrom: '2025-08-01',
      categories: [
        'social_housing', 'locuinte_sociale',
        'cultural_events', 'evenimente_culturale',
        'cinema', 'theater', 'teatru',
        'museums', 'muzee',
        'sports_events', 'evenimente_sportive',
        'prosthetics', 'proteze',
        'orthopedic', 'ortopedice',
      ],
    },
    ZERO: {
      rate: 0,
      code: 'Z',
      description: 'TVA 0% - exporturi, livrări intracomunitare',
      law: 'Legea 141/2025 Art. 294',
      applicableFrom: '2025-08-01',
      categories: [
        'export', 'exports', 'exporturi',
        'intra_community', 'intracomunitar',
        'international_transport', 'transport_international',
        'diplomatic', 'diplomatic_missions',
      ],
    },
    EXEMPT: {
      rate: 0,
      code: 'E',
      description: 'Scutit de TVA - servicii financiare, medicale, educaționale',
      law: 'Legea 141/2025 Art. 292',
      applicableFrom: '2025-08-01',
      categories: [
        'financial_services', 'servicii_financiare',
        'banking', 'bancare',
        'insurance', 'asigurari',
        'medical_services', 'servicii_medicale',
        'education', 'educatie',
        'postal', 'servicii_postale',
        'real_estate_rental', 'inchiriere_imobiliare',
      ],
    },
  };

  // Default to current rates (getter for backwards compatibility)
  private get VAT_RATES(): Record<string, VATRateInfo> {
    return this.getRatesMapForDate();
  }

  // Reverse charge scenarios per Art. 331 Cod Fiscal / Legea 141/2025
  // Complete list per Grok AI recommendation
  private readonly REVERSE_CHARGE_SCENARIOS = [
    {
      code: 'CONSTRUCTION',
      description: 'Construcții - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (1) lit. a)',
      categories: ['construction', 'constructii', 'building', 'renovation', 'renovare', 'demolition', 'demolare', 'installation', 'instalatii'],
      minValue: 0, // No minimum for construction
    },
    {
      code: 'WASTE_SCRAP',
      description: 'Deșeuri și resturi - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (1) lit. b)',
      categories: ['scrap', 'deseuri', 'metal_waste', 'waste', 'recyclables', 'reciclabile', 'ferrous', 'non_ferrous', 'plastic_waste'],
      minValue: 0,
    },
    {
      code: 'CEREALS_CROPS',
      description: 'Cereale și plante tehnice - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (1) lit. c)',
      categories: ['cereals', 'cereale', 'crops', 'wheat', 'grau', 'corn', 'porumb', 'barley', 'orz', 'sunflower', 'floarea_soarelui', 'rapeseed', 'rapita', 'soy', 'soia'],
      minValue: 0,
    },
    {
      code: 'ENERGY_PRODUCTS',
      description: 'Produse energetice - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (1) lit. d)',
      categories: ['energy', 'energie', 'electricity', 'electricitate', 'gas', 'gaz', 'fuel', 'combustibil', 'oil', 'petrol'],
      minValue: 0,
    },
    {
      code: 'GREEN_CERTIFICATES',
      description: 'Certificate verzi - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (1) lit. e)',
      categories: ['green_certificates', 'certificate_verzi', 'renewable', 'energie_regenerabila', 'green_energy'],
      minValue: 0,
    },
    {
      code: 'CARBON_CREDITS',
      description: 'Certificate CO2 - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (1) lit. f)',
      categories: ['co2', 'carbon_credits', 'carbon', 'emissions', 'emisii', 'ets', 'allowances'],
      minValue: 0,
    },
    {
      code: 'WOOD_TIMBER',
      description: 'Lemn și produse din lemn - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (2)',
      categories: ['wood', 'lemn', 'timber', 'cherestea', 'lumber', 'forestry', 'silvicultura'],
      minValue: 0,
    },
    {
      code: 'ELECTRONICS',
      description: 'Dispozitive electronice - taxare inversă',
      law: 'Legea 141/2025 Art. 331 alin. (3)',
      categories: ['electronics', 'phones', 'telefoane', 'tablets', 'tablete', 'laptops', 'laptopuri', 'computers', 'calculatoare', 'smartphones'],
      minValue: 22500, // 22,500 RON minimum for electronics
    },
  ];

  calculateVAT(amount: number, rate: number, isGross: boolean = false): VATCalculation {
    let netAmount: number;
    let vatAmount: number;
    let grossAmount: number;

    if (isGross) {
      grossAmount = amount;
      netAmount = amount / (1 + rate / 100);
      vatAmount = grossAmount - netAmount;
    } else {
      netAmount = amount;
      vatAmount = netAmount * (rate / 100);
      grossAmount = netAmount + vatAmount;
    }

    const rateInfo = this.getRateInfoByRate(rate);

    return {
      netAmount: Math.round(netAmount * 100) / 100,
      vatRate: rate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      law: rateInfo.law,
      rateCode: rateInfo.code,
      rateDescription: rateInfo.description,
    };
  }

  // Helper: Get rates map for a specific date
  private getRatesMapForDate(date?: string): Record<string, VATRateInfo> {
    const checkDate = date ? new Date(date) : new Date();
    return checkDate >= this.TRANSITION_DATE
      ? this.VAT_RATES_POST_AUG_2025
      : this.VAT_RATES_PRE_AUG_2025;
  }

  // Get all rates for a specific date (for API)
  getRatesForDate(date?: string): VATRateInfo[] {
    const ratesMap = this.getRatesMapForDate(date);
    return Object.values(ratesMap);
  }

  // Check if a date is after the transition
  isPostTransition(date?: string): boolean {
    const checkDate = date ? new Date(date) : new Date();
    return checkDate >= this.TRANSITION_DATE;
  }

  // MKT-003: Enhanced rate detection with comprehensive category mapping
  getApplicableRate(category: string, date?: string): number {
    const normalizedCategory = category.toLowerCase().trim();
    const ratesMap = this.getRatesMapForDate(date);

    // Check each rate type for matching categories
    for (const [key, rateInfo] of Object.entries(ratesMap)) {
      if (rateInfo.categories.some(cat => normalizedCategory.includes(cat) || cat.includes(normalizedCategory))) {
        this.logger.debug(`Category "${category}" matched to ${key} (${rateInfo.rate}%)`);
        return rateInfo.rate;
      }
    }

    // Default to standard rate
    return ratesMap.STANDARD.rate;
  }

  // MKT-003: Get full rate info with legal references
  getApplicableRateInfo(category: string, date?: string): VATRateInfo {
    const normalizedCategory = category.toLowerCase().trim();
    const ratesMap = this.getRatesMapForDate(date);

    for (const rateInfo of Object.values(ratesMap)) {
      if (rateInfo.categories.some(cat => normalizedCategory.includes(cat) || cat.includes(normalizedCategory))) {
        return rateInfo;
      }
    }

    return ratesMap.STANDARD;
  }

  // MKT-003: Check if transaction qualifies for reverse charge (taxare inversă)
  // Enhanced per Grok AI recommendation with minimum value support
  checkReverseCharge(
    category: string,
    sellerIsRoVATPayer: boolean,
    buyerIsRoVATPayer: boolean,
    isIntraCommunity: boolean = false,
    transactionValue: number = 0,
  ): ReverseChargeResult {
    const normalizedCategory = category.toLowerCase().trim();

    // Intra-community acquisitions always use reverse charge
    if (isIntraCommunity && buyerIsRoVATPayer) {
      return {
        isReverseCharge: true,
        reason: 'Achiziție intracomunitară - Art. 307 Cod Fiscal',
        buyerReportsVAT: true,
        sellerVATAmount: 0,
        buyerVATAmount: 0, // Buyer reports but also deducts
      };
    }

    // Check domestic reverse charge scenarios
    for (const scenario of this.REVERSE_CHARGE_SCENARIOS) {
      if (scenario.categories.some(cat => normalizedCategory.includes(cat) || cat.includes(normalizedCategory))) {
        // Check minimum value requirement (e.g., electronics need 22,500 RON minimum)
        if (scenario.minValue > 0 && transactionValue < scenario.minValue) {
          this.logger.debug(`Reverse charge not applicable for ${category}: value ${transactionValue} < minimum ${scenario.minValue}`);
          continue;
        }

        if (sellerIsRoVATPayer && buyerIsRoVATPayer) {
          return {
            isReverseCharge: true,
            reason: `${scenario.description} - ${scenario.law}`,
            buyerReportsVAT: true,
            sellerVATAmount: 0,
            buyerVATAmount: 0,
          };
        }
      }
    }

    return {
      isReverseCharge: false,
      buyerReportsVAT: false,
      sellerVATAmount: 0,
      buyerVATAmount: 0,
    };
  }

  // Get all reverse charge categories for UI/documentation
  getReverseChargeCategories(): Array<{
    code: string;
    description: string;
    law: string;
    categories: string[];
    minValue: number;
  }> {
    return this.REVERSE_CHARGE_SCENARIOS.map(s => ({
      code: s.code,
      description: s.description,
      law: s.law,
      categories: s.categories,
      minValue: s.minValue,
    }));
  }

  // MKT-003: Hospitality/Tourism special handling
  calculateHospitalityVAT(
    accommodationAmount: number,
    foodAmount: number,
    otherServicesAmount: number,
  ): { accommodation: VATCalculation; food: VATCalculation; other: VATCalculation; total: VATCalculation } {
    const accommodation = this.calculateVAT(accommodationAmount, this.VAT_RATES.REDUCED_11.rate);
    const food = this.calculateVAT(foodAmount, this.VAT_RATES.REDUCED_11.rate);
    const other = this.calculateVAT(otherServicesAmount, this.VAT_RATES.STANDARD.rate);

    const totalNet = accommodation.netAmount + food.netAmount + other.netAmount;
    const totalVAT = accommodation.vatAmount + food.vatAmount + other.vatAmount;
    const totalGross = accommodation.grossAmount + food.grossAmount + other.grossAmount;

    return {
      accommodation,
      food,
      other,
      total: {
        netAmount: Math.round(totalNet * 100) / 100,
        vatRate: 0, // Mixed rates
        vatAmount: Math.round(totalVAT * 100) / 100,
        grossAmount: Math.round(totalGross * 100) / 100,
        law: 'Legea 141/2025',
        rateCode: 'MIXED',
        rateDescription: 'TVA mixt - servicii hoteliere',
      },
    };
  }

  // MKT-003: Construction sector special handling
  calculateConstructionVAT(
    materialAmount: number,
    laborAmount: number,
    buyerIsVATPayer: boolean,
  ): { materials: VATCalculation; labor: VATCalculation; reverseCharge: ReverseChargeResult } {
    const reverseCharge = this.checkReverseCharge('construction', true, buyerIsVATPayer);

    if (reverseCharge.isReverseCharge) {
      // Reverse charge applies - no VAT on invoice
      return {
        materials: {
          netAmount: materialAmount,
          vatRate: 0,
          vatAmount: 0,
          grossAmount: materialAmount,
          law: 'Art. 331 Cod Fiscal',
          rateCode: 'RC',
          rateDescription: 'Taxare inversă - construcții',
        },
        labor: {
          netAmount: laborAmount,
          vatRate: 0,
          vatAmount: 0,
          grossAmount: laborAmount,
          law: 'Art. 331 Cod Fiscal',
          rateCode: 'RC',
          rateDescription: 'Taxare inversă - construcții',
        },
        reverseCharge,
      };
    }

    // Normal VAT applies
    return {
      materials: this.calculateVAT(materialAmount, this.VAT_RATES.STANDARD.rate),
      labor: this.calculateVAT(laborAmount, this.VAT_RATES.STANDARD.rate),
      reverseCharge,
    };
  }

  calculateVATPayable(collected: number, deductible: number): {
    vatPayable: number;
    isRefund: boolean;
    summary: string;
  } {
    const vatPayable = collected - deductible;
    const isRefund = vatPayable < 0;
    return {
      vatPayable: Math.round(vatPayable * 100) / 100,
      isRefund,
      summary: isRefund
        ? `TVA de recuperat: ${Math.abs(vatPayable).toFixed(2)} RON`
        : `TVA de plată: ${vatPayable.toFixed(2)} RON`,
    };
  }

  // MKT-003: Get all available VAT rates for dropdown/selection
  getAllRates(): VATRateInfo[] {
    return Object.values(this.VAT_RATES);
  }

  // MKT-003: Get rate info by rate value
  private getRateInfoByRate(rate: number): VATRateInfo {
    for (const rateInfo of Object.values(this.VAT_RATES)) {
      if (rateInfo.rate === rate) {
        return rateInfo;
      }
    }
    return this.VAT_RATES.STANDARD;
  }

  // MKT-003: Validate VAT number format (Romanian CUI/CIF)
  validateRomanianVATNumber(vatNumber: string): { valid: boolean; formatted: string; error?: string } {
    // Remove whitespace and convert to uppercase
    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();

    // Check for RO prefix
    const hasROPrefix = cleaned.startsWith('RO');
    const numbers = hasROPrefix ? cleaned.slice(2) : cleaned;

    // CUI must be 2-10 digits
    if (!/^\d{2,10}$/.test(numbers)) {
      return { valid: false, formatted: cleaned, error: 'CUI trebuie să conțină 2-10 cifre' };
    }

    // Validate checksum (Romanian CUI algorithm)
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const digits = numbers.padStart(10, '0').split('').map(Number);

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * weights[i];
    }

    const remainder = (sum * 10) % 11;
    const checkDigit = remainder === 10 ? 0 : remainder;

    if (checkDigit !== digits[9]) {
      return { valid: false, formatted: cleaned, error: 'CUI invalid - cifra de control incorectă' };
    }

    return { valid: true, formatted: `RO${numbers}` };
  }

  // MKT-003: Calculate pro-rata deduction for mixed activities
  calculateProRataDeduction(
    taxableRevenue: number,
    exemptRevenue: number,
    totalInputVAT: number,
  ): { deductibleVAT: number; proRataPercentage: number; nonDeductibleVAT: number } {
    const totalRevenue = taxableRevenue + exemptRevenue;
    if (totalRevenue === 0) {
      return { deductibleVAT: 0, proRataPercentage: 0, nonDeductibleVAT: totalInputVAT };
    }

    const proRataPercentage = Math.round((taxableRevenue / totalRevenue) * 100);
    const deductibleVAT = Math.round(totalInputVAT * (proRataPercentage / 100) * 100) / 100;
    const nonDeductibleVAT = Math.round((totalInputVAT - deductibleVAT) * 100) / 100;

    return { deductibleVAT, proRataPercentage, nonDeductibleVAT };
  }
}
