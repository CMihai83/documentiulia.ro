import { Test, TestingModule } from '@nestjs/testing';
import { FleetAnalyticsService } from './fleet-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FleetAnalyticsService', () => {
  let service: FleetAnalyticsService;
  let prisma: PrismaService;

  const mockPrisma = {
    deliveryStop: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    fuelLog: {
      findMany: jest.fn(),
    },
    vehicle: {
      findMany: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
    timesheet: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FleetAnalyticsService>(FleetAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOnTimeDeliveryRate', () => {
    it('should calculate on-time delivery rate correctly', async () => {
      const mockStops = [
        { status: 'DELIVERED', estimatedArrival: new Date('2024-01-01T10:00:00Z'), completedAt: new Date('2024-01-01T10:15:00Z') },
        { status: 'DELIVERED', estimatedArrival: new Date('2024-01-01T11:00:00Z'), completedAt: new Date('2024-01-01T11:25:00Z') },
        { status: 'DELIVERED', estimatedArrival: new Date('2024-01-01T12:00:00Z'), completedAt: new Date('2024-01-01T13:00:00Z') }, // Late
        { status: 'PENDING', estimatedArrival: null, completedAt: null },
      ];

      mockPrisma.deliveryStop.findMany.mockResolvedValue(mockStops);

      const result = await service.getOnTimeDeliveryRate('user-123', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      });

      expect(result.totalDeliveries).toBe(3);
      expect(result.onTimeDeliveries).toBe(2);
      expect(result.lateDeliveries).toBe(1);
      expect(parseFloat(result.onTimeRate as string)).toBeCloseTo(66.7, 0);
    });

    it('should handle empty results', async () => {
      mockPrisma.deliveryStop.findMany.mockResolvedValue([]);

      const result = await service.getOnTimeDeliveryRate('user-123', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      });

      expect(result.totalDeliveries).toBe(0);
      expect(result.onTimeRate).toBe(0);
    });
  });

  describe('getDeliverySuccessRate', () => {
    it('should calculate success rate by status', async () => {
      const mockGrouped = [
        { status: 'DELIVERED', _count: { status: 80 } },
        { status: 'FAILED', _count: { status: 10 } },
        { status: 'PENDING', _count: { status: 5 } },
        { status: 'ATTEMPTED', _count: { status: 5 } },
      ];

      mockPrisma.deliveryStop.groupBy.mockResolvedValue(mockGrouped);

      const result = await service.getDeliverySuccessRate('user-123', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      });

      expect(result.total).toBe(100);
      expect(result.delivered).toBe(80);
      expect(result.failed).toBe(10);
      expect(result.attempted).toBe(5);
      expect(result.successRate).toBe('80.0');
      expect(result.failureRate).toBe('10.0');
    });
  });

  describe('getFirstAttemptRate', () => {
    it('should calculate first attempt delivery rate', async () => {
      const mockStops = [
        { attemptCount: 1 },
        { attemptCount: 1 },
        { attemptCount: 2 },
        { attemptCount: 3 },
      ];

      mockPrisma.deliveryStop.findMany.mockResolvedValue(mockStops);

      const result = await service.getFirstAttemptRate('user-123', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      });

      expect(result.totalDelivered).toBe(4);
      expect(result.firstAttempt).toBe(2);
      expect(result.multipleAttempts).toBe(2);
      expect(result.firstAttemptRate).toBe('50.0');
    });
  });

  describe('getFuelEfficiency', () => {
    it('should calculate fuel efficiency per vehicle', async () => {
      const mockFuelLogs = [
        { vehicleId: 'v1', vehicle: { id: 'v1', licensePlate: 'M-FL 001', make: 'Mercedes', model: 'Sprinter' }, liters: 50, totalCost: 80, odometerReading: 10000, fueledAt: new Date('2024-01-01') },
        { vehicleId: 'v1', vehicle: { id: 'v1', licensePlate: 'M-FL 001', make: 'Mercedes', model: 'Sprinter' }, liters: 45, totalCost: 72, odometerReading: 10500, fueledAt: new Date('2024-01-15') },
        { vehicleId: 'v2', vehicle: { id: 'v2', licensePlate: 'M-FL 002', make: 'VW', model: 'Crafter' }, liters: 40, totalCost: 64, odometerReading: 20000, fueledAt: new Date('2024-01-01') },
      ];

      mockPrisma.fuelLog.findMany.mockResolvedValue(mockFuelLogs);

      const result = await service.getFuelEfficiency('user-123', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      });

      expect(result.byVehicle).toHaveLength(2);
      expect(result.byVehicle[0].licensePlate).toBe('M-FL 001');
      expect(result.byVehicle[0].totalLiters).toBe(95);
      expect(result.byVehicle[0].kmDriven).toBe(500);
      expect(result.fleetAverage.totalKm).toBe(500);
    });
  });

  describe('getVehicleUtilization', () => {
    it('should calculate vehicle utilization rate', async () => {
      const mockVehicles = [
        { id: 'v1', licensePlate: 'M-FL 001' },
        { id: 'v2', licensePlate: 'M-FL 002' },
      ];

      const mockRoutes = [
        { vehicleId: 'v1', routeDate: new Date('2024-01-02'), status: 'COMPLETED' },
        { vehicleId: 'v1', routeDate: new Date('2024-01-03'), status: 'COMPLETED' },
        { vehicleId: 'v1', routeDate: new Date('2024-01-04'), status: 'IN_PROGRESS' },
        { vehicleId: 'v2', routeDate: new Date('2024-01-02'), status: 'COMPLETED' },
      ];

      mockPrisma.vehicle.findMany.mockResolvedValue(mockVehicles);
      mockPrisma.deliveryRoute.findMany.mockResolvedValue(mockRoutes);

      const result = await service.getVehicleUtilization('user-123', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-05'),
      });

      expect(result.byVehicle).toHaveLength(2);
      expect(result.byVehicle[0].totalRoutes).toBe(3);
      expect(result.byVehicle[0].completedRoutes).toBe(2);
      expect(result.byVehicle[0].daysUsed).toBe(3);
      expect(result.fleetAverage.totalRoutes).toBe(4);
    });
  });

  describe('getDriverPerformance', () => {
    it('should calculate driver performance metrics', async () => {
      const mockRoutes = [
        {
          driverId: 'd1',
          driver: { id: 'd1', firstName: 'Hans', lastName: 'Müller' },
          stops: [
            { status: 'DELIVERED', completedAt: new Date('2024-01-01T10:00:00Z'), estimatedArrival: new Date('2024-01-01T10:15:00Z') },
            { status: 'DELIVERED', completedAt: new Date('2024-01-01T11:00:00Z'), estimatedArrival: new Date('2024-01-01T11:00:00Z') },
            { status: 'FAILED', completedAt: null, estimatedArrival: null },
          ],
        },
        {
          driverId: 'd2',
          driver: { id: 'd2', firstName: 'Anna', lastName: 'Schmidt' },
          stops: [
            { status: 'DELIVERED', completedAt: new Date('2024-01-01T10:00:00Z'), estimatedArrival: new Date('2024-01-01T10:00:00Z') },
            { status: 'DELIVERED', completedAt: new Date('2024-01-01T11:00:00Z'), estimatedArrival: new Date('2024-01-01T11:00:00Z') },
          ],
        },
      ];

      mockPrisma.deliveryRoute.findMany.mockResolvedValue(mockRoutes);

      const result = await service.getDriverPerformance('user-123', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      });

      expect(result.drivers).toHaveLength(2);
      // Anna should be top performer (100% success rate)
      expect(result.topPerformer.driverName).toBe('Anna Schmidt');
      expect(result.topPerformer.successRate).toBe('100.0');
    });
  });
});
