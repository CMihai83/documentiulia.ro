import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EFacturaB2CService,
  B2CInvoiceType,
  ConsumerType,
  B2CInvoice,
} from './efactura-b2c.service';
import { ANAFResilientService } from './anaf-resilient.service';

describe('EFacturaB2CService', () => {
  let service: EFacturaB2CService;

  const mockANAFService = {
    uploadEFactura: jest.fn().mockResolvedValue({
      success: true,
      data: { uploadIndex: 'upload-123', status: 'uploaded' },
      requestId: 'req-123',
    }),
    getEFacturaStatus: jest.fn().mockResolvedValue({
      success: true,
      data: { status: 'ok', message: 'Accepted', downloadId: 'dl-123' },
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        ANAF_API_KEY: 'test-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EFacturaB2CService,
        { provide: ANAFResilientService, useValue: mockANAFService },
        { provide: ConfigService, useValue: mockConfigService },
        EventEmitter2,
      ],
    }).compile();

    service = module.get<EFacturaB2CService>(EFacturaB2CService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createTestInvoice = (): Omit<B2CInvoice, 'id' | 'createdAt' | 'updatedAt'> => ({
    invoiceNumber: 'B2C-2025-001',
    invoiceDate: new Date(),
    invoiceType: B2CInvoiceType.STANDARD,
    seller: {
      cui: '12345678',
      name: 'Test Company SRL',
      address: 'Str. Test 123',
      city: 'Bucharest',
      county: 'Bucharest',
      country: 'RO',
      postalCode: '010101',
      vatPayer: true,
      tradeRegister: 'J40/123/2020',
      iban: 'RO49AAAA1B31007593840000',
      bank: 'Test Bank',
      email: 'contact@test.ro',
      phone: '+40721000000',
    },
    buyer: {
      type: ConsumerType.INDIVIDUAL,
      name: 'Ion Popescu',
      cnp: '1900101123456',
      address: 'Str. Consumer 456',
      city: 'Bucharest',
      country: 'RO',
      email: 'ion.popescu@email.ro',
      phone: '+40722000000',
    },
    items: [
      {
        lineNumber: 1,
        description: 'Product A',
        quantity: 2,
        unitOfMeasure: 'BUC',
        unitPrice: 100,
        vatRate: 21,
        vatCategory: 'S',
        netAmount: 200,
        vatAmount: 42,
        grossAmount: 242,
        productCode: 'PROD-A',
      },
      {
        lineNumber: 2,
        description: 'Service B',
        quantity: 1,
        unitOfMeasure: 'H',
        unitPrice: 150,
        vatRate: 21,
        vatCategory: 'S',
        netAmount: 150,
        vatAmount: 31.5,
        grossAmount: 181.5,
      },
    ],
    currency: 'RON',
    netTotal: 350,
    vatTotal: 73.5,
    grossTotal: 423.5,
    paymentMethod: 'Card',
    isPaid: true,
  });

  describe('createInvoice', () => {
    it('should create a B2C invoice', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      expect(invoice.id).toBeDefined();
      expect(invoice.id).toContain('B2C-');
      expect(invoice.invoiceNumber).toBe('B2C-2025-001');
      expect(invoice.seller.cui).toBe('12345678');
    });

    it('should mark small invoices as simplified', async () => {
      const invoiceData = createTestInvoice();
      invoiceData.grossTotal = 400; // Under 500 RON threshold
      invoiceData.netTotal = 330.58;
      invoiceData.vatTotal = 69.42;

      const invoice = await service.createInvoice(invoiceData);

      expect(invoice.invoiceType).toBe(B2CInvoiceType.SIMPLIFIED);
    });

    it('should keep standard type for large invoices', async () => {
      const invoiceData = createTestInvoice();
      invoiceData.grossTotal = 1000; // Over 500 RON threshold

      const invoice = await service.createInvoice(invoiceData);

      expect(invoice.invoiceType).toBe(B2CInvoiceType.STANDARD);
    });
  });

  describe('generateXML', () => {
    it('should generate valid UBL 2.1 XML', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const xml = service.generateXML(invoice);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
      expect(xml).toContain('urn:efactura.mfinante.ro:CIUS-RO:1.0.1');
    });

    it('should include seller information', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const xml = service.generateXML(invoice);

      expect(xml).toContain('AccountingSupplierParty');
      expect(xml).toContain('12345678');
      expect(xml).toContain('Test Company SRL');
    });

    it('should include buyer information', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const xml = service.generateXML(invoice);

      expect(xml).toContain('AccountingCustomerParty');
      expect(xml).toContain('Ion Popescu');
    });

    it('should include all invoice lines', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const xml = service.generateXML(invoice);

      expect(xml).toContain('InvoiceLine');
      expect(xml).toContain('Product A');
      expect(xml).toContain('Service B');
    });

    it('should include correct totals', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const xml = service.generateXML(invoice);

      expect(xml).toContain('350.00'); // Net total
      expect(xml).toContain('73.50'); // VAT total
      expect(xml).toContain('423.50'); // Gross total
    });

    it('should include payment information when IBAN provided', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const xml = service.generateXML(invoice);

      expect(xml).toContain('PaymentMeans');
      expect(xml).toContain('RO49AAAA1B31007593840000');
    });

    it('should escape XML special characters', async () => {
      const invoiceData = createTestInvoice();
      invoiceData.seller.name = 'Test & Co <SRL>';
      const invoice = await service.createInvoice(invoiceData);

      const xml = service.generateXML(invoice);

      expect(xml).toContain('Test &amp; Co &lt;SRL&gt;');
    });
  });

  describe('submitToANAF', () => {
    it('should submit invoice successfully', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const result = await service.submitToANAF(invoice.id);

      expect(result.success).toBe(true);
      expect(result.uploadIndex).toBe('upload-123');
      expect(result.status).toBe('SUBMITTED');
      expect(result.xmlGenerated).toBe(true);
    });

    it('should update invoice with submission details', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      await service.submitToANAF(invoice.id);

      const updated = service.getInvoice(invoice.id);
      expect(updated?.uploadIndex).toBe('upload-123');
      expect(updated?.efacturaStatus).toBe('SUBMITTED');
      expect(updated?.submittedAt).toBeDefined();
    });

    it('should calculate retention expiry', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const result = await service.submitToANAF(invoice.id);

      expect(result.retentionExpiresAt).toBeDefined();
      // Should be approximately 10 years from now
      const tenYearsFromNow = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
      const diff = Math.abs(result.retentionExpiresAt!.getTime() - tenYearsFromNow.getTime());
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000); // Within 1 day
    });

    it('should return error for non-existent invoice', async () => {
      const result = await service.submitToANAF('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('not found');
    });

    it('should handle ANAF submission failure', async () => {
      mockANAFService.uploadEFactura.mockResolvedValueOnce({
        success: false,
        error: 'ANAF service unavailable',
      });

      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const result = await service.submitToANAF(invoice.id);

      expect(result.success).toBe(false);
      expect(result.status).toBe('ERROR');
    });
  });

  describe('checkStatus', () => {
    it('should check submission status', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);
      await service.submitToANAF(invoice.id);

      const status = await service.checkStatus(invoice.id);

      expect(status.status).toBe('ACCEPTED');
      expect(status.downloadId).toBe('dl-123');
    });

    it('should update invoice status', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);
      await service.submitToANAF(invoice.id);

      await service.checkStatus(invoice.id);

      const updated = service.getInvoice(invoice.id);
      expect(updated?.efacturaStatus).toBe('ACCEPTED');
    });

    it('should return error for non-submitted invoice', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const status = await service.checkStatus(invoice.id);

      expect(status.status).toBe('ERROR');
      expect(status.message).toContain('not submitted');
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by ID', async () => {
      const invoiceData = createTestInvoice();
      const created = await service.createInvoice(invoiceData);

      const invoice = service.getInvoice(created.id);

      expect(invoice).not.toBeNull();
      expect(invoice?.id).toBe(created.id);
    });

    it('should return null for non-existent invoice', () => {
      const invoice = service.getInvoice('non-existent');
      expect(invoice).toBeNull();
    });
  });

  describe('getInvoicesBySeller', () => {
    it('should return invoices by seller CUI', async () => {
      const invoiceData1 = createTestInvoice();
      const invoiceData2 = createTestInvoice();
      invoiceData2.invoiceNumber = 'B2C-2025-002';

      await service.createInvoice(invoiceData1);
      await service.createInvoice(invoiceData2);

      const invoices = service.getInvoicesBySeller('12345678');

      expect(invoices.length).toBe(2);
    });

    it('should return empty array for unknown seller', () => {
      const invoices = service.getInvoicesBySeller('99999999');
      expect(invoices.length).toBe(0);
    });
  });

  describe('getSubmissionHistory', () => {
    it('should return submission history', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);
      await service.submitToANAF(invoice.id);

      const history = service.getSubmissionHistory(invoice.id);

      expect(history.length).toBe(1);
      expect(history[0].success).toBe(true);
    });
  });

  describe('validateInvoice', () => {
    it('should validate correct invoice', async () => {
      const invoiceData = createTestInvoice();
      const invoice = await service.createInvoice(invoiceData);

      const validation = service.validateInvoice(invoice);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect missing seller CUI', async () => {
      const invoiceData = createTestInvoice();
      invoiceData.seller.cui = '';
      const invoice = await service.createInvoice(invoiceData);

      const validation = service.validateInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Seller CUI is required');
    });

    it('should detect missing buyer name', async () => {
      const invoiceData = createTestInvoice();
      invoiceData.buyer.name = '';
      const invoice = await service.createInvoice(invoiceData);

      const validation = service.validateInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Buyer name is required');
    });

    it('should detect empty items', async () => {
      const invoiceData = createTestInvoice();
      invoiceData.items = [];
      const invoice = await service.createInvoice(invoiceData);

      const validation = service.validateInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least one invoice item is required');
    });

    it('should detect mismatched totals', async () => {
      const invoiceData = createTestInvoice();
      invoiceData.netTotal = 999; // Wrong total
      const invoice = await service.createInvoice(invoiceData);

      const validation = service.validateInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Net total'))).toBe(true);
    });
  });

  describe('calculateRetentionExpiry', () => {
    it('should calculate 10-year retention', () => {
      const submissionDate = new Date('2025-01-01');
      const expiry = service.calculateRetentionExpiry(submissionDate);

      // 10 years * 365 days = 3650 days, accounting for leap years may vary slightly
      const yearDiff = expiry.getFullYear() - submissionDate.getFullYear();
      expect(yearDiff).toBeGreaterThanOrEqual(9);
      expect(yearDiff).toBeLessThanOrEqual(10);
    });
  });
});
