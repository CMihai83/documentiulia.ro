import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                WS_PORT: 3001,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    service.resetState();
    await service.onModuleDestroy();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize system rooms', () => {
      const announcementRoom = service.getRoom('system:announcements');
      expect(announcementRoom).toBeDefined();
      expect(announcementRoom?.type).toBe('broadcast');
    });
  });

  // ============================================
  // CLIENT CONNECTION TESTS
  // ============================================

  describe('Client Connection Management', () => {
    it('should connect a client', () => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      expect(client).toBeDefined();
      expect(client.id).toBeDefined();
      expect(client.userId).toBe('user-1');
      expect(client.tenantId).toBe('tenant-1');
      expect(client.presence).toBe('online');
    });

    it('should auto-join tenant room on connect', () => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      expect(client.rooms.has('tenant:tenant-1')).toBe(true);
    });

    it('should auto-join system rooms on connect', () => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      expect(client.rooms.has('system:announcements')).toBe(true);
    });

    it('should disconnect a client', () => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.disconnectClient(client.id);
      expect(service.getClient(client.id)).toBeUndefined();
    });

    it('should update heartbeat', () => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const initialHeartbeat = client.lastHeartbeat;
      service.heartbeat(client.id);
      const updatedClient = service.getClient(client.id);

      expect(updatedClient?.lastHeartbeat.getTime()).toBeGreaterThanOrEqual(initialHeartbeat.getTime());
    });

    it('should get clients by user', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.connectClient({
        socketId: 'socket-2',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const clients = service.getClientsByUser('user-1');
      expect(clients.length).toBe(2);
    });

    it('should get clients by tenant', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.connectClient({
        socketId: 'socket-2',
        userId: 'user-2',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const clients = service.getClientsByTenant('tenant-1');
      expect(clients.length).toBe(2);
    });

    it('should update metrics on connect', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const metrics = service.getMetrics();
      expect(metrics.totalConnections).toBe(1);
      expect(metrics.activeConnections).toBe(1);
    });
  });

  // ============================================
  // ROOM MANAGEMENT TESTS
  // ============================================

  describe('Room Management', () => {
    let clientId: string;

    beforeEach(() => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });
      clientId = client.id;
    });

    it('should create a room', () => {
      const room = service.createRoom({
        name: 'Test Room',
        type: 'private',
      });

      expect(room).toBeDefined();
      expect(room.name).toBe('Test Room');
      expect(room.type).toBe('private');
    });

    it('should join a room', () => {
      const room = service.createRoom({
        name: 'Test Room',
        type: 'public',
      });

      const success = service.joinRoom(clientId, room.id);
      expect(success).toBe(true);

      const updatedRoom = service.getRoom(room.id);
      expect(updatedRoom?.members.has(clientId)).toBe(true);
    });

    it('should leave a room', () => {
      const room = service.createRoom({
        name: 'Test Room',
        type: 'public',
        persistent: true, // Keep room after last member leaves
      });

      service.joinRoom(clientId, room.id);
      const success = service.leaveRoom(clientId, room.id);
      expect(success).toBe(true);

      const updatedRoom = service.getRoom(room.id);
      expect(updatedRoom?.members.has(clientId)).toBe(false);
    });

    it('should get room members', () => {
      const room = service.createRoom({
        name: 'Test Room',
        type: 'public',
      });

      service.joinRoom(clientId, room.id);
      const members = service.getRoomMembers(room.id);
      expect(members.length).toBe(1);
    });

    it('should respect max members limit', () => {
      const room = service.createRoom({
        name: 'Limited Room',
        type: 'public',
        maxMembers: 1,
      });

      service.joinRoom(clientId, room.id);

      const client2 = service.connectClient({
        socketId: 'socket-2',
        userId: 'user-2',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const success = service.joinRoom(client2.id, room.id);
      expect(success).toBe(false);
    });

    it('should auto-create tenant rooms', () => {
      const success = service.joinRoom(clientId, 'tenant:auto-created');
      expect(success).toBe(true);

      const room = service.getRoom('tenant:auto-created');
      expect(room).toBeDefined();
      expect(room?.type).toBe('tenant');
    });
  });

  // ============================================
  // MESSAGING TESTS
  // ============================================

  describe('Messaging', () => {
    let clientId: string;

    beforeEach(() => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });
      clientId = client.id;
    });

    it('should send a direct message', () => {
      const message = service.sendMessage({
        type: 'notification',
        senderId: 'user-1',
        recipientId: 'user-2',
        content: { text: 'Hello' },
        priority: 'normal',
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.content.text).toBe('Hello');
    });

    it('should send a room message', () => {
      const room = service.createRoom({
        name: 'Test Room',
        type: 'public',
      });

      service.joinRoom(clientId, room.id);

      const message = service.sendMessage({
        type: 'chat',
        roomId: room.id,
        senderId: 'user-1',
        content: { text: 'Hello room' },
        priority: 'normal',
      });

      expect(message).toBeDefined();
      expect(message.roomId).toBe(room.id);
    });

    it('should update message count metrics', () => {
      const initialMetrics = service.getMetrics();
      const initialTotal = initialMetrics.messagesTotal;

      service.sendMessage({
        type: 'notification',
        senderId: 'user-1',
        recipientId: 'user-2',
        content: { text: 'Test' },
        priority: 'normal',
      });

      const newMetrics = service.getMetrics();
      expect(newMetrics.messagesTotal).toBe(initialTotal + 1);
    });
  });

  // ============================================
  // CHAT TESTS
  // ============================================

  describe('Chat System', () => {
    let userId1: string;
    let userId2: string;

    beforeEach(() => {
      userId1 = 'user-1';
      userId2 = 'user-2';

      service.connectClient({
        socketId: 'socket-1',
        userId: userId1,
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.connectClient({
        socketId: 'socket-2',
        userId: userId2,
        tenantId: 'tenant-1',
        roles: ['user'],
      });
    });

    it('should create a conversation', () => {
      const conv = service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      expect(conv).toBeDefined();
      expect(conv.type).toBe('direct');
      expect(conv.participants.length).toBe(2);
    });

    it('should not create duplicate direct conversations', () => {
      const conv1 = service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      const conv2 = service.createConversation({
        type: 'direct',
        createdBy: userId2,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      expect(conv1.id).toBe(conv2.id);
    });

    it('should send a chat message', () => {
      const conv = service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      const message = service.sendChatMessage({
        conversationId: conv.id,
        senderId: userId1,
        senderName: 'User 1',
        content: 'Hello!',
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello!');
      expect(message.senderId).toBe(userId1);
    });

    it('should get chat messages', () => {
      const conv = service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      service.sendChatMessage({
        conversationId: conv.id,
        senderId: userId1,
        senderName: 'User 1',
        content: 'Message 1',
      });

      service.sendChatMessage({
        conversationId: conv.id,
        senderId: userId2,
        senderName: 'User 2',
        content: 'Message 2',
      });

      const messages = service.getChatMessages(conv.id);
      expect(messages.length).toBe(2);
    });

    it('should mark conversation as read', () => {
      const conv = service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      service.sendChatMessage({
        conversationId: conv.id,
        senderId: userId1,
        senderName: 'User 1',
        content: 'Hello!',
      });

      service.markConversationAsRead(conv.id, userId2);

      const updatedConv = service.getConversation(conv.id);
      expect(updatedConv?.unreadCount.get(userId2)).toBe(0);
    });

    it('should get user conversations', () => {
      service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      const convs = service.getUserConversations(userId1);
      expect(convs.length).toBe(1);
    });

    it('should set and get typing indicators', () => {
      const conv = service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      service.setTypingIndicator(conv.id, userId1, 'User 1', true);

      const indicators = service.getTypingIndicators(conv.id);
      expect(indicators.length).toBe(1);
      expect(indicators[0].userId).toBe(userId1);
    });

    it('should add and remove reactions', () => {
      const conv = service.createConversation({
        type: 'direct',
        createdBy: userId1,
        participants: [
          { userId: userId1, userName: 'User 1' },
          { userId: userId2, userName: 'User 2' },
        ],
      });

      const message = service.sendChatMessage({
        conversationId: conv.id,
        senderId: userId1,
        senderName: 'User 1',
        content: 'Hello!',
      });

      service.addReaction(conv.id, message.id, userId2, '👍');

      let messages = service.getChatMessages(conv.id);
      expect(messages[0].reactions.length).toBe(1);
      expect(messages[0].reactions[0].emoji).toBe('👍');

      service.removeReaction(conv.id, message.id, userId2, '👍');

      messages = service.getChatMessages(conv.id);
      expect(messages[0].reactions.length).toBe(0);
    });
  });

  // ============================================
  // NOTIFICATION TESTS
  // ============================================

  describe('Notifications', () => {
    let userId: string;

    beforeEach(() => {
      userId = 'user-1';
      service.connectClient({
        socketId: 'socket-1',
        userId,
        tenantId: 'tenant-1',
        roles: ['user'],
      });
    });

    it('should send a notification', () => {
      const notification = service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Test Notification',
        body: 'This is a test',
        category: 'test',
        priority: 'normal',
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBe('Test Notification');
      expect(notification.read).toBe(false);
    });

    it('should get user notifications', () => {
      service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 1',
        body: 'Body 1',
        category: 'test',
        priority: 'normal',
      });

      service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 2',
        body: 'Body 2',
        category: 'test',
        priority: 'normal',
      });

      const notifications = service.getUserNotifications(userId);
      expect(notifications.length).toBe(2);
    });

    it('should get unread notifications only', () => {
      const notif1 = service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 1',
        body: 'Body 1',
        category: 'test',
        priority: 'normal',
      });

      service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 2',
        body: 'Body 2',
        category: 'test',
        priority: 'normal',
      });

      service.markNotificationAsRead(notif1.id, userId);

      const unread = service.getUserNotifications(userId, true);
      expect(unread.length).toBe(1);
    });

    it('should get unread count', () => {
      service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 1',
        body: 'Body 1',
        category: 'test',
        priority: 'normal',
      });

      service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 2',
        body: 'Body 2',
        category: 'test',
        priority: 'normal',
      });

      const count = service.getUnreadNotificationCount(userId);
      expect(count).toBe(2);
    });

    it('should mark all as read', () => {
      service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 1',
        body: 'Body 1',
        category: 'test',
        priority: 'normal',
      });

      service.sendNotification({
        userId,
        tenantId: 'tenant-1',
        type: 'info',
        title: 'Notification 2',
        body: 'Body 2',
        category: 'test',
        priority: 'normal',
      });

      const marked = service.markAllNotificationsAsRead(userId);
      expect(marked).toBe(2);

      const count = service.getUnreadNotificationCount(userId);
      expect(count).toBe(0);
    });
  });

  // ============================================
  // PRESENCE TESTS
  // ============================================

  describe('Presence', () => {
    it('should set user online on connect', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const presence = service.getPresence('user-1');
      expect(presence).toBe('online');
    });

    it('should set user offline on disconnect', () => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.disconnectClient(client.id);

      const presence = service.getPresence('user-1');
      expect(presence).toBe('offline');
    });

    it('should update presence status', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.setPresence('user-1', 'away');

      const presence = service.getPresence('user-1');
      expect(presence).toBe('away');
    });

    it('should get presence for multiple users', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.connectClient({
        socketId: 'socket-2',
        userId: 'user-2',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.setPresence('user-2', 'busy');

      const presence = service.getPresenceForUsers(['user-1', 'user-2', 'user-3']);
      expect(presence.get('user-1')).toBe('online');
      expect(presence.get('user-2')).toBe('busy');
      expect(presence.get('user-3')).toBe('offline');
    });

    it('should get online users', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.connectClient({
        socketId: 'socket-2',
        userId: 'user-2',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const online = service.getOnlineUsers('tenant-1');
      expect(online.length).toBe(2);
    });
  });

  // ============================================
  // SUBSCRIPTION TESTS
  // ============================================

  describe('Subscriptions', () => {
    let clientId: string;

    beforeEach(() => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });
      clientId = client.id;
    });

    it('should subscribe to a topic', () => {
      const success = service.subscribe(clientId, 'topic:test');
      expect(success).toBe(true);

      const client = service.getClient(clientId);
      expect(client?.subscriptions.has('topic:test')).toBe(true);
    });

    it('should unsubscribe from a topic', () => {
      service.subscribe(clientId, 'topic:test');
      const success = service.unsubscribe(clientId, 'topic:test');
      expect(success).toBe(true);

      const client = service.getClient(clientId);
      expect(client?.subscriptions.has('topic:test')).toBe(false);
    });

    it('should get topic subscribers', () => {
      service.subscribe(clientId, 'topic:test');

      const client2 = service.connectClient({
        socketId: 'socket-2',
        userId: 'user-2',
        tenantId: 'tenant-1',
        roles: ['user'],
      });
      service.subscribe(client2.id, 'topic:test');

      const subscribers = service.getTopicSubscribers('topic:test');
      expect(subscribers.length).toBe(2);
    });
  });

  // ============================================
  // DASHBOARD UPDATE TESTS
  // ============================================

  describe('Dashboard Updates', () => {
    beforeEach(() => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });
    });

    it('should send dashboard update', () => {
      // Should not throw
      expect(() => {
        service.sendDashboardUpdate({
          type: 'test',
          module: 'finance',
          data: { key: 'value' },
          timestamp: new Date(),
          affectedTenants: ['tenant-1'],
        });
      }).not.toThrow();
    });

    it('should send invoice update', () => {
      expect(() => {
        service.sendInvoiceUpdate('inv-1', 'created', { amount: 100 }, 'tenant-1');
      }).not.toThrow();
    });

    it('should send HR update', () => {
      expect(() => {
        service.sendHRUpdate('emp-1', 'hired', { name: 'John' }, 'tenant-1');
      }).not.toThrow();
    });

    it('should send HSE alert', () => {
      expect(() => {
        service.sendHSEAlert(
          {
            type: 'incident',
            severity: 'critical',
            description: 'Test alert',
          },
          'tenant-1',
        );
      }).not.toThrow();
    });

    it('should send logistics update', () => {
      expect(() => {
        service.sendLogisticsUpdate(
          'ship-1',
          'delivered',
          { lat: 44.43, lng: 26.10 },
          'tenant-1',
        );
      }).not.toThrow();
    });
  });

  // ============================================
  // SYSTEM TESTS
  // ============================================

  describe('System Messages', () => {
    beforeEach(() => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });
    });

    it('should send system announcement', () => {
      expect(() => {
        service.sendSystemAnnouncement('Test Title', 'Test Body');
      }).not.toThrow();
    });

    it('should send maintenance alert', () => {
      expect(() => {
        service.sendMaintenanceAlert(
          'Scheduled maintenance',
          new Date(Date.now() + 3600000),
          30,
        );
      }).not.toThrow();
    });
  });

  // ============================================
  // METRICS TESTS
  // ============================================

  describe('Metrics', () => {
    it('should return basic metrics', () => {
      const metrics = service.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalConnections).toBe('number');
      expect(typeof metrics.activeConnections).toBe('number');
      expect(typeof metrics.messagesTotal).toBe('number');
    });

    it('should return detailed metrics', () => {
      const metrics = service.getDetailedMetrics();
      expect(metrics.connections).toBeDefined();
      expect(metrics.rooms).toBeDefined();
      expect(metrics.messages).toBeDefined();
      expect(metrics.notifications).toBeDefined();
      expect(metrics.conversations).toBeDefined();
      expect(metrics.presence).toBeDefined();
    });

    it('should track room stats', () => {
      service.createRoom({ name: 'Private', type: 'private' });
      service.createRoom({ name: 'Public', type: 'public' });

      const metrics = service.getDetailedMetrics();
      // Including system rooms
      expect(metrics.rooms.total).toBeGreaterThanOrEqual(5);
    });

    it('should track presence stats', () => {
      service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.connectClient({
        socketId: 'socket-2',
        userId: 'user-2',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      service.setPresence('user-2', 'away');

      const metrics = service.getDetailedMetrics();
      expect(metrics.presence.online).toBeGreaterThanOrEqual(1);
      expect(metrics.presence.away).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle disconnect for non-existent client', () => {
      expect(() => {
        service.disconnectClient('non-existent');
      }).not.toThrow();
    });

    it('should handle join room for non-existent client', () => {
      const success = service.joinRoom('non-existent', 'room-1');
      expect(success).toBe(false);
    });

    it('should handle join room for non-existent room', () => {
      const client = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const success = service.joinRoom(client.id, 'non-existent-room');
      expect(success).toBe(false);
    });

    it('should handle get messages for non-existent conversation', () => {
      const messages = service.getChatMessages('non-existent');
      expect(messages).toEqual([]);
    });

    it('should handle notifications for non-existent user', () => {
      const notifications = service.getUserNotifications('non-existent');
      expect(notifications).toEqual([]);
    });

    it('should handle presence for non-existent user', () => {
      const presence = service.getPresence('non-existent');
      expect(presence).toBe('offline');
    });

    it('should handle multiple sessions for same user', () => {
      const client1 = service.connectClient({
        socketId: 'socket-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const client2 = service.connectClient({
        socketId: 'socket-2',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['user'],
      });

      const clients = service.getClientsByUser('user-1');
      expect(clients.length).toBe(2);

      // Disconnect one session - user should still be online
      service.disconnectClient(client1.id);
      expect(service.getPresence('user-1')).toBe('online');

      // Disconnect second session - user should be offline
      service.disconnectClient(client2.id);
      expect(service.getPresence('user-1')).toBe('offline');
    });
  });
});
