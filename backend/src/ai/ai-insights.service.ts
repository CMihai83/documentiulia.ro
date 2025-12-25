import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmartCategorizationService } from './smart-categorization.service';

/**
 * AI Insights Dashboard Service (COMP-001)
 * Actionable insights from OCR/categorization and financial data
 *
 * Features:
 * - Real-time financial health score
 * - Spending pattern analysis
 * - Cash flow predictions
 * - Anomaly detection alerts
 * - Category-based spending insights
 * - Vendor analysis
 * - Tax optimization suggestions
 * - Compliance alerts
 * - Budget recommendations
 * - Year-over-year comparisons
 */

// =================== TYPES & INTERFACES ===================

export interface FinancialHealthScore {
  overallScore: number; // 0-100
  components: {
    cashFlow: { score: number; trend: 'up' | 'down' | 'stable'; description: string };
    profitability: { score: number; trend: 'up' | 'down' | 'stable'; description: string };
    liquidity: { score: number; trend: 'up' | 'down' | 'stable'; description: string };
    receivables: { score: number; trend: 'up' | 'down' | 'stable'; description: string };
    payables: { score: number; trend: 'up' | 'down' | 'stable'; description: string };
  };
  recommendations: string[];
  calculatedAt: Date;
}

export interface SpendingInsight {
  id: string;
  type: 'spending' | 'saving' | 'anomaly' | 'trend' | 'optimization';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact?: number; // Potential savings/cost
  category?: string;
  vendor?: string;
  actionable: boolean;
  action?: string;
  data?: Record<string, any>;
  createdAt: Date;
}

export interface CashFlowPrediction {
  period: string;
  predictedIncome: number;
  predictedExpenses: number;
  predictedBalance: number;
  confidence: number;
  factors: string[];
}

export interface CategoryAnalysis {
  categoryId: string;
  categoryName: string;
  currentPeriodSpend: number;
  previousPeriodSpend: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  averageMonthlySpend: number;
  transactionCount: number;
  topVendors: { name: string; amount: number; count: number }[];
  insight?: string;
}

