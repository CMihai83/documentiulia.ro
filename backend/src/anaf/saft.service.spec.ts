import { Test, TestingModule } from '@nestjs/testing';
import { SaftService } from './saft.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SaftService - ANAF Order 1783/2021 Compliance', () => {
  let service: SaftService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    sAFTReport: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaftService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SaftService>(SaftService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateD406', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      company: 'Test SRL',
      cui: 'RO12345678',
    };

    const mockInvoices = [
      {
        id: 'inv-1',
        userId: 'user-123',
        invoiceNumber: 'INV-2025-001',
        invoiceDate: new Date('2025-01-15'),
        partnerName: 'Client SRL',
        partnerCui: 'RO87654321',
        netAmount: 1000,
        vatAmount: 210,
        grossAmount: 1210,
        currency: 'RON',
        type: 'ISSUED',
      },
      {
        id: 'inv-2',
        userId: 'user-123',
        invoiceNumber: 'FA-2025-001',
        invoiceDate: new Date('2025-01-20'),
        partnerName: 'Supplier SRL',
        partnerCui: 'RO11111111',
        netAmount: 500,
        vatAmount: 105,
        grossAmount: 605,
        currency: 'RON',
        type: 'RECEIVED',
      },
    ];

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockPrismaService.sAFTReport.upsert.mockResolvedValue({ id: 'report-1' });
    });

    it('should generate valid SAF-T D406 XML', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toBeDefined();
      expect(typeof xml).toBe('string');
      expect(xml).toContain('n1:AuditFile');
    });

    it('should include OECD namespace', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toContain('urn:OECD:StandardAuditFile-Taxation/RO_2.0');
    });

    it('should include SAF-T version 2.0', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toContain('<n1:AuditFileVersion>2.0</n1:AuditFileVersion>');
    });

    it('should include Romanian country code', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toContain('<n1:AuditFileCountry>RO</n1:AuditFileCountry>');
    });

    it('should include company information', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toContain('RO12345678');
      expect(xml).toContain('Test SRL');
    });

    it('should include correct VAT rates per Legea 141/2025', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      // Standard rate
      expect(xml).toContain('TVA standard 21%');
      expect(xml).toContain('<n1:TaxPercentage>21.00</n1:TaxPercentage>');

      // Reduced rate
      expect(xml).toContain('TVA redus 11%');
      expect(xml).toContain('<n1:TaxPercentage>11.00</n1:TaxPercentage>');

      // Special reduced
      expect(xml).toContain('TVA redus 5%');
      expect(xml).toContain('<n1:TaxPercentage>5.00</n1:TaxPercentage>');
    });

    it('should include software identification', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toContain('DocumentIulia.ro');
      expect(xml).toContain('DOCUMENTIULIA-ERP');
    });

    it('should use RON as default currency', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toContain('<n1:DefaultCurrencyCode>RON</n1:DefaultCurrencyCode>');
    });

    it('should separate sales and purchase invoices', async () => {
      const xml = await service.generateD406('user-123', '2025-01');

      expect(xml).toContain('n1:SalesInvoices');
      expect(xml).toContain('n1:PurchaseInvoices');
    });

    it('should store SAF-T report in database', async () => {
      await service.generateD406('user-123', '2025-01');

      expect(mockPrismaService.sAFTReport.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_period: { userId: 'user-123', period: '2025-01' },
          },
          create: expect.objectContaining({
            userId: 'user-123',
            period: '2025-01',
            reportType: 'D406',
            status: 'DRAFT',
          }),
        }),
      );
    });
  });

  describe('validateXmlSize', () => {
    it('should validate XML under 500MB', () => {
      const smallXml = '<test>'.repeat(100);
      const result = service.validateXmlSize(smallXml);

      expect(result.valid).toBe(true);
      expect(result.sizeMB).toBeLessThan(500);
    });

    it('should report size in MB', () => {
      const xml = 'x'.repeat(1024 * 1024); // 1MB
      const result = service.validateXmlSize(xml);

      expect(result.sizeMB).toBeCloseTo(1, 0);
    });
  });

  describe('Tax Table - Legea 141/2025 Compliance', () => {
    it('should have 3 VAT rate entries', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ cui: '', company: '' });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const xml = await service.generateD406('user-123', '2025-01');

      // Count TaxTableEntry occurrences
      const taxEntryCount = (xml.match(/n1:TaxTableEntry/g) || []).length;
      expect(taxEntryCount).toBeGreaterThanOrEqual(3);
    });
  });
});
