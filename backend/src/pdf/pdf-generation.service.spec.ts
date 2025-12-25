import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PdfGenerationService,
  GeneratedPdf,
  PdfTemplate,
  PdfTemplateType,
} from './pdf-generation.service';

describe('PdfGenerationService', () => {
  let service: PdfGenerationService;
  let eventEmitter: EventEmitter2;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfGenerationService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PdfGenerationService>(PdfGenerationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default templates initialized', async () => {
      const templates = await service.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have invoice template', async () => {
      const template = await service.getTemplateByName('Standard Invoice');
      expect(template).toBeDefined();
      expect(template!.type).toBe('INVOICE');
    });

    it('should have contract template', async () => {
      const template = await service.getTemplateByName('Employment Contract');
      expect(template).toBeDefined();
      expect(template!.type).toBe('CONTRACT');
    });

    it('should have ANAF declaration template', async () => {
      const template = await service.getTemplateByName('ANAF Declaration Receipt');
      expect(template).toBeDefined();
      expect(template!.type).toBe('ANAF_DECLARATION');
    });

    it('should have report template', async () => {
      const template = await service.getTemplateByName('Monthly Report');
      expect(template).toBeDefined();
      expect(template!.type).toBe('REPORT');
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF from HTML', async () => {
      const pdf = await service.generatePdf(
        '<h1>Test PDF</h1><p>Content here</p>',
        {},
        { name: 'Test PDF' },
      );

      expect(pdf.id).toBeDefined();
      expect(pdf.status).toBe('COMPLETED');
      expect(pdf.content).toBeDefined();
      expect(pdf.size).toBeGreaterThan(0);
    });

    it('should generate PDF with custom page size', async () => {
      const pdf = await service.generatePdf(
        '<h1>A3 PDF</h1>',
        { pageSize: 'A3' },
      );

      expect(pdf.options.pageSize).toBe('A3');
    });

    it('should generate PDF in landscape', async () => {
      const pdf = await service.generatePdf(
        '<h1>Landscape</h1>',
        { orientation: 'LANDSCAPE' },
      );

      expect(pdf.options.orientation).toBe('LANDSCAPE');
    });

    it('should generate PDF with custom margins', async () => {
      const pdf = await service.generatePdf(
        '<h1>Custom Margins</h1>',
        { margins: { top: 30, right: 25, bottom: 30, left: 25 } },
      );

      expect(pdf.options.margins?.top).toBe(30);
    });

    it('should generate PDF with compression', async () => {
      const pdf = await service.generatePdf(
        '<h1>Compressed</h1>',
        { compression: true },
      );

      expect(pdf.options.compression).toBe(true);
    });

    it('should generate PDF with encryption', async () => {
      const pdf = await service.generatePdf(
        '<h1>Encrypted</h1>',
        { encrypt: true, password: 'secret123' },
      );

      expect(pdf.options.encrypt).toBe(true);
    });

    it('should generate PDF with watermark', async () => {
      const pdf = await service.generatePdf(
        '<h1>Watermarked</h1>',
        { watermark: { text: 'DRAFT', opacity: 0.3 } },
      );

      expect(pdf.options.watermark?.text).toBe('DRAFT');
    });

    it('should set organization and user ID', async () => {
      const pdf = await service.generatePdf(
        '<h1>Org PDF</h1>',
        {},
        { organizationId: mockOrgId, userId: mockUserId },
      );

      expect(pdf.organizationId).toBe(mockOrgId);
      expect(pdf.userId).toBe(mockUserId);
    });

    it('should emit pdf.generated event', async () => {
      await service.generatePdf('<h1>Event Test</h1>');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.generated',
        expect.objectContaining({ pageCount: expect.any(Number) }),
      );
    });

    it('should handle generation failure', async () => {
      const pdf = await service.generatePdf('<h1>SIMULATE_FAILURE</h1>');

      expect(pdf.status).toBe('FAILED');
      expect(pdf.error).toBeDefined();
    });

    it('should emit pdf.failed event on error', async () => {
      await service.generatePdf('<h1>SIMULATE_FAILURE</h1>');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.failed',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });

    it('should set PDF type', async () => {
      const pdf = await service.generatePdf(
        '<h1>Invoice</h1>',
        {},
        { type: 'INVOICE' },
      );

      expect(pdf.type).toBe('INVOICE');
    });
  });

  describe('Template-based Generation', () => {
    it('should generate PDF from template', async () => {
      const templates = await service.getAllTemplates();
      const invoiceTemplate = templates.find((t) => t.type === 'INVOICE');

      const pdf = await service.generateFromTemplate(invoiceTemplate!.id, {
        invoiceNumber: 'INV-001',
        issueDate: '2025-01-15',
        dueDate: '2025-02-15',
        sellerName: 'Test Company',
        sellerCUI: 'RO12345678',
        sellerAddress: 'Bucharest, Romania',
        buyerName: 'Client Company',
        buyerCUI: 'RO87654321',
        buyerAddress: 'Cluj, Romania',
        items: [{ description: 'Service', quantity: 1, price: 1000, vat: 19, total: 1190 }],
        subtotal: 1000,
        vatAmount: 190,
        total: 1190,
      });

      expect(pdf.status).toBe('COMPLETED');
      expect(pdf.templateId).toBe(invoiceTemplate!.id);
      expect(pdf.type).toBe('INVOICE');
    });

    it('should generate PDF from template by name', async () => {
      const pdf = await service.generateFromTemplate('Standard Invoice', {
        invoiceNumber: 'INV-002',
        issueDate: '2025-01-15',
        dueDate: '2025-02-15',
        sellerName: 'Test',
        sellerCUI: 'RO123',
        sellerAddress: 'Address',
        buyerName: 'Buyer',
        buyerCUI: 'RO456',
        buyerAddress: 'Addr',
        items: [],
        subtotal: 100,
        vatAmount: 19,
        total: 119,
      });

      expect(pdf.type).toBe('INVOICE');
    });

    it('should throw error for missing template', async () => {
      await expect(
        service.generateFromTemplate('NonExistent', {}),
      ).rejects.toThrow('Template not found');
    });

    it('should throw error for missing required variable', async () => {
      await expect(
        service.generateFromTemplate('Standard Invoice', {}),
      ).rejects.toThrow('Missing required variable');
    });

    it('should use default values for optional variables', async () => {
      const pdf = await service.generateFromTemplate('Standard Invoice', {
        invoiceNumber: 'INV-003',
        issueDate: '2025-01-15',
        dueDate: '2025-02-15',
        sellerName: 'Test',
        sellerCUI: 'RO123',
        sellerAddress: 'Address',
        buyerName: 'Buyer',
        buyerCUI: 'RO456',
        buyerAddress: 'Addr',
        items: [],
        subtotal: 100,
        vatAmount: 19,
        total: 119,
        // currency and vatRate should use defaults
      });

      expect(pdf.status).toBe('COMPLETED');
    });

    it('should throw error for inactive template', async () => {
      const templates = await service.getAllTemplates();
      await service.deactivateTemplate(templates[0].id);

      await expect(
        service.generateFromTemplate(templates[0].id, {}),
      ).rejects.toThrow('Template is not active');
    });

    it('should render Romanian template', async () => {
      const pdf = await service.generateFromTemplate(
        'Standard Invoice',
        {
          invoiceNumber: 'FACT-001',
          issueDate: '2025-01-15',
          dueDate: '2025-02-15',
          sellerName: 'SC Test SRL',
          sellerCUI: 'RO12345678',
          sellerAddress: 'București',
          buyerName: 'SC Client SRL',
          buyerCUI: 'RO87654321',
          buyerAddress: 'Cluj',
          items: [],
          subtotal: 1000,
          vatAmount: 190,
          total: 1190,
        },
        { language: 'ro' },
      );

      expect(pdf.status).toBe('COMPLETED');
    });

    it('should render English template', async () => {
      const pdf = await service.generateFromTemplate(
        'Standard Invoice',
        {
          invoiceNumber: 'INV-001',
          issueDate: '2025-01-15',
          dueDate: '2025-02-15',
          sellerName: 'Test Company',
          sellerCUI: 'RO12345678',
          sellerAddress: 'Bucharest',
          buyerName: 'Client Company',
          buyerCUI: 'RO87654321',
          buyerAddress: 'Cluj',
          items: [],
          subtotal: 1000,
          vatAmount: 190,
          total: 1190,
        },
        { language: 'en' },
      );

      expect(pdf.status).toBe('COMPLETED');
    });
  });

  describe('Batch Generation', () => {
    it('should generate batch of PDFs', async () => {
      const templates = await service.getAllTemplates();
      const invoiceTemplate = templates.find((t) => t.type === 'INVOICE')!;

      const batch = await service.generateBatch(
        [
          {
            templateId: invoiceTemplate.id,
            data: {
              invoiceNumber: 'INV-B1',
              issueDate: '2025-01-15',
              dueDate: '2025-02-15',
              sellerName: 'Test',
              sellerCUI: 'RO1',
              sellerAddress: 'Addr',
              buyerName: 'Buyer',
              buyerCUI: 'RO2',
              buyerAddress: 'Addr',
              items: [],
              subtotal: 100,
              vatAmount: 19,
              total: 119,
            },
          },
          {
            templateId: invoiceTemplate.id,
            data: {
              invoiceNumber: 'INV-B2',
              issueDate: '2025-01-16',
              dueDate: '2025-02-16',
              sellerName: 'Test',
              sellerCUI: 'RO1',
              sellerAddress: 'Addr',
              buyerName: 'Buyer',
              buyerCUI: 'RO2',
              buyerAddress: 'Addr',
              items: [],
              subtotal: 200,
              vatAmount: 38,
              total: 238,
            },
          },
        ],
        'January Invoices',
        'Facturi Ianuarie',
      );

      expect(batch.totalCount).toBe(2);
      expect(batch.completedCount).toBe(2);
      expect(batch.status).toBe('COMPLETED');
    });

    it('should handle partial batch failure', async () => {
      const batch = await service.generateBatch(
        [
          {
            templateId: 'non-existent',
            data: {},
          },
        ],
        'Fail Batch',
      );

      expect(batch.failedCount).toBe(1);
      expect(batch.errors.length).toBeGreaterThan(0);
    });

    it('should emit batch completed event', async () => {
      const templates = await service.getAllTemplates();
      const template = templates[0];

      await service.generateBatch(
        [
          {
            templateId: template.id,
            data: { invoiceNumber: 'X', issueDate: 'X', dueDate: 'X', sellerName: 'X', sellerCUI: 'X', sellerAddress: 'X', buyerName: 'X', buyerCUI: 'X', buyerAddress: 'X', items: [], subtotal: 1, vatAmount: 0, total: 1 },
          },
        ],
        'Event Batch',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.batch.completed',
        expect.objectContaining({ totalCount: 1 }),
      );
    });

    it('should get batch by ID', async () => {
      const templates = await service.getAllTemplates();
      const template = templates[0];

      const created = await service.generateBatch(
        [
          {
            templateId: template.id,
            data: { invoiceNumber: 'X', issueDate: 'X', dueDate: 'X', sellerName: 'X', sellerCUI: 'X', sellerAddress: 'X', buyerName: 'X', buyerCUI: 'X', buyerAddress: 'X', items: [], subtotal: 1, vatAmount: 0, total: 1 },
          },
        ],
        'Get Batch',
      );

      const retrieved = await service.getBatch(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });
  });

  describe('PDF Retrieval', () => {
    let testPdf: GeneratedPdf;

    beforeEach(async () => {
      testPdf = await service.generatePdf(
        '<h1>Retrieval Test</h1>',
        {},
        { organizationId: mockOrgId, userId: mockUserId },
      );
    });

    it('should get PDF by ID', async () => {
      const pdf = await service.getPdf(testPdf.id);

      expect(pdf).toBeDefined();
      expect(pdf!.id).toBe(testPdf.id);
    });

    it('should get PDF content', async () => {
      const content = await service.getPdfContent(testPdf.id);

      expect(content).toBeDefined();
      expect(content).toBeInstanceOf(Buffer);
    });

    it('should return undefined for non-existent PDF', async () => {
      const pdf = await service.getPdf('non-existent');

      expect(pdf).toBeUndefined();
    });

    it('should get PDFs by organization', async () => {
      const pdfs = await service.getPdfsByOrganization(mockOrgId);

      expect(pdfs.length).toBeGreaterThan(0);
      expect(pdfs.every((p) => p.organizationId === mockOrgId)).toBe(true);
    });

    it('should get PDFs by user', async () => {
      const pdfs = await service.getPdfsByUser(mockUserId);

      expect(pdfs.length).toBeGreaterThan(0);
      expect(pdfs.every((p) => p.userId === mockUserId)).toBe(true);
    });

    it('should get PDFs by type', async () => {
      await service.generatePdf('<h1>Invoice</h1>', {}, { type: 'INVOICE' });
      const pdfs = await service.getPdfsByType('INVOICE');

      expect(pdfs.length).toBeGreaterThan(0);
      expect(pdfs.every((p) => p.type === 'INVOICE')).toBe(true);
    });

    it('should get PDFs by status', async () => {
      const pdfs = await service.getPdfsByStatus('COMPLETED');

      expect(pdfs.length).toBeGreaterThan(0);
      expect(pdfs.every((p) => p.status === 'COMPLETED')).toBe(true);
    });

    it('should limit results', async () => {
      await service.generatePdf('<h1>P1</h1>', {}, { organizationId: mockOrgId });
      await service.generatePdf('<h1>P2</h1>', {}, { organizationId: mockOrgId });

      const pdfs = await service.getPdfsByOrganization(mockOrgId, 1);

      expect(pdfs.length).toBe(1);
    });
  });

  describe('PDF Operations', () => {
    it('should delete PDF', async () => {
      const pdf = await service.generatePdf('<h1>To Delete</h1>');

      await service.deletePdf(pdf.id);

      expect(await service.getPdf(pdf.id)).toBeUndefined();
    });

    it('should emit pdf.deleted event', async () => {
      const pdf = await service.generatePdf('<h1>Delete Event</h1>');

      await service.deletePdf(pdf.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.deleted',
        expect.objectContaining({ pdfId: pdf.id }),
      );
    });

    it('should throw error when deleting non-existent PDF', async () => {
      await expect(service.deletePdf('non-existent')).rejects.toThrow('PDF not found');
    });

    it('should merge PDFs', async () => {
      const pdf1 = await service.generatePdf('<h1>Part 1</h1>');
      const pdf2 = await service.generatePdf('<h1>Part 2</h1>');

      const merged = await service.mergePdfs([pdf1.id, pdf2.id], 'Merged Document');

      expect(merged.status).toBe('COMPLETED');
      expect(merged.pageCount).toBe((pdf1.pageCount || 0) + (pdf2.pageCount || 0));
      expect(merged.data.mergedFrom).toEqual([pdf1.id, pdf2.id]);
    });

    it('should emit pdf.merged event', async () => {
      const pdf1 = await service.generatePdf('<h1>M1</h1>');
      const pdf2 = await service.generatePdf('<h1>M2</h1>');

      await service.mergePdfs([pdf1.id, pdf2.id], 'Merge Event');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.merged',
        expect.objectContaining({ sourceIds: [pdf1.id, pdf2.id] }),
      );
    });

    it('should throw error when merging non-existent PDF', async () => {
      const pdf = await service.generatePdf('<h1>Exists</h1>');

      await expect(
        service.mergePdfs([pdf.id, 'non-existent'], 'Fail Merge'),
      ).rejects.toThrow('PDF not found');
    });

    it('should throw error when merging incomplete PDF', async () => {
      const pdf1 = await service.generatePdf('<h1>OK</h1>');
      const pdf2 = await service.generatePdf('<h1>SIMULATE_FAILURE</h1>');

      await expect(
        service.mergePdfs([pdf1.id, pdf2.id], 'Fail Merge'),
      ).rejects.toThrow('PDF not ready for merge');
    });

    it('should split PDF', async () => {
      // Generate a multi-page PDF
      const longContent = '<h1>Long</h1>' + '<p>Content</p>'.repeat(100);
      const pdf = await service.generatePdf(longContent);

      const splits = await service.splitPdf(pdf.id, [
        { start: 1, end: 1 },
        { start: 2, end: 3 },
      ]);

      expect(splits.length).toBe(2);
      expect(splits[0].pageCount).toBe(1);
      expect(splits[1].pageCount).toBe(2);
    });

    it('should emit pdf.split event', async () => {
      const pdf = await service.generatePdf('<h1>Split Me</h1>');

      await service.splitPdf(pdf.id, [{ start: 1, end: 1 }]);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.split',
        expect.objectContaining({ sourcePdfId: pdf.id }),
      );
    });

    it('should throw error when splitting non-existent PDF', async () => {
      await expect(
        service.splitPdf('non-existent', [{ start: 1, end: 1 }]),
      ).rejects.toThrow('PDF not found');
    });
  });

  describe('Caching', () => {
    it('should cache PDF', async () => {
      const pdf = await service.generatePdf('<h1>Cache Me</h1>');

      await service.cachePdf(pdf, 'cache-key-1');

      const cached = await service.getCachedPdf('cache-key-1');
      expect(cached).toBeDefined();
      expect(cached!.id).toBe(pdf.id);
      expect(cached!.status).toBe('CACHED');
    });

    it('should return undefined for non-existent cache key', async () => {
      const cached = await service.getCachedPdf('non-existent-key');

      expect(cached).toBeUndefined();
    });

    it('should expire cached PDF', async () => {
      const pdf = await service.generatePdf('<h1>Expire Me</h1>');

      await service.cachePdf(pdf, 'expire-key', 1); // 1ms TTL

      await new Promise((resolve) => setTimeout(resolve, 10));

      const cached = await service.getCachedPdf('expire-key');
      expect(cached).toBeUndefined();
    });

    it('should clear cache', async () => {
      const pdf = await service.generatePdf('<h1>Clear Me</h1>');

      await service.cachePdf(pdf, 'clear-key');
      service.clearCache();

      const cached = await service.getCachedPdf('clear-key');
      expect(cached).toBeUndefined();
    });
  });

  describe('Template Management', () => {
    it('should create template', async () => {
      const template = await service.createTemplate({
        name: 'Custom Template',
        nameRo: 'Șablon Personalizat',
        description: 'A custom template',
        descriptionRo: 'Un șablon personalizat',
        type: 'CUSTOM',
        htmlContent: '<h1>{{title}}</h1>',
        htmlContentRo: '<h1>{{title}}</h1>',
        cssStyles: 'h1 { color: blue; }',
        variables: [
          { name: 'title', description: 'Title', descriptionRo: 'Titlu', type: 'STRING', required: true },
        ],
        defaultOptions: {},
        isActive: true,
        version: 1,
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Template');
    });

    it('should emit template.created event', async () => {
      await service.createTemplate({
        name: 'Event Template',
        nameRo: 'Șablon Eveniment',
        description: '',
        descriptionRo: '',
        type: 'CUSTOM',
        htmlContent: '',
        htmlContentRo: '',
        cssStyles: '',
        variables: [],
        defaultOptions: {},
        isActive: true,
        version: 1,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.template.created',
        expect.objectContaining({ name: 'Event Template' }),
      );
    });

    it('should update template', async () => {
      const templates = await service.getAllTemplates();
      const updated = await service.updateTemplate(templates[0].id, {
        name: 'Updated Template',
      });

      expect(updated.name).toBe('Updated Template');
      expect(updated.version).toBe(2);
    });

    it('should emit template.updated event', async () => {
      const templates = await service.getAllTemplates();
      await service.updateTemplate(templates[0].id, { name: 'Updated' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.template.updated',
        expect.objectContaining({ templateId: templates[0].id }),
      );
    });

    it('should throw error when updating non-existent template', async () => {
      await expect(
        service.updateTemplate('non-existent', { name: 'Fail' }),
      ).rejects.toThrow('Template not found');
    });

    it('should delete template', async () => {
      const template = await service.createTemplate({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: '',
        descriptionRo: '',
        type: 'CUSTOM',
        htmlContent: '',
        htmlContentRo: '',
        cssStyles: '',
        variables: [],
        defaultOptions: {},
        isActive: true,
        version: 1,
      });

      await service.deleteTemplate(template.id);

      expect(await service.getTemplate(template.id)).toBeUndefined();
    });

    it('should emit template.deleted event', async () => {
      const template = await service.createTemplate({
        name: 'Delete Event',
        nameRo: 'Eveniment Ștergere',
        description: '',
        descriptionRo: '',
        type: 'CUSTOM',
        htmlContent: '',
        htmlContentRo: '',
        cssStyles: '',
        variables: [],
        defaultOptions: {},
        isActive: true,
        version: 1,
      });

      await service.deleteTemplate(template.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pdf.template.deleted',
        expect.objectContaining({ templateId: template.id }),
      );
    });

    it('should throw error when deleting non-existent template', async () => {
      await expect(service.deleteTemplate('non-existent')).rejects.toThrow('Template not found');
    });

    it('should get templates by type', async () => {
      const invoiceTemplates = await service.getTemplatesByType('INVOICE');

      expect(invoiceTemplates.length).toBeGreaterThan(0);
      expect(invoiceTemplates.every((t) => t.type === 'INVOICE')).toBe(true);
    });

    it('should activate template', async () => {
      const templates = await service.getAllTemplates();
      await service.deactivateTemplate(templates[0].id);
      const activated = await service.activateTemplate(templates[0].id);

      expect(activated.isActive).toBe(true);
    });

    it('should deactivate template', async () => {
      const templates = await service.getAllTemplates();
      const deactivated = await service.deactivateTemplate(templates[0].id);

      expect(deactivated.isActive).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.generatePdf('<h1>S1</h1>', {}, { type: 'INVOICE' });
      await service.generatePdf('<h1>S2</h1>', {}, { type: 'INVOICE' });
      await service.generatePdf('<h1>S3</h1>', {}, { type: 'REPORT' });
    });

    it('should get PDF statistics', async () => {
      const stats = await service.getStats();

      expect(stats.totalGenerated).toBeGreaterThan(0);
    });

    it('should count by type', async () => {
      const stats = await service.getStats();

      expect(stats.byType.INVOICE).toBe(2);
      expect(stats.byType.REPORT).toBe(1);
    });

    it('should count by status', async () => {
      const stats = await service.getStats();

      expect(stats.byStatus.COMPLETED).toBeGreaterThan(0);
    });

    it('should calculate total size', async () => {
      const stats = await service.getStats();

      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should calculate average size', async () => {
      const stats = await service.getStats();

      expect(stats.averageSize).toBeGreaterThan(0);
    });

    it('should calculate average generation time', async () => {
      const stats = await service.getStats();

      expect(stats.averageGenerationTime).toBeGreaterThanOrEqual(0);
    });

    it('should return recent PDFs', async () => {
      const stats = await service.getStats();

      expect(stats.recentPdfs.length).toBeGreaterThan(0);
    });

    it('should filter by date', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const stats = await service.getStats(futureDate);

      expect(stats.totalGenerated).toBe(0);
    });
  });

  describe('Romanian Language Support', () => {
    it('should have Romanian template content', async () => {
      const template = await service.getTemplateByName('Standard Invoice');

      expect(template!.htmlContentRo).toContain('FACTURĂ');
      expect(template!.htmlContentRo).toContain('Furnizor');
      expect(template!.htmlContentRo).toContain('Client');
    });

    it('should have Romanian variable descriptions', async () => {
      const template = await service.getTemplateByName('Standard Invoice');
      const invoiceVar = template!.variables.find((v) => v.name === 'invoiceNumber');

      expect(invoiceVar!.descriptionRo).toBe('Număr factură');
    });

    it('should generate ANAF declaration in Romanian', async () => {
      const pdf = await service.generateFromTemplate(
        'ANAF Declaration Receipt',
        {
          declarationType: 'D406 SAF-T',
          referenceNumber: 'ANAF-2025-001',
          submissionDate: '2025-01-15',
          status: 'Acceptată',
          companyName: 'SC Test SRL',
          cui: 'RO12345678',
          address: 'București, Sector 1',
          period: 'Ianuarie 2025',
          totalAmount: 50000,
          verificationDate: '2025-01-15',
        },
        { language: 'ro' },
      );

      expect(pdf.status).toBe('COMPLETED');
      expect(pdf.type).toBe('ANAF_DECLARATION');
    });

    it('should generate employment contract in Romanian', async () => {
      const pdf = await service.generateFromTemplate(
        'Employment Contract',
        {
          contractNumber: 'CIM-2025-001',
          employerName: 'SC Test SRL',
          employerCUI: 'RO12345678',
          employerRepresentative: 'Ion Popescu',
          employeeName: 'Maria Ionescu',
          employeeCNP: '2851015123456',
          position: 'Contabil',
          department: 'Financiar',
          startDate: '2025-02-01',
          grossSalary: 5000,
          signatureDate: '2025-01-15',
        },
        { language: 'ro' },
      );

      expect(pdf.status).toBe('COMPLETED');
      expect(pdf.type).toBe('CONTRACT');
    });
  });
});
