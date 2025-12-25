import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ExportImportService,
  ExportFormat,
  DataType,
  ExportTemplate,
  ExportFilter,
  ImportMapping,
  SafTExportOptions,
  EFacturaExportOptions,
} from './export-import.service';

describe('ExportImportService', () => {
  let service: ExportImportService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportImportService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ExportImportService>(ExportImportService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should initialize with default templates', async () => {
      const templates = await service.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have Invoice Export template', async () => {
      const template = await service.getTemplateByName('Invoice Export');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Export Facturi');
      expect(template!.dataType).toBe('INVOICES');
      expect(template!.format).toBe('EXCEL');
    });

    it('should have Customer Export template', async () => {
      const template = await service.getTemplateByName('Customer Export');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Export Clienți');
      expect(template!.dataType).toBe('CUSTOMERS');
    });

    it('should have SAF-T D406 Export template', async () => {
      const template = await service.getTemplateByName('SAF-T D406 Export');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Export SAF-T D406');
      expect(template!.format).toBe('SAF_T');
    });

    it('should have Inventory Export template', async () => {
      const template = await service.getTemplateByName('Inventory Export');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Export Stocuri');
    });

    it('should have Payroll Export template', async () => {
      const template = await service.getTemplateByName('Payroll Export');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Export Salarizare');
    });

    it('should have Audit Log Export template', async () => {
      const template = await service.getTemplateByName('Audit Log Export');
      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Export Jurnal Audit');
    });

    it('should create custom template', async () => {
      const template = await service.createTemplate({
        name: 'Custom Export',
        nameRo: 'Export Personalizat',
        description: 'Custom export template',
        descriptionRo: 'Șablon export personalizat',
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [
          { field: 'invoiceNumber', header: 'Invoice #', headerRo: 'Nr. Factură' },
        ],
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Export');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.template.created', expect.any(Object));
    });

    it('should update template', async () => {
      const templates = await service.listTemplates();
      const templateId = templates[0].id;

      const updated = await service.updateTemplate(templateId, {
        description: 'Updated description',
      });

      expect(updated).toBeDefined();
      expect(updated!.description).toBe('Updated description');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.template.updated', expect.any(Object));
    });

    it('should delete template', async () => {
      const template = await service.createTemplate({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: 'Template to delete',
        descriptionRo: 'Șablon de șters',
        dataType: 'INVOICES',
        format: 'CSV',
        columns: [],
      });

      const deleted = await service.deleteTemplate(template.id);
      expect(deleted).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.template.deleted', expect.any(Object));

      const retrieved = await service.getTemplate(template.id);
      expect(retrieved).toBeUndefined();
    });

    it('should filter templates by data type', async () => {
      const invoiceTemplates = await service.listTemplates('INVOICES');
      expect(invoiceTemplates.every((t) => t.dataType === 'INVOICES')).toBe(true);
    });

    it('should have Romanian column headers', async () => {
      const template = await service.getTemplateByName('Invoice Export');
      const invoiceCol = template!.columns.find((c) => c.field === 'invoiceNumber');

      expect(invoiceCol!.headerRo).toBe('Număr Factură');
    });
  });

  describe('Export Operations', () => {
    it('should start export job', async () => {
      const job = await service.startExport('INVOICES', 'CSV', {}, undefined, undefined, 'user-1');

      expect(job.id).toBeDefined();
      expect(job.status).toBe('COMPLETED');
      expect(job.dataType).toBe('INVOICES');
      expect(job.format).toBe('CSV');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.started', expect.any(Object));
    });

    it('should export to CSV format', async () => {
      const job = await service.startExport('INVOICES', 'CSV');

      expect(job.status).toBe('COMPLETED');
      expect(job.fileUrl).toContain('.csv');
      expect(job.fileSize).toBeGreaterThan(0);
    });

    it('should export to JSON format', async () => {
      const job = await service.startExport('INVOICES', 'JSON');

      expect(job.status).toBe('COMPLETED');
      expect(job.fileUrl).toContain('.json');
    });

    it('should export to XML format', async () => {
      const job = await service.startExport('INVOICES', 'XML');

      expect(job.status).toBe('COMPLETED');
      expect(job.fileUrl).toContain('.xml');
    });

    it('should export to Excel format', async () => {
      const job = await service.startExport('INVOICES', 'EXCEL');

      expect(job.status).toBe('COMPLETED');
      expect(job.fileUrl).toContain('.xlsx');
    });

    it('should export to PDF format', async () => {
      const job = await service.startExport('INVOICES', 'PDF');

      expect(job.status).toBe('COMPLETED');
      expect(job.fileUrl).toContain('.pdf');
    });

    it('should export from template', async () => {
      const template = await service.getTemplateByName('Invoice Export');
      const job = await service.exportFromTemplate(template!.id);

      expect(job.status).toBe('COMPLETED');
      expect(job.templateId).toBe(template!.id);
    });

    it('should throw error for invalid template', async () => {
      await expect(service.exportFromTemplate('invalid-id')).rejects.toThrow('Template not found');
    });

    it('should apply filters to export', async () => {
      service.setMockData('INVOICES', [
        { invoiceNumber: 'INV-001', status: 'PAID', total: 1000 },
        { invoiceNumber: 'INV-002', status: 'PENDING', total: 2000 },
        { invoiceNumber: 'INV-003', status: 'PAID', total: 3000 },
      ]);

      const filters: ExportFilter[] = [{ field: 'status', operator: 'eq', value: 'PAID' }];
      const job = await service.startExport('INVOICES', 'JSON', {}, filters);

      expect(job.totalRecords).toBe(2);
    });

    it('should apply multiple filter operators', async () => {
      service.setMockData('INVOICES', [
        { invoiceNumber: 'INV-001', total: 500 },
        { invoiceNumber: 'INV-002', total: 1500 },
        { invoiceNumber: 'INV-003', total: 2500 },
      ]);

      const filters: ExportFilter[] = [{ field: 'total', operator: 'gt', value: 1000 }];
      const job = await service.startExport('INVOICES', 'JSON', {}, filters);

      expect(job.totalRecords).toBe(2);
    });

    it('should apply contains filter', async () => {
      service.setMockData('CUSTOMERS', [
        { name: 'SC Test SRL', email: 'test@example.com' },
        { name: 'SC Exemplu SA', email: 'exemplu@example.com' },
      ]);

      const filters: ExportFilter[] = [{ field: 'name', operator: 'contains', value: 'Test' }];
      const job = await service.startExport('CUSTOMERS', 'JSON', {}, filters);

      expect(job.totalRecords).toBe(1);
    });

    it('should apply in filter', async () => {
      service.setMockData('INVOICES', [
        { invoiceNumber: 'INV-001', status: 'PAID' },
        { invoiceNumber: 'INV-002', status: 'PENDING' },
        { invoiceNumber: 'INV-003', status: 'CANCELLED' },
      ]);

      const filters: ExportFilter[] = [{ field: 'status', operator: 'in', value: ['PAID', 'PENDING'] }];
      const job = await service.startExport('INVOICES', 'JSON', {}, filters);

      expect(job.totalRecords).toBe(2);
    });

    it('should apply between filter', async () => {
      service.setMockData('INVOICES', [
        { invoiceNumber: 'INV-001', total: 500 },
        { invoiceNumber: 'INV-002', total: 1500 },
        { invoiceNumber: 'INV-003', total: 2500 },
      ]);

      const filters: ExportFilter[] = [{ field: 'total', operator: 'between', value: [1000, 2000] }];
      const job = await service.startExport('INVOICES', 'JSON', {}, filters);

      expect(job.totalRecords).toBe(1);
    });

    it('should emit completed event', async () => {
      await service.startExport('INVOICES', 'CSV');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.completed', expect.objectContaining({
        jobId: expect.any(String),
        recordCount: expect.any(Number),
      }));
    });

    it('should use Romanian locale by default', async () => {
      const job = await service.startExport('INVOICES', 'CSV');
      expect(job.options.locale).toBe('ro-RO');
    });

    it('should use semicolon delimiter for CSV', async () => {
      const job = await service.startExport('INVOICES', 'CSV');
      expect(job.options.delimiter).toBe(';');
    });

    it('should include headers by default', async () => {
      const job = await service.startExport('INVOICES', 'CSV');
      expect(job.options.includeHeaders).toBe(true);
    });
  });

  describe('SAF-T D406 Export', () => {
    it('should generate SAF-T D406 XML', async () => {
      const options: SafTExportOptions = {
        fiscalYear: 2025,
        fiscalMonth: 1,
        companyTaxId: 'RO12345678',
        companyName: 'SC Test SRL',
        declarationType: 'L',
      };

      const job = await service.startExport('TAX_REPORTS', 'SAF_T', options);

      expect(job.status).toBe('COMPLETED');
      expect(job.fileUrl).toContain('D406');
      expect(job.fileUrl).toContain('2025');
    });

    it('should support corrective declaration type', async () => {
      const options: SafTExportOptions = {
        fiscalYear: 2025,
        fiscalMonth: 1,
        companyTaxId: 'RO12345678',
        companyName: 'SC Test SRL',
        declarationType: 'C',
      };

      const job = await service.startExport('TAX_REPORTS', 'SAF_T', options);
      expect(job.status).toBe('COMPLETED');
    });

    it('should support rectificative declaration', async () => {
      const options: SafTExportOptions = {
        fiscalYear: 2025,
        fiscalMonth: 1,
        companyTaxId: 'RO12345678',
        companyName: 'SC Test SRL',
        declarationType: 'R',
      };

      const job = await service.startExport('TAX_REPORTS', 'SAF_T', options);
      expect(job.status).toBe('COMPLETED');
    });
  });

  describe('e-Factura Export', () => {
    it('should generate e-Factura XML', async () => {
      service.setMockData('INVOICES', [
        {
          invoiceNumber: 'INV-2025-001',
          date: new Date('2025-01-15'),
          customerName: 'SC Client SRL',
          customerCui: 'RO87654321',
          subtotal: 1000,
          total: 1190,
          currency: 'RON',
        },
      ]);

      const options: EFacturaExportOptions = {
        invoiceIds: ['INV-2025-001'],
        sellerTaxId: 'RO12345678',
        sellerName: 'SC Vânzător SRL',
        validateAnaf: false,
      };

      const job = await service.startExport('INVOICES', 'E_FACTURA', options);

      expect(job.status).toBe('COMPLETED');
      expect(job.fileUrl).toContain('efactura');
    });

    it('should export multiple invoices', async () => {
      service.setMockData('INVOICES', [
        { invoiceNumber: 'INV-001', customerCui: 'RO111', customerName: 'Client 1', subtotal: 100, total: 119, currency: 'RON', date: new Date() },
        { invoiceNumber: 'INV-002', customerCui: 'RO222', customerName: 'Client 2', subtotal: 200, total: 238, currency: 'RON', date: new Date() },
      ]);

      const options: EFacturaExportOptions = {
        invoiceIds: ['INV-001', 'INV-002'],
        sellerTaxId: 'RO12345678',
        sellerName: 'SC Test SRL',
      };

      const job = await service.startExport('INVOICES', 'E_FACTURA', options);
      expect(job.status).toBe('COMPLETED');
    });
  });

  describe('Import Operations', () => {
    it('should start import job', async () => {
      const csvData = 'name;cui;email\nSC Test SRL;RO12345678;test@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name', required: true },
        { sourceColumn: 'cui', targetField: 'cui', required: true },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, {}, 'user-1');

      expect(job.id).toBeDefined();
      expect(['COMPLETED', 'PARTIAL', 'FAILED']).toContain(job.status);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('import.started', expect.any(Object));
    });

    it('should parse CSV with semicolon delimiter', async () => {
      // RO12345674 is a valid Romanian CUI (calculated with proper algorithm)
      const csvData = 'name;cui;email\nSC Alpha SRL;RO12345674;alpha@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(job.totalRecords).toBe(1);
      expect(job.status).toBe('COMPLETED');
    });

    it('should import JSON data', async () => {
      const jsonData = JSON.stringify([
        { name: 'SC JSON SRL', cui: 'RO12345674', email: 'json@test.ro' },
      ]);
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'JSON', jsonData, mappings);

      expect(job.totalRecords).toBe(1);
    });

    it('should import XML data', async () => {
      const xmlData = `<?xml version="1.0"?>
<export>
  <record>
    <name>SC XML SRL</name>
    <cui>RO12345674</cui>
    <email>xml@test.ro</email>
  </record>
</export>`;
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'XML', xmlData, mappings);

      expect(job.totalRecords).toBe(1);
    });

    it('should validate required fields', async () => {
      const csvData = 'name;cui;email\n;RO12345678;test@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name', required: true },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(job.errorCount).toBeGreaterThan(0);
      expect(job.errors.some((e) => e.code === 'REQUIRED_FIELD')).toBe(true);
    });

    it('should validate Romanian CUI', async () => {
      const csvData = 'name;cui;email\nSC Test SRL;RO99999999;test@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(job.errors.some((e) => e.code === 'INVALID_CUI')).toBe(true);
    });

    it('should accept valid Romanian CUI', async () => {
      // RO12345674 passes Romanian CUI check digit validation
      const csvData = 'name;cui;email\nSC Valid SRL;RO12345674;test@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(job.errors.filter((e) => e.code === 'INVALID_CUI').length).toBe(0);
    });

    it('should validate email format', async () => {
      const csvData = 'name;cui;email\nSC Test SRL;RO12345674;invalid-email';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(job.errors.some((e) => e.code === 'INVALID_EMAIL')).toBe(true);
    });

    it('should validate numeric fields', async () => {
      const csvData = 'invoiceNumber;subtotal;total\nINV-001;not-a-number;100';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'invoiceNumber', targetField: 'invoiceNumber' },
        { sourceColumn: 'subtotal', targetField: 'subtotal' },
        { sourceColumn: 'total', targetField: 'total' },
      ];

      const job = await service.startImport('INVOICES', 'CSV', csvData, mappings);

      expect(job.errors.some((e) => e.code === 'INVALID_NUMBER')).toBe(true);
    });

    it('should apply field transforms', async () => {
      const csvData = 'name;cui\nsc test srl;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name', transform: 'uppercase' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      const data = service.getMockData('CUSTOMERS');
      const imported = data.find((d) => d.cui === 'RO12345674');
      expect(imported?.name).toBe('SC TEST SRL');
    });

    it('should apply lowercase transform', async () => {
      const csvData = 'name;email\nTest;TEST@EXAMPLE.COM';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'email', targetField: 'email', transform: 'lowercase' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      const data = service.getMockData('CUSTOMERS');
      const imported = data.find((d) => d.name === 'Test');
      expect(imported?.email).toBe('test@example.com');
    });

    it('should apply number transform', async () => {
      // Use unique SKU to avoid conflict with mock data
      const csvData = 'sku;quantity\nPROD-NEW;100,5';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'sku', targetField: 'sku' },
        { sourceColumn: 'quantity', targetField: 'quantity', transform: 'number' },
      ];

      const job = await service.startImport('INVENTORY', 'CSV', csvData, mappings);

      const data = service.getMockData('INVENTORY');
      const imported = data.find((d) => d.sku === 'PROD-NEW');
      expect(imported?.quantity).toBe(100.5);
    });

    it('should apply default values', async () => {
      const csvData = 'name;cui\nSC Default SRL;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'country', targetField: 'country', defaultValue: 'România' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      const data = service.getMockData('CUSTOMERS');
      const imported = data.find((d) => d.name === 'SC Default SRL');
      expect(imported?.country).toBe('România');
    });

    it('should skip empty rows when configured', async () => {
      // RO12345674 and RO11111110 are valid CUIs
      const csvData = 'name;cui\nSC First SRL;RO12345674\n\nSC Second SRL;RO11111110';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, { skipEmptyRows: true });

      expect(job.totalRecords).toBe(2);
    });

    it('should update existing records', async () => {
      service.setMockData('CUSTOMERS', [
        { cui: 'RO12345674', name: 'Old Name', email: 'old@test.ro' },
      ]);

      const csvData = 'name;cui;email\nNew Name;RO12345674;new@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, {
        updateExisting: true,
        matchField: 'cui',
      });

      const data = service.getMockData('CUSTOMERS');
      const customer = data.find((d) => d.cui === 'RO12345674');
      expect(customer?.name).toBe('New Name');
    });

    it('should stop on error when configured', async () => {
      const csvData = 'name;cui\n;RO12345678\nSC Valid SRL;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name', required: true },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, { stopOnError: true });

      expect(job.status).toBe('FAILED');
      expect(job.processedRecords).toBe(0);
    });

    it('should validate only when configured', async () => {
      const csvData = 'name;cui\nSC Test SRL;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      const initialCount = service.getMockData('CUSTOMERS').length;

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, { validateOnly: true });

      expect(job.status).toBe('COMPLETED');
      expect(service.getMockData('CUSTOMERS').length).toBe(initialCount);
    });

    it('should return validation result', async () => {
      const csvData = 'name;cui;email\nSC Test SRL;RO12345674;test@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const result = await service.validateImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return partial status for mixed results', async () => {
      // RO12345674 is valid, RO99999999 is invalid
      const csvData = 'name;cui;email\nSC Valid SRL;RO12345674;valid@test.ro\nSC Invalid SRL;RO99999999;invalid@test.ro';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
        { sourceColumn: 'email', targetField: 'email' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(job.status).toBe('PARTIAL');
      expect(job.successCount).toBe(1);
      expect(job.errorCount).toBe(1);
    });

    it('should have Romanian error messages', async () => {
      const csvData = 'name;cui\n;RO12345678';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name', required: true },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      expect(job.errors[0].messageRo).toContain('obligatoriu');
    });
  });

  describe('Job Management', () => {
    it('should get export job by id', async () => {
      const job = await service.startExport('INVOICES', 'CSV');
      const retrieved = await service.getExportJob(job.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(job.id);
    });

    it('should get import job by id', async () => {
      const csvData = 'name;cui\nSC Test SRL;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      const job = await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);
      const retrieved = await service.getImportJob(job.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(job.id);
    });

    it('should list export jobs', async () => {
      await service.startExport('INVOICES', 'CSV', {}, undefined, undefined, 'user-1');
      await service.startExport('CUSTOMERS', 'JSON', {}, undefined, undefined, 'user-1');

      const jobs = await service.listExportJobs();

      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter export jobs by user', async () => {
      await service.startExport('INVOICES', 'CSV', {}, undefined, undefined, 'user-1');
      await service.startExport('INVOICES', 'CSV', {}, undefined, undefined, 'user-2');

      const userJobs = await service.listExportJobs('user-1');

      expect(userJobs.every((j) => j.userId === 'user-1')).toBe(true);
    });

    it('should list import jobs', async () => {
      const csvData = 'name;cui\nSC Test SRL;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, {}, 'user-1');

      const jobs = await service.listImportJobs();

      expect(jobs.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter import jobs by user', async () => {
      const csvData = 'name;cui\nSC Test SRL;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, {}, 'user-1');
      await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, {}, 'user-2');

      const userJobs = await service.listImportJobs('user-1');

      expect(userJobs.every((j) => j.userId === 'user-1')).toBe(true);
    });

    it('should cancel import job', async () => {
      // Note: In real implementation, this would work with long-running jobs
      const cancelled = await service.cancelImportJob('non-existent');
      expect(cancelled).toBe(false);
    });

    it('should cancel export job', async () => {
      const cancelled = await service.cancelExportJob('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should get export statistics', async () => {
      await service.startExport('INVOICES', 'CSV');
      await service.startExport('INVOICES', 'JSON');
      await service.startExport('CUSTOMERS', 'CSV');

      const stats = await service.getExportStatistics();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.completed).toBeGreaterThanOrEqual(3);
      expect(stats.byFormat['CSV']).toBeGreaterThanOrEqual(2);
    });

    it('should get export statistics for user', async () => {
      await service.startExport('INVOICES', 'CSV', {}, undefined, undefined, 'stat-user');

      const stats = await service.getExportStatistics('stat-user');

      expect(stats.total).toBe(1);
    });

    it('should get import statistics', async () => {
      const csvData = 'name;cui\nSC Test SRL;RO12345674';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      await service.startImport('CUSTOMERS', 'CSV', csvData, mappings);

      const stats = await service.getImportStatistics();

      expect(stats.total).toBeGreaterThanOrEqual(1);
      expect(stats.totalRecordsProcessed).toBeGreaterThanOrEqual(1);
    });

    it('should track partial imports', async () => {
      // RO12345674 is valid, RO99999999 is invalid
      const csvData = 'name;cui\nSC Valid SRL;RO12345674\nSC Invalid SRL;RO99999999';
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'cui', targetField: 'cui' },
      ];

      await service.startImport('CUSTOMERS', 'CSV', csvData, mappings, {}, 'partial-user');

      const stats = await service.getImportStatistics('partial-user');

      expect(stats.partial).toBe(1);
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian template names', async () => {
      const templates = await service.listTemplates();

      for (const template of templates) {
        expect(template.nameRo).toBeDefined();
        expect(template.nameRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian template descriptions', async () => {
      const templates = await service.listTemplates();

      for (const template of templates) {
        expect(template.descriptionRo).toBeDefined();
        expect(template.descriptionRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian column headers', async () => {
      const template = await service.getTemplateByName('Invoice Export');

      for (const column of template!.columns) {
        expect(column.headerRo).toBeDefined();
        expect(column.headerRo.length).toBeGreaterThan(0);
      }
    });

    it('should use Romanian date format DD.MM.YYYY', async () => {
      const job = await service.startExport('INVOICES', 'CSV');
      expect(job.options.dateFormat).toBe('DD.MM.YYYY');
    });

    it('should have Romanian diacritics in descriptions', async () => {
      const template = await service.getTemplateByName('Invoice Export');
      expect(template!.descriptionRo).toMatch(/[ăîâșțĂÎÂȘȚ]/);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported export format', async () => {
      const job = await service.startExport('INVOICES', 'UNSUPPORTED' as ExportFormat);

      expect(job.status).toBe('FAILED');
      expect(job.error).toContain('Unsupported format');
    });

    it('should handle unsupported import format', async () => {
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
      ];

      const job = await service.startImport('CUSTOMERS', 'EXCEL' as ExportFormat, 'data', mappings);

      expect(job.status).toBe('FAILED');
      expect(job.errors.some((e) => e.code === 'PARSE_ERROR')).toBe(true);
    });

    it('should handle malformed JSON', async () => {
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name' },
      ];

      const job = await service.startImport('CUSTOMERS', 'JSON', '{invalid json}', mappings);

      expect(job.status).toBe('FAILED');
    });

    it('should emit failed event on export error', async () => {
      await service.startExport('INVOICES', 'UNSUPPORTED' as ExportFormat);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('export.failed', expect.any(Object));
    });

    it('should emit failed event on import error', async () => {
      const mappings: ImportMapping[] = [
        { sourceColumn: 'name', targetField: 'name', required: true },
      ];

      await service.startImport('CUSTOMERS', 'CSV', 'name;cui\n;RO12345678', mappings, { stopOnError: true });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('import.failed', expect.any(Object));
    });
  });

  describe('Data Access', () => {
    it('should set mock data for testing', () => {
      const testData = [{ id: '1', name: 'Test' }];
      service.setMockData('INVOICES', testData);

      expect(service.getMockData('INVOICES')).toEqual(testData);
    });

    it('should return empty array for unknown data type', () => {
      const data = service.getMockData('UNKNOWN' as DataType);
      expect(data).toEqual([]);
    });
  });
});
