import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CashFlowForecast {
  period: string;
  date: Date;
  expectedIncome: number;
  expectedExpenses: number;
  netCashFlow: number;
  cumulativeBalance: number;
  confidence: number;
}

export interface ForecastSummary {
  startDate: Date;
  endDate: Date;
  currency: string;
  currentBalance: number;
  totalExpectedIncome: number;
  totalExpectedExpenses: number;
  netForecast: number;
  lowestBalance: number;
  lowestBalanceDate: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  forecasts: CashFlowForecast[];
  insights: string[];
}

export interface HistoricalPattern {
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  seasonalFactors: number[];
  growthRate: number;
  volatility: number;
}

@Injectable()
export class CashFlowForecastService {
  private readonly logger = new Logger(CashFlowForecastService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate cash flow forecast for an organization
   */
  async generateForecast(
    organizationId: string,
    userId: string,
    months: number = 3,
    startingBalance: number = 0,
  ): Promise<ForecastSummary> {
    this.logger.log(`Generating ${months}-month cash flow forecast for org ${organizationId}`);

    // Get historical data
    const historicalPattern = await this.analyzeHistoricalPatterns(organizationId, userId);

    // Get scheduled/expected transactions
    const expectedIncome = await this.getExpectedIncome(organizationId);
    const expectedExpenses = await this.getExpectedExpenses(organizationId);
    const recurringInvoices = await this.getRecurringInvoicesForecast(organizationId, months);

    // Generate forecasts
    const forecasts: CashFlowForecast[] = [];
    let cumulativeBalance = startingBalance;
    let lowestBalance = startingBalance;
    let lowestBalanceDate = new Date();

    const startDate = new Date();
    startDate.setDate(1); // Start from 1st of current month
    startDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      const monthIndex = forecastDate.getMonth();
      const seasonalFactor = historicalPattern.seasonalFactors[monthIndex] || 1;

      // Calculate expected income for this month
      let monthlyIncome = historicalPattern.averageMonthlyIncome * seasonalFactor;

      // Add scheduled receivables
      const scheduledIncome = expectedIncome
        .filter(inv => {
          const dueDate = new Date(inv.dueDate);
          return dueDate.getMonth() === monthIndex && dueDate.getFullYear() === forecastDate.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.amount, 0);

      // Add recurring invoice income
      const recurringIncome = recurringInvoices
        .filter(ri => {
          const date = new Date(ri.nextRunDate);
          return date.getMonth() === monthIndex && date.getFullYear() === forecastDate.getFullYear();
        })
        .reduce((sum, ri) => sum + ri.amount, 0);

      monthlyIncome = Math.max(monthlyIncome, scheduledIncome + recurringIncome);

      // Calculate expected expenses for this month
      let monthlyExpenses = historicalPattern.averageMonthlyExpenses * seasonalFactor;

      // Add scheduled payables
      const scheduledExpenses = expectedExpenses
        .filter(inv => {
          const dueDate = new Date(inv.dueDate);
          return dueDate.getMonth() === monthIndex && dueDate.getFullYear() === forecastDate.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.amount, 0);

      monthlyExpenses = Math.max(monthlyExpenses, scheduledExpenses);

      // Calculate net cash flow
      const netCashFlow = monthlyIncome - monthlyExpenses;
      cumulativeBalance += netCashFlow;

      // Track lowest balance
      if (cumulativeBalance < lowestBalance) {
        lowestBalance = cumulativeBalance;
        lowestBalanceDate = forecastDate;
      }

      // Calculate confidence based on data availability
      const confidence = this.calculateConfidence(
        historicalPattern,
        scheduledIncome + recurringIncome,
        scheduledExpenses,
        i,
      );

      forecasts.push({
        period: forecastDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }),
        date: forecastDate,
        expectedIncome: Math.round(monthlyIncome * 100) / 100,
        expectedExpenses: Math.round(monthlyExpenses * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        cumulativeBalance: Math.round(cumulativeBalance * 100) / 100,
        confidence: Math.round(confidence * 100),
      });
    }

    // Calculate totals
    const totalExpectedIncome = forecasts.reduce((sum, f) => sum + f.expectedIncome, 0);
    const totalExpectedExpenses = forecasts.reduce((sum, f) => sum + f.expectedExpenses, 0);
    const netForecast = totalExpectedIncome - totalExpectedExpenses;

    // Determine risk level
    const riskLevel = this.determineRiskLevel(lowestBalance, startingBalance, historicalPattern);

    // Generate insights
    const insights = this.generateInsights(
      forecasts,
      historicalPattern,
      lowestBalance,
      riskLevel,
      recurringInvoices.length,
    );

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months - 1);

    return {
      startDate,
      endDate,
      currency: 'RON',
      currentBalance: startingBalance,
      totalExpectedIncome: Math.round(totalExpectedIncome * 100) / 100,
      totalExpectedExpenses: Math.round(totalExpectedExpenses * 100) / 100,
      netForecast: Math.round(netForecast * 100) / 100,
      lowestBalance: Math.round(lowestBalance * 100) / 100,
      lowestBalanceDate,
      riskLevel,
      forecasts,
      insights,
    };
  }

