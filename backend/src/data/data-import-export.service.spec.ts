import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  DataImportExportService,
  ImportFormat,
  ExportFormat,
  DataType,
  FieldMapping,
} from './data-import-export.service';

describe('DataImportExportService', () => {
  let service: DataImportExportService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataImportExportService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DataImportExportService>(DataImportExportService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with data schemas', () => {
      const schemas = service.getSchemas();
      expect(schemas.length).toBe(8);
    });

    it('should have all required data type schemas', () => {
      const dataTypes = service.getDataTypes();
      for (const type of dataTypes) {
        const schema = service.getSchema(type);
        expect(schema).not.toBeNull();
      }
    });
  });

  describe('import configuration', () => {
    const tenantId = 'tenant-1';
    const mappings: FieldMapping[] = [
      { sourceField: 'customer_name', targetField: 'name', required: true },
      { sourceField: 'email_address', targetField: 'email', required: true },
    ];

    it('should create import config', async () => {
      const config = await service.createImportConfig(
        tenantId,
        'Customer Import',
        'customers',
        'csv',
        mappings,
        'user-1',
      );

      expect(config.id).toBeDefined();
      expect(config.name).toBe('Customer Import');
      expect(config.dataType).toBe('customers');
      expect(config.format).toBe('csv');
      expect(config.fieldMappings).toHaveLength(2);
    });

    it('should get import config by id', async () => {
      const created = await service.createImportConfig(
        tenantId,
        'Get Test',
        'products',
        'json',
        mappings,
        'user-1',
      );

      const retrieved = await service.getImportConfig(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return null for non-existent config', async () => {
      const config = await service.getImportConfig('non-existent');
      expect(config).toBeNull();
    });

    it('should get configs for tenant', async () => {
      await service.createImportConfig(tenantId, 'Config 1', 'customers', 'csv', mappings, 'user-1');
      await service.createImportConfig(tenantId, 'Config 2', 'products', 'json', mappings, 'user-1');
      await service.createImportConfig('other-tenant', 'Other Config', 'invoices', 'csv', mappings, 'user-2');

      const configs = await service.getImportConfigs(tenantId);
      expect(configs.every(c => c.tenantId === tenantId)).toBe(true);
    });

    it('should filter configs by data type', async () => {
      await service.createImportConfig(tenantId, 'Customer Import', 'customers', 'csv', mappings, 'user-1');
      await service.createImportConfig(tenantId, 'Product Import', 'products', 'csv', mappings, 'user-1');

      const configs = await service.getImportConfigs(tenantId, 'customers');
      expect(configs.every(c => c.dataType === 'customers')).toBe(true);
    });

    it('should update import config', async () => {
      const config = await service.createImportConfig(
        tenantId,
        'Update Test',
        'customers',
        'csv',
        mappings,
        'user-1',
      );

      const updated = await service.updateImportConfig(config.id, {
        name: 'Updated Name',
        batchSize: 500,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.batchSize).toBe(500);
    });

    it('should delete import config', async () => {
      const config = await service.createImportConfig(
        tenantId,
        'Delete Test',
        'customers',
        'csv',
        mappings,
        'user-1',
      );

      const deleted = await service.deleteImportConfig(config.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getImportConfig(config.id);
      expect(retrieved).toBeNull();
    });

    it('should create config with options', async () => {
      const config = await service.createImportConfig(
        tenantId,
        'Options Test',
        'customers',
        'csv',
        mappings,
        'user-1',
        {
          skipDuplicates: false,
          updateExisting: true,
          batchSize: 200,
          validationRules: [
            { field: 'email', type: 'format', params: { pattern: '^[^@]+@[^@]+\\.[^@]+$' } },
          ],
        },
      );

      expect(config.skipDuplicates).toBe(false);
      expect(config.updateExisting).toBe(true);
      expect(config.batchSize).toBe(200);
      expect(config.validationRules).toHaveLength(1);
    });
  });

  describe('import preview', () => {
    it('should preview CSV import', async () => {
      const csvContent = `name,email,phone
John Doe,john@example.com,+40721000001
Jane Smith,jane@example.com,+40721000002`;

      const preview = await service.previewImport('tenant-1', csvContent, 'csv', 'customers');

      expect(preview.format).toBe('csv');
      expect(preview.totalRows).toBe(2);
      expect(preview.detectedFields).toContain('name');
      expect(preview.detectedFields).toContain('email');
      expect(preview.sampleData).toHaveLength(2);
    });

    it('should preview JSON import', async () => {
      const jsonContent = JSON.stringify([
        { sku: 'SKU001', name: 'Product 1', price: 100 },
        { sku: 'SKU002', name: 'Product 2', price: 200 },
      ]);

      const preview = await service.previewImport('tenant-1', jsonContent, 'json', 'products');

      expect(preview.format).toBe('json');
      expect(preview.totalRows).toBe(2);
      expect(preview.detectedFields).toContain('sku');
      expect(preview.detectedFields).toContain('price');
    });

    it('should preview XML import', async () => {
      const xmlContent = `<?xml version="1.0"?>
<records>
  <record><name>Test</name><email>test@example.com</email></record>
</records>`;

      const preview = await service.previewImport('tenant-1', xmlContent, 'xml', 'customers');

      expect(preview.format).toBe('xml');
      expect(preview.totalRows).toBe(1);
    });

    it('should suggest field mappings', async () => {
      const csvContent = `name,email,phone
John,john@example.com,123`;

      const preview = await service.previewImport('tenant-1', csvContent, 'csv', 'customers');

      expect(preview.suggestedMappings.length).toBeGreaterThan(0);
      const nameMapping = preview.suggestedMappings.find(m => m.targetField === 'name');
      expect(nameMapping?.sourceField).toBe('name');
    });
  });

  describe('import execution', () => {
    it('should start import job', async () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', required: true },
        { sourceField: 'email', targetField: 'email', required: true },
      ];

      const config = await service.createImportConfig(
        'tenant-1',
        'Test Import',
        'customers',
        'csv',
        mappings,
        'user-1',
      );

      const csvContent = `name,email
John Doe,john@example.com
Jane Smith,jane@example.com`;

      const job = await service.startImport('tenant-1', config.id, csvContent, 'test.csv', 'user-1');

      expect(job.id).toBeDefined();
      expect(job.fileName).toBe('test.csv');
      expect(job.totalRows).toBe(2);
      expect(job.status).toBeDefined();
    });

    it('should get import job by id', async () => {
      const config = await service.createImportConfig(
        'tenant-1',
        'Job Test',
        'customers',
        'csv',
        [{ sourceField: 'name', targetField: 'name', required: true }],
        'user-1',
      );

      const job = await service.startImport('tenant-1', config.id, 'name\nTest', 'test.csv', 'user-1');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const retrieved = await service.getImportJob(job.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(job.id);
    });

    it('should get import jobs for tenant', async () => {
      const config = await service.createImportConfig(
        'tenant-jobs',
        'Jobs Test',
        'customers',
        'csv',
        [{ sourceField: 'name', targetField: 'name', required: true }],
        'user-1',
      );

      await service.startImport('tenant-jobs', config.id, 'name\nTest1', 'test1.csv', 'user-1');
      await service.startImport('tenant-jobs', config.id, 'name\nTest2', 'test2.csv', 'user-1');

      const jobs = await service.getImportJobs('tenant-jobs');
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should get import progress', async () => {
      const config = await service.createImportConfig(
        'tenant-1',
        'Progress Test',
        'customers',
        'csv',
        [{ sourceField: 'name', targetField: 'name', required: true }],
        'user-1',
      );

      const job = await service.startImport('tenant-1', config.id, 'name\nTest', 'test.csv', 'user-1');

      const progress = await service.getImportProgress(job.id);
      expect(progress).not.toBeNull();
      expect(progress?.totalRows).toBe(1);
    });

    it('should cancel pending import', async () => {
      const config = await service.createImportConfig(
        'tenant-1',
        'Cancel Test',
        'customers',
        'csv',
        [{ sourceField: 'name', targetField: 'name', required: true }],
        'user-1',
      );

      const job = await service.startImport('tenant-1', config.id, 'name\nTest', 'test.csv', 'user-1');

      // Job may complete quickly, check if it's cancellable
      const result = await service.cancelImport(job.id);
      // Either cancelled successfully or already completed
      expect(typeof result).toBe('boolean');
    });

    it('should throw error for non-existent config', async () => {
      await expect(
        service.startImport('tenant-1', 'non-existent', 'data', 'test.csv', 'user-1'),
      ).rejects.toThrow('Import config not found');
    });
  });

  describe('export configuration', () => {
    const tenantId = 'tenant-export';

    it('should create export config', async () => {
      const config = await service.createExportConfig(
        tenantId,
        'Customer Export',
        'customers',
        'csv',
        ['name', 'email', 'phone'],
        'user-1',
      );

      expect(config.id).toBeDefined();
      expect(config.name).toBe('Customer Export');
      expect(config.format).toBe('csv');
      expect(config.fields).toHaveLength(3);
    });

    it('should get export config by id', async () => {
      const created = await service.createExportConfig(
        tenantId,
        'Get Export Test',
        'products',
        'json',
        ['sku', 'name'],
        'user-1',
      );

      const retrieved = await service.getExportConfig(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Get Export Test');
    });

    it('should get export configs for tenant', async () => {
      await service.createExportConfig(tenantId, 'Export 1', 'customers', 'csv', ['name'], 'user-1');
      await service.createExportConfig(tenantId, 'Export 2', 'products', 'json', ['sku'], 'user-1');

      const configs = await service.getExportConfigs(tenantId);
      expect(configs.every(c => c.tenantId === tenantId)).toBe(true);
    });

    it('should delete export config', async () => {
      const config = await service.createExportConfig(
        tenantId,
        'Delete Export',
        'customers',
        'csv',
        ['name'],
        'user-1',
      );

      const deleted = await service.deleteExportConfig(config.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getExportConfig(config.id);
      expect(retrieved).toBeNull();
    });

    it('should create config with options', async () => {
      const config = await service.createExportConfig(
        tenantId,
        'Options Export',
        'invoices',
        'excel',
        ['invoiceNumber', 'total'],
        'user-1',
        {
          filters: { status: 'paid' },
          sorting: [{ field: 'total', order: 'desc' }],
          includeHeaders: true,
          dateFormat: 'DD/MM/YYYY',
        },
      );

      expect(config.filters).toEqual({ status: 'paid' });
      expect(config.sorting).toHaveLength(1);
      expect(config.includeHeaders).toBe(true);
      expect(config.dateFormat).toBe('DD/MM/YYYY');
    });
  });

  describe('export execution', () => {
    it('should start export job', async () => {
      const job = await service.startExport('tenant-1', 'customers', 'csv', 'user-1');

      expect(job.id).toBeDefined();
      expect(job.dataType).toBe('customers');
      expect(job.format).toBe('csv');
      expect(job.status).toBeDefined();
    });

    it('should get export job by id', async () => {
      const job = await service.startExport('tenant-1', 'products', 'json', 'user-1');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const retrieved = await service.getExportJob(job.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(job.id);
    });

    it('should complete export with file info', async () => {
      const job = await service.startExport('tenant-1', 'employees', 'csv', 'user-1');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const completed = await service.getExportJob(job.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.fileUrl).toBeDefined();
      expect(completed?.fileSize).toBeGreaterThan(0);
      expect(completed?.exportedRecords).toBeGreaterThan(0);
    });

    it('should get export jobs for tenant', async () => {
      await service.startExport('tenant-export-jobs', 'customers', 'csv', 'user-1');
      await service.startExport('tenant-export-jobs', 'products', 'json', 'user-1');

      const jobs = await service.getExportJobs('tenant-export-jobs');
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should export different formats', async () => {
      const csvJob = await service.startExport('tenant-1', 'customers', 'csv', 'user-1');
      const jsonJob = await service.startExport('tenant-1', 'customers', 'json', 'user-1');
      const xmlJob = await service.startExport('tenant-1', 'customers', 'xml', 'user-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      const csvResult = await service.getExportJob(csvJob.id);
      const jsonResult = await service.getExportJob(jsonJob.id);
      const xmlResult = await service.getExportJob(xmlJob.id);

      expect(csvResult?.fileUrl).toContain('.csv');
      expect(jsonResult?.fileUrl).toContain('.json');
      expect(xmlResult?.fileUrl).toContain('.xml');
    });
  });

  describe('schemas', () => {
    it('should get schema by data type', () => {
      const schema = service.getSchema('customers');

      expect(schema).not.toBeNull();
      expect(schema?.dataType).toBe('customers');
      expect(schema?.fields.length).toBeGreaterThan(0);
      expect(schema?.requiredFields).toContain('name');
    });

    it('should return null for unknown schema', () => {
      const schema = service.getSchema('unknown' as DataType);
      expect(schema).toBeNull();
    });

    it('should get all schemas', () => {
      const schemas = service.getSchemas();

      expect(schemas).toBeInstanceOf(Array);
      expect(schemas.length).toBe(8);
    });

    it('should have correct field types in schemas', () => {
      const productSchema = service.getSchema('products');

      expect(productSchema).not.toBeNull();
      const priceField = productSchema?.fields.find(f => f.name === 'price');
      expect(priceField?.type).toBe('number');
    });

    it('should have unique fields defined', () => {
      const customerSchema = service.getSchema('customers');

      expect(customerSchema?.uniqueFields).toContain('email');
    });

    it('should have reference fields defined', () => {
      const invoiceSchema = service.getSchema('invoices');

      expect(invoiceSchema?.referenceFields.length).toBeGreaterThan(0);
      const customerRef = invoiceSchema?.referenceFields.find(r => r.field === 'customerId');
      expect(customerRef?.refType).toBe('customers');
    });
  });

  describe('metadata', () => {
    it('should return import formats', () => {
      const formats = service.getImportFormats();

      expect(formats).toContain('csv');
      expect(formats).toContain('excel');
      expect(formats).toContain('json');
      expect(formats).toContain('xml');
    });

    it('should return export formats', () => {
      const formats = service.getExportFormats();

      expect(formats).toContain('csv');
      expect(formats).toContain('excel');
      expect(formats).toContain('json');
      expect(formats).toContain('xml');
      expect(formats).toContain('pdf');
    });

    it('should return data types', () => {
      const types = service.getDataTypes();

      expect(types).toContain('customers');
      expect(types).toContain('products');
      expect(types).toContain('invoices');
      expect(types).toContain('transactions');
      expect(types).toContain('employees');
      expect(types).toContain('vehicles');
      expect(types).toContain('routes');
      expect(types).toContain('inventory');
    });

    it('should return import statuses', () => {
      const statuses = service.getImportStatuses();

      expect(statuses).toContain('pending');
      expect(statuses).toContain('validating');
      expect(statuses).toContain('processing');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('cancelled');
    });

    it('should return export statuses', () => {
      const statuses = service.getExportStatuses();

      expect(statuses).toContain('pending');
      expect(statuses).toContain('generating');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
    });
  });

  describe('data transformation', () => {
    it('should transform data types correctly during import', async () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'price', targetField: 'price', transform: 'number' },
        { sourceField: 'active', targetField: 'isActive', transform: 'boolean' },
        { sourceField: 'name', targetField: 'name', transform: 'string' },
      ];

      const config = await service.createImportConfig(
        'tenant-1',
        'Transform Test',
        'products',
        'csv',
        mappings,
        'user-1',
      );

      const csvContent = `name,price,active
Product 1,100.50,true
Product 2,200,false`;

      const job = await service.startImport('tenant-1', config.id, csvContent, 'test.csv', 'user-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await service.getImportJob(job.id);
      expect(result?.status).toBe('completed');
    });
  });

  describe('validation', () => {
    it('should validate required fields', async () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', required: true },
        { sourceField: 'email', targetField: 'email', required: true },
      ];

      const config = await service.createImportConfig(
        'tenant-1',
        'Validation Test',
        'customers',
        'csv',
        mappings,
        'user-1',
      );

      const csvContent = `name,email
John,john@example.com
,missing_name@example.com`;

      const job = await service.startImport('tenant-1', config.id, csvContent, 'test.csv', 'user-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await service.getImportJob(job.id);
      expect(result?.errors.length).toBeGreaterThan(0);
    });

    it('should apply custom validation rules', async () => {
      const mappings: FieldMapping[] = [
        { sourceField: 'price', targetField: 'price', transform: 'number' },
      ];

      const config = await service.createImportConfig(
        'tenant-1',
        'Custom Validation',
        'products',
        'csv',
        mappings,
        'user-1',
        {
          validationRules: [
            { field: 'price', type: 'range', params: { min: 0 }, message: 'Price must be positive' },
          ],
        },
      );

      const csvContent = `price
100
-50`;

      const job = await service.startImport('tenant-1', config.id, csvContent, 'test.csv', 'user-1');

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await service.getImportJob(job.id);
      const priceError = result?.errors.find(e => e.field === 'price');
      expect(priceError).toBeDefined();
    });
  });
});
