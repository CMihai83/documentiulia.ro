import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ReportGeneratorService,
  ReportColumn,
  ReportFormat,
} from './report-generator.service';

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportGeneratorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<ReportGeneratorService>(ReportGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('System Templates', () => {
    it('should initialize system templates', async () => {
      const templates = await service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have invoice summary template', async () => {
      const template = await service.getTemplate('tpl-invoice-summary');
      expect(template).toBeDefined();
      expect(template?.category).toBe('financial');
    });

    it('should have HR templates', async () => {
      const templates = await service.getTemplates('hr');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have fleet templates', async () => {
      const templates = await service.getTemplates('fleet');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have compliance templates', async () => {
      const templates = await service.getTemplates('compliance');
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Template CRUD', () => {
    it('should create custom template', async () => {
      const columns: ReportColumn[] = [
        { field: 'name', header: 'Name', type: 'string' },
        { field: 'amount', header: 'Amount', type: 'currency', aggregation: 'sum' },
      ];

      const template = await service.createTemplate(
        'Custom Report',
        'A custom report',
        'custom',
        'custom_data',
        columns,
        userId,
      );

      expect(template).toBeDefined();
      expect(template.id).toMatch(/^tpl-/);
      expect(template.name).toBe('Custom Report');
      expect(template.isSystem).toBe(false);
    });

    it('should get template by ID', async () => {
      const columns: ReportColumn[] = [
        { field: 'test', header: 'Test', type: 'string' },
      ];
      const created = await service.createTemplate('Test', 'Test', 'custom', 'test', columns, userId);
      const retrieved = await service.getTemplate(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should filter templates by category', async () => {
      const financial = await service.getTemplates('financial');
      expect(financial.every(t => t.category === 'financial')).toBe(true);
    });

    it('should filter out system templates', async () => {
      const columns: ReportColumn[] = [
        { field: 'custom', header: 'Custom', type: 'string' },
      ];
      await service.createTemplate('Non-System', 'Test', 'custom', 'test', columns, userId);

      const customOnly = await service.getTemplates(undefined, false);
      expect(customOnly.every(t => !t.isSystem)).toBe(true);
    });

    it('should update custom template', async () => {
      const columns: ReportColumn[] = [
        { field: 'test', header: 'Test', type: 'string' },
      ];
      const created = await service.createTemplate('Original', 'Test', 'custom', 'test', columns, userId);
      const updated = await service.updateTemplate(created.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated description');
    });

    it('should not update system template', async () => {
      const result = await service.updateTemplate('tpl-invoice-summary', { name: 'Hacked' });
      expect(result).toBeNull();
    });

    it('should delete custom template', async () => {
      const columns: ReportColumn[] = [
        { field: 'test', header: 'Test', type: 'string' },
      ];
      const created = await service.createTemplate('To Delete', 'Test', 'custom', 'test', columns, userId);
      const deleted = await service.deleteTemplate(created.id);

      expect(deleted).toBe(true);
      expect(await service.getTemplate(created.id)).toBeNull();
    });

    it('should not delete system template', async () => {
      const deleted = await service.deleteTemplate('tpl-invoice-summary');
      expect(deleted).toBe(false);
    });

    it('should create template with options', async () => {
      const columns: ReportColumn[] = [
        { field: 'date', header: 'Date', type: 'date' },
        { field: 'value', header: 'Value', type: 'number' },
      ];

      const template = await service.createTemplate(
        'With Options',
        'Template with all options',
        'custom',
        'custom_data',
        columns,
        userId,
        {
          filters: [{ field: 'status', operator: 'eq', value: 'active' }],
          groupBy: ['date'],
          sortBy: [{ field: 'date', direction: 'desc' }],
          styling: { headerColor: '#1e40af', fontSize: 14 },
        },
      );

      expect(template.filters).toHaveLength(1);
      expect(template.groupBy).toContain('date');
      expect(template.sortBy?.[0].direction).toBe('desc');
      expect(template.styling?.headerColor).toBe('#1e40af');
    });
  });

  describe('Report Generation', () => {
    it('should generate report from template', async () => {
      const report = await service.generateReport(
        tenantId,
        'tpl-invoice-summary',
        'json',
        userId,
      );

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^rpt-/);
      expect(report.templateId).toBe('tpl-invoice-summary');
      expect(report.format).toBe('json');
      expect(['pending', 'processing', 'completed']).toContain(report.status);
    });

    it('should generate report with parameters', async () => {
      const report = await service.generateReport(
        tenantId,
        'tpl-invoice-summary',
        'csv',
        userId,
        { rowCount: 50, startDate: '2024-01-01' },
      );

      expect(report.parameters).toBeDefined();
      expect(report.parameters?.rowCount).toBe(50);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        service.generateReport(tenantId, 'non-existent', 'json', userId),
      ).rejects.toThrow('Template not found');
    });

    it('should get report by ID', async () => {
      const created = await service.generateReport(tenantId, 'tpl-invoice-summary', 'json', userId);
      const retrieved = await service.getReport(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get reports for tenant', async () => {
      await service.generateReport(tenantId, 'tpl-invoice-summary', 'json', userId);
      await service.generateReport(tenantId, 'tpl-vat-report', 'csv', userId);
      await service.generateReport('other-tenant', 'tpl-invoice-summary', 'pdf', userId);

      const reports = await service.getReports(tenantId);
      expect(reports.length).toBeGreaterThanOrEqual(2);
      expect(reports.every(r => r.tenantId === tenantId)).toBe(true);
    });

    it('should filter reports by template', async () => {
      await service.generateReport(tenantId, 'tpl-invoice-summary', 'json', userId);
      await service.generateReport(tenantId, 'tpl-vat-report', 'csv', userId);

      const reports = await service.getReports(tenantId, { templateId: 'tpl-invoice-summary' });
      expect(reports.every(r => r.templateId === 'tpl-invoice-summary')).toBe(true);
    });

    it('should filter reports by createdBy', async () => {
      await service.generateReport(tenantId, 'tpl-invoice-summary', 'json', userId);
      await service.generateReport(tenantId, 'tpl-vat-report', 'csv', 'other-user');

      const reports = await service.getReports(tenantId, { createdBy: userId });
      expect(reports.every(r => r.createdBy === userId)).toBe(true);
    });

    it('should limit report results', async () => {
      await service.generateReport(tenantId, 'tpl-invoice-summary', 'json', userId);
      await service.generateReport(tenantId, 'tpl-invoice-summary', 'csv', userId);
      await service.generateReport(tenantId, 'tpl-invoice-summary', 'pdf', userId);

      const reports = await service.getReports(tenantId, { limit: 2 });
      expect(reports.length).toBeLessThanOrEqual(2);
    });

    it('should delete report', async () => {
      const report = await service.generateReport(tenantId, 'tpl-invoice-summary', 'json', userId);
      const deleted = await service.deleteReport(report.id);

      expect(deleted).toBe(true);
      expect(await service.getReport(report.id)).toBeNull();
    });
  });

  describe('Report Formats', () => {
    const formats: ReportFormat[] = ['json', 'csv', 'html', 'excel', 'pdf'];

    for (const format of formats) {
      it(`should generate ${format} format`, async () => {
        const report = await service.generateReport(
          tenantId,
          'tpl-invoice-summary',
          format,
          userId,
        );

        expect(report.format).toBe(format);
      });
    }

    it('should download generated JSON report', async () => {
      const report = await service.generateReport(tenantId, 'tpl-invoice-summary', 'json', userId);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const downloaded = await service.downloadReport(report.id);
      expect(downloaded).toBeDefined();
      expect(downloaded?.mimeType).toBe('application/json');
    });

    it('should download generated CSV report', async () => {
      const report = await service.generateReport(tenantId, 'tpl-invoice-summary', 'csv', userId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const downloaded = await service.downloadReport(report.id);
      expect(downloaded).toBeDefined();
      expect(downloaded?.mimeType).toBe('text/csv');
      expect(downloaded?.content).toContain(',');
    });

    it('should download generated HTML report', async () => {
      const report = await service.generateReport(tenantId, 'tpl-invoice-summary', 'html', userId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const downloaded = await service.downloadReport(report.id);
      expect(downloaded).toBeDefined();
      expect(downloaded?.mimeType).toBe('text/html');
      expect(downloaded?.content).toContain('<html>');
    });
  });

  describe('Scheduled Reports', () => {
    it('should schedule a report', async () => {
      const scheduled = await service.scheduleReport(
        tenantId,
        'tpl-invoice-summary',
        'Weekly Invoice Report',
        'pdf',
        'weekly',
        ['user@example.com'],
        userId,
      );

      expect(scheduled).toBeDefined();
      expect(scheduled.id).toMatch(/^sch-/);
      expect(scheduled.frequency).toBe('weekly');
      expect(scheduled.isActive).toBe(true);
    });

    it('should schedule with parameters', async () => {
      const scheduled = await service.scheduleReport(
        tenantId,
        'tpl-invoice-summary',
        'Monthly Report',
        'excel',
        'monthly',
        ['admin@example.com'],
        userId,
        { includeArchived: false },
      );

      expect(scheduled.parameters?.includeArchived).toBe(false);
    });

    it('should get scheduled report by ID', async () => {
      const created = await service.scheduleReport(
        tenantId,
        'tpl-vat-report',
        'VAT Report',
        'pdf',
        'monthly',
        ['accountant@example.com'],
        userId,
      );

      const retrieved = await service.getScheduledReport(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get scheduled reports for tenant', async () => {
      await service.scheduleReport(tenantId, 'tpl-invoice-summary', 'Report 1', 'pdf', 'daily', ['a@a.com'], userId);
      await service.scheduleReport(tenantId, 'tpl-vat-report', 'Report 2', 'csv', 'weekly', ['b@b.com'], userId);

      const schedules = await service.getScheduledReports(tenantId);
      expect(schedules.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by isActive', async () => {
      const schedule1 = await service.scheduleReport(tenantId, 'tpl-invoice-summary', 'Active', 'pdf', 'daily', ['a@a.com'], userId);
      const schedule2 = await service.scheduleReport(tenantId, 'tpl-vat-report', 'Inactive', 'csv', 'daily', ['b@b.com'], userId);
      await service.updateScheduledReport(schedule2.id, { isActive: false });

      const active = await service.getScheduledReports(tenantId, true);
      expect(active.some(s => s.id === schedule1.id)).toBe(true);
      expect(active.every(s => s.isActive)).toBe(true);
    });

    it('should update scheduled report', async () => {
      const scheduled = await service.scheduleReport(
        tenantId,
        'tpl-invoice-summary',
        'Original',
        'pdf',
        'daily',
        ['a@a.com'],
        userId,
      );

      const updated = await service.updateScheduledReport(scheduled.id, {
        name: 'Updated Name',
        frequency: 'weekly',
        recipients: ['new@email.com'],
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.frequency).toBe('weekly');
      expect(updated?.recipients).toContain('new@email.com');
    });

    it('should delete scheduled report', async () => {
      const scheduled = await service.scheduleReport(
        tenantId,
        'tpl-invoice-summary',
        'To Delete',
        'pdf',
        'daily',
        ['a@a.com'],
        userId,
      );

      const deleted = await service.deleteScheduledReport(scheduled.id);
      expect(deleted).toBe(true);
      expect(await service.getScheduledReport(scheduled.id)).toBeNull();
    });

    it('should run scheduled report manually', async () => {
      const scheduled = await service.scheduleReport(
        tenantId,
        'tpl-invoice-summary',
        'Manual Run',
        'json',
        'monthly',
        ['a@a.com'],
        userId,
      );

      const report = await service.runScheduledReport(scheduled.id);
      expect(report).toBeDefined();
      expect(report?.templateId).toBe('tpl-invoice-summary');

      // Check that lastRunAt was updated
      const updated = await service.getScheduledReport(scheduled.id);
      expect(updated?.lastRunAt).toBeDefined();
    });

    it('should calculate next run dates correctly', async () => {
      const daily = await service.scheduleReport(tenantId, 'tpl-invoice-summary', 'Daily', 'pdf', 'daily', ['a@a.com'], userId);
      const weekly = await service.scheduleReport(tenantId, 'tpl-invoice-summary', 'Weekly', 'pdf', 'weekly', ['a@a.com'], userId);
      const monthly = await service.scheduleReport(tenantId, 'tpl-invoice-summary', 'Monthly', 'pdf', 'monthly', ['a@a.com'], userId);

      const now = new Date();
      expect(daily.nextRunAt.getTime()).toBeGreaterThan(now.getTime());
      expect(weekly.nextRunAt.getTime()).toBeGreaterThan(now.getTime());
      expect(monthly.nextRunAt.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Metadata', () => {
    it('should get report categories', () => {
      const categories = service.getReportCategories();
      expect(categories).toContain('financial');
      expect(categories).toContain('hr');
      expect(categories).toContain('fleet');
      expect(categories).toContain('compliance');
    });

    it('should get report formats', () => {
      const formats = service.getReportFormats();
      expect(formats).toContain('pdf');
      expect(formats).toContain('excel');
      expect(formats).toContain('csv');
      expect(formats).toContain('json');
      expect(formats).toContain('html');
    });

    it('should get schedule frequencies', () => {
      const frequencies = service.getScheduleFrequencies();
      expect(frequencies).toContain('daily');
      expect(frequencies).toContain('weekly');
      expect(frequencies).toContain('monthly');
      expect(frequencies).toContain('quarterly');
      expect(frequencies).toContain('yearly');
    });

    it('should get column types', () => {
      const types = service.getColumnTypes();
      expect(types).toContain('string');
      expect(types).toContain('number');
      expect(types).toContain('currency');
      expect(types).toContain('date');
      expect(types).toContain('percentage');
    });

    it('should get aggregation types', () => {
      const aggregations = service.getAggregationTypes();
      expect(aggregations).toContain('sum');
      expect(aggregations).toContain('avg');
      expect(aggregations).toContain('count');
      expect(aggregations).toContain('min');
      expect(aggregations).toContain('max');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should return null for non-existent report', async () => {
      const report = await service.getReport('non-existent');
      expect(report).toBeNull();
    });

    it('should return null for non-existent scheduled report', async () => {
      const scheduled = await service.getScheduledReport('non-existent');
      expect(scheduled).toBeNull();
    });

    it('should return null when downloading non-existent report', async () => {
      const downloaded = await service.downloadReport('non-existent');
      expect(downloaded).toBeNull();
    });

    it('should return null when running non-existent scheduled report', async () => {
      const report = await service.runScheduledReport('non-existent');
      expect(report).toBeNull();
    });

    it('should handle empty tenant', async () => {
      const reports = await service.getReports('empty-tenant');
      expect(reports).toHaveLength(0);
    });
  });
});
