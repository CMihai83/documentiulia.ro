import { Test, TestingModule } from '@nestjs/testing';
import { RetentionService } from './retention.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RetentionService', () => {
  let service: RetentionService;
  let mockPrismaService: any;

  const userId = 'user-123';

  beforeEach(async () => {
    mockPrismaService = {
      aIQuery: {
        deleteMany: jest.fn().mockResolvedValue({ count: 15 }),
      },
      invoice: {
        count: jest.fn().mockResolvedValue(5),
      },
      vATReport: {
        count: jest.fn().mockResolvedValue(3),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          createdAt: new Date('2020-01-01'),
          _count: {
            invoices: 100,
            employees: 25,
            documents: 50,
            vatReports: 12,
            saftReports: 6,
            aiQueries: 200,
          },
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== RETENTION PERIODS ===================

  describe('Retention Periods', () => {
    it('should define technical logs retention as 365 days (12 months)', () => {
      // Access private property via any cast for testing
      expect((service as any).RETENTION_PERIODS.TECHNICAL_LOGS).toBe(365);
    });

    it('should define AI queries retention as 365 days (12 months)', () => {
      expect((service as any).RETENTION_PERIODS.AI_QUERIES).toBe(365);
    });

    it('should define deleted user grace period as 30 days', () => {
      expect((service as any).RETENTION_PERIODS.DELETED_USER_GRACE).toBe(30);
    });

    it('should define audit logs retention as 3650 days (10 years)', () => {
      expect((service as any).RETENTION_PERIODS.AUDIT_LOGS).toBe(3650);
    });

    it('should define financial data retention as 3650 days (10 years) per Codul Fiscal', () => {
      expect((service as any).RETENTION_PERIODS.FINANCIAL_DATA).toBe(3650);
    });

    it('should define HR data retention as 18250 days (50 years) per Codul Muncii', () => {
      expect((service as any).RETENTION_PERIODS.HR_DATA).toBe(18250);
    });
  });

  // =================== TECHNICAL LOGS CLEANUP ===================

  describe('cleanupTechnicalLogs', () => {
    it('should delete AI queries older than 12 months', async () => {
      await service.cleanupTechnicalLogs();

      expect(mockPrismaService.aIQuery.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should calculate cutoff date as 365 days ago', async () => {
      const now = new Date();
      await service.cleanupTechnicalLogs();

      const call = mockPrismaService.aIQuery.deleteMany.mock.calls[0][0];
      const cutoffDate = call.where.createdAt.lt;

      // Cutoff should be approximately 365 days ago (allow 1 day tolerance)
      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 365);

      const diffDays = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(1);
    });

    it('should log the cleanup action to audit log', async () => {
      await service.cleanupTechnicalLogs();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'RETENTION_TECHNICAL_LOGS_CLEANUP',
          entity: 'RetentionService',
          details: expect.objectContaining({
            deletedAiQueries: 15,
          }),
        }),
      });
    });

    it('should handle deletion errors gracefully', async () => {
      mockPrismaService.aIQuery.deleteMany.mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(service.cleanupTechnicalLogs()).resolves.toBeUndefined();
    });

    it('should return count of deleted queries', async () => {
      mockPrismaService.aIQuery.deleteMany.mockResolvedValue({ count: 42 });

      await service.cleanupTechnicalLogs();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            deletedAiQueries: 42,
          }),
        }),
      });
    });
  });

  // =================== RETENTION REPORT ===================

  describe('generateRetentionReport', () => {
    it('should count invoices approaching 10-year retention', async () => {
      await service.generateRetentionReport();

      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should count VAT reports approaching retention', async () => {
      await service.generateRetentionReport();

      expect(mockPrismaService.vATReport.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should return report with invoice counts', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(10);

      const report = await service.generateRetentionReport();

      expect(report?.invoicesApproachingRetention).toBe(10);
    });

    it('should return report with VAT report counts', async () => {
      mockPrismaService.vATReport.count.mockResolvedValue(8);

      const report = await service.generateRetentionReport();

      expect(report?.vatReportsApproachingRetention).toBe(8);
    });

    it('should include generation timestamp', async () => {
      const before = new Date();
      const report = await service.generateRetentionReport();
      const after = new Date();

      const generatedAt = new Date(report!.generatedAt);
      expect(generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include Romanian fiscal law reference', async () => {
      const report = await service.generateRetentionReport();

      expect(report?.message).toContain('Romanian fiscal law');
    });

    it('should log retention report to audit', async () => {
      await service.generateRetentionReport();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'RETENTION_MONTHLY_RETENTION_REPORT',
        }),
      });
    });

    it('should check for data 9.5 years old (6 months before 10-year limit)', async () => {
      await service.generateRetentionReport();

      const call = mockPrismaService.invoice.count.mock.calls[0][0];
      const cutoffDate = call.where.createdAt.lt;

      // Should be approximately 9.5 years ago
      const now = new Date();
      const expectedCutoff = new Date(now);
      expectedCutoff.setFullYear(expectedCutoff.getFullYear() - 9);
      expectedCutoff.setMonth(expectedCutoff.getMonth() - 6);

      const diffDays = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(2); // Allow 2 days tolerance
    });

    it('should handle errors gracefully', async () => {
      mockPrismaService.invoice.count.mockRejectedValue(new Error('DB Error'));

      await expect(service.generateRetentionReport()).resolves.toBeUndefined();
    });
  });

  // =================== DATA DELETION SCHEDULING ===================

  describe('scheduleDataDeletion', () => {
    it('should schedule deletion with default 30-day retention', async () => {
      const result = await service.scheduleDataDeletion(userId);

      expect(result.retentionDays).toBe(30);
    });

    it('should calculate scheduled deletion date correctly', async () => {
      const now = new Date();
      const result = await service.scheduleDataDeletion(userId, 30);

      const scheduledDate = new Date(result.scheduledDeletionDate);
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 30);

      const diffDays = Math.abs(scheduledDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(1);
    });

    it('should accept custom retention days', async () => {
      const result = await service.scheduleDataDeletion(userId, 90);

      expect(result.retentionDays).toBe(90);
    });

    it('should return userId in response', async () => {
      const result = await service.scheduleDataDeletion(userId);

      expect(result.userId).toBe(userId);
    });

    it('should include note about legal retention requirements', async () => {
      const result = await service.scheduleDataDeletion(userId);

      expect(result.note).toContain('Financial');
      expect(result.note).toContain('HR');
      expect(result.note).toContain('Romanian legal');
    });

    it('should log scheduled deletion to audit', async () => {
      await service.scheduleDataDeletion(userId, 30);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'RETENTION_DELETION_SCHEDULED',
          details: expect.objectContaining({
            userId,
            retentionDays: 30,
          }),
        }),
      });
    });

    it('should handle different user IDs', async () => {
      const result1 = await service.scheduleDataDeletion('user-A');
      const result2 = await service.scheduleDataDeletion('user-B');

      expect(result1.userId).toBe('user-A');
      expect(result2.userId).toBe('user-B');
    });
  });

  // =================== RETENTION STATUS ===================

  describe('getRetentionStatus', () => {
    it('should return user retention status', async () => {
      const status = await service.getRetentionStatus(userId);

      expect(status).toBeDefined();
      expect(status?.userId).toBe(userId);
    });

    it('should return null for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const status = await service.getRetentionStatus('non-existent');

      expect(status).toBeNull();
    });

    it('should calculate account age in days', async () => {
      const createdAt = new Date('2020-01-01');
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        createdAt,
        _count: { invoices: 0, employees: 0, documents: 0, vatReports: 0, saftReports: 0, aiQueries: 0 },
      });

      const status = await service.getRetentionStatus(userId);

      expect(status?.accountAgeDays).toBeGreaterThan(0);
    });

    it('should include data counts', async () => {
      const status = await service.getRetentionStatus(userId);

      expect(status?.dataCounts.invoices).toBe(100);
      expect(status?.dataCounts.employees).toBe(25);
      expect(status?.dataCounts.documents).toBe(50);
    });

    it('should include retention policies', async () => {
      const status = await service.getRetentionStatus(userId);

      expect(status?.retentionPolicies.length).toBe(4);
    });

    it('should include financial data policy (10 years)', async () => {
      const status = await service.getRetentionStatus(userId);

      const financialPolicy = status?.retentionPolicies.find(p => p.dataType.includes('Invoices'));
      expect(financialPolicy?.retentionPeriod).toBe('10 years');
      expect(financialPolicy?.legalBasis).toContain('Fiscal Code');
    });

    it('should include HR data policy (50 years)', async () => {
      const status = await service.getRetentionStatus(userId);

      const hrPolicy = status?.retentionPolicies.find(p => p.dataType.includes('Employee'));
      expect(hrPolicy?.retentionPeriod).toBe('50 years');
      expect(hrPolicy?.legalBasis).toContain('Labor Code');
    });

    it('should include AI queries policy (12 months)', async () => {
      const status = await service.getRetentionStatus(userId);

      const aiPolicy = status?.retentionPolicies.find(p => p.dataType === 'AI Queries');
      expect(aiPolicy?.retentionPeriod).toBe('12 months');
      expect(aiPolicy?.legalBasis).toContain('GDPR');
    });

    it('should allow deletion of AI queries regardless of age', async () => {
      const status = await service.getRetentionStatus(userId);

      const aiPolicy = status?.retentionPolicies.find(p => p.dataType === 'AI Queries');
      expect(aiPolicy?.canDelete).toBe(true);
    });

    it('should not allow financial data deletion within 10 years', async () => {
      // Account created 5 years ago
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        createdAt: fiveYearsAgo,
        _count: { invoices: 10, employees: 5, documents: 20, vatReports: 6, saftReports: 3, aiQueries: 50 },
      });

      const status = await service.getRetentionStatus(userId);

      const financialPolicy = status?.retentionPolicies.find(p => p.dataType.includes('Invoices'));
      expect(financialPolicy?.canDelete).toBe(false);
    });

    it('should allow financial data deletion after 10 years', async () => {
      // Account created 11 years ago
      const elevenYearsAgo = new Date();
      elevenYearsAgo.setFullYear(elevenYearsAgo.getFullYear() - 11);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        createdAt: elevenYearsAgo,
        _count: { invoices: 10, employees: 5, documents: 20, vatReports: 6, saftReports: 3, aiQueries: 50 },
      });

      const status = await service.getRetentionStatus(userId);

      const financialPolicy = status?.retentionPolicies.find(p => p.dataType.includes('Invoices'));
      expect(financialPolicy?.canDelete).toBe(true);
    });

    it('should query correct user fields', async () => {
      await service.getRetentionStatus(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.objectContaining({
          id: true,
          createdAt: true,
          _count: expect.any(Object),
        }),
      });
    });

    it('should include account creation date in ISO format', async () => {
      const status = await service.getRetentionStatus(userId);

      expect(status?.accountCreated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should combine invoices and VAT reports count for financial data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        createdAt: new Date(),
        _count: { invoices: 100, employees: 0, documents: 0, vatReports: 50, saftReports: 0, aiQueries: 0 },
      });

      const status = await service.getRetentionStatus(userId);

      const financialPolicy = status?.retentionPolicies.find(p => p.dataType.includes('Invoices'));
      expect(financialPolicy?.count).toBe(150); // 100 + 50
    });
  });

  // =================== AUDIT LOGGING ===================

  describe('Audit Logging', () => {
    it('should log cleanup actions with system user', async () => {
      await service.cleanupTechnicalLogs();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'system',
        }),
      });
    });

    it('should log with RetentionService entity', async () => {
      await service.cleanupTechnicalLogs();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entity: 'RetentionService',
        }),
      });
    });

    it('should handle audit log failures gracefully', async () => {
      mockPrismaService.auditLog.create.mockRejectedValue(new Error('Audit failed'));

      // Should not throw
      await expect(service.cleanupTechnicalLogs()).resolves.toBeUndefined();
    });

    it('should include cutoff date in technical log cleanup audit', async () => {
      await service.cleanupTechnicalLogs();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            cutoffDate: expect.any(String),
          }),
        }),
      });
    });
  });

  // =================== ROMANIAN LEGAL COMPLIANCE ===================

  describe('Romanian Legal Compliance', () => {
    it('should reference Codul Fiscal for financial data', async () => {
      const status = await service.getRetentionStatus(userId);

      const policy = status?.retentionPolicies.find(p => p.dataType.includes('Invoices'));
      expect(policy?.legalBasis).toContain('Codul Fiscal');
    });

    it('should reference Codul Muncii for HR data', async () => {
      const status = await service.getRetentionStatus(userId);

      const policy = status?.retentionPolicies.find(p => p.dataType.includes('Employee'));
      expect(policy?.legalBasis).toContain('Codul Muncii');
    });

    it('should maintain 10-year retention for invoices', () => {
      const tenYearsInDays = 10 * 365;
      expect((service as any).RETENTION_PERIODS.FINANCIAL_DATA).toBe(tenYearsInDays);
    });

    it('should maintain 50-year retention for HR data', () => {
      const fiftyYearsInDays = 50 * 365;
      expect((service as any).RETENTION_PERIODS.HR_DATA).toBe(fiftyYearsInDays);
    });

    it('should maintain 10-year retention for audit logs', () => {
      const tenYearsInDays = 10 * 365;
      expect((service as any).RETENTION_PERIODS.AUDIT_LOGS).toBe(tenYearsInDays);
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle user with no data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        createdAt: new Date(),
        _count: { invoices: 0, employees: 0, documents: 0, vatReports: 0, saftReports: 0, aiQueries: 0 },
      });

      const status = await service.getRetentionStatus(userId);

      expect(status?.dataCounts.invoices).toBe(0);
    });

    it('should handle zero day retention schedule', async () => {
      const result = await service.scheduleDataDeletion(userId, 0);

      const scheduledDate = new Date(result.scheduledDeletionDate);
      const now = new Date();

      // Should be same day
      expect(scheduledDate.toDateString()).toBe(now.toDateString());
    });

    it('should handle very old account (>50 years)', async () => {
      const sixtyYearsAgo = new Date();
      sixtyYearsAgo.setFullYear(sixtyYearsAgo.getFullYear() - 60);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        createdAt: sixtyYearsAgo,
        _count: { invoices: 1, employees: 1, documents: 1, vatReports: 1, saftReports: 1, aiQueries: 1 },
      });

      const status = await service.getRetentionStatus(userId);

      // All data should be deletable
      status?.retentionPolicies.forEach(policy => {
        expect(policy.canDelete).toBe(true);
      });
    });

    it('should handle report with zero counts', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(0);
      mockPrismaService.vATReport.count.mockResolvedValue(0);

      const report = await service.generateRetentionReport();

      expect(report?.invoicesApproachingRetention).toBe(0);
      expect(report?.vatReportsApproachingRetention).toBe(0);
    });

    it('should handle cleanup with zero deletions', async () => {
      mockPrismaService.aIQuery.deleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupTechnicalLogs();

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            deletedAiQueries: 0,
          }),
        }),
      });
    });
  });
});
