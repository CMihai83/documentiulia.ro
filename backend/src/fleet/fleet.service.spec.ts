import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus, RouteStatus, DeliveryStopStatus } from '@prisma/client';

describe('FleetService', () => {
  let service: FleetService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vehicle: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    deliveryRoute: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deliveryStop: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    fuelLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    maintenanceLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  // Helper functions
  const createMockVehicle = (overrides: any = {}) => ({
    id: 'vehicle-001',
    userId: 'user-001',
    organizationId: null,
    licensePlate: 'B 123 ABC',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2022,
    fuelType: 'DIESEL',
    status: VehicleStatus.AVAILABLE,
    maxPayloadKg: 1500,
    cargoVolumeM3: 10,
    mileage: 50000,
    monthlyLeaseCost: 1500,
    insuranceCost: 500,
    assignedDriver: null,
    currentLat: null,
    currentLng: null,
    lastLocationAt: null,
    ...overrides,
  });

  const createMockRoute = (overrides: any = {}) => ({
    id: 'route-001',
    userId: 'user-001',
    organizationId: null,
    vehicleId: 'vehicle-001',
    driverId: 'driver-001',
    routeName: 'Test Route',
    routeDate: new Date('2025-01-15'),
    status: RouteStatus.PLANNED,
    plannedDistanceKm: 100,
    actualDistanceKm: null,
    actualStartTime: null,
    actualEndTime: null,
    totalStops: 5,
    completedStops: 0,
    failedDeliveries: 0,
    totalParcels: 10,
    deliveredParcels: 0,
    ...overrides,
  });

  const createMockStop = (overrides: any = {}) => ({
    id: 'stop-001',
    routeId: 'route-001',
    customerName: 'Client Test SRL',
    address: 'Str. Test 123, București',
    latitude: 44.4268,
    longitude: 26.1025,
    stopOrder: 1,
    parcelCount: 2,
    status: DeliveryStopStatus.PENDING,
    estimatedArrival: new Date('2025-01-15T10:00:00'),
    actualArrival: null,
    completedAt: null,
    attemptCount: 0,
    ...overrides,
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== VEHICLE OPERATIONS ===================

  describe('createVehicle', () => {
    const userId = 'user-001';
    const createDto: any = {
      licensePlate: 'B 456 DEF',
      make: 'VW',
      model: 'Crafter',
      year: 2023,
      fuelType: 'DIESEL',
      maxPayloadKg: 1200,
      cargoVolumeM3: 8,
      monthlyLeaseCost: 1200,
      insuranceCost: 400,
    };

    it('should create a vehicle successfully', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicle.create.mockResolvedValue({
        id: 'new-vehicle',
        userId,
        ...createDto,
        assignedDriver: null,
      });

      const result = await service.createVehicle(userId, createDto);

      expect(result.id).toBe('new-vehicle');
      expect(mockPrismaService.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            licensePlate: 'B 456 DEF',
          }),
        }),
      );
    });

    it('should throw BadRequestException for duplicate license plate', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(createMockVehicle());

      await expect(service.createVehicle(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include organizationId when provided', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicle.create.mockResolvedValue({
        id: 'new-vehicle',
        userId,
        organizationId: 'org-001',
        ...createDto,
        assignedDriver: null,
      });

      await service.createVehicle(userId, createDto, 'org-001');

      expect(mockPrismaService.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-001',
          }),
        }),
      );
    });

    it('should include assigned driver in response', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicle.create.mockResolvedValue({
        id: 'new-vehicle',
        userId,
        ...createDto,
        assignedDriver: { id: 'driver-001', firstName: 'Ion', lastName: 'Popescu' },
      });

      const result = await service.createVehicle(userId, createDto);

      expect(result.assignedDriver).toEqual({
        id: 'driver-001',
        firstName: 'Ion',
        lastName: 'Popescu',
      });
    });
  });

  describe('getVehicles', () => {
    const userId = 'user-001';

    it('should return vehicles for user', async () => {
      const vehicles = [
        createMockVehicle({ id: 'v1', licensePlate: 'B 001 AAA' }),
        createMockVehicle({ id: 'v2', licensePlate: 'B 002 BBB' }),
      ];
      mockPrismaService.vehicle.findMany.mockResolvedValue(vehicles);

      const result = await service.getVehicles(userId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should filter by organizationId when provided', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([]);

      await service.getVehicles(userId, 'org-001');

      expect(mockPrismaService.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { userId },
              { organizationId: 'org-001' },
            ],
          },
        }),
      );
    });

    it('should order by license plate ascending', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([]);

      await service.getVehicles(userId);

      expect(mockPrismaService.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { licensePlate: 'asc' },
        }),
      );
    });
  });

  describe('getVehicleById', () => {
    const userId = 'user-001';
    const vehicleId = 'vehicle-001';

    it('should return vehicle with related data', async () => {
      const vehicle = createMockVehicle({
        assignedDriver: { id: 'driver-001', firstName: 'Ion' },
        deliveryRoutes: [],
        fuelLogs: [],
        maintenanceLogs: [],
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);

      const result = await service.getVehicleById(vehicleId, userId);

      expect(result.id).toBe(vehicleId);
      expect(mockPrismaService.vehicle.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: vehicleId, userId },
          include: expect.objectContaining({
            assignedDriver: true,
            deliveryRoutes: expect.any(Object),
            fuelLogs: expect.any(Object),
            maintenanceLogs: expect.any(Object),
          }),
        }),
      );
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getVehicleById(vehicleId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateVehicle', () => {
    const userId = 'user-001';
    const vehicleId = 'vehicle-001';
    const updateDto: any = { status: VehicleStatus.MAINTENANCE };

    it('should update vehicle successfully', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...createMockVehicle(),
        status: VehicleStatus.MAINTENANCE,
      });

      const result = await service.updateVehicle(vehicleId, userId, updateDto);

      expect(result.status).toBe(VehicleStatus.MAINTENANCE);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.updateVehicle(vehicleId, userId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVehicleLocation', () => {
    const userId = 'user-001';
    const vehicleId = 'vehicle-001';
    const locationDto = { latitude: 44.4268, longitude: 26.1025 };

    it('should update vehicle location', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...createMockVehicle(),
        currentLat: 44.4268,
        currentLng: 26.1025,
        lastLocationAt: new Date(),
      });

      const result = await service.updateVehicleLocation(vehicleId, userId, locationDto);

      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
        where: { id: vehicleId },
        data: expect.objectContaining({
          currentLat: 44.4268,
          currentLng: 26.1025,
          lastLocationAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.updateVehicleLocation(vehicleId, userId, locationDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteVehicle', () => {
    const userId = 'user-001';
    const vehicleId = 'vehicle-001';

    it('should delete vehicle successfully', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.vehicle.delete.mockResolvedValue(createMockVehicle());

      await service.deleteVehicle(vehicleId, userId);

      expect(mockPrismaService.vehicle.delete).toHaveBeenCalledWith({
        where: { id: vehicleId },
      });
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.deleteVehicle(vehicleId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =================== DELIVERY ROUTE OPERATIONS ===================

  describe('createDeliveryRoute', () => {
    const userId = 'user-001';
    const createDto: any = {
      vehicleId: 'vehicle-001',
      driverId: 'driver-001',
      routeName: 'New Route',
      routeDate: '2025-01-20',
      plannedDistanceKm: 150,
    };

    it('should create delivery route successfully', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.deliveryRoute.create.mockResolvedValue({
        id: 'new-route',
        userId,
        ...createDto,
        routeDate: new Date(createDto.routeDate),
        vehicle: { id: 'vehicle-001', licensePlate: 'B 123 ABC' },
        driver: { id: 'driver-001', firstName: 'Ion', lastName: 'Popescu' },
      });

      const result = await service.createDeliveryRoute(userId, createDto);

      expect(result.id).toBe('new-route');
      expect(mockPrismaService.deliveryRoute.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.createDeliveryRoute(userId, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include organizationId when provided', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.deliveryRoute.create.mockResolvedValue({
        id: 'new-route',
        userId,
        organizationId: 'org-001',
        ...createDto,
      });

      await service.createDeliveryRoute(userId, createDto, 'org-001');

      expect(mockPrismaService.deliveryRoute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-001',
          }),
        }),
      );
    });
  });

  describe('getDeliveryRoutes', () => {
    const userId = 'user-001';

    it('should return routes for user', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        createMockRoute({ id: 'r1' }),
        createMockRoute({ id: 'r2' }),
      ]);

      const result = await service.getDeliveryRoutes(userId);

      expect(result).toHaveLength(2);
    });

    it('should filter by date', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      await service.getDeliveryRoutes(userId, { date: '2025-01-15' });

      expect(mockPrismaService.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            routeDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should filter by vehicleId', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      await service.getDeliveryRoutes(userId, { vehicleId: 'vehicle-001' });

      expect(mockPrismaService.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-001',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      await service.getDeliveryRoutes(userId, { status: RouteStatus.IN_PROGRESS });

      expect(mockPrismaService.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RouteStatus.IN_PROGRESS,
          }),
        }),
      );
    });
  });

  describe('getRouteById', () => {
    const userId = 'user-001';
    const routeId = 'route-001';

    it('should return route with stops', async () => {
      const route = createMockRoute({
        vehicle: createMockVehicle(),
        driver: { id: 'driver-001', firstName: 'Ion' },
        stops: [createMockStop()],
      });
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(route);

      const result = await service.getRouteById(routeId, userId);

      expect(result.id).toBe(routeId);
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(service.getRouteById(routeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDeliveryRoute', () => {
    const userId = 'user-001';
    const routeId = 'route-001';

    it('should update route successfully', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(createMockRoute());
      mockPrismaService.deliveryRoute.update.mockResolvedValue({
        ...createMockRoute(),
        routeName: 'Updated Route',
      });

      const result = await service.updateDeliveryRoute(routeId, userId, {
        routeName: 'Updated Route',
      } as any);

      expect(result.routeName).toBe('Updated Route');
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDeliveryRoute(routeId, userId, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should convert routeDate string to Date', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(createMockRoute());
      mockPrismaService.deliveryRoute.update.mockResolvedValue(createMockRoute());

      await service.updateDeliveryRoute(routeId, userId, {
        routeDate: '2025-02-01',
      } as any);

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            routeDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('startRoute', () => {
    const userId = 'user-001';
    const routeId = 'route-001';

    it('should start route and set IN_PROGRESS status', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(createMockRoute());
      mockPrismaService.deliveryRoute.update.mockResolvedValue({
        ...createMockRoute(),
        status: RouteStatus.IN_PROGRESS,
        actualStartTime: new Date(),
      });

      const result = await service.startRoute(routeId, userId);

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: routeId },
        data: {
          status: RouteStatus.IN_PROGRESS,
          actualStartTime: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(service.startRoute(routeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('completeRoute', () => {
    const userId = 'user-001';
    const routeId = 'route-001';

    it('should complete route with COMPLETED status when all stops delivered', async () => {
      const route = createMockRoute({
        stops: [
          createMockStop({ status: DeliveryStopStatus.DELIVERED }),
          createMockStop({ status: DeliveryStopStatus.DELIVERED }),
        ],
      });
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(route);
      mockPrismaService.deliveryRoute.update.mockResolvedValue({
        ...route,
        status: RouteStatus.COMPLETED,
      });

      await service.completeRoute(routeId, userId);

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: routeId },
        data: expect.objectContaining({
          status: RouteStatus.COMPLETED,
          completedStops: 2,
          failedDeliveries: 0,
        }),
      });
    });

    it('should complete route with PARTIAL status when some stops failed', async () => {
      const route = createMockRoute({
        stops: [
          createMockStop({ status: DeliveryStopStatus.DELIVERED }),
          createMockStop({ status: DeliveryStopStatus.FAILED }),
        ],
      });
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(route);
      mockPrismaService.deliveryRoute.update.mockResolvedValue({
        ...route,
        status: RouteStatus.PARTIAL,
      });

      await service.completeRoute(routeId, userId);

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: routeId },
        data: expect.objectContaining({
          status: RouteStatus.PARTIAL,
          completedStops: 1,
          failedDeliveries: 1,
        }),
      });
    });

    it('should count RETURNED stops as failed', async () => {
      const route = createMockRoute({
        stops: [
          createMockStop({ status: DeliveryStopStatus.DELIVERED }),
          createMockStop({ status: DeliveryStopStatus.RETURNED }),
        ],
      });
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(route);
      mockPrismaService.deliveryRoute.update.mockResolvedValue(route);

      await service.completeRoute(routeId, userId);

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: routeId },
        data: expect.objectContaining({
          failedDeliveries: 1,
        }),
      });
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(service.completeRoute(routeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =================== DELIVERY STOP OPERATIONS ===================

  describe('addDeliveryStop', () => {
    const userId = 'user-001';
    const createDto: any = {
      routeId: 'route-001',
      customerName: 'Client Nou',
      address: 'Str. Nouă 1',
      recipientName: 'Client Nou',
      streetAddress: 'Str. Nouă 1',
      postalCode: '010101',
      latitude: 44.5,
      longitude: 26.2,
      stopOrder: 3,
      parcelCount: 5,
    };

    it('should add stop to route', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(createMockRoute());
      mockPrismaService.deliveryStop.create.mockResolvedValue({
        id: 'new-stop',
        ...createDto,
      });
      mockPrismaService.deliveryRoute.update.mockResolvedValue(createMockRoute());

      const result = await service.addDeliveryStop(userId, createDto);

      expect(result.id).toBe('new-stop');
      expect(mockPrismaService.deliveryStop.create).toHaveBeenCalled();
    });

    it('should update route stop count', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(createMockRoute());
      mockPrismaService.deliveryStop.create.mockResolvedValue({ id: 'new-stop', ...createDto });
      mockPrismaService.deliveryRoute.update.mockResolvedValue(createMockRoute());

      await service.addDeliveryStop(userId, createDto);

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: createDto.routeId },
        data: {
          totalStops: { increment: 1 },
          totalParcels: { increment: 5 },
        },
      });
    });

    it('should default parcelCount to 1', async () => {
      const dtoWithoutParcels = { ...createDto, parcelCount: undefined };
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(createMockRoute());
      mockPrismaService.deliveryStop.create.mockResolvedValue({ id: 'new-stop' });
      mockPrismaService.deliveryRoute.update.mockResolvedValue(createMockRoute());

      await service.addDeliveryStop(userId, dtoWithoutParcels);

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: createDto.routeId },
        data: {
          totalStops: { increment: 1 },
          totalParcels: { increment: 1 },
        },
      });
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(service.addDeliveryStop(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDeliveryStop', () => {
    const userId = 'user-001';
    const stopId = 'stop-001';

    it('should update stop status', async () => {
      const stop = createMockStop({
        route: createMockRoute({ userId }),
      });
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.deliveryStop.update.mockResolvedValue({
        ...stop,
        status: DeliveryStopStatus.IN_PROGRESS,
        actualArrival: new Date(),
      });

      const result = await service.updateDeliveryStop(stopId, userId, {
        status: DeliveryStopStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(DeliveryStopStatus.IN_PROGRESS);
    });

    it('should set actualArrival when status is IN_PROGRESS', async () => {
      const stop = createMockStop({ route: createMockRoute({ userId }) });
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.deliveryStop.update.mockResolvedValue(stop);

      await service.updateDeliveryStop(stopId, userId, {
        status: DeliveryStopStatus.IN_PROGRESS,
      });

      expect(mockPrismaService.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: stopId },
        data: expect.objectContaining({
          actualArrival: expect.any(Date),
        }),
      });
    });

    it('should set completedAt when status is DELIVERED', async () => {
      const stop = createMockStop({ route: createMockRoute({ userId }) });
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.deliveryStop.update.mockResolvedValue(stop);
      mockPrismaService.deliveryRoute.update.mockResolvedValue(createMockRoute());

      await service.updateDeliveryStop(stopId, userId, {
        status: DeliveryStopStatus.DELIVERED,
      });

      expect(mockPrismaService.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: stopId },
        data: expect.objectContaining({
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should increment route completedStops when DELIVERED', async () => {
      const stop = createMockStop({
        route: createMockRoute({ userId }),
        parcelCount: 3,
      });
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.deliveryStop.update.mockResolvedValue(stop);
      mockPrismaService.deliveryRoute.update.mockResolvedValue(createMockRoute());

      await service.updateDeliveryStop(stopId, userId, {
        status: DeliveryStopStatus.DELIVERED,
      });

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: stop.routeId },
        data: {
          completedStops: { increment: 1 },
          deliveredParcels: { increment: 3 },
        },
      });
    });

    it('should increment route failedDeliveries when FAILED', async () => {
      const stop = createMockStop({ route: createMockRoute({ userId }) });
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.deliveryStop.update.mockResolvedValue(stop);
      mockPrismaService.deliveryRoute.update.mockResolvedValue(createMockRoute());

      await service.updateDeliveryStop(stopId, userId, {
        status: DeliveryStopStatus.FAILED,
      });

      expect(mockPrismaService.deliveryRoute.update).toHaveBeenCalledWith({
        where: { id: stop.routeId },
        data: {
          failedDeliveries: { increment: 1 },
        },
      });
    });

    it('should increment attemptCount when ATTEMPTED', async () => {
      const stop = createMockStop({ route: createMockRoute({ userId }) });
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.deliveryStop.update.mockResolvedValue(stop);

      await service.updateDeliveryStop(stopId, userId, {
        status: DeliveryStopStatus.ATTEMPTED,
      });

      expect(mockPrismaService.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: stopId },
        data: expect.objectContaining({
          attemptCount: { increment: 1 },
        }),
      });
    });

    it('should throw NotFoundException if stop not found', async () => {
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDeliveryStop(stopId, userId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if stop belongs to different user', async () => {
      const stop = createMockStop({
        route: createMockRoute({ userId: 'other-user' }),
      });
      mockPrismaService.deliveryStop.findFirst.mockResolvedValue(stop);

      await expect(
        service.updateDeliveryStop(stopId, userId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =================== FUEL LOG OPERATIONS ===================

  describe('addFuelLog', () => {
    const userId = 'user-001';
    const createDto: any = {
      vehicleId: 'vehicle-001',
      driverId: 'driver-001',
      fuelDate: '2025-01-15',
      liters: 60,
      pricePerLiter: 7.5,
      totalCost: 450,
      odometerReading: 55000,
      stationName: 'Petrom',
    };

    it('should create fuel log', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.fuelLog.create.mockResolvedValue({
        id: 'fuel-001',
        ...createDto,
        fuelType: 'DIESEL',
        vehicle: { id: 'vehicle-001', licensePlate: 'B 123 ABC' },
      });
      mockPrismaService.vehicle.update.mockResolvedValue(createMockVehicle());

      const result = await service.addFuelLog(userId, createDto);

      expect(result.id).toBe('fuel-001');
      expect(mockPrismaService.fuelLog.create).toHaveBeenCalled();
    });

    it('should update vehicle mileage', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.fuelLog.create.mockResolvedValue({ id: 'fuel-001' });
      mockPrismaService.vehicle.update.mockResolvedValue(createMockVehicle());

      await service.addFuelLog(userId, createDto);

      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
        where: { id: createDto.vehicleId },
        data: { mileage: 55000 },
      });
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.addFuelLog(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFuelLogs', () => {
    const userId = 'user-001';

    it('should return fuel logs for user', async () => {
      mockPrismaService.fuelLog.findMany.mockResolvedValue([
        { id: 'f1', totalCost: 400 },
        { id: 'f2', totalCost: 500 },
      ]);

      const result = await service.getFuelLogs(userId);

      expect(result).toHaveLength(2);
    });

    it('should filter by vehicleId', async () => {
      mockPrismaService.fuelLog.findMany.mockResolvedValue([]);

      await service.getFuelLogs(userId, 'vehicle-001');

      expect(mockPrismaService.fuelLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-001',
          }),
        }),
      );
    });
  });

  // =================== MAINTENANCE LOG OPERATIONS ===================

  describe('addMaintenanceLog', () => {
    const userId = 'user-001';
    const createDto: any = {
      vehicleId: 'vehicle-001',
      maintenanceDate: '2025-01-15',
      maintenanceType: 'OIL_CHANGE',
      description: 'Schimb ulei și filtre',
      cost: 500,
      odometerReading: 55000,
      serviceProvider: 'Auto Service SRL',
      nextMaintenanceDate: '2025-07-15',
    };

    it('should create maintenance log', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.maintenanceLog.create.mockResolvedValue({
        id: 'maint-001',
        ...createDto,
        vehicle: { id: 'vehicle-001', licensePlate: 'B 123 ABC' },
      });
      mockPrismaService.vehicle.update.mockResolvedValue(createMockVehicle());

      const result = await service.addMaintenanceLog(userId, createDto);

      expect(result.id).toBe('maint-001');
    });

    it('should update vehicle maintenance dates', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(createMockVehicle());
      mockPrismaService.maintenanceLog.create.mockResolvedValue({ id: 'maint-001' });
      mockPrismaService.vehicle.update.mockResolvedValue(createMockVehicle());

      await service.addMaintenanceLog(userId, createDto);

      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
        where: { id: createDto.vehicleId },
        data: expect.objectContaining({
          mileage: 55000,
          lastServiceDate: expect.any(Date),
          nextServiceDate: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.addMaintenanceLog(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMaintenanceLogs', () => {
    const userId = 'user-001';

    it('should return maintenance logs for user', async () => {
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([
        { id: 'm1', totalCost: 500 },
        { id: 'm2', totalCost: 1000 },
      ]);

      const result = await service.getMaintenanceLogs(userId);

      expect(result).toHaveLength(2);
    });

    it('should filter by vehicleId', async () => {
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([]);

      await service.getMaintenanceLogs(userId, 'vehicle-001');

      expect(mockPrismaService.maintenanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-001',
          }),
        }),
      );
    });
  });

  // =================== DASHBOARD / SUMMARY ===================

  describe('getFleetSummary', () => {
    const userId = 'user-001';

    it('should return fleet summary', async () => {
      mockPrismaService.vehicle.groupBy.mockResolvedValue([
        { status: VehicleStatus.AVAILABLE, _count: { status: 5 } },
        { status: VehicleStatus.IN_USE, _count: { status: 3 } },
        { status: VehicleStatus.MAINTENANCE, _count: { status: 1 } },
      ]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);
      mockPrismaService.fuelLog.aggregate.mockResolvedValue({
        _sum: { totalCost: 5000 },
      });
      mockPrismaService.maintenanceLog.aggregate.mockResolvedValue({
        _sum: { totalCost: 2000 },
      });

      const result = await service.getFleetSummary(userId);

      expect(result).toMatchObject({
        totalVehicles: 9,
        availableVehicles: 5,
        inUseVehicles: 3,
        maintenanceVehicles: 1,
        monthlyFuelCost: 5000,
        monthlyMaintenanceCost: 2000,
      });
    });

    it('should calculate today delivery stats', async () => {
      mockPrismaService.vehicle.groupBy.mockResolvedValue([]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'r1',
          stops: [
            { status: DeliveryStopStatus.DELIVERED },
            { status: DeliveryStopStatus.DELIVERED },
            { status: DeliveryStopStatus.PENDING },
          ],
        },
        {
          id: 'r2',
          stops: [
            { status: DeliveryStopStatus.FAILED },
          ],
        },
      ]);
      mockPrismaService.fuelLog.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });
      mockPrismaService.maintenanceLog.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

      const result = await service.getFleetSummary(userId);

      expect(result.todayRoutes).toBe(2);
      expect(result.todayDeliveries).toBe(4);
      expect(result.todayCompletedDeliveries).toBe(2);
      expect(result.todayFailedDeliveries).toBe(1);
    });

    it('should handle null cost sums', async () => {
      mockPrismaService.vehicle.groupBy.mockResolvedValue([]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);
      mockPrismaService.fuelLog.aggregate.mockResolvedValue({ _sum: { totalCost: null } });
      mockPrismaService.maintenanceLog.aggregate.mockResolvedValue({ _sum: { totalCost: null } });

      const result = await service.getFleetSummary(userId);

      expect(result.monthlyFuelCost).toBe(0);
      expect(result.monthlyMaintenanceCost).toBe(0);
    });
  });

  describe('getLiveRouteProgress', () => {
    const userId = 'user-001';

    it('should return live route progress', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-001',
          routeName: 'Route A',
          status: RouteStatus.IN_PROGRESS,
          vehicle: { id: 'v1', licensePlate: 'B 123 ABC', currentLat: 44.4, currentLng: 26.1 },
          driver: { id: 'd1', firstName: 'Ion', lastName: 'Popescu' },
          stops: [
            { status: DeliveryStopStatus.DELIVERED },
            { status: DeliveryStopStatus.PENDING },
            { status: DeliveryStopStatus.PENDING },
          ],
        },
      ]);

      const result = await service.getLiveRouteProgress(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        routeId: 'route-001',
        routeName: 'Route A',
        driverName: 'Ion Popescu',
        vehiclePlate: 'B 123 ABC',
        totalStops: 3,
        completedStops: 1,
        pendingStops: 2,
        failedStops: 0,
        currentLat: 44.4,
        currentLng: 26.1,
      });
    });

    it('should generate route name from ID when not provided', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'abc123xyz789',
          routeName: null,
          status: RouteStatus.PLANNED,
          vehicle: { id: 'v1', licensePlate: 'B 123 ABC', currentLat: null, currentLng: null },
          driver: null,
          stops: [],
        },
      ]);

      const result = await service.getLiveRouteProgress(userId);

      expect(result[0].routeName).toBe('Route xyz789');
    });

    it('should show Unassigned for routes without driver', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-001',
          routeName: 'Test',
          status: RouteStatus.PLANNED,
          vehicle: { id: 'v1', licensePlate: 'B 123', currentLat: null, currentLng: null },
          driver: null,
          stops: [],
        },
      ]);

      const result = await service.getLiveRouteProgress(userId);

      expect(result[0].driverName).toBe('Unassigned');
    });

    it('should handle null GPS coordinates', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        {
          id: 'route-001',
          routeName: 'Test',
          status: RouteStatus.IN_PROGRESS,
          vehicle: { id: 'v1', licensePlate: 'B 123', currentLat: null, currentLng: null },
          driver: { id: 'd1', firstName: 'Ion', lastName: 'Popescu' },
          stops: [],
        },
      ]);

      const result = await service.getLiveRouteProgress(userId);

      expect(result[0].currentLat).toBeUndefined();
      expect(result[0].currentLng).toBeUndefined();
    });
  });
});
