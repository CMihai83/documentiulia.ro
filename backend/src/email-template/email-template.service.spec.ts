import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EmailTemplateService,
  CreateTemplateDto,
  SendEmailDto,
  EmailCategory,
  EmailTemplate,
} from './email-template.service';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplateService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should get built-in templates', async () => {
      const templates = await service.listTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.isBuiltIn)).toBe(true);
    });

    it('should create custom template', async () => {
      const dto: CreateTemplateDto = {
        code: 'CUSTOM_TEST',
        name: 'Custom Test',
        nameRo: 'Test Personalizat',
        description: 'Custom test template',
        descriptionRo: 'Șablon test personalizat',
        category: 'NOTIFICATION',
        subject: 'Test Subject - {{name}}',
        subjectRo: 'Subiect Test - {{name}}',
        bodyHtml: '<p>Hello {{name}}</p>',
        bodyHtmlRo: '<p>Salut {{name}}</p>',
        bodyText: 'Hello {{name}}',
        bodyTextRo: 'Salut {{name}}',
        variables: [{ name: 'name', description: 'Name', descriptionRo: 'Nume', type: 'STRING', required: true }],
        organizationId: 'org-1',
        createdBy: 'user-1',
      };

      const template = await service.createTemplate(dto);

      expect(template.id).toMatch(/^tpl-/);
      expect(template.code).toBe('CUSTOM_TEST');
      expect(template.isBuiltIn).toBe(false);
      expect(template.isActive).toBe(true);
    });

    it('should throw on duplicate code', async () => {
      const dto: CreateTemplateDto = {
        code: 'DUPLICATE',
        name: 'First',
        nameRo: 'Primul',
        description: 'First',
        descriptionRo: 'Primul',
        category: 'NOTIFICATION',
        subject: 'Test',
        subjectRo: 'Test',
        bodyHtml: '<p>Test</p>',
        bodyHtmlRo: '<p>Test</p>',
        bodyText: 'Test',
        bodyTextRo: 'Test',
        organizationId: 'org-1',
        createdBy: 'user-1',
      };

      await service.createTemplate(dto);

      await expect(service.createTemplate(dto))
        .rejects.toThrow('Template with this code already exists');
    });

    it('should get template by ID', async () => {
      const templates = await service.listTemplates();
      const template = await service.getTemplate(templates[0].id);

      expect(template).toBeDefined();
      expect(template!.id).toBe(templates[0].id);
    });

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should get template by code', async () => {
      const template = await service.getTemplateByCode('WELCOME');

      expect(template).toBeDefined();
      expect(template!.code).toBe('WELCOME');
    });

    it('should filter templates by category', async () => {
      const templates = await service.listTemplates({ category: 'INVOICE' });

      expect(templates.every(t => t.category === 'INVOICE')).toBe(true);
    });

    it('should filter templates by active status', async () => {
      const templates = await service.listTemplates({ isActive: true });

      expect(templates.every(t => t.isActive)).toBe(true);
    });

    it('should update custom template', async () => {
      const created = await service.createTemplate({
        code: 'UPDATEABLE',
        name: 'Original',
        nameRo: 'Original',
        description: 'Original',
        descriptionRo: 'Original',
        category: 'NOTIFICATION',
        subject: 'Original',
        subjectRo: 'Original',
        bodyHtml: '<p>Original</p>',
        bodyHtmlRo: '<p>Original</p>',
        bodyText: 'Original',
        bodyTextRo: 'Original',
        organizationId: 'org-1',
        createdBy: 'user-1',
      });

      const updated = await service.updateTemplate(created.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
      expect(updated.version).toBe(2);
    });

    it('should not update built-in template', async () => {
      const templates = await service.listTemplates();
      const builtIn = templates.find(t => t.isBuiltIn);

      await expect(service.updateTemplate(builtIn!.id, { name: 'New Name' }))
        .rejects.toThrow('Built-in templates cannot be modified');
    });

    it('should delete custom template', async () => {
      const created = await service.createTemplate({
        code: 'DELETABLE',
        name: 'Deletable',
        nameRo: 'Ștergebil',
        description: 'Deletable',
        descriptionRo: 'Ștergebil',
        category: 'NOTIFICATION',
        subject: 'Delete',
        subjectRo: 'Șterge',
        bodyHtml: '<p>Delete</p>',
        bodyHtmlRo: '<p>Șterge</p>',
        bodyText: 'Delete',
        bodyTextRo: 'Șterge',
        organizationId: 'org-1',
        createdBy: 'user-1',
      });

      await service.deleteTemplate(created.id);
      const retrieved = await service.getTemplate(created.id);

      expect(retrieved).toBeNull();
    });

    it('should not delete built-in template', async () => {
      const templates = await service.listTemplates();
      const builtIn = templates.find(t => t.isBuiltIn);

      await expect(service.deleteTemplate(builtIn!.id))
        .rejects.toThrow('Built-in templates cannot be deleted');
    });

    it('should activate template', async () => {
      const created = await service.createTemplate({
        code: 'ACTIVATABLE',
        name: 'Activatable',
        nameRo: 'Activabil',
        description: 'Activatable',
        descriptionRo: 'Activabil',
        category: 'NOTIFICATION',
        subject: 'Test',
        subjectRo: 'Test',
        bodyHtml: '<p>Test</p>',
        bodyHtmlRo: '<p>Test</p>',
        bodyText: 'Test',
        bodyTextRo: 'Test',
        organizationId: 'org-1',
        createdBy: 'user-1',
      });

      await service.deactivateTemplate(created.id);
      const deactivated = await service.getTemplate(created.id);
      expect(deactivated!.isActive).toBe(false);

      await service.activateTemplate(created.id);
      const activated = await service.getTemplate(created.id);
      expect(activated!.isActive).toBe(true);
    });

    it('should clone template', async () => {
      const templates = await service.listTemplates();
      const original = templates.find(t => t.isBuiltIn);

      const cloned = await service.cloneTemplate(original!.id, 'CLONED_TEMPLATE', 'org-1', 'user-1');

      expect(cloned.id).not.toBe(original!.id);
      expect(cloned.code).toBe('CLONED_TEMPLATE');
      expect(cloned.isBuiltIn).toBe(false);
      expect(cloned.version).toBe(1);
    });
  });

  describe('Email Sending', () => {
    it('should send email with welcome template', async () => {
      const message = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      expect(message.id).toMatch(/^msg-/);
      expect(message.status).toBe('SENT');
      expect(message.subject).toContain('Ion Popescu');
    });

    it('should send email with invoice template', async () => {
      const message = await service.sendEmail({
        templateCode: 'INVOICE_SENT',
        to: ['customer@example.com'],
        variables: {
          invoiceNumber: 'F2025-0001',
          customerName: 'SC Example SRL',
          totalAmount: '1190.00',
          currency: 'RON',
          dueDate: new Date('2025-02-15'),
          invoiceUrl: 'https://app.documentiulia.ro/invoices/F2025-0001',
          companyName: 'SC Test SRL',
        },
        organizationId: 'org-1',
      });

      expect(message.status).toBe('SENT');
      expect(message.subject).toContain('F2025-0001');
    });

    it('should use Romanian locale by default', async () => {
      const message = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      expect(message.locale).toBe('ro');
      expect(message.bodyHtml).toContain('Bun venit');
    });

    it('should use English locale when specified', async () => {
      const message = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'John Smith',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        locale: 'en',
        organizationId: 'org-1',
      });

      expect(message.locale).toBe('en');
      expect(message.bodyHtml).toContain('Welcome');
    });

    it('should throw on missing required variables', async () => {
      await expect(service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {}, // Missing userName and dashboardUrl
        organizationId: 'org-1',
      })).rejects.toThrow('Missing required variables');
    });

    it('should throw on non-existent template', async () => {
      await expect(service.sendEmail({
        templateCode: 'NON_EXISTENT',
        to: ['test@example.com'],
        organizationId: 'org-1',
      })).rejects.toThrow('Template not found');
    });

    it('should throw on inactive template', async () => {
      const created = await service.createTemplate({
        code: 'INACTIVE_TEST',
        name: 'Inactive',
        nameRo: 'Inactiv',
        description: 'Inactive',
        descriptionRo: 'Inactiv',
        category: 'NOTIFICATION',
        subject: 'Test',
        subjectRo: 'Test',
        bodyHtml: '<p>Test</p>',
        bodyHtmlRo: '<p>Test</p>',
        bodyText: 'Test',
        bodyTextRo: 'Test',
        organizationId: 'org-1',
        createdBy: 'user-1',
      });

      await service.deactivateTemplate(created.id);

      await expect(service.sendEmail({
        templateCode: 'INACTIVE_TEST',
        to: ['test@example.com'],
        organizationId: 'org-1',
      })).rejects.toThrow('Template is not active');
    });

    it('should apply default variable values', async () => {
      const message = await service.sendEmail({
        templateCode: 'INVOICE_SENT',
        to: ['customer@example.com'],
        variables: {
          invoiceNumber: 'F2025-0001',
          customerName: 'SC Example SRL',
          totalAmount: '1190.00',
          // currency should default to RON
          dueDate: new Date('2025-02-15'),
          invoiceUrl: 'https://app.documentiulia.ro/invoices/F2025-0001',
          companyName: 'SC Test SRL',
        },
        organizationId: 'org-1',
      });

      expect(message.variables.currency).toBe('RON');
    });

    it('should set priority', async () => {
      const message = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        priority: 'HIGH',
        organizationId: 'org-1',
      });

      expect(message.priority).toBe('HIGH');
    });

    it('should support CC and BCC', async () => {
      const message = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['primary@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      expect(message.cc).toContain('cc@example.com');
      expect(message.bcc).toContain('bcc@example.com');
    });

    it('should emit email.queued event', async () => {
      await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('email.queued', expect.any(Object));
    });

    it('should emit email.sent event', async () => {
      await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('email.sent', expect.any(Object));
    });
  });

  describe('Email Preview', () => {
    it('should preview email with variables', async () => {
      const preview = await service.previewEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      expect(preview.subject).toContain('Ion Popescu');
      expect(preview.bodyHtml).toContain('Ion Popescu');
      expect(preview.errors).toHaveLength(0);
    });

    it('should show errors for missing variables', async () => {
      const preview = await service.previewEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {},
        organizationId: 'org-1',
      });

      expect(preview.errors.length).toBeGreaterThan(0);
      expect(preview.errors.some(e => e.includes('userName'))).toBe(true);
    });

    it('should keep placeholders for missing variables', async () => {
      const preview = await service.previewEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {},
        organizationId: 'org-1',
      });

      expect(preview.bodyHtml).toContain('{{userName}}');
    });
  });

  describe('Message Management', () => {
    it('should get message by ID', async () => {
      const sent = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      const message = await service.getMessage(sent.id);

      expect(message).toEqual(sent);
    });

    it('should return null for non-existent message', async () => {
      const message = await service.getMessage('non-existent');
      expect(message).toBeNull();
    });

    it('should list messages for organization', async () => {
      await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      const { messages, total } = await service.listMessages('org-1');

      expect(messages.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
    });

    it('should filter messages by templateCode', async () => {
      await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      const { messages } = await service.listMessages('org-1', { templateCode: 'WELCOME' });

      expect(messages.every(m => m.templateCode === 'WELCOME')).toBe(true);
    });

    it('should filter messages by status', async () => {
      await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      const { messages } = await service.listMessages('org-1', { status: 'SENT' });

      expect(messages.every(m => m.status === 'SENT')).toBe(true);
    });

    it('should mark message as opened', async () => {
      const sent = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      await service.markAsOpened(sent.id);
      const message = await service.getMessage(sent.id);

      expect(message!.status).toBe('OPENED');
      expect(message!.openedAt).toBeDefined();
    });

    it('should mark message as clicked', async () => {
      const sent = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      await service.markAsClicked(sent.id, 'https://app.documentiulia.ro/dashboard');
      const message = await service.getMessage(sent.id);

      expect(message!.status).toBe('CLICKED');
      expect(message!.clickedAt).toBeDefined();
    });
  });

  describe('Email Statistics', () => {
    it('should calculate email statistics', async () => {
      await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test@example.com'],
        variables: {
          userName: 'Ion Popescu',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      const stats = await service.getEmailStats('org-1');

      expect(stats.totalSent).toBeGreaterThan(0);
      expect(stats.byStatus).toBeDefined();
      expect(stats.byCategory).toBeDefined();
    });

    it('should calculate open rate', async () => {
      const msg1 = await service.sendEmail({
        templateCode: 'WELCOME',
        to: ['test1@example.com'],
        variables: {
          userName: 'User 1',
          dashboardUrl: 'https://app.documentiulia.ro/dashboard',
        },
        organizationId: 'org-1',
      });

      await service.markAsOpened(msg1.id);

      const stats = await service.getEmailStats('org-1');

      expect(stats.openRate).toBeGreaterThan(0);
    });
  });

  describe('Template Validation', () => {
    it('should validate valid template', async () => {
      const result = await service.validateTemplate({
        code: 'VALID',
        subject: 'Test {{name}}',
        subjectRo: 'Test {{name}}',
        bodyHtml: '<p>Hello {{name}}</p>',
        bodyHtmlRo: '<p>Salut {{name}}</p>',
        variables: [{ name: 'name', description: 'Name', descriptionRo: 'Nume', type: 'STRING', required: true }],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing code', async () => {
      const result = await service.validateTemplate({
        subject: 'Test',
        subjectRo: 'Test',
        bodyHtml: '<p>Test</p>',
        bodyHtmlRo: '<p>Test</p>',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template code is required');
    });

    it('should report undeclared variables', async () => {
      const result = await service.validateTemplate({
        code: 'TEST',
        subject: 'Test {{undeclared}}',
        subjectRo: 'Test {{undeclared}}',
        bodyHtml: '<p>Test</p>',
        bodyHtmlRo: '<p>Test</p>',
        variables: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('undeclared'))).toBe(true);
    });
  });

  describe('Categories', () => {
    it('should list categories', async () => {
      const categories = await service.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContainEqual(expect.objectContaining({ category: 'INVOICE' }));
      expect(categories).toContainEqual(expect.objectContaining({ category: 'PAYMENT' }));
    });

    it('should have Romanian names', async () => {
      const categories = await service.getCategories();

      for (const cat of categories) {
        expect(cat.nameRo).toBeDefined();
      }
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian subject for built-in templates', async () => {
      const templates = await service.listTemplates();

      for (const template of templates.filter(t => t.isBuiltIn)) {
        expect(template.subjectRo).toBeDefined();
        expect(template.subjectRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian body for built-in templates', async () => {
      const templates = await service.listTemplates();

      for (const template of templates.filter(t => t.isBuiltIn)) {
        expect(template.bodyHtmlRo).toBeDefined();
        expect(template.bodyTextRo).toBeDefined();
      }
    });

    it('should use Romanian diacritics', async () => {
      const template = await service.getTemplateByCode('WELCOME');

      expect(template!.bodyHtmlRo).toContain('ț');
      expect(template!.bodyHtmlRo).toContain('ă');
    });

    it('should format Romanian dates correctly', async () => {
      const message = await service.sendEmail({
        templateCode: 'INVOICE_SENT',
        to: ['customer@example.com'],
        variables: {
          invoiceNumber: 'F2025-0001',
          customerName: 'SC Example SRL',
          totalAmount: '1190.00',
          currency: 'RON',
          dueDate: new Date('2025-02-15'),
          invoiceUrl: 'https://app.documentiulia.ro/invoices/F2025-0001',
          companyName: 'SC Test SRL',
        },
        organizationId: 'org-1',
      });

      // Romanian date format: DD.MM.YYYY
      expect(message.bodyHtml).toContain('15.02.2025');
    });

    it('should have invoice template with Romanian content', async () => {
      const template = await service.getTemplateByCode('INVOICE_SENT');

      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Factură Trimisă');
      expect(template!.bodyHtmlRo).toContain('Factură');
      expect(template!.bodyHtmlRo).toContain('scadenței');
    });

    it('should have payment reminder with Romanian content', async () => {
      const template = await service.getTemplateByCode('PAYMENT_REMINDER');

      expect(template).toBeDefined();
      expect(template!.nameRo).toBe('Reamintire Plată');
      expect(template!.bodyHtmlRo).toContain('restantă');
      expect(template!.bodyHtmlRo).toContain('întârziere');
    });

    it('should have ANAF notification template', async () => {
      const template = await service.getTemplateByCode('ANAF_SUBMISSION');

      expect(template).toBeDefined();
      expect(template!.category).toBe('COMPLIANCE');
      expect(template!.nameRo).toContain('ANAF');
    });
  });

  describe('ANAF Compliance Templates', () => {
    it('should have e-Factura notification variables', async () => {
      const template = await service.getTemplateByCode('ANAF_SUBMISSION');

      expect(template!.variables.some(v => v.name === 'documentType')).toBe(true);
      expect(template!.variables.some(v => v.name === 'indexNumber')).toBe(true);
      expect(template!.variables.some(v => v.name === 'status')).toBe(true);
    });

    it('should send ANAF notification', async () => {
      const message = await service.sendEmail({
        templateCode: 'ANAF_SUBMISSION',
        to: ['admin@example.com'],
        variables: {
          documentType: 'e-Factura',
          indexNumber: '1234567890',
          status: 'Acceptat',
          submissionDate: new Date(),
          detailsUrl: 'https://app.documentiulia.ro/anaf/1234567890',
        },
        organizationId: 'org-1',
      });

      expect(message.status).toBe('SENT');
      expect(message.bodyHtml).toContain('e-Factura');
      expect(message.bodyHtml).toContain('Acceptat');
    });
  });
});
