import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import {
  TaxComplianceService,
  EU_TAX_CONFIGS,
  NON_EU_TAX_CONFIGS,
} from './tax-compliance.service';

describe('TaxComplianceService', () => {
  let service: TaxComplianceService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxComplianceService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TaxComplianceService>(TaxComplianceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have EU country configs', () => {
      const countries = service.getSupportedCountries();
      expect(countries.length).toBeGreaterThan(10);
    });

    it('should include Romania in EU countries', () => {
      const euCountries = service.getEUCountries();
      expect(euCountries).toContain('RO');
    });
  });

  describe('tax calculation', () => {
    it('should calculate domestic B2C transaction in Romania', () => {
      const result = service.calculateTax({
        amount: 1000,
        currency: 'RON',
        sellerCountry: 'RO',
        buyerCountry: 'RO',
        transactionType: 'B2C',
      });

      expect(result.netAmount).toBe(1000);
      expect(result.taxRate).toBe(19);
      expect(result.taxAmount).toBe(190);
      expect(result.grossAmount).toBe(1190);
      expect(result.reverseCharge).toBe(false);
    });

    it('should calculate domestic B2C transaction in Germany', () => {
      const result = service.calculateTax({
        amount: 1000,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'DE',
        transactionType: 'B2C',
      });

      expect(result.taxRate).toBe(19);
      expect(result.taxAmount).toBe(190);
    });

    it('should calculate domestic B2C transaction in Hungary (highest EU rate)', () => {
      const result = service.calculateTax({
        amount: 1000,
        currency: 'HUF',
        sellerCountry: 'HU',
        buyerCountry: 'HU',
        transactionType: 'B2C',
      });

      expect(result.taxRate).toBe(27);
      expect(result.taxAmount).toBe(270);
    });

    it('should apply reduced rate for food in Germany', () => {
      const result = service.calculateTax({
        amount: 1000,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'DE',
        transactionType: 'B2C',
        category: 'food',
      });

      expect(result.taxRate).toBe(7);
      expect(result.taxAmount).toBe(70);
    });

    it('should apply reduced rate for hospitality in Romania', () => {
      const result = service.calculateTax({
        amount: 1000,
        currency: 'RON',
        sellerCountry: 'RO',
        buyerCountry: 'RO',
        transactionType: 'B2C',
        category: 'hospitality',
      });

      expect(result.taxRate).toBe(9);
      expect(result.taxAmount).toBe(90);
    });

    it('should exempt medical services', () => {
      const result = service.calculateTax({
        amount: 1000,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'DE',
        transactionType: 'B2C',
        category: 'medical_services',
      });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
    });
  });

  describe('intra-EU B2B transactions', () => {
    it('should apply reverse charge for intra-EU B2B with valid VAT', () => {
      const result = service.calculateTax({
        amount: 10000,
        currency: 'EUR',
        sellerCountry: 'RO',
        buyerCountry: 'DE',
        buyerTaxNumber: 'DE123456789',
        transactionType: 'B2B',
      });

      expect(result.reverseCharge).toBe(true);
      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
    });

    it('should not apply reverse charge for domestic B2B', () => {
      const result = service.calculateTax({
        amount: 10000,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'DE',
        buyerTaxNumber: 'DE123456789',
        transactionType: 'B2B',
      });

      expect(result.reverseCharge).toBe(false);
      expect(result.taxRate).toBe(19);
    });

    it('should charge tax for intra-EU B2B without VAT number', () => {
      const result = service.calculateTax({
        amount: 10000,
        currency: 'EUR',
        sellerCountry: 'RO',
        buyerCountry: 'DE',
        transactionType: 'B2B',
      });

      expect(result.reverseCharge).toBe(false);
      expect(result.taxRate).toBeGreaterThan(0);
    });
  });

  describe('exports to non-EU', () => {
    it('should zero-rate exports to UK', () => {
      const result = service.calculateTax({
        amount: 5000,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'GB',
        transactionType: 'B2B',
      });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
    });

    it('should zero-rate exports to US', () => {
      const result = service.calculateTax({
        amount: 5000,
        currency: 'EUR',
        sellerCountry: 'FR',
        buyerCountry: 'US',
        transactionType: 'B2C',
      });

      expect(result.taxRate).toBe(0);
    });

    it('should zero-rate exports to Switzerland', () => {
      const result = service.calculateTax({
        amount: 5000,
        currency: 'EUR',
        sellerCountry: 'AT',
        buyerCountry: 'CH',
        transactionType: 'B2C',
      });

      expect(result.taxRate).toBe(0);
    });
  });

  describe('digital services (OSS)', () => {
    it('should apply OSS for B2C digital services across EU', () => {
      const result = service.calculateTax({
        amount: 100,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'FR',
        transactionType: 'B2C',
        isDigitalService: true,
      });

      expect(result.ossApplicable).toBe(true);
      expect(result.placeOfTaxation).toBe('FR');
      expect(result.taxRate).toBe(20); // French VAT
    });

    it('should tax at destination for B2C digital services', () => {
      const result = service.calculateTax({
        amount: 100,
        currency: 'EUR',
        sellerCountry: 'RO',
        buyerCountry: 'IT',
        transactionType: 'B2C',
        isDigitalService: true,
      });

      expect(result.taxRate).toBe(22); // Italian VAT
    });

    it('should not apply OSS for B2B digital services', () => {
      const result = service.calculateTax({
        amount: 100,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'FR',
        buyerTaxNumber: 'FR12345678901',
        transactionType: 'B2B',
        isDigitalService: true,
      });

      expect(result.ossApplicable).toBe(false);
    });
  });

  describe('tax number validation', () => {
    it('should validate Romanian VAT number format', async () => {
      const result = await service.validateTaxNumber('RO12345678');

      expect(result.valid).toBe(true);
      expect(result.country).toBe('RO');
      expect(result.countryName).toBe('Romania');
    });

    it('should validate German VAT number format', async () => {
      const result = await service.validateTaxNumber('DE123456789');

      expect(result.valid).toBe(true);
      expect(result.country).toBe('DE');
    });

    it('should reject invalid VAT number format', async () => {
      const result = await service.validateTaxNumber('INVALID123');

      expect(result.valid).toBe(false);
    });

    it('should validate French VAT number format', async () => {
      const result = await service.validateTaxNumber('FRXX123456789');

      expect(result.valid).toBe(true);
      expect(result.country).toBe('FR');
    });

    it('should validate UK VAT number format', async () => {
      const result = await service.validateTaxNumber('GB123456789');

      expect(result.valid).toBe(true);
      expect(result.country).toBe('GB');
    });

    it('should handle whitespace in VAT number', async () => {
      const result = await service.validateTaxNumber('RO 1234 5678');

      expect(result.valid).toBe(true);
      expect(result.taxNumber).toBe('RO12345678');
    });
  });

  describe('country configuration', () => {
    it('should return config for Romania', () => {
      const config = service.getCountryConfig('RO');

      expect(config).toBeDefined();
      expect(config?.name).toBe('Romania');
      expect(config?.standardRate).toBe(19);
      expect(config?.currency).toBe('RON');
    });

    it('should return null for unknown country', () => {
      const config = service.getCountryConfig('XX');
      expect(config).toBeNull();
    });

    it('should return tax rates for a country', () => {
      const rates = service.getTaxRates('DE');

      expect(rates).toBeDefined();
      expect(rates?.standard).toBe(19);
      expect(rates?.reduced.length).toBeGreaterThan(0);
    });

    it('should identify EU countries', () => {
      expect(service.isEUCountry('RO')).toBe(true);
      expect(service.isEUCountry('DE')).toBe(true);
      expect(service.isEUCountry('GB')).toBe(false);
      expect(service.isEUCountry('US')).toBe(false);
    });

    it('should check intra-EU transactions', () => {
      expect(service.isIntraEUTransaction('RO', 'DE')).toBe(true);
      expect(service.isIntraEUTransaction('DE', 'FR')).toBe(true);
      expect(service.isIntraEUTransaction('RO', 'GB')).toBe(false);
      expect(service.isIntraEUTransaction('US', 'GB')).toBe(false);
    });
  });

  describe('exemptions', () => {
    it('should add an exemption', () => {
      const exemption = service.addExemption({
        type: 'category',
        country: 'RO',
        description: 'Test exemption',
        conditions: { category: 'test' },
        validFrom: new Date(),
      });

      expect(exemption.id).toBeDefined();
      expect(exemption.type).toBe('category');
    });

    it('should get all exemptions', () => {
      service.addExemption({
        type: 'category',
        country: 'RO',
        description: 'Test 1',
        conditions: {},
        validFrom: new Date(),
      });

      service.addExemption({
        type: 'entity',
        country: 'DE',
        description: 'Test 2',
        conditions: {},
        validFrom: new Date(),
      });

      const exemptions = service.getExemptions();
      expect(exemptions.length).toBe(2);
    });

    it('should remove an exemption', () => {
      const exemption = service.addExemption({
        type: 'category',
        country: 'RO',
        description: 'To remove',
        conditions: {},
        validFrom: new Date(),
      });

      const removed = service.removeExemption(exemption.id);
      expect(removed).toBe(true);
      expect(service.getExemptions().length).toBe(0);
    });

    it('should return false for non-existent exemption', () => {
      const removed = service.removeExemption('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('reporting', () => {
    it('should generate report template', () => {
      const report = service.generateReportTemplate('RO', {
        start: new Date('2024-01-01'),
        end: new Date('2024-03-31'),
      });

      expect(report.country).toBe('RO');
      expect(report.taxType).toBe('VAT');
      expect(report.totalSales).toBe(0);
    });

    it('should throw for unknown country', () => {
      expect(() => {
        service.generateReportTemplate('XX', {
          start: new Date(),
          end: new Date(),
        });
      }).toThrow(BadRequestException);
    });

    it('should return OSS threshold info', () => {
      const info = service.getOSSThresholdInfo();

      expect(info.threshold).toBe(10000);
      expect(info.currency).toBe('EUR');
    });

    it('should return Intrastat thresholds', () => {
      const roThreshold = service.getIntrastatThreshold('RO');
      expect(roThreshold).toBeDefined();
      expect(roThreshold?.currency).toBe('RON');

      const deThreshold = service.getIntrastatThreshold('DE');
      expect(deThreshold).toBeDefined();
    });

    it('should return null for countries without Intrastat info', () => {
      const threshold = service.getIntrastatThreshold('GB');
      expect(threshold).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount', () => {
      const result = service.calculateTax({
        amount: 0,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'DE',
        transactionType: 'B2C',
      });

      expect(result.taxAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });

    it('should handle large amounts', () => {
      const result = service.calculateTax({
        amount: 1000000000,
        currency: 'RON',
        sellerCountry: 'RO',
        buyerCountry: 'RO',
        transactionType: 'B2C',
      });

      expect(result.taxAmount).toBe(190000000);
    });

    it('should throw for unknown seller country', () => {
      expect(() => {
        service.calculateTax({
          amount: 1000,
          currency: 'EUR',
          sellerCountry: 'XX',
          buyerCountry: 'DE',
          transactionType: 'B2C',
        });
      }).toThrow(BadRequestException);
    });

    it('should handle decimal amounts', () => {
      const result = service.calculateTax({
        amount: 99.99,
        currency: 'EUR',
        sellerCountry: 'DE',
        buyerCountry: 'DE',
        transactionType: 'B2C',
      });

      expect(result.taxAmount).toBe(19); // Rounded
    });
  });

  describe('tax configuration completeness', () => {
    it('should have all EU countries configured', () => {
      const euCountries = ['RO', 'DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'PL', 'HU'];

      for (const country of euCountries) {
        const config = service.getCountryConfig(country);
        expect(config).toBeDefined();
        expect(config?.taxNumberFormat).toBeDefined();
      }
    });

    it('should have valid tax number formats', () => {
      expect(EU_TAX_CONFIGS.RO.taxNumberFormat.test('RO12345678')).toBe(true);
      expect(EU_TAX_CONFIGS.DE.taxNumberFormat.test('DE123456789')).toBe(true);
      expect(EU_TAX_CONFIGS.FR.taxNumberFormat.test('FRXX123456789')).toBe(true);
    });

    it('should have registration thresholds', () => {
      for (const config of Object.values(EU_TAX_CONFIGS)) {
        expect(config.registrationThreshold).toBeDefined();
      }
    });
  });
});
