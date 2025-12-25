import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DynamicVATService,
  VATCategory,
  VATRateType,
} from './dynamic-vat.service';

describe('DynamicVATService', () => {
  let service: DynamicVATService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicVATService, EventEmitter2],
    }).compile();

    service = module.get<DynamicVATService>(DynamicVATService);
    await service.onModuleInit();
  });

  describe('Romanian VAT Rates (Legea 141/2025)', () => {
    it('should return 21% standard rate for Romania', () => {
      const rate = service.getStandardRate('RO');

      expect(rate).not.toBeNull();
      expect(rate?.rate).toBe(21);
      expect(rate?.type).toBe(VATRateType.STANDARD);
    });

    it('should return 11% reduced rate for food/beverages', () => {
      const rate = service.getApplicableRate('RO', VATCategory.FOOD_BEVERAGES);

      expect(rate).not.toBeNull();
      expect(rate?.rate).toBe(11);
      expect(rate?.type).toBe(VATRateType.REDUCED);
    });

    it('should return 11% reduced rate for accommodation', () => {
      const rate = service.getApplicableRate('RO', VATCategory.ACCOMMODATION);

      expect(rate).not.toBeNull();
      expect(rate?.rate).toBe(11);
    });

    it('should return 11% reduced rate for books/publications', () => {
      const rate = service.getApplicableRate('RO', VATCategory.BOOKS_PUBLICATIONS);

      expect(rate).not.toBeNull();
      expect(rate?.rate).toBe(11);
    });

    it('should return 11% reduced rate for medical/pharma', () => {
      const rate = service.getApplicableRate('RO', VATCategory.MEDICAL_PHARMA);

      expect(rate).not.toBeNull();
      expect(rate?.rate).toBe(11);
    });

    it('should return 0% for exports', () => {
      const rate = service.getApplicableRate('RO', VATCategory.EXPORTS);

      expect(rate).not.toBeNull();
      expect(rate?.rate).toBe(0);
      expect(rate?.type).toBe(VATRateType.ZERO);
    });

    it('should return exempt for financial services', () => {
      const rate = service.getApplicableRate('RO', VATCategory.FINANCIAL_SERVICES);

      expect(rate).not.toBeNull();
      expect(rate?.type).toBe(VATRateType.EXEMPT);
    });

    it('should get Romanian rates summary', () => {
      const summary = service.getRomanianRatesSummary();

      expect(summary.standard).toBe(21);
      expect(summary.reduced).toBe(11);
      expect(summary.legalReference).toContain('Legea 141/2025');
    });
  });

  describe('EU-27 Country Configurations', () => {
    it('should have configurations for all EU countries', () => {
      const configs = service.getAllCountryConfigs();
      expect(configs.length).toBeGreaterThanOrEqual(27);
    });

    it('should return correct rate for Germany', () => {
      const rate = service.getStandardRate('DE');
      expect(rate?.rate).toBe(19);
    });

    it('should return correct rate for France', () => {
      const rate = service.getStandardRate('FR');
      expect(rate?.rate).toBe(20);
    });

    it('should return correct rate for Hungary (highest in EU)', () => {
      const rate = service.getStandardRate('HU');
      expect(rate?.rate).toBe(27);
    });

    it('should return correct rate for Luxembourg (lowest in EU)', () => {
      const rate = service.getStandardRate('LU');
      expect(rate?.rate).toBe(17);
    });

    it('should identify EU countries', () => {
      expect(service.isEUCountry('RO')).toBe(true);
      expect(service.isEUCountry('DE')).toBe(true);
      expect(service.isEUCountry('US')).toBe(false);
      expect(service.isEUCountry('UK')).toBe(false);
    });
  });

  describe('VAT Calculation', () => {
    it('should calculate VAT correctly for standard rate', () => {
      const calc = service.calculateVAT(1000, 'RO', VATCategory.GENERAL_GOODS);

      expect(calc.netAmount).toBe(1000);
      expect(calc.vatRate).toBe(21);
      expect(calc.vatAmount).toBe(210);
      expect(calc.grossAmount).toBe(1210);
    });

    it('should calculate VAT correctly for reduced rate', () => {
      const calc = service.calculateVAT(100, 'RO', VATCategory.FOOD_BEVERAGES);

      expect(calc.netAmount).toBe(100);
      expect(calc.vatRate).toBe(11);
      expect(calc.vatAmount).toBe(11);
      expect(calc.grossAmount).toBe(111);
    });

    it('should apply reverse charge for intra-EU B2B', () => {
      const calc = service.calculateVAT(1000, 'RO', VATCategory.GENERAL_GOODS, {
        isB2B: true,
        buyerCountry: 'DE',
        buyerVATNumber: 'DE123456789',
      });

      expect(calc.vatRate).toBe(0);
      expect(calc.vatType).toBe(VATRateType.REVERSE_CHARGE);
      expect(calc.reverseCharge).toBe(true);
      expect(calc.grossAmount).toBe(1000);
    });

    it('should NOT apply reverse charge for same-country B2B', () => {
      const calc = service.calculateVAT(1000, 'RO', VATCategory.GENERAL_GOODS, {
        isB2B: true,
        buyerCountry: 'RO',
        buyerVATNumber: 'RO12345678',
      });

      expect(calc.vatRate).toBe(21);
      expect(calc.reverseCharge).toBe(false);
    });

    it('should handle zero-rate exports', () => {
      const calc = service.calculateVAT(5000, 'RO', VATCategory.EXPORTS);

      expect(calc.vatRate).toBe(0);
      expect(calc.vatType).toBe(VATRateType.ZERO);
      expect(calc.grossAmount).toBe(5000);
    });
  });

  describe('Reverse VAT Calculation', () => {
    it('should calculate net from gross correctly', () => {
      const calc = service.calculateVATFromGross(1210, 'RO', VATCategory.GENERAL_GOODS);

      expect(calc.grossAmount).toBe(1210);
      expect(calc.vatRate).toBe(21);
      expect(calc.netAmount).toBe(1000);
      expect(calc.vatAmount).toBe(210);
    });

    it('should handle reduced rate reverse calculation', () => {
      const calc = service.calculateVATFromGross(111, 'RO', VATCategory.FOOD_BEVERAGES);

      expect(calc.grossAmount).toBe(111);
      expect(calc.vatRate).toBe(11);
      expect(calc.netAmount).toBe(100);
      expect(calc.vatAmount).toBe(11);
    });
  });

  describe('VAT Number Validation', () => {
    it('should validate Romanian VAT number format', () => {
      const result = service.validateVATNumberFormat('RO12345678');

      expect(result.valid).toBe(true);
      expect(result.country).toBe('RO');
    });

    it('should validate German VAT number format', () => {
      const result = service.validateVATNumberFormat('DE123456789');

      expect(result.valid).toBe(true);
      expect(result.country).toBe('DE');
    });

    it('should reject invalid VAT number', () => {
      const result = service.validateVATNumberFormat('XX123');

      expect(result.valid).toBe(false);
    });

    it('should handle VAT numbers with spaces', () => {
      const result = service.validateVATNumberFormat('RO 12345678');

      expect(result.valid).toBe(true);
    });
  });

  describe('Country Rates', () => {
    it('should return all rates for a country', () => {
      const rates = service.getCountryRates('RO');

      expect(rates.length).toBeGreaterThan(0);
      expect(rates.some(r => r.type === VATRateType.STANDARD)).toBe(true);
      expect(rates.some(r => r.type === VATRateType.REDUCED)).toBe(true);
    });

    it('should return country configuration', () => {
      const config = service.getCountryConfig('RO');

      expect(config).not.toBeNull();
      expect(config?.standardRate).toBe(21);
      expect(config?.reducedRates).toContain(11);
      expect(config?.currencyCode).toBe('RON');
    });
  });

  describe('Rate Management', () => {
    it('should create new VAT rate', () => {
      const rate = service.createVATRate({
        country: 'RO',
        type: VATRateType.REDUCED,
        category: VATCategory.CULTURAL_EVENTS,
        rate: 11,
        effectiveFrom: new Date(),
      });

      expect(rate.id).toBeDefined();
      expect(rate.isActive).toBe(true);
    });

    it('should update VAT rate', () => {
      const rates = service.getCountryRates('RO');
      const rateToUpdate = rates[0];

      const updated = service.updateVATRate(rateToUpdate.id, {
        notes: 'Updated note',
      });

      expect(updated?.notes).toBe('Updated note');
    });

    it('should deactivate VAT rate', () => {
      const rate = service.createVATRate({
        country: 'RO',
        type: VATRateType.REDUCED,
        category: VATCategory.TRANSPORT,
        rate: 11,
        effectiveFrom: new Date(),
      });

      const result = service.deactivateVATRate(rate.id);
      expect(result).toBe(true);
    });

    it('should return rate history', () => {
      const history = service.getVATRateHistory('RO', VATCategory.GENERAL_GOODS);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].country).toBe('RO');
    });
  });
});
