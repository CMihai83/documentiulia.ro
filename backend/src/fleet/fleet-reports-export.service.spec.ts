import { Test, TestingModule } from '@nestjs/testing';
import { FleetReportsExportService, ExtendedExportFormat, ReportTemplate } from './fleet-reports-export.service';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FleetReportsExportService', () => {
  let service: FleetReportsExportService;
  let reportingService: ReportingService;

  const mockUserId = 'user-123';
  const mockTemplateId = 'tpl-1-123456';

  const mockFleetPerformanceReport = {
    period: { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
    summary: {
      totalRoutes: 100,
      completedRoutes: 95,
      partialRoutes: 3,
      cancelledRoutes: 2,
      completionRate: 95,
      totalDeliveries: 1500,
      successfulDeliveries: 1450,
      failedDeliveries: 50,
      deliverySuccessRate: 97,
      totalDistanceKm: 5000,
      avgDistancePerRouteKm: 50,
    },
    byVehicle: [
      {
        vehicleId: 'v-1',
        licensePlate: 'M-DL 1234',
        routesCompleted: 30,
        deliveriesCompleted: 450,
        deliverySuccessRate: 98,
        totalDistanceKm: 1500,
        avgDeliveriesPerRoute: 15,
      },
    ],
    byDriver: [
      {
        driverId: 'd-1',
        driverName: 'Hans Müller',
        routesCompleted: 25,
        deliveriesCompleted: 375,
        deliverySuccessRate: 96,
        avgTimePerDeliveryMin: 5.2,
      },
    ],
    byZone: [
      { zone: 'München-Ost', deliveries: 500, successRate: 97 },
    ],
  };

  const mockPrisma = {
    vehicle: {
      count: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
  };

  const mockReportingService = {
    generateFleetPerformanceReport: jest.fn().mockResolvedValue(mockFleetPerformanceReport),
    generateFuelConsumptionReport: jest.fn().mockResolvedValue({
      period: { from: new Date(), to: new Date() },
      summary: { totalLiters: 1000, totalCostEur: 1500 },
      byVehicle: [],
      byMonth: [],
    }),
    generateVehicleUtilizationReport: jest.fn().mockResolvedValue({
      period: { from: new Date(), to: new Date() },
      summary: { totalVehicles: 10, avgUtilizationPercent: 75 },
      byVehicle: [],
    }),
    generateMaintenanceCostReport: jest.fn().mockResolvedValue({
      period: { from: new Date(), to: new Date() },
      summary: { totalCostEur: 5000 },
      byVehicle: [],
      byType: [],
    }),
    generateDriverPayoutReport: jest.fn().mockResolvedValue({
      period: { from: new Date(), to: new Date() },
      summary: { totalDrivers: 10, totalNetEur: 15000 },
      byDriver: [],
    }),
    generateCourierReconciliationReport: jest.fn().mockResolvedValue({
      period: { from: new Date(), to: new Date() },
      byProvider: [],
      totals: { totalDeliveries: 500, totalPaymentEur: 2500 },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetReportsExportService,
        { provide: ReportingService, useValue: mockReportingService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FleetReportsExportService>(FleetReportsExportService);
    reportingService = module.get<ReportingService>(ReportingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =================== REPORT TEMPLATES ===================

  describe('createTemplate', () => {
    it('should create a report template', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Weekly Performance',
        reportType: 'fleet_performance',
        format: 'pdf',
        periodType: 'WEEKLY',
        includeCharts: true,
        emailRecipients: ['manager@example.com'],
      });

      expect(template).toBeDefined();
      expect(template.id).toContain('tpl-');
      expect(template.userId).toBe(mockUserId);
      expect(template.name).toBe('Weekly Performance');
      expect(template.reportType).toBe('fleet_performance');
      expect(template.format).toBe('pdf');
      expect(template.periodType).toBe('WEEKLY');
      expect(template.includeCharts).toBe(true);
      expect(template.emailRecipients).toContain('manager@example.com');
    });

    it('should create template with custom period', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Custom 14-Day Report',
        reportType: 'fuel_consumption',
        format: 'xlsx',
        periodType: 'CUSTOM',
        customPeriodDays: 14,
        includeCharts: false,
      });

      expect(template.periodType).toBe('CUSTOM');
      expect(template.customPeriodDays).toBe(14);
    });

    it('should create template with filters', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Filtered Report',
        reportType: 'fleet_performance',
        format: 'json',
        periodType: 'MONTHLY',
        includeCharts: true,
        filters: {
          vehicleIds: ['v-1', 'v-2'],
          driverIds: ['d-1'],
          zones: ['München-Ost'],
        },
      });

      expect(template.filters?.vehicleIds).toContain('v-1');
      expect(template.filters?.driverIds).toContain('d-1');
      expect(template.filters?.zones).toContain('München-Ost');
    });
  });

  describe('getTemplates', () => {
    beforeEach(async () => {
      await service.createTemplate(mockUserId, {
        name: 'Template 1',
        reportType: 'fleet_performance',
        format: 'json',
        periodType: 'DAILY',
        includeCharts: false,
      });
      await service.createTemplate(mockUserId, {
        name: 'Template 2',
        reportType: 'fuel_consumption',
        format: 'csv',
        periodType: 'WEEKLY',
        includeCharts: true,
      });
    });

    it('should return user templates', async () => {
      const templates = await service.getTemplates(mockUserId);
      expect(templates.length).toBe(2);
    });

    it('should not return other users templates', async () => {
      const templates = await service.getTemplates('other-user');
      expect(templates.length).toBe(0);
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Original Name',
        reportType: 'fleet_performance',
        format: 'json',
        periodType: 'DAILY',
        includeCharts: false,
      });

      const updated = await service.updateTemplate(template.id, {
        name: 'Updated Name',
        format: 'xlsx',
        includeCharts: true,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.format).toBe('xlsx');
      expect(updated?.includeCharts).toBe(true);
    });

    it('should return null for non-existent template', async () => {
      const result = await service.updateTemplate('invalid-id', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'To Delete',
        reportType: 'fleet_performance',
        format: 'json',
        periodType: 'DAILY',
        includeCharts: false,
      });

      const deleted = await service.deleteTemplate(template.id);
      expect(deleted).toBe(true);

      const found = await service.getTemplate(template.id);
      expect(found).toBeNull();
    });
  });

  // =================== REPORT EXPORT ===================

  describe('exportReport', () => {
    const from = new Date('2025-01-01');
    const to = new Date('2025-01-31');

    it('should export to JSON', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'json',
        from,
        to,
      });

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toContain('.json');
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(typeof result.data).toBe('string');
    });

    it('should export to CSV', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'csv',
        from,
        to,
      });

      expect(result.contentType).toBe('text/csv;charset=utf-8');
      expect(result.filename).toContain('.csv');
    });

    it('should export to XLSX', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'xlsx',
        from,
        to,
      });

      expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.filename).toContain('.xlsx');
    });

    it('should export to PDF', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'pdf',
        from,
        to,
      });

      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toContain('.pdf');
    });

    it('should export to HTML', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'html',
        from,
        to,
      });

      expect(result.contentType).toBe('text/html;charset=utf-8');
      expect(result.filename).toContain('.html');
      expect(result.data).toContain('<!DOCTYPE html>');
    });

    it('should export fuel consumption report', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fuel_consumption',
        format: 'json',
        from,
        to,
      });

      expect(mockReportingService.generateFuelConsumptionReport).toHaveBeenCalledWith(
        mockUserId,
        from,
        to,
      );
      expect(result).toBeDefined();
    });

    it('should export driver payout report', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'driver_payout',
        format: 'csv',
        from,
        to,
      });

      expect(mockReportingService.generateDriverPayoutReport).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error for unknown report type', async () => {
      await expect(
        service.exportReport(mockUserId, {
          reportType: 'unknown_report',
          format: 'json',
          from,
          to,
        }),
      ).rejects.toThrow('Unknown report type');
    });

    it('should save export to history', async () => {
      await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'json',
        from,
        to,
      });

      const history = await service.getExportHistory(mockUserId);
      expect(history.length).toBe(1);
      expect(history[0].reportType).toBe('fleet_performance');
      expect(history[0].format).toBe('json');
    });
  });

  describe('bulkExport', () => {
    it('should export multiple reports', async () => {
      const result = await service.bulkExport(
        mockUserId,
        ['fleet_performance', 'fuel_consumption', 'driver_payout'],
        'json',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result.exports.length).toBe(3);
      expect(result.totalSize).toBeGreaterThan(0);
    });

    it('should handle failed exports gracefully', async () => {
      mockReportingService.generateFleetPerformanceReport.mockRejectedValueOnce(
        new Error('Test error'),
      );

      const result = await service.bulkExport(
        mockUserId,
        ['fleet_performance', 'fuel_consumption'],
        'json',
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result.exports.length).toBe(1); // Only fuel_consumption succeeded
    });
  });

  describe('getExportHistory', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await service.exportReport(mockUserId, {
          reportType: 'fleet_performance',
          format: 'json',
          from: new Date('2025-01-01'),
          to: new Date('2025-01-31'),
        });
      }
    });

    it('should return export history', async () => {
      const history = await service.getExportHistory(mockUserId);
      expect(history.length).toBe(5);
    });

    it('should respect limit', async () => {
      const history = await service.getExportHistory(mockUserId, 3);
      expect(history.length).toBe(3);
    });

    it('should order by creation date descending', async () => {
      const history = await service.getExportHistory(mockUserId);
      for (let i = 1; i < history.length; i++) {
        expect(history[i - 1].createdAt.getTime())
          .toBeGreaterThanOrEqual(history[i].createdAt.getTime());
      }
    });
  });

  // =================== SCHEDULED REPORTS ===================

  describe('scheduleReport', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Test Template',
        reportType: 'fleet_performance',
        format: 'pdf',
        periodType: 'WEEKLY',
        includeCharts: true,
      });
      templateId = template.id;
    });

    it('should schedule a daily report', async () => {
      const schedule = await service.scheduleReport(mockUserId, {
        templateId,
        frequency: 'DAILY',
        time: '08:00',
        nextRunAt: new Date('2025-01-02T08:00:00'),
      });

      expect(schedule).toBeDefined();
      expect(schedule.id).toContain('sched-');
      expect(schedule.frequency).toBe('DAILY');
      expect(schedule.time).toBe('08:00');
      expect(schedule.status).toBe('ACTIVE');
    });

    it('should schedule a weekly report', async () => {
      const schedule = await service.scheduleReport(mockUserId, {
        templateId,
        frequency: 'WEEKLY',
        dayOfWeek: 1, // Monday
        time: '09:00',
        nextRunAt: new Date('2025-01-06T09:00:00'),
      });

      expect(schedule.frequency).toBe('WEEKLY');
      expect(schedule.dayOfWeek).toBe(1);
    });

    it('should schedule a monthly report', async () => {
      const schedule = await service.scheduleReport(mockUserId, {
        templateId,
        frequency: 'MONTHLY',
        dayOfMonth: 1,
        time: '07:00',
        nextRunAt: new Date('2025-02-01T07:00:00'),
      });

      expect(schedule.frequency).toBe('MONTHLY');
      expect(schedule.dayOfMonth).toBe(1);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        service.scheduleReport(mockUserId, {
          templateId: 'invalid-template',
          frequency: 'DAILY',
          time: '08:00',
          nextRunAt: new Date(),
        }),
      ).rejects.toThrow('Template not found');
    });
  });

  describe('getScheduledReports', () => {
    beforeEach(async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Test Template',
        reportType: 'fleet_performance',
        format: 'pdf',
        periodType: 'DAILY',
        includeCharts: true,
      });

      await service.scheduleReport(mockUserId, {
        templateId: template.id,
        frequency: 'DAILY',
        time: '08:00',
        nextRunAt: new Date(),
      });
    });

    it('should return scheduled reports for user', async () => {
      const schedules = await service.getScheduledReports(mockUserId);
      expect(schedules.length).toBe(1);
    });

    it('should not return other users schedules', async () => {
      const schedules = await service.getScheduledReports('other-user');
      expect(schedules.length).toBe(0);
    });
  });

  describe('pauseScheduledReport', () => {
    it('should pause scheduled report', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Test',
        reportType: 'fleet_performance',
        format: 'json',
        periodType: 'DAILY',
        includeCharts: false,
      });

      const schedule = await service.scheduleReport(mockUserId, {
        templateId: template.id,
        frequency: 'DAILY',
        time: '08:00',
        nextRunAt: new Date(),
      });

      await service.pauseScheduledReport(schedule.id);

      const schedules = await service.getScheduledReports(mockUserId);
      expect(schedules[0].status).toBe('PAUSED');
    });
  });

  describe('resumeScheduledReport', () => {
    it('should resume paused scheduled report', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Test',
        reportType: 'fleet_performance',
        format: 'json',
        periodType: 'DAILY',
        includeCharts: false,
      });

      const schedule = await service.scheduleReport(mockUserId, {
        templateId: template.id,
        frequency: 'DAILY',
        time: '08:00',
        nextRunAt: new Date(),
      });

      await service.pauseScheduledReport(schedule.id);
      await service.resumeScheduledReport(schedule.id);

      const schedules = await service.getScheduledReports(mockUserId);
      expect(schedules[0].status).toBe('ACTIVE');
    });
  });

  describe('deleteScheduledReport', () => {
    it('should delete scheduled report', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Test',
        reportType: 'fleet_performance',
        format: 'json',
        periodType: 'DAILY',
        includeCharts: false,
      });

      const schedule = await service.scheduleReport(mockUserId, {
        templateId: template.id,
        frequency: 'DAILY',
        time: '08:00',
        nextRunAt: new Date(),
      });

      const deleted = await service.deleteScheduledReport(schedule.id);
      expect(deleted).toBe(true);

      const schedules = await service.getScheduledReports(mockUserId);
      expect(schedules.length).toBe(0);
    });
  });

  // =================== QUICK SUMMARY ===================

  describe('getQuickSummary', () => {
    beforeEach(() => {
      mockPrisma.vehicle.count.mockResolvedValue(10);
      mockPrisma.deliveryRoute.findMany.mockResolvedValue([]);
    });

    it('should return quick summary', async () => {
      const summary = await service.getQuickSummary(mockUserId);

      expect(summary).toBeDefined();
      expect(typeof summary.todayDeliveries).toBe('number');
      expect(typeof summary.weeklyPerformance).toBe('number');
      expect(typeof summary.activeVehicles).toBe('number');
      expect(typeof summary.scheduledReports).toBe('number');
      expect(typeof summary.recentExports).toBe('number');
    });

    it('should count active vehicles', async () => {
      mockPrisma.vehicle.count.mockResolvedValue(8);

      const summary = await service.getQuickSummary(mockUserId);
      expect(summary.activeVehicles).toBe(8);
    });
  });

  // =================== CONTENT FORMATTING ===================

  describe('HTML export content', () => {
    it('should include proper HTML structure', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'html',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const html = result.data as string;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('Flottenleistungsbericht');
    });

    it('should include German labels', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'html',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const html = result.data as string;
      expect(html).toContain('Zusammenfassung');
    });
  });

  describe('CSV export content', () => {
    it('should include headers and data rows', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'csv',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const csv = result.data as string;
      expect(csv).toContain('vehicleId');
      expect(csv).toContain('M-DL 1234');
    });

    it('should handle special characters', async () => {
      const reportWithSpecialChars = {
        ...mockFleetPerformanceReport,
        byVehicle: [
          {
            ...mockFleetPerformanceReport.byVehicle[0],
            licensePlate: 'M-DL "Test", 1234',
          },
        ],
      };
      mockReportingService.generateFleetPerformanceReport.mockResolvedValueOnce(reportWithSpecialChars);

      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'csv',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const csv = result.data as string;
      expect(csv).toContain('"M-DL ""Test"", 1234"');
    });
  });

  describe('XLSX export content', () => {
    it('should include workbook structure', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'xlsx',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const workbook = result.data as any;
      expect(workbook.sheets).toBeDefined();
      expect(workbook.metadata).toBeDefined();
      expect(workbook.metadata.title).toBe('Flottenleistungsbericht');
    });

    it('should include summary sheet', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'xlsx',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const workbook = result.data as any;
      const summarySheet = workbook.sheets.find((s: any) => s.name === 'Zusammenfassung');
      expect(summarySheet).toBeDefined();
    });
  });

  describe('PDF export content', () => {
    it('should include PDF structure', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'pdf',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const pdf = result.data as any;
      expect(pdf.metadata).toBeDefined();
      expect(pdf.pages).toBeDefined();
      expect(pdf.pages.length).toBeGreaterThan(0);
    });

    it('should include title page', async () => {
      const result = await service.exportReport(mockUserId, {
        reportType: 'fleet_performance',
        format: 'pdf',
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      const pdf = result.data as any;
      const titlePage = pdf.pages.find((p: any) => p.type === 'title');
      expect(titlePage).toBeDefined();
      expect(titlePage.content.title).toBe('Flottenleistungsbericht');
    });
  });
});
