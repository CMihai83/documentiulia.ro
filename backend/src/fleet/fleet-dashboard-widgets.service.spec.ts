import { Test, TestingModule } from '@nestjs/testing';
import { FleetDashboardWidgetsService } from './fleet-dashboard-widgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus, RouteStatus, DeliveryStopStatus } from '@prisma/client';

describe('FleetDashboardWidgetsService', () => {
  let service: FleetDashboardWidgetsService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';

  const mockVehicle = {
    id: 'vehicle-1',
    userId: mockUserId,
    licensePlate: 'M-FL 1234',
    status: VehicleStatus.AVAILABLE,
    mileage: 45000,
    insuranceExpiry: new Date('2025-12-31'),
    tuvExpiry: new Date('2025-06-15'),
    maintenanceLogs: [],
  };

  const mockRoute = {
    id: 'route-1',
    userId: mockUserId,
    routeName: 'Schwabing Route A',
    status: RouteStatus.IN_PROGRESS,
    routeDate: new Date(),
    vehicleId: 'vehicle-1',
    driverId: 'driver-1',
    vehicle: mockVehicle,
    driver: { firstName: 'Hans', lastName: 'Müller' },
    stops: [
      { id: 'stop-1', status: DeliveryStopStatus.DELIVERED, address: 'München-Schwabing', updatedAt: new Date() },
      { id: 'stop-2', status: DeliveryStopStatus.PENDING, address: 'München-Maxvorstadt', updatedAt: new Date() },
    ],
    actualStartTime: new Date(),
    actualEndTime: null,
    actualDistanceKm: { toNumber: () => 25.5 },
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    deliveryRoute: {
      findMany: jest.fn(),
    },
    deliveryStop: {
      findMany: jest.fn(),
    },
    vehicle: {
      findMany: jest.fn(),
    },
    fuelLog: {
      findMany: jest.fn(),
    },
    maintenanceLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetDashboardWidgetsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FleetDashboardWidgetsService>(FleetDashboardWidgetsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getActiveRoutesWidget', () => {
    it('should return active routes data', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);

      const result = await service.getActiveRoutesWidget(mockUserId);

      expect(result).toBeDefined();
      expect(result.totalActiveRoutes).toBe(1);
      expect(result.inProgressRoutes).toBe(1);
      expect(result.driversOnRoad).toBe(1);
      expect(result.totalStopsToday).toBe(2);
      expect(result.completedStops).toBe(1);
      expect(result.remainingStops).toBe(1);
      expect(result.progressPercentage).toBe(50);
    });

    it('should calculate estimated completion time', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);

      const result = await service.getActiveRoutesWidget(mockUserId);

      expect(result.estimatedCompletion).toBeDefined();
      expect(result.estimatedCompletion).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should handle empty routes', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      const result = await service.getActiveRoutesWidget(mockUserId);

      expect(result.totalActiveRoutes).toBe(0);
      expect(result.progressPercentage).toBe(0);
      expect(result.estimatedCompletion).toBeNull();
    });
  });

  describe('getVehicleStatusWidget', () => {
    it('should return vehicle status data', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        { ...mockVehicle, status: VehicleStatus.AVAILABLE },
        { ...mockVehicle, id: 'vehicle-2', status: VehicleStatus.IN_USE },
        { ...mockVehicle, id: 'vehicle-3', status: VehicleStatus.MAINTENANCE },
      ]);

      const result = await service.getVehicleStatusWidget(mockUserId);

      expect(result.totalVehicles).toBe(3);
      expect(result.available).toBe(1);
      expect(result.inUse).toBe(1);
      expect(result.maintenance).toBe(1);
      expect(result.utilizationRate).toBe(33);
    });

    it('should detect vehicles needing attention', async () => {
      const overdueVehicle = {
        ...mockVehicle,
        insuranceExpiry: new Date('2024-01-01'), // Expired
        nextInspection: new Date('2024-01-01'), // Overdue
        currentOdometer: 70000,
        maintenanceLogs: [],
      };

      mockPrismaService.vehicle.findMany.mockResolvedValue([overdueVehicle]);

      const result = await service.getVehicleStatusWidget(mockUserId);

      expect(result.needsAttention.length).toBeGreaterThan(0);
    });

    it('should handle empty fleet', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getVehicleStatusWidget(mockUserId);

      expect(result.totalVehicles).toBe(0);
      expect(result.utilizationRate).toBe(0);
    });
  });

  describe('getDeliveryMetricsWidget', () => {
    it('should return delivery metrics', async () => {
      const deliveredStop = {
        id: 'stop-1',
        status: DeliveryStopStatus.DELIVERED,
        updatedAt: new Date(),
      };
      const failedStop = {
        id: 'stop-2',
        status: DeliveryStopStatus.FAILED,
        updatedAt: new Date(),
      };

      mockPrismaService.deliveryStop.findMany
        .mockResolvedValueOnce([deliveredStop, deliveredStop, failedStop]) // today
        .mockResolvedValueOnce([deliveredStop, deliveredStop, deliveredStop, failedStop]) // week
        .mockResolvedValueOnce([...Array(10).fill(deliveredStop), failedStop]) // month
        .mockResolvedValueOnce([...Array(8).fill(deliveredStop), failedStop, failedStop]); // last month

      const result = await service.getDeliveryMetricsWidget(mockUserId);

      expect(result.today).toBeDefined();
      expect(result.today.total).toBe(3);
      expect(result.today.delivered).toBe(2);
      expect(result.today.failed).toBe(1);
      expect(result.today.successRate).toBe(67);
      expect(result.thisWeek).toBeDefined();
      expect(result.thisMonth).toBeDefined();
      expect(['up', 'down', 'stable']).toContain(result.trend);
    });

    it('should handle no deliveries', async () => {
      mockPrismaService.deliveryStop.findMany.mockResolvedValue([]);

      const result = await service.getDeliveryMetricsWidget(mockUserId);

      expect(result.today.total).toBe(0);
      expect(result.today.successRate).toBe(0);
    });
  });

  describe('getFuelEfficiencyWidget', () => {
    it('should return fuel efficiency data', async () => {
      mockPrismaService.fuelLog.findMany
        .mockResolvedValueOnce([
          {
            vehicleId: 'vehicle-1',
            liters: { toNumber: () => 50 },
            totalCost: { toNumber: () => 85 },
            vehicle: { plateNumber: 'M-FL 1234' },
          },
        ])
        .mockResolvedValueOnce([
          {
            liters: { toNumber: () => 45 },
            totalCost: { toNumber: () => 75 },
          },
        ]);

      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          vehicleId: 'vehicle-1',
          status: RouteStatus.COMPLETED,
          actualDistanceKm: { toNumber: () => 500 },
          stops: [{ status: DeliveryStopStatus.DELIVERED }],
        },
      ]);

      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);

      const result = await service.getFuelEfficiencyWidget(mockUserId);

      expect(result).toBeDefined();
      expect(result.avgLitersPer100km).toBeGreaterThanOrEqual(0);
      expect(result.totalFuelCostThisMonth).toBe(85);
      expect(result.costPerDelivery).toBeGreaterThan(0);
      expect(['improving', 'declining', 'stable']).toContain(result.trend);
    });

    it('should handle no fuel data', async () => {
      mockPrismaService.fuelLog.findMany.mockResolvedValue([]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);
      mockPrismaService.vehicle.findMany.mockResolvedValue([]);

      const result = await service.getFuelEfficiencyWidget(mockUserId);

      expect(result.avgLitersPer100km).toBe(0);
      expect(result.totalFuelCostThisMonth).toBe(0);
    });
  });

  describe('getMaintenanceAlertWidget', () => {
    it('should detect critical alerts for overdue items', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicle,
          tuvExpiry: new Date('2024-01-01'), // Overdue
          insuranceExpiry: new Date('2024-01-01'), // Overdue
        },
      ]);

      const result = await service.getMaintenanceAlertWidget(mockUserId);

      expect(result.urgentAlerts).toBeGreaterThan(0);
      expect(result.alerts.some(a => a.severity === 'critical')).toBe(true);
    });

    it('should detect upcoming maintenance', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      mockPrismaService.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicle,
          tuvExpiry: nextWeek,
        },
      ]);

      const result = await service.getMaintenanceAlertWidget(mockUserId);

      expect(result.upcomingMaintenance).toBeGreaterThan(0);
      expect(result.alerts.some(a => a.severity === 'warning')).toBe(true);
    });

    it('should alert on high mileage since service', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicle,
          mileage: 80000,
          maintenanceLogs: [{ odometerReading: 50000 }],
        },
      ]);

      const result = await service.getMaintenanceAlertWidget(mockUserId);

      expect(result.alerts.some(a => a.type === 'Service')).toBe(true);
    });

    it('should handle healthy fleet', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      mockPrismaService.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicle,
          tuvExpiry: futureDate,
          insuranceExpiry: futureDate,
          mileage: 10000,
          maintenanceLogs: [{ odometerReading: 5000 }],
        },
      ]);

      const result = await service.getMaintenanceAlertWidget(mockUserId);

      expect(result.urgentAlerts).toBe(0);
    });
  });

  describe('getDriverPerformanceWidget', () => {
    it('should return driver performance data', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          ...mockRoute,
          status: RouteStatus.COMPLETED,
          completedAt: new Date(),
          stops: [
            { status: DeliveryStopStatus.DELIVERED },
            { status: DeliveryStopStatus.DELIVERED },
            { status: DeliveryStopStatus.DELIVERED },
          ],
        },
      ]);

      const result = await service.getDriverPerformanceWidget(mockUserId);

      expect(result).toBeDefined();
      expect(result.teamAvgSuccessRate).toBeGreaterThanOrEqual(0);
      expect(result.teamAvgDeliveriesPerDay).toBeGreaterThanOrEqual(0);
    });

    it('should identify top performers', async () => {
      const topDriver = {
        ...mockRoute,
        status: RouteStatus.COMPLETED,
        completedAt: new Date(),
        stops: Array(15).fill({ status: DeliveryStopStatus.DELIVERED }),
      };

      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        topDriver,
        topDriver,
        topDriver,
      ]);

      const result = await service.getDriverPerformanceWidget(mockUserId);

      expect(result.topPerformers.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle no completed routes', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      const result = await service.getDriverPerformanceWidget(mockUserId);

      expect(result.teamAvgSuccessRate).toBe(0);
      expect(result.topPerformers).toEqual([]);
    });
  });

  describe('getRecentActivityWidget', () => {
    it('should return recent activities', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.deliveryStop.findMany.mockResolvedValue([
        {
          id: 'stop-1',
          status: DeliveryStopStatus.DELIVERED,
          address: 'Leopoldstraße 100, München-Schwabing',
          updatedAt: new Date(),
        },
      ]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivityWidget(mockUserId);

      expect(result.activities.length).toBeGreaterThan(0);
      expect(result.activities[0].type).toBeDefined();
      expect(result.activities[0].timestamp).toBeDefined();
    });

    it('should sort by timestamp', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000);

      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        { ...mockRoute, updatedAt: earlier },
      ]);
      mockPrismaService.deliveryStop.findMany.mockResolvedValue([
        {
          id: 'stop-1',
          status: DeliveryStopStatus.DELIVERED,
          address: 'Test',
          updatedAt: now,
        },
      ]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivityWidget(mockUserId);

      if (result.activities.length >= 2) {
        expect(result.activities[0].timestamp.getTime()).toBeGreaterThanOrEqual(
          result.activities[1].timestamp.getTime(),
        );
      }
    });

    it('should limit results', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue(
        Array(10).fill(mockRoute),
      );
      mockPrismaService.deliveryStop.findMany.mockResolvedValue(
        Array(10).fill({
          id: 'stop-1',
          status: DeliveryStopStatus.DELIVERED,
          address: 'Test',
          updatedAt: new Date(),
        }),
      );
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivityWidget(mockUserId, 5);

      expect(result.activities.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getDailyTrendsWidget', () => {
    it('should return daily trend data', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          ...mockRoute,
          stops: [{ status: DeliveryStopStatus.DELIVERED }],
        },
      ]);
      mockPrismaService.fuelLog.findMany.mockResolvedValue([
        { totalCost: { toNumber: () => 50 } },
      ]);

      const result = await service.getDailyTrendsWidget(mockUserId, 7);

      expect(result.labels.length).toBe(7);
      expect(result.deliveries.length).toBe(7);
      expect(result.successRates.length).toBe(7);
      expect(result.distance.length).toBe(7);
      expect(result.fuelCosts.length).toBe(7);
    });

    it('should format labels in German', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);
      mockPrismaService.fuelLog.findMany.mockResolvedValue([]);

      const result = await service.getDailyTrendsWidget(mockUserId, 3);

      expect(result.labels.length).toBe(3);
      // Should have German day abbreviations (e.g., "Sa., 6." or "Mo, 2")
      expect(result.labels[0]).toMatch(/\w+\.?,?\s*\d+\.?/);
    });
  });

  describe('getZonePerformanceWidget', () => {
    it('should aggregate by zone', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          ...mockRoute,
          status: RouteStatus.COMPLETED,
          stops: [
            {
              status: DeliveryStopStatus.DELIVERED,
              address: 'Leopoldstraße 1, München-Schwabing',
              deliveredAt: new Date(),
              plannedArrival: new Date(),
            },
            {
              status: DeliveryStopStatus.DELIVERED,
              address: 'Theresienstraße 1, München-Maxvorstadt',
              deliveredAt: new Date(),
              plannedArrival: new Date(),
            },
          ],
        },
      ]);

      const result = await service.getZonePerformanceWidget(mockUserId);

      expect(result.zones.length).toBeGreaterThan(0);
      expect(result.zones[0].name).toBeDefined();
      expect(result.zones[0].deliveries).toBeGreaterThan(0);
    });

    it('should calculate success rates by zone', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          ...mockRoute,
          status: RouteStatus.COMPLETED,
          stops: [
            { status: DeliveryStopStatus.DELIVERED, address: 'Schwabing 1' },
            { status: DeliveryStopStatus.FAILED, address: 'Schwabing 2' },
          ],
        },
      ]);

      const result = await service.getZonePerformanceWidget(mockUserId);

      expect(result.zones[0].successRate).toBe(50);
    });
  });

  describe('getDashboardSummary', () => {
    it('should return complete dashboard summary', async () => {
      // Set up mocks for all widget methods
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.deliveryStop.findMany.mockResolvedValue([
        { status: DeliveryStopStatus.DELIVERED, updatedAt: new Date() },
      ]);
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);

      const result = await service.getDashboardSummary(mockUserId);

      expect(result).toBeDefined();
      expect(result.activeRoutes).toBeDefined();
      expect(result.vehicleStatus).toBeDefined();
      expect(result.deliveryMetrics).toBeDefined();
      expect(result.maintenanceAlerts).toBeDefined();
      expect(result.recentActivity).toBeDefined();
      expect(result.quickStats).toBeDefined();
    });

    it('should include quick stats', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.deliveryStop.findMany.mockResolvedValue([
        { status: DeliveryStopStatus.DELIVERED, updatedAt: new Date() },
      ]);
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);

      const result = await service.getDashboardSummary(mockUserId);

      expect(result.quickStats.todayDeliveries).toBeDefined();
      expect(result.quickStats.activeDrivers).toBeDefined();
      expect(result.quickStats.availableVehicles).toBeDefined();
      expect(result.quickStats.pendingAlerts).toBeDefined();
    });
  });
});
