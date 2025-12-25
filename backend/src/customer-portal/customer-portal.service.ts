import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketCategory = 'BILLING' | 'TECHNICAL' | 'ACCOUNT' | 'INTEGRATION' | 'FEATURE_REQUEST' | 'OTHER';

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'BILLING' | 'SYSTEM';

export type DocumentType = 'INVOICE' | 'CONTRACT' | 'REPORT' | 'TAX_DOCUMENT' | 'RECEIPT' | 'OTHER';

export interface CustomerProfile {
  id: string;
  userId: string;
  companyName: string;
  companyNameRo?: string;
  cui: string; // Romanian CUI/CIF
  tradeRegister: string; // Nr. Reg. Com.
  address: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  vatPayer: boolean;
  bankAccount?: string;
  bankName?: string;
  logo?: string;
  preferences: CustomerPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPreferences {
  language: 'ro' | 'en';
  timezone: string;
  dateFormat: string;
  currency: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  invoiceReminders: boolean;
  marketingEmails: boolean;
  twoFactorEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface SupportTicket {
  id: string;
  customerId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  messages: TicketMessage[];
  attachments: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'SUPPORT';
  content: string;
  attachments: string[];
  createdAt: Date;
}

export interface Notification {
  id: string;
  customerId: string;
  type: NotificationType;
  title: string;
  titleRo: string;
  message: string;
  messageRo: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface PortalDocument {
  id: string;
  customerId: string;
  type: DocumentType;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  relatedId?: string; // Invoice ID, Contract ID, etc.
  tags: string[];
  createdAt: Date;
  downloadCount: number;
}

export interface ActivityLog {
  id: string;
  customerId: string;
  action: string;
  actionRo: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: Date;
}

export interface DashboardWidget {
  id: string;
  customerId: string;
  type: string;
  title: string;
  titleRo: string;
  position: number;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PortalStats {
  totalDocuments: number;
  unreadNotifications: number;
  openTickets: number;
  pendingInvoices: number;
  lastLogin?: Date;
  storageUsed: number;
  storageLimit: number;
}

// Romanian translations for ticket categories
const CATEGORY_TRANSLATIONS: Record<TicketCategory, string> = {
  BILLING: 'Facturare',
  TECHNICAL: 'Tehnic',
  ACCOUNT: 'Cont',
  INTEGRATION: 'Integrare',
  FEATURE_REQUEST: 'Solicitare Funcționalitate',
  OTHER: 'Altele',
};

// Romanian translations for ticket priorities
const PRIORITY_TRANSLATIONS: Record<TicketPriority, string> = {
  LOW: 'Scăzută',
  MEDIUM: 'Medie',
  HIGH: 'Ridicată',
  URGENT: 'Urgentă',
};

// Romanian translations for ticket statuses
const STATUS_TRANSLATIONS: Record<TicketStatus, string> = {
  OPEN: 'Deschis',
  IN_PROGRESS: 'În Lucru',
  WAITING_CUSTOMER: 'Așteptare Client',
  RESOLVED: 'Rezolvat',
  CLOSED: 'Închis',
};

// Romanian translations for document types
const DOCUMENT_TYPE_TRANSLATIONS: Record<DocumentType, string> = {
  INVOICE: 'Factură',
  CONTRACT: 'Contract',
  REPORT: 'Raport',
  TAX_DOCUMENT: 'Document Fiscal',
  RECEIPT: 'Chitanță',
  OTHER: 'Altele',
};

// Default dashboard widgets
const DEFAULT_WIDGETS: Omit<DashboardWidget, 'id' | 'customerId'>[] = [
  { type: 'recent_invoices', title: 'Recent Invoices', titleRo: 'Facturi Recente', position: 1, enabled: true },
  { type: 'notifications', title: 'Notifications', titleRo: 'Notificări', position: 2, enabled: true },
  { type: 'support_tickets', title: 'Support Tickets', titleRo: 'Tichete Suport', position: 3, enabled: true },
  { type: 'usage_stats', title: 'Usage Statistics', titleRo: 'Statistici Utilizare', position: 4, enabled: true },
  { type: 'quick_actions', title: 'Quick Actions', titleRo: 'Acțiuni Rapide', position: 5, enabled: true },
];

@Injectable()
export class CustomerPortalService implements OnModuleInit {
  private profiles: Map<string, CustomerProfile> = new Map();
  private tickets: Map<string, SupportTicket> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private documents: Map<string, PortalDocument> = new Map();
  private activityLogs: Map<string, ActivityLog[]> = new Map();
  private widgets: Map<string, DashboardWidget[]> = new Map();
  private ticketCounter = 1000;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize service
  }

  // Customer Profile Management
  async createProfile(
    userId: string,
    data: {
      companyName: string;
      cui: string;
      address: string;
      city: string;
      county: string;
      postalCode: string;
      phone: string;
      email: string;
      vatPayer?: boolean;
      tradeRegister?: string;
      bankAccount?: string;
      bankName?: string;
    },
  ): Promise<CustomerProfile> {
    // Validate CUI format
    if (!this.validateCui(data.cui)) {
      throw new Error('Invalid CUI format');
    }

    const now = new Date();
    const profile: CustomerProfile = {
      id: this.generateId('cust'),
      userId,
      companyName: data.companyName,
      cui: data.cui,
      tradeRegister: data.tradeRegister || '',
      address: data.address,
      city: data.city,
      county: data.county,
      postalCode: data.postalCode,
      country: 'România',
      phone: data.phone,
      email: data.email,
      vatPayer: data.vatPayer ?? false,
      bankAccount: data.bankAccount,
      bankName: data.bankName,
      preferences: this.getDefaultPreferences(),
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.id, profile);

    // Initialize default widgets
    await this.initializeWidgets(profile.id);

    // Initialize activity logs
    this.activityLogs.set(profile.id, []);

    // Log activity
    await this.logActivity(profile.id, 'Account Created', 'Cont Creat', {
      companyName: data.companyName,
    });

    this.eventEmitter.emit('customer.profile.created', {
      customerId: profile.id,
      companyName: profile.companyName,
    });

    return profile;
  }

  async getProfile(customerId: string): Promise<CustomerProfile | undefined> {
    return this.profiles.get(customerId);
  }

  async getProfileByUserId(userId: string): Promise<CustomerProfile | undefined> {
    return Array.from(this.profiles.values()).find((p) => p.userId === userId);
  }

  async updateProfile(
    customerId: string,
    updates: Partial<Omit<CustomerProfile, 'id' | 'userId' | 'createdAt' | 'preferences'>>,
  ): Promise<CustomerProfile> {
    const profile = this.profiles.get(customerId);
    if (!profile) {
      throw new Error(`Customer profile not found: ${customerId}`);
    }

    if (updates.cui && !this.validateCui(updates.cui)) {
      throw new Error('Invalid CUI format');
    }

    const updated: CustomerProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date(),
    };

    this.profiles.set(customerId, updated);

    await this.logActivity(customerId, 'Profile Updated', 'Profil Actualizat');

    return updated;
  }

  async updatePreferences(
    customerId: string,
    preferences: Partial<CustomerPreferences>,
  ): Promise<CustomerPreferences> {
    const profile = this.profiles.get(customerId);
    if (!profile) {
      throw new Error(`Customer profile not found: ${customerId}`);
    }

    profile.preferences = { ...profile.preferences, ...preferences };
    profile.updatedAt = new Date();
    this.profiles.set(customerId, profile);

    await this.logActivity(customerId, 'Preferences Updated', 'Preferințe Actualizate');

    return profile.preferences;
  }

  private getDefaultPreferences(): CustomerPreferences {
    return {
      language: 'ro',
      timezone: 'Europe/Bucharest',
      dateFormat: 'DD.MM.YYYY',
      currency: 'RON',
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      invoiceReminders: true,
      marketingEmails: false,
      twoFactorEnabled: false,
      theme: 'system',
    };
  }

  private validateCui(cui: string): boolean {
    // Basic Romanian CUI validation
    const cleanCui = cui.replace(/\D/g, '');
    if (cleanCui.length < 2 || cleanCui.length > 10) {
      return false;
    }
    return true;
  }

  // Support Ticket Management
  async createTicket(
    customerId: string,
    data: {
      subject: string;
      description: string;
      category: TicketCategory;
      priority?: TicketPriority;
      attachments?: string[];
      tags?: string[];
    },
  ): Promise<SupportTicket> {
    const now = new Date();
    const ticket: SupportTicket = {
      id: `TKT-${++this.ticketCounter}`,
      customerId,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      messages: [],
      attachments: data.attachments || [],
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    this.tickets.set(ticket.id, ticket);

    await this.logActivity(customerId, 'Ticket Created', 'Tichet Creat', {
      ticketId: ticket.id,
      subject: data.subject,
    });

    // Create notification for customer
    await this.createNotification(customerId, {
      type: 'INFO',
      title: 'Support Ticket Created',
      titleRo: 'Tichet Suport Creat',
      message: `Your ticket #${ticket.id} has been created`,
      messageRo: `Tichetul dumneavoastră #${ticket.id} a fost creat`,
      actionUrl: `/support/tickets/${ticket.id}`,
    });

    this.eventEmitter.emit('ticket.created', {
      ticketId: ticket.id,
      customerId,
      category: data.category,
      priority: ticket.priority,
    });

    return ticket;
  }

  async getTicket(ticketId: string): Promise<SupportTicket | undefined> {
    return this.tickets.get(ticketId);
  }

  async listTickets(
    customerId: string,
    options: { status?: TicketStatus; category?: TicketCategory; limit?: number } = {},
  ): Promise<SupportTicket[]> {
    let tickets = Array.from(this.tickets.values()).filter((t) => t.customerId === customerId);

    if (options.status) {
      tickets = tickets.filter((t) => t.status === options.status);
    }
    if (options.category) {
      tickets = tickets.filter((t) => t.category === options.category);
    }

    tickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options.limit) {
      tickets = tickets.slice(0, options.limit);
    }

    return tickets;
  }

  async addTicketMessage(
    ticketId: string,
    senderId: string,
    senderType: 'CUSTOMER' | 'SUPPORT',
    content: string,
    attachments: string[] = [],
  ): Promise<TicketMessage> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    const message: TicketMessage = {
      id: this.generateId('msg'),
      ticketId,
      senderId,
      senderType,
      content,
      attachments,
      createdAt: new Date(),
    };

    ticket.messages.push(message);
    ticket.updatedAt = new Date();

    // Update status based on sender
    if (senderType === 'CUSTOMER' && ticket.status === 'WAITING_CUSTOMER') {
      ticket.status = 'IN_PROGRESS';
    } else if (senderType === 'SUPPORT' && ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    this.tickets.set(ticketId, ticket);

    this.eventEmitter.emit('ticket.message.added', {
      ticketId,
      messageId: message.id,
      senderType,
    });

    return message;
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    ticket.status = status;
    ticket.updatedAt = new Date();

    if (status === 'RESOLVED') {
      ticket.resolvedAt = new Date();
    }
    if (status === 'CLOSED') {
      ticket.closedAt = new Date();
    }

    this.tickets.set(ticketId, ticket);

    // Notify customer of status change
    await this.createNotification(ticket.customerId, {
      type: 'INFO',
      title: 'Ticket Status Updated',
      titleRo: 'Status Tichet Actualizat',
      message: `Ticket #${ticketId} is now ${status}`,
      messageRo: `Tichetul #${ticketId} este acum ${STATUS_TRANSLATIONS[status]}`,
      actionUrl: `/support/tickets/${ticketId}`,
    });

    return ticket;
  }

  async assignTicket(ticketId: string, agentId: string): Promise<SupportTicket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    ticket.assignedTo = agentId;
    ticket.updatedAt = new Date();
    if (ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    this.tickets.set(ticketId, ticket);

    return ticket;
  }

  // Notification Management
  async createNotification(
    customerId: string,
    data: {
      type: NotificationType;
      title: string;
      titleRo: string;
      message: string;
      messageRo: string;
      actionUrl?: string;
      metadata?: Record<string, any>;
      expiresAt?: Date;
    },
  ): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId('notif'),
      customerId,
      type: data.type,
      title: data.title,
      titleRo: data.titleRo,
      message: data.message,
      messageRo: data.messageRo,
      read: false,
      actionUrl: data.actionUrl,
      metadata: data.metadata,
      createdAt: new Date(),
      expiresAt: data.expiresAt,
    };

    this.notifications.set(notification.id, notification);

    this.eventEmitter.emit('notification.created', {
      notificationId: notification.id,
      customerId,
      type: data.type,
    });

    return notification;
  }