  /**
   * Analyze historical patterns from past transactions
   */
  private async analyzeHistoricalPatterns(
    organizationId: string,
    userId: string,
  ): Promise<HistoricalPattern> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get historical invoices
    const issuedInvoices = await this.prisma.invoice.findMany({
      where: {
        OR: [
          { organizationId },
          { userId },
        ],
        type: 'ISSUED',
        invoiceDate: { gte: twelveMonthsAgo },
      },
      select: {
        invoiceDate: true,
        grossAmount: true,
        paidAmount: true,
        paymentStatus: true,
      },
    });

    const receivedInvoices = await this.prisma.invoice.findMany({
      where: {
        OR: [
          { organizationId },
          { userId },
        ],
        type: 'RECEIVED',
        invoiceDate: { gte: twelveMonthsAgo },
      },
      select: {
        invoiceDate: true,
        grossAmount: true,
        paidAmount: true,
        paymentStatus: true,
      },
    });

    // Calculate monthly averages
    const monthlyIncome: number[] = new Array(12).fill(0);
    const monthlyExpenses: number[] = new Array(12).fill(0);
    const monthCounts: number[] = new Array(12).fill(0);

    issuedInvoices.forEach(inv => {
      const month = new Date(inv.invoiceDate).getMonth();
      monthlyIncome[month] += Number(inv.grossAmount);
      monthCounts[month]++;
    });

    receivedInvoices.forEach(inv => {
      const month = new Date(inv.invoiceDate).getMonth();
      monthlyExpenses[month] += Number(inv.grossAmount);
    });

    // Calculate averages
    const totalIncome = monthlyIncome.reduce((a, b) => a + b, 0);
    const totalExpenses = monthlyExpenses.reduce((a, b) => a + b, 0);
    const monthsWithData = monthCounts.filter(c => c > 0).length || 1;

    const avgMonthlyIncome = totalIncome / monthsWithData;
    const avgMonthlyExpenses = totalExpenses / monthsWithData;

    // Calculate seasonal factors (how each month compares to average)
    const seasonalFactors = monthlyIncome.map(income =>
      avgMonthlyIncome > 0 ? income / avgMonthlyIncome : 1
    );

    // Normalize seasonal factors
    const avgFactor = seasonalFactors.reduce((a, b) => a + b, 0) / 12;
    const normalizedFactors = seasonalFactors.map(f =>
      avgFactor > 0 ? f / avgFactor : 1
    );

