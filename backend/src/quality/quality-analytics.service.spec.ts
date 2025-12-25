import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  QualityAnalyticsService,
  ReportType,
  ReportFrequency,
  AlertSeverity,
  KPIType,
} from './quality-analytics.service';

describe('QualityAnalyticsService', () => {
  let service: QualityAnalyticsService;
  let eventEmitter: EventEmitter2;
  const tenantId = `tenant_qa_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityAnalyticsService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QualityAnalyticsService>(QualityAnalyticsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('KPI Operations', () => {
    describe('calculateKPIs', () => {
      it('should calculate all KPIs for a period', async () => {
        const kpis = await service.calculateKPIs(tenantId, '2024-Q1');

        expect(kpis).toBeDefined();
        expect(kpis.length).toBeGreaterThan(0);
        expect(kpis.some((k) => k.type === KPIType.FIRST_PASS_YIELD)).toBe(true);
        expect(kpis.some((k) => k.type === KPIType.DEFECT_RATE)).toBe(true);
        expect(kpis.some((k) => k.type === KPIType.NCR_CLOSURE_TIME)).toBe(true);
        expect(kpis.some((k) => k.type === KPIType.CAPA_EFFECTIVENESS)).toBe(true);
        expect(kpis.some((k) => k.type === KPIType.SUPPLIER_QUALITY_INDEX)).toBe(true);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.kpis.calculated',
          expect.any(Object),
        );
      });

      it('should set correct KPI status based on target', async () => {
        const kpis = await service.calculateKPIs(tenantId, '2024-Q1');

        for (const kpi of kpis) {
          expect(['on_target', 'warning', 'critical']).toContain(kpi.status);
          expect(['up', 'down', 'stable']).toContain(kpi.trend);
        }
      });
    });

    describe('getKPIs', () => {
      it('should get KPIs by tenant', async () => {
        await service.calculateKPIs(tenantId, '2024-Q1');
        const kpis = await service.getKPIs(tenantId);

        expect(kpis.length).toBeGreaterThan(0);
        expect(kpis.every((k) => k.tenantId === tenantId)).toBe(true);
      });

      it('should filter KPIs by period', async () => {
        await service.calculateKPIs(tenantId, '2024-Q1');
        await service.calculateKPIs(tenantId, '2024-Q2');

        const q1KPIs = await service.getKPIs(tenantId, '2024-Q1');
        const q2KPIs = await service.getKPIs(tenantId, '2024-Q2');

        expect(q1KPIs.every((k) => k.period === '2024-Q1')).toBe(true);
        expect(q2KPIs.every((k) => k.period === '2024-Q2')).toBe(true);
      });
    });
  });

  describe('Dashboard Operations', () => {
    describe('createDashboard', () => {
      it('should create a dashboard', async () => {
        const dashboard = await service.createDashboard(tenantId, {
          name: 'Quality Overview',
          description: 'Main quality dashboard',
          widgets: [
            {
              type: 'kpi',
              title: 'First Pass Yield',
              dataSource: 'kpi.fpy',
              config: {},
              position: { x: 0, y: 0, w: 4, h: 2 },
            },
            {
              type: 'chart',
              title: 'Defect Trend',
              dataSource: 'defects.trend',
              config: { chartType: 'line' },
              position: { x: 4, y: 0, w: 8, h: 4 },
            },
          ],
          ownerId: 'user_001',
          ownerName: 'QA Manager',
          isDefault: true,
        });

        expect(dashboard).toBeDefined();
        expect(dashboard.id).toBeDefined();
        expect(dashboard.name).toBe('Quality Overview');
        expect(dashboard.widgets).toHaveLength(2);
        expect(dashboard.widgets.every((w) => w.id)).toBe(true);
        expect(dashboard.isDefault).toBe(true);
      });

      it('should unset previous default when creating new default', async () => {
        const first = await service.createDashboard(tenantId, {
          name: 'First Dashboard',
          widgets: [],
          ownerId: 'user_001',
          ownerName: 'User',
          isDefault: true,
        });

        const second = await service.createDashboard(tenantId, {
          name: 'Second Dashboard',
          widgets: [],
          ownerId: 'user_001',
          ownerName: 'User',
          isDefault: true,
        });

        const firstUpdated = await service.getDashboard(tenantId, first.id);

        expect(firstUpdated.isDefault).toBe(false);
        expect(second.isDefault).toBe(true);
      });
    });

    describe('updateDashboard', () => {
      it('should update dashboard', async () => {
        const dashboard = await service.createDashboard(tenantId, {
          name: 'Original Name',
          widgets: [],
          ownerId: 'user_001',
          ownerName: 'User',
        });

        const updated = await service.updateDashboard(tenantId, dashboard.id, {
          name: 'Updated Name',
          description: 'New description',
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.description).toBe('New description');
      });
    });

    describe('listDashboards', () => {
      it('should list dashboards for tenant', async () => {
        await service.createDashboard(tenantId, {
          name: 'Dashboard 1',
          widgets: [],
          ownerId: 'user_001',
          ownerName: 'User 1',
        });

        await service.createDashboard(tenantId, {
          name: 'Dashboard 2',
          widgets: [],
          ownerId: 'user_002',
          ownerName: 'User 2',
          sharedWith: ['user_001'],
        });

        const all = await service.listDashboards(tenantId);
        const user1Dashboards = await service.listDashboards(tenantId, 'user_001');

        expect(all.length).toBeGreaterThanOrEqual(2);
        expect(user1Dashboards.length).toBeGreaterThanOrEqual(2); // Owns 1, shared with 1
      });
    });

    describe('getDefaultDashboard', () => {
      it('should get default dashboard', async () => {
        await service.createDashboard(tenantId, {
          name: 'Default Dashboard',
          widgets: [],
          ownerId: 'user_001',
          ownerName: 'User',
          isDefault: true,
        });

        const defaultDash = await service.getDefaultDashboard(tenantId);

        expect(defaultDash).toBeDefined();
        expect(defaultDash?.isDefault).toBe(true);
      });

      it('should return null if no default', async () => {
        const newTenant = `tenant_nodef_${Date.now()}`;
        const defaultDash = await service.getDefaultDashboard(newTenant);

        expect(defaultDash).toBeNull();
      });
    });
  });

  describe('Report Operations', () => {
    describe('generateReport', () => {
      it('should generate inspection summary report', async () => {
        const report = await service.generateReport(tenantId, {
          type: ReportType.INSPECTION_SUMMARY,
          name: 'Q1 Inspection Summary',
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-03-31'),
          generatedBy: 'user_001',
          generatedByName: 'QA Manager',
          format: 'json',
        });

        expect(report).toBeDefined();
        expect(report.status).toBe('completed');
        expect(report.data.totalInspections).toBeDefined();
        expect(report.summary).toBeDefined();
        expect(report.summary?.totalRecords).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.report.generated',
          expect.any(Object),
        );
      });

      it('should generate NCR analysis report', async () => {
        const report = await service.generateReport(tenantId, {
          type: ReportType.NCR_ANALYSIS,
          name: 'NCR Analysis',
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-03-31'),
          generatedBy: 'user_001',
          generatedByName: 'QA Manager',
          format: 'pdf',
        });

        expect(report.status).toBe('completed');
        expect(report.data.totalNCRs).toBeDefined();
      });

      it('should generate supplier scorecard report', async () => {
        const report = await service.generateReport(tenantId, {
          type: ReportType.SUPPLIER_SCORECARD,
          name: 'Supplier Scorecard',
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-03-31'),
          generatedBy: 'user_001',
          generatedByName: 'QA Manager',
          format: 'excel',
        });

        expect(report.status).toBe('completed');
        expect(report.data.totalSuppliers).toBeDefined();
      });
    });

    describe('listReports', () => {
      it('should list reports', async () => {
        await service.generateReport(tenantId, {
          type: ReportType.INSPECTION_SUMMARY,
          name: 'Report 1',
          dateFrom: new Date(),
          dateTo: new Date(),
          generatedBy: 'user_001',
          generatedByName: 'User',
          format: 'json',
        });

        const reports = await service.listReports(tenantId, {});

        expect(reports.length).toBeGreaterThan(0);
      });

      it('should filter reports by type', async () => {
        await service.generateReport(tenantId, {
          type: ReportType.INSPECTION_SUMMARY,
          name: 'Inspection',
          dateFrom: new Date(),
          dateTo: new Date(),
          generatedBy: 'user_001',
          generatedByName: 'User',
          format: 'json',
        });

        await service.generateReport(tenantId, {
          type: ReportType.NCR_ANALYSIS,
          name: 'NCR',
          dateFrom: new Date(),
          dateTo: new Date(),
          generatedBy: 'user_001',
          generatedByName: 'User',
          format: 'json',
        });

        const inspectionReports = await service.listReports(tenantId, {
          type: ReportType.INSPECTION_SUMMARY,
        });

        expect(
          inspectionReports.every((r) => r.type === ReportType.INSPECTION_SUMMARY),
        ).toBe(true);
      });
    });
  });

  describe('Scheduled Reports', () => {
    describe('scheduleReport', () => {
      it('should schedule a report', async () => {
        const scheduled = await service.scheduleReport(tenantId, {
          type: ReportType.INSPECTION_SUMMARY,
          name: 'Weekly Inspection Summary',
          frequency: ReportFrequency.WEEKLY,
          recipients: ['user_001@example.com', 'user_002@example.com'],
          format: 'pdf',
          createdBy: 'user_001',
          createdByName: 'QA Manager',
        });

        expect(scheduled).toBeDefined();
        expect(scheduled.frequency).toBe(ReportFrequency.WEEKLY);
        expect(scheduled.isActive).toBe(true);
        expect(scheduled.nextRunDate).toBeDefined();
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.report.scheduled',
          expect.any(Object),
        );
      });
    });

    describe('toggleScheduledReport', () => {
      it('should toggle scheduled report active status', async () => {
        const scheduled = await service.scheduleReport(tenantId, {
          type: ReportType.NCR_ANALYSIS,
          name: 'Monthly NCR',
          frequency: ReportFrequency.MONTHLY,
          recipients: ['user@example.com'],
          format: 'excel',
          createdBy: 'user_001',
          createdByName: 'User',
        });

        const toggled = await service.toggleScheduledReport(
          tenantId,
          scheduled.id,
          false,
        );

        expect(toggled.isActive).toBe(false);
      });
    });

    describe('listScheduledReports', () => {
      it('should list scheduled reports', async () => {
        await service.scheduleReport(tenantId, {
          type: ReportType.INSPECTION_SUMMARY,
          name: 'Test',
          frequency: ReportFrequency.DAILY,
          recipients: ['test@example.com'],
          format: 'csv',
          createdBy: 'user_001',
          createdByName: 'User',
        });

        const scheduled = await service.listScheduledReports(tenantId);

        expect(scheduled.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Alert Operations', () => {
    describe('createAlert', () => {
      it('should create an alert', async () => {
        const alert = await service.createAlert(tenantId, {
          type: 'ncr_threshold',
          severity: AlertSeverity.WARNING,
          title: 'NCR Threshold Exceeded',
          message: 'NCR count has exceeded the monthly threshold',
          source: 'ncr_monitoring',
          data: { count: 15, threshold: 10 },
        });

        expect(alert).toBeDefined();
        expect(alert.isRead).toBe(false);
        expect(alert.isAcknowledged).toBe(false);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'quality.alert.created',
          expect.any(Object),
        );
      });
    });

    describe('markAlertRead', () => {
      it('should mark alert as read', async () => {
        const alert = await service.createAlert(tenantId, {
          type: 'test',
          severity: AlertSeverity.INFO,
          title: 'Test Alert',
          message: 'Test message',
          source: 'test',
        });

        const read = await service.markAlertRead(tenantId, alert.id, 'user_001');

        expect(read.isRead).toBe(true);
        expect(read.readAt).toBeDefined();
        expect(read.readBy).toBe('user_001');
      });
    });

    describe('acknowledgeAlert', () => {
      it('should acknowledge alert', async () => {
        const alert = await service.createAlert(tenantId, {
          type: 'critical_issue',
          severity: AlertSeverity.CRITICAL,
          title: 'Critical Issue',
          message: 'Production line stopped',
          source: 'production',
        });

        const acknowledged = await service.acknowledgeAlert(
          tenantId,
          alert.id,
          'user_001',
          'QA Manager',
        );

        expect(acknowledged.isAcknowledged).toBe(true);
        expect(acknowledged.acknowledgedBy).toBe('user_001');
        expect(acknowledged.acknowledgedByName).toBe('QA Manager');
      });
    });

    describe('listAlerts', () => {
      it('should list alerts', async () => {
        await service.createAlert(tenantId, {
          type: 'test',
          severity: AlertSeverity.INFO,
          title: 'Info Alert',
          message: 'Info',
          source: 'test',
        });

        await service.createAlert(tenantId, {
          type: 'test',
          severity: AlertSeverity.CRITICAL,
          title: 'Critical Alert',
          message: 'Critical',
          source: 'test',
        });

        const all = await service.listAlerts(tenantId, {});
        const critical = await service.listAlerts(tenantId, {
          severity: AlertSeverity.CRITICAL,
        });

        expect(all.length).toBeGreaterThan(0);
        expect(critical.every((a) => a.severity === AlertSeverity.CRITICAL)).toBe(true);
      });

      it('should filter by read status', async () => {
        const alert = await service.createAlert(tenantId, {
          type: 'test',
          severity: AlertSeverity.INFO,
          title: 'Test',
          message: 'Test',
          source: 'test',
        });
        await service.markAlertRead(tenantId, alert.id, 'user_001');

        const unread = await service.listAlerts(tenantId, { isRead: false });

        expect(unread.every((a) => !a.isRead)).toBe(true);
      });
    });

    describe('getUnreadAlertCount', () => {
      it('should get unread alert count', async () => {
        const newTenant = `tenant_unread_${Date.now()}`;

        await service.createAlert(newTenant, {
          type: 'test',
          severity: AlertSeverity.INFO,
          title: 'Alert 1',
          message: 'Test',
          source: 'test',
        });

        const alert2 = await service.createAlert(newTenant, {
          type: 'test',
          severity: AlertSeverity.INFO,
          title: 'Alert 2',
          message: 'Test',
          source: 'test',
        });

        await service.markAlertRead(newTenant, alert2.id, 'user_001');

        const count = await service.getUnreadAlertCount(newTenant);

        expect(count).toBe(1);
      });
    });
  });

  describe('Trend Analysis', () => {
    describe('analyzeTrend', () => {
      it('should analyze trend for a metric', async () => {
        const dateFrom = new Date('2024-01-01');
        const dateTo = new Date('2024-01-31');

        const trend = await service.analyzeTrend(
          tenantId,
          KPIType.FIRST_PASS_YIELD,
          dateFrom,
          dateTo,
        );

        expect(trend).toBeDefined();
        expect(trend.metric).toBe(KPIType.FIRST_PASS_YIELD);
        expect(trend.dataPoints.length).toBeGreaterThan(0);
        expect(trend.average).toBeDefined();
        expect(trend.min).toBeDefined();
        expect(trend.max).toBeDefined();
        expect(['improving', 'declining', 'stable']).toContain(trend.trend);
      });
    });
  });

  describe('Cost of Quality', () => {
    describe('calculateCostOfQuality', () => {
      it('should calculate cost of quality', async () => {
        const dateFrom = new Date('2024-01-01');
        const dateTo = new Date('2024-03-31');

        const coq = await service.calculateCostOfQuality(tenantId, dateFrom, dateTo);

        expect(coq).toBeDefined();
        expect(coq.preventionCost).toBeDefined();
        expect(coq.appraisalCost).toBeDefined();
        expect(coq.internalFailureCost).toBeDefined();
        expect(coq.externalFailureCost).toBeDefined();
        expect(coq.totalCost).toBe(
          coq.preventionCost +
            coq.appraisalCost +
            coq.internalFailureCost +
            coq.externalFailureCost,
        );
        expect(coq.breakdown).toHaveLength(4);
        expect(
          coq.breakdown.reduce((sum: number, b: any) => sum + b.percentage, 0),
        ).toBeCloseTo(100);
      });
    });
  });
});
