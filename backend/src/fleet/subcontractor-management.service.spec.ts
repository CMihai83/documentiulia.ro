import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubcontractorManagementService } from './subcontractor-management.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubcontractorManagementService', () => {
  let service: SubcontractorManagementService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';

  const mockSubcontractorData = {
    companyName: 'Munich Express Lieferung GmbH',
    contactName: 'Hans Müller',
    email: 'hans@munich-express.de',
    phone: '+49 89 12345678',
    address: {
      street: 'Leopoldstraße 100',
      postalCode: '80802',
      city: 'München',
    },
    taxId: 'DE123456789',
    capacity: {
      totalVehicles: 5,
      availableVehicles: 3,
      totalDrivers: 6,
      availableDrivers: 4,
      maxDailyRoutes: 10,
      maxDailyDeliveries: 150,
    },
    rates: {
      perDelivery: 3.50,
      perKilometer: 0.85,
      minimumDaily: 100,
      currency: 'EUR',
    },
    serviceZones: ['München-Schwabing', 'München-Maxvorstadt', 'München-Bogenhausen'],
  };

  const mockRoute = {
    id: 'route-123',
    userId: mockUserId,
    routeName: 'Schwabing Route A',
    routeDate: new Date(),
    plannedDistanceKm: { toNumber: () => 45.5 },
    stops: [
      { id: 'stop-1', status: 'DELIVERED' },
      { id: 'stop-2', status: 'DELIVERED' },
      { id: 'stop-3', status: 'FAILED' },
    ],
  };

  const mockPrismaService = {
    deliveryRoute: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubcontractorManagementService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubcontractorManagementService>(SubcontractorManagementService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('registerSubcontractor', () => {
    it('should register a new subcontractor', async () => {
      const result = await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^sub-\d+$/);
      expect(result.companyName).toBe(mockSubcontractorData.companyName);
      expect(result.contactName).toBe(mockSubcontractorData.contactName);
      expect(result.email).toBe(mockSubcontractorData.email);
      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.rating).toBe(0);
      expect(result.totalRoutes).toBe(0);
      expect(result.serviceZones).toEqual(mockSubcontractorData.serviceZones);
    });

    it('should reject duplicate email', async () => {
      await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      await expect(
        service.registerSubcontractor(mockUserId, mockSubcontractorData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set taxId to null when not provided', async () => {
      const dataWithoutTaxId = { ...mockSubcontractorData, taxId: undefined };
      const result = await service.registerSubcontractor(mockUserId, dataWithoutTaxId);

      expect(result.taxId).toBeNull();
    });
  });

  describe('getSubcontractors', () => {
    it('should return subcontractors for a user', async () => {
      await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.registerSubcontractor(mockUserId, {
        ...mockSubcontractorData,
        email: 'other@example.de',
        companyName: 'Other GmbH',
      });

      const result = await service.getSubcontractors(mockUserId);

      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());

      const activeOnly = await service.getSubcontractors(mockUserId, { status: 'ACTIVE' });
      const pendingOnly = await service.getSubcontractors(mockUserId, { status: 'PENDING_APPROVAL' });

      expect(activeOnly.length).toBeGreaterThanOrEqual(1);
      expect(pendingOnly.every(s => s.status === 'PENDING_APPROVAL')).toBe(true);
    });

    it('should filter by zone', async () => {
      await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.registerSubcontractor(mockUserId, {
        ...mockSubcontractorData,
        email: 'other@example.de',
        companyName: 'Other GmbH',
        serviceZones: ['München-Pasing'],
      });

      const result = await service.getSubcontractors(mockUserId, { zone: 'München-Schwabing' });

      expect(result.every(s => s.serviceZones.includes('München-Schwabing'))).toBe(true);
    });
  });

  describe('getSubcontractor', () => {
    it('should return subcontractor by ID', async () => {
      const created = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      const result = await service.getSubcontractor(created.id);

      expect(result.id).toBe(created.id);
      expect(result.companyName).toBe(mockSubcontractorData.companyName);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(service.getSubcontractor('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSubcontractor', () => {
    it('should update subcontractor details', async () => {
      const created = await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      const result = await service.updateSubcontractor(created.id, {
        contactName: 'Max Müller',
        phone: '+49 89 9999999',
      });

      expect(result.contactName).toBe('Max Müller');
      expect(result.phone).toBe('+49 89 9999999');
      expect(result.email).toBe(mockSubcontractorData.email); // unchanged
    });

    it('should update capacity', async () => {
      const created = await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      const result = await service.updateSubcontractor(created.id, {
        capacity: {
          ...mockSubcontractorData.capacity,
          availableVehicles: 1,
        },
      });

      expect(result.capacity.availableVehicles).toBe(1);
    });
  });

  describe('approveSubcontractor', () => {
    it('should approve a pending subcontractor', async () => {
      const created = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      const contractStart = new Date();
      const contractEnd = new Date();
      contractEnd.setFullYear(contractEnd.getFullYear() + 1);

      const result = await service.approveSubcontractor(created.id, contractStart, contractEnd);

      expect(result.status).toBe('ACTIVE');
      expect(result.contractStart).toEqual(contractStart);
      expect(result.contractEnd).toEqual(contractEnd);
    });

    it('should reject approving non-pending subcontractor', async () => {
      const created = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(created.id, new Date(), new Date());

      await expect(
        service.approveSubcontractor(created.id, new Date(), new Date()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('suspendSubcontractor', () => {
    it('should suspend a subcontractor', async () => {
      const created = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(created.id, new Date(), new Date());

      const result = await service.suspendSubcontractor(created.id, 'Poor performance');

      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('updateCapacity', () => {
    it('should update capacity partially', async () => {
      const created = await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      const result = await service.updateCapacity(created.id, {
        availableVehicles: 2,
        availableDrivers: 2,
      });

      expect(result.capacity.availableVehicles).toBe(2);
      expect(result.capacity.availableDrivers).toBe(2);
      expect(result.capacity.totalVehicles).toBe(5); // unchanged
    });
  });

  describe('assignRoute', () => {
    it('should assign a route to an active subcontractor', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());

      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      const result = await service.assignRoute(mockUserId, sub.id, 'route-123');

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^assign-\d+$/);
      expect(result.subcontractorId).toBe(sub.id);
      expect(result.routeId).toBe('route-123');
      expect(result.status).toBe('PENDING');
      expect(result.deliveryCount).toBe(3);
      expect(result.agreedRate).toBeGreaterThanOrEqual(mockSubcontractorData.rates.minimumDaily);
    });

    it('should reject assigning to inactive subcontractor', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      await expect(
        service.assignRoute(mockUserId, sub.id, 'route-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject assigning non-existent route', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());

      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(
        service.assignRoute(mockUserId, sub.id, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use custom agreed rate when provided', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());

      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      const result = await service.assignRoute(mockUserId, sub.id, 'route-123', 200);

      expect(result.agreedRate).toBe(200);
    });
  });

  describe('assignment workflow', () => {
    let sub: any;
    let assignment: any;

    beforeEach(async () => {
      sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);
      assignment = await service.assignRoute(mockUserId, sub.id, 'route-123');
    });

    it('should accept a pending assignment', async () => {
      const result = await service.acceptAssignment(assignment.id);
      expect(result.status).toBe('ACCEPTED');
    });

    it('should reject a pending assignment', async () => {
      const result = await service.rejectAssignment(assignment.id, 'Cannot handle this route');
      expect(result.status).toBe('REJECTED');
      expect(result.notes).toBe('Cannot handle this route');
    });

    it('should not accept non-pending assignment', async () => {
      await service.acceptAssignment(assignment.id);

      await expect(service.acceptAssignment(assignment.id)).rejects.toThrow(BadRequestException);
    });

    it('should start an accepted assignment', async () => {
      await service.acceptAssignment(assignment.id);
      const result = await service.startAssignment(assignment.id);
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should not start non-accepted assignment', async () => {
      await expect(service.startAssignment(assignment.id)).rejects.toThrow(BadRequestException);
    });

    it('should complete an in-progress assignment', async () => {
      await service.acceptAssignment(assignment.id);
      await service.startAssignment(assignment.id);
      const result = await service.completeAssignment(assignment.id, 180);

      expect(result.status).toBe('COMPLETED');
      expect(result.actualCost).toBe(180);
      expect(result.completedAt).toBeDefined();
    });

    it('should update subcontractor stats on completion', async () => {
      await service.acceptAssignment(assignment.id);
      await service.startAssignment(assignment.id);
      await service.completeAssignment(assignment.id);

      const updatedSub = await service.getSubcontractor(sub.id);
      expect(updatedSub.totalRoutes).toBe(1);
      expect(updatedSub.totalDeliveries).toBe(3);
    });

    it('should cancel an assignment', async () => {
      const result = await service.cancelAssignment(assignment.id, 'Route cancelled');
      expect(result.status).toBe('CANCELLED');
      expect(result.notes).toBe('Route cancelled');
    });

    it('should not cancel completed assignment', async () => {
      await service.acceptAssignment(assignment.id);
      await service.startAssignment(assignment.id);
      await service.completeAssignment(assignment.id);

      await expect(
        service.cancelAssignment(assignment.id, 'Too late'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSubcontractorAssignments', () => {
    it('should return assignments for a subcontractor', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      await service.assignRoute(mockUserId, sub.id, 'route-1');
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue({ ...mockRoute, id: 'route-2' });
      await service.assignRoute(mockUserId, sub.id, 'route-2');

      const result = await service.getSubcontractorAssignments(sub.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      const assignment1 = await service.assignRoute(mockUserId, sub.id, 'route-1');
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue({ ...mockRoute, id: 'route-2' });
      await service.assignRoute(mockUserId, sub.id, 'route-2');

      await service.acceptAssignment(assignment1.id);

      const acceptedOnly = await service.getSubcontractorAssignments(sub.id, { status: 'ACCEPTED' });
      const pendingOnly = await service.getSubcontractorAssignments(sub.id, { status: 'PENDING' });

      expect(acceptedOnly.every(a => a.status === 'ACCEPTED')).toBe(true);
      expect(pendingOnly.every(a => a.status === 'PENDING')).toBe(true);
    });
  });

  describe('getPerformance', () => {
    it('should return performance metrics', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      const assignment = await service.assignRoute(mockUserId, sub.id, 'route-123');
      await service.acceptAssignment(assignment.id);
      await service.startAssignment(assignment.id);
      await service.completeAssignment(assignment.id, 150);

      const from = new Date();
      from.setDate(from.getDate() - 7);
      const to = new Date();

      const result = await service.getPerformance(sub.id, from, to);

      expect(result.subcontractorId).toBe(sub.id);
      expect(result.totalRoutes).toBeGreaterThanOrEqual(1);
      expect(result.completedRoutes).toBeGreaterThanOrEqual(1);
      expect(result.totalCost).toBeGreaterThan(0);
    });
  });

  describe('rateSubcontractor', () => {
    it('should update subcontractor rating', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      const result = await service.rateSubcontractor(sub.id, 4.5);

      expect(result.rating).toBe(4.5);
    });

    it('should reject invalid ratings', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);

      await expect(service.rateSubcontractor(sub.id, 0)).rejects.toThrow(BadRequestException);
      await expect(service.rateSubcontractor(sub.id, 6)).rejects.toThrow(BadRequestException);
    });

    it('should calculate average rating', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      // Complete a route to have totalRoutes > 0
      const assignment = await service.assignRoute(mockUserId, sub.id, 'route-1');
      await service.acceptAssignment(assignment.id);
      await service.startAssignment(assignment.id);
      await service.completeAssignment(assignment.id);

      await service.rateSubcontractor(sub.id, 5);
      const result = await service.rateSubcontractor(sub.id, 3);

      // Average of 5 and 3 weighted by routes
      expect(result.rating).toBeGreaterThan(0);
      expect(result.rating).toBeLessThanOrEqual(5);
    });
  });

  describe('getAvailableForZone', () => {
    it('should return active subcontractors with capacity', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());

      const result = await service.getAvailableForZone(mockUserId, 'München-Schwabing');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].serviceZones).toContain('München-Schwabing');
    });

    it('should filter by required capacity', async () => {
      const sub = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.approveSubcontractor(sub.id, new Date(), new Date());

      const resultWithCapacity = await service.getAvailableForZone(mockUserId, 'München-Schwabing', 3);
      const resultHighCapacity = await service.getAvailableForZone(mockUserId, 'München-Schwabing', 10);

      expect(resultWithCapacity.length).toBeGreaterThanOrEqual(1);
      expect(resultHighCapacity.length).toBe(0); // Requires 10 but only 3 available
    });
  });

  describe('getSummary', () => {
    it('should return summary statistics', async () => {
      const sub1 = await service.registerSubcontractor(mockUserId, mockSubcontractorData);
      await service.registerSubcontractor(mockUserId, {
        ...mockSubcontractorData,
        email: 'other@example.de',
        companyName: 'Other GmbH',
      });
      await service.approveSubcontractor(sub1.id, new Date(), new Date());

      const result = await service.getSummary(mockUserId);

      expect(result.totalSubcontractors).toBeGreaterThanOrEqual(2);
      expect(result.activeSubcontractors).toBeGreaterThanOrEqual(1);
      expect(result.pendingApproval).toBeGreaterThanOrEqual(1);
      expect(result.totalCapacity.vehicles).toBeGreaterThan(0);
      expect(result.availableCapacity.drivers).toBeGreaterThan(0);
    });
  });

  describe('getCostComparison', () => {
    it('should return cost comparison data', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-1',
          status: 'COMPLETED',
          stops: [{ status: 'DELIVERED' }, { status: 'DELIVERED' }],
        },
        {
          id: 'route-2',
          status: 'COMPLETED',
          stops: [{ status: 'DELIVERED' }],
        },
      ]);

      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();

      const result = await service.getCostComparison(mockUserId, from, to);

      expect(result.period.from).toEqual(from);
      expect(result.period.to).toEqual(to);
      expect(result.inHouse).toBeDefined();
      expect(result.subcontracted).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should include German recommendation', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      const from = new Date();
      const to = new Date();

      const result = await service.getCostComparison(mockUserId, from, to);

      // Should have German text for recommendation
      expect(result.recommendation).toContain('Subunternehmer');
    });
  });
});
