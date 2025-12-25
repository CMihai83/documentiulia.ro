import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetManagementService, AssetCategory, AssetStatus, AssetCondition } from './asset-management.service';
import { AssetDepreciationService } from './asset-depreciation.service';
import { AssetMaintenanceService } from './asset-maintenance.service';
import { AssetLocationService } from './asset-location.service';

// =================== TYPES ===================

export type ReportType = 'asset_register' | 'depreciation' | 'maintenance' | 'valuation' | 'audit' | 'utilization' | 'insurance' | 'warranty' | 'custom';
export type ReportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  filters: Record<string, any>;
  columns: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  groupBy?: string;
  isScheduled: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    recipients: string[];
  };
  lastRun?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedReport {
  id: string;
  definitionId?: string;
  tenantId: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  period?: { start: Date; end: Date };
  generatedAt: Date;
  generatedBy: string;
  rowCount: number;
  fileSize?: number;
  filePath?: string;
  data?: any;
  summary?: Record<string, any>;
}

export interface AssetRegisterEntry {
  assetId: string;
  assetTag: string;
  name: string;
  category: string;
  status: AssetStatus;
  condition: AssetCondition;
  location?: string;
  department?: string;
  assignedTo?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  currentValue?: number;
  accumulatedDepreciation?: number;
  serialNumber?: string;
  warrantyExpiry?: Date;
  insuranceExpiry?: Date;
}

export interface DepreciationReportEntry {
  assetId: string;
  assetTag: string;
  name: string;
  category: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  salvageValue?: number;
  usefulLife?: number;
  depreciationMethod?: string;
  accumulatedDepreciation: number;
  currentValue: number;
  periodDepreciation: number;
  depreciationProgress: number;
}

export interface MaintenanceReportEntry {
  assetId: string;
  assetTag: string;
  name: string;
  totalMaintenanceCount: number;
  totalMaintenanceCost: number;
  avgMaintenanceCost: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  overdueMaintenanceCount: number;
  preventiveCount: number;
  correctiveCount: number;
}

export interface KPIMetric {
  name: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  benchmark?: number;
  status: 'good' | 'warning' | 'critical';
}

// =================== SERVICE ===================

