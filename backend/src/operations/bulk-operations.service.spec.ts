import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BulkOperationsService,
  EntityType,
  ExportFormat,
  FieldMapping,
} from './bulk-operations.service';

describe('BulkOperationsService', () => {
  let service: BulkOperationsService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-config'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkOperationsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BulkOperationsService>(BulkOperationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default import templates', async () => {
      const templates = await service.getImportTemplates('any-tenant');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return entity types', () => {
      const types = service.getEntityTypes();
      expect(types).toContain('invoice');
      expect(types).toContain('customer');
      expect(types).toContain('product');
      expect(types).toContain('employee');
    });

    it('should return export formats', () => {
      const formats = service.getExportFormats();
      expect(formats).toContain('csv');
      expect(formats).toContain('excel');
      expect(formats).toContain('json');
      expect(formats).toContain('pdf');
    });

    it('should return operation types', () => {
      const types = service.getOperationTypes();
      expect(types).toContain('create');
      expect(types).toContain('update');
      expect(types).toContain('delete');
      expect(types).toContain('import');
      expect(types).toContain('export');
    });

    it('should return transform types', () => {
      const types = service.getTransformTypes();
      expect(types).toContain('uppercase');
      expect(types).toContain('lowercase');
      expect(types).toContain('number');
      expect(types).toContain('date');
    });
  });

  describe('bulk create', () => {
    it('should create multiple invoices', async () => {
      const items = [
        { invoiceNumber: 'INV-001', amount: 100, customerName: 'Customer A' },
        { invoiceNumber: 'INV-002', amount: 200, customerName: 'Customer B' },
        { invoiceNumber: 'INV-003', amount: 300, customerName: 'Customer C' },
      ];

      const operation = await service.bulkCreate('tenant-1', 'user-1', 'invoice', items);

      expect(operation.id).toBeDefined();
      expect(operation.status).toBe('completed');
      expect(operation.totalItems).toBe(3);
      expect(operation.successCount).toBe(3);
      expect(operation.errorCount).toBe(0);
      expect(operation.result?.createdIds?.length).toBe(3);
    });

    it('should validate items during bulk create', async () => {
      const items = [
        { amount: 100 }, // Missing invoiceNumber
        { invoiceNumber: 'INV-002', amount: 200 },
      ];

      const operation = await service.bulkCreate('tenant-1', 'user-1', 'invoice', items);

      expect(operation.successCount).toBe(1);
      expect(operation.errorCount).toBe(1);
      expect(operation.errors.length).toBe(1);
      expect(operation.errors[0].code).toBe('VALIDATION_ERROR');
    });

    it('should stop on error when option is set', async () => {
      const items = [
        { amount: 100 }, // Invalid
        { invoiceNumber: 'INV-002', amount: 200 }, // Valid but won't be processed
      ];

      const operation = await service.bulkCreate('tenant-1', 'user-1', 'invoice', items, {
        stopOnError: true,
      });

      expect(operation.status).toBe('failed');
      expect(operation.processedItems).toBe(1);
    });

    it('should skip validation when option is set', async () => {
      const items = [
        { amount: 100 }, // Would normally fail validation
      ];

      const operation = await service.bulkCreate('tenant-1', 'user-1', 'invoice', items, {
        skipValidation: true,
      });

      expect(operation.successCount).toBe(1);
      expect(operation.errorCount).toBe(0);
    });

    it('should support dry run', async () => {
      const items = [
        { invoiceNumber: 'DRY-001', amount: 100 },
      ];

      const operation = await service.bulkCreate('tenant-dry', 'user-1', 'invoice', items, {
        dryRun: true,
      });

      expect(operation.successCount).toBe(1);
      expect(operation.result?.createdIds?.length).toBe(0);
    });

    it('should create customers', async () => {
      const items = [
        { name: 'Customer A', email: 'a@example.com' },
        { name: 'Customer B', email: 'b@example.com' },
      ];

      const operation = await service.bulkCreate('tenant-1', 'user-1', 'customer', items);

      expect(operation.status).toBe('completed');
      expect(operation.successCount).toBe(2);
    });

    it('should validate customer name', async () => {
      const items = [
        { email: 'a@example.com' }, // Missing name
      ];

      const operation = await service.bulkCreate('tenant-1', 'user-1', 'customer', items);

      expect(operation.errorCount).toBe(1);
      expect(operation.errors[0].field).toBe('name');
    });
  });

  describe('bulk update', () => {
    it('should update multiple entities', async () => {
      // First create some entities
      const createOp = await service.bulkCreate('tenant-update', 'user-1', 'invoice', [
        { invoiceNumber: 'UPD-001', amount: 100 },
        { invoiceNumber: 'UPD-002', amount: 200 },
      ]);

      const ids = createOp.result?.createdIds || [];
      const updates = ids.map((id, i) => ({
        id,
        data: { invoiceNumber: `UPD-00${i + 1}`, amount: (i + 1) * 1000 },
      }));

      const updateOp = await service.bulkUpdate('tenant-update', 'user-1', 'invoice', updates, {
        skipValidation: true,
      });

      expect(updateOp.status).toBe('completed');
      expect(updateOp.successCount).toBe(2);
    });

    it('should handle non-existent entities', async () => {
      const updates = [
        { id: 'non-existent-id', data: { amount: 500 } },
      ];

      const operation = await service.bulkUpdate('tenant-1', 'user-1', 'invoice', updates);

      expect(operation.errorCount).toBe(1);
      expect(operation.errors[0].code).toBe('NOT_FOUND');
    });
  });

  describe('bulk delete', () => {
    it('should delete multiple entities', async () => {
      // First create some entities
      const createOp = await service.bulkCreate('tenant-delete', 'user-1', 'invoice', [
        { invoiceNumber: 'DEL-001', amount: 100 },
        { invoiceNumber: 'DEL-002', amount: 200 },
      ]);

      const ids = createOp.result?.createdIds || [];
      const deleteOp = await service.bulkDelete('tenant-delete', 'user-1', 'invoice', ids);

      expect(deleteOp.status).toBe('completed');
      expect(deleteOp.successCount).toBe(2);
      expect(deleteOp.result?.deletedIds?.length).toBe(2);
    });

    it('should handle non-existent entities on delete', async () => {
      const ids = ['non-existent-1', 'non-existent-2'];
      const operation = await service.bulkDelete('tenant-1', 'user-1', 'invoice', ids);

      expect(operation.errorCount).toBe(2);
    });
  });

  describe('import data', () => {
    it('should import JSON data', async () => {
      const data = JSON.stringify([
        { invoiceNumber: 'IMP-001', amount: 100 },
        { invoiceNumber: 'IMP-002', amount: 200 },
      ]);

      const operation = await service.importData('tenant-import', 'user-1', 'invoice', data, 'json');

      expect(operation.status).toBe('completed');
      expect(operation.successCount).toBe(2);
    });

    it('should import CSV data with headers', async () => {
      const data = `invoiceNumber,amount,customerName
CSV-001,100,Customer A
CSV-002,200,Customer B`;

      const operation = await service.importData('tenant-csv', 'user-1', 'invoice', data, 'csv', {
        includeHeaders: true,
      });

      expect(operation.status).toBe('completed');
      expect(operation.successCount).toBe(2);
    });

    it('should apply field mapping during import', async () => {
      const data = JSON.stringify([
        { inv_num: 'MAP-001', total: 100 },
      ]);

      const mapping: FieldMapping[] = [
        { sourceField: 'inv_num', targetField: 'invoiceNumber' },
        { sourceField: 'total', targetField: 'amount', transform: 'number' },
      ];

      const operation = await service.importData('tenant-map', 'user-1', 'invoice', data, 'json', {
        mapping,
      });

      expect(operation.status).toBe('completed');
      expect(operation.successCount).toBe(1);
    });

    it('should handle empty import data', async () => {
      const operation = await service.importData('tenant-empty', 'user-1', 'invoice', '[]', 'json');

      expect(operation.status).toBe('completed');
      expect(operation.totalItems).toBe(0);
    });

    it('should handle invalid JSON', async () => {
      const operation = await service.importData('tenant-1', 'user-1', 'invoice', 'not valid json', 'json');

      expect(operation.totalItems).toBe(0);
    });
  });

  describe('export data', () => {
    beforeEach(async () => {
      // Create some test data
      await service.bulkCreate('tenant-export', 'user-1', 'invoice', [
        { invoiceNumber: 'EXP-001', amount: 100, status: 'paid' },
        { invoiceNumber: 'EXP-002', amount: 200, status: 'pending' },
        { invoiceNumber: 'EXP-003', amount: 300, status: 'paid' },
      ]);
    });

    it('should export to JSON', async () => {
      const operation = await service.exportData('tenant-export', 'user-1', 'invoice', 'json');

      expect(operation.status).toBe('completed');
      expect(operation.result?.exportFilename).toContain('.json');
      expect(operation.result?.exportData).toBeDefined();

      const parsed = JSON.parse(operation.result!.exportData!);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export to CSV', async () => {
      const operation = await service.exportData('tenant-export', 'user-1', 'invoice', 'csv');

      expect(operation.status).toBe('completed');
      expect(operation.result?.exportFilename).toContain('.csv');
      expect(operation.result?.exportData).toContain(',');
    });

    it('should export to Excel (placeholder)', async () => {
      const operation = await service.exportData('tenant-export', 'user-1', 'invoice', 'excel');

      expect(operation.status).toBe('completed');
      expect(operation.result?.exportFilename).toContain('.xlsx');
    });

    it('should export to PDF (placeholder)', async () => {
      const operation = await service.exportData('tenant-export', 'user-1', 'invoice', 'pdf');

      expect(operation.status).toBe('completed');
      expect(operation.result?.exportFilename).toContain('.pdf');
    });

    it('should filter exported data', async () => {
      const operation = await service.exportData('tenant-export', 'user-1', 'invoice', 'json', {
        filters: { status: 'paid' },
      });

      expect(operation.status).toBe('completed');
      const parsed = JSON.parse(operation.result!.exportData!);
      expect(parsed.every((item: any) => item.status === 'paid')).toBe(true);
    });

    it('should export empty dataset', async () => {
      const operation = await service.exportData('tenant-empty-export', 'user-1', 'invoice', 'csv');

      expect(operation.status).toBe('completed');
      expect(operation.totalItems).toBe(0);
    });
  });

  describe('operations management', () => {
    it('should get operation by ID', async () => {
      const createOp = await service.bulkCreate('tenant-1', 'user-1', 'invoice', [
        { invoiceNumber: 'GET-001', amount: 100 },
      ]);

      const retrieved = await service.getOperation(createOp.id);

      expect(retrieved?.id).toBe(createOp.id);
    });

    it('should return null for non-existent operation', async () => {
      const result = await service.getOperation('non-existent');
      expect(result).toBeNull();
    });

    it('should get operations with filters', async () => {
      await service.bulkCreate('tenant-ops', 'user-1', 'invoice', [{ invoiceNumber: 'A', amount: 1 }]);
      await service.bulkCreate('tenant-ops', 'user-2', 'customer', [{ name: 'C' }]);
      await service.exportData('tenant-ops', 'user-1', 'invoice', 'json');

      const createOps = await service.getOperations('tenant-ops', { type: 'create' });
      expect(createOps.length).toBe(2);

      const user1Ops = await service.getOperations('tenant-ops', { userId: 'user-1' });
      expect(user1Ops.length).toBe(2);

      const invoiceOps = await service.getOperations('tenant-ops', { entityType: 'invoice' });
      expect(invoiceOps.length).toBe(2);
    });

    it('should cancel pending operation', async () => {
      // Create an operation
      const op = await service.bulkCreate('tenant-cancel', 'user-1', 'invoice', [
        { invoiceNumber: 'CAN-001', amount: 100 },
      ]);

      // Since it completes immediately, cancellation returns completed status
      const cancelled = await service.cancelOperation(op.id);
      expect(cancelled).toBeDefined();
    });

    it('should return null when cancelling non-existent operation', async () => {
      const result = await service.cancelOperation('non-existent');
      expect(result).toBeNull();
    });

    it('should get operation progress', async () => {
      const op = await service.bulkCreate('tenant-prog', 'user-1', 'invoice', [
        { invoiceNumber: 'PRG-001', amount: 100 },
        { invoiceNumber: 'PRG-002', amount: 200 },
      ]);

      const progress = await service.getOperationProgress(op.id);

      expect(progress).toBeDefined();
      expect(progress?.progress).toBe(100);
      expect(progress?.processedItems).toBe(2);
      expect(progress?.totalItems).toBe(2);
    });

    it('should return null for progress of non-existent operation', async () => {
      const result = await service.getOperationProgress('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('import templates', () => {
    it('should create import template', async () => {
      const template = await service.createImportTemplate(
        'tenant-tpl',
        'Custom Invoice Import',
        'invoice',
        {
          entityType: 'invoice',
          mapping: [
            { sourceField: 'num', targetField: 'invoiceNumber', required: true },
          ],
          validation: [],
        },
      );

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Invoice Import');
    });

    it('should get import template by ID', async () => {
      const created = await service.createImportTemplate(
        'tenant-get',
        'Get Template',
        'customer',
        { entityType: 'customer', mapping: [], validation: [] },
      );

      const retrieved = await service.getImportTemplate(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent template', async () => {
      const result = await service.getImportTemplate('non-existent');
      expect(result).toBeNull();
    });

    it('should delete import template', async () => {
      const template = await service.createImportTemplate(
        'tenant-del',
        'Delete Me',
        'product',
        { entityType: 'product', mapping: [], validation: [] },
      );

      const success = await service.deleteImportTemplate(template.id);
      expect(success).toBe(true);

      const retrieved = await service.getImportTemplate(template.id);
      expect(retrieved).toBeNull();
    });

    it('should not delete default templates', async () => {
      const success = await service.deleteImportTemplate('import-template-invoice');
      expect(success).toBe(false);
    });
  });

  describe('export templates', () => {
    it('should create export template', async () => {
      const template = await service.createExportTemplate(
        'tenant-exp-tpl',
        'Invoice Export',
        'invoice',
        {
          entityType: 'invoice',
          format: 'csv',
          columns: [
            { field: 'invoiceNumber', header: 'Invoice #' },
            { field: 'amount', header: 'Amount' },
          ],
        },
      );

      expect(template.id).toBeDefined();
      expect(template.config.format).toBe('csv');
    });

    it('should get export template by ID', async () => {
      const created = await service.createExportTemplate(
        'tenant-get-exp',
        'Get Export',
        'customer',
        { entityType: 'customer', format: 'json', columns: [] },
      );

      const retrieved = await service.getExportTemplate(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent export template', async () => {
      const result = await service.getExportTemplate('non-existent');
      expect(result).toBeNull();
    });

    it('should get export templates by entity type', async () => {
      await service.createExportTemplate('tenant-filter', 'Exp 1', 'invoice', { entityType: 'invoice', format: 'csv', columns: [] });
      await service.createExportTemplate('tenant-filter', 'Exp 2', 'customer', { entityType: 'customer', format: 'json', columns: [] });

      const invoiceTemplates = await service.getExportTemplates('tenant-filter', 'invoice');
      expect(invoiceTemplates.every(t => t.entityType === 'invoice')).toBe(true);
    });

    it('should delete export template', async () => {
      const template = await service.createExportTemplate(
        'tenant-del-exp',
        'Delete Export',
        'product',
        { entityType: 'product', format: 'pdf', columns: [] },
      );

      const success = await service.deleteExportTemplate(template.id);
      expect(success).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should get operation stats', async () => {
      await service.bulkCreate('tenant-stats', 'user-1', 'invoice', [
        { invoiceNumber: 'ST-001', amount: 100 },
      ]);
      await service.bulkCreate('tenant-stats', 'user-1', 'customer', [
        { name: 'Customer' },
      ]);
      await service.exportData('tenant-stats', 'user-1', 'invoice', 'json');

      const stats = await service.getOperationStats('tenant-stats');

      expect(stats.totalOperations).toBeGreaterThanOrEqual(3);
      expect(stats.operationsByType.length).toBeGreaterThan(0);
      expect(stats.operationsByStatus.length).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('CSV parsing', () => {
    it('should parse CSV with quoted values', async () => {
      const data = `name,description,amount
"John Doe","A description, with comma",100
"Jane ""Quoted"" Smith","Another desc",200`;

      const operation = await service.importData('tenant-quoted', 'user-1', 'customer', data, 'csv', {
        includeHeaders: true,
        skipValidation: true,
      });

      expect(operation.successCount).toBe(2);
    });
  });

  describe('field transformations', () => {
    it('should transform to uppercase', async () => {
      const data = JSON.stringify([{ name: 'john doe' }]);
      const mapping: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', transform: 'uppercase' },
      ];

      const operation = await service.importData('tenant-transform', 'user-1', 'customer', data, 'json', {
        mapping,
        skipValidation: true,
      });

      expect(operation.successCount).toBe(1);
    });

    it('should transform to lowercase', async () => {
      const data = JSON.stringify([{ name: 'JOHN DOE' }]);
      const mapping: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', transform: 'lowercase' },
      ];

      const operation = await service.importData('tenant-lower', 'user-1', 'customer', data, 'json', {
        mapping,
        skipValidation: true,
      });

      expect(operation.successCount).toBe(1);
    });

    it('should transform to number', async () => {
      const data = JSON.stringify([{ invoiceNumber: 'NUM-001', amount: '$1,234.56' }]);
      const mapping: FieldMapping[] = [
        { sourceField: 'invoiceNumber', targetField: 'invoiceNumber' },
        { sourceField: 'amount', targetField: 'amount', transform: 'number' },
      ];

      const operation = await service.importData('tenant-num', 'user-1', 'invoice', data, 'json', {
        mapping,
      });

      expect(operation.successCount).toBe(1);
    });

    it('should apply default values', async () => {
      const data = JSON.stringify([{ invoiceNumber: 'DEF-001' }]);
      const mapping: FieldMapping[] = [
        { sourceField: 'invoiceNumber', targetField: 'invoiceNumber' },
        { sourceField: 'amount', targetField: 'amount', defaultValue: 0 },
      ];

      const operation = await service.importData('tenant-default', 'user-1', 'invoice', data, 'json', {
        mapping,
      });

      expect(operation.successCount).toBe(1);
    });
  });
});
