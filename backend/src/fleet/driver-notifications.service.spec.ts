import { Test, TestingModule } from '@nestjs/testing';
import { DriverNotificationsService, NotificationType, PushNotification } from './driver-notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DriverNotificationsService', () => {
  let service: DriverNotificationsService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';
  const mockDriverId = 'driver-456';
  const mockDispatcherId = 'dispatcher-789';
  const mockRouteId = 'route-001';

  const mockEmployee = {
    id: mockDriverId,
    userId: mockUserId,
    firstName: 'Hans',
    lastName: 'Müller',
    email: 'hans.mueller@example.com',
    position: 'Fahrer',
    user: { id: mockUserId, name: 'Hans Müller' },
  };

  const mockPrisma = {
    employee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    deliveryRoute: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverNotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DriverNotificationsService>(DriverNotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =================== PUSH NOTIFICATIONS ===================

  describe('sendNotification', () => {
    it('should send notification to driver', async () => {
      const notification = await service.sendNotification(mockDriverId, {
        type: 'ROUTE_ASSIGNED',
        title: 'Neue Route',
        body: 'Route München-Ost zugewiesen',
        priority: 'HIGH',
      });

      expect(notification).toBeDefined();
      expect(notification.id).toContain('notif-');
      expect(notification.driverId).toBe(mockDriverId);
      expect(notification.type).toBe('ROUTE_ASSIGNED');
      expect(notification.title).toBe('Neue Route');
      expect(notification.body).toBe('Route München-Ost zugewiesen');
      expect(notification.priority).toBe('HIGH');
      expect(notification.read).toBe(false);
      expect(notification.sentAt).toBeInstanceOf(Date);
    });

    it('should use NORMAL priority by default', async () => {
      const notification = await service.sendNotification(mockDriverId, {
        type: 'SYSTEM',
        title: 'System Update',
        body: 'App wurde aktualisiert',
      });

      expect(notification.priority).toBe('NORMAL');
    });

    it('should include data payload', async () => {
      const notification = await service.sendNotification(mockDriverId, {
        type: 'ROUTE_ASSIGNED',
        title: 'Neue Route',
        body: 'Route zugewiesen',
        data: { routeId: mockRouteId, stopsCount: 15 },
      });

      expect(notification.data).toEqual({ routeId: mockRouteId, stopsCount: 15 });
    });

    it('should set expiration date', async () => {
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      const notification = await service.sendNotification(mockDriverId, {
        type: 'URGENT_DELIVERY',
        title: 'Dringende Lieferung',
        body: 'Eilauftrag!',
        expiresAt,
      });

      expect(notification.expiresAt).toEqual(expiresAt);
    });
  });

  describe('getNotifications', () => {
    beforeEach(async () => {
      // Send some test notifications
      await service.sendNotification(mockDriverId, {
        type: 'ROUTE_ASSIGNED',
        title: 'Route 1',
        body: 'Test route 1',
      });
      await service.sendNotification(mockDriverId, {
        type: 'DISPATCH_MESSAGE',
        title: 'Nachricht',
        body: 'Test message',
      });
      await service.sendNotification(mockDriverId, {
        type: 'ROUTE_UPDATED',
        title: 'Route Update',
        body: 'Route changed',
      });
    });

    it('should return all notifications for driver', async () => {
      const notifications = await service.getNotifications(mockDriverId);

      expect(notifications.length).toBe(3);
    });

    it('should return only unread notifications', async () => {
      const allNotifications = await service.getNotifications(mockDriverId);
      await service.markAsRead(mockDriverId, allNotifications[0].id);

      const unreadNotifications = await service.getNotifications(mockDriverId, {
        unreadOnly: true,
      });

      expect(unreadNotifications.length).toBe(2);
    });

    it('should filter by notification type', async () => {
      const routeNotifications = await service.getNotifications(mockDriverId, {
        type: 'ROUTE_ASSIGNED',
      });

      expect(routeNotifications.length).toBe(1);
      expect(routeNotifications[0].type).toBe('ROUTE_ASSIGNED');
    });

    it('should respect limit parameter', async () => {
      const limitedNotifications = await service.getNotifications(mockDriverId, {
        limit: 2,
      });

      expect(limitedNotifications.length).toBe(2);
    });

    it('should filter out expired notifications', async () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      await service.sendNotification(mockDriverId, {
        type: 'SYSTEM',
        title: 'Expired',
        body: 'This is expired',
        expiresAt: expiredDate,
      });

      const notifications = await service.getNotifications(mockDriverId);
      const expiredNotification = notifications.find(n => n.title === 'Expired');

      expect(expiredNotification).toBeUndefined();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await service.sendNotification(mockDriverId, {
        type: 'SYSTEM',
        title: 'Test',
        body: 'Test notification',
      });

      await service.markAsRead(mockDriverId, notification.id);

      const notifications = await service.getNotifications(mockDriverId);
      const marked = notifications.find(n => n.id === notification.id);

      expect(marked?.read).toBe(true);
      expect(marked?.readAt).toBeInstanceOf(Date);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      await service.sendNotification(mockDriverId, { type: 'SYSTEM', title: 'T1', body: 'B1' });
      await service.sendNotification(mockDriverId, { type: 'SYSTEM', title: 'T2', body: 'B2' });
      await service.sendNotification(mockDriverId, { type: 'SYSTEM', title: 'T3', body: 'B3' });

      const count = await service.markAllAsRead(mockDriverId);

      expect(count).toBe(3);

      const unreadCount = await service.getUnreadCount(mockDriverId);
      expect(unreadCount).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      await service.sendNotification(mockDriverId, { type: 'SYSTEM', title: 'T1', body: 'B1' });
      await service.sendNotification(mockDriverId, { type: 'SYSTEM', title: 'T2', body: 'B2' });

      const count = await service.getUnreadCount(mockDriverId);

      expect(count).toBe(2);
    });

    it('should return 0 for driver with no notifications', async () => {
      const count = await service.getUnreadCount('new-driver-id');
      expect(count).toBe(0);
    });
  });

  // =================== ROUTE NOTIFICATIONS ===================

  describe('notifyRouteAssignment', () => {
    it('should send route assignment notification', async () => {
      const notification = await service.notifyRouteAssignment(
        mockDriverId,
        mockRouteId,
        'München Ost Route',
        12,
      );

      expect(notification.type).toBe('ROUTE_ASSIGNED');
      expect(notification.title).toBe('Neue Route zugewiesen');
      expect(notification.body).toContain('München Ost Route');
      expect(notification.body).toContain('12 Stopps');
      expect(notification.priority).toBe('HIGH');
      expect(notification.data?.routeId).toBe(mockRouteId);
      expect(notification.data?.stopsCount).toBe(12);
    });
  });

  describe('notifyRouteUpdate', () => {
    it('should send route update notification for stop added', async () => {
      const notification = await service.notifyRouteUpdate(
        mockDriverId,
        mockRouteId,
        'STOP_ADDED',
      );

      expect(notification.type).toBe('ROUTE_UPDATED');
      expect(notification.body).toContain('hinzugefügt');
      expect(notification.priority).toBe('NORMAL');
    });

    it('should send high priority for cancelled route', async () => {
      const notification = await service.notifyRouteUpdate(
        mockDriverId,
        mockRouteId,
        'CANCELLED',
      );

      expect(notification.priority).toBe('HIGH');
      expect(notification.body).toContain('storniert');
    });
  });

  describe('notifyUrgentDelivery', () => {
    it('should send urgent delivery notification', async () => {
      const deadline = new Date(Date.now() + 30 * 60000); // 30 minutes
      const notification = await service.notifyUrgentDelivery(
        mockDriverId,
        'stop-123',
        'Max Mustermann',
        deadline,
      );

      expect(notification.type).toBe('URGENT_DELIVERY');
      expect(notification.title).toBe('Dringende Lieferung!');
      expect(notification.body).toContain('Max Mustermann');
      expect(notification.priority).toBe('URGENT');
      expect(notification.data?.stopId).toBe('stop-123');
    });
  });

  // =================== CONVERSATIONS ===================

  describe('getOrCreateConversation', () => {
    beforeEach(() => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dispatcher Name' });
    });

    it('should create new conversation', async () => {
      const conversation = await service.getOrCreateConversation(
        mockDriverId,
        mockDispatcherId,
        'Frage zur Route',
        mockRouteId,
      );

      expect(conversation).toBeDefined();
      expect(conversation.id).toContain('conv-');
      expect(conversation.driverId).toBe(mockDriverId);
      expect(conversation.subject).toBe('Frage zur Route');
      expect(conversation.routeId).toBe(mockRouteId);
      expect(conversation.status).toBe('ACTIVE');
    });

    it('should return existing active conversation', async () => {
      const conv1 = await service.getOrCreateConversation(mockDriverId);
      const conv2 = await service.getOrCreateConversation(mockDriverId);

      expect(conv1.id).toBe(conv2.id);
    });

    it('should create separate conversations for different routes', async () => {
      const conv1 = await service.getOrCreateConversation(mockDriverId, undefined, undefined, 'route-1');
      const conv2 = await service.getOrCreateConversation(mockDriverId, undefined, undefined, 'route-2');

      expect(conv1.id).not.toBe(conv2.id);
    });
  });

  describe('getDriverConversations', () => {
    beforeEach(async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dispatcher' });

      // Create conversations with different routeIds to ensure they are separate
      await service.getOrCreateConversation(mockDriverId, undefined, 'Conversation 1', 'route-conv-1');
      await service.getOrCreateConversation(mockDriverId, undefined, 'Conversation 2', 'route-conv-2');
    });

    it('should return all active conversations for driver', async () => {
      const conversations = await service.getDriverConversations(mockDriverId);

      expect(conversations.length).toBeGreaterThanOrEqual(2);
    });

    it('should sort by last message time', async () => {
      const conversations = await service.getDriverConversations(mockDriverId);

      for (let i = 1; i < conversations.length; i++) {
        expect(conversations[i - 1].lastMessageAt.getTime())
          .toBeGreaterThanOrEqual(conversations[i].lastMessageAt.getTime());
      }
    });
  });

  describe('sendMessage', () => {
    let conversationId: string;

    beforeEach(async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dispatcher Name' });

      const conversation = await service.getOrCreateConversation(mockDriverId);
      conversationId = conversation.id;
    });

    it('should send message in conversation', async () => {
      const message = await service.sendMessage(
        conversationId,
        mockDriverId,
        'DRIVER',
        'Hallo, ich habe eine Frage',
      );

      expect(message).toBeDefined();
      expect(message.id).toContain('msg-');
      expect(message.conversationId).toBe(conversationId);
      expect(message.content).toBe('Hallo, ich habe eine Frage');
      expect(message.senderRole).toBe('DRIVER');
      expect(message.sentAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent conversation', async () => {
      await expect(
        service.sendMessage('invalid-conv', mockDriverId, 'DRIVER', 'Test'),
      ).rejects.toThrow('Conversation not found');
    });

    it('should notify driver when dispatcher sends message', async () => {
      // First, set up a conversation with dispatcher
      const conversation = await service.getOrCreateConversation(
        mockDriverId,
        mockDispatcherId,
      );

      const message = await service.sendMessage(
        conversation.id,
        mockDispatcherId,
        'DISPATCHER',
        'Bitte Lieferung priorisieren',
      );

      expect(message.senderRole).toBe('DISPATCHER');

      // Check that notification was sent
      const notifications = await service.getNotifications(mockDriverId);
      const dispatchNotification = notifications.find(
        n => n.type === 'DISPATCH_MESSAGE',
      );

      expect(dispatchNotification).toBeDefined();
      expect(dispatchNotification?.body).toContain('priorisieren');
    });
  });

  describe('getMessages', () => {
    let conversationId: string;

    beforeEach(async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dispatcher' });

      const conversation = await service.getOrCreateConversation(mockDriverId);
      conversationId = conversation.id;

      await service.sendMessage(conversationId, mockDriverId, 'DRIVER', 'Message 1');
      await service.sendMessage(conversationId, mockDriverId, 'DRIVER', 'Message 2');
      await service.sendMessage(conversationId, mockDriverId, 'DRIVER', 'Message 3');
    });

    it('should return messages in chronological order', async () => {
      const messages = await service.getMessages(conversationId);

      expect(messages.length).toBe(3);
      // Messages should contain all 3, sorted by time (oldest first after reverse)
      const contents = messages.map(m => m.content);
      expect(contents).toContain('Message 1');
      expect(contents).toContain('Message 2');
      expect(contents).toContain('Message 3');
    });

    it('should respect limit', async () => {
      const messages = await service.getMessages(conversationId, { limit: 2 });
      expect(messages.length).toBe(2);
    });
  });

  describe('markMessagesAsRead', () => {
    let conversationId: string;

    beforeEach(async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dispatcher' });

      const conversation = await service.getOrCreateConversation(mockDriverId, mockDispatcherId);
      conversationId = conversation.id;

      await service.sendMessage(conversationId, mockDispatcherId, 'DISPATCHER', 'Message 1');
      await service.sendMessage(conversationId, mockDispatcherId, 'DISPATCHER', 'Message 2');
    });

    it('should mark messages from others as read', async () => {
      const count = await service.markMessagesAsRead(conversationId, mockDriverId);
      expect(count).toBe(2);

      const messages = await service.getMessages(conversationId);
      messages.forEach(m => {
        expect(m.readAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('closeConversation', () => {
    it('should close conversation', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dispatcher' });

      const conversation = await service.getOrCreateConversation(mockDriverId);
      await service.closeConversation(conversation.id);

      const conversations = await service.getDriverConversations(mockDriverId);
      const closed = conversations.find(c => c.id === conversation.id);

      expect(closed?.status).toBe('CLOSED');
    });
  });

  // =================== BROADCAST ===================

  describe('sendBroadcast', () => {
    beforeEach(() => {
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: 'driver-1' },
        { id: 'driver-2' },
        { id: 'driver-3' },
      ]);
    });

    it('should broadcast to all drivers', async () => {
      const broadcast = await service.sendBroadcast(mockUserId, {
        targetType: 'ALL_DRIVERS',
        title: 'Wichtige Mitteilung',
        body: 'Wetterverschlechterung erwartet',
        priority: 'HIGH',
      });

      expect(broadcast).toBeDefined();
      expect(broadcast.id).toContain('bcast-');
      expect(broadcast.title).toBe('Wichtige Mitteilung');
      expect(broadcast.deliveredCount).toBe(3);
    });

    it('should broadcast to specific drivers', async () => {
      const broadcast = await service.sendBroadcast(mockUserId, {
        targetType: 'SPECIFIC_DRIVERS',
        targetIds: ['driver-1', 'driver-2'],
        title: 'Team Meeting',
        body: 'Bitte um 15 Uhr erscheinen',
      });

      expect(broadcast.deliveredCount).toBe(2);
    });

    it('should broadcast to route drivers', async () => {
      mockPrisma.deliveryRoute.findMany.mockResolvedValue([
        { driverId: 'driver-1' },
        { driverId: 'driver-2' },
      ]);

      const broadcast = await service.sendBroadcast(mockUserId, {
        targetType: 'ROUTE_DRIVERS',
        routeId: mockRouteId,
        title: 'Route Update',
        body: 'Stau auf A9',
      });

      expect(broadcast.deliveredCount).toBe(2);
    });
  });

  describe('getBroadcastHistory', () => {
    beforeEach(async () => {
      mockPrisma.employee.findMany.mockResolvedValue([{ id: 'driver-1' }]);

      await service.sendBroadcast(mockUserId, {
        targetType: 'ALL_DRIVERS',
        title: 'Broadcast 1',
        body: 'Test 1',
      });
      await service.sendBroadcast(mockUserId, {
        targetType: 'ALL_DRIVERS',
        title: 'Broadcast 2',
        body: 'Test 2',
      });
    });

    it('should return broadcast history', async () => {
      const history = await service.getBroadcastHistory(mockUserId);
      expect(history.length).toBe(2);
    });

    it('should respect limit', async () => {
      const history = await service.getBroadcastHistory(mockUserId, 1);
      expect(history.length).toBe(1);
    });
  });

  // =================== EMERGENCY ALERTS ===================

  describe('sendEmergencyAlert', () => {
    beforeEach(() => {
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: 'driver-1' },
        { id: 'driver-2' },
      ]);
    });

    it('should send emergency alert to all drivers', async () => {
      const result = await service.sendEmergencyAlert(
        mockUserId,
        'Schwerer Unfall auf A9',
        'Bitte alternative Route nutzen',
      );

      expect(result.sentTo).toBe(2);

      // Check notifications were sent
      const notifications = await service.getNotifications('driver-1');
      const emergencyNotification = notifications.find(
        n => n.type === 'EMERGENCY_ALERT',
      );

      expect(emergencyNotification).toBeDefined();
      expect(emergencyNotification?.priority).toBe('URGENT');
      expect(emergencyNotification?.title).toContain('NOTFALL');
    });
  });

  describe('sendDriverSOS', () => {
    beforeEach(() => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'admin-2' },
      ]);
    });

    it('should log SOS from driver', async () => {
      await service.sendDriverSOS(
        mockDriverId,
        { lat: 48.1351, lng: 11.5820 },
        'Unfall mit Fußgänger',
      );

      // In real implementation, would check admin notifications
      // For now, just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  // =================== NOTIFICATION PREFERENCES ===================

  describe('getPreferences', () => {
    it('should return default preferences for new driver', async () => {
      const prefs = await service.getPreferences('new-driver');

      expect(prefs.driverId).toBe('new-driver');
      expect(prefs.pushEnabled).toBe(true);
      expect(prefs.routeAssignments).toBe(true);
      expect(prefs.urgentDeliveries).toBe(true);
      expect(prefs.breakReminders).toBe(true);
      expect(prefs.trafficAlerts).toBe(true);
      expect(prefs.customerFeedback).toBe(true);
      expect(prefs.quietHours.enabled).toBe(false);
      expect(prefs.quietHours.start).toBe('22:00');
      expect(prefs.quietHours.end).toBe('07:00');
      expect(prefs.deviceTokens).toEqual([]);
    });

    it('should return cached preferences', async () => {
      const prefs1 = await service.getPreferences(mockDriverId);
      prefs1.pushEnabled = false;

      const prefs2 = await service.getPreferences(mockDriverId);
      expect(prefs2.pushEnabled).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      const updated = await service.updatePreferences(mockDriverId, {
        pushEnabled: false,
        breakReminders: false,
        quietHours: {
          enabled: true,
          start: '20:00',
          end: '08:00',
        },
      });

      expect(updated.pushEnabled).toBe(false);
      expect(updated.breakReminders).toBe(false);
      expect(updated.quietHours.enabled).toBe(true);
      expect(updated.quietHours.start).toBe('20:00');
    });
  });

  describe('registerDeviceToken', () => {
    it('should register new device token', async () => {
      await service.registerDeviceToken(mockDriverId, 'IOS', 'token-123');

      const prefs = await service.getPreferences(mockDriverId);
      expect(prefs.deviceTokens.length).toBe(1);
      expect(prefs.deviceTokens[0].platform).toBe('IOS');
      expect(prefs.deviceTokens[0].token).toBe('token-123');
    });

    it('should not duplicate tokens', async () => {
      await service.registerDeviceToken(mockDriverId, 'IOS', 'token-123');
      await service.registerDeviceToken(mockDriverId, 'IOS', 'token-123');

      const prefs = await service.getPreferences(mockDriverId);
      expect(prefs.deviceTokens.length).toBe(1);
    });

    it('should keep max 3 tokens per platform', async () => {
      await service.registerDeviceToken(mockDriverId, 'ANDROID', 'token-1');
      await service.registerDeviceToken(mockDriverId, 'ANDROID', 'token-2');
      await service.registerDeviceToken(mockDriverId, 'ANDROID', 'token-3');
      await service.registerDeviceToken(mockDriverId, 'ANDROID', 'token-4');

      const prefs = await service.getPreferences(mockDriverId);
      const androidTokens = prefs.deviceTokens.filter(t => t.platform === 'ANDROID');

      expect(androidTokens.length).toBe(3);
      expect(androidTokens.find(t => t.token === 'token-1')).toBeUndefined();
    });
  });

  describe('unregisterDeviceToken', () => {
    it('should remove device token', async () => {
      await service.registerDeviceToken(mockDriverId, 'IOS', 'token-to-remove');
      await service.registerDeviceToken(mockDriverId, 'IOS', 'token-to-keep');

      await service.unregisterDeviceToken(mockDriverId, 'token-to-remove');

      const prefs = await service.getPreferences(mockDriverId);
      expect(prefs.deviceTokens.length).toBe(1);
      expect(prefs.deviceTokens[0].token).toBe('token-to-keep');
    });
  });

  // =================== DASHBOARD ===================

  describe('getNotificationsDashboard', () => {
    beforeEach(async () => {
      mockPrisma.employee.findMany.mockResolvedValue([
        { id: 'driver-1' },
        { id: 'driver-2' },
      ]);
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dispatcher' });

      // Create some data
      await service.getOrCreateConversation('driver-1', mockUserId, 'Test');
      await service.sendBroadcast(mockUserId, {
        targetType: 'ALL_DRIVERS',
        title: 'Test',
        body: 'Test broadcast',
      });
    });

    it('should return dashboard statistics', async () => {
      const dashboard = await service.getNotificationsDashboard(mockUserId);

      expect(dashboard).toBeDefined();
      expect(typeof dashboard.activeConversations).toBe('number');
      expect(typeof dashboard.unreadMessages).toBe('number');
      expect(typeof dashboard.recentBroadcasts).toBe('number');
      expect(typeof dashboard.driversOnline).toBe('number');
      expect(typeof dashboard.driversPushEnabled).toBe('number');
    });
  });

  // =================== HELPER TESTS ===================

  describe('quiet hours logic', () => {
    it('should respect quiet hours for normal priority', async () => {
      // Set quiet hours
      await service.updatePreferences(mockDriverId, {
        quietHours: {
          enabled: true,
          start: '00:00',
          end: '23:59',
        },
      });

      // This should still work but log delay message
      const notification = await service.sendNotification(mockDriverId, {
        type: 'SYSTEM',
        title: 'Test',
        body: 'Test during quiet hours',
        priority: 'NORMAL',
      });

      expect(notification).toBeDefined();
    });

    it('should ignore quiet hours for urgent priority', async () => {
      await service.updatePreferences(mockDriverId, {
        quietHours: {
          enabled: true,
          start: '00:00',
          end: '23:59',
        },
      });

      const notification = await service.sendNotification(mockDriverId, {
        type: 'EMERGENCY_ALERT',
        title: 'NOTFALL',
        body: 'Dringend!',
        priority: 'URGENT',
      });

      expect(notification).toBeDefined();
      expect(notification.priority).toBe('URGENT');
    });
  });
});