@Injectable()
export class AssetReportsService {
  private reportDefinitions: Map<string, ReportDefinition> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private assetService: AssetManagementService,
    private depreciationService: AssetDepreciationService,
    private maintenanceService: AssetMaintenanceService,
    private locationService: AssetLocationService,
  ) {}

  // =================== REPORT DEFINITIONS ===================

  async createReportDefinition(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: ReportType;
    filters?: Record<string, any>;
    columns?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    groupBy?: string;
    isScheduled?: boolean;
    schedule?: ReportDefinition['schedule'];
    createdBy: string;
  }): Promise<ReportDefinition> {
    const id = `reportdef-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const definition: ReportDefinition = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      filters: data.filters || {},
      columns: data.columns || this.getDefaultColumns(data.type),
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
      groupBy: data.groupBy,
      isScheduled: data.isScheduled || false,
      schedule: data.schedule,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.reportDefinitions.set(id, definition);

    return definition;
  }

  async getReportDefinitions(tenantId: string): Promise<ReportDefinition[]> {
    return Array.from(this.reportDefinitions.values())
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getReportDefinition(id: string): Promise<ReportDefinition | null> {
    return this.reportDefinitions.get(id) || null;
  }

  private getDefaultColumns(type: ReportType): string[] {
    switch (type) {
      case 'asset_register':
        return ['assetTag', 'name', 'category', 'status', 'condition', 'location', 'purchasePrice', 'currentValue'];
      case 'depreciation':
        return ['assetTag', 'name', 'purchasePrice', 'accumulatedDepreciation', 'currentValue', 'depreciationProgress'];
      case 'maintenance':
        return ['assetTag', 'name', 'totalMaintenanceCount', 'totalMaintenanceCost', 'lastMaintenanceDate', 'nextMaintenanceDate'];
      case 'valuation':
        return ['assetTag', 'name', 'purchasePrice', 'currentValue', 'marketValue', 'gainLoss'];
      default:
        return ['assetTag', 'name', 'status'];
    }
  }

  // =================== REPORT GENERATION ===================

  async generateAssetRegisterReport(
    tenantId: string,
    filters?: {
      category?: AssetCategory;
      status?: AssetStatus;
      locationId?: string;
      departmentId?: string;
    },
    generatedBy?: string,
  ): Promise<GeneratedReport> {
    const { assets } = await this.assetService.getAssets(tenantId, filters);

    const entries: AssetRegisterEntry[] = assets.map((asset) => ({
      assetId: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      condition: asset.condition,
      location: asset.locationName,
      department: asset.departmentName,
      assignedTo: asset.assignedToUserName,
      purchaseDate: asset.purchaseDate,
      purchasePrice: asset.purchasePrice,
      currentValue: asset.currentValue,
      accumulatedDepreciation: asset.purchasePrice && asset.currentValue
        ? asset.purchasePrice - asset.currentValue
        : 0,
      serialNumber: asset.serialNumber,
      warrantyExpiry: asset.warrantyExpiry,
      insuranceExpiry: asset.insuranceExpiry,
    }));

    // Calculate summary
    const summary = {
      totalAssets: entries.length,
      totalPurchaseValue: entries.reduce((sum, e) => sum + (e.purchasePrice || 0), 0),
      totalCurrentValue: entries.reduce((sum, e) => sum + (e.currentValue || 0), 0),
      totalDepreciation: entries.reduce((sum, e) => sum + (e.accumulatedDepreciation || 0), 0),
      byStatus: {} as Record<AssetStatus, number>,
      byCategory: {} as Record<string, number>,
      byCondition: {} as Record<AssetCondition, number>,
    };

    for (const entry of entries) {
      summary.byStatus[entry.status] = (summary.byStatus[entry.status] || 0) + 1;
      summary.byCategory[entry.category] = (summary.byCategory[entry.category] || 0) + 1;
      summary.byCondition[entry.condition] = (summary.byCondition[entry.condition] || 0) + 1;
    }

    const report: GeneratedReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name: 'Asset Register Report',
      type: 'asset_register',
      format: 'json',
      generatedAt: new Date(),
      generatedBy: generatedBy || 'system',
      rowCount: entries.length,
      data: entries,
      summary,
    };

    this.generatedReports.set(report.id, report);

    this.eventEmitter.emit('report.generated', { report });

    return report;
  }

  async generateDepreciationReport(
    tenantId: string,
    period: { year: number; month?: number },
    generatedBy?: string,
  ): Promise<GeneratedReport> {
    const { assets } = await this.assetService.getAssets(tenantId);

    const entries: DepreciationReportEntry[] = [];
    let totalPurchaseValue = 0;
    let totalCurrentValue = 0;
    let totalPeriodDepreciation = 0;

    for (const asset of assets) {
      if (!asset.purchasePrice) continue;

      const currentValue = this.depreciationService.calculateCurrentBookValue(asset);
      const accumulatedDepreciation = asset.purchasePrice - currentValue;

      // Calculate period depreciation (simplified)
      const monthlyDepreciation = asset.usefulLifeMonths
        ? (asset.purchasePrice - (asset.salvageValue || 0)) / asset.usefulLifeMonths
        : 0;
      const periodDepreciation = period.month ? monthlyDepreciation : monthlyDepreciation * 12;

      const progress = asset.purchasePrice > 0
        ? (accumulatedDepreciation / (asset.purchasePrice - (asset.salvageValue || 0))) * 100
        : 0;

      entries.push({
        assetId: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category,
        purchaseDate: asset.purchaseDate,
        purchasePrice: asset.purchasePrice,
        salvageValue: asset.salvageValue,
        usefulLife: asset.usefulLifeMonths,
        depreciationMethod: asset.depreciationMethod,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        periodDepreciation: Math.round(periodDepreciation * 100) / 100,
        depreciationProgress: Math.round(progress * 100) / 100,
      });

      totalPurchaseValue += asset.purchasePrice;
      totalCurrentValue += currentValue;
      totalPeriodDepreciation += periodDepreciation;
    }

    const summary = {
      totalAssets: entries.length,
      totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalAccumulatedDepreciation: Math.round((totalPurchaseValue - totalCurrentValue) * 100) / 100,
      periodDepreciation: Math.round(totalPeriodDepreciation * 100) / 100,
      avgDepreciationProgress: entries.length > 0
        ? Math.round(entries.reduce((sum, e) => sum + e.depreciationProgress, 0) / entries.length * 100) / 100
        : 0,
    };

    const report: GeneratedReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name: `Depreciation Report - ${period.month ? `${period.year}-${String(period.month).padStart(2, '0')}` : period.year}`,
      type: 'depreciation',
      format: 'json',
      generatedAt: new Date(),
      generatedBy: generatedBy || 'system',
      rowCount: entries.length,
      data: entries,
      summary,
    };

    this.generatedReports.set(report.id, report);

    return report;
  }

  async generateMaintenanceReport(
    tenantId: string,
    period?: { start: Date; end: Date },
    generatedBy?: string,
  ): Promise<GeneratedReport> {
    const { assets } = await this.assetService.getAssets(tenantId);

    const entries: MaintenanceReportEntry[] = [];
    let totalMaintenanceCost = 0;
    let totalOverdue = 0;

    for (const asset of assets) {
      const records = await this.maintenanceService.getMaintenanceRecords(tenantId, {
        assetId: asset.id,
        startDate: period?.start,
        endDate: period?.end,
      });

      const schedules = await this.maintenanceService.getSchedules(tenantId, {
        assetId: asset.id,
      });

      const overdueSchedules = schedules.filter((s) => s.status === 'overdue');
      const nextScheduled = schedules
        .filter((s) => s.status === 'scheduled')
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0];

      const totalCost = records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
      const preventive = records.filter((r) => r.type === 'preventive').length;
      const corrective = records.filter((r) => r.type === 'corrective' || r.type === 'emergency').length;

      entries.push({
        assetId: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        totalMaintenanceCount: records.length,
        totalMaintenanceCost: Math.round(totalCost * 100) / 100,
        avgMaintenanceCost: records.length > 0 ? Math.round((totalCost / records.length) * 100) / 100 : 0,
        lastMaintenanceDate: records[0]?.performedAt,
        nextMaintenanceDate: nextScheduled?.scheduledDate,
        overdueMaintenanceCount: overdueSchedules.length,
        preventiveCount: preventive,
        correctiveCount: corrective,
      });

      totalMaintenanceCost += totalCost;
      totalOverdue += overdueSchedules.length;
    }

    const summary = {
      totalAssets: entries.length,
      totalMaintenanceRecords: entries.reduce((sum, e) => sum + e.totalMaintenanceCount, 0),
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      avgCostPerAsset: entries.length > 0
        ? Math.round((totalMaintenanceCost / entries.length) * 100) / 100
        : 0,
      totalOverdue,
      assetsWithMaintenance: entries.filter((e) => e.totalMaintenanceCount > 0).length,
      preventiveRatio: entries.reduce((sum, e) => sum + e.preventiveCount, 0) /
        Math.max(entries.reduce((sum, e) => sum + e.totalMaintenanceCount, 0), 1) * 100,
    };

    const report: GeneratedReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name: 'Maintenance Report',
      type: 'maintenance',
      format: 'json',
      period,
      generatedAt: new Date(),
      generatedBy: generatedBy || 'system',
      rowCount: entries.length,
      data: entries,
      summary,
    };

    this.generatedReports.set(report.id, report);

    return report;
  }

  async generateWarrantyReport(
    tenantId: string,
    daysAhead: number = 90,
    generatedBy?: string,
  ): Promise<GeneratedReport> {
    const { assets } = await this.assetService.getAssets(tenantId);

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const entries = assets
      .filter((a) => a.warrantyExpiry)
      .map((asset) => ({
        assetId: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category,
        warrantyExpiry: asset.warrantyExpiry,
        warrantyInfo: asset.warrantyInfo,
        daysUntilExpiry: asset.warrantyExpiry
          ? Math.ceil((asset.warrantyExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : 0,
        status: asset.warrantyExpiry && asset.warrantyExpiry < now
          ? 'expired'
          : asset.warrantyExpiry && asset.warrantyExpiry <= futureDate
            ? 'expiring_soon'
            : 'active',
        purchasePrice: asset.purchasePrice,
        supplierName: asset.supplierName,
      }))
      .sort((a, b) => (a.warrantyExpiry?.getTime() || 0) - (b.warrantyExpiry?.getTime() || 0));

    const summary = {
      totalWithWarranty: entries.length,
      expired: entries.filter((e) => e.status === 'expired').length,
      expiringSoon: entries.filter((e) => e.status === 'expiring_soon').length,
      active: entries.filter((e) => e.status === 'active').length,
      totalValueExpiring: entries
        .filter((e) => e.status === 'expiring_soon')
        .reduce((sum, e) => sum + (e.purchasePrice || 0), 0),
    };

    const report: GeneratedReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name: `Warranty Report - Next ${daysAhead} Days`,
      type: 'warranty',
      format: 'json',
      generatedAt: new Date(),
      generatedBy: generatedBy || 'system',
      rowCount: entries.length,
      data: entries,
      summary,
    };

    this.generatedReports.set(report.id, report);

    return report;
  }

  async generateInsuranceReport(
    tenantId: string,
    daysAhead: number = 90,
    generatedBy?: string,
  ): Promise<GeneratedReport> {
    const { assets } = await this.assetService.getAssets(tenantId);

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const entries = assets
      .filter((a) => a.insuranceExpiry || a.insurancePolicyNumber)
      .map((asset) => ({
        assetId: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category,
        policyNumber: asset.insurancePolicyNumber,
        insuranceExpiry: asset.insuranceExpiry,
        daysUntilExpiry: asset.insuranceExpiry
          ? Math.ceil((asset.insuranceExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : null,
        status: !asset.insuranceExpiry
          ? 'no_expiry_set'
          : asset.insuranceExpiry < now
            ? 'expired'
            : asset.insuranceExpiry <= futureDate
              ? 'expiring_soon'
              : 'active',
        currentValue: asset.currentValue,
        purchasePrice: asset.purchasePrice,
      }))
      .sort((a, b) => (a.insuranceExpiry?.getTime() || 0) - (b.insuranceExpiry?.getTime() || 0));

    const summary = {
      totalInsured: entries.length,
      expired: entries.filter((e) => e.status === 'expired').length,
      expiringSoon: entries.filter((e) => e.status === 'expiring_soon').length,
      active: entries.filter((e) => e.status === 'active').length,
      noExpirySet: entries.filter((e) => e.status === 'no_expiry_set').length,
      totalInsuredValue: entries.reduce((sum, e) => sum + (e.currentValue || 0), 0),
      valueAtRisk: entries
        .filter((e) => e.status === 'expired' || e.status === 'expiring_soon')
        .reduce((sum, e) => sum + (e.currentValue || 0), 0),
    };

    const report: GeneratedReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name: `Insurance Report - Next ${daysAhead} Days`,
      type: 'insurance',
      format: 'json',
      generatedAt: new Date(),
      generatedBy: generatedBy || 'system',
      rowCount: entries.length,
      data: entries,
      summary,
    };

    this.generatedReports.set(report.id, report);

    return report;
  }

  // =================== KPIs & ANALYTICS ===================

  async getAssetKPIs(tenantId: string): Promise<KPIMetric[]> {
    const stats = await this.assetService.getAssetStatistics(tenantId);
    const maintStats = await this.maintenanceService.getMaintenanceStatistics(tenantId);
    const deprecSummary = await this.depreciationService.getDepreciationSummary(tenantId);

    const kpis: KPIMetric[] = [
      {
        name: 'Total Asset Value',
        value: stats.totalValue,
        unit: 'RON',
        status: 'good',
      },
      {
        name: 'Asset Utilization Rate',
        value: stats.total > 0 ? Math.round((stats.byStatus.active / stats.total) * 100) : 0,
        unit: '%',
        benchmark: 85,
        status: stats.byStatus.active / stats.total >= 0.85 ? 'good' : stats.byStatus.active / stats.total >= 0.70 ? 'warning' : 'critical',
      },
      {
        name: 'Depreciation This Year',
        value: deprecSummary.totalDepreciationThisYear,
        unit: 'RON',
        status: 'good',
      },
      {
        name: 'Maintenance Cost This Year',
        value: maintStats.totalCostThisYear,
        unit: 'RON',
        status: maintStats.totalCostThisYear < stats.totalValue * 0.05 ? 'good' : maintStats.totalCostThisYear < stats.totalValue * 0.10 ? 'warning' : 'critical',
      },
      {
        name: 'Overdue Maintenance',
        value: maintStats.overdue,
        unit: 'items',
        benchmark: 0,
        status: maintStats.overdue === 0 ? 'good' : maintStats.overdue <= 5 ? 'warning' : 'critical',
      },
      {
        name: 'Average Asset Age',
        value: 0, // Would need purchase date data
        unit: 'months',
        status: 'good',
      },
      {
        name: 'Assets in Poor Condition',
        value: stats.byCondition.poor + stats.byCondition.broken,
        unit: 'items',
        status: (stats.byCondition.poor + stats.byCondition.broken) === 0 ? 'good' :
          (stats.byCondition.poor + stats.byCondition.broken) <= stats.total * 0.05 ? 'warning' : 'critical',
      },
      {
        name: 'Warranty Expiring Soon',
        value: stats.warrantyExpiringSoon,
        unit: 'items',
        status: stats.warrantyExpiringSoon === 0 ? 'good' : 'warning',
      },
    ];

    return kpis;
  }

  // =================== REPORT HISTORY ===================

  async getGeneratedReports(
    tenantId: string,
    filters?: {
      type?: ReportType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<GeneratedReport[]> {
    let reports = Array.from(this.generatedReports.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.type) {
      reports = reports.filter((r) => r.type === filters.type);
    }

    if (filters?.startDate) {
      reports = reports.filter((r) => r.generatedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      reports = reports.filter((r) => r.generatedAt <= filters.endDate!);
    }

    reports = reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (filters?.limit) {
      reports = reports.slice(0, filters.limit);
    }

    return reports;
  }

  async getGeneratedReport(id: string): Promise<GeneratedReport | null> {
    return this.generatedReports.get(id) || null;
  }

  // =================== EXPORT ===================

  async exportReport(
    reportId: string,
    format: ReportFormat,
  ): Promise<{ data: string; filename: string; contentType: string }> {
    const report = this.generatedReports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const filename = `${report.name.replace(/\s+/g, '_')}_${report.generatedAt.toISOString().split('T')[0]}.${format}`;

    if (format === 'json') {
      return {
        data: JSON.stringify(report.data, null, 2),
        filename,
        contentType: 'application/json',
      };
    }

    if (format === 'csv') {
      const csvData = this.convertToCSV(report.data);
      return {
        data: csvData,
        filename,
        contentType: 'text/csv',
      };
    }

    // For xlsx and pdf, return JSON for now (would need libraries)
    return {
      data: JSON.stringify(report.data, null, 2),
      filename: filename.replace(`.${format}`, '.json'),
      contentType: 'application/json',
    };
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map((item) =>
      headers.map((h) => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
