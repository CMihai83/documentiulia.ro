import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  CustomsClearanceService,
  Company,
  CustomsGoods,
  DeclarationType,
  TransportMode,
} from './customs-clearance.service';

describe('CustomsClearanceService', () => {
  let service: CustomsClearanceService;

  const createTestCompany = (overrides?: Partial<Company>): Company => ({
    id: `comp_${Date.now()}`,
    name: 'Test Company SRL',
    vatNumber: 'RO12345678',
    eoriNumber: 'RO12345678000',
    address: {
      street: 'Str. Test 123',
      city: 'București',
      postalCode: '010101',
      country: 'Romania',
      countryCode: 'RO',
    },
    contactEmail: 'test@company.ro',
    contactPhone: '+40721234567',
    ...overrides,
  });

  const createTestGoods = (overrides?: Partial<CustomsGoods>): CustomsGoods => ({
    id: `goods_${Date.now()}`,
    description: 'Laptop computers',
    hsCode: '8471300000',
    originCountry: 'CN',
    quantity: 100,
    unit: 'PIECE',
    grossWeight: 250,
    netWeight: 200,
    value: 50000,
    currency: 'EUR',
    invoiceNumber: 'INV-2024-001',
    invoiceDate: new Date(),
    packages: 10,
    packageType: 'CARTON',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomsClearanceService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: { [key: string]: string } = {
                VIES_API_URL: 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService',
                ANAF_CUSTOMS_API_URL: 'https://api.anaf.ro/customs',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CustomsClearanceService>(CustomsClearanceService);
    service.resetState();
  });

  describe('VIES VAT Validation', () => {
    it('should validate a valid Romanian VAT number', async () => {
      const result = await service.validateVatNumber('RO12345678');

      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe('RO');
      expect(result.vatNumber).toBe('RO12345678');
      expect(result.requestId).toBeDefined();
      expect(result.requestDate).toBeInstanceOf(Date);
    });

    it('should validate a valid German VAT number', async () => {
      const result = await service.validateVatNumber('DE123456789');

      expect(result.valid).toBe(true);
      expect(result.countryCode).toBe('DE');
    });

    it('should reject an invalid country code', async () => {
      const result = await service.validateVatNumber('XX12345678');

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('Invalid country code');
    });

    it('should reject an invalid VAT format', async () => {
      const result = await service.validateVatNumber('DE12'); // Too short

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('Invalid VAT number format');
    });

    it('should cache VIES validation results', async () => {
      const result1 = await service.validateVatNumber('RO12345678');
      const result2 = await service.validateVatNumber('RO12345678');

      expect(result1.requestId).toBe(result2.requestId);
    });

    it('should batch validate multiple VAT numbers', async () => {
      const results = await service.batchValidateVatNumbers([
        'RO12345678',
        'DE123456789',
        'FR12345678901',
      ]);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('should clean VAT number format', async () => {
      const result = await service.validateVatNumber('ro-123-456-78');

      expect(result.vatNumber).toBe('RO12345678');
    });
  });

  describe('EORI Validation', () => {
    it('should validate a valid EORI number', async () => {
      const result = await service.validateEoriNumber('RO12345678000');

      expect(result.valid).toBe(true);
      expect(result.eoriNumber).toBe('RO12345678000');
    });

    it('should reject a too short EORI number', async () => {
      const result = await service.validateEoriNumber('RO');

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('3-17 characters');
    });

    it('should reject an invalid EORI format', async () => {
      const result = await service.validateEoriNumber('12345');

      expect(result.valid).toBe(false);
    });
  });

  describe('HS Code Classification', () => {
    it('should search HS codes by keyword', () => {
      const results = service.searchHSCodes('portable');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('8471300000');
    });

    it('should search HS codes by code', () => {
      const results = service.searchHSCodes('8471');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.code.startsWith('8471'))).toBe(true);
    });

    it('should get a specific HS code', () => {
      const hsCode = service.getHSCode('8471300000');

      expect(hsCode).toBeDefined();
      expect(hsCode!.description).toContain('Portable automatic data processing');
      expect(hsCode!.chapter).toBe('84');
    });

    it('should suggest HS codes from description', () => {
      const suggestions = service.suggestHSCode('portable computer laptop');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].code).toBe('8471300000');
    });

    it('should limit search results', () => {
      const results = service.searchHSCodes('', 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Tariff & Duties Calculation', () => {
    it('should calculate duties for goods', () => {
      const goods: CustomsGoods[] = [
        createTestGoods({ hsCode: '8528720000', value: 10000 }), // TV with 14% duty
      ];

      const duties = service.calculateDutiesAndTaxes(goods);

      expect(duties.customsDuty).toBe(1400); // 14% of 10000
      expect(duties.vat).toBeGreaterThan(0);
      expect(duties.total).toBe(duties.customsDuty + duties.vat + (duties.exciseDuty || 0));
      expect(duties.currency).toBe('EUR');
    });

    it('should apply zero duty for IT products', () => {
      const goods: CustomsGoods[] = [
        createTestGoods({ hsCode: '8471300000', value: 50000 }), // Laptop with 0% duty
      ];

      const duties = service.calculateDutiesAndTaxes(goods);

      expect(duties.customsDuty).toBe(0);
      expect(duties.vat).toBeGreaterThan(0);
    });

    it('should calculate VAT correctly', () => {
      const goods: CustomsGoods[] = [
        createTestGoods({ hsCode: '8471300000', value: 10000 }),
      ];

      const duties = service.calculateDutiesAndTaxes(goods, 'RO');

      expect(duties.vat).toBe(1900); // 19% Romanian VAT
    });

    it('should get tariff for HS code', () => {
      const tariff = service.getTariff('8528720000');

      expect(tariff).toBeDefined();
      expect(tariff!.dutyRate).toBe(14);
      expect(tariff!.vatRate).toBe(19);
    });
  });

  describe('Customs Declarations', () => {
    it('should create an import declaration', () => {
      const declarant = createTestCompany();
      const consignor = createTestCompany({ name: 'Supplier Ltd', vatNumber: 'CN12345678' });
      const consignee = createTestCompany({ name: 'Importer SRL' });
      const goods = [createTestGoods()];

      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant,
        consignor,
        consignee,
        goods,
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      expect(declaration.id).toBeDefined();
      expect(declaration.lrn).toBeDefined();
      expect(declaration.status).toBe('DRAFT');
      expect(declaration.type).toBe('IMPORT');
      expect(declaration.totalValue).toBe(50000);
      expect(declaration.totalGrossWeight).toBe(250);
    });

    it('should validate a declaration', () => {
      const declarant = createTestCompany();
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant,
        consignor: createTestCompany({ name: 'Consignor' }),
        consignee: createTestCompany({ name: 'Consignee' }),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      const validation = service.validateDeclaration(declaration.id);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject declaration without EORI', () => {
      const declarant = createTestCompany({ eoriNumber: undefined });
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant,
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      const validation = service.validateDeclaration(declaration.id);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Declarant EORI number is required');
    });

    it('should submit a validated declaration', () => {
      const declaration = service.createDeclaration({
        type: 'EXPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany(),
        consignee: createTestCompany({ vatNumber: 'DE123456789' }),
        goods: [createTestGoods()],
        procedureCode: '1000',
        customsOffice: 'ROCND1',
        transportMode: 'SEA',
        containerNumbers: ['MSKU1234567'],
      });

      service.validateDeclaration(declaration.id);
      const result = service.submitDeclaration(declaration.id);

      expect(result.success).toBe(true);
      expect(result.mrn).toBeDefined();
      expect(result.mrn).toMatch(/^\d{2}RO[A-Z0-9]+$/);
    });

    it('should not submit a draft declaration', () => {
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany({ eoriNumber: undefined }), // Will fail validation
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      const result = service.submitDeclaration(declaration.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DRAFT');
    });

    it('should accept and release a declaration', () => {
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      service.validateDeclaration(declaration.id);
      service.submitDeclaration(declaration.id);

      const accepted = service.acceptDeclaration(declaration.id);
      expect(accepted!.status).toBe('ACCEPTED');
      expect(accepted!.acceptedAt).toBeDefined();

      const released = service.releaseDeclaration(declaration.id);
      expect(released!.status).toBe('RELEASED');
      expect(released!.releasedAt).toBeDefined();
    });

    it('should add documents to a declaration', () => {
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      const doc = service.addDocument(declaration.id, {
        type: 'COMMERCIAL_INVOICE',
        reference: 'INV-2024-001',
        issueDate: new Date(),
        issuingAuthority: 'Supplier Ltd',
      });

      expect(doc).toBeDefined();
      expect(doc!.type).toBe('COMMERCIAL_INVOICE');

      const updated = service.getDeclaration(declaration.id);
      expect(updated!.documents).toHaveLength(1);
    });

    it('should list declarations with filters', () => {
      // Create multiple declarations
      for (let i = 0; i < 3; i++) {
        service.createDeclaration({
          type: i % 2 === 0 ? 'IMPORT' : 'EXPORT',
          declarant: createTestCompany({ id: 'declarant-1' }),
          consignor: createTestCompany(),
          consignee: createTestCompany(),
          goods: [createTestGoods()],
          procedureCode: i % 2 === 0 ? '4000' : '1000',
          customsOffice: 'ROBUC1',
          transportMode: 'ROAD',
        });
      }

      const imports = service.listDeclarations({ type: 'IMPORT' });
      expect(imports.length).toBe(2);

      const exports = service.listDeclarations({ type: 'EXPORT' });
      expect(exports.length).toBe(1);
    });

    it('should find declaration by LRN and MRN', () => {
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      service.validateDeclaration(declaration.id);
      const { mrn } = service.submitDeclaration(declaration.id);

      const byLRN = service.getDeclarationByLRN(declaration.lrn);
      expect(byLRN).toBeDefined();
      expect(byLRN!.id).toBe(declaration.id);

      const byMRN = service.getDeclarationByMRN(mrn!);
      expect(byMRN).toBeDefined();
      expect(byMRN!.id).toBe(declaration.id);
    });

    it('should generate DAU document', () => {
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany({ name: 'China Supplier Ltd' }),
        consignee: createTestCompany({ name: 'Romania Importer SRL' }),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      service.validateDeclaration(declaration.id);
      service.submitDeclaration(declaration.id);

      const dau = service.generateDAU(declaration.id);

      expect(dau).toContain('DOCUMENT ADMINISTRATIV UNIC');
      expect(dau).toContain('SINGLE ADMINISTRATIVE DOCUMENT');
      expect(dau).toContain('China Supplier Ltd');
      expect(dau).toContain('Romania Importer SRL');
      expect(dau).toContain('8471300000');
    });
  });

  describe('Intrastat Reporting', () => {
    it('should create an arrivals declaration', () => {
      const declaration = service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024-12',
        reportingCompany: createTestCompany(),
        items: [
          {
            hsCode: '84713000',
            description: 'Laptops',
            partnerCountry: 'DE',
            transactionNature: '11',
            deliveryTerms: 'CIP',
            transportMode: 'ROAD',
            quantity: 100,
            netWeight: 200,
            invoiceValue: 50000,
            statisticalValue: 52000,
          },
        ],
      });

      expect(declaration.id).toBeDefined();
      expect(declaration.type).toBe('ARRIVALS');
      expect(declaration.period).toBe('2024-12');
      expect(declaration.items[0].itemNumber).toBe(1);
      expect(declaration.totalValue).toBe(50000);
    });

    it('should validate Intrastat declaration', () => {
      const declaration = service.createIntrastatDeclaration({
        type: 'DISPATCHES',
        period: '2024-11',
        reportingCompany: createTestCompany(),
        items: [
          {
            hsCode: '84713000',
            description: 'Computers',
            partnerCountry: 'FR',
            transactionNature: '11',
            deliveryTerms: 'DAP',
            transportMode: 'ROAD',
            quantity: 50,
            netWeight: 100,
            invoiceValue: 25000,
            statisticalValue: 26000,
          },
        ],
      });

      const validation = service.validateIntrastatDeclaration(declaration.id);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid period format', () => {
      const declaration = service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024/12', // Wrong format
        reportingCompany: createTestCompany(),
        items: [
          {
            hsCode: '84713000',
            description: 'Test',
            partnerCountry: 'DE',
            transactionNature: '11',
            deliveryTerms: 'CIP',
            transportMode: 'ROAD',
            quantity: 10,
            netWeight: 20,
            invoiceValue: 1000,
            statisticalValue: 1000,
          },
        ],
      });

      const validation = service.validateIntrastatDeclaration(declaration.id);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid period format. Use YYYY-MM');
    });

    it('should reject non-EU partner country', () => {
      const declaration = service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024-12',
        reportingCompany: createTestCompany(),
        items: [
          {
            hsCode: '84713000',
            description: 'Test',
            partnerCountry: 'US', // Non-EU
            transactionNature: '11',
            deliveryTerms: 'CIP',
            transportMode: 'ROAD',
            quantity: 10,
            netWeight: 20,
            invoiceValue: 1000,
            statisticalValue: 1000,
          },
        ],
      });

      const validation = service.validateIntrastatDeclaration(declaration.id);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('not an EU member state'))).toBe(true);
    });

    it('should submit Intrastat declaration', () => {
      const declaration = service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024-12',
        reportingCompany: createTestCompany(),
        items: [
          {
            hsCode: '84713000',
            description: 'Laptops',
            partnerCountry: 'DE',
            transactionNature: '11',
            deliveryTerms: 'CIP',
            transportMode: 'ROAD',
            quantity: 100,
            netWeight: 200,
            invoiceValue: 950000, // Above threshold
            statisticalValue: 960000,
          },
        ],
      });

      service.validateIntrastatDeclaration(declaration.id);
      const result = service.submitIntrastatDeclaration(declaration.id);

      expect(result.success).toBe(true);
      expect(result.reference).toContain('INTRA-2024-12');
    });

    it('should generate Intrastat XML', () => {
      const declaration = service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024-12',
        reportingCompany: createTestCompany({ name: 'Test SRL' }),
        items: [
          {
            hsCode: '84713000',
            description: 'Laptops',
            partnerCountry: 'DE',
            transactionNature: '11',
            deliveryTerms: 'CIP',
            transportMode: 'ROAD',
            quantity: 100,
            netWeight: 200,
            invoiceValue: 50000,
            statisticalValue: 52000,
          },
        ],
      });

      const xml = service.generateIntrastatXML(declaration.id);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<Intrastat');
      expect(xml).toContain('<DeclarationType>ARRIVALS</DeclarationType>');
      expect(xml).toContain('<ReferencePeriod>2024-12</ReferencePeriod>');
      expect(xml).toContain('<CN8Code>84713000</CN8Code>');
      expect(xml).toContain('<PartnerCountry>DE</PartnerCountry>');
    });

    it('should list Intrastat declarations with filters', () => {
      service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024-11',
        reportingCompany: createTestCompany(),
        items: [{ hsCode: '84713000', description: 'Test', partnerCountry: 'DE', transactionNature: '11', deliveryTerms: 'CIP', transportMode: 'ROAD', quantity: 10, netWeight: 20, invoiceValue: 1000, statisticalValue: 1000 }],
      });

      service.createIntrastatDeclaration({
        type: 'DISPATCHES',
        period: '2024-11',
        reportingCompany: createTestCompany(),
        items: [{ hsCode: '84713000', description: 'Test', partnerCountry: 'FR', transactionNature: '11', deliveryTerms: 'DAP', transportMode: 'ROAD', quantity: 10, netWeight: 20, invoiceValue: 1000, statisticalValue: 1000 }],
      });

      const arrivals = service.listIntrastatDeclarations({ type: 'ARRIVALS' });
      expect(arrivals).toHaveLength(1);

      const byPeriod = service.listIntrastatDeclarations({ period: '2024-11' });
      expect(byPeriod).toHaveLength(2);
    });
  });

  describe('Customs Offices', () => {
    it('should get all Romanian customs offices', () => {
      const offices = service.getCustomsOffices();

      expect(offices.length).toBeGreaterThan(0);
      expect(offices.every(o => o.country === 'Romania')).toBe(true);
    });

    it('should filter by office type', () => {
      const entryOffices = service.getCustomsOffices({ type: 'ENTRY' });

      expect(entryOffices.length).toBeGreaterThan(0);
      expect(entryOffices.every(o => o.type === 'ENTRY')).toBe(true);
    });

    it('should filter by capability', () => {
      const maritimeOffices = service.getCustomsOffices({ capability: 'MARITIME' });

      expect(maritimeOffices.length).toBeGreaterThan(0);
      expect(maritimeOffices.every(o => o.capabilities.includes('MARITIME'))).toBe(true);
    });

    it('should get a specific customs office', () => {
      const office = service.getCustomsOffice('ROCND1');

      expect(office).toBeDefined();
      expect(office!.name).toContain('Constanța');
      expect(office!.capabilities).toContain('MARITIME');
    });
  });

  describe('Reference Data', () => {
    it('should get transaction nature codes', () => {
      const codes = service.getTransactionNatureCodes();

      expect(codes['11']).toBe('Outright purchase/sale');
      expect(codes['21']).toBe('Return of goods after registration of original transaction');
    });

    it('should get delivery terms (Incoterms)', () => {
      const terms = service.getDeliveryTerms();

      expect(terms['EXW']).toBe('Ex Works');
      expect(terms['CIF']).toBe('Cost, Insurance and Freight');
      expect(terms['DDP']).toBe('Delivered Duty Paid');
    });

    it('should get EU VAT rates', () => {
      const rates = service.getEUVatRates();

      expect(rates['RO'].standard).toBe(19);
      expect(rates['HU'].standard).toBe(27); // Highest in EU
      expect(rates['LU'].standard).toBe(17); // Lowest in EU
    });
  });

  describe('Statistics', () => {
    it('should get declaration statistics', () => {
      // Create test declarations
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods({ value: 10000 })],
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      service.validateDeclaration(declaration.id);
      service.submitDeclaration(declaration.id);

      const stats = service.getDeclarationStatistics();

      expect(stats.totalDeclarations).toBe(1);
      expect(stats.byType['IMPORT']).toBe(1);
      expect(stats.byStatus['SUBMITTED']).toBe(1);
      expect(stats.totalValue).toBe(10000);
    });

    it('should get Intrastat statistics', () => {
      service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024-12',
        reportingCompany: createTestCompany(),
        items: [
          { hsCode: '84713000', description: 'Test', partnerCountry: 'DE', transactionNature: '11', deliveryTerms: 'CIP', transportMode: 'ROAD', quantity: 100, netWeight: 200, invoiceValue: 50000, statisticalValue: 50000 },
          { hsCode: '84714000', description: 'Test2', partnerCountry: 'FR', transactionNature: '11', deliveryTerms: 'DAP', transportMode: 'ROAD', quantity: 50, netWeight: 100, invoiceValue: 25000, statisticalValue: 25000 },
        ],
      });

      const stats = service.getIntrastatStatistics(2024);

      expect(stats.arrivals.totalValue).toBe(75000);
      expect(stats.arrivals.itemCount).toBe(2);
      expect(stats.topPartnerCountries.length).toBeGreaterThan(0);
      expect(stats.topHSCodes.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should warn about missing container numbers for sea transport', () => {
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods()],
        procedureCode: '4000',
        customsOffice: 'ROCND1',
        transportMode: 'SEA',
        // No container numbers
      });

      const validation = service.validateDeclaration(declaration.id);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.includes('Container numbers'))).toBe(true);
    });

    it('should reject goods with invalid weight', () => {
      const declaration = service.createDeclaration({
        type: 'IMPORT',
        declarant: createTestCompany(),
        consignor: createTestCompany(),
        consignee: createTestCompany(),
        goods: [createTestGoods({ grossWeight: 100, netWeight: 150 })], // Net > Gross
        procedureCode: '4000',
        customsOffice: 'ROBUC1',
        transportMode: 'ROAD',
      });

      const validation = service.validateDeclaration(declaration.id);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Gross weight cannot be less than net weight'))).toBe(true);
    });

    it('should warn about below-threshold Intrastat', () => {
      const declaration = service.createIntrastatDeclaration({
        type: 'ARRIVALS',
        period: '2024-12',
        reportingCompany: createTestCompany(),
        items: [
          { hsCode: '84713000', description: 'Test', partnerCountry: 'DE', transactionNature: '11', deliveryTerms: 'CIP', transportMode: 'ROAD', quantity: 1, netWeight: 2, invoiceValue: 100, statisticalValue: 100 },
        ],
      });

      const validation = service.validateIntrastatDeclaration(declaration.id);

      expect(validation.warnings.some(w => w.includes('below Intrastat threshold'))).toBe(true);
    });
  });
});
