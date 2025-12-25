/**
 * VAT Rate Simulator Service
 * Simulates impact of VAT rate changes (Aug 2025: 19%→21%, 9%→11%)
 * Sprint 26 - Grok Backlog
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// VAT Rates
const VAT_RATES_CURRENT = {
  standard: 19,
  reduced: 9,
  special: 5,
};

const VAT_RATES_AUG2025 = {
  standard: 21,
  reduced: 11,
  special: 5,
};

const VAT_CHANGE_DATE = new Date('2025-08-01');

export interface VatSimulationInput {
  organizationId?: string;
  monthlyRevenue: number;
  revenueBreakdown: {
    standardRate: number; // Percentage of revenue at standard rate
    reducedRate: number;  // Percentage of revenue at reduced rate
    specialRate: number;  // Percentage of revenue at special rate
  };
  monthlyExpenses: number;
  expenseBreakdown: {
    standardRate: number;
    reducedRate: number;
    specialRate: number;
    exempt: number; // Percentage of expenses without VAT (wages, etc.)
  };
  isMicro?: boolean; // Micro-enterprise (no VAT deduction)
}

export interface VatSimulationResult {
  currentRates: {
    vatCollected: number;
    vatDeductible: number;
    vatPayable: number;
    effectiveVatRate: number;
  };
  newRates: {
    vatCollected: number;
    vatDeductible: number;
    vatPayable: number;
    effectiveVatRate: number;
  };
  impact: {
    monthlyDifference: number;
    annualDifference: number;
    percentageIncrease: number;
    cashFlowImpact: string;
    recommendations: string[];
  };
  breakdown: {
    revenueByRate: {
      standard: { current: number; new: number };
      reduced: { current: number; new: number };
      special: { current: number; new: number };
    };
    expensesByRate: {
      standard: { current: number; new: number };
      reduced: { current: number; new: number };
      special: { current: number; new: number };
    };
  };
}

@Injectable()
export class VatSimulatorService {
  private readonly logger = new Logger(VatSimulatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Simulate VAT impact for Aug 2025 rate changes
   */
  async simulateVatChange(input: VatSimulationInput): Promise<VatSimulationResult> {
    const { monthlyRevenue, revenueBreakdown, monthlyExpenses, expenseBreakdown, isMicro } = input;

    // Validate percentages sum to 100
    const revenueTotal = revenueBreakdown.standardRate + revenueBreakdown.reducedRate + revenueBreakdown.specialRate;
    const expenseTotal = expenseBreakdown.standardRate + expenseBreakdown.reducedRate +
                         expenseBreakdown.specialRate + expenseBreakdown.exempt;

    if (Math.abs(revenueTotal - 100) > 0.01) {
      throw new Error('Revenue breakdown must sum to 100%');
    }
    if (Math.abs(expenseTotal - 100) > 0.01) {
      throw new Error('Expense breakdown must sum to 100%');
    }

    // Calculate revenue breakdown by VAT rate
    const revenueStandard = monthlyRevenue * (revenueBreakdown.standardRate / 100);
    const revenueReduced = monthlyRevenue * (revenueBreakdown.reducedRate / 100);
    const revenueSpecial = monthlyRevenue * (revenueBreakdown.specialRate / 100);

    // Calculate expense breakdown by VAT rate
    const expenseStandard = monthlyExpenses * (expenseBreakdown.standardRate / 100);
    const expenseReduced = monthlyExpenses * (expenseBreakdown.reducedRate / 100);
    const expenseSpecial = monthlyExpenses * (expenseBreakdown.specialRate / 100);

    // Current VAT calculations
    const currentVatCollected =
      (revenueStandard * VAT_RATES_CURRENT.standard / 100) +
      (revenueReduced * VAT_RATES_CURRENT.reduced / 100) +
      (revenueSpecial * VAT_RATES_CURRENT.special / 100);

    const currentVatDeductible = isMicro ? 0 : (
      (expenseStandard * VAT_RATES_CURRENT.standard / 100) +
      (expenseReduced * VAT_RATES_CURRENT.reduced / 100) +
      (expenseSpecial * VAT_RATES_CURRENT.special / 100)
    );

    const currentVatPayable = currentVatCollected - currentVatDeductible;
    const currentEffectiveRate = monthlyRevenue > 0 ? (currentVatPayable / monthlyRevenue) * 100 : 0;

    // New VAT calculations (Aug 2025)
    const newVatCollected =
      (revenueStandard * VAT_RATES_AUG2025.standard / 100) +
      (revenueReduced * VAT_RATES_AUG2025.reduced / 100) +
      (revenueSpecial * VAT_RATES_AUG2025.special / 100);

    const newVatDeductible = isMicro ? 0 : (
      (expenseStandard * VAT_RATES_AUG2025.standard / 100) +
      (expenseReduced * VAT_RATES_AUG2025.reduced / 100) +
      (expenseSpecial * VAT_RATES_AUG2025.special / 100)
    );

    const newVatPayable = newVatCollected - newVatDeductible;
    const newEffectiveRate = monthlyRevenue > 0 ? (newVatPayable / monthlyRevenue) * 100 : 0;

    // Impact calculations
    const monthlyDifference = newVatPayable - currentVatPayable;
    const annualDifference = monthlyDifference * 12;
    const percentageIncrease = currentVatPayable > 0
      ? ((newVatPayable - currentVatPayable) / currentVatPayable) * 100
      : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(input, monthlyDifference, percentageIncrease);

    // Cash flow impact assessment
    let cashFlowImpact: string;
    if (monthlyDifference > 5000) {
      cashFlowImpact = 'SEMNIFICATIV - Pregătiți rezerve de lichidități';
    } else if (monthlyDifference > 1000) {
      cashFlowImpact = 'MODERAT - Ajustări minore necesare';
    } else {
      cashFlowImpact = 'MINIM - Impact neglijabil';
    }

    return {
      currentRates: {
        vatCollected: Math.round(currentVatCollected * 100) / 100,
        vatDeductible: Math.round(currentVatDeductible * 100) / 100,
        vatPayable: Math.round(currentVatPayable * 100) / 100,
        effectiveVatRate: Math.round(currentEffectiveRate * 100) / 100,
      },
      newRates: {
        vatCollected: Math.round(newVatCollected * 100) / 100,
        vatDeductible: Math.round(newVatDeductible * 100) / 100,
        vatPayable: Math.round(newVatPayable * 100) / 100,
        effectiveVatRate: Math.round(newEffectiveRate * 100) / 100,
      },
      impact: {
        monthlyDifference: Math.round(monthlyDifference * 100) / 100,
        annualDifference: Math.round(annualDifference * 100) / 100,
        percentageIncrease: Math.round(percentageIncrease * 100) / 100,
        cashFlowImpact,
        recommendations,
      },
      breakdown: {
        revenueByRate: {
          standard: {
            current: Math.round(revenueStandard * VAT_RATES_CURRENT.standard / 100 * 100) / 100,
            new: Math.round(revenueStandard * VAT_RATES_AUG2025.standard / 100 * 100) / 100,
          },
          reduced: {
            current: Math.round(revenueReduced * VAT_RATES_CURRENT.reduced / 100 * 100) / 100,
            new: Math.round(revenueReduced * VAT_RATES_AUG2025.reduced / 100 * 100) / 100,
          },
          special: {
            current: Math.round(revenueSpecial * VAT_RATES_CURRENT.special / 100 * 100) / 100,
            new: Math.round(revenueSpecial * VAT_RATES_AUG2025.special / 100 * 100) / 100,
          },
        },
        expensesByRate: {
          standard: {
            current: Math.round(expenseStandard * VAT_RATES_CURRENT.standard / 100 * 100) / 100,
            new: Math.round(expenseStandard * VAT_RATES_AUG2025.standard / 100 * 100) / 100,
          },
          reduced: {
            current: Math.round(expenseReduced * VAT_RATES_CURRENT.reduced / 100 * 100) / 100,
            new: Math.round(expenseReduced * VAT_RATES_AUG2025.reduced / 100 * 100) / 100,
          },
          special: {
            current: Math.round(expenseSpecial * VAT_RATES_CURRENT.special / 100 * 100) / 100,
            new: Math.round(expenseSpecial * VAT_RATES_AUG2025.special / 100 * 100) / 100,
          },
        },
      },
    };
  }

  /**
   * Get presets for common business types
   */
  getIndustryPresets() {
    return [
      {
        id: 'it-services',
        name: 'IT Services / Consulting',
        nameRo: 'Servicii IT / Consultanță',
        revenueBreakdown: { standardRate: 100, reducedRate: 0, specialRate: 0 },
        expenseBreakdown: { standardRate: 60, reducedRate: 5, specialRate: 0, exempt: 35 },
      },
      {
        id: 'retail-general',
        name: 'General Retail',
        nameRo: 'Retail General',
        revenueBreakdown: { standardRate: 85, reducedRate: 15, specialRate: 0 },
        expenseBreakdown: { standardRate: 70, reducedRate: 10, specialRate: 0, exempt: 20 },
      },
      {
        id: 'food-retail',
        name: 'Food Retail',
        nameRo: 'Retail Alimentar',
        revenueBreakdown: { standardRate: 20, reducedRate: 80, specialRate: 0 },
        expenseBreakdown: { standardRate: 30, reducedRate: 50, specialRate: 0, exempt: 20 },
      },
      {
        id: 'restaurant',
        name: 'Restaurant / HoReCa',
        nameRo: 'Restaurant / HoReCa',
        revenueBreakdown: { standardRate: 100, reducedRate: 0, specialRate: 0 },
        expenseBreakdown: { standardRate: 40, reducedRate: 35, specialRate: 0, exempt: 25 },
      },
      {
        id: 'construction',
        name: 'Construction',
        nameRo: 'Construcții',
        revenueBreakdown: { standardRate: 100, reducedRate: 0, specialRate: 0 },
        expenseBreakdown: { standardRate: 65, reducedRate: 5, specialRate: 0, exempt: 30 },
      },
      {
        id: 'healthcare',
        name: 'Healthcare',
        nameRo: 'Sănătate',
        revenueBreakdown: { standardRate: 30, reducedRate: 70, specialRate: 0 },
        expenseBreakdown: { standardRate: 40, reducedRate: 30, specialRate: 0, exempt: 30 },
      },
      {
        id: 'publishing',
        name: 'Publishing / Books',
        nameRo: 'Editură / Cărți',
        revenueBreakdown: { standardRate: 0, reducedRate: 0, specialRate: 100 },
        expenseBreakdown: { standardRate: 50, reducedRate: 10, specialRate: 20, exempt: 20 },
      },
    ];
  }

  /**
   * Get current and future VAT rates
   */
  getVatRates() {
    return {
      current: VAT_RATES_CURRENT,
      future: VAT_RATES_AUG2025,
      changeDate: VAT_CHANGE_DATE.toISOString(),
      daysUntilChange: Math.max(0, Math.ceil((VAT_CHANGE_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    };
  }

  /**
   * Simulate based on organization's actual invoice data
   */
  async simulateFromInvoices(organizationId: string, months: number = 6): Promise<VatSimulationResult> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get issued invoices (revenue)
    const issuedInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        type: 'ISSUED',
        invoiceDate: { gte: startDate },
      },
      select: {
        netAmount: true,
        vatRate: true,
        vatAmount: true,
      },
    });

    // Get received invoices (expenses)
    const receivedInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        type: 'RECEIVED',
        invoiceDate: { gte: startDate },
      },
      select: {
        netAmount: true,
        vatRate: true,
        vatAmount: true,
      },
    });

    // Calculate averages
    const totalRevenue = issuedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const totalExpenses = receivedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);

    const monthlyRevenue = totalRevenue / months;
    const monthlyExpenses = totalExpenses / months;

    // Calculate revenue breakdown
    const revenueByRate = { standard: 0, reduced: 0, special: 0 };
    for (const inv of issuedInvoices) {
      const rate = Number(inv.vatRate);
      if (rate >= 19) revenueByRate.standard += Number(inv.netAmount);
      else if (rate >= 9) revenueByRate.reduced += Number(inv.netAmount);
      else revenueByRate.special += Number(inv.netAmount);
    }

    // Calculate expense breakdown
    const expenseByRate = { standard: 0, reduced: 0, special: 0, exempt: 0 };
    for (const inv of receivedInvoices) {
      const rate = Number(inv.vatRate);
      if (rate >= 19) expenseByRate.standard += Number(inv.netAmount);
      else if (rate >= 9) expenseByRate.reduced += Number(inv.netAmount);
      else if (rate > 0) expenseByRate.special += Number(inv.netAmount);
      else expenseByRate.exempt += Number(inv.netAmount);
    }

    // Convert to percentages
    const revenueBreakdown = {
      standardRate: totalRevenue > 0 ? (revenueByRate.standard / totalRevenue) * 100 : 100,
      reducedRate: totalRevenue > 0 ? (revenueByRate.reduced / totalRevenue) * 100 : 0,
      specialRate: totalRevenue > 0 ? (revenueByRate.special / totalRevenue) * 100 : 0,
    };

    const expenseBreakdown = {
      standardRate: totalExpenses > 0 ? (expenseByRate.standard / totalExpenses) * 100 : 60,
      reducedRate: totalExpenses > 0 ? (expenseByRate.reduced / totalExpenses) * 100 : 10,
      specialRate: totalExpenses > 0 ? (expenseByRate.special / totalExpenses) * 100 : 0,
      exempt: totalExpenses > 0 ? (expenseByRate.exempt / totalExpenses) * 100 : 30,
    };

    return this.simulateVatChange({
      organizationId,
      monthlyRevenue,
      revenueBreakdown,
      monthlyExpenses,
      expenseBreakdown,
    });
  }

  private generateRecommendations(
    input: VatSimulationInput,
    monthlyDifference: number,
    percentageIncrease: number
  ): string[] {
    const recommendations: string[] = [];

    if (monthlyDifference > 0) {
      recommendations.push('Ajustați prețurile pentru a compensa creșterea TVA începând cu 1 august 2025');
    }

    if (percentageIncrease > 10) {
      recommendations.push('Impact semnificativ - Revizuiți structura costurilor și identificați posibile optimizări');
    }

    if (input.revenueBreakdown.standardRate > 80) {
      recommendations.push('Veniturile dvs. sunt preponderent la cota standard (19%→21%) - impactul va fi maxim');
    }

    if (input.revenueBreakdown.reducedRate > 50) {
      recommendations.push('Parte semnificativă din venituri la cotă redusă (9%→11%) - creștere moderată');
    }

    if (input.isMicro) {
      recommendations.push('Ca microîntreprindere, nu puteți deduce TVA - impactul asupra costurilor este mai mare');
    }

    if (monthlyDifference > 2000) {
      recommendations.push('Creați un fond de rezervă pentru acoperirea diferenței de TVA');
    }

    recommendations.push('Actualizați sistemele de facturare pentru noile cote TVA înainte de 1 august 2025');
    recommendations.push('Informați clienții despre modificările de preț datorate creșterii TVA');

    return recommendations;
  }
}
