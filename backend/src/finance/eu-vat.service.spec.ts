import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { EuVatService, EUCountryVATRates, EUVATCalculation, VIESValidationResult } from './eu-vat.service';

describe('EuVatService', () => {
  let service: EuVatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EuVatService],
    }).compile();

    service = module.get<EuVatService>(EuVatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================
  // getAllCountries Tests
  // ========================
  describe('getAllCountries', () => {
    it('should return all 27 EU member states', () => {
      const countries = service.getAllCountries();
      expect(countries).toHaveLength(27);
    });

    it('should include Romania with correct VAT rates (Legea 141/2025)', () => {
      const countries = service.getAllCountries();
      const romania = countries.find(c => c.countryCode === 'RO');

      expect(romania).toBeDefined();
      expect(romania!.countryName).toBe('Romania');
      expect(romania!.standardRate).toBe(21); // Updated per Legea 141/2025
      expect(romania!.reducedRates).toContain(5);
      expect(romania!.reducedRates).toContain(11); // Updated per Legea 141/2025
      expect(romania!.currency).toBe('RON');
    });

    it('should include all Eurozone countries with EUR currency', () => {
      const countries = service.getAllCountries();
      const eurozoneCountries = ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];

      eurozoneCountries.forEach(code => {
        const country = countries.find(c => c.countryCode === code);
        expect(country).toBeDefined();
        expect(country!.currency).toBe('EUR');
      });
    });

    it('should include non-Eurozone countries with local currencies', () => {
      const countries = service.getAllCountries();

      const bulgaria = countries.find(c => c.countryCode === 'BG');
      expect(bulgaria!.currency).toBe('BGN');

      const czechia = countries.find(c => c.countryCode === 'CZ');
      expect(czechia!.currency).toBe('CZK');

      const denmark = countries.find(c => c.countryCode === 'DK');
      expect(denmark!.currency).toBe('DKK');

      const hungary = countries.find(c => c.countryCode === 'HU');
      expect(hungary!.currency).toBe('HUF');

      const poland = countries.find(c => c.countryCode === 'PL');
      expect(poland!.currency).toBe('PLN');

      const sweden = countries.find(c => c.countryCode === 'SE');
      expect(sweden!.currency).toBe('SEK');
    });
  });

  // ========================
  // getCountryRates Tests
  // ========================
  describe('getCountryRates', () => {
    it('should return rates for valid country code', () => {
      const rates = service.getCountryRates('RO');

      expect(rates.countryCode).toBe('RO');
      expect(rates.countryName).toBe('Romania');
      expect(rates.standardRate).toBe(21); // Updated per Legea 141/2025
    });

    it('should handle lowercase country codes', () => {
      const rates = service.getCountryRates('ro');
      expect(rates.countryCode).toBe('RO');
    });

    it('should throw error for invalid country code', () => {
      expect(() => service.getCountryRates('XX')).toThrow(HttpException);
      expect(() => service.getCountryRates('US')).toThrow(HttpException);
    });

    it('should return correct standard rates for all countries', () => {
      // Updated rates reflecting 2025 EU VAT rates
      const expectedRates: Record<string, number> = {
        HU: 27, // Hungary - highest in EU
        DK: 25, HR: 25, SE: 25,
        FI: 24, GR: 24,
        IE: 23, PL: 23, PT: 23,
        IT: 22, SI: 22, EE: 22,
        BE: 21, CZ: 21, ES: 21, LV: 21, LT: 21, NL: 21, RO: 21, // Romania updated per Legea 141/2025
        AT: 20, BG: 20, FR: 20, SK: 20,
        CY: 19, DE: 19,
        MT: 18,
        LU: 17, // Luxembourg - lowest standard rate in EU
      };

      Object.entries(expectedRates).forEach(([code, rate]) => {
        const country = service.getCountryRates(code);
        expect(country.standardRate).toBe(rate);
      });
    });
  });

  // ========================
  // calculateVAT Tests
  // ========================
  describe('calculateVAT', () => {
    describe('Standard Rate Calculations', () => {
      it('should calculate VAT correctly for Romania (21% per Legea 141/2025)', () => {
        const result = service.calculateVAT('RO', 1000, 'standard');

        expect(result.countryCode).toBe('RO');
        expect(result.netAmount).toBe(1000);
        expect(result.vatRate).toBe(21);
        expect(result.vatAmount).toBe(210);
        expect(result.grossAmount).toBe(1210);
        expect(result.currency).toBe('RON');
        expect(result.rateType).toBe('standard');
      });

      it('should calculate VAT correctly for Germany (19%)', () => {
        const result = service.calculateVAT('DE', 500, 'standard');

        expect(result.netAmount).toBe(500);
        expect(result.vatRate).toBe(19);
        expect(result.vatAmount).toBe(95);
        expect(result.grossAmount).toBe(595);
        expect(result.currency).toBe('EUR');
      });

      it('should calculate VAT correctly for Hungary (27% - highest EU rate)', () => {
        const result = service.calculateVAT('HU', 100, 'standard');

        expect(result.vatRate).toBe(27);
        expect(result.vatAmount).toBe(27);
        expect(result.grossAmount).toBe(127);
      });

      it('should calculate VAT correctly for Luxembourg (17% - lowest EU rate)', () => {
        const result = service.calculateVAT('LU', 100, 'standard');

        expect(result.vatRate).toBe(17);
        expect(result.vatAmount).toBe(17);
        expect(result.grossAmount).toBe(117);
      });
    });

    describe('Reduced Rate Calculations', () => {
      it('should calculate first reduced VAT for Romania (5% per Legea 141/2025)', () => {
        const result = service.calculateVAT('RO', 100, 'reduced', 0);

        expect(result.vatRate).toBe(5);
        expect(result.vatAmount).toBe(5);
        expect(result.grossAmount).toBe(105);
        expect(result.rateType).toBe('reduced');
      });

      it('should calculate second reduced VAT for Romania (11% per Legea 141/2025)', () => {
        const result = service.calculateVAT('RO', 100, 'reduced', 1);

        expect(result.vatRate).toBe(11);
        expect(result.vatAmount).toBe(11);
        expect(result.grossAmount).toBe(111);
      });

      it('should throw error for country without reduced rates', () => {
        expect(() => service.calculateVAT('DK', 100, 'reduced')).toThrow(HttpException);
      });
    });

    describe('Super Reduced Rate Calculations', () => {
      it('should calculate super-reduced VAT for Spain (4%)', () => {
        const result = service.calculateVAT('ES', 100, 'super_reduced');

        expect(result.vatRate).toBe(4);
        expect(result.vatAmount).toBe(4);
        expect(result.grossAmount).toBe(104);
        expect(result.rateType).toBe('super_reduced');
      });

      it('should calculate super-reduced VAT for France (2.1%)', () => {
        const result = service.calculateVAT('FR', 1000, 'super_reduced');

        expect(result.vatRate).toBe(2.1);
        expect(result.vatAmount).toBe(21);
        expect(result.grossAmount).toBe(1021);
      });

      it('should throw error for country without super-reduced rate', () => {
        expect(() => service.calculateVAT('RO', 100, 'super_reduced')).toThrow(HttpException);
      });
    });

    describe('Parking Rate Calculations', () => {
      it('should calculate parking VAT for Austria (13%)', () => {
        const result = service.calculateVAT('AT', 100, 'parking');

        expect(result.vatRate).toBe(13);
        expect(result.vatAmount).toBe(13);
        expect(result.grossAmount).toBe(113);
        expect(result.rateType).toBe('parking');
      });

      it('should throw error for country without parking rate', () => {
        expect(() => service.calculateVAT('RO', 100, 'parking')).toThrow(HttpException);
      });
    });

    describe('Zero Rate Calculations', () => {
      it('should calculate zero VAT for Belgium (zero-rated supply)', () => {
        const result = service.calculateVAT('BE', 100, 'zero');

        expect(result.vatRate).toBe(0);
        expect(result.vatAmount).toBe(0);
        expect(result.grossAmount).toBe(100);
        expect(result.rateType).toBe('zero');
      });

      it('should throw error for country without zero-rating', () => {
        expect(() => service.calculateVAT('AT', 100, 'zero')).toThrow(HttpException);
      });
    });

    describe('Gross Amount Calculations', () => {
      it('should calculate net from gross correctly for Romania', () => {
        const result = service.calculateVAT('RO', 1210, 'standard', 0, true);

        expect(result.grossAmount).toBe(1210);
        expect(result.netAmount).toBe(1000);
        expect(result.vatAmount).toBe(210);
      });

      it('should calculate net from gross for high VAT country (Hungary)', () => {
        const result = service.calculateVAT('HU', 127, 'standard', 0, true);

        expect(result.grossAmount).toBe(127);
        expect(result.netAmount).toBe(100);
        expect(result.vatAmount).toBe(27);
      });
    });

    describe('Rounding', () => {
      it('should round to 2 decimal places', () => {
        const result = service.calculateVAT('RO', 333.33, 'standard');

        // 333.33 * 0.21 = 70.00 (rounded)
        expect(result.vatAmount).toBe(70);
        expect(result.grossAmount).toBe(403.33);
      });
    });
  });

  // ========================
  // validateVATNumberFormat Tests
  // ========================
  describe('validateVATNumberFormat', () => {
    describe('Valid VAT Numbers', () => {
      it('should validate Romanian VAT number', () => {
        const result = service.validateVATNumberFormat('RO12345678');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('RO');
      });

      it('should validate German VAT number', () => {
        const result = service.validateVATNumberFormat('DE123456789');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('DE');
      });

      it('should validate Austrian VAT number', () => {
        const result = service.validateVATNumberFormat('ATU12345678');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('AT');
      });

      it('should validate Belgian VAT number', () => {
        const result = service.validateVATNumberFormat('BE0123456789');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('BE');
      });

      it('should validate French VAT number', () => {
        const result = service.validateVATNumberFormat('FR12345678901');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('FR');
      });

      it('should validate Dutch VAT number', () => {
        const result = service.validateVATNumberFormat('NL123456789B01');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('NL');
      });

      it('should validate Polish VAT number', () => {
        const result = service.validateVATNumberFormat('PL1234567890');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('PL');
      });

      it('should handle lowercase input', () => {
        const result = service.validateVATNumberFormat('ro12345678');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('RO');
      });

      it('should handle spaces in VAT number', () => {
        const result = service.validateVATNumberFormat('RO 1234 5678');
        expect(result.valid).toBe(true);
      });

      it('should handle Greek VAT number with EL prefix', () => {
        const result = service.validateVATNumberFormat('EL123456789');
        expect(result.valid).toBe(true);
        expect(result.countryCode).toBe('GR');
      });
    });

    describe('Invalid VAT Numbers', () => {
      it('should reject VAT number that is too short', () => {
        const result = service.validateVATNumberFormat('RO1');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too short');
      });

      it('should reject non-EU country code', () => {
        const result = service.validateVATNumberFormat('US123456789');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not a valid EU country code');
      });

      it('should reject invalid format for country', () => {
        const result = service.validateVATNumberFormat('DE12345'); // Too short for Germany
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid format');
      });
    });
  });

  // ========================
  // validateVIES Tests
  // ========================
  describe('validateVIES', () => {
    it('should return valid result for correctly formatted VAT number', async () => {
      const result = await service.validateVIES('RO12345678');

      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe('RO');
      expect(result.requestDate).toBeDefined();
    });

    it('should return invalid result for incorrectly formatted VAT number', async () => {
      const result = await service.validateVIES('XX123');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Greek EL prefix correctly', async () => {
      const result = await service.validateVIES('EL123456789');

      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe('GR');
    });
  });

  // ========================
  // determineIntraCommunityVAT Tests
  // ========================
  describe('determineIntraCommunityVAT', () => {
    it('should apply reverse charge for B2B cross-border goods', () => {
      const result = service.determineIntraCommunityVAT(
        'RO',
        'RO12345678',
        'DE',
        'DE123456789',
        true, // B2B
        false, // Goods
      );

      expect(result.isReverseCharge).toBe(true);
      expect(result.applicableVATRate).toBe(0);
      expect(result.placeOfSupply).toBe('DE');
    });

    it('should apply reverse charge for B2B cross-border services', () => {
      const result = service.determineIntraCommunityVAT(
        'RO',
        'RO12345678',
        'FR',
        'FR12345678901',
        true, // B2B
        true, // Services
      );

      expect(result.isReverseCharge).toBe(true);
      expect(result.applicableVATRate).toBe(0);
      expect(result.placeOfSupply).toBe('FR');
    });

    it('should apply destination VAT for B2C cross-border services', () => {
      const result = service.determineIntraCommunityVAT(
        'RO',
        'RO12345678',
        'DE',
        '',
        false, // B2C
        true, // Services
      );

      expect(result.isReverseCharge).toBe(false);
      expect(result.applicableVATRate).toBe(19); // German VAT rate
      expect(result.placeOfSupply).toBe('DE');
    });

    it('should apply origin VAT for domestic transaction', () => {
      const result = service.determineIntraCommunityVAT(
        'RO',
        'RO12345678',
        'RO',
        'RO87654321',
        true,
        false,
      );

      expect(result.isReverseCharge).toBe(false);
      expect(result.applicableVATRate).toBe(21); // Romanian VAT rate per Legea 141/2025
      expect(result.placeOfSupply).toBe('RO');
    });
  });

  // ========================
  // Edge Cases and Error Handling
  // ========================
  describe('Edge Cases', () => {
    it('should handle zero amount', () => {
      const result = service.calculateVAT('RO', 0, 'standard');

      expect(result.netAmount).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });

    it('should handle very large amounts', () => {
      const result = service.calculateVAT('RO', 1000000000, 'standard');

      expect(result.netAmount).toBe(1000000000);
      expect(result.vatAmount).toBe(210000000); // 21% of 1B
      expect(result.grossAmount).toBe(1210000000);
    });

    it('should handle decimal amounts correctly', () => {
      const result = service.calculateVAT('RO', 123.45, 'standard');

      expect(result.netAmount).toBe(123.45);
      expect(result.vatAmount).toBe(25.92); // 123.45 * 0.21 = 25.9245 rounded
      expect(result.grossAmount).toBe(149.37);
    });
  });
});
