import { Test, TestingModule } from '@nestjs/testing';
import { CustomerTrackingService } from './customer-tracking.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('CustomerTrackingService', () => {
  let service: CustomerTrackingService;
  let prisma: jest.Mocked<PrismaService>;

  const mockRoute = {
    id: 'route-1',
    status: 'IN_PROGRESS',
    deliveryZone: 'Munich-Schwabing',
    createdAt: new Date('2025-12-08T06:00:00Z'),
    actualStartTime: new Date('2025-12-08T08:00:00Z'),
    driver: {
      firstName: 'Hans',
      lastName: 'Mueller',
    },
    vehicle: {
      licensePlate: 'M-DL-1234',
      currentLat: new Decimal(48.1351),
      currentLng: new Decimal(11.5820),
      lastLocationAt: new Date(),
    },
    stops: [],
  };

  const mockStop = (options: Partial<any> = {}) => ({
    id: options.id || 'stop-1',
    trackingNumbers: options.trackingNumbers || ['DPD123456789'],
    status: options.status || 'PENDING',
    recipientName: options.recipientName || 'Max Mustermann',
    recipientEmail: options.recipientEmail || 'max@example.de',
    recipientPhone: options.recipientPhone || '+49 176 12345678',
    streetAddress: options.streetAddress || 'Leopoldstraße 100',
    postalCode: options.postalCode || '80802',
    city: options.city || 'München',
    estimatedArrival: options.estimatedArrival || new Date('2025-12-08T10:00:00Z'),
    actualArrival: options.actualArrival || null,
    completedAt: options.completedAt || null,
    signature: options.signature || null,
    photoUrl: options.photoUrl || null,
    recipientNote: options.recipientNote || null,
    failureNote: options.failureNote || null,
    stopOrder: options.stopOrder || 1,
    routeId: options.routeId || 'route-1',
    createdAt: options.createdAt || new Date('2025-12-07T14:00:00Z'),
    route: options.route || mockRoute,
  });

  beforeEach(async () => {
    const mockPrisma = {
      deliveryStop: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerTrackingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomerTrackingService>(CustomerTrackingService);
    prisma = module.get(PrismaService);
  });

  describe('trackDelivery', () => {
    it('should return tracking information for a valid tracking number', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());

      const result = await service.trackDelivery('DPD123456789', 'de');

      expect(result.trackingNumber).toBe('DPD123456789');
      expect(result.status).toBe('OUT_FOR_DELIVERY');
      expect(result.recipientName).toBe('Max Mustermann');
      expect(result.deliveryAddress.street).toBe('Leopoldstraße 100');
      expect(result.deliveryAddress.city).toBe('München');
      expect(result.timeline.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for invalid tracking number', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.trackDelivery('INVALID123', 'de')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return German status message by default', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());

      const result = await service.trackDelivery('DPD123456789', 'de');

      expect(result.statusMessage).toContain('Zustellung');
    });

    it('should return English status message when requested', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());

      const result = await service.trackDelivery('DPD123456789', 'en');

      expect(result.statusMessage).toContain('delivery');
    });

    it('should include driver info for active routes', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());

      const result = await service.trackDelivery('DPD123456789', 'de');

      expect(result.driverInfo).not.toBeNull();
      expect(result.driverInfo?.name).toContain('Hans');
    });

    it('should include POD info for delivered stops', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({
          status: 'DELIVERED',
          completedAt: new Date(),
          signature: 'sig-data',
          recipientNote: 'Signed by: Max M.',
        }),
      );

      const result = await service.trackDelivery('DPD123456789', 'de');

      expect(result.status).toBe('DELIVERED');
      expect(result.proofOfDelivery).not.toBeNull();
      expect(result.proofOfDelivery?.hasSignature).toBe(true);
      expect(result.proofOfDelivery?.signedBy).toBe('Max M.');
    });

    it('should map FAILED status correctly', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({
          status: 'FAILED',
          completedAt: new Date(),
          failureNote: 'Recipient not home',
        }),
      );

      const result = await service.trackDelivery('DPD123456789', 'de');

      expect(result.status).toBe('FAILED');
      expect(result.statusMessage).toContain('fehlgeschlagen');
    });
  });

  describe('trackMultiple', () => {
    it('should track multiple deliveries at once', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockStop({ trackingNumbers: ['TRACK1'] }))
        .mockResolvedValueOnce(mockStop({ trackingNumbers: ['TRACK2'] }));

      const results = await service.trackMultiple(['TRACK1', 'TRACK2'], 'de');

      expect(results.size).toBe(2);
      expect(results.has('TRACK1')).toBe(true);
      expect(results.has('TRACK2')).toBe(true);
    });

    it('should return error for invalid tracking numbers', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockStop({ trackingNumbers: ['VALID'] }))
        .mockResolvedValueOnce(null);

      const results = await service.trackMultiple(['VALID', 'INVALID'], 'de');

      expect(results.get('VALID')).toHaveProperty('trackingNumber');
      expect(results.get('INVALID')).toHaveProperty('error');
    });
  });

  describe('getEstimatedDeliveryTime', () => {
    it('should return estimated time and position', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue({
        ...mockStop(),
        route: {
          ...mockRoute,
          stops: [mockStop({ id: 'stop-1' }), mockStop({ id: 'stop-2' })],
        },
      });

      const result = await service.getEstimatedDeliveryTime('DPD123456789');

      expect(result.estimatedTime).not.toBeNull();
      expect(result.timeWindow).not.toBeNull();
      expect(result.remainingStops).toBeGreaterThan(0);
    });

    it('should return completed time for delivered stops', async () => {
      const completedAt = new Date();
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED', completedAt }),
      );

      const result = await service.getEstimatedDeliveryTime('DPD123456789');

      expect(result.estimatedTime).toEqual(completedAt);
      expect(result.timeWindow).toBeNull();
      expect(result.position).toBeNull();
    });
  });

  describe('setDeliveryPreferences', () => {
    it('should set delivery preferences', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue(mockStop());

      const prefs = await service.setDeliveryPreferences('DPD123456789', {
        leaveAtDoor: true,
        specialInstructions: 'Leave at back door',
      });

      expect(prefs.leaveAtDoor).toBe(true);
      expect(prefs.specialInstructions).toBe('Leave at back door');
    });

    it('should throw NotFoundException for invalid tracking number', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setDeliveryPreferences('INVALID', { leaveAtDoor: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for completed deliveries', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED' }),
      );

      await expect(
        service.setDeliveryPreferences('DPD123456789', { leaveAtDoor: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitRating', () => {
    it('should submit rating for delivered shipment', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED', completedAt: new Date() }),
      );

      const result = await service.submitRating('DPD123456789', {
        overallRating: 5,
        punctualityRating: 5,
        driverRating: 5,
        conditionRating: 5,
        comment: 'Great service!',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dank');
    });

    it('should throw NotFoundException for invalid tracking number', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.submitRating('INVALID', {
          overallRating: 5,
          punctualityRating: 5,
          driverRating: 5,
          conditionRating: 5,
          comment: null,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-delivered shipment', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'PENDING' }),
      );

      await expect(
        service.submitRating('DPD123456789', {
          overallRating: 5,
          punctualityRating: 5,
          driverRating: 5,
          conditionRating: 5,
          comment: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid ratings', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED', completedAt: new Date() }),
      );

      await expect(
        service.submitRating('DPD123456789', {
          overallRating: 6, // Invalid
          punctualityRating: 5,
          driverRating: 5,
          conditionRating: 5,
          comment: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate ratings', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED', completedAt: new Date() }),
      );

      // First rating
      await service.submitRating('DPD123456789', {
        overallRating: 5,
        punctualityRating: 5,
        driverRating: 5,
        conditionRating: 5,
        comment: null,
      });

      // Second rating should fail
      await expect(
        service.submitRating('DPD123456789', {
          overallRating: 4,
          punctualityRating: 4,
          driverRating: 4,
          conditionRating: 4,
          comment: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestReschedule', () => {
    it('should request reschedule for pending delivery', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue(mockStop());

      const preferredDate = new Date();
      preferredDate.setDate(preferredDate.getDate() + 1);

      const result = await service.requestReschedule(
        'DPD123456789',
        preferredDate,
        '10:00-12:00',
        'Not home today',
      );

      expect(result.success).toBe(true);
      expect(result.newEstimate).toEqual(preferredDate);
    });

    it('should throw NotFoundException for invalid tracking number', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(null);

      const preferredDate = new Date();
      preferredDate.setDate(preferredDate.getDate() + 1);

      await expect(
        service.requestReschedule('INVALID', preferredDate),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for delivered shipment', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED' }),
      );

      const preferredDate = new Date();
      preferredDate.setDate(preferredDate.getDate() + 1);

      await expect(
        service.requestReschedule('DPD123456789', preferredDate),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for past date', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        service.requestReschedule('DPD123456789', pastDate),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLiveDriverLocation', () => {
    it('should return driver location for active delivery', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(mockStop());
      (prisma.deliveryStop.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getLiveDriverLocation('DPD123456789');

      expect(result.available).toBe(true);
      expect(result.location).not.toBeNull();
      expect(result.location?.lat).toBeCloseTo(48.1351, 2);
      expect(result.estimatedMinutesAway).toBeGreaterThan(0);
    });

    it('should return unavailable for delivered stop', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED' }),
      );

      const result = await service.getLiveDriverLocation('DPD123456789');

      expect(result.available).toBe(false);
      expect(result.location).toBeNull();
    });

    it('should return unavailable for completed route', async () => {
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue({
        ...mockStop(),
        route: { ...mockRoute, status: 'COMPLETED' },
      });

      const result = await service.getLiveDriverLocation('DPD123456789');

      expect(result.available).toBe(false);
    });
  });

  describe('getDeliveryHistory', () => {
    it('should return delivery history for email', async () => {
      (prisma.deliveryStop.findMany as jest.Mock).mockResolvedValue([
        mockStop({ status: 'DELIVERED', completedAt: new Date() }),
        mockStop({ id: 'stop-2', trackingNumbers: ['DPD987654321'] }),
      ]);

      const history = await service.getDeliveryHistory('max@example.de');

      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('trackingNumber');
      expect(history[0]).toHaveProperty('status');
      expect(history[0]).toHaveProperty('address');
    });

    it('should respect limit parameter', async () => {
      (prisma.deliveryStop.findMany as jest.Mock).mockResolvedValue([mockStop()]);

      await service.getDeliveryHistory('max@example.de', 5);

      expect(prisma.deliveryStop.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('getRatingStatistics', () => {
    it('should return empty stats when no ratings', async () => {
      const stats = await service.getRatingStatistics();

      expect(stats.averageRating).toBe(0);
      expect(stats.totalRatings).toBe(0);
    });

    it('should calculate aggregate statistics', async () => {
      // Submit some ratings first
      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({ status: 'DELIVERED', completedAt: new Date() }),
      );

      await service.submitRating('TRACK1', {
        overallRating: 5,
        punctualityRating: 5,
        driverRating: 4,
        conditionRating: 5,
        comment: null,
      });

      (prisma.deliveryStop.findFirst as jest.Mock).mockResolvedValue(
        mockStop({
          status: 'DELIVERED',
          completedAt: new Date(),
          trackingNumbers: ['TRACK2'],
        }),
      );

      await service.submitRating('TRACK2', {
        overallRating: 4,
        punctualityRating: 4,
        driverRating: 5,
        conditionRating: 4,
        comment: 'Good',
      });

      const stats = await service.getRatingStatistics();

      expect(stats.totalRatings).toBe(2);
      expect(stats.averageRating).toBe(4.5);
      expect(stats.ratingDistribution[5]).toBe(1);
      expect(stats.ratingDistribution[4]).toBe(1);
    });
  });
});
