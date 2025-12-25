import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { EfacturaService } from '../anaf/efactura.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SagaService } from '../saga/saga.service';
import { MultiCurrencyService } from '../finance/multi-currency.service';
import { NotFoundException } from '@nestjs/common';
import { InvoiceType, InvoiceStatus } from '@prisma/client';
import { InvoiceTypeDto } from './dto/create-invoice.dto';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: PrismaService;

  const mockMultiCurrencyService = {
    getRateForInvoice: jest.fn().mockResolvedValue({
      rate: 1,
      sourceCurrency: 'RON',
      targetCurrency: 'RON',
      timestamp: new Date().toISOString(),
    }),
    convertAmount: jest.fn().mockImplementation((amount) => amount),
    getExchangeRate: jest.fn().mockResolvedValue(1),
  };

  const mockPrismaService = {
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockEfacturaService = {
    generateUBL: jest.fn(),
    submitToSPV: jest.fn(),
    checkStatus: jest.fn(),
  };

  const mockNotificationsService = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockSagaService = {
    syncInvoice: jest.fn().mockResolvedValue({ sagaId: 'saga-123', status: 'synced' }),
  };

  const mockUserId = 'test-user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EfacturaService, useValue: mockEfacturaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: SagaService, useValue: mockSagaService },
        { provide: MultiCurrencyService, useValue: mockMultiCurrencyService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an invoice with correct VAT calculation (21%)', async () => {
      const dto = {
        invoiceNumber: 'INV-2025-001',
        invoiceDate: '2025-01-15',
        type: InvoiceTypeDto.ISSUED,
        partnerName: 'Test Client SRL',
        partnerCui: 'RO12345678',
        partnerAddress: 'Test Address',
        netAmount: 10000,
        vatRate: 21,
      };

      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-1',
        ...dto,
        vatAmount: 2100,
        grossAmount: 12100,
        status: InvoiceStatus.DRAFT,
      });

      const result = await service.create(mockUserId, dto);

      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          invoiceNumber: 'INV-2025-001',
          netAmount: 10000,
          vatRate: 21,
          vatAmount: 2100,
          grossAmount: 12100,
          status: InvoiceStatus.DRAFT,
        }),
      });
      expect(result.vatAmount).toBe(2100);
      expect(result.grossAmount).toBe(12100);
    });

    it('should create invoice with reduced VAT rate (11%)', async () => {
      const dto = {
        invoiceNumber: 'INV-2025-002',
        invoiceDate: '2025-01-15',
        type: InvoiceTypeDto.RECEIVED,
        partnerName: 'Food Supplier',
        partnerCui: 'RO87654321',
        netAmount: 5000,
        vatRate: 11,
      };

      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-2',
        ...dto,
        vatAmount: 550,
        grossAmount: 5550,
        status: InvoiceStatus.DRAFT,
      });

      const result = await service.create(mockUserId, dto);

      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vatAmount: 550,
          grossAmount: 5550,
        }),
      });
    });

    it('should default currency to RON', async () => {
      const dto = {
        invoiceNumber: 'INV-2025-003',
        invoiceDate: '2025-01-15',
        type: InvoiceTypeDto.ISSUED,
        partnerName: 'Client',
        netAmount: 1000,
        vatRate: 21,
      };

      mockPrismaService.invoice.create.mockResolvedValue({
        id: 'inv-3',
        ...dto,
        currency: 'RON',
      });

      await service.create(mockUserId, dto);

      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'RON',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated invoices', async () => {
      const mockInvoices = [
        { id: 'inv-1', invoiceNumber: 'INV-001' },
        { id: 'inv-2', invoiceNumber: 'INV-002' },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockPrismaService.invoice.count.mockResolvedValue(2);

      const result = await service.findAll(mockUserId, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockInvoices);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by invoice type', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { type: InvoiceType.ISSUED });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            type: InvoiceType.ISSUED,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { status: InvoiceStatus.SUBMITTED });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InvoiceStatus.SUBMITTED,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(mockUserId, { startDate, endDate });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoiceDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return invoice by id', async () => {
      const mockInvoice = {
        id: 'inv-1',
        userId: mockUserId,
        invoiceNumber: 'INV-001',
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.findOne(mockUserId, 'inv-1');

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', userId: mockUserId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update invoice fields', async () => {
      const existingInvoice = {
        id: 'inv-1',
        userId: mockUserId,
        netAmount: 10000,
        vatRate: 21,
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(existingInvoice);
      mockPrismaService.invoice.findUnique.mockResolvedValue(existingInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...existingInvoice,
        partnerName: 'Updated Client',
      });

      const result = await service.update(mockUserId, 'inv-1', {
        partnerName: 'Updated Client',
      });

      expect(result.partnerName).toBe('Updated Client');
    });

    it('should recalculate VAT when netAmount changes', async () => {
      const existingInvoice = {
        id: 'inv-1',
        userId: mockUserId,
        netAmount: 10000,
        vatRate: 21,
        vatAmount: 2100,
        grossAmount: 12100,
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(existingInvoice);
      mockPrismaService.invoice.findUnique.mockResolvedValue(existingInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...existingInvoice,
        netAmount: 20000,
        vatAmount: 4200,
        grossAmount: 24200,
      });

      await service.update(mockUserId, 'inv-1', { netAmount: 20000 });

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          netAmount: 20000,
          vatAmount: 4200,
          grossAmount: 24200,
        }),
      });
    });

    it('should recalculate when vatRate changes', async () => {
      const existingInvoice = {
        id: 'inv-1',
        userId: mockUserId,
        netAmount: 10000,
        vatRate: 21,
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(existingInvoice);
      mockPrismaService.invoice.findUnique.mockResolvedValue(existingInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...existingInvoice,
        vatRate: 11,
        vatAmount: 1100,
        grossAmount: 11100,
      });

      await service.update(mockUserId, 'inv-1', { vatRate: 11 });

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          vatRate: 11,
          vatAmount: 1100,
          grossAmount: 11100,
        }),
      });
    });
  });

  describe('delete', () => {
    it('should delete invoice', async () => {
      const mockInvoice = { id: 'inv-1', userId: mockUserId };

      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.delete.mockResolvedValue(mockInvoice);

      const result = await service.delete(mockUserId, 'inv-1');

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.invoice.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent invoice', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.delete(mockUserId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSummary', () => {
    it('should calculate VAT summary for a period', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({
          _sum: { netAmount: 35000, vatAmount: 7350, grossAmount: 42350 },
          _count: 2,
        })
        .mockResolvedValueOnce({
          _sum: { netAmount: 8000, vatAmount: 1380, grossAmount: 9380 },
          _count: 2,
        });

      const result = await service.getSummary(mockUserId, '2025-01');

      expect(result.period).toBe('2025-01');
      expect(result.issued.count).toBe(2);
      expect(result.issued.vatAmount).toBe(7350);
      expect(result.received.count).toBe(2);
      expect(result.received.vatAmount).toBe(1380);
      expect(result.vatSummary.collected).toBe(7350);
      expect(result.vatSummary.deductible).toBe(1380);
      expect(result.vatSummary.payable).toBe(5970);
    });

    it('should handle zero invoices', async () => {
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { netAmount: null, vatAmount: null, grossAmount: null },
        _count: 0,
      });

      const result = await service.getSummary(mockUserId, '2025-02');

      expect(result.issued.count).toBe(0);
      expect(result.vatSummary.payable).toBe(0);
    });
  });

  describe('finalizeAndSubmit', () => {
    it('should submit issued invoice to e-Factura', async () => {
      const mockInvoice = {
        id: 'inv-1',
        userId: mockUserId,
        type: InvoiceType.ISSUED,
        invoiceNumber: 'INV-001',
        invoiceDate: new Date('2025-01-15'),
        partnerName: 'Client SRL',
        partnerCui: 'RO12345678',
        partnerAddress: 'Test Address',
        netAmount: 10000,
        vatRate: 21,
        vatAmount: 2100,
        grossAmount: 12100,
      };

      const mockUser = {
        id: mockUserId,
        cui: 'RO87654321',
        company: 'My Company SRL',
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockEfacturaService.generateUBL.mockReturnValue('<xml>...</xml>');
      mockEfacturaService.submitToSPV.mockResolvedValue({
        uploadIndex: 'UPL123456',
        status: 'submitted',
      });
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.SUBMITTED,
        efacturaId: 'UPL123456',
      });

      const result = await service.finalizeAndSubmit(mockUserId, 'inv-1');

      expect(mockEfacturaService.generateUBL).toHaveBeenCalled();
      expect(mockEfacturaService.submitToSPV).toHaveBeenCalled();
      expect(result.efactura.uploadIndex).toBe('UPL123456');
    });

    it('should reject received invoices', async () => {
      const mockInvoice = {
        id: 'inv-1',
        userId: mockUserId,
        type: InvoiceType.RECEIVED,
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        cui: 'RO12345678',
      });

      await expect(
        service.finalizeAndSubmit(mockUserId, 'inv-1'),
      ).rejects.toThrow('Only issued invoices can be submitted');
    });

    it('should reject when user has no CUI', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        type: InvoiceType.ISSUED,
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        cui: null,
      });

      await expect(
        service.finalizeAndSubmit(mockUserId, 'inv-1'),
      ).rejects.toThrow('User CUI not configured');
    });
  });

  describe('checkEfacturaStatus', () => {
    it('should check e-Factura status from ANAF', async () => {
      const mockInvoice = {
        id: 'inv-1',
        userId: mockUserId,
        efacturaId: 'UPL123456',
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockEfacturaService.checkStatus.mockResolvedValue({
        status: 'ACCEPTED',
        messages: [],
      });
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        efacturaStatus: 'ACCEPTED',
      });

      const result = await service.checkEfacturaStatus(mockUserId, 'inv-1');

      expect(result.status).toBe('ACCEPTED');
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { efacturaStatus: 'ACCEPTED' },
      });
    });

    it('should throw when invoice not submitted to e-Factura', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        efacturaId: null,
      });

      await expect(
        service.checkEfacturaStatus(mockUserId, 'inv-1'),
      ).rejects.toThrow('Invoice not submitted to e-Factura');
    });
  });
});
