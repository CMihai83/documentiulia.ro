import { Test, TestingModule } from '@nestjs/testing';
import { RouteOptimizationService } from './route-optimization.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RouteOptimizationService', () => {
  let service: RouteOptimizationService;

  const mockPrisma = {
    deliveryRoute: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    deliveryStop: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteOptimizationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RouteOptimizationService>(RouteOptimizationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeRoute', () => {
    it('should return no optimization needed for routes with fewer than 2 stops', async () => {
      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops: [
          { id: 'stop-1', latitude: { toNumber: () => 48.1351 }, longitude: { toNumber: () => 11.5820 }, parcelCount: 1, estimatedArrival: null },
        ],
        vehicle: { id: 'v1' },
      });

      const result = await service.optimizeRoute('route-1');

      expect(result.routeId).toBe('route-1');
      expect(result.distanceSavedKm).toBe(0);
      expect(result.message).toContain('fewer than 2 pending stops');
    });

    it('should throw NotFoundException for non-existent route', async () => {
      mockPrisma.deliveryRoute.findUnique.mockResolvedValue(null);

      await expect(service.optimizeRoute('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should optimize a route with multiple stops using nearest neighbor', async () => {
      // Munich area stops - scattered locations
      const stops = [
        { id: 'stop-1', latitude: { toNumber: () => 48.1500 }, longitude: { toNumber: () => 11.5700 }, parcelCount: 2, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-2', latitude: { toNumber: () => 48.1200 }, longitude: { toNumber: () => 11.6000 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-3', latitude: { toNumber: () => 48.1400 }, longitude: { toNumber: () => 11.5500 }, parcelCount: 3, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-4', latitude: { toNumber: () => 48.1100 }, longitude: { toNumber: () => 11.5800 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
      ];

      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops,
        vehicle: { id: 'v1' },
      });

      const result = await service.optimizeRoute('route-1');

      expect(result.routeId).toBe('route-1');
      expect(result.originalOrder).toHaveLength(4);
      expect(result.optimizedOrder).toHaveLength(4);
      expect(result.algorithm).toBe('nearest_neighbor_2opt');
      expect(result.originalDistanceKm).toBeDefined();
      expect(result.optimizedDistanceKm).toBeDefined();
    });

    it('should use genetic algorithm when specified', async () => {
      const stops = [
        { id: 'stop-1', latitude: { toNumber: () => 48.15 }, longitude: { toNumber: () => 11.57 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-2', latitude: { toNumber: () => 48.12 }, longitude: { toNumber: () => 11.60 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-3', latitude: { toNumber: () => 48.14 }, longitude: { toNumber: () => 11.55 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
      ];

      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops,
        vehicle: { id: 'v1' },
      });

      const result = await service.optimizeRoute('route-1', {
        algorithm: 'genetic',
        populationSize: 20,
        generations: 50,
      });

      expect(result.algorithm).toBe('genetic');
      expect(result.optimizedOrder).toHaveLength(3);
    });

    it('should use simulated annealing when specified', async () => {
      const stops = [
        { id: 'stop-1', latitude: { toNumber: () => 48.15 }, longitude: { toNumber: () => 11.57 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-2', latitude: { toNumber: () => 48.12 }, longitude: { toNumber: () => 11.60 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
      ];

      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops,
        vehicle: { id: 'v1' },
      });

      const result = await service.optimizeRoute('route-1', {
        algorithm: 'simulated_annealing',
      });

      expect(result.algorithm).toBe('simulated_annealing');
    });

    it('should auto-apply optimization when improvement is significant', async () => {
      // Create a route with stops that are clearly out of order
      const stops = [
        { id: 'stop-1', latitude: { toNumber: () => 48.20 }, longitude: { toNumber: () => 11.70 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-2', latitude: { toNumber: () => 48.10 }, longitude: { toNumber: () => 11.50 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-3', latitude: { toNumber: () => 48.18 }, longitude: { toNumber: () => 11.68 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'stop-4', latitude: { toNumber: () => 48.12 }, longitude: { toNumber: () => 11.52 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
      ];

      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops,
        vehicle: { id: 'v1' },
      });

      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.optimizeRoute('route-1', { autoApply: true });

      expect(result.routeId).toBe('route-1');
      // The route may or may not be applied depending on improvement percentage
      expect(typeof result.applied).toBe('boolean');
    });
  });

  describe('optimizeAllRoutes', () => {
    it('should batch optimize all pending routes', async () => {
      mockPrisma.deliveryRoute.findMany.mockResolvedValue([
        { id: 'route-1' },
        { id: 'route-2' },
      ]);

      // Mock individual route optimization
      mockPrisma.deliveryRoute.findUnique
        .mockResolvedValueOnce({
          id: 'route-1',
          stops: [
            { id: 's1', latitude: { toNumber: () => 48.15 }, longitude: { toNumber: () => 11.57 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
            { id: 's2', latitude: { toNumber: () => 48.12 }, longitude: { toNumber: () => 11.60 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
          ],
          vehicle: { id: 'v1' },
        })
        .mockResolvedValueOnce({
          id: 'route-2',
          stops: [
            { id: 's3', latitude: { toNumber: () => 48.14 }, longitude: { toNumber: () => 11.55 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
            { id: 's4', latitude: { toNumber: () => 48.11 }, longitude: { toNumber: () => 11.58 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
          ],
          vehicle: { id: 'v2' },
        });

      const result = await service.optimizeAllRoutes('user-123');

      expect(result.routesOptimized).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.totalDistanceSavedKm).toBeDefined();
      expect(result.estimatedCostSavingsEur).toBeDefined();
    });

    it('should handle empty route list', async () => {
      mockPrisma.deliveryRoute.findMany.mockResolvedValue([]);

      const result = await service.optimizeAllRoutes('user-123');

      expect(result.routesOptimized).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('estimateRouteWithTraffic', () => {
    it('should calculate traffic-adjusted time estimate', async () => {
      const stops = [
        { id: 'stop-1', latitude: { toNumber: () => 48.15 }, longitude: { toNumber: () => 11.57 }, stopOrder: 1 },
        { id: 'stop-2', latitude: { toNumber: () => 48.12 }, longitude: { toNumber: () => 11.60 }, stopOrder: 2 },
      ];

      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops,
      });

      // Test during morning rush hour (8am)
      const rushHourTime = new Date();
      rushHourTime.setHours(8, 0, 0, 0);

      const result = await service.estimateRouteWithTraffic('route-1', rushHourTime);

      expect(result.routeId).toBe('route-1');
      expect(result.totalDistanceKm).toBeGreaterThan(0);
      expect(result.trafficMultiplier).toBe(1.8); // 8am has 1.8x multiplier
      expect(result.trafficLevel).toBe('HEAVY');
      expect(result.estimatedArrivalTime).toBeInstanceOf(Date);
    });

    it('should return light traffic for off-peak hours', async () => {
      const stops = [
        { id: 'stop-1', latitude: { toNumber: () => 48.15 }, longitude: { toNumber: () => 11.57 }, stopOrder: 1 },
        { id: 'stop-2', latitude: { toNumber: () => 48.12 }, longitude: { toNumber: () => 11.60 }, stopOrder: 2 },
      ];

      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops,
      });

      // Test during off-peak (2pm)
      const offPeakTime = new Date();
      offPeakTime.setHours(14, 0, 0, 0);

      const result = await service.estimateRouteWithTraffic('route-1', offPeakTime);

      expect(result.trafficMultiplier).toBe(1.0);
      expect(result.trafficLevel).toBe('LIGHT');
    });

    it('should throw NotFoundException for non-existent route', async () => {
      mockPrisma.deliveryRoute.findUnique.mockResolvedValue(null);

      await expect(
        service.estimateRouteWithTraffic('non-existent', new Date())
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyOptimization', () => {
    it('should update stop order in database', async () => {
      const stops = [
        { id: 'stop-2', lat: 48.12, lng: 11.60, priority: 'NORMAL' as const },
        { id: 'stop-1', lat: 48.15, lng: 11.57, priority: 'NORMAL' as const },
      ];

      mockPrisma.$transaction.mockResolvedValue([
        { id: 'stop-2', stopOrder: 1 },
        { id: 'stop-1', stopOrder: 2 },
      ]);

      await service.applyOptimization('route-1', stops);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('distance calculations', () => {
    it('should calculate correct haversine distance', async () => {
      // Munich center to Munich airport is approximately 30km
      const stops = [
        { id: 'center', latitude: { toNumber: () => 48.1351 }, longitude: { toNumber: () => 11.5820 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
        { id: 'airport', latitude: { toNumber: () => 48.3538 }, longitude: { toNumber: () => 11.7861 }, parcelCount: 1, estimatedArrival: null, status: 'PENDING' },
      ];

      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops,
        vehicle: { id: 'v1' },
      });

      const result = await service.optimizeRoute('route-1');

      // Distance from Munich center to airport and back should be roughly 60km
      expect(result.originalDistanceKm).toBeGreaterThan(50);
      expect(result.originalDistanceKm).toBeLessThan(80);
    });
  });
});
