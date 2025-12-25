import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceAuditService } from './compliance-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus } from '@prisma/client';

describe('ComplianceAuditService', () => {
  let service: ComplianceAuditService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUserId = 'user-123';

  const mockVehicles = [
    {
      id: 'vehicle-1',
      licensePlate: 'M-DL 1234',
      status: VehicleStatus.AVAILABLE,
      tuvExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      insuranceExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'vehicle-2',
      licensePlate: 'M-DL 5678',
      status: VehicleStatus.IN_USE,
      tuvExpiry: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Expired
      insuranceExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'vehicle-3',
      licensePlate: 'M-DL 9999',
      status: VehicleStatus.OUT_OF_SERVICE,
      tuvExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      insuranceExpiry: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired
    },
  ];

  const mockRoutes = [
    {
      id: 'route-1',
      userId: mockUserId,
      driverId: 'driver-1',
      routeDate: new Date(),
      actualStartTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
      actualEndTime: new Date(),
      driver: { id: 'driver-1', firstName: 'Max', lastName: 'Mustermann' },
    },
    {
      id: 'route-2',
      userId: mockUserId,
      driverId: 'driver-1',
      routeDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      actualStartTime: new Date(Date.now() - 32 * 60 * 60 * 1000),
      actualEndTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      driver: { id: 'driver-1', firstName: 'Max', lastName: 'Mustermann' },
    },
  ];

  const mockEmployees = [
    { id: 'driver-1', userId: mockUserId, firstName: 'Max', lastName: 'Mustermann' },
    { id: 'driver-2', userId: mockUserId, firstName: 'Hans', lastName: 'Schmidt' },
  ];

  const mockPrismaService = {
    vehicle: {
      findMany: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
    maintenanceLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    fuelLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAuditService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ComplianceAuditService>(ComplianceAuditService);
    prismaService = module.get(PrismaService);

    // Default mock returns
    mockPrismaService.vehicle.findMany.mockResolvedValue(mockVehicles);
    mockPrismaService.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
    mockPrismaService.employee.findMany.mockResolvedValue(mockEmployees);
    mockPrismaService.maintenanceLog.findFirst.mockResolvedValue(null);
    mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);
    mockPrismaService.fuelLog.findMany.mockResolvedValue([]);
  });

  describe('Audit Logging', () => {
    describe('logAudit', () => {
      it('should log an audit event', async () => {
        const result = await service.logAudit(mockUserId, {
          performedBy: 'user-456',
          performerName: 'Admin User',
          action: 'UPDATE',
          entity: 'VEHICLE',
          entityId: 'vehicle-1',
          entityName: 'M-DL 1234',
          changes: [
            { field: 'status', oldValue: 'AVAILABLE', newValue: 'IN_USE' },
          ],
        });

        expect(result).toBeDefined();
        expect(result.id).toMatch(/^audit-/);
        expect(result.action).toBe('UPDATE');
        expect(result.entity).toBe('VEHICLE');
        expect(result.entityId).toBe('vehicle-1');
        expect(result.performedBy).toBe('user-456');
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should log audit with metadata', async () => {
        const result = await service.logAudit(mockUserId, {
          performedBy: 'user-456',
          action: 'CREATE',
          entity: 'ROUTE',
          entityId: 'route-123',
          metadata: { routeType: 'MORNING', stopsCount: 15 },
        });

        expect(result.metadata).toEqual({ routeType: 'MORNING', stopsCount: 15 });
      });
    });

    describe('getAuditLogs', () => {
      it('should return audit logs for user', async () => {
        // Log some events first
        await service.logAudit(mockUserId, {
          performedBy: 'user-1',
          action: 'CREATE',
          entity: 'VEHICLE',
          entityId: 'v-1',
        });
        await service.logAudit(mockUserId, {
          performedBy: 'user-2',
          action: 'UPDATE',
          entity: 'DRIVER',
          entityId: 'd-1',
        });

        const result = await service.getAuditLogs(mockUserId);

        expect(result.logs.length).toBeGreaterThanOrEqual(2);
        expect(result.total).toBeGreaterThanOrEqual(2);
      });

      it('should filter logs by action', async () => {
        await service.logAudit(mockUserId, {
          performedBy: 'user-1',
          action: 'CREATE',
          entity: 'VEHICLE',
          entityId: 'v-1',
        });
        await service.logAudit(mockUserId, {
          performedBy: 'user-2',
          action: 'DELETE',
          entity: 'VEHICLE',
          entityId: 'v-2',
        });

        const result = await service.getAuditLogs(mockUserId, { action: 'CREATE' });

        expect(result.logs.every(l => l.action === 'CREATE')).toBe(true);
      });

      it('should filter logs by entity', async () => {
        await service.logAudit(mockUserId, {
          performedBy: 'user-1',
          action: 'CREATE',
          entity: 'VEHICLE',
          entityId: 'v-1',
        });
        await service.logAudit(mockUserId, {
          performedBy: 'user-2',
          action: 'CREATE',
          entity: 'ROUTE',
          entityId: 'r-1',
        });

        const result = await service.getAuditLogs(mockUserId, { entity: 'VEHICLE' });

        expect(result.logs.every(l => l.entity === 'VEHICLE')).toBe(true);
      });

      it('should support pagination', async () => {
        for (let i = 0; i < 10; i++) {
          await service.logAudit(mockUserId, {
            performedBy: 'user-1',
            action: 'UPDATE',
            entity: 'VEHICLE',
            entityId: `v-${i}`,
          });
        }

        const result = await service.getAuditLogs(mockUserId, { limit: 5, offset: 0 });

        expect(result.logs.length).toBe(5);
        expect(result.total).toBeGreaterThanOrEqual(10);
      });
    });

    describe('getEntityHistory', () => {
      it('should return history for specific entity', async () => {
        await service.logAudit(mockUserId, {
          performedBy: 'user-1',
          action: 'CREATE',
          entity: 'VEHICLE',
          entityId: 'v-1',
        });
        await service.logAudit(mockUserId, {
          performedBy: 'user-1',
          action: 'UPDATE',
          entity: 'VEHICLE',
          entityId: 'v-1',
        });
        await service.logAudit(mockUserId, {
          performedBy: 'user-1',
          action: 'UPDATE',
          entity: 'VEHICLE',
          entityId: 'v-2',
        });

        const result = await service.getEntityHistory(mockUserId, 'VEHICLE', 'v-1');

        expect(result.length).toBe(2);
        expect(result.every(l => l.entityId === 'v-1')).toBe(true);
      });
    });
  });

  describe('Compliance Checks', () => {
    describe('checkVehicleCompliance', () => {
      it('should detect expired TÜV', async () => {
        const issues = await service.checkVehicleCompliance(mockUserId);

        const tuvIssue = issues.find(
          i => i.title.includes('TÜV abgelaufen') && i.entity.name === 'M-DL 5678',
        );
        expect(tuvIssue).toBeDefined();
        expect(tuvIssue!.severity).toBe('CRITICAL');
      });

      it('should detect expired insurance', async () => {
        const issues = await service.checkVehicleCompliance(mockUserId);

        const insuranceIssue = issues.find(
          i => i.title.includes('Versicherung abgelaufen') && i.entity.name === 'M-DL 9999',
        );
        expect(insuranceIssue).toBeDefined();
        expect(insuranceIssue!.severity).toBe('CRITICAL');
      });

      it('should detect out of service vehicles', async () => {
        const issues = await service.checkVehicleCompliance(mockUserId);

        const outOfServiceIssue = issues.find(
          i => i.title.includes('außer Betrieb') && i.entity.name === 'M-DL 9999',
        );
        expect(outOfServiceIssue).toBeDefined();
        expect(outOfServiceIssue!.severity).toBe('MEDIUM');
      });
    });

    describe('runComplianceChecks', () => {
      it('should run all compliance checks', async () => {
        const issues = await service.runComplianceChecks(mockUserId);

        expect(issues).toBeInstanceOf(Array);
        expect(issues.length).toBeGreaterThan(0);

        // Should have various issue types
        expect(issues.some(i => i.type === 'VEHICLE')).toBe(true);
      });
    });

    describe('getComplianceStatus', () => {
      it('should return overall compliance status', async () => {
        await service.runComplianceChecks(mockUserId);
        const status = await service.getComplianceStatus(mockUserId);

        expect(status).toBeDefined();
        expect(typeof status.isCompliant).toBe('boolean');
        expect(status.score).toBeDefined();
        expect(status.score).toBeGreaterThanOrEqual(0);
        expect(status.score).toBeLessThanOrEqual(100);
        expect(status.issues).toBeInstanceOf(Array);
        expect(status.lastChecked).toBeInstanceOf(Date);
      });

      it('should calculate score based on issues', async () => {
        await service.runComplianceChecks(mockUserId);
        const status = await service.getComplianceStatus(mockUserId);

        // With critical issues, score should be reduced
        expect(status.score).toBeLessThan(100);
      });
    });

    describe('getComplianceIssues', () => {
      it('should filter issues by type', async () => {
        await service.runComplianceChecks(mockUserId);
        const issues = await service.getComplianceIssues(mockUserId, { type: 'VEHICLE' });

        expect(issues.every(i => i.type === 'VEHICLE')).toBe(true);
      });

      it('should filter issues by severity', async () => {
        await service.runComplianceChecks(mockUserId);
        const issues = await service.getComplianceIssues(mockUserId, { severity: 'CRITICAL' });

        expect(issues.every(i => i.severity === 'CRITICAL')).toBe(true);
      });
    });

    describe('updateIssueStatus', () => {
      it('should update issue status', async () => {
        await service.runComplianceChecks(mockUserId);
        const issues = await service.getComplianceIssues(mockUserId);
        const issueId = issues[0]?.id;

        if (issueId) {
          const updated = await service.updateIssueStatus(
            mockUserId,
            issueId,
            'RESOLVED',
            'TÜV Prüfung durchgeführt',
          );

          expect(updated).toBeDefined();
          expect(updated!.status).toBe('RESOLVED');
          expect(updated!.resolution).toBe('TÜV Prüfung durchgeführt');
        }
      });

      it('should return null for non-existent issue', async () => {
        const result = await service.updateIssueStatus(
          mockUserId,
          'non-existent-id',
          'RESOLVED',
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('Driver Hours Compliance', () => {
    describe('getDriverHoursDetail', () => {
      it('should return driver hours compliance detail', async () => {
        const result = await service.getDriverHoursDetail(mockUserId, 'driver-1');

        expect(result).toBeDefined();
        expect(result.driverId).toBe('driver-1');
        expect(result.driverName).toBeDefined();
        expect(typeof result.drivingHours).toBe('number');
        expect(typeof result.restHours).toBe('number');
        expect(typeof result.weeklyDrivingHours).toBe('number');
        expect(typeof result.isCompliant).toBe('boolean');
        expect(result.violations).toBeInstanceOf(Array);
      });
    });

    describe('getAllDriversHoursCompliance', () => {
      it('should return all drivers compliance', async () => {
        const result = await service.getAllDriversHoursCompliance(mockUserId);

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(mockEmployees.length);
      });

      it('should sort by compliance status', async () => {
        const result = await service.getAllDriversHoursCompliance(mockUserId);

        // Non-compliant should be first
        for (let i = 1; i < result.length; i++) {
          if (!result[i - 1].isCompliant && result[i].isCompliant) {
            // Non-compliant before compliant is correct
          } else if (result[i - 1].isCompliant && !result[i].isCompliant) {
            fail('Compliant driver should not be before non-compliant');
          }
        }
      });
    });
  });

  describe('Document Retention', () => {
    describe('getDocumentRetention', () => {
      it('should return document retention list', async () => {
        mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
          {
            id: 'route-old',
            routeName: 'Test Route',
            routeDate: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000), // 1000 days ago
            createdAt: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000),
          },
        ]);

        mockPrismaService.fuelLog.findMany.mockResolvedValue([
          {
            id: 'fuel-old',
            fueledAt: new Date(),
            createdAt: new Date(),
            vehicle: { licensePlate: 'M-DL 1234' },
          },
        ]);

        const result = await service.getDocumentRetention(mockUserId);

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);

        for (const doc of result) {
          expect(doc.documentType).toBeDefined();
          expect(doc.retentionPeriodYears).toBeGreaterThan(0);
          expect(doc.expiresAt).toBeInstanceOf(Date);
          expect(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ARCHIVED']).toContain(doc.status);
        }
      });

      it('should sort by expiration date', async () => {
        mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
          { id: 'r1', routeName: 'R1', routeDate: new Date(), createdAt: new Date() },
          { id: 'r2', routeName: 'R2', routeDate: new Date(), createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        ]);
        mockPrismaService.fuelLog.findMany.mockResolvedValue([]);

        const result = await service.getDocumentRetention(mockUserId);

        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].expiresAt.getTime()).toBeLessThanOrEqual(result[i].expiresAt.getTime());
        }
      });
    });
  });

  describe('Compliance Report', () => {
    describe('getComplianceReport', () => {
      it('should return comprehensive compliance report', async () => {
        mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);
        mockPrismaService.fuelLog.findMany.mockResolvedValue([]);

        const result = await service.getComplianceReport(mockUserId);

        expect(result).toBeDefined();
        expect(result.overallStatus).toBeDefined();
        expect(result.vehicleCompliance).toBeDefined();
        expect(result.driverCompliance).toBeDefined();
        expect(result.documentCompliance).toBeDefined();
        expect(result.recentAuditLogs).toBeDefined();

        expect(result.vehicleCompliance.total).toBe(mockVehicles.length);
        expect(result.driverCompliance.total).toBe(mockEmployees.length);
      });
    });
  });
});
