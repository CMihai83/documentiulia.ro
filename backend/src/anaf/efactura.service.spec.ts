import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EfacturaService } from './efactura.service';
import { EfacturaValidatorService } from './efactura-validator.service';

describe('EfacturaService - ANAF e-Factura Compliance', () => {
  let service: EfacturaService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        ANAF_EFACTURA_URL: 'https://api.anaf.ro/efactura',
        ANAF_API_KEY: 'test-api-key',
      };
      return config[key];
    }),
  };

  const mockValidatorService = {
    validate: jest.fn(),
    validateMandatoryFields: jest.fn().mockReturnValue([]),
    getValidationResult: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    validateCUI: jest.fn().mockReturnValue(true),
    validateDateFormat: jest.fn().mockReturnValue(true),
    validateVatRate: jest.fn().mockReturnValue(true),
    validateInvoiceNumber: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EfacturaService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EfacturaValidatorService, useValue: mockValidatorService },
      ],
    }).compile();

    service = module.get<EfacturaService>(EfacturaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUBL - UBL 2.1 Compliance', () => {
    const mockInvoice = {
      invoiceNumber: 'INV-2025-001',
      invoiceDate: '2025-01-15',
      supplier: {
        cui: '12345678',
        name: 'Supplier SRL',
        address: 'Str. Test 1, Bucuresti',
      },
      customer: {
        cui: '87654321',
        name: 'Customer SRL',
        address: 'Str. Client 2, Cluj',
      },
      lines: [
        {
          description: 'Servicii consultanta',
          quantity: 10,
          unitPrice: 100,
          vatRate: 21,
          total: 1000,
        },
        {
          description: 'Produse alimentare',
          quantity: 5,
          unitPrice: 50,
          vatRate: 11,
          total: 250,
        },
      ],
      totals: {
        net: 1250,
        vat: 237.50,
        gross: 1487.50,
      },
    };

    it('should generate valid UBL 2.1 XML', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toBeDefined();
      expect(typeof xml).toBe('string');
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should include UBL Invoice namespace', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
    });

    it('should include Romanian CIUS customization ID', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1');
    });

    it('should include invoice number', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:ID>INV-2025-001</cbc:ID>');
    });

    it('should include issue date', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:IssueDate>2025-01-15</cbc:IssueDate>');
    });

    it('should use invoice type code 380 (commercial invoice)', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>');
    });

    it('should use RON currency', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>');
    });

    it('should include supplier party with RO prefix', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('AccountingSupplierParty');
      expect(xml).toContain('<cbc:Name>Supplier SRL</cbc:Name>');
      expect(xml).toContain('<cbc:CompanyID>RO12345678</cbc:CompanyID>');
    });

    it('should include customer party with RO prefix', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('AccountingCustomerParty');
      expect(xml).toContain('<cbc:Name>Customer SRL</cbc:Name>');
      expect(xml).toContain('<cbc:CompanyID>RO87654321</cbc:CompanyID>');
    });

    it('should include tax total', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('TaxTotal');
      expect(xml).toContain('237.50');
    });

    it('should include legal monetary totals', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('LegalMonetaryTotal');
      expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="RON">1250.00</cbc:TaxExclusiveAmount>');
      expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="RON">1487.50</cbc:TaxInclusiveAmount>');
      expect(xml).toContain('<cbc:PayableAmount currencyID="RON">1487.50</cbc:PayableAmount>');
    });

    it('should include invoice lines with correct IDs', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:ID>1</cbc:ID>');
      expect(xml).toContain('<cbc:ID>2</cbc:ID>');
    });

    it('should include line descriptions', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:Name>Servicii consultanta</cbc:Name>');
      expect(xml).toContain('<cbc:Name>Produse alimentare</cbc:Name>');
    });

    it('should include quantity with C62 unit code', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:InvoicedQuantity unitCode="C62">10</cbc:InvoicedQuantity>');
      expect(xml).toContain('<cbc:InvoicedQuantity unitCode="C62">5</cbc:InvoicedQuantity>');
    });

    it('should include line extension amounts', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:LineExtensionAmount currencyID="RON">1000.00</cbc:LineExtensionAmount>');
      expect(xml).toContain('<cbc:LineExtensionAmount currencyID="RON">250.00</cbc:LineExtensionAmount>');
    });

    it('should include VAT rates per Legea 141/2025', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:Percent>21</cbc:Percent>');
      expect(xml).toContain('<cbc:Percent>11</cbc:Percent>');
    });

    it('should include unit prices', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:PriceAmount currencyID="RON">100.00</cbc:PriceAmount>');
      expect(xml).toContain('<cbc:PriceAmount currencyID="RON">50.00</cbc:PriceAmount>');
    });

    it('should use VAT tax scheme', () => {
      const xml = service.generateUBL(mockInvoice);

      const vatSchemeCount = (xml.match(/<cbc:ID>VAT<\/cbc:ID>/g) || []).length;
      expect(vatSchemeCount).toBeGreaterThanOrEqual(2);
    });

    it('should use S (standard) tax category', () => {
      const xml = service.generateUBL(mockInvoice);

      expect(xml).toContain('<cbc:ID>S</cbc:ID>');
    });
  });

  describe('UBL edge cases', () => {
    it('should handle single line invoice', () => {
      const singleLineInvoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: '2025-01-01',
        supplier: { cui: '11111111', name: 'Test', address: 'Test' },
        customer: { cui: '22222222', name: 'Client', address: 'Client' },
        lines: [
          { description: 'Item', quantity: 1, unitPrice: 100, vatRate: 21, total: 100 },
        ],
        totals: { net: 100, vat: 21, gross: 121 },
      };

      const xml = service.generateUBL(singleLineInvoice);
      const lineCount = (xml.match(/InvoiceLine/g) || []).length;
      expect(lineCount).toBe(2); // Opening and closing tags
    });

    it('should handle zero VAT rate', () => {
      const zeroVatInvoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: '2025-01-01',
        supplier: { cui: '11111111', name: 'Test', address: 'Test' },
        customer: { cui: '22222222', name: 'Client', address: 'Client' },
        lines: [
          { description: 'Export item', quantity: 1, unitPrice: 1000, vatRate: 0, total: 1000 },
        ],
        totals: { net: 1000, vat: 0, gross: 1000 },
      };

      const xml = service.generateUBL(zeroVatInvoice);
      expect(xml).toContain('<cbc:Percent>0</cbc:Percent>');
      expect(xml).toContain('<cbc:TaxAmount currencyID="RON">0.00</cbc:TaxAmount>');
    });

    it('should handle 5% reduced VAT rate', () => {
      const reducedVatInvoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: '2025-01-01',
        supplier: { cui: '11111111', name: 'Test', address: 'Test' },
        customer: { cui: '22222222', name: 'Client', address: 'Client' },
        lines: [
          { description: 'Books', quantity: 10, unitPrice: 50, vatRate: 5, total: 500 },
        ],
        totals: { net: 500, vat: 25, gross: 525 },
      };

      const xml = service.generateUBL(reducedVatInvoice);
      expect(xml).toContain('<cbc:Percent>5</cbc:Percent>');
    });

    it('should format decimal amounts correctly', () => {
      const decimalInvoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: '2025-01-01',
        supplier: { cui: '11111111', name: 'Test', address: 'Test' },
        customer: { cui: '22222222', name: 'Client', address: 'Client' },
        lines: [
          { description: 'Item', quantity: 3, unitPrice: 33.33, vatRate: 21, total: 99.99 },
        ],
        totals: { net: 99.99, vat: 21.00, gross: 120.99 },
      };

      const xml = service.generateUBL(decimalInvoice);
      expect(xml).toContain('99.99');
      expect(xml).toContain('33.33');
    });
  });

  describe('CIUS-RO compliance', () => {
    it('should include CAC namespace for aggregate components', () => {
      const invoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: '2025-01-01',
        supplier: { cui: '11111111', name: 'Test', address: 'Test' },
        customer: { cui: '22222222', name: 'Client', address: 'Client' },
        lines: [
          { description: 'Item', quantity: 1, unitPrice: 100, vatRate: 21, total: 100 },
        ],
        totals: { net: 100, vat: 21, gross: 121 },
      };

      const xml = service.generateUBL(invoice);
      expect(xml).toContain('xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"');
    });

    it('should include CBC namespace for basic components', () => {
      const invoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: '2025-01-01',
        supplier: { cui: '11111111', name: 'Test', address: 'Test' },
        customer: { cui: '22222222', name: 'Client', address: 'Client' },
        lines: [
          { description: 'Item', quantity: 1, unitPrice: 100, vatRate: 21, total: 100 },
        ],
        totals: { net: 100, vat: 21, gross: 121 },
      };

      const xml = service.generateUBL(invoice);
      expect(xml).toContain('xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"');
    });
  });
});
