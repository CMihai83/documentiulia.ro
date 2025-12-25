import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'BILLING' | 'TECHNICAL' | 'ACCOUNT' | 'FEATURE_REQUEST' | 'COMPLIANCE' | 'OTHER';
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
export type ArticleCategory = 'GETTING_STARTED' | 'BILLING' | 'FEATURES' | 'INTEGRATIONS' | 'TROUBLESHOOTING' | 'COMPLIANCE' | 'FAQ';

export interface CustomerProfile {
  id: string;
  userId: string;
  tenantId?: string;
  email: string;
  name: string;
  nameRo?: string;
  company?: string;
  companyRo?: string;
  cui?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  language: 'RO' | 'EN';
  timezone: string;
  avatarUrl?: string;
  subscription: CustomerSubscription;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  metadata: Record<string, any>;
}

export interface CustomerSubscription {
  id: string;
  customerId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  billingCycle: 'MONTHLY' | 'YEARLY';
  price: number;
  currency: 'RON' | 'EUR' | 'USD';
  features: string[];
  limits: SubscriptionLimits;
  autoRenew: boolean;
  paymentMethod?: string;
  nextBillingDate?: Date;
}

export interface SubscriptionLimits {
  invoicesPerMonth: number;
  usersCount: number;
  storageGb: number;
  apiCalls: number;
  integrations: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  subjectRo?: string;
  description: string;
  descriptionRo?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  satisfactionRating?: number;
  responseTimeMs?: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'CUSTOMER' | 'SUPPORT' | 'SYSTEM';
  content: string;
  attachments: TicketAttachment[];
  isInternal: boolean;
  createdAt: Date;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  subscriptionId: string;
  amount: number;
  tax: number;
  total: number;
  currency: 'RON' | 'EUR' | 'USD';
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issuedAt: Date;
  dueDate: Date;
  paidAt?: Date;
  items: InvoiceItem[];
  downloadUrl?: string;
}

export interface InvoiceItem {
  description: string;
  descriptionRo?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  titleRo: string;
  slug: string;
  category: ArticleCategory;
  content: string;
  contentRo: string;
  summary: string;
  summaryRo: string;
  tags: string[];
  author: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  relatedArticles: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  isPublished: boolean;
}

