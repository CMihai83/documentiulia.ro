import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EmailService,
  EmailMessage,
  EmailTemplate,
  EmailType,
} from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let eventEmitter: EventEmitter2;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default templates initialized', async () => {
      const templates = await service.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have welcome email template', async () => {
      const template = await service.getTemplateByName('Welcome Email');
      expect(template).toBeDefined();
      expect(template!.type).toBe('WELCOME');
    });

    it('should have ANAF notification template', async () => {
      const template = await service.getTemplateByName('ANAF Submission Notification');
      expect(template).toBeDefined();
      expect(template!.type).toBe('ANAF_NOTIFICATION');
    });

    it('should have default config', () => {
      const config = service.getConfig();
      expect(config.provider).toBe('SMTP');
      expect(config.fromEmail).toBe('noreply@documentiulia.ro');
    });
  });

  describe('Sending Emails', () => {
    it('should send email to single recipient', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'Test Subject',
        { text: 'Test body' },
      );

      expect(email.id).toBeDefined();
      expect(email.to[0].email).toBe('test@example.com');
      expect(email.subject).toBe('Test Subject');
    });

    it('should send email to multiple recipients', async () => {
      const email = await service.sendEmail(
        ['user1@example.com', 'user2@example.com'],
        'Multi Recipient',
        { text: 'Body' },
      );

      expect(email.to.length).toBe(2);
    });

    it('should send email with EmailAddress format', async () => {
      const email = await service.sendEmail(
        { email: 'named@example.com', name: 'Named User' },
        'Named Subject',
        { text: 'Body' },
      );

      expect(email.to[0].email).toBe('named@example.com');
      expect(email.to[0].name).toBe('Named User');
    });

    it('should send email with HTML body', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'HTML Email',
        { html: '<h1>Hello</h1>' },
      );

      expect(email.htmlBody).toBe('<h1>Hello</h1>');
    });

    it('should send email with both text and HTML', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'Both Bodies',
        { text: 'Plain text', html: '<p>HTML</p>' },
      );

      expect(email.textBody).toBe('Plain text');
      expect(email.htmlBody).toBe('<p>HTML</p>');
    });

    it('should set email type', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'Invoice',
        { text: 'Invoice attached' },
        { type: 'INVOICE' },
      );

      expect(email.type).toBe('INVOICE');
    });

    it('should set email priority', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'Urgent',
        { text: 'Urgent message' },
        { priority: 'URGENT' },
      );

      expect(email.priority).toBe('URGENT');
    });

    it('should add attachments', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'With Attachment',
        { text: 'See attached' },
        {
          attachments: [
            {
              filename: 'document.pdf',
              content: Buffer.from('PDF content'),
              contentType: 'application/pdf',
            },
          ],
        },
      );

      expect(email.attachments.length).toBe(1);
      expect(email.attachments[0].filename).toBe('document.pdf');
    });

    it('should set tags', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'Tagged',
        { text: 'Body' },
        { tags: ['important', 'invoice'] },
      );

      expect(email.tags).toEqual(['important', 'invoice']);
    });

    it('should set organization and user IDs', async () => {
      const email = await service.sendEmail(
        'test@example.com',
        'Org Email',
        { text: 'Body' },
        { organizationId: mockOrgId, userId: mockUserId },
      );

      expect(email.organizationId).toBe(mockOrgId);
      expect(email.userId).toBe(mockUserId);
    });

    it('should emit email.created event', async () => {
      await service.sendEmail(
        'test@example.com',
        'Event Test',
        { text: 'Body' },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'email.created',
        expect.objectContaining({
          to: ['test@example.com'],
          subject: 'Event Test',
        }),
      );
    });

    it('should throw error for empty recipients', async () => {
      await expect(
        service.sendEmail([], 'No Recipients', { text: 'Body' }),
      ).rejects.toThrow('At least one recipient is required');
    });

    it('should schedule email for later', async () => {
      const scheduledAt = new Date(Date.now() + 3600000);
      const email = await service.sendEmail(
        'test@example.com',
        'Scheduled',
        { text: 'Body' },
        { scheduledAt },
      );

      expect(email.status).toBe('QUEUED');
      expect(email.scheduledAt).toEqual(scheduledAt);
    });
  });

  describe('Template Emails', () => {
    it('should send template email', async () => {
      const templates = await service.getAllTemplates();
      const welcomeTemplate = templates.find((t) => t.type === 'WELCOME');

      const email = await service.sendTemplateEmail(
        'newuser@example.com',
        welcomeTemplate!.id,
        { userName: 'John Doe', email: 'john@example.com' },
      );

      expect(email.subject).toContain('John Doe');
      expect(email.templateId).toBe(welcomeTemplate!.id);
    });

    it('should send template email by name', async () => {
      const email = await service.sendTemplateEmail(
        'user@example.com',
        'Welcome Email',
        { userName: 'Jane', email: 'jane@example.com' },
      );

      expect(email.type).toBe('WELCOME');
    });

    it('should render Romanian template', async () => {
      const email = await service.sendTemplateEmail(
        'ro@example.com',
        'Welcome Email',
        { userName: 'Ion', email: 'ion@example.com' },
        { language: 'ro' },
      );

      expect(email.subject).toContain('Bine ați venit');
    });

    it('should render English template', async () => {
      const email = await service.sendTemplateEmail(
        'en@example.com',
        'Welcome Email',
        { userName: 'John', email: 'john@example.com' },
        { language: 'en' },
      );

      expect(email.subject).toContain('Welcome');
    });

    it('should throw error for missing template', async () => {
      await expect(
        service.sendTemplateEmail('test@example.com', 'NonExistent', {}),
      ).rejects.toThrow('Template not found');
    });

    it('should throw error for missing required variable', async () => {
      await expect(
        service.sendTemplateEmail('test@example.com', 'Welcome Email', {}),
      ).rejects.toThrow('Missing required variable');
    });

    it('should use default value for optional variable', async () => {
      const templates = await service.getAllTemplates();
      const invoiceTemplate = templates.find((t) => t.type === 'INVOICE');

      const email = await service.sendTemplateEmail(
        'client@example.com',
        invoiceTemplate!.id,
        {
          clientName: 'Client Name',
          invoiceNumber: 'INV-001',
          amount: 1000,
          dueDate: '2025-12-31',
          companyName: 'Test Company',
        },
      );

      expect(email.textBody).toContain('RON'); // Default currency
    });

    it('should throw error for inactive template', async () => {
      const templates = await service.getAllTemplates();
      await service.deactivateTemplate(templates[0].id);

      await expect(
        service.sendTemplateEmail('test@example.com', templates[0].id, {}),
      ).rejects.toThrow('Template is not active');
    });
  });

  describe('Bulk Email', () => {
    it('should send bulk emails', async () => {
      const result = await service.sendBulkEmail(
        ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        'Bulk Subject',
        { text: 'Bulk body' },
      );

      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(3);
    });

    it('should handle failures in bulk send', async () => {
      const result = await service.sendBulkEmail(
        ['success@example.com', 'fail@example.com'],
        'Mixed Bulk',
        { text: 'Body' },
        { maxRetries: 0 }, // No retries so failure is immediate
      );

      expect(result.failureCount).toBe(1);
      expect(result.results.find((r) => r.email === 'fail@example.com')?.success).toBe(false);
    });

    it('should emit bulk completed event', async () => {
      await service.sendBulkEmail(
        ['a@example.com', 'b@example.com'],
        'Bulk Event',
        { text: 'Body' },
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'email.bulk.completed',
        expect.objectContaining({ totalRecipients: 2 }),
      );
    });
  });

  describe('Email Status Management', () => {
    let testEmail: EmailMessage;

    beforeEach(async () => {
      testEmail = await service.sendEmail(
        'status@example.com',
        'Status Test',
        { text: 'Body' },
      );
    });

    it('should get email by ID', async () => {
      const email = await service.getEmail(testEmail.id);

      expect(email).toBeDefined();
      expect(email!.id).toBe(testEmail.id);
    });

    it('should mark email as opened', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for delivery
      const opened = await service.markAsOpened(testEmail.id);

      expect(opened.openedAt).toBeDefined();
    });

    it('should emit email.opened event', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await service.markAsOpened(testEmail.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'email.opened',
        expect.objectContaining({ emailId: testEmail.id }),
      );
    });

    it('should not update openedAt if already opened', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const first = await service.markAsOpened(testEmail.id);
      const second = await service.markAsOpened(testEmail.id);

      expect(first.openedAt).toEqual(second.openedAt);
    });

    it('should mark email as clicked', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const clicked = await service.markAsClicked(testEmail.id, 'https://example.com');

      expect(clicked.clickedAt).toBeDefined();
    });

    it('should emit email.clicked event', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await service.markAsClicked(testEmail.id, 'https://example.com');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'email.clicked',
        expect.objectContaining({ emailId: testEmail.id, link: 'https://example.com' }),
      );
    });
  });

  describe('Email Retry and Cancel', () => {
    it('should cancel queued email', async () => {
      const email = await service.sendEmail(
        'cancel@example.com',
        'Cancel Test',
        { text: 'Body' },
        { scheduledAt: new Date(Date.now() + 3600000) },
      );

      const cancelled = await service.cancelEmail(email.id);

      expect(cancelled.status).toBe('FAILED');
      expect(cancelled.bounceReason).toBe('Cancelled by user');
    });

    it('should emit email.cancelled event', async () => {
      const email = await service.sendEmail(
        'cancel-event@example.com',
        'Cancel Event',
        { text: 'Body' },
        { scheduledAt: new Date(Date.now() + 3600000) },
      );

      await service.cancelEmail(email.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'email.cancelled',
        expect.objectContaining({ emailId: email.id }),
      );
    });

    it('should throw error when cancelling sent email', async () => {
      const email = await service.sendEmail(
        'sent@example.com',
        'Sent Email',
        { text: 'Body' },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(service.cancelEmail(email.id)).rejects.toThrow('Only queued or pending');
    });

    it('should retry failed email', async () => {
      const email = await service.sendEmail(
        'fail@example.com',
        'Fail Test',
        { text: 'Body' },
        { maxRetries: 0 }, // No retries so failure is immediate
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Change recipient for retry to succeed
      const retrieved = await service.getEmail(email.id);
      retrieved!.to = [{ email: 'success@example.com' }];

      const retried = await service.retryEmail(email.id);

      expect(retried.retryCount).toBe(0);
    });

    it('should throw error when retrying non-failed email', async () => {
      const email = await service.sendEmail(
        'success@example.com',
        'Success',
        { text: 'Body' },
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      await expect(service.retryEmail(email.id)).rejects.toThrow('Only failed or bounced');
    });
  });

  describe('Email Queries', () => {
    beforeEach(async () => {
      await service.sendEmail('a@example.com', 'Email A', { text: 'A' }, { userId: mockUserId });
      await service.sendEmail('b@example.com', 'Email B', { text: 'B' }, { userId: mockUserId });
      await service.sendEmail('c@example.com', 'Email C', { text: 'C' }, { organizationId: mockOrgId });
    });

    it('should get emails by user', async () => {
      const emails = await service.getEmailsByUser(mockUserId);

      expect(emails.length).toBe(2);
      expect(emails.every((e) => e.userId === mockUserId)).toBe(true);
    });

    it('should get emails by organization', async () => {
      const emails = await service.getEmailsByOrganization(mockOrgId);

      expect(emails.length).toBe(1);
    });

    it('should limit emails by user', async () => {
      const emails = await service.getEmailsByUser(mockUserId, 1);

      expect(emails.length).toBe(1);
    });

    it('should get emails by status', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const delivered = await service.getEmailsByStatus('DELIVERED');

      expect(delivered.length).toBeGreaterThan(0);
    });
  });

  describe('Template Management', () => {
    it('should create template', async () => {
      const template = await service.createTemplate({
        name: 'Custom Template',
        nameRo: 'Șablon Personalizat',
        description: 'A custom template',
        descriptionRo: 'Un șablon personalizat',
        type: 'NOTIFICATION',
        subject: 'Notification: {{title}}',
        subjectRo: 'Notificare: {{title}}',
        textBody: 'You have a notification: {{message}}',
        textBodyRo: 'Aveți o notificare: {{message}}',
        htmlBody: '<h1>{{title}}</h1><p>{{message}}</p>',
        htmlBodyRo: '<h1>{{title}}</h1><p>{{message}}</p>',
        variables: [
          { name: 'title', description: 'Title', descriptionRo: 'Titlu', type: 'STRING', required: true },
          { name: 'message', description: 'Message', descriptionRo: 'Mesaj', type: 'STRING', required: true },
        ],
        isActive: true,
        version: 1,
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
        type: 'NOTIFICATION',
        subject: 'Subject',
        subjectRo: 'Subiect',
        textBody: 'Body',
        textBodyRo: 'Corp',
        htmlBody: '',
        htmlBodyRo: '',
        variables: [],
        isActive: true,
        version: 1,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'template.created',
        expect.objectContaining({ name: 'Event Template' }),
      );
    });

    it('should update template', async () => {
      const templates = await service.getAllTemplates();
      const updated = await service.updateTemplate(templates[0].id, {
        name: 'Updated Template',
      });

      expect(updated.name).toBe('Updated Template');
      expect(updated.version).toBe(2);
    });

    it('should emit template.updated event', async () => {
      const templates = await service.getAllTemplates();
      await service.updateTemplate(templates[0].id, { name: 'Updated' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'template.updated',
        expect.objectContaining({ templateId: templates[0].id }),
      );
    });

    it('should delete template', async () => {
      const template = await service.createTemplate({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: '',
        descriptionRo: '',
        type: 'NOTIFICATION',
        subject: 'S',
        subjectRo: 'S',
        textBody: 'B',
        textBodyRo: 'B',
        htmlBody: '',
        htmlBodyRo: '',
        variables: [],
        isActive: true,
        version: 1,
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
        type: 'NOTIFICATION',
        subject: 'S',
        subjectRo: 'S',
        textBody: 'B',
        textBodyRo: 'B',
        htmlBody: '',
        htmlBodyRo: '',
        variables: [],
        isActive: true,
        version: 1,
      });

      await service.deleteTemplate(template.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'template.deleted',
        expect.objectContaining({ templateId: template.id }),
      );
    });

    it('should throw error when deleting non-existent template', async () => {
      await expect(service.deleteTemplate('non-existent')).rejects.toThrow('Template not found');
    });

    it('should get templates by type', async () => {
      const invoiceTemplates = await service.getTemplatesByType('INVOICE');

      expect(invoiceTemplates.length).toBeGreaterThan(0);
      expect(invoiceTemplates.every((t) => t.type === 'INVOICE')).toBe(true);
    });

    it('should activate template', async () => {
      const templates = await service.getAllTemplates();
      await service.deactivateTemplate(templates[0].id);
      const activated = await service.activateTemplate(templates[0].id);

      expect(activated.isActive).toBe(true);
    });

    it('should deactivate template', async () => {
      const templates = await service.getAllTemplates();
      const deactivated = await service.deactivateTemplate(templates[0].id);

      expect(deactivated.isActive).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.sendEmail('stat1@example.com', 'Stat 1', { text: 'B' }, { type: 'INVOICE' });
      await service.sendEmail('stat2@example.com', 'Stat 2', { text: 'B' }, { type: 'INVOICE' });
      await service.sendEmail('stat3@example.com', 'Stat 3', { text: 'B' }, { type: 'NOTIFICATION' });
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    it('should get email statistics', async () => {
      const stats = await service.getStats();

      expect(stats.totalSent).toBeGreaterThan(0);
    });

    it('should count by type', async () => {
      const stats = await service.getStats();

      expect(stats.byType.INVOICE).toBe(2);
      expect(stats.byType.NOTIFICATION).toBe(1);
    });

    it('should count by status', async () => {
      const stats = await service.getStats();

      expect(stats.byStatus.DELIVERED).toBeGreaterThan(0);
    });

    it('should calculate delivery rate', async () => {
      const stats = await service.getStats();

      expect(stats.deliveryRate).toBeGreaterThan(0);
    });

    it('should return recent emails', async () => {
      const stats = await service.getStats();

      expect(stats.recentEmails.length).toBeGreaterThan(0);
    });

    it('should filter by date', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const stats = await service.getStats(futureDate);

      expect(stats.totalSent).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should get config without secrets', () => {
      const config = service.getConfig();

      expect(config.provider).toBeDefined();
      expect((config as any).password).toBeUndefined();
      expect((config as any).apiKey).toBeUndefined();
    });

    it('should update config', () => {
      service.updateConfig({ provider: 'SENDGRID' });
      const config = service.getConfig();

      expect(config.provider).toBe('SENDGRID');
    });

    it('should emit config.updated event', () => {
      service.updateConfig({ provider: 'MAILGUN' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'email.config.updated',
        expect.objectContaining({ provider: 'MAILGUN' }),
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      // Set very low rate limit
      service.updateConfig({ rateLimit: 2, rateLimitPeriod: 60000 });

      await service.sendEmail('r1@example.com', 'R1', { text: 'B' });
      await service.sendEmail('r2@example.com', 'R2', { text: 'B' });

      await expect(
        service.sendEmail('r3@example.com', 'R3', { text: 'B' }),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Romanian Language Support', () => {
    it('should have Romanian template content', async () => {
      const template = await service.getTemplateByName('Invoice Email');

      expect(template!.subjectRo).toContain('Factura');
      expect(template!.textBodyRo).toContain('Stimate');
    });

    it('should have Romanian variable descriptions', async () => {
      const template = await service.getTemplateByName('Invoice Email');
      const clientVar = template!.variables.find((v) => v.name === 'clientName');

      expect(clientVar!.descriptionRo).toBe('Nume client');
    });

    it('should send ANAF template in Romanian', async () => {
      const email = await service.sendTemplateEmail(
        'anaf@example.com',
        'ANAF Submission Notification',
        {
          userName: 'Ion Popescu',
          status: 'Trimisă',
          invoiceNumber: 'INV-001',
          submissionId: 'ANAF-123',
          submissionDate: '2025-01-15',
          message: 'Factura a fost acceptată.',
        },
        { language: 'ro' },
      );

      expect(email.subject).toContain('Trimitere e-Factura ANAF');
      expect(email.textBody).toContain('Ion Popescu');
    });
  });
});
