import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RouteSimulationService, SimulationStop } from './route-simulation.service';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus } from '@prisma/client';

describe('RouteSimulationService', () => {
  let service: RouteSimulationService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockVehicleId = 'vehicle-123';

  const mockVehicle = {
    id: mockVehicleId,
    userId: mockUserId,
    licensePlate: 'M-FL 1234',
    status: VehicleStatus.AVAILABLE,
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2023,
  };

  const mockStops: SimulationStop[] = [
    {
      address: 'Leopoldstraße 10',
      city: 'München',
      postalCode: '80802',
      parcelCount: 3,
      weight: 15,
    },
    {
      address: 'Sendlinger Straße 45',
      city: 'München',
      postalCode: '80331',
      parcelCount: 2,
      weight: 8,
      timeWindow: { start: '09:00', end: '12:00' },
    },
    {
      address: 'Maximilianstraße 25',
      city: 'München',
      postalCode: '80539',
      parcelCount: 5,
      weight: 22,
    },
  ];

  const mockPrismaService = {
    vehicle: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteSimulationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RouteSimulationService>(RouteSimulationService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('simulateRoute', () => {
    it('should simulate a route successfully', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.simulateRoute(mockUserId, {
        name: 'Test Route',
        vehicleId: mockVehicleId,
        stops: mockStops,
        startTime: '08:00',
      });

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^sim-/);
      expect(result.name).toBe('Test Route');
      expect(result.vehicleId).toBe(mockVehicleId);
      expect(result.vehiclePlate).toBe('M-FL 1234');
      expect(result.stops).toHaveLength(3);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalStops).toBe(3);
      expect(result.constraints).toBeDefined();
    });

    it('should throw error if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.simulateRoute(mockUserId, {
          vehicleId: 'invalid-id',
          stops: mockStops,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default start time if not provided', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
      });

      expect(result.stops[0].arrivalTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should calculate metrics correctly', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
        startTime: '08:00',
      });

      expect(result.metrics.totalDistance).toBeGreaterThan(0);
      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.estimatedFuelUsage).toBeGreaterThan(0);
      expect(result.metrics.estimatedFuelCost).toBeGreaterThan(0);
      expect(result.metrics.estimatedTotalCost).toBeGreaterThan(0);
    });

    it('should check time window constraints', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
        startTime: '08:00',
      });

      // The second stop has a time window
      const secondStop = result.stops[1];
      expect(secondStop).toBeDefined();
    });

    it('should detect vehicle unavailability', async () => {
      const maintenanceVehicle = {
        ...mockVehicle,
        status: VehicleStatus.MAINTENANCE,
      };
      mockPrismaService.vehicle.findFirst.mockResolvedValue(maintenanceVehicle);

      const result = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
      });

      const vehicleConstraint = result.constraints.find(
        c => c.type === 'VEHICLE_UNAVAILABLE',
      );
      expect(vehicleConstraint).toBeDefined();
      expect(vehicleConstraint?.severity).toBe('ERROR');
      expect(result.isValid).toBe(false);
    });
  });

  describe('getSimulation', () => {
    it('should retrieve a stored simulation', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const created = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
      });

      const result = await service.getSimulation(created.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
    });

    it('should return null for non-existent simulation', async () => {
      const result = await service.getSimulation('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('compareRoutes', () => {
    it('should compare multiple route simulations', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.compareRoutes(mockUserId, [
        { vehicleId: mockVehicleId, stops: mockStops, startTime: '08:00' },
        { vehicleId: mockVehicleId, stops: mockStops.slice(0, 2), startTime: '09:00' },
      ]);

      expect(result.routes).toHaveLength(2);
      expect(result.comparison).toBeDefined();
      expect(result.comparison.bestTime).toBeDefined();
      expect(result.comparison.bestDistance).toBeDefined();
      expect(result.comparison.bestCost).toBeDefined();
      expect(result.comparison.recommendation).toBeDefined();
    });

    it('should handle no valid routes', async () => {
      const maintenanceVehicle = {
        ...mockVehicle,
        status: VehicleStatus.OUT_OF_SERVICE,
      };
      mockPrismaService.vehicle.findFirst.mockResolvedValue(maintenanceVehicle);

      const result = await service.compareRoutes(mockUserId, [
        { vehicleId: mockVehicleId, stops: mockStops },
      ]);

      expect(result.comparison.bestTime).toBe('N/A');
      expect(result.comparison.recommendation).toContain('Keine gültigen Routen');
    });
  });

  describe('createScenario', () => {
    it('should create a what-if scenario', async () => {
      const result = await service.createScenario(mockUserId, {
        name: 'Rush Hour Scenario',
        description: 'What if we start later?',
        modifications: [
          {
            type: 'CHANGE_START_TIME',
            data: { newTime: '10:00' },
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^scenario-/);
      expect(result.name).toBe('Rush Hour Scenario');
      expect(result.description).toBe('What if we start later?');
      expect(result.modifications).toHaveLength(1);
    });

    it('should apply modifications to base simulation', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      // First create a base simulation
      const baseSim = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
      });

      // Create scenario with modifications
      const result = await service.createScenario(mockUserId, {
        name: 'Remove Stop Scenario',
        baseSimulationId: baseSim.id,
        modifications: [
          {
            type: 'REMOVE_STOP',
            data: { stopIndex: 1 },
          },
        ],
      });

      expect(result.baseRouteId).toBe(baseSim.id);
      expect(result.result).toBeDefined();
      expect(result.result?.stops.length).toBe(2); // One stop removed
    });
  });

  describe('getScenarios', () => {
    it('should return user scenarios', async () => {
      // Create some scenarios
      await service.createScenario(mockUserId, {
        name: 'Scenario 1',
        modifications: [],
      });
      await service.createScenario(mockUserId, {
        name: 'Scenario 2',
        modifications: [],
      });

      const result = await service.getScenarios(mockUserId);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for new user', async () => {
      const result = await service.getScenarios('new-user-id');
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableVehicles', () => {
    it('should return available vehicles for planning', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        mockVehicle,
        { ...mockVehicle, id: 'vehicle-456', licensePlate: 'M-FL 5678' },
      ]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        { vehicleId: 'vehicle-456' }, // This vehicle is assigned
      ]);

      const result = await service.getAvailableVehicles(
        mockUserId,
        new Date('2025-12-09'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].available).toBe(true);
      expect(result[1].available).toBe(false);
    });

    it('should include vehicle specifications', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      const result = await service.getAvailableVehicles(
        mockUserId,
        new Date('2025-12-09'),
      );

      expect(result[0]).toHaveProperty('capacity');
      expect(result[0]).toHaveProperty('maxWeight');
      expect(result[0]).toHaveProperty('fuelEfficiency');
      expect(result[0]).toHaveProperty('costPerKm');
    });
  });

  describe('createRoutePlan', () => {
    it('should create a route plan for future date', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.createRoutePlan(mockUserId, {
        name: 'Monday Plan',
        planDate: new Date('2025-12-09'),
        routes: [
          {
            vehicleId: mockVehicleId,
            stops: mockStops,
            startTime: '08:00',
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^plan-/);
      expect(result.name).toBe('Monday Plan');
      expect(result.status).toBe('DRAFT');
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].simulation).toBeDefined();
      expect(result.totalMetrics).toBeDefined();
    });

    it('should aggregate metrics for multiple routes', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.createRoutePlan(mockUserId, {
        name: 'Multi-Route Plan',
        planDate: new Date('2025-12-09'),
        routes: [
          { vehicleId: mockVehicleId, stops: mockStops, startTime: '08:00' },
          { vehicleId: mockVehicleId, stops: mockStops.slice(0, 2), startTime: '10:00' },
        ],
      });

      expect(result.routes).toHaveLength(2);
      expect(result.totalMetrics.totalStops).toBe(5); // 3 + 2
      expect(result.totalMetrics.totalDistance).toBeGreaterThan(0);
    });
  });

  describe('getRoutePlans', () => {
    it('should filter plans by status', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await service.createRoutePlan(mockUserId, {
        name: 'Draft Plan',
        planDate: new Date('2025-12-09'),
        routes: [{ vehicleId: mockVehicleId, stops: mockStops, startTime: '08:00' }],
      });

      const result = await service.getRoutePlans(mockUserId, { status: 'DRAFT' });
      expect(result.every(p => p.status === 'DRAFT')).toBe(true);
    });

    it('should filter plans by date range', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await service.createRoutePlan(mockUserId, {
        name: 'Plan for Dec 10',
        planDate: new Date('2025-12-10'),
        routes: [{ vehicleId: mockVehicleId, stops: mockStops, startTime: '08:00' }],
      });

      const result = await service.getRoutePlans(mockUserId, {
        fromDate: new Date('2025-12-09'),
        toDate: new Date('2025-12-11'),
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updatePlanStatus', () => {
    it('should update plan status', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const plan = await service.createRoutePlan(mockUserId, {
        name: 'Test Plan',
        planDate: new Date('2025-12-09'),
        routes: [{ vehicleId: mockVehicleId, stops: mockStops, startTime: '08:00' }],
      });

      const result = await service.updatePlanStatus(mockUserId, plan.id, 'APPROVED');

      expect(result).toBeDefined();
      expect(result?.status).toBe('APPROVED');
    });

    it('should return null for non-existent plan', async () => {
      const result = await service.updatePlanStatus(mockUserId, 'non-existent', 'APPROVED');
      expect(result).toBeNull();
    });
  });

  describe('getPlanningDashboard', () => {
    it('should return planning dashboard summary', async () => {
      const result = await service.getPlanningDashboard(mockUserId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('upcomingPlans');
      expect(result).toHaveProperty('totalPlannedRoutes');
      expect(result).toHaveProperty('totalPlannedStops');
      expect(result).toHaveProperty('estimatedCosts');
      expect(result).toHaveProperty('vehicleUtilization');
      expect(Array.isArray(result.upcomingPlans)).toBe(true);
      expect(Array.isArray(result.vehicleUtilization)).toBe(true);
    });
  });

  describe('constraint checking', () => {
    it('should detect driver hours violation', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      // Create many stops to exceed driver hours
      const manyStops: SimulationStop[] = [];
      for (let i = 0; i < 100; i++) {
        manyStops.push({
          address: `Address ${i}`,
          city: 'München',
          postalCode: `80${String(i).padStart(3, '0')}`,
          estimatedServiceTime: 10,
        });
      }

      const result = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: manyStops,
        startTime: '06:00',
      });

      const driverHoursConstraint = result.constraints.find(
        c => c.type === 'DRIVER_HOURS',
      );
      expect(driverHoursConstraint).toBeDefined();
    });

    it('should detect capacity violation', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const overCapacityStops: SimulationStop[] = Array(50).fill(null).map((_, i) => ({
        address: `Address ${i}`,
        city: 'München',
        postalCode: '80331',
        parcelCount: 10, // Total: 500 parcels
      }));

      const result = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: overCapacityStops,
      });

      const capacityConstraint = result.constraints.find(
        c => c.type === 'CAPACITY',
      );
      expect(capacityConstraint).toBeDefined();
      expect(capacityConstraint?.severity).toBe('ERROR');
    });

    it('should detect weight violation', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const overWeightStops: SimulationStop[] = Array(10).fill(null).map((_, i) => ({
        address: `Address ${i}`,
        city: 'München',
        postalCode: '80331',
        weight: 200, // Total: 2000kg > 1500kg max
      }));

      const result = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: overWeightStops,
      });

      const weightConstraint = result.constraints.find(
        c => c.type === 'WEIGHT',
      );
      expect(weightConstraint).toBeDefined();
      expect(weightConstraint?.severity).toBe('ERROR');
    });
  });

  describe('time calculations', () => {
    it('should use rush hour speeds appropriately', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);

      // Rush hour simulation (8:00)
      const rushHourResult = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
        startTime: '08:00',
      });

      // Off-peak simulation (22:00)
      const offPeakResult = await service.simulateRoute(mockUserId, {
        vehicleId: mockVehicleId,
        stops: mockStops,
        startTime: '22:00',
      });

      // Rush hour should take longer
      expect(rushHourResult.metrics.totalTime).toBeGreaterThan(
        offPeakResult.metrics.totalTime,
      );
    });
  });
});
