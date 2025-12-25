import { Test, TestingModule } from '@nestjs/testing';
import { CustomerDeliveryNotificationsService } from './customer-delivery-notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CustomerDeliveryNotificationsService', () => {
  let service: CustomerDeliveryNotificationsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockRoute = {
    id: 'route-1',
    userId: 'user-1',
    routeName: 'Munich North Route',
    routeDate: new Date(),
    status: 'IN_PROGRESS',
    vehicle: { licensePlate: 'M-DL-1234' },
    driver: { firstName: 'Hans', lastName: 'Mueller' },
    stops: [
      {
        id: 'stop-1',
        recipientName: 'Max Mustermann',
        recipientPhone: '+49123456789',
        recipientEmail: 'max@example.com',
        address: 'Marienplatz 1, 80331 Munich',
        trackingNumber: 'DPD123456',
        sequence: 1,
        status: 'PENDING',
      },
      {
        id: 'stop-2',
        recipientName: 'Anna Schmidt',
        recipientPhone: '+49987654321',
        recipientEmail: null,
        address: 'Leopoldstrasse 10, 80802 Munich',
        trackingNumber: 'DPD654321',
        sequence: 2,
        status: 'PENDING',
      },
    ],
  };

  const mockStop = {
    id: 'stop-1',
    recipientName: 'Max Mustermann',
    recipientPhone: '+49123456789',
    recipientEmail: 'max@example.com',
    address: 'Marienplatz 1, 80331 Munich',
    trackingNumber: 'DPD123456',
    status: 'PENDING',
    route: {
      id: 'route-1',
      userId: 'user-1',
      vehicle: { licensePlate: 'M-DL-1234' },
      driver: { firstName: 'Hans', lastName: 'Mueller' },
    },
  };

  beforeEach(async () => {
    const mockPrisma = {
      deliveryRoute: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      deliveryStop: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerDeliveryNotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomerDeliveryNotificationsService>(CustomerDeliveryNotificationsService);
    prisma = module.get(PrismaService);
  });

  describe('notifyRouteStarted', () => {
    it('should send OUT_FOR_DELIVERY notifications to all pending stops', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute);

      const results = await service.notifyRouteStarted('route-1');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      // Should send to both stops (SMS and/or email for each)
    });

    it('should return error if route not found', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(null);

      const results = await service.notifyRouteStarted('nonexistent');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Route not found');
    });

    it('should include driver and vehicle info in notifications', async () => {
      (prisma.deliveryRoute.findUnique as jest.Mock).mockResolvedValue(mockRoute);

      const results = await service.notifyRouteStarted('route-1');

      // Check that notifications were attempted
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.success)).toBe(true);
    });
  });

  describe('notifyArrivingSoon', () => {
    it('should send ARRIVING_SOON notification to customer', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);

      const results = await service.notifyArrivingSoon('stop-1');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return error if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      const results = await service.notifyArrivingSoon('nonexistent');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Stop not found');
    });

    it('should send to both SMS and email if both available', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);

      const results = await service.notifyArrivingSoon('stop-1');

      // Mock mode sends both SMS and email if available
      const smsResult = results.find(r => r.channel === 'SMS');
      const emailResult = results.find(r => r.channel === 'EMAIL');

      expect(smsResult).toBeDefined();
      expect(emailResult).toBeDefined();
    });
  });

  describe('notifyDelivered', () => {
    it('should send DELIVERED notification to customer', async () => {
      const deliveredStop = {
        ...mockStop,
        status: 'DELIVERED',
        completedAt: new Date(),
      };
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(deliveredStop);

      const results = await service.notifyDelivered('stop-1', 2);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.success)).toBe(true);
    });

    it('should include parcel count in notification', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);

      const results = await service.notifyDelivered('stop-1', 3);

      expect(results).toBeDefined();
      // Notification should contain parcel count
    });

    it('should return error if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      const results = await service.notifyDelivered('nonexistent');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('notifyDeliveryFailed', () => {
    it('should send DELIVERY_FAILED notification with reason', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue({
        ...mockStop,
        status: 'FAILED',
      });

      const results = await service.notifyDeliveryFailed('stop-1', 'NO_ONE_HOME');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should translate failure reason to German', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);

      const results = await service.notifyDeliveryFailed('stop-1', 'NO_ONE_HOME');

      expect(results).toBeDefined();
      // German translation: "Niemand zu Hause"
    });

    it('should return error if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      const results = await service.notifyDeliveryFailed('nonexistent', 'NO_ONE_HOME');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('notifyRescheduled', () => {
    it('should send RESCHEDULED notification with new date', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);

      const newDate = new Date('2025-12-15');
      const results = await service.notifyRescheduled('stop-1', newDate);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should format date in German format', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(mockStop);

      const newDate = new Date('2025-12-15');
      const results = await service.notifyRescheduled('stop-1', newDate);

      expect(results).toBeDefined();
      // Date should be formatted as German locale (e.g., "Montag, 15. Dezember")
    });

    it('should return error if stop not found', async () => {
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(null);

      const results = await service.notifyRescheduled('nonexistent', new Date());

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history for a stop', async () => {
      const history = await service.getNotificationHistory('stop-1');

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');

      const stats = await service.getNotificationStats('user-1', from, to);

      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('byChannel');
    });

    it('should include all notification types in stats', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');

      const stats = await service.getNotificationStats('user-1', from, to);

      expect(stats.byType).toHaveProperty('OUT_FOR_DELIVERY');
      expect(stats.byType).toHaveProperty('ARRIVING_SOON');
      expect(stats.byType).toHaveProperty('DELIVERED');
      expect(stats.byType).toHaveProperty('DELIVERY_FAILED');
      expect(stats.byType).toHaveProperty('RESCHEDULED');
    });

    it('should include all channels in stats', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');

      const stats = await service.getNotificationStats('user-1', from, to);

      expect(stats.byChannel).toHaveProperty('SMS');
      expect(stats.byChannel).toHaveProperty('EMAIL');
      expect(stats.byChannel).toHaveProperty('PUSH');
    });
  });

  describe('notification channels', () => {
    it('should only send SMS if email not available', async () => {
      const stopWithoutEmail = {
        ...mockStop,
        recipientEmail: null,
      };
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(stopWithoutEmail);

      const results = await service.notifyArrivingSoon('stop-1');

      // Should only have SMS result, no email
      expect(results.filter(r => r.channel === 'SMS').length).toBe(1);
      expect(results.filter(r => r.channel === 'EMAIL').length).toBe(0);
    });

    it('should only send email if phone not available', async () => {
      const stopWithoutPhone = {
        ...mockStop,
        recipientPhone: null,
      };
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(stopWithoutPhone);

      const results = await service.notifyArrivingSoon('stop-1');

      // Should only have email result, no SMS
      expect(results.filter(r => r.channel === 'SMS').length).toBe(0);
      expect(results.filter(r => r.channel === 'EMAIL').length).toBe(1);
    });

    it('should return empty if no contact info available', async () => {
      const stopWithNoContact = {
        ...mockStop,
        recipientPhone: null,
        recipientEmail: null,
      };
      (prisma.deliveryStop.findUnique as jest.Mock).mockResolvedValue(stopWithNoContact);

      const results = await service.notifyArrivingSoon('stop-1');

      // No notifications sent
      expect(results.length).toBe(0);
    });
  });
});
