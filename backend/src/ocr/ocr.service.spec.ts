import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OCRService } from './ocr.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType, OCRStatus } from './dto/ocr.dto';

describe('OCRService', () => {
  let service: OCRService;
  let prisma: PrismaService;

  const mockPrismaService = {
    document: {
      findUnique: jest.fn(),
    },
    extractedField: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(null), // No API key by default
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OCRService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OCRService>(OCRService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('parseClaudeResponse', () => {
    it('should parse valid JSON with invoice fields', () => {
      const response = `\`\`\`json
{
  "documentType": "INVOICE",
  "fields": {
    "invoice_number": { "value": "FV-2025-001", "confidence": 0.95 },
    "invoice_date": { "value": "2025-01-15", "confidence": 0.92 },
    "net_amount": { "value": "10000", "confidence": 0.88 },
    "vat_rate": { "value": "21", "confidence": 0.97 },
    "vat_amount": { "value": "2100", "confidence": 0.90 },
    "gross_amount": { "value": "12100", "confidence": 0.91 }
  },
  "rawText": "Sample invoice text"
}
\`\`\``;

      const result = (service as any).parseClaudeResponse(response);

      expect(result.documentType).toBe(DocumentType.INVOICE);
      expect(result.fields.invoiceNumber?.value).toBe('FV-2025-001');
      expect(result.fields.invoiceNumber?.confidence).toBe(0.95);
      expect(result.fields.netAmount?.value).toBe('10000');
      expect(result.rawText).toBe('Sample invoice text');
    });

    it('should parse JSON without code blocks', () => {
      const response = `{"documentType": "RECEIPT", "fields": {"receipt_number": {"value": "BON-123", "confidence": 0.85}}}`;

      const result = (service as any).parseClaudeResponse(response);

      expect(result.documentType).toBe(DocumentType.RECEIPT);
      expect(result.fields.receiptNumber?.value).toBe('BON-123');
    });

    it('should return OTHER document type for invalid JSON', () => {
      const response = 'This is not valid JSON';

      const result = (service as any).parseClaudeResponse(response);

      expect(result.documentType).toBe(DocumentType.OTHER);
      expect(result.fields).toEqual({});
    });

    it('should convert snake_case field names to camelCase', () => {
      const response = `{"documentType": "CONTRACT", "fields": {"contract_number": {"value": "C-001", "confidence": 0.9}, "effective_date": {"value": "2025-02-01", "confidence": 0.88}}}`;

      const result = (service as any).parseClaudeResponse(response);

      expect(result.fields.contractNumber?.value).toBe('C-001');
      expect(result.fields.effectiveDate?.value).toBe('2025-02-01');
    });
  });

  describe('parseDocumentType', () => {
    it('should detect INVOICE type', () => {
      expect((service as any).parseDocumentType('INVOICE')).toBe(DocumentType.INVOICE);
      expect((service as any).parseDocumentType('invoice')).toBe(DocumentType.INVOICE);
      expect((service as any).parseDocumentType('Factura Invoice')).toBe(DocumentType.INVOICE);
    });

    it('should detect RECEIPT type', () => {
      expect((service as any).parseDocumentType('RECEIPT')).toBe(DocumentType.RECEIPT);
      expect((service as any).parseDocumentType('receipt')).toBe(DocumentType.RECEIPT);
      expect((service as any).parseDocumentType('Bon Fiscal Receipt')).toBe(DocumentType.RECEIPT);
    });

    it('should detect CONTRACT type', () => {
      expect((service as any).parseDocumentType('CONTRACT')).toBe(DocumentType.CONTRACT);
      expect((service as any).parseDocumentType('contract')).toBe(DocumentType.CONTRACT);
    });

    it('should return OTHER for unknown types', () => {
      expect((service as any).parseDocumentType('UNKNOWN')).toBe(DocumentType.OTHER);
      expect((service as any).parseDocumentType('')).toBe(DocumentType.OTHER);
      expect((service as any).parseDocumentType(null)).toBe(DocumentType.OTHER);
    });
  });

  describe('Multi-language OCR prompts', () => {
    it('should parse German invoice response correctly', () => {
      const response = `\`\`\`json
{
  "documentType": "INVOICE",
  "language": "de",
  "fields": {
    "invoice_number": { "value": "RE-2024-00567", "confidence": 0.94 },
    "invoice_date": { "value": "2024-12-15", "confidence": 0.92 },
    "supplier_name": { "value": "Musterfirma GmbH", "confidence": 0.91 },
    "supplier_cui": { "value": "DE123456789", "confidence": 0.95 },
    "net_amount": { "value": "1000.00", "confidence": 0.88 },
    "vat_rate": { "value": "19", "confidence": 0.96 },
    "vat_amount": { "value": "190.00", "confidence": 0.89 },
    "gross_amount": { "value": "1190.00", "confidence": 0.90 },
    "currency": { "value": "EUR", "confidence": 0.98 }
  },
  "rawText": "Rechnung RE-2024-00567"
}
\`\`\``;

      const result = (service as any).parseClaudeResponse(response);

      expect(result.documentType).toBe(DocumentType.INVOICE);
      expect(result.fields.invoiceNumber?.value).toBe('RE-2024-00567');
      expect(result.fields.supplierName?.value).toBe('Musterfirma GmbH');
      expect(result.fields.supplierCui?.value).toBe('DE123456789');
      expect(result.fields.vatRate?.value).toBe('19');
      expect(result.fields.currency?.value).toBe('EUR');
    });

    it('should parse English invoice response correctly', () => {
      const response = `{
  "documentType": "INVOICE",
  "language": "en",
  "fields": {
    "invoice_number": { "value": "INV-2024-1234", "confidence": 0.93 },
    "supplier_name": { "value": "Acme Ltd", "confidence": 0.90 },
    "supplier_cui": { "value": "GB123456789", "confidence": 0.94 },
    "net_amount": { "value": "500.00", "confidence": 0.87 },
    "vat_rate": { "value": "20", "confidence": 0.95 },
    "gross_amount": { "value": "600.00", "confidence": 0.88 },
    "currency": { "value": "GBP", "confidence": 0.97 }
  }
}`;

      const result = (service as any).parseClaudeResponse(response);

      expect(result.documentType).toBe(DocumentType.INVOICE);
      expect(result.fields.invoiceNumber?.value).toBe('INV-2024-1234');
      expect(result.fields.supplierCui?.value).toBe('GB123456789');
      expect(result.fields.vatRate?.value).toBe('20');
      expect(result.fields.currency?.value).toBe('GBP');
    });

    it('should handle German-specific VAT rates (19% and 7%)', () => {
      const response7percent = `{"documentType": "INVOICE", "fields": {"vat_rate": {"value": "7", "confidence": 0.95}}}`;
      const response19percent = `{"documentType": "INVOICE", "fields": {"vat_rate": {"value": "19", "confidence": 0.95}}}`;

      const result7 = (service as any).parseClaudeResponse(response7percent);
      const result19 = (service as any).parseClaudeResponse(response19percent);

      expect(result7.fields.vatRate?.value).toBe('7');
      expect(result19.fields.vatRate?.value).toBe('19');
    });

    it('should handle Romanian VAT rates (19%, 9%, 5%)', () => {
      const responses = [
        `{"documentType": "INVOICE", "fields": {"vat_rate": {"value": "19", "confidence": 0.95}}}`,
        `{"documentType": "INVOICE", "fields": {"vat_rate": {"value": "9", "confidence": 0.95}}}`,
        `{"documentType": "INVOICE", "fields": {"vat_rate": {"value": "5", "confidence": 0.95}}}`,
      ];

      responses.forEach((response, index) => {
        const result = (service as any).parseClaudeResponse(response);
        const expectedRate = ['19', '9', '5'][index];
        expect(result.fields.vatRate?.value).toBe(expectedRate);
      });
    });
  });

  describe('snakeToCamel', () => {
    it('should convert snake_case to camelCase', () => {
      expect((service as any).snakeToCamel('invoice_number')).toBe('invoiceNumber');
      expect((service as any).snakeToCamel('vat_rate')).toBe('vatRate');
      expect((service as any).snakeToCamel('gross_amount')).toBe('grossAmount');
      expect((service as any).snakeToCamel('supplier_cui')).toBe('supplierCui');
    });

    it('should handle strings without underscores', () => {
      expect((service as any).snakeToCamel('amount')).toBe('amount');
      expect((service as any).snakeToCamel('currency')).toBe('currency');
    });

    it('should handle multiple underscores', () => {
      expect((service as any).snakeToCamel('net_vat_amount')).toBe('netVatAmount');
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate average confidence from fields', () => {
      const fields = {
        invoiceNumber: { value: '001', confidence: 0.9 },
        invoiceDate: { value: '2025-01-15', confidence: 0.8 },
        netAmount: { value: '1000', confidence: 1.0 },
      };

      const result = (service as any).calculateOverallConfidence(fields);

      expect(result).toBeCloseTo(0.9, 2);
    });

    it('should return 0 for empty fields', () => {
      const result = (service as any).calculateOverallConfidence({});

      expect(result).toBe(0);
    });

    it('should ignore fields without confidence', () => {
      const fields = {
        invoiceNumber: { value: '001', confidence: 0.8 },
        invalidField: { value: 'test' }, // No confidence
        netAmount: { value: '1000', confidence: 1.0 },
      };

      const result = (service as any).calculateOverallConfidence(fields);

      expect(result).toBeCloseTo(0.9, 2);
    });
  });

  describe('processDocument', () => {
    it('should throw NotFoundException for non-existent document', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(service.processDocument('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when OCR not configured', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        filePath: '/path/to/file.jpg',
      });

      await expect(service.processDocument('doc-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getExtractionStatus', () => {
    it('should return PENDING when no extraction exists', async () => {
      mockPrismaService.extractedField.findFirst.mockResolvedValue(null);

      const result = await service.getExtractionStatus('doc-1');

      expect(result.status).toBe(OCRStatus.PENDING);
    });

    it('should return COMPLETED for high confidence extraction', async () => {
      mockPrismaService.extractedField.findFirst.mockResolvedValue({
        id: 'ext-1',
        overallConfidence: 0.85,
      });

      const result = await service.getExtractionStatus('doc-1');

      expect(result.status).toBe(OCRStatus.COMPLETED);
    });

    it('should return REVIEW_REQUIRED for low confidence extraction', async () => {
      mockPrismaService.extractedField.findFirst.mockResolvedValue({
        id: 'ext-1',
        overallConfidence: 0.5,
      });

      const result = await service.getExtractionStatus('doc-1');

      expect(result.status).toBe(OCRStatus.REVIEW_REQUIRED);
    });
  });

  describe('submitCorrections', () => {
    it('should throw NotFoundException when no extraction exists', async () => {
      mockPrismaService.extractedField.findFirst.mockResolvedValue(null);

      await expect(
        service.submitCorrections('doc-1', {
          corrections: [{ fieldName: 'invoiceNumber', correctedValue: 'INV-001' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update extraction with corrections', async () => {
      const mockExtraction = {
        id: 'ext-1',
        invoiceNumber: 'OLD-001',
        partnerName: 'Old Partner',
      };

      mockPrismaService.extractedField.findFirst.mockResolvedValue(mockExtraction);
      mockPrismaService.extractedField.update.mockResolvedValue({});

      await service.submitCorrections('doc-1', {
        corrections: [
          { fieldName: 'invoice_number', correctedValue: 'INV-NEW-001' },
          { fieldName: 'partner_name', correctedValue: 'New Partner SRL' },
        ],
      });

      expect(mockPrismaService.extractedField.update).toHaveBeenCalledWith({
        where: { id: 'ext-1' },
        data: expect.objectContaining({
          wasManuallyEdited: true,
          invoiceNumber: 'INV-NEW-001',
          partnerName: 'New Partner SRL',
        }),
      });
    });
  });

  describe('convertToInvoice', () => {
    it('should throw NotFoundException when no extraction exists', async () => {
      mockPrismaService.extractedField.findFirst.mockResolvedValue(null);

      await expect(service.convertToInvoice('doc-1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no userId available', async () => {
      mockPrismaService.extractedField.findFirst.mockResolvedValue({
        id: 'ext-1',
        invoiceNumber: 'INV-001',
      });
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: null,
      });

      await expect(service.convertToInvoice('doc-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should create invoice from extraction data', async () => {
      const mockExtraction = {
        id: 'ext-1',
        invoiceNumber: 'FV-2025-001',
        invoiceDate: new Date('2025-01-15'),
        dueDate: new Date('2025-02-15'),
        partnerName: 'Test Client SRL',
        partnerCui: 'RO12345678',
        partnerAddress: 'Test Address',
        netAmount: 10000,
        vatRate: 21,
        vatAmount: 2100,
        grossAmount: 12100,
        currency: 'RON',
      };

      mockPrismaService.extractedField.findFirst.mockResolvedValue(mockExtraction);
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
      });
      mockPrismaService.invoice.create.mockResolvedValue({
        ...mockExtraction,
        id: 'inv-1',
        status: 'DRAFT',
      });

      const result = await service.convertToInvoice('doc-1', { asDraft: true });

      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          documentId: 'doc-1',
          invoiceNumber: 'FV-2025-001',
          netAmount: 10000,
          vatRate: 21,
          vatAmount: 2100,
          grossAmount: 12100,
          currency: 'RON',
          status: 'DRAFT',
        }),
      });
      expect(result.id).toBe('inv-1');
    });

    it('should use PENDING status when asDraft is false', async () => {
      mockPrismaService.extractedField.findFirst.mockResolvedValue({
        id: 'ext-1',
        invoiceNumber: 'FV-2025-002',
      });
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
      });
      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-2',
        status: 'PENDING',
      });

      await service.convertToInvoice('doc-1', { asDraft: false });

      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
        }),
      });
    });
  });

  describe('processBatch', () => {
    it('should process multiple documents', async () => {
      // Since processDocument will throw due to missing API key,
      // we just verify the method exists and can be called
      const spy = jest.spyOn(service, 'processDocument');

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        filePath: '/path/to/file.jpg',
      });

      // This will throw due to no API key, but we're testing the batch logic
      await expect(service.processBatch(['doc-1', 'doc-2'])).rejects.toThrow();

      expect(spy).toHaveBeenCalled();
    });
  });
});
