import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationService,
  Notification,
  NotificationTemplate,
  NotificationCategory,
  NotificationType,
} from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let eventEmitter: EventEmitter2;

  const mockUserId = 'user-123';
  const mockUserId2 = 'user-456';
  const mockOrgId = 'org-789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default templates', async () => {
      const templates = await service.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have invoice template', async () => {
      const template = await service.getTemplateByName('Invoice Created');
      expect(template).toBeDefined();
      expect(template!.category).toBe('INVOICE');
    });

    it('should have payment template', async () => {
      const template = await service.getTemplateByName('Payment Received');
      expect(template).toBeDefined();
      expect(template!.category).toBe('PAYMENT');
    });

    it('should have ANAF template', async () => {
      const template = await service.getTemplateByName('ANAF Submission Status');
      expect(template).toBeDefined();
      expect(template!.category).toBe('ANAF');
    });
  });

  describe('Sending Notifications', () => {
    it('should send notification', async () => {
      const notification = await service.sendNotification(
        mockUserId,
        'INFO',
        'GENERAL',
        'Test Notification',
        'Notificare Test',
        'This is a test message',
        'Acesta este un mesaj de test',
      );

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(mockUserId);
      expect(notification.status).toBe('SENT');
    });

    it('should send notification with options', async () => {
      const notification = await service.sendNotification(
        mockUserId,
        'SUCCESS',
        'INVOICE',
        'Invoice Created',
        'Factură Creată',
        'Invoice INV-001 created',
        'Factura INV-001 creată',
        {
          priority: 'HIGH',
          actionUrl: '/invoices/INV-001',
          actionLabel: 'View Invoice',
          actionLabelRo: 'Vezi Factura',
          organizationId: mockOrgId,
        },
      );

      expect(notification.priority).toBe('HIGH');
      expect(notification.actionUrl).toBe('/invoices/INV-001');
      expect(notification.organizationId).toBe(mockOrgId);
    });

    it('should send to multiple channels', async () => {
      const notification = await service.sendNotification(
        mockUserId,
        'ALERT',
        'SECURITY',
        'Security Alert',
        'Alertă Securitate',
        'Login from new device',
        'Autentificare de pe un dispozitiv nou',
        { channels: ['IN_APP', 'EMAIL', 'PUSH'] },
      );

      expect(notification.channels).toContain('IN_APP');
      expect(notification.channels).toContain('EMAIL');
      expect(notification.channels).toContain('PUSH');
    });

    it('should emit notification.created event', async () => {
      await service.sendNotification(
        mockUserId,
        'INFO',
        'GENERAL',
        'Event Test',
        'Test Eveniment',
        'Message',
        'Mesaj',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.created',
        expect.objectContaining({ userId: mockUserId }),
      );
    });

    it('should emit notification.delivered event', async () => {
      await service.sendNotification(
        mockUserId,
        'INFO',
        'GENERAL',
        'Deliver Test',
        'Test Livrare',
        'Message',
        'Mesaj',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.delivered',
        expect.objectContaining({ notificationId: expect.any(String) }),
      );
    });

    it('should set expiration date', async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      const notification = await service.sendNotification(
        mockUserId,
        'INFO',
        'GENERAL',
        'Expiring',
        'Expirare',
        'Message',
        'Mesaj',
        { expiresAt },
      );

      expect(notification.expiresAt).toEqual(expiresAt);
    });

    it('should include metadata', async () => {
      const notification = await service.sendNotification(
        mockUserId,
        'INFO',
        'GENERAL',
        'Metadata',
        'Metadate',
        'Message',
        'Mesaj',
        { metadata: { key: 'value' } },
      );

      expect(notification.metadata.key).toBe('value');
    });
  });

  describe('Template-based Notifications', () => {
    it('should send from template', async () => {
      const templates = await service.getAllTemplates();
      const invoiceTemplate = templates.find((t) => t.category === 'INVOICE');

      const notification = await service.sendFromTemplate(mockUserId, invoiceTemplate!.id, {
        invoiceNumber: 'INV-001',
        amount: 1000,
        currency: 'RON',
      });

      expect(notification.category).toBe('INVOICE');
      expect(notification.title).toContain('INV-001');
    });

    it('should send from template by name', async () => {
      const notification = await service.sendFromTemplate(mockUserId, 'Invoice Created', {
        invoiceNumber: 'INV-002',
        amount: 2000,
      });

      expect(notification.title).toContain('INV-002');
    });

    it('should use default variable values', async () => {
      const notification = await service.sendFromTemplate(mockUserId, 'Invoice Created', {
        invoiceNumber: 'INV-003',
        amount: 3000,
        // currency defaults to RON
      });

      expect(notification.message).toContain('RON');
    });

    it('should throw error for missing template', async () => {
      await expect(
        service.sendFromTemplate(mockUserId, 'NonExistent', {}),
      ).rejects.toThrow('Template not found');
    });

    it('should throw error for missing required variable', async () => {
      await expect(
        service.sendFromTemplate(mockUserId, 'Invoice Created', {}),
      ).rejects.toThrow('Missing required variable');
    });

    it('should throw error for inactive template', async () => {
      const templates = await service.getAllTemplates();
      await service.updateTemplate(templates[0].id, { isActive: false });

      await expect(
        service.sendFromTemplate(mockUserId, templates[0].id, {}),
      ).rejects.toThrow('Template is not active');
    });

    it('should include Romanian message', async () => {
      const notification = await service.sendFromTemplate(mockUserId, 'Invoice Created', {
        invoiceNumber: 'INV-004',
        amount: 4000,
      });

      expect(notification.titleRo).toContain('INV-004');
      expect(notification.messageRo).toContain('4000');
    });
  });

  describe('Bulk Notifications', () => {
    it('should send bulk notifications', async () => {
      const result = await service.sendBulkNotification(
        [mockUserId, mockUserId2],
        'INFO',
        'SYSTEM',
        'System Update',
        'Actualizare Sistem',
        'System maintenance scheduled',
        'Mentenanță programată',
      );

      expect(result.sent).toBe(2);
      expect(result.notifications.length).toBe(2);
    });

    it('should emit bulk completed event', async () => {
      await service.sendBulkNotification(
        [mockUserId],
        'INFO',
        'GENERAL',
        'Bulk',
        'În masă',
        'Message',
        'Mesaj',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.bulk.completed',
        expect.objectContaining({ sent: 1 }),
      );
    });
  });

  describe('Notification Management', () => {
    let testNotification: Notification;

    beforeEach(async () => {
      testNotification = await service.sendNotification(
        mockUserId,
        'INFO',
        'GENERAL',
        'Test',
        'Test',
        'Message',
        'Mesaj',
      );
    });

    it('should get notification by ID', async () => {
      const notification = await service.getNotification(testNotification.id);

      expect(notification).toBeDefined();
      expect(notification!.id).toBe(testNotification.id);
    });

    it('should get user notifications', async () => {
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'N1', 'N1', 'M', 'M');
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'N2', 'N2', 'M', 'M');

      const notifications = await service.getUserNotifications(mockUserId);

      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by unread only', async () => {
      await service.markAsRead(testNotification.id);
      const newNotification = await service.sendNotification(
        mockUserId, 'INFO', 'GENERAL', 'New', 'Nou', 'M', 'M',
      );

      const unread = await service.getUserNotifications(mockUserId, { unreadOnly: true });

      expect(unread.find((n) => n.id === testNotification.id)).toBeUndefined();
      expect(unread.find((n) => n.id === newNotification.id)).toBeDefined();
    });

    it('should filter by category', async () => {
      await service.sendNotification(mockUserId, 'INFO', 'INVOICE', 'Invoice', 'Factură', 'M', 'M');

      const invoiceNotifications = await service.getUserNotifications(mockUserId, { category: 'INVOICE' });

      expect(invoiceNotifications.every((n) => n.category === 'INVOICE')).toBe(true);
    });

    it('should limit results', async () => {
      for (let i = 0; i < 5; i++) {
        await service.sendNotification(mockUserId, 'INFO', 'GENERAL', `N${i}`, `N${i}`, 'M', 'M');
      }

      const limited = await service.getUserNotifications(mockUserId, { limit: 3 });

      expect(limited.length).toBe(3);
    });

    it('should get unread count', async () => {
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'Unread', 'Necitit', 'M', 'M');

      const count = await service.getUnreadCount(mockUserId);

      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should mark as read', async () => {
      const read = await service.markAsRead(testNotification.id);

      expect(read.readAt).toBeDefined();
      expect(read.status).toBe('READ');
    });

    it('should emit notification.read event', async () => {
      await service.markAsRead(testNotification.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.read',
        expect.objectContaining({ notificationId: testNotification.id }),
      );
    });

    it('should not update already read notification', async () => {
      await service.markAsRead(testNotification.id);
      const firstReadAt = (await service.getNotification(testNotification.id))!.readAt;

      await service.markAsRead(testNotification.id);
      const secondReadAt = (await service.getNotification(testNotification.id))!.readAt;

      expect(firstReadAt).toEqual(secondReadAt);
    });

    it('should throw error when marking non-existent notification', async () => {
      await expect(service.markAsRead('non-existent')).rejects.toThrow('Notification not found');
    });

    it('should mark all as read', async () => {
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'N1', 'N1', 'M', 'M');
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'N2', 'N2', 'M', 'M');

      const count = await service.markAllAsRead(mockUserId);

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should emit notification.all.read event', async () => {
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'N', 'N', 'M', 'M');
      await service.markAllAsRead(mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.all.read',
        expect.objectContaining({ userId: mockUserId }),
      );
    });

    it('should delete notification', async () => {
      await service.deleteNotification(testNotification.id);

      expect(await service.getNotification(testNotification.id)).toBeUndefined();
    });

    it('should emit notification.deleted event', async () => {
      await service.deleteNotification(testNotification.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.deleted',
        expect.objectContaining({ notificationId: testNotification.id }),
      );
    });

    it('should throw error when deleting non-existent notification', async () => {
      await expect(service.deleteNotification('non-existent')).rejects.toThrow('Notification not found');
    });

    it('should delete all user notifications', async () => {
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'D1', 'D1', 'M', 'M');
      await service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'D2', 'D2', 'M', 'M');

      const count = await service.deleteUserNotifications(mockUserId);

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Preferences', () => {
    it('should get default preferences', async () => {
      const prefs = await service.getUserPreferences(mockUserId);

      expect(prefs.userId).toBe(mockUserId);
      expect(prefs.enabled).toBe(true);
      expect(prefs.language).toBe('ro');
    });

    it('should have all channels in preferences', async () => {
      const prefs = await service.getUserPreferences(mockUserId);

      expect(prefs.channels.IN_APP).toBe(true);
      expect(prefs.channels.EMAIL).toBe(true);
    });

    it('should have all categories in preferences', async () => {
      const prefs = await service.getUserPreferences(mockUserId);

      expect(prefs.categories.INVOICE).toBeDefined();
      expect(prefs.categories.PAYMENT).toBeDefined();
      expect(prefs.categories.ANAF).toBeDefined();
      expect(prefs.categories.SECURITY).toBeDefined();
    });

    it('should update preferences', async () => {
      const updated = await service.updateUserPreferences(mockUserId, {
        language: 'en',
        channels: { IN_APP: true, EMAIL: false, SMS: false, PUSH: false, WEBHOOK: false },
      });

      expect(updated.language).toBe('en');
      expect(updated.channels.EMAIL).toBe(false);
    });

    it('should emit preferences updated event', async () => {
      await service.updateUserPreferences(mockUserId, { enabled: false });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.preferences.updated',
        expect.objectContaining({ userId: mockUserId }),
      );
    });

    it('should respect disabled notifications', async () => {
      await service.updateUserPreferences(mockUserId, { enabled: false });

      await expect(
        service.sendNotification(mockUserId, 'INFO', 'GENERAL', 'T', 'T', 'M', 'M'),
      ).rejects.toThrow('Notifications are disabled');
    });

    it('should respect disabled category', async () => {
      await service.updateUserPreferences(mockUserId, {
        categories: {
          INVOICE: { enabled: false, channels: [] },
          PAYMENT: { enabled: true, channels: ['IN_APP'] },
          TAX: { enabled: true, channels: ['IN_APP'] },
          ANAF: { enabled: true, channels: ['IN_APP'] },
          SAGA: { enabled: true, channels: ['IN_APP'] },
          HR: { enabled: true, channels: ['IN_APP'] },
          REPORT: { enabled: true, channels: ['IN_APP'] },
          SECURITY: { enabled: true, channels: ['IN_APP'] },
          SYSTEM: { enabled: true, channels: ['IN_APP'] },
          MARKETING: { enabled: true, channels: ['IN_APP'] },
          GENERAL: { enabled: true, channels: ['IN_APP'] },
        },
      });

      await expect(
        service.sendNotification(mockUserId, 'INFO', 'INVOICE', 'T', 'T', 'M', 'M'),
      ).rejects.toThrow('Category INVOICE is disabled');
    });
  });

  describe('Template Management', () => {
    it('should create template', async () => {
      const template = await service.createTemplate({
        name: 'Custom Template',
        nameRo: 'Șablon Personalizat',
        description: 'A custom notification template',
        descriptionRo: 'Un șablon de notificare personalizat',
        category: 'GENERAL',
        type: 'INFO',
        titleTemplate: 'Custom: {{title}}',
        titleTemplateRo: 'Personalizat: {{title}}',
        messageTemplate: '{{message}}',
        messageTemplateRo: '{{message}}',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'NORMAL',
        variables: [
          { name: 'title', description: 'Title', descriptionRo: 'Titlu', type: 'STRING', required: true },
          { name: 'message', description: 'Message', descriptionRo: 'Mesaj', type: 'STRING', required: true },
        ],
        isActive: true,
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Template');
    });

    it('should emit template.created event', async () => {
      await service.createTemplate({
        name: 'Event Template',
        nameRo: 'Șablon Eveniment',
        description: '',
        descriptionRo: '',
        category: 'GENERAL',
        type: 'INFO',
        titleTemplate: 'T',
        titleTemplateRo: 'T',
        messageTemplate: 'M',
        messageTemplateRo: 'M',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'NORMAL',
        variables: [],
        isActive: true,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.template.created',
        expect.objectContaining({ name: 'Event Template' }),
      );
    });

    it('should update template', async () => {
      const templates = await service.getAllTemplates();
      const updated = await service.updateTemplate(templates[0].id, {
        name: 'Updated Template',
      });

      expect(updated.name).toBe('Updated Template');
    });

    it('should emit template.updated event', async () => {
      const templates = await service.getAllTemplates();
      await service.updateTemplate(templates[0].id, { name: 'Updated' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.template.updated',
        expect.objectContaining({ templateId: templates[0].id }),
      );
    });

    it('should throw error when updating non-existent template', async () => {
      await expect(
        service.updateTemplate('non-existent', { name: 'Fail' }),
      ).rejects.toThrow('Template not found');
    });

    it('should delete template', async () => {
      const template = await service.createTemplate({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: '',
        descriptionRo: '',
        category: 'GENERAL',
        type: 'INFO',
        titleTemplate: 'T',
        titleTemplateRo: 'T',
        messageTemplate: 'M',
        messageTemplateRo: 'M',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'NORMAL',
        variables: [],
        isActive: true,
      });

      await service.deleteTemplate(template.id);

      expect(await service.getTemplate(template.id)).toBeUndefined();
    });

    it('should emit template.deleted event', async () => {
      const template = await service.createTemplate({
        name: 'Delete Event',
        nameRo: 'Eveniment Ștergere',
        description: '',
        descriptionRo: '',
        category: 'GENERAL',
        type: 'INFO',
        titleTemplate: 'T',
        titleTemplateRo: 'T',
        messageTemplate: 'M',
        messageTemplateRo: 'M',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'NORMAL',
        variables: [],
        isActive: true,
      });

      await service.deleteTemplate(template.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.template.deleted',
        expect.objectContaining({ templateId: template.id }),
      );
    });

    it('should throw error when deleting non-existent template', async () => {
      await expect(service.deleteTemplate('non-existent')).rejects.toThrow('Template not found');
    });

    it('should get templates by category', async () => {
      const invoiceTemplates = await service.getTemplatesByCategory('INVOICE');

      expect(invoiceTemplates.length).toBeGreaterThan(0);
      expect(invoiceTemplates.every((t) => t.category === 'INVOICE')).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.sendNotification(mockUserId, 'INFO', 'INVOICE', 'S1', 'S1', 'M', 'M');
      await service.sendNotification(mockUserId, 'SUCCESS', 'PAYMENT', 'S2', 'S2', 'M', 'M');
      await service.sendNotification(mockUserId, 'ALERT', 'SECURITY', 'S3', 'S3', 'M', 'M');
    });

    it('should get notification statistics', async () => {
      const stats = await service.getStats();

      expect(stats.total).toBeGreaterThan(0);
    });

    it('should filter stats by user', async () => {
      const stats = await service.getStats(mockUserId);

      expect(stats.total).toBeGreaterThanOrEqual(3);
    });

    it('should count by type', async () => {
      const stats = await service.getStats();

      expect(stats.byType.INFO).toBeGreaterThanOrEqual(1);
      expect(stats.byType.SUCCESS).toBeGreaterThanOrEqual(1);
    });

    it('should count by category', async () => {
      const stats = await service.getStats();

      expect(stats.byCategory.INVOICE).toBeGreaterThanOrEqual(1);
      expect(stats.byCategory.PAYMENT).toBeGreaterThanOrEqual(1);
    });

    it('should count by channel', async () => {
      const stats = await service.getStats();

      expect(stats.byChannel.IN_APP).toBeGreaterThan(0);
    });

    it('should calculate delivery rate', async () => {
      const stats = await service.getStats();

      expect(stats.deliveryRate).toBeGreaterThanOrEqual(0);
    });

    it('should return recent notifications', async () => {
      const stats = await service.getStats();

      expect(stats.recentNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Romanian Language Support', () => {
    it('should have Romanian template names', async () => {
      const template = await service.getTemplateByName('Invoice Created');

      expect(template!.nameRo).toBe('Factură Creată');
    });

    it('should have Romanian template content', async () => {
      const template = await service.getTemplateByName('Invoice Created');

      expect(template!.titleTemplateRo).toContain('Factura');
      expect(template!.messageTemplateRo).toContain('creată');
    });

    it('should have Romanian variable descriptions', async () => {
      const template = await service.getTemplateByName('Invoice Created');
      const invoiceVar = template!.variables.find((v) => v.name === 'invoiceNumber');

      expect(invoiceVar!.descriptionRo).toBe('Număr factură');
    });

    it('should send ANAF notification in Romanian', async () => {
      const notification = await service.sendFromTemplate(mockUserId, 'ANAF Submission Status', {
        invoiceNumber: 'INV-RO-001',
        status: 'acceptată',
        referenceId: 'ANAF-123',
      });

      expect(notification.titleRo).toContain('ANAF');
      expect(notification.messageRo).toContain('acceptată');
    });
  });
});
