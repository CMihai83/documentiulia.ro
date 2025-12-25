import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GdprService } from './gdpr.service';
import { PrismaService } from '../prisma/prisma.service';
import { DsrType, DsrStatus, ConsentPurpose } from './gdpr.dto';

describe('GdprService', () => {
  let service: GdprService;

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    employees: [{ id: 'emp_1' }, { id: 'emp_2' }],
    invoices: [],
    documents: [],
    vatReports: [],
    saftReports: [],
    aiQueries: [],
    auditLogs: [],
  };

  const mockDsrRequest = {
    id: 'dsr_123',
    userId: 'user_123',
    type: DsrType.DATA_ACCESS,
    status: DsrStatus.PENDING,
    reason: 'I want to see my data',
    additionalDetails: null,
    adminNotes: null,
    rejectionReason: null,
    processedBy: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockConsent = {
    id: 'consent_123',
    userId: 'user_123',
    purpose: 'MARKETING',
    granted: true,
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    timestamp: new Date(),
  };

  const mockPrismaService = {
    dSRRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    consent: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    employee: {
      deleteMany: jest.fn(),
    },
    payroll: {
      deleteMany: jest.fn(),
    },
    document: {
      deleteMany: jest.fn(),
    },
    invoice: {
      deleteMany: jest.fn(),
    },
    vATReport: {
      deleteMany: jest.fn(),
    },
    sAFTReport: {
      deleteMany: jest.fn(),
    },
    aIQuery: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('DSR Request Management', () => {
    describe('createDsrRequest', () => {
      it('should create a DSR request', async () => {
        mockPrismaService.dSRRequest.findFirst.mockResolvedValue(null);
        mockPrismaService.dSRRequest.create.mockResolvedValue(mockDsrRequest);
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.createDsrRequest(
          'user_123',
          { type: DsrType.DATA_ACCESS, reason: 'Test reason' },
          '127.0.0.1'
        );

        expect(result).toBeDefined();
        expect(result.type).toBe(DsrType.DATA_ACCESS);
      });

      it('should reject duplicate pending requests', async () => {
        mockPrismaService.dSRRequest.findFirst.mockResolvedValue(mockDsrRequest);

        await expect(
          service.createDsrRequest(
            'user_123',
            { type: DsrType.DATA_ACCESS, reason: 'Test' }
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should create audit log entry', async () => {
        mockPrismaService.dSRRequest.findFirst.mockResolvedValue(null);
        mockPrismaService.dSRRequest.create.mockResolvedValue(mockDsrRequest);
        mockPrismaService.auditLog.create.mockResolvedValue({});

        await service.createDsrRequest(
          'user_123',
          { type: DsrType.DATA_ACCESS, reason: 'Test' },
          '127.0.0.1'
        );

        expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: 'DSR_REQUEST_CREATED',
            }),
          })
        );
      });

      it('should support DATA_ACCESS request type', async () => {
        mockPrismaService.dSRRequest.findFirst.mockResolvedValue(null);
        mockPrismaService.dSRRequest.create.mockResolvedValue({
          ...mockDsrRequest,
          type: DsrType.DATA_ACCESS,
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.createDsrRequest(
          'user_123',
          { type: DsrType.DATA_ACCESS, reason: 'Test' }
        );

        expect(result.type).toBe(DsrType.DATA_ACCESS);
      });

      it('should support DATA_DELETION request type', async () => {
        mockPrismaService.dSRRequest.findFirst.mockResolvedValue(null);
        mockPrismaService.dSRRequest.create.mockResolvedValue({
          ...mockDsrRequest,
          type: DsrType.DATA_DELETION,
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.createDsrRequest(
          'user_123',
          { type: DsrType.DATA_DELETION, reason: 'Delete my data' }
        );

        expect(result.type).toBe(DsrType.DATA_DELETION);
      });

      it('should support DATA_EXPORT request type', async () => {
        mockPrismaService.dSRRequest.findFirst.mockResolvedValue(null);
        mockPrismaService.dSRRequest.create.mockResolvedValue({
          ...mockDsrRequest,
          type: DsrType.DATA_EXPORT,
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.createDsrRequest(
          'user_123',
          { type: DsrType.DATA_EXPORT, reason: 'Export my data' }
        );

        expect(result.type).toBe(DsrType.DATA_EXPORT);
      });

      it('should support DATA_RECTIFICATION request type', async () => {
        mockPrismaService.dSRRequest.findFirst.mockResolvedValue(null);
        mockPrismaService.dSRRequest.create.mockResolvedValue({
          ...mockDsrRequest,
          type: DsrType.DATA_RECTIFICATION,
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.createDsrRequest(
          'user_123',
          { type: DsrType.DATA_RECTIFICATION, reason: 'Fix my data' }
        );

        expect(result.type).toBe(DsrType.DATA_RECTIFICATION);
      });
    });

    describe('getDsrRequests', () => {
      it('should get all DSR requests', async () => {
        mockPrismaService.dSRRequest.findMany.mockResolvedValue([mockDsrRequest]);

        const result = await service.getDsrRequests();

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
      });

      it('should filter by userId', async () => {
        mockPrismaService.dSRRequest.findMany.mockResolvedValue([mockDsrRequest]);

        await service.getDsrRequests('user_123');

        expect(mockPrismaService.dSRRequest.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ userId: 'user_123' }),
          })
        );
      });

      it('should filter by status', async () => {
        mockPrismaService.dSRRequest.findMany.mockResolvedValue([mockDsrRequest]);

        await service.getDsrRequests(undefined, DsrStatus.PENDING);

        expect(mockPrismaService.dSRRequest.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ status: DsrStatus.PENDING }),
          })
        );
      });

      it('should order by createdAt descending', async () => {
        mockPrismaService.dSRRequest.findMany.mockResolvedValue([mockDsrRequest]);

        await service.getDsrRequests();

        expect(mockPrismaService.dSRRequest.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          })
        );
      });
    });

    describe('getDsrRequest', () => {
      it('should get DSR request by ID', async () => {
        mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);

        const result = await service.getDsrRequest('dsr_123');

        expect(result).toBeDefined();
        expect(result.id).toBe('dsr_123');
      });

      it('should throw NotFoundException for non-existent request', async () => {
        mockPrismaService.dSRRequest.findUnique.mockResolvedValue(null);

        await expect(service.getDsrRequest('non-existent'))
          .rejects.toThrow(NotFoundException);
      });
    });

    describe('updateDsrRequest', () => {
      it('should update DSR request status', async () => {
        mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);
        mockPrismaService.dSRRequest.update.mockResolvedValue({
          ...mockDsrRequest,
          status: DsrStatus.IN_PROGRESS,
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.updateDsrRequest(
          'dsr_123',
          { status: DsrStatus.IN_PROGRESS },
          'admin_123'
        );

        expect(result.status).toBe(DsrStatus.IN_PROGRESS);
      });

      it('should throw NotFoundException for non-existent request', async () => {
        mockPrismaService.dSRRequest.findUnique.mockResolvedValue(null);

        await expect(
          service.updateDsrRequest('non-existent', { status: DsrStatus.IN_PROGRESS }, 'admin')
        ).rejects.toThrow(NotFoundException);
      });

      it('should set processedAt when completed', async () => {
        mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);
        mockPrismaService.dSRRequest.update.mockImplementation(({ data }) => {
          return Promise.resolve({
            ...mockDsrRequest,
            ...data,
          });
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        await service.updateDsrRequest(
          'dsr_123',
          { status: DsrStatus.COMPLETED },
          'admin_123'
        );

        expect(mockPrismaService.dSRRequest.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              processedAt: expect.any(Date),
            }),
          })
        );
      });

      it('should create audit log entry on update', async () => {
        mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);
        mockPrismaService.dSRRequest.update.mockResolvedValue({
          ...mockDsrRequest,
          status: DsrStatus.IN_PROGRESS,
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        await service.updateDsrRequest(
          'dsr_123',
          { status: DsrStatus.IN_PROGRESS },
          'admin_123'
        );

        expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: 'DSR_REQUEST_UPDATED',
            }),
          })
        );
      });

      it('should execute deletion when DATA_DELETION is approved', async () => {
        const deletionRequest = {
          ...mockDsrRequest,
          type: DsrType.DATA_DELETION,
        };
        mockPrismaService.dSRRequest.findUnique.mockResolvedValue(deletionRequest);
        mockPrismaService.dSRRequest.update.mockResolvedValue({
          ...deletionRequest,
          status: DsrStatus.APPROVED,
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        await service.updateDsrRequest(
          'dsr_123',
          { status: DsrStatus.APPROVED },
          'admin_123'
        );

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });
    });
  });

  describe('Consent Management', () => {
    describe('updateConsent', () => {
      it('should update consent', async () => {
        mockPrismaService.consent.upsert.mockResolvedValue(mockConsent);
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.updateConsent(
          'user_123',
          { purpose: ConsentPurpose.MARKETING, granted: true },
          '127.0.0.1',
          'Test Agent'
        );

        expect(result).toBeDefined();
        expect(result.granted).toBe(true);
      });

      it('should create audit log entry', async () => {
        mockPrismaService.consent.upsert.mockResolvedValue(mockConsent);
        mockPrismaService.auditLog.create.mockResolvedValue({});

        await service.updateConsent(
          'user_123',
          { purpose: ConsentPurpose.MARKETING, granted: true },
          '127.0.0.1'
        );

        expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: 'CONSENT_UPDATED',
            }),
          })
        );
      });

      it('should support ESSENTIAL consent purpose', async () => {
        mockPrismaService.consent.upsert.mockResolvedValue({
          ...mockConsent,
          purpose: 'ESSENTIAL',
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.updateConsent(
          'user_123',
          { purpose: ConsentPurpose.ESSENTIAL, granted: true }
        );

        expect(result.purpose).toBe('ESSENTIAL');
      });

      it('should support ANALYTICS consent purpose', async () => {
        mockPrismaService.consent.upsert.mockResolvedValue({
          ...mockConsent,
          purpose: 'ANALYTICS',
        });
        mockPrismaService.auditLog.create.mockResolvedValue({});

        const result = await service.updateConsent(
          'user_123',
          { purpose: ConsentPurpose.ANALYTICS, granted: false }
        );

        expect(result.purpose).toBe('ANALYTICS');
      });

      it('should record IP address', async () => {
        mockPrismaService.consent.upsert.mockResolvedValue(mockConsent);
        mockPrismaService.auditLog.create.mockResolvedValue({});

        await service.updateConsent(
          'user_123',
          { purpose: ConsentPurpose.MARKETING, granted: true },
          '192.168.1.1'
        );

        expect(mockPrismaService.consent.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: expect.objectContaining({
              ipAddress: '192.168.1.1',
            }),
          })
        );
      });

      it('should record user agent', async () => {
        mockPrismaService.consent.upsert.mockResolvedValue(mockConsent);
        mockPrismaService.auditLog.create.mockResolvedValue({});

        await service.updateConsent(
          'user_123',
          { purpose: ConsentPurpose.MARKETING, granted: true },
          '127.0.0.1',
          'Mozilla/5.0'
        );

        expect(mockPrismaService.consent.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: expect.objectContaining({
              userAgent: 'Mozilla/5.0',
            }),
          })
        );
      });
    });

    describe('getUserConsents', () => {
      it('should get user consents', async () => {
        mockPrismaService.consent.findMany.mockResolvedValue([mockConsent]);

        const result = await service.getUserConsents('user_123');

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
      });

      it('should order by timestamp descending', async () => {
        mockPrismaService.consent.findMany.mockResolvedValue([mockConsent]);

        await service.getUserConsents('user_123');

        expect(mockPrismaService.consent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { timestamp: 'desc' },
          })
        );
      });
    });
  });

  describe('Data Export (Article 20)', () => {
    it('should export user data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user_123');

      expect(result).toBeDefined();
      expect(result.gdprArticle).toContain('Article 20');
      expect(result.personalData).toBeDefined();
    });

    it('should include export date', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user_123');

      expect(result.exportDate).toBeDefined();
    });

    it('should include data controller info', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user_123');

      expect(result.dataController).toBe('DocumentIulia.ro SRL');
    });

    it('should include data subject info', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user_123');

      expect(result.dataSubject).toBeDefined();
      expect(result.dataSubject.id).toBe('user_123');
      expect(result.dataSubject.email).toBe('test@example.com');
    });

    it('should include metadata', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user_123');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.format).toBe('JSON');
      expect(result.metadata.charset).toBe('UTF-8');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Data Deletion (Article 17)', () => {
    it('should delete user data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.deleteUserData('user_123');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.gdprArticle).toContain('Article 17');
    });

    it('should include deletion timestamp', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.deleteUserData('user_123');

      expect(result.deletedAt).toBeDefined();
    });

    it('should include affected user ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.deleteUserData('user_123');

      expect(result.affectedUserId).toBe('user_123');
    });

    it('should include legal retention note', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.deleteUserData('user_123');

      expect(result.note).toContain('legal');
    });

    it('should execute deletion in transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.deleteUserData('user_123');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should delete related entities', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.deleteUserData('user_123');

      expect(mockPrismaService.employee.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.document.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.invoice.deleteMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUserData('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Consent Log', () => {
    it('should get consent log', async () => {
      const result = await service.getConsentLog('user_123');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return consent records with required fields', async () => {
      const result = await service.getConsentLog('user_123');

      result.forEach(record => {
        expect(record.id).toBeDefined();
        expect(record.userId).toBe('user_123');
        expect(record.purpose).toBeDefined();
        expect(typeof record.granted).toBe('boolean');
        expect(record.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Record Consent', () => {
    it('should record consent', async () => {
      const result = await service.recordConsent('user_123', 'Marketing', true);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should include consent details in response', async () => {
      const result = await service.recordConsent('user_123', 'Analytics', false);

      expect(result.consent).toBeDefined();
      expect(result.consent.userId).toBe('user_123');
      expect(result.consent.purpose).toBe('Analytics');
      expect(result.consent.granted).toBe(false);
    });

    it('should include recorded timestamp', async () => {
      const result = await service.recordConsent('user_123', 'Marketing', true);

      expect(result.consent.recordedAt).toBeDefined();
    });
  });

  describe('Data Inventory', () => {
    it('should get data inventory', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      expect(result).toBeDefined();
      expect(result.inventory).toBeDefined();
      expect(Array.isArray(result.inventory)).toBe(true);
    });

    it('should include Identity Data category', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      const identityCategory = result.inventory.find(i => i.category === 'Identity Data');
      expect(identityCategory).toBeDefined();
    });

    it('should include Financial Data category', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      const financialCategory = result.inventory.find(i => i.category === 'Financial Data');
      expect(financialCategory).toBeDefined();
    });

    it('should include HR Data category', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      const hrCategory = result.inventory.find(i => i.category === 'HR Data');
      expect(hrCategory).toBeDefined();
    });

    it('should include Technical Data category', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      const technicalCategory = result.inventory.find(i => i.category === 'Technical Data');
      expect(technicalCategory).toBeDefined();
    });

    it('should include legal basis for each category', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      result.inventory.forEach(item => {
        expect(item.legalBasis).toBeDefined();
        expect(item.legalBasis).toContain('GDPR');
      });
    });

    it('should include retention periods', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      result.inventory.forEach(item => {
        expect(item.retention).toBeDefined();
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getDataInventory('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('GDPR Articles Compliance', () => {
    it('should reference Article 20 for data portability', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportUserData('user_123');

      expect(result.gdprArticle).toContain('Article 20');
      expect(result.gdprArticle).toContain('Portability');
    });

    it('should reference Article 17 for data erasure', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.deleteUserData('user_123');

      expect(result.gdprArticle).toContain('Article 17');
      expect(result.gdprArticle).toContain('Erasure');
    });

    it('should reference legal bases in data inventory', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      const legalBases = result.inventory.map(i => i.legalBasis);

      // Check for common legal bases
      expect(legalBases.some(lb => lb.includes('Art. 6(1)(b)'))).toBe(true); // Contract
      expect(legalBases.some(lb => lb.includes('Art. 6(1)(c)'))).toBe(true); // Legal obligation
      expect(legalBases.some(lb => lb.includes('Art. 6(1)(f)'))).toBe(true); // Legitimate interest
    });
  });

  describe('DSR Status Flow', () => {
    it('should start with PENDING status', async () => {
      mockPrismaService.dSRRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.dSRRequest.create.mockResolvedValue({
        ...mockDsrRequest,
        status: DsrStatus.PENDING,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.createDsrRequest(
        'user_123',
        { type: DsrType.DATA_ACCESS, reason: 'Test' }
      );

      expect(result.status).toBe(DsrStatus.PENDING);
    });

    it('should support IN_PROGRESS status', async () => {
      mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);
      mockPrismaService.dSRRequest.update.mockResolvedValue({
        ...mockDsrRequest,
        status: DsrStatus.IN_PROGRESS,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.updateDsrRequest(
        'dsr_123',
        { status: DsrStatus.IN_PROGRESS },
        'admin_123'
      );

      expect(result.status).toBe(DsrStatus.IN_PROGRESS);
    });

    it('should support APPROVED status', async () => {
      mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);
      mockPrismaService.dSRRequest.update.mockResolvedValue({
        ...mockDsrRequest,
        status: DsrStatus.APPROVED,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.updateDsrRequest(
        'dsr_123',
        { status: DsrStatus.APPROVED },
        'admin_123'
      );

      expect(result.status).toBe(DsrStatus.APPROVED);
    });

    it('should support REJECTED status', async () => {
      mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);
      mockPrismaService.dSRRequest.update.mockResolvedValue({
        ...mockDsrRequest,
        status: DsrStatus.REJECTED,
        rejectionReason: 'Invalid request',
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.updateDsrRequest(
        'dsr_123',
        { status: DsrStatus.REJECTED, rejectionReason: 'Invalid request' },
        'admin_123'
      );

      expect(result.status).toBe(DsrStatus.REJECTED);
    });

    it('should support COMPLETED status', async () => {
      mockPrismaService.dSRRequest.findUnique.mockResolvedValue(mockDsrRequest);
      mockPrismaService.dSRRequest.update.mockResolvedValue({
        ...mockDsrRequest,
        status: DsrStatus.COMPLETED,
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.updateDsrRequest(
        'dsr_123',
        { status: DsrStatus.COMPLETED },
        'admin_123'
      );

      expect(result.status).toBe(DsrStatus.COMPLETED);
    });
  });

  describe('Romanian Compliance', () => {
    it('should mention Romanian fiscal law in retention', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      const financialData = result.inventory.find(i => i.category === 'Financial Data');
      expect(financialData?.retention).toContain('Romanian');
    });

    it('should mention Romanian labor law for HR data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDataInventory('user_123');

      const hrData = result.inventory.find(i => i.category === 'HR Data');
      expect(hrData?.retention).toContain('50 years');
    });

    it('should note legal retention requirements in deletion response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.deleteUserData('user_123');

      expect(result.note).toContain('10 years');
      expect(result.note).toContain('Romanian');
    });
  });
});
