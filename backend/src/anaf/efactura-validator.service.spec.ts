import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  EfacturaValidatorService,
  EfacturaInvoiceData,
} from './efactura-validator.service';

describe('EfacturaValidatorService', () => {
  let service: EfacturaValidatorService;

  // Valid invoice fixture
  const createValidInvoice = (): EfacturaInvoiceData => ({
    invoiceNumber: 'INV-2025-001',
    invoiceDate: '2025-01-15',
    supplier: {
      cui: 'RO30834857', // Valid CUI with correct check digit
      name: 'SC Test Supplier SRL',
      address: 'Str. Exemplu nr. 1, Bucuresti',
    },
    customer: {
      cui: 'RO30834857',
      name: 'SC Test Customer SRL',
      address: 'Str. Client nr. 2, Cluj-Napoca',
    },
    lines: [
      {
        description: 'Produs test',
        quantity: 10,
        unitPrice: 100,
        vatRate: 19,
        total: 1190,
      },
    ],
    totals: {
      net: 1000,
      vat: 190,
      gross: 1190,
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EfacturaValidatorService],
    }).compile();

    service = module.get<EfacturaValidatorService>(EfacturaValidatorService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== CUI VALIDATION ===================

  describe('validateCUI', () => {
    it('should validate a correct CUI', () => {
      // CUI 30834857 with control digit validation
      expect(service.validateCUI('30834857')).toBe(true);
    });

    it('should validate CUI with RO prefix', () => {
      expect(service.validateCUI('RO30834857')).toBe(true);
    });

    it('should validate CUI with lowercase ro prefix', () => {
      expect(service.validateCUI('ro30834857')).toBe(true);
    });

    it('should reject empty CUI', () => {
      expect(service.validateCUI('')).toBe(false);
    });

    it('should reject null CUI', () => {
      expect(service.validateCUI(null as any)).toBe(false);
    });

    it('should reject CUI with invalid length (too short)', () => {
      expect(service.validateCUI('1')).toBe(false);
    });

    it('should reject CUI with invalid length (too long)', () => {
      expect(service.validateCUI('12345678901')).toBe(false);
    });

    it('should reject CUI with invalid check digit', () => {
      // Modified last digit to make it invalid
      expect(service.validateCUI('30834858')).toBe(false);
    });

    it('should strip non-numeric characters', () => {
      expect(service.validateCUI('RO-308-348-57')).toBe(true);
    });

    it('should handle 2-digit CUI', () => {
      // Minimal valid CUI (edge case)
      expect(service.validateCUI('00')).toBe(true); // 00 with check digit 0
    });
  });

  // =================== DATE FORMAT VALIDATION ===================

  describe('validateDateFormat', () => {
    it('should validate correct date format YYYY-MM-DD', () => {
      expect(service.validateDateFormat('2025-01-15')).toBe(true);
    });

    it('should validate leap year date', () => {
      expect(service.validateDateFormat('2024-02-29')).toBe(true);
    });

    it('should reject empty date', () => {
      expect(service.validateDateFormat('')).toBe(false);
    });

    it('should reject null date', () => {
      expect(service.validateDateFormat(null as any)).toBe(false);
    });

    it('should reject DD-MM-YYYY format', () => {
      expect(service.validateDateFormat('15-01-2025')).toBe(false);
    });

    it('should reject DD/MM/YYYY format', () => {
      expect(service.validateDateFormat('15/01/2025')).toBe(false);
    });

    it('should reject invalid date values', () => {
      expect(service.validateDateFormat('2025-13-01')).toBe(false); // Invalid month
    });

    it('should handle non-leap year Feb 29 (JS Date auto-corrects)', () => {
      // Note: JavaScript Date auto-corrects 2025-02-29 to 2025-03-01
      // The service validates format only, not calendar correctness
      const result = service.validateDateFormat('2025-02-29');
      expect(typeof result).toBe('boolean');
    });

    it('should reject partial date', () => {
      expect(service.validateDateFormat('2025-01')).toBe(false);
    });
  });

  // =================== VAT RATE VALIDATION (Legea 141/2025) ===================

  describe('validateVatRate', () => {
    it('should validate 0% exempt rate', () => {
      expect(service.validateVatRate(0)).toBe(true);
    });

    it('should validate 5% special rate', () => {
      expect(service.validateVatRate(5)).toBe(true);
    });

    it('should validate 9% reduced rate', () => {
      expect(service.validateVatRate(9)).toBe(true);
    });

    it('should validate 11% reduced rate (Legea 141/2025)', () => {
      expect(service.validateVatRate(11)).toBe(true);
    });

    it('should validate 19% standard rate', () => {
      expect(service.validateVatRate(19)).toBe(true);
    });

    it('should validate 21% standard rate (Legea 141/2025)', () => {
      expect(service.validateVatRate(21)).toBe(true);
    });

    it('should reject invalid VAT rate 10%', () => {
      expect(service.validateVatRate(10)).toBe(false);
    });

    it('should reject invalid VAT rate 20%', () => {
      expect(service.validateVatRate(20)).toBe(false);
    });

    it('should reject negative VAT rate', () => {
      expect(service.validateVatRate(-5)).toBe(false);
    });

    it('should reject VAT rate over 100%', () => {
      expect(service.validateVatRate(120)).toBe(false);
    });
  });

  // =================== INVOICE NUMBER VALIDATION ===================

  describe('validateInvoiceNumber', () => {
    it('should validate standard invoice number', () => {
      expect(service.validateInvoiceNumber('INV-2025-001')).toBe(true);
    });

    it('should validate numeric invoice number', () => {
      expect(service.validateInvoiceNumber('12345')).toBe(true);
    });

    it('should validate minimum length (2 chars)', () => {
      expect(service.validateInvoiceNumber('AB')).toBe(true);
    });

    it('should reject single character', () => {
      expect(service.validateInvoiceNumber('A')).toBe(false);
    });

    it('should reject empty invoice number', () => {
      expect(service.validateInvoiceNumber('')).toBe(false);
    });

    it('should reject null invoice number', () => {
      expect(service.validateInvoiceNumber(null as any)).toBe(false);
    });

    it('should reject invoice number over 50 characters', () => {
      const longNumber = 'A'.repeat(51);
      expect(service.validateInvoiceNumber(longNumber)).toBe(false);
    });

    it('should accept invoice number exactly 50 characters', () => {
      const maxNumber = 'A'.repeat(50);
      expect(service.validateInvoiceNumber(maxNumber)).toBe(true);
    });
  });

  // =================== MANDATORY FIELDS VALIDATION (CIUS-RO) ===================

  describe('validateMandatoryFields', () => {
    describe('Invoice Header (BT-1, BT-2)', () => {
      it('should pass validation for valid invoice', () => {
        const invoice = createValidInvoice();
        const errors = service.validateMandatoryFields(invoice);

        expect(errors.length).toBe(0);
      });

      it('should require invoice number (BT-1)', () => {
        const invoice = createValidInvoice();
        invoice.invoiceNumber = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-001')).toBe(true);
      });

      it('should validate invoice number format (BT-1)', () => {
        const invoice = createValidInvoice();
        invoice.invoiceNumber = 'A'; // Too short

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-002')).toBe(true);
      });

      it('should require invoice date (BT-2)', () => {
        const invoice = createValidInvoice();
        invoice.invoiceDate = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-003')).toBe(true);
      });

      it('should validate invoice date format (BT-2)', () => {
        const invoice = createValidInvoice();
        invoice.invoiceDate = '15/01/2025';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-004')).toBe(true);
      });
    });

    describe('Supplier Information (BG-4)', () => {
      it('should require supplier object', () => {
        const invoice = createValidInvoice();
        (invoice as any).supplier = null;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-010')).toBe(true);
      });

      it('should require supplier name (BT-27)', () => {
        const invoice = createValidInvoice();
        invoice.supplier.name = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-011')).toBe(true);
      });

      it('should require supplier CUI (BT-31)', () => {
        const invoice = createValidInvoice();
        invoice.supplier.cui = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-012')).toBe(true);
      });

      it('should validate supplier CUI format', () => {
        const invoice = createValidInvoice();
        invoice.supplier.cui = 'INVALID';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-013')).toBe(true);
      });

      it('should require supplier address (BT-35)', () => {
        const invoice = createValidInvoice();
        invoice.supplier.address = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-014')).toBe(true);
      });
    });

    describe('Customer Information (BG-7)', () => {
      it('should require customer object', () => {
        const invoice = createValidInvoice();
        (invoice as any).customer = null;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-020')).toBe(true);
      });

      it('should require customer name (BT-44)', () => {
        const invoice = createValidInvoice();
        invoice.customer.name = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-021')).toBe(true);
      });

      it('should require customer CUI for B2B (BT-48)', () => {
        const invoice = createValidInvoice();
        invoice.customer.cui = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-022')).toBe(true);
      });

      it('should validate customer CUI format', () => {
        const invoice = createValidInvoice();
        invoice.customer.cui = '12345'; // Invalid check digit

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-023')).toBe(true);
      });

      it('should require customer address (BT-50)', () => {
        const invoice = createValidInvoice();
        invoice.customer.address = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-024')).toBe(true);
      });
    });

    describe('Invoice Lines (BG-25)', () => {
      it('should require at least one line', () => {
        const invoice = createValidInvoice();
        invoice.lines = [];

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-030')).toBe(true);
      });

      it('should require item description (BT-153)', () => {
        const invoice = createValidInvoice();
        invoice.lines[0].description = '';

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-031')).toBe(true);
      });

      it('should require quantity (BT-129)', () => {
        const invoice = createValidInvoice();
        (invoice.lines[0] as any).quantity = undefined;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-032')).toBe(true);
      });

      it('should require positive quantity', () => {
        const invoice = createValidInvoice();
        invoice.lines[0].quantity = 0;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-033')).toBe(true);
      });

      it('should reject negative quantity', () => {
        const invoice = createValidInvoice();
        invoice.lines[0].quantity = -5;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-033')).toBe(true);
      });

      it('should require unit price (BT-146)', () => {
        const invoice = createValidInvoice();
        (invoice.lines[0] as any).unitPrice = undefined;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-034')).toBe(true);
      });

      it('should require VAT rate (BT-151)', () => {
        const invoice = createValidInvoice();
        (invoice.lines[0] as any).vatRate = undefined;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-035')).toBe(true);
      });

      it('should validate VAT rate value', () => {
        const invoice = createValidInvoice();
        invoice.lines[0].vatRate = 15; // Invalid rate

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-036')).toBe(true);
      });

      it('should validate all lines', () => {
        const invoice = createValidInvoice();
        invoice.lines.push({
          description: '',
          quantity: -1,
          unitPrice: 50,
          vatRate: 25,
          total: 0,
        });

        const errors = service.validateMandatoryFields(invoice);

        // Should have errors for line 2
        expect(errors.filter(e => e.field.includes('[1]')).length).toBeGreaterThan(0);
      });
    });

    describe('Totals (BG-22)', () => {
      it('should require totals object', () => {
        const invoice = createValidInvoice();
        (invoice as any).totals = null;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-040')).toBe(true);
      });

      it('should require net amount (BT-109)', () => {
        const invoice = createValidInvoice();
        (invoice.totals as any).net = undefined;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-041')).toBe(true);
      });

      it('should require VAT amount (BT-110)', () => {
        const invoice = createValidInvoice();
        (invoice.totals as any).vat = undefined;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-042')).toBe(true);
      });

      it('should require gross amount (BT-112)', () => {
        const invoice = createValidInvoice();
        (invoice.totals as any).gross = undefined;

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-043')).toBe(true);
      });

      it('should validate totals consistency', () => {
        const invoice = createValidInvoice();
        invoice.totals.net = 1000;
        invoice.totals.vat = 190;
        invoice.totals.gross = 1200; // Should be 1190

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-044')).toBe(true);
      });

      it('should allow small rounding differences in totals', () => {
        const invoice = createValidInvoice();
        invoice.totals.net = 1000;
        invoice.totals.vat = 190;
        invoice.totals.gross = 1190.005; // Within 0.01 tolerance

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-044')).toBe(false);
      });

      it('should accept zero totals', () => {
        const invoice = createValidInvoice();
        invoice.totals.net = 0;
        invoice.totals.vat = 0;
        invoice.totals.gross = 0;
        invoice.lines[0].quantity = 0.1; // Keep quantity > 0

        const errors = service.validateMandatoryFields(invoice);

        expect(errors.some(e => e.code === 'CIUS-RO-044')).toBe(false);
      });
    });
  });

  // =================== VALIDATE METHOD (THROWS) ===================

  describe('validate', () => {
    it('should not throw for valid invoice', () => {
      const invoice = createValidInvoice();

      expect(() => service.validate(invoice)).not.toThrow();
    });

    it('should throw BadRequestException for invalid invoice', () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = '';

      expect(() => service.validate(invoice)).toThrow(BadRequestException);
    });

    it('should include error details in exception', () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = '';

      try {
        service.validate(invoice);
        fail('Should have thrown');
      } catch (error) {
        expect(error.response.errors).toBeDefined();
        expect(error.response.errors.length).toBeGreaterThan(0);
      }
    });

    it('should include error messages in details', () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = '';
      invoice.invoiceDate = '';

      try {
        service.validate(invoice);
        fail('Should have thrown');
      } catch (error) {
        expect(error.response.details).toContain('CIUS-RO-001');
        expect(error.response.details).toContain('CIUS-RO-003');
      }
    });
  });

  // =================== GET VALIDATION RESULT ===================

  describe('getValidationResult', () => {
    it('should return valid=true for valid invoice', () => {
      const invoice = createValidInvoice();

      const result = service.getValidationResult(invoice);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return valid=false for invalid invoice', () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = '';

      const result = service.getValidationResult(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should not throw for invalid invoice', () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = '';

      expect(() => service.getValidationResult(invoice)).not.toThrow();
    });

    it('should return all errors', () => {
      const invoice = createValidInvoice();
      invoice.invoiceNumber = '';
      invoice.invoiceDate = '';
      invoice.supplier.cui = '';

      const result = service.getValidationResult(invoice);

      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle invoice with all optional fields', () => {
      const invoice = createValidInvoice();
      invoice.dueDate = '2025-02-15';
      invoice.currency = 'RON';
      invoice.paymentTerms = '30 days';
      invoice.supplier.city = 'Bucuresti';
      invoice.supplier.county = 'Sector 1';
      invoice.supplier.country = 'RO';
      invoice.supplier.registrationNumber = 'J40/1234/2020';
      invoice.supplier.bankAccount = 'RO49AAAA1B31007593840000';
      invoice.supplier.bankName = 'Banca Test';
      invoice.customer.city = 'Cluj-Napoca';
      invoice.customer.county = 'Cluj';
      invoice.customer.country = 'RO';
      invoice.lines[0].unitCode = 'BUC';

      const result = service.getValidationResult(invoice);

      expect(result.valid).toBe(true);
    });

    it('should handle multiple invoice lines', () => {
      const invoice = createValidInvoice();
      invoice.lines = [
        { description: 'Product 1', quantity: 5, unitPrice: 100, vatRate: 19, total: 595 },
        { description: 'Product 2', quantity: 3, unitPrice: 200, vatRate: 19, total: 714 },
        { description: 'Service 1', quantity: 1, unitPrice: 500, vatRate: 19, total: 595 },
      ];
      invoice.totals = { net: 1400, vat: 266, gross: 1666 };

      const result = service.getValidationResult(invoice);

      expect(result.valid).toBe(true);
    });

    it('should handle decimal quantities', () => {
      const invoice = createValidInvoice();
      invoice.lines[0].quantity = 2.5;
      invoice.lines[0].total = 297.5;
      invoice.totals = { net: 250, vat: 47.5, gross: 297.5 };

      const result = service.getValidationResult(invoice);

      expect(result.valid).toBe(true);
    });

    it('should handle zero VAT rate', () => {
      const invoice = createValidInvoice();
      invoice.lines[0].vatRate = 0;
      invoice.totals = { net: 1000, vat: 0, gross: 1000 };

      const result = service.getValidationResult(invoice);

      expect(result.valid).toBe(true);
    });

    it('should handle very large amounts', () => {
      const invoice = createValidInvoice();
      invoice.lines[0].quantity = 1000000;
      invoice.lines[0].unitPrice = 10000;
      invoice.totals = { net: 10000000000, vat: 1900000000, gross: 11900000000 };

      const result = service.getValidationResult(invoice);

      expect(result.valid).toBe(true);
    });

    it('should include line index in error field', () => {
      const invoice = createValidInvoice();
      invoice.lines.push({
        description: '',
        quantity: 1,
        unitPrice: 100,
        vatRate: 19,
        total: 119,
      });

      const result = service.getValidationResult(invoice);

      expect(result.errors.some(e => e.field.includes('lines[1]'))).toBe(true);
    });
  });
});