  async getNotification(notificationId: string): Promise<Notification | undefined> {
    return this.notifications.get(notificationId);
  }

  async listNotifications(
    customerId: string,
    options: { unreadOnly?: boolean; type?: NotificationType; limit?: number } = {},
  ): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values()).filter(
      (n) => n.customerId === customerId,
    );

    // Filter out expired notifications
    const now = new Date();
    notifications = notifications.filter((n) => !n.expiresAt || n.expiresAt > now);

    if (options.unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }
    if (options.type) {
      notifications = notifications.filter((n) => n.type === options.type);
    }

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    return notifications;
  }

  async markNotificationRead(notificationId: string): Promise<Notification> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    notification.read = true;
    this.notifications.set(notificationId, notification);

    return notification;
  }

  async markAllNotificationsRead(customerId: string): Promise<number> {
    const notifications = Array.from(this.notifications.values()).filter(
      (n) => n.customerId === customerId && !n.read,
    );

    for (const notification of notifications) {
      notification.read = true;
      this.notifications.set(notification.id, notification);
    }

    return notifications.length;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    this.notifications.delete(notificationId);
  }

  async getUnreadCount(customerId: string): Promise<number> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.customerId === customerId && !n.read,
    ).length;
  }

  // Document Center
  async addDocument(
    customerId: string,
    data: {
      type: DocumentType;
      name: string;
      nameRo: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      description?: string;
      descriptionRo?: string;
      relatedId?: string;
      tags?: string[];
    },
  ): Promise<PortalDocument> {
    const document: PortalDocument = {
      id: this.generateId('doc'),
      customerId,
      type: data.type,
      name: data.name,
      nameRo: data.nameRo,
      description: data.description,
      descriptionRo: data.descriptionRo,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      relatedId: data.relatedId,
      tags: data.tags || [],
      createdAt: new Date(),
      downloadCount: 0,
    };

    this.documents.set(document.id, document);

    await this.logActivity(customerId, 'Document Added', 'Document Adăugat', {
      documentId: document.id,
      name: data.name,
    });

    this.eventEmitter.emit('document.added', {
      documentId: document.id,
      customerId,
      type: data.type,
    });

    return document;
  }

  async getDocument(documentId: string): Promise<PortalDocument | undefined> {
    return this.documents.get(documentId);
  }

  async listDocuments(
    customerId: string,
    options: { type?: DocumentType; limit?: number; search?: string } = {},
  ): Promise<PortalDocument[]> {
    let documents = Array.from(this.documents.values()).filter((d) => d.customerId === customerId);

    if (options.type) {
      documents = documents.filter((d) => d.type === options.type);
    }
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      documents = documents.filter(
        (d) =>
          d.name.toLowerCase().includes(searchLower) ||
          d.nameRo.toLowerCase().includes(searchLower) ||
          d.tags.some((t) => t.toLowerCase().includes(searchLower)),
      );
    }

    documents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options.limit) {
      documents = documents.slice(0, options.limit);
    }

    return documents;
  }

  async downloadDocument(documentId: string): Promise<PortalDocument> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    document.downloadCount++;
    this.documents.set(documentId, document);

    await this.logActivity(document.customerId, 'Document Downloaded', 'Document Descărcat', {
      documentId,
      name: document.name,
    });

    return document;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    this.documents.delete(documentId);

    await this.logActivity(document.customerId, 'Document Deleted', 'Document Șters', {
      documentId,
      name: document.name,
    });
  }

  // Activity Logging
  async logActivity(
    customerId: string,
    action: string,
    actionRo: string,
    details?: Record<string, any>,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<ActivityLog> {
    const log: ActivityLog = {
      id: this.generateId('log'),
      customerId,
      action,
      actionRo,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      createdAt: new Date(),
    };

    const logs = this.activityLogs.get(customerId) || [];
    logs.push(log);
    this.activityLogs.set(customerId, logs);

    return log;
  }

  async getActivityLogs(
    customerId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<ActivityLog[]> {
    const logs = this.activityLogs.get(customerId) || [];
    const sorted = [...logs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const offset = options.offset || 0;
    const limit = options.limit || 50;

    return sorted.slice(offset, offset + limit);
  }

  // Dashboard Widgets
  private async initializeWidgets(customerId: string): Promise<void> {
    const widgets: DashboardWidget[] = DEFAULT_WIDGETS.map((w, index) => ({
      ...w,
      id: this.generateId('widget'),
      customerId,
    }));

    this.widgets.set(customerId, widgets);
  }

  async getWidgets(customerId: string): Promise<DashboardWidget[]> {
    return this.widgets.get(customerId) || [];
  }

  async updateWidget(
    customerId: string,
    widgetId: string,
    updates: Partial<Omit<DashboardWidget, 'id' | 'customerId'>>,
  ): Promise<DashboardWidget> {
    const widgets = this.widgets.get(customerId);
    if (!widgets) {
      throw new Error(`No widgets found for customer: ${customerId}`);
    }

    const index = widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    widgets[index] = { ...widgets[index], ...updates };
    this.widgets.set(customerId, widgets);

    return widgets[index];
  }

  async reorderWidgets(customerId: string, widgetOrder: string[]): Promise<DashboardWidget[]> {
    const widgets = this.widgets.get(customerId);
    if (!widgets) {
      throw new Error(`No widgets found for customer: ${customerId}`);
    }

    for (let i = 0; i < widgetOrder.length; i++) {
      const widget = widgets.find((w) => w.id === widgetOrder[i]);
      if (widget) {
        widget.position = i + 1;
      }
    }

    widgets.sort((a, b) => a.position - b.position);
    this.widgets.set(customerId, widgets);

    return widgets;
  }

  // Portal Statistics
  async getPortalStats(customerId: string): Promise<PortalStats> {
    const documents = Array.from(this.documents.values()).filter(
      (d) => d.customerId === customerId,
    );
    const notifications = Array.from(this.notifications.values()).filter(
      (n) => n.customerId === customerId && !n.read,
    );
    const tickets = Array.from(this.tickets.values()).filter(
      (t) => t.customerId === customerId && !['RESOLVED', 'CLOSED'].includes(t.status),
    );

    const storageUsed = documents.reduce((sum, d) => sum + d.fileSize, 0);

    return {
      totalDocuments: documents.length,
      unreadNotifications: notifications.length,
      openTickets: tickets.length,
      pendingInvoices: documents.filter((d) => d.type === 'INVOICE').length,
      storageUsed,
      storageLimit: 5000000000, // 5GB default
    };
  }

  // Romanian Localization Helpers
  getCategoryName(category: TicketCategory): string {
    return CATEGORY_TRANSLATIONS[category];
  }

  getPriorityName(priority: TicketPriority): string {
    return PRIORITY_TRANSLATIONS[priority];
  }

  getStatusName(status: TicketStatus): string {
    return STATUS_TRANSLATIONS[status];
  }

  getDocumentTypeName(type: DocumentType): string {
    return DOCUMENT_TYPE_TRANSLATIONS[type];
  }

  getAllCategories(): Array<{ category: TicketCategory; name: string; nameRo: string }> {
    return (Object.keys(CATEGORY_TRANSLATIONS) as TicketCategory[]).map((category) => ({
      category,
      name: category.replace(/_/g, ' ').toLowerCase(),
      nameRo: CATEGORY_TRANSLATIONS[category],
    }));
  }

  getAllPriorities(): Array<{ priority: TicketPriority; name: string; nameRo: string }> {
    return (Object.keys(PRIORITY_TRANSLATIONS) as TicketPriority[]).map((priority) => ({
      priority,
      name: priority.toLowerCase(),
      nameRo: PRIORITY_TRANSLATIONS[priority],
    }));
  }

  getAllStatuses(): Array<{ status: TicketStatus; name: string; nameRo: string }> {
    return (Object.keys(STATUS_TRANSLATIONS) as TicketStatus[]).map((status) => ({
      status,
      name: status.replace(/_/g, ' ').toLowerCase(),
      nameRo: STATUS_TRANSLATIONS[status],
    }));
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
