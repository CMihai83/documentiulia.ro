import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DataExportService,
  CreateExportDto,
  ExportFormat,
  ExportDataType,
  ExportColumn,
  ExportTemplate,
  CreateTemplateDto,
} from './data-export.service';

describe('DataExportService', () => {
  let service: DataExportService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DataExportService>(DataExportService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  describe('Export Creation', () => {
    const columns: ExportColumn[] = [
      { field: 'number', header: 'Invoice Number', headerRo: 'Număr Factură', type: 'STRING' },
      { field: 'customer', header: 'Customer', headerRo: 'Client', type: 'STRING' },
      { field: 'total', header: 'Total', headerRo: 'Total', type: 'CURRENCY' },
    ];

    it('should create CSV export', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^exp-/);
      expect(result.format).toBe('CSV');
      expect(result.dataType).toBe('INVOICES');
      expect(result.status).toBe('COMPLETED');
      expect(result.fileName).toContain('.csv');
    });

    it('should create XLSX export', async () => {
      const dto: CreateExportDto = {
        dataType: 'CUSTOMERS',
        format: 'XLSX',
        columns: [
          { field: 'name', header: 'Name', headerRo: 'Nume', type: 'STRING' },
          { field: 'cui', header: 'CUI', headerRo: 'CUI', type: 'STRING' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.format).toBe('XLSX');
      expect(result.fileName).toContain('.xlsx');
    });

    it('should create JSON export', async () => {
      const dto: CreateExportDto = {
        dataType: 'PRODUCTS',
        format: 'JSON',
        columns: [
          { field: 'code', header: 'Code', headerRo: 'Cod', type: 'STRING' },
          { field: 'name', header: 'Name', headerRo: 'Nume', type: 'STRING' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.format).toBe('JSON');
      expect(result.fileName).toContain('.json');
    });

    it('should create XML export', async () => {
      const dto: CreateExportDto = {
        dataType: 'TRANSACTIONS',
        format: 'XML',
        columns: [
          { field: 'date', header: 'Date', headerRo: 'Data', type: 'DATE' },
          { field: 'amount', header: 'Amount', headerRo: 'Suma', type: 'CURRENCY' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.format).toBe('XML');
      expect(result.fileName).toContain('.xml');
    });

    it('should create PDF export', async () => {
      const dto: CreateExportDto = {
        dataType: 'EMPLOYEES',
        format: 'PDF',
        columns: [
          { field: 'name', header: 'Name', headerRo: 'Nume', type: 'STRING' },
          { field: 'position', header: 'Position', headerRo: 'Funcție', type: 'STRING' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.format).toBe('PDF');
      expect(result.fileName).toContain('.pdf');
    });

    it('should create SAF-T export', async () => {
      const dto: CreateExportDto = {
        dataType: 'TRANSACTIONS',
        format: 'SAF_T',
        columns: [
          { field: 'date', header: 'Date', headerRo: 'Data', type: 'DATE' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.format).toBe('SAF_T');
    });

    it('should create e-Factura export', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'E_FACTURA',
        columns: [
          { field: 'number', header: 'Invoice', headerRo: 'Factură', type: 'STRING' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.format).toBe('E_FACTURA');
    });

    it('should throw error when columns are missing', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      await expect(service.createExport(dto))
        .rejects.toThrow('Export columns are required');
    });

    it('should use template columns when templateId provided', async () => {
      const templates = await service.listTemplates({ dataType: 'INVOICES' });
      const template = templates.find(t => t.isDefault);

      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        templateId: template!.id,
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.templateId).toBe(template!.id);
    });

    it('should use Romanian locale by default', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.locale).toBe('ro');
    });

    it('should use RON currency by default', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.currency).toBe('RON');
    });

    it('should set custom locale', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        locale: 'en',
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.locale).toBe('en');
    });

    it('should set custom currency', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        currency: 'EUR',
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.currency).toBe('EUR');
    });

    it('should emit export.created event', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      await service.createExport(dto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.created', expect.any(Object));
    });

    it('should emit export.completed event', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      await service.createExport(dto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.completed', expect.any(Object));
    });
  });

  describe('Export Filtering', () => {
    const columns: ExportColumn[] = [
      { field: 'status', header: 'Status', headerRo: 'Status', type: 'STRING' },
      { field: 'total', header: 'Total', headerRo: 'Total', type: 'CURRENCY' },
    ];

    it('should filter by EQUALS', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        filters: [{ field: 'status', operator: 'EQUALS', value: 'PAID' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.status).toBe('COMPLETED');
    });

    it('should filter by GREATER_THAN', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        filters: [{ field: 'total', operator: 'GREATER_THAN', value: 1000 }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.status).toBe('COMPLETED');
    });

    it('should filter by CONTAINS', async () => {
      const dto: CreateExportDto = {
        dataType: 'CUSTOMERS',
        format: 'CSV',
        columns: [{ field: 'name', header: 'Name', headerRo: 'Nume', type: 'STRING' }],
        filters: [{ field: 'name', operator: 'CONTAINS', value: 'Example' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.status).toBe('COMPLETED');
    });

    it('should filter by date range', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        dateRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.status).toBe('COMPLETED');
    });

    it('should apply sorting', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns,
        sortBy: [{ field: 'total', direction: 'DESC' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const result = await service.createExport(dto);

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('Export Retrieval', () => {
    it('should get export by ID', async () => {
      const dto: CreateExportDto = {
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      };

      const created = await service.createExport(dto);
      const retrieved = await service.getExport(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent export', async () => {
      const result = await service.getExport('non-existent');
      expect(result).toBeNull();
    });

    it('should list exports for organization', async () => {
      await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const { exports, total } = await service.listExports('org-1');

      expect(exports.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
    });

    it('should filter exports by dataType', async () => {
      await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const { exports } = await service.listExports('org-1', { dataType: 'INVOICES' });

      expect(exports.every(e => e.dataType === 'INVOICES')).toBe(true);
    });

    it('should filter exports by format', async () => {
      await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const { exports } = await service.listExports('org-1', { format: 'CSV' });

      expect(exports.every(e => e.format === 'CSV')).toBe(true);
    });

    it('should filter exports by status', async () => {
      await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const { exports } = await service.listExports('org-1', { status: 'COMPLETED' });

      expect(exports.every(e => e.status === 'COMPLETED')).toBe(true);
    });

    it('should paginate exports', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createExport({
          dataType: 'INVOICES',
          format: 'CSV',
          columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
          organizationId: 'org-1',
          requestedBy: 'user-1',
        });
      }

      const page1 = await service.listExports('org-1', { page: 1, limit: 2 });
      const page2 = await service.listExports('org-1', { page: 2, limit: 2 });

      expect(page1.exports).toHaveLength(2);
      expect(page2.exports).toHaveLength(2);
    });
  });

  describe('Export Download', () => {
    it('should download completed export', async () => {
      const created = await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const download = await service.downloadExport(created.id);

      expect(download.content).toBeDefined();
      expect(download.fileName).toBe(created.fileName);
      expect(download.contentType).toBe('text/csv');
    });

    it('should return correct content type for XLSX', async () => {
      const created = await service.createExport({
        dataType: 'INVOICES',
        format: 'XLSX',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const download = await service.downloadExport(created.id);

      expect(download.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should return correct content type for JSON', async () => {
      const created = await service.createExport({
        dataType: 'INVOICES',
        format: 'JSON',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const download = await service.downloadExport(created.id);

      expect(download.contentType).toBe('application/json');
    });

    it('should return correct content type for PDF', async () => {
      const created = await service.createExport({
        dataType: 'INVOICES',
        format: 'PDF',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const download = await service.downloadExport(created.id);

      expect(download.contentType).toBe('application/pdf');
    });

    it('should throw error for non-existent export', async () => {
      await expect(service.downloadExport('non-existent'))
        .rejects.toThrow('Export not found');
    });
  });

  describe('Export Preview', () => {
    it('should preview export data', async () => {
      const preview = await service.previewExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [
          { field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' },
          { field: 'customer', header: 'Customer', headerRo: 'Client', type: 'STRING' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      expect(preview.columns).toHaveLength(2);
      expect(preview.rows.length).toBeGreaterThan(0);
      expect(preview.totalRecords).toBeGreaterThan(0);
    });

    it('should limit preview rows', async () => {
      const preview = await service.previewExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      }, 2);

      expect(preview.rows.length).toBeLessThanOrEqual(2);
    });

    it('should use Romanian headers by default', async () => {
      const preview = await service.previewExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [
          { field: 'number', header: 'Number', headerRo: 'Număr Factură', type: 'STRING' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      expect(preview.columns[0]).toBe('Număr Factură');
    });

    it('should use English headers when locale is en', async () => {
      const preview = await service.previewExport({
        dataType: 'INVOICES',
        format: 'CSV',
        locale: 'en',
        columns: [
          { field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' },
        ],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      expect(preview.columns[0]).toBe('Number');
    });
  });

  describe('Export Operations', () => {
    it('should delete export', async () => {
      const created = await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      await service.deleteExport(created.id);
      const retrieved = await service.getExport(created.id);

      expect(retrieved).toBeNull();
    });

    it('should throw when deleting non-existent export', async () => {
      await expect(service.deleteExport('non-existent'))
        .rejects.toThrow('Export not found');
    });

    it('should cleanup expired exports', async () => {
      const cleaned = await service.cleanupExpiredExports();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Export Templates', () => {
    it('should get built-in templates', async () => {
      const templates = await service.listTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.isBuiltIn)).toBe(true);
    });

    it('should filter templates by dataType', async () => {
      const templates = await service.listTemplates({ dataType: 'INVOICES' });

      expect(templates.every(t => t.dataType === 'INVOICES')).toBe(true);
    });

    it('should filter templates by format', async () => {
      const templates = await service.listTemplates({ format: 'XLSX' });

      expect(templates.every(t => t.format === 'XLSX')).toBe(true);
    });

    it('should get template by ID', async () => {
      const templates = await service.listTemplates();
      const template = await service.getTemplate(templates[0].id);

      expect(template).toBeDefined();
      expect(template!.id).toBe(templates[0].id);
    });

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should create custom template', async () => {
      const dto: CreateTemplateDto = {
        name: 'Custom Invoice Template',
        nameRo: 'Șablon Factură Personalizat',
        description: 'Custom invoice export template',
        descriptionRo: 'Șablon personalizat pentru export facturi',
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [
          { field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' },
          { field: 'total', header: 'Total', headerRo: 'Total', type: 'CURRENCY' },
        ],
        organizationId: 'org-1',
        createdBy: 'user-1',
      };

      const template = await service.createTemplate(dto);

      expect(template.id).toMatch(/^tpl-/);
      expect(template.name).toBe('Custom Invoice Template');
      expect(template.isBuiltIn).toBe(false);
    });

    it('should update custom template', async () => {
      const created = await service.createTemplate({
        name: 'Original Name',
        nameRo: 'Nume Original',
        description: 'Original description',
        descriptionRo: 'Descriere originală',
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        createdBy: 'user-1',
      });

      const updated = await service.updateTemplate(created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
    });

    it('should not update built-in template', async () => {
      const templates = await service.listTemplates();
      const builtIn = templates.find(t => t.isBuiltIn);

      await expect(service.updateTemplate(builtIn!.id, { name: 'New Name' }))
        .rejects.toThrow('Built-in templates cannot be modified');
    });

    it('should delete custom template', async () => {
      const created = await service.createTemplate({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: 'Will be deleted',
        descriptionRo: 'Va fi șters',
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        createdBy: 'user-1',
      });

      await service.deleteTemplate(created.id);
      const retrieved = await service.getTemplate(created.id);

      expect(retrieved).toBeNull();
    });

    it('should not delete built-in template', async () => {
      const templates = await service.listTemplates();
      const builtIn = templates.find(t => t.isBuiltIn);

      await expect(service.deleteTemplate(builtIn!.id))
        .rejects.toThrow('Built-in templates cannot be deleted');
    });

    it('should have Romanian translations', async () => {
      const templates = await service.listTemplates();

      for (const template of templates) {
        expect(template.nameRo).toBeDefined();
        expect(template.descriptionRo).toBeDefined();
      }
    });
  });

  describe('Export Statistics', () => {
    it('should calculate export statistics', async () => {
      await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const stats = await service.getExportStats('org-1');

      expect(stats.totalExports).toBeGreaterThan(0);
      expect(stats.completedExports).toBeGreaterThan(0);
      expect(stats.exportsByFormat).toBeDefined();
      expect(stats.exportsByDataType).toBeDefined();
    });

    it('should track exports by format', async () => {
      await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const stats = await service.getExportStats('org-1');

      expect(stats.exportsByFormat.CSV).toBeGreaterThan(0);
    });

    it('should track exports by dataType', async () => {
      await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const stats = await service.getExportStats('org-1');

      expect(stats.exportsByDataType.INVOICES).toBeGreaterThan(0);
    });
  });

  describe('Supported Formats and Data Types', () => {
    it('should list supported formats', async () => {
      const formats = await service.getSupportedFormats();

      expect(formats).toContainEqual(expect.objectContaining({ format: 'CSV' }));
      expect(formats).toContainEqual(expect.objectContaining({ format: 'XLSX' }));
      expect(formats).toContainEqual(expect.objectContaining({ format: 'PDF' }));
      expect(formats).toContainEqual(expect.objectContaining({ format: 'JSON' }));
      expect(formats).toContainEqual(expect.objectContaining({ format: 'XML' }));
      expect(formats).toContainEqual(expect.objectContaining({ format: 'SAF_T' }));
      expect(formats).toContainEqual(expect.objectContaining({ format: 'E_FACTURA' }));
    });

    it('should have Romanian names for formats', async () => {
      const formats = await service.getSupportedFormats();

      for (const format of formats) {
        expect(format.nameRo).toBeDefined();
      }
    });

    it('should list data types', async () => {
      const types = await service.getDataTypes();

      expect(types).toContainEqual(expect.objectContaining({ type: 'INVOICES' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'CUSTOMERS' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'PRODUCTS' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'TRANSACTIONS' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'EMPLOYEES' }));
    });

    it('should have Romanian names for data types', async () => {
      const types = await service.getDataTypes();

      for (const type of types) {
        expect(type.nameRo).toBeDefined();
      }
    });
  });

  describe('Scheduled Exports', () => {
    it('should schedule export', async () => {
      const result = await service.scheduleExport(
        {
          dataType: 'INVOICES',
          format: 'CSV',
          columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
          organizationId: 'org-1',
          requestedBy: 'user-1',
        },
        { cron: '0 8 * * *', timezone: 'Europe/Bucharest' }
      );

      expect(result.scheduleId).toMatch(/^sched-/);
      expect(result.nextRun).toBeDefined();
    });
  });

  describe('Romanian Localization', () => {
    it('should format dates in Romanian format', async () => {
      const created = await service.createExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [
          { field: 'date', header: 'Date', headerRo: 'Data', type: 'DATE', format: 'DD.MM.YYYY' },
        ],
        locale: 'ro',
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const download = await service.downloadExport(created.id);

      // Romanian date format: DD.MM.YYYY
      expect(download.content).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    });

    it('should use Romanian column headers', async () => {
      const preview = await service.previewExport({
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [
          { field: 'number', header: 'Invoice Number', headerRo: 'Număr Factură', type: 'STRING' },
        ],
        locale: 'ro',
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      expect(preview.columns).toContain('Număr Factură');
    });

    it('should support Romanian diacritics in exports', async () => {
      const template = await service.createTemplate({
        name: 'Test Template',
        nameRo: 'Șablon Test cu Diacritice',
        description: 'Test',
        descriptionRo: 'Șablon cu caractere românești: ă, î, â, ș, ț',
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        createdBy: 'user-1',
      });

      // Check uppercase Ș in nameRo
      expect(template.nameRo).toContain('Ș');
      // Check lowercase diacritics in descriptionRo
      expect(template.descriptionRo).toContain('ă');
      expect(template.descriptionRo).toContain('î');
      expect(template.descriptionRo).toContain('ț');
      expect(template.descriptionRo).toContain('ș');
    });
  });

  describe('ANAF Compliance', () => {
    it('should generate SAF-T compliant XML', async () => {
      const created = await service.createExport({
        dataType: 'TRANSACTIONS',
        format: 'SAF_T',
        columns: [{ field: 'date', header: 'Date', headerRo: 'Data', type: 'DATE' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const download = await service.downloadExport(created.id);

      expect(download.content).toContain('AuditFile');
      expect(download.content).toContain('DOCUMENTIULIA');
      expect(download.content).toContain('RO_1.0');
    });

    it('should generate e-Factura compliant XML', async () => {
      const created = await service.createExport({
        dataType: 'INVOICES',
        format: 'E_FACTURA',
        columns: [{ field: 'number', header: 'Number', headerRo: 'Număr', type: 'STRING' }],
        organizationId: 'org-1',
        requestedBy: 'user-1',
      });

      const download = await service.downloadExport(created.id);

      expect(download.content).toContain('Invoice');
      expect(download.content).toContain('urn:cen.eu:en16931:2017');
      expect(download.content).toContain('CIUS-RO');
    });

    it('should have VAT Report template', async () => {
      const templates = await service.listTemplates({ dataType: 'VAT_REPORT' });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].nameRo).toContain('TVA');
    });
  });
});
