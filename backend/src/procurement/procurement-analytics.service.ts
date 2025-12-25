import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Analytics Types
export interface DateRange {
  from: Date;
  to: Date;
}

export interface ProcurementKPIs {
  totalSpend: number;
  totalOrders: number;
  averageOrderValue: number;
  totalSuppliers: number;
  onTimeDeliveryRate: number;
  qualityAcceptanceRate: number;
  costSavings: number;
  costSavingsPercentage: number;
  requisitionCycleTime: number;
  poProcessingTime: number;
  maverick_spend_percentage: number;
}

export interface SpendAnalysis {
  totalSpend: number;
  byCategory: SpendByCategory[];
  bySupplier: SpendBySupplier[];
  byDepartment: SpendByDepartment[];
  byCostCenter: SpendByCostCenter[];
  byMonth: SpendByMonth[];
  topItems: SpendItem[];
  trends: SpendTrend;
}

export interface SpendByCategory {
  category: string;
  amount: number;
  percentage: number;
  orderCount: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}

export interface SpendBySupplier {
  supplierId: string;
  supplierName: string;
  amount: number;
  percentage: number;
  orderCount: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
}

export interface SpendByDepartment {
  department: string;
  amount: number;
  percentage: number;
  budget: number;
  budgetUtilization: number;
  orderCount: number;
}

export interface SpendByCostCenter {
  costCenter: string;
  costCenterName: string;
  amount: number;
  percentage: number;
  budget: number;
  variance: number;
}

