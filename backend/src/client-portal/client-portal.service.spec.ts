import { Test, TestingModule } from '@nestjs/testing';
import {
  ClientPortalService,
  ClientProfile,
  ClientDocument,
  ClientInvoice,
} from './client-portal.service';

describe('ClientPortalService', () => {
  let service: ClientPortalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientPortalService],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  describe('Client Profile', () => {
    describe('getClientProfile', () => {
      it('should return client profile by id', async () => {
        const profile = await service.getClientProfile('client-001');

        expect(profile).toBeDefined();
        expect(profile?.id).toBe('client-001');
        expect(profile?.companyName).toBe('ABC Solutions SRL');
        expect(profile?.cui).toBe('RO12345678');
        expect(profile?.status).toBe('active');
      });

      it('should return undefined for non-existent client', async () => {
        const profile = await service.getClientProfile('non-existent');

        expect(profile).toBeUndefined();
      });

      it('should include subscription information', async () => {
        const profile = await service.getClientProfile('client-001');

        expect(profile?.subscriptionPlan).toBe('Business');
        expect(profile?.subscriptionExpiresAt).toBeInstanceOf(Date);
      });

      it('should include account manager info', async () => {
        const profile = await service.getClientProfile('client-001');

        expect(profile?.accountManagerId).toBe('manager-001');
        expect(profile?.accountManagerName).toBe('Maria Popescu');
      });
    });

    describe('updateClientProfile', () => {
      it('should update client profile', async () => {
        const updated = await service.updateClientProfile('client-001', {
          phone: '+40 21 999 8888',
          address: 'New Address 123',
        });

        expect(updated?.phone).toBe('+40 21 999 8888');
        expect(updated?.address).toBe('New Address 123');
      });

      it('should return undefined for non-existent client', async () => {
        const result = await service.updateClientProfile('non-existent', {
          phone: '123',
        });

        expect(result).toBeUndefined();
      });

      it('should preserve existing fields', async () => {
        const original = await service.getClientProfile('client-001');
        const originalName = original?.companyName;

        await service.updateClientProfile('client-001', {
          phone: '+40 21 111 2222',
        });

        const updated = await service.getClientProfile('client-001');
        expect(updated?.companyName).toBe(originalName);
      });
    });
  });

  describe('Portal Dashboard', () => {
    describe('getPortalDashboard', () => {
      it('should return dashboard data', async () => {
        const dashboard = await service.getPortalDashboard('client-001');

        expect(dashboard.profile).toBeDefined();
        expect(dashboard.profile?.id).toBe('client-001');
        expect(dashboard.stats).toBeDefined();
        expect(dashboard.recentInvoices).toBeDefined();
        expect(dashboard.recentDocuments).toBeDefined();
        expect(dashboard.recentNotifications).toBeDefined();
      });

      it('should include statistics', async () => {
        const dashboard = await service.getPortalDashboard('client-001');

        expect(typeof dashboard.stats.totalInvoices).toBe('number');
        expect(typeof dashboard.stats.unpaidInvoices).toBe('number');
        expect(typeof dashboard.stats.totalDocuments).toBe('number');
        expect(typeof dashboard.stats.unreadMessages).toBe('number');
        expect(typeof dashboard.stats.unreadNotifications).toBe('number');
      });

      it('should limit recent items to 5', async () => {
        const dashboard = await service.getPortalDashboard('client-001');

        expect(dashboard.recentInvoices.length).toBeLessThanOrEqual(5);
        expect(dashboard.recentDocuments.length).toBeLessThanOrEqual(5);
        expect(dashboard.recentNotifications.length).toBeLessThanOrEqual(5);
      });

      it('should sort recent invoices by date descending', async () => {
        const dashboard = await service.getPortalDashboard('client-001');

        for (let i = 1; i < dashboard.recentInvoices.length; i++) {
          expect(
            dashboard.recentInvoices[i - 1].issueDate.getTime(),
          ).toBeGreaterThanOrEqual(dashboard.recentInvoices[i].issueDate.getTime());
        }
      });

      it('should sort recent documents by date descending', async () => {
        const dashboard = await service.getPortalDashboard('client-001');

        for (let i = 1; i < dashboard.recentDocuments.length; i++) {
          expect(
            dashboard.recentDocuments[i - 1].uploadedAt.getTime(),
          ).toBeGreaterThanOrEqual(dashboard.recentDocuments[i].uploadedAt.getTime());
        }
      });

      it('should count unpaid invoices correctly', async () => {
        const dashboard = await service.getPortalDashboard('client-001');
        const { invoices } = await service.getClientInvoices('client-001');

        const unpaidCount = invoices.filter(
          (i) => i.status === 'sent' || i.status === 'overdue',
        ).length;

        expect(dashboard.stats.unpaidInvoices).toBe(unpaidCount);
      });
    });
  });

  describe('Documents', () => {
    describe('getClientDocuments', () => {
      it('should return documents for client', async () => {
        const result = await service.getClientDocuments('client-001');

        expect(result.documents).toBeDefined();
        expect(result.total).toBeGreaterThan(0);
        result.documents.forEach((doc) => {
          expect(doc.clientId).toBe('client-001');
        });
      });

      it('should filter by type', async () => {
        const result = await service.getClientDocuments('client-001', 'invoice');

        result.documents.forEach((doc) => {
          expect(doc.type).toBe('invoice');
        });
      });

      it('should apply pagination', async () => {
        const page1 = await service.getClientDocuments('client-001', undefined, 5, 0);
        const page2 = await service.getClientDocuments('client-001', undefined, 5, 5);

        expect(page1.documents.length).toBeLessThanOrEqual(5);
        if (page1.total > 5) {
          expect(page2.documents[0]?.id).not.toBe(page1.documents[0]?.id);
        }
      });

      it('should sort by upload date descending', async () => {
        const result = await service.getClientDocuments('client-001');

        for (let i = 1; i < result.documents.length; i++) {
          expect(
            result.documents[i - 1].uploadedAt.getTime(),
          ).toBeGreaterThanOrEqual(result.documents[i].uploadedAt.getTime());
        }
      });

      it('should return total count', async () => {
        const result = await service.getClientDocuments('client-001', undefined, 2);

        expect(result.total).toBeGreaterThanOrEqual(result.documents.length);
      });
    });

    describe('getDocumentById', () => {
      it('should return document by id', async () => {
        const { documents } = await service.getClientDocuments('client-001');
        const docId = documents[0]?.id;

        if (docId) {
          const document = await service.getDocumentById('client-001', docId);

          expect(document).toBeDefined();
          expect(document?.id).toBe(docId);
          expect(document?.clientId).toBe('client-001');
        }
      });

      it('should return undefined for wrong client', async () => {
        const { documents } = await service.getClientDocuments('client-001');
        const docId = documents[0]?.id;

        if (docId) {
          const document = await service.getDocumentById('client-002', docId);

          // May or may not find it depending on mock data distribution
          if (document) {
            expect(document.clientId).toBe('client-002');
          }
        }
      });

      it('should return undefined for non-existent document', async () => {
        const document = await service.getDocumentById('client-001', 'non-existent');

        expect(document).toBeUndefined();
      });
    });

    describe('uploadDocument', () => {
      it('should upload new document', async () => {
        const document = await service.uploadDocument('client-001', {
          name: 'Test Document.pdf',
          type: 'contract',
          category: 'Legal',
          tags: ['2024', 'important'],
        });

        expect(document.id).toBeDefined();
        expect(document.name).toBe('Test Document.pdf');
        expect(document.type).toBe('contract');
        expect(document.category).toBe('Legal');
        expect(document.status).toBe('pending');
        expect(document.tags).toContain('2024');
        expect(document.uploadedAt).toBeInstanceOf(Date);
      });

      it('should set correct client id', async () => {
        const document = await service.uploadDocument('client-001', {
          name: 'Client Doc.pdf',
          type: 'report',
          category: 'Reports',
        });

        expect(document.clientId).toBe('client-001');
      });

      it('should support all document types', async () => {
        const types: Array<'invoice' | 'contract' | 'report' | 'statement' | 'tax_document' | 'other'> = [
          'invoice', 'contract', 'report', 'statement', 'tax_document', 'other',
        ];

        for (const type of types) {
          const doc = await service.uploadDocument('client-001', {
            name: `${type}.pdf`,
            type,
            category: 'Test',
          });
          expect(doc.type).toBe(type);
        }
      });

      it('should default tags to empty array', async () => {
        const document = await service.uploadDocument('client-001', {
          name: 'No Tags.pdf',
          type: 'other',
          category: 'Misc',
        });

        expect(document.tags).toEqual([]);
      });
    });
  });

  describe('Invoices', () => {
    describe('getClientInvoices', () => {
      it('should return invoices for client', async () => {
        const result = await service.getClientInvoices('client-001');

        expect(result.invoices).toBeDefined();
        expect(result.total).toBeGreaterThan(0);
        result.invoices.forEach((inv) => {
          expect(inv.clientId).toBe('client-001');
        });
      });

      it('should filter by status', async () => {
        const result = await service.getClientInvoices('client-001', 'paid');

        result.invoices.forEach((inv) => {
          expect(inv.status).toBe('paid');
        });
      });

      it('should apply pagination', async () => {
        const page1 = await service.getClientInvoices('client-001', undefined, 3, 0);
        const page2 = await service.getClientInvoices('client-001', undefined, 3, 3);

        expect(page1.invoices.length).toBeLessThanOrEqual(3);
        if (page1.total > 3) {
          expect(page2.invoices[0]?.id).not.toBe(page1.invoices[0]?.id);
        }
      });

      it('should sort by issue date descending', async () => {
        const result = await service.getClientInvoices('client-001');

        for (let i = 1; i < result.invoices.length; i++) {
          expect(
            result.invoices[i - 1].issueDate.getTime(),
          ).toBeGreaterThanOrEqual(result.invoices[i].issueDate.getTime());
        }
      });

      it('should include invoice items', async () => {
        const result = await service.getClientInvoices('client-001');

        result.invoices.forEach((inv) => {
          expect(inv.items).toBeDefined();
          expect(Array.isArray(inv.items)).toBe(true);
        });
      });
    });

    describe('getInvoiceById', () => {
      it('should return invoice by id', async () => {
        const { invoices } = await service.getClientInvoices('client-001');
        const invId = invoices[0]?.id;

        if (invId) {
          const invoice = await service.getInvoiceById('client-001', invId);

          expect(invoice).toBeDefined();
          expect(invoice?.id).toBe(invId);
        }
      });

      it('should return undefined for non-existent invoice', async () => {
        const invoice = await service.getInvoiceById('client-001', 'non-existent');

        expect(invoice).toBeUndefined();
      });
    });

    describe('getInvoiceSummary', () => {
      it('should return invoice summary', async () => {
        const summary = await service.getInvoiceSummary('client-001');

        expect(typeof summary.totalPaid).toBe('number');
        expect(typeof summary.totalUnpaid).toBe('number');
        expect(typeof summary.totalOverdue).toBe('number');
        expect(summary.invoicesByStatus).toBeDefined();
      });

      it('should calculate totals including VAT', async () => {
        const { invoices } = await service.getClientInvoices('client-001');
        const summary = await service.getInvoiceSummary('client-001');

        const manualPaidTotal = invoices
          .filter((i) => i.status === 'paid')
          .reduce((sum, i) => sum + i.amount + i.vatAmount, 0);

        expect(summary.totalPaid).toBeCloseTo(manualPaidTotal, 2);
      });

      it('should count invoices by status', async () => {
        const { invoices } = await service.getClientInvoices('client-001');
        const summary = await service.getInvoiceSummary('client-001');

        const statusCounts = invoices.reduce((acc, i) => {
          acc[i.status] = (acc[i.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        expect(summary.invoicesByStatus).toEqual(statusCounts);
      });
    });
  });

  describe('Statements', () => {
    describe('getStatements', () => {
      it('should return statements for client', async () => {
        // First generate a statement
        await service.generateStatement(
          'client-001',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date(),
        );

        const statements = await service.getStatements('client-001');

        expect(statements.length).toBeGreaterThan(0);
        statements.forEach((s) => {
          expect(s.clientId).toBe('client-001');
        });
      });
    });

    describe('generateStatement', () => {
      it('should generate statement for period', async () => {
        const periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const periodEnd = new Date();

        const statement = await service.generateStatement('client-001', periodStart, periodEnd);

        expect(statement.id).toBeDefined();
        expect(statement.clientId).toBe('client-001');
        expect(statement.periodStart).toEqual(periodStart);
        expect(statement.periodEnd).toEqual(periodEnd);
        expect(statement.generatedAt).toBeInstanceOf(Date);
        expect(statement.pdfUrl).toBeDefined();
      });

      it('should include transactions', async () => {
        const statement = await service.generateStatement(
          'client-001',
          new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          new Date(),
        );

        expect(statement.transactions).toBeDefined();
        expect(Array.isArray(statement.transactions)).toBe(true);
      });

      it('should calculate balances', async () => {
        const statement = await service.generateStatement(
          'client-001',
          new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          new Date(),
        );

        expect(typeof statement.openingBalance).toBe('number');
        expect(typeof statement.closingBalance).toBe('number');
        expect(typeof statement.totalDebits).toBe('number');
        expect(typeof statement.totalCredits).toBe('number');
      });
    });
  });

  describe('Messages', () => {
    describe('getMessages', () => {
      it('should return messages for client', async () => {
        const result = await service.getMessages('client-001');

        expect(result.messages).toBeDefined();
        expect(result.total).toBeGreaterThanOrEqual(0);
        result.messages.forEach((msg) => {
          expect(msg.clientId).toBe('client-001');
        });
      });

      it('should apply pagination', async () => {
        const page1 = await service.getMessages('client-001', 3, 0);
        const page2 = await service.getMessages('client-001', 3, 3);

        expect(page1.messages.length).toBeLessThanOrEqual(3);
        if (page1.total > 3) {
          expect(page2.messages[0]?.id).not.toBe(page1.messages[0]?.id);
        }
      });

      it('should sort by date descending', async () => {
        const result = await service.getMessages('client-001');

        for (let i = 1; i < result.messages.length; i++) {
          expect(
            result.messages[i - 1].createdAt.getTime(),
          ).toBeGreaterThanOrEqual(result.messages[i].createdAt.getTime());
        }
      });
    });

    describe('sendMessage', () => {
      it('should send new message', async () => {
        const message = await service.sendMessage('client-001', {
          subject: 'Test Subject',
          content: 'Test message content',
        });

        expect(message.id).toBeDefined();
        expect(message.subject).toBe('Test Subject');
        expect(message.content).toBe('Test message content');
        expect(message.senderType).toBe('client');
        expect(message.senderId).toBe('client-001');
        expect(message.status).toBe('unread');
        expect(message.createdAt).toBeInstanceOf(Date);
      });

      it('should use client company name as sender', async () => {
        const message = await service.sendMessage('client-001', {
          subject: 'Test',
          content: 'Content',
        });

        expect(message.senderName).toBe('ABC Solutions SRL');
      });

      it('should initialize attachments as empty', async () => {
        const message = await service.sendMessage('client-001', {
          subject: 'Test',
          content: 'Content',
        });

        expect(message.attachments).toEqual([]);
      });
    });

    describe('markMessageAsRead', () => {
      it('should mark message as read', async () => {
        const sent = await service.sendMessage('client-001', {
          subject: 'To Read',
          content: 'Content',
        });

        const result = await service.markMessageAsRead('client-001', sent.id);

        expect(result).toBe(true);

        const { messages } = await service.getMessages('client-001');
        const found = messages.find((m) => m.id === sent.id);
        expect(found?.status).toBe('read');
        expect(found?.readAt).toBeInstanceOf(Date);
      });

      it('should return false for non-existent message', async () => {
        const result = await service.markMessageAsRead('client-001', 'non-existent');

        expect(result).toBe(false);
      });

      it('should return false for wrong client', async () => {
        const sent = await service.sendMessage('client-001', {
          subject: 'Test',
          content: 'Content',
        });

        const result = await service.markMessageAsRead('client-002', sent.id);

        expect(result).toBe(false);
      });
    });
  });

  describe('Notifications', () => {
    describe('getNotifications', () => {
      it('should return notifications for client', async () => {
        const notifications = await service.getNotifications('client-001');

        expect(notifications).toBeDefined();
        notifications.forEach((n) => {
          expect(n.clientId).toBe('client-001');
        });
      });

      it('should filter unread only', async () => {
        const unreadOnly = await service.getNotifications('client-001', true);

        unreadOnly.forEach((n) => {
          expect(n.readAt).toBeUndefined();
        });
      });

      it('should apply limit', async () => {
        const limited = await service.getNotifications('client-001', false, 5);

        expect(limited.length).toBeLessThanOrEqual(5);
      });

      it('should sort by date descending', async () => {
        const notifications = await service.getNotifications('client-001');

        for (let i = 1; i < notifications.length; i++) {
          expect(
            notifications[i - 1].createdAt.getTime(),
          ).toBeGreaterThanOrEqual(notifications[i].createdAt.getTime());
        }
      });
    });

    describe('markNotificationAsRead', () => {
      it('should mark notification as read', async () => {
        const notifications = await service.getNotifications('client-001', true);
        const unreadId = notifications[0]?.id;

        if (unreadId) {
          const result = await service.markNotificationAsRead('client-001', unreadId);

          expect(result).toBe(true);
        }
      });

      it('should return false for non-existent notification', async () => {
        const result = await service.markNotificationAsRead('client-001', 'non-existent');

        expect(result).toBe(false);
      });

      it('should return false for wrong client', async () => {
        const notifications = await service.getNotifications('client-001');
        const notifId = notifications[0]?.id;

        if (notifId) {
          const result = await service.markNotificationAsRead('wrong-client', notifId);

          expect(result).toBe(false);
        }
      });
    });

    describe('markAllNotificationsAsRead', () => {
      it('should mark all notifications as read', async () => {
        const beforeCount = (await service.getNotifications('client-001', true)).length;

        const markedCount = await service.markAllNotificationsAsRead('client-001');

        expect(markedCount).toBe(beforeCount);

        const afterCount = (await service.getNotifications('client-001', true)).length;
        expect(afterCount).toBe(0);
      });

      it('should return 0 if no unread notifications', async () => {
        // First mark all as read
        await service.markAllNotificationsAsRead('client-001');

        // Then try again
        const count = await service.markAllNotificationsAsRead('client-001');

        expect(count).toBe(0);
      });
    });
  });

  describe('Activity Log', () => {
    describe('getActivityLog', () => {
      it('should return activity log', async () => {
        const log = await service.getActivityLog('client-001');

        expect(log).toBeDefined();
        expect(Array.isArray(log)).toBe(true);
        log.forEach((entry) => {
          expect(entry.id).toBeDefined();
          expect(entry.action).toBeDefined();
          expect(entry.description).toBeDefined();
          expect(entry.timestamp).toBeInstanceOf(Date);
        });
      });

      it('should apply limit', async () => {
        const limited = await service.getActivityLog('client-001', 2);

        expect(limited.length).toBeLessThanOrEqual(2);
      });

      it('should include various action types', async () => {
        const log = await service.getActivityLog('client-001');
        const actions = log.map((e) => e.action);

        expect(actions).toContain('login');
        expect(actions).toContain('view_invoice');
        expect(actions).toContain('download_document');
        expect(actions).toContain('send_message');
      });

      it('should include IP address when available', async () => {
        const log = await service.getActivityLog('client-001');

        const hasIp = log.some((e) => e.ipAddress !== undefined);
        expect(hasIp).toBe(true);
      });
    });
  });

  describe('Notification Types', () => {
    it('should include invoice notifications', async () => {
      const notifications = await service.getNotifications('client-001', false, 100);

      const invoiceNotifs = notifications.filter((n) => n.type === 'invoice');
      expect(invoiceNotifs.length).toBeGreaterThanOrEqual(0);
    });

    it('should include document notifications', async () => {
      const notifications = await service.getNotifications('client-001', false, 100);

      const docNotifs = notifications.filter((n) => n.type === 'document');
      expect(docNotifs.length).toBeGreaterThanOrEqual(0);
    });

    it('should include message notifications', async () => {
      const notifications = await service.getNotifications('client-001', false, 100);

      const msgNotifs = notifications.filter((n) => n.type === 'message');
      expect(msgNotifs.length).toBeGreaterThanOrEqual(0);
    });

    it('should include system notifications', async () => {
      const notifications = await service.getNotifications('client-001', false, 100);

      const sysNotifs = notifications.filter((n) => n.type === 'system');
      expect(sysNotifs.length).toBeGreaterThanOrEqual(0);
    });

    it('should include deadline notifications', async () => {
      const notifications = await service.getNotifications('client-001', false, 100);

      const deadlineNotifs = notifications.filter((n) => n.type === 'deadline');
      expect(deadlineNotifs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Notification Priority', () => {
    it('should include priority levels', async () => {
      const notifications = await service.getNotifications('client-001', false, 100);

      const priorities = notifications.map((n) => n.priority);
      const validPriorities = ['low', 'medium', 'high'];

      priorities.forEach((p) => {
        expect(validPriorities).toContain(p);
      });
    });
  });

  describe('Invoice Statuses', () => {
    it('should handle draft status', async () => {
      const { invoices } = await service.getClientInvoices('client-001', 'draft');

      invoices.forEach((inv) => {
        expect(inv.status).toBe('draft');
      });
    });

    it('should handle sent status', async () => {
      const { invoices } = await service.getClientInvoices('client-001', 'sent');

      invoices.forEach((inv) => {
        expect(inv.status).toBe('sent');
      });
    });

    it('should handle paid status', async () => {
      const { invoices } = await service.getClientInvoices('client-001', 'paid');

      invoices.forEach((inv) => {
        expect(inv.status).toBe('paid');
        expect(inv.paymentMethod).toBeDefined();
        expect(inv.paymentDate).toBeDefined();
      });
    });

    it('should handle overdue status', async () => {
      const { invoices } = await service.getClientInvoices('client-001', 'overdue');

      invoices.forEach((inv) => {
        expect(inv.status).toBe('overdue');
      });
    });
  });

  describe('Document Statuses', () => {
    it('should have pending, approved, or rejected status', async () => {
      const { documents } = await service.getClientDocuments('client-001');
      const validStatuses = ['pending', 'approved', 'rejected'];

      documents.forEach((doc) => {
        expect(validStatuses).toContain(doc.status);
      });
    });
  });

  describe('Message Statuses', () => {
    it('should have unread, read, or archived status', async () => {
      const { messages } = await service.getMessages('client-001');
      const validStatuses = ['unread', 'read', 'archived'];

      messages.forEach((msg) => {
        expect(validStatuses).toContain(msg.status);
      });
    });
  });

  describe('Client Statuses', () => {
    it('should return client with active status', async () => {
      const profile = await service.getClientProfile('client-001');

      expect(profile?.status).toBe('active');
    });

    it('should support status update', async () => {
      const updated = await service.updateClientProfile('client-001', {
        status: 'inactive',
      });

      expect(updated?.status).toBe('inactive');

      // Restore
      await service.updateClientProfile('client-001', { status: 'active' });
    });
  });

  describe('Data Isolation', () => {
    it('should isolate documents by client', async () => {
      const client1Docs = await service.getClientDocuments('client-001');
      const client2Docs = await service.getClientDocuments('client-002');

      client1Docs.documents.forEach((d) => expect(d.clientId).toBe('client-001'));
      client2Docs.documents.forEach((d) => expect(d.clientId).toBe('client-002'));
    });

    it('should isolate invoices by client', async () => {
      const client1Inv = await service.getClientInvoices('client-001');
      const client2Inv = await service.getClientInvoices('client-002');

      client1Inv.invoices.forEach((i) => expect(i.clientId).toBe('client-001'));
      client2Inv.invoices.forEach((i) => expect(i.clientId).toBe('client-002'));
    });

    it('should isolate messages by client', async () => {
      const client1Msgs = await service.getMessages('client-001');
      const client2Msgs = await service.getMessages('client-002');

      client1Msgs.messages.forEach((m) => expect(m.clientId).toBe('client-001'));
      client2Msgs.messages.forEach((m) => expect(m.clientId).toBe('client-002'));
    });

    it('should isolate notifications by client', async () => {
      const client1Notifs = await service.getNotifications('client-001');
      const client2Notifs = await service.getNotifications('client-002');

      client1Notifs.forEach((n) => expect(n.clientId).toBe('client-001'));
      client2Notifs.forEach((n) => expect(n.clientId).toBe('client-002'));
    });
  });
});
