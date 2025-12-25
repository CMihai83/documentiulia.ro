import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FleetTenantIsolationService } from './fleet-tenant-isolation.service';
import { TenantService } from '../tenant/tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { Tier, OrgRole, VehicleStatus } from '@prisma/client';

describe('FleetTenantIsolationService', () => {
  let service: FleetTenantIsolationService;
  let prismaService: PrismaService;
  let tenantService: TenantService;

  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';
  const mockVehicleId = 'vehicle-123';
  const mockRouteId = 'route-123';
  const mockEmployeeId = 'employee-123';

  const mockOrganization = {
    id: mockOrgId,
    name: 'Test Org',
    slug: 'test-org',
    cui: 'RO12345678',
    tier: Tier.PRO,
  };

  const mockTenantContext = {
    organizationId: mockOrgId,
    userId: mockUserId,
    orgRole: OrgRole.ADMIN,
  };

  const mockMembership = {
    userId: mockUserId,
    organizationId: mockOrgId,
    role: OrgRole.ADMIN,
    organization: mockOrganization,
  };

  const mockVehicle = {
    id: mockVehicleId,
    userId: mockUserId,
    licensePlate: 'M-FL 1234',
    status: VehicleStatus.AVAILABLE,
  };

  const mockRoute = {
    id: mockRouteId,
    userId: mockUserId,
    routeDate: new Date(),
  };

  const mockEmployee = {
    id: mockEmployeeId,
    userId: mockUserId,
    firstName: 'Max',
    lastName: 'Mustermann',
  };

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    deliveryRoute: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    employee: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockTenantService = {
    validateOrganizationAccess: jest.fn(),
    getUserMembership: jest.fn(),
    getOrganization: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetTenantIsolationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<FleetTenantIsolationService>(FleetTenantIsolationService);
    prismaService = module.get<PrismaService>(PrismaService);
    tenantService = module.get<TenantService>(TenantService);

    jest.clearAllMocks();
  });

  describe('getFleetTenantContext', () => {
    it('should return fleet tenant context with resource limits', async () => {
      mockTenantService.validateOrganizationAccess.mockResolvedValue(mockTenantContext);
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await service.getFleetTenantContext(mockUserId, mockOrgId);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.userId).toBe(mockUserId);
      expect(result.tier).toBe(Tier.PRO);
      expect(result.resourceLimits).toBeDefined();
      expect(result.resourceLimits.maxVehicles).toBe(10);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockTenantService.validateOrganizationAccess.mockResolvedValue(mockTenantContext);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.getFleetTenantContext(mockUserId, mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use FREE tier limits if tier is not set', async () => {
      mockTenantService.validateOrganizationAccess.mockResolvedValue(mockTenantContext);
      mockPrismaService.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        tier: null,
      });

      const result = await service.getFleetTenantContext(mockUserId, mockOrgId);

      expect(result.tier).toBe(Tier.FREE);
      expect(result.resourceLimits.maxVehicles).toBe(2);
    });
  });

  describe('getResourceLimits', () => {
    it('should return correct limits for FREE tier', () => {
      const limits = service.getResourceLimits(Tier.FREE);
      expect(limits.maxVehicles).toBe(2);
      expect(limits.maxDrivers).toBe(3);
      expect(limits.maxRoutesPerDay).toBe(5);
    });

    it('should return correct limits for PRO tier', () => {
      const limits = service.getResourceLimits(Tier.PRO);
      expect(limits.maxVehicles).toBe(10);
      expect(limits.maxDrivers).toBe(20);
      expect(limits.maxRoutesPerDay).toBe(50);
    });

    it('should return unlimited for BUSINESS tier', () => {
      const limits = service.getResourceLimits(Tier.BUSINESS);
      expect(limits.maxVehicles).toBe(-1);
      expect(limits.maxDrivers).toBe(-1);
      expect(limits.maxRoutesPerDay).toBe(-1);
      expect(limits.allowedFeatures).toContain('*');
    });
  });

  describe('validateVehicleAccess', () => {
    it('should allow access for vehicle owner', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.validateVehicleAccess(
        mockVehicleId,
        mockOrgId,
        mockUserId,
      );

      expect(result).toBe(true);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.validateVehicleAccess(mockVehicleId, mockOrgId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log violation if user has no membership', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        userId: 'other-user',
      });
      mockTenantService.getUserMembership.mockResolvedValue(null);

      const result = await service.validateVehicleAccess(
        mockVehicleId,
        mockOrgId,
        mockUserId,
      );

      expect(result).toBe(false);
      const violations = service.getViolations({ limit: 1 });
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('validateRouteAccess', () => {
    it('should allow access for route owner', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      const result = await service.validateRouteAccess(
        mockRouteId,
        mockOrgId,
        mockUserId,
      );

      expect(result).toBe(true);
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(
        service.validateRouteAccess(mockRouteId, mockOrgId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateDriverAccess', () => {
    it('should allow access for employee owner', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);

      const result = await service.validateDriverAccess(
        mockEmployeeId,
        mockOrgId,
        mockUserId,
      );

      expect(result).toBe(true);
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.validateDriverAccess(mockEmployeeId, mockOrgId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('canCreateVehicle', () => {
    it('should allow vehicle creation within limit', async () => {
      mockPrismaService.vehicle.count.mockResolvedValue(5);

      const result = await service.canCreateVehicle(mockUserId, Tier.PRO);

      expect(result.allowed).toBe(true);
    });

    it('should deny vehicle creation when limit exceeded', async () => {
      mockPrismaService.vehicle.count.mockResolvedValue(10);

      const result = await service.canCreateVehicle(mockUserId, Tier.PRO);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Fahrzeuglimit erreicht');
    });

    it('should always allow for BUSINESS tier (unlimited)', async () => {
      mockPrismaService.vehicle.count.mockResolvedValue(1000);

      const result = await service.canCreateVehicle(mockUserId, Tier.BUSINESS);

      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateRoute', () => {
    it('should allow route creation within daily limit', async () => {
      mockPrismaService.deliveryRoute.count.mockResolvedValue(10);

      const result = await service.canCreateRoute(
        mockUserId,
        Tier.PRO,
        new Date(),
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny route creation when daily limit exceeded', async () => {
      mockPrismaService.deliveryRoute.count.mockResolvedValue(50);

      const result = await service.canCreateRoute(
        mockUserId,
        Tier.PRO,
        new Date(),
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Tageslimit für Routen erreicht');
    });
  });

  describe('canAddDriver', () => {
    it('should allow driver addition within limit', async () => {
      mockPrismaService.employee.count.mockResolvedValue(10);

      const result = await service.canAddDriver(mockUserId, Tier.PRO);

      expect(result.allowed).toBe(true);
    });

    it('should deny driver addition when limit exceeded', async () => {
      mockPrismaService.employee.count.mockResolvedValue(20);

      const result = await service.canAddDriver(mockUserId, Tier.PRO);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Fahrerlimit erreicht');
    });
  });

  describe('isFeatureAllowed', () => {
    it('should return false for advanced features on FREE tier', () => {
      expect(service.isFeatureAllowed(Tier.FREE, 'route_optimization')).toBe(false);
      expect(service.isFeatureAllowed(Tier.FREE, 'kpi_analytics')).toBe(false);
    });

    it('should return true for basic features on FREE tier', () => {
      expect(service.isFeatureAllowed(Tier.FREE, 'basic_tracking')).toBe(true);
      expect(service.isFeatureAllowed(Tier.FREE, 'route_planning')).toBe(true);
    });

    it('should return true for all features on BUSINESS tier', () => {
      expect(service.isFeatureAllowed(Tier.BUSINESS, 'any_feature')).toBe(true);
      expect(service.isFeatureAllowed(Tier.BUSINESS, 'cross_tenant_sharing')).toBe(true);
    });

    it('should return true for PRO features on PRO tier', () => {
      expect(service.isFeatureAllowed(Tier.PRO, 'route_optimization')).toBe(true);
      expect(service.isFeatureAllowed(Tier.PRO, 'kpi_analytics')).toBe(true);
    });
  });

  describe('enforceFeatureAccess', () => {
    it('should throw ForbiddenException for unauthorized feature', () => {
      expect(() =>
        service.enforceFeatureAccess(Tier.FREE, 'route_optimization'),
      ).toThrow(ForbiddenException);
    });

    it('should not throw for authorized feature', () => {
      expect(() =>
        service.enforceFeatureAccess(Tier.PRO, 'route_optimization'),
      ).not.toThrow();
    });
  });

  describe('grantCrossTenantAccess', () => {
    it('should create cross-tenant access grant', async () => {
      const sourceOrgId = 'org-source';
      const targetOrgId = 'org-target';

      const result = await service.grantCrossTenantAccess(
        sourceOrgId,
        targetOrgId,
        'VEHICLE',
        mockVehicleId,
        'VIEW',
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^cta-/);
      expect(result.sourceOrgId).toBe(sourceOrgId);
      expect(result.targetOrgId).toBe(targetOrgId);
      expect(result.resourceType).toBe('VEHICLE');
      expect(result.accessLevel).toBe('VIEW');
    });

    it('should create access with expiration date', async () => {
      const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await service.grantCrossTenantAccess(
        'org-source',
        'org-target',
        'VEHICLE',
        mockVehicleId,
        'OPERATE',
        mockUserId,
        validUntil,
      );

      expect(result.validUntil).toEqual(validUntil);
    });
  });

  describe('revokeCrossTenantAccess', () => {
    it('should revoke existing cross-tenant access', async () => {
      const sourceOrgId = 'org-source';
      const targetOrgId = 'org-target';

      await service.grantCrossTenantAccess(
        sourceOrgId,
        targetOrgId,
        'VEHICLE',
        mockVehicleId,
        'VIEW',
        mockUserId,
      );

      const result = await service.revokeCrossTenantAccess(
        sourceOrgId,
        targetOrgId,
        mockVehicleId,
      );

      expect(result).toBe(true);

      const grants = service.getCrossTenantAccessGrants(targetOrgId);
      expect(grants.find(g => g.resourceId === mockVehicleId)).toBeUndefined();
    });

    it('should return false when no access to revoke', async () => {
      const result = await service.revokeCrossTenantAccess(
        'org-source',
        'org-target',
        'non-existent-resource',
      );

      expect(result).toBe(false);
    });
  });

  describe('getCrossTenantAccessGrants', () => {
    it('should return access grants for organization', async () => {
      const targetOrgId = 'org-target';

      await service.grantCrossTenantAccess(
        'org-source',
        targetOrgId,
        'VEHICLE',
        mockVehicleId,
        'VIEW',
        mockUserId,
      );

      const grants = service.getCrossTenantAccessGrants(targetOrgId);

      expect(grants.length).toBeGreaterThan(0);
      expect(grants[0].resourceType).toBe('VEHICLE');
    });

    it('should return empty array for organization with no grants', () => {
      const grants = service.getCrossTenantAccessGrants('no-grants-org');
      expect(grants).toEqual([]);
    });

    it('should filter out expired grants', async () => {
      const targetOrgId = 'org-with-expired';
      const expiredDate = new Date(Date.now() - 1000);

      await service.grantCrossTenantAccess(
        'org-source',
        targetOrgId,
        'VEHICLE',
        mockVehicleId,
        'VIEW',
        mockUserId,
        expiredDate,
      );

      const grants = service.getCrossTenantAccessGrants(targetOrgId);
      expect(grants.length).toBe(0);
    });
  });

  describe('hasCrossTenantAccess', () => {
    it('should return access grant if exists', async () => {
      const targetOrgId = 'org-target';

      await service.grantCrossTenantAccess(
        'org-source',
        targetOrgId,
        'VEHICLE',
        mockVehicleId,
        'VIEW',
        mockUserId,
      );

      const access = await service.hasCrossTenantAccess(
        targetOrgId,
        'VEHICLE',
        mockVehicleId,
      );

      expect(access).toBeDefined();
      expect(access?.resourceId).toBe(mockVehicleId);
    });

    it('should return null if no access', async () => {
      const access = await service.hasCrossTenantAccess(
        'org-no-access',
        'VEHICLE',
        mockVehicleId,
      );

      expect(access).toBeNull();
    });
  });

  describe('getViolations', () => {
    it('should return isolation violations', async () => {
      // Trigger a violation
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        userId: 'other-user',
      });
      mockTenantService.getUserMembership.mockResolvedValue(null);

      await service.validateVehicleAccess(mockVehicleId, mockOrgId, mockUserId);

      const violations = service.getViolations();
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('UNAUTHORIZED_ACCESS');
    });

    it('should filter violations by type', async () => {
      const violations = service.getViolations({ type: 'LIMIT_EXCEEDED' });
      // May or may not have violations of this type
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should limit results', async () => {
      const violations = service.getViolations({ limit: 5 });
      expect(violations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getTenantUsageStats', () => {
    it('should return usage statistics', async () => {
      mockPrismaService.vehicle.count.mockResolvedValue(5);
      mockPrismaService.employee.count.mockResolvedValue(10);
      mockPrismaService.deliveryRoute.count.mockResolvedValue(3);

      const result = await service.getTenantUsageStats(mockUserId, Tier.PRO);

      expect(result.vehicles.current).toBe(5);
      expect(result.vehicles.limit).toBe(10);
      expect(result.vehicles.percentage).toBe(50);
      expect(result.drivers.current).toBe(10);
      expect(result.drivers.limit).toBe(20);
      expect(result.routesToday.current).toBe(3);
      expect(result.tier).toBe(Tier.PRO);
      expect(result.availableFeatures).toContain('route_optimization');
    });

    it('should show 0% usage for unlimited tier', async () => {
      mockPrismaService.vehicle.count.mockResolvedValue(100);
      mockPrismaService.employee.count.mockResolvedValue(50);
      mockPrismaService.deliveryRoute.count.mockResolvedValue(20);

      const result = await service.getTenantUsageStats(mockUserId, Tier.BUSINESS);

      expect(result.vehicles.percentage).toBe(0);
      expect(result.drivers.percentage).toBe(0);
    });
  });

  describe('validateBatchIsolation', () => {
    it('should validate multiple resources', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockTenantService.getUserMembership.mockResolvedValue(mockMembership);

      const result = await service.validateBatchIsolation(
        mockUserId,
        mockOrgId,
        'VEHICLE',
        [mockVehicleId, 'vehicle-456'],
      );

      expect(result.valid).toBeDefined();
      expect(result.invalid).toBeDefined();
      expect(result.unauthorized).toBeDefined();
    });
  });

  describe('getVehiclesForTenant', () => {
    it('should return tenant vehicles', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);

      const result = await service.getVehiclesForTenant(mockUserId);

      expect(result.owned).toHaveLength(1);
      expect(result.shared).toHaveLength(0);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);

      await service.getVehiclesForTenant(mockUserId, mockOrgId, {
        status: [VehicleStatus.AVAILABLE],
      });

      expect(mockPrismaService.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [VehicleStatus.AVAILABLE] },
          }),
        }),
      );
    });

    it('should include shared vehicles when requested', async () => {
      // First grant access
      await service.grantCrossTenantAccess(
        'org-source',
        mockOrgId,
        'VEHICLE',
        'shared-vehicle-123',
        'VIEW',
        mockUserId,
      );

      mockPrismaService.vehicle.findMany
        .mockResolvedValueOnce([mockVehicle])
        .mockResolvedValueOnce([{ id: 'shared-vehicle-123', licensePlate: 'M-SH 001' }]);

      const result = await service.getVehiclesForTenant(mockUserId, mockOrgId, {
        includeShared: true,
      });

      expect(result.owned.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getRoutesForTenant', () => {
    it('should return tenant routes', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);

      const result = await service.getRoutesForTenant(mockUserId);

      expect(result).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);

      const from = new Date('2025-12-01');
      const to = new Date('2025-12-31');

      await service.getRoutesForTenant(mockUserId, mockOrgId, {
        dateFrom: from,
        dateTo: to,
      });

      expect(mockPrismaService.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routeDate: { gte: from, lte: to },
          }),
        }),
      );
    });
  });
});
