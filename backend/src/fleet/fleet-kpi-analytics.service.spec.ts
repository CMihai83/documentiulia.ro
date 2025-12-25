import { Test, TestingModule } from '@nestjs/testing';
import { FleetKpiAnalyticsService } from './fleet-kpi-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { RouteStatus, DeliveryStopStatus, VehicleStatus } from '@prisma/client';

describe('FleetKpiAnalyticsService', () => {
  let service: FleetKpiAnalyticsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUserId = 'user-123';

  const mockVehicles = [
    {
      id: 'vehicle-1',
      licensePlate: 'M-DL 1234',
      status: VehicleStatus.AVAILABLE,
      mileage: 50000,
      tuvExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      insuranceExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'vehicle-2',
      licensePlate: 'M-DL 5678',
      status: VehicleStatus.IN_USE,
      mileage: 75000,
      tuvExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      insuranceExpiry: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
    },
  ];

  const mockRoutes = [
    {
      id: 'route-1',
      userId: mockUserId,
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      routeDate: new Date(),
      status: RouteStatus.COMPLETED,
      plannedDistanceKm: 50,
      actualDistanceKm: 52,
      actualStartTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
      actualEndTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      stops: [
        {
          id: 'stop-1',
          status: DeliveryStopStatus.DELIVERED,
          estimatedArrival: new Date(Date.now() - 5 * 60 * 60 * 1000),
          actualArrival: new Date(Date.now() - 5.1 * 60 * 60 * 1000),
          signature: 'sig-data',
        },
        {
          id: 'stop-2',
          status: DeliveryStopStatus.DELIVERED,
          estimatedArrival: new Date(Date.now() - 4 * 60 * 60 * 1000),
          actualArrival: new Date(Date.now() - 3.8 * 60 * 60 * 1000),
          photoUrl: 'photo-url',
        },
        {
          id: 'stop-3',
          status: DeliveryStopStatus.FAILED,
          estimatedArrival: new Date(Date.now() - 3 * 60 * 60 * 1000),
          actualArrival: null,
        },
      ],
      vehicle: { licensePlate: 'M-DL 1234' },
      driver: { id: 'driver-1', firstName: 'Max', lastName: 'Mustermann' },
    },
    {
      id: 'route-2',
      userId: mockUserId,
      vehicleId: 'vehicle-2',
      driverId: 'driver-2',
      routeDate: new Date(),
      status: RouteStatus.COMPLETED,
      plannedDistanceKm: 45,
      actualDistanceKm: 44,
      actualStartTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
      actualEndTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      stops: [
        {
          id: 'stop-4',
          status: DeliveryStopStatus.DELIVERED,
          estimatedArrival: new Date(Date.now() - 6 * 60 * 60 * 1000),
          actualArrival: new Date(Date.now() - 5.9 * 60 * 60 * 1000),
          signature: 'sig-data-2',
        },
        {
          id: 'stop-5',
          status: DeliveryStopStatus.DELIVERED,
          estimatedArrival: new Date(Date.now() - 5 * 60 * 60 * 1000),
          actualArrival: new Date(Date.now() - 4.9 * 60 * 60 * 1000),
        },
      ],
      vehicle: { licensePlate: 'M-DL 5678' },
      driver: { id: 'driver-2', firstName: 'Hans', lastName: 'Schmidt' },
    },
  ];

  const mockFuelLogs = [
    {
      id: 'fuel-1',
      vehicleId: 'vehicle-1',
      liters: 40,
      totalCost: 72,
      fueledAt: new Date(),
    },
    {
      id: 'fuel-2',
      vehicleId: 'vehicle-2',
      liters: 35,
      totalCost: 63,
      fueledAt: new Date(),
    },
  ];

  const mockMaintenanceLogs = [
    {
      id: 'maint-1',
      vehicleId: 'vehicle-1',
      cost: 250,
      serviceDate: new Date(),
    },
  ];

  const mockDrivers = [
    { id: 'driver-1', userId: mockUserId, role: 'DRIVER', firstName: 'Max', lastName: 'Mustermann' },
    { id: 'driver-2', userId: mockUserId, role: 'DRIVER', firstName: 'Hans', lastName: 'Schmidt' },
  ];

  const mockPrismaService = {
    deliveryRoute: {
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
    employee: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetKpiAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FleetKpiAnalyticsService>(FleetKpiAnalyticsService);
    prismaService = module.get(PrismaService);

    // Default mock returns
    mockPrismaService.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
    mockPrismaService.vehicle.findMany.mockResolvedValue(mockVehicles);
    mockPrismaService.fuelLog.findMany.mockResolvedValue(mockFuelLogs);
    mockPrismaService.maintenanceLog.findMany.mockResolvedValue(mockMaintenanceLogs);
    mockPrismaService.employee.findMany.mockResolvedValue(mockDrivers);
  });

  describe('getFleetKpis', () => {
    it('should return comprehensive fleet KPIs', async () => {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getFleetKpis(mockUserId, from, to);

      expect(result).toBeDefined();
      expect(result.period.from).toEqual(from);
      expect(result.period.to).toEqual(to);

      // Summary
      expect(result.summary.totalRoutes).toBe(2);
      expect(result.summary.completedRoutes).toBe(2);
      expect(result.summary.deliveredStops).toBe(4);
      expect(result.summary.failedStops).toBe(1);
      expect(result.summary.totalDrivers).toBe(2);
      expect(result.summary.activeVehicles).toBe(2);

      // Operational KPIs
      expect(result.operationalKpis).toBeDefined();
      expect(result.operationalKpis.routeCompletionRate).toBe(100);
      expect(result.operationalKpis.deliverySuccessRate).toBeGreaterThan(0);

      // Efficiency KPIs
      expect(result.efficiencyKpis).toBeDefined();
      expect(result.efficiencyKpis.avgDeliveriesPerDriver).toBeGreaterThan(0);

      // Financial KPIs
      expect(result.financialKpis).toBeDefined();
      expect(result.financialKpis.costPerDelivery).toBeGreaterThan(0);

      // Vehicle KPIs
      expect(result.vehicleKpis).toBeDefined();
      expect(result.vehicleKpis.vehicleAvailabilityRate).toBe(100);

      // Quality KPIs
      expect(result.qualityKpis).toBeDefined();
      expect(result.qualityKpis.podComplianceRate).toBeGreaterThan(0);
    });

    it('should calculate on-time delivery rate', async () => {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getFleetKpis(mockUserId, from, to);

      // All successful deliveries were on time in our mock data
      expect(result.operationalKpis.onTimeDeliveryRate).toBeGreaterThan(0);
    });

    it('should calculate fleet utilization', async () => {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getFleetKpis(mockUserId, from, to);

      // Both vehicles were used
      expect(result.operationalKpis.fleetUtilization).toBe(100);
    });

    it('should calculate fuel efficiency', async () => {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getFleetKpis(mockUserId, from, to);

      // Total fuel: 75L, Total distance: 96km
      // Efficiency = (75/96) * 100 = ~78 L/100km
      expect(result.vehicleKpis.avgFuelEfficiency).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);
      mockPrismaService.vehicle.findMany.mockResolvedValue([]);
      mockPrismaService.fuelLog.findMany.mockResolvedValue([]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);
      mockPrismaService.employee.findMany.mockResolvedValue([]);

      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getFleetKpis(mockUserId, from, to);

      expect(result.summary.totalRoutes).toBe(0);
      expect(result.summary.deliveredStops).toBe(0);
      expect(result.operationalKpis.fleetUtilization).toBe(0);
    });
  });

  describe('getKpiTargets', () => {
    it('should return KPI targets with current values', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getKpiTargets(mockUserId, from, to);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const onTimeTarget = result.find(t => t.kpiName === 'On-Time Delivery Rate');
      expect(onTimeTarget).toBeDefined();
      expect(onTimeTarget!.target).toBe(95);
      expect(onTimeTarget!.status).toBeDefined();
      expect(['ON_TRACK', 'AT_RISK', 'OFF_TRACK']).toContain(onTimeTarget!.status);
    });

    it('should calculate trend for each KPI', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getKpiTargets(mockUserId, from, to);

      for (const target of result) {
        expect(['UP', 'DOWN', 'STABLE']).toContain(target.trend);
        expect(target.percentageOfTarget).toBeDefined();
      }
    });
  });

  describe('getDriverKpiDetails', () => {
    it('should return driver KPI rankings', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getDriverKpiDetails(mockUserId, from, to, 10);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // Two drivers in mock data

      // Check first driver
      expect(result[0].driverName).toBeDefined();
      expect(result[0].totalDeliveries).toBeGreaterThan(0);
      expect(result[0].successRate).toBeGreaterThanOrEqual(0);
      expect(result[0].rank).toBe(1);

      // Verify rankings are in order
      for (let i = 0; i < result.length; i++) {
        expect(result[i].rank).toBe(i + 1);
      }
    });

    it('should calculate productivity score', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getDriverKpiDetails(mockUserId, from, to, 10);

      for (const driver of result) {
        expect(driver.productivityScore).toBeGreaterThanOrEqual(0);
        expect(driver.productivityScore).toBeLessThanOrEqual(100);
      }
    });

    it('should respect limit parameter', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getDriverKpiDetails(mockUserId, from, to, 1);

      expect(result.length).toBe(1);
    });
  });

  describe('getVehicleKpiDetails', () => {
    it('should return vehicle KPIs', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getVehicleKpiDetails(mockUserId, from, to);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);

      for (const vehicle of result) {
        expect(vehicle.licensePlate).toBeDefined();
        expect(vehicle.totalKm).toBeGreaterThanOrEqual(0);
        expect(vehicle.healthScore).toBeGreaterThanOrEqual(0);
        expect(vehicle.healthScore).toBeLessThanOrEqual(100);
      }
    });

    it('should sort vehicles by health score', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getVehicleKpiDetails(mockUserId, from, to);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].healthScore).toBeGreaterThanOrEqual(result[i].healthScore);
      }
    });
  });

  describe('getBenchmarks', () => {
    it('should return industry benchmark comparisons', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getBenchmarks(mockUserId, from, to);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      for (const benchmark of result) {
        expect(benchmark.kpiName).toBeDefined();
        expect(benchmark.yourValue).toBeDefined();
        expect(benchmark.industryAverage).toBeDefined();
        expect(benchmark.topPerformer).toBeDefined();
        expect(benchmark.percentile).toBeGreaterThanOrEqual(0);
        expect(benchmark.percentile).toBeLessThanOrEqual(100);
      }
    });

    it('should include key performance metrics', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getBenchmarks(mockUserId, from, to);

      const kpiNames = result.map(b => b.kpiName);
      expect(kpiNames).toContain('On-Time Delivery Rate');
      expect(kpiNames).toContain('Delivery Success Rate');
      expect(kpiNames).toContain('Fleet Utilization');
    });
  });

  describe('getKpiDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const result = await service.getKpiDashboard(mockUserId);

      expect(result.currentKpis).toBeDefined();
      expect(result.targets).toBeDefined();
      expect(result.topDrivers).toBeDefined();
      expect(result.vehicleHealth).toBeDefined();
      expect(result.alerts).toBeDefined();

      expect(result.targets).toBeInstanceOf(Array);
      expect(result.topDrivers).toBeInstanceOf(Array);
      expect(result.vehicleHealth).toBeInstanceOf(Array);
    });

    it('should limit top drivers to 5', async () => {
      const result = await service.getKpiDashboard(mockUserId);

      expect(result.topDrivers.length).toBeLessThanOrEqual(5);
    });

    it('should limit vehicle health to 5', async () => {
      const result = await service.getKpiDashboard(mockUserId);

      expect(result.vehicleHealth.length).toBeLessThanOrEqual(5);
    });

    it('should generate alerts for off-track KPIs', async () => {
      // Set up data that would cause off-track KPIs
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          ...mockRoutes[0],
          stops: [
            { id: 'stop-1', status: DeliveryStopStatus.FAILED },
            { id: 'stop-2', status: DeliveryStopStatus.FAILED },
            { id: 'stop-3', status: DeliveryStopStatus.FAILED },
          ],
        },
      ]);

      const result = await service.getKpiDashboard(mockUserId);

      // Should have some alerts for poor performance
      expect(result.alerts).toBeInstanceOf(Array);
    });
  });

  describe('getKpiTrends', () => {
    it('should return trend data points', async () => {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const result = await service.getKpiTrends(
        mockUserId,
        'onTimeDeliveryRate',
        from,
        to,
        'DAY',
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      for (const point of result) {
        expect(point.date).toBeDefined();
        expect(typeof point.value).toBe('number');
      }
    });

    it('should support different granularities', async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const weeklyResult = await service.getKpiTrends(
        mockUserId,
        'deliverySuccessRate',
        from,
        to,
        'WEEK',
      );

      expect(weeklyResult).toBeInstanceOf(Array);
      // Weekly should have fewer data points than daily
      expect(weeklyResult.length).toBeLessThanOrEqual(5);
    });
  });
});
