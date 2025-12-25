import { Test, TestingModule } from '@nestjs/testing';
import { GpsTrackingService, GpsPositionDto, MUNICH_DELIVERY_ZONES } from './gps-tracking.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { GeofenceType, GeofenceEventType } from '@prisma/client';

describe('GpsTrackingService', () => {
  let service: GpsTrackingService;

  const mockPrisma = {
    vehicle: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    vehiclePosition: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    geofence: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    geofenceEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    deliveryRoute: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsTrackingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GpsTrackingService>(GpsTrackingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePosition', () => {
    it('should update vehicle position and store in database', async () => {
      const position: GpsPositionDto = {
        vehicleId: 'vehicle-1',
        latitude: 48.1351,
        longitude: 11.5820,
        speed: 45,
        heading: 180,
      };

      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'vehicle-1', userId: 'user-1' });
      mockPrisma.vehiclePosition.create.mockResolvedValue({ id: 'pos-1', ...position });
      mockPrisma.vehicle.update.mockResolvedValue({ id: 'vehicle-1' });
      mockPrisma.geofence.findMany.mockResolvedValue([]);

      await service.updatePosition(position);

      expect(mockPrisma.vehiclePosition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vehicleId: 'vehicle-1',
          latitude: 48.1351,
          longitude: 11.5820,
          speed: 45,
          heading: 180,
        }),
      });

      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
        data: expect.objectContaining({
          currentLat: 48.1351,
          currentLng: 11.5820,
        }),
      });
    });

    it('should throw NotFoundException for non-existent vehicle', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePosition({
          vehicleId: 'non-existent',
          latitude: 48.1351,
          longitude: 11.5820,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchUpdatePositions', () => {
    it('should update multiple positions', async () => {
      const positions: GpsPositionDto[] = [
        { vehicleId: 'v1', latitude: 48.1, longitude: 11.5 },
        { vehicleId: 'v2', latitude: 48.2, longitude: 11.6 },
      ];

      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', userId: 'user-1' });
      mockPrisma.vehiclePosition.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});
      mockPrisma.geofence.findMany.mockResolvedValue([]);

      const result = await service.batchUpdatePositions(positions);

      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect errors for failed updates', async () => {
      mockPrisma.vehicle.findUnique.mockResolvedValue(null);

      const result = await service.batchUpdatePositions([
        { vehicleId: 'invalid', latitude: 48.1, longitude: 11.5 },
      ]);

      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getLatestPosition', () => {
    it('should return cached position if available', async () => {
      // First, update a position to cache it
      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', userId: 'user-1' });
      mockPrisma.vehiclePosition.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});
      mockPrisma.geofence.findMany.mockResolvedValue([]);

      await service.updatePosition({
        vehicleId: 'v1',
        latitude: 48.1351,
        longitude: 11.5820,
      });

      const position = await service.getLatestPosition('v1');

      expect(position).toBeDefined();
      expect(position?.latitude).toBe(48.1351);
      expect(position?.longitude).toBe(11.5820);
    });

    it('should fetch from database if not cached', async () => {
      mockPrisma.vehiclePosition.findFirst.mockResolvedValue({
        vehicleId: 'v1',
        latitude: { toNumber: () => 48.1351 } as any,
        longitude: { toNumber: () => 11.5820 } as any,
        altitude: null,
        speed: { toNumber: () => 30 } as any,
        heading: 90,
        accuracy: null,
        ignition: true,
        engineRunning: true,
        routeId: null,
        recordedAt: new Date(),
      });

      const position = await service.getLatestPosition('v2');

      expect(position).toBeDefined();
      expect(mockPrisma.vehiclePosition.findFirst).toHaveBeenCalledWith({
        where: { vehicleId: 'v2' },
        orderBy: { recordedAt: 'desc' },
      });
    });

    it('should return null if no position exists', async () => {
      mockPrisma.vehiclePosition.findFirst.mockResolvedValue(null);

      const position = await service.getLatestPosition('v3');

      expect(position).toBeNull();
    });
  });

  describe('getPositionHistory', () => {
    it('should return position history with filters', async () => {
      mockPrisma.vehiclePosition.findMany.mockResolvedValue([
        {
          vehicleId: 'v1',
          latitude: { toNumber: () => 48.1 } as any,
          longitude: { toNumber: () => 11.5 } as any,
          altitude: null,
          speed: null,
          heading: null,
          accuracy: null,
          ignition: true,
          engineRunning: true,
          routeId: null,
          recordedAt: new Date('2024-01-15'),
        },
      ]);

      const history = await service.getPositionHistory('v1', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
        limit: 100,
      });

      expect(history).toHaveLength(1);
      expect(mockPrisma.vehiclePosition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'v1',
            recordedAt: expect.any(Object),
          }),
          take: 100,
        }),
      );
    });
  });

  describe('getAllVehiclePositions', () => {
    it('should return tracking info for all fleet vehicles', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'v1',
          licensePlate: 'M-FL 1234',
          status: 'IN_USE',
          currentLat: { toNumber: () => 48.1351 } as any,
          currentLng: { toNumber: () => 11.5820 } as any,
          lastLocationAt: new Date(),
          assignedDriver: { firstName: 'Hans', lastName: 'Müller' },
          deliveryRoutes: [
            {
              id: 'route-1',
              routeName: 'North Route',
              plannedEndTime: new Date(),
              stops: [
                { status: 'DELIVERED' },
                { status: 'PENDING' },
              ],
            },
          ],
        },
      ]);

      const result = await service.getAllVehiclePositions('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].licensePlate).toBe('M-FL 1234');
      expect(result[0].driverName).toBe('Hans Müller');
      expect(result[0].currentPosition).toBeDefined();
      expect(result[0].activeRoute).toBeDefined();
      expect(result[0].activeRoute?.completedStops).toBe(1);
      expect(result[0].activeRoute?.totalStops).toBe(2);
    });
  });

  describe('getRouteTrack', () => {
    it('should return route track with positions and stops', async () => {
      mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
        id: 'route-1',
        stops: [
          {
            id: 'stop-1',
            stopOrder: 1,
            latitude: 48.15,
            longitude: 11.57,
            status: 'DELIVERED',
            recipientName: 'Customer A',
          },
        ],
      });

      mockPrisma.vehiclePosition.findMany.mockResolvedValue([
        {
          latitude: 48.14,
          longitude: 11.56,
          recordedAt: new Date(),
        },
        {
          latitude: 48.15,
          longitude: 11.57,
          recordedAt: new Date(),
        },
      ]);

      const result = await service.getRouteTrack('route-1');

      expect(result.positions).toHaveLength(2);
      expect(result.stops).toHaveLength(1);
      expect(result.totalDistanceKm).toBeGreaterThanOrEqual(0);
    });

    it('should throw NotFoundException for non-existent route', async () => {
      mockPrisma.deliveryRoute.findUnique.mockResolvedValue(null);

      await expect(service.getRouteTrack('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createGeofence', () => {
    it('should create a circular geofence', async () => {
      mockPrisma.geofence.create.mockResolvedValue({
        id: 'geofence-1',
        name: 'Munich Center',
        type: GeofenceType.CIRCLE,
        centerLat: 48.1351,
        centerLng: 11.5820,
        radiusMeters: 1000,
      });

      const result = await service.createGeofence('user-1', {
        name: 'Munich Center',
        type: GeofenceType.CIRCLE,
        centerLat: 48.1351,
        centerLng: 11.5820,
        radiusMeters: 1000,
      });

      expect(result.name).toBe('Munich Center');
      expect(mockPrisma.geofence.create).toHaveBeenCalled();
    });
  });

  describe('createMunichDeliveryZones', () => {
    it('should create predefined Munich delivery zones', async () => {
      mockPrisma.geofence.findFirst.mockResolvedValue(null);
      mockPrisma.geofence.create.mockResolvedValue({});

      const created = await service.createMunichDeliveryZones('user-1');

      expect(created).toBe(Object.keys(MUNICH_DELIVERY_ZONES).length);
    });

    it('should skip existing zones', async () => {
      mockPrisma.geofence.findFirst.mockResolvedValue({ id: 'existing' });

      const created = await service.createMunichDeliveryZones('user-1');

      expect(created).toBe(0);
    });
  });

  describe('getVehicleStatistics', () => {
    it('should calculate driving statistics', async () => {
      const positions = [
        {
          latitude: 48.1351,
          longitude: 11.5820,
          speed: 40,
          engineRunning: true,
          recordedAt: new Date('2024-01-15T08:00:00'),
        },
        {
          latitude: 48.1451,
          longitude: 11.5920,
          speed: 50,
          engineRunning: true,
          recordedAt: new Date('2024-01-15T08:30:00'),
        },
        {
          latitude: 48.1551,
          longitude: 11.6020,
          speed: 0,
          engineRunning: true,
          recordedAt: new Date('2024-01-15T09:00:00'),
        },
      ];

      mockPrisma.vehiclePosition.findMany.mockResolvedValue(positions);

      const stats = await service.getVehicleStatistics(
        'v1',
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      );

      expect(stats.positionCount).toBe(3);
      expect(stats.totalDistanceKm).toBeGreaterThan(0);
      expect(stats.maxSpeedKmh).toBe(50);
      expect(stats.averageSpeedKmh).toBe(45); // (40 + 50) / 2
    });

    it('should return zeros for empty data', async () => {
      mockPrisma.vehiclePosition.findMany.mockResolvedValue([]);

      const stats = await service.getVehicleStatistics(
        'v1',
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      );

      expect(stats.positionCount).toBe(0);
      expect(stats.totalDistanceKm).toBe(0);
      expect(stats.averageSpeedKmh).toBe(0);
    });
  });

  describe('getFleetHeatmap', () => {
    it('should aggregate positions into heatmap grid', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([{ id: 'v1' }]);
      mockPrisma.vehiclePosition.findMany.mockResolvedValue([
        { latitude: { toNumber: () => 48.1351 } as any, longitude: { toNumber: () => 11.5820 } as any },
        { latitude: { toNumber: () => 48.1351 } as any, longitude: { toNumber: () => 11.5820 } as any },
        { latitude: { toNumber: () => 48.1400 } as any, longitude: { toNumber: () => 11.5900 } as any },
      ]);

      const heatmap = await service.getFleetHeatmap(
        'user-1',
        new Date('2024-01-15'),
        new Date('2024-01-16'),
      );

      expect(heatmap.length).toBeGreaterThan(0);
      // The first point should have higher weight (2 positions nearby)
      const maxWeight = Math.max(...heatmap.map(p => p.weight));
      expect(maxWeight).toBeGreaterThanOrEqual(2);
    });
  });

  describe('cleanupOldPositions', () => {
    it('should delete positions older than specified days', async () => {
      mockPrisma.vehiclePosition.deleteMany.mockResolvedValue({ count: 1000 });

      const deleted = await service.cleanupOldPositions(90);

      expect(deleted).toBe(1000);
      expect(mockPrisma.vehiclePosition.deleteMany).toHaveBeenCalledWith({
        where: {
          recordedAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('geofence detection', () => {
    it('should create ENTER event when vehicle enters geofence', async () => {
      // Vehicle inside Munich Schwabing zone
      const position: GpsPositionDto = {
        vehicleId: 'v1',
        latitude: 48.1716, // Munich Schwabing center
        longitude: 11.5753,
      };

      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', userId: 'user-1' });
      mockPrisma.vehiclePosition.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});

      // Active geofence for Munich Schwabing
      mockPrisma.geofence.findMany.mockResolvedValue([
        {
          id: 'geofence-1',
          name: 'Munich-Schwabing',
          type: GeofenceType.CIRCLE,
          centerLat: 48.1716,
          centerLng: 11.5753,
          radiusMeters: 2000,
          alertOnEntry: true,
          alertOnExit: true,
        },
      ]);

      // No previous event (first time in zone)
      mockPrisma.geofenceEvent.findFirst.mockResolvedValue(null);
      mockPrisma.geofenceEvent.create.mockResolvedValue({});

      await service.updatePosition(position);

      expect(mockPrisma.geofenceEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          geofenceId: 'geofence-1',
          vehicleId: 'v1',
          eventType: GeofenceEventType.ENTER,
        }),
      });
    });

    it('should create EXIT event when vehicle leaves geofence', async () => {
      // Vehicle outside Munich Schwabing zone
      const position: GpsPositionDto = {
        vehicleId: 'v1',
        latitude: 48.20, // Outside the zone
        longitude: 11.60,
      };

      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', userId: 'user-1' });
      mockPrisma.vehiclePosition.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});

      mockPrisma.geofence.findMany.mockResolvedValue([
        {
          id: 'geofence-1',
          name: 'Munich-Schwabing',
          type: GeofenceType.CIRCLE,
          centerLat: 48.1716,
          centerLng: 11.5753,
          radiusMeters: 2000,
          alertOnEntry: true,
          alertOnExit: true,
        },
      ]);

      // Previous event was ENTER (was inside)
      mockPrisma.geofenceEvent.findFirst.mockResolvedValue({
        eventType: GeofenceEventType.ENTER,
      });
      mockPrisma.geofenceEvent.create.mockResolvedValue({});

      await service.updatePosition(position);

      expect(mockPrisma.geofenceEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          geofenceId: 'geofence-1',
          vehicleId: 'v1',
          eventType: GeofenceEventType.EXIT,
        }),
      });
    });
  });

  describe('subscriptions', () => {
    it('should notify subscribers on position update', async () => {
      const callback = jest.fn();

      const unsubscribe = service.subscribe('v1', callback);

      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', userId: 'user-1' });
      mockPrisma.vehiclePosition.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});
      mockPrisma.geofence.findMany.mockResolvedValue([]);

      await service.updatePosition({
        vehicleId: 'v1',
        latitude: 48.1351,
        longitude: 11.5820,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleId: 'v1',
          latitude: 48.1351,
          longitude: 11.5820,
        }),
      );

      // Clean up
      unsubscribe();
    });

    it('should allow unsubscribing', async () => {
      const callback = jest.fn();

      const unsubscribe = service.subscribe('v1', callback);
      unsubscribe();

      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'v1', userId: 'user-1' });
      mockPrisma.vehiclePosition.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});
      mockPrisma.geofence.findMany.mockResolvedValue([]);

      await service.updatePosition({
        vehicleId: 'v1',
        latitude: 48.1351,
        longitude: 11.5820,
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
