import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CustomerPortalService,
  CustomerProfile,
  SupportTicket,
  Notification,
  PortalDocument,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  DocumentType,
  NotificationType,
} from './customer-portal.service';

describe('CustomerPortalService', () => {
  let service: CustomerPortalService;
  let eventEmitter: EventEmitter2;
  const emittedEvents: Array<{ event: string; payload: any }> = [];

  beforeEach(async () => {
    emittedEvents.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerPortalService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn((event: string, payload: any) => {
              emittedEvents.push({ event, payload });
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerPortalService>(CustomerPortalService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    await service.onModuleInit();
  });

  describe('Customer Profile Management', () => {
    const validProfileData = {
      companyName: 'Test SRL',
      cui: 'RO12345678',
      address: 'Str. Test nr. 1',
      city: 'București',
      county: 'București',
      postalCode: '010101',
      phone: '+40721234567',
      email: 'test@example.com',
    };

    it('should create customer profile', async () => {
      const profile = await service.createProfile('user-1', validProfileData);

      expect(profile.id).toMatch(/^cust-/);
      expect(profile.companyName).toBe('Test SRL');
      expect(profile.cui).toBe('RO12345678');
      expect(profile.country).toBe('România');
      expect(profile.vatPayer).toBe(false);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'customer.profile.created' }),
      );
    });

    it('should set default preferences', async () => {
      const profile = await service.createProfile('user-2', validProfileData);

      expect(profile.preferences.language).toBe('ro');
      expect(profile.preferences.timezone).toBe('Europe/Bucharest');
      expect(profile.preferences.currency).toBe('RON');
      expect(profile.preferences.dateFormat).toBe('DD.MM.YYYY');
      expect(profile.preferences.emailNotifications).toBe(true);
      expect(profile.preferences.theme).toBe('system');
    });

    it('should create profile with VAT payer status', async () => {
      const profile = await service.createProfile('user-3', {
        ...validProfileData,
        vatPayer: true,
      });

      expect(profile.vatPayer).toBe(true);
    });

    it('should include bank details', async () => {
      const profile = await service.createProfile('user-4', {
        ...validProfileData,
        bankAccount: 'RO49AAAA1B31007593840000',
        bankName: 'BCR',
      });

      expect(profile.bankAccount).toBe('RO49AAAA1B31007593840000');
      expect(profile.bankName).toBe('BCR');
    });

    it('should validate CUI format', async () => {
      await expect(
        service.createProfile('user-5', { ...validProfileData, cui: 'X' }),
      ).rejects.toThrow('Invalid CUI format');
    });

    it('should accept CUI without RO prefix', async () => {
      const profile = await service.createProfile('user-6', {
        ...validProfileData,
        cui: '12345678',
      });

      expect(profile.cui).toBe('12345678');
    });

    it('should get profile by ID', async () => {
      const created = await service.createProfile('user-7', validProfileData);
      const retrieved = await service.getProfile(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.companyName).toBe('Test SRL');
    });

    it('should get profile by user ID', async () => {
      await service.createProfile('user-8', validProfileData);
      const profile = await service.getProfileByUserId('user-8');

      expect(profile).toBeDefined();
      expect(profile?.userId).toBe('user-8');
    });

    it('should return undefined for non-existent profile', async () => {
      const profile = await service.getProfile('non-existent');
      expect(profile).toBeUndefined();
    });

    it('should update profile', async () => {
      const profile = await service.createProfile('user-9', validProfileData);
      const updated = await service.updateProfile(profile.id, {
        companyName: 'Updated SRL',
        phone: '+40722222222',
      });

      expect(updated.companyName).toBe('Updated SRL');
      expect(updated.phone).toBe('+40722222222');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(profile.createdAt.getTime());
    });

    it('should throw error when updating non-existent profile', async () => {
      await expect(
        service.updateProfile('non-existent', { companyName: 'Test' }),
      ).rejects.toThrow('Customer profile not found');
    });

    it('should validate CUI when updating', async () => {
      const profile = await service.createProfile('user-10', validProfileData);
      await expect(service.updateProfile(profile.id, { cui: 'X' })).rejects.toThrow(
        'Invalid CUI format',
      );
    });

    it('should update preferences', async () => {
      const profile = await service.createProfile('user-11', validProfileData);
      const prefs = await service.updatePreferences(profile.id, {
        language: 'en',
        theme: 'dark',
        smsNotifications: true,
      });

      expect(prefs.language).toBe('en');
      expect(prefs.theme).toBe('dark');
      expect(prefs.smsNotifications).toBe(true);
      expect(prefs.emailNotifications).toBe(true); // unchanged
    });

    it('should initialize default widgets', async () => {
      const profile = await service.createProfile('user-12', validProfileData);
      const widgets = await service.getWidgets(profile.id);

      expect(widgets.length).toBe(5);
      expect(widgets.some((w) => w.type === 'recent_invoices')).toBe(true);
      expect(widgets.some((w) => w.type === 'notifications')).toBe(true);
    });

    it('should log activity on profile creation', async () => {
      const profile = await service.createProfile('user-13', validProfileData);
      const logs = await service.getActivityLogs(profile.id);

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('Account Created');
      expect(logs[0].actionRo).toBe('Cont Creat');
    });
  });

  describe('Support Ticket Management', () => {
    let customerId: string;

    beforeEach(async () => {
      const profile = await service.createProfile('ticket-user', {
        companyName: 'Ticket Test SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'ticket@example.com',
      });
      customerId = profile.id;
    });

    it('should create support ticket', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Cannot generate invoice',
        description: 'I get an error when generating invoices',
        category: 'TECHNICAL',
      });

      expect(ticket.id).toMatch(/^TKT-/);
      expect(ticket.subject).toBe('Cannot generate invoice');
      expect(ticket.category).toBe('TECHNICAL');
      expect(ticket.priority).toBe('MEDIUM');
      expect(ticket.status).toBe('OPEN');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ticket.created' }),
      );
    });

    it('should create ticket with custom priority', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Urgent billing issue',
        description: 'Payment not processing',
        category: 'BILLING',
        priority: 'URGENT',
      });

      expect(ticket.priority).toBe('URGENT');
    });

    it('should create ticket with attachments', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Screenshot attached',
        description: 'See attachment',
        category: 'TECHNICAL',
        attachments: ['file1.png', 'file2.pdf'],
      });

      expect(ticket.attachments).toHaveLength(2);
    });

    it('should create ticket with tags', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Feature request',
        description: 'Add new feature',
        category: 'FEATURE_REQUEST',
        tags: ['enhancement', 'ui'],
      });

      expect(ticket.tags).toContain('enhancement');
      expect(ticket.tags).toContain('ui');
    });

    it('should create notification when ticket is created', async () => {
      await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      const notifications = await service.listNotifications(customerId);
      expect(notifications.some((n) => n.title === 'Support Ticket Created')).toBe(true);
    });

    it('should get ticket by ID', async () => {
      const created = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });
      const retrieved = await service.getTicket(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.subject).toBe('Test');
    });

    it('should list tickets by customer', async () => {
      await service.createTicket(customerId, {
        subject: 'Ticket 1',
        description: 'Test',
        category: 'BILLING',
      });
      await service.createTicket(customerId, {
        subject: 'Ticket 2',
        description: 'Test',
        category: 'TECHNICAL',
      });

      const tickets = await service.listTickets(customerId);
      expect(tickets.length).toBe(2);
    });

    it('should filter tickets by status', async () => {
      const ticket1 = await service.createTicket(customerId, {
        subject: 'Open ticket',
        description: 'Test',
        category: 'OTHER',
      });
      await service.createTicket(customerId, {
        subject: 'Another',
        description: 'Test',
        category: 'OTHER',
      });
      await service.updateTicketStatus(ticket1.id, 'RESOLVED');

      const openTickets = await service.listTickets(customerId, { status: 'OPEN' });
      const resolvedTickets = await service.listTickets(customerId, { status: 'RESOLVED' });

      expect(openTickets.length).toBe(1);
      expect(resolvedTickets.length).toBe(1);
    });

    it('should filter tickets by category', async () => {
      await service.createTicket(customerId, {
        subject: 'Billing',
        description: 'Test',
        category: 'BILLING',
      });
      await service.createTicket(customerId, {
        subject: 'Technical',
        description: 'Test',
        category: 'TECHNICAL',
      });

      const billingTickets = await service.listTickets(customerId, { category: 'BILLING' });
      expect(billingTickets.length).toBe(1);
      expect(billingTickets[0].subject).toBe('Billing');
    });

    it('should limit ticket list', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createTicket(customerId, {
          subject: `Ticket ${i}`,
          description: 'Test',
          category: 'OTHER',
        });
      }

      const tickets = await service.listTickets(customerId, { limit: 3 });
      expect(tickets.length).toBe(3);
    });

    it('should sort tickets by date descending', async () => {
      await service.createTicket(customerId, {
        subject: 'First',
        description: 'Test',
        category: 'OTHER',
      });
      await new Promise((r) => setTimeout(r, 10));
      await service.createTicket(customerId, {
        subject: 'Second',
        description: 'Test',
        category: 'OTHER',
      });

      const tickets = await service.listTickets(customerId);
      expect(tickets[0].subject).toBe('Second');
    });

    it('should add message to ticket', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      const message = await service.addTicketMessage(
        ticket.id,
        customerId,
        'CUSTOMER',
        'Additional info here',
      );

      expect(message.id).toMatch(/^msg-/);
      expect(message.content).toBe('Additional info here');
      expect(message.senderType).toBe('CUSTOMER');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'ticket.message.added' }),
      );
    });

    it('should add message with attachments', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      const message = await service.addTicketMessage(
        ticket.id,
        'support-1',
        'SUPPORT',
        'Here is the solution',
        ['solution.pdf'],
      );

      expect(message.attachments).toContain('solution.pdf');
    });

    it('should update ticket status when customer replies to WAITING_CUSTOMER', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });
      await service.updateTicketStatus(ticket.id, 'WAITING_CUSTOMER');

      await service.addTicketMessage(ticket.id, customerId, 'CUSTOMER', 'Reply');

      const updated = await service.getTicket(ticket.id);
      expect(updated?.status).toBe('IN_PROGRESS');
    });

    it('should update ticket status when support replies to OPEN', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      await service.addTicketMessage(ticket.id, 'support-1', 'SUPPORT', 'Looking into it');

      const updated = await service.getTicket(ticket.id);
      expect(updated?.status).toBe('IN_PROGRESS');
    });

    it('should throw error when adding message to non-existent ticket', async () => {
      await expect(
        service.addTicketMessage('non-existent', customerId, 'CUSTOMER', 'Test'),
      ).rejects.toThrow('Ticket not found');
    });

    it('should update ticket status', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      await service.updateTicketStatus(ticket.id, 'IN_PROGRESS');
      let updated = await service.getTicket(ticket.id);
      expect(updated?.status).toBe('IN_PROGRESS');

      await service.updateTicketStatus(ticket.id, 'RESOLVED');
      updated = await service.getTicket(ticket.id);
      expect(updated?.status).toBe('RESOLVED');
      expect(updated?.resolvedAt).toBeDefined();
    });

    it('should set closedAt when status is CLOSED', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      await service.updateTicketStatus(ticket.id, 'CLOSED');
      const updated = await service.getTicket(ticket.id);
      expect(updated?.closedAt).toBeDefined();
    });

    it('should assign ticket to agent', async () => {
      const ticket = await service.createTicket(customerId, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      const assigned = await service.assignTicket(ticket.id, 'agent-1');

      expect(assigned.assignedTo).toBe('agent-1');
      expect(assigned.status).toBe('IN_PROGRESS');
    });
  });

  describe('Notification Management', () => {
    let customerId: string;

    beforeEach(async () => {
      const profile = await service.createProfile('notif-user', {
        companyName: 'Notif Test SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'notif@example.com',
      });
      customerId = profile.id;
    });

    it('should create notification', async () => {
      const notification = await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Welcome',
        titleRo: 'Bun venit',
        message: 'Welcome to the portal',
        messageRo: 'Bine ați venit în portal',
      });

      expect(notification.id).toMatch(/^notif-/);
      expect(notification.type).toBe('INFO');
      expect(notification.read).toBe(false);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'notification.created' }),
      );
    });

    it('should create notification with action URL', async () => {
      const notification = await service.createNotification(customerId, {
        type: 'BILLING',
        title: 'Invoice Ready',
        titleRo: 'Factură Disponibilă',
        message: 'Your invoice is ready',
        messageRo: 'Factura dumneavoastră este disponibilă',
        actionUrl: '/invoices/123',
      });

      expect(notification.actionUrl).toBe('/invoices/123');
    });

    it('should create notification with metadata', async () => {
      const notification = await service.createNotification(customerId, {
        type: 'SYSTEM',
        title: 'Update',
        titleRo: 'Actualizare',
        message: 'System update',
        messageRo: 'Actualizare sistem',
        metadata: { version: '2.0', changes: ['feature1', 'feature2'] },
      });

      expect(notification.metadata?.version).toBe('2.0');
    });

    it('should create notification with expiry', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const notification = await service.createNotification(customerId, {
        type: 'WARNING',
        title: 'Expires Soon',
        titleRo: 'Expiră Curând',
        message: 'Action required',
        messageRo: 'Acțiune necesară',
        expiresAt,
      });

      expect(notification.expiresAt).toEqual(expiresAt);
    });

    it('should get notification by ID', async () => {
      const created = await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Test',
        titleRo: 'Test',
        message: 'Test',
        messageRo: 'Test',
      });
      const retrieved = await service.getNotification(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test');
    });

    it('should list notifications by customer', async () => {
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Notif 1',
        titleRo: 'Notif 1',
        message: 'Test',
        messageRo: 'Test',
      });
      await service.createNotification(customerId, {
        type: 'WARNING',
        title: 'Notif 2',
        titleRo: 'Notif 2',
        message: 'Test',
        messageRo: 'Test',
      });

      // Note: One notification is created when profile is created (account created)
      const notifications = await service.listNotifications(customerId);
      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter unread notifications', async () => {
      const notif = await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Unread',
        titleRo: 'Necitit',
        message: 'Test',
        messageRo: 'Test',
      });
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Read',
        titleRo: 'Citit',
        message: 'Test',
        messageRo: 'Test',
      });
      await service.markNotificationRead(notif.id);

      const unread = await service.listNotifications(customerId, { unreadOnly: true });
      expect(unread.every((n) => !n.read)).toBe(true);
    });

    it('should filter notifications by type', async () => {
      await service.createNotification(customerId, {
        type: 'BILLING',
        title: 'Billing',
        titleRo: 'Facturare',
        message: 'Test',
        messageRo: 'Test',
      });
      await service.createNotification(customerId, {
        type: 'ERROR',
        title: 'Error',
        titleRo: 'Eroare',
        message: 'Test',
        messageRo: 'Test',
      });

      const billing = await service.listNotifications(customerId, { type: 'BILLING' });
      expect(billing.every((n) => n.type === 'BILLING')).toBe(true);
    });

    it('should filter out expired notifications', async () => {
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Valid',
        titleRo: 'Valid',
        message: 'Test',
        messageRo: 'Test',
        expiresAt: new Date(Date.now() + 1000000),
      });
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Expired',
        titleRo: 'Expirat',
        message: 'Test',
        messageRo: 'Test',
        expiresAt: new Date(Date.now() - 1000),
      });

      const notifications = await service.listNotifications(customerId);
      expect(notifications.every((n) => n.title !== 'Expired')).toBe(true);
    });

    it('should mark notification as read', async () => {
      const notification = await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Test',
        titleRo: 'Test',
        message: 'Test',
        messageRo: 'Test',
      });

      const marked = await service.markNotificationRead(notification.id);
      expect(marked.read).toBe(true);
    });

    it('should throw error when marking non-existent notification', async () => {
      await expect(service.markNotificationRead('non-existent')).rejects.toThrow(
        'Notification not found',
      );
    });

    it('should mark all notifications as read', async () => {
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Notif 1',
        titleRo: 'Notif 1',
        message: 'Test',
        messageRo: 'Test',
      });
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Notif 2',
        titleRo: 'Notif 2',
        message: 'Test',
        messageRo: 'Test',
      });

      const count = await service.markAllNotificationsRead(customerId);
      expect(count).toBeGreaterThanOrEqual(2);

      const unread = await service.listNotifications(customerId, { unreadOnly: true });
      expect(unread.length).toBe(0);
    });

    it('should delete notification', async () => {
      const notification = await service.createNotification(customerId, {
        type: 'INFO',
        title: 'To Delete',
        titleRo: 'De Șters',
        message: 'Test',
        messageRo: 'Test',
      });

      await service.deleteNotification(notification.id);
      const retrieved = await service.getNotification(notification.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get unread count', async () => {
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Test 1',
        titleRo: 'Test 1',
        message: 'Test',
        messageRo: 'Test',
      });
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Test 2',
        titleRo: 'Test 2',
        message: 'Test',
        messageRo: 'Test',
      });

      const count = await service.getUnreadCount(customerId);
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Document Center', () => {
    let customerId: string;

    beforeEach(async () => {
      const profile = await service.createProfile('doc-user', {
        companyName: 'Doc Test SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'doc@example.com',
      });
      customerId = profile.id;
    });

    it('should add document', async () => {
      const document = await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Invoice 001',
        nameRo: 'Factură 001',
        fileUrl: '/files/invoice-001.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
      });

      expect(document.id).toMatch(/^doc-/);
      expect(document.type).toBe('INVOICE');
      expect(document.name).toBe('Invoice 001');
      expect(document.downloadCount).toBe(0);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'document.added' }),
      );
    });

    it('should add document with description', async () => {
      const document = await service.addDocument(customerId, {
        type: 'CONTRACT',
        name: 'Service Contract',
        nameRo: 'Contract de Servicii',
        fileUrl: '/files/contract.pdf',
        fileSize: 204800,
        mimeType: 'application/pdf',
        description: 'Annual service contract',
        descriptionRo: 'Contract anual de servicii',
      });

      expect(document.description).toBe('Annual service contract');
      expect(document.descriptionRo).toBe('Contract anual de servicii');
    });

    it('should add document with related ID', async () => {
      const document = await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Invoice 002',
        nameRo: 'Factură 002',
        fileUrl: '/files/invoice-002.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        relatedId: 'inv-123',
      });

      expect(document.relatedId).toBe('inv-123');
    });

    it('should add document with tags', async () => {
      const document = await service.addDocument(customerId, {
        type: 'REPORT',
        name: 'Monthly Report',
        nameRo: 'Raport Lunar',
        fileUrl: '/files/report.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
        tags: ['monthly', '2025', 'financial'],
      });

      expect(document.tags).toContain('monthly');
      expect(document.tags).toContain('financial');
    });

    it('should get document by ID', async () => {
      const created = await service.addDocument(customerId, {
        type: 'RECEIPT',
        name: 'Receipt',
        nameRo: 'Chitanță',
        fileUrl: '/files/receipt.pdf',
        fileSize: 51200,
        mimeType: 'application/pdf',
      });
      const retrieved = await service.getDocument(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Receipt');
    });

    it('should list documents by customer', async () => {
      await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Doc 1',
        nameRo: 'Doc 1',
        fileUrl: '/files/1.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });
      await service.addDocument(customerId, {
        type: 'CONTRACT',
        name: 'Doc 2',
        nameRo: 'Doc 2',
        fileUrl: '/files/2.pdf',
        fileSize: 2000,
        mimeType: 'application/pdf',
      });

      const documents = await service.listDocuments(customerId);
      expect(documents.length).toBe(2);
    });

    it('should filter documents by type', async () => {
      await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Invoice',
        nameRo: 'Factură',
        fileUrl: '/files/inv.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });
      await service.addDocument(customerId, {
        type: 'CONTRACT',
        name: 'Contract',
        nameRo: 'Contract',
        fileUrl: '/files/contract.pdf',
        fileSize: 2000,
        mimeType: 'application/pdf',
      });

      const invoices = await service.listDocuments(customerId, { type: 'INVOICE' });
      expect(invoices.length).toBe(1);
      expect(invoices[0].type).toBe('INVOICE');
    });

    it('should search documents by name', async () => {
      await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'January Invoice',
        nameRo: 'Factură Ianuarie',
        fileUrl: '/files/jan.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });
      await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'February Invoice',
        nameRo: 'Factură Februarie',
        fileUrl: '/files/feb.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });

      const results = await service.listDocuments(customerId, { search: 'January' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('January Invoice');
    });

    it('should search documents by Romanian name', async () => {
      await service.addDocument(customerId, {
        type: 'REPORT',
        name: 'Report',
        nameRo: 'Raport Trimestrial',
        fileUrl: '/files/report.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });

      const results = await service.listDocuments(customerId, { search: 'Trimestrial' });
      expect(results.length).toBe(1);
    });

    it('should search documents by tag', async () => {
      await service.addDocument(customerId, {
        type: 'TAX_DOCUMENT',
        name: 'Tax Form',
        nameRo: 'Formular Fiscal',
        fileUrl: '/files/tax.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
        tags: ['anaf', 'd406'],
      });

      const results = await service.listDocuments(customerId, { search: 'd406' });
      expect(results.length).toBe(1);
    });

    it('should track download count', async () => {
      const document = await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Invoice',
        nameRo: 'Factură',
        fileUrl: '/files/inv.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });

      await service.downloadDocument(document.id);
      await service.downloadDocument(document.id);
      await service.downloadDocument(document.id);

      const updated = await service.getDocument(document.id);
      expect(updated?.downloadCount).toBe(3);
    });

    it('should throw error when downloading non-existent document', async () => {
      await expect(service.downloadDocument('non-existent')).rejects.toThrow(
        'Document not found',
      );
    });

    it('should delete document', async () => {
      const document = await service.addDocument(customerId, {
        type: 'OTHER',
        name: 'To Delete',
        nameRo: 'De Șters',
        fileUrl: '/files/delete.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });

      await service.deleteDocument(document.id);
      const retrieved = await service.getDocument(document.id);
      expect(retrieved).toBeUndefined();
    });

    it('should throw error when deleting non-existent document', async () => {
      await expect(service.deleteDocument('non-existent')).rejects.toThrow(
        'Document not found',
      );
    });

    it('should log activity when document is added', async () => {
      await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Test Doc',
        nameRo: 'Doc Test',
        fileUrl: '/files/test.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });

      const logs = await service.getActivityLogs(customerId);
      expect(logs.some((l) => l.action === 'Document Added')).toBe(true);
    });
  });

  describe('Activity Logging', () => {
    let customerId: string;

    beforeEach(async () => {
      const profile = await service.createProfile('log-user', {
        companyName: 'Log Test SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'log@example.com',
      });
      customerId = profile.id;
    });

    it('should log activity', async () => {
      const log = await service.logActivity(customerId, 'Login', 'Autentificare');

      expect(log.id).toMatch(/^log-/);
      expect(log.action).toBe('Login');
      expect(log.actionRo).toBe('Autentificare');
    });

    it('should log activity with details', async () => {
      const log = await service.logActivity(
        customerId,
        'Document Downloaded',
        'Document Descărcat',
        { documentId: 'doc-123', name: 'Invoice.pdf' },
      );

      expect(log.details).toContain('doc-123');
    });

    it('should log activity with context', async () => {
      const log = await service.logActivity(
        customerId,
        'Login',
        'Autentificare',
        undefined,
        { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      );

      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.userAgent).toBe('Mozilla/5.0');
    });

    it('should get activity logs', async () => {
      await service.logActivity(customerId, 'Action 1', 'Acțiune 1');
      await service.logActivity(customerId, 'Action 2', 'Acțiune 2');

      const logs = await service.getActivityLogs(customerId);
      // +1 for account creation log
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('should sort logs by date descending', async () => {
      await service.logActivity(customerId, 'First', 'Prima');
      await new Promise((r) => setTimeout(r, 10));
      await service.logActivity(customerId, 'Second', 'A Doua');

      const logs = await service.getActivityLogs(customerId);
      expect(logs[0].action).toBe('Second');
    });

    it('should limit logs', async () => {
      for (let i = 0; i < 10; i++) {
        await service.logActivity(customerId, `Action ${i}`, `Acțiune ${i}`);
      }

      const logs = await service.getActivityLogs(customerId, { limit: 5 });
      expect(logs.length).toBe(5);
    });

    it('should offset logs', async () => {
      for (let i = 0; i < 10; i++) {
        await service.logActivity(customerId, `Action ${i}`, `Acțiune ${i}`);
      }

      const logs = await service.getActivityLogs(customerId, { offset: 5, limit: 3 });
      expect(logs.length).toBe(3);
    });
  });

  describe('Dashboard Widgets', () => {
    let customerId: string;

    beforeEach(async () => {
      const profile = await service.createProfile('widget-user', {
        companyName: 'Widget Test SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'widget@example.com',
      });
      customerId = profile.id;
    });

    it('should get default widgets', async () => {
      const widgets = await service.getWidgets(customerId);

      expect(widgets.length).toBe(5);
      expect(widgets.find((w) => w.type === 'recent_invoices')).toBeDefined();
      expect(widgets.find((w) => w.type === 'notifications')).toBeDefined();
    });

    it('should have Romanian titles for widgets', async () => {
      const widgets = await service.getWidgets(customerId);

      const invoiceWidget = widgets.find((w) => w.type === 'recent_invoices');
      expect(invoiceWidget?.titleRo).toBe('Facturi Recente');
    });

    it('should update widget', async () => {
      const widgets = await service.getWidgets(customerId);
      const widget = widgets[0];

      const updated = await service.updateWidget(customerId, widget.id, {
        enabled: false,
        title: 'Custom Title',
      });

      expect(updated.enabled).toBe(false);
      expect(updated.title).toBe('Custom Title');
    });

    it('should throw error when updating widget for non-existent customer', async () => {
      await expect(
        service.updateWidget('non-existent', 'widget-1', { enabled: false }),
      ).rejects.toThrow('No widgets found');
    });

    it('should throw error when updating non-existent widget', async () => {
      await expect(
        service.updateWidget(customerId, 'non-existent', { enabled: false }),
      ).rejects.toThrow('Widget not found');
    });

    it('should reorder widgets', async () => {
      const widgets = await service.getWidgets(customerId);
      const ids = widgets.map((w) => w.id);
      const reversedIds = [...ids].reverse();

      const reordered = await service.reorderWidgets(customerId, reversedIds);

      expect(reordered[0].id).toBe(reversedIds[0]);
      expect(reordered[0].position).toBe(1);
      expect(reordered[4].position).toBe(5);
    });
  });

  describe('Portal Statistics', () => {
    let customerId: string;

    beforeEach(async () => {
      const profile = await service.createProfile('stats-user', {
        companyName: 'Stats Test SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'stats@example.com',
      });
      customerId = profile.id;
    });

    it('should return portal stats', async () => {
      const stats = await service.getPortalStats(customerId);

      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('unreadNotifications');
      expect(stats).toHaveProperty('openTickets');
      expect(stats).toHaveProperty('pendingInvoices');
      expect(stats).toHaveProperty('storageUsed');
      expect(stats).toHaveProperty('storageLimit');
    });

    it('should count documents', async () => {
      await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Invoice 1',
        nameRo: 'Factură 1',
        fileUrl: '/files/1.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });
      await service.addDocument(customerId, {
        type: 'CONTRACT',
        name: 'Contract 1',
        nameRo: 'Contract 1',
        fileUrl: '/files/2.pdf',
        fileSize: 2000,
        mimeType: 'application/pdf',
      });

      const stats = await service.getPortalStats(customerId);
      expect(stats.totalDocuments).toBe(2);
    });

    it('should count unread notifications', async () => {
      await service.createNotification(customerId, {
        type: 'INFO',
        title: 'Test',
        titleRo: 'Test',
        message: 'Test',
        messageRo: 'Test',
      });
      await service.createNotification(customerId, {
        type: 'WARNING',
        title: 'Test 2',
        titleRo: 'Test 2',
        message: 'Test',
        messageRo: 'Test',
      });

      const stats = await service.getPortalStats(customerId);
      expect(stats.unreadNotifications).toBeGreaterThanOrEqual(2);
    });

    it('should count open tickets', async () => {
      await service.createTicket(customerId, {
        subject: 'Open 1',
        description: 'Test',
        category: 'OTHER',
      });
      const ticket2 = await service.createTicket(customerId, {
        subject: 'Resolved',
        description: 'Test',
        category: 'OTHER',
      });
      await service.updateTicketStatus(ticket2.id, 'RESOLVED');

      const stats = await service.getPortalStats(customerId);
      expect(stats.openTickets).toBe(1);
    });

    it('should calculate storage used', async () => {
      await service.addDocument(customerId, {
        type: 'INVOICE',
        name: 'Doc 1',
        nameRo: 'Doc 1',
        fileUrl: '/files/1.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });
      await service.addDocument(customerId, {
        type: 'CONTRACT',
        name: 'Doc 2',
        nameRo: 'Doc 2',
        fileUrl: '/files/2.pdf',
        fileSize: 2000,
        mimeType: 'application/pdf',
      });

      const stats = await service.getPortalStats(customerId);
      expect(stats.storageUsed).toBe(3000);
    });

    it('should have default storage limit', async () => {
      const stats = await service.getPortalStats(customerId);
      expect(stats.storageLimit).toBe(5000000000); // 5GB
    });
  });

  describe('Romanian Localization', () => {
    it('should translate ticket categories', () => {
      expect(service.getCategoryName('BILLING')).toBe('Facturare');
      expect(service.getCategoryName('TECHNICAL')).toBe('Tehnic');
      expect(service.getCategoryName('ACCOUNT')).toBe('Cont');
      expect(service.getCategoryName('INTEGRATION')).toBe('Integrare');
      expect(service.getCategoryName('FEATURE_REQUEST')).toBe('Solicitare Funcționalitate');
      expect(service.getCategoryName('OTHER')).toBe('Altele');
    });

    it('should translate ticket priorities', () => {
      expect(service.getPriorityName('LOW')).toBe('Scăzută');
      expect(service.getPriorityName('MEDIUM')).toBe('Medie');
      expect(service.getPriorityName('HIGH')).toBe('Ridicată');
      expect(service.getPriorityName('URGENT')).toBe('Urgentă');
    });

    it('should translate ticket statuses', () => {
      expect(service.getStatusName('OPEN')).toBe('Deschis');
      expect(service.getStatusName('IN_PROGRESS')).toBe('În Lucru');
      expect(service.getStatusName('WAITING_CUSTOMER')).toBe('Așteptare Client');
      expect(service.getStatusName('RESOLVED')).toBe('Rezolvat');
      expect(service.getStatusName('CLOSED')).toBe('Închis');
    });

    it('should translate document types', () => {
      expect(service.getDocumentTypeName('INVOICE')).toBe('Factură');
      expect(service.getDocumentTypeName('CONTRACT')).toBe('Contract');
      expect(service.getDocumentTypeName('REPORT')).toBe('Raport');
      expect(service.getDocumentTypeName('TAX_DOCUMENT')).toBe('Document Fiscal');
      expect(service.getDocumentTypeName('RECEIPT')).toBe('Chitanță');
    });

    it('should get all categories with translations', () => {
      const categories = service.getAllCategories();

      expect(categories.length).toBe(6);
      expect(categories).toContainEqual({
        category: 'BILLING',
        name: 'billing',
        nameRo: 'Facturare',
      });
    });

    it('should get all priorities with translations', () => {
      const priorities = service.getAllPriorities();

      expect(priorities.length).toBe(4);
      expect(priorities).toContainEqual({
        priority: 'URGENT',
        name: 'urgent',
        nameRo: 'Urgentă',
      });
    });

    it('should get all statuses with translations', () => {
      const statuses = service.getAllStatuses();

      expect(statuses.length).toBe(5);
      expect(statuses).toContainEqual({
        status: 'IN_PROGRESS',
        name: 'in progress',
        nameRo: 'În Lucru',
      });
    });

    it('should use Romanian diacritics correctly', async () => {
      expect(service.getCategoryName('FEATURE_REQUEST')).toContain('ț'); // Funcționalitate
      expect(service.getPriorityName('LOW')).toContain('ă'); // Scăzută
      expect(service.getStatusName('WAITING_CUSTOMER')).toContain('ș'); // Așteptare
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete customer onboarding flow', async () => {
      // Create profile
      const profile = await service.createProfile('onboard-user', {
        companyName: 'Onboard SRL',
        cui: '12345678',
        address: 'Str. Test nr. 1',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'onboard@example.com',
        vatPayer: true,
        bankAccount: 'RO49AAAA1B31007593840000',
        bankName: 'BCR',
      });

      // Update preferences
      await service.updatePreferences(profile.id, {
        language: 'en',
        theme: 'dark',
        twoFactorEnabled: true,
      });

      // Check widgets are initialized
      const widgets = await service.getWidgets(profile.id);
      expect(widgets.length).toBe(5);

      // Check activity is logged
      const logs = await service.getActivityLogs(profile.id);
      expect(logs.some((l) => l.action === 'Account Created')).toBe(true);
      expect(logs.some((l) => l.action === 'Preferences Updated')).toBe(true);
    });

    it('should handle support workflow', async () => {
      const profile = await service.createProfile('support-flow-user', {
        companyName: 'Support Flow SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'support@example.com',
      });

      // Customer creates ticket
      const ticket = await service.createTicket(profile.id, {
        subject: 'Cannot login',
        description: 'I get an error message',
        category: 'TECHNICAL',
        priority: 'HIGH',
      });

      // Support assigns and responds
      await service.assignTicket(ticket.id, 'agent-1');
      await service.addTicketMessage(
        ticket.id,
        'agent-1',
        'SUPPORT',
        'Can you provide the error message?',
      );

      // Check status changed
      let updated = await service.getTicket(ticket.id);
      expect(updated?.status).toBe('IN_PROGRESS');

      // Customer responds
      await service.addTicketMessage(
        ticket.id,
        profile.id,
        'CUSTOMER',
        'The error says "Invalid credentials"',
      );

      // Support resolves
      await service.addTicketMessage(
        ticket.id,
        'agent-1',
        'SUPPORT',
        'Please reset your password',
      );
      await service.updateTicketStatus(ticket.id, 'RESOLVED');

      updated = await service.getTicket(ticket.id);
      expect(updated?.status).toBe('RESOLVED');
      expect(updated?.resolvedAt).toBeDefined();
      expect(updated?.messages.length).toBe(3);
    });

    it('should handle document management workflow', async () => {
      const profile = await service.createProfile('doc-flow-user', {
        companyName: 'Doc Flow SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'docflow@example.com',
      });

      // Add documents of different types
      const invoice = await service.addDocument(profile.id, {
        type: 'INVOICE',
        name: 'Invoice 2025-001',
        nameRo: 'Factură 2025-001',
        fileUrl: '/files/invoice.pdf',
        fileSize: 150000,
        mimeType: 'application/pdf',
        tags: ['2025', 'january'],
      });

      await service.addDocument(profile.id, {
        type: 'TAX_DOCUMENT',
        name: 'D406 Declaration',
        nameRo: 'Declarație D406',
        fileUrl: '/files/d406.xml',
        fileSize: 50000,
        mimeType: 'application/xml',
        tags: ['anaf', 'd406', 'saf-t'],
      });

      // Download invoice
      await service.downloadDocument(invoice.id);

      // Check stats
      const stats = await service.getPortalStats(profile.id);
      expect(stats.totalDocuments).toBe(2);
      expect(stats.storageUsed).toBe(200000);

      // Search by tag
      const anafDocs = await service.listDocuments(profile.id, { search: 'anaf' });
      expect(anafDocs.length).toBe(1);
    });

    it('should emit all relevant events', async () => {
      emittedEvents.length = 0;

      const profile = await service.createProfile('events-user', {
        companyName: 'Events SRL',
        cui: '12345678',
        address: 'Str. Test',
        city: 'București',
        county: 'București',
        postalCode: '010101',
        phone: '+40721234567',
        email: 'events@example.com',
      });

      await service.createTicket(profile.id, {
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      await service.addDocument(profile.id, {
        type: 'INVOICE',
        name: 'Test',
        nameRo: 'Test',
        fileUrl: '/test.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });

      const eventNames = emittedEvents.map((e) => e.event);
      expect(eventNames).toContain('customer.profile.created');
      expect(eventNames).toContain('ticket.created');
      expect(eventNames).toContain('notification.created');
      expect(eventNames).toContain('document.added');
    });
  });
});