export interface NotificationPreferences {
  customerId: string;
  channels: NotificationChannel[];
  preferences: {
    billing: NotificationChannel[];
    support: NotificationChannel[];
    product: NotificationChannel[];
    security: NotificationChannel[];
    marketing: NotificationChannel[];
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  frequency: 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST';
  unsubscribedTopics: string[];
}

export interface CustomerNotification {
  id: string;
  customerId: string;
  type: string;
  title: string;
  titleRo: string;
  message: string;
  messageRo: string;
  channel: NotificationChannel;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UsageMetrics {
  customerId: string;
  period: string;
  invoicesCreated: number;
  invoicesLimit: number;
  usersActive: number;
  usersLimit: number;
  storageUsedGb: number;
  storageLimit: number;
  apiCallsMade: number;
  apiCallsLimit: number;
  lastUpdated: Date;
}

@Injectable()
export class CustomerPortalService {
  private profiles: Map<string, CustomerProfile> = new Map();
  private subscriptions: Map<string, CustomerSubscription> = new Map();
  private tickets: Map<string, SupportTicket> = new Map();
  private invoices: Map<string, CustomerInvoice> = new Map();
  private articles: Map<string, KnowledgeArticle> = new Map();
  private notifications: Map<string, CustomerNotification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private usage: Map<string, UsageMetrics> = new Map();
  private ticketCounter = 1000;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): void {
    const defaultArticles = [
      {
        title: 'Getting Started with DocumentIulia',
        titleRo: 'Ghid de Început cu DocumentIulia',
        slug: 'getting-started',
        category: 'GETTING_STARTED' as ArticleCategory,
        content: 'Welcome to DocumentIulia! This guide will help you get started with our platform...',
        contentRo: 'Bine ați venit la DocumentIulia! Acest ghid vă va ajuta să începeți cu platforma noastră...',
        summary: 'Learn the basics of using DocumentIulia for your accounting needs.',
        summaryRo: 'Învățați elementele de bază ale utilizării DocumentIulia pentru nevoile dvs. de contabilitate.',
        tags: ['basics', 'tutorial', 'onboarding'],
      },
      {
        title: 'Understanding e-Factura Integration',
        titleRo: 'Înțelegerea Integrării e-Factura',
        slug: 'efactura-integration',
        category: 'INTEGRATIONS' as ArticleCategory,
        content: 'Learn how to configure and use e-Factura integration with ANAF...',
        contentRo: 'Aflați cum să configurați și să utilizați integrarea e-Factura cu ANAF...',
        summary: 'Complete guide to e-Factura integration with ANAF.',
        summaryRo: 'Ghid complet pentru integrarea e-Factura cu ANAF.',
        tags: ['efactura', 'anaf', 'integration', 'compliance'],
      },
      {
        title: 'Billing and Subscription FAQ',
        titleRo: 'Întrebări Frecvente despre Facturare și Abonament',
        slug: 'billing-faq',
        category: 'FAQ' as ArticleCategory,
        content: 'Find answers to common billing and subscription questions...',
        contentRo: 'Găsiți răspunsuri la întrebările frecvente despre facturare și abonament...',
        summary: 'Common questions about billing, payments, and subscriptions.',
        summaryRo: 'Întrebări frecvente despre facturare, plăți și abonamente.',
        tags: ['billing', 'payments', 'subscription', 'faq'],
      },
      {
        title: 'SAF-T D406 Reporting Guide',
        titleRo: 'Ghid Raportare SAF-T D406',
        slug: 'saft-d406-guide',
        category: 'COMPLIANCE' as ArticleCategory,
        content: 'Step-by-step guide to SAF-T D406 reporting requirements...',
        contentRo: 'Ghid pas cu pas pentru cerințele de raportare SAF-T D406...',
        summary: 'Everything you need to know about SAF-T D406 compliance.',
        summaryRo: 'Tot ce trebuie să știți despre conformitatea SAF-T D406.',
        tags: ['saft', 'd406', 'anaf', 'compliance', 'reporting'],
      },
      {
        title: 'Troubleshooting Connection Issues',
        titleRo: 'Depanarea Problemelor de Conexiune',
        slug: 'connection-troubleshooting',
        category: 'TROUBLESHOOTING' as ArticleCategory,
        content: 'Common solutions for connection and sync issues...',
        contentRo: 'Soluții comune pentru problemele de conexiune și sincronizare...',
        summary: 'Fix common connection and synchronization problems.',
        summaryRo: 'Rezolvați problemele comune de conexiune și sincronizare.',
        tags: ['troubleshooting', 'connection', 'sync', 'errors'],
      },
    ];

    defaultArticles.forEach((article) => {
      const fullArticle: KnowledgeArticle = {
        id: `article-${randomUUID()}`,
        ...article,
        author: 'DocumentIulia Team',
        viewCount: Math.floor(Math.random() * 500) + 100,
        helpfulCount: Math.floor(Math.random() * 100) + 20,
        notHelpfulCount: Math.floor(Math.random() * 10),
        relatedArticles: [],
        createdAt: new Date(Date.now() - 86400000 * 30),
        updatedAt: new Date(),
        publishedAt: new Date(Date.now() - 86400000 * 25),
        isPublished: true,
      };
      this.articles.set(fullArticle.id, fullArticle);
    });
  }

