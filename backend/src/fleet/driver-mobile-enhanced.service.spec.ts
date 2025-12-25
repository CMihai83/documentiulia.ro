import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DriverMobileEnhancedService } from './driver-mobile-enhanced.service';
import { PrismaService } from '../prisma/prisma.service';
import { RouteStatus, DeliveryStopStatus } from '@prisma/client';

describe('DriverMobileEnhancedService', () => {
  let service: DriverMobileEnhancedService;
  let prisma: PrismaService;

  const mockDriverId = 'driver-123';
  const mockVehicleId = 'vehicle-123';
  const mockStopId = 'stop-123';

  const mockEmployee = {
    id: mockDriverId,
    userId: 'user-123',
    firstName: 'Hans',
    lastName: 'Müller',
  };

  const mockTimesheet = {
    id: 'timesheet-123',
    employeeId: mockDriverId,
    date: new Date(),
    startTime: new Date(),
    status: 'PENDING',
  };

  const mockStop = {
    id: mockStopId,
    routeId: 'route-123',
    streetAddress: 'Leopoldstraße 100',
    city: 'München',
    trackingNumbers: ['DPD123456', 'DPD789012'],
    status: DeliveryStopStatus.PENDING,
  };

  const mockRoute = {
    id: 'route-123',
    driverId: mockDriverId,
    routeName: 'Schwabing Route A',
    status: RouteStatus.IN_PROGRESS,
    actualStartTime: new Date(Date.now() - 3600000),
    actualEndTime: new Date(),
    actualDistanceKm: { toNumber: () => 45.5 },
    stops: [
      { status: DeliveryStopStatus.DELIVERED },
      { status: DeliveryStopStatus.DELIVERED },
      { status: DeliveryStopStatus.FAILED },
    ],
  };

  const mockPrismaService = {
    employee: {
      findFirst: jest.fn(),
    },
    timesheet: {
      findFirst: jest.fn(),
    },
    deliveryStop: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    deliveryRoute: {
      findFirst: jest.fn(),
    },
    vehicle: {
      update: jest.fn(),
    },
    fuelLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverMobileEnhancedService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DriverMobileEnhancedService>(DriverMobileEnhancedService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Break Management', () => {
    describe('startBreak', () => {
      it('should start a break', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.timesheet.findFirst.mockResolvedValue(mockTimesheet);

        const result = await service.startBreak(mockDriverId, 'LUNCH');

        expect(result).toBeDefined();
        expect(result.id).toMatch(/^break-\d+$/);
        expect(result.driverId).toBe(mockDriverId);
        expect(result.type).toBe('LUNCH');
        expect(result.startTime).toBeDefined();
        expect(result.endTime).toBeNull();
      });

      it('should throw if driver not found', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(null);

        await expect(service.startBreak(mockDriverId, 'LUNCH'))
          .rejects.toThrow(NotFoundException);
      });

      it('should throw if no active timesheet', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.timesheet.findFirst.mockResolvedValue(null);

        await expect(service.startBreak(mockDriverId, 'LUNCH'))
          .rejects.toThrow(BadRequestException);
      });

      it('should throw if already on break', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.timesheet.findFirst.mockResolvedValue(mockTimesheet);

        await service.startBreak(mockDriverId, 'LUNCH');

        await expect(service.startBreak(mockDriverId, 'REST'))
          .rejects.toThrow(BadRequestException);
      });
    });

    describe('endBreak', () => {
      it('should end a break and calculate duration', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.timesheet.findFirst.mockResolvedValue(mockTimesheet);

        await service.startBreak(mockDriverId, 'LUNCH');
        const result = await service.endBreak(mockDriverId);

        expect(result.endTime).toBeDefined();
        expect(result.durationMinutes).toBeGreaterThanOrEqual(0);
      });

      it('should throw if no active break', async () => {
        await expect(service.endBreak('no-break-driver'))
          .rejects.toThrow(BadRequestException);
      });
    });

    describe('getTodayBreaks', () => {
      it('should return today breaks with total', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.timesheet.findFirst.mockResolvedValue(mockTimesheet);

        await service.startBreak(mockDriverId, 'LUNCH');
        await service.endBreak(mockDriverId);

        const result = await service.getTodayBreaks(mockDriverId);

        expect(result.breaks.length).toBeGreaterThan(0);
        expect(result.totalMinutes).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Parcel Scanning', () => {
    describe('scanParcel', () => {
      it('should scan and match a parcel', async () => {
        mockPrismaService.deliveryStop.findUnique.mockResolvedValue(mockStop);

        const result = await service.scanParcel(mockStopId, 'DPD123456');

        expect(result.trackingNumber).toBe('DPD123456');
        expect(result.verified).toBe(true);
        expect(result.status).toBe('MATCHED');
      });

      it('should mark as NOT_FOUND if tracking not in stop', async () => {
        mockPrismaService.deliveryStop.findUnique.mockResolvedValue(mockStop);
        mockPrismaService.deliveryStop.findMany.mockResolvedValue([]);

        const result = await service.scanParcel(mockStopId, 'UNKNOWN123');

        expect(result.verified).toBe(false);
        expect(result.status).toBe('NOT_FOUND');
      });

      it('should mark as WRONG_STOP if parcel belongs to another stop', async () => {
        mockPrismaService.deliveryStop.findUnique.mockResolvedValue(mockStop);
        mockPrismaService.deliveryStop.findMany.mockResolvedValue([
          { id: 'other-stop', trackingNumbers: ['WRONG123'] },
        ]);

        const result = await service.scanParcel(mockStopId, 'WRONG123');

        expect(result.verified).toBe(false);
        expect(result.status).toBe('WRONG_STOP');
      });

      it('should throw if stop not found', async () => {
        mockPrismaService.deliveryStop.findUnique.mockResolvedValue(null);

        await expect(service.scanParcel(mockStopId, 'DPD123456'))
          .rejects.toThrow(NotFoundException);
      });
    });

    describe('verifyStopParcels', () => {
      it('should verify all parcels and identify missing ones', async () => {
        mockPrismaService.deliveryStop.findUnique.mockResolvedValue(mockStop);

        // Scan one parcel
        await service.scanParcel(mockStopId, 'DPD123456');

        const result = await service.verifyStopParcels(mockStopId);

        expect(result.allVerified).toBe(false);
        expect(result.missingParcels).toContain('DPD789012');
      });

      it('should return allVerified=true when all parcels scanned', async () => {
        mockPrismaService.deliveryStop.findUnique.mockResolvedValue(mockStop);

        await service.scanParcel(mockStopId, 'DPD123456');
        await service.scanParcel(mockStopId, 'DPD789012');

        const result = await service.verifyStopParcels(mockStopId);

        expect(result.allVerified).toBe(true);
        expect(result.missingParcels.length).toBe(0);
      });
    });
  });

  describe('Vehicle Inspection', () => {
    describe('getInspectionChecklist', () => {
      it('should return pre-trip checklist', () => {
        const checklist = service.getInspectionChecklist('PRE_TRIP');

        expect(checklist.length).toBeGreaterThan(0);
        expect(checklist.some(i => i.category === 'Außen')).toBe(true);
        expect(checklist.some(i => i.category === 'Innen')).toBe(true);
        expect(checklist.some(i => i.category === 'Flüssigkeiten')).toBe(true);
        expect(checklist.some(i => i.category === 'Sicherheit')).toBe(true);
      });

      it('should include additional items for post-trip', () => {
        const preTripChecklist = service.getInspectionChecklist('PRE_TRIP');
        const postTripChecklist = service.getInspectionChecklist('POST_TRIP');

        expect(postTripChecklist.length).toBeGreaterThan(preTripChecklist.length);
        expect(postTripChecklist.some(i => i.category === 'Ende der Schicht')).toBe(true);
      });
    });

    describe('submitInspection', () => {
      it('should submit a passing inspection', async () => {
        mockPrismaService.vehicle.update.mockResolvedValue({});

        const checklist = service.getInspectionChecklist('PRE_TRIP');
        const items = checklist.map(item => ({ id: item.id, passed: true }));

        const result = await service.submitInspection(
          mockDriverId,
          mockVehicleId,
          'PRE_TRIP',
          45000,
          items,
        );

        expect(result.overallPass).toBe(true);
        expect(result.mileageReading).toBe(45000);
        expect(result.items.length).toBe(checklist.length);
      });

      it('should fail inspection if required item fails', async () => {
        mockPrismaService.vehicle.update.mockResolvedValue({});

        const checklist = service.getInspectionChecklist('PRE_TRIP');
        const items = checklist.map(item => ({
          id: item.id,
          passed: item.id !== 'ext-1', // Fail tires check
        }));

        const result = await service.submitInspection(
          mockDriverId,
          mockVehicleId,
          'PRE_TRIP',
          45000,
          items,
        );

        expect(result.overallPass).toBe(false);
      });

      it('should update vehicle mileage', async () => {
        mockPrismaService.vehicle.update.mockResolvedValue({});

        const checklist = service.getInspectionChecklist('PRE_TRIP');
        const items = checklist.map(item => ({ id: item.id, passed: true }));

        await service.submitInspection(
          mockDriverId,
          mockVehicleId,
          'PRE_TRIP',
          50000,
          items,
        );

        expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
          where: { id: mockVehicleId },
          data: { mileage: 50000 },
        });
      });
    });

    describe('getInspectionHistory', () => {
      it('should return empty for new vehicle', async () => {
        const result = await service.getInspectionHistory('new-vehicle');

        expect(result).toEqual([]);
      });

      it('should return inspection history', async () => {
        mockPrismaService.vehicle.update.mockResolvedValue({});

        const checklist = service.getInspectionChecklist('PRE_TRIP');
        const items = checklist.map(item => ({ id: item.id, passed: true }));

        await service.submitInspection(
          mockDriverId,
          mockVehicleId,
          'PRE_TRIP',
          45000,
          items,
        );

        const result = await service.getInspectionHistory(mockVehicleId);

        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Offline Queue', () => {
    describe('queueOfflineOperation', () => {
      it('should queue an operation', () => {
        const result = service.queueOfflineOperation(
          mockDriverId,
          'LOCATION',
          { latitude: 48.137, longitude: 11.576 },
        );

        expect(result.id).toMatch(/^queue-\d+-\w+$/);
        expect(result.operation).toBe('LOCATION');
        expect(result.synced).toBe(false);
      });
    });

    describe('getQueueStatus', () => {
      it('should return queue status', () => {
        service.queueOfflineOperation(mockDriverId, 'LOCATION', {});
        service.queueOfflineOperation(mockDriverId, 'DELIVERY', {});

        const status = service.getQueueStatus(mockDriverId);

        expect(status.pending).toBe(2);
        expect(status.synced).toBe(0);
        expect(status.failed).toBe(0);
      });
    });

    describe('syncOfflineQueue', () => {
      it('should process queued operations', async () => {
        mockPrismaService.vehicle.update.mockResolvedValue({});
        mockPrismaService.deliveryStop.update.mockResolvedValue({});

        service.queueOfflineOperation(mockDriverId, 'LOCATION', {
          vehicleId: mockVehicleId,
          latitude: 48.137,
          longitude: 11.576,
          timestamp: new Date().toISOString(),
        });

        const result = await service.syncOfflineQueue(mockDriverId);

        expect(result.processed).toBeGreaterThanOrEqual(1);
      });

      it('should handle sync errors', async () => {
        mockPrismaService.vehicle.update.mockRejectedValue(new Error('DB error'));

        service.queueOfflineOperation(mockDriverId, 'LOCATION', {
          vehicleId: 'invalid',
          latitude: 48.137,
          longitude: 11.576,
          timestamp: new Date().toISOString(),
        });

        const result = await service.syncOfflineQueue(mockDriverId);

        expect(result.failed).toBeGreaterThan(0);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Daily Summary', () => {
    describe('getDailySummary', () => {
      it('should return daily summary', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);
        mockPrismaService.fuelLog.findMany.mockResolvedValue([
          { liters: { toNumber: () => 30 }, totalCost: { toNumber: () => 51 } },
        ]);

        const result = await service.getDailySummary(mockDriverId);

        expect(result.driverId).toBe(mockDriverId);
        expect(result.driverName).toBe('Hans Müller');
        expect(result.route).toBeDefined();
        expect(result.metrics.totalStops).toBe(3);
        expect(result.metrics.deliveredStops).toBe(2);
        expect(result.metrics.failedStops).toBe(1);
        expect(result.fuel.litersUsed).toBe(30);
        expect(result.fuel.cost).toBe(51);
      });

      it('should throw if driver not found', async () => {
        mockPrismaService.employee.findFirst.mockResolvedValue(null);

        await expect(service.getDailySummary(mockDriverId))
          .rejects.toThrow(NotFoundException);
      });

      it('should generate alerts for low success rate', async () => {
        const lowSuccessRoute = {
          ...mockRoute,
          stops: [
            { status: DeliveryStopStatus.DELIVERED },
            { status: DeliveryStopStatus.FAILED },
            { status: DeliveryStopStatus.FAILED },
            { status: DeliveryStopStatus.FAILED },
          ],
        };

        mockPrismaService.employee.findFirst.mockResolvedValue(mockEmployee);
        mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(lowSuccessRoute);
        mockPrismaService.fuelLog.findMany.mockResolvedValue([]);

        const result = await service.getDailySummary(mockDriverId);

        expect(result.alerts.length).toBeGreaterThan(0);
        expect(result.alerts.some(a => a.includes('Erfolgsquote'))).toBe(true);
      });
    });
  });

  describe('Customer Rating', () => {
    describe('generateRatingLink', () => {
      it('should generate a rating link', () => {
        const link = service.generateRatingLink(mockStopId, 'DPD123456');

        expect(link).toMatch(/^https:\/\/app\.documentiulia\.ro\/rate\//);
      });
    });

    describe('getPendingFeedback', () => {
      it('should return feedback statistics', async () => {
        mockPrismaService.deliveryStop.findMany.mockResolvedValue([
          { status: DeliveryStopStatus.DELIVERED },
          { status: DeliveryStopStatus.DELIVERED },
        ]);

        const result = await service.getPendingFeedback(mockDriverId);

        expect(result.totalDeliveries).toBe(2);
        expect(result.averageRating).toBeDefined();
      });
    });
  });

  describe('Announcements', () => {
    describe('getAnnouncements', () => {
      it('should return announcements with unread count', async () => {
        const result = await service.getAnnouncements(mockDriverId);

        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.unread).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
