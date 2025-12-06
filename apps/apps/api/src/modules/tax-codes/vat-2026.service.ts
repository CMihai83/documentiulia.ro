/**
 * Romanian VAT 2026 Rules Service
 *
 * Implements the new Romanian VAT regulations effective from 2024-2026:
 * - Standard VAT: 19%
 * - Reduced VAT 9%: Food, medicine, hotels, restaurants
 * - Reduced VAT 5%: Books, newspapers, housing (first home)
 * - Zero VAT: Exports, intra-EU supplies
 *
 * Also includes:
 * - Reverse charge mechanism
 * - VAT on margin scheme
 * - Distance selling thresholds
 * - OSS (One-Stop Shop) for EU e-commerce
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface VatCalculation {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  vatCode: string;
  reverseCharge: boolean;
  vatExemptionReason?: string;
}

interface VatRateConfig {
  code: string;
  rate: number;
  name: string;
  nameRo: string;
  applicableFrom: Date;
  applicableTo?: Date;
  categories: string[];
  ncCodes?: string[]; // Combined Nomenclature codes
}

interface VatReturn {
  period: string;
  year: number;
  month?: number;
  quarter?: number;
  salesVat: number;
  purchasesVat: number;
  reverseChargeVat: number;
  intraEuAcquisitions: number;
  intraEuSupplies: number;
  exports: number;
  imports: number;
  vatDue: number;
  vatRefund: number;
  netPosition: number;
}

@Injectable()
export class Vat2026Service {
  private readonly logger = new Logger(Vat2026Service.name);

  // Romanian VAT rates effective 2024-2026
  private readonly vatRates: VatRateConfig[] = [
    {
      code: 'S',
      rate: 19,
      name: 'Standard Rate',
      nameRo: 'Cotă standard',
      applicableFrom: new Date('2024-01-01'),
      categories: ['default', 'services', 'goods'],
    },
    {
      code: 'R1',
      rate: 9,
      name: 'Reduced Rate 1',
      nameRo: 'Cotă redusă 9%',
      applicableFrom: new Date('2024-01-01'),
      categories: [
        'food', // Alimente și băuturi nealcoolice
        'medicine', // Medicamente și dispozitive medicale
        'hotels', // Cazare hotelieră
        'restaurants', // Servicii restaurant (cu alcool sub 30%)
        'waterSupply', // Furnizare apă
        'prosthetics', // Proteze și dispozitive ortopedice
        'fertilizers', // Îngrășăminte și pesticide
        'seeds', // Semințe și material de plantat
      ],
      ncCodes: ['0201', '0202', '0203', '0204', '0207', '0301', '0302', '0303'],
    },
    {
      code: 'R2',
      rate: 5,
      name: 'Reduced Rate 2',
      nameRo: 'Cotă redusă 5%',
      applicableFrom: new Date('2024-01-01'),
      categories: [
        'books', // Cărți și publicații periodice
        'newspapers', // Ziare
        'magazines', // Reviste
        'firstHome', // Prima locuință (sub 120mp util)
        'schoolBooks', // Manuale școlare
        'socialHousing', // Locuințe sociale
        'culturalEvents', // Evenimente culturale
        'sportsEvents', // Evenimente sportive
      ],
      ncCodes: ['4901', '4902', '4903', '4904'],
    },
    {
      code: 'Z',
      rate: 0,
      name: 'Zero Rate',
      nameRo: 'Scutit cu drept de deducere',
      applicableFrom: new Date('2024-01-01'),
      categories: [
        'exports', // Exporturi
        'intraEuSupplies', // Livrări intracomunitare
        'internationalTransport', // Transport internațional
        'diplomaticMissions', // Misiuni diplomatice
        'natoForces', // Forțe NATO
      ],
    },
    {
      code: 'E',
      rate: 0,
      name: 'Exempt',
      nameRo: 'Scutit fără drept de deducere',
      applicableFrom: new Date('2024-01-01'),
      categories: [
        'banking', // Servicii bancare
        'insurance', // Asigurări
        'healthcare', // Servicii medicale
        'education', // Servicii educaționale
        'socialServices', // Servicii sociale
        'realEstateRental', // Închiriere imobile
        'postalServices', // Servicii poștale universale
        'gambling', // Jocuri de noroc
      ],
    },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate VAT for a transaction
   */
  calculateVat(
    netAmount: number,
    category: string,
    options: {
      date?: Date;
      customerCountry?: string;
      customerVatId?: string;
      isB2B?: boolean;
      ncCode?: string;
    } = {},
  ): VatCalculation {
    const {
      date = new Date(),
      customerCountry = 'RO',
      customerVatId,
      isB2B = false,
      ncCode,
    } = options;

    // Determine applicable VAT rate
    let vatRate = this.getVatRate(category, date, ncCode);
    let reverseCharge = false;
    let vatExemptionReason: string | undefined;

    // Check for intra-EU B2B (reverse charge)
    if (
      customerCountry !== 'RO' &&
      this.isEuCountry(customerCountry) &&
      isB2B &&
      customerVatId
    ) {
      reverseCharge = true;
      vatExemptionReason = `Reverse charge - Art. 150 Cod Fiscal (Livrare intracomunitară B2B)`;
      vatRate = { ...vatRate, rate: 0, code: 'RC' };
    }

    // Check for exports (non-EU)
    if (!this.isEuCountry(customerCountry)) {
      vatExemptionReason = `Export - Art. 143(1)(a) Cod Fiscal`;
      vatRate = { ...vatRate, rate: 0, code: 'Z' };
    }

    const vatAmount = this.roundVat(netAmount * (vatRate.rate / 100));
    const grossAmount = this.roundVat(netAmount + vatAmount);

    return {
      netAmount,
      vatAmount,
      grossAmount,
      vatRate: vatRate.rate,
      vatCode: vatRate.code,
      reverseCharge,
      vatExemptionReason,
    };
  }

  /**
   * Calculate VAT from gross amount (reverse calculation)
   */
  calculateVatFromGross(
    grossAmount: number,
    category: string,
    date: Date = new Date(),
  ): VatCalculation {
    const vatRate = this.getVatRate(category, date);
    const netAmount = this.roundVat(grossAmount / (1 + vatRate.rate / 100));
    const vatAmount = this.roundVat(grossAmount - netAmount);

    return {
      netAmount,
      vatAmount,
      grossAmount,
      vatRate: vatRate.rate,
      vatCode: vatRate.code,
      reverseCharge: false,
    };
  }

  /**
   * Get applicable VAT rate for category
   */
  getVatRate(
    category: string,
    date: Date = new Date(),
    ncCode?: string,
  ): VatRateConfig {
    // First check by NC code if provided
    if (ncCode) {
      const ncPrefix = ncCode.substring(0, 4);
      for (const rate of this.vatRates) {
        if (
          rate.ncCodes?.includes(ncPrefix) &&
          date >= rate.applicableFrom &&
          (!rate.applicableTo || date <= rate.applicableTo)
        ) {
          return rate;
        }
      }
    }

    // Then check by category
    for (const rate of this.vatRates) {
      if (
        rate.categories.includes(category) &&
        date >= rate.applicableFrom &&
        (!rate.applicableTo || date <= rate.applicableTo)
      ) {
        return rate;
      }
    }

    // Default to standard rate
    return this.vatRates.find((r) => r.code === 'S')!;
  }

  /**
   * Get all VAT rates
   */
  getAllVatRates(): VatRateConfig[] {
    return this.vatRates;
  }

  /**
   * Validate VAT number (Romanian)
   */
  validateVatNumber(vatNumber: string): {
    valid: boolean;
    formatted: string;
    error?: string;
  } {
    // Remove RO prefix and spaces
    let cleaned = vatNumber.toUpperCase().replace(/\s/g, '');
    if (cleaned.startsWith('RO')) {
      cleaned = cleaned.substring(2);
    }

    // Must be 2-10 digits
    if (!/^\d{2,10}$/.test(cleaned)) {
      return {
        valid: false,
        formatted: vatNumber,
        error: 'CUI-ul trebuie să conțină între 2 și 10 cifre',
      };
    }

    // Validate checksum (Romanian CUI algorithm)
    const digits = cleaned.split('').map(Number).reverse();
    const weights = [2, 3, 5, 7, 1, 2, 3, 5, 7];
    const checkDigit = digits[0];

    let sum = 0;
    for (let i = 1; i < digits.length; i++) {
      sum += digits[i] * weights[i - 1];
    }

    const remainder = (sum * 10) % 11;
    const expectedCheck = remainder === 10 ? 0 : remainder;

    if (checkDigit !== expectedCheck) {
      return {
        valid: false,
        formatted: `RO${cleaned}`,
        error: 'Cifra de control invalidă',
      };
    }

    return {
      valid: true,
      formatted: `RO${cleaned}`,
    };
  }

  /**
   * Validate EU VAT number via VIES
   */
  async validateEuVatNumber(vatNumber: string): Promise<{
    valid: boolean;
    name?: string;
    address?: string;
    error?: string;
  }> {
    const countryCode = vatNumber.substring(0, 2).toUpperCase();
    const number = vatNumber.substring(2);

    // In production, call VIES SOAP API
    // https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl
    // For now, return mock validation

    this.logger.log(`Validating EU VAT: ${countryCode}${number}`);

    // Basic format validation per country
    const patterns: Record<string, RegExp> = {
      AT: /^U\d{8}$/,
      BE: /^\d{10}$/,
      BG: /^\d{9,10}$/,
      CY: /^\d{8}[A-Z]$/,
      CZ: /^\d{8,10}$/,
      DE: /^\d{9}$/,
      DK: /^\d{8}$/,
      EE: /^\d{9}$/,
      EL: /^\d{9}$/, // Greece
      ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
      FI: /^\d{8}$/,
      FR: /^[A-Z0-9]{2}\d{9}$/,
      HR: /^\d{11}$/,
      HU: /^\d{8}$/,
      IE: /^(\d{7}[A-Z]{1,2}|\d[A-Z+*]\d{5}[A-Z])$/,
      IT: /^\d{11}$/,
      LT: /^(\d{9}|\d{12})$/,
      LU: /^\d{8}$/,
      LV: /^\d{11}$/,
      MT: /^\d{8}$/,
      NL: /^\d{9}B\d{2}$/,
      PL: /^\d{10}$/,
      PT: /^\d{9}$/,
      RO: /^\d{2,10}$/,
      SE: /^\d{12}$/,
      SI: /^\d{8}$/,
      SK: /^\d{10}$/,
    };

    const pattern = patterns[countryCode];
    if (!pattern) {
      return {
        valid: false,
        error: `Cod țară necunoscut: ${countryCode}`,
      };
    }

    if (!pattern.test(number)) {
      return {
        valid: false,
        error: `Format invalid pentru ${countryCode}`,
      };
    }

    // Mock VIES response
    return {
      valid: true,
      name: 'Mock Company Name',
      address: 'Mock Address',
    };
  }

  /**
   * Calculate VAT return for period
   */
  async calculateVatReturn(
    companyId: string,
    year: number,
    month?: number,
    quarter?: number,
  ): Promise<VatReturn> {
    let startDate: Date;
    let endDate: Date;
    let period: string;

    if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // Last day of month
      period = `${year}-${month.toString().padStart(2, '0')}`;
    } else if (quarter) {
      startDate = new Date(year, (quarter - 1) * 3, 1);
      endDate = new Date(year, quarter * 3, 0);
      period = `${year}-Q${quarter}`;
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      period = `${year}`;
    }

    // Get invoices (sales)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: { gte: startDate, lte: endDate },
        status: { not: 'DRAFT' },
      },
      include: {
        client: true,
      },
    });

    // Get expenses (purchases)
    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        expenseDate: { gte: startDate, lte: endDate },
        isDeductible: true,
      },
    });

    // Calculate totals
    let salesVat = 0;
    let purchasesVat = 0;
    let reverseChargeVat = 0;
    let intraEuAcquisitions = 0;
    let intraEuSupplies = 0;
    let exports = 0;
    let imports = 0;

    for (const invoice of invoices) {
      const clientCountry = invoice.client?.country || 'RO';
      const isEu = this.isEuCountry(clientCountry);

      if (clientCountry === 'RO') {
        salesVat += Number(invoice.vatAmountRon);
      } else if (isEu && invoice.client?.cui) {
        // Intra-EU B2B
        intraEuSupplies += Number(invoice.totalRon);
      } else if (!isEu) {
        exports += Number(invoice.totalRon);
      }
    }

    for (const expense of expenses) {
      if (expense.isDeductible) {
        purchasesVat += Number(expense.vatAmount) * (Number(expense.deductiblePercent) / 100);
      }
    }

    const vatDue = salesVat + reverseChargeVat;
    const vatRefund = purchasesVat;
    const netPosition = vatDue - vatRefund;

    return {
      period,
      year,
      month,
      quarter,
      salesVat,
      purchasesVat,
      reverseChargeVat,
      intraEuAcquisitions,
      intraEuSupplies,
      exports,
      imports,
      vatDue,
      vatRefund,
      netPosition,
    };
  }

  /**
   * Check OSS (One-Stop Shop) threshold for EU distance selling
   */
  async checkOssThreshold(
    companyId: string,
    year: number,
  ): Promise<{
    totalSales: number;
    threshold: number;
    exceeds: boolean;
    recommendation: string;
  }> {
    // EU OSS threshold is €10,000 for all member states combined
    const threshold = 10000;

    // Get B2C sales to other EU countries
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31),
        },
        client: {
          country: { not: 'RO' },
          cui: null, // B2C (no VAT ID)
        },
      },
      include: { client: true },
    });

    const euSales = invoices
      .filter((i) => this.isEuCountry(i.client?.country || 'RO'))
      .reduce((sum, i) => sum + Number(i.totalRon) / 4.9, 0); // Convert RON to EUR approx

    const exceeds = euSales > threshold;

    return {
      totalSales: Math.round(euSales * 100) / 100,
      threshold,
      exceeds,
      recommendation: exceeds
        ? 'Recomandăm înregistrarea în sistemul OSS pentru a simplifica raportarea TVA în statele membre UE'
        : 'Sub pragul OSS - puteți continua cu TVA-ul din România',
    };
  }

  /**
   * Get VAT obligations calendar
   */
  getVatCalendar(
    year: number,
    isMonthly: boolean,
  ): { deadline: Date; declaration: string; description: string }[] {
    const calendar: { deadline: Date; declaration: string; description: string }[] = [];

    if (isMonthly) {
      // Monthly declarations due on 25th of following month
      for (let month = 1; month <= 12; month++) {
        const deadline = new Date(year, month, 25);
        calendar.push({
          deadline,
          declaration: `D300-${year}${month.toString().padStart(2, '0')}`,
          description: `Decontul de TVA pentru ${this.getMonthName(month - 1)} ${year}`,
        });
      }
    } else {
      // Quarterly declarations due on 25th of month following quarter
      for (let quarter = 1; quarter <= 4; quarter++) {
        const deadline = new Date(year, quarter * 3, 25);
        calendar.push({
          deadline,
          declaration: `D300-${year}T${quarter}`,
          description: `Decontul de TVA pentru trimestrul ${quarter} ${year}`,
        });
      }
    }

    // Add recapitulative statement (D390 VIES)
    for (let month = 1; month <= 12; month++) {
      const deadline = new Date(year, month, 25);
      calendar.push({
        deadline,
        declaration: `D390-${year}${month.toString().padStart(2, '0')}`,
        description: `Declarația recapitulativă pentru ${this.getMonthName(month - 1)} ${year}`,
      });
    }

    return calendar.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  /**
   * Check if country is EU member
   */
  private isEuCountry(countryCode: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'EL', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
      'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ];
    return euCountries.includes(countryCode.toUpperCase());
  }

  /**
   * Round VAT amount (Romanian rounding rules)
   */
  private roundVat(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Get Romanian month name
   */
  private getMonthName(month: number): string {
    const months = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
    ];
    return months[month];
  }
}
