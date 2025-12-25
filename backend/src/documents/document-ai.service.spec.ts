import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentAiService } from './document-ai.service';

describe('DocumentAiService', () => {
  let service: DocumentAiService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentAiService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DocumentAiService>(DocumentAiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Sample document contents for testing
  const sampleInvoice = `
    FACTURĂ
    Nr. factura: INV-2025-001
    Data: 15.01.2025

    Furnizor: S.C. Test Company S.R.L.
    CUI: RO12345678
    Adresa: Str. Test Nr. 123, București
    IBAN: RO49AAAA1B31007593840000

    Client: ABC Industries S.A.
    CUI: RO87654321

    Produs: Servicii consultanță - 1000.00 RON
    TVA 21%: 210.00 RON
    TOTAL: 1210.00 RON

    Semnătură și ștampilă
  `;

  const sampleContract = `
    CONTRACT DE PRESTĂRI SERVICII
    Nr. 123/2025

    Părțile contractante:
    1. S.C. Furnizor Services S.R.L., cu sediul în București
    2. S.C. Client Corp S.A.

    Art. 1. Obiectul contractului
    Prestarea de servicii IT conform anexei.

    Art. 2. Durata
    Contract valabil 12 luni de la data semnării.

    Semnături:
    Dl. Ion Popescu
    D-na Maria Ionescu
  `;

  const sampleBankStatement = `
    EXTRAS DE CONT
    Cont: RO49AAAA1B31007593840000
    Perioada: 01.01.2025 - 31.01.2025

    Sold inițial: 15,000.00 RON

    Data        Descriere                    Debit       Credit
    05.01.2025  Transfer intern                          5,000.00
    10.01.2025  Plată furnizor              2,500.00
    15.01.2025  Încasare client                          8,000.00

    Sold final: 25,500.00 RON
  `;

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default templates', async () => {
      const templates = await service.getTemplates('system');
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('document upload', () => {
    it('should upload a document', async () => {
      const doc = await service.uploadDocument(
        'test-invoice.pdf',
        'application/pdf',
        1024,
        'user-123',
        'tenant-456',
      );

      expect(doc.id).toBeDefined();
      expect(doc.filename).toBe('test-invoice.pdf');
      expect(doc.status).toBe('uploaded');
    });

    it('should retrieve uploaded document', async () => {
      const uploaded = await service.uploadDocument(
        'test.pdf',
        'application/pdf',
        512,
        'user-1',
        'tenant-1',
      );

      const retrieved = await service.getDocument(uploaded.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(uploaded.id);
    });

    it('should return null for non-existent document', async () => {
      const result = await service.getDocument('non-existent');
      expect(result).toBeNull();
    });

    it('should get documents by tenant', async () => {
      await service.uploadDocument('doc1.pdf', 'application/pdf', 100, 'u1', 'tenant-list');
      await service.uploadDocument('doc2.pdf', 'application/pdf', 200, 'u1', 'tenant-list');
      await service.uploadDocument('doc3.pdf', 'application/pdf', 300, 'u1', 'other-tenant');

      const docs = await service.getDocuments('tenant-list');
      expect(docs.length).toBe(2);
    });
  });

  describe('document classification', () => {
    it('should classify invoice', () => {
      const result = service.classifyDocument(sampleInvoice);
      expect(result.type).toBe('invoice');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify contract', () => {
      const result = service.classifyDocument(sampleContract);
      expect(result.type).toBe('contract');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify bank statement', () => {
      const result = service.classifyDocument(sampleBankStatement);
      expect(result.type).toBe('bank_statement');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should return unknown for ambiguous content', () => {
      const result = service.classifyDocument('Random text without patterns');
      expect(result.type).toBe('unknown');
    });

    it('should provide alternative types', () => {
      const result = service.classifyDocument(sampleInvoice);
      if (result.alternativeTypes) {
        for (const alt of result.alternativeTypes) {
          expect(alt.confidence).toBeGreaterThan(0);
          expect(alt.confidence).toBeLessThan(result.confidence);
        }
      }
    });
  });

  describe('entity extraction', () => {
    it('should extract entities from invoice', () => {
      const entities = service.extractEntities(sampleInvoice, 'invoice');

      const entityTypes = entities.map((e) => e.type);
      expect(entityTypes).toContain('date');
      expect(entityTypes).toContain('amount');
    });

    it('should extract VAT number', () => {
      const entities = service.extractEntities(sampleInvoice, 'invoice');
      const vatEntities = entities.filter((e) => e.type === 'vat_number');

      expect(vatEntities.length).toBeGreaterThan(0);
    });

    it('should extract IBAN', () => {
      const entities = service.extractEntities(sampleInvoice, 'invoice');
      const ibanEntities = entities.filter((e) => e.type === 'iban');

      expect(ibanEntities.length).toBeGreaterThan(0);
      // IBAN should be the long format starting with country code
      const fullIban = ibanEntities.find((e) => e.value.length > 15);
      expect(fullIban).toBeDefined();
    });

    it('should extract dates', () => {
      const entities = service.extractEntities(sampleInvoice, 'invoice');
      const dateEntities = entities.filter((e) => e.type === 'date');

      expect(dateEntities.length).toBeGreaterThan(0);
    });

    it('should normalize currency values', () => {
      const entities = service.extractEntities(sampleInvoice, 'invoice');
      const currencyEntities = entities.filter((e) => e.type === 'currency');

      if (currencyEntities.length > 0) {
        expect(currencyEntities[0].normalizedValue).toBe('RON');
      }
    });

    it('should extract person names from contract', () => {
      const entities = service.extractEntities(sampleContract, 'contract');
      const personEntities = entities.filter((e) => e.type === 'person_name');

      expect(personEntities.length).toBeGreaterThan(0);
    });
  });

  describe('document processing', () => {
    it('should process a document', async () => {
      const doc = await service.uploadDocument(
        'invoice.pdf',
        'application/pdf',
        1024,
        'user-1',
        'tenant-1',
      );

      const processed = await service.processDocument(doc.id, sampleInvoice);

      expect(processed.id).toBeDefined();
      expect(processed.classification.type).toBe('invoice');
      expect(processed.entities.length).toBeGreaterThan(0);
      expect(processed.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should update document status after processing', async () => {
      const doc = await service.uploadDocument(
        'test.pdf',
        'application/pdf',
        512,
        'user-1',
        'tenant-1',
      );

      await service.processDocument(doc.id, sampleInvoice);

      const updated = await service.getDocument(doc.id);
      expect(updated?.status).toBe('processed');
    });

    it('should retrieve processed document', async () => {
      const doc = await service.uploadDocument(
        'test.pdf',
        'application/pdf',
        512,
        'user-1',
        'tenant-1',
      );

      await service.processDocument(doc.id, sampleContract);

      const processed = await service.getProcessedDocument(doc.id);
      expect(processed).toBeDefined();
      expect(processed?.classification.type).toBe('contract');
    });

    it('should throw error for non-existent document', async () => {
      await expect(
        service.processDocument('non-existent', 'content'),
      ).rejects.toThrow('Document not found');
    });

    it('should detect metadata', async () => {
      const doc = await service.uploadDocument(
        'test.pdf',
        'application/pdf',
        512,
        'user-1',
        'tenant-1',
      );

      const processed = await service.processDocument(doc.id, sampleInvoice);

      expect(processed.metadata.language).toBe('ro');
      expect(processed.metadata.pageCount).toBeGreaterThan(0);
      expect(processed.metadata.hasSignature).toBe(true);
      expect(processed.metadata.hasStamp).toBe(true);
    });
  });

  describe('invoice extraction', () => {
    it('should extract invoice data', async () => {
      const doc = await service.uploadDocument(
        'invoice.pdf',
        'application/pdf',
        1024,
        'user-1',
        'tenant-1',
      );

      await service.processDocument(doc.id, sampleInvoice);
      const invoiceData = await service.extractInvoiceData(doc.id);

      expect(invoiceData).toBeDefined();
      expect(invoiceData?.invoiceNumber).toBeDefined();
      expect(invoiceData?.currency).toBe('RON');
    });

    it('should return null for non-invoice document', async () => {
      const doc = await service.uploadDocument(
        'contract.pdf',
        'application/pdf',
        1024,
        'user-1',
        'tenant-1',
      );

      await service.processDocument(doc.id, sampleContract);
      const invoiceData = await service.extractInvoiceData(doc.id);

      expect(invoiceData).toBeNull();
    });
  });

  describe('batch processing', () => {
    it('should create a batch', async () => {
      const batch = await service.createBatch(
        [
          { filename: 'doc1.pdf', mimeType: 'application/pdf', size: 100 },
          { filename: 'doc2.pdf', mimeType: 'application/pdf', size: 200 },
        ],
        'user-1',
        'tenant-1',
      );

      expect(batch.id).toBeDefined();
      expect(batch.documents.length).toBe(2);
      expect(batch.status).toBe('pending');
    });

    it('should process a batch', async () => {
      const batch = await service.createBatch(
        [
          { filename: 'invoice.pdf', mimeType: 'application/pdf', size: 100 },
          { filename: 'contract.pdf', mimeType: 'application/pdf', size: 200 },
        ],
        'user-1',
        'tenant-1',
      );

      const contents = new Map<string, string>();
      contents.set(batch.documents[0].id, sampleInvoice);
      contents.set(batch.documents[1].id, sampleContract);

      const processed = await service.processBatch(batch.id, contents);

      expect(processed.results.length).toBe(2);
      expect(processed.progress).toBe(100);
      expect(processed.status).toBe('completed');
    });

    it('should handle batch errors gracefully', async () => {
      const batch = await service.createBatch(
        [
          { filename: 'doc1.pdf', mimeType: 'application/pdf', size: 100 },
          { filename: 'doc2.pdf', mimeType: 'application/pdf', size: 200 },
        ],
        'user-1',
        'tenant-1',
      );

      // Only provide content for one document
      const contents = new Map<string, string>();
      contents.set(batch.documents[0].id, sampleInvoice);

      const processed = await service.processBatch(batch.id, contents);

      expect(processed.results.length).toBe(1);
      expect(processed.errors.length).toBe(1);
    });

    it('should retrieve batch', async () => {
      const created = await service.createBatch(
        [{ filename: 'test.pdf', mimeType: 'application/pdf', size: 100 }],
        'user-1',
        'tenant-1',
      );

      const retrieved = await service.getBatch(created.id);
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('templates', () => {
    it('should create a template', async () => {
      const template = await service.createTemplate(
        'Custom Invoice',
        'invoice',
        [
          { name: 'customField', type: 'string', required: true },
        ],
        'tenant-1',
      );

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Invoice');
      expect(template.fields.length).toBe(1);
    });

    it('should get templates for tenant', async () => {
      await service.createTemplate(
        'Template 1',
        'invoice',
        [],
        'tenant-templates',
      );
      await service.createTemplate(
        'Template 2',
        'contract',
        [],
        'tenant-templates',
      );

      const templates = await service.getTemplates('tenant-templates');
      // Should include tenant templates + system templates
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });

    it('should get specific template', async () => {
      const created = await service.createTemplate(
        'Specific',
        'receipt',
        [],
        'tenant-1',
      );

      const retrieved = await service.getTemplate(created.id);
      expect(retrieved?.name).toBe('Specific');
    });
  });

  describe('statistics', () => {
    it('should get processing stats', async () => {
      // Upload and process some documents
      const doc1 = await service.uploadDocument('inv1.pdf', 'application/pdf', 100, 'u1', 'tenant-stats');
      const doc2 = await service.uploadDocument('inv2.pdf', 'application/pdf', 200, 'u1', 'tenant-stats');

      await service.processDocument(doc1.id, sampleInvoice);
      await service.processDocument(doc2.id, sampleContract);

      const stats = await service.getProcessingStats('tenant-stats');

      expect(stats.totalDocuments).toBe(2);
      expect(stats.processedDocuments).toBe(2);
      expect(stats.avgProcessingTime).toBeGreaterThanOrEqual(0);
      expect(stats.documentsByType).toBeDefined();
    });

    it('should track documents by type', async () => {
      const doc1 = await service.uploadDocument('d1.pdf', 'application/pdf', 100, 'u1', 'tenant-type-stats');
      const doc2 = await service.uploadDocument('d2.pdf', 'application/pdf', 200, 'u1', 'tenant-type-stats');
      const doc3 = await service.uploadDocument('d3.pdf', 'application/pdf', 300, 'u1', 'tenant-type-stats');

      await service.processDocument(doc1.id, sampleInvoice);
      await service.processDocument(doc2.id, sampleInvoice);
      await service.processDocument(doc3.id, sampleContract);

      const stats = await service.getProcessingStats('tenant-type-stats');

      expect(stats.documentsByType['invoice']).toBe(2);
      expect(stats.documentsByType['contract']).toBe(1);
    });
  });
});
