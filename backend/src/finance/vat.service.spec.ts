import { Test, TestingModule } from '@nestjs/testing';
import { VatService, VATCalculation } from './vat.service';

describe('VatService', () => {
  let service: VatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VatService],
    }).compile();

    service = module.get<VatService>(VatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateVAT - Legea 141/2025 Compliance', () => {
    describe('from net amount (default)', () => {
      it('should calculate 21% VAT (standard rate) correctly', () => {
        const result = service.calculateVAT(100, 21);
        expect(result.netAmount).toBe(100);
        expect(result.vatRate).toBe(21);
        expect(result.vatAmount).toBe(21);
        expect(result.grossAmount).toBe(121);
        expect(result.law).toContain('Legea 141/2025');
      });

      it('should calculate 11% VAT (reduced rate for food/medicine) correctly', () => {
        const result = service.calculateVAT(100, 11);
        expect(result.netAmount).toBe(100);
        expect(result.vatRate).toBe(11);
        expect(result.vatAmount).toBe(11);
        expect(result.grossAmount).toBe(111);
      });

      it('should calculate 5% VAT (social housing) correctly', () => {
        const result = service.calculateVAT(100, 5);
        expect(result.netAmount).toBe(100);
        expect(result.vatRate).toBe(5);
        expect(result.vatAmount).toBe(5);
        expect(result.grossAmount).toBe(105);
      });

      it('should handle 0% VAT (exports) correctly', () => {
        const result = service.calculateVAT(100, 0);
        expect(result.netAmount).toBe(100);
        expect(result.vatRate).toBe(0);
        expect(result.vatAmount).toBe(0);
        expect(result.grossAmount).toBe(100);
      });

      it('should round to 2 decimal places', () => {
        const result = service.calculateVAT(33.33, 21);
        expect(result.vatAmount).toBe(7);
        expect(result.grossAmount).toBe(40.33);
      });
    });

    describe('from gross amount (isGross=true)', () => {
      it('should extract VAT from gross 21% correctly', () => {
        const result = service.calculateVAT(121, 21, true);
        expect(result.grossAmount).toBe(121);
        expect(result.netAmount).toBe(100);
        expect(result.vatAmount).toBe(21);
      });

      it('should extract VAT from gross 11% correctly', () => {
        const result = service.calculateVAT(111, 11, true);
        expect(result.grossAmount).toBe(111);
        expect(result.netAmount).toBe(100);
        expect(result.vatAmount).toBe(11);
      });

      it('should handle large amounts correctly', () => {
        const result = service.calculateVAT(12100000, 21, true);
        expect(result.grossAmount).toBe(12100000);
        expect(result.netAmount).toBe(10000000);
        expect(result.vatAmount).toBe(2100000);
      });
    });
  });

  describe('getApplicableRate - Category Classification', () => {
    it('should return 11% for food category (Romanian)', () => {
      expect(service.getApplicableRate('alimente')).toBe(11);
    });

    it('should return 11% for food category (English)', () => {
      expect(service.getApplicableRate('food')).toBe(11);
    });

    it('should return 11% for medicine (Romanian)', () => {
      expect(service.getApplicableRate('medicamente')).toBe(11);
    });

    it('should return 11% for medicine (English)', () => {
      expect(service.getApplicableRate('medicine')).toBe(11);
    });

    it('should return 11% for books (Romanian)', () => {
      expect(service.getApplicableRate('carti')).toBe(11);
    });

    it('should return 11% for books (English)', () => {
      expect(service.getApplicableRate('books')).toBe(11);
    });

    it('should return 11% for newspapers (Romanian)', () => {
      expect(service.getApplicableRate('ziare')).toBe(11);
    });

    it('should return 21% for standard goods', () => {
      expect(service.getApplicableRate('electronics')).toBe(21);
      expect(service.getApplicableRate('services')).toBe(21);
      expect(service.getApplicableRate('general')).toBe(21);
    });

    it('should be case insensitive', () => {
      expect(service.getApplicableRate('FOOD')).toBe(11);
      expect(service.getApplicableRate('Food')).toBe(11);
      expect(service.getApplicableRate('ALIMENTE')).toBe(11);
    });
  });

  describe('calculateVATPayable - VAT Settlement', () => {
    it('should calculate VAT payable when collected > deductible', () => {
      const result = service.calculateVATPayable(1000, 800);
      expect(result.vatPayable).toBe(200);
      expect(result.isRefund).toBe(false);
    });

    it('should indicate refund when deductible > collected', () => {
      const result = service.calculateVATPayable(800, 1000);
      expect(result.vatPayable).toBe(-200);
      expect(result.isRefund).toBe(true);
    });

    it('should return zero when balanced', () => {
      const result = service.calculateVATPayable(1000, 1000);
      expect(result.vatPayable).toBe(0);
      expect(result.isRefund).toBe(false);
    });

    it('should round to 2 decimal places', () => {
      const result = service.calculateVATPayable(100.555, 50.333);
      expect(result.vatPayable).toBe(50.22);
    });
  });

  describe('Real-world scenarios', () => {
    it('should correctly process a typical invoice with 21% VAT', () => {
      // Invoice for 1000 RON net, services
      const result = service.calculateVAT(1000, 21);
      expect(result.grossAmount).toBe(1210);
      expect(result.vatAmount).toBe(210);
    });

    it('should correctly process food invoice with 11% VAT', () => {
      // Restaurant invoice 500 RON gross
      const result = service.calculateVAT(500, 11, true);
      expect(result.netAmount).toBe(450.45);
      expect(result.vatAmount).toBe(49.55);
    });

    it('should correctly calculate quarterly VAT settlement', () => {
      // Q4 2025: Collected 50,000 RON VAT, Deductible 35,000 RON
      const result = service.calculateVATPayable(50000, 35000);
      expect(result.vatPayable).toBe(15000);
      expect(result.isRefund).toBe(false);
    });
  });
});
