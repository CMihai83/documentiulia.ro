import { Test, TestingModule } from '@nestjs/testing';
import { GpsTrackingEnhancedService } from './gps-tracking-enhanced.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GpsTrackingEnhancedService', () => {
  let service: GpsTrackingEnhancedService;
  let prismaService: any;

  const mockUserId = 'user-123';
  const mockVehicleId = 'vehicle-456';
  const mockRouteId = 'route-789';

  const mockVehicle = {
    id: mockVehicleId,
    userId: mockUserId,
    licensePlate: 'M-DL 1234',
    status: 'AVAILABLE',
    currentLat: 48.1351,
    currentLng: 11.5820,
    lastLocationAt: new Date(),
    assignedDriverId: 'driver-1',
    assignedDriver: {
      firstName: 'Hans',
      lastName: 'Müller',
    },
    deliveryRoutes: [],
  };

  const mockRoute = {
    id: mockRouteId,
    userId: mockUserId,
    vehicleId: mockVehicleId,
    status: 'IN_PROGRESS',
    routeDate: new Date(),
    plannedEndTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    vehicle: mockVehicle,
    stops: [
      {
        id: 'stop-1',
        stopOrder: 1,
        status: 'DELIVERED',
        latitude: 48.1400,
        longitude: 11.5800,
        recipientName: 'Customer A',
      },
      {
        id: 'stop-2',
        stopOrder: 2,
        status: 'PENDING',
        latitude: 48.1500,
        longitude: 11.6000,
        recipientName: 'Customer B',
      },
      {
        id: 'stop-3',
        stopOrder: 3,
        status: 'PENDING',
        latitude: 48.1600,
        longitude: 11.6200,
        recipientName: 'Customer C',
      },
    ],
  };

  const mockPositions = [
    {
      vehicleId: mockVehicleId,
      latitude: 48.1351,
      longitude: 11.5820,
      speed: 30,
      heading: 90,
      engineRunning: true,
      recordedAt: new Date(Date.now() - 60000),
    },
    {
      vehicleId: mockVehicleId,
      latitude: 48.1360,
      longitude: 11.5830,
      speed: 35,
      heading: 95,
      engineRunning: true,
      recordedAt: new Date(Date.now() - 30000),
    },
    {
      vehicleId: mockVehicleId,
      latitude: 48.1370,
      longitude: 11.5840,
      speed: 40,
      heading: 100,
      engineRunning: true,
      recordedAt: new Date(),
    },
  ];

  const mockPrismaService = {
    deliveryRoute: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    vehiclePosition: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsTrackingEnhancedService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GpsTrackingEnhancedService>(GpsTrackingEnhancedService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();

    // Default mocks
    mockPrismaService.deliveryRoute.findUnique.mockResolvedValue(mockRoute);
    mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
    mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
    mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
    mockPrismaService.vehiclePosition.findMany.mockResolvedValue(mockPositions);
  });

  describe('calculateLiveETA', () => {
    it('should calculate live ETA for a route', async () => {
      const eta = await service.calculateLiveETA(mockRouteId, {
        lat: 48.1351,
        lng: 11.5820,
      });

      expect(eta).toBeDefined();
      expect(eta.routeId).toBe(mockRouteId);
      expect(eta.vehicleId).toBe(mockVehicleId);
      expect(eta.remainingStops).toBe(2);
      expect(eta.nextStop).toBeDefined();
      expect(eta.nextStop?.name).toBe('Customer B');
      expect(eta.status).toBeDefined();
    });

    it('should handle route with all stops delivered', async () => {
      mockPrismaService.deliveryRoute.findUnique.mockResolvedValue({
        ...mockRoute,
        stops: mockRoute.stops.map(s => ({ ...s, status: 'DELIVERED' })),
      });

      const eta = await service.calculateLiveETA(mockRouteId, {
        lat: 48.1351,
        lng: 11.5820,
      });

      expect(eta.remainingStops).toBe(0);
      expect(eta.nextStop).toBeNull();
    });

    it('should throw error for non-existent route', async () => {
      mockPrismaService.deliveryRoute.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateLiveETA('non-existent', { lat: 48.1351, lng: 11.5820 }),
      ).rejects.toThrow('Route not found');
    });

    it('should calculate delay status correctly', async () => {
      // Set planned end time to past to force delay
      mockPrismaService.deliveryRoute.findUnique.mockResolvedValue({
        ...mockRoute,
        plannedEndTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });

      const eta = await service.calculateLiveETA(mockRouteId, {
        lat: 48.1351,
        lng: 11.5820,
      });

      expect(['DELAYED', 'SEVERELY_DELAYED']).toContain(eta.status);
      expect(eta.delayMinutes).toBeGreaterThan(0);
    });
  });

  describe('getFleetLiveETAs', () => {
    it('should get live ETAs for all fleet routes', async () => {
      const etas = await service.getFleetLiveETAs(mockUserId);

      expect(etas).toBeDefined();
      expect(Array.isArray(etas)).toBe(true);
    });

    it('should return empty array when no routes in progress', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      const etas = await service.getFleetLiveETAs(mockUserId);

      expect(etas).toEqual([]);
    });
  });

  describe('checkSpeedViolation', () => {
    it('should detect speed violation when exceeding limit', async () => {
      const violation = await service.checkSpeedViolation(
        mockVehicleId,
        85, // 85 km/h in 50 zone
        { lat: 48.1351, lng: 11.5820 },
        'URBAN',
      );

      expect(violation).toBeDefined();
      expect(violation?.currentSpeed).toBe(85);
      expect(violation?.speedLimit).toBe(50);
      expect(violation?.excessSpeed).toBe(35);
      expect(violation?.severity).toBe('HIGH');
    });

    it('should return null when within speed limit', async () => {
      const violation = await service.checkSpeedViolation(
        mockVehicleId,
        45, // 45 km/h in 50 zone
        { lat: 48.1351, lng: 11.5820 },
        'URBAN',
      );

      expect(violation).toBeNull();
    });

    it('should return null within tolerance threshold', async () => {
      const violation = await service.checkSpeedViolation(
        mockVehicleId,
        58, // 8 km/h over limit but within 10 km/h tolerance
        { lat: 48.1351, lng: 11.5820 },
        'URBAN',
      );

      expect(violation).toBeNull();
    });

    it('should classify severity correctly', async () => {
      // Critical: > 40 km/h over
      const critical = await service.checkSpeedViolation(
        mockVehicleId,
        100,
        { lat: 48.1351, lng: 11.5820 },
        'URBAN',
      );
      expect(critical?.severity).toBe('CRITICAL');

      // High: > 25 km/h over
      const high = await service.checkSpeedViolation(
        mockVehicleId,
        85,
        { lat: 48.1351, lng: 11.5820 },
        'URBAN',
      );
      expect(high?.severity).toBe('HIGH');
    });
  });

  describe('getSpeedViolations', () => {
    beforeEach(async () => {
      // Create some violations
      await service.checkSpeedViolation(mockVehicleId, 80, { lat: 48.1351, lng: 11.5820 }, 'URBAN');
      await service.checkSpeedViolation(mockVehicleId, 90, { lat: 48.1352, lng: 11.5821 }, 'URBAN');
    });

    it('should retrieve speed violations', async () => {
      const violations = await service.getSpeedViolations(mockUserId);

      expect(violations).toBeDefined();
      expect(violations.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by vehicle ID', async () => {
      const violations = await service.getSpeedViolations(mockUserId, {
        vehicleId: mockVehicleId,
      });

      expect(violations.every(v => v.vehicleId === mockVehicleId)).toBe(true);
    });

    it('should filter by severity', async () => {
      const violations = await service.getSpeedViolations(mockUserId, {
        severity: 'HIGH',
      });

      expect(violations.every(v => v.severity === 'HIGH')).toBe(true);
    });
  });

  describe('checkRouteDeviation', () => {
    it('should return null when vehicle is on route', async () => {
      // Position close to planned route
      const deviation = await service.checkRouteDeviation(mockRouteId, {
        lat: 48.1450,
        lng: 11.5900,
      });

      expect(deviation).toBeNull();
    });

    it('should detect deviation when far from route', async () => {
      // Position far from planned route
      const deviation = await service.checkRouteDeviation(mockRouteId, {
        lat: 48.2000, // Significantly off course
        lng: 11.7000,
      });

      expect(deviation).toBeDefined();
      expect(deviation?.deviationMeters).toBeGreaterThan(500);
    });
  });

  describe('recordBehaviorEvent', () => {
    it('should record behavior events', async () => {
      await service.recordBehaviorEvent(
        mockVehicleId,
        'HARSH_BRAKING',
        -4.5,
        { lat: 48.1351, lng: 11.5820 },
      );

      // Verify by calculating behavior score
      const score = await service.calculateDriverBehaviorScore(
        mockVehicleId,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(score.categories.braking.events).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateDriverBehaviorScore', () => {
    it('should calculate behavior score', async () => {
      const score = await service.calculateDriverBehaviorScore(
        mockVehicleId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(score).toBeDefined();
      expect(score.vehicleId).toBe(mockVehicleId);
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.categories).toBeDefined();
      expect(score.categories.acceleration).toBeDefined();
      expect(score.categories.braking).toBeDefined();
      expect(score.categories.speeding).toBeDefined();
    });

    it('should include driver info when available', async () => {
      const score = await service.calculateDriverBehaviorScore(
        mockVehicleId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(score.driverName).toBe('Hans Müller');
    });

    it('should provide recommendations for poor scores', async () => {
      // Record multiple harsh events to lower score
      for (let i = 0; i < 15; i++) {
        await service.recordBehaviorEvent(mockVehicleId, 'HARSH_BRAKING', -4.0);
      }

      const score = await service.calculateDriverBehaviorScore(
        mockVehicleId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(score.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getFleetBehaviorScores', () => {
    it('should get behavior scores for all vehicles', async () => {
      const scores = await service.getFleetBehaviorScores(
        mockUserId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(scores).toBeDefined();
      expect(Array.isArray(scores)).toBe(true);
    });
  });

  describe('estimateFuelEfficiency', () => {
    it('should estimate fuel efficiency', async () => {
      const efficiency = await service.estimateFuelEfficiency(
        mockVehicleId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(efficiency).toBeDefined();
      expect(efficiency.vehicleId).toBe(mockVehicleId);
      expect(efficiency.totalDistanceKm).toBeGreaterThanOrEqual(0);
      expect(efficiency.averageConsumption).toBeGreaterThan(0);
      expect(efficiency.estimatedCostEur).toBeGreaterThanOrEqual(0);
    });

    it('should handle no position data', async () => {
      mockPrismaService.vehiclePosition.findMany.mockResolvedValue([]);

      const efficiency = await service.estimateFuelEfficiency(
        mockVehicleId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(efficiency.totalDistanceKm).toBe(0);
    });
  });

  describe('updateDeviceHealth', () => {
    it('should update device health status', async () => {
      await service.updateDeviceHealth(mockVehicleId, {
        batteryLevel: 85,
        signalStrength: 75,
        gpsAccuracy: 10,
      });

      const healthStatuses = await service.getFleetDeviceHealth(mockUserId);
      const deviceHealth = healthStatuses.find(h => h.vehicleId === mockVehicleId);

      expect(deviceHealth?.batteryLevel).toBe(85);
      expect(deviceHealth?.signalStrength).toBe(75);
      expect(deviceHealth?.status).toBe('ONLINE');
    });

    it('should flag degraded status for low battery', async () => {
      await service.updateDeviceHealth(mockVehicleId, {
        batteryLevel: 15,
        signalStrength: 75,
        gpsAccuracy: 10,
      });

      const healthStatuses = await service.getFleetDeviceHealth(mockUserId);
      const deviceHealth = healthStatuses.find(h => h.vehicleId === mockVehicleId);

      // Battery level should be stored
      expect(deviceHealth?.batteryLevel).toBe(15);
      // Issues should contain the low battery warning
      expect(deviceHealth?.issues).toContain('Niedrige Batterie');
    });
  });

  describe('getFleetDeviceHealth', () => {
    it('should get device health for all vehicles', async () => {
      const healthStatuses = await service.getFleetDeviceHealth(mockUserId);

      expect(healthStatuses).toBeDefined();
      expect(Array.isArray(healthStatuses)).toBe(true);
      expect(healthStatuses.length).toBeGreaterThan(0);
    });

    it('should sort by status (offline first)', async () => {
      // Add a second vehicle that's offline
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        mockVehicle,
        {
          ...mockVehicle,
          id: 'vehicle-offline',
          lastLocationAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      ]);

      const healthStatuses = await service.getFleetDeviceHealth(mockUserId);

      // Offline should come first
      const firstStatus = healthStatuses[0];
      expect(firstStatus.status).toBe('OFFLINE');
    });
  });

  describe('getPlaybackData', () => {
    it('should get playback data with interpolation', async () => {
      const from = new Date(Date.now() - 60000);
      const to = new Date();

      const frames = await service.getPlaybackData(mockVehicleId, from, to, 5);

      expect(frames).toBeDefined();
      expect(Array.isArray(frames)).toBe(true);
    });

    it('should return empty array when no positions', async () => {
      mockPrismaService.vehiclePosition.findMany.mockResolvedValue([]);

      const frames = await service.getPlaybackData(
        mockVehicleId,
        new Date(Date.now() - 60000),
        new Date(),
        5,
      );

      expect(frames).toEqual([]);
    });
  });

  describe('checkProximity', () => {
    it('should check proximity to stops', async () => {
      // Mock vehicle with routes for proximity check
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        deliveryRoutes: [mockRoute],
      });

      const alerts = await service.checkProximity(
        mockVehicleId,
        { lat: 48.1495, lng: 11.5990 }, // Close to stop-2
        500,
      );

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getProximityAlerts', () => {
    beforeEach(async () => {
      // Mock vehicle with routes for proximity check
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        deliveryRoutes: [mockRoute],
      });
      await service.checkProximity(mockVehicleId, { lat: 48.1495, lng: 11.5990 }, 500);
    });

    it('should get proximity alerts', async () => {
      const alerts = await service.getProximityAlerts(mockUserId);

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should limit results', async () => {
      const alerts = await service.getProximityAlerts(mockUserId, 10);

      expect(alerts.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getTrackingDashboard', () => {
    it('should get tracking dashboard data', async () => {
      const dashboard = await service.getTrackingDashboard(mockUserId);

      expect(dashboard).toBeDefined();
      expect(dashboard.activeVehicles).toBeDefined();
      expect(dashboard.totalVehicles).toBeDefined();
      expect(dashboard.onlineDevices).toBeDefined();
      expect(dashboard.offlineDevices).toBeDefined();
      expect(dashboard.activeRoutes).toBeDefined();
      expect(dashboard.speedViolationsToday).toBeDefined();
      expect(dashboard.averageBehaviorScore).toBeDefined();
    });
  });

  describe('resolveRouteDeviation', () => {
    it('should resolve a deviation', async () => {
      // First create a deviation
      const deviation = await service.checkRouteDeviation(mockRouteId, {
        lat: 48.2000,
        lng: 11.7000,
      });

      if (deviation) {
        await service.resolveRouteDeviation(mockRouteId, deviation.id);

        // Check it's resolved
        const deviations = await service.getRouteDeviations(mockUserId, {
          routeId: mockRouteId,
          onlyActive: true,
        });

        const resolved = deviations.find(d => d.id === deviation.id);
        expect(resolved).toBeUndefined(); // Should not appear in active only
      }
    });
  });
});
