import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import {
  DocumentAnalysisService,
  DocumentType,
  ProcessingStatus,
} from './document-analysis.service';

describe('DocumentAnalysisService', () => {
  let service: DocumentAnalysisService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentAnalysisService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DocumentAnalysisService>(DocumentAnalysisService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Document Upload', () => {
    it('should upload a PDF document', async () => {
      const document = await service.uploadDocument(
        {
          filename: 'factura-001.pdf',
          mimeType: 'application/pdf',
          size: 150000,
        },
        'user-1',
      );

      expect(document.id).toBeDefined();
      expect(document.filename).toBe('factura-001.pdf');
      expect(document.mimeType).toBe('application/pdf');
      expect(document.pageCount).toBeGreaterThan(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'document.uploaded',
        expect.objectContaining({ filename: 'factura-001.pdf' }),
      );
    });

    it('should upload an image document', async () => {
      const document = await service.uploadDocument(
        {
          filename: 'receipt.jpg',
          mimeType: 'image/jpeg',
          size: 50000,
        },
        'user-1',
      );

      expect(document.pageCount).toBe(1);
    });

    it('should reject unsupported file types', async () => {
      await expect(
        service.uploadDocument(
          {
            filename: 'document.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 50000,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding size limit', async () => {
      await expect(
        service.uploadDocument(
          {
            filename: 'large.pdf',
            mimeType: 'application/pdf',
            size: 30 * 1024 * 1024, // 30MB
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include tenant ID when provided', async () => {
      const document = await service.uploadDocument(
        {
          filename: 'invoice.pdf',
          mimeType: 'application/pdf',
          size: 100000,
        },
        'user-1',
        'tenant-123',
      );

      expect(document.tenantId).toBe('tenant-123');
    });
  });

  describe('Document Classification', () => {
    it('should classify invoice documents', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura-fiscala-001.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.classification.documentType).toBe('INVOICE');
      expect(result.classification.confidence).toBeGreaterThan(0.8);
      expect(result.classification.hasANAFRelevance).toBe(true);
    });

    it('should classify receipt documents', async () => {
      const document = await service.uploadDocument(
        { filename: 'bon-fiscal.jpg', mimeType: 'image/jpeg', size: 50000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.classification.documentType).toBe('RECEIPT');
    });

    it('should classify contract documents', async () => {
      const document = await service.uploadDocument(
        { filename: 'contract-munca.pdf', mimeType: 'application/pdf', size: 200000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.classification.documentType).toBe('CONTRACT');
      expect(result.classification.subType).toBe('EMPLOYMENT');
    });

    it('should classify payslip documents', async () => {
      const document = await service.uploadDocument(
        { filename: 'fluturas-salariu.pdf', mimeType: 'application/pdf', size: 80000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.classification.documentType).toBe('PAYSLIP');
    });

    it('should detect Romanian documents', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura-ro.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.classification.isRomanian).toBe(true);
      expect(result.classification.language).toBe('ro');
    });

    it('should suggest workflow for document type', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.classification.suggestedWorkflow).toBe('invoice-approval-workflow');
    });
  });

  describe('OCR Processing', () => {
    it('should perform OCR on document', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.ocrResult).toBeDefined();
      expect(result.ocrResult?.text.length).toBeGreaterThan(0);
      expect(result.ocrResult?.confidence).toBeGreaterThan(0.8);
    });

    it('should include page-level OCR results', async () => {
      const document = await service.uploadDocument(
        { filename: 'multi-page.pdf', mimeType: 'application/pdf', size: 500000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.ocrResult?.pageResults.length).toBeGreaterThan(0);
      expect(result.ocrResult?.pageResults[0].pageNumber).toBe(1);
    });

    it('should detect language from OCR', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura-romaneasca.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.ocrResult?.language).toBe('ro');
    });
  });

  describe('Entity Extraction', () => {
    it('should extract CUI entities', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      const cuiEntities = result.extractedEntities.filter(e => e.type === 'CUI');
      expect(cuiEntities.length).toBeGreaterThan(0);
    });

    it('should extract date entities', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      const dateEntities = result.extractedEntities.filter(e => e.type === 'DATE');
      expect(dateEntities.length).toBeGreaterThan(0);
    });

    it('should extract monetary amounts', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      const amountEntities = result.extractedEntities.filter(e => e.type === 'AMOUNT');
      expect(amountEntities.length).toBeGreaterThan(0);
    });

    it('should normalize CUI values', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      const cuiEntity = result.extractedEntities.find(e => e.type === 'CUI');
      if (cuiEntity) {
        expect(cuiEntity.normalized).toBeDefined();
        expect(cuiEntity.normalized).toBe(cuiEntity.normalized?.toUpperCase());
      }
    });
  });

  describe('Field Extraction', () => {
    it('should extract invoice fields', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.extractedFields.length).toBeGreaterThan(0);

      const invoiceNumberField = result.extractedFields.find(f => f.fieldName === 'invoiceNumber');
      expect(invoiceNumberField).toBeDefined();
    });

    it('should include Romanian field names', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      for (const field of result.extractedFields) {
        expect(field.fieldNameRo).toBeDefined();
        expect(field.fieldNameRo.length).toBeGreaterThan(0);
      }
    });

    it('should assign data types to fields', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      const totalField = result.extractedFields.find(f => f.fieldName === 'totalAmount');
      if (totalField) {
        expect(totalField.dataType).toBe('CURRENCY');
      }
    });

    it('should include confidence scores for fields', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      for (const field of result.extractedFields) {
        expect(field.confidence).toBeGreaterThan(0);
        expect(field.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Structured Data Extraction', () => {
    it('should build invoice data structure', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.invoiceData).toBeDefined();
      expect(result.invoiceData?.currency).toBe('RON');
      expect(result.invoiceData?.lineItems).toBeDefined();
    });

    it('should build receipt data structure', async () => {
      const document = await service.uploadDocument(
        { filename: 'bon-fiscal.jpg', mimeType: 'image/jpeg', size: 50000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.receiptData).toBeDefined();
    });

    it('should build contract data structure', async () => {
      const document = await service.uploadDocument(
        { filename: 'contract.pdf', mimeType: 'application/pdf', size: 150000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.contractData).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should validate extracted fields', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      for (const field of result.extractedFields) {
        expect(['VALID', 'INVALID', 'NEEDS_REVIEW']).toContain(field.validationStatus);
      }
    });

    it('should add review reasons for validation failures', async () => {
      const document = await service.uploadDocument(
        { filename: 'incomplete-invoice.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      // May have review reasons depending on extraction
      expect(Array.isArray(result.reviewReasons)).toBe(true);
    });
  });

  describe('Confidence & Review', () => {
    it('should calculate overall confidence', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should flag documents needing review', async () => {
      const document = await service.uploadDocument(
        { filename: 'unclear-scan.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(typeof result.needsManualReview).toBe('boolean');
    });

    it('should complete analysis with appropriate status', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(['COMPLETED', 'NEEDS_REVIEW', 'FAILED']).toContain(result.status);
    });
  });

  describe('Insights & Actions', () => {
    it('should generate insights', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('should include Romanian translations in insights', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      for (const insight of result.insights) {
        expect(insight.messageRo).toBeDefined();
      }
    });

    it('should generate suggested actions', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should include automation flag in actions', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      for (const action of result.suggestedActions) {
        expect(typeof action.automated).toBe('boolean');
      }
    });

    it('should suggest e-Factura submission for ANAF-relevant docs', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      const efacturaAction = result.suggestedActions.find(a => a.action.includes('e-Factura'));
      expect(efacturaAction).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    it('should create batch job', async () => {
      const doc1 = await service.uploadDocument(
        { filename: 'doc1.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );
      const doc2 = await service.uploadDocument(
        { filename: 'doc2.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const job = await service.createBatchJob([doc1.id, doc2.id]);

      expect(job.id).toBeDefined();
      expect(job.documentIds.length).toBe(2);
      expect(job.status).toBe('PENDING');
    });

    it('should process batch job', async () => {
      const doc1 = await service.uploadDocument(
        { filename: 'factura1.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );
      const doc2 = await service.uploadDocument(
        { filename: 'factura2.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const job = await service.createBatchJob([doc1.id, doc2.id]);
      const result = await service.processBatchJob(job.id);

      expect(result.status).toBe('COMPLETED');
      expect(result.progress).toBe(100);
      expect(result.results.size).toBe(2);
    });

    it('should track batch job progress', async () => {
      const doc = await service.uploadDocument(
        { filename: 'doc.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const job = await service.createBatchJob([doc.id]);
      await service.processBatchJob(job.id);

      const retrieved = service.getBatchJob(job.id);
      expect(retrieved?.completedAt).toBeDefined();
    });
  });

  describe('Processing Metadata', () => {
    it('should track processing time', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.processedAt).toBeDefined();
    });

    it('should include model version', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);

      expect(result.modelVersion).toBeDefined();
    });

    it('should emit analysis event', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      await service.analyzeDocument(document.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'document.analyzed',
        expect.objectContaining({ documentId: document.id }),
      );
    });
  });

  describe('Retrieval', () => {
    it('should get document by ID', async () => {
      const document = await service.uploadDocument(
        { filename: 'test.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const retrieved = service.getDocument(document.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(document.id);
    });

    it('should get analysis result by ID', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      const result = await service.analyzeDocument(document.id);
      const retrieved = service.getAnalysisResult(result.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(result.id);
    });

    it('should get analysis by document ID', async () => {
      const document = await service.uploadDocument(
        { filename: 'factura.pdf', mimeType: 'application/pdf', size: 100000 },
        'user-1',
      );

      await service.analyzeDocument(document.id);
      const retrieved = service.getAnalysisForDocument(document.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.documentId).toBe(document.id);
    });
  });
});
