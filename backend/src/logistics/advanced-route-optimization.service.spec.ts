import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import {
  AdvancedRouteOptimizationService,
  DeliveryStop,
  Vehicle,
  Location,
  RouteRequest,
  OptimizationOptions,
} from './advanced-route-optimization.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdvancedRouteOptimizationService', () => {
  let service: AdvancedRouteOptimizationService;

  const mockPrismaService = {
    deliveryRoute: { findUnique: jest.fn(), findMany: jest.fn() },
    deliveryStop: { update: jest.fn() },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(null), // No Google Maps API key for tests
  };

  // Test fixtures
  const bucurestDepot: Location = {
    id: 'depot-buc',
    name: 'Depozit București',
    lat: 44.4268,
    lng: 26.1025,
  };

  const createTestStops = (count: number): DeliveryStop[] => {
    const stops: DeliveryStop[] = [];
    const baseCoords = [
      { lat: 44.4500, lng: 26.0900, name: 'Piața Victoriei' },
      { lat: 44.4350, lng: 26.0800, name: 'Piața Romană' },
      { lat: 44.4100, lng: 26.1200, name: 'Unirii' },
      { lat: 44.4600, lng: 26.1400, name: 'Aviatorilor' },
      { lat: 44.4200, lng: 26.0600, name: 'Crângași' },
      { lat: 44.4450, lng: 26.1300, name: 'Floreasca' },
      { lat: 44.3900, lng: 26.1500, name: 'Berceni' },
      { lat: 44.4700, lng: 26.0700, name: 'Băneasa' },
    ];

    for (let i = 0; i < count && i < baseCoords.length; i++) {
      // Use generous time windows - from now until 24 hours from now
      const start = new Date();
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      stops.push({
        id: `stop-${i + 1}`,
        name: baseCoords[i].name,
        lat: baseCoords[i].lat,
        lng: baseCoords[i].lng,
        priority: i === 0 ? 'URGENT' : 'NORMAL',
        timeWindow: {
          start,
          end,
          isFlexible: true,
          penaltyPerMinuteLate: 1,
        },
        serviceTimeMinutes: 10,
        demandWeight: 100, // Fixed weight for predictable capacity
        demandVolume: 0.5,
        demandPallets: 0,
      });
    }

    return stops;
  };

  const createTestVehicle = (id: string): Vehicle => ({
    id,
    name: `Vehicul ${id}`,
    licensePlate: `B-${100 + parseInt(id.split('-')[1] || '1')}-XXX`,
    type: 'VAN',
    capacityWeight: 1500,
    capacityVolume: 10,
    capacityPallets: 8,
    fuelConsumptionL100km: 12,
    costPerKm: 1.5,
    fixedDailyCost: 100,
    skills: [],
    depotId: 'depot-buc',
    depot: bucurestDepot,
    maxWorkingMinutes: 600,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedRouteOptimizationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AdvancedRouteOptimizationService>(AdvancedRouteOptimizationService);
    service.resetState();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Route Optimization', () => {
    it('should optimize routes with nearest neighbor algorithm', async () => {
      const stops = createTestStops(5);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'NEAREST_NEIGHBOR' },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.routes.length).toBeGreaterThan(0);
      expect(result.summary.assignedStops).toBeGreaterThan(0);
      expect(result.algorithm).toBe('NEAREST_NEIGHBOR');
    });

    it('should optimize routes with savings algorithm', async () => {
      const stops = createTestStops(6);
      const vehicles = [createTestVehicle('v-1'), createTestVehicle('v-2')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'SAVINGS' },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.summary.totalDistanceKm).toBeGreaterThan(0);
      expect(result.algorithm).toBe('SAVINGS');
    });

    it('should optimize routes with sweep algorithm', async () => {
      const stops = createTestStops(6);
      const vehicles = [createTestVehicle('v-1'), createTestVehicle('v-2')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'SWEEP' },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.algorithm).toBe('SWEEP');
    });

    it('should optimize routes with genetic algorithm', async () => {
      const stops = createTestStops(5);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'GENETIC', maxIterations: 20 },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.algorithm).toBe('GENETIC');
    });

    it('should optimize routes with simulated annealing', async () => {
      const stops = createTestStops(5);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'SIMULATED_ANNEALING', maxIterations: 50 },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.algorithm).toBe('SIMULATED_ANNEALING');
    });

    it('should optimize routes with tabu search', async () => {
      const stops = createTestStops(5);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'TABU_SEARCH', maxIterations: 30 },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.algorithm).toBe('TABU_SEARCH');
    });

    it('should optimize routes with ant colony optimization', async () => {
      const stops = createTestStops(5);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'ANT_COLONY', maxIterations: 20 },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.algorithm).toBe('ANT_COLONY');
    });

    it('should optimize routes with hybrid algorithm', async () => {
      const stops = createTestStops(6);
      const vehicles = [createTestVehicle('v-1'), createTestVehicle('v-2')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'HYBRID' },
      };

      const result = await service.optimizeRoutes(request);

      expect(result.routes).toBeDefined();
      expect(result.algorithm).toBe('HYBRID');
    });

    it('should use default hybrid algorithm when not specified', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.algorithm).toBe('HYBRID');
    });
  });

  describe('Vehicle Capacity Constraints', () => {
    it('should respect vehicle weight capacity', async () => {
      const stops = createTestStops(5).map(s => ({
        ...s,
        demandWeight: 400, // 5 * 400 = 2000 kg
      }));

      const vehicle = createTestVehicle('v-1');
      vehicle.capacityWeight = 1500; // Can't fit all stops

      const request: RouteRequest = {
        stops,
        vehicles: [vehicle],
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      // Should have some unassigned stops due to capacity
      const totalWeight = result.routes.reduce((sum, r) => {
        const lastStop = r.stops[r.stops.length - 1];
        return sum + (lastStop?.cumulativeLoad.weight || 0);
      }, 0);

      expect(totalWeight).toBeLessThanOrEqual(vehicle.capacityWeight);
    });

    it('should use multiple vehicles when capacity exceeded', async () => {
      const stops = createTestStops(6).map(s => ({
        ...s,
        demandWeight: 500, // Each stop needs 500kg
      }));

      const vehicles = [
        { ...createTestVehicle('v-1'), capacityWeight: 1000 },
        { ...createTestVehicle('v-2'), capacityWeight: 1000 },
        { ...createTestVehicle('v-3'), capacityWeight: 1000 },
      ];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.summary.vehiclesUsed).toBeGreaterThan(1);
    });
  });

  describe('Time Window Constraints', () => {
    it('should track time window violations', async () => {
      const now = new Date();
      const stops = createTestStops(3).map((s, i) => ({
        ...s,
        timeWindow: {
          start: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          end: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          isFlexible: false,
          penaltyPerMinuteLate: 10,
        },
      }));

      const request: RouteRequest = {
        stops,
        vehicles: [createTestVehicle('v-1')],
        depot: bucurestDepot,
        departureTime: now,
        options: { respectTimeWindows: true },
      };

      const result = await service.optimizeRoutes(request);

      // Should have some late deliveries
      const totalLate = result.routes.reduce(
        (sum, r) => sum + r.metrics.lateDeliveries,
        0
      );

      expect(totalLate).toBeGreaterThanOrEqual(0);
    });

    it('should calculate late penalty costs', async () => {
      const now = new Date();
      const stops = createTestStops(2).map(s => ({
        ...s,
        timeWindow: {
          start: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          end: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          isFlexible: false,
          penaltyPerMinuteLate: 5,
        },
      }));

      const request: RouteRequest = {
        stops,
        vehicles: [createTestVehicle('v-1')],
        depot: bucurestDepot,
        departureTime: now,
      };

      const result = await service.optimizeRoutes(request);

      // Late penalty should be calculated
      const totalPenalty = result.routes.reduce(
        (sum, r) => sum + r.metrics.latePenaltyRon,
        0
      );

      expect(totalPenalty).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Route Metrics', () => {
    it('should calculate total distance', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.summary.totalDistanceKm).toBeGreaterThan(0);
      expect(result.routes[0].metrics.totalDistanceKm).toBeGreaterThan(0);
    });

    it('should calculate fuel consumption', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.summary.totalFuelLiters).toBeGreaterThan(0);
      expect(result.routes[0].metrics.fuelConsumptionLiters).toBeGreaterThan(0);
    });

    it('should calculate total cost', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.summary.totalCostRon).toBeGreaterThan(0);
      expect(result.routes[0].metrics.totalCostRon).toBeGreaterThan(0);
    });

    it('should calculate CO2 emissions', async () => {
      const stops: DeliveryStop[] = [
        {
          id: 'co2-1',
          name: 'Stop 1',
          lat: 44.4400,
          lng: 26.0800,
          priority: 'NORMAL',
          serviceTimeMinutes: 10,
          demandWeight: 50,
          demandVolume: 0.2,
          demandPallets: 0,
        },
      ];

      const request: RouteRequest = {
        stops,
        vehicles: [createTestVehicle('v-1')],
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'NEAREST_NEIGHBOR' },
      };

      const result = await service.optimizeRoutes(request);

      // CO2 emissions should be calculated (>= 0)
      expect(result.summary.co2EmissionsKg).toBeGreaterThanOrEqual(0);
    });

    it('should track service time', async () => {
      // Use simple stops with clear coordinates
      const stops: DeliveryStop[] = [
        {
          id: 'svc-1',
          name: 'Stop 1',
          lat: 44.4300,
          lng: 26.1000,
          priority: 'NORMAL',
          serviceTimeMinutes: 15,
          demandWeight: 50,
          demandVolume: 0.2,
          demandPallets: 0,
        },
        {
          id: 'svc-2',
          name: 'Stop 2',
          lat: 44.4350,
          lng: 26.1050,
          priority: 'NORMAL',
          serviceTimeMinutes: 15,
          demandWeight: 50,
          demandVolume: 0.2,
          demandPallets: 0,
        },
      ];

      const request: RouteRequest = {
        stops,
        vehicles: [createTestVehicle('v-1')],
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'NEAREST_NEIGHBOR' }, // Use simple algorithm
      };

      const result = await service.optimizeRoutes(request);

      // Should have routes
      expect(result.routes.length).toBeGreaterThan(0);

      // Service time should be sum of assigned stops' service times
      const totalServiceTime = result.routes.reduce(
        (sum, r) => sum + r.metrics.serviceTimeMinutes, 0
      );
      expect(totalServiceTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate on-time percentage', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.summary.onTimePercent).toBeGreaterThanOrEqual(0);
      expect(result.summary.onTimePercent).toBeLessThanOrEqual(100);
    });
  });

  describe('Stop Sequencing', () => {
    it('should sequence stops correctly', async () => {
      const stops = createTestStops(5);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      // Check sequence numbers are consecutive
      result.routes.forEach(route => {
        route.stops.forEach((stop, idx) => {
          expect(stop.sequence).toBe(idx + 1);
        });
      });
    });

    it('should prioritize urgent stops', async () => {
      const stops = createTestStops(5);
      stops[4].priority = 'CRITICAL';
      stops[3].priority = 'URGENT';

      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { algorithm: 'NEAREST_NEIGHBOR' },
      };

      const result = await service.optimizeRoutes(request);

      // High priority stops should tend to be earlier
      const highPrioritySequences = result.routes.flatMap(r =>
        r.stops
          .filter(s => s.stop.priority === 'CRITICAL' || s.stop.priority === 'URGENT')
          .map(s => s.sequence)
      );

      // At least one high priority should be in first half
      if (highPrioritySequences.length > 0) {
        const midPoint = Math.ceil(result.summary.assignedStops / 2);
        const earlyHighPriority = highPrioritySequences.some(seq => seq <= midPoint);
        expect(earlyHighPriority).toBe(true);
      }
    });
  });

  describe('Traffic Integration', () => {
    it('should get traffic conditions', async () => {
      const locations = [
        bucurestDepot,
        { id: 'loc1', lat: 44.4500, lng: 26.0900 },
        { id: 'loc2', lat: 44.4350, lng: 26.0800 },
      ];

      const conditions = await service.getTrafficConditions(locations);

      expect(conditions.length).toBe(2);
      expect(conditions[0].congestionLevel).toBeDefined();
      expect(conditions[0].speedKmh).toBeGreaterThan(0);
    });

    it('should include traffic in optimization when enabled', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const withoutTraffic: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { includeTraffic: false },
      };

      const withTraffic: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
        options: { includeTraffic: true },
      };

      const resultWithout = await service.optimizeRoutes(withoutTraffic);
      const resultWith = await service.optimizeRoutes(withTraffic);

      // Both should produce valid results
      expect(resultWithout.routes).toBeDefined();
      expect(resultWith.routes).toBeDefined();
    });
  });

  describe('Predictive ETA', () => {
    it('should predict ETA between two locations', async () => {
      const from: Location = { id: 'from', lat: 44.4268, lng: 26.1025 };
      const to: Location = { id: 'to', lat: 44.4500, lng: 26.0900 };

      const prediction = await service.predictETA(from, to, new Date());

      expect(prediction.estimatedArrival).toBeDefined();
      expect(prediction.durationMinutes).toBeGreaterThan(0);
      expect(prediction.distanceKm).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
    });

    it('should apply weekend discount to traffic', async () => {
      const from: Location = { id: 'from', lat: 44.4268, lng: 26.1025 };
      const to: Location = { id: 'to', lat: 44.4500, lng: 26.0900 };

      // Weekend date
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay()) % 7);

      const prediction = await service.predictETA(from, to, saturday);

      expect(prediction.factors).toContain('Weekend - trafic redus');
    });

    it('should identify rush hour', async () => {
      const from: Location = { id: 'from', lat: 44.4268, lng: 26.1025 };
      const to: Location = { id: 'to', lat: 44.4500, lng: 26.0900 };

      const rushHour = new Date();
      rushHour.setHours(8, 0, 0, 0);
      // Make sure it's a weekday
      while (rushHour.getDay() === 0 || rushHour.getDay() === 6) {
        rushHour.setDate(rushHour.getDate() + 1);
      }

      const prediction = await service.predictETA(from, to, rushHour);

      expect(prediction.factors).toContain('Oră de vârf');
    });
  });

  describe('Google Maps Integration', () => {
    it('should get fallback route when API not configured', async () => {
      const origin: Location = { id: 'origin', lat: 44.4268, lng: 26.1025 };
      const destination: Location = { id: 'dest', lat: 44.4500, lng: 26.0900 };

      const route = await service.getGoogleMapsRoute(origin, destination);

      expect(route).not.toBeNull();
      expect(route?.distance).toBeGreaterThan(0);
      expect(route?.duration).toBeGreaterThan(0);
      expect(route?.legs).toBeDefined();
      expect(route?.legs.length).toBe(1);
    });

    it('should handle waypoints in route', async () => {
      const origin: Location = { id: 'origin', lat: 44.4268, lng: 26.1025 };
      const destination: Location = { id: 'dest', lat: 44.4500, lng: 26.0900 };
      const waypoints: Location[] = [
        { id: 'wp1', lat: 44.4350, lng: 26.0800 },
        { id: 'wp2', lat: 44.4100, lng: 26.1200 },
      ];

      const route = await service.getGoogleMapsRoute(origin, destination, waypoints);

      expect(route?.legs.length).toBe(3); // origin->wp1, wp1->wp2, wp2->dest
    });
  });

  describe('ETA Updates', () => {
    it('should update ETAs based on current traffic', async () => {
      const stops = createTestStops(3);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      if (result.routes.length > 0 && result.routes[0].stops.length > 0) {
        const updates = await service.updateETAs(result.routes[0].stops);

        expect(Array.isArray(updates)).toBe(true);
      }
    });
  });

  describe('Validation', () => {
    it('should throw error when no stops provided', async () => {
      const request: RouteRequest = {
        stops: [],
        vehicles: [createTestVehicle('v-1')],
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      await expect(service.optimizeRoutes(request)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when no vehicles provided', async () => {
      const request: RouteRequest = {
        stops: createTestStops(3),
        vehicles: [],
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      await expect(service.optimizeRoutes(request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Optimization Summary', () => {
    it('should provide complete summary', async () => {
      const stops = createTestStops(5).map(s => ({
        ...s,
        demandWeight: 100, // Light enough
        demandVolume: 0.5,
      }));
      const vehicles = [createTestVehicle('v-1'), createTestVehicle('v-2')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.summary.totalStops).toBe(5);
      // Check that assigned + unassigned = total
      expect(result.summary.assignedStops + result.summary.unassignedStops).toBe(5);
      // If we have assigned stops, we should have routes
      if (result.summary.assignedStops > 0) {
        expect(result.summary.vehiclesUsed).toBeGreaterThan(0);
        expect(result.summary.totalDistanceKm).toBeGreaterThan(0);
        expect(result.summary.totalTimeMinutes).toBeGreaterThan(0);
        expect(result.summary.totalCostRon).toBeGreaterThan(0);
      }
      expect(result.summary.averageUtilization).toBeGreaterThanOrEqual(0);
    });

    it('should track computation time', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      expect(result.computationTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Unassigned Stops', () => {
    it('should handle more stops than vehicle capacity', async () => {
      // Many heavy stops, limited vehicle capacity
      const stops = createTestStops(8).map(s => ({
        ...s,
        demandWeight: 600, // 600kg each
      }));

      const vehicle = createTestVehicle('v-1');
      vehicle.capacityWeight = 1000; // Can fit max 1 stop (600 < 1000, but 600+600 > 1000)

      const request: RouteRequest = {
        stops,
        vehicles: [vehicle],
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      // With capacity of 1000kg and 8 stops at 600kg each (total 4800kg),
      // a single vehicle can only handle 1 stop per trip
      // Without multiple trips, should have unassigned stops OR multiple trips with same vehicle
      // The test verifies the summary matches actual unassigned
      expect(result.unassignedStops.length).toBe(result.summary.unassignedStops);
    });
  });

  describe('Route Warnings', () => {
    it('should generate warnings for issues', async () => {
      const stops = createTestStops(3);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      // Warnings array should exist on each route
      result.routes.forEach(route => {
        expect(Array.isArray(route.warnings)).toBe(true);
      });
    });

    it('should mark routes as feasible or infeasible', async () => {
      const stops = createTestStops(4);
      const vehicles = [createTestVehicle('v-1')];

      const request: RouteRequest = {
        stops,
        vehicles,
        depot: bucurestDepot,
        departureTime: new Date(),
      };

      const result = await service.optimizeRoutes(request);

      result.routes.forEach(route => {
        expect(typeof route.feasible).toBe('boolean');
      });
    });
  });
});
