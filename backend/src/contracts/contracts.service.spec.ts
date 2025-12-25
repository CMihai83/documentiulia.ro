import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractsService, CreateContractDto, UpdateContractDto, ContractFilters } from './contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractType, ContractStatus } from '@prisma/client';

describe('ContractsService', () => {
  let service: ContractsService;
  let mockPrismaService: any;

  const userId = 'user-123';
  const contractId = 'contract-001';

  const createMockContract = (overrides: any = {}) => ({
    id: contractId,
    userId,
    contractNumber: 'CTR-2025-001',
    title: 'Service Agreement',
    description: 'Monthly IT services',
    type: ContractType.SERVICE,
    status: ContractStatus.DRAFT,
    partnerId: 'partner-001',
    partnerName: 'Tech Solutions SRL',
    partnerCui: 'RO12345678',
    partnerAddress: 'Str. Victoriei 100, Bucuresti',
    totalValue: 50000,
    currency: 'RON',
    paymentTerms: 'Net 30',
    billingFrequency: 'Monthly',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    autoRenew: false,
    renewalPeriodMonths: 12,
    renewalNoticesDays: 30,
    tags: ['IT', 'Services'],
    notes: '',
    signedAt: null,
    terminatedAt: null,
    isCompliant: true,
    complianceNotes: null,
    linkedInvoiceIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    partner: { id: 'partner-001', name: 'Tech Solutions SRL' },
    ...overrides,
  });

  const createContractDto: CreateContractDto = {
    contractNumber: 'CTR-2025-001',
    title: 'Service Agreement',
    description: 'Monthly IT services',
    type: ContractType.SERVICE,
    partnerId: 'partner-001',
    partnerName: 'Tech Solutions SRL',
    partnerCui: 'RO12345678',
    partnerAddress: 'Str. Victoriei 100, Bucuresti',
    totalValue: 50000,
    currency: 'RON',
    paymentTerms: 'Net 30',
    billingFrequency: 'Monthly',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    autoRenew: false,
    renewalPeriodMonths: 12,
    renewalNoticesDays: 30,
    tags: ['IT', 'Services'],
    notes: '',
  };

  beforeEach(async () => {
    mockPrismaService = {
      contract: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a contract successfully', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract());

      const result = await service.create(userId, createContractDto);

      expect(result.contractNumber).toBe('CTR-2025-001');
      expect(result.title).toBe('Service Agreement');
      expect(result.status).toBe(ContractStatus.DRAFT);
    });

    it('should throw BadRequestException for duplicate contract number', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(createMockContract());

      await expect(service.create(userId, createContractDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should default to SERVICE type if not provided', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract({ type: ContractType.SERVICE }));

      const dtoWithoutType = { ...createContractDto, type: undefined };
      await service.create(userId, dtoWithoutType);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: ContractType.SERVICE }),
        })
      );
    });

    it('should default to RON currency if not provided', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract());

      const dtoWithoutCurrency = { ...createContractDto, currency: undefined };
      await service.create(userId, dtoWithoutCurrency);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currency: 'RON' }),
        })
      );
    });

    it('should default autoRenew to false if not provided', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract());

      const dtoWithoutAutoRenew = { ...createContractDto, autoRenew: undefined };
      await service.create(userId, dtoWithoutAutoRenew);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ autoRenew: false }),
        })
      );
    });

    it('should convert date strings to Date objects', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract());

      await service.create(userId, createContractDto);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        })
      );
    });

    it('should handle null endDate', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract({ endDate: null }));

      const dtoWithoutEndDate = { ...createContractDto, endDate: undefined };
      await service.create(userId, dtoWithoutEndDate);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ endDate: null }),
        })
      );
    });

    it('should include partner relation in response', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract());

      await service.create(userId, createContractDto);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({ include: { partner: true } })
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated contracts', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([createMockContract()]);
      mockPrismaService.contract.count.mockResolvedValue(1);

      const result = await service.findAll(userId);

      expect(result.contracts).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by type', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId, { type: ContractType.SALE });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: ContractType.SALE }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId, { status: ContractStatus.ACTIVE });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ContractStatus.ACTIVE }),
        })
      );
    });

    it('should filter by partnerId', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId, { partnerId: 'partner-001' });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ partnerId: 'partner-001' }),
        })
      );
    });

    it('should search across multiple fields', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId, { search: 'tech' });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ contractNumber: expect.any(Object) }),
              expect.objectContaining({ title: expect.any(Object) }),
              expect.objectContaining({ partnerName: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should filter by date ranges', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      const startDateFrom = new Date('2025-01-01');
      const startDateTo = new Date('2025-06-30');
      await service.findAll(userId, { startDateFrom, startDateTo });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: { gte: startDateFrom, lte: startDateTo },
          }),
        })
      );
    });

    it('should filter by value range', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId, { minValue: 10000, maxValue: 100000 });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            totalValue: { gte: 10000, lte: 100000 },
          }),
        })
      );
    });

    it('should filter by tags', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId, { tags: ['IT', 'Services'] });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['IT', 'Services'] },
          }),
        })
      );
    });

    it('should paginate correctly', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(50);

      const result = await service.findAll(userId, { page: 3, limit: 10 });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should order by createdAt descending', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId);

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('findById', () => {
    it('should return a contract by id', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(createMockContract());

      const result = await service.findById(userId, contractId);

      expect(result.id).toBe(contractId);
      expect(mockPrismaService.contract.findFirst).toHaveBeenCalledWith({
        where: { id: contractId, userId },
        include: { partner: true, document: true },
      });
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);

      await expect(service.findById(userId, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a contract successfully', async () => {
      const existingContract = createMockContract({ status: ContractStatus.DRAFT });
      mockPrismaService.contract.findFirst.mockResolvedValue(existingContract);
      mockPrismaService.contract.update.mockResolvedValue({ ...existingContract, title: 'Updated Title' });

      const result = await service.update(userId, contractId, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw BadRequestException when modifying terminated contract', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.TERMINATED })
      );

      await expect(service.update(userId, contractId, { title: 'New Title' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should update status', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(createMockContract());
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE })
      );

      await service.update(userId, contractId, { status: ContractStatus.ACTIVE });

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ContractStatus.ACTIVE }),
        })
      );
    });

    it('should convert date strings to Date objects', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(createMockContract());
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.update(userId, contractId, { startDate: '2025-02-01' });

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete a contract successfully', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(createMockContract());
      mockPrismaService.contract.delete.mockResolvedValue({});

      const result = await service.delete(userId, contractId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.contract.delete).toHaveBeenCalledWith({ where: { id: contractId } });
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);

      await expect(service.delete(userId, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('should activate a draft contract', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.DRAFT })
      );
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE })
      );

      const result = await service.activate(userId, contractId);

      expect(result.status).toBe(ContractStatus.ACTIVE);
    });

    it('should activate a pending approval contract', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.PENDING_APPROVAL })
      );
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE })
      );

      const result = await service.activate(userId, contractId);

      expect(result.status).toBe(ContractStatus.ACTIVE);
    });

    it('should throw BadRequestException for non-draft/pending contracts', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE })
      );

      await expect(service.activate(userId, contractId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('sign', () => {
    it('should sign a contract successfully', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ signedAt: null })
      );
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ signedAt: new Date(), status: ContractStatus.ACTIVE })
      );

      const result = await service.sign(userId, contractId);

      expect(result.signedAt).toBeDefined();
      expect(result.status).toBe(ContractStatus.ACTIVE);
    });

    it('should throw BadRequestException if already signed', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ signedAt: new Date() })
      );

      await expect(service.sign(userId, contractId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('suspend', () => {
    it('should suspend an active contract', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE })
      );
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ status: ContractStatus.SUSPENDED })
      );

      const result = await service.suspend(userId, contractId, 'Payment issues');

      expect(result.status).toBe(ContractStatus.SUSPENDED);
    });

    it('should throw BadRequestException for non-active contracts', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.DRAFT })
      );

      await expect(service.suspend(userId, contractId))
        .rejects.toThrow(BadRequestException);
    });

    it('should append reason to notes', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE, notes: 'Original note' })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.suspend(userId, contractId, 'Payment issues');

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('[SUSPENDED] Payment issues'),
          }),
        })
      );
    });
  });

  describe('terminate', () => {
    it('should terminate a contract', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE })
      );
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ status: ContractStatus.TERMINATED, terminatedAt: new Date() })
      );

      const result = await service.terminate(userId, contractId, 'Contract breach');

      expect(result.status).toBe(ContractStatus.TERMINATED);
    });

    it('should throw BadRequestException if already terminated', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.TERMINATED })
      );

      await expect(service.terminate(userId, contractId))
        .rejects.toThrow(BadRequestException);
    });

    it('should set terminatedAt timestamp', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.terminate(userId, contractId);

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            terminatedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should append reason to notes', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ status: ContractStatus.ACTIVE, notes: '' })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.terminate(userId, contractId, 'Contract breach');

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('[TERMINATED] Contract breach'),
          }),
        })
      );
    });
  });

  describe('renew', () => {
    it('should renew with explicit new end date', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ endDate: new Date('2025-12-31') })
      );
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ status: ContractStatus.RENEWED, endDate: new Date('2026-12-31') })
      );

      const result = await service.renew(userId, contractId, '2026-12-31');

      expect(result.status).toBe(ContractStatus.RENEWED);
    });

    it('should renew using renewalPeriodMonths for auto-renew contracts', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({
          autoRenew: true,
          renewalPeriodMonths: 12,
          endDate: new Date('2025-12-31'),
        })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.renew(userId, contractId);

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endDate: expect.any(Date),
          }),
        })
      );
    });

    it('should throw BadRequestException for non-auto-renew without new date', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ autoRenew: false })
      );

      await expect(service.renew(userId, contractId))
        .rejects.toThrow(BadRequestException);
    });

    it('should default to 1 year extension if no renewalPeriodMonths', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({
          autoRenew: true,
          renewalPeriodMonths: null,
          endDate: new Date('2025-12-31'),
        })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.renew(userId, contractId);

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContractStatus.RENEWED,
            endDate: expect.any(Date),
          }),
        })
      );
    });

    it('should append renewal note', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({
          autoRenew: true,
          endDate: new Date('2025-12-31'),
          notes: '',
        })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.renew(userId, contractId);

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('[RENEWED]'),
          }),
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return contract statistics', async () => {
      mockPrismaService.contract.count.mockResolvedValue(10);
      mockPrismaService.contract.groupBy
        .mockResolvedValueOnce([
          { status: ContractStatus.ACTIVE, _count: 5, _sum: { totalValue: 100000 } },
          { status: ContractStatus.DRAFT, _count: 3, _sum: { totalValue: 50000 } },
        ])
        .mockResolvedValueOnce([
          { type: ContractType.SERVICE, _count: 6, _sum: { totalValue: 80000 } },
          { type: ContractType.SALE, _count: 4, _sum: { totalValue: 70000 } },
        ]);
      mockPrismaService.contract.aggregate.mockResolvedValue({
        _sum: { totalValue: 100000 },
      });

      const result = await service.getStats(userId);

      expect(result.total).toBe(10);
      expect(result.activeValue).toBe(100000);
      expect(result.byStatus).toHaveLength(2);
      expect(result.byType).toHaveLength(2);
    });

    it('should handle no contracts', async () => {
      mockPrismaService.contract.count.mockResolvedValue(0);
      mockPrismaService.contract.groupBy.mockResolvedValue([]);
      mockPrismaService.contract.aggregate.mockResolvedValue({
        _sum: { totalValue: null },
      });

      const result = await service.getStats(userId);

      expect(result.total).toBe(0);
      expect(result.activeValue).toBe(0);
      expect(result.byStatus).toHaveLength(0);
      expect(result.byType).toHaveLength(0);
    });
  });

  describe('getExpiringContracts', () => {
    it('should return contracts expiring within specified days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      mockPrismaService.contract.findMany.mockResolvedValue([
        createMockContract({ endDate: futureDate }),
      ]);

      const result = await service.getExpiringContracts(userId, 30);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContractStatus.ACTIVE,
            endDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should default to 30 days ahead', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);

      await service.getExpiringContracts(userId);

      // Verify that the date range was set correctly (30 days ahead)
      expect(mockPrismaService.contract.findMany).toHaveBeenCalled();
    });

    it('should order by endDate ascending', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);

      await service.getExpiringContracts(userId);

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { endDate: 'asc' },
        })
      );
    });
  });

  describe('getContractsForRenewal', () => {
    it('should return auto-renew contracts with end dates', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([
        createMockContract({ autoRenew: true, endDate: new Date('2025-12-31') }),
      ]);

      const result = await service.getContractsForRenewal(userId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: ContractStatus.ACTIVE,
          autoRenew: true,
          endDate: { not: null },
        },
        include: { partner: true },
      });
    });
  });

  describe('linkInvoice', () => {
    it('should link an invoice to a contract', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: [] })
      );
      mockPrismaService.contract.update.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: ['inv-001'] })
      );

      const result = await service.linkInvoice(userId, contractId, 'inv-001');

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { linkedInvoiceIds: ['inv-001'] },
        })
      );
    });

    it('should not duplicate invoice links', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: ['inv-001'] })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.linkInvoice(userId, contractId, 'inv-001');

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { linkedInvoiceIds: ['inv-001'] },
        })
      );
    });

    it('should add to existing linked invoices', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: ['inv-001'] })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.linkInvoice(userId, contractId, 'inv-002');

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { linkedInvoiceIds: ['inv-001', 'inv-002'] },
        })
      );
    });
  });

  describe('unlinkInvoice', () => {
    it('should unlink an invoice from a contract', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: ['inv-001', 'inv-002'] })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.unlinkInvoice(userId, contractId, 'inv-001');

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { linkedInvoiceIds: ['inv-002'] },
        })
      );
    });

    it('should handle empty linkedInvoiceIds', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: null })
      );
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.unlinkInvoice(userId, contractId, 'inv-001');

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { linkedInvoiceIds: [] },
        })
      );
    });
  });

  describe('getLinkedInvoices', () => {
    it('should return linked invoices with totals', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: ['inv-001', 'inv-002'], totalValue: 100000 })
      );
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { id: 'inv-001', grossAmount: 25000 },
        { id: 'inv-002', grossAmount: 25000 },
      ]);

      const result = await service.getLinkedInvoices(userId, contractId);

      expect(result.invoices).toHaveLength(2);
      expect(result.totalInvoiced).toBe(50000);
      expect(result.contractValue).toBe(100000);
      expect(result.invoicedPercentage).toBe(50);
    });

    it('should return empty for contracts with no linked invoices', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: [] })
      );

      const result = await service.getLinkedInvoices(userId, contractId);

      expect(result.invoices).toHaveLength(0);
      expect(result.totalInvoiced).toBe(0);
    });

    it('should handle null linkedInvoiceIds', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: null })
      );

      const result = await service.getLinkedInvoices(userId, contractId);

      expect(result.invoices).toHaveLength(0);
    });

    it('should calculate invoiced percentage correctly', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: ['inv-001'], totalValue: 100000 })
      );
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { id: 'inv-001', grossAmount: 33333 },
      ]);

      const result = await service.getLinkedInvoices(userId, contractId);

      expect(result.invoicedPercentage).toBe(33.33);
    });

    it('should handle zero contract value', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(
        createMockContract({ linkedInvoiceIds: ['inv-001'], totalValue: 0 })
      );
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { id: 'inv-001', grossAmount: 1000 },
      ]);

      const result = await service.getLinkedInvoices(userId, contractId);

      expect(result.invoicedPercentage).toBe(0);
    });
  });

  describe('checkExpiringContracts (Cron)', () => {
    it('should find expiring contracts within 30 days', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.checkExpiringContracts();

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContractStatus.ACTIVE,
            endDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should auto-expire contracts past end date', async () => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.updateMany.mockResolvedValue({ count: 2 });

      await service.checkExpiringContracts();

      expect(mockPrismaService.contract.updateMany).toHaveBeenCalledWith({
        where: {
          status: ContractStatus.ACTIVE,
          autoRenew: false,
          endDate: { lt: expect.any(Date) },
        },
        data: { status: ContractStatus.EXPIRED },
      });
    });

    it('should auto-renew eligible contracts', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      mockPrismaService.contract.findMany
        .mockResolvedValueOnce([]) // First call for expiring
        .mockResolvedValueOnce([
          createMockContract({
            id: 'contract-renew',
            autoRenew: true,
            renewalPeriodMonths: 12,
            endDate: pastDate,
          }),
        ]); // Second call for to renew
      mockPrismaService.contract.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.contract.update.mockResolvedValue(createMockContract());

      await service.checkExpiringContracts();

      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-renew' },
          data: expect.objectContaining({
            status: ContractStatus.RENEWED,
            endDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Contract Types', () => {
    it.each([
      ContractType.SERVICE,
      ContractType.SALE,
      ContractType.PURCHASE,
      ContractType.LEASE,
      ContractType.EMPLOYMENT,
      ContractType.FRAMEWORK,
      ContractType.NDA,
      ContractType.OTHER,
    ])('should handle %s contract type', async (type) => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract({ type }));

      const dto = { ...createContractDto, type };
      const result = await service.create(userId, dto);

      expect(result.type).toBe(type);
    });
  });

  describe('Contract Statuses', () => {
    it.each([
      ContractStatus.DRAFT,
      ContractStatus.PENDING_APPROVAL,
      ContractStatus.ACTIVE,
      ContractStatus.SUSPENDED,
      ContractStatus.EXPIRED,
      ContractStatus.TERMINATED,
      ContractStatus.RENEWED,
    ])('should filter by %s status', async (status) => {
      mockPrismaService.contract.findMany.mockResolvedValue([]);
      mockPrismaService.contract.count.mockResolvedValue(0);

      await service.findAll(userId, { status });

      expect(mockPrismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large contract values', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(
        createMockContract({ totalValue: 100000000 })
      );

      const dto = { ...createContractDto, totalValue: 100000000 };
      const result = await service.create(userId, dto);

      expect(result.totalValue).toBe(100000000);
    });

    it('should handle Romanian diacritics in partner names', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(
        createMockContract({ partnerName: 'Societatea Română de Științe SRL' })
      );

      const dto = { ...createContractDto, partnerName: 'Societatea Română de Științe SRL' };
      const result = await service.create(userId, dto);

      expect(result.partnerName).toBe('Societatea Română de Științe SRL');
    });

    it('should handle empty tags array', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract({ tags: [] }));

      const dto = { ...createContractDto, tags: [] };
      await service.create(userId, dto);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags: [] }),
        })
      );
    });

    it('should handle multiple currencies', async () => {
      const currencies = ['RON', 'EUR', 'USD', 'GBP'];

      for (const currency of currencies) {
        mockPrismaService.contract.findFirst.mockResolvedValue(null);
        mockPrismaService.contract.create.mockResolvedValue(createMockContract({ currency }));

        const dto = { ...createContractDto, contractNumber: `CTR-${currency}`, currency };
        const result = await service.create(userId, dto);

        expect(result.currency).toBe(currency);
      }
    });

    it('should handle contract without end date (indefinite)', async () => {
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(createMockContract({ endDate: null }));

      const dto = { ...createContractDto, endDate: undefined };
      const result = await service.create(userId, dto);

      expect(mockPrismaService.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ endDate: null }),
        })
      );
    });

    it('should handle long contract numbers', async () => {
      const longContractNumber = 'CTR-2025-SERVICE-TECH-SOLUTIONS-001-REV-A';
      mockPrismaService.contract.findFirst.mockResolvedValue(null);
      mockPrismaService.contract.create.mockResolvedValue(
        createMockContract({ contractNumber: longContractNumber })
      );

      const dto = { ...createContractDto, contractNumber: longContractNumber };
      const result = await service.create(userId, dto);

      expect(result.contractNumber).toBe(longContractNumber);
    });
  });
});
