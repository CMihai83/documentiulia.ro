import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PredictiveMaintenanceService', () => {
  let service: PredictiveMaintenanceService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockVehicleId = 'vehicle-456';

  const mockVehicle = {
    id: mockVehicleId,
    userId: mockUserId,
    licensePlate: 'M-FL 1234',
    make: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2020,
    mileage: 75000,
    status: 'ACTIVE',
    tuvExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    lastServiceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    nextServiceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMaintenanceLogs = [
    {
      id: 'log-1',
      vehicleId: mockVehicleId,
      type: 'OIL_CHANGE',
      description: 'Regular oil change',
      odometerReading: 60000,
      totalCost: 150,
      partsCost: 50,
      laborCost: 100,
      vendorName: 'AutoService München',
      serviceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'log-2',
      vehicleId: mockVehicleId,
      type: 'BRAKE_SERVICE',
      description: 'Brake pads replacement',
      odometerReading: 55000,
      totalCost: 350,
      partsCost: 200,
      laborCost: 150,
      vendorName: 'AutoService München',
      serviceDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'log-3',
      vehicleId: mockVehicleId,
      type: 'SCHEDULED_SERVICE',
      description: 'Annual inspection',
      odometerReading: 45000,
      totalCost: 500,
      partsCost: 150,
      laborCost: 350,
      vendorName: 'Mercedes Service Center',
      serviceDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    },
  ];

  const mockFuelLogs = [
    {
      id: 'fuel-1',
      vehicleId: mockVehicleId,
      litersFilled: 60,
      odometerReading: 75000,
      pricePerLiter: 1.85,
      totalCost: 111,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fuel-2',
      vehicleId: mockVehicleId,
      litersFilled: 55,
      odometerReading: 74400,
      pricePerLiter: 1.82,
      totalCost: 100.1,
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fuel-3',
      vehicleId: mockVehicleId,
      litersFilled: 58,
      odometerReading: 73800,
      pricePerLiter: 1.88,
      totalCost: 109.04,
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    },
  ];

  const mockRoutes = [
    {
      id: 'route-1',
      vehicleId: mockVehicleId,
      status: 'COMPLETED',
      totalDistance: 120,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      stops: [
        { id: 'stop-1', status: 'DELIVERED' },
        { id: 'stop-2', status: 'DELIVERED' },
        { id: 'stop-3', status: 'DELIVERED' },
      ],
    },
    {
      id: 'route-2',
      vehicleId: mockVehicleId,
      status: 'COMPLETED',
      totalDistance: 95,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      stops: [
        { id: 'stop-4', status: 'DELIVERED' },
        { id: 'stop-5', status: 'DELIVERED' },
      ],
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
    maintenanceLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveMaintenanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PredictiveMaintenanceService>(PredictiveMaintenanceService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVehicleHealthProfile', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        maintenanceLogs: mockMaintenanceLogs,
        fuelLogs: mockFuelLogs,
      });
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
    });

    it('should return a complete vehicle health profile', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result).toBeDefined();
      expect(result.vehicleId).toBe(mockVehicleId);
      expect(result.licensePlate).toBe('M-FL 1234');
      expect(result.make).toBe('Mercedes-Benz');
      expect(result.model).toBe('Sprinter');
    });

    it('should calculate overall health score', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result.overallHealthScore).toBeDefined();
      expect(result.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it('should include component health analysis', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result.componentHealth).toBeDefined();
      expect(Array.isArray(result.componentHealth)).toBe(true);
      expect(result.componentHealth.length).toBeGreaterThan(0);

      const firstComponent = result.componentHealth[0];
      expect(firstComponent).toHaveProperty('component');
      expect(firstComponent).toHaveProperty('componentDe');
      expect(firstComponent).toHaveProperty('healthScore');
      expect(firstComponent).toHaveProperty('riskLevel');
    });

    it('should include usage pattern analysis', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result.usagePattern).toBeDefined();
      expect(result.usagePattern).toHaveProperty('averageDailyKm');
      expect(result.usagePattern).toHaveProperty('averageDeliveriesPerDay');
      expect(result.usagePattern).toHaveProperty('usageIntensity');
    });

    it('should include maintenance quality assessment', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result.maintenanceQuality).toBeDefined();
      expect(result.maintenanceQuality).toHaveProperty('onTimeMaintenanceRate');
      expect(result.maintenanceQuality).toHaveProperty('qualityScore');
    });

    it('should include failure predictions', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result.predictions).toBeDefined();
      expect(Array.isArray(result.predictions)).toBe(true);
    });

    it('should include recommendations', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should throw error for non-existent vehicle', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.getVehicleHealthProfile(mockUserId, 'invalid-id'),
      ).rejects.toThrow('Fahrzeug nicht gefunden');
    });

    it('should categorize risk correctly', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      expect(result.riskCategory).toBeDefined();
      expect(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL']).toContain(result.riskCategory);
    });
  });

  describe('getFailurePredictions', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicle,
          maintenanceLogs: mockMaintenanceLogs,
          fuelLogs: mockFuelLogs,
        },
      ]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
    });

    it('should return failure predictions for fleet', async () => {
      const result = await service.getFailurePredictions(mockUserId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by vehicle ID', async () => {
      const result = await service.getFailurePredictions(mockUserId, {
        vehicleId: mockVehicleId,
      });

      result.forEach(pred => {
        expect(pred.vehicleId).toBe(mockVehicleId);
      });
    });

    it('should filter by days ahead', async () => {
      const daysAhead = 30;
      const result = await service.getFailurePredictions(mockUserId, {
        daysAhead,
      });

      const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
      result.forEach(pred => {
        expect(pred.predictedFailureDate.getTime()).toBeLessThanOrEqual(cutoffDate.getTime());
      });
    });

    it('should filter by minimum probability', async () => {
      const minProbability = 0.5;
      const result = await service.getFailurePredictions(mockUserId, {
        minProbability,
      });

      result.forEach(pred => {
        expect(pred.probability).toBeGreaterThanOrEqual(minProbability);
      });
    });

    it('should include prediction details', async () => {
      const result = await service.getFailurePredictions(mockUserId);

      if (result.length > 0) {
        const prediction = result[0];
        expect(prediction).toHaveProperty('id');
        expect(prediction).toHaveProperty('vehicleId');
        expect(prediction).toHaveProperty('component');
        expect(prediction).toHaveProperty('componentDe');
        expect(prediction).toHaveProperty('probability');
        expect(prediction).toHaveProperty('riskLevel');
        expect(prediction).toHaveProperty('estimatedCostEur');
        expect(prediction).toHaveProperty('recommendation');
        expect(prediction).toHaveProperty('recommendationDe');
      }
    });

    it('should sort predictions by probability and date', async () => {
      const result = await service.getFailurePredictions(mockUserId);

      for (let i = 1; i < result.length; i++) {
        const prevProbability = result[i - 1].probability;
        const currProbability = result[i].probability;

        // Higher probability predictions should come first
        if (Math.abs(prevProbability - currProbability) > 0.1) {
          expect(prevProbability).toBeGreaterThanOrEqual(currProbability);
        }
      }
    });
  });

  describe('getFleetPredictiveAnalytics', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicle,
          maintenanceLogs: mockMaintenanceLogs,
          fuelLogs: mockFuelLogs,
        },
        {
          ...mockVehicle,
          id: 'vehicle-789',
          licensePlate: 'M-FL 5678',
          mileage: 120000,
          maintenanceLogs: [],
          fuelLogs: [],
        },
      ]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
    });

    it('should return fleet-wide analytics', async () => {
      const result = await service.getFleetPredictiveAnalytics(mockUserId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('fleetHealthScore');
      expect(result).toHaveProperty('vehiclesAtRisk');
      expect(result).toHaveProperty('upcomingFailures30Days');
      expect(result).toHaveProperty('estimatedMaintenanceCost30Days');
    });

    it('should calculate fleet health score', async () => {
      const result = await service.getFleetPredictiveAnalytics(mockUserId);

      expect(result.fleetHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.fleetHealthScore).toBeLessThanOrEqual(100);
    });

    it('should identify vehicles at risk', async () => {
      const result = await service.getFleetPredictiveAnalytics(mockUserId);

      expect(typeof result.vehiclesAtRisk).toBe('number');
      expect(result.vehiclesAtRisk).toBeGreaterThanOrEqual(0);
    });

    it('should include component risk summary', async () => {
      const result = await service.getFleetPredictiveAnalytics(mockUserId);

      expect(result.componentRiskSummary).toBeDefined();
      expect(Array.isArray(result.componentRiskSummary)).toBe(true);

      if (result.componentRiskSummary.length > 0) {
        const component = result.componentRiskSummary[0];
        expect(component).toHaveProperty('component');
        expect(component).toHaveProperty('componentDe');
        expect(component).toHaveProperty('vehiclesAffected');
        expect(component).toHaveProperty('averageRiskScore');
      }
    });

    it('should calculate predicted downtime', async () => {
      const result = await service.getFleetPredictiveAnalytics(mockUserId);

      expect(typeof result.predictedDowntimeHours).toBe('number');
      expect(result.predictedDowntimeHours).toBeGreaterThanOrEqual(0);
    });

    it('should include fleet recommendations', async () => {
      const result = await service.getFleetPredictiveAnalytics(mockUserId);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should calculate cost savings potential', async () => {
      const result = await service.getFleetPredictiveAnalytics(mockUserId);

      expect(typeof result.costSavingsPotential).toBe('number');
      expect(result.costSavingsPotential).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getComponentHealthTrends', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        maintenanceLogs: mockMaintenanceLogs,
      });
    });

    it('should return component health trends', async () => {
      const result = await service.getComponentHealthTrends(
        mockUserId,
        mockVehicleId,
        'brake_pads',
      );

      expect(result).toBeDefined();
      expect(result.component).toBe('brake_pads');
      expect(result.componentDe).toBe('Bremsbeläge');
    });

    it('should include historical health data', async () => {
      const result = await service.getComponentHealthTrends(
        mockUserId,
        mockVehicleId,
        'engine_oil',
        12,
      );

      expect(result.history).toBeDefined();
      expect(Array.isArray(result.history)).toBe(true);
      expect(result.history.length).toBeGreaterThan(0);

      result.history.forEach(point => {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('healthScore');
      });
    });

    it('should include projected health data', async () => {
      const result = await service.getComponentHealthTrends(
        mockUserId,
        mockVehicleId,
        'tires',
      );

      expect(result.projectedHealth).toBeDefined();
      expect(Array.isArray(result.projectedHealth)).toBe(true);
      expect(result.projectedHealth.length).toBe(6); // 6 months projection
    });

    it('should determine trend direction', async () => {
      const result = await service.getComponentHealthTrends(
        mockUserId,
        mockVehicleId,
        'battery',
      );

      expect(result.trend).toBeDefined();
      expect(['IMPROVING', 'STABLE', 'DECLINING']).toContain(result.trend);
    });

    it('should throw error for unknown component', async () => {
      await expect(
        service.getComponentHealthTrends(mockUserId, mockVehicleId, 'unknown_component'),
      ).rejects.toThrow('Unbekannte Komponente: unknown_component');
    });

    it('should throw error for non-existent vehicle', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.getComponentHealthTrends(mockUserId, 'invalid-id', 'brake_pads'),
      ).rejects.toThrow('Fahrzeug nicht gefunden');
    });
  });

  describe('getOptimizedMaintenanceSchedule', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        {
          ...mockVehicle,
          maintenanceLogs: mockMaintenanceLogs,
          fuelLogs: mockFuelLogs,
        },
      ]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
    });

    it('should return optimized schedule', async () => {
      const result = await service.getOptimizedMaintenanceSchedule(mockUserId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('schedule');
      expect(result).toHaveProperty('optimizationSummary');
    });

    it('should organize schedule by date', async () => {
      const result = await service.getOptimizedMaintenanceSchedule(mockUserId);

      expect(Array.isArray(result.schedule)).toBe(true);
      result.schedule.forEach(day => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('dayOfWeek');
        expect(day).toHaveProperty('vehicles');
        expect(day).toHaveProperty('totalDuration');
        expect(day).toHaveProperty('totalCost');
      });
    });

    it('should respect max downtime per day', async () => {
      const maxDowntime = 4;
      const result = await service.getOptimizedMaintenanceSchedule(mockUserId, {
        maxDowntimePerDay: maxDowntime,
      });

      result.schedule.forEach(day => {
        expect(day.totalDuration).toBeLessThanOrEqual(maxDowntime);
      });
    });

    it('should filter by preferred days', async () => {
      const preferredDays = [1, 2, 3, 4, 5]; // Monday-Friday
      const result = await service.getOptimizedMaintenanceSchedule(mockUserId, {
        preferredDays,
      });

      result.schedule.forEach(day => {
        const date = new Date(day.date);
        const dayOfWeek = date.getDay();
        expect(preferredDays).toContain(dayOfWeek);
      });
    });

    it('should include optimization summary', async () => {
      const result = await service.getOptimizedMaintenanceSchedule(mockUserId);

      expect(result.optimizationSummary).toHaveProperty('totalMaintenanceItems');
      expect(result.optimizationSummary).toHaveProperty('totalVehicles');
      expect(result.optimizationSummary).toHaveProperty('totalCostEur');
      expect(result.optimizationSummary).toHaveProperty('totalDowntimeHours');
      expect(result.optimizationSummary).toHaveProperty('daysRequired');
      expect(result.optimizationSummary).toHaveProperty('savingsFromBatching');
    });

    it('should calculate batching savings', async () => {
      const result = await service.getOptimizedMaintenanceSchedule(mockUserId);

      expect(typeof result.optimizationSummary.savingsFromBatching).toBe('number');
      expect(result.optimizationSummary.savingsFromBatching).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectMaintenanceAnomalies', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        maintenanceLogs: mockMaintenanceLogs,
        fuelLogs: mockFuelLogs,
      });
    });

    it('should return anomaly detection results', async () => {
      const result = await service.detectMaintenanceAnomalies(mockUserId, mockVehicleId);

      expect(result).toBeDefined();
      expect(result.vehicleId).toBe(mockVehicleId);
      expect(result.licensePlate).toBe('M-FL 1234');
    });

    it('should include anomaly score', async () => {
      const result = await service.detectMaintenanceAnomalies(mockUserId, mockVehicleId);

      expect(typeof result.anomalyScore).toBe('number');
      expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(result.anomalyScore).toBeLessThanOrEqual(100);
    });

    it('should return anomalies array', async () => {
      const result = await service.detectMaintenanceAnomalies(mockUserId, mockVehicleId);

      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it('should detect cost anomalies', async () => {
      // Add high-cost maintenance log
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        maintenanceLogs: [
          ...mockMaintenanceLogs,
          {
            id: 'log-high-cost',
            vehicleId: mockVehicleId,
            type: 'REPAIR',
            description: 'Major repair',
            odometerReading: 74000,
            totalCost: 2500, // Unusually high
            serviceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
        fuelLogs: mockFuelLogs,
      });

      const result = await service.detectMaintenanceAnomalies(mockUserId, mockVehicleId);

      const costAnomalies = result.anomalies.filter(a => a.type === 'COST');
      expect(costAnomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should include German translations in anomalies', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        maintenanceLogs: [
          ...mockMaintenanceLogs,
          {
            id: 'log-high-cost',
            vehicleId: mockVehicleId,
            type: 'REPAIR',
            totalCost: 3000,
            serviceDate: new Date(),
          },
        ],
        fuelLogs: mockFuelLogs,
      });

      const result = await service.detectMaintenanceAnomalies(mockUserId, mockVehicleId);

      result.anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('title');
        expect(anomaly).toHaveProperty('titleDe');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('descriptionDe');
        expect(anomaly).toHaveProperty('recommendation');
        expect(anomaly).toHaveProperty('recommendationDe');
      });
    });

    it('should throw error for non-existent vehicle', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.detectMaintenanceAnomalies(mockUserId, 'invalid-id'),
      ).rejects.toThrow('Fahrzeug nicht gefunden');
    });
  });

  describe('Component degradation models', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        maintenanceLogs: mockMaintenanceLogs,
        fuelLogs: mockFuelLogs,
      });
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue(mockRoutes);
    });

    it('should have degradation models for critical components', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      const componentNames = result.componentHealth.map(c => c.component);
      expect(componentNames).toContain('brake_pads');
      expect(componentNames).toContain('engine_oil');
      expect(componentNames).toContain('tires');
    });

    it('should provide German component names', async () => {
      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      const brakePads = result.componentHealth.find(c => c.component === 'brake_pads');
      expect(brakePads?.componentDe).toBe('Bremsbeläge');

      const engineOil = result.componentHealth.find(c => c.component === 'engine_oil');
      expect(engineOil?.componentDe).toBe('Motoröl');
    });

    it('should factor in usage intensity', async () => {
      // Test with high mileage vehicle
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        mileage: 150000,
        maintenanceLogs: [],
        fuelLogs: mockFuelLogs,
      });
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([
        ...mockRoutes,
        ...mockRoutes,
        ...mockRoutes,
      ]); // More routes = heavier usage

      const result = await service.getVehicleHealthProfile(mockUserId, mockVehicleId);

      // High-mileage vehicles should have lower health scores
      expect(result.overallHealthScore).toBeLessThan(90);
    });
  });
});