    // Calculate growth rate (compare last 6 months to previous 6 months)
    const recentIncome = issuedInvoices
      .filter(inv => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(inv.invoiceDate) >= sixMonthsAgo;
      })
      .reduce((sum, inv) => sum + Number(inv.grossAmount), 0);

    const olderIncome = issuedInvoices
      .filter(inv => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const date = new Date(inv.invoiceDate);
        return date >= twelveMonthsAgo && date < sixMonthsAgo;
      })
      .reduce((sum, inv) => sum + Number(inv.grossAmount), 0);

    const growthRate = olderIncome > 0
      ? ((recentIncome - olderIncome) / olderIncome)
      : 0;

    // Calculate volatility (standard deviation of monthly income)
    const incomeValues = monthlyIncome.filter(v => v > 0);
    const meanIncome = incomeValues.length > 0
      ? incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length
      : 0;
    const variance = incomeValues.length > 0
      ? incomeValues.reduce((sum, val) => sum + Math.pow(val - meanIncome, 2), 0) / incomeValues.length
      : 0;
    const volatility = meanIncome > 0 ? Math.sqrt(variance) / meanIncome : 0;

    return {
      averageMonthlyIncome: avgMonthlyIncome,
      averageMonthlyExpenses: avgMonthlyExpenses,
      seasonalFactors: normalizedFactors,
      growthRate,
      volatility,
    };
  }

  /**
   * Get expected income from unpaid issued invoices
   */
  private async getExpectedIncome(organizationId: string): Promise<{ dueDate: Date; amount: number }[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        type: 'ISSUED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { not: null },
      },
      select: {
        dueDate: true,
        grossAmount: true,
        paidAmount: true,
      },
    });

    return invoices.map(inv => ({
      dueDate: inv.dueDate!,
      amount: Number(inv.grossAmount) - Number(inv.paidAmount || 0),
    }));
  }

  /**
   * Get expected expenses from unpaid received invoices
   */
  private async getExpectedExpenses(organizationId: string): Promise<{ dueDate: Date; amount: number }[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        type: 'RECEIVED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { not: null },
      },
      select: {
        dueDate: true,
        grossAmount: true,
        paidAmount: true,
      },
    });

    return invoices.map(inv => ({
      dueDate: inv.dueDate!,
      amount: Number(inv.grossAmount) - Number(inv.paidAmount || 0),
    }));
  }

  /**
   * Get recurring invoices forecast
   */
  private async getRecurringInvoicesForecast(
    organizationId: string,
    months: number,
  ): Promise<{ nextRunDate: Date; amount: number }[]> {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const recurringInvoices = await this.prisma.recurringInvoice.findMany({
      where: {
        organizationId,
        isActive: true,
        nextRunDate: { lte: endDate },
      },
      select: {
        nextRunDate: true,
        items: true,
        vatRate: true,
      },
    });

    return recurringInvoices.map(ri => {
      const items = typeof ri.items === 'string' ? JSON.parse(ri.items) : ri.items;
      const netAmount = Array.isArray(items)
        ? items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
        : 0;
      const grossAmount = netAmount * (1 + Number(ri.vatRate) / 100);

      return {
        nextRunDate: ri.nextRunDate,
        amount: grossAmount,
      };
    });
  }

  /**
   * Calculate confidence level for forecast
   */
  private calculateConfidence(
    historicalPattern: HistoricalPattern,
    scheduledIncome: number,
    scheduledExpenses: number,
    monthsAhead: number,
  ): number {
    let confidence = 1.0;

    // Reduce confidence for higher volatility
    confidence -= historicalPattern.volatility * 0.3;

    // Reduce confidence for months further ahead
    confidence -= monthsAhead * 0.05;

    // Increase confidence if we have scheduled transactions
    if (scheduledIncome > 0 || scheduledExpenses > 0) {
      confidence += 0.1;
    }

    // Ensure confidence is between 0.3 and 0.95
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Determine risk level based on forecast
   */
  private determineRiskLevel(
    lowestBalance: number,
    startingBalance: number,
    pattern: HistoricalPattern,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (lowestBalance < 0) {
      return 'critical';
    }

    const cushionRatio = lowestBalance / (pattern.averageMonthlyExpenses || 1);

    if (cushionRatio < 0.5) {
      return 'high';
    } else if (cushionRatio < 1.5) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate insights from forecast data
   */
  private generateInsights(
    forecasts: CashFlowForecast[],
    pattern: HistoricalPattern,
    lowestBalance: number,
    riskLevel: string,
    recurringInvoicesCount: number,
  ): string[] {
    const insights: string[] = [];

    // Risk level insight
    switch (riskLevel) {
      case 'critical':
        insights.push('ATENȚIE: Prognoza indică un sold negativ. Este necesară acțiune imediată pentru a evita probleme de lichiditate.');
        break;
      case 'high':
        insights.push('Risc ridicat: Soldul prognozat este sub rezerva de siguranță recomandată (o lună de cheltuieli).');
        break;
      case 'medium':
        insights.push('Risc moderat: Monitorizați încasările și plățile pentru a menține un sold sănătos.');
        break;
      case 'low':
        insights.push('Poziție financiară stabilă: Cash flow-ul prognozat este pozitiv cu rezervă adecvată.');
        break;
    }

    // Growth insight
    if (pattern.growthRate > 0.1) {
      insights.push(`Tendință pozitivă: Veniturile au crescut cu ${Math.round(pattern.growthRate * 100)}% în ultimele 6 luni.`);
    } else if (pattern.growthRate < -0.1) {
      insights.push(`Atenție: Veniturile au scăzut cu ${Math.abs(Math.round(pattern.growthRate * 100))}% în ultimele 6 luni.`);
    }

    // Volatility insight
    if (pattern.volatility > 0.3) {
      insights.push('Venituri volatile: Recomandăm menținerea unei rezerve mai mari pentru perioade cu încasări mai mici.');
    }

    // Recurring invoices insight
    if (recurringInvoicesCount > 0) {
      insights.push(`Venituri recurente: ${recurringInvoicesCount} facturi recurente active contribuie la stabilitatea veniturilor.`);
    }

    // Lowest balance month
    const lowestMonth = forecasts.find(f => f.cumulativeBalance === lowestBalance);
    if (lowestMonth && lowestBalance < pattern.averageMonthlyExpenses) {
      insights.push(`Luna ${lowestMonth.period} necesită atenție specială datorită soldului scăzut prognozat.`);
    }

    // Expense ratio insight
    const expenseRatio = pattern.averageMonthlyExpenses / (pattern.averageMonthlyIncome || 1);
    if (expenseRatio > 0.9) {
      insights.push('Marja de profit scăzută: Cheltuielile reprezintă peste 90% din venituri.');
    } else if (expenseRatio < 0.6) {
      insights.push('Marjă de profit sănătoasă: Cheltuielile sunt sub 60% din venituri.');
    }

    return insights;
  }

  /**
   * Get forecast summary for dashboard widget
   */
  async getDashboardForecast(
    organizationId: string,
    userId: string,
  ): Promise<{
    nextMonthIncome: number;
    nextMonthExpenses: number;
    nextMonthNet: number;
    riskLevel: string;
    trend: 'up' | 'down' | 'stable';
  }> {
    const forecast = await this.generateForecast(organizationId, userId, 2);

    const nextMonth = forecast.forecasts[0];
    const currentMonth = forecast.forecasts[1];

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (nextMonth && currentMonth) {
      const change = nextMonth.netCashFlow - currentMonth.netCashFlow;
      if (change > 1000) trend = 'up';
      else if (change < -1000) trend = 'down';
    }

    return {
      nextMonthIncome: nextMonth?.expectedIncome || 0,
      nextMonthExpenses: nextMonth?.expectedExpenses || 0,
      nextMonthNet: nextMonth?.netCashFlow || 0,
      riskLevel: forecast.riskLevel,
      trend,
    };
  }
}
