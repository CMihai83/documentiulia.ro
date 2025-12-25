import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Analytics Types
export enum ReportType {
  INVENTORY_SNAPSHOT = 'inventory_snapshot',
  MOVEMENT_SUMMARY = 'movement_summary',
  PICKING_PERFORMANCE = 'picking_performance',
  PACKING_PERFORMANCE = 'packing_performance',
  CYCLE_COUNT_ACCURACY = 'cycle_count_accuracy',
  SPACE_UTILIZATION = 'space_utilization',
  STOCK_AGING = 'stock_aging',
  ABC_ANALYSIS = 'abc_analysis',
  DEMAND_FORECAST = 'demand_forecast',
  TURNOVER_ANALYSIS = 'turnover_analysis',
}

export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export enum ReportSchedule {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertType {
  LOW_STOCK = 'low_stock',
  OVERSTOCK = 'overstock',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  SLOW_MOVING = 'slow_moving',
  DEAD_STOCK = 'dead_stock',
  PICK_DELAY = 'pick_delay',
  CAPACITY_WARNING = 'capacity_warning',
}

// Interfaces
export interface InventoryKPI {
  tenantId: string;
  warehouseId: string;
  warehouseName: string;
  timestamp: Date;
  totalSKUs: number;
  totalQuantity: number;
  totalValue: number;
  utilizationPercent: number;
  turnoverRate: number;
  fillRate: number;
  accuracyRate: number;
  pickingEfficiency: number;
  packingEfficiency: number;
  averagePickTime: number;
  averagePackTime: number;
  pendingOrders: number;
  onTimeDeliveryRate: number;
}

export interface InventorySnapshot {
  id: string;
  tenantId: string;
  warehouseId: string;
  snapshotDate: Date;
  byZone: {
    zoneId: string;
    zoneName: string;
    skuCount: number;
    quantity: number;
    value: number;
    utilizationPercent: number;
  }[];
  byStorageClass: Record<string, { quantity: number; value: number }>;
  byCategory: { category: string; skuCount: number; quantity: number; value: number }[];
  totalLocations: number;
  occupiedLocations: number;
  emptyLocations: number;
  blockedLocations: number;
}

export interface StockAging {
  id: string;
  tenantId: string;
  warehouseId: string;
  analysisDate: Date;
  ageBuckets: {
    range: string;
    minDays: number;
    maxDays: number;
    skuCount: number;
    quantity: number;
    value: number;
    percentOfTotal: number;
  }[];
  expiringItems: {
    itemId: string;
    itemCode: string;
    itemName: string;
    lotNumber?: string;
    quantity: number;
    expiryDate: Date;
    daysToExpiry: number;
    value: number;
  }[];
}

export interface ABCAnalysis {
  id: string;
  tenantId: string;
  warehouseId: string;
  analysisDate: Date;
  criteria: 'value' | 'velocity' | 'revenue';
  classA: {
    skuCount: number;
    percentOfSKUs: number;
    value: number;
    percentOfValue: number;
    items: { itemId: string; itemCode: string; value: number; rank: number }[];
  };
  classB: {
    skuCount: number;
    percentOfSKUs: number;
    value: number;
    percentOfValue: number;
    items: { itemId: string; itemCode: string; value: number; rank: number }[];
  };
  classC: {
    skuCount: number;
    percentOfSKUs: number;
    value: number;
    percentOfValue: number;
    items: { itemId: string; itemCode: string; value: number; rank: number }[];
  };
}

export interface TurnoverAnalysis {
  id: string;
  tenantId: string;
  warehouseId: string;
  periodStart: Date;
  periodEnd: Date;
  averageInventory: number;
  costOfGoodsSold: number;
  turnoverRate: number;
  daysInventoryOutstanding: number;
  byCategory: {
    category: string;
    turnoverRate: number;
    daysOutstanding: number;
  }[];
  topTurnover: { itemId: string; itemCode: string; turnoverRate: number }[];
  slowMoving: { itemId: string; itemCode: string; turnoverRate: number; daysSinceMovement: number }[];
}

export interface DemandForecast {
  id: string;
  tenantId: string;
  warehouseId: string;
  forecastDate: Date;
  horizonDays: number;
  items: {
    itemId: string;
    itemCode: string;
    itemName: string;
    currentStock: number;
    averageDailyDemand: number;
    forecastedDemand: number;
    safetyStock: number;
    reorderPoint: number;
    suggestedReorderQty: number;
    daysOfSupply: number;
    stockoutRisk: 'low' | 'medium' | 'high';
  }[];
}

export interface WarehouseAlert {
  id: string;
  tenantId: string;
  warehouseId: string;
  warehouseName: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  itemId?: string;
  itemCode?: string;
  locationId?: string;
  threshold?: number;
  currentValue?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ScheduledReport {
  id: string;
  tenantId: string;
  name: string;
  reportType: ReportType;
  warehouseIds: string[];
  format: ReportFormat;
  schedule: ReportSchedule;
  parameters?: Record<string, any>;
  recipients: string[];
  lastRunAt?: Date;
  nextRunAt?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreateScheduledReportDto {
  name: string;
  reportType: ReportType;
  warehouseIds: string[];
  format: ReportFormat;
  schedule: ReportSchedule;
  parameters?: Record<string, any>;
  recipients: string[];
  createdBy: string;
}

export interface GenerateReportDto {
  reportType: ReportType;
  warehouseId: string;
  format?: ReportFormat;
  dateFrom?: Date;
  dateTo?: Date;
  parameters?: Record<string, any>;
}

@Injectable()
export class WarehouseAnalyticsService {
  private kpiData = new Map<string, InventoryKPI[]>();
  private snapshots = new Map<string, InventorySnapshot>();
  private alerts = new Map<string, WarehouseAlert>();
  private scheduledReports = new Map<string, ScheduledReport>();
  private alertCounter = new Map<string, number>();
  private reportCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // KPI Dashboard
  async getWarehouseKPIs(
    tenantId: string,
    warehouseId: string,
  ): Promise<InventoryKPI> {
    // In production, this would aggregate real data from various services
    // For now, generate representative KPIs
    return {
      tenantId,
      warehouseId,
      warehouseName: 'Warehouse',
      timestamp: new Date(),
      totalSKUs: 1250,
      totalQuantity: 45000,
      totalValue: 2250000,
      utilizationPercent: 72.5,
      turnoverRate: 8.3,
      fillRate: 96.5,
      accuracyRate: 99.2,
      pickingEfficiency: 125, // picks per hour
      packingEfficiency: 45, // packs per hour
      averagePickTime: 28800, // ms
      averagePackTime: 80000, // ms
      pendingOrders: 34,
      onTimeDeliveryRate: 97.8,
    };
  }

  async getKPIHistory(
    tenantId: string,
    warehouseId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<InventoryKPI[]> {
    const key = `${tenantId}_${warehouseId}`;
    const history = this.kpiData.get(key) || [];

    return history.filter(
      (kpi) => kpi.timestamp >= dateFrom && kpi.timestamp <= dateTo,
    );
  }

  async recordKPISnapshot(
    tenantId: string,
    warehouseId: string,
    kpi: Partial<InventoryKPI>,
  ): Promise<InventoryKPI> {
    const key = `${tenantId}_${warehouseId}`;
    const fullKPI: InventoryKPI = {
      tenantId,
      warehouseId,
      warehouseName: kpi.warehouseName || 'Warehouse',
      timestamp: new Date(),
      totalSKUs: kpi.totalSKUs || 0,
      totalQuantity: kpi.totalQuantity || 0,
      totalValue: kpi.totalValue || 0,
      utilizationPercent: kpi.utilizationPercent || 0,
      turnoverRate: kpi.turnoverRate || 0,
      fillRate: kpi.fillRate || 0,
      accuracyRate: kpi.accuracyRate || 0,
      pickingEfficiency: kpi.pickingEfficiency || 0,
      packingEfficiency: kpi.packingEfficiency || 0,
      averagePickTime: kpi.averagePickTime || 0,
      averagePackTime: kpi.averagePackTime || 0,
      pendingOrders: kpi.pendingOrders || 0,
      onTimeDeliveryRate: kpi.onTimeDeliveryRate || 0,
    };

    const history = this.kpiData.get(key) || [];
    history.push(fullKPI);
    this.kpiData.set(key, history);

    return fullKPI;
  }

  // Inventory Snapshot
  async generateInventorySnapshot(
    tenantId: string,
    warehouseId: string,
  ): Promise<InventorySnapshot> {
    const id = `snap_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const snapshot: InventorySnapshot = {
      id,
      tenantId,
      warehouseId,
      snapshotDate: new Date(),
      byZone: [
        {
          zoneId: 'zone_1',
          zoneName: 'Zone A - General',
          skuCount: 500,
          quantity: 18000,
          value: 900000,
          utilizationPercent: 78,
        },
        {
          zoneId: 'zone_2',
          zoneName: 'Zone B - Cold Storage',
          skuCount: 150,
          quantity: 5000,
          value: 350000,
          utilizationPercent: 65,
        },
        {
          zoneId: 'zone_3',
          zoneName: 'Zone C - High Value',
          skuCount: 100,
          quantity: 2000,
          value: 500000,
          utilizationPercent: 85,
        },
      ],
      byStorageClass: {
        general: { quantity: 35000, value: 1500000 },
        cold: { quantity: 5000, value: 350000 },
        hazardous: { quantity: 2000, value: 200000 },
        high_value: { quantity: 3000, value: 500000 },
      },
      byCategory: [
        { category: 'Electronics', skuCount: 200, quantity: 8000, value: 600000 },
        { category: 'Clothing', skuCount: 350, quantity: 15000, value: 450000 },
        { category: 'Food & Beverage', skuCount: 150, quantity: 10000, value: 300000 },
        { category: 'Industrial', skuCount: 250, quantity: 7000, value: 400000 },
      ],
      totalLocations: 1000,
      occupiedLocations: 725,
      emptyLocations: 250,
      blockedLocations: 25,
    };

    this.snapshots.set(id, snapshot);

    this.eventEmitter.emit('inventory_snapshot.generated', {
      tenantId,
      warehouseId,
      snapshotId: id,
    });

    return snapshot;
  }

  async getInventorySnapshot(
    tenantId: string,
    snapshotId: string,
  ): Promise<InventorySnapshot> {
    const snapshot = this.snapshots.get(snapshotId);

    if (!snapshot || snapshot.tenantId !== tenantId) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    return snapshot;
  }

  // Stock Aging Analysis
  async generateStockAgingReport(
    tenantId: string,
    warehouseId: string,
    expiryWarningDays: number = 30,
  ): Promise<StockAging> {
    const id = `aging_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const report: StockAging = {
      id,
      tenantId,
      warehouseId,
      analysisDate: new Date(),
      ageBuckets: [
        { range: '0-30 days', minDays: 0, maxDays: 30, skuCount: 400, quantity: 15000, value: 750000, percentOfTotal: 35 },
        { range: '31-60 days', minDays: 31, maxDays: 60, skuCount: 300, quantity: 12000, value: 600000, percentOfTotal: 28 },
        { range: '61-90 days', minDays: 61, maxDays: 90, skuCount: 200, quantity: 8000, value: 400000, percentOfTotal: 18 },
        { range: '91-180 days', minDays: 91, maxDays: 180, skuCount: 150, quantity: 6000, value: 280000, percentOfTotal: 13 },
        { range: '180+ days', minDays: 181, maxDays: 999, skuCount: 50, quantity: 2000, value: 120000, percentOfTotal: 6 },
      ],
      expiringItems: [
        { itemId: 'item_1', itemCode: 'SKU001', itemName: 'Perishable Item A', lotNumber: 'LOT001', quantity: 500, expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), daysToExpiry: 7, value: 25000 },
        { itemId: 'item_2', itemCode: 'SKU002', itemName: 'Perishable Item B', lotNumber: 'LOT002', quantity: 300, expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), daysToExpiry: 14, value: 15000 },
        { itemId: 'item_3', itemCode: 'SKU003', itemName: 'Perishable Item C', lotNumber: 'LOT003', quantity: 200, expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), daysToExpiry: 21, value: 10000 },
      ],
    };

    return report;
  }

  // ABC Analysis
  async generateABCAnalysis(
    tenantId: string,
    warehouseId: string,
    criteria: 'value' | 'velocity' | 'revenue' = 'value',
  ): Promise<ABCAnalysis> {
    const id = `abc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const analysis: ABCAnalysis = {
      id,
      tenantId,
      warehouseId,
      analysisDate: new Date(),
      criteria,
      classA: {
        skuCount: 125,
        percentOfSKUs: 10,
        value: 1575000,
        percentOfValue: 70,
        items: [
          { itemId: 'item_a1', itemCode: 'SKU-A001', value: 150000, rank: 1 },
          { itemId: 'item_a2', itemCode: 'SKU-A002', value: 120000, rank: 2 },
          { itemId: 'item_a3', itemCode: 'SKU-A003', value: 100000, rank: 3 },
        ],
      },
      classB: {
        skuCount: 250,
        percentOfSKUs: 20,
        value: 562500,
        percentOfValue: 25,
        items: [
          { itemId: 'item_b1', itemCode: 'SKU-B001', value: 25000, rank: 126 },
          { itemId: 'item_b2', itemCode: 'SKU-B002', value: 24000, rank: 127 },
          { itemId: 'item_b3', itemCode: 'SKU-B003', value: 23000, rank: 128 },
        ],
      },
      classC: {
        skuCount: 875,
        percentOfSKUs: 70,
        value: 112500,
        percentOfValue: 5,
        items: [
          { itemId: 'item_c1', itemCode: 'SKU-C001', value: 500, rank: 376 },
          { itemId: 'item_c2', itemCode: 'SKU-C002', value: 450, rank: 377 },
          { itemId: 'item_c3', itemCode: 'SKU-C003', value: 400, rank: 378 },
        ],
      },
    };

    return analysis;
  }

  // Turnover Analysis
  async generateTurnoverAnalysis(
    tenantId: string,
    warehouseId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TurnoverAnalysis> {
    const id = `turn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const analysis: TurnoverAnalysis = {
      id,
      tenantId,
      warehouseId,
      periodStart,
      periodEnd,
      averageInventory: 2000000,
      costOfGoodsSold: 16600000, // Annualized
      turnoverRate: 8.3,
      daysInventoryOutstanding: 44,
      byCategory: [
        { category: 'Electronics', turnoverRate: 12.5, daysOutstanding: 29 },
        { category: 'Clothing', turnoverRate: 6.0, daysOutstanding: 61 },
        { category: 'Food & Beverage', turnoverRate: 24.0, daysOutstanding: 15 },
        { category: 'Industrial', turnoverRate: 4.0, daysOutstanding: 91 },
      ],
      topTurnover: [
        { itemId: 'item_t1', itemCode: 'SKU-T001', turnoverRate: 52 },
        { itemId: 'item_t2', itemCode: 'SKU-T002', turnoverRate: 48 },
        { itemId: 'item_t3', itemCode: 'SKU-T003', turnoverRate: 42 },
      ],
      slowMoving: [
        { itemId: 'item_s1', itemCode: 'SKU-S001', turnoverRate: 0.5, daysSinceMovement: 180 },
        { itemId: 'item_s2', itemCode: 'SKU-S002', turnoverRate: 0.8, daysSinceMovement: 150 },
        { itemId: 'item_s3', itemCode: 'SKU-S003', turnoverRate: 1.0, daysSinceMovement: 120 },
      ],
    };

    return analysis;
  }

  // Demand Forecast
  async generateDemandForecast(
    tenantId: string,
    warehouseId: string,
    horizonDays: number = 30,
  ): Promise<DemandForecast> {
    const id = `fcst_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const forecast: DemandForecast = {
      id,
      tenantId,
      warehouseId,
      forecastDate: new Date(),
      horizonDays,
      items: [
        {
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'High Demand Product',
          currentStock: 500,
          averageDailyDemand: 50,
          forecastedDemand: 1500,
          safetyStock: 150,
          reorderPoint: 450,
          suggestedReorderQty: 1200,
          daysOfSupply: 10,
          stockoutRisk: 'high',
        },
        {
          itemId: 'item_2',
          itemCode: 'SKU002',
          itemName: 'Medium Demand Product',
          currentStock: 800,
          averageDailyDemand: 20,
          forecastedDemand: 600,
          safetyStock: 60,
          reorderPoint: 180,
          suggestedReorderQty: 0,
          daysOfSupply: 40,
          stockoutRisk: 'low',
        },
        {
          itemId: 'item_3',
          itemCode: 'SKU003',
          itemName: 'Low Demand Product',
          currentStock: 200,
          averageDailyDemand: 5,
          forecastedDemand: 150,
          safetyStock: 15,
          reorderPoint: 45,
          suggestedReorderQty: 0,
          daysOfSupply: 40,
          stockoutRisk: 'low',
        },
      ],
    };

    this.eventEmitter.emit('demand_forecast.generated', {
      tenantId,
      warehouseId,
      forecastId: id,
    });

    return forecast;
  }

  // Alerts Management
  async createAlert(
    tenantId: string,
    warehouseId: string,
    warehouseName: string,
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<WarehouseAlert> {
    const counter = (this.alertCounter.get(tenantId) || 0) + 1;
    this.alertCounter.set(tenantId, counter);

    const id = `alert_${Date.now()}_${counter}`;

    const alert: WarehouseAlert = {
      id,
      tenantId,
      warehouseId,
      warehouseName,
      type,
      severity,
      title,
      message,
      itemId: metadata?.itemId,
      itemCode: metadata?.itemCode,
      locationId: metadata?.locationId,
      threshold: metadata?.threshold,
      currentValue: metadata?.currentValue,
      acknowledged: false,
      metadata,
      createdAt: new Date(),
    };

    this.alerts.set(id, alert);

    this.eventEmitter.emit('warehouse_alert.created', {
      tenantId,
      alertId: id,
      type,
      severity,
    });

    return alert;
  }

  async acknowledgeAlert(
    tenantId: string,
    alertId: string,
    userId: string,
  ): Promise<WarehouseAlert> {
    const alert = await this.getAlert(tenantId, alertId);

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    this.alerts.set(alertId, alert);

    return alert;
  }

  async resolveAlert(tenantId: string, alertId: string): Promise<WarehouseAlert> {
    const alert = await this.getAlert(tenantId, alertId);

    alert.resolvedAt = new Date();

    this.alerts.set(alertId, alert);

    this.eventEmitter.emit('warehouse_alert.resolved', {
      tenantId,
      alertId,
    });

    return alert;
  }

  async getAlert(tenantId: string, alertId: string): Promise<WarehouseAlert> {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    return alert;
  }

  async listAlerts(
    tenantId: string,
    filters: {
      warehouseId?: string;
      type?: AlertType;
      severity?: AlertSeverity;
      acknowledged?: boolean;
      resolved?: boolean;
    },
  ): Promise<WarehouseAlert[]> {
    let alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    if (filters.warehouseId) {
      alerts = alerts.filter((a) => a.warehouseId === filters.warehouseId);
    }

    if (filters.type) {
      alerts = alerts.filter((a) => a.type === filters.type);
    }

    if (filters.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }

    if (filters.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === filters.acknowledged);
    }

    if (filters.resolved !== undefined) {
      alerts = alerts.filter((a) =>
        filters.resolved ? a.resolvedAt != null : a.resolvedAt == null,
      );
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getActiveAlertCount(
    tenantId: string,
    warehouseId?: string,
  ): Promise<{ total: number; bySeverity: Record<AlertSeverity, number> }> {
    let alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId && !a.resolvedAt,
    );

    if (warehouseId) {
      alerts = alerts.filter((a) => a.warehouseId === warehouseId);
    }

    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    for (const alert of alerts) {
      bySeverity[alert.severity]++;
    }

    return { total: alerts.length, bySeverity };
  }

  // Scheduled Reports
  async createScheduledReport(
    tenantId: string,
    dto: CreateScheduledReportDto,
  ): Promise<ScheduledReport> {
    const counter = (this.reportCounter.get(tenantId) || 0) + 1;
    this.reportCounter.set(tenantId, counter);

    const id = `rpt_${Date.now()}_${counter}`;

    const report: ScheduledReport = {
      id,
      tenantId,
      name: dto.name,
      reportType: dto.reportType,
      warehouseIds: dto.warehouseIds,
      format: dto.format,
      schedule: dto.schedule,
      parameters: dto.parameters,
      recipients: dto.recipients,
      nextRunAt: this.calculateNextRun(dto.schedule),
      isActive: true,
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scheduledReports.set(id, report);

    this.eventEmitter.emit('scheduled_report.created', {
      tenantId,
      reportId: id,
      reportType: dto.reportType,
    });

    return report;
  }

  async updateScheduledReport(
    tenantId: string,
    reportId: string,
    updates: Partial<CreateScheduledReportDto>,
  ): Promise<ScheduledReport> {
    const report = await this.getScheduledReport(tenantId, reportId);

    if (updates.name) report.name = updates.name;
    if (updates.reportType) report.reportType = updates.reportType;
    if (updates.warehouseIds) report.warehouseIds = updates.warehouseIds;
    if (updates.format) report.format = updates.format;
    if (updates.schedule) {
      report.schedule = updates.schedule;
      report.nextRunAt = this.calculateNextRun(updates.schedule);
    }
    if (updates.parameters) report.parameters = updates.parameters;
    if (updates.recipients) report.recipients = updates.recipients;

    report.updatedAt = new Date();

    this.scheduledReports.set(reportId, report);

    return report;
  }

  async toggleScheduledReport(
    tenantId: string,
    reportId: string,
    isActive: boolean,
  ): Promise<ScheduledReport> {
    const report = await this.getScheduledReport(tenantId, reportId);

    report.isActive = isActive;
    if (isActive) {
      report.nextRunAt = this.calculateNextRun(report.schedule);
    } else {
      report.nextRunAt = undefined;
    }
    report.updatedAt = new Date();

    this.scheduledReports.set(reportId, report);

    return report;
  }

  async getScheduledReport(
    tenantId: string,
    reportId: string,
  ): Promise<ScheduledReport> {
    const report = this.scheduledReports.get(reportId);

    if (!report || report.tenantId !== tenantId) {
      throw new NotFoundException(`Scheduled report ${reportId} not found`);
    }

    return report;
  }

  async listScheduledReports(
    tenantId: string,
    filters?: {
      reportType?: ReportType;
      isActive?: boolean;
    },
  ): Promise<ScheduledReport[]> {
    let reports = Array.from(this.scheduledReports.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.reportType) {
      reports = reports.filter((r) => r.reportType === filters.reportType);
    }

    if (filters?.isActive !== undefined) {
      reports = reports.filter((r) => r.isActive === filters.isActive);
    }

    return reports;
  }

  async deleteScheduledReport(
    tenantId: string,
    reportId: string,
  ): Promise<void> {
    const report = await this.getScheduledReport(tenantId, reportId);
    this.scheduledReports.delete(reportId);
  }

  // Generate Report
  async generateReport(
    tenantId: string,
    dto: GenerateReportDto,
  ): Promise<{ reportId: string; data: any; generatedAt: Date }> {
    let data: any;

    switch (dto.reportType) {
      case ReportType.INVENTORY_SNAPSHOT:
        data = await this.generateInventorySnapshot(tenantId, dto.warehouseId);
        break;
      case ReportType.STOCK_AGING:
        data = await this.generateStockAgingReport(
          tenantId,
          dto.warehouseId,
          dto.parameters?.expiryWarningDays,
        );
        break;
      case ReportType.ABC_ANALYSIS:
        data = await this.generateABCAnalysis(
          tenantId,
          dto.warehouseId,
          dto.parameters?.criteria,
        );
        break;
      case ReportType.TURNOVER_ANALYSIS:
        data = await this.generateTurnoverAnalysis(
          tenantId,
          dto.warehouseId,
          dto.dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          dto.dateTo || new Date(),
        );
        break;
      case ReportType.DEMAND_FORECAST:
        data = await this.generateDemandForecast(
          tenantId,
          dto.warehouseId,
          dto.parameters?.horizonDays,
        );
        break;
      default:
        data = await this.getWarehouseKPIs(tenantId, dto.warehouseId);
    }

    const reportId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.eventEmitter.emit('report.generated', {
      tenantId,
      reportId,
      reportType: dto.reportType,
      warehouseId: dto.warehouseId,
    });

    return {
      reportId,
      data,
      generatedAt: new Date(),
    };
  }

  // Helper Methods
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();

    switch (schedule) {
      case ReportSchedule.DAILY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case ReportSchedule.WEEKLY:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case ReportSchedule.MONTHLY:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case ReportSchedule.QUARTERLY:
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      case ReportSchedule.ONCE:
      default:
        return now;
    }
  }
}
