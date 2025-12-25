import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import {
  WarehouseAnalyticsService,
  ReportType,
  ReportFormat,
  ReportSchedule,
  AlertType,
  AlertSeverity,
  CreateScheduledReportDto,
} from './warehouse-analytics.service';

describe('WarehouseAnalyticsService', () => {
  let service: WarehouseAnalyticsService;
  let eventEmitter: EventEmitter2;
  let tenantId: string;
  const warehouseId = 'warehouse_test';

  beforeEach(async () => {
    tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseAnalyticsService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WarehouseAnalyticsService>(WarehouseAnalyticsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('KPI Dashboard', () => {
    it('should get warehouse KPIs', async () => {
      const kpis = await service.getWarehouseKPIs(tenantId, warehouseId);

      expect(kpis).toBeDefined();
      expect(kpis.tenantId).toBe(tenantId);
      expect(kpis.warehouseId).toBe(warehouseId);
      expect(kpis.totalSKUs).toBeGreaterThan(0);
      expect(kpis.utilizationPercent).toBeGreaterThan(0);
      expect(kpis.turnoverRate).toBeGreaterThan(0);
    });

    it('should record KPI snapshot', async () => {
      const kpi = await service.recordKPISnapshot(tenantId, warehouseId, {
        totalSKUs: 500,
        totalQuantity: 20000,
        utilizationPercent: 65,
      });

      expect(kpi.totalSKUs).toBe(500);
      expect(kpi.totalQuantity).toBe(20000);
      expect(kpi.utilizationPercent).toBe(65);
    });

    it('should get KPI history', async () => {
      await service.recordKPISnapshot(tenantId, warehouseId, {
        totalSKUs: 500,
      });

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 1);

      const history = await service.getKPIHistory(
        tenantId,
        warehouseId,
        dateFrom,
        dateTo,
      );

      expect(history).toHaveLength(1);
    });
  });

  describe('Inventory Snapshot', () => {
    it('should generate inventory snapshot', async () => {
      const snapshot = await service.generateInventorySnapshot(
        tenantId,
        warehouseId,
      );

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBeDefined();
      expect(snapshot.warehouseId).toBe(warehouseId);
      expect(snapshot.byZone).toHaveLength(3);
      expect(snapshot.totalLocations).toBeGreaterThan(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory_snapshot.generated',
        expect.any(Object),
      );
    });

    it('should get inventory snapshot', async () => {
      const created = await service.generateInventorySnapshot(
        tenantId,
        warehouseId,
      );
      const snapshot = await service.getInventorySnapshot(tenantId, created.id);

      expect(snapshot.id).toBe(created.id);
    });

    it('should throw when snapshot not found', async () => {
      await expect(
        service.getInventorySnapshot(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Stock Aging Report', () => {
    it('should generate stock aging report', async () => {
      const report = await service.generateStockAgingReport(
        tenantId,
        warehouseId,
      );

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.ageBuckets).toHaveLength(5);
      expect(report.expiringItems.length).toBeGreaterThan(0);
    });

    it('should use custom expiry warning days', async () => {
      const report = await service.generateStockAgingReport(
        tenantId,
        warehouseId,
        60,
      );

      expect(report).toBeDefined();
    });
  });

  describe('ABC Analysis', () => {
    it('should generate ABC analysis by value', async () => {
      const analysis = await service.generateABCAnalysis(
        tenantId,
        warehouseId,
        'value',
      );

      expect(analysis).toBeDefined();
      expect(analysis.criteria).toBe('value');
      expect(analysis.classA.percentOfValue).toBe(70);
      expect(analysis.classB.percentOfValue).toBe(25);
      expect(analysis.classC.percentOfValue).toBe(5);
    });

    it('should default to value criteria', async () => {
      const analysis = await service.generateABCAnalysis(tenantId, warehouseId);

      expect(analysis.criteria).toBe('value');
    });
  });

  describe('Turnover Analysis', () => {
    it('should generate turnover analysis', async () => {
      const periodStart = new Date();
      periodStart.setFullYear(periodStart.getFullYear() - 1);
      const periodEnd = new Date();

      const analysis = await service.generateTurnoverAnalysis(
        tenantId,
        warehouseId,
        periodStart,
        periodEnd,
      );

      expect(analysis).toBeDefined();
      expect(analysis.turnoverRate).toBeGreaterThan(0);
      expect(analysis.daysInventoryOutstanding).toBeGreaterThan(0);
      expect(analysis.byCategory.length).toBeGreaterThan(0);
      expect(analysis.topTurnover.length).toBeGreaterThan(0);
      expect(analysis.slowMoving.length).toBeGreaterThan(0);
    });
  });

  describe('Demand Forecast', () => {
    it('should generate demand forecast', async () => {
      const forecast = await service.generateDemandForecast(
        tenantId,
        warehouseId,
        30,
      );

      expect(forecast).toBeDefined();
      expect(forecast.horizonDays).toBe(30);
      expect(forecast.items.length).toBeGreaterThan(0);
      expect(forecast.items[0].stockoutRisk).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'demand_forecast.generated',
        expect.any(Object),
      );
    });

    it('should use default horizon days', async () => {
      const forecast = await service.generateDemandForecast(
        tenantId,
        warehouseId,
      );

      expect(forecast.horizonDays).toBe(30);
    });
  });

  describe('Alerts Management', () => {
    it('should create alert', async () => {
      const alert = await service.createAlert(
        tenantId,
        warehouseId,
        'Main Warehouse',
        AlertType.LOW_STOCK,
        AlertSeverity.WARNING,
        'Low Stock Alert',
        'SKU001 is below reorder point',
        { itemCode: 'SKU001', threshold: 100, currentValue: 50 },
      );

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.type).toBe(AlertType.LOW_STOCK);
      expect(alert.severity).toBe(AlertSeverity.WARNING);
      expect(alert.acknowledged).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'warehouse_alert.created',
        expect.any(Object),
      );
    });

    it('should acknowledge alert', async () => {
      const alert = await service.createAlert(
        tenantId,
        warehouseId,
        'Warehouse',
        AlertType.LOW_STOCK,
        AlertSeverity.WARNING,
        'Alert',
        'Message',
      );

      const acknowledged = await service.acknowledgeAlert(
        tenantId,
        alert.id,
        'user_1',
      );

      expect(acknowledged.acknowledged).toBe(true);
      expect(acknowledged.acknowledgedBy).toBe('user_1');
      expect(acknowledged.acknowledgedAt).toBeDefined();
    });

    it('should resolve alert', async () => {
      const alert = await service.createAlert(
        tenantId,
        warehouseId,
        'Warehouse',
        AlertType.LOW_STOCK,
        AlertSeverity.WARNING,
        'Alert',
        'Message',
      );

      const resolved = await service.resolveAlert(tenantId, alert.id);

      expect(resolved.resolvedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'warehouse_alert.resolved',
        expect.any(Object),
      );
    });

    it('should list alerts with filters', async () => {
      await service.createAlert(
        tenantId,
        warehouseId,
        'Warehouse',
        AlertType.LOW_STOCK,
        AlertSeverity.WARNING,
        'Alert 1',
        'Message 1',
      );
      await service.createAlert(
        tenantId,
        warehouseId,
        'Warehouse',
        AlertType.EXPIRED,
        AlertSeverity.CRITICAL,
        'Alert 2',
        'Message 2',
      );

      const warnings = await service.listAlerts(tenantId, {
        severity: AlertSeverity.WARNING,
      });

      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe(AlertSeverity.WARNING);
    });

    it('should get active alert count', async () => {
      await service.createAlert(
        tenantId,
        warehouseId,
        'Warehouse',
        AlertType.LOW_STOCK,
        AlertSeverity.WARNING,
        'Alert',
        'Message',
      );
      await service.createAlert(
        tenantId,
        warehouseId,
        'Warehouse',
        AlertType.EXPIRED,
        AlertSeverity.CRITICAL,
        'Alert',
        'Message',
      );

      const count = await service.getActiveAlertCount(tenantId, warehouseId);

      expect(count.total).toBe(2);
      expect(count.bySeverity[AlertSeverity.WARNING]).toBe(1);
      expect(count.bySeverity[AlertSeverity.CRITICAL]).toBe(1);
    });

    it('should throw when alert not found', async () => {
      await expect(
        service.getAlert(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Scheduled Reports', () => {
    const createReportDto: CreateScheduledReportDto = {
      name: 'Daily Inventory Report',
      reportType: ReportType.INVENTORY_SNAPSHOT,
      warehouseIds: ['warehouse_1', 'warehouse_2'],
      format: ReportFormat.PDF,
      schedule: ReportSchedule.DAILY,
      recipients: ['user@example.com'],
      createdBy: 'user_1',
    };

    it('should create scheduled report', async () => {
      const report = await service.createScheduledReport(
        tenantId,
        createReportDto,
      );

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.name).toBe('Daily Inventory Report');
      expect(report.reportType).toBe(ReportType.INVENTORY_SNAPSHOT);
      expect(report.isActive).toBe(true);
      expect(report.nextRunAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'scheduled_report.created',
        expect.any(Object),
      );
    });

    it('should update scheduled report', async () => {
      const report = await service.createScheduledReport(
        tenantId,
        createReportDto,
      );
      const updated = await service.updateScheduledReport(tenantId, report.id, {
        name: 'Updated Report Name',
        schedule: ReportSchedule.WEEKLY,
      });

      expect(updated.name).toBe('Updated Report Name');
      expect(updated.schedule).toBe(ReportSchedule.WEEKLY);
    });

    it('should toggle scheduled report', async () => {
      const report = await service.createScheduledReport(
        tenantId,
        createReportDto,
      );
      const disabled = await service.toggleScheduledReport(
        tenantId,
        report.id,
        false,
      );

      expect(disabled.isActive).toBe(false);
      expect(disabled.nextRunAt).toBeUndefined();
    });

    it('should list scheduled reports', async () => {
      await service.createScheduledReport(tenantId, createReportDto);
      await service.createScheduledReport(tenantId, {
        ...createReportDto,
        reportType: ReportType.ABC_ANALYSIS,
      });

      const reports = await service.listScheduledReports(tenantId, {
        reportType: ReportType.INVENTORY_SNAPSHOT,
      });

      expect(reports).toHaveLength(1);
    });

    it('should delete scheduled report', async () => {
      const report = await service.createScheduledReport(
        tenantId,
        createReportDto,
      );
      await service.deleteScheduledReport(tenantId, report.id);

      await expect(
        service.getScheduledReport(tenantId, report.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when report not found', async () => {
      await expect(
        service.getScheduledReport(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Report Generation', () => {
    it('should generate inventory snapshot report', async () => {
      const result = await service.generateReport(tenantId, {
        reportType: ReportType.INVENTORY_SNAPSHOT,
        warehouseId,
      });

      expect(result.reportId).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'report.generated',
        expect.any(Object),
      );
    });

    it('should generate stock aging report', async () => {
      const result = await service.generateReport(tenantId, {
        reportType: ReportType.STOCK_AGING,
        warehouseId,
        parameters: { expiryWarningDays: 45 },
      });

      expect(result.data.ageBuckets).toBeDefined();
    });

    it('should generate ABC analysis report', async () => {
      const result = await service.generateReport(tenantId, {
        reportType: ReportType.ABC_ANALYSIS,
        warehouseId,
        parameters: { criteria: 'velocity' },
      });

      expect(result.data.classA).toBeDefined();
    });

    it('should generate turnover analysis report', async () => {
      const dateFrom = new Date();
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);

      const result = await service.generateReport(tenantId, {
        reportType: ReportType.TURNOVER_ANALYSIS,
        warehouseId,
        dateFrom,
        dateTo: new Date(),
      });

      expect(result.data.turnoverRate).toBeDefined();
    });

    it('should generate demand forecast report', async () => {
      const result = await service.generateReport(tenantId, {
        reportType: ReportType.DEMAND_FORECAST,
        warehouseId,
        parameters: { horizonDays: 60 },
      });

      expect(result.data.items).toBeDefined();
    });
  });
});
