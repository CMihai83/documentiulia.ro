import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockAuditLog = {
    id: 'audit-1',
    userId: 'user-123',
    organizationId: 'org-456',
    action: 'CREATE',
    entity: 'Invoice',
    entityId: 'inv-789',
    details: { amount: 1000 },
    ipAddress: '192.168.1.1',
    createdAt: new Date('2025-12-07T10:00:00Z'),
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
    },
    organization: {
      id: 'org-456',
      name: 'Test Company SRL',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll({ limit: 50, offset: 0 });

      expect(result).toEqual({
        data: [
          {
            id: 'audit-1',
            userId: 'user-123',
            userName: 'John Doe',
            userEmail: 'john@example.com',
            organizationId: 'org-456',
            organizationName: 'Test Company SRL',
            action: 'CREATE',
            entity: 'Invoice',
            entityId: 'inv-789',
            details: { amount: 1000 },
            ipAddress: '192.168.1.1',
            createdAt: mockAuditLog.createdAt,
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should filter by userId', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll({ userId: 'user-123', limit: 50, offset: 0 });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-123' }),
        }),
      );
    });

    it('should filter by organizationId', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll({ organizationId: 'org-456', limit: 50, offset: 0 });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-456' }),
        }),
      );
    });

    it('should filter by action', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll({ action: 'CREATE', limit: 50, offset: 0 });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'CREATE' }),
        }),
      );
    });

    it('should filter by entity', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAll({ entity: 'Invoice', limit: 50, offset: 0 });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity: 'Invoice' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2025-12-01');
      const endDate = new Date('2025-12-07');

      await service.findAll({ startDate, endDate, limit: 50, offset: 0 });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should paginate correctly with hasMore=true', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrismaService.auditLog.count.mockResolvedValue(100);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(100);
    });
  });

  describe('findOne', () => {
    it('should return a single audit log', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(mockAuditLog);

      const result = await service.findOne('audit-1');

      expect(result).toEqual({
        id: 'audit-1',
        userId: 'user-123',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        organizationId: 'org-456',
        organizationName: 'Test Company SRL',
        action: 'CREATE',
        entity: 'Invoice',
        entityId: 'inv-789',
        details: { amount: 1000 },
        ipAddress: '192.168.1.1',
        createdAt: mockAuditLog.createdAt,
      });
    });

    it('should return null when audit log not found', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getDistinctActions', () => {
    it('should return distinct action types', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        { action: 'CREATE' },
        { action: 'UPDATE' },
        { action: 'DELETE' },
      ]);

      const result = await service.getDistinctActions();

      expect(result).toEqual(['CREATE', 'UPDATE', 'DELETE']);
    });
  });

  describe('getDistinctEntities', () => {
    it('should return distinct entity types', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        { entity: 'Invoice' },
        { entity: 'Document' },
        { entity: 'User' },
      ]);

      const result = await service.getDistinctEntities();

      expect(result).toEqual(['Invoice', 'Document', 'User']);
    });
  });

  describe('getStats', () => {
    it('should return audit log statistics', async () => {
      mockPrismaService.auditLog.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(50); // today

      mockPrismaService.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'CREATE', _count: { action: 500 } },
          { action: 'UPDATE', _count: { action: 300 } },
        ])
        .mockResolvedValueOnce([
          { entity: 'Invoice', _count: { entity: 600 } },
          { entity: 'Document', _count: { entity: 200 } },
        ]);

      const result = await service.getStats();

      expect(result).toEqual({
        totalLogs: 1000,
        todayLogs: 50,
        topActions: [
          { action: 'CREATE', count: 500 },
          { action: 'UPDATE', count: 300 },
        ],
        topEntities: [
          { entity: 'Invoice', count: 600 },
          { entity: 'Document', count: 200 },
        ],
      });
    });

    it('should filter stats by organizationId', async () => {
      mockPrismaService.auditLog.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10);
      mockPrismaService.auditLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getStats('org-123');

      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
      });
    });
  });
});