export interface SpendByMonth {
  month: string;
  year: number;
  amount: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface SpendItem {
  itemId?: string;
  itemCode?: string;
  description: string;
  category: string;
  totalSpend: number;
  quantity: number;
  averageUnitPrice: number;
  orderCount: number;
}

export interface SpendTrend {
  currentPeriod: number;
  previousPeriod: number;
  changeAmount: number;
  changePercentage: number;
  forecast: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  metrics: {
    qualityScore: number;
    deliveryScore: number;
    priceScore: number;
    serviceScore: number;
    complianceScore: number;
  };
  statistics: {
    totalOrders: number;
    totalValue: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    rejectedItems: number;
    acceptedItems: number;
    averageLeadTime: number;
    priceVariance: number;
  };
  history: SupplierHistoryEntry[];
  ranking: number;
  tier: 'strategic' | 'preferred' | 'approved' | 'under_review';
}

export interface SupplierHistoryEntry {
  month: string;
  year: number;
  orderCount: number;
  totalValue: number;
  qualityScore: number;
  deliveryScore: number;
}

export interface ProcurementReport {
  id: string;
  tenantId: string;
  reportType: ReportType;
  title: string;
  dateRange: DateRange;
  generatedAt: Date;
  generatedBy: string;
  format: 'json' | 'pdf' | 'excel';
  data: any;
  filters?: Record<string, any>;
  summary: ReportSummary;
}

export enum ReportType {
  SPEND_ANALYSIS = 'spend_analysis',
  SUPPLIER_PERFORMANCE = 'supplier_performance',
  PURCHASE_ORDER_STATUS = 'purchase_order_status',
  REQUISITION_ANALYSIS = 'requisition_analysis',
  SAVINGS_REPORT = 'savings_report',
  COMPLIANCE_REPORT = 'compliance_report',
  BUDGET_VS_ACTUAL = 'budget_vs_actual',
  LEAD_TIME_ANALYSIS = 'lead_time_analysis',
}

export interface ReportSummary {
  highlights: string[];
  keyMetrics: { name: string; value: number | string; trend?: string }[];
  recommendations: string[];
}

export interface SavingsAnalysis {
  totalSavings: number;
  savingsByType: {
    negotiation: number;
    consolidation: number;
    alternativeProducts: number;
    processImprovement: number;
    contractual: number;
  };
  savingsByCategory: { category: string; savings: number; percentage: number }[];
  savingsBySupplier: { supplierId: string; supplierName: string; savings: number }[];
  savingsTrend: { month: string; savings: number }[];
  potentialSavings: {
    opportunity: string;
    estimatedSavings: number;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface ComplianceMetrics {
  overallComplianceRate: number;
  policyAdherence: number;
  contractCompliance: number;
  approvalWorkflowCompliance: number;
  maverickSpend: {
    amount: number;
    percentage: number;
    transactions: number;
  };
  violations: ComplianceViolation[];
  riskAreas: RiskArea[];
}

export interface ComplianceViolation {
  id: string;
  type: 'policy' | 'approval' | 'contract' | 'budget';
  description: string;
  amount: number;
  date: Date;
  department?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved' | 'waived';
}

export interface RiskArea {
  area: string;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  mitigationActions: string[];
}

export interface DashboardData {
  kpis: ProcurementKPIs;
  spendSummary: {
    totalSpend: number;
    budgetRemaining: number;
    budgetUtilization: number;
    monthOverMonthChange: number;
  };
  recentActivity: ActivityItem[];
  pendingActions: PendingAction[];
  topSuppliers: SpendBySupplier[];
  categoryBreakdown: SpendByCategory[];
  alerts: Alert[];
}

export interface ActivityItem {
  id: string;
  type: 'requisition' | 'po' | 'receipt' | 'invoice' | 'approval';
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
  amount?: number;
  status: string;
}

export interface PendingAction {
  id: string;
  type: 'approval' | 'receipt' | 'inspection' | 'payment';
  description: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  amount?: number;
  assignedTo?: string;
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  actionRequired: boolean;
  link?: string;
}

@Injectable()
export class ProcurementAnalyticsService {
  // In-memory storage for demo - in production would query actual data
  private spendData = new Map<string, any>();
  private supplierMetrics = new Map<string, SupplierPerformance>();
  private reports = new Map<string, ProcurementReport>();

  constructor(private eventEmitter: EventEmitter2) {}

  // KPIs
  async getKPIs(tenantId: string, dateRange: DateRange): Promise<ProcurementKPIs> {
    // Calculate KPIs from procurement data
    const totalSpend = await this.calculateTotalSpend(tenantId, dateRange);
    const totalOrders = await this.countOrders(tenantId, dateRange);
    const suppliers = await this.countActiveSuppliers(tenantId, dateRange);

    return {
      totalSpend,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalSpend / totalOrders : 0,
      totalSuppliers: suppliers,
      onTimeDeliveryRate: 92.5, // Would calculate from actual delivery data
      qualityAcceptanceRate: 97.8, // Would calculate from inspection data
      costSavings: totalSpend * 0.08, // Example: 8% savings
      costSavingsPercentage: 8,
      requisitionCycleTime: 3.2, // Average days
      poProcessingTime: 1.5, // Average days
      maverick_spend_percentage: 5.2, // Spend outside contracts/catalogs
    };
  }

  // Spend Analysis
  async getSpendAnalysis(
    tenantId: string,
    dateRange: DateRange,
    filters?: { category?: string; supplierId?: string; department?: string },
  ): Promise<SpendAnalysis> {
    const totalSpend = await this.calculateTotalSpend(tenantId, dateRange);

    // Generate spend breakdown - in production would query actual data
    const byCategory = this.generateCategoryBreakdown(totalSpend);
    const bySupplier = this.generateSupplierBreakdown(totalSpend);
    const byMonth = this.generateMonthlyBreakdown(totalSpend, dateRange);

    return {
      totalSpend,
      byCategory,
      bySupplier,
      byDepartment: [
        {
          department: 'IT',
          amount: totalSpend * 0.35,
          percentage: 35,
          budget: totalSpend * 0.4,
          budgetUtilization: 87.5,
          orderCount: 45,
        },
        {
          department: 'Operations',
          amount: totalSpend * 0.30,
          percentage: 30,
          budget: totalSpend * 0.35,
          budgetUtilization: 85.7,
          orderCount: 67,
        },
        {
          department: 'HR',
          amount: totalSpend * 0.15,
          percentage: 15,
          budget: totalSpend * 0.15,
          budgetUtilization: 100,
          orderCount: 23,
        },
        {
          department: 'Marketing',
          amount: totalSpend * 0.12,
          percentage: 12,
          budget: totalSpend * 0.1,
          budgetUtilization: 120,
          orderCount: 18,
        },
        {
          department: 'Finance',
          amount: totalSpend * 0.08,
          percentage: 8,
          budget: totalSpend * 0.1,
          budgetUtilization: 80,
          orderCount: 12,
        },
      ],
      byCostCenter: [
        {
          costCenter: 'CC001',
          costCenterName: 'General Operations',
          amount: totalSpend * 0.4,
          percentage: 40,
          budget: totalSpend * 0.45,
          variance: -5,
        },
        {
          costCenter: 'CC002',
          costCenterName: 'Technology',
          amount: totalSpend * 0.35,
          percentage: 35,
          budget: totalSpend * 0.35,
          variance: 0,
        },
        {
          costCenter: 'CC003',
          costCenterName: 'Administrative',
          amount: totalSpend * 0.25,
          percentage: 25,
          budget: totalSpend * 0.2,
          variance: 5,
        },
      ],
      byMonth,
      topItems: [
        {
          itemCode: 'LAPTOP-001',
          description: 'Laptop Computer',
          category: 'IT Equipment',
          totalSpend: totalSpend * 0.15,
          quantity: 50,
          averageUnitPrice: (totalSpend * 0.15) / 50,
          orderCount: 12,
        },
        {
          itemCode: 'MONITOR-001',
          description: 'Monitor 27"',
          category: 'IT Equipment',
          totalSpend: totalSpend * 0.08,
          quantity: 80,
          averageUnitPrice: (totalSpend * 0.08) / 80,
          orderCount: 15,
        },
        {
          itemCode: 'OFFICE-SUPP',
          description: 'Office Supplies',
          category: 'General Supplies',
          totalSpend: totalSpend * 0.06,
          quantity: 200,
          averageUnitPrice: (totalSpend * 0.06) / 200,
          orderCount: 24,
        },
      ],
      trends: {
        currentPeriod: totalSpend,
        previousPeriod: totalSpend * 0.92,
        changeAmount: totalSpend * 0.08,
        changePercentage: 8.7,
        forecast: totalSpend * 1.05,
      },
    };
  }

  // Supplier Performance
  async getSupplierPerformance(
    tenantId: string,
    dateRange: DateRange,
    supplierId?: string,
  ): Promise<SupplierPerformance[]> {
    // Generate supplier performance data
    const suppliers: SupplierPerformance[] = [
      {
        supplierId: 'supplier_001',
        supplierName: 'Office Depot',
        overallScore: 92,
        metrics: {
          qualityScore: 95,
          deliveryScore: 90,
          priceScore: 88,
          serviceScore: 94,
          complianceScore: 93,
        },
        statistics: {
          totalOrders: 45,
          totalValue: 150000,
          onTimeDeliveries: 42,
          lateDeliveries: 3,
          rejectedItems: 5,
          acceptedItems: 445,
          averageLeadTime: 5.2,
          priceVariance: -2.5,
        },
        history: this.generateSupplierHistory(),
        ranking: 1,
        tier: 'strategic',
      },
      {
        supplierId: 'supplier_002',
        supplierName: 'Tech Solutions',
        overallScore: 88,
        metrics: {
          qualityScore: 92,
          deliveryScore: 85,
          priceScore: 90,
          serviceScore: 86,
          complianceScore: 88,
        },
        statistics: {
          totalOrders: 32,
          totalValue: 280000,
          onTimeDeliveries: 27,
          lateDeliveries: 5,
          rejectedItems: 12,
          acceptedItems: 188,
          averageLeadTime: 8.5,
          priceVariance: 1.2,
        },
        history: this.generateSupplierHistory(),
        ranking: 2,
        tier: 'preferred',
      },
      {
        supplierId: 'supplier_003',
        supplierName: 'Industrial Supply Co',
        overallScore: 85,
        metrics: {
          qualityScore: 88,
          deliveryScore: 82,
          priceScore: 85,
          serviceScore: 84,
          complianceScore: 86,
        },
        statistics: {
          totalOrders: 28,
          totalValue: 95000,
          onTimeDeliveries: 23,
          lateDeliveries: 5,
          rejectedItems: 8,
          acceptedItems: 272,
          averageLeadTime: 7.3,
          priceVariance: 3.5,
        },
        history: this.generateSupplierHistory(),
        ranking: 3,
        tier: 'approved',
      },
    ];

    if (supplierId) {
      return suppliers.filter((s) => s.supplierId === supplierId);
    }

    return suppliers;
  }

  // Savings Analysis
  async getSavingsAnalysis(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<SavingsAnalysis> {
    const totalSpend = await this.calculateTotalSpend(tenantId, dateRange);
    const totalSavings = totalSpend * 0.08;

    return {
      totalSavings,
      savingsByType: {
        negotiation: totalSavings * 0.35,
        consolidation: totalSavings * 0.25,
        alternativeProducts: totalSavings * 0.15,
        processImprovement: totalSavings * 0.15,
        contractual: totalSavings * 0.10,
      },
      savingsByCategory: [
        { category: 'IT Equipment', savings: totalSavings * 0.30, percentage: 30 },
        { category: 'Office Supplies', savings: totalSavings * 0.25, percentage: 25 },
        { category: 'Services', savings: totalSavings * 0.20, percentage: 20 },
        { category: 'Raw Materials', savings: totalSavings * 0.15, percentage: 15 },
        { category: 'Other', savings: totalSavings * 0.10, percentage: 10 },
      ],
      savingsBySupplier: [
        { supplierId: 'supplier_001', supplierName: 'Office Depot', savings: totalSavings * 0.35 },
        { supplierId: 'supplier_002', supplierName: 'Tech Solutions', savings: totalSavings * 0.28 },
        { supplierId: 'supplier_003', supplierName: 'Industrial Supply', savings: totalSavings * 0.22 },
      ],
      savingsTrend: this.generateSavingsTrend(totalSavings, dateRange),
      potentialSavings: [
        {
          opportunity: 'Consolidate IT equipment suppliers',
          estimatedSavings: totalSpend * 0.03,
          priority: 'high',
        },
        {
          opportunity: 'Renegotiate office supplies contract',
          estimatedSavings: totalSpend * 0.02,
          priority: 'high',
        },
        {
          opportunity: 'Implement automated approval workflow',
          estimatedSavings: totalSpend * 0.015,
          priority: 'medium',
        },
        {
          opportunity: 'Volume discount on raw materials',
          estimatedSavings: totalSpend * 0.025,
          priority: 'medium',
        },
      ],
    };
  }

  // Compliance Report
  async getComplianceMetrics(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<ComplianceMetrics> {
    const totalSpend = await this.calculateTotalSpend(tenantId, dateRange);

    return {
      overallComplianceRate: 94.5,
      policyAdherence: 96.2,
      contractCompliance: 93.8,
      approvalWorkflowCompliance: 97.1,
      maverickSpend: {
        amount: totalSpend * 0.052,
        percentage: 5.2,
        transactions: 23,
      },
      violations: [
        {
          id: 'v_001',
          type: 'approval',
          description: 'PO created without proper approval',
          amount: 5000,
          date: new Date(),
          department: 'Marketing',
          severity: 'medium',
          status: 'resolved',
        },
        {
          id: 'v_002',
          type: 'budget',
          description: 'Budget exceeded for cost center CC003',
          amount: 12000,
          date: new Date(),
          department: 'Operations',
          severity: 'high',
          status: 'open',
        },
      ],
      riskAreas: [
        {
          area: 'Single Source Dependencies',
          riskLevel: 'medium',
          description: '3 critical items sourced from single supplier',
          mitigationActions: [
            'Identify alternative suppliers',
            'Negotiate backup contracts',
          ],
        },
        {
          area: 'Contract Renewals',
          riskLevel: 'high',
          description: '5 major contracts expiring in next 90 days',
          mitigationActions: [
            'Initiate renewal negotiations',
            'Review market pricing',
            'Assess supplier performance',
          ],
        },
      ],
    };
  }

  // Dashboard Data
  async getDashboardData(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<DashboardData> {
    const kpis = await this.getKPIs(tenantId, dateRange);
    const spendAnalysis = await this.getSpendAnalysis(tenantId, dateRange);

    return {
      kpis,
      spendSummary: {
        totalSpend: spendAnalysis.totalSpend,
        budgetRemaining: spendAnalysis.totalSpend * 0.15,
        budgetUtilization: 85,
        monthOverMonthChange: 8.7,
      },
      recentActivity: [
        {
          id: 'act_1',
          type: 'po',
          description: 'Purchase Order PO-2024-000123 created',
          timestamp: new Date(),
          userId: 'user_1',
          userName: 'John Doe',
          amount: 25000,
          status: 'approved',
        },
        {
          id: 'act_2',
          type: 'receipt',
          description: 'Goods Receipt GR-2024-000456 posted',
          timestamp: new Date(Date.now() - 3600000),
          userId: 'user_2',
          userName: 'Jane Smith',
          amount: 18500,
          status: 'completed',
        },
        {
          id: 'act_3',
          type: 'approval',
          description: 'Requisition PR-2024-000789 approved',
          timestamp: new Date(Date.now() - 7200000),
          userId: 'user_3',
          userName: 'Bob Wilson',
          amount: 8000,
          status: 'approved',
        },
      ],
      pendingActions: [
        {
          id: 'pa_1',
          type: 'approval',
          description: '3 requisitions pending approval',
          dueDate: new Date(Date.now() + 86400000),
          priority: 'high',
          amount: 45000,
        },
        {
          id: 'pa_2',
          type: 'receipt',
          description: '2 POs awaiting goods receipt',
          dueDate: new Date(Date.now() + 172800000),
          priority: 'medium',
          amount: 32000,
        },
        {
          id: 'pa_3',
          type: 'inspection',
          description: '1 goods receipt pending inspection',
          priority: 'high',
          amount: 15000,
        },
      ],
      topSuppliers: spendAnalysis.bySupplier.slice(0, 5),
      categoryBreakdown: spendAnalysis.byCategory,
      alerts: [
        {
          id: 'alert_1',
          type: 'warning',
          title: 'Budget Alert',
          message: 'Marketing department at 120% budget utilization',
          timestamp: new Date(),
          actionRequired: true,
          link: '/budget/marketing',
        },
        {
          id: 'alert_2',
          type: 'info',
          title: 'Contract Expiring',
          message: 'Office supplies contract expires in 30 days',
          timestamp: new Date(),
          actionRequired: true,
          link: '/contracts/office-supplies',
        },
      ],
    };
  }

  // Generate Report
  async generateReport(
    tenantId: string,
    reportType: ReportType,
    dateRange: DateRange,
    userId: string,
    filters?: Record<string, any>,
  ): Promise<ProcurementReport> {
    const id = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let data: any;
    let summary: ReportSummary;

    switch (reportType) {
      case ReportType.SPEND_ANALYSIS:
        data = await this.getSpendAnalysis(tenantId, dateRange, filters);
        summary = {
          highlights: [
            `Total spend: ${data.totalSpend.toLocaleString()} RON`,
            `Top category: ${data.byCategory[0]?.category} (${data.byCategory[0]?.percentage}%)`,
            `Month-over-month change: ${data.trends.changePercentage}%`,
          ],
          keyMetrics: [
            { name: 'Total Spend', value: data.totalSpend, trend: 'up' },
            { name: 'Top Category %', value: `${data.byCategory[0]?.percentage}%` },
            { name: 'Active Suppliers', value: data.bySupplier.length },
          ],
          recommendations: [
            'Consider consolidating suppliers in IT category',
            'Review budget allocation for Marketing department',
          ],
        };
        break;

      case ReportType.SUPPLIER_PERFORMANCE:
        data = await this.getSupplierPerformance(tenantId, dateRange);
        summary = {
          highlights: [
            `Top performer: ${data[0]?.supplierName} (${data[0]?.overallScore}%)`,
            `Average on-time delivery: ${data.reduce((sum: number, s: any) => sum + s.metrics.deliveryScore, 0) / data.length}%`,
          ],
          keyMetrics: [
            { name: 'Average Score', value: `${Math.round(data.reduce((sum: number, s: any) => sum + s.overallScore, 0) / data.length)}%` },
            { name: 'Strategic Suppliers', value: data.filter((s: any) => s.tier === 'strategic').length },
          ],
          recommendations: [
            'Schedule performance review with underperforming suppliers',
            'Consider upgrading preferred suppliers with high scores',
          ],
        };
        break;

      case ReportType.SAVINGS_REPORT:
        data = await this.getSavingsAnalysis(tenantId, dateRange);
        summary = {
          highlights: [
            `Total savings achieved: ${data.totalSavings.toLocaleString()} RON`,
            `Potential additional savings: ${data.potentialSavings.reduce((sum: number, p: any) => sum + p.estimatedSavings, 0).toLocaleString()} RON`,
          ],
          keyMetrics: [
            { name: 'Total Savings', value: data.totalSavings },
            { name: 'Savings Rate', value: '8%' },
          ],
          recommendations: data.potentialSavings.filter((p: any) => p.priority === 'high').map((p: any) => p.opportunity),
        };
        break;

      case ReportType.COMPLIANCE_REPORT:
        data = await this.getComplianceMetrics(tenantId, dateRange);
        summary = {
          highlights: [
            `Overall compliance: ${data.overallComplianceRate}%`,
            `Maverick spend: ${data.maverickSpend.percentage}%`,
            `Open violations: ${data.violations.filter((v: any) => v.status === 'open').length}`,
          ],
          keyMetrics: [
            { name: 'Compliance Rate', value: `${data.overallComplianceRate}%` },
            { name: 'Policy Adherence', value: `${data.policyAdherence}%` },
          ],
          recommendations: data.riskAreas.flatMap((r: any) => r.mitigationActions),
        };
        break;

      default:
        data = {};
        summary = { highlights: [], keyMetrics: [], recommendations: [] };
    }

    const report: ProcurementReport = {
      id,
      tenantId,
      reportType,
      title: this.getReportTitle(reportType),
      dateRange,
      generatedAt: new Date(),
      generatedBy: userId,
      format: 'json',
      data,
      filters,
      summary,
    };

    this.reports.set(id, report);

    this.eventEmitter.emit('procurement.report_generated', {
      tenantId,
      reportId: id,
      reportType,
    });

    return report;
  }

  async getReport(tenantId: string, reportId: string): Promise<ProcurementReport> {
    const report = this.reports.get(reportId);
    if (!report || report.tenantId !== tenantId) {
      throw new Error(`Report ${reportId} not found`);
    }
    return report;
  }

  // Helper Methods
  private async calculateTotalSpend(tenantId: string, dateRange: DateRange): Promise<number> {
    // In production, would aggregate from actual PO data
    return 500000;
  }

  private async countOrders(tenantId: string, dateRange: DateRange): Promise<number> {
    return 165;
  }

  private async countActiveSuppliers(tenantId: string, dateRange: DateRange): Promise<number> {
    return 24;
  }

  private generateCategoryBreakdown(totalSpend: number): SpendByCategory[] {
    return [
      { category: 'IT Equipment', amount: totalSpend * 0.35, percentage: 35, orderCount: 45, trend: 'up', changePercentage: 12 },
      { category: 'Office Supplies', amount: totalSpend * 0.20, percentage: 20, orderCount: 67, trend: 'stable', changePercentage: 2 },
      { category: 'Services', amount: totalSpend * 0.18, percentage: 18, orderCount: 23, trend: 'up', changePercentage: 8 },
      { category: 'Raw Materials', amount: totalSpend * 0.15, percentage: 15, orderCount: 18, trend: 'down', changePercentage: -5 },
      { category: 'Other', amount: totalSpend * 0.12, percentage: 12, orderCount: 12, trend: 'stable', changePercentage: 1 },
    ];
  }

  private generateSupplierBreakdown(totalSpend: number): SpendBySupplier[] {
    return [
      { supplierId: 's1', supplierName: 'Office Depot', amount: totalSpend * 0.25, percentage: 25, orderCount: 45, averageOrderValue: 2778, onTimeDeliveryRate: 93, qualityRating: 95 },
      { supplierId: 's2', supplierName: 'Tech Solutions', amount: totalSpend * 0.22, percentage: 22, orderCount: 32, averageOrderValue: 3438, onTimeDeliveryRate: 85, qualityRating: 92 },
      { supplierId: 's3', supplierName: 'Industrial Supply', amount: totalSpend * 0.18, percentage: 18, orderCount: 28, averageOrderValue: 3214, onTimeDeliveryRate: 82, qualityRating: 88 },
      { supplierId: 's4', supplierName: 'Global Materials', amount: totalSpend * 0.15, percentage: 15, orderCount: 35, averageOrderValue: 2143, onTimeDeliveryRate: 90, qualityRating: 90 },
      { supplierId: 's5', supplierName: 'Local Supplies', amount: totalSpend * 0.10, percentage: 10, orderCount: 25, averageOrderValue: 2000, onTimeDeliveryRate: 95, qualityRating: 85 },
    ];
  }

  private generateMonthlyBreakdown(totalSpend: number, dateRange: DateRange): SpendByMonth[] {
    const months: SpendByMonth[] = [];
    const monthlyAvg = totalSpend / 12;

    for (let i = 0; i < 12; i++) {
      const variance = (Math.random() - 0.5) * 0.3;
      const amount = monthlyAvg * (1 + variance);
      months.push({
        month: new Date(2024, i, 1).toLocaleString('default', { month: 'short' }),
        year: 2024,
        amount: Math.round(amount),
        orderCount: Math.round(14 + Math.random() * 10),
        averageOrderValue: Math.round(amount / (14 + Math.random() * 10)),
      });
    }

    return months;
  }

  private generateSupplierHistory(): SupplierHistoryEntry[] {
    const history: SupplierHistoryEntry[] = [];
    for (let i = 0; i < 12; i++) {
      history.push({
        month: new Date(2024, i, 1).toLocaleString('default', { month: 'short' }),
        year: 2024,
        orderCount: Math.round(3 + Math.random() * 5),
        totalValue: Math.round(10000 + Math.random() * 20000),
        qualityScore: Math.round(85 + Math.random() * 15),
        deliveryScore: Math.round(80 + Math.random() * 20),
      });
    }
    return history;
  }

  private generateSavingsTrend(
    totalSavings: number,
    dateRange: DateRange,
  ): { month: string; savings: number }[] {
    const trend: { month: string; savings: number }[] = [];
    const monthlySavings = totalSavings / 12;

    for (let i = 0; i < 12; i++) {
      const variance = (Math.random() - 0.5) * 0.4;
      trend.push({
        month: new Date(2024, i, 1).toLocaleString('default', { month: 'short' }),
        savings: Math.round(monthlySavings * (1 + variance)),
      });
    }

    return trend;
  }

  private getReportTitle(reportType: ReportType): string {
    const titles: Record<ReportType, string> = {
      [ReportType.SPEND_ANALYSIS]: 'Spend Analysis Report',
      [ReportType.SUPPLIER_PERFORMANCE]: 'Supplier Performance Report',
      [ReportType.PURCHASE_ORDER_STATUS]: 'Purchase Order Status Report',
      [ReportType.REQUISITION_ANALYSIS]: 'Requisition Analysis Report',
      [ReportType.SAVINGS_REPORT]: 'Cost Savings Report',
      [ReportType.COMPLIANCE_REPORT]: 'Procurement Compliance Report',
      [ReportType.BUDGET_VS_ACTUAL]: 'Budget vs Actual Report',
      [ReportType.LEAD_TIME_ANALYSIS]: 'Lead Time Analysis Report',
    };
    return titles[reportType] || 'Procurement Report';
  }
}