  // Customer Profile Management
  createProfile(data: {
    userId: string;
    email: string;
    name: string;
    nameRo?: string;
    company?: string;
    companyRo?: string;
    cui?: string;
    tenantId?: string;
    country?: string;
    language?: 'RO' | 'EN';
  }): CustomerProfile {
    const subscription = this.createSubscription({
      customerId: data.userId,
      tier: 'FREE',
    });

    const profile: CustomerProfile = {
      id: `profile-${randomUUID()}`,
      userId: data.userId,
      tenantId: data.tenantId,
      email: data.email,
      name: data.name,
      nameRo: data.nameRo,
      company: data.company,
      companyRo: data.companyRo,
      cui: data.cui,
      country: data.country || 'RO',
      language: data.language || 'RO',
      timezone: 'Europe/Bucharest',
      subscription,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.profiles.set(profile.userId, profile);
    this.initializeNotificationPreferences(profile.userId);

    this.eventEmitter.emit('portal.profile.created', {
      profileId: profile.id,
      userId: data.userId,
    });

    return profile;
  }

  getProfile(userId: string): CustomerProfile {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }
    return profile;
  }

  updateProfile(userId: string, updates: Partial<CustomerProfile>): CustomerProfile {
    const profile = this.getProfile(userId);

    const updatedProfile = {
      ...profile,
      ...updates,
      userId,
      id: profile.id,
      subscription: profile.subscription,
      updatedAt: new Date(),
    };

    this.profiles.set(userId, updatedProfile);

    this.eventEmitter.emit('portal.profile.updated', { userId });

    return updatedProfile;
  }

  recordLogin(userId: string): void {
    const profile = this.getProfile(userId);
    profile.lastLoginAt = new Date();
    this.profiles.set(userId, profile);
  }

  // Subscription Management
  private createSubscription(data: {
    customerId: string;
    tier: SubscriptionTier;
    billingCycle?: 'MONTHLY' | 'YEARLY';
    price?: number;
    currency?: 'RON' | 'EUR' | 'USD';
  }): CustomerSubscription {
    const tierLimits: Record<SubscriptionTier, SubscriptionLimits> = {
      FREE: { invoicesPerMonth: 10, usersCount: 1, storageGb: 1, apiCalls: 100, integrations: 1 },
      BASIC: { invoicesPerMonth: 100, usersCount: 3, storageGb: 10, apiCalls: 1000, integrations: 3 },
      PRO: { invoicesPerMonth: 1000, usersCount: 10, storageGb: 50, apiCalls: 10000, integrations: 10 },
      ENTERPRISE: { invoicesPerMonth: -1, usersCount: -1, storageGb: 500, apiCalls: -1, integrations: -1 },
    };

    const tierPrices: Record<SubscriptionTier, number> = {
      FREE: 0,
      BASIC: 49,
      PRO: 149,
      ENTERPRISE: 499,
    };

    const tierFeatures: Record<SubscriptionTier, string[]> = {
      FREE: ['Basic invoicing', 'VAT calculator', 'Email support'],
      BASIC: ['Unlimited invoicing', 'e-Factura integration', 'Multi-user', 'Priority email support'],
      PRO: ['All Basic features', 'SAF-T D406', 'API access', 'Advanced analytics', 'Phone support'],
      ENTERPRISE: ['All Pro features', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'On-premise option'],
    };

    const subscription: CustomerSubscription = {
      id: `sub-${randomUUID()}`,
      customerId: data.customerId,
      tier: data.tier,
      status: data.tier === 'FREE' ? 'ACTIVE' : 'TRIAL',
      startDate: new Date(),
      trialEndDate: data.tier !== 'FREE' ? new Date(Date.now() + 14 * 86400000) : undefined,
      billingCycle: data.billingCycle || 'MONTHLY',
      price: data.price ?? tierPrices[data.tier],
      currency: data.currency || 'RON',
      features: tierFeatures[data.tier],
      limits: tierLimits[data.tier],
      autoRenew: true,
      nextBillingDate: data.tier !== 'FREE' ? new Date(Date.now() + 30 * 86400000) : undefined,
    };

    this.subscriptions.set(subscription.id, subscription);
    this.initializeUsageMetrics(data.customerId, subscription);

    return subscription;
  }

  getSubscription(customerId: string): CustomerSubscription {
    const profile = this.getProfile(customerId);
    return profile.subscription;
  }

