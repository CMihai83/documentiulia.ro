import { Test, TestingModule } from '@nestjs/testing';
import { ProofOfDeliveryService } from './proof-of-delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProofOfDeliveryService', () => {
  let service: ProofOfDeliveryService;
  let prisma: jest.Mocked<PrismaService>;

  const mockStop = {
    id: 'stop-1',
    routeId: 'route-1',
    stopOrder: 1,
    recipientName: 'Max Mustermann',
    recipientPhone: '+49123456789',
    recipientEmail: 'max@example.com',
    streetAddress: 'Marienplatz 1',
    postalCode: '80331',
    city: 'München',
    parcelCount: 2,
    trackingNumbers: ['DPD123456'],
    status: 'DELIVERED',
    signature: null,
    photoUrl: null,
    recipientNote: null,
    completedAt: new Date('2025-12-08T14:30:00Z'),
    latitude: null,
    longitude: null,
    route: {
      id: 'route-1',
      userId: 'user-1',
      vehicle: {
        licensePlate: 'M-DL-1234',
        make: 'Mercedes',
        model: 'Sprinter',
      },
      driver: {
        firstName: 'Hans',
        lastName: 'Mueller',
      },
    },
  };

  const mockRoute = {
    id: 'route-1',
    userId: 'user-1',
    routeDate: new Date('2025-12-08'),
  };

  const validBase64Signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const validPhotoUrl = 'https://storage.example.com/photos/delivery-123.jpg';

  beforeEach(async () => {
    const mockPrisma = {
      deliveryStop: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      deliveryRoute: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProofOfDeliveryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProofOfDeliveryService>(ProofOfDeliveryService);
    prisma = module.get(PrismaService);
  });

  describe('captureSignature', () => {
    it('should capture a valid Base64 signature', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue({
        ...mockStop,
        signature: validBase64Signature,
      });

      const result = await service.captureSignature('stop-1', validBase64Signature);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Signature captured successfully');
      expect(prisma.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: 'stop-1' },
        data: expect.objectContaining({
          signature: validBase64Signature,
        }),
      });
    });

    it('should capture signature with signedBy name', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue(mockStop);

      const result = await service.captureSignature('stop-1', validBase64Signature, 'Maria Schmidt');

      expect(result.success).toBe(true);
      expect(prisma.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: 'stop-1' },
        data: expect.objectContaining({
          recipientNote: 'Signed by: Maria Schmidt',
        }),
      });
    });

    it('should throw NotFoundException if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.captureSignature('nonexistent', validBase64Signature),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid signature', async () => {
      await expect(
        service.captureSignature('stop-1', 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty signature', async () => {
      await expect(
        service.captureSignature('stop-1', ''),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearSignature', () => {
    it('should clear signature for a stop', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue({
        ...mockStop,
        signature: null,
      });

      const result = await service.clearSignature('stop-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Signature cleared');
      expect(prisma.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: 'stop-1' },
        data: { signature: null },
      });
    });

    it('should throw NotFoundException if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.clearSignature('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('capturePhoto', () => {
    it('should capture a valid photo URL', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue({
        ...mockStop,
        photoUrl: validPhotoUrl,
      });

      const result = await service.capturePhoto('stop-1', validPhotoUrl);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Photo captured successfully');
    });

    it('should capture photo with geo location', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue(mockStop);

      const geoLocation = { latitude: 48.1351, longitude: 11.5820 };
      const result = await service.capturePhoto('stop-1', validPhotoUrl, geoLocation);

      expect(result.success).toBe(true);
      expect(prisma.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: 'stop-1' },
        data: expect.objectContaining({
          photoUrl: validPhotoUrl,
          latitude: 48.1351,
          longitude: 11.5820,
        }),
      });
    });

    it('should accept data URL for photos', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue(mockStop);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = await service.capturePhoto('stop-1', dataUrl);

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      await expect(
        service.capturePhoto('stop-1', 'not-a-url'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.capturePhoto('nonexistent', validPhotoUrl),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearPhoto', () => {
    it('should clear photo for a stop', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue({
        ...mockStop,
        photoUrl: null,
      });

      const result = await service.clearPhoto('stop-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Photo cleared');
    });

    it('should throw NotFoundException if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.clearPhoto('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addRecipientNote', () => {
    it('should add a recipient note', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);
      (prisma.deliveryStop.update as jest.Mock).mockResolvedValue(mockStop);

      const result = await service.addRecipientNote('stop-1', 'Left at front door');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Note added successfully');
      expect(prisma.deliveryStop.update).toHaveBeenCalledWith({
        where: { id: 'stop-1' },
        data: { recipientNote: 'Left at front door' },
      });
    });

    it('should throw BadRequestException for empty note', async () => {
      await expect(
        service.addRecipientNote('stop-1', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for note exceeding 500 characters', async () => {
      const longNote = 'a'.repeat(501);
      await expect(
        service.addRecipientNote('stop-1', longNote),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addRecipientNote('nonexistent', 'Test note'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProofOfDelivery', () => {
    it('should return POD with signature and photo', async () => {
      const stopWithPOD = {
        ...mockStop,
        signature: validBase64Signature,
        photoUrl: validPhotoUrl,
        recipientNote: 'Received in good condition',
      };
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(stopWithPOD);

      const result = await service.getProofOfDelivery('stop-1');

      expect(result.stopId).toBe('stop-1');
      expect(result.hasSignature).toBe(true);
      expect(result.hasPhoto).toBe(true);
      expect(result.signature).toBe(validBase64Signature);
      expect(result.photoUrl).toBe(validPhotoUrl);
      expect(result.recipientNote).toBe('Received in good condition');
      expect(result.validation.isComplete).toBe(true);
    });

    it('should return POD without signature or photo', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);

      const result = await service.getProofOfDelivery('stop-1');

      expect(result.hasSignature).toBe(false);
      expect(result.hasPhoto).toBe(false);
      expect(result.validation.isComplete).toBe(false);
      expect(result.validation.missingFields).toContain('signature');
      expect(result.validation.missingFields).toContain('photo');
    });

    it('should throw NotFoundException if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProofOfDelivery('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validatePOD', () => {
    it('should mark as complete with signature only', () => {
      const validation = service.validatePOD({
        signature: validBase64Signature,
        photoUrl: null,
        recipientNote: null,
        completedAt: new Date(),
      });

      expect(validation.isComplete).toBe(true);
      expect(validation.hasSignature).toBe(true);
      expect(validation.hasPhoto).toBe(false);
      expect(validation.missingFields).toEqual([]);
    });

    it('should mark as complete with photo only', () => {
      const validation = service.validatePOD({
        signature: null,
        photoUrl: validPhotoUrl,
        recipientNote: null,
        completedAt: new Date(),
      });

      expect(validation.isComplete).toBe(true);
      expect(validation.hasPhoto).toBe(true);
    });

    it('should mark as incomplete without signature or photo', () => {
      const validation = service.validatePOD({
        signature: null,
        photoUrl: null,
        recipientNote: 'Some note',
        completedAt: new Date(),
      });

      expect(validation.isComplete).toBe(false);
      expect(validation.missingFields).toContain('signature');
      expect(validation.missingFields).toContain('photo');
    });
  });

  describe('generatePODDocument', () => {
    it('should generate HTML POD document', async () => {
      const stopWithPOD = {
        ...mockStop,
        signature: validBase64Signature,
        photoUrl: validPhotoUrl,
        recipientNote: 'Received',
      };
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(stopWithPOD);

      const result = await service.generatePODDocument('stop-1');

      expect(result.stopId).toBe('stop-1');
      expect(result.documentType).toBe('HTML');
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('ZUSTELLNACHWEIS');
      expect(result.content).toContain('Max Mustermann');
      expect(result.content).toContain('Marienplatz 1');
      expect(result.content).toContain('DPD123456');
      expect(result.metadata.recipientName).toBe('Max Mustermann');
      expect(result.metadata.vehiclePlate).toBe('M-DL-1234');
      expect(result.metadata.driverName).toBe('Hans Mueller');
    });

    it('should throw NotFoundException if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.generatePODDocument('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRoutePODSummary', () => {
    it('should return POD summary for a route', async () => {
      const stops = [
        { signature: validBase64Signature, photoUrl: validPhotoUrl, status: 'DELIVERED' },
        { signature: validBase64Signature, photoUrl: null, status: 'DELIVERED' },
        { signature: null, photoUrl: validPhotoUrl, status: 'DELIVERED' },
        { signature: null, photoUrl: null, status: 'DELIVERED' },
        { signature: null, photoUrl: null, status: 'PENDING' },
      ];
      (prisma.deliveryStop.findMany as jest.Mock).mockResolvedValue(stops);

      const result = await service.getRoutePODSummary('route-1');

      expect(result.totalDeliveries).toBe(4); // Only DELIVERED stops
      expect(result.withSignature).toBe(2);
      expect(result.withPhoto).toBe(2);
      expect(result.withBoth).toBe(1);
      expect(result.missingPOD).toBe(1);
      expect(result.completionRate).toBe(75); // 3/4 have at least one
    });

    it('should return zeros for route with no deliveries', async () => {
      (prisma.deliveryStop.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRoutePODSummary('route-1');

      expect(result.totalDeliveries).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });

  describe('getPODStats', () => {
    it('should return POD stats for date range', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        { id: 'route-1' },
        { id: 'route-2' },
      ]);
      (prisma.deliveryStop.findMany as jest.Mock).mockResolvedValue([
        { signature: validBase64Signature, photoUrl: validPhotoUrl },
        { signature: validBase64Signature, photoUrl: null },
        { signature: null, photoUrl: validPhotoUrl },
        { signature: null, photoUrl: null },
      ]);

      const from = new Date('2025-12-01');
      const to = new Date('2025-12-08');
      const result = await service.getPODStats('user-1', from, to);

      expect(result.routeCount).toBe(2);
      expect(result.totalDeliveries).toBe(4);
      expect(result.withSignature).toBe(2);
      expect(result.withPhoto).toBe(2);
      expect(result.withBoth).toBe(1);
      expect(result.missingPOD).toBe(1);
    });
  });

  describe('getStopsMissingPOD', () => {
    it('should return delivered stops without POD', async () => {
      const stopsWithoutPOD = [
        {
          id: 'stop-3',
          recipientName: 'Anna Schmidt',
          streetAddress: 'Leopoldstr. 10',
          postalCode: '80802',
          city: 'München',
          trackingNumbers: ['GLS789012'],
          completedAt: new Date('2025-12-08T15:00:00Z'),
        },
      ];
      (prisma.deliveryStop.findMany as jest.Mock).mockResolvedValue(stopsWithoutPOD);

      const result = await service.getStopsMissingPOD('route-1');

      expect(result).toHaveLength(1);
      expect(result[0].stopId).toBe('stop-3');
      expect(result[0].recipientName).toBe('Anna Schmidt');
      expect(result[0].address).toBe('Leopoldstr. 10, 80802 München');
      expect(result[0].trackingNumber).toBe('GLS789012');
    });

    it('should return empty array if all stops have POD', async () => {
      (prisma.deliveryStop.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStopsMissingPOD('route-1');

      expect(result).toHaveLength(0);
    });
  });
});
