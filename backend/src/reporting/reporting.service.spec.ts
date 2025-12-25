import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ReportingService,
  ReportType,
  ReportFormat,
  ReportColumn,
  ReportFilter,
} from './reporting.service';

describe('ReportingService', () => {
  let service: ReportingService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should have default templates loaded', async () => {
      const templates = await service.listTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(6);
    });

    it('should get template by id', async () => {
      const template = await service.getTemplate('tpl-vat-report');

      expect(template).toBeDefined();
      expect(template!.type).toBe('VAT_REPORT');
      expect(template!.nameRo).toBe('Raport TVA');
    });

    it('should filter templates by type', async () => {
      const templates = await service.listTemplates('VAT_REPORT');

      expect(templates.every((t) => t.type === 'VAT_REPORT')).toBe(true);
    });

    it('should create custom template', async () => {
      const columns: ReportColumn[] = [
        { field: 'date', header: 'Date', headerRo: 'Data', format: 'date' },
        { field: 'amount', header: 'Amount', headerRo: 'Suma', format: 'currency' },
      ];

      const template = await service.createTemplate(
        'Custom Report',
        'Raport Personalizat',
        'CUSTOM',
        columns,
        'user-1',
        {
          description: 'A custom report',
          descriptionRo: 'Un raport personalizat',
        },
      );

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Report');
      expect(template.nameRo).toBe('Raport Personalizat');
      expect(template.columns).toHaveLength(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.template.created',
        expect.objectContaining({ templateId: template.id }),
      );
    });

    it('should update template', async () => {
      const template = await service.getTemplate('tpl-vat-report');
      const updated = await service.updateTemplate('tpl-vat-report', {
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(template!.createdAt.getTime());
    });

    it('should throw error when updating non-existent template', async () => {
      await expect(service.updateTemplate('invalid-id', {})).rejects.toThrow('Template not found');
    });

    it('should delete template (soft delete)', async () => {
      await service.createTemplate('To Delete', 'De Șters', 'CUSTOM', [], 'user-1');
      const templates = await service.listTemplates();
      const toDelete = templates.find((t) => t.name === 'To Delete');

      const result = await service.deleteTemplate(toDelete!.id);

      expect(result).toBe(true);

      const afterDelete = await service.listTemplates();
      expect(afterDelete.find((t) => t.id === toDelete!.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent template', async () => {
      const result = await service.deleteTemplate('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('Report Generation', () => {
    it('should generate report', async () => {
      const period = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };

      const report = await service.generateReport('VAT_REPORT', 'EXCEL', period, 'user-1');

      expect(report.id).toBeDefined();
      expect(report.type).toBe('VAT_REPORT');
      expect(report.format).toBe('EXCEL');
      expect(report.nameRo).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.requested',
        expect.objectContaining({ reportId: report.id }),
      );
    });

    it('should include Romanian type translation', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('VAT_REPORT', 'PDF', period, 'user-1');

      expect(report.metadata.typeName).toBe('Raport TVA');
    });

    it('should include format translation', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('PAYROLL', 'PDF', period, 'user-1');

      expect(report.metadata.formatName).toBe('Document PDF');
    });

    it('should generate report with template', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('VAT_REPORT', 'EXCEL', period, 'user-1', {
        templateId: 'tpl-vat-report',
      });

      expect(report.templateId).toBe('tpl-vat-report');
    });

    it('should generate report with filters', async () => {
      const period = { start: new Date(), end: new Date() };
      const filters: ReportFilter[] = [
        { field: 'taxableAmount', operator: 'gte', value: 5000 },
      ];

      const report = await service.generateReport('VAT_REPORT', 'EXCEL', period, 'user-1', {
        filters,
      });

      expect(report.filters).toHaveLength(1);
    });

    it('should complete report generation', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('SALES', 'JSON', period, 'user-1');

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await service.getReport(report.id);
      expect(updated!.status).toBe('COMPLETED');
      expect(updated!.fileUrl).toBeDefined();
      expect(updated!.rowCount).toBeGreaterThan(0);
    });

    it('should emit completed event', async () => {
      const period = { start: new Date(), end: new Date() };

      await service.generateReport('INVENTORY', 'EXCEL', period, 'user-1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.completed',
        expect.objectContaining({ type: 'INVENTORY' }),
      );
    });
  });

  describe('Report Types', () => {
    it('should generate financial summary report', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('FINANCIAL_SUMMARY', 'PDF', period, 'user-1');

      expect(report.type).toBe('FINANCIAL_SUMMARY');
    });

    it('should generate VAT report with helper', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateVatReport(period, 'user-1');

      expect(report.type).toBe('VAT_REPORT');
      expect(report.templateId).toBe('tpl-vat-report');
    });

    it('should generate SAF-T D406 report', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateSafTReport(period, 'user-1');

      expect(report.type).toBe('SAF_T_D406');
      expect(report.format).toBe('XML');
      expect(report.parameters.complianceStandard).toBe('ANAF Order 1783/2021');
    });

    it('should generate payroll report', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generatePayrollReport(period, 'user-1');

      expect(report.type).toBe('PAYROLL');
      expect(report.nameRo).toBe('Stat de Plată');
    });
  });

  describe('Report Data', () => {
    it('should get report data after generation', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('SALES', 'JSON', period, 'user-1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = await service.getReportData(report.id);

      expect(data).toBeDefined();
      expect(data!.columns).toBeDefined();
      expect(data!.rows).toBeDefined();
    });

    it('should include totals for numeric columns', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('SALES', 'JSON', period, 'user-1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = await service.getReportData(report.id);

      expect(data!.totals).toBeDefined();
      expect(data!.totals!.total).toBeDefined();
    });

    it('should include summary information', async () => {
      const period = { start: new Date(), end: new Date() };

      const report = await service.generateReport('INVENTORY', 'JSON', period, 'user-1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = await service.getReportData(report.id);

      expect(data!.summary).toBeDefined();
      expect(data!.summary!.totalRows).toBeDefined();
    });
  });

  describe('Report Management', () => {
    it('should get report by id', async () => {
      const period = { start: new Date(), end: new Date() };
      const created = await service.generateReport('SALES', 'PDF', period, 'user-1');

      const report = await service.getReport(created.id);

      expect(report).toBeDefined();
      expect(report!.id).toBe(created.id);
    });

    it('should list all reports', async () => {
      const period = { start: new Date(), end: new Date() };
      await service.generateReport('SALES', 'PDF', period, 'user-1');
      await service.generateReport('VAT_REPORT', 'EXCEL', period, 'user-1');

      const reports = await service.listReports();

      expect(reports.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter reports by type', async () => {
      const period = { start: new Date(), end: new Date() };
      await service.generateReport('SALES', 'PDF', period, 'user-1');
      await service.generateReport('VAT_REPORT', 'EXCEL', period, 'user-1');

      const reports = await service.listReports({ type: 'SALES' });

      expect(reports.every((r) => r.type === 'SALES')).toBe(true);
    });

    it('should filter reports by status', async () => {
      const period = { start: new Date(), end: new Date() };
      await service.generateReport('SALES', 'PDF', period, 'user-1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const reports = await service.listReports({ status: 'COMPLETED' });

      expect(reports.every((r) => r.status === 'COMPLETED')).toBe(true);
    });

    it('should filter reports by user', async () => {
      const period = { start: new Date(), end: new Date() };
      await service.generateReport('SALES', 'PDF', period, 'user-1');
      await service.generateReport('SALES', 'PDF', period, 'user-2');

      const reports = await service.listReports({ userId: 'user-1' });

      expect(reports.every((r) => r.createdBy === 'user-1')).toBe(true);
    });

    it('should limit report results', async () => {
      const period = { start: new Date(), end: new Date() };
      await service.generateReport('SALES', 'PDF', period, 'user-1');
      await service.generateReport('VAT_REPORT', 'EXCEL', period, 'user-1');
      await service.generateReport('PAYROLL', 'PDF', period, 'user-1');

      const reports = await service.listReports({ limit: 2 });

      expect(reports.length).toBeLessThanOrEqual(2);
    });

    it('should cancel pending report', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('SALES', 'PDF', period, 'user-1');

      const result = await service.cancelReport(report.id);

      expect(result).toBe(true);
      const updated = await service.getReport(report.id);
      expect(updated!.status).toBe('CANCELLED');
    });

    it('should delete report', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('SALES', 'PDF', period, 'user-1');

      const result = await service.deleteReport(report.id);

      expect(result).toBe(true);
      const deleted = await service.getReport(report.id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('Report Scheduling', () => {
    it('should create schedule', async () => {
      const schedule = await service.createSchedule(
        'tpl-vat-report',
        'Monthly VAT',
        'TVA Lunar',
        'MONTHLY',
        'user-1',
      );

      expect(schedule.id).toBeDefined();
      expect(schedule.templateId).toBe('tpl-vat-report');
      expect(schedule.frequency).toBe('MONTHLY');
      expect(schedule.nextRun).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.schedule.created',
        expect.objectContaining({ scheduleId: schedule.id }),
      );
    });

    it('should throw error for invalid template', async () => {
      await expect(
        service.createSchedule('invalid-template', 'Test', 'Test', 'DAILY', 'user-1'),
      ).rejects.toThrow('Template not found');
    });

    it('should create schedule with recipients', async () => {
      const schedule = await service.createSchedule(
        'tpl-payroll',
        'Weekly Payroll',
        'Stat de Plată Săptămânal',
        'WEEKLY',
        'user-1',
        {
          recipients: ['hr@company.com', 'finance@company.com'],
        },
      );

      expect(schedule.recipients).toHaveLength(2);
    });

    it('should get schedule by id', async () => {
      const created = await service.createSchedule(
        'tpl-sales',
        'Daily Sales',
        'Vânzări Zilnice',
        'DAILY',
        'user-1',
      );

      const schedule = await service.getSchedule(created.id);

      expect(schedule).toBeDefined();
      expect(schedule!.id).toBe(created.id);
    });

    it('should list schedules', async () => {
      await service.createSchedule('tpl-sales', 'Daily Sales', 'Vânzări Zilnice', 'DAILY', 'user-1');
      await service.createSchedule('tpl-vat-report', 'Monthly VAT', 'TVA Lunar', 'MONTHLY', 'user-1');

      const schedules = await service.listSchedules();

      expect(schedules.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter active schedules', async () => {
      await service.createSchedule('tpl-sales', 'Active', 'Activ', 'DAILY', 'user-1');

      const schedules = await service.listSchedules(true);

      expect(schedules.every((s) => s.isActive)).toBe(true);
    });

    it('should update schedule', async () => {
      const schedule = await service.createSchedule(
        'tpl-sales',
        'Daily Sales',
        'Vânzări Zilnice',
        'DAILY',
        'user-1',
      );

      const updated = await service.updateSchedule(schedule.id, {
        frequency: 'WEEKLY',
      });

      expect(updated.frequency).toBe('WEEKLY');
    });

    it('should recalculate next run on frequency change', async () => {
      const schedule = await service.createSchedule(
        'tpl-sales',
        'Daily Sales',
        'Vânzări Zilnice',
        'DAILY',
        'user-1',
      );

      const originalNextRun = schedule.nextRun;

      const updated = await service.updateSchedule(schedule.id, {
        frequency: 'MONTHLY',
      });

      expect(updated.nextRun.getTime()).not.toBe(originalNextRun.getTime());
    });

    it('should throw error when updating non-existent schedule', async () => {
      await expect(service.updateSchedule('invalid-id', {})).rejects.toThrow('Schedule not found');
    });

    it('should delete schedule', async () => {
      const schedule = await service.createSchedule(
        'tpl-sales',
        'To Delete',
        'De Șters',
        'DAILY',
        'user-1',
      );

      const result = await service.deleteSchedule(schedule.id);

      expect(result).toBe(true);
      const deleted = await service.getSchedule(schedule.id);
      expect(deleted).toBeUndefined();
    });

    it('should run scheduled report', async () => {
      const schedule = await service.createSchedule(
        'tpl-vat-report',
        'Monthly VAT',
        'TVA Lunar',
        'MONTHLY',
        'user-1',
      );

      const report = await service.runScheduledReport(schedule.id);

      expect(report.type).toBe('VAT_REPORT');
      expect(report.templateId).toBe('tpl-vat-report');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.schedule.executed',
        expect.objectContaining({ scheduleId: schedule.id }),
      );
    });

    it('should update lastRun after execution', async () => {
      const schedule = await service.createSchedule(
        'tpl-sales',
        'Daily Sales',
        'Vânzări Zilnice',
        'DAILY',
        'user-1',
      );

      expect(schedule.lastRun).toBeUndefined();

      await service.runScheduledReport(schedule.id);

      const updated = await service.getSchedule(schedule.id);
      expect(updated!.lastRun).toBeDefined();
    });

    it('should throw error for invalid schedule', async () => {
      await expect(service.runScheduledReport('invalid-id')).rejects.toThrow('Schedule not found');
    });
  });

  describe('Report Formats', () => {
    it('should generate JSON format', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('SALES', 'JSON', period, 'user-1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await service.getReport(report.id);
      expect(updated!.format).toBe('JSON');
      expect(updated!.fileUrl).toContain('.json');
    });

    it('should generate CSV format', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('SALES', 'CSV', period, 'user-1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await service.getReport(report.id);
      expect(updated!.format).toBe('CSV');
      expect(updated!.fileUrl).toContain('.csv');
    });

    it('should generate XML format', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('SAF_T_D406', 'XML', period, 'user-1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await service.getReport(report.id);
      expect(updated!.format).toBe('XML');
      expect(updated!.fileUrl).toContain('.xml');
    });

    it('should generate HTML format', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('SALES', 'HTML', period, 'user-1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await service.getReport(report.id);
      expect(updated!.format).toBe('HTML');
      expect(updated!.fileUrl).toContain('.html');
    });

    it('should generate PDF format', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('PAYROLL', 'PDF', period, 'user-1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await service.getReport(report.id);
      expect(updated!.format).toBe('PDF');
      expect(updated!.fileUrl).toContain('.pdf');
    });

    it('should generate EXCEL format', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('INVENTORY', 'EXCEL', period, 'user-1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = await service.getReport(report.id);
      expect(updated!.format).toBe('EXCEL');
      expect(updated!.fileUrl).toContain('.excel');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const period = { start: new Date(), end: new Date() };
      await service.generateReport('SALES', 'PDF', period, 'user-1');
      await service.generateReport('VAT_REPORT', 'EXCEL', period, 'user-1');
      await service.generateReport('SALES', 'CSV', period, 'user-2');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should return total reports count', async () => {
      const stats = await service.getReportStats();

      expect(stats.totalReports).toBeGreaterThanOrEqual(3);
    });

    it('should count reports by type', async () => {
      const stats = await service.getReportStats();

      expect(stats.reportsByType.SALES).toBeGreaterThanOrEqual(2);
      expect(stats.reportsByType.VAT_REPORT).toBeGreaterThanOrEqual(1);
    });

    it('should count reports by status', async () => {
      const stats = await service.getReportStats();

      expect(stats.reportsByStatus.COMPLETED).toBeGreaterThanOrEqual(3);
    });

    it('should count reports by format', async () => {
      const stats = await service.getReportStats();

      expect(stats.reportsByFormat.PDF).toBeGreaterThanOrEqual(1);
      expect(stats.reportsByFormat.EXCEL).toBeGreaterThanOrEqual(1);
      expect(stats.reportsByFormat.CSV).toBeGreaterThanOrEqual(1);
    });

    it('should calculate average row count', async () => {
      const stats = await service.getReportStats();

      expect(stats.averageRowCount).toBeGreaterThan(0);
    });
  });

  describe('Romanian Localization', () => {
    it('should translate report types', () => {
      expect(service.getReportTypeName('VAT_REPORT')).toBe('Raport TVA');
      expect(service.getReportTypeName('PAYROLL')).toBe('Stat de Plată');
      expect(service.getReportTypeName('BALANCE_SHEET')).toBe('Bilanț Contabil');
    });

    it('should translate formats', () => {
      expect(service.getFormatName('PDF')).toBe('Document PDF');
      expect(service.getFormatName('EXCEL')).toBe('Foaie de calcul Excel');
      expect(service.getFormatName('CSV')).toBe('Fișier CSV');
    });

    it('should get all report types with translations', () => {
      const types = service.getAllReportTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types.every((t) => t.nameRo)).toBe(true);
    });

    it('should get all formats with translations', () => {
      const formats = service.getAllFormats();

      expect(formats.length).toBeGreaterThan(0);
      expect(formats.every((f) => f.nameRo)).toBe(true);
    });

    it('should have Romanian diacritics in translations', () => {
      const payroll = service.getReportTypeName('PAYROLL');
      expect(payroll).toContain('ă'); // Stat de Plată

      const sheet = service.getReportTypeName('BALANCE_SHEET');
      expect(sheet).toContain('ț'); // Bilanț
    });

    it('should have Romanian column headers in templates', async () => {
      const template = await service.getTemplate('tpl-payroll');

      expect(template!.columns.some((c) => c.headerRo.includes('Angajat'))).toBe(true);
      expect(template!.columns.some((c) => c.headerRo.includes('Salariu'))).toBe(true);
    });
  });

  describe('Filter Operations', () => {
    it('should apply eq filter', async () => {
      const period = { start: new Date(), end: new Date() };
      const filters: ReportFilter[] = [{ field: 'partnerCUI', operator: 'eq', value: 'RO12345674' }];

      const report = await service.generateReport('VAT_REPORT', 'JSON', period, 'user-1', { filters });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = await service.getReportData(report.id);
      expect(data!.rows.every((r) => r.partnerCUI === 'RO12345674')).toBe(true);
    });

    it('should apply gte filter', async () => {
      const period = { start: new Date(), end: new Date() };
      const filters: ReportFilter[] = [{ field: 'taxableAmount', operator: 'gte', value: 5000 }];

      const report = await service.generateReport('VAT_REPORT', 'JSON', period, 'user-1', { filters });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = await service.getReportData(report.id);
      expect(data!.rows.every((r) => r.taxableAmount >= 5000)).toBe(true);
    });

    it('should apply contains filter', async () => {
      const period = { start: new Date(), end: new Date() };
      const filters: ReportFilter[] = [{ field: 'partnerName', operator: 'contains', value: 'srl' }];

      const report = await service.generateReport('VAT_REPORT', 'JSON', period, 'user-1', { filters });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = await service.getReportData(report.id);
      expect(data!.rows.every((r) => r.partnerName.toLowerCase().includes('srl'))).toBe(true);
    });

    it('should apply between filter', async () => {
      const period = { start: new Date(), end: new Date() };
      const filters: ReportFilter[] = [{ field: 'taxableAmount', operator: 'between', value: [4000, 11000] }];

      const report = await service.generateReport('VAT_REPORT', 'JSON', period, 'user-1', { filters });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = await service.getReportData(report.id);
      expect(data!.rows.every((r) => r.taxableAmount >= 4000 && r.taxableAmount <= 11000)).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit report.requested event', async () => {
      const period = { start: new Date(), end: new Date() };

      await service.generateReport('SALES', 'PDF', period, 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.requested',
        expect.objectContaining({ type: 'SALES' }),
      );
    });

    it('should emit report.completed event', async () => {
      const period = { start: new Date(), end: new Date() };

      await service.generateReport('SALES', 'PDF', period, 'user-1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.completed',
        expect.any(Object),
      );
    });

    it('should emit report.cancelled event', async () => {
      const period = { start: new Date(), end: new Date() };
      const report = await service.generateReport('SALES', 'PDF', period, 'user-1');

      await service.cancelReport(report.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.cancelled',
        expect.objectContaining({ reportId: report.id }),
      );
    });

    it('should emit template.created event', async () => {
      await service.createTemplate('New Template', 'Șablon Nou', 'CUSTOM', [], 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.template.created',
        expect.any(Object),
      );
    });

    it('should emit schedule.created event', async () => {
      await service.createSchedule('tpl-sales', 'Daily', 'Zilnic', 'DAILY', 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.schedule.created',
        expect.any(Object),
      );
    });

    it('should emit schedule.executed event', async () => {
      const schedule = await service.createSchedule(
        'tpl-sales',
        'Daily',
        'Zilnic',
        'DAILY',
        'user-1',
      );

      await service.runScheduledReport(schedule.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.schedule.executed',
        expect.objectContaining({ scheduleId: schedule.id }),
      );
    });
  });
});
