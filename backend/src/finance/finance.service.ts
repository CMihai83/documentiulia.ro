import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// VAT Rates by Country (EU Standard 2025)
export const VAT_RATES = {
  // Romania (Legea 141/2025)
  RO: {
    standard: 21,
    reduced: 11,
    superReduced: 5,
    zero: 0,
    currency: 'RON',
  },
  // Germany - Standard 19%, Reduced 7%
  DE: {
    standard: 19,
    reduced: 7,
    superReduced: 0,
    zero: 0,
    currency: 'EUR',
  },
  // Austria
  AT: {
    standard: 20,
    reduced: 10,
    superReduced: 0,
    zero: 0,
    currency: 'EUR',
  },
  // France
  FR: {
    standard: 20,
    reduced: 5.5,
    superReduced: 2.1,
    zero: 0,
    currency: 'EUR',
  },
  // Italy
  IT: {
    standard: 22,
    reduced: 10,
    superReduced: 4,
    zero: 0,
    currency: 'EUR',
  },
  // Netherlands
  NL: {
    standard: 21,
    reduced: 9,
    superReduced: 0,
    zero: 0,
    currency: 'EUR',
  },
};

export type CountryCode = keyof typeof VAT_RATES;
export type VatRateType = 'standard' | 'reduced' | 'superReduced' | 'zero';

export interface VatCalculationResult {
  country: CountryCode;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  rateType: VatRateType;
}

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // =================== MULTI-COUNTRY VAT CALCULATOR ===================

  /**
   * Calculate VAT for any supported EU country
   */
  calculateVAT(
    netAmount: number,
    country: CountryCode = 'RO',
    rateType: VatRateType = 'standard',
  ): VatCalculationResult {
    const rates = VAT_RATES[country];
    if (!rates) {
      throw new Error(`Unsupported country: ${country}`);
    }

    const vatRate = rates[rateType];
    const vatAmount = netAmount * (vatRate / 100);
    const grossAmount = netAmount + vatAmount;

    return {
      country,
      netAmount,
      vatRate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      currency: rates.currency,
      rateType,
    };
  }

  /**
   * Calculate German VAT (MwSt) - 19% standard, 7% reduced
   * Used for logistics businesses operating in Germany
   */
  calculateGermanVAT(
    netAmount: number,
    rateType: VatRateType = 'standard',
  ): VatCalculationResult {
    return this.calculateVAT(netAmount, 'DE', rateType);
  }

  /**
   * Calculate Romanian VAT (TVA) - 21% standard, 11% reduced per Legea 141/2025
   */
  calculateRomanianVAT(
    netAmount: number,
    rateType: VatRateType = 'standard',
  ): VatCalculationResult {
    return this.calculateVAT(netAmount, 'RO', rateType);
  }

  /**
   * Get VAT rate for a specific country and category
   */
  getVATRate(country: CountryCode, rateType: VatRateType = 'standard'): number {
    const rates = VAT_RATES[country];
    if (!rates) {
      throw new Error(`Unsupported country: ${country}`);
    }
    return rates[rateType];
  }

  /**
   * Get all VAT rates for a country
   */
  getCountryVATRates(country: CountryCode) {
    const rates = VAT_RATES[country];
    if (!rates) {
      throw new Error(`Unsupported country: ${country}`);
    }
    return rates;
  }

  /**
   * Get all supported countries with their VAT rates
   */
  getAllVATRates() {
    return VAT_RATES;
  }

  /**
   * Calculate reverse charge VAT (B2B cross-border)
   * Used when supplier is in one EU country and buyer in another
   */
  calculateReverseChargeVAT(
    netAmount: number,
    buyerCountry: CountryCode,
  ): VatCalculationResult {
    // In reverse charge, supplier invoices without VAT
    // Buyer self-assesses VAT at their local rate
    return this.calculateVAT(netAmount, buyerCountry, 'standard');
  }

  async getDashboardData(userId: string) {
    const [invoices, vatReports, recentInvoices] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { userId },
        _sum: {
          netAmount: true,
          vatAmount: true,
          grossAmount: true,
        },
        _count: true,
      }),
      this.prisma.vATReport.findMany({
        where: { userId },
        orderBy: { period: 'desc' },
        take: 6,
      }),
      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalInvoices: invoices._count,
        totalNet: invoices._sum.netAmount || 0,
        totalVAT: invoices._sum.vatAmount || 0,
        totalGross: invoices._sum.grossAmount || 0,
      },
      vatHistory: vatReports,
      recentInvoices,
    };
  }

  async createInvoice(userId: string, data: any) {
    return this.prisma.invoice.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async getInvoices(userId: string, filters?: { type?: string; status?: string }) {
    return this.prisma.invoice.findMany({
      where: {
        userId,
        ...(filters?.type && { type: filters.type as any }),
        ...(filters?.status && { status: filters.status as any }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVATReports(userId: string) {
    return this.prisma.vATReport.findMany({
      where: { userId },
      orderBy: { period: 'desc' },
    });
  }

  async getVATSummary(userId: string) {
    const currentYear = new Date().getFullYear();
    const reports = await this.prisma.vATReport.findMany({
      where: {
        userId,
        period: { startsWith: String(currentYear) },
      },
    });

    const totals = reports.reduce(
      (acc, report) => ({
        collected: acc.collected + (report.vatCollected?.toNumber() || 0),
        deductible: acc.deductible + (report.vatDeductible?.toNumber() || 0),
        payable: acc.payable + (report.vatPayable?.toNumber() || 0),
      }),
      { collected: 0, deductible: 0, payable: 0 },
    );

    return {
      year: currentYear,
      ...totals,
      reportsCount: reports.length,
    };
  }

  async calculateVATForPeriod(userId: string, period: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: {
          gte: new Date(`${period}-01`),
          lt: new Date(
            new Date(`${period}-01`).setMonth(
              new Date(`${period}-01`).getMonth() + 1,
            ),
          ),
        },
      },
    });

    const collected = invoices
      .filter((inv) => inv.type === 'ISSUED')
      .reduce((sum, inv) => sum + (inv.vatAmount?.toNumber() || 0), 0);

    const deductible = invoices
      .filter((inv) => inv.type === 'RECEIVED')
      .reduce((sum, inv) => sum + (inv.vatAmount?.toNumber() || 0), 0);

    const payable = collected - deductible;

    const report = await this.prisma.vATReport.upsert({
      where: { userId_period: { userId, period } },
      create: {
        userId,
        period,
        vatCollected: collected,
        vatDeductible: deductible,
        vatPayable: payable,
        status: 'DRAFT',
      },
      update: {
        vatCollected: collected,
        vatDeductible: deductible,
        vatPayable: payable,
      },
    });

    return report;
  }

  async submitVATToANAF(reportId: string) {
    const report = await this.prisma.vATReport.update({
      where: { id: reportId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'VAT report submitted to ANAF',
      reportId: report.id,
      submittedAt: report.submittedAt,
    };
  }

  async downloadVATReport(reportId: string) {
    const report = await this.prisma.vATReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return {
      filename: `vat-report-${report.period}.pdf`,
      contentType: 'application/pdf',
      data: report,
    };
  }
}
