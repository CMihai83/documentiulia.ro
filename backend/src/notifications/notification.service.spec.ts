import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationService,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  CreateNotificationDto,
} from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const createDto: CreateNotificationDto = {
    organizationId: 'org-1',
    userId: 'user-1',
    title: 'Test Notification',
    titleRo: 'Notificare Test',
    message: 'This is a test notification',
    messageRo: 'Aceasta este o notificare de test',
    category: 'SYSTEM',
    priority: 'NORMAL',
    channels: ['IN_APP', 'EMAIL'],
  };

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Notification Creation', () => {
    it('should create a notification', async () => {
      const notification = await service.create(createDto);

      expect(notification.id).toBeDefined();
      expect(notification.title).toBe('Test Notification');
      expect(notification.titleRo).toBe('Notificare Test');
      expect(notification.category).toBe('SYSTEM');
      expect(notification.priority).toBe('NORMAL');
      expect(notification.channels).toContain('IN_APP');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.created', expect.any(Object));
    });

    it('should auto-send notification when not scheduled', async () => {
      const notification = await service.create(createDto);

      expect(notification.status).toBe('SENT');
      expect(notification.sentAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.sent', expect.any(Object));
    });

    it('should keep notification pending when scheduled for future', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const notification = await service.create({
        ...createDto,
        scheduledFor: futureDate,
      });

      expect(notification.status).toBe('PENDING');
      expect(notification.scheduledFor).toEqual(futureDate);
    });

    it('should set default priority to NORMAL', async () => {
      const dto = { ...createDto };
      delete dto.priority;

      const notification = await service.create(dto);

      expect(notification.priority).toBe('NORMAL');
    });

    it('should set default channels to IN_APP', async () => {
      const dto = { ...createDto };
      delete dto.channels;

      const notification = await service.create(dto);

      expect(notification.channels).toContain('IN_APP');
    });

    it('should include action URL when provided', async () => {
      const notification = await service.create({
        ...createDto,
        actionUrl: '/invoices/123',
        actionLabel: 'View Invoice',
        actionLabelRo: 'Vezi Factura',
      });

      expect(notification.actionUrl).toBe('/invoices/123');
      expect(notification.actionLabel).toBe('View Invoice');
      expect(notification.actionLabelRo).toBe('Vezi Factura');
    });

    it('should include custom data', async () => {
      const notification = await service.create({
        ...createDto,
        data: { invoiceId: 'inv-123', amount: 1500 },
      });

      expect(notification.data).toEqual({ invoiceId: 'inv-123', amount: 1500 });
    });
  });

  describe('Template System', () => {
    it('should initialize with default templates', async () => {
      const templates = await service.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name === 'Invoice Created')).toBe(true);
    });

    it('should send notification from template', async () => {
      const templates = await service.getTemplates();
      const invoiceTemplate = templates.find(t => t.name === 'Invoice Created');

      const notification = await service.sendFromTemplate({
        organizationId: 'org-1',
        userId: 'user-1',
        templateId: invoiceTemplate!.id,
        variables: {
          invoiceNumber: 'F2025-0001',
          amount: '1500',
          customerName: 'ABC SRL',
        },
      });

      expect(notification.title).toContain('F2025-0001');
      expect(notification.message).toContain('1500');
      expect(notification.message).toContain('ABC SRL');
    });

    it('should interpolate Romanian template', async () => {
      const templates = await service.getTemplates();
      const invoiceTemplate = templates.find(t => t.name === 'Invoice Created');

      const notification = await service.sendFromTemplate({
        organizationId: 'org-1',
        userId: 'user-1',
        templateId: invoiceTemplate!.id,
        variables: {
          invoiceNumber: 'F2025-0001',
          amount: '1500',
          customerName: 'ABC SRL',
        },
      });

      expect(notification.titleRo).toContain('F2025-0001');
      expect(notification.messageRo).toContain('1500 RON');
    });

    it('should throw when template not found', async () => {
      await expect(service.sendFromTemplate({
        organizationId: 'org-1',
        userId: 'user-1',
        templateId: 'non-existent',
        variables: {},
      })).rejects.toThrow('Template not found');
    });

    it('should throw when template is inactive', async () => {
      const template = await service.createTemplate({
        name: 'Inactive Template',
        nameRo: 'Șablon Inactiv',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'SYSTEM',
        titleTemplate: 'Test',
        titleTemplateRo: 'Test',
        messageTemplate: 'Test',
        messageTemplateRo: 'Test',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'NORMAL',
        variables: [],
        isActive: false,
      });

      await expect(service.sendFromTemplate({
        organizationId: 'org-1',
        userId: 'user-1',
        templateId: template.id,
        variables: {},
      })).rejects.toThrow('Template is not active');
    });

    it('should create custom template', async () => {
      const template = await service.createTemplate({
        name: 'Custom Template',
        nameRo: 'Șablon Personalizat',
        description: 'A custom template',
        descriptionRo: 'Un șablon personalizat',
        category: 'ALERT',
        titleTemplate: 'Alert: {{alertType}}',
        titleTemplateRo: 'Alertă: {{alertType}}',
        messageTemplate: '{{message}}',
        messageTemplateRo: '{{message}}',
        defaultChannels: ['IN_APP', 'PUSH'],
        defaultPriority: 'HIGH',
        variables: ['alertType', 'message'],
        isActive: true,
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Custom Template');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.template.created', expect.any(Object));
    });

    it('should update template', async () => {
      const templates = await service.getTemplates();
      const template = templates[0];

      const updated = await service.updateTemplate(template.id, {
        defaultPriority: 'HIGH',
      });

      expect(updated.defaultPriority).toBe('HIGH');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.template.updated', expect.any(Object));
    });

    it('should delete template', async () => {
      const template = await service.createTemplate({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: 'Will be deleted',
        descriptionRo: 'Va fi șters',
        category: 'SYSTEM',
        titleTemplate: 'Test',
        titleTemplateRo: 'Test',
        messageTemplate: 'Test',
        messageTemplateRo: 'Test',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'NORMAL',
        variables: [],
        isActive: true,
      });

      await service.deleteTemplate(template.id);

      const found = await service.getTemplate(template.id);
      expect(found).toBeNull();
    });

    it('should get templates by category', async () => {
      const templates = await service.getTemplatesByCategory('ANAF');

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.category === 'ANAF')).toBe(true);
    });
  });

  describe('Notification Retrieval', () => {
    it('should get notification by ID', async () => {
      const created = await service.create(createDto);
      const found = await service.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for non-existent notification', async () => {
      const found = await service.getById('non-existent');
      expect(found).toBeNull();
    });

    it('should get user notifications', async () => {
      await service.create(createDto);
      await service.create({ ...createDto, category: 'INVOICE' });

      const result = await service.getUserNotifications('user-1', 'org-1');

      expect(result.notifications.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should filter by category', async () => {
      await service.create(createDto);
      await service.create({ ...createDto, category: 'INVOICE' });

      const result = await service.getUserNotifications('user-1', 'org-1', { category: 'INVOICE' });

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].category).toBe('INVOICE');
    });

    it('should filter unread only', async () => {
      const notification1 = await service.create(createDto);
      await service.create(createDto);
      await service.markAsRead(notification1.id);

      const result = await service.getUserNotifications('user-1', 'org-1', { unreadOnly: true });

      expect(result.notifications.length).toBe(1);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await service.create({ ...createDto, title: `Notification ${i}` });
      }

      const result = await service.getUserNotifications('user-1', 'org-1', { limit: 2, offset: 0 });

      expect(result.notifications.length).toBe(2);
      expect(result.total).toBe(5);
    });

    it('should return unread count', async () => {
      const n1 = await service.create(createDto);
      await service.create(createDto);
      await service.create(createDto);
      await service.markAsRead(n1.id);

      const result = await service.getUserNotifications('user-1', 'org-1');

      expect(result.unreadCount).toBe(2);
    });
  });

  describe('Mark As Read', () => {
    it('should mark notification as read', async () => {
      const notification = await service.create(createDto);
      const read = await service.markAsRead(notification.id);

      expect(read.status).toBe('READ');
      expect(read.readAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.read', expect.any(Object));
    });

    it('should throw when marking non-existent notification', async () => {
      await expect(service.markAsRead('non-existent'))
        .rejects.toThrow('Notification not found');
    });

    it('should mark all as read', async () => {
      await service.create(createDto);
      await service.create(createDto);
      await service.create(createDto);

      const count = await service.markAllAsRead('user-1', 'org-1');

      expect(count).toBe(3);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.all.read', expect.any(Object));
    });
  });

  describe('Notification Status', () => {
    it('should mark as delivered', async () => {
      const notification = await service.create(createDto);
      const delivered = await service.markAsDelivered(notification.id);

      expect(delivered.status).toBe('DELIVERED');
      expect(delivered.deliveredAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.delivered', expect.any(Object));
    });
  });

  describe('Bulk Notifications', () => {
    it('should send bulk notifications', async () => {
      const notifications = await service.sendBulk({
        organizationId: 'org-1',
        userIds: ['user-1', 'user-2', 'user-3'],
        title: 'Bulk Notification',
        titleRo: 'Notificare în Masă',
        message: 'This is a bulk notification',
        messageRo: 'Aceasta este o notificare în masă',
        category: 'SYSTEM',
      });

      expect(notifications.length).toBe(3);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.bulk.sent', { count: 3 });
    });

    it('should send to group', async () => {
      const group = await service.createGroup('org-1', 'Test Group', 'Grup Test', ['user-1', 'user-2']);

      const notifications = await service.sendToGroup(group.id, {
        organizationId: 'org-1',
        title: 'Group Notification',
        titleRo: 'Notificare Grup',
        message: 'Message to group',
        messageRo: 'Mesaj către grup',
        category: 'SYSTEM',
      });

      expect(notifications.length).toBe(2);
    });

    it('should throw when sending to non-existent group', async () => {
      await expect(service.sendToGroup('non-existent', {
        organizationId: 'org-1',
        title: 'Test',
        titleRo: 'Test',
        message: 'Test',
        messageRo: 'Test',
        category: 'SYSTEM',
      })).rejects.toThrow('Group not found');
    });
  });

  describe('Preferences', () => {
    it('should set user preference', async () => {
      const preference = await service.setPreference('user-1', 'org-1', 'INVOICE', {
        channels: ['IN_APP', 'EMAIL'],
        enabled: true,
        emailDigest: 'DAILY',
      });

      expect(preference.userId).toBe('user-1');
      expect(preference.category).toBe('INVOICE');
      expect(preference.channels).toContain('EMAIL');
      expect(preference.emailDigest).toBe('DAILY');
    });

    it('should update existing preference', async () => {
      await service.setPreference('user-1', 'org-1', 'INVOICE', { enabled: true });
      const updated = await service.setPreference('user-1', 'org-1', 'INVOICE', { enabled: false });

      expect(updated.enabled).toBe(false);
    });

    it('should get user preference', async () => {
      await service.setPreference('user-1', 'org-1', 'PAYMENT', { enabled: true });

      const preference = await service.getPreference('user-1', 'PAYMENT');

      expect(preference).not.toBeNull();
      expect(preference!.category).toBe('PAYMENT');
    });

    it('should get all user preferences', async () => {
      await service.setPreference('user-1', 'org-1', 'INVOICE', { enabled: true });
      await service.setPreference('user-1', 'org-1', 'PAYMENT', { enabled: false });

      const preferences = await service.getUserPreferences('user-1');

      expect(preferences.length).toBe(2);
    });

    it('should disable category', async () => {
      await service.disableCategory('user-1', 'org-1', 'MARKETING');

      const preference = await service.getPreference('user-1', 'MARKETING');

      expect(preference!.enabled).toBe(false);
    });

    it('should enable category', async () => {
      await service.disableCategory('user-1', 'org-1', 'MARKETING');
      await service.enableCategory('user-1', 'org-1', 'MARKETING');

      const preference = await service.getPreference('user-1', 'MARKETING');

      expect(preference!.enabled).toBe(true);
    });

    it('should set quiet hours', async () => {
      const preference = await service.setPreference('user-1', 'org-1', 'SYSTEM', {
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      expect(preference.quietHoursStart).toBe('22:00');
      expect(preference.quietHoursEnd).toBe('08:00');
    });
  });

  describe('Groups', () => {
    it('should create group', async () => {
      const group = await service.createGroup('org-1', 'Managers', 'Manageri', ['user-1', 'user-2']);

      expect(group.id).toBeDefined();
      expect(group.name).toBe('Managers');
      expect(group.nameRo).toBe('Manageri');
      expect(group.userIds).toHaveLength(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.group.created', expect.any(Object));
    });

    it('should update group', async () => {
      const group = await service.createGroup('org-1', 'Team', 'Echipă', ['user-1']);
      const updated = await service.updateGroup(group.id, { name: 'Updated Team' });

      expect(updated.name).toBe('Updated Team');
    });

    it('should delete group', async () => {
      const group = await service.createGroup('org-1', 'To Delete', 'De Șters', []);
      await service.deleteGroup(group.id);

      const found = await service.getGroup(group.id);
      expect(found).toBeNull();
    });

    it('should throw when deleting non-existent group', async () => {
      await expect(service.deleteGroup('non-existent'))
        .rejects.toThrow('Group not found');
    });

    it('should add user to group', async () => {
      const group = await service.createGroup('org-1', 'Team', 'Echipă', ['user-1']);
      const updated = await service.addUserToGroup(group.id, 'user-2');

      expect(updated.userIds).toContain('user-2');
    });

    it('should not duplicate user in group', async () => {
      const group = await service.createGroup('org-1', 'Team', 'Echipă', ['user-1']);
      await service.addUserToGroup(group.id, 'user-1');

      const found = await service.getGroup(group.id);
      expect(found!.userIds.filter(id => id === 'user-1').length).toBe(1);
    });

    it('should remove user from group', async () => {
      const group = await service.createGroup('org-1', 'Team', 'Echipă', ['user-1', 'user-2']);
      const updated = await service.removeUserFromGroup(group.id, 'user-1');

      expect(updated.userIds).not.toContain('user-1');
      expect(updated.userIds).toContain('user-2');
    });

    it('should get organization groups', async () => {
      await service.createGroup('org-1', 'Group 1', 'Grup 1', []);
      await service.createGroup('org-1', 'Group 2', 'Grup 2', []);
      await service.createGroup('org-2', 'Other Group', 'Alt Grup', []);

      const groups = await service.getGroups('org-1');

      expect(groups.length).toBe(2);
    });
  });

  describe('Device Tokens', () => {
    it('should register device token', async () => {
      await service.registerDeviceToken('user-1', 'token-123');

      const tokens = await service.getUserDeviceTokens('user-1');

      expect(tokens).toContain('token-123');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.device.registered', expect.any(Object));
    });

    it('should not duplicate device token', async () => {
      await service.registerDeviceToken('user-1', 'token-123');
      await service.registerDeviceToken('user-1', 'token-123');

      const tokens = await service.getUserDeviceTokens('user-1');

      expect(tokens.filter(t => t === 'token-123').length).toBe(1);
    });

    it('should unregister device token', async () => {
      await service.registerDeviceToken('user-1', 'token-123');
      await service.unregisterDeviceToken('user-1', 'token-123');

      const tokens = await service.getUserDeviceTokens('user-1');

      expect(tokens).not.toContain('token-123');
    });
  });

  describe('Notification Deletion', () => {
    it('should delete notification', async () => {
      const notification = await service.create(createDto);
      await service.delete(notification.id);

      const found = await service.getById(notification.id);
      expect(found).toBeNull();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.deleted', expect.any(Object));
    });

    it('should throw when deleting non-existent notification', async () => {
      await expect(service.delete('non-existent'))
        .rejects.toThrow('Notification not found');
    });

    it('should delete old notifications', async () => {
      // Create an old notification by manipulating createdAt
      const notification = await service.create(createDto);
      const found = await service.getById(notification.id);
      found!.createdAt = new Date('2020-01-01');

      const count = await service.deleteOld(30);

      expect(count).toBeGreaterThanOrEqual(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.cleanup', expect.any(Object));
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', async () => {
      const n1 = await service.create({ ...createDto, category: 'INVOICE' });
      const n2 = await service.create({ ...createDto, category: 'PAYMENT' });
      await service.markAsDelivered(n1.id);
      await service.markAsRead(n1.id);

      const stats = await service.getStatistics('org-1');

      expect(stats.totalSent).toBe(2);
      expect(stats.totalDelivered).toBe(1);
      expect(stats.totalRead).toBe(1);
      expect(stats.byCategory['INVOICE']).toBe(1);
      expect(stats.byCategory['PAYMENT']).toBe(1);
    });

    it('should calculate delivery rate', async () => {
      const n1 = await service.create(createDto);
      await service.create(createDto);
      await service.markAsDelivered(n1.id);

      const stats = await service.getStatistics('org-1');

      expect(stats.deliveryRate).toBe(50);
    });

    it('should calculate read rate', async () => {
      const n1 = await service.create(createDto);
      const n2 = await service.create(createDto);
      await service.markAsDelivered(n1.id);
      await service.markAsDelivered(n2.id);
      await service.markAsRead(n1.id);

      const stats = await service.getStatistics('org-1');

      expect(stats.readRate).toBe(50);
    });

    it('should filter by date range', async () => {
      await service.create(createDto);

      const future = new Date();
      future.setDate(future.getDate() + 1);

      const stats = await service.getStatistics('org-1', new Date(), future);

      expect(stats.totalSent).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Metadata', () => {
    it('should get all categories', async () => {
      const categories = await service.getCategories();

      expect(categories.length).toBe(12);
      expect(categories.map(c => c.category)).toContain('INVOICE');
      expect(categories.map(c => c.category)).toContain('ANAF');
    });

    it('should have Romanian names for categories', async () => {
      const categories = await service.getCategories();

      expect(categories.every(c => c.nameRo && c.nameRo.length > 0)).toBe(true);
      expect(categories.find(c => c.category === 'INVOICE')?.nameRo).toBe('Factură');
    });

    it('should get all channels', async () => {
      const channels = await service.getChannels();

      expect(channels.length).toBe(5);
      expect(channels.map(c => c.channel)).toContain('IN_APP');
      expect(channels.map(c => c.channel)).toContain('PUSH');
    });

    it('should have Romanian names for channels', async () => {
      const channels = await service.getChannels();

      expect(channels.every(c => c.nameRo && c.nameRo.length > 0)).toBe(true);
      expect(channels.find(c => c.channel === 'IN_APP')?.nameRo).toBe('În Aplicație');
    });

    it('should get all priorities', async () => {
      const priorities = await service.getPriorities();

      expect(priorities.length).toBe(4);
      expect(priorities.map(p => p.priority)).toContain('URGENT');
    });

    it('should have Romanian names for priorities', async () => {
      const priorities = await service.getPriorities();

      expect(priorities.every(p => p.nameRo && p.nameRo.length > 0)).toBe(true);
      expect(priorities.find(p => p.priority === 'HIGH')?.nameRo).toBe('Ridicată');
    });
  });

  describe('Romanian Localization', () => {
    it('should use Romanian diacritics correctly', async () => {
      const categories = await service.getCategories();
      const priorities = await service.getPriorities();
      const channels = await service.getChannels();

      // Check for diacritics (ă, ș, ț, î, â)
      expect(categories.some(c => c.nameRo.includes('ă'))).toBe(true);
      expect(priorities.some(p => p.nameRo.includes('ă'))).toBe(true);
      expect(channels.some(ch => ch.nameRo.includes('ț'))).toBe(true);
    });

    it('should have Romanian template content', async () => {
      const templates = await service.getTemplates();
      const anafTemplate = templates.find(t => t.name.includes('ANAF'));

      expect(anafTemplate).toBeDefined();
      expect(anafTemplate!.nameRo).toContain('ANAF');
      expect(anafTemplate!.titleTemplateRo).toBeDefined();
      expect(anafTemplate!.messageTemplateRo).toBeDefined();
    });
  });

  describe('ANAF Integration', () => {
    it('should have ANAF submission success template', async () => {
      const templates = await service.getTemplates();
      const template = templates.find(t => t.name === 'ANAF Submission Success');

      expect(template).toBeDefined();
      expect(template!.category).toBe('ANAF');
      expect(template!.variables).toContain('documentType');
      expect(template!.variables).toContain('reference');
    });

    it('should have ANAF submission failed template', async () => {
      const templates = await service.getTemplates();
      const template = templates.find(t => t.name === 'ANAF Submission Failed');

      expect(template).toBeDefined();
      expect(template!.defaultPriority).toBe('URGENT');
      expect(template!.defaultChannels).toContain('PUSH');
    });

    it('should send ANAF notification from template', async () => {
      const templates = await service.getTemplates();
      const template = templates.find(t => t.name === 'ANAF Submission Success');

      const notification = await service.sendFromTemplate({
        organizationId: 'org-1',
        userId: 'user-1',
        templateId: template!.id,
        variables: {
          documentType: 'e-Factura',
          reference: 'REF-2025-001',
        },
      });

      expect(notification.category).toBe('ANAF');
      expect(notification.message).toContain('e-Factura');
      expect(notification.message).toContain('REF-2025-001');
    });
  });

  describe('Security Notifications', () => {
    it('should have security alert template', async () => {
      const templates = await service.getTemplates();
      const template = templates.find(t => t.name === 'Security Alert');

      expect(template).toBeDefined();
      expect(template!.defaultPriority).toBe('URGENT');
      expect(template!.defaultChannels).toContain('SMS');
    });

    it('should send urgent security notifications', async () => {
      const templates = await service.getTemplates();
      const template = templates.find(t => t.name === 'Security Alert');

      const notification = await service.sendFromTemplate({
        organizationId: 'org-1',
        userId: 'user-1',
        templateId: template!.id,
        variables: {
          alertType: 'Failed Login',
          description: 'Multiple failed login attempts',
          ipAddress: '192.168.1.100',
          timestamp: '2025-12-14 10:30:00',
        },
      });

      expect(notification.priority).toBe('URGENT');
      expect(notification.channels).toContain('SMS');
    });
  });
});
