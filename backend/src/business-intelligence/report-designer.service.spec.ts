import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ReportDesignerService,
  ReportType,
  OutputFormat,
  ReportDataSource,
  ReportColumn,
  ReportParameter,
} from './report-designer.service';

describe('ReportDesignerService', () => {
  let service: ReportDesignerService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockDataSource: ReportDataSource = {
    id: 'ds_sales',
    name: 'Sales Data',
    type: 'query',
    query: 'SELECT * FROM sales',
  };

  const mockColumns: ReportColumn[] = [
    { id: 'col_1', field: 'date', header: 'Data', sortable: true },
    { id: 'col_2', field: 'description', header: 'Descriere', sortable: true },
    { id: 'col_3', field: 'amount', header: 'Sumă', format: { type: 'currency', currency: 'RON' } },
    { id: 'col_4', field: 'status', header: 'Status' },
  ];

  const createReportData = {
    tenantId: 'tenant_123',
    name: 'Raport Vânzări',
    description: 'Raport cu vânzările lunare',
    type: 'tabular' as ReportType,
    category: 'Finance',
    tags: ['sales', 'monthly'],
    dataSource: mockDataSource,
    columns: mockColumns,
    createdBy: 'user_admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportDesignerService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ReportDesignerService>(ReportDesignerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create a report', async () => {
      const report = await service.createReport(createReportData);

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^report_/);
      expect(report.name).toBe('Raport Vânzări');
      expect(report.tenantId).toBe('tenant_123');
    });

    it('should generate unique report IDs', async () => {
      const report1 = await service.createReport(createReportData);
      const report2 = await service.createReport(createReportData);

      expect(report1.id).not.toBe(report2.id);
    });

    it('should set default values', async () => {
      const report = await service.createReport(createReportData);

      expect(report.isPublished).toBe(false);
      expect(report.version).toBe(1);
      expect(report.layout.paperSize).toBe('A4');
      expect(report.layout.orientation).toBe('portrait');
    });

    it('should emit report.created event', async () => {
      await service.createReport(createReportData);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.created',
        expect.objectContaining({ report: expect.any(Object) })
      );
    });
  });

  describe('Report CRUD', () => {
    it('should get report by ID', async () => {
      const created = await service.createReport(createReportData);
      const retrieved = await service.getReport(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent report', async () => {
      const retrieved = await service.getReport('report_nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('should get reports by tenant', async () => {
      await service.createReport(createReportData);
      await service.createReport(createReportData);

      const reports = await service.getReports('tenant_123');

      expect(reports.length).toBe(2);
    });

    it('should filter reports by type', async () => {
      await service.createReport(createReportData);
      await service.createReport({ ...createReportData, type: 'chart' });

      const reports = await service.getReports('tenant_123', { type: 'tabular' });

      expect(reports.every((r) => r.type === 'tabular')).toBe(true);
    });

    it('should filter reports by category', async () => {
      await service.createReport(createReportData);
      await service.createReport({ ...createReportData, category: 'HR' });

      const reports = await service.getReports('tenant_123', { category: 'Finance' });

      expect(reports.every((r) => r.category === 'Finance')).toBe(true);
    });

    it('should filter reports by tag', async () => {
      await service.createReport(createReportData);
      await service.createReport({ ...createReportData, tags: ['inventory'] });

      const reports = await service.getReports('tenant_123', { tag: 'sales' });

      expect(reports.every((r) => r.tags?.includes('sales'))).toBe(true);
    });

    it('should filter reports by published status', async () => {
      const report = await service.createReport(createReportData);
      await service.publishReport(report.id);
      await service.createReport(createReportData);

      const publishedReports = await service.getReports('tenant_123', { published: true });

      expect(publishedReports.every((r) => r.isPublished)).toBe(true);
    });

    it('should search reports by name', async () => {
      await service.createReport(createReportData);
      await service.createReport({ ...createReportData, name: 'Raport Inventar', description: 'Stocuri' });

      const reports = await service.getReports('tenant_123', { search: 'inventar' });

      expect(reports.length).toBe(1);
      expect(reports[0].name).toContain('Inventar');
    });

    it('should update report', async () => {
      const report = await service.createReport(createReportData);
      const updated = await service.updateReport(report.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.version).toBe(2);
    });

    it('should emit report.updated event', async () => {
      const report = await service.createReport(createReportData);
      await service.updateReport(report.id, { name: 'Updated' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.updated',
        expect.any(Object)
      );
    });

    it('should delete report', async () => {
      const report = await service.createReport(createReportData);
      await service.deleteReport(report.id);

      const retrieved = await service.getReport(report.id);
      expect(retrieved).toBeUndefined();
    });

    it('should emit report.deleted event', async () => {
      const report = await service.createReport(createReportData);
      await service.deleteReport(report.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.deleted',
        { reportId: report.id }
      );
    });
  });

  describe('Report Duplication', () => {
    it('should duplicate report', async () => {
      const original = await service.createReport(createReportData);
      const duplicate = await service.duplicateReport(original.id, 'Copy of Report', 'user_2');

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.name).toBe('Copy of Report');
      expect(duplicate?.createdBy).toBe('user_2');
    });

    it('should copy columns to duplicated report', async () => {
      const original = await service.createReport(createReportData);
      const duplicate = await service.duplicateReport(original.id, 'Copy', 'user_2');

      expect(duplicate?.columns.length).toBe(original.columns.length);
    });

    it('should return undefined for non-existent report', async () => {
      const duplicate = await service.duplicateReport('report_nonexistent', 'Copy', 'user_2');

      expect(duplicate).toBeUndefined();
    });
  });

  describe('Report Publishing', () => {
    it('should publish report', async () => {
      const report = await service.createReport(createReportData);
      const published = await service.publishReport(report.id);

      expect(published?.isPublished).toBe(true);
      expect(published?.publishedAt).toBeDefined();
    });

    it('should emit report.published event', async () => {
      const report = await service.createReport(createReportData);
      await service.publishReport(report.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.published',
        expect.any(Object)
      );
    });

    it('should unpublish report', async () => {
      const report = await service.createReport(createReportData);
      await service.publishReport(report.id);
      const unpublished = await service.unpublishReport(report.id);

      expect(unpublished?.isPublished).toBe(false);
    });
  });

  describe('Column Management', () => {
    it('should add column', async () => {
      const report = await service.createReport(createReportData);
      const newColumn: ReportColumn = { id: 'col_new', field: 'newField', header: 'New Column' };

      const updated = await service.addColumn(report.id, newColumn);

      expect(updated?.columns.find((c) => c.id === 'col_new')).toBeDefined();
    });

    it('should update column', async () => {
      const report = await service.createReport(createReportData);
      const updated = await service.updateColumn(report.id, 'col_1', { header: 'Updated Header' });

      expect(updated?.columns.find((c) => c.id === 'col_1')?.header).toBe('Updated Header');
    });

    it('should remove column', async () => {
      const report = await service.createReport(createReportData);
      const updated = await service.removeColumn(report.id, 'col_1');

      expect(updated?.columns.find((c) => c.id === 'col_1')).toBeUndefined();
    });

    it('should reorder columns', async () => {
      const report = await service.createReport(createReportData);
      const updated = await service.reorderColumns(report.id, ['col_4', 'col_3', 'col_2', 'col_1']);

      expect(updated?.columns[0].id).toBe('col_4');
      expect(updated?.columns[3].id).toBe('col_1');
    });

    it('should increment version on column changes', async () => {
      const report = await service.createReport(createReportData);
      const originalVersion = report.version;

      await service.addColumn(report.id, { id: 'col_new', field: 'f', header: 'H' });

      const updated = await service.getReport(report.id);
      expect(updated?.version).toBe(originalVersion + 1);
    });
  });

  describe('Section Management', () => {
    it('should update section', async () => {
      const report = await service.createReport(createReportData);
      const updated = await service.updateSection(report.id, 'header', { height: 100 });

      expect(updated?.sections.find((s) => s.id === 'header')?.height).toBe(100);
    });

    it('should add element to section', async () => {
      const report = await service.createReport(createReportData);
      const element = {
        id: 'elem_1',
        type: 'text' as const,
        position: { x: 0, y: 0, width: 100, height: 20 },
        properties: { text: 'Test' },
      };

      const updated = await service.addElement(report.id, 'body', element);

      expect(updated?.sections.find((s) => s.id === 'body')?.elements.find((e) => e.id === 'elem_1')).toBeDefined();
    });

    it('should update element', async () => {
      const report = await service.createReport(createReportData);
      const updated = await service.updateElement(report.id, 'header', 'title', {
        properties: { text: 'Updated Title' },
      });

      const titleElement = updated?.sections.find((s) => s.id === 'header')?.elements.find((e) => e.id === 'title');
      expect(titleElement?.properties.text).toBe('Updated Title');
    });

    it('should remove element', async () => {
      const report = await service.createReport(createReportData);
      const updated = await service.removeElement(report.id, 'header', 'title');

      expect(updated?.sections.find((s) => s.id === 'header')?.elements.find((e) => e.id === 'title')).toBeUndefined();
    });
  });

  describe('Report Execution', () => {
    it('should execute report', async () => {
      const report = await service.createReport(createReportData);
      const execution = await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });

      expect(execution).toBeDefined();
      expect(execution.id).toMatch(/^exec_/);
      expect(execution.reportId).toBe(report.id);
    });

    it('should emit execution.started event', async () => {
      const report = await service.createReport(createReportData);
      await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.execution.started',
        expect.any(Object)
      );
    });

    it('should throw error for non-existent report', async () => {
      await expect(
        service.executeReport({
          reportId: 'report_nonexistent',
          tenantId: 'tenant_123',
          parameters: {},
          format: 'pdf',
          executedBy: 'user_123',
        })
      ).rejects.toThrow('Report not found');
    });

    it('should get execution by ID', async () => {
      const report = await service.createReport(createReportData);
      const execution = await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });

      const retrieved = await service.getExecution(execution.id);
      expect(retrieved?.id).toBe(execution.id);
    });

    it('should get executions by tenant', async () => {
      const report = await service.createReport(createReportData);
      await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });

      const executions = await service.getExecutions('tenant_123');
      expect(executions.length).toBeGreaterThan(0);
    });

    it('should filter executions by report', async () => {
      const report1 = await service.createReport(createReportData);
      const report2 = await service.createReport({ ...createReportData, name: 'Report 2' });

      await service.executeReport({
        reportId: report1.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });
      await service.executeReport({
        reportId: report2.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });

      const executions = await service.getExecutions('tenant_123', report1.id);
      expect(executions.every((e) => e.reportId === report1.id)).toBe(true);
    });
  });

  describe('Output Formats', () => {
    it('should execute PDF format', async () => {
      const report = await service.createReport(createReportData);
      const execution = await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });

      expect(execution.format).toBe('pdf');
    });

    it('should execute Excel format', async () => {
      const report = await service.createReport(createReportData);
      const execution = await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'excel',
        executedBy: 'user_123',
      });

      expect(execution.format).toBe('excel');
    });

    it('should execute CSV format', async () => {
      const report = await service.createReport(createReportData);
      const execution = await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'csv',
        executedBy: 'user_123',
      });

      expect(execution.format).toBe('csv');
    });

    it('should execute JSON format', async () => {
      const report = await service.createReport(createReportData);
      const execution = await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'json',
        executedBy: 'user_123',
      });

      expect(execution.format).toBe('json');
    });

    it('should execute HTML format', async () => {
      const report = await service.createReport(createReportData);
      const execution = await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'html',
        executedBy: 'user_123',
      });

      expect(execution.format).toBe('html');
    });
  });

  describe('Report Snapshots', () => {
    it('should create snapshot', async () => {
      const report = await service.createReport(createReportData);
      const snapshot = await service.createSnapshot({
        reportId: report.id,
        tenantId: 'tenant_123',
        name: 'Monthly Snapshot',
        parameters: {},
        createdBy: 'user_123',
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toMatch(/^snap_/);
      expect(snapshot.data).toBeDefined();
    });

    it('should emit snapshot.created event', async () => {
      const report = await service.createReport(createReportData);
      await service.createSnapshot({
        reportId: report.id,
        tenantId: 'tenant_123',
        name: 'Snapshot',
        parameters: {},
        createdBy: 'user_123',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.snapshot.created',
        expect.any(Object)
      );
    });

    it('should get snapshot by ID', async () => {
      const report = await service.createReport(createReportData);
      const snapshot = await service.createSnapshot({
        reportId: report.id,
        tenantId: 'tenant_123',
        name: 'Snapshot',
        parameters: {},
        createdBy: 'user_123',
      });

      const retrieved = await service.getSnapshot(snapshot.id);
      expect(retrieved?.id).toBe(snapshot.id);
    });

    it('should handle expired snapshots', async () => {
      const report = await service.createReport(createReportData);
      const snapshot = await service.createSnapshot({
        reportId: report.id,
        tenantId: 'tenant_123',
        name: 'Expired Snapshot',
        parameters: {},
        expiresAt: new Date(Date.now() - 1000), // Already expired
        createdBy: 'user_123',
      });

      const retrieved = await service.getSnapshot(snapshot.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get snapshots by tenant', async () => {
      const report = await service.createReport(createReportData);
      await service.createSnapshot({
        reportId: report.id,
        tenantId: 'tenant_123',
        name: 'Snapshot 1',
        parameters: {},
        createdBy: 'user_123',
      });

      const snapshots = await service.getSnapshots('tenant_123');
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('should filter snapshots by report', async () => {
      const report1 = await service.createReport(createReportData);
      const report2 = await service.createReport({ ...createReportData, name: 'Report 2' });

      await service.createSnapshot({
        reportId: report1.id,
        tenantId: 'tenant_123',
        name: 'Snapshot 1',
        parameters: {},
        createdBy: 'user_123',
      });
      await service.createSnapshot({
        reportId: report2.id,
        tenantId: 'tenant_123',
        name: 'Snapshot 2',
        parameters: {},
        createdBy: 'user_123',
      });

      const snapshots = await service.getSnapshots('tenant_123', report1.id);
      expect(snapshots.every((s) => s.reportId === report1.id)).toBe(true);
    });

    it('should delete snapshot', async () => {
      const report = await service.createReport(createReportData);
      const snapshot = await service.createSnapshot({
        reportId: report.id,
        tenantId: 'tenant_123',
        name: 'Snapshot',
        parameters: {},
        createdBy: 'user_123',
      });

      await service.deleteSnapshot(snapshot.id);

      const retrieved = await service.getSnapshot(snapshot.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Report Preview', () => {
    it('should preview report', async () => {
      const report = await service.createReport(createReportData);
      const preview = await service.previewReport(report.id, {}, 10);

      expect(preview.columns).toBeDefined();
      expect(preview.data).toBeDefined();
      expect(preview.data.length).toBeLessThanOrEqual(10);
    });

    it('should include total row count', async () => {
      const report = await service.createReport(createReportData);
      const preview = await service.previewReport(report.id, {}, 5);

      expect(preview.totalRows).toBeGreaterThan(0);
    });

    it('should throw error for non-existent report', async () => {
      await expect(service.previewReport('report_nonexistent', {})).rejects.toThrow(
        'Report not found'
      );
    });
  });

  describe('Statistics', () => {
    it('should get report statistics', async () => {
      await service.createReport(createReportData);
      const report2 = await service.createReport({ ...createReportData, type: 'chart' });
      await service.publishReport(report2.id);

      const stats = await service.getStats('tenant_123');

      expect(stats.totalReports).toBe(2);
      expect(stats.publishedReports).toBe(1);
    });

    it('should group reports by type', async () => {
      await service.createReport(createReportData);
      await service.createReport({ ...createReportData, type: 'chart' });
      await service.createReport({ ...createReportData, type: 'chart' });

      const stats = await service.getStats('tenant_123');

      expect(stats.byType['tabular']).toBe(1);
      expect(stats.byType['chart']).toBe(2);
    });

    it('should group reports by category', async () => {
      await service.createReport(createReportData);
      await service.createReport({ ...createReportData, category: 'HR' });

      const stats = await service.getStats('tenant_123');

      expect(stats.byCategory['Finance']).toBe(1);
      expect(stats.byCategory['HR']).toBe(1);
    });

    it('should track executions by format', async () => {
      const report = await service.createReport(createReportData);
      await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'pdf',
        executedBy: 'user_123',
      });
      await service.executeReport({
        reportId: report.id,
        tenantId: 'tenant_123',
        parameters: {},
        format: 'excel',
        executedBy: 'user_123',
      });

      const stats = await service.getStats('tenant_123');

      expect(stats.executionsByFormat['pdf']).toBe(1);
      expect(stats.executionsByFormat['excel']).toBe(1);
    });
  });

  describe('Report Types', () => {
    it('should create tabular report', async () => {
      const report = await service.createReport({ ...createReportData, type: 'tabular' });
      expect(report.type).toBe('tabular');
    });

    it('should create summary report', async () => {
      const report = await service.createReport({ ...createReportData, type: 'summary' });
      expect(report.type).toBe('summary');
    });

    it('should create matrix report', async () => {
      const report = await service.createReport({ ...createReportData, type: 'matrix' });
      expect(report.type).toBe('matrix');
    });

    it('should create chart report', async () => {
      const report = await service.createReport({ ...createReportData, type: 'chart' });
      expect(report.type).toBe('chart');
    });

    it('should create composite report', async () => {
      const report = await service.createReport({ ...createReportData, type: 'composite' });
      expect(report.type).toBe('composite');
    });
  });

  describe('Layout Options', () => {
    it('should set custom layout', async () => {
      const report = await service.createReport({
        ...createReportData,
        layout: { paperSize: 'A3', orientation: 'landscape' },
      });

      expect(report.layout.paperSize).toBe('A3');
      expect(report.layout.orientation).toBe('landscape');
    });

    it('should set margins', async () => {
      const report = await service.createReport({
        ...createReportData,
        layout: { margins: { top: 30, right: 30, bottom: 30, left: 30 } },
      });

      expect(report.layout.margins.top).toBe(30);
    });
  });

  describe('Romanian Localization', () => {
    it('should support Romanian report names', async () => {
      const report = await service.createReport({
        ...createReportData,
        name: 'Raport Financiar Lunar',
        description: 'Raport cu situația financiară lunară',
      });

      expect(report.name).toBe('Raport Financiar Lunar');
    });

    it('should support Romanian column headers', async () => {
      const report = await service.createReport({
        ...createReportData,
        columns: [
          { id: 'c1', field: 'date', header: 'Data' },
          { id: 'c2', field: 'amount', header: 'Sumă' },
          { id: 'c3', field: 'description', header: 'Descriere' },
        ],
      });

      expect(report.columns[1].header).toBe('Sumă');
    });

    it('should support RON currency format', async () => {
      const report = await service.createReport({
        ...createReportData,
        columns: [
          { id: 'c1', field: 'amount', header: 'Total', format: { type: 'currency', currency: 'RON', decimals: 2 } },
        ],
      });

      expect(report.columns[0].format?.currency).toBe('RON');
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const before = new Date();
      const report = await service.createReport(createReportData);
      const after = new Date();

      expect(report.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(report.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on changes', async () => {
      const report = await service.createReport(createReportData);
      const originalUpdatedAt = report.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.updateReport(report.id, { name: 'Updated' });

      const updated = await service.getReport(report.id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Versioning', () => {
    it('should start at version 1', async () => {
      const report = await service.createReport(createReportData);
      expect(report.version).toBe(1);
    });

    it('should increment version on update', async () => {
      const report = await service.createReport(createReportData);
      await service.updateReport(report.id, { name: 'Updated' });
      await service.updateReport(report.id, { name: 'Updated Again' });

      const updated = await service.getReport(report.id);
      expect(updated?.version).toBe(3);
    });
  });

  describe('Default Sections', () => {
    it('should create default header section', async () => {
      const report = await service.createReport(createReportData);

      expect(report.sections.find((s) => s.type === 'header')).toBeDefined();
    });

    it('should create default body section', async () => {
      const report = await service.createReport(createReportData);

      expect(report.sections.find((s) => s.type === 'body')).toBeDefined();
    });

    it('should create default footer section', async () => {
      const report = await service.createReport(createReportData);

      expect(report.sections.find((s) => s.type === 'footer')).toBeDefined();
    });

    it('should include title element in header', async () => {
      const report = await service.createReport(createReportData);
      const header = report.sections.find((s) => s.type === 'header');

      expect(header?.elements.find((e) => e.id === 'title')).toBeDefined();
    });

    it('should include page number in footer', async () => {
      const report = await service.createReport(createReportData);
      const footer = report.sections.find((s) => s.type === 'footer');

      expect(footer?.elements.find((e) => e.id === 'pageNumber')).toBeDefined();
    });
  });

  describe('Default Options', () => {
    it('should enable page numbers by default', async () => {
      const report = await service.createReport(createReportData);
      expect(report.options.showPageNumbers).toBe(true);
    });

    it('should enable datetime by default', async () => {
      const report = await service.createReport(createReportData);
      expect(report.options.showDateTime).toBe(true);
    });

    it('should enable totals by default', async () => {
      const report = await service.createReport(createReportData);
      expect(report.options.showTotals).toBe(true);
    });

    it('should allow PDF, Excel, CSV export by default', async () => {
      const report = await service.createReport(createReportData);
      expect(report.options.allowExport).toContain('pdf');
      expect(report.options.allowExport).toContain('excel');
      expect(report.options.allowExport).toContain('csv');
    });
  });
});