  upgradeSubscription(customerId: string, newTier: SubscriptionTier): CustomerSubscription {
    const profile = this.getProfile(customerId);
    const currentTier = profile.subscription.tier;

    const tierOrder = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
    if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(currentTier)) {
      throw new BadRequestException('Can only upgrade to a higher tier');
    }

    const newSubscription = this.createSubscription({
      customerId,
      tier: newTier,
      billingCycle: profile.subscription.billingCycle,
      currency: profile.subscription.currency,
    });

    profile.subscription = newSubscription;
    this.profiles.set(customerId, profile);

    this.eventEmitter.emit('portal.subscription.upgraded', {
      customerId,
      fromTier: currentTier,
      toTier: newTier,
    });

    return newSubscription;
  }

  downgradeSubscription(customerId: string, newTier: SubscriptionTier): CustomerSubscription {
    const profile = this.getProfile(customerId);
    const currentTier = profile.subscription.tier;

    const tierOrder = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
    if (tierOrder.indexOf(newTier) >= tierOrder.indexOf(currentTier)) {
      throw new BadRequestException('Can only downgrade to a lower tier');
    }

    const newSubscription = this.createSubscription({
      customerId,
      tier: newTier,
      billingCycle: profile.subscription.billingCycle,
      currency: profile.subscription.currency,
    });

    newSubscription.status = 'ACTIVE';
    profile.subscription = newSubscription;
    this.profiles.set(customerId, profile);

    this.eventEmitter.emit('portal.subscription.downgraded', {
      customerId,
      fromTier: currentTier,
      toTier: newTier,
    });

    return newSubscription;
  }

  cancelSubscription(customerId: string, reason?: string): CustomerSubscription {
    const profile = this.getProfile(customerId);

    profile.subscription.status = 'CANCELLED';
    profile.subscription.autoRenew = false;
    this.profiles.set(customerId, profile);

    this.eventEmitter.emit('portal.subscription.cancelled', {
      customerId,
      reason,
    });

    return profile.subscription;
  }

