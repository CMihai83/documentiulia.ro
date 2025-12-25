import { Test, TestingModule } from '@nestjs/testing';
import { D394Service, D394Transaction, D394Totals } from './d394.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceType } from '@prisma/client';

describe('D394Service', () => {
  let service: D394Service;
  let mockPrismaService: any;

  const userId = 'user-123';
  const tenantId = 'tenant-001';
  const period = '2025-01';

  const companyData = {
    cui: 'RO12345678',
    denumire: 'Test Company SRL',
    judet: 'Bucuresti',
    localitate: 'Sector 1',
    strada: 'Calea Victoriei',
    numar: '100',
  };

  const createMockTransaction = (overrides: Partial<D394Transaction> = {}): D394Transaction => ({
    tip: 'L',
    cuiPartener: '87654321',
    denumirePartener: 'Partner Company SRL',
    tara: 'RO',
    bazaImpozabila: 10000,
    tvaColectata: 1900,
    tvaDeductibila: 0,
    numarDocumente: 5,
    ...overrides,
  });

  const createMockInvoice = (overrides: any = {}) => ({
    id: 'inv-001',
    userId,
    tenantId,
    type: InvoiceType.ISSUED,
    invoiceNumber: 'INV-001',
    invoiceDate: new Date('2025-01-15'),
    partnerCui: '87654321',
    partnerName: 'Partner Company SRL',
    netAmount: 10000,
    vatAmount: 1900,
    grossAmount: 11900,
    vatRate: 19,
    status: 'FINAL',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        D394Service,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<D394Service>(D394Service);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('calculateTotals', () => {
    it('should calculate totals for livrari (L, V, C, N types)', () => {
      const transactions: D394Transaction[] = [
        createMockTransaction({ tip: 'L', bazaImpozabila: 10000, tvaColectata: 1900 }),
        createMockTransaction({ tip: 'V', bazaImpozabila: 5000, tvaColectata: 950 }),
        createMockTransaction({ tip: 'C', bazaImpozabila: 3000, tvaColectata: 570 }),
        createMockTransaction({ tip: 'N', bazaImpozabila: 2000, tvaColectata: 380 }),
      ];

      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaLivrari).toBe(20000);
      expect(totals.totalTVAColectata).toBe(3800);
      expect(totals.totalBazaAchizitii).toBe(0);
      expect(totals.totalTVADeductibila).toBe(0);
      expect(totals.numarTranzactii).toBe(4);
    });

    it('should calculate totals for achizitii (A, AI, AC types)', () => {
      const transactions: D394Transaction[] = [
        createMockTransaction({ tip: 'A', bazaImpozabila: 8000, tvaDeductibila: 1520 }),
        createMockTransaction({ tip: 'AI', bazaImpozabila: 4000, tvaDeductibila: 760 }),
        createMockTransaction({ tip: 'AC', bazaImpozabila: 2000, tvaDeductibila: 380 }),
      ];

      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaAchizitii).toBe(14000);
      expect(totals.totalTVADeductibila).toBe(2660);
      expect(totals.totalBazaLivrari).toBe(0);
      expect(totals.totalTVAColectata).toBe(0);
      expect(totals.numarTranzactii).toBe(3);
    });

    it('should calculate diferentaTVA (TVA de plata)', () => {
      const transactions: D394Transaction[] = [
        createMockTransaction({ tip: 'L', bazaImpozabila: 10000, tvaColectata: 1900 }),
        createMockTransaction({ tip: 'A', bazaImpozabila: 5000, tvaDeductibila: 950 }),
      ];

      const totals = service.calculateTotals(transactions);

      // TVA de plata = 1900 - 950 = 950
      expect(totals.diferentaTVA).toBe(950);
    });

    it('should calculate diferentaTVA (TVA de recuperat)', () => {
      const transactions: D394Transaction[] = [
        createMockTransaction({ tip: 'L', bazaImpozabila: 5000, tvaColectata: 950 }),
        createMockTransaction({ tip: 'A', bazaImpozabila: 10000, tvaDeductibila: 1900 }),
      ];

      const totals = service.calculateTotals(transactions);

      // TVA de recuperat = 950 - 1900 = -950
      expect(totals.diferentaTVA).toBe(-950);
    });

    it('should return zeros for empty transaction list', () => {
      const totals = service.calculateTotals([]);

      expect(totals.totalBazaLivrari).toBe(0);
      expect(totals.totalTVAColectata).toBe(0);
      expect(totals.totalBazaAchizitii).toBe(0);
      expect(totals.totalTVADeductibila).toBe(0);
      expect(totals.diferentaTVA).toBe(0);
      expect(totals.numarTranzactii).toBe(0);
    });

    it('should round amounts to 2 decimal places', () => {
      const transactions: D394Transaction[] = [
        createMockTransaction({ tip: 'L', bazaImpozabila: 100.333, tvaColectata: 19.0633 }),
        createMockTransaction({ tip: 'L', bazaImpozabila: 200.666, tvaColectata: 38.1265 }),
      ];

      const totals = service.calculateTotals(transactions);

      // 100.333 + 200.666 = 301 (rounded)
      expect(totals.totalBazaLivrari).toBe(301);
      // 19.0633 + 38.1265 = 57.19 (rounded)
      expect(totals.totalTVAColectata).toBe(57.19);
    });
  });

  describe('validateD394Data', () => {
    it('should return valid for correct data', () => {
      const transactions = [createMockTransaction()];
      const result = service.validateD394Data(transactions, '2025-01');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate invalid period format', () => {
      const result = service.validateD394Data([], 'invalid');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Perioada invalida (format: YYYY-MM)');
    });

    it('should validate invalid month (13)', () => {
      const result = service.validateD394Data([], '2025-13');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Perioada invalida (format: YYYY-MM)');
    });

    it('should validate invalid month (0)', () => {
      const result = service.validateD394Data([], '2025-00');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Perioada invalida (format: YYYY-MM)');
    });

    it('should validate missing CUI partner', () => {
      const transactions = [createMockTransaction({ cuiPartener: '' })];
      const result = service.validateD394Data(transactions, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tranzactie 1: CUI partener lipsa');
    });

    it('should validate UNKNOWN CUI partner', () => {
      const transactions = [createMockTransaction({ cuiPartener: 'UNKNOWN' })];
      const result = service.validateD394Data(transactions, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tranzactie 1: CUI partener lipsa');
    });

    it('should validate missing partner name', () => {
      const transactions = [createMockTransaction({ denumirePartener: '' })];
      const result = service.validateD394Data(transactions, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tranzactie 1: Denumire partener lipsa');
    });

    it('should validate negative baza impozabila', () => {
      const transactions = [createMockTransaction({ bazaImpozabila: -1000 })];
      const result = service.validateD394Data(transactions, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tranzactie 1: Baza impozabila negativa');
    });

    it('should validate invalid tip operatiune', () => {
      const transactions = [createMockTransaction({ tip: 'X' as any })];
      const result = service.validateD394Data(transactions, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tranzactie 1: Tip operatiune invalid');
    });

    it('should validate all valid tip values', () => {
      const validTips: Array<'L' | 'A' | 'AI' | 'AC' | 'V' | 'C' | 'N'> = ['L', 'A', 'AI', 'AC', 'V', 'C', 'N'];

      for (const tip of validTips) {
        const transactions = [createMockTransaction({ tip })];
        const result = service.validateD394Data(transactions, '2025-01');
        expect(result.valid).toBe(true);
      }
    });

    it('should validate multiple transactions with errors', () => {
      const transactions = [
        createMockTransaction({ cuiPartener: '' }),
        createMockTransaction({ denumirePartener: '' }),
        createMockTransaction({ bazaImpozabila: -100 }),
      ];
      const result = service.validateD394Data(transactions, '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Tranzactie 1: CUI partener lipsa');
      expect(result.errors).toContain('Tranzactie 2: Denumire partener lipsa');
      expect(result.errors).toContain('Tranzactie 3: Baza impozabila negativa');
    });
  });

  describe('getTransactionsForD394', () => {
    it('should get transactions and group by partner', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ partnerCui: '11111111', netAmount: 5000, vatAmount: 950 }),
        createMockInvoice({ partnerCui: '11111111', netAmount: 3000, vatAmount: 570 }),
      ]);

      const transactions = await service.getTransactionsForD394(userId, '2025-01');

      expect(transactions).toHaveLength(1);
      expect(transactions[0].cuiPartener).toBe('11111111');
      expect(transactions[0].bazaImpozabila).toBe(8000);
      expect(transactions[0].tvaColectata).toBe(1520);
      expect(transactions[0].numarDocumente).toBe(2);
    });

    it('should throw error for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getTransactionsForD394('invalid-user', '2025-01'))
        .rejects.toThrow('User not found');
    });

    it('should separate livrari and achizitii', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: InvoiceType.ISSUED, partnerCui: '11111111' }),
        createMockInvoice({ type: InvoiceType.RECEIVED, partnerCui: '22222222' }),
      ]);

      const transactions = await service.getTransactionsForD394(userId, '2025-01');

      expect(transactions).toHaveLength(2);
      const livrari = transactions.find(t => t.tip === 'L');
      const achizitii = transactions.find(t => t.tip === 'A');

      expect(livrari).toBeDefined();
      expect(achizitii).toBeDefined();
    });

    it('should query invoices for correct period', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      await service.getTransactionsForD394(userId, '2025-03');

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          invoiceDate: {
            gte: new Date(2025, 2, 1), // March 1
            lte: new Date(2025, 3, 0), // March 31
          },
        },
      });
    });

    it('should handle UNKNOWN CUI for missing partner info', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ partnerCui: null, partnerName: null }),
      ]);

      const transactions = await service.getTransactionsForD394(userId, '2025-01');

      expect(transactions[0].cuiPartener).toBe('UNKNOWN');
      expect(transactions[0].denumirePartener).toBe('Unknown');
    });

    it('should round amounts to 2 decimal places', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ netAmount: 100.333, vatAmount: 19.0633 }),
        createMockInvoice({ netAmount: 200.666, vatAmount: 38.1265 }),
      ]);

      const transactions = await service.getTransactionsForD394(userId, '2025-01');

      expect(transactions[0].bazaImpozabila).toBe(301);
      expect(transactions[0].tvaColectata).toBe(57.19);
    });

    it('should handle empty invoice list', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const transactions = await service.getTransactionsForD394(userId, '2025-01');

      expect(transactions).toHaveLength(0);
    });
  });

  describe('generateD394Xml', () => {
    it('should generate valid XML', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<D394');
    });

    it('should include ANAF namespace', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('xmlns="mfp:anaf:dgti:d394:declaratie:v4"');
      expect(xml).toContain('versiune="4.0.3"');
    });

    it('should include company CUI without RO prefix', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<CUI_PLATITOR>12345678</CUI_PLATITOR>');
      expect(xml).not.toContain('<CUI_PLATITOR>RO12345678</CUI_PLATITOR>');
    });

    it('should include company details', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<DENUMIRE_PLATITOR>Test Company SRL</DENUMIRE_PLATITOR>');
      expect(xml).toContain('<JUDET>Bucuresti</JUDET>');
      expect(xml).toContain('<LOCALITATE>Sector 1</LOCALITATE>');
      expect(xml).toContain('<STRADA>Calea Victoriei</STRADA>');
      expect(xml).toContain('<NUMAR>100</NUMAR>');
    });

    it('should include period year and month', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, '2025-03', transactions, companyData);

      expect(xml).toContain('<AN>2025</AN>');
      expect(xml).toContain('<LUNA>03</LUNA>');
    });

    it('should include rezumat (summary) section', async () => {
      const transactions = [
        createMockTransaction({ tip: 'L', bazaImpozabila: 10000, tvaColectata: 1900 }),
        createMockTransaction({ tip: 'A', bazaImpozabila: 5000, tvaDeductibila: 950 }),
      ];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<REZUMAT>');
      expect(xml).toContain('<TOTAL_BAZA_L>10000</TOTAL_BAZA_L>');
      expect(xml).toContain('<TOTAL_TVA_L>1900</TOTAL_TVA_L>');
      expect(xml).toContain('<TOTAL_BAZA_A>5000</TOTAL_BAZA_A>');
      expect(xml).toContain('<TOTAL_TVA_A>950</TOTAL_TVA_A>');
      expect(xml).toContain('<TVA_PLATA>950</TVA_PLATA>');
    });

    it('should include TVA_RECUPERAT when applicable', async () => {
      const transactions = [
        createMockTransaction({ tip: 'L', bazaImpozabila: 5000, tvaColectata: 950 }),
        createMockTransaction({ tip: 'A', bazaImpozabila: 10000, tvaDeductibila: 1900 }),
      ];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<TVA_PLATA>0</TVA_PLATA>');
      expect(xml).toContain('<TVA_RECUPERAT>950</TVA_RECUPERAT>');
    });

    it('should include livrari operations', async () => {
      const transactions = [
        createMockTransaction({ tip: 'L', cuiPartener: '11111111', denumirePartener: 'Client A' }),
      ];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<LIVRARI>');
      expect(xml).toContain('<TIP>L</TIP>');
      expect(xml).toContain('<CUI_P>11111111</CUI_P>');
      expect(xml).toContain('<DEN_P>Client A</DEN_P>');
    });

    it('should include achizitii operations', async () => {
      const transactions = [
        createMockTransaction({ tip: 'A', cuiPartener: '22222222', denumirePartener: 'Furnizor B' }),
      ];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<ACHIZITII>');
      expect(xml).toContain('<TIP>A</TIP>');
      expect(xml).toContain('<CUI_P>22222222</CUI_P>');
      expect(xml).toContain('<DEN_P>Furnizor B</DEN_P>');
    });

    it('should include operation number in sequence', async () => {
      const transactions = [
        createMockTransaction({ tip: 'L', cuiPartener: '11111111' }),
        createMockTransaction({ tip: 'L', cuiPartener: '22222222' }),
      ];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('nr="1"');
      expect(xml).toContain('nr="2"');
    });

    it('should include DECLARATIE section', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<DECLARATIE>');
      expect(xml).toContain('<DATA_GENERARE>');
      expect(xml).toContain('<NUMAR_OPERATIUNI>1</NUMAR_OPERATIUNI>');
    });

    it('should handle multiple transactions', async () => {
      const transactions = [
        createMockTransaction({ tip: 'L', cuiPartener: '11111111' }),
        createMockTransaction({ tip: 'L', cuiPartener: '22222222' }),
        createMockTransaction({ tip: 'A', cuiPartener: '33333333' }),
      ];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<NUMAR_OPERATIUNI>3</NUMAR_OPERATIUNI>');
      expect((xml.match(/<CUI_P>/g) || []).length).toBe(3);
    });

    it('should include country code', async () => {
      const transactions = [createMockTransaction({ tara: 'RO' })];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<TARA>RO</TARA>');
    });

    it('should handle EU transactions', async () => {
      const transactions = [createMockTransaction({ tara: 'DE' })];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('<TARA>DE</TARA>');
    });
  });

  describe('submitToANAF', () => {
    const totals: D394Totals = {
      totalBazaLivrari: 10000,
      totalTVAColectata: 1900,
      totalBazaAchizitii: 5000,
      totalTVADeductibila: 950,
      diferentaTVA: 950,
      numarTranzactii: 2,
    };

    it('should create submission record', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.submitToANAF(userId, period, '<xml/>', totals);

      expect(result.id).toMatch(/^D394-2025-01-/);
      expect(result.userId).toBe(userId);
      expect(result.period).toBe(period);
      expect(result.status).toBe('SUBMITTED');
    });

    it('should store in audit log', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.submitToANAF(userId, period, '<xml/>', totals);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          action: 'D394_SUBMISSION',
          entity: 'COMPLIANCE',
          details: expect.objectContaining({
            period,
            totals,
          }),
        }),
      });
    });

    it('should generate correct filename', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.submitToANAF(userId, period, '<xml/>', totals);

      expect(result.fileName).toBe('d394_2025-01.xml');
    });

    it('should store XML content', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});
      const xmlContent = '<?xml version="1.0"?><D394/>';

      const result = await service.submitToANAF(userId, period, xmlContent, totals);

      expect(result.xmlContent).toBe(xmlContent);
    });

    it('should include submission timestamp', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const before = new Date();
      const result = await service.submitToANAF(userId, period, '<xml/>', totals);
      const after = new Date();

      expect(result.submittedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.submittedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getSubmissionHistory', () => {
    it('should return submission history', async () => {
      const mockLogs = [
        {
          entityId: 'D394-2025-01-123',
          createdAt: new Date('2025-01-26'),
          details: { period: '2025-01', fileName: 'd394_2025-01.xml' },
        },
      ];
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const history = await service.getSubmissionHistory(userId);

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('D394-2025-01-123');
      expect(history[0].period).toBe('2025-01');
    });

    it('should query D394_SUBMISSION actions', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getSubmissionHistory(userId);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          action: 'D394_SUBMISSION',
        },
        orderBy: { createdAt: 'desc' },
        take: 24,
      });
    });

    it('should return empty array when no history', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const history = await service.getSubmissionHistory(userId);

      expect(history).toHaveLength(0);
    });

    it('should limit to 24 entries (2 years monthly)', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getSubmissionHistory(userId);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 24 })
      );
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
    });

    it('should return period status', async () => {
      const status = await service.getStatus(userId, '2025-01');

      expect(status.period).toBe('2025-01');
      expect(status).toHaveProperty('transactionCount');
      expect(status).toHaveProperty('totals');
      expect(status).toHaveProperty('submitted');
      expect(status).toHaveProperty('deadline');
    });

    it('should indicate if period is submitted', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        { entityId: 'D394-2025-01-123', createdAt: new Date(), details: { period: '2025-01' } },
      ]);

      const status = await service.getStatus(userId, '2025-01');

      expect(status.submitted).toBe(true);
    });

    it('should indicate if period is not submitted', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const status = await service.getStatus(userId, '2025-01');

      expect(status.submitted).toBe(false);
    });

    it('should include deadline (25th of following month)', async () => {
      const status = await service.getStatus(userId, '2025-01');

      expect(status.deadline).toBe('2025-02-25');
    });

    it('should handle December deadline crossing to next year', async () => {
      const status = await service.getStatus(userId, '2025-12');

      expect(status.deadline).toBe('2026-01-25');
    });

    it('should indicate TVA de plata status', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: InvoiceType.ISSUED, netAmount: 10000, vatAmount: 1900 }),
      ]);

      const status = await service.getStatus(userId, '2025-01');

      expect(status.tvaStatus).toBe('DE_PLATA');
    });

    it('should indicate TVA de recuperat status', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: InvoiceType.RECEIVED, netAmount: 10000, vatAmount: 1900 }),
      ]);

      const status = await service.getStatus(userId, '2025-01');

      expect(status.tvaStatus).toBe('DE_RECUPERAT');
    });

    it('should include transaction count', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ partnerCui: '11111111' }),
        createMockInvoice({ partnerCui: '22222222' }),
        createMockInvoice({ partnerCui: '33333333' }),
      ]);

      const status = await service.getStatus(userId, '2025-01');

      expect(status.transactionCount).toBe(3);
    });

    it('should include totals', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ netAmount: 10000, vatAmount: 1900 }),
      ]);

      const status = await service.getStatus(userId, '2025-01');

      expect(status.totals.totalBazaLivrari).toBe(10000);
      expect(status.totals.totalTVAColectata).toBe(1900);
    });
  });

  describe('Romanian Compliance', () => {
    it('should use D394 version 4.0.3', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('versiune="4.0.3"');
    });

    it('should follow ANAF XML schema namespace', async () => {
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('mfp:anaf:dgti:d394:declaratie:v4');
    });

    it('should set deadline as 25th of following month per ANAF rules', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Test several months
      const testCases = [
        { period: '2025-01', deadline: '2025-02-25' },
        { period: '2025-06', deadline: '2025-07-25' },
        { period: '2025-11', deadline: '2025-12-25' },
        { period: '2025-12', deadline: '2026-01-25' },
      ];

      for (const tc of testCases) {
        const status = await service.getStatus(userId, tc.period);
        expect(status.deadline).toBe(tc.deadline);
      }
    });

    it('should calculate TVA at 19% rate (2025 standard)', async () => {
      const transactions = [
        createMockTransaction({ bazaImpozabila: 10000, tvaColectata: 1900 }),
      ];
      const totals = service.calculateTotals(transactions);

      // Verify 19% VAT calculation is supported
      expect(totals.totalTVAColectata / totals.totalBazaLivrari).toBeCloseTo(0.19, 2);
    });

    it('should support reduced VAT rate 9%', async () => {
      const transactions = [
        createMockTransaction({ bazaImpozabila: 10000, tvaColectata: 900 }),
      ];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalTVAColectata / totals.totalBazaLivrari).toBeCloseTo(0.09, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large transaction amounts', () => {
      const transactions = [
        createMockTransaction({ bazaImpozabila: 100000000, tvaColectata: 19000000 }),
      ];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaLivrari).toBe(100000000);
      expect(totals.totalTVAColectata).toBe(19000000);
    });

    it('should handle Romanian diacritics in partner names', async () => {
      const transactions = [
        createMockTransaction({ denumirePartener: 'Societatea Română de Șțiință SRL' }),
      ];
      const xml = await service.generateD394Xml(userId, period, transactions, companyData);

      expect(xml).toContain('Societatea Română de Șțiință SRL');
    });

    it('should handle special characters in company name', async () => {
      const companyWithSpecialChars = {
        ...companyData,
        denumire: 'Test & Company <SRL>',
      };
      const transactions = [createMockTransaction()];
      const xml = await service.generateD394Xml(userId, period, transactions, companyWithSpecialChars);

      // XML should escape special characters
      expect(xml).toContain('Test &amp; Company');
    });

    it('should handle zero amounts', () => {
      const transactions = [
        createMockTransaction({ bazaImpozabila: 0, tvaColectata: 0 }),
      ];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaLivrari).toBe(0);
      expect(totals.totalTVAColectata).toBe(0);
    });

    it('should handle single document transaction', () => {
      const transactions = [createMockTransaction({ numarDocumente: 1 })];
      const totals = service.calculateTotals(transactions);

      expect(totals.numarTranzactii).toBe(1);
    });

    it('should handle many documents per partner', () => {
      const transactions = [createMockTransaction({ numarDocumente: 1000 })];
      const totals = service.calculateTotals(transactions);

      expect(totals.numarTranzactii).toBe(1);
    });

    it('should handle floating point precision', () => {
      const transactions = [
        createMockTransaction({ bazaImpozabila: 0.1 + 0.2, tvaColectata: 0.019 + 0.038 }),
      ];
      const totals = service.calculateTotals(transactions);

      // Should round to 2 decimal places to avoid floating point issues
      expect(totals.totalBazaLivrari).toBe(0.3);
      expect(totals.totalTVAColectata).toBe(0.06);
    });
  });

  describe('Transaction Types', () => {
    it('should classify L (Livrare) as livrari', () => {
      const transactions = [createMockTransaction({ tip: 'L' })];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaLivrari).toBeGreaterThan(0);
      expect(totals.totalBazaAchizitii).toBe(0);
    });

    it('should classify V (Vanzare) as livrari', () => {
      const transactions = [createMockTransaction({ tip: 'V' })];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaLivrari).toBeGreaterThan(0);
      expect(totals.totalBazaAchizitii).toBe(0);
    });

    it('should classify C (Cesiune) as livrari', () => {
      const transactions = [createMockTransaction({ tip: 'C' })];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaLivrari).toBeGreaterThan(0);
      expect(totals.totalBazaAchizitii).toBe(0);
    });

    it('should classify N (Neimpozabil) as livrari', () => {
      const transactions = [createMockTransaction({ tip: 'N' })];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaLivrari).toBeGreaterThan(0);
      expect(totals.totalBazaAchizitii).toBe(0);
    });

    it('should classify A (Achizitie) as achizitii', () => {
      const transactions = [createMockTransaction({ tip: 'A', tvaDeductibila: 1000 })];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaAchizitii).toBeGreaterThan(0);
      expect(totals.totalBazaLivrari).toBe(0);
    });

    it('should classify AI (Achizitie Intracomunitara) as achizitii', () => {
      const transactions = [createMockTransaction({ tip: 'AI', tvaDeductibila: 1000 })];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaAchizitii).toBeGreaterThan(0);
      expect(totals.totalBazaLivrari).toBe(0);
    });

    it('should classify AC (Achizitie cu taxare inversa) as achizitii', () => {
      const transactions = [createMockTransaction({ tip: 'AC', tvaDeductibila: 1000 })];
      const totals = service.calculateTotals(transactions);

      expect(totals.totalBazaAchizitii).toBeGreaterThan(0);
      expect(totals.totalBazaLivrari).toBe(0);
    });
  });
});
