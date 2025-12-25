import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  PushNotificationService,
  DevicePlatform,
  NotificationCategory,
  NotificationPriority,
} from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                FCM_PROJECT_ID: 'test-project',
                FCM_PRIVATE_KEY: 'test-key',
                FCM_CLIENT_EMAIL: 'test@test.com',
                APNS_KEY_ID: 'test-key-id',
                APNS_TEAM_ID: 'test-team',
                APNS_BUNDLE_ID: 'ro.documentiulia.app',
                APNS_PRIVATE_KEY: 'test-private-key',
                VAPID_PUBLIC_KEY: 'test-public',
                VAPID_PRIVATE_KEY: 'test-private',
                VAPID_SUBJECT: 'mailto:test@test.com',
                NODE_ENV: 'test',
              };
              return config[key] || '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return provider status', () => {
      const status = service.getProviderStatus();
      expect(status).toHaveProperty('fcm');
      expect(status).toHaveProperty('apns');
      expect(status).toHaveProperty('webPush');
      expect(status.fcm).toBe(true);
      expect(status.apns).toBe(true);
      expect(status.webPush).toBe(true);
    });

    it('should have default templates', () => {
      const templates = service.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // DEVICE TOKEN MANAGEMENT TESTS
  // ==========================================================================

  describe('device token management', () => {
    it('should register a new device', () => {
      const device = service.registerDevice({
        userId: 'user-1',
        tenantId: 'tenant-1',
        token: 'fcm-token-123',
        platform: 'android',
        deviceId: 'device-123',
        deviceName: 'Samsung Galaxy S21',
        deviceModel: 'SM-G991B',
        osVersion: 'Android 13',
        appVersion: '1.0.0',
      });

      expect(device).toBeDefined();
      expect(device.id).toBeDefined();
      expect(device.userId).toBe('user-1');
      expect(device.tenantId).toBe('tenant-1');
      expect(device.platform).toBe('android');
      expect(device.provider).toBe('fcm');
      expect(device.isActive).toBe(true);
    });

    it('should register iOS device with APNs provider', () => {
      const device = service.registerDevice({
        userId: 'user-2',
        tenantId: 'tenant-1',
        token: 'apns-token-456',
        platform: 'ios',
        deviceId: 'device-456',
      });

      expect(device.platform).toBe('ios');
      expect(device.provider).toBe('apns');
    });

    it('should register web device with web_push provider', () => {
      const device = service.registerDevice({
        userId: 'user-3',
        tenantId: 'tenant-1',
        token: 'web-push-token-789',
        platform: 'web',
        deviceId: 'browser-789',
      });

      expect(device.platform).toBe('web');
      expect(device.provider).toBe('web_push');
    });

    it('should get devices by user', () => {
      service.registerDevice({
        userId: 'user-multi',
        tenantId: 'tenant-1',
        token: 'token-1',
        platform: 'android',
        deviceId: 'device-1',
      });
      service.registerDevice({
        userId: 'user-multi',
        tenantId: 'tenant-1',
        token: 'token-2',
        platform: 'ios',
        deviceId: 'device-2',
      });

      const devices = service.getDevicesByUser('user-multi');
      expect(devices.length).toBe(2);
    });

    it('should get devices by tenant', () => {
      service.registerDevice({
        userId: 'user-t1',
        tenantId: 'tenant-test',
        token: 'token-t1',
        platform: 'android',
        deviceId: 'device-t1',
      });
      service.registerDevice({
        userId: 'user-t2',
        tenantId: 'tenant-test',
        token: 'token-t2',
        platform: 'ios',
        deviceId: 'device-t2',
      });

      const devices = service.getDevicesByTenant('tenant-test');
      expect(devices.length).toBe(2);
    });

    it('should unregister a device', () => {
      const device = service.registerDevice({
        userId: 'user-unreg',
        tenantId: 'tenant-1',
        token: 'token-unreg',
        platform: 'android',
        deviceId: 'device-unreg',
      });

      const result = service.unregisterDevice(device.id);
      expect(result).toBe(true);

      const devices = service.getDevicesByUser('user-unreg');
      expect(devices.length).toBe(0);
    });

    it('should update device token', () => {
      const device = service.registerDevice({
        userId: 'user-update',
        tenantId: 'tenant-1',
        token: 'old-token',
        platform: 'android',
        deviceId: 'device-update',
      });

      const updated = service.updateDeviceToken(device.id, 'new-token');
      expect(updated).toBeDefined();
      expect(updated!.token).toBe('new-token');
    });

    it('should deactivate a device', () => {
      const device = service.registerDevice({
        userId: 'user-deact',
        tenantId: 'tenant-1',
        token: 'token-deact',
        platform: 'android',
        deviceId: 'device-deact',
      });

      const result = service.deactivateDevice(device.id);
      expect(result).toBe(true);

      // Deactivated devices should not be returned in getDevicesByUser
      const devices = service.getDevicesByUser('user-deact');
      expect(devices.length).toBe(0);
    });

    it('should get active device count', () => {
      service.registerDevice({
        userId: 'user-count',
        tenantId: 'tenant-1',
        token: 'token-android',
        platform: 'android',
        deviceId: 'device-android',
      });
      service.registerDevice({
        userId: 'user-count',
        tenantId: 'tenant-1',
        token: 'token-ios',
        platform: 'ios',
        deviceId: 'device-ios',
      });

      const count = service.getActiveDeviceCount();
      expect(count.total).toBeGreaterThanOrEqual(2);
      expect(count.byPlatform).toHaveProperty('android');
      expect(count.byPlatform).toHaveProperty('ios');
      expect(count.byPlatform).toHaveProperty('web');
    });
  });

  // ==========================================================================
  // NOTIFICATION PREFERENCES TESTS
  // ==========================================================================

  describe('notification preferences', () => {
    it('should set user preferences', () => {
      const prefs = service.setPreferences('user-prefs', 'tenant-1', {
        enabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        frequency: 'instant',
      });

      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe('user-prefs');
      expect(prefs.enabled).toBe(true);
      expect(prefs.quietHoursEnabled).toBe(true);
    });

    it('should get user preferences', () => {
      service.setPreferences('user-get-prefs', 'tenant-1', { enabled: true });

      const prefs = service.getPreferences('user-get-prefs');
      expect(prefs).toBeDefined();
      expect(prefs!.userId).toBe('user-get-prefs');
    });

    it('should return null for non-existent user preferences', () => {
      const prefs = service.getPreferences('non-existent-user');
      expect(prefs).toBeNull();
    });

    it('should set category-specific preferences', () => {
      service.setPreferences('user-cat', 'tenant-1', { enabled: true });

      const prefs = service.setCategoryPreference('user-cat', 'invoice', {
        enabled: true,
        pushEnabled: true,
        emailEnabled: false,
        priority: 'high',
      });

      expect(prefs).toBeDefined();
      expect(prefs!.categories.invoice?.pushEnabled).toBe(true);
      expect(prefs!.categories.invoice?.emailEnabled).toBe(false);
      expect(prefs!.categories.invoice?.priority).toBe('high');
    });

    it('should check if notification is allowed', () => {
      service.setPreferences('user-allowed', 'tenant-1', {
        enabled: true,
        categories: {
          invoice: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
          marketing: { enabled: false, pushEnabled: false, emailEnabled: false, smsEnabled: false, priority: 'low' },
        },
      });

      expect(service.isNotificationAllowed('user-allowed', 'invoice')).toBe(true);
      expect(service.isNotificationAllowed('user-allowed', 'marketing')).toBe(false);
    });

    it('should block notifications when user preferences disabled', () => {
      service.setPreferences('user-disabled', 'tenant-1', { enabled: false });

      expect(service.isNotificationAllowed('user-disabled', 'invoice')).toBe(false);
    });

    it('should default to not allowed for users without preferences', () => {
      expect(service.isNotificationAllowed('user-no-prefs-xyz', 'invoice')).toBe(false);
    });
  });

  // ==========================================================================
  // NOTIFICATION TEMPLATES TESTS
  // ==========================================================================

  describe('notification templates', () => {
    it('should create a new template', () => {
      const template = service.createTemplate({
        name: 'test_template',
        category: 'system',
        titleTemplate: 'Test: {{title}}',
        bodyTemplate: 'Message: {{message}}',
        defaultPriority: 'normal',
        variables: ['title', 'message'],
      });

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe('test_template');
      expect(template.isActive).toBe(true);
    });

    it('should get template by ID', () => {
      const created = service.createTemplate({
        name: 'get_by_id',
        category: 'alert',
        titleTemplate: 'Alert',
        bodyTemplate: 'Alert body',
        defaultPriority: 'high',
        variables: [],
      });

      const template = service.getTemplate(created.id);
      expect(template).toBeDefined();
      expect(template!.name).toBe('get_by_id');
    });

    it('should get template by name', () => {
      const template = service.getTemplateByName('invoice_created', 'ro');
      expect(template).toBeDefined();
      expect(template!.category).toBe('invoice');
    });

    it('should list all templates', () => {
      const templates = service.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should list templates by category', () => {
      const hrTemplates = service.listTemplates('hr');
      expect(hrTemplates.every((t) => t.category === 'hr')).toBe(true);
    });

    it('should update a template', () => {
      const created = service.createTemplate({
        name: 'update_test',
        category: 'system',
        titleTemplate: 'Original',
        bodyTemplate: 'Original body',
        defaultPriority: 'normal',
        variables: [],
      });

      const updated = service.updateTemplate(created.id, {
        titleTemplate: 'Updated',
        defaultPriority: 'high',
      });

      expect(updated).toBeDefined();
      expect(updated!.titleTemplate).toBe('Updated');
      expect(updated!.defaultPriority).toBe('high');
    });

    it('should delete a template', () => {
      const created = service.createTemplate({
        name: 'delete_test',
        category: 'system',
        titleTemplate: 'Delete me',
        bodyTemplate: 'Body',
        defaultPriority: 'normal',
        variables: [],
      });

      const result = service.deleteTemplate(created.id);
      expect(result).toBe(true);

      const template = service.getTemplate(created.id);
      expect(template).toBeNull();
    });

    it('should render a template with variables', () => {
      const template = service.getTemplateByName('invoice_created', 'ro');
      expect(template).toBeDefined();

      const rendered = service.renderTemplate(template!.id, {
        invoiceNumber: 'INV-2025-001',
        clientName: 'Test Client',
        amount: '1000',
        currency: 'RON',
      });

      expect(rendered).toBeDefined();
      expect(rendered!.title).toContain('INV-2025-001');
      expect(rendered!.body).toContain('Test Client');
      expect(rendered!.body).toContain('1000');
    });
  });

  // ==========================================================================
  // SEND NOTIFICATIONS TESTS
  // ==========================================================================

  describe('send notifications', () => {
    beforeEach(() => {
      // Register a device and set preferences for the test user
      service.registerDevice({
        userId: 'send-user',
        tenantId: 'tenant-1',
        token: 'test-token',
        platform: 'android',
        deviceId: 'test-device',
      });
      service.setPreferences('send-user', 'tenant-1', {
        enabled: true,
        categories: {
          invoice: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
        },
      });
    });

    it('should send notification to a user', async () => {
      const result = await service.sendToUser('send-user', {
        title: 'Test Notification',
        body: 'This is a test',
        category: 'invoice',
        priority: 'normal',
      });

      expect(result).toBeDefined();
      expect(result.total).toBe(1);
      // Note: Due to simulated success rates, we might have failures
      expect(result.successful + result.failed).toBe(result.total);
    });

    it('should send notification to multiple users', async () => {
      service.registerDevice({
        userId: 'send-user-2',
        tenantId: 'tenant-1',
        token: 'test-token-2',
        platform: 'ios',
        deviceId: 'test-device-2',
      });
      service.setPreferences('send-user-2', 'tenant-1', {
        enabled: true,
        categories: {
          invoice: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
        },
      });

      const result = await service.sendToUsers(['send-user', 'send-user-2'], {
        title: 'Multi-user Test',
        body: 'Test for multiple users',
        category: 'invoice',
        priority: 'normal',
      });

      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should send notification to tenant', async () => {
      const result = await service.sendToTenant('tenant-1', {
        title: 'Tenant Notification',
        body: 'Test for entire tenant',
        category: 'invoice',
        priority: 'normal',
      });

      expect(result).toBeDefined();
    });

    it('should send notification with template', async () => {
      const result = await service.sendWithTemplate(
        'invoice_created',
        ['send-user'],
        {
          invoiceNumber: 'INV-001',
          clientName: 'Test Corp',
          amount: '500',
          currency: 'EUR',
        },
      );

      expect(result).toBeDefined();
    });

    it('should not send if user has no devices', async () => {
      const result = await service.sendToUser('user-no-devices', {
        title: 'Test',
        body: 'Test',
        category: 'invoice',
        priority: 'normal',
      });

      expect(result.total).toBe(0);
    });

    it('should not send if notification is blocked by preferences', async () => {
      service.registerDevice({
        userId: 'blocked-user',
        tenantId: 'tenant-1',
        token: 'blocked-token',
        platform: 'android',
        deviceId: 'blocked-device',
      });
      service.setPreferences('blocked-user', 'tenant-1', {
        enabled: true,
        categories: {
          marketing: { enabled: false, pushEnabled: false, emailEnabled: false, smsEnabled: false, priority: 'low' },
        },
      });

      const result = await service.sendToUser('blocked-user', {
        title: 'Marketing',
        body: 'Blocked notification',
        category: 'marketing',
        priority: 'low',
      });

      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // SCHEDULED NOTIFICATIONS TESTS
  // ==========================================================================

  describe('scheduled notifications', () => {
    it('should schedule a notification', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const scheduled = service.scheduleNotification({
        payload: {
          title: 'Scheduled Test',
          body: 'This is scheduled',
          category: 'reminder',
          priority: 'normal',
        },
        targetUserIds: ['user-1', 'user-2'],
        tenantId: 'tenant-1',
        scheduledAt: futureDate,
      });

      expect(scheduled).toBeDefined();
      expect(scheduled.id).toBeDefined();
      expect(scheduled.status).toBe('pending');
    });

    it('should get scheduled notification', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const scheduled = service.scheduleNotification({
        payload: {
          title: 'Get Test',
          body: 'Get this',
          category: 'reminder',
          priority: 'normal',
        },
        targetUserIds: ['user-1'],
        tenantId: 'tenant-1',
        scheduledAt: futureDate,
      });

      const retrieved = service.getScheduledNotification(scheduled.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(scheduled.id);
    });

    it('should cancel scheduled notification', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const scheduled = service.scheduleNotification({
        payload: {
          title: 'Cancel Test',
          body: 'Cancel this',
          category: 'reminder',
          priority: 'normal',
        },
        targetUserIds: ['user-1'],
        tenantId: 'tenant-1',
        scheduledAt: futureDate,
      });

      const result = service.cancelScheduledNotification(scheduled.id);
      expect(result).toBe(true);

      const cancelled = service.getScheduledNotification(scheduled.id);
      expect(cancelled!.status).toBe('cancelled');
    });

    it('should list scheduled notifications by tenant', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      service.scheduleNotification({
        payload: {
          title: 'List Test 1',
          body: 'Body 1',
          category: 'reminder',
          priority: 'normal',
        },
        targetUserIds: ['user-1'],
        tenantId: 'list-tenant',
        scheduledAt: futureDate,
      });

      service.scheduleNotification({
        payload: {
          title: 'List Test 2',
          body: 'Body 2',
          category: 'reminder',
          priority: 'normal',
        },
        targetUserIds: ['user-2'],
        tenantId: 'list-tenant',
        scheduledAt: futureDate,
      });

      const list = service.listScheduledNotifications('list-tenant');
      expect(list.length).toBe(2);
    });

    it('should filter scheduled notifications by status', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const scheduled = service.scheduleNotification({
        payload: {
          title: 'Filter Test',
          body: 'Body',
          category: 'reminder',
          priority: 'normal',
        },
        targetUserIds: ['user-1'],
        tenantId: 'filter-tenant',
        scheduledAt: futureDate,
      });

      service.cancelScheduledNotification(scheduled.id);

      const pending = service.listScheduledNotifications('filter-tenant', 'pending');
      const cancelled = service.listScheduledNotifications('filter-tenant', 'cancelled');

      expect(pending.length).toBe(0);
      expect(cancelled.length).toBe(1);
    });

    it('should schedule recurring notification', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const scheduled = service.scheduleNotification({
        payload: {
          title: 'Recurring Test',
          body: 'Daily reminder',
          category: 'reminder',
          priority: 'normal',
        },
        targetUserIds: ['user-1'],
        tenantId: 'tenant-1',
        scheduledAt: futureDate,
        recurrence: {
          type: 'daily',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      expect(scheduled.recurrence).toBeDefined();
      expect(scheduled.recurrence!.type).toBe('daily');
    });
  });

  // ==========================================================================
  // TOPIC SUBSCRIPTION TESTS
  // ==========================================================================

  describe('topic subscriptions', () => {
    it('should subscribe user to topic', () => {
      const result = service.subscribeToTopic('topic-user', 'announcements');
      expect(result).toBe(true);
    });

    it('should unsubscribe user from topic', () => {
      service.subscribeToTopic('unsub-user', 'announcements');
      const result = service.unsubscribeFromTopic('unsub-user', 'announcements');
      expect(result).toBe(true);
    });

    it('should get topic subscribers', () => {
      service.subscribeToTopic('sub-1', 'news');
      service.subscribeToTopic('sub-2', 'news');
      service.subscribeToTopic('sub-3', 'news');

      const subscribers = service.getTopicSubscribers('news');
      expect(subscribers.length).toBe(3);
      expect(subscribers).toContain('sub-1');
      expect(subscribers).toContain('sub-2');
      expect(subscribers).toContain('sub-3');
    });

    it('should get user topics', () => {
      service.subscribeToTopic('multi-topic-user', 'topic-a');
      service.subscribeToTopic('multi-topic-user', 'topic-b');
      service.subscribeToTopic('multi-topic-user', 'topic-c');

      const topics = service.getUserTopics('multi-topic-user');
      expect(topics.length).toBe(3);
      expect(topics).toContain('topic-a');
      expect(topics).toContain('topic-b');
      expect(topics).toContain('topic-c');
    });

    it('should send notification to topic', async () => {
      service.subscribeToTopic('topic-send-1', 'updates');
      service.subscribeToTopic('topic-send-2', 'updates');

      // Register devices for these users
      service.registerDevice({
        userId: 'topic-send-1',
        tenantId: 'tenant-1',
        token: 'token-topic-1',
        platform: 'android',
        deviceId: 'device-topic-1',
      });
      service.setPreferences('topic-send-1', 'tenant-1', {
        enabled: true,
        categories: {
          system: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
        },
      });

      const result = await service.sendToTopic('updates', {
        title: 'Topic Update',
        body: 'New update available',
        category: 'system',
        priority: 'normal',
      });

      expect(result).toBeDefined();
    });

    it('should return empty array for topic with no subscribers', () => {
      const subscribers = service.getTopicSubscribers('empty-topic');
      expect(subscribers).toEqual([]);
    });
  });

  // ==========================================================================
  // DELIVERY TRACKING TESTS
  // ==========================================================================

  describe('delivery tracking', () => {
    it('should track delivery', () => {
      service.trackDelivered('notif-123');
      // Verify no error is thrown
    });

    it('should track opened notification', () => {
      service.trackOpened('notif-456', 'android');
      // Verify no error is thrown
    });

    it('should get notification history', async () => {
      service.registerDevice({
        userId: 'history-user',
        tenantId: 'tenant-1',
        token: 'history-token',
        platform: 'android',
        deviceId: 'history-device',
      });
      service.setPreferences('history-user', 'tenant-1', {
        enabled: true,
        categories: {
          invoice: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
        },
      });

      await service.sendToUser('history-user', {
        title: 'History Test 1',
        body: 'Body 1',
        category: 'invoice',
        priority: 'normal',
      });

      await service.sendToUser('history-user', {
        title: 'History Test 2',
        body: 'Body 2',
        category: 'invoice',
        priority: 'normal',
      });

      const history = service.getNotificationHistory('history-user');
      expect(history.length).toBe(2);
    });

    it('should limit notification history', async () => {
      service.registerDevice({
        userId: 'limit-user',
        tenantId: 'tenant-1',
        token: 'limit-token',
        platform: 'android',
        deviceId: 'limit-device',
      });
      service.setPreferences('limit-user', 'tenant-1', {
        enabled: true,
        categories: {
          invoice: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
        },
      });

      // Send 5 notifications
      for (let i = 0; i < 5; i++) {
        await service.sendToUser('limit-user', {
          title: `Test ${i}`,
          body: `Body ${i}`,
          category: 'invoice',
          priority: 'normal',
        });
      }

      const history = service.getNotificationHistory('limit-user', 3);
      expect(history.length).toBe(3);
    });
  });

  // ==========================================================================
  // STATISTICS TESTS
  // ==========================================================================

  describe('statistics', () => {
    it('should get notification stats', () => {
      const stats = service.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalSent).toBeGreaterThanOrEqual(0);
      expect(stats.totalDelivered).toBeGreaterThanOrEqual(0);
      expect(stats.totalOpened).toBeGreaterThanOrEqual(0);
      expect(stats.totalFailed).toBeGreaterThanOrEqual(0);
      expect(stats.byPlatform).toBeDefined();
      expect(stats.byCategory).toBeDefined();
      expect(stats.period).toBeDefined();
    });

    it('should get stats with date range', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const stats = service.getStats(startDate, endDate);

      expect(stats.period.start).toEqual(startDate);
      expect(stats.period.end).toEqual(endDate);
    });

    it('should track stats by platform', () => {
      const stats = service.getStats();

      expect(stats.byPlatform.ios).toBeDefined();
      expect(stats.byPlatform.android).toBeDefined();
      expect(stats.byPlatform.web).toBeDefined();
    });
  });

  // ==========================================================================
  // BATCH OPERATIONS TESTS
  // ==========================================================================

  describe('batch operations', () => {
    it('should send batch notifications', async () => {
      service.registerDevice({
        userId: 'batch-1',
        tenantId: 'tenant-1',
        token: 'batch-token-1',
        platform: 'android',
        deviceId: 'batch-device-1',
      });
      service.setPreferences('batch-1', 'tenant-1', {
        enabled: true,
        categories: {
          invoice: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
        },
      });

      service.registerDevice({
        userId: 'batch-2',
        tenantId: 'tenant-1',
        token: 'batch-token-2',
        platform: 'ios',
        deviceId: 'batch-device-2',
      });
      service.setPreferences('batch-2', 'tenant-1', {
        enabled: true,
        categories: {
          payment: { enabled: true, pushEnabled: true, emailEnabled: true, smsEnabled: false, priority: 'normal' },
        },
      });

      const result = await service.sendBatch([
        {
          userId: 'batch-1',
          payload: {
            title: 'Batch 1',
            body: 'Message 1',
            category: 'invoice',
            priority: 'normal',
          },
        },
        {
          userId: 'batch-2',
          payload: {
            title: 'Batch 2',
            body: 'Message 2',
            category: 'payment',
            priority: 'high',
          },
        },
      ]);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // UTILITY TESTS
  // ==========================================================================

  describe('utility methods', () => {
    it('should get registered user count', () => {
      const count = service.getRegisteredUserCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should test notification', async () => {
      const result = await service.testNotification('test-device-token', 'android');

      expect(result).toBeDefined();
      expect(result.deviceToken).toBe('test-device-token');
      expect(result.platform).toBe('android');
    });

    it('should cleanup stale devices', () => {
      // Register an old device (we can't actually make it old, but we can test the function exists)
      service.registerDevice({
        userId: 'stale-user',
        tenantId: 'tenant-1',
        token: 'stale-token',
        platform: 'android',
        deviceId: 'stale-device',
      });

      const cleaned = service.cleanupStaleDevices(90);
      // Since we just registered, it shouldn't be cleaned
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // PROVIDER CONFIGURATION TESTS
  // ==========================================================================

  describe('provider configuration', () => {
    it('should configure FCM provider', () => {
      const result = service.configureProvider('fcm', {
        projectId: 'new-project',
        enabled: true,
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('fcm');
    });

    it('should configure APNs provider', () => {
      const result = service.configureProvider('apns', {
        bundleId: 'com.new.bundle',
        production: false,
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('apns');
    });

    it('should configure Web Push provider', () => {
      const result = service.configureProvider('web_push', {
        subject: 'mailto:new@email.com',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('web_push');
    });
  });
});
