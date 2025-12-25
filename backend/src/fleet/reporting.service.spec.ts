import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService, FleetPerformanceReport, FuelConsumptionReport, VehicleUtilizationReport, MaintenanceCostReport, DriverPayoutReport, CourierReconciliationReport } from './reporting.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportingService', () => {
  let service: ReportingService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUserId = 'user-123';
  const mockFrom = new Date('2024-01-01');
  const mockTo = new Date('2024-01-31');

  const mockVehicle = {
    id: 'vehicle-1',
    licensePlate: 'M-AB-1234',
    make: 'Mercedes',
    model: 'Sprinter',
    fuelType: 'DIESEL',
    status: 'ACTIVE',
    nextServiceDate: new Date('2024-02-15'),
  };

  const mockDriver = {
    id: 'driver-1',
    firstName: 'Hans',
    lastName: 'Mueller',
  };

  const mockRoute = {
    id: 'route-1',
    vehicleId: 'vehicle-1',
    driverId: 'driver-1',
    userId: mockUserId,
    routeDate: new Date('2024-01-15'),
    status: 'COMPLETED',
    actualDistanceKm: 120.5,
    actualDurationMin: 480,
    deliveryZone: 'Munich-Schwabing',
    vehicle: mockVehicle,
    driver: mockDriver,
    stops: [
      { id: 'stop-1', status: 'DELIVERED', parcelCount: 3 },
      { id: 'stop-2', status: 'DELIVERED', parcelCount: 2 },
      { id: 'stop-3', status: 'FAILED', parcelCount: 1 },
    ],
  };

  const mockFuelLog = {
    id: 'fuel-1',
    vehicleId: 'vehicle-1',
    liters: 45.5,
    totalCost: 72.80,
    pricePerLiter: 1.60,
    fueledAt: new Date('2024-01-15'),
    vehicle: mockVehicle,
  };

  const mockMaintenanceLog = {
    id: 'maintenance-1',
    vehicleId: 'vehicle-1',
    type: 'SCHEDULED_SERVICE',
    description: 'Oil change',
    serviceDate: new Date('2024-01-10'),
    totalCost: 250.00,
    partsCost: 80.00,
    laborCost: 170.00,
    vehicle: mockVehicle,
  };

  const mockCourierDelivery = {
    id: 'delivery-1',
    userId: mockUserId,
    trackingNumber: 'DPD123456',
    provider: 'DPD',
    status: 'DELIVERED',
    createdAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const mockPrisma = {
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
      courierDelivery: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFleetPerformanceReport', () => {
    it('should generate a complete fleet performance report', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute]);

      const result = await service.generateFleetPerformanceReport(mockUserId, mockFrom, mockTo);

      expect(result.period).toEqual({ from: mockFrom, to: mockTo });
      expect(result.summary.totalRoutes).toBe(1);
      expect(result.summary.completedRoutes).toBe(1);
      expect(result.summary.totalDeliveries).toBe(3);
      expect(result.summary.successfulDeliveries).toBe(2);
      expect(result.summary.failedDeliveries).toBe(1);
      expect(result.summary.deliverySuccessRate).toBe(67);
      expect(result.byVehicle).toHaveLength(1);
      expect(result.byVehicle[0].licensePlate).toBe('M-AB-1234');
      expect(result.byDriver).toHaveLength(1);
      expect(result.byDriver[0].driverName).toBe('Hans Mueller');
      expect(result.byZone).toHaveLength(1);
      expect(result.byZone[0].zone).toBe('Munich-Schwabing');
    });

    it('should handle empty routes', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateFleetPerformanceReport(mockUserId, mockFrom, mockTo);

      expect(result.summary.totalRoutes).toBe(0);
      expect(result.summary.completionRate).toBe(0);
      expect(result.byVehicle).toHaveLength(0);
      expect(result.byDriver).toHaveLength(0);
    });

    it('should calculate correct completion rates', async () => {
      const routes = [
        { ...mockRoute, status: 'COMPLETED' },
        { ...mockRoute, id: 'route-2', status: 'PARTIAL' },
        { ...mockRoute, id: 'route-3', status: 'CANCELLED' },
      ];
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue(routes);

      const result = await service.generateFleetPerformanceReport(mockUserId, mockFrom, mockTo);

      expect(result.summary.totalRoutes).toBe(3);
      expect(result.summary.completedRoutes).toBe(1);
      expect(result.summary.partialRoutes).toBe(1);
      expect(result.summary.cancelledRoutes).toBe(1);
      expect(result.summary.completionRate).toBe(33); // 1 completed / 3 total
    });
  });

  describe('generateFuelConsumptionReport', () => {
    it('should generate a complete fuel consumption report', async () => {
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([mockFuelLog]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute]);

      const result = await service.generateFuelConsumptionReport(mockUserId, mockFrom, mockTo);

      expect(result.period).toEqual({ from: mockFrom, to: mockTo });
      expect(result.summary.totalLiters).toBe(45.5);
      expect(result.summary.totalCostEur).toBe(72.80);
      expect(result.byVehicle).toHaveLength(1);
      expect(result.byVehicle[0].totalLiters).toBe(45.5);
      expect(result.byVehicle[0].fillUps).toBe(1);
      expect(result.byMonth).toHaveLength(1);
      expect(result.byMonth[0].month).toBe('2024-01');
    });

    it('should calculate correct consumption per 100km', async () => {
      (prisma.fuelLog.findMany as jest.Mock).mockResolvedValue([{
        ...mockFuelLog,
        liters: 50,
      }]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([{
        ...mockRoute,
        actualDistanceKm: 500,
      }]);

      const result = await service.generateFuelConsumptionReport(mockUserId, mockFrom, mockTo);

      expect(result.byVehicle[0].consumptionLitersPer100km).toBe(10); // 50L / 500km * 100
    });
  });

  describe('generateVehicleUtilizationReport', () => {
    it('should generate a complete vehicle utilization report', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute]);
      (prisma.maintenanceLog.findMany as jest.Mock).mockResolvedValue([mockMaintenanceLog]);

      const result = await service.generateVehicleUtilizationReport(mockUserId, mockFrom, mockTo);

      expect(result.period).toEqual({ from: mockFrom, to: mockTo });
      expect(result.summary.totalVehicles).toBe(1);
      expect(result.byVehicle).toHaveLength(1);
      expect(result.byVehicle[0].licensePlate).toBe('M-AB-1234');
      expect(result.byVehicle[0].activeDays).toBeGreaterThanOrEqual(0);
    });

    it('should count working days correctly excluding weekends', async () => {
      // January 2024 has 23 working days (excluding weekends)
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.maintenanceLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateVehicleUtilizationReport(mockUserId, mockFrom, mockTo);

      expect(result.summary.totalWorkingDays).toBe(23); // Jan 2024 has 23 weekdays
    });
  });

  describe('generateMaintenanceCostReport', () => {
    it('should generate a complete maintenance cost report', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);
      (prisma.maintenanceLog.findMany as jest.Mock).mockResolvedValue([mockMaintenanceLog]);

      const result = await service.generateMaintenanceCostReport(mockUserId, mockFrom, mockTo);

      expect(result.period).toEqual({ from: mockFrom, to: mockTo });
      expect(result.summary.totalCostEur).toBe(250);
      expect(result.summary.partsCostEur).toBe(80);
      expect(result.summary.laborCostEur).toBe(170);
      expect(result.summary.scheduledCount).toBe(1);
      expect(result.summary.unscheduledCount).toBe(0);
      expect(result.byVehicle).toHaveLength(1);
      expect(result.byType).toHaveLength(1);
      expect(result.byType[0].type).toBe('SCHEDULED_SERVICE');
    });

    it('should categorize scheduled vs unscheduled maintenance', async () => {
      const logs = [
        { ...mockMaintenanceLog, type: 'SCHEDULED_SERVICE' },
        { ...mockMaintenanceLog, id: 'maintenance-2', type: 'TUV_INSPECTION' },
        { ...mockMaintenanceLog, id: 'maintenance-3', type: 'REPAIR' },
      ];
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);
      (prisma.maintenanceLog.findMany as jest.Mock).mockResolvedValue(logs);

      const result = await service.generateMaintenanceCostReport(mockUserId, mockFrom, mockTo);

      expect(result.summary.scheduledCount).toBe(2); // SCHEDULED_SERVICE + TUV_INSPECTION
      expect(result.summary.unscheduledCount).toBe(1); // REPAIR
    });
  });

  describe('generateDriverPayoutReport', () => {
    it('should generate a complete driver payout report with German tax', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute]);

      const result = await service.generateDriverPayoutReport(mockUserId, mockFrom, mockTo);

      expect(result.period).toEqual({ from: mockFrom, to: mockTo });
      expect(result.summary.totalDrivers).toBe(1);
      expect(result.summary.totalDeliveries).toBe(2); // Only delivered stops
      expect(result.byDriver).toHaveLength(1);
      expect(result.byDriver[0].driverName).toBe('Hans Mueller');
      expect(result.byDriver[0].deliveries).toBe(2);
      expect(result.byDriver[0].parcels).toBe(5); // 3 + 2 from delivered stops

      // Check tax calculation (19% MwSt)
      expect(result.byDriver[0].taxWithholdingEur).toBeGreaterThan(0);
      expect(result.byDriver[0].netPayEur).toBeLessThan(result.byDriver[0].grossPayEur);
    });

    it('should apply Saturday bonus', async () => {
      const saturdayRoute = {
        ...mockRoute,
        routeDate: new Date('2024-01-13'), // Saturday
      };
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([saturdayRoute]);

      const result = await service.generateDriverPayoutReport(mockUserId, mockFrom, mockTo);

      expect(result.byDriver[0].bonusesEur).toBeGreaterThan(0);
    });

    it('should calculate correct pay rates', async () => {
      // Pay rates: €1.20/parcel + €0.35/km
      const route = {
        ...mockRoute,
        actualDistanceKm: 100,
        stops: [{ id: 'stop-1', status: 'DELIVERED', parcelCount: 10 }],
      };
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([route]);

      const result = await service.generateDriverPayoutReport(mockUserId, mockFrom, mockTo);

      // Expected: 10 parcels * €1.20 + 100km * €0.35 = €12 + €35 = €47
      expect(result.byDriver[0].grossPayEur).toBe(47);
    });
  });

  describe('generateCourierReconciliationReport', () => {
    it('should generate a complete courier reconciliation report', async () => {
      (prisma.courierDelivery.findMany as jest.Mock).mockResolvedValue([mockCourierDelivery]);

      const result = await service.generateCourierReconciliationReport(mockUserId, mockFrom, mockTo);

      expect(result.period).toEqual({ from: mockFrom, to: mockTo });
      expect(result.totals.totalDeliveries).toBe(1);
      expect(result.byProvider).toHaveLength(1);
      expect(result.byProvider[0].provider).toBe('DPD');
      expect(result.byProvider[0].standardDeliveries).toBe(1);
    });

    it('should calculate DPD vs GLS rates correctly', async () => {
      const deliveries = [
        { ...mockCourierDelivery, provider: 'DPD', status: 'DELIVERED' },
        { ...mockCourierDelivery, id: 'delivery-2', provider: 'GLS', status: 'DELIVERED' },
      ];
      (prisma.courierDelivery.findMany as jest.Mock).mockResolvedValue(deliveries);

      const result = await service.generateCourierReconciliationReport(mockUserId, mockFrom, mockTo);

      expect(result.byProvider).toHaveLength(2);
      const dpd = result.byProvider.find(p => p.provider === 'DPD');
      const gls = result.byProvider.find(p => p.provider === 'GLS');

      // DPD standard: €4.50, GLS standard: €4.30
      expect(dpd?.calculatedAmountEur).toBe(4.50);
      expect(gls?.calculatedAmountEur).toBe(4.30);
    });

    it('should apply Saturday multiplier', async () => {
      const saturdayDelivery = {
        ...mockCourierDelivery,
        createdAt: new Date('2024-01-13'), // Saturday
      };
      (prisma.courierDelivery.findMany as jest.Mock).mockResolvedValue([saturdayDelivery]);

      const result = await service.generateCourierReconciliationReport(mockUserId, mockFrom, mockTo);

      expect(result.byProvider[0].saturdayBonusEur).toBeGreaterThan(0);
      // DPD Saturday: €4.50 * 1.3 = €5.85
      expect(result.byProvider[0].calculatedAmountEur).toBe(5.85);
    });

    it('should handle express deliveries', async () => {
      const expressDelivery = {
        ...mockCourierDelivery,
        status: 'EXPRESS_DELIVERED', // Status contains EXPRESS
      };
      (prisma.courierDelivery.findMany as jest.Mock).mockResolvedValue([expressDelivery]);

      const result = await service.generateCourierReconciliationReport(mockUserId, mockFrom, mockTo);

      expect(result.byProvider[0].expressDeliveries).toBe(1);
      expect(result.byProvider[0].calculatedAmountEur).toBe(8.90); // DPD express rate
    });

    it('should handle returns and failed deliveries', async () => {
      const deliveries = [
        { ...mockCourierDelivery, status: 'RETURNED' },
        { ...mockCourierDelivery, id: 'delivery-2', status: 'FAILED' },
      ];
      (prisma.courierDelivery.findMany as jest.Mock).mockResolvedValue(deliveries);

      const result = await service.generateCourierReconciliationReport(mockUserId, mockFrom, mockTo);

      expect(result.byProvider[0].returns).toBe(1);
      expect(result.byProvider[0].failed).toBe(1);
      // Only returns are charged (€5.20), failed = no charge
      expect(result.byProvider[0].calculatedAmountEur).toBe(5.20);
    });
  });

  describe('formatAsCsv', () => {
    it('should format data as CSV correctly', () => {
      const data = [
        { name: 'Test', value: 123 },
        { name: 'Test,Comma', value: 456 },
      ];

      const result = service.formatAsCsv(data);

      expect(result).toContain('name,value');
      expect(result).toContain('Test,123');
      expect(result).toContain('"Test,Comma",456'); // Quoted due to comma
    });

    it('should handle empty data', () => {
      const result = service.formatAsCsv([]);
      expect(result).toBe('');
    });

    it('should handle Date values', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const data = [{ date }];

      const result = service.formatAsCsv(data);

      expect(result).toContain('2024-01-15T10:30:00.000Z');
    });
  });

  describe('exportReport', () => {
    it('should export as JSON', async () => {
      const report = { summary: { total: 100 } };

      const result = await service.exportReport(report, 'json', 'test_report');

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toMatch(/^test_report_\d{4}-\d{2}-\d{2}\.json$/);
      expect(result.data).toEqual(report);
    });

    it('should export as CSV', async () => {
      const report = {
        byVehicle: [
          { vehicleId: 'v1', licensePlate: 'M-AB-1234' },
          { vehicleId: 'v2', licensePlate: 'M-CD-5678' },
        ],
      };

      const result = await service.exportReport(report, 'csv', 'fleet_report');

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toMatch(/^fleet_report_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('vehicleId,licensePlate');
    });
  });

  describe('getAvailableReportTypes', () => {
    it('should return all available report types', async () => {
      const result = await service.getAvailableReportTypes();

      expect(result).toHaveLength(6);
      expect(result.map(r => r.type)).toEqual([
        'fleet_performance',
        'fuel_consumption',
        'vehicle_utilization',
        'maintenance_cost',
        'driver_payout',
        'courier_reconciliation',
      ]);

      result.forEach(report => {
        expect(report.name).toBeDefined();
        expect(report.description).toBeDefined();
        expect(report.exportFormats).toContain('json');
        expect(report.exportFormats).toContain('csv');
      });
    });
  });

  describe('generateReport (unified method)', () => {
    it('should generate fleet_performance report', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute]);

      const result = await service.generateReport(mockUserId, 'fleet_performance', mockFrom, mockTo);

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toContain('fleet_performance');
    });

    it('should throw error for unknown report type', async () => {
      await expect(
        service.generateReport(mockUserId, 'unknown_report', mockFrom, mockTo),
      ).rejects.toThrow('Unknown report type: unknown_report');
    });

    it('should support different export formats', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([mockRoute]);

      const jsonResult = await service.generateReport(mockUserId, 'fleet_performance', mockFrom, mockTo, 'json');
      expect(jsonResult.contentType).toBe('application/json');

      const csvResult = await service.generateReport(mockUserId, 'fleet_performance', mockFrom, mockTo, 'csv');
      expect(csvResult.contentType).toBe('text/csv');
    });
  });
});
