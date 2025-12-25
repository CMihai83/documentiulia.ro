import { Test, TestingModule } from '@nestjs/testing';
import { RouteHistoryService } from './route-history.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('RouteHistoryService', () => {
  let service: RouteHistoryService;
  let prisma: jest.Mocked<PrismaService>;

  const mockDriver = {
    id: 'driver-1',
    firstName: 'Hans',
    lastName: 'Mueller',
  };

  const mockVehicle = {
    id: 'vehicle-1',
    licensePlate: 'M-DL-1234',
  };

  const mockStop = (options: Partial<any> = {}) => ({
    id: options.id || 'stop-1',
    stopOrder: options.stopOrder || 1,
    recipientName: options.recipientName || 'Max Mustermann',
    streetAddress: 'Marienplatz 1',
    postalCode: '80331',
    city: 'München',
    latitude: options.latitude ? new Decimal(options.latitude) : new Decimal(48.1351),
    longitude: options.longitude ? new Decimal(options.longitude) : new Decimal(11.5820),
    status: options.status || 'DELIVERED',
    estimatedArrival: options.estimatedArrival || new Date('2025-12-08T10:00:00Z'),
    actualArrival: options.actualArrival || new Date('2025-12-08T10:05:00Z'),
    completedAt: options.completedAt || new Date('2025-12-08T10:10:00Z'),
    signature: options.signature || 'sig-data',
    photoUrl: options.photoUrl || null,
    failureNote: options.failureNote || null,
  });

  const mockRoute = (options: Partial<any> = {}) => ({
    id: options.id || 'route-1',
    userId: 'user-1',
    routeName: options.routeName || 'Munich North Route',
    routeDate: options.routeDate || new Date('2025-12-08'),
    status: options.status || 'COMPLETED',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    deliveryZone: options.deliveryZone || 'Munich-Schwabing',
    plannedDistanceKm: new Decimal(options.plannedDistanceKm || 50),
    actualDistanceKm: new Decimal(options.actualDistanceKm || 55),
    plannedDurationMin: options.plannedDurationMin || 240,
    actualDurationMin: options.actualDurationMin || 260,
    plannedStartTime: options.plannedStartTime || new Date('2025-12-08T08:00:00Z'),
    actualStartTime: options.actualStartTime || new Date('2025-12-08T08:15:00Z'),
    plannedEndTime: options.plannedEndTime || new Date('2025-12-08T12:00:00Z'),
    actualEndTime: options.actualEndTime || new Date('2025-12-08T12:35:00Z'),
    driver: mockDriver,
    vehicle: mockVehicle,
    stops: options.stops || [
      mockStop({ id: 'stop-1', stopOrder: 1 }),
      mockStop({ id: 'stop-2', stopOrder: 2, status: 'DELIVERED' }),
      mockStop({ id: 'stop-3', stopOrder: 3, status: 'FAILED', failureNote: 'No one home' }),
    ],
  });

  beforeEach(async () => {
    const mockPrisma = {
      deliveryRoute: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteHistoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RouteHistoryService>(RouteHistoryService);
    prisma = module.get(PrismaService);
  });

  describe('getRouteHistory', () => {
    it('should return paginated route history', async () => {
      const routes = [mockRoute(), mockRoute({ id: 'route-2' })];
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue(routes);
      (prisma.deliveryRoute.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getRouteHistory('user-1', {}, 1, 20);

      expect(result.routes).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by driver ID', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute()]);
      (prisma.deliveryRoute.count as jest.Mock).mockResolvedValue(1);

      await service.getRouteHistory('user-1', { driverId: 'driver-1' });

      expect(prisma.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ driverId: 'driver-1' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.deliveryRoute.count as jest.Mock).mockResolvedValue(0);

      const from = new Date('2025-12-01');
      const to = new Date('2025-12-08');

      await service.getRouteHistory('user-1', { from, to });

      expect(prisma.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routeDate: { gte: from, lte: to },
          }),
        }),
      );
    });

    it('should calculate completed and failed stops', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute()]);
      (prisma.deliveryRoute.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getRouteHistory('user-1');

      expect(result.routes[0].totalStops).toBe(3);
      expect(result.routes[0].completedStops).toBe(2);
      expect(result.routes[0].failedStops).toBe(1);
    });
  });

  describe('getRouteReplayData', () => {
    it('should return complete replay data', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute());

      const result = await service.getRouteReplayData('route-1');

      expect(result.routeId).toBe('route-1');
      expect(result.routeName).toBe('Munich North Route');
      expect(result.driver.name).toBe('Hans Mueller');
      expect(result.vehicle.plate).toBe('M-DL-1234');
      expect(result.timeline.length).toBeGreaterThan(0);
      expect(result.stops.length).toBe(3);
    });

    it('should throw NotFoundException if route not found', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getRouteReplayData('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should build timeline with correct events', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute());

      const result = await service.getRouteReplayData('route-1');

      const eventTypes = result.timeline.map(e => e.eventType);
      expect(eventTypes).toContain('ROUTE_STARTED');
      expect(eventTypes).toContain('STOP_ARRIVED');
      expect(eventTypes).toContain('ROUTE_COMPLETED');
    });

    it('should calculate summary metrics', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute());

      const result = await service.getRouteReplayData('route-1');

      expect(result.summary.totalDurationMin).toBeGreaterThan(0);
      expect(result.summary.totalDistanceKm).toBe(55);
      expect(result.summary.deliveryRate).toBeGreaterThan(0);
    });

    it('should mark stops with POD correctly', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute());

      const result = await service.getRouteReplayData('route-1');

      const stopsWithPOD = result.stops.filter(s => s.hasPOD);
      expect(stopsWithPOD.length).toBeGreaterThan(0);
    });
  });

  describe('getPlannedVsActual', () => {
    it('should return planned vs actual comparison', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute());

      const result = await service.getPlannedVsActual('route-1');

      expect(result.routeId).toBe('route-1');
      expect(result.distance.planned).toBe(50);
      expect(result.distance.actual).toBe(55);
      expect(result.distance.differenceKm).toBe(5);
      expect(result.duration.planned).toBe(240);
      expect(result.duration.actual).toBe(260);
    });

    it('should throw NotFoundException if route not found', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getPlannedVsActual('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate timing delays', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute());

      const result = await service.getPlannedVsActual('route-1');

      expect(result.timing.startDelayMin).toBe(15); // Started 15 min late
      expect(result.timing.endDelayMin).toBe(35); // Ended 35 min late
    });

    it('should include stops comparison', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute());

      const result = await service.getPlannedVsActual('route-1');

      expect(result.stopsComparison).toHaveLength(3);
      expect(result.stopsComparison[0]).toHaveProperty('delayMinutes');
      expect(result.stopsComparison[0]).toHaveProperty('wasOnTime');
    });
  });

  describe('getRouteStats', () => {
    it('should return route statistics summary', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ status: 'COMPLETED' }),
        mockRoute({ id: 'route-2', status: 'COMPLETED' }),
        mockRoute({ id: 'route-3', status: 'IN_PROGRESS' }),
      ]);

      const from = new Date('2025-12-01');
      const to = new Date('2025-12-08');

      const result = await service.getRouteStats('user-1', from, to);

      expect(result.totalRoutes).toBe(3);
      expect(result.completedRoutes).toBe(2);
      expect(result.inProgressRoutes).toBe(1);
      expect(result.totalDeliveries).toBe(9);
      expect(result.successfulDeliveries).toBe(6);
      expect(result.failedDeliveries).toBe(3);
    });

    it('should calculate average metrics', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ actualDistanceKm: 50, actualDurationMin: 240 }),
        mockRoute({ id: 'route-2', actualDistanceKm: 60, actualDurationMin: 300 }),
      ]);

      const result = await service.getRouteStats(
        'user-1',
        new Date('2025-12-01'),
        new Date('2025-12-08'),
      );

      expect(result.avgDistanceKm).toBe(55);
      expect(result.avgDurationMin).toBe(270);
      expect(result.totalDistanceKm).toBe(110);
    });
  });

  describe('searchRoutes', () => {
    it('should search routes by query', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ routeName: 'Munich North Route' }),
      ]);

      const result = await service.searchRoutes('user-1', 'North');

      expect(result).toHaveLength(1);
      expect(result[0].routeName).toContain('North');
    });

    it('should limit results', async () => {
      const routes = Array.from({ length: 15 }, (_, i) =>
        mockRoute({ id: `route-${i}` }),
      );
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue(routes.slice(0, 5));

      const result = await service.searchRoutes('user-1', 'Munich', 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getDeliveryZones', () => {
    it('should return zones with route counts', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ deliveryZone: 'Munich-Schwabing' }),
        mockRoute({ id: 'route-2', deliveryZone: 'Munich-Schwabing' }),
        mockRoute({ id: 'route-3', deliveryZone: 'Munich-Pasing' }),
      ]);

      const result = await service.getDeliveryZones('user-1');

      expect(result.length).toBe(2);
      const schwabing = result.find(z => z.zone === 'Munich-Schwabing');
      expect(schwabing?.routeCount).toBe(2);
    });

    it('should sort zones by route count descending', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ deliveryZone: 'Munich-Schwabing' }),
        mockRoute({ id: 'route-2', deliveryZone: 'Munich-Schwabing' }),
        mockRoute({ id: 'route-3', deliveryZone: 'Munich-Pasing' }),
      ]);

      const result = await service.getDeliveryZones('user-1');

      expect(result[0].zone).toBe('Munich-Schwabing');
      expect(result[0].routeCount).toBe(2);
    });

    it('should filter by date range', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([]);

      const from = new Date('2025-12-01');
      const to = new Date('2025-12-08');

      await service.getDeliveryZones('user-1', from, to);

      expect(prisma.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routeDate: { gte: from, lte: to },
          }),
        }),
      );
    });
  });
});
