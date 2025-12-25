import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  CustomerPortalService,
  TicketCategory,
  TicketPriority,
  SubscriptionTier,
  ArticleCategory,
  NotificationChannel,
} from './customer-portal.service';

describe('CustomerPortalService', () => {
  let service: CustomerPortalService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerPortalService, EventEmitter2],
    }).compile();

    service = module.get<CustomerPortalService>(CustomerPortalService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Customer Profile Management', () => {
    it('should create a profile', () => {
      const profile = service.createProfile({
        userId: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(profile.id).toContain('profile-');
      expect(profile.userId).toBe('user-1');
      expect(profile.email).toBe('test@example.com');
      expect(profile.name).toBe('Test User');
      expect(profile.subscription).toBeDefined();
    });

    it('should create profile with all optional fields', () => {
      const profile = service.createProfile({
        userId: 'user-2',
        email: 'company@example.com',
        name: 'John Doe',
        nameRo: 'Ioan Doe',
        company: 'ACME Inc',
        companyRo: 'ACME SRL',
        cui: 'RO12345678',
        tenantId: 'tenant-1',
        country: 'RO',
        language: 'RO',
      });

      expect(profile.nameRo).toBe('Ioan Doe');
      expect(profile.company).toBe('ACME Inc');
      expect(profile.cui).toBe('RO12345678');
      expect(profile.tenantId).toBe('tenant-1');
      expect(profile.language).toBe('RO');
    });

    it('should default to RO language and country', () => {
      const profile = service.createProfile({
        userId: 'user-default',
        email: 'default@example.com',
        name: 'Default User',
      });

      expect(profile.country).toBe('RO');
      expect(profile.language).toBe('RO');
    });

    it('should get profile by userId', () => {
      service.createProfile({
        userId: 'get-user',
        email: 'get@example.com',
        name: 'Get User',
      });

      const profile = service.getProfile('get-user');
      expect(profile.email).toBe('get@example.com');
    });

    it('should throw NotFoundException for invalid user', () => {
      expect(() => service.getProfile('invalid-user')).toThrow(NotFoundException);
    });

    it('should update profile', () => {
      service.createProfile({
        userId: 'update-user',
        email: 'old@example.com',
        name: 'Old Name',
      });

      const updated = service.updateProfile('update-user', {
        name: 'New Name',
        phone: '+40123456789',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.phone).toBe('+40123456789');
    });

    it('should record login', () => {
      service.createProfile({
        userId: 'login-user',
        email: 'login@example.com',
        name: 'Login User',
      });

      service.recordLogin('login-user');
      const profile = service.getProfile('login-user');

      expect(profile.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      service.createProfile({
        userId: 'sub-user',
        email: 'sub@example.com',
        name: 'Sub User',
      });
    });

    it('should create FREE subscription by default', () => {
      const subscription = service.getSubscription('sub-user');

      expect(subscription.tier).toBe('FREE');
      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.price).toBe(0);
    });

    it('should have correct limits for FREE tier', () => {
      const subscription = service.getSubscription('sub-user');

      expect(subscription.limits.invoicesPerMonth).toBe(10);
      expect(subscription.limits.usersCount).toBe(1);
      expect(subscription.limits.storageGb).toBe(1);
    });

    it('should upgrade subscription', () => {
      const upgraded = service.upgradeSubscription('sub-user', 'PRO');

      expect(upgraded.tier).toBe('PRO');
      expect(upgraded.status).toBe('TRIAL');
      expect(upgraded.price).toBe(149);
    });

    it('should throw when upgrading to same or lower tier', () => {
      service.upgradeSubscription('sub-user', 'BASIC');

      expect(() => service.upgradeSubscription('sub-user', 'FREE')).toThrow(BadRequestException);
    });

    it('should downgrade subscription', () => {
      service.upgradeSubscription('sub-user', 'PRO');
      const downgraded = service.downgradeSubscription('sub-user', 'BASIC');

      expect(downgraded.tier).toBe('BASIC');
      expect(downgraded.status).toBe('ACTIVE');
    });

    it('should throw when downgrading to same or higher tier', () => {
      expect(() => service.downgradeSubscription('sub-user', 'PRO')).toThrow(BadRequestException);
    });

    it('should cancel subscription', () => {
      service.upgradeSubscription('sub-user', 'PRO');
      const cancelled = service.cancelSubscription('sub-user', 'Too expensive');

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.autoRenew).toBe(false);
    });

    it('should have features for each tier', () => {
      const subscription = service.getSubscription('sub-user');
      expect(subscription.features.length).toBeGreaterThan(0);
    });
  });

  describe('Support Tickets', () => {
    beforeEach(() => {
      service.createProfile({
        userId: 'ticket-user',
        email: 'ticket@example.com',
        name: 'Ticket User',
      });
    });

    it('should create a ticket', () => {
      const ticket = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Cannot upload invoice',
        description: 'I get an error when uploading...',
        category: 'TECHNICAL',
      });

      expect(ticket.id).toContain('ticket-');
      expect(ticket.ticketNumber).toContain('TKT-');
      expect(ticket.status).toBe('OPEN');
      expect(ticket.priority).toBe('MEDIUM');
    });

    it('should create ticket with all fields', () => {
      const ticket = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Billing Question',
        subjectRo: 'Întrebare Facturare',
        description: 'About my invoice...',
        descriptionRo: 'Despre factura mea...',
        category: 'BILLING',
        priority: 'HIGH',
      });

      expect(ticket.subjectRo).toBe('Întrebare Facturare');
      expect(ticket.priority).toBe('HIGH');
      expect(ticket.category).toBe('BILLING');
    });

    it('should get ticket by id', () => {
      const created = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Test',
        description: 'Test desc',
        category: 'OTHER',
      });

      const ticket = service.getTicket(created.id, 'ticket-user');
      expect(ticket.id).toBe(created.id);
    });

    it('should throw NotFoundException for invalid ticket', () => {
      expect(() => service.getTicket('invalid-ticket', 'ticket-user')).toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing another users ticket', () => {
      const ticket = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Private',
        description: 'Private issue',
        category: 'ACCOUNT',
      });

      service.createProfile({
        userId: 'other-user',
        email: 'other@example.com',
        name: 'Other User',
      });

      expect(() => service.getTicket(ticket.id, 'other-user')).toThrow(ForbiddenException);
    });

    it('should get ticket by number', () => {
      const created = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Number Test',
        description: 'Test',
        category: 'OTHER',
      });

      const ticket = service.getTicketByNumber(created.ticketNumber, 'ticket-user');
      expect(ticket.ticketNumber).toBe(created.ticketNumber);
    });

    it('should get customer tickets', () => {
      service.createTicket({
        customerId: 'ticket-user',
        subject: 'Ticket 1',
        description: 'Desc 1',
        category: 'TECHNICAL',
      });
      service.createTicket({
        customerId: 'ticket-user',
        subject: 'Ticket 2',
        description: 'Desc 2',
        category: 'BILLING',
      });

      const tickets = service.getCustomerTickets('ticket-user');
      expect(tickets.length).toBe(2);
    });

    it('should filter tickets by status', () => {
      service.createTicket({
        customerId: 'ticket-user',
        subject: 'Open Ticket',
        description: 'Desc',
        category: 'OTHER',
      });

      const tickets = service.getCustomerTickets('ticket-user', { status: 'OPEN' });
      expect(tickets.every(t => t.status === 'OPEN')).toBe(true);
    });

    it('should filter tickets by category', () => {
      service.createTicket({
        customerId: 'ticket-user',
        subject: 'Tech Issue',
        description: 'Desc',
        category: 'TECHNICAL',
      });

      const tickets = service.getCustomerTickets('ticket-user', { category: 'TECHNICAL' });
      expect(tickets.every(t => t.category === 'TECHNICAL')).toBe(true);
    });

    it('should add message to ticket', () => {
      const ticket = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Message Test',
        description: 'Desc',
        category: 'OTHER',
      });

      const message = service.addTicketMessage(ticket.id, 'ticket-user', {
        content: 'Additional info...',
      });

      expect(message.id).toContain('msg-');
      expect(message.senderType).toBe('CUSTOMER');
      expect(message.content).toBe('Additional info...');
    });

    it('should rate ticket resolution', () => {
      const ticket = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Rate Test',
        description: 'Desc',
        category: 'OTHER',
      });

      // Manually resolve the ticket for testing
      const ticketData = service.getTicket(ticket.id, 'ticket-user');
      ticketData.status = 'RESOLVED';

      const rated = service.rateTicketResolution(ticket.id, 'ticket-user', 5);
      expect(rated.satisfactionRating).toBe(5);
    });

    it('should throw for invalid rating', () => {
      const ticket = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Rate Invalid',
        description: 'Desc',
        category: 'OTHER',
      });

      const ticketData = service.getTicket(ticket.id, 'ticket-user');
      ticketData.status = 'RESOLVED';

      expect(() => service.rateTicketResolution(ticket.id, 'ticket-user', 6)).toThrow(BadRequestException);
    });

    it('should throw when rating unresolved ticket', () => {
      const ticket = service.createTicket({
        customerId: 'ticket-user',
        subject: 'Unresolved',
        description: 'Desc',
        category: 'OTHER',
      });

      expect(() => service.rateTicketResolution(ticket.id, 'ticket-user', 5)).toThrow(BadRequestException);
    });
  });

  describe('Invoices', () => {
    beforeEach(() => {
      service.createProfile({
        userId: 'invoice-user',
        email: 'invoice@example.com',
        name: 'Invoice User',
      });
    });

    it('should get empty customer invoices', () => {
      const invoices = service.getCustomerInvoices('invoice-user');
      expect(invoices).toEqual([]);
    });

    it('should generate invoice for paid subscription', () => {
      service.upgradeSubscription('invoice-user', 'PRO');
      const invoice = service.generateInvoice('invoice-user');

      expect(invoice.id).toContain('inv-');
      expect(invoice.invoiceNumber).toContain('INV-');
      expect(invoice.amount).toBe(149);
      expect(invoice.status).toBe('SENT');
    });

    it('should calculate tax for RO customers', () => {
      service.upgradeSubscription('invoice-user', 'PRO');
      const invoice = service.generateInvoice('invoice-user');

      expect(invoice.tax).toBeCloseTo(149 * 0.19, 2);
      expect(invoice.total).toBeCloseTo(149 * 1.19, 2);
    });

    it('should throw when generating invoice for free subscription', () => {
      expect(() => service.generateInvoice('invoice-user')).toThrow(BadRequestException);
    });

    it('should get invoice by id', () => {
      service.upgradeSubscription('invoice-user', 'BASIC');
      const generated = service.generateInvoice('invoice-user');
      const invoice = service.getInvoice(generated.id, 'invoice-user');

      expect(invoice.id).toBe(generated.id);
    });

    it('should throw when accessing another users invoice', () => {
      service.upgradeSubscription('invoice-user', 'BASIC');
      const invoice = service.generateInvoice('invoice-user');

      service.createProfile({
        userId: 'other-invoice-user',
        email: 'other@example.com',
        name: 'Other',
      });

      expect(() => service.getInvoice(invoice.id, 'other-invoice-user')).toThrow(ForbiddenException);
    });

    it('should have invoice items', () => {
      service.upgradeSubscription('invoice-user', 'PRO');
      const invoice = service.generateInvoice('invoice-user');

      expect(invoice.items.length).toBeGreaterThan(0);
      expect(invoice.items[0].description).toContain('PRO');
    });
  });

  describe('Knowledge Base', () => {
    it('should have pre-populated articles', () => {
      const popular = service.getPopularArticles();
      expect(popular.length).toBeGreaterThan(0);
    });

    it('should search articles', () => {
      const results = service.searchArticles('efactura');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search articles case-insensitively', () => {
      const results = service.searchArticles('EFACTURA');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter search by category', () => {
      const results = service.searchArticles('guide', 'COMPLIANCE');
      expect(results.every(a => a.category === 'COMPLIANCE')).toBe(true);
    });

    it('should get article by id', () => {
      const popular = service.getPopularArticles();
      const article = service.getArticle(popular[0].id);

      expect(article.id).toBe(popular[0].id);
    });

    it('should throw for invalid article id', () => {
      expect(() => service.getArticle('invalid-article')).toThrow(NotFoundException);
    });

    it('should get article by slug', () => {
      const article = service.getArticleBySlug('getting-started');
      expect(article.slug).toBe('getting-started');
    });

    it('should throw for invalid slug', () => {
      expect(() => service.getArticleBySlug('invalid-slug')).toThrow(NotFoundException);
    });

    it('should increment article view count', () => {
      const popular = service.getPopularArticles();
      const initialCount = popular[0].viewCount;

      service.incrementArticleView(popular[0].id);

      const article = service.getArticle(popular[0].id);
      expect(article.viewCount).toBe(initialCount + 1);
    });

    it('should rate article as helpful', () => {
      const popular = service.getPopularArticles();
      const initialHelpful = popular[0].helpfulCount;

      service.rateArticle(popular[0].id, true);

      const article = service.getArticle(popular[0].id);
      expect(article.helpfulCount).toBe(initialHelpful + 1);
    });

    it('should rate article as not helpful', () => {
      const popular = service.getPopularArticles();
      const initialNotHelpful = popular[0].notHelpfulCount;

      service.rateArticle(popular[0].id, false);

      const article = service.getArticle(popular[0].id);
      expect(article.notHelpfulCount).toBe(initialNotHelpful + 1);
    });

    it('should get articles by category', () => {
      const articles = service.getArticlesByCategory('FAQ');
      expect(articles.every(a => a.category === 'FAQ')).toBe(true);
    });

    it('should get popular articles with limit', () => {
      const articles = service.getPopularArticles(3);
      expect(articles.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Notification Preferences', () => {
    beforeEach(() => {
      service.createProfile({
        userId: 'pref-user',
        email: 'pref@example.com',
        name: 'Pref User',
      });
    });

    it('should have default notification preferences', () => {
      const prefs = service.getNotificationPreferences('pref-user');

      expect(prefs.customerId).toBe('pref-user');
      expect(prefs.channels).toContain('EMAIL');
      expect(prefs.frequency).toBe('IMMEDIATE');
    });

    it('should update notification preferences', () => {
      const updated = service.updateNotificationPreferences('pref-user', {
        frequency: 'DAILY_DIGEST',
        channels: ['EMAIL', 'PUSH'],
      });

      expect(updated.frequency).toBe('DAILY_DIGEST');
      expect(updated.channels).toContain('PUSH');
    });

    it('should have security notifications enabled by default', () => {
      const prefs = service.getNotificationPreferences('pref-user');
      expect(prefs.preferences.security).toContain('EMAIL');
    });

    it('should initialize preferences for new user', () => {
      service.createProfile({
        userId: 'new-pref-user',
        email: 'newpref@example.com',
        name: 'New Pref',
      });

      const prefs = service.getNotificationPreferences('new-pref-user');
      expect(prefs.customerId).toBe('new-pref-user');
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      service.createProfile({
        userId: 'notif-user',
        email: 'notif@example.com',
        name: 'Notif User',
      });
    });

    it('should send notification', () => {
      const notif = service.sendNotification({
        customerId: 'notif-user',
        type: 'billing.payment',
        title: 'Payment Received',
        titleRo: 'Plată Primită',
        message: 'Your payment has been processed',
        messageRo: 'Plata dvs. a fost procesată',
      });

      expect(notif.id).toContain('notif-');
      expect(notif.isRead).toBe(false);
      expect(notif.channel).toBe('IN_APP');
    });

    it('should send notification with action URL', () => {
      const notif = service.sendNotification({
        customerId: 'notif-user',
        type: 'support.response',
        title: 'New Response',
        titleRo: 'Răspuns Nou',
        message: 'Support replied',
        messageRo: 'Suportul a răspuns',
        actionUrl: '/tickets/123',
      });

      expect(notif.actionUrl).toBe('/tickets/123');
    });

    it('should get notifications', () => {
      service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Test 1',
        titleRo: 'Test 1',
        message: 'Msg 1',
        messageRo: 'Msg 1',
      });
      service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Test 2',
        titleRo: 'Test 2',
        message: 'Msg 2',
        messageRo: 'Msg 2',
      });

      const notifications = service.getNotifications('notif-user');
      expect(notifications.length).toBe(2);
    });

    it('should get only unread notifications', () => {
      const notif = service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Test',
        titleRo: 'Test',
        message: 'Msg',
        messageRo: 'Msg',
      });

      service.markNotificationRead(notif.id, 'notif-user');

      const unread = service.getNotifications('notif-user', true);
      expect(unread.find(n => n.id === notif.id)).toBeUndefined();
    });

    it('should mark notification as read', () => {
      const notif = service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Test',
        titleRo: 'Test',
        message: 'Msg',
        messageRo: 'Msg',
      });

      const read = service.markNotificationRead(notif.id, 'notif-user');

      expect(read.isRead).toBe(true);
      expect(read.readAt).toBeInstanceOf(Date);
    });

    it('should throw for invalid notification', () => {
      expect(() => service.markNotificationRead('invalid', 'notif-user')).toThrow(NotFoundException);
    });

    it('should mark all notifications as read', () => {
      service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Test 1',
        titleRo: 'Test 1',
        message: 'Msg 1',
        messageRo: 'Msg 1',
      });
      service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Test 2',
        titleRo: 'Test 2',
        message: 'Msg 2',
        messageRo: 'Msg 2',
      });

      const count = service.markAllNotificationsRead('notif-user');
      expect(count).toBe(2);

      const unread = service.getNotifications('notif-user', true);
      expect(unread.length).toBe(0);
    });

    it('should get unread count', () => {
      service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Test',
        titleRo: 'Test',
        message: 'Msg',
        messageRo: 'Msg',
      });

      const count = service.getUnreadCount('notif-user');
      expect(count).toBe(1);
    });

    it('should filter out expired notifications', () => {
      service.sendNotification({
        customerId: 'notif-user',
        type: 'test',
        title: 'Expired',
        titleRo: 'Expirat',
        message: 'Msg',
        messageRo: 'Msg',
        expiresAt: new Date(Date.now() - 1000),
      });

      const notifications = service.getNotifications('notif-user');
      expect(notifications.length).toBe(0);
    });
  });

  describe('Usage Metrics', () => {
    beforeEach(() => {
      service.createProfile({
        userId: 'usage-user',
        email: 'usage@example.com',
        name: 'Usage User',
      });
    });

    it('should have initialized usage metrics', () => {
      const usage = service.getUsageMetrics('usage-user');

      expect(usage.customerId).toBe('usage-user');
      expect(usage.invoicesCreated).toBe(0);
      expect(usage.apiCallsMade).toBe(0);
    });

    it('should increment invoice usage', () => {
      service.incrementUsage('usage-user', 'invoices', 1);
      const usage = service.getUsageMetrics('usage-user');

      expect(usage.invoicesCreated).toBe(1);
    });

    it('should increment API usage', () => {
      service.incrementUsage('usage-user', 'api', 10);
      const usage = service.getUsageMetrics('usage-user');

      expect(usage.apiCallsMade).toBe(10);
    });

    it('should increment storage usage', () => {
      service.incrementUsage('usage-user', 'storage', 0.5);
      const usage = service.getUsageMetrics('usage-user');

      expect(usage.storageUsedGb).toBe(0.5);
    });

    it('should throw for invalid user', () => {
      expect(() => service.getUsageMetrics('invalid-user')).toThrow(NotFoundException);
    });

    it('should get usage percentages', () => {
      service.incrementUsage('usage-user', 'invoices', 5);
      const percentages = service.getUsagePercentages('usage-user');

      expect(percentages.invoices).toBe(50); // 5 out of 10 for FREE tier
    });

    it('should have correct limits after upgrade', () => {
      service.upgradeSubscription('usage-user', 'PRO');
      const usage = service.getUsageMetrics('usage-user');

      expect(usage.invoicesLimit).toBe(1000);
      expect(usage.apiCallsLimit).toBe(10000);
    });
  });

  describe('Portal Statistics', () => {
    it('should get portal stats', () => {
      service.createProfile({
        userId: 'stats-user-1',
        email: 'stats1@example.com',
        name: 'Stats 1',
      });
      service.createProfile({
        userId: 'stats-user-2',
        email: 'stats2@example.com',
        name: 'Stats 2',
      });

      const stats = service.getPortalStats();

      expect(stats.totalProfiles).toBeGreaterThanOrEqual(2);
      expect(stats.totalArticles).toBeGreaterThan(0);
      expect(stats.subscriptionBreakdown).toHaveProperty('FREE');
    });

    it('should count open tickets', () => {
      service.createProfile({
        userId: 'open-ticket-user',
        email: 'open@example.com',
        name: 'Open User',
      });

      service.createTicket({
        customerId: 'open-ticket-user',
        subject: 'Open Ticket',
        description: 'Desc',
        category: 'OTHER',
      });

      const stats = service.getPortalStats();
      expect(stats.openTickets).toBeGreaterThanOrEqual(1);
    });

    it('should track subscription breakdown', () => {
      service.createProfile({
        userId: 'breakdown-user',
        email: 'breakdown@example.com',
        name: 'Breakdown',
      });
      service.upgradeSubscription('breakdown-user', 'PRO');

      const stats = service.getPortalStats();
      expect(stats.subscriptionBreakdown.PRO).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Ticket Categories', () => {
    const categories: TicketCategory[] = ['BILLING', 'TECHNICAL', 'ACCOUNT', 'FEATURE_REQUEST', 'COMPLIANCE', 'OTHER'];

    beforeEach(() => {
      service.createProfile({
        userId: 'cat-user',
        email: 'cat@example.com',
        name: 'Cat User',
      });
    });

    categories.forEach((category) => {
      it(`should create ${category} ticket`, () => {
        const ticket = service.createTicket({
          customerId: 'cat-user',
          subject: `${category} Issue`,
          description: 'Desc',
          category,
        });

        expect(ticket.category).toBe(category);
      });
    });
  });

  describe('Ticket Priorities', () => {
    const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    beforeEach(() => {
      service.createProfile({
        userId: 'prio-user',
        email: 'prio@example.com',
        name: 'Prio User',
      });
    });

    priorities.forEach((priority) => {
      it(`should create ${priority} priority ticket`, () => {
        const ticket = service.createTicket({
          customerId: 'prio-user',
          subject: `${priority} Issue`,
          description: 'Desc',
          category: 'OTHER',
          priority,
        });

        expect(ticket.priority).toBe(priority);
      });
    });
  });

  describe('Subscription Tiers', () => {
    const tiers: SubscriptionTier[] = ['BASIC', 'PRO', 'ENTERPRISE'];

    beforeEach(() => {
      service.createProfile({
        userId: 'tier-user',
        email: 'tier@example.com',
        name: 'Tier User',
      });
    });

    tiers.forEach((tier) => {
      it(`should upgrade to ${tier}`, () => {
        const subscription = service.upgradeSubscription('tier-user', tier);
        expect(subscription.tier).toBe(tier);
      });
    });
  });

  describe('Article Categories', () => {
    const categories: ArticleCategory[] = [
      'GETTING_STARTED',
      'BILLING',
      'FEATURES',
      'INTEGRATIONS',
      'TROUBLESHOOTING',
      'COMPLIANCE',
      'FAQ',
    ];

    it('should have articles in various categories', () => {
      const allArticles = service.getPopularArticles(100);
      const foundCategories = new Set(allArticles.map(a => a.category));

      expect(foundCategories.size).toBeGreaterThan(0);
    });
  });

  describe('Event Emission', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(eventEmitter, 'emit');
    });

    afterEach(() => {
      emitSpy.mockRestore();
    });

    it('should emit profile created event', () => {
      service.createProfile({
        userId: 'event-user',
        email: 'event@example.com',
        name: 'Event User',
      });

      expect(emitSpy).toHaveBeenCalledWith('portal.profile.created', expect.any(Object));
    });

    it('should emit subscription upgraded event', () => {
      service.createProfile({
        userId: 'upgrade-event',
        email: 'upgrade@example.com',
        name: 'Upgrade',
      });
      service.upgradeSubscription('upgrade-event', 'PRO');

      expect(emitSpy).toHaveBeenCalledWith('portal.subscription.upgraded', expect.any(Object));
    });

    it('should emit ticket created event', () => {
      service.createProfile({
        userId: 'ticket-event',
        email: 'ticketev@example.com',
        name: 'Ticket Event',
      });
      service.createTicket({
        customerId: 'ticket-event',
        subject: 'Test',
        description: 'Test',
        category: 'OTHER',
      });

      expect(emitSpy).toHaveBeenCalledWith('portal.ticket.created', expect.any(Object));
    });

    it('should emit notification sent event', () => {
      service.createProfile({
        userId: 'notif-event',
        email: 'notifev@example.com',
        name: 'Notif Event',
      });
      service.sendNotification({
        customerId: 'notif-event',
        type: 'test',
        title: 'Test',
        titleRo: 'Test',
        message: 'Msg',
        messageRo: 'Msg',
      });

      expect(emitSpy).toHaveBeenCalledWith('portal.notification.sent', expect.any(Object));
    });
  });
});
