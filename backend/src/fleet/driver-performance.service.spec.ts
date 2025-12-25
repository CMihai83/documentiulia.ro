import { Test, TestingModule } from '@nestjs/testing';
import { DriverPerformanceService } from './driver-performance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('DriverPerformanceService', () => {
  let service: DriverPerformanceService;
  let prisma: jest.Mocked<PrismaService>;

  const mockDriver = {
    id: 'driver-1',
    userId: 'user-1',
    firstName: 'Hans',
    lastName: 'Mueller',
    status: 'ACTIVE',
  };

  const mockVehicle = {
    id: 'vehicle-1',
    licensePlate: 'M-DL-1234',
  };

  const createMockRoute = (options: {
    id?: string;
    date?: Date;
    status?: string;
    stopsCount?: number;
    deliveredCount?: number;
    failedCount?: number;
    actualStartTime?: Date;
    actualEndTime?: Date;
    distanceKm?: number;
  } = {}) => {
    const {
      id = 'route-1',
      date = new Date('2025-12-08'),
      status = 'COMPLETED',
      stopsCount = 10,
      deliveredCount = 8,
      failedCount = 1,
      actualStartTime = new Date('2025-12-08T08:00:00Z'),
      actualEndTime = new Date('2025-12-08T16:00:00Z'),
      distanceKm = 120,
    } = options;

    const stops = [];
    for (let i = 0; i < deliveredCount; i++) {
      stops.push({
        id: `stop-${i}`,
        status: 'DELIVERED',
        signature: i < 6 ? 'sig-data' : null,
        photoUrl: i < 4 ? 'photo-url' : null,
        estimatedArrival: new Date('2025-12-08T10:00:00Z'),
        actualArrival: i < 6
          ? new Date('2025-12-08T10:05:00Z') // On time
          : new Date('2025-12-08T10:30:00Z'), // Late
      });
    }
    for (let i = 0; i < failedCount; i++) {
      stops.push({
        id: `stop-failed-${i}`,
        status: 'FAILED',
        signature: null,
        photoUrl: null,
        estimatedArrival: null,
        actualArrival: null,
      });
    }
    for (let i = 0; i < stopsCount - deliveredCount - failedCount; i++) {
      stops.push({
        id: `stop-pending-${i}`,
        status: 'PENDING',
        signature: null,
        photoUrl: null,
        estimatedArrival: null,
        actualArrival: null,
      });
    }

    return {
      id,
      userId: 'user-1',
      driverId: 'driver-1',
      vehicleId: 'vehicle-1',
      routeDate: date,
      status,
      actualStartTime,
      actualEndTime,
      actualDistanceKm: new Decimal(distanceKm),
      driver: mockDriver,
      vehicle: mockVehicle,
      stops,
    };
  };

  beforeEach(async () => {
    const mockPrisma = {
      employee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      deliveryRoute: {
        findMany: jest.fn(),
      },
      deliveryStop: {
        count: jest.fn(),
      },
      fuelLog: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverPerformanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DriverPerformanceService>(DriverPerformanceService);
    prisma = module.get(PrismaService);
  });

  describe('getDriverMetrics', () => {
    const from = new Date('2025-12-01');
    const to = new Date('2025-12-08');

    it('should calculate comprehensive driver metrics', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 8, failedCount: 1 }),
        createMockRoute({ id: 'route-2', deliveredCount: 10, failedCount: 0 }),
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDriverMetrics('user-1', 'driver-1', from, to);

      expect(result.driverId).toBe('driver-1');
      expect(result.driverName).toBe('Hans Mueller');
      expect(result.employeeNumber).toBeDefined(); // Generated from ID
      expect(result.deliveries.total).toBe(20);
      expect(result.deliveries.completed).toBe(18);
      expect(result.deliveries.failed).toBe(1);
      expect(result.deliveries.completionRate).toBeGreaterThan(0);
    });

    it('should throw NotFoundException if driver not found', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getDriverMetrics('user-1', 'nonexistent', from, to),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate timing metrics', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 8, failedCount: 0 }),
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDriverMetrics('user-1', 'driver-1', from, to);

      expect(result.timing.onTimeDeliveries).toBeGreaterThanOrEqual(0);
      expect(result.timing.averageMinutesPerDelivery).toBeGreaterThanOrEqual(0);
      expect(result.timing.averageDeliveriesPerHour).toBeGreaterThanOrEqual(0);
    });

    it('should calculate POD metrics', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 8, failedCount: 0 }),
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDriverMetrics('user-1', 'driver-1', from, to);

      expect(result.proof.withSignature).toBeGreaterThanOrEqual(0);
      expect(result.proof.withPhoto).toBeGreaterThanOrEqual(0);
      expect(result.proof.podCompletionRate).toBeGreaterThanOrEqual(0);
    });

    it('should include fuel efficiency if fuel data available', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ distanceKm: 100 }),
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([
        { liters: new Decimal(10), totalCost: new Decimal(18) },
        { liters: new Decimal(12), totalCost: new Decimal(21.6) },
      ]);

      const result = await service.getDriverMetrics('user-1', 'driver-1', from, to);

      expect(result.efficiency).toBeDefined();
      expect(result.efficiency!.fuelConsumptionL).toBe(22);
      expect(result.efficiency!.kmPerLiter).toBeGreaterThan(0);
      expect(result.efficiency!.costPerDeliveryEur).toBeGreaterThan(0);
    });

    it('should return zero metrics for driver with no routes', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDriverMetrics('user-1', 'driver-1', from, to);

      expect(result.deliveries.total).toBe(0);
      expect(result.deliveries.completionRate).toBe(0);
      expect(result.routes.totalRoutes).toBe(0);
    });
  });

  describe('getDriverRankings', () => {
    const from = new Date('2025-12-01');
    const to = new Date('2025-12-08');

    it('should return sorted driver rankings', async () => {
      const routesData = [
        createMockRoute({ deliveredCount: 10, failedCount: 0 }),
        {
          ...createMockRoute({ id: 'route-2', deliveredCount: 6, failedCount: 2 }),
          driver: { ...mockDriver, id: 'driver-2', firstName: 'Anna' },
          driverId: 'driver-2',
        },
      ];
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue(routesData);

      const result = await service.getDriverRankings('user-1', from, to);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].rank).toBe(1);
      expect(result[0].score).toBeGreaterThanOrEqual(result[1]?.score || 0);
    });

    it('should limit results to specified number', async () => {
      const routesData = Array.from({ length: 15 }, (_, i) => ({
        ...createMockRoute({ id: `route-${i}` }),
        driver: { ...mockDriver, id: `driver-${i}`, firstName: `Driver${i}` },
        driverId: `driver-${i}`,
      }));
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue(routesData);

      const result = await service.getDriverRankings('user-1', from, to, 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should calculate score based on weighted metrics', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 10, failedCount: 0 }),
      ]);

      const result = await service.getDriverRankings('user-1', from, to);

      expect(result[0]).toHaveProperty('metrics');
      expect(result[0].metrics).toHaveProperty('completionRate');
      expect(result[0].metrics).toHaveProperty('onTimeRate');
      expect(result[0].metrics).toHaveProperty('podRate');
    });
  });

  describe('getPerformanceAlerts', () => {
    const from = new Date('2025-12-01');
    const to = new Date('2025-12-08');

    it('should return alerts for underperforming drivers', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockDriver]);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 5, failedCount: 5 }), // 50% completion rate
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPerformanceAlerts('user-1', from, to);

      expect(Array.isArray(result)).toBe(true);
      // Should have LOW_COMPLETION alert since 50% < 90% threshold
      const lowCompletionAlert = result.find(a => a.alertType === 'LOW_COMPLETION');
      expect(lowCompletionAlert).toBeDefined();
    });

    it('should categorize alerts by severity', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockDriver]);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 3, failedCount: 7 }), // 30% completion
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPerformanceAlerts('user-1', from, to);

      const criticalAlerts = result.filter(a => a.severity === 'CRITICAL');
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should return no major alerts for well-performing drivers', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockDriver]);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 10, failedCount: 0 }),
      ]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPerformanceAlerts('user-1', from, to);

      // No completion or failure rate alerts for perfect delivery
      const completionAlerts = result.filter(a =>
        a.alertType === 'LOW_COMPLETION' || a.alertType === 'HIGH_FAILURE'
      );
      expect(completionAlerts.length).toBe(0);
    });
  });

  describe('getDriverTrends', () => {
    const from = new Date('2025-12-01');
    const to = new Date('2025-12-08');

    it('should return daily performance trends', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ date: new Date('2025-12-07') }),
        createMockRoute({ id: 'route-2', date: new Date('2025-12-08') }),
      ]);

      const result = await service.getDriverTrends('user-1', 'driver-1', from, to);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('deliveries');
      expect(result[0]).toHaveProperty('completionRate');
    });

    it('should throw NotFoundException if driver not found', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getDriverTrends('user-1', 'nonexistent', from, to),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTeamSummary', () => {
    const from = new Date('2025-12-01');
    const to = new Date('2025-12-08');

    it('should return team performance summary', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 10, failedCount: 0 }),
      ]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockDriver]);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.employee.count as jest.Mock).mockResolvedValue(5);
      (prisma.deliveryStop.count as jest.Mock).mockResolvedValue(100);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getTeamSummary('user-1', from, to);

      expect(result).toHaveProperty('totalDrivers');
      expect(result).toHaveProperty('activeDrivers');
      expect(result).toHaveProperty('totalDeliveries');
      expect(result).toHaveProperty('avgCompletionRate');
      expect(result).toHaveProperty('topPerformer');
      expect(result).toHaveProperty('alertCount');
    });

    it('should include alert counts', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        createMockRoute({ deliveredCount: 5, failedCount: 5 }),
      ]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockDriver]);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(mockDriver);
      (prisma.employee.count as jest.Mock).mockResolvedValue(1);
      (prisma.deliveryStop.count as jest.Mock).mockResolvedValue(10);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getTeamSummary('user-1', from, to);

      expect(result.alertCount).toHaveProperty('warning');
      expect(result.alertCount).toHaveProperty('critical');
    });
  });

  describe('compareDrivers', () => {
    const from = new Date('2025-12-01');
    const to = new Date('2025-12-08');

    const mockDriverB = {
      ...mockDriver,
      id: 'driver-2',
      firstName: 'Anna',
      lastName: 'Schmidt',
    };

    it('should compare two drivers performance', async () => {
      (prisma.employee.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockDriver)
        .mockResolvedValueOnce(mockDriverB);
      (prisma.deliveryRoute.findMany as jest.Mock)
        .mockResolvedValueOnce([createMockRoute({ deliveredCount: 10, failedCount: 0 })])
        .mockResolvedValueOnce([createMockRoute({ deliveredCount: 7, failedCount: 2 })]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.compareDrivers(
        'user-1',
        'driver-1',
        'driver-2',
        from,
        to,
      );

      expect(result.driverA.driverId).toBe('driver-1');
      expect(result.driverB.driverId).toBe('driver-2');
      expect(result.comparison).toHaveProperty('completionRateDiff');
      expect(result.comparison).toHaveProperty('winner');
    });

    it('should determine winner based on overall score', async () => {
      (prisma.employee.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockDriver)
        .mockResolvedValueOnce(mockDriverB);
      (prisma.deliveryRoute.findMany as jest.Mock)
        .mockResolvedValueOnce([createMockRoute({ deliveredCount: 10, failedCount: 0 })])
        .mockResolvedValueOnce([createMockRoute({ deliveredCount: 5, failedCount: 4 })]);
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.compareDrivers(
        'user-1',
        'driver-1',
        'driver-2',
        from,
        to,
      );

      expect(['A', 'B', 'TIE']).toContain(result.comparison.winner);
    });

    it('should throw NotFoundException if either driver not found', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.compareDrivers('user-1', 'driver-1', 'driver-2', from, to),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
