import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  NotificationHubService,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from './notification-hub.service';

describe('NotificationHubService', () => {
  let service: NotificationHubService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationHubService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationHubService>(NotificationHubService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('System Templates', () => {
    it('should initialize with system templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(4);
    });

    it('should have welcome email template', () => {
      const templates = service.getTemplates({ category: 'SYSTEM' });
      const welcome = templates.find((t) => t.name === 'Welcome Email');
      expect(welcome).toBeDefined();
      expect(welcome?.nameRo).toBe('Email de Bun Venit');
    });

    it('should have password reset template', () => {
      const templates = service.getTemplates({ category: 'SECURITY' });
      const reset = templates.find((t) => t.name === 'Password Reset');
      expect(reset).toBeDefined();
      expect(reset?.channels).toContain('EMAIL');
    });

    it('should have invoice due reminder template', () => {
      const templates = service.getTemplates({ category: 'BILLING' });
      const reminder = templates.find((t) => t.name === 'Invoice Due Reminder');
      expect(reminder).toBeDefined();
      expect(reminder?.channels).toContain('SMS');
    });

    it('should have ANAF deadline alert template', () => {
      const templates = service.getTemplates({ category: 'ALERTS' });
      const alert = templates.find((t) => t.name === 'ANAF Deadline Alert');
      expect(alert).toBeDefined();
      expect(alert?.channels).toContain('PUSH');
    });

    it('should have bilingual content in templates', () => {
      const templates = service.getTemplates();
      templates.forEach((t) => {
        expect(t.nameRo).toBeDefined();
        expect(t.descriptionRo).toBeDefined();
        expect(t.subjectRo).toBeDefined();
        expect(t.bodyRo).toBeDefined();
      });
    });
  });

  describe('Template Management', () => {
    it('should create a template', () => {
      const template = service.createTemplate({
        name: 'Test Template',
        nameRo: 'Șablon Test',
        description: 'A test template',
        descriptionRo: 'Un șablon de test',
        category: 'UPDATES',
        channels: ['EMAIL', 'PUSH'],
        subject: 'Test Subject',
        subjectRo: 'Subiect Test',
        body: 'Test body {{name}}',
        bodyRo: 'Corp test {{name}}',
        variables: [
          { name: 'name', label: 'Name', labelRo: 'Nume', type: 'STRING', required: true },
        ],
        createdBy: 'user-1',
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.isActive).toBe(true);
    });

    it('should get template by id', () => {
      const created = service.createTemplate({
        name: 'Get Template',
        nameRo: 'Obține Șablon',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'SYSTEM',
        channels: ['EMAIL'],
        subject: 'Subject',
        subjectRo: 'Subiect',
        body: 'Body',
        bodyRo: 'Corp',
        createdBy: 'user-1',
      });

      const retrieved = service.getTemplate(created.id);
      expect(retrieved.name).toBe('Get Template');
    });

    it('should throw NotFoundException for invalid template id', () => {
      expect(() => service.getTemplate('invalid-id')).toThrow(NotFoundException);
    });

    it('should filter templates by category', () => {
      service.createTemplate({
        name: 'Billing Template',
        nameRo: 'Șablon Facturare',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'BILLING',
        channels: ['EMAIL'],
        subject: 'Subject',
        subjectRo: 'Subiect',
        body: 'Body',
        bodyRo: 'Corp',
        createdBy: 'user-1',
      });

      const billing = service.getTemplates({ category: 'BILLING' });
      expect(billing.every((t) => t.category === 'BILLING')).toBe(true);
    });

    it('should filter templates by channel', () => {
      const templates = service.getTemplates({ channel: 'SMS' });
      expect(templates.every((t) => t.channels.includes('SMS'))).toBe(true);
    });

    it('should filter active templates', () => {
      const templates = service.getTemplates({ active: true });
      expect(templates.every((t) => t.isActive)).toBe(true);
    });

    it('should update template', () => {
      const created = service.createTemplate({
        name: 'Update Template',
        nameRo: 'Actualizare Șablon',
        description: 'Original',
        descriptionRo: 'Original',
        category: 'UPDATES',
        channels: ['EMAIL'],
        subject: 'Subject',
        subjectRo: 'Subiect',
        body: 'Body',
        bodyRo: 'Corp',
        createdBy: 'user-1',
      });

      const updated = service.updateTemplate(created.id, { description: 'Updated description' });
      expect(updated.description).toBe('Updated description');
      expect(updated.name).toBe('Update Template');
    });

    it('should not modify system templates', () => {
      const templates = service.getTemplates();
      const systemTemplate = templates.find((t) => t.createdBy === 'system');

      expect(() => service.updateTemplate(systemTemplate!.id, { name: 'Hacked' })).toThrow(BadRequestException);
    });

    it('should delete template', () => {
      const created = service.createTemplate({
        name: 'Delete Template',
        nameRo: 'Șterge Șablon',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'UPDATES',
        channels: ['EMAIL'],
        subject: 'Subject',
        subjectRo: 'Subiect',
        body: 'Body',
        bodyRo: 'Corp',
        createdBy: 'user-1',
      });

      service.deleteTemplate(created.id);
      expect(() => service.getTemplate(created.id)).toThrow(NotFoundException);
    });

    it('should not delete system templates', () => {
      const templates = service.getTemplates();
      const systemTemplate = templates.find((t) => t.createdBy === 'system');

      expect(() => service.deleteTemplate(systemTemplate!.id)).toThrow(BadRequestException);
    });

    it('should emit template created event', () => {
      service.createTemplate({
        name: 'Event Template',
        nameRo: 'Șablon Eveniment',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'UPDATES',
        channels: ['EMAIL'],
        subject: 'Subject',
        subjectRo: 'Subiect',
        body: 'Body',
        bodyRo: 'Corp',
        createdBy: 'user-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.template.created', expect.any(Object));
    });
  });

  describe('User Preferences', () => {
    it('should create default preferences for new user', () => {
      const prefs = service.getUserPreferences('new-user');

      expect(prefs.userId).toBe('new-user');
      expect(prefs.language).toBe('RO');
      expect(prefs.channels.EMAIL.enabled).toBe(true);
    });

    it('should have default channel settings', () => {
      const prefs = service.getUserPreferences('user-1');

      expect(prefs.channels.EMAIL.enabled).toBe(true);
      expect(prefs.channels.SMS.enabled).toBe(true);
      expect(prefs.channels.PUSH.enabled).toBe(true);
      expect(prefs.channels.IN_APP.enabled).toBe(true);
      expect(prefs.channels.SLACK.enabled).toBe(false);
      expect(prefs.channels.WEBHOOK.enabled).toBe(false);
    });

    it('should have default category settings', () => {
      const prefs = service.getUserPreferences('user-1');

      expect(prefs.categories.SYSTEM.enabled).toBe(true);
      expect(prefs.categories.BILLING.enabled).toBe(true);
      expect(prefs.categories.SECURITY.enabled).toBe(true);
      expect(prefs.categories.MARKETING.enabled).toBe(false);
      expect(prefs.categories.ALERTS.enabled).toBe(true);
    });

    it('should have quiet hours settings', () => {
      const prefs = service.getUserPreferences('user-1');

      expect(prefs.quietHours.enabled).toBe(false);
      expect(prefs.quietHours.start).toBe('22:00');
      expect(prefs.quietHours.end).toBe('08:00');
      expect(prefs.quietHours.timezone).toBe('Europe/Bucharest');
    });

    it('should update user preferences', () => {
      service.getUserPreferences('user-2');

      const updated = service.updateUserPreferences('user-2', { language: 'EN' });
      expect(updated.language).toBe('EN');
    });

    it('should update channel preferences', () => {
      const prefs = service.getUserPreferences('user-3');
      prefs.channels.SMS.enabled = false;

      const updated = service.updateUserPreferences('user-3', { channels: prefs.channels });
      expect(updated.channels.SMS.enabled).toBe(false);
    });

    it('should emit preferences updated event', () => {
      service.getUserPreferences('user-4');
      service.updateUserPreferences('user-4', { language: 'EN' });

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.preferences.updated', { userId: 'user-4' });
    });
  });

  describe('Notification Sending', () => {
    beforeEach(() => {
      service.getUserPreferences('recipient-1');
    });

    it('should send a notification', async () => {
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        category: 'SYSTEM',
        subject: 'Test Subject',
        body: 'Test body',
        createdBy: 'sender-1',
      });

      expect(notification.id).toBeDefined();
      expect(notification.status).toBe('SENT');
      expect(notification.sentAt).toBeDefined();
    });

    it('should send notification using template', async () => {
      const template = service.createTemplate({
        name: 'Send Template',
        nameRo: 'Șablon Trimitere',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'UPDATES',
        channels: ['EMAIL'],
        subject: 'Hello {{name}}',
        subjectRo: 'Bună {{name}}',
        body: 'Welcome {{name}}!',
        bodyRo: 'Bine ai venit {{name}}!',
        createdBy: 'user-1',
      });

      const notification = await service.send({
        templateId: template.id,
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        variables: { name: 'Ion' },
        createdBy: 'sender-1',
      });

      expect(notification.subject).toBe('Bună Ion');
      expect(notification.body).toBe('Bine ai venit Ion!');
    });

    it('should use user language preference for template', async () => {
      service.updateUserPreferences('recipient-1', { language: 'EN' });

      const template = service.createTemplate({
        name: 'Language Template',
        nameRo: 'Șablon Limbă',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'UPDATES',
        channels: ['EMAIL'],
        subject: 'English Subject',
        subjectRo: 'Subiect Românesc',
        body: 'English body',
        bodyRo: 'Corp românesc',
        createdBy: 'user-1',
      });

      const notification = await service.send({
        templateId: template.id,
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        createdBy: 'sender-1',
      });

      expect(notification.subject).toBe('English Subject');
    });

    it('should throw for disabled channel', async () => {
      const config = service.getChannelConfig('WEBHOOK');
      service.updateChannelConfig('WEBHOOK', { enabled: false });

      await expect(
        service.send({
          recipientId: 'recipient-1',
          channel: 'WEBHOOK',
          subject: 'Test',
          body: 'Test',
          createdBy: 'sender-1',
        }),
      ).rejects.toThrow(BadRequestException);

      service.updateChannelConfig('WEBHOOK', { enabled: true });
    });

    it('should throw when user disabled channel', async () => {
      const prefs = service.getUserPreferences('recipient-disabled');
      prefs.channels.EMAIL.enabled = false;
      service.updateUserPreferences('recipient-disabled', { channels: prefs.channels });

      await expect(
        service.send({
          recipientId: 'recipient-disabled',
          channel: 'EMAIL',
          subject: 'Test',
          body: 'Test',
          createdBy: 'sender-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when user disabled category', async () => {
      const prefs = service.getUserPreferences('recipient-nomarketing');
      prefs.categories.MARKETING.enabled = false;
      service.updateUserPreferences('recipient-nomarketing', { channels: prefs.channels, categories: prefs.categories });

      await expect(
        service.send({
          recipientId: 'recipient-nomarketing',
          channel: 'EMAIL',
          category: 'MARKETING',
          subject: 'Test',
          body: 'Test',
          createdBy: 'sender-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for inactive template', async () => {
      const template = service.createTemplate({
        name: 'Inactive Template',
        nameRo: 'Șablon Inactiv',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'UPDATES',
        channels: ['EMAIL'],
        subject: 'Subject',
        subjectRo: 'Subiect',
        body: 'Body',
        bodyRo: 'Corp',
        createdBy: 'user-1',
      });

      service.updateTemplate(template.id, { isActive: false } as any);

      await expect(
        service.send({
          templateId: template.id,
          recipientId: 'recipient-1',
          channel: 'EMAIL',
          createdBy: 'sender-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when template does not support channel', async () => {
      const template = service.createTemplate({
        name: 'Email Only',
        nameRo: 'Doar Email',
        description: 'Test',
        descriptionRo: 'Test',
        category: 'UPDATES',
        channels: ['EMAIL'],
        subject: 'Subject',
        subjectRo: 'Subiect',
        body: 'Body',
        bodyRo: 'Corp',
        createdBy: 'user-1',
      });

      await expect(
        service.send({
          templateId: template.id,
          recipientId: 'recipient-1',
          channel: 'SMS',
          createdBy: 'sender-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should schedule notification', async () => {
      const futureDate = new Date(Date.now() + 86400000);

      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Scheduled',
        body: 'Scheduled notification',
        scheduledAt: futureDate,
        createdBy: 'sender-1',
      });

      expect(notification.status).toBe('PENDING');
      expect(notification.scheduledAt).toEqual(futureDate);
    });

    it('should set priority', async () => {
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        priority: 'URGENT',
        subject: 'Urgent',
        body: 'Urgent notification',
        createdBy: 'sender-1',
      });

      expect(notification.priority).toBe('URGENT');
    });

    it('should emit notification created event', async () => {
      await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Test',
        body: 'Test',
        createdBy: 'sender-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', expect.any(Object));
    });

    it('should emit notification sent event', async () => {
      await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Test',
        body: 'Test',
        createdBy: 'sender-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.sent', expect.any(Object));
    });
  });

  describe('Notification Retrieval', () => {
    let notificationId: string;

    beforeEach(async () => {
      service.getUserPreferences('recipient-1');
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        category: 'SYSTEM',
        subject: 'Test',
        body: 'Test',
        createdBy: 'sender-1',
      });
      notificationId = notification.id;
    });

    it('should get notification by id', () => {
      const notification = service.getNotification(notificationId);
      expect(notification.subject).toBe('Test');
    });

    it('should throw for invalid notification id', () => {
      expect(() => service.getNotification('invalid-id')).toThrow(NotFoundException);
    });

    it('should get notifications for recipient', () => {
      const notifications = service.getNotifications({ recipientId: 'recipient-1' });
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.every((n) => n.recipientId === 'recipient-1')).toBe(true);
    });

    it('should filter by channel', async () => {
      await service.send({
        recipientId: 'recipient-1',
        channel: 'PUSH',
        subject: 'Push',
        body: 'Push notification',
        createdBy: 'sender-1',
      });

      const notifications = service.getNotifications({ channel: 'PUSH' });
      expect(notifications.every((n) => n.channel === 'PUSH')).toBe(true);
    });

    it('should filter by category', () => {
      const notifications = service.getNotifications({ category: 'SYSTEM' });
      expect(notifications.every((n) => n.category === 'SYSTEM')).toBe(true);
    });

    it('should filter by status', () => {
      const notifications = service.getNotifications({ status: 'SENT' });
      expect(notifications.every((n) => n.status === 'SENT')).toBe(true);
    });

    it('should limit results', async () => {
      for (let i = 0; i < 5; i++) {
        await service.send({
          recipientId: 'recipient-1',
          channel: 'EMAIL',
          subject: `Test ${i}`,
          body: 'Test',
          createdBy: 'sender-1',
        });
      }

      const notifications = service.getNotifications({ limit: 3 });
      expect(notifications.length).toBe(3);
    });

    it('should sort by created date descending', async () => {
      await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Newer',
        body: 'Test',
        createdBy: 'sender-1',
      });

      const notifications = service.getNotifications({ recipientId: 'recipient-1' });
      for (let i = 0; i < notifications.length - 1; i++) {
        expect(notifications[i].createdAt.getTime()).toBeGreaterThanOrEqual(notifications[i + 1].createdAt.getTime());
      }
    });
  });

  describe('Notification Actions', () => {
    beforeEach(() => {
      service.getUserPreferences('recipient-1');
    });

    it('should cancel pending notification', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Cancel Me',
        body: 'Test',
        scheduledAt: futureDate,
        createdBy: 'sender-1',
      });

      const cancelled = service.cancelNotification(notification.id);
      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw when cancelling already sent notification', async () => {
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Already Sent',
        body: 'Test',
        createdBy: 'sender-1',
      });

      expect(() => service.cancelNotification(notification.id)).toThrow(BadRequestException);
    });

    it('should retry failed notification', async () => {
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Retry Test',
        body: 'Test',
        metadata: { simulateFailure: true },
        createdBy: 'sender-1',
      });

      expect(notification.status).toBe('FAILED');

      const updated = service.getNotification(notification.id);
      // Force update to enable retry
      (updated as any).metadata = {};

      const retried = await service.retryNotification(notification.id);
      expect(retried.retryCount).toBe(1);
    });

    it('should throw when retrying non-failed notification', async () => {
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'EMAIL',
        subject: 'Success',
        body: 'Test',
        createdBy: 'sender-1',
      });

      await expect(service.retryNotification(notification.id)).rejects.toThrow(BadRequestException);
    });

    it('should mark notification as read', async () => {
      const notification = await service.send({
        recipientId: 'recipient-1',
        channel: 'IN_APP',
        subject: 'Read Me',
        body: 'Test',
        createdBy: 'sender-1',
      });

      const marked = service.markAsRead(notification.id);
      expect(marked.metadata.readAt).toBeDefined();
    });

    it('should get unread count', async () => {
      await service.send({
        recipientId: 'recipient-1',
        channel: 'IN_APP',
        subject: 'Unread 1',
        body: 'Test',
        createdBy: 'sender-1',
      });

      await service.send({
        recipientId: 'recipient-1',
        channel: 'IN_APP',
        subject: 'Unread 2',
        body: 'Test',
        createdBy: 'sender-1',
      });

      const count = service.getUnreadCount('recipient-1');
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Batch Notifications', () => {
    let templateId: string;

    beforeEach(() => {
      const template = service.createTemplate({
        name: 'Batch Template',
        nameRo: 'Șablon Lot',
        description: 'For batch sending',
        descriptionRo: 'Pentru trimitere în lot',
        category: 'UPDATES',
        channels: ['EMAIL', 'SMS'],
        subject: 'Batch Subject',
        subjectRo: 'Subiect Lot',
        body: 'Batch body',
        bodyRo: 'Corp lot',
        createdBy: 'user-1',
      });
      templateId = template.id;

      ['batch-user-1', 'batch-user-2', 'batch-user-3'].forEach((userId) => {
        service.getUserPreferences(userId);
      });
    });

    it('should create a batch', () => {
      const batch = service.createBatch(
        'Test Batch',
        templateId,
        ['batch-user-1', 'batch-user-2'],
        'EMAIL',
        undefined,
        'sender-1',
      );

      expect(batch.id).toBeDefined();
      expect(batch.status).toBe('DRAFT');
      expect(batch.totalCount).toBe(2);
    });

    it('should create scheduled batch', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const batch = service.createBatch(
        'Scheduled Batch',
        templateId,
        ['batch-user-1'],
        'EMAIL',
        futureDate,
        'sender-1',
      );

      expect(batch.status).toBe('SCHEDULED');
      expect(batch.scheduledAt).toEqual(futureDate);
    });

    it('should throw for unsupported channel', () => {
      expect(() =>
        service.createBatch('Invalid Batch', templateId, ['batch-user-1'], 'PUSH', undefined, 'sender-1'),
      ).toThrow(BadRequestException);
    });

    it('should get batch by id', () => {
      const created = service.createBatch(
        'Get Batch',
        templateId,
        ['batch-user-1'],
        'EMAIL',
        undefined,
        'sender-1',
      );

      const retrieved = service.getBatch(created.id);
      expect(retrieved.name).toBe('Get Batch');
    });

    it('should throw for invalid batch id', () => {
      expect(() => service.getBatch('invalid-id')).toThrow(NotFoundException);
    });

    it('should get all batches', () => {
      service.createBatch('Batch 1', templateId, ['batch-user-1'], 'EMAIL', undefined, 'sender-1');
      service.createBatch('Batch 2', templateId, ['batch-user-2'], 'EMAIL', undefined, 'sender-1');

      const batches = service.getBatches();
      expect(batches.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter batches by status', () => {
      service.createBatch('Draft Batch', templateId, ['batch-user-1'], 'EMAIL', undefined, 'sender-1');

      const drafts = service.getBatches({ status: 'DRAFT' });
      expect(drafts.every((b) => b.status === 'DRAFT')).toBe(true);
    });

    it('should process batch', async () => {
      const batch = service.createBatch(
        'Process Batch',
        templateId,
        ['batch-user-1', 'batch-user-2'],
        'EMAIL',
        undefined,
        'sender-1',
      );

      const processed = await service.processBatch(batch.id);
      expect(processed.status).toBe('COMPLETED');
      expect(processed.sentCount).toBe(2);
      expect(processed.failedCount).toBe(0);
    });

    it('should track processing start time', async () => {
      const batch = service.createBatch(
        'Timed Batch',
        templateId,
        ['batch-user-1'],
        'EMAIL',
        undefined,
        'sender-1',
      );

      const processed = await service.processBatch(batch.id);
      expect(processed.startedAt).toBeDefined();
      expect(processed.completedAt).toBeDefined();
    });

    it('should cancel draft batch', () => {
      const batch = service.createBatch(
        'Cancel Batch',
        templateId,
        ['batch-user-1'],
        'EMAIL',
        undefined,
        'sender-1',
      );

      const cancelled = service.cancelBatch(batch.id);
      expect(cancelled.status).toBe('FAILED');
    });

    it('should throw when cancelling processing batch', async () => {
      const batch = service.createBatch(
        'Processing Batch',
        templateId,
        ['batch-user-1'],
        'EMAIL',
        undefined,
        'sender-1',
      );

      await service.processBatch(batch.id);

      expect(() => service.cancelBatch(batch.id)).toThrow(BadRequestException);
    });

    it('should emit batch created event', () => {
      service.createBatch('Event Batch', templateId, ['batch-user-1'], 'EMAIL', undefined, 'sender-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.batch.created', expect.any(Object));
    });

    it('should emit batch completed event', async () => {
      const batch = service.createBatch(
        'Complete Batch',
        templateId,
        ['batch-user-1'],
        'EMAIL',
        undefined,
        'sender-1',
      );

      await service.processBatch(batch.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.batch.completed',
        expect.objectContaining({ batchId: batch.id }),
      );
    });
  });

  describe('Channel Configuration', () => {
    it('should get channel config', () => {
      const config = service.getChannelConfig('EMAIL');

      expect(config.channel).toBe('EMAIL');
      expect(config.enabled).toBe(true);
      expect(config.rateLimitPerMinute).toBeDefined();
    });

    it('should get all channel configs', () => {
      const configs = service.getChannelConfigs();

      expect(configs.length).toBe(6);
      expect(configs.map((c) => c.channel)).toContain('EMAIL');
      expect(configs.map((c) => c.channel)).toContain('SMS');
    });

    it('should throw for invalid channel', () => {
      expect(() => service.getChannelConfig('INVALID' as NotificationChannel)).toThrow(NotFoundException);
    });

    it('should update channel config', () => {
      const updated = service.updateChannelConfig('EMAIL', { rateLimitPerMinute: 500 });

      expect(updated.rateLimitPerMinute).toBe(500);
    });

    it('should disable channel', () => {
      service.updateChannelConfig('SLACK', { enabled: false });
      const config = service.getChannelConfig('SLACK');

      expect(config.enabled).toBe(false);
    });

    it('should have SMS rate limits', () => {
      const smsConfig = service.getChannelConfig('SMS');

      expect(smsConfig.rateLimitPerMinute).toBe(60);
      expect(smsConfig.rateLimitPerHour).toBe(1000);
      expect(smsConfig.dailyLimit).toBe(10000);
    });

    it('should emit channel updated event', () => {
      service.updateChannelConfig('PUSH', { rateLimitPerMinute: 100 });

      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.channel.updated', { channel: 'PUSH' });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      service.getUserPreferences('stats-user');

      await service.send({
        recipientId: 'stats-user',
        channel: 'EMAIL',
        category: 'SYSTEM',
        subject: 'Email 1',
        body: 'Test',
        createdBy: 'sender-1',
      });

      await service.send({
        recipientId: 'stats-user',
        channel: 'PUSH',
        category: 'ALERTS',
        subject: 'Push 1',
        body: 'Test',
        createdBy: 'sender-1',
      });
    });

    it('should get notification stats', () => {
      const stats = service.getStats();

      expect(stats.totalNotifications).toBeGreaterThanOrEqual(2);
    });

    it('should count by channel', () => {
      const stats = service.getStats();

      expect(stats.byChannel.EMAIL).toBeGreaterThanOrEqual(1);
      expect(stats.byChannel.PUSH).toBeGreaterThanOrEqual(1);
    });

    it('should count by status', () => {
      const stats = service.getStats();

      expect(stats.byStatus.SENT).toBeGreaterThanOrEqual(2);
    });

    it('should count by category', () => {
      const stats = service.getStats();

      expect(stats.byCategory.SYSTEM).toBeGreaterThanOrEqual(1);
      expect(stats.byCategory.ALERTS).toBeGreaterThanOrEqual(1);
    });

    it('should calculate delivery rate', () => {
      const stats = service.getStats();

      expect(stats.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(stats.deliveryRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Subscription', () => {
    it('should subscribe to notifications', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe('subscriber-1', callback);

      expect(typeof unsubscribe).toBe('function');
      expect(eventEmitter.on).toHaveBeenCalledWith('notification.sent', expect.any(Function));
    });

    it('should unsubscribe from notifications', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe('subscriber-1', callback);

      unsubscribe();

      expect(eventEmitter.off).toHaveBeenCalledWith('notification.sent', expect.any(Function));
    });
  });

  describe('Notification Channels', () => {
    beforeEach(() => {
      service.getUserPreferences('channel-user');
    });

    it('should send EMAIL notification', async () => {
      const notification = await service.send({
        recipientId: 'channel-user',
        channel: 'EMAIL',
        recipientEmail: 'test@example.com',
        subject: 'Email Test',
        body: 'Email body',
        createdBy: 'sender-1',
      });

      expect(notification.channel).toBe('EMAIL');
      expect(notification.recipientEmail).toBe('test@example.com');
    });

    it('should send SMS notification', async () => {
      const notification = await service.send({
        recipientId: 'channel-user',
        channel: 'SMS',
        recipientPhone: '+40712345678',
        subject: 'SMS Test',
        body: 'SMS body',
        createdBy: 'sender-1',
      });

      expect(notification.channel).toBe('SMS');
      expect(notification.recipientPhone).toBe('+40712345678');
    });

    it('should send PUSH notification', async () => {
      const notification = await service.send({
        recipientId: 'channel-user',
        channel: 'PUSH',
        subject: 'Push Test',
        body: 'Push body',
        createdBy: 'sender-1',
      });

      expect(notification.channel).toBe('PUSH');
    });

    it('should send IN_APP notification', async () => {
      const notification = await service.send({
        recipientId: 'channel-user',
        channel: 'IN_APP',
        subject: 'In-App Test',
        body: 'In-app body',
        createdBy: 'sender-1',
      });

      expect(notification.channel).toBe('IN_APP');
    });
  });

  describe('Notification Priorities', () => {
    beforeEach(() => {
      service.getUserPreferences('priority-user');
    });

    const priorities: NotificationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

    priorities.forEach((priority) => {
      it(`should handle ${priority} priority`, async () => {
        const notification = await service.send({
          recipientId: 'priority-user',
          channel: 'EMAIL',
          priority,
          subject: `${priority} Priority`,
          body: 'Test',
          createdBy: 'sender-1',
        });

        expect(notification.priority).toBe(priority);
      });
    });
  });

  describe('Notification Categories', () => {
    beforeEach(() => {
      const prefs = service.getUserPreferences('category-user');
      // Enable all categories
      Object.keys(prefs.categories).forEach((cat) => {
        prefs.categories[cat as NotificationCategory].enabled = true;
      });
      service.updateUserPreferences('category-user', { categories: prefs.categories });
    });

    const categories: NotificationCategory[] = ['SYSTEM', 'BILLING', 'SECURITY', 'MARKETING', 'UPDATES', 'REMINDERS', 'ALERTS'];

    categories.forEach((category) => {
      it(`should handle ${category} category`, async () => {
        const notification = await service.send({
          recipientId: 'category-user',
          channel: 'EMAIL',
          category,
          subject: `${category} Notification`,
          body: 'Test',
          createdBy: 'sender-1',
        });

        expect(notification.category).toBe(category);
      });
    });
  });
});
