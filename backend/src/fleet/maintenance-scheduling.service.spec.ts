import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceSchedulingService, DEFAULT_MAINTENANCE_SCHEDULES } from './maintenance-scheduling.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MaintenanceSchedulingService', () => {
  let service: MaintenanceSchedulingService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUserId = 'user-123';

  const mockVehicle = {
    id: 'vehicle-1',
    userId: mockUserId,
    licensePlate: 'M-DL-1234',
    make: 'Mercedes',
    model: 'Sprinter',
    mileage: 45000,
    tuvExpiry: new Date('2025-06-15'),
    insuranceExpiry: new Date('2025-12-31'),
    lastServiceDate: new Date('2024-01-15'),
    nextServiceDate: new Date('2025-01-15'),
    maintenanceLogs: [],
  };

  const mockVehicleWithLogs = {
    ...mockVehicle,
    maintenanceLogs: [
      {
        id: 'log-1',
        vehicleId: 'vehicle-1',
        type: 'OIL_CHANGE',
        description: 'Oil Change completed',
        serviceDate: new Date('2024-06-15'),
        odometerReading: 40000,
        totalCost: 150,
        partsCost: 50,
        laborCost: 100,
        vendorName: 'AutoService Munich',
        notes: 'Used synthetic oil',
      },
      {
        id: 'log-2',
        vehicleId: 'vehicle-1',
        type: 'TIRE_ROTATION',
        description: 'Tire Rotation completed',
        serviceDate: new Date('2024-03-10'),
        odometerReading: 35000,
        totalCost: 50,
        partsCost: 0,
        laborCost: 50,
        vendorName: 'AutoService Munich',
        notes: null,
      },
    ],
  };

  beforeEach(async () => {
    const mockPrisma = {
      vehicle: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      maintenanceLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceSchedulingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MaintenanceSchedulingService>(MaintenanceSchedulingService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DEFAULT_MAINTENANCE_SCHEDULES', () => {
    it('should have correct maintenance intervals for German delivery fleet', () => {
      expect(DEFAULT_MAINTENANCE_SCHEDULES).toHaveLength(5);

      // Oil change every 15,000 km or 12 months
      const oilChange = DEFAULT_MAINTENANCE_SCHEDULES.find(s => s.type === 'OIL_CHANGE');
      expect(oilChange).toBeDefined();
      expect(oilChange?.intervalKm).toBe(15000);
      expect(oilChange?.intervalMonths).toBe(12);
      expect(oilChange?.estimatedCostEur).toBe(150);

      // TÜV inspection every 2 years (German regulation)
      const tuv = DEFAULT_MAINTENANCE_SCHEDULES.find(s => s.type === 'TUV_INSPECTION');
      expect(tuv).toBeDefined();
      expect(tuv?.intervalMonths).toBe(24);
      expect(tuv?.estimatedCostEur).toBe(120);
    });
  });

  describe('getMaintenanceSummary', () => {
    it('should return correct summary for fleet vehicles', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);

      const result = await service.getMaintenanceSummary(mockUserId);

      expect(result).toHaveProperty('totalVehicles', 1);
      expect(result).toHaveProperty('vehiclesNeedingService');
      expect(result).toHaveProperty('overdueTasks');
      expect(result).toHaveProperty('upcomingTasks7Days');
      expect(result).toHaveProperty('upcomingTasks30Days');
      expect(result).toHaveProperty('estimatedMonthlyMaintenanceCost');
      expect(result).toHaveProperty('tuvExpiringThisMonth');
      expect(result).toHaveProperty('insuranceExpiringThisMonth');
    });

    it('should return empty summary for no vehicles', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getMaintenanceSummary(mockUserId);

      expect(result.totalVehicles).toBe(0);
      expect(result.vehiclesNeedingService).toBe(0);
      expect(result.overdueTasks).toBe(0);
    });
  });

  describe('getAllScheduledMaintenance', () => {
    it('should return scheduled maintenance tasks for all vehicles', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicleWithLogs]);

      const result = await service.getAllScheduledMaintenance(mockUserId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Each task should have required properties
      for (const task of result) {
        expect(task).toHaveProperty('vehicleId');
        expect(task).toHaveProperty('licensePlate');
        expect(task).toHaveProperty('type');
        expect(task).toHaveProperty('dueDate');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('isOverdue');
        expect(task).toHaveProperty('daysUntilDue');
      }
    });

    it('should filter by vehicleId when provided', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);

      await service.getAllScheduledMaintenance(mockUserId, { vehicleId: 'vehicle-1' });

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'vehicle-1',
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      // Create a vehicle with an overdue task
      const overdueVehicle = {
        ...mockVehicle,
        lastServiceDate: new Date('2022-01-01'), // 3 years ago
        maintenanceLogs: [],
      };
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([overdueVehicle]);

      const result = await service.getAllScheduledMaintenance(mockUserId, { status: 'overdue' });

      // Should only include overdue tasks
      for (const task of result) {
        expect(task.isOverdue).toBe(true);
      }
    });

    it('should sort tasks by priority and due date', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicleWithLogs]);

      const result = await service.getAllScheduledMaintenance(mockUserId);

      // CRITICAL tasks should come first
      const priorities = result.map(t => t.priority);
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      for (let i = 1; i < priorities.length; i++) {
        expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(priorityOrder[priorities[i - 1]]);
      }
    });
  });

  describe('getMaintenanceAlerts', () => {
    it('should return TÜV expiry alerts', async () => {
      const vehicleWithExpiringTuv = {
        ...mockVehicle,
        tuvExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      };
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([vehicleWithExpiringTuv]);

      const result = await service.getMaintenanceAlerts(mockUserId);

      const tuvAlert = result.find(a => a.alertType === 'TUV_EXPIRY');
      expect(tuvAlert).toBeDefined();
      expect(tuvAlert?.severity).toBe('URGENT');
    });

    it('should return CRITICAL alert for expired TÜV', async () => {
      const vehicleWithExpiredTuv = {
        ...mockVehicle,
        tuvExpiry: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Expired 7 days ago
      };
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([vehicleWithExpiredTuv]);

      const result = await service.getMaintenanceAlerts(mockUserId);

      const tuvAlert = result.find(a => a.alertType === 'TUV_EXPIRY');
      expect(tuvAlert).toBeDefined();
      expect(tuvAlert?.severity).toBe('CRITICAL');
      expect(tuvAlert?.message).toContain('expired');
    });

    it('should return insurance expiry alerts', async () => {
      const vehicleWithExpiringInsurance = {
        ...mockVehicle,
        insuranceExpiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Expires in 10 days
      };
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([vehicleWithExpiringInsurance]);

      const result = await service.getMaintenanceAlerts(mockUserId);

      const insuranceAlert = result.find(a => a.alertType === 'INSURANCE_EXPIRY');
      expect(insuranceAlert).toBeDefined();
      expect(insuranceAlert?.severity).toBe('URGENT');
    });

    it('should sort alerts by severity', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);

      const result = await service.getMaintenanceAlerts(mockUserId);

      const severityOrder = { CRITICAL: 0, URGENT: 1, HIGH: 2, WARNING: 3, INFO: 4 };
      for (let i = 1; i < result.length; i++) {
        expect(severityOrder[result[i].severity]).toBeGreaterThanOrEqual(severityOrder[result[i - 1].severity]);
      }
    });
  });

  describe('scheduleMaintenanceTask', () => {
    it('should schedule a maintenance task for a vehicle', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(mockVehicle);

      const scheduledDate = new Date('2025-02-15');
      const result = await service.scheduleMaintenanceTask(mockUserId, 'vehicle-1', {
        type: 'OIL_CHANGE',
        scheduledDate,
        priority: 'MEDIUM',
        estimatedCostEur: 150,
        notes: 'Use synthetic oil',
        serviceProvider: 'AutoService Munich',
      });

      expect(result).toHaveProperty('vehicleId', 'vehicle-1');
      expect(result).toHaveProperty('licensePlate', 'M-DL-1234');
      expect(result).toHaveProperty('type', 'OIL_CHANGE');
      expect(result).toHaveProperty('scheduledDate', scheduledDate);
      expect(result).toHaveProperty('priority', 'MEDIUM');
      expect(result).toHaveProperty('serviceProvider', 'AutoService Munich');

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
        data: { nextServiceDate: scheduledDate },
      });
    });

    it('should throw error if vehicle not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.scheduleMaintenanceTask(mockUserId, 'nonexistent', {
          type: 'OIL_CHANGE',
          scheduledDate: new Date(),
        }),
      ).rejects.toThrow('Vehicle not found');
    });

    it('should use default priority if not specified', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(mockVehicle);

      const result = await service.scheduleMaintenanceTask(mockUserId, 'vehicle-1', {
        type: 'BRAKE_SERVICE',
        scheduledDate: new Date(),
      });

      expect(result.priority).toBe('MEDIUM');
    });
  });

  describe('completeMaintenanceTask', () => {
    it('should complete a maintenance task and create log', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);
      (prisma.maintenanceLog.create as jest.Mock).mockResolvedValue({
        id: 'log-new',
        vehicleId: 'vehicle-1',
        type: 'OIL_CHANGE',
        totalCost: 175,
        serviceDate: new Date(),
      });
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(mockVehicle);

      const result = await service.completeMaintenanceTask(mockUserId, 'vehicle-1-OIL_CHANGE', {
        actualCostEur: 175,
        odometerReading: 50000,
        serviceProvider: 'AutoService Munich',
        invoiceNumber: 'INV-2025-001',
        notes: 'Changed to full synthetic',
      });

      expect(result).toHaveProperty('id', 'log-new');
      expect(result).toHaveProperty('vehicle');
      expect(result.vehicle.licensePlate).toBe('M-DL-1234');

      expect(prisma.maintenanceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vehicleId: 'vehicle-1',
          type: 'OIL_CHANGE',
          totalCost: 175,
          odometerReading: 50000,
          vendorName: 'AutoService Munich',
        }),
      });

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
        data: expect.objectContaining({
          lastServiceDate: expect.any(Date),
          mileage: 50000,
        }),
      });
    });

    it('should update TÜV expiry when completing TÜV inspection', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicle);
      (prisma.maintenanceLog.create as jest.Mock).mockResolvedValue({
        id: 'log-tuv',
        vehicleId: 'vehicle-1',
        type: 'TUV_INSPECTION',
      });
      (prisma.vehicle.update as jest.Mock).mockResolvedValue(mockVehicle);

      await service.completeMaintenanceTask(mockUserId, 'vehicle-1-TUV_INSPECTION', {
        actualCostEur: 120,
      });

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
        data: expect.objectContaining({
          tuvExpiry: expect.any(Date),
        }),
      });

      // Verify TÜV expiry is set 2 years in the future
      const updateCall = (prisma.vehicle.update as jest.Mock).mock.calls[0][0];
      const tuvExpiry = updateCall.data.tuvExpiry;
      const now = new Date();
      const expectedExpiry = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

      expect(tuvExpiry.getFullYear()).toBe(expectedExpiry.getFullYear());
    });

    it('should throw error if vehicle not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.completeMaintenanceTask(mockUserId, 'nonexistent-OIL_CHANGE', {
          actualCostEur: 150,
        }),
      ).rejects.toThrow('Vehicle not found');
    });
  });

  describe('getMaintenanceHistory', () => {
    it('should return maintenance history for a vehicle', async () => {
      (prisma.maintenanceLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'log-1',
          type: 'OIL_CHANGE',
          description: 'Oil Change completed',
          serviceDate: new Date('2024-06-15'),
          odometerReading: 40000,
          totalCost: 150,
          partsCost: 50,
          laborCost: 100,
          vendorName: 'AutoService Munich',
          notes: 'Used synthetic oil',
          vehicle: { id: 'vehicle-1', licensePlate: 'M-DL-1234', make: 'Mercedes', model: 'Sprinter' },
        },
      ]);

      const result = await service.getMaintenanceHistory(mockUserId, 'vehicle-1');

      expect(result).toHaveProperty('vehicleId', 'vehicle-1');
      expect(result).toHaveProperty('totalRecords', 1);
      expect(result).toHaveProperty('history');
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toHaveProperty('typeLabel', 'Oil Change');
    });

    it('should filter by date range when provided', async () => {
      (prisma.maintenanceLog.findMany as jest.Mock).mockResolvedValue([]);

      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');

      await service.getMaintenanceHistory(mockUserId, 'vehicle-1', { from, to });

      expect(prisma.maintenanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceDate: {
              gte: from,
              lte: to,
            },
          }),
        }),
      );
    });
  });

  describe('getVehicleMaintenanceSchedule', () => {
    it('should return complete maintenance schedule for a vehicle', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(mockVehicleWithLogs);
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicleWithLogs]);

      const result = await service.getVehicleMaintenanceSchedule(mockUserId, 'vehicle-1');

      expect(result).toHaveProperty('vehicle');
      expect(result.vehicle.licensePlate).toBe('M-DL-1234');
      expect(result).toHaveProperty('scheduledTasks');
      expect(Array.isArray(result.scheduledTasks)).toBe(true);
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('recentHistory');
      expect(result).toHaveProperty('costForecast');
      expect(result.costForecast).toHaveLength(12); // 12 months forecast
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalScheduledTasks');
      expect(result.summary).toHaveProperty('overdueTasks');
      expect(result.summary).toHaveProperty('estimatedYearCost');
    });

    it('should throw error if vehicle not found', async () => {
      (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getVehicleMaintenanceSchedule(mockUserId, 'nonexistent'),
      ).rejects.toThrow('Vehicle not found');
    });
  });

  describe('getMaintenanceCostForecast', () => {
    it('should return cost forecast for specified months', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicleWithLogs]);

      const result = await service.getMaintenanceCostForecast(mockUserId, 6);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(6);

      for (const month of result) {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('estimatedCostEur');
        expect(month).toHaveProperty('maintenanceCount');
        expect(month).toHaveProperty('details');
        expect(typeof month.estimatedCostEur).toBe('number');
      }
    });

    it('should default to 12 months forecast', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicle]);

      const result = await service.getMaintenanceCostForecast(mockUserId);

      expect(result.length).toBe(12);
    });

    it('should include task details in forecast', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockVehicleWithLogs]);

      const result = await service.getMaintenanceCostForecast(mockUserId, 12);

      // At least some months should have maintenance details
      const monthsWithMaintenance = result.filter(m => m.maintenanceCount > 0);

      for (const month of monthsWithMaintenance) {
        expect(month.details.length).toBe(month.maintenanceCount);
        for (const detail of month.details) {
          expect(detail).toHaveProperty('vehiclePlate');
          expect(detail).toHaveProperty('type');
          expect(detail).toHaveProperty('cost');
        }
      }
    });
  });
});