  // Support Tickets
  createTicket(data: {
    customerId: string;
    subject: string;
    subjectRo?: string;
    description: string;
    descriptionRo?: string;
    category: TicketCategory;
    priority?: TicketPriority;
    attachments?: TicketAttachment[];
  }): SupportTicket {
    this.ticketCounter++;
    const ticketNumber = `TKT-${this.ticketCounter}`;

    const ticket: SupportTicket = {
      id: `ticket-${randomUUID()}`,
      ticketNumber,
      customerId: data.customerId,
      subject: data.subject,
      subjectRo: data.subjectRo,
      description: data.description,
      descriptionRo: data.descriptionRo,
      category: data.category,
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      messages: [],
      attachments: data.attachments || [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tickets.set(ticket.id, ticket);

    this.eventEmitter.emit('portal.ticket.created', {
      ticketId: ticket.id,
      ticketNumber,
      customerId: data.customerId,
    });

    return ticket;
  }

  getTicket(ticketId: string, customerId: string): SupportTicket {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }
    if (ticket.customerId !== customerId) {
      throw new ForbiddenException('Access denied to this ticket');
    }
    return ticket;
  }

  getTicketByNumber(ticketNumber: string, customerId: string): SupportTicket {
    const ticket = Array.from(this.tickets.values()).find(t => t.ticketNumber === ticketNumber);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumber} not found`);
    }
    if (ticket.customerId !== customerId) {
      throw new ForbiddenException('Access denied to this ticket');
    }
    return ticket;
  }

  getCustomerTickets(customerId: string, filters?: {
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
  }): SupportTicket[] {
    let tickets = Array.from(this.tickets.values()).filter(t => t.customerId === customerId);

    if (filters?.status) {
      tickets = tickets.filter(t => t.status === filters.status);
    }
    if (filters?.category) {
      tickets = tickets.filter(t => t.category === filters.category);
    }
    if (filters?.priority) {
      tickets = tickets.filter(t => t.priority === filters.priority);
    }

    return tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  addTicketMessage(ticketId: string, customerId: string, data: {
    content: string;
    attachments?: TicketAttachment[];
  }): TicketMessage {
    const ticket = this.getTicket(ticketId, customerId);

    const message: TicketMessage = {
      id: `msg-${randomUUID()}`,
      ticketId,
      senderId: customerId,
      senderName: this.getProfile(customerId).name,
      senderType: 'CUSTOMER',
      content: data.content,
      attachments: data.attachments || [],
      isInternal: false,
      createdAt: new Date(),
    };

    ticket.messages.push(message);
    ticket.updatedAt = new Date();

    if (ticket.status === 'WAITING_CUSTOMER') {
      ticket.status = 'IN_PROGRESS';
    }

    this.eventEmitter.emit('portal.ticket.message.added', {
      ticketId,
      messageId: message.id,
    });

    return message;
  }

  rateTicketResolution(ticketId: string, customerId: string, rating: number): SupportTicket {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const ticket = this.getTicket(ticketId, customerId);

    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new BadRequestException('Can only rate resolved or closed tickets');
    }

    ticket.satisfactionRating = rating;

    this.eventEmitter.emit('portal.ticket.rated', {
      ticketId,
      rating,
    });

    return ticket;
  }

  // Invoices
  getCustomerInvoices(customerId: string, filters?: {
    status?: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    fromDate?: Date;
    toDate?: Date;
  }): CustomerInvoice[] {
    let invoices = Array.from(this.invoices.values()).filter(i => i.customerId === customerId);

    if (filters?.status) {
      invoices = invoices.filter(i => i.status === filters.status);
    }
    if (filters?.fromDate) {
      invoices = invoices.filter(i => i.issuedAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      invoices = invoices.filter(i => i.issuedAt <= filters.toDate!);
    }

    return invoices.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  getInvoice(invoiceId: string, customerId: string): CustomerInvoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    if (invoice.customerId !== customerId) {
      throw new ForbiddenException('Access denied to this invoice');
    }
    return invoice;
  }

  generateInvoice(customerId: string): CustomerInvoice {
    const profile = this.getProfile(customerId);
    const subscription = profile.subscription;

    if (subscription.price === 0) {
      throw new BadRequestException('Cannot generate invoice for free subscription');
    }

    const taxRate = profile.country === 'RO' ? 0.19 : 0;
    const tax = subscription.price * taxRate;

    const invoice: CustomerInvoice = {
      id: `inv-${randomUUID()}`,
      invoiceNumber: `INV-${Date.now()}`,
      customerId,
      subscriptionId: subscription.id,
      amount: subscription.price,
      tax,
      total: subscription.price + tax,
      currency: subscription.currency,
      status: 'SENT',
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      items: [
        {
          description: `${subscription.tier} Plan - ${subscription.billingCycle}`,
          descriptionRo: `Plan ${subscription.tier} - ${subscription.billingCycle === 'MONTHLY' ? 'Lunar' : 'Anual'}`,
          quantity: 1,
          unitPrice: subscription.price,
          total: subscription.price,
        },
      ],
      downloadUrl: `/api/invoices/${randomUUID()}/download`,
    };

    this.invoices.set(invoice.id, invoice);

    this.eventEmitter.emit('portal.invoice.generated', {
      invoiceId: invoice.id,
      customerId,
    });

    return invoice;
  }

  // Knowledge Base
  searchArticles(query: string, category?: ArticleCategory, language?: 'RO' | 'EN'): KnowledgeArticle[] {
    const queryLower = query.toLowerCase();
    let results = Array.from(this.articles.values()).filter(a => a.isPublished);

    results = results.filter(a => {
      const searchFields = [
        a.title, a.titleRo, a.content, a.contentRo,
        a.summary, a.summaryRo, ...a.tags,
      ];
      return searchFields.some(f => f.toLowerCase().includes(queryLower));
    });

    if (category) {
      results = results.filter(a => a.category === category);
    }

    return results.sort((a, b) => b.viewCount - a.viewCount);
  }

  getArticle(articleId: string): KnowledgeArticle {
    const article = this.articles.get(articleId);
    if (!article || !article.isPublished) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }
    return article;
  }

  getArticleBySlug(slug: string): KnowledgeArticle {
    const article = Array.from(this.articles.values()).find(a => a.slug === slug && a.isPublished);
    if (!article) {
      throw new NotFoundException(`Article with slug ${slug} not found`);
    }
    return article;
  }

  incrementArticleView(articleId: string): void {
    const article = this.getArticle(articleId);
    article.viewCount++;
  }

  rateArticle(articleId: string, helpful: boolean): void {
    const article = this.getArticle(articleId);
    if (helpful) {
      article.helpfulCount++;
    } else {
      article.notHelpfulCount++;
    }
  }

  getArticlesByCategory(category: ArticleCategory): KnowledgeArticle[] {
    return Array.from(this.articles.values())
      .filter(a => a.category === category && a.isPublished)
      .sort((a, b) => b.viewCount - a.viewCount);
  }

  getPopularArticles(limit = 5): KnowledgeArticle[] {
    return Array.from(this.articles.values())
      .filter(a => a.isPublished)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
  }

  // Notification Preferences
  private initializeNotificationPreferences(customerId: string): void {
    const preferences: NotificationPreferences = {
      customerId,
      channels: ['EMAIL', 'IN_APP'],
      preferences: {
        billing: ['EMAIL', 'IN_APP'],
        support: ['EMAIL', 'IN_APP', 'PUSH'],
        product: ['IN_APP'],
        security: ['EMAIL', 'SMS', 'IN_APP'],
        marketing: ['EMAIL'],
      },
      frequency: 'IMMEDIATE',
      unsubscribedTopics: [],
    };

    this.preferences.set(customerId, preferences);
  }

  getNotificationPreferences(customerId: string): NotificationPreferences {
    const prefs = this.preferences.get(customerId);
    if (!prefs) {
      this.initializeNotificationPreferences(customerId);
      return this.preferences.get(customerId)!;
    }
    return prefs;
  }

  updateNotificationPreferences(
    customerId: string,
    updates: Partial<NotificationPreferences>,
  ): NotificationPreferences {
    const current = this.getNotificationPreferences(customerId);

    const updated = {
      ...current,
      ...updates,
      customerId,
    };

    this.preferences.set(customerId, updated);

    this.eventEmitter.emit('portal.preferences.updated', { customerId });

    return updated;
  }

  // Notifications
  sendNotification(data: {
    customerId: string;
    type: string;
    title: string;
    titleRo: string;
    message: string;
    messageRo: string;
    channel?: NotificationChannel;
    actionUrl?: string;
    expiresAt?: Date;
  }): CustomerNotification {
    const notification: CustomerNotification = {
      id: `notif-${randomUUID()}`,
      customerId: data.customerId,
      type: data.type,
      title: data.title,
      titleRo: data.titleRo,
      message: data.message,
      messageRo: data.messageRo,
      channel: data.channel || 'IN_APP',
      isRead: false,
      actionUrl: data.actionUrl,
      createdAt: new Date(),
      expiresAt: data.expiresAt,
    };

    const customerNotifications = this.notifications.get(data.customerId) || [];
    customerNotifications.push(notification);
    this.notifications.set(data.customerId, customerNotifications);

    this.eventEmitter.emit('portal.notification.sent', {
      notificationId: notification.id,
      customerId: data.customerId,
    });

    return notification;
  }

  getNotifications(customerId: string, unreadOnly = false): CustomerNotification[] {
    let notifications = this.notifications.get(customerId) || [];

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    return notifications
      .filter(n => !n.expiresAt || n.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  markNotificationRead(notificationId: string, customerId: string): CustomerNotification {
    const notifications = this.notifications.get(customerId) || [];
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return notification;
  }

  markAllNotificationsRead(customerId: string): number {
    const notifications = this.notifications.get(customerId) || [];
    let count = 0;

    notifications.forEach(n => {
      if (!n.isRead) {
        n.isRead = true;
        n.readAt = new Date();
        count++;
      }
    });

    return count;
  }

  getUnreadCount(customerId: string): number {
    const notifications = this.notifications.get(customerId) || [];
    return notifications.filter(n => !n.isRead && (!n.expiresAt || n.expiresAt > new Date())).length;
  }

  // Usage Metrics
  private initializeUsageMetrics(customerId: string, subscription: CustomerSubscription): void {
    const usage: UsageMetrics = {
      customerId,
      period: new Date().toISOString().slice(0, 7),
      invoicesCreated: 0,
      invoicesLimit: subscription.limits.invoicesPerMonth,
      usersActive: 1,
      usersLimit: subscription.limits.usersCount,
      storageUsedGb: 0,
      storageLimit: subscription.limits.storageGb,
      apiCallsMade: 0,
      apiCallsLimit: subscription.limits.apiCalls,
      lastUpdated: new Date(),
    };

    this.usage.set(customerId, usage);
  }

  getUsageMetrics(customerId: string): UsageMetrics {
    const usage = this.usage.get(customerId);
    if (!usage) {
      throw new NotFoundException(`Usage metrics not found for ${customerId}`);
    }
    return usage;
  }

  incrementUsage(customerId: string, metric: 'invoices' | 'api' | 'storage', amount = 1): UsageMetrics {
    const usage = this.getUsageMetrics(customerId);

    switch (metric) {
      case 'invoices':
        usage.invoicesCreated += amount;
        break;
      case 'api':
        usage.apiCallsMade += amount;
        break;
      case 'storage':
        usage.storageUsedGb += amount;
        break;
    }

    usage.lastUpdated = new Date();

    // Check limits
    if (usage.invoicesLimit !== -1 && usage.invoicesCreated >= usage.invoicesLimit) {
      this.eventEmitter.emit('portal.usage.limit.reached', { customerId, metric: 'invoices' });
    }
    if (usage.apiCallsLimit !== -1 && usage.apiCallsMade >= usage.apiCallsLimit) {
      this.eventEmitter.emit('portal.usage.limit.reached', { customerId, metric: 'api' });
    }
    if (usage.storageLimit !== -1 && usage.storageUsedGb >= usage.storageLimit) {
      this.eventEmitter.emit('portal.usage.limit.reached', { customerId, metric: 'storage' });
    }

    return usage;
  }

  getUsagePercentages(customerId: string): {
    invoices: number;
    users: number;
    storage: number;
    api: number;
  } {
    const usage = this.getUsageMetrics(customerId);

    return {
      invoices: usage.invoicesLimit === -1 ? 0 : (usage.invoicesCreated / usage.invoicesLimit) * 100,
      users: usage.usersLimit === -1 ? 0 : (usage.usersActive / usage.usersLimit) * 100,
      storage: usage.storageLimit === -1 ? 0 : (usage.storageUsedGb / usage.storageLimit) * 100,
      api: usage.apiCallsLimit === -1 ? 0 : (usage.apiCallsMade / usage.apiCallsLimit) * 100,
    };
  }

  // Portal Statistics
  getPortalStats(): {
    totalProfiles: number;
    totalTickets: number;
    openTickets: number;
    totalArticles: number;
    subscriptionBreakdown: Record<SubscriptionTier, number>;
  } {
    const profiles = Array.from(this.profiles.values());
    const tickets = Array.from(this.tickets.values());
    const articles = Array.from(this.articles.values()).filter(a => a.isPublished);

    const subscriptionBreakdown: Record<SubscriptionTier, number> = {
      FREE: 0,
      BASIC: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };

    profiles.forEach(p => {
      subscriptionBreakdown[p.subscription.tier]++;
    });

    return {
      totalProfiles: profiles.length,
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => t.status === 'OPEN').length,
      totalArticles: articles.length,
      subscriptionBreakdown,
    };
  }
}
