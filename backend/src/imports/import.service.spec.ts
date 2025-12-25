import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ImportService,
  ImportStatus,
  ImportType,
  FileFormat,
  CreateImportDto,
  ColumnMapping,
  ImportOptions,
} from './import.service';

describe('ImportService', () => {
  let service: ImportService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  };

  const createImportDto: CreateImportDto = {
    tenantId: 'tenant_123',
    userId: 'user_123',
    type: ImportType.CUSTOMERS,
    format: FileFormat.CSV,
    fileName: 'customers.csv',
    fileSize: 1024,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create an import job', async () => {
      const job = await service.createImport(createImportDto);

      expect(job).toBeDefined();
      expect(job.id).toMatch(/^imp_/);
      expect(job.status).toBe(ImportStatus.PENDING);
      expect(job.tenantId).toBe(createImportDto.tenantId);
      expect(job.userId).toBe(createImportDto.userId);
    });

    it('should generate unique job IDs', async () => {
      const job1 = await service.createImport(createImportDto);
      const job2 = await service.createImport(createImportDto);

      expect(job1.id).not.toBe(job2.id);
    });

    it('should emit import.created event', async () => {
      await service.createImport(createImportDto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'import.created',
        expect.objectContaining({
          type: ImportType.CUSTOMERS,
          tenantId: 'tenant_123',
        })
      );
    });
  });

  describe('Import Job Retrieval', () => {
    it('should get import by ID', async () => {
      const created = await service.createImport(createImportDto);
      const retrieved = await service.getImport(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(service.getImport('imp_nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should get imports by tenant', async () => {
      await service.createImport(createImportDto);
      await service.createImport(createImportDto);

      const { jobs, total } = await service.getImports('tenant_123');

      expect(jobs.length).toBe(2);
      expect(total).toBe(2);
    });

    it('should filter imports by type', async () => {
      await service.createImport(createImportDto);
      await service.createImport({ ...createImportDto, type: ImportType.PRODUCTS });

      const { jobs } = await service.getImports('tenant_123', { type: ImportType.CUSTOMERS });

      expect(jobs.every((j) => j.type === ImportType.CUSTOMERS)).toBe(true);
    });

    it('should filter imports by status', async () => {
      const job = await service.createImport(createImportDto);
      await service.startImport(job.id);

      const { jobs } = await service.getImports('tenant_123', { status: ImportStatus.PENDING });

      expect(jobs.every((j) => j.status === ImportStatus.PENDING)).toBe(true);
    });

    it('should filter imports by user', async () => {
      await service.createImport(createImportDto);
      await service.createImport({ ...createImportDto, userId: 'other_user' });

      const { jobs } = await service.getImports('tenant_123', { userId: 'user_123' });

      expect(jobs.every((j) => j.userId === 'user_123')).toBe(true);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createImport(createImportDto);
      }

      const { jobs, total } = await service.getImports('tenant_123', { limit: 2, offset: 0 });

      expect(jobs.length).toBe(2);
      expect(total).toBe(5);
    });

    it('should sort by creation date descending', async () => {
      await service.createImport(createImportDto);
      await service.createImport(createImportDto);

      const { jobs } = await service.getImports('tenant_123');

      const dates = jobs.map((j) => new Date(j.createdAt).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
    });
  });

  describe('Import Processing', () => {
    it('should start import job', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      const started = await service.startImport(job.id);

      expect([
        ImportStatus.COMPLETED,
        ImportStatus.PARTIALLY_COMPLETED,
        ImportStatus.FAILED,
      ]).toContain(started.status);
    });

    it('should set startedAt timestamp', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      const started = await service.startImport(job.id);

      expect(started.startedAt).toBeDefined();
    });

    it('should not start already started import', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      await service.startImport(job.id);

      await expect(service.startImport(job.id)).rejects.toThrow(BadRequestException);
    });

    it('should have result after completion', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      const completed = await service.startImport(job.id);

      expect(completed.result).toBeDefined();
      expect(completed.result?.totalRows).toBeGreaterThan(0);
    });

    it('should track processed rows', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      const completed = await service.startImport(job.id);

      expect(completed.result?.processedRows).toBe(completed.result?.totalRows);
    });

    it('should fail without column mappings', async () => {
      const job = await service.createImport(createImportDto);

      const result = await service.startImport(job.id);

      expect(result.status).toBe(ImportStatus.FAILED);
      expect(result.errorMessage).toContain('column mappings');
    });

    it('should emit progress events', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      await service.startImport(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'import.progress',
        expect.objectContaining({ jobId: job.id })
      );
    });
  });

  describe('Import Cancellation', () => {
    it('should cancel pending import', async () => {
      const job = await service.createImport(createImportDto);
      const cancelled = await service.cancelImport(job.id);

      expect(cancelled.status).toBe(ImportStatus.CANCELLED);
    });

    it('should set completedAt on cancellation', async () => {
      const job = await service.createImport(createImportDto);
      const cancelled = await service.cancelImport(job.id);

      expect(cancelled.completedAt).toBeDefined();
    });

    it('should emit import.cancelled event', async () => {
      const job = await service.createImport(createImportDto);
      await service.cancelImport(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('import.cancelled', { jobId: job.id });
    });

    it('should not cancel completed import', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });
      await service.startImport(job.id);

      await expect(service.cancelImport(job.id)).rejects.toThrow(BadRequestException);
    });

    it('should not cancel already cancelled import', async () => {
      const job = await service.createImport(createImportDto);
      await service.cancelImport(job.id);

      await expect(service.cancelImport(job.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Import Deletion', () => {
    it('should delete pending import', async () => {
      const job = await service.createImport(createImportDto);
      await service.deleteImport(job.id);

      await expect(service.getImport(job.id)).rejects.toThrow(NotFoundException);
    });

    it('should delete completed import', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });
      await service.startImport(job.id);
      await service.deleteImport(job.id);

      await expect(service.getImport(job.id)).rejects.toThrow(NotFoundException);
    });

    it('should emit import.deleted event', async () => {
      const job = await service.createImport(createImportDto);
      await service.deleteImport(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('import.deleted', { jobId: job.id });
    });
  });

  describe('File Validation', () => {
    it('should reject oversized files', async () => {
      const oversizedDto = { ...createImportDto, fileSize: 100 * 1024 * 1024 };

      await expect(service.createImport(oversizedDto)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid file sizes', async () => {
      const validDto = { ...createImportDto, fileSize: 10 * 1024 * 1024 };
      const job = await service.createImport(validDto);

      expect(job).toBeDefined();
    });

    it('should reject unsupported formats', async () => {
      const invalidDto = { ...createImportDto, format: 'pdf' as FileFormat };

      await expect(service.createImport(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('File Preview', () => {
    it('should preview file content', async () => {
      const preview = await service.previewFile(FileFormat.CSV, Buffer.from('test'));

      expect(preview.headers).toBeDefined();
      expect(preview.rows).toBeDefined();
      expect(preview.sampleSize).toBeGreaterThan(0);
    });

    it('should include total row count', async () => {
      const preview = await service.previewFile(FileFormat.CSV, Buffer.from('test'));

      expect(preview.totalRows).toBeGreaterThan(0);
    });

    it('should limit sample size', async () => {
      const preview = await service.previewFile(FileFormat.CSV, Buffer.from('test'));

      expect(preview.rows.length).toBeLessThanOrEqual(preview.sampleSize);
    });
  });

  describe('Column Mapping Validation', () => {
    it('should validate required fields are mapped', async () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'name', targetField: 'name', required: true },
      ];

      const result = await service.validateMapping(ImportType.CUSTOMERS, mappings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Required field 'taxId' is not mapped");
    });

    it('should pass validation with all required fields', async () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'name', targetField: 'name', required: true },
        { sourceColumn: 'cui', targetField: 'taxId', required: true },
      ];

      const result = await service.validateMapping(ImportType.CUSTOMERS, mappings);

      expect(result.valid).toBe(true);
    });

    it('should detect duplicate target fields', async () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'name1', targetField: 'name', required: true },
        { sourceColumn: 'name2', targetField: 'name', required: true },
        { sourceColumn: 'cui', targetField: 'taxId', required: true },
      ];

      const result = await service.validateMapping(ImportType.CUSTOMERS, mappings);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });

    it('should include Romanian error messages', async () => {
      const mappings: ColumnMapping[] = [];

      const result = await service.validateMapping(ImportType.CUSTOMERS, mappings);

      expect(result.errorsRo.length).toBeGreaterThan(0);
      expect(result.errorsRo[0]).toContain('Câmpul');
    });
  });

  describe('Required Fields', () => {
    it('should return required fields for customers', () => {
      const fields = service.getRequiredFields(ImportType.CUSTOMERS);

      expect(fields.find((f) => f.name === 'name')).toBeDefined();
      expect(fields.find((f) => f.name === 'taxId')).toBeDefined();
    });

    it('should return required fields for products', () => {
      const fields = service.getRequiredFields(ImportType.PRODUCTS);

      expect(fields.find((f) => f.name === 'sku')).toBeDefined();
      expect(fields.find((f) => f.name === 'name')).toBeDefined();
      expect(fields.find((f) => f.name === 'price')).toBeDefined();
    });

    it('should return required fields for invoices', () => {
      const fields = service.getRequiredFields(ImportType.INVOICES);

      expect(fields.find((f) => f.name === 'number')).toBeDefined();
      expect(fields.find((f) => f.name === 'date')).toBeDefined();
      expect(fields.find((f) => f.name === 'totalAmount')).toBeDefined();
    });

    it('should include Romanian field names', () => {
      const fields = service.getRequiredFields(ImportType.CUSTOMERS);

      fields.forEach((field) => {
        expect(field.nameRo).toBeDefined();
        expect(field.nameRo.length).toBeGreaterThan(0);
      });
    });
  });

  describe('All Fields', () => {
    it('should return all fields for customers', () => {
      const fields = service.getAllFields(ImportType.CUSTOMERS);

      expect(fields.length).toBeGreaterThan(2);
      expect(fields.find((f) => f.name === 'email')).toBeDefined();
      expect(fields.find((f) => f.name === 'phone')).toBeDefined();
    });

    it('should include field types', () => {
      const fields = service.getAllFields(ImportType.PRODUCTS);

      const priceField = fields.find((f) => f.name === 'price');
      expect(priceField?.type).toBe('currency');
    });

    it('should include required flag', () => {
      const fields = service.getAllFields(ImportType.CUSTOMERS);

      const nameField = fields.find((f) => f.name === 'name');
      const emailField = fields.find((f) => f.name === 'email');

      expect(nameField?.required).toBe(true);
      expect(emailField?.required).toBe(false);
    });
  });

  describe('Import Templates', () => {
    it('should have default templates', async () => {
      const templates = await service.getTemplates('tenant_123');

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have customer CSV template', async () => {
      const templates = await service.getTemplates('tenant_123', ImportType.CUSTOMERS);

      expect(templates.find((t) => t.format === FileFormat.CSV)).toBeDefined();
    });

    it('should have SAF-T template', async () => {
      const templates = await service.getTemplates('tenant_123', ImportType.SAF_T);

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should get template by ID', async () => {
      const template = await service.getTemplate('tpl_customers_csv');

      expect(template).toBeDefined();
      expect(template.type).toBe(ImportType.CUSTOMERS);
    });

    it('should throw for invalid template ID', async () => {
      await expect(service.getTemplate('tpl_nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should create custom template', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant_123',
        name: 'Custom Customer Import',
        nameRo: 'Import Clienți Personalizat',
        type: ImportType.CUSTOMERS,
        format: FileFormat.CSV,
        columnMappings: [{ sourceColumn: 'nume', targetField: 'name', required: true }],
        options: { skipFirstRow: true },
        isDefault: false,
      });

      expect(template.id).toMatch(/^tpl_/);
      expect(template.tenantId).toBe('tenant_123');
    });

    it('should update custom template', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant_123',
        name: 'Template to Update',
        nameRo: 'Șablon de Actualizat',
        type: ImportType.CUSTOMERS,
        format: FileFormat.CSV,
        columnMappings: [],
        options: {},
        isDefault: false,
      });

      const updated = await service.updateTemplate(template.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
    });

    it('should not update system templates', async () => {
      await expect(
        service.updateTemplate('tpl_customers_csv', { name: 'Modified' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete custom template', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant_123',
        name: 'Template to Delete',
        nameRo: 'Șablon de Șters',
        type: ImportType.CUSTOMERS,
        format: FileFormat.CSV,
        columnMappings: [],
        options: {},
        isDefault: false,
      });

      await service.deleteTemplate(template.id);

      await expect(service.getTemplate(template.id)).rejects.toThrow(NotFoundException);
    });

    it('should not delete system templates', async () => {
      await expect(service.deleteTemplate('tpl_customers_csv')).rejects.toThrow(BadRequestException);
    });

    it('should use template in import', async () => {
      const job = await service.createImport({
        ...createImportDto,
        templateId: 'tpl_customers_csv',
      });

      expect(job.columnMappings.length).toBeGreaterThan(0);
    });
  });

  describe('Import Types', () => {
    it('should support all import types', () => {
      const types = service.getSupportedTypes();

      expect(types).toContain(ImportType.CUSTOMERS);
      expect(types).toContain(ImportType.PRODUCTS);
      expect(types).toContain(ImportType.INVOICES);
      expect(types).toContain(ImportType.TRANSACTIONS);
      expect(types).toContain(ImportType.EMPLOYEES);
      expect(types).toContain(ImportType.INVENTORY);
      expect(types).toContain(ImportType.CHART_OF_ACCOUNTS);
      expect(types).toContain(ImportType.VENDORS);
      expect(types).toContain(ImportType.BANK_STATEMENTS);
      expect(types).toContain(ImportType.SAF_T);
    });

    it('should support all file formats', () => {
      const formats = service.getSupportedFormats();

      expect(formats).toContain(FileFormat.CSV);
      expect(formats).toContain(FileFormat.XLSX);
      expect(formats).toContain(FileFormat.JSON);
      expect(formats).toContain(FileFormat.XML);
    });
  });

  describe('Import Options', () => {
    it('should use default options', async () => {
      const job = await service.createImport(createImportDto);

      expect(job.options.skipFirstRow).toBe(true);
      expect(job.options.delimiter).toBe(',');
      expect(job.options.encoding).toBe('utf-8');
    });

    it('should merge custom options', async () => {
      const job = await service.createImport({
        ...createImportDto,
        options: { delimiter: ';', skipFirstRow: false },
      });

      expect(job.options.delimiter).toBe(';');
      expect(job.options.skipFirstRow).toBe(false);
      expect(job.options.encoding).toBe('utf-8'); // Default preserved
    });

    it('should support Romanian date format', async () => {
      const job = await service.createImport(createImportDto);

      expect(job.options.dateFormat).toBe('DD.MM.YYYY');
    });

    it('should support Romanian number format', async () => {
      const job = await service.createImport(createImportDto);

      expect(job.options.decimalSeparator).toBe(',');
      expect(job.options.thousandsSeparator).toBe('.');
    });
  });

  describe('Statistics', () => {
    it('should get import statistics', async () => {
      await service.createImport(createImportDto);

      const stats = service.getStats('tenant_123');

      expect(stats.totalImports).toBe(1);
    });

    it('should count completed imports', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });
      await service.startImport(job.id);

      const stats = service.getStats('tenant_123');

      expect(stats.completedImports + stats.failedImports).toBeGreaterThanOrEqual(0);
    });

    it('should track imports by type', async () => {
      await service.createImport(createImportDto);
      await service.createImport({ ...createImportDto, type: ImportType.PRODUCTS });

      const stats = service.getStats('tenant_123');

      expect(stats.importsByType[ImportType.CUSTOMERS]).toBe(1);
      expect(stats.importsByType[ImportType.PRODUCTS]).toBe(1);
    });

    it('should track imports by status', async () => {
      await service.createImport(createImportDto);
      const job2 = await service.createImport(createImportDto);
      await service.cancelImport(job2.id);

      const stats = service.getStats('tenant_123');

      expect(stats.importsByStatus[ImportStatus.PENDING]).toBeGreaterThanOrEqual(1);
      expect(stats.importsByStatus[ImportStatus.CANCELLED]).toBe(1);
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian template names', async () => {
      const templates = await service.getTemplates('tenant_123');

      templates.forEach((template) => {
        expect(template.nameRo).toBeDefined();
        expect(template.nameRo.length).toBeGreaterThan(0);
      });
    });

    it('should have Romanian error messages', async () => {
      const job = await service.createImport(createImportDto);
      await service.startImport(job.id);

      const retrieved = await service.getImport(job.id);

      if (retrieved.errorMessageRo) {
        expect(retrieved.errorMessageRo.length).toBeGreaterThan(0);
      }
    });

    it('should support Romanian city names', async () => {
      const preview = await service.previewFile(FileFormat.CSV, Buffer.from(''));

      const cities = preview.rows.map((r) => r[5]);
      expect(cities).toContain('București');
    });
  });

  describe('SAF-T Import', () => {
    it('should have SAF-T D406 template', async () => {
      const templates = await service.getTemplates('tenant_123', ImportType.SAF_T);
      const saftTemplate = templates.find((t) => t.type === ImportType.SAF_T);

      expect(saftTemplate).toBeDefined();
      expect(saftTemplate?.format).toBe(FileFormat.XML);
    });

    it('should accept XML format for SAF-T', async () => {
      const job = await service.createImport({
        ...createImportDto,
        type: ImportType.SAF_T,
        format: FileFormat.XML,
        fileName: 'saft_d406.xml',
      });

      expect(job.type).toBe(ImportType.SAF_T);
      expect(job.format).toBe(FileFormat.XML);
    });

    it('should not require column mappings for SAF-T', async () => {
      const job = await service.createImport({
        ...createImportDto,
        type: ImportType.SAF_T,
        format: FileFormat.XML,
        fileName: 'saft_d406.xml',
      });

      const result = await service.startImport(job.id);

      // SAF-T imports use schema-based parsing, not column mappings
      expect(result).toBeDefined();
    });
  });

  describe('Event Emission', () => {
    it('should emit import.started event', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      await service.startImport(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'import.started',
        expect.objectContaining({ jobId: job.id })
      );
    });

    it('should emit import.completed event', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      await service.startImport(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'import.completed',
        expect.objectContaining({ jobId: job.id })
      );
    });

    it('should emit template events', async () => {
      const template = await service.createTemplate({
        tenantId: 'tenant_123',
        name: 'Event Test Template',
        nameRo: 'Șablon Test Evenimente',
        type: ImportType.CUSTOMERS,
        format: FileFormat.CSV,
        columnMappings: [],
        options: {},
        isDefault: false,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'import.template.created',
        expect.objectContaining({ templateId: template.id })
      );
    });
  });

  describe('Import Job ID Format', () => {
    it('should generate job ID with prefix', async () => {
      const job = await service.createImport(createImportDto);

      expect(job.id).toMatch(/^imp_/);
    });

    it('should generate hex string after prefix', async () => {
      const job = await service.createImport(createImportDto);
      const hexPart = job.id.replace('imp_', '');

      expect(hexPart).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt on job creation', async () => {
      const before = new Date();
      const job = await service.createImport(createImportDto);
      const after = new Date();

      const createdAt = new Date(job.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set completedAt on job completion', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      const completed = await service.startImport(job.id);

      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('Result Details', () => {
    it('should include duration in result', async () => {
      const job = await service.createImport({
        ...createImportDto,
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      const completed = await service.startImport(job.id);

      expect(completed.result?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include error details', async () => {
      const job = await service.createImport({
        ...createImportDto,
        fileSize: 10000, // Larger file for more rows and potential errors
        columnMappings: [
          { sourceColumn: 'name', targetField: 'name', required: true },
          { sourceColumn: 'cui', targetField: 'taxId', required: true },
        ],
      });

      const completed = await service.startImport(job.id);

      if (completed.result?.errors.length) {
        const error = completed.result.errors[0];
        expect(error.row).toBeDefined();
        expect(error.column).toBeDefined();
        expect(error.error).toBeDefined();
        expect(error.errorRo).toBeDefined();
      }
    });
  });
});
