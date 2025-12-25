import { Injectable, Logger } from '@nestjs/common';

export interface ClientProfile {
  id: string;
  companyName: string;
  cui: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  accountManagerId?: string;
  accountManagerName?: string;
  createdAt: Date;
  lastLogin?: Date;
  status: 'active' | 'inactive' | 'suspended';
  subscriptionPlan: string;
  subscriptionExpiresAt?: Date;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  name: string;
  type: 'invoice' | 'contract' | 'report' | 'statement' | 'tax_document' | 'other';
  category: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  expiresAt?: Date;
  status: 'pending' | 'approved' | 'rejected';
  tags: string[];
}

export interface ClientInvoice {
  id: string;
  clientId: string;
  number: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  currency: string;
  vatAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  pdfUrl: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
  paymentMethod?: string;
  paymentDate?: Date;
}

export interface ClientStatement {
  id: string;
  clientId: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  transactions: Array<{
    date: Date;
    description: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  generatedAt: Date;
  pdfUrl: string;
}

export interface ClientMessage {
  id: string;
  clientId: string;
  subject: string;
  content: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'staff';
  createdAt: Date;
  readAt?: Date;
  attachments: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  threadId?: string;
  status: 'unread' | 'read' | 'archived';
}

export interface ClientNotification {
  id: string;
  clientId: string;
  type: 'invoice' | 'document' | 'message' | 'system' | 'deadline';
  title: string;
  message: string;
  link?: string;
  createdAt: Date;
  readAt?: Date;
  priority: 'low' | 'medium' | 'high';
}

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);
  private clients: ClientProfile[] = [];
  private documents: ClientDocument[] = [];
  private invoices: ClientInvoice[] = [];
  private statements: ClientStatement[] = [];
  private messages: ClientMessage[] = [];
  private notifications: ClientNotification[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock client profiles
    this.clients = [
      {
        id: 'client-001',
        companyName: 'ABC Solutions SRL',
        cui: 'RO12345678',
        email: 'contact@abcsolutions.ro',
        phone: '+40 21 123 4567',
        address: 'Str. Victoriei 100',
        city: 'București',
        country: 'Romania',
        accountManagerId: 'manager-001',
        accountManagerName: 'Maria Popescu',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'active',
        subscriptionPlan: 'Business',
        subscriptionExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'client-002',
        companyName: 'XYZ Import Export',
        cui: 'RO87654321',
        email: 'office@xyz-import.ro',
        phone: '+40 31 987 6543',
        address: 'Bd. Unirii 50',
        city: 'Cluj-Napoca',
        country: 'Romania',
        accountManagerId: 'manager-002',
        accountManagerName: 'Ion Ionescu',
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'active',
        subscriptionPlan: 'Pro',
        subscriptionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    ];

    // Generate mock documents
    this.generateMockDocuments();

    // Generate mock invoices
    this.generateMockInvoices();

    // Generate mock messages
    this.generateMockMessages();

    // Generate mock notifications
    this.generateMockNotifications();
  }

  private generateMockDocuments() {
    const documentTypes: Array<'invoice' | 'contract' | 'report' | 'statement' | 'tax_document'> = [
      'invoice', 'contract', 'report', 'statement', 'tax_document'
    ];

    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      this.documents.push({
        id: `doc-${String(i).padStart(4, '0')}`,
        clientId: this.clients[i % 2].id,
        name: `Document_${Date.now()}_${i}.pdf`,
        type: documentTypes[Math.floor(Math.random() * documentTypes.length)],
        category: 'Financial',
        fileUrl: `/documents/${Date.now()}_${i}.pdf`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        mimeType: 'application/pdf',
        uploadedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        uploadedBy: 'System',
        status: Math.random() > 0.2 ? 'approved' : 'pending',
        tags: ['2024', 'financial'],
      });
    }
  }

  private generateMockInvoices() {
    const statuses: Array<'draft' | 'sent' | 'paid' | 'overdue'> = ['paid', 'paid', 'paid', 'sent', 'overdue'];

    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 180);
      const amount = Math.round((Math.random() * 10000 + 500) * 100) / 100;
      const vatAmount = Math.round(amount * 0.19 * 100) / 100;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      this.invoices.push({
        id: `inv-${String(i).padStart(4, '0')}`,
        clientId: this.clients[i % 2].id,
        number: `FC-2024-${String(1000 + i)}`,
        issueDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - (daysAgo - 30) * 24 * 60 * 60 * 1000),
        amount,
        currency: 'RON',
        vatAmount,
        status,
        pdfUrl: `/invoices/FC-2024-${String(1000 + i)}.pdf`,
        items: [
          {
            description: 'Servicii contabilitate',
            quantity: 1,
            unitPrice: amount,
            vatRate: 19,
            total: amount + vatAmount,
          },
        ],
        paymentMethod: status === 'paid' ? 'bank_transfer' : undefined,
        paymentDate: status === 'paid' ? new Date(Date.now() - (daysAgo - 15) * 24 * 60 * 60 * 1000) : undefined,
      });
    }
  }

  private generateMockMessages() {
    const subjects = [
      'Întrebare despre factură',
      'Solicitare raport lunar',
      'Verificare declarații fiscale',
      'Aprobare document',
      'Update contract',
    ];

    for (let i = 0; i < 10; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      this.messages.push({
        id: `msg-${String(i).padStart(4, '0')}`,
        clientId: this.clients[i % 2].id,
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        content: `Conținutul mesajului ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        senderId: Math.random() > 0.5 ? this.clients[i % 2].id : 'staff-001',
        senderName: Math.random() > 0.5 ? this.clients[i % 2].companyName : 'Suport DocumentIulia',
        senderType: Math.random() > 0.5 ? 'client' : 'staff',
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        readAt: Math.random() > 0.3 ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000) : undefined,
        attachments: [],
        status: Math.random() > 0.3 ? 'read' : 'unread',
      });
    }
  }

  private generateMockNotifications() {
    const notificationTypes: Array<'invoice' | 'document' | 'message' | 'system' | 'deadline'> = [
      'invoice', 'document', 'message', 'system', 'deadline'
    ];

    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 14);
      const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];

      let title = '';
      let message = '';
      switch (type) {
        case 'invoice':
          title = 'Factură nouă disponibilă';
          message = 'O nouă factură a fost generată și este disponibilă pentru descărcare.';
          break;
        case 'document':
          title = 'Document încărcat';
          message = 'Un nou document a fost încărcat în portalul dumneavoastră.';
          break;
        case 'message':
          title = 'Mesaj nou';
          message = 'Ați primit un mesaj nou de la echipa de suport.';
          break;
        case 'system':
          title = 'Update sistem';
          message = 'Platforma a fost actualizată cu noi funcționalități.';
          break;
        case 'deadline':
          title = 'Termen limită apropiat';
          message = 'Termenul de depunere a declarației D406 este în 5 zile.';
          break;
      }

      this.notifications.push({
        id: `notif-${String(i).padStart(4, '0')}`,
        clientId: this.clients[i % 2].id,
        type,
        title,
        message,
        link: type === 'invoice' ? '/portal/invoices' : type === 'document' ? '/portal/documents' : undefined,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        readAt: Math.random() > 0.4 ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000) : undefined,
        priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      });
    }
  }

  // Client Profile
  async getClientProfile(clientId: string): Promise<ClientProfile | undefined> {
    return this.clients.find(c => c.id === clientId);
  }

  async updateClientProfile(clientId: string, updates: Partial<ClientProfile>): Promise<ClientProfile | undefined> {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return undefined;

    Object.assign(client, updates);
    return client;
  }

  // Portal Dashboard
  async getPortalDashboard(clientId: string): Promise<{
    profile: ClientProfile | undefined;
    stats: {
      totalInvoices: number;
      unpaidInvoices: number;
      totalDocuments: number;
      unreadMessages: number;
      unreadNotifications: number;
    };
    recentInvoices: ClientInvoice[];
    recentDocuments: ClientDocument[];
    recentNotifications: ClientNotification[];
  }> {
    const profile = await this.getClientProfile(clientId);
    const clientInvoices = this.invoices.filter(i => i.clientId === clientId);
    const clientDocuments = this.documents.filter(d => d.clientId === clientId);
    const clientMessages = this.messages.filter(m => m.clientId === clientId);
    const clientNotifications = this.notifications.filter(n => n.clientId === clientId);

    return {
      profile,
      stats: {
        totalInvoices: clientInvoices.length,
        unpaidInvoices: clientInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').length,
        totalDocuments: clientDocuments.length,
        unreadMessages: clientMessages.filter(m => !m.readAt && m.senderType === 'staff').length,
        unreadNotifications: clientNotifications.filter(n => !n.readAt).length,
      },
      recentInvoices: clientInvoices.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime()).slice(0, 5),
      recentDocuments: clientDocuments.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()).slice(0, 5),
      recentNotifications: clientNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
    };
  }

  // Documents
  async getClientDocuments(
    clientId: string,
    type?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ documents: ClientDocument[]; total: number }> {
    let filtered = this.documents.filter(d => d.clientId === clientId);
    if (type) {
      filtered = filtered.filter(d => d.type === type);
    }
    filtered.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    return {
      documents: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  async getDocumentById(clientId: string, documentId: string): Promise<ClientDocument | undefined> {
    return this.documents.find(d => d.id === documentId && d.clientId === clientId);
  }

  async uploadDocument(
    clientId: string,
    documentData: {
      name: string;
      type: ClientDocument['type'];
      category: string;
      tags?: string[];
    },
  ): Promise<ClientDocument> {
    const document: ClientDocument = {
      id: `doc-${Date.now()}`,
      clientId,
      name: documentData.name,
      type: documentData.type,
      category: documentData.category,
      fileUrl: `/documents/${Date.now()}.pdf`,
      fileSize: 0,
      mimeType: 'application/pdf',
      uploadedAt: new Date(),
      uploadedBy: 'Client',
      status: 'pending',
      tags: documentData.tags || [],
    };
    this.documents.push(document);
    return document;
  }

  // Invoices
  async getClientInvoices(
    clientId: string,
    status?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ invoices: ClientInvoice[]; total: number }> {
    let filtered = this.invoices.filter(i => i.clientId === clientId);
    if (status) {
      filtered = filtered.filter(i => i.status === status);
    }
    filtered.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());

    return {
      invoices: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  async getInvoiceById(clientId: string, invoiceId: string): Promise<ClientInvoice | undefined> {
    return this.invoices.find(i => i.id === invoiceId && i.clientId === clientId);
  }

  async getInvoiceSummary(clientId: string): Promise<{
    totalPaid: number;
    totalUnpaid: number;
    totalOverdue: number;
    invoicesByStatus: Record<string, number>;
  }> {
    const clientInvoices = this.invoices.filter(i => i.clientId === clientId);

    return {
      totalPaid: clientInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount + i.vatAmount, 0),
      totalUnpaid: clientInvoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.amount + i.vatAmount, 0),
      totalOverdue: clientInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount + i.vatAmount, 0),
      invoicesByStatus: clientInvoices.reduce((acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Account Statements
  async getStatements(clientId: string): Promise<ClientStatement[]> {
    return this.statements.filter(s => s.clientId === clientId);
  }

  async generateStatement(
    clientId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ClientStatement> {
    const clientInvoices = this.invoices.filter(
      i => i.clientId === clientId && i.issueDate >= periodStart && i.issueDate <= periodEnd,
    );

    const statement: ClientStatement = {
      id: `stmt-${Date.now()}`,
      clientId,
      periodStart,
      periodEnd,
      openingBalance: 0,
      closingBalance: clientInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount + i.vatAmount, 0),
      totalDebits: clientInvoices.reduce((sum, i) => sum + i.amount + i.vatAmount, 0),
      totalCredits: clientInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount + i.vatAmount, 0),
      transactions: clientInvoices.map(i => ({
        date: i.issueDate,
        description: `Invoice ${i.number}`,
        reference: i.number,
        debit: i.amount + i.vatAmount,
        credit: i.status === 'paid' ? i.amount + i.vatAmount : 0,
        balance: 0,
      })),
      generatedAt: new Date(),
      pdfUrl: `/statements/stmt-${Date.now()}.pdf`,
    };

    this.statements.push(statement);
    return statement;
  }

  // Messages
  async getMessages(
    clientId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ messages: ClientMessage[]; total: number }> {
    const clientMessages = this.messages
      .filter(m => m.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      messages: clientMessages.slice(offset, offset + limit),
      total: clientMessages.length,
    };
  }

  async sendMessage(
    clientId: string,
    messageData: { subject: string; content: string; attachments?: string[] },
  ): Promise<ClientMessage> {
    const client = this.clients.find(c => c.id === clientId);
    const message: ClientMessage = {
      id: `msg-${Date.now()}`,
      clientId,
      subject: messageData.subject,
      content: messageData.content,
      senderId: clientId,
      senderName: client?.companyName || 'Client',
      senderType: 'client',
      createdAt: new Date(),
      attachments: [],
      status: 'unread',
    };
    this.messages.push(message);
    this.logger.log(`New message from client ${clientId}: ${messageData.subject}`);
    return message;
  }

  async markMessageAsRead(clientId: string, messageId: string): Promise<boolean> {
    const message = this.messages.find(m => m.id === messageId && m.clientId === clientId);
    if (!message) return false;
    message.readAt = new Date();
    message.status = 'read';
    return true;
  }

  // Notifications
  async getNotifications(
    clientId: string,
    unreadOnly = false,
    limit = 20,
  ): Promise<ClientNotification[]> {
    let clientNotifications = this.notifications
      .filter(n => n.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (unreadOnly) {
      clientNotifications = clientNotifications.filter(n => !n.readAt);
    }

    return clientNotifications.slice(0, limit);
  }

  async markNotificationAsRead(clientId: string, notificationId: string): Promise<boolean> {
    const notification = this.notifications.find(n => n.id === notificationId && n.clientId === clientId);
    if (!notification) return false;
    notification.readAt = new Date();
    return true;
  }

  async markAllNotificationsAsRead(clientId: string): Promise<number> {
    const unreadNotifications = this.notifications.filter(n => n.clientId === clientId && !n.readAt);
    unreadNotifications.forEach(n => {
      n.readAt = new Date();
    });
    return unreadNotifications.length;
  }

  // Activity Log
  async getActivityLog(clientId: string, limit = 20): Promise<Array<{
    id: string;
    action: string;
    description: string;
    timestamp: Date;
    ipAddress?: string;
  }>> {
    return [
      { id: '1', action: 'login', description: 'Autentificare în portal', timestamp: new Date(), ipAddress: '192.168.1.1' },
      { id: '2', action: 'view_invoice', description: 'Vizualizare factură FC-2024-1001', timestamp: new Date(Date.now() - 3600000), ipAddress: '192.168.1.1' },
      { id: '3', action: 'download_document', description: 'Descărcare document raport_lunar.pdf', timestamp: new Date(Date.now() - 7200000), ipAddress: '192.168.1.1' },
      { id: '4', action: 'send_message', description: 'Mesaj nou trimis către suport', timestamp: new Date(Date.now() - 86400000), ipAddress: '192.168.1.1' },
    ].slice(0, limit);
  }
}