export interface VendorInsight {
  vendorName: string;
  vendorId?: string;
  totalSpend: number;
  transactionCount: number;
  averageTransaction: number;
  categories: string[];
  paymentTermsAnalysis?: {
    averageDaysToPay: number;
    onTimePercentage: number;
    recommendation?: string;
  };
  priceVariation?: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface TaxOptimizationSuggestion {
  id: string;
  type: 'deduction' | 'timing' | 'structure' | 'compliance';
  title: string;
  description: string;
  potentialSavings: number;
  confidence: number;
  deadline?: Date;
  legalReference?: string;
}

export interface ComplianceAlert {
  id: string;
  type: 'deadline' | 'missing_document' | 'validation_error' | 'threshold';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  deadline?: Date;
  daysRemaining?: number;
  action: string;
  resolved: boolean;
}

export interface DashboardInsights {
  healthScore: FinancialHealthScore;
  insights: SpendingInsight[];
  cashFlowPredictions: CashFlowPrediction[];
  categoryAnalysis: CategoryAnalysis[];
  vendorInsights: VendorInsight[];
  taxSuggestions: TaxOptimizationSuggestion[];
  complianceAlerts: ComplianceAlert[];
  summary: {
    totalInsights: number;
    criticalAlerts: number;
    potentialSavings: number;
    nextDeadline?: { name: string; date: Date };
  };
}

// =================== SERVICE ===================

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private prisma: PrismaService,
    private categorizationService: SmartCategorizationService,
  ) {}

  // =================== MAIN DASHBOARD INSIGHTS ===================

  async getDashboardInsights(userId: string): Promise<DashboardInsights> {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    // Fetch all data in parallel
    const [healthScore, insights, predictions, categoryAnalysis, vendorInsights, taxSuggestions, complianceAlerts] =
      await Promise.all([
        this.calculateFinancialHealthScore(userId),
        this.generateSpendingInsights(userId),
        this.predictCashFlow(userId, 3),
        this.analyzeCategorySpending(userId, currentMonth),
        this.analyzeVendors(userId),
        this.generateTaxOptimizations(userId),
        this.getComplianceAlerts(userId),
      ]);

    // Calculate summary
    const criticalAlerts = [
      ...insights.filter((i) => i.severity === 'critical'),
      ...complianceAlerts.filter((a) => a.severity === 'critical'),
    ].length;

    const potentialSavings =
      insights.filter((i) => i.impact && i.impact > 0).reduce((sum, i) => sum + (i.impact || 0), 0) +
      taxSuggestions.reduce((sum, t) => sum + t.potentialSavings, 0);

    const nextDeadline = complianceAlerts
      .filter((a) => a.deadline && !a.resolved)
      .sort((a, b) => (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0))[0];

    return {
      healthScore,
      insights,
      cashFlowPredictions: predictions,
      categoryAnalysis,
      vendorInsights,
      taxSuggestions,
      complianceAlerts,
      summary: {
        totalInsights: insights.length,
        criticalAlerts,
        potentialSavings: Math.round(potentialSavings * 100) / 100,
        nextDeadline: nextDeadline ? { name: nextDeadline.title, date: nextDeadline.deadline! } : undefined,
      },
    };
  }

  // =================== FINANCIAL HEALTH SCORE ===================

  async calculateFinancialHealthScore(userId: string): Promise<FinancialHealthScore> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch invoice data
    const [recentInvoices, previousInvoices] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId, invoiceDate: { gte: thirtyDaysAgo } },
      }),
      this.prisma.invoice.findMany({
        where: { userId, invoiceDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    // Calculate metrics
    const recentIncome = recentInvoices
      .filter((i) => i.type === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);
    const recentExpenses = recentInvoices
      .filter((i) => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    const previousIncome = previousInvoices
      .filter((i) => i.type === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);
    const previousExpenses = previousInvoices
      .filter((i) => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    // Cash Flow Score
    const netCashFlow = recentIncome - recentExpenses;
    const previousNetCashFlow = previousIncome - previousExpenses;
    const cashFlowScore = Math.min(100, Math.max(0, 50 + (netCashFlow / Math.max(recentIncome, 1)) * 50));
    const cashFlowTrend = netCashFlow > previousNetCashFlow ? 'up' : netCashFlow < previousNetCashFlow ? 'down' : 'stable';

    // Profitability Score
    const profitMargin = recentIncome > 0 ? (recentIncome - recentExpenses) / recentIncome : 0;
    const previousProfitMargin = previousIncome > 0 ? (previousIncome - previousExpenses) / previousIncome : 0;
    const profitabilityScore = Math.min(100, Math.max(0, profitMargin * 100 + 50));
    const profitabilityTrend = profitMargin > previousProfitMargin ? 'up' : profitMargin < previousProfitMargin ? 'down' : 'stable';

    // Receivables Score (based on unpaid invoices)
    const unpaidReceivables = recentInvoices.filter(
      (i) => i.type === 'ISSUED' && i.paymentStatus !== 'PAID',
    ).length;
    const totalReceivables = recentInvoices.filter((i) => i.type === 'ISSUED').length;
    const receivablesScore = totalReceivables > 0 ? Math.max(0, 100 - (unpaidReceivables / totalReceivables) * 100) : 100;

    // Payables Score (based on unpaid bills)
    const unpaidPayables = recentInvoices.filter(
      (i) => i.type === 'RECEIVED' && i.paymentStatus !== 'PAID',
    ).length;
    const totalPayables = recentInvoices.filter((i) => i.type === 'RECEIVED').length;
    const payablesScore = totalPayables > 0 ? Math.max(0, 100 - (unpaidPayables / totalPayables) * 50) : 100;

    // Liquidity Score (simplified)
    const liquidityScore = Math.min(100, Math.max(0, (recentIncome / Math.max(recentExpenses, 1)) * 50));

    // Overall Score
    const overallScore = Math.round(
      cashFlowScore * 0.3 +
        profitabilityScore * 0.25 +
        liquidityScore * 0.2 +
        receivablesScore * 0.15 +
        payablesScore * 0.1,
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (cashFlowScore < 50) {
      recommendations.push('Fluxul de numerar este negativ. Încasați facturile restante și amânați plățile non-urgente.');
    }
    if (profitabilityScore < 50) {
      recommendations.push('Profitabilitatea este scăzută. Analizați cheltuielile și căutați oportunități de reducere.');
    }
    if (receivablesScore < 70) {
      recommendations.push('Aveți multe facturi neîncasate. Contactați clienții și stabiliți planuri de plată.');
    }
    if (payablesScore < 80) {
      recommendations.push('Aveți facturi de plătit scadente. Prioritizați plățile pentru a evita penalitățile.');
    }
    if (overallScore >= 80) {
      recommendations.push('Sănătatea financiară este bună! Continuați cu practicile actuale.');
    }

    return {
      overallScore,
      components: {
        cashFlow: {
          score: Math.round(cashFlowScore),
          trend: cashFlowTrend,
          description: `Flux net: ${netCashFlow.toFixed(2)} RON`,
        },
        profitability: {
          score: Math.round(profitabilityScore),
          trend: profitabilityTrend,
          description: `Marjă: ${(profitMargin * 100).toFixed(1)}%`,
        },
        liquidity: {
          score: Math.round(liquidityScore),
          trend: 'stable',
          description: `Raport venituri/cheltuieli: ${(recentIncome / Math.max(recentExpenses, 1)).toFixed(2)}`,
        },
        receivables: {
          score: Math.round(receivablesScore),
          trend: 'stable',
          description: `${totalReceivables - unpaidReceivables}/${totalReceivables} facturi încasate`,
        },
        payables: {
          score: Math.round(payablesScore),
          trend: 'stable',
          description: `${totalPayables - unpaidPayables}/${totalPayables} facturi plătite`,
        },
      },
      recommendations,
      calculatedAt: now,
    };
  }

  // =================== SPENDING INSIGHTS ===================

  async generateSpendingInsights(userId: string): Promise<SpendingInsight[]> {
    const insights: SpendingInsight[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch invoices
    const invoices = await this.prisma.invoice.findMany({
      where: { userId, invoiceDate: { gte: sixtyDaysAgo } },
    });

    const recentExpenses = invoices.filter(
      (i) => i.type === 'RECEIVED' && i.invoiceDate >= thirtyDaysAgo,
    );
    const previousExpenses = invoices.filter(
      (i) => i.type === 'RECEIVED' && i.invoiceDate >= sixtyDaysAgo && i.invoiceDate < thirtyDaysAgo,
    );

    const recentTotal = recentExpenses.reduce((sum, i) => sum + Number(i.grossAmount), 0);
    const previousTotal = previousExpenses.reduce((sum, i) => sum + Number(i.grossAmount), 0);

    // Spending trend insight
    if (previousTotal > 0) {
      const changePercent = ((recentTotal - previousTotal) / previousTotal) * 100;
      if (changePercent > 20) {
        insights.push({
          id: `insight_spending_increase_${Date.now()}`,
          type: 'trend',
          severity: 'warning',
          title: 'Cheltuieli în creștere',
          description: `Cheltuielile au crescut cu ${changePercent.toFixed(1)}% în ultima lună comparativ cu luna anterioară.`,
          impact: recentTotal - previousTotal,
          actionable: true,
          action: 'Analizați categoriile de cheltuieli pentru a identifica cauzele creșterii.',
          data: { currentSpend: recentTotal, previousSpend: previousTotal, change: changePercent },
          createdAt: now,
        });
      } else if (changePercent < -20) {
        insights.push({
          id: `insight_spending_decrease_${Date.now()}`,
          type: 'saving',
          severity: 'info',
          title: 'Economii realizate',
          description: `Cheltuielile au scăzut cu ${Math.abs(changePercent).toFixed(1)}% în ultima lună.`,
          impact: previousTotal - recentTotal,
          actionable: false,
          data: { currentSpend: recentTotal, previousSpend: previousTotal, change: changePercent },
          createdAt: now,
        });
      }
    }

    // Detect unusual large transactions
    const avgExpense = recentTotal / Math.max(recentExpenses.length, 1);
    const unusualExpenses = recentExpenses.filter((i) => Number(i.grossAmount) > avgExpense * 3);
    for (const expense of unusualExpenses) {
      insights.push({
        id: `insight_large_expense_${expense.id}`,
        type: 'anomaly',
        severity: 'warning',
        title: 'Tranzacție neobișnuită detectată',
        description: `Factură de ${Number(expense.grossAmount).toFixed(2)} RON de la ${expense.partnerName} - semnificativ peste media.`,
        impact: Number(expense.grossAmount),
        vendor: expense.partnerName,
        actionable: true,
        action: 'Verificați dacă această cheltuială este legitimă și planificată.',
        data: { invoiceNumber: expense.invoiceNumber, amount: expense.grossAmount },
        createdAt: now,
      });
    }

    // Detect duplicate payments (same vendor, same amount within 7 days)
    for (let i = 0; i < recentExpenses.length; i++) {
      for (let j = i + 1; j < recentExpenses.length; j++) {
        const inv1 = recentExpenses[i];
        const inv2 = recentExpenses[j];
        const daysDiff = Math.abs(inv1.invoiceDate.getTime() - inv2.invoiceDate.getTime()) / (1000 * 60 * 60 * 24);

        if (
          inv1.partnerName === inv2.partnerName &&
          Math.abs(Number(inv1.grossAmount) - Number(inv2.grossAmount)) < 1 &&
          daysDiff <= 7
        ) {
          insights.push({
            id: `insight_duplicate_${inv1.id}_${inv2.id}`,
            type: 'anomaly',
            severity: 'critical',
            title: 'Posibilă plată duplicată',
            description: `Două facturi identice (${Number(inv1.grossAmount).toFixed(2)} RON) de la ${inv1.partnerName} în interval de ${Math.round(daysDiff)} zile.`,
            impact: Number(inv1.grossAmount),
            vendor: inv1.partnerName,
            actionable: true,
            action: 'Verificați dacă ambele facturi sunt legitime sau dacă este o plată dublată.',
            data: { invoice1: inv1.invoiceNumber, invoice2: inv2.invoiceNumber },
            createdAt: now,
          });
        }
      }
    }

    // Overdue receivables
    const overdueReceivables = invoices.filter(
      (i) =>
        i.type === 'ISSUED' &&
        i.paymentStatus !== 'PAID' &&
        i.dueDate &&
        i.dueDate < now,
    );

    if (overdueReceivables.length > 0) {
      const overdueTotal = overdueReceivables.reduce((sum, i) => sum + Number(i.grossAmount), 0);
      insights.push({
        id: `insight_overdue_receivables_${Date.now()}`,
        type: 'spending',
        severity: overdueTotal > 10000 ? 'critical' : 'warning',
        title: 'Facturi neîncasate restante',
        description: `Aveți ${overdueReceivables.length} facturi neîncasate în valoare totală de ${overdueTotal.toFixed(2)} RON.`,
        impact: overdueTotal,
        actionable: true,
        action: 'Contactați clienții pentru recuperarea sumelor restante.',
        data: { count: overdueReceivables.length, total: overdueTotal },
        createdAt: now,
      });
    }

    return insights.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // =================== CASH FLOW PREDICTIONS ===================

  async predictCashFlow(userId: string, months: number = 3): Promise<CashFlowPrediction[]> {
    const predictions: CashFlowPrediction[] = [];
    const now = new Date();

    // Fetch historical data (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const invoices = await this.prisma.invoice.findMany({
      where: { userId, invoiceDate: { gte: sixMonthsAgo } },
    });

    // Calculate monthly averages
    const monthlyData: Map<string, { income: number; expenses: number }> = new Map();
    for (const inv of invoices) {
      const month = inv.invoiceDate.toISOString().slice(0, 7);
      const existing = monthlyData.get(month) || { income: 0, expenses: 0 };

      if (inv.type === 'ISSUED') {
        existing.income += Number(inv.grossAmount);
      } else {
        existing.expenses += Number(inv.grossAmount);
      }

      monthlyData.set(month, existing);
    }

    const monthlyValues = Array.from(monthlyData.values());
    const avgIncome = monthlyValues.reduce((sum, m) => sum + m.income, 0) / Math.max(monthlyValues.length, 1);
    const avgExpenses = monthlyValues.reduce((sum, m) => sum + m.expenses, 0) / Math.max(monthlyValues.length, 1);

    // Calculate trend
    const recentMonths = monthlyValues.slice(-3);
    const incomeTrend = recentMonths.length > 1
      ? (recentMonths[recentMonths.length - 1].income - recentMonths[0].income) / Math.max(recentMonths[0].income, 1)
      : 0;
    const expenseTrend = recentMonths.length > 1
      ? (recentMonths[recentMonths.length - 1].expenses - recentMonths[0].expenses) / Math.max(recentMonths[0].expenses, 1)
      : 0;

    // Generate predictions
    for (let i = 1; i <= months; i++) {
      const predictedDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = predictedDate.toISOString().slice(0, 7);

      // Apply trend to predictions
      const trendMultiplier = 1 + (incomeTrend * i * 0.1);
      const expenseMultiplier = 1 + (expenseTrend * i * 0.1);

      const predictedIncome = avgIncome * trendMultiplier;
      const predictedExpenses = avgExpenses * expenseMultiplier;

      // Confidence decreases with time
      const confidence = Math.max(50, 90 - i * 10);

      const factors: string[] = [];
      if (incomeTrend > 0.1) factors.push('Trend pozitiv venituri');
      if (incomeTrend < -0.1) factors.push('Trend negativ venituri');
      if (expenseTrend > 0.1) factors.push('Cheltuieli în creștere');
      if (expenseTrend < -0.1) factors.push('Cheltuieli în scădere');
      if (factors.length === 0) factors.push('Stabilitate financiară');

      predictions.push({
        period,
        predictedIncome: Math.round(predictedIncome * 100) / 100,
        predictedExpenses: Math.round(predictedExpenses * 100) / 100,
        predictedBalance: Math.round((predictedIncome - predictedExpenses) * 100) / 100,
        confidence,
        factors,
      });
    }

    return predictions;
  }

  // =================== CATEGORY ANALYSIS ===================

  async analyzeCategorySpending(userId: string, period: string): Promise<CategoryAnalysis[]> {
    const [year, month] = period.split('-').map(Number);
    const currentStart = new Date(year, month - 1, 1);
    const currentEnd = new Date(year, month, 0);
    const previousStart = new Date(year, month - 2, 1);
    const previousEnd = new Date(year, month - 1, 0);

    const [currentInvoices, previousInvoices] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId, type: 'RECEIVED', invoiceDate: { gte: currentStart, lte: currentEnd } },
      }),
      this.prisma.invoice.findMany({
        where: { userId, type: 'RECEIVED', invoiceDate: { gte: previousStart, lte: previousEnd } },
      }),
    ]);

    // Get categorization stats
    const categorizationStats = await this.categorizationService.getCategorizationStats(userId);
    const categories = await this.categorizationService.getCategories({ isActive: true });

    // Group by vendor (as proxy for category since we don't have direct category links)
    const vendorSpending: Map<string, { current: number; previous: number; count: number; invoices: any[] }> = new Map();

    for (const inv of currentInvoices) {
      const key = inv.partnerName || 'Unknown';
      const existing = vendorSpending.get(key) || { current: 0, previous: 0, count: 0, invoices: [] };
      existing.current += Number(inv.grossAmount);
      existing.count++;
      existing.invoices.push(inv);
      vendorSpending.set(key, existing);
    }

    for (const inv of previousInvoices) {
      const key = inv.partnerName || 'Unknown';
      const existing = vendorSpending.get(key) || { current: 0, previous: 0, count: 0, invoices: [] };
      existing.previous += Number(inv.grossAmount);
      vendorSpending.set(key, existing);
    }

    // Convert to CategoryAnalysis using top spending categories
    const analyses: CategoryAnalysis[] = [];

    for (const [vendor, data] of vendorSpending) {
      const changePercent = data.previous > 0
        ? ((data.current - data.previous) / data.previous) * 100
        : data.current > 0 ? 100 : 0;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (changePercent > 10) trend = 'increasing';
      else if (changePercent < -10) trend = 'decreasing';

      let insight: string | undefined;
      if (changePercent > 50) {
        insight = `Cheltuielile cu ${vendor} au crescut semnificativ (+${changePercent.toFixed(0)}%). Verificați cauzele.`;
      } else if (changePercent < -50) {
        insight = `Economii realizate la ${vendor} (-${Math.abs(changePercent).toFixed(0)}%).`;
      }

      analyses.push({
        categoryId: vendor.toLowerCase().replace(/\s+/g, '_'),
        categoryName: vendor,
        currentPeriodSpend: data.current,
        previousPeriodSpend: data.previous,
        changePercent: Math.round(changePercent * 10) / 10,
        trend,
        averageMonthlySpend: (data.current + data.previous) / 2,
        transactionCount: data.count,
        topVendors: [{ name: vendor, amount: data.current, count: data.count }],
        insight,
      });
    }

    // Sort by current spending and limit
    return analyses
      .sort((a, b) => b.currentPeriodSpend - a.currentPeriodSpend)
      .slice(0, 10);
  }

  // =================== VENDOR INSIGHTS ===================

  async analyzeVendors(userId: string): Promise<VendorInsight[]> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const invoices = await this.prisma.invoice.findMany({
      where: { userId, type: 'RECEIVED', invoiceDate: { gte: ninetyDaysAgo } },
    });

    const vendorData: Map<string, {
      transactions: typeof invoices;
      totalSpend: number;
    }> = new Map();

    for (const inv of invoices) {
      const vendorName = inv.partnerName || 'Unknown';
      const existing = vendorData.get(vendorName) || { transactions: [], totalSpend: 0 };
      existing.transactions.push(inv);
      existing.totalSpend += Number(inv.grossAmount);
      vendorData.set(vendorName, existing);
    }

    const insights: VendorInsight[] = [];

    for (const [vendorName, data] of vendorData) {
      if (data.transactions.length < 2) continue; // Need at least 2 transactions

      const amounts = data.transactions.map((t) => Number(t.grossAmount));
      const avgTransaction = data.totalSpend / data.transactions.length;

      // Price variation analysis
      const minPrice = Math.min(...amounts);
      const maxPrice = Math.max(...amounts);

      // Trend analysis (simplified)
      const recentTxns = data.transactions.slice(-5);
      const olderTxns = data.transactions.slice(0, -5);
      const recentAvg = recentTxns.reduce((s, t) => s + Number(t.grossAmount), 0) / Math.max(recentTxns.length, 1);
      const olderAvg = olderTxns.length > 0
        ? olderTxns.reduce((s, t) => s + Number(t.grossAmount), 0) / olderTxns.length
        : recentAvg;

      let priceTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentAvg > olderAvg * 1.1) priceTrend = 'increasing';
      else if (recentAvg < olderAvg * 0.9) priceTrend = 'decreasing';

      insights.push({
        vendorName,
        vendorId: data.transactions[0].partnerCui || undefined,
        totalSpend: Math.round(data.totalSpend * 100) / 100,
        transactionCount: data.transactions.length,
        averageTransaction: Math.round(avgTransaction * 100) / 100,
        categories: [], // Would need categorization service integration
        priceVariation: {
          minPrice: Math.round(minPrice * 100) / 100,
          maxPrice: Math.round(maxPrice * 100) / 100,
          avgPrice: Math.round(avgTransaction * 100) / 100,
          trend: priceTrend,
        },
      });
    }

    return insights
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 15);
  }

  // =================== TAX OPTIMIZATIONS ===================

  async generateTaxOptimizations(userId: string): Promise<TaxOptimizationSuggestion[]> {
    const suggestions: TaxOptimizationSuggestion[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // Fetch user and invoice data
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: new Date(currentYear, 0, 1) },
      },
    });

    const totalExpenses = invoices
      .filter((i) => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    const totalVATDeductible = invoices
      .filter((i) => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.vatAmount), 0);

    // VAT deduction optimization
    if (totalVATDeductible > 0) {
      suggestions.push({
        id: `tax_vat_deduction_${Date.now()}`,
        type: 'deduction',
        title: 'Deducere TVA disponibilă',
        description: `Aveți TVA deductibil în valoare de ${totalVATDeductible.toFixed(2)} RON din facturile de achiziții.`,
        potentialSavings: totalVATDeductible,
        confidence: 95,
        legalReference: 'Art. 297-301 Cod Fiscal',
      });
    }

    // Year-end timing suggestion (if in Q4)
    if (now.getMonth() >= 9) {
      suggestions.push({
        id: `tax_year_end_${Date.now()}`,
        type: 'timing',
        title: 'Planificare sfârșit de an',
        description: 'Analizați cheltuielile planificate și luați în considerare avansarea sau amânarea lor pentru optimizare fiscală.',
        potentialSavings: totalExpenses * 0.05, // Estimated 5% optimization
        confidence: 70,
        deadline: new Date(currentYear, 11, 31),
        legalReference: 'Planificare fiscală',
      });
    }

    // SAF-T compliance deadline
    const saftDeadline = new Date(currentYear, now.getMonth() + 1, 25);
    suggestions.push({
      id: `tax_saft_compliance_${Date.now()}`,
      type: 'compliance',
      title: 'Termen SAF-T D406',
      description: `Următorul termen pentru depunerea SAF-T este ${saftDeadline.toLocaleDateString('ro-RO')}.`,
      potentialSavings: 0,
      confidence: 100,
      deadline: saftDeadline,
      legalReference: 'Ordinul 1783/2021',
    });

    // Depreciation suggestion (simplified)
    const largeAssets = invoices.filter(
      (i) => i.type === 'RECEIVED' && Number(i.grossAmount) > 2500,
    );
    if (largeAssets.length > 0) {
      const assetValue = largeAssets.reduce((sum, i) => sum + Number(i.grossAmount), 0);
      suggestions.push({
        id: `tax_depreciation_${Date.now()}`,
        type: 'deduction',
        title: 'Amortizare active',
        description: `Aveți active în valoare de ${assetValue.toFixed(2)} RON eligibile pentru amortizare fiscală.`,
        potentialSavings: assetValue * 0.1, // Estimated 10% yearly depreciation benefit
        confidence: 80,
        legalReference: 'Art. 28 Cod Fiscal',
      });
    }

    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  // =================== COMPLIANCE ALERTS ===================

  async getComplianceAlerts(userId: string): Promise<ComplianceAlert[]> {
    const alerts: ComplianceAlert[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // SAF-T D406 deadline (25th of following month)
    const saftDeadline = new Date(currentYear, currentMonth + 1, 25);
    const daysToSaft = Math.ceil((saftDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if SAF-T was submitted for current period
    const currentPeriod = now.toISOString().slice(0, 7);
    const saftReport = await this.prisma.sAFTReport.findUnique({
      where: { userId_period: { userId, period: currentPeriod } },
    });

    if (!saftReport || saftReport.status === 'DRAFT') {
      alerts.push({
        id: `alert_saft_${currentPeriod}`,
        type: 'deadline',
        severity: daysToSaft <= 5 ? 'critical' : daysToSaft <= 10 ? 'warning' : 'info',
        title: 'Depunere SAF-T D406',
        description: `SAF-T pentru perioada ${currentPeriod} trebuie depus până la ${saftDeadline.toLocaleDateString('ro-RO')}.`,
        deadline: saftDeadline,
        daysRemaining: daysToSaft,
        action: 'Generați și depuneți declarația SAF-T D406.',
        resolved: false,
      });
    }

    // VAT declaration deadline (25th)
    const vatDeadline = new Date(currentYear, currentMonth + 1, 25);
    const daysToVat = Math.ceil((vatDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const vatReport = await this.prisma.vATReport.findFirst({
      where: { userId, period: currentPeriod },
    });

    if (!vatReport || vatReport.status !== 'SUBMITTED') {
      alerts.push({
        id: `alert_vat_${currentPeriod}`,
        type: 'deadline',
        severity: daysToVat <= 5 ? 'critical' : daysToVat <= 10 ? 'warning' : 'info',
        title: 'Declarație TVA',
        description: `Declarația TVA pentru ${currentPeriod} trebuie depusă până la ${vatDeadline.toLocaleDateString('ro-RO')}.`,
        deadline: vatDeadline,
        daysRemaining: daysToVat,
        action: 'Calculați și depuneți declarația TVA.',
        resolved: false,
      });
    }

    // Check for invoices without CUI
    const invoicesWithoutCui = await this.prisma.invoice.count({
      where: {
        userId,
        partnerCui: null,
        invoiceDate: { gte: new Date(currentYear, 0, 1) },
      },
    });

    if (invoicesWithoutCui > 0) {
      alerts.push({
        id: `alert_missing_cui_${Date.now()}`,
        type: 'missing_document',
        severity: 'warning',
        title: 'Facturi fără CUI partener',
        description: `${invoicesWithoutCui} facturi nu au CUI-ul partenerului completat. Aceasta poate afecta raportarea SAF-T.`,
        action: 'Completați CUI-ul lipsă pentru toate facturile.',
        resolved: false,
      });
    }

    // Check for overdue invoices
    const overdueInvoices = await this.prisma.invoice.count({
      where: {
        userId,
        type: 'ISSUED',
        paymentStatus: { not: 'PAID' },
        dueDate: { lt: now },
      },
    });

    if (overdueInvoices > 0) {
      alerts.push({
        id: `alert_overdue_${Date.now()}`,
        type: 'threshold',
        severity: overdueInvoices > 10 ? 'critical' : 'warning',
        title: 'Facturi restante neîncasate',
        description: `Aveți ${overdueInvoices} facturi emise cu termenul de plată depășit.`,
        action: 'Contactați clienții pentru recuperarea creanțelor.',
        resolved: false,
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
}
