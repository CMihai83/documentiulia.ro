import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailNotificationService, EmailAddress } from './email-notification.service';

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<EmailNotificationService>(EmailNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('System Templates', () => {
    it('should initialize system templates', async () => {
      const templates = await service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have welcome template', async () => {
      const template = await service.getTemplate('etpl-welcome');
      expect(template).toBeDefined();
      expect(template?.category).toBe('onboarding');
    });

    it('should have invoice template', async () => {
      const template = await service.getTemplate('etpl-invoice');
      expect(template).toBeDefined();
      expect(template?.category).toBe('billing');
    });

    it('should have password reset template', async () => {
      const template = await service.getTemplate('etpl-password-reset');
      expect(template).toBeDefined();
      expect(template?.category).toBe('security');
    });

    it('should have delivery update template', async () => {
      const template = await service.getTemplate('etpl-delivery-update');
      expect(template).toBeDefined();
      expect(template?.category).toBe('delivery');
    });
  });

  describe('Template CRUD', () => {
    it('should create custom template', async () => {
      const template = await service.createTemplate(
        'Custom Template',
        'Test Subject {{name}}',
        '<h1>Hello {{name}}</h1>',
        ['name'],
        'custom',
        userId,
      );

      expect(template).toBeDefined();
      expect(template.id).toMatch(/^etpl-/);
      expect(template.name).toBe('Custom Template');
      expect(template.isSystem).toBe(false);
    });

    it('should get template by ID', async () => {
      const created = await service.createTemplate('Test', 'Subject', '<p>Body</p>', [], 'test', userId);
      const retrieved = await service.getTemplate(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should filter templates by category', async () => {
      const billing = await service.getTemplates('billing');
      expect(billing.every(t => t.category === 'billing')).toBe(true);
    });

    it('should filter out system templates', async () => {
      await service.createTemplate('Custom', 'Subject', '<p>Body</p>', [], 'custom', userId);
      const customOnly = await service.getTemplates(undefined, false);
      expect(customOnly.every(t => !t.isSystem)).toBe(true);
    });

    it('should update custom template', async () => {
      const created = await service.createTemplate('Original', 'Subject', '<p>Body</p>', [], 'test', userId);
      const updated = await service.updateTemplate(created.id, {
        name: 'Updated',
        subject: 'New Subject',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.subject).toBe('New Subject');
    });

    it('should not update system template', async () => {
      const result = await service.updateTemplate('etpl-welcome', { name: 'Hacked' });
      expect(result).toBeNull();
    });

    it('should delete custom template', async () => {
      const created = await service.createTemplate('To Delete', 'Subject', '<p>Body</p>', [], 'test', userId);
      const deleted = await service.deleteTemplate(created.id);
      expect(deleted).toBe(true);
      expect(await service.getTemplate(created.id)).toBeNull();
    });

    it('should not delete system template', async () => {
      const deleted = await service.deleteTemplate('etpl-welcome');
      expect(deleted).toBe(false);
    });
  });

  describe('Sending Emails', () => {
    const recipient: EmailAddress = { email: 'test@example.com', name: 'Test User' };

    it('should send email', async () => {
      const email = await service.sendEmail(
        tenantId,
        recipient,
        'Test Subject',
        '<p>Test Body</p>',
        userId,
      );

      expect(email).toBeDefined();
      expect(email.id).toMatch(/^email-/);
      expect(email.to[0].email).toBe('test@example.com');
      expect(email.subject).toBe('Test Subject');
    });

    it('should send to multiple recipients', async () => {
      const recipients: EmailAddress[] = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
      ];

      const email = await service.sendEmail(
        tenantId,
        recipients,
        'Multi Subject',
        '<p>Body</p>',
        userId,
      );

      expect(email.to).toHaveLength(2);
    });

    it('should send with all options', async () => {
      const email = await service.sendEmail(
        tenantId,
        recipient,
        'Subject',
        '<p>Body</p>',
        userId,
        {
          from: { email: 'custom@example.com', name: 'Custom Sender' },
          cc: [{ email: 'cc@example.com' }],
          bcc: [{ email: 'bcc@example.com' }],
          replyTo: { email: 'reply@example.com' },
          textBody: 'Plain text',
          type: 'marketing',
          priority: 'high',
          metadata: { campaign: 'test' },
        },
      );

      expect(email.from.email).toBe('custom@example.com');
      expect(email.cc).toHaveLength(1);
      expect(email.bcc).toHaveLength(1);
      expect(email.type).toBe('marketing');
      expect(email.priority).toBe('high');
    });

    it('should reject if all recipients on suppression list', async () => {
      await service.addToSuppressionList('suppressed@example.com');

      await expect(
        service.sendEmail(
          tenantId,
          { email: 'suppressed@example.com' },
          'Subject',
          '<p>Body</p>',
          userId,
        ),
      ).rejects.toThrow('All recipients are on the suppression list');
    });

    it('should filter suppressed recipients from list', async () => {
      await service.addToSuppressionList('suppressed@example.com');

      const email = await service.sendEmail(
        tenantId,
        [
          { email: 'suppressed@example.com' },
          { email: 'valid@example.com' },
        ],
        'Subject',
        '<p>Body</p>',
        userId,
      );

      expect(email.to).toHaveLength(1);
      expect(email.to[0].email).toBe('valid@example.com');
    });
  });

  describe('Templated Emails', () => {
    it('should send templated email', async () => {
      const email = await service.sendTemplatedEmail(
        tenantId,
        'etpl-welcome',
        { email: 'user@example.com', name: 'John Doe' },
        {
          userName: 'John',
          companyName: 'ACME Inc',
          loginUrl: 'https://example.com/login',
          unsubscribeUrl: 'https://example.com/unsubscribe',
          year: '2024',
        },
        userId,
      );

      expect(email).toBeDefined();
      expect(email.templateId).toBe('etpl-welcome');
      expect(email.subject).toContain('ACME Inc');
      expect(email.htmlBody).toContain('John');
    });

    it('should throw for non-existent template', async () => {
      await expect(
        service.sendTemplatedEmail(
          tenantId,
          'non-existent',
          { email: 'user@example.com' },
          {},
          userId,
        ),
      ).rejects.toThrow('Template not found');
    });

    it('should interpolate all variables', async () => {
      const email = await service.sendTemplatedEmail(
        tenantId,
        'etpl-invoice',
        { email: 'customer@example.com' },
        {
          customerName: 'Jane Smith',
          invoiceNumber: 'INV-001',
          issueDate: '01/01/2024',
          dueDate: '31/01/2024',
          total: '1,500.00',
          invoiceUrl: 'https://example.com/invoice/001',
        },
        userId,
      );

      expect(email.subject).toBe('Factură nouă: INV-001');
      expect(email.htmlBody).toContain('Jane Smith');
      expect(email.htmlBody).toContain('1,500.00');
    });
  });

  describe('Batch Sending', () => {
    it('should send batch emails', async () => {
      const recipients = [
        { email: 'user1@example.com', name: 'User 1', variables: { userName: 'User1', companyName: 'ACME', loginUrl: '#', unsubscribeUrl: '#', year: '2024' } },
        { email: 'user2@example.com', name: 'User 2', variables: { userName: 'User2', companyName: 'ACME', loginUrl: '#', unsubscribeUrl: '#', year: '2024' } },
        { email: 'user3@example.com', name: 'User 3', variables: { userName: 'User3', companyName: 'ACME', loginUrl: '#', unsubscribeUrl: '#', year: '2024' } },
      ];

      const result = await service.sendBatch(tenantId, 'etpl-welcome', recipients, userId);

      expect(result.batchId).toMatch(/^batch-/);
      expect(result.total).toBe(3);
      expect(result.emails).toHaveLength(3);
    });

    it('should handle partial failures in batch', async () => {
      await service.addToSuppressionList('fail@example.com');

      const recipients = [
        { email: 'success@example.com', variables: { userName: 'User', companyName: 'ACME', loginUrl: '#', unsubscribeUrl: '#', year: '2024' } },
        { email: 'fail@example.com', variables: { userName: 'User', companyName: 'ACME', loginUrl: '#', unsubscribeUrl: '#', year: '2024' } },
      ];

      const result = await service.sendBatch(tenantId, 'etpl-welcome', recipients, userId);

      expect(result.total).toBe(2);
      expect(result.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Email Retrieval', () => {
    it('should get email by ID', async () => {
      const created = await service.sendEmail(tenantId, { email: 'test@example.com' }, 'Subject', '<p>Body</p>', userId);
      const retrieved = await service.getEmail(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get emails for tenant', async () => {
      await service.sendEmail(tenantId, { email: 'test1@example.com' }, 'Subject 1', '<p>Body</p>', userId);
      await service.sendEmail(tenantId, { email: 'test2@example.com' }, 'Subject 2', '<p>Body</p>', userId);
      await service.sendEmail('other-tenant', { email: 'test3@example.com' }, 'Subject 3', '<p>Body</p>', userId);

      const emails = await service.getEmails(tenantId);
      expect(emails.every(e => e.tenantId === tenantId)).toBe(true);
    });

    it('should filter emails by type', async () => {
      await service.sendEmail(tenantId, { email: 'test@example.com' }, 'Subject', '<p>Body</p>', userId, { type: 'marketing' });
      await service.sendEmail(tenantId, { email: 'test@example.com' }, 'Subject', '<p>Body</p>', userId, { type: 'transactional' });

      const marketing = await service.getEmails(tenantId, { type: 'marketing' });
      expect(marketing.every(e => e.type === 'marketing')).toBe(true);
    });

    it('should filter emails by recipient', async () => {
      await service.sendEmail(tenantId, { email: 'specific@example.com' }, 'Subject', '<p>Body</p>', userId);
      await service.sendEmail(tenantId, { email: 'other@example.com' }, 'Subject', '<p>Body</p>', userId);

      const emails = await service.getEmails(tenantId, { to: 'specific@example.com' });
      expect(emails.every(e => e.to.some(r => r.email === 'specific@example.com'))).toBe(true);
    });

    it('should limit email results', async () => {
      for (let i = 0; i < 5; i++) {
        await service.sendEmail(tenantId, { email: `test${i}@example.com` }, 'Subject', '<p>Body</p>', userId);
      }

      const emails = await service.getEmails(tenantId, { limit: 3 });
      expect(emails.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Tracking', () => {
    it('should track email open', async () => {
      const email = await service.sendEmail(tenantId, { email: 'test@example.com' }, 'Subject', '<p>Body</p>', userId);
      const tracked = await service.trackOpen(email.id);

      expect(tracked).toBe(true);

      const updated = await service.getEmail(email.id);
      expect(updated?.openedAt).toBeDefined();
      expect(updated?.status).toBe('opened');
    });

    it('should not track duplicate opens', async () => {
      const email = await service.sendEmail(tenantId, { email: 'test@example.com' }, 'Subject', '<p>Body</p>', userId);
      await service.trackOpen(email.id);
      const tracked = await service.trackOpen(email.id);

      expect(tracked).toBe(false);
    });

    it('should track email click', async () => {
      const email = await service.sendEmail(tenantId, { email: 'test@example.com' }, 'Subject', '<p>Body</p>', userId);
      const tracked = await service.trackClick(email.id);

      expect(tracked).toBe(true);

      const updated = await service.getEmail(email.id);
      expect(updated?.clickedAt).toBeDefined();
      expect(updated?.status).toBe('clicked');
    });
  });

  describe('Bounce Management', () => {
    it('should get bounces for email', async () => {
      const bounces = await service.getBounces('test@example.com');
      expect(bounces).toBeInstanceOf(Array);
    });

    it('should add to suppression list', async () => {
      await service.addToSuppressionList('suppress@example.com');
      const isOn = await service.isOnSuppressionList('suppress@example.com');
      expect(isOn).toBe(true);
    });

    it('should remove from suppression list', async () => {
      await service.addToSuppressionList('remove@example.com');
      const removed = await service.removeFromSuppressionList('remove@example.com');
      expect(removed).toBe(true);

      const isOn = await service.isOnSuppressionList('remove@example.com');
      expect(isOn).toBe(false);
    });

    it('should get suppression list', async () => {
      await service.addToSuppressionList('list1@example.com');
      await service.addToSuppressionList('list2@example.com');

      const list = await service.getSuppressionList();
      expect(list).toContain('list1@example.com');
      expect(list).toContain('list2@example.com');
    });

    it('should be case insensitive for suppression', async () => {
      await service.addToSuppressionList('UPPER@example.com');
      const isOn = await service.isOnSuppressionList('upper@example.com');
      expect(isOn).toBe(true);
    });
  });

  describe('Preferences', () => {
    it('should set preferences', async () => {
      const prefs = await service.setPreferences(userId, tenantId, {
        marketing: false,
        notifications: true,
        reports: true,
        frequency: 'daily',
      });

      expect(prefs.marketing).toBe(false);
      expect(prefs.notifications).toBe(true);
      expect(prefs.frequency).toBe('daily');
    });

    it('should get preferences', async () => {
      await service.setPreferences(userId, tenantId, { marketing: true });
      const prefs = await service.getPreferences(userId, tenantId);

      expect(prefs).toBeDefined();
      expect(prefs?.userId).toBe(userId);
    });

    it('should return null for non-existent preferences', async () => {
      const prefs = await service.getPreferences('non-existent', tenantId);
      expect(prefs).toBeNull();
    });

    it('should unsubscribe from specific category', async () => {
      await service.setPreferences(userId, tenantId, { marketing: true, notifications: true });
      const prefs = await service.unsubscribe(userId, tenantId, 'marketing');

      expect(prefs.marketing).toBe(false);
      expect(prefs.notifications).toBe(true);
      expect(prefs.unsubscribedAt).toBeDefined();
    });

    it('should unsubscribe from all categories', async () => {
      await service.setPreferences(userId, tenantId, { marketing: true, notifications: true, reports: true });
      const prefs = await service.unsubscribe(userId, tenantId);

      expect(prefs.marketing).toBe(false);
      expect(prefs.notifications).toBe(false);
      expect(prefs.reports).toBe(false);
      expect(prefs.transactional).toBe(true); // Always stays true
    });
  });

  describe('Statistics', () => {
    it('should get email stats', async () => {
      await service.sendEmail(tenantId, { email: 'test1@example.com' }, 'Subject', '<p>Body</p>', userId);
      await service.sendEmail(tenantId, { email: 'test2@example.com' }, 'Subject', '<p>Body</p>', userId);

      const stats = await service.getStats(tenantId);

      expect(stats).toBeDefined();
      expect(stats.totalSent).toBeGreaterThanOrEqual(2);
      expect(typeof stats.deliveryRate).toBe('number');
      expect(typeof stats.openRate).toBe('number');
    });

    it('should filter stats by date range', async () => {
      const stats = await service.getStats(tenantId, {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      });

      expect(stats).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should get email types', () => {
      const types = service.getEmailTypes();
      expect(types).toContain('transactional');
      expect(types).toContain('marketing');
      expect(types).toContain('notification');
    });

    it('should get email priorities', () => {
      const priorities = service.getEmailPriorities();
      expect(priorities).toContain('low');
      expect(priorities).toContain('normal');
      expect(priorities).toContain('high');
      expect(priorities).toContain('urgent');
    });

    it('should get email statuses', () => {
      const statuses = service.getEmailStatuses();
      expect(statuses).toContain('pending');
      expect(statuses).toContain('sent');
      expect(statuses).toContain('delivered');
      expect(statuses).toContain('bounced');
      expect(statuses).toContain('opened');
      expect(statuses).toContain('clicked');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for non-existent email', async () => {
      const email = await service.getEmail('non-existent');
      expect(email).toBeNull();
    });

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should handle empty tenant emails', async () => {
      const emails = await service.getEmails('empty-tenant');
      expect(emails).toHaveLength(0);
    });

    it('should track non-existent email as false', async () => {
      const tracked = await service.trackOpen('non-existent');
      expect(tracked).toBe(false);
    });
  });
});
