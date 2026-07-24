import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SaftD406MonthlyService } from './saft-d406-monthly.service';
import { SpvService } from './spv.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { SaftXsdValidatorService } from './saft-xsd-validator.service';
import { XMLParser } from 'fast-xml-parser';

/**
 * TEST-002: Automated Tests for SAF-T D406 Monthly XML Generation
 *
 * Test coverage for:
 * - XML structure validation per Order 1783/2021
 * - Header section completeness
 * - MasterFiles (Customers, Suppliers, TaxTable)
 * - SourceDocuments (SalesInvoices, PurchaseInvoices)
 * - GeneralLedgerEntries
 * - XML size validation (<500MB)
 * - VAT rate compliance (21%/11%/5%/0%)
 * - Error handling and validation
 */

describe('SaftD406MonthlyService', () => {
  let service: SaftD406MonthlyService;
  let prismaService: PrismaService;
  let spvService: SpvService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    cui: 'RO12345678',
    company: 'Test Company SRL',
    address: 'Str. Test 123, București',
    city: 'București',
    county: 'Sector 1',
    postalCode: '010101',
    email: 'test@test.ro',
    phone: '+40721123456',
    iban: 'RO49AAAA1B31007593840000',
    bankName: 'Test Bank',
  };

  const mockInvoices: any[] = [
    {
      id: 'inv-1',
      invoiceNumber: 'FV-001',
      invoiceDate: new Date('2025-01-15'),
      dueDate: new Date('2025-02-15'),
      type: 'ISSUED',
      partnerCui: 'RO87654321',
      partnerName: 'Client Test SRL',
      partnerAddress: 'Str. Client 456, Cluj',
      netAmount: 1000,
      vatRate: 21,
      vatAmount: 210,
      grossAmount: 1210,
      currency: 'RON',
      userId: 'user-123',
      status: 'DRAFT',
    },
    {
      id: 'inv-2',
      invoiceNumber: 'FV-002',
      invoiceDate: new Date('2025-01-20'),
      dueDate: null,
      type: 'ISSUED',
      partnerCui: 'RO11111111',
      partnerName: 'Alt Client SRL',
      partnerAddress: 'Str. Alt 789, Timișoara',
      netAmount: 500,
      vatRate: 11,
      vatAmount: 55,
      grossAmount: 555,
      currency: 'RON',
      userId: 'user-123',
      status: 'DRAFT',
    },
    {
      id: 'inv-3',
      invoiceNumber: 'FA-001',
      invoiceDate: new Date('2025-01-10'),
      dueDate: null,
      type: 'RECEIVED',
      partnerCui: 'RO22222222',
      partnerName: 'Furnizor Test SRL',
      partnerAddress: 'Str. Furnizor 111, Iași',
      netAmount: 2000,
      vatRate: 21,
      vatAmount: 420,
      grossAmount: 2420,
      currency: 'RON',
      userId: 'user-123',
      status: 'DRAFT',
    },
  ];

  const mockPayments = [
    {
      id: 'pay-1',
      reference: 'PL-001',
      paymentDate: new Date('2025-01-25'),
      method: 'BANK',
      amount: 1210,
      currency: 'RON',
      description: 'Plată factură FV-001',
    },
  ];

  const mockProducts = [
    {
      id: 'prod-1',
      code: 'P001',
      name: 'Produs Test',
      category: 'Servicii',
      unit: 'BUC',
    },
  ];

  const mockEmployees: any[] = [];
  const mockPayrolls: any[] = [];

  // Double-entry journal fixtures consistent with mockInvoices (REQ-045:
  // GeneralLedgerEntries now come from AccountingService, not ad-hoc math)
  const mockJournalEntries = [
    {
      id: 'INV-inv-1', date: new Date('2025-01-15'),
      description: 'Factura vanzare FV-001 - Client Test SRL', reference: 'FV-001',
      lines: [
        { accountCode: '411', accountName: 'Clienti', debit: 1210, credit: 0 },
        { accountCode: '704', accountName: 'Venituri din servicii', debit: 0, credit: 1000 },
        { accountCode: '4427', accountName: 'TVA colectata', debit: 0, credit: 210 },
      ],
      status: 'POSTED' as const, createdAt: new Date('2025-01-15'),
      partnerCui: 'RO87654321', partnerType: 'customer' as const,
    },
    {
      id: 'PINV-inv-3', date: new Date('2025-01-10'),
      description: 'Factura achizitie FA-001 - Furnizor Test SRL', reference: 'FA-001',
      lines: [
        { accountCode: '628', accountName: 'Alte cheltuieli cu servicii', debit: 2000, credit: 0 },
        { accountCode: '4426', accountName: 'TVA deductibila', debit: 420, credit: 0 },
        { accountCode: '401', accountName: 'Furnizori', debit: 0, credit: 2420 },
      ],
      status: 'POSTED' as const, createdAt: new Date('2025-01-10'),
      partnerCui: 'RO22222222', partnerType: 'supplier' as const,
    },
  ];

  const mockTrialBalance = [
    { accountCode: '411', accountName: 'Clienti', accountType: 'ASSET',
      openingDebit: 0, openingCredit: 0, periodDebit: 1210, periodCredit: 0,
      closingDebit: 1210, closingCredit: 0 },
    { accountCode: '4427', accountName: 'TVA colectata', accountType: 'LIABILITY',
      openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 210,
      closingDebit: 0, closingCredit: 210 },
  ];

  const mockOrganization = {
    name: 'Org Test SRL', cui: 'RO55555555', address: 'Bd. Organizatiei 9',
    city: 'Cluj-Napoca', postalCode: '400001', county: 'Cluj',
    phone: '+40744000000', email: 'org@test.ro', website: 'https://org.test.ro',
    bankAccount: 'RO12BTRL0000000000000000', bankName: 'Org Bank',
  };

  const accountingServiceMock = {
    getJournalEntries: jest.fn().mockResolvedValue(mockJournalEntries),
    getTrialBalance: jest.fn().mockResolvedValue(mockTrialBalance),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaftD406MonthlyService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
            },
            invoice: {
              findMany: jest.fn().mockResolvedValue(mockInvoices),
            },
            payment: {
              findMany: jest.fn().mockResolvedValue(mockPayments),
            },
            product: {
              findMany: jest.fn().mockResolvedValue(mockProducts),
            },
            employee: {
              findMany: jest.fn().mockResolvedValue(mockEmployees),
            },
            payroll: {
              findMany: jest.fn().mockResolvedValue(mockPayrolls),
            },
            sAFTReport: {
              upsert: jest.fn().mockResolvedValue({ id: 'report-1' }),
              findUnique: jest.fn().mockResolvedValue(null),
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn().mockResolvedValue({}),
            },
            // default: no org membership -> company data falls back to User
            organizationMember: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          },
        },
        {
          provide: AccountingService,
          useValue: accountingServiceMock,
        },
        {
          provide: SaftXsdValidatorService,
          useValue: {
            available: true,
            validate: jest.fn().mockReturnValue({ available: true, valid: true, errors: [] }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
        {
          provide: SpvService,
          useValue: {
            submitSaft: jest.fn().mockResolvedValue({
              reference: 'SPV-REF-123',
              submissionId: 'submission-123',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SaftD406MonthlyService>(SaftD406MonthlyService);
    prismaService = module.get<PrismaService>(PrismaService);
    spvService = module.get<SpvService>(SpvService);
  });

  describe('generateMonthlyD406', () => {
    it('should generate valid D406 XML for a period', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.success).toBe(true);
      expect(result.xml).toBeDefined();
      expect(result.xml).toContain('<?xml');
      expect(result.xml).toContain('n1:AuditFile');
      expect(result.period).toBe('2025-01');
    });

    it('should include correct Header section', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('n1:Header');
      expect(result.xml).toContain('n1:AuditFileVersion');
      expect(result.xml).toContain('2.0');
      expect(result.xml).toContain('n1:AuditFileCountry');
      expect(result.xml).toContain('RO');
      expect(result.xml).toContain('DocumentIulia.ro');
      expect(result.xml).toContain('n1:TaxAccountingBasis');
    });

    it('should include company information', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('n1:Company');
      expect(result.xml).toContain('RO12345678'); // CUI
      expect(result.xml).toContain('Test Company SRL');
    });

    it('should include MasterFiles section', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('n1:MasterFiles');
      expect(result.xml).toContain('n1:GeneralLedgerAccounts');
      expect(result.xml).toContain('n1:Customers');
      expect(result.xml).toContain('n1:Suppliers');
      expect(result.xml).toContain('n1:TaxTable');
    });

    it('should include TaxTable with correct VAT rates per Legea 141/2025', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      // Standard 21%
      expect(result.xml).toContain('21.00');
      expect(result.xml).toContain('Legea 141/2025');
      // Reduced 11%
      expect(result.xml).toContain('11.00');
      // Reduced 5%
      expect(result.xml).toContain('5.00');
      // Zero rate
      expect(result.xml).toContain('0.00');
    });

    it('should include SourceDocuments section', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('n1:SourceDocuments');
      expect(result.xml).toContain('n1:SalesInvoices');
      expect(result.xml).toContain('n1:PurchaseInvoices');
    });

    it('should include Customers from sales invoices', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('RO87654321'); // Customer 1 CUI
      expect(result.xml).toContain('Client Test SRL');
      expect(result.xml).toContain('RO11111111'); // Customer 2 CUI
    });

    it('should include Suppliers from purchase invoices', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('RO22222222'); // Supplier CUI
      expect(result.xml).toContain('Furnizor Test SRL');
    });

    it('should calculate correct summary totals', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.summary.invoicesCount).toBe(3);
      expect(result.summary.customersCount).toBe(2);
      expect(result.summary.suppliersCount).toBe(1);
      expect(result.summary.totalSales).toBe(1765); // 1210 + 555
      expect(result.summary.totalPurchases).toBe(2420);
      expect(result.summary.totalVATCollected).toBe(265); // 210 + 55
      expect(result.summary.totalVATDeductible).toBe(420);
      expect(result.summary.vatBalance).toBe(-155); // 265 - 420
    });

    it('should generate SHA-256 hash of XML', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.hash).toBeDefined();
      expect(result.hash.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('should validate XML size is under 500MB', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xmlSize).toBeLessThan(500 * 1024 * 1024);
    });
  });

  describe('generateMonthlyD406 - Error Handling', () => {
    it('should return error when user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.generateMonthlyD406('nonexistent-user', '2025-01');

      expect(result.success).toBe(false);
      expect(result.validation.errors).toContain('E001: Utilizator inexistent');
    });

    it('should return error when CUI is missing', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        ...mockUser,
        cui: null,
      } as any);

      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.success).toBe(false);
      expect(result.validation.errors.some((e: string) => e.includes('CUI'))).toBe(true);
    });

    it('should return error when company name is missing', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        ...mockUser,
        company: null,
      } as any);

      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.success).toBe(false);
      expect(result.validation.errors.some((e) => e.includes('companie'))).toBe(true);
    });
  });

  describe('generateMonthlyD406 - Invoice Sequence Validation', () => {
    it('should warn about gaps in invoice sequence', async () => {
      const invoicesWithGap = [
        { ...mockInvoices[0], invoiceNumber: 'FV-001' },
        { ...mockInvoices[1], invoiceNumber: 'FV-005' }, // Gap from 001 to 005
      ];
      jest.spyOn(prismaService.invoice, 'findMany').mockResolvedValueOnce(invoicesWithGap);

      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.validation.warnings.some((w) => w.includes('lipsă') || w.includes('serie'))).toBe(true);
    });
  });

  describe('submitToANAF', () => {
    it('should submit D406 to ANAF SPV', async () => {
      const result = await service.submitToANAF('user-123', '2025-01');

      expect(result.success).toBe(true);
      expect(result.reference).toBe('SPV-REF-123');
      expect(result.status).toBe('pending');
      expect(spvService.submitSaft).toHaveBeenCalled();
    });

    it('should return error if generation fails', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      const result = await service.submitToANAF('nonexistent-user', '2025-01');

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
    });
  });

  describe('previewXML', () => {
    it('should return both raw and formatted XML', async () => {
      const result = await service.previewXML('user-123', '2025-01');

      expect(result.xml).toBeDefined();
      expect(result.formatted).toBeDefined();
      expect(result.xml.length).toBeGreaterThan(0);
    });
  });

  describe('getReports', () => {
    it('should return list of D406 reports', async () => {
      const mockReports = [
        { id: 'r1', period: '2025-01', status: 'DRAFT', reportType: 'D406_MONTHLY' },
        { id: 'r2', period: '2024-12', status: 'SUBMITTED', reportType: 'D406_MONTHLY' },
      ];
      jest.spyOn(prismaService.sAFTReport, 'findMany' as any).mockResolvedValueOnce(mockReports);

      const result = await service.getReports('user-123');

      expect(result).toBeDefined();
    });
  });

  describe('XML Structure Compliance', () => {
    it('should use the official ANAF D406 namespace (Ro_SAFT_Schema v2.4.x)', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      // the previous 'urn:OECD:StandardAuditFile-Taxation/RO_2.0' value is
      // rejected by ANAF's validator (REQ-045 XSD hardening)
      expect(result.xml).toContain('mfp:anaf:dgti:d406t:declaratie:v1');
      expect(result.xml).toContain('Ro_SAFT_Schema_v249_2025.xsd');
    });

    it('should include XSI namespace', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('http://www.w3.org/2001/XMLSchema-instance');
    });

    it('should include SelectionCriteria with the period-numbers branch (RO schema)', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('n1:SelectionCriteria');
      expect(result.xml).toContain('<n1:PeriodStart>1</n1:PeriodStart>');
      expect(result.xml).toContain('<n1:PeriodStartYear>2025</n1:PeriodStartYear>');
      expect(result.xml).toContain('<n1:PeriodEndYear>2025</n1:PeriodEndYear>');
    });

    it('should include GeneralLedgerEntries', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('n1:GeneralLedgerEntries');
      expect(result.xml).toContain('n1:NumberOfEntries');
      expect(result.xml).toContain('n1:TotalDebit');
      expect(result.xml).toContain('n1:TotalCredit');
    });

    it('should include Romanian Chart of Accounts', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      // Common Romanian accounts
      expect(result.xml).toContain('4111'); // Clients
      expect(result.xml).toContain('401'); // Suppliers
      expect(result.xml).toContain('4427'); // TVA colectata
      expect(result.xml).toContain('4426'); // TVA deductibila
    });

    it('should format amounts with 2 decimal places', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      // Check that amounts are formatted correctly
      expect(result.xml).toMatch(/\d+\.\d{2}/);
    });

    it('should include invoice type codes', async () => {
      const result = await service.generateMonthlyD406('user-123', '2025-01');

      expect(result.xml).toContain('n1:InvoiceType');
      expect(result.xml).toContain('FT'); // Factura standard
    });
  });

  describe('Performance', () => {
    it('should generate XML in under 5 seconds', async () => {
      const startTime = Date.now();
      await service.generateMonthlyD406('user-123', '2025-01');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('REQ-045: full D406 generation (GL tie-out, Organization data, period-aware TaxTable)', () => {
    const parser = new XMLParser({ ignoreAttributes: false });

    async function generateParsed(period: string) {
      const result = await service.generateMonthlyD406('user-123', period);
      expect(result.success).toBe(true);
      return parser.parse(result.xml);
    }

    it('emits a balanced double-entry GeneralLedgerEntries section', async () => {
      const doc = await generateParsed('2025-01');
      const gle = doc['n1:AuditFile']['n1:GeneralLedgerEntries'];
      expect(gle['n1:TotalDebit']).toBe(gle['n1:TotalCredit']);
      expect(Number(gle['n1:TotalDebit'])).toBeCloseTo(3630, 2); // 1210 + 2420
      const txs = [].concat(gle['n1:Journal']['n1:Transaction']);
      expect(txs).toHaveLength(2);
      expect([].concat(txs[0]['n1:TransactionLine'])).toHaveLength(3); // real double-entry
      // partner CUIs threaded from the source invoices (REQ-045)
      expect(String(txs[0]['n1:CustomerID'])).toBe('RO87654321');
      expect(String(txs[1]['n1:SupplierID'])).toBe('RO22222222');
    });

    it('sources company data from Organization when a membership exists', async () => {
      jest.spyOn(prismaService.organizationMember, 'findFirst' as any)
        .mockResolvedValueOnce({ organization: mockOrganization });
      const doc = await generateParsed('2025-01');
      const company = doc['n1:AuditFile']['n1:Header']['n1:Company'];
      expect(company['n1:RegistrationNumber']).toBe('RO55555555');
      expect(company['n1:Name']).toBe('Org Test SRL');
      expect(company['n1:Address']['n1:City']).toBe('Cluj-Napoca');
      expect(company['n1:Address']['n1:Region']).toBe('Cluj');
      expect(company['n1:BankAccount']['n1:IBANNumber']).toBe('RO12BTRL0000000000000000');
    });

    it('falls back to User fields without an Organization membership', async () => {
      const doc = await generateParsed('2025-01');
      const company = doc['n1:AuditFile']['n1:Header']['n1:Company'];
      expect(company['n1:RegistrationNumber']).toBe('RO12345678');
      expect(String(company['n1:Name'])).toBe('Test Company SRL');
    });

    it('emits GL accounts from the shared OMFP chart with trial-balance figures', async () => {
      const doc = await generateParsed('2025-01');
      const accounts = doc['n1:AuditFile']['n1:MasterFiles']['n1:GeneralLedgerAccounts']['n1:Account'];
      expect(accounts.length).toBeGreaterThan(40); // shared chart, not the old 14
      const a411 = accounts.find((a: any) => String(a['n1:AccountID']) === '411');
      expect(Number(a411['n1:ClosingDebitBalance'])).toBeCloseTo(1210, 2);
      const a4427 = accounts.find((a: any) => String(a['n1:AccountID']) === '4427');
      expect(Number(a4427['n1:ClosingCreditBalance'])).toBeCloseTo(210, 2);
    });

    it('includes historical 19%/9% tax codes for pre-Legea-141 periods', async () => {
      const doc = await generateParsed('2025-05');
      const entries = doc['n1:AuditFile']['n1:MasterFiles']['n1:TaxTable']['n1:TaxTableEntry'];
      const codes = entries.map((e: any) => String(e['n1:TaxCodeDetails']['n1:TaxCode']));
      expect(codes).toEqual(expect.arrayContaining(['S', 'R1', 'S19', 'R9']));
    });

    it('omits historical codes for post-Legea-141 periods without old-rate invoices', async () => {
      const doc = await generateParsed('2025-09');
      const entries = doc['n1:AuditFile']['n1:MasterFiles']['n1:TaxTable']['n1:TaxTableEntry'];
      const codes = entries.map((e: any) => String(e['n1:TaxCodeDetails']['n1:TaxCode']));
      expect(codes).toContain('S');
      expect(codes).not.toContain('S19');
    });
  });
});
