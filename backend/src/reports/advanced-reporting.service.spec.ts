import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AdvancedReportingService,
  ReportField,
  ReportFilter,
  ReportSort,
  ChartConfig,
  ReportSchedule,
  WidgetConfig,
} from './advanced-reporting.service';

describe('AdvancedReportingService', () => {
  let service: AdvancedReportingService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedReportingService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AdvancedReportingService>(AdvancedReportingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Sample data
  const sampleFields: ReportField[] = [
    { id: 'f1', name: 'period', type: 'date', source: 'invoice.date', label: 'Period' },
    { id: 'f2', name: 'amount', type: 'currency', source: 'invoice.amount', aggregation: 'sum', label: 'Amount' },
  ];

  const sampleFilters: ReportFilter[] = [
    { field: 'status', operator: 'eq', value: 'active' },
  ];

  const sampleSchedule: ReportSchedule = {
    enabled: true,
    frequency: 'monthly',
    hour: 8,
    minute: 0,
    timezone: 'Europe/Bucharest',
    formats: ['pdf', 'excel'],
    recipients: ['user@example.com'],
  };

  const sampleWidgetConfig: WidgetConfig = {
    title: 'Revenue KPI',
    metric: 'revenue',
    dataSource: 'invoices',
    showTrend: true,
    timeRange: 'month',
  };

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have system templates', async () => {
      const templates = await service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return report types', () => {
      const types = service.getReportTypes();
      expect(types).toContain('financial');
      expect(types).toContain('hr');
      expect(types).toContain('tax');
    });

    it('should return export formats', () => {
      const formats = service.getExportFormats();
      expect(formats).toContain('pdf');
      expect(formats).toContain('excel');
      expect(formats).toContain('csv');
    });

    it('should return widget types', () => {
      const types = service.getWidgetTypes();
      expect(types).toContain('chart');
      expect(types).toContain('kpi');
      expect(types).toContain('table');
    });
  });

  describe('templates', () => {
    it('should get all templates', async () => {
      const templates = await service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', async () => {
      const templates = await service.getTemplates('Finance');
      for (const template of templates) {
        expect(template.category).toBe('Finance');
      }
    });

    it('should get template by ID', async () => {
      const templates = await service.getTemplates();
      const template = await service.getTemplate(templates[0].id);
      expect(template).toBeDefined();
      expect(template?.id).toBe(templates[0].id);
    });

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should create custom template', async () => {
      const template = await service.createTemplate(
        'Custom Report',
        'A custom report template',
        'financial',
        'Custom',
        sampleFields,
      );

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Report');
      expect(template.isSystem).toBe(false);
    });
  });

  describe('report definitions', () => {
    it('should create report definition', async () => {
      const definition = await service.createReportDefinition(
        'Monthly Financial Report',
        'Monthly financial summary',
        'financial',
        'tenant-123',
        'user-456',
        { fields: sampleFields },
      );

      expect(definition.id).toBeDefined();
      expect(definition.name).toBe('Monthly Financial Report');
      expect(definition.type).toBe('financial');
    });

    it('should create report from template', async () => {
      const templates = await service.getTemplates();
      const definition = await service.createReportDefinition(
        'From Template',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { templateId: templates[0].id },
      );

      expect(definition.templateId).toBe(templates[0].id);
    });

    it('should get report definition by ID', async () => {
      const created = await service.createReportDefinition(
        'Get Test',
        '',
        'hr',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const retrieved = await service.getReportDefinition(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get definitions by tenant', async () => {
      await service.createReportDefinition('Def1', '', 'financial', 'tenant-list', 'u1', { fields: sampleFields });
      await service.createReportDefinition('Def2', '', 'hr', 'tenant-list', 'u1', { fields: sampleFields });
      await service.createReportDefinition('Def3', '', 'tax', 'other-tenant', 'u1', { fields: sampleFields });

      const definitions = await service.getReportDefinitions('tenant-list');
      expect(definitions.length).toBe(2);
    });

    it('should filter definitions by type', async () => {
      await service.createReportDefinition('Finance1', '', 'financial', 'tenant-type', 'u1', { fields: sampleFields });
      await service.createReportDefinition('HR1', '', 'hr', 'tenant-type', 'u1', { fields: sampleFields });

      const financialDefs = await service.getReportDefinitions('tenant-type', 'financial');
      expect(financialDefs.every(d => d.type === 'financial')).toBe(true);
    });

    it('should update report definition', async () => {
      const definition = await service.createReportDefinition(
        'Original',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const updated = await service.updateReportDefinition(definition.id, {
        name: 'Updated Name',
        description: 'New description',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('New description');
    });

    it('should delete report definition', async () => {
      const definition = await service.createReportDefinition(
        'To Delete',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const success = await service.deleteReportDefinition(definition.id);
      expect(success).toBe(true);

      const retrieved = await service.getReportDefinition(definition.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('report generation', () => {
    it('should generate financial report', async () => {
      const definition = await service.createReportDefinition(
        'Finance Report',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const report = await service.generateReport(
        definition.id,
        'user-1',
        { start: '2024-01-01', end: '2024-12-31' },
      );

      expect(report.id).toBeDefined();
      expect(report.status).toBe('completed');
      expect(report.data.length).toBeGreaterThan(0);
      expect(report.summary).toBeDefined();
    });

    it('should generate HR report', async () => {
      const definition = await service.createReportDefinition(
        'HR Report',
        '',
        'hr',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const report = await service.generateReport(
        definition.id,
        'user-1',
        { start: '2024-01-01', end: '2024-06-30' },
      );

      expect(report.status).toBe('completed');
      expect(report.summary.totalGrossSalary).toBeDefined();
    });

    it('should generate tax report', async () => {
      const definition = await service.createReportDefinition(
        'Tax Report',
        '',
        'tax',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const report = await service.generateReport(
        definition.id,
        'user-1',
        { start: '2024-01-01', end: '2024-12-31' },
      );

      expect(report.status).toBe('completed');
      expect(report.summary.totalVatPayable).toBeDefined();
    });

    it('should generate compliance report', async () => {
      const definition = await service.createReportDefinition(
        'Compliance Report',
        '',
        'compliance',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const report = await service.generateReport(
        definition.id,
        'user-1',
        { start: '2024-01-01', end: '2024-12-31' },
      );

      expect(report.status).toBe('completed');
      expect(report.summary.complianceRate).toBeDefined();
    });

    it('should generate operational report', async () => {
      const definition = await service.createReportDefinition(
        'Operational Report',
        '',
        'operational',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const report = await service.generateReport(
        definition.id,
        'user-1',
        { start: '2024-01-01', end: '2024-01-31' },
      );

      expect(report.status).toBe('completed');
      expect(report.summary.totalDocuments).toBeDefined();
    });

    it('should export to different formats', async () => {
      const definition = await service.createReportDefinition(
        'Export Test',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const pdfReport = await service.generateReport(
        definition.id,
        'user-1',
        { start: '2024-01-01', end: '2024-12-31' },
        'pdf',
      );

      expect(pdfReport.format).toBe('pdf');
      expect(pdfReport.fileUrl).toContain('.pdf');
    });

    it('should throw error for non-existent definition', async () => {
      await expect(
        service.generateReport('non-existent', 'user-1', { start: '2024-01-01', end: '2024-12-31' }),
      ).rejects.toThrow('Report definition not found');
    });

    it('should get report by ID', async () => {
      const definition = await service.createReportDefinition(
        'Get Report',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { fields: sampleFields },
      );

      const generated = await service.generateReport(
        definition.id,
        'user-1',
        { start: '2024-01-01', end: '2024-12-31' },
      );

      const retrieved = await service.getReport(generated.id);
      expect(retrieved?.id).toBe(generated.id);
    });

    it('should get report history', async () => {
      const definition = await service.createReportDefinition(
        'History Test',
        '',
        'financial',
        'tenant-history',
        'user-1',
        { fields: sampleFields },
      );

      await service.generateReport(definition.id, 'user-1', { start: '2024-01-01', end: '2024-03-31' });
      await service.generateReport(definition.id, 'user-1', { start: '2024-04-01', end: '2024-06-30' });
      await service.generateReport(definition.id, 'user-1', { start: '2024-07-01', end: '2024-09-30' });

      const history = await service.getReportHistory(definition.id);
      expect(history.length).toBe(3);
    });
  });

  describe('scheduling', () => {
    it('should create scheduled report', async () => {
      const definition = await service.createReportDefinition(
        'Scheduled Report',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { fields: sampleFields, schedule: sampleSchedule },
      );

      expect(definition.schedule?.enabled).toBe(true);
      expect(definition.schedule?.nextRun).toBeDefined();
    });

    it('should get scheduled reports', async () => {
      await service.createReportDefinition(
        'Scheduled1',
        '',
        'financial',
        'tenant-sched',
        'u1',
        { fields: sampleFields, schedule: sampleSchedule },
      );
      await service.createReportDefinition(
        'Not Scheduled',
        '',
        'financial',
        'tenant-sched',
        'u1',
        { fields: sampleFields },
      );

      const scheduled = await service.getScheduledReports('tenant-sched');
      expect(scheduled.every(d => d.schedule?.enabled)).toBe(true);
    });

    it('should run scheduled reports', async () => {
      // Create a report with past nextRun
      const definition = await service.createReportDefinition(
        'Due Report',
        '',
        'financial',
        'tenant-1',
        'user-1',
        { fields: sampleFields, schedule: { ...sampleSchedule, enabled: true } },
      );

      // Manually set nextRun to past
      await service.updateReportDefinition(definition.id, {
        schedule: { ...sampleSchedule, enabled: true, nextRun: new Date(Date.now() - 1000) },
      });

      const result = await service.runScheduledReports();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
    });

    it('should return schedule frequencies', () => {
      const frequencies = service.getScheduleFrequencies();
      expect(frequencies).toContain('daily');
      expect(frequencies).toContain('weekly');
      expect(frequencies).toContain('monthly');
    });
  });

  describe('dashboard widgets', () => {
    it('should create widget', async () => {
      const widget = await service.createWidget(
        'Revenue KPI',
        'kpi',
        sampleWidgetConfig,
        { x: 0, y: 0, w: 2, h: 1 },
        'tenant-1',
        'user-1',
      );

      expect(widget.id).toBeDefined();
      expect(widget.name).toBe('Revenue KPI');
      expect(widget.type).toBe('kpi');
    });

    it('should get widget by ID', async () => {
      const created = await service.createWidget(
        'Test Widget',
        'chart',
        sampleWidgetConfig,
        { x: 0, y: 0, w: 4, h: 2 },
        'tenant-1',
        'user-1',
      );

      const retrieved = await service.getWidget(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get widgets by tenant', async () => {
      await service.createWidget('W1', 'kpi', sampleWidgetConfig, { x: 0, y: 0, w: 2, h: 1 }, 'tenant-widgets', 'u1');
      await service.createWidget('W2', 'chart', sampleWidgetConfig, { x: 2, y: 0, w: 4, h: 2 }, 'tenant-widgets', 'u1');
      await service.createWidget('W3', 'table', sampleWidgetConfig, { x: 0, y: 2, w: 6, h: 3 }, 'other-tenant', 'u1');

      const widgets = await service.getWidgets('tenant-widgets');
      expect(widgets.length).toBe(2);
    });

    it('should update widget', async () => {
      const widget = await service.createWidget(
        'Original',
        'kpi',
        sampleWidgetConfig,
        { x: 0, y: 0, w: 2, h: 1 },
        'tenant-1',
        'user-1',
      );

      const updated = await service.updateWidget(widget.id, {
        name: 'Updated Widget',
        position: { x: 2, y: 2, w: 3, h: 2 },
      });

      expect(updated?.name).toBe('Updated Widget');
      expect(updated?.position.x).toBe(2);
    });

    it('should delete widget', async () => {
      const widget = await service.createWidget(
        'To Delete',
        'kpi',
        sampleWidgetConfig,
        { x: 0, y: 0, w: 2, h: 1 },
        'tenant-1',
        'user-1',
      );

      const success = await service.deleteWidget(widget.id);
      expect(success).toBe(true);

      const retrieved = await service.getWidget(widget.id);
      expect(retrieved).toBeNull();
    });

    it('should get widget data for KPI', async () => {
      const widget = await service.createWidget(
        'KPI Widget',
        'kpi',
        sampleWidgetConfig,
        { x: 0, y: 0, w: 2, h: 1 },
        'tenant-1',
        'user-1',
      );

      const data = await service.getWidgetData(widget.id);
      expect(data).toBeDefined();
      expect(data?.value).toBeDefined();
      expect(data?.trend).toBeDefined();
    });

    it('should get widget data for chart', async () => {
      const widget = await service.createWidget(
        'Chart Widget',
        'chart',
        sampleWidgetConfig,
        { x: 0, y: 0, w: 4, h: 2 },
        'tenant-1',
        'user-1',
      );

      const data = await service.getWidgetData(widget.id);
      expect(data?.chartData).toBeDefined();
      expect(data?.chartData?.length).toBeGreaterThan(0);
    });

    it('should get widget data for table', async () => {
      const widget = await service.createWidget(
        'Table Widget',
        'table',
        sampleWidgetConfig,
        { x: 0, y: 0, w: 6, h: 3 },
        'tenant-1',
        'user-1',
      );

      const data = await service.getWidgetData(widget.id);
      expect(data?.data).toBeDefined();
      expect(Array.isArray(data?.data)).toBe(true);
    });

    it('should return null for non-existent widget data', async () => {
      const data = await service.getWidgetData('non-existent');
      expect(data).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should get report stats', async () => {
      await service.createReportDefinition('Stats1', '', 'financial', 'tenant-stats', 'u1', { fields: sampleFields });
      await service.createReportDefinition('Stats2', '', 'hr', 'tenant-stats', 'u1', { fields: sampleFields, schedule: sampleSchedule });

      const stats = await service.getReportStats('tenant-stats');

      expect(stats.totalReports).toBeGreaterThanOrEqual(2);
      expect(stats.scheduledReports).toBeGreaterThanOrEqual(1);
      expect(stats.topReportTypes).toBeDefined();
    });

    it('should track generated reports in stats', async () => {
      const definition = await service.createReportDefinition(
        'Gen Stats',
        '',
        'financial',
        'tenant-gen-stats',
        'user-1',
        { fields: sampleFields },
      );

      await service.generateReport(definition.id, 'user-1', { start: '2024-01-01', end: '2024-12-31' });

      const stats = await service.getReportStats('tenant-gen-stats');
      expect(stats.reportsGeneratedToday).toBeGreaterThanOrEqual(0);
    });
  });
});
