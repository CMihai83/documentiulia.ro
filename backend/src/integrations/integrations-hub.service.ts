import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Integrations Hub Service
 * Central management for all third-party integrations
 *
 * Features:
 * - Integration catalog
 * - Connection management
 * - Sync status tracking
 * - Data flow monitoring
 */

// =================== TYPES ===================

export interface Integration {
  id: string;
  name: string;
  slug: string;
  category: IntegrationCategory;
  description: string;
  icon: string;
  website: string;
  features: string[];
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  status: 'available' | 'coming_soon' | 'beta' | 'deprecated';
  setupInstructions?: string;
  documentationUrl?: string;
  supportedActions: IntegrationAction[];
  supportedTriggers: IntegrationTrigger[];
  requiredScopes?: string[];
  pricing?: 'free' | 'paid' | 'freemium';
}

export type IntegrationCategory =
  | 'accounting'
  | 'banking'
  | 'crm'
  | 'ecommerce'
  | 'email'
  | 'erp'
  | 'hr'
  | 'marketing'
  | 'payments'
  | 'productivity'
  | 'storage'
  | 'tax'
  | 'communication';

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface IntegrationTrigger {
  id: string;
  name: string;
  description: string;
  payloadSchema: Record<string, any>;
}

export interface IntegrationConnection {
  id: string;
  tenantId: string;
  integrationId: string;
  integrationName: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  credentials: Record<string, any>; // Encrypted
  settings: Record<string, any>;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  syncErrors?: string[];
  syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastDataCount?: number;
  };
  enabledActions: string[];
  enabledTriggers: string[];
  createdAt: Date;
  updatedAt: Date;
  connectedBy: string;
}

export interface SyncLog {
  id: string;
  connectionId: string;
  tenantId: string;
  type: 'manual' | 'scheduled' | 'webhook';
  direction: 'inbound' | 'outbound' | 'bidirectional';
  status: 'running' | 'success' | 'partial' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors?: Array<{ record: string; error: string }>;
  metadata?: Record<string, any>;
}

export interface DataFlow {
  id: string;
  connectionId: string;
  tenantId: string;
  name: string;
  description?: string;
  sourceEntity: string;
  targetEntity: string;
  mappings: FieldMapping[];
  transformations?: DataTransformation[];
  schedule?: string; // Cron expression
  isActive: boolean;
  lastRunAt?: Date;
  createdAt: Date;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  defaultValue?: any;
  required: boolean;
}

export interface DataTransformation {
  field: string;
  type: 'format' | 'convert' | 'calculate' | 'lookup';
  config: Record<string, any>;
}

// =================== SERVICE ===================

@Injectable()
export class IntegrationsHubService {
  private readonly logger = new Logger(IntegrationsHubService.name);

  // Storage
  private integrations = new Map<string, Integration>();
  private connections = new Map<string, IntegrationConnection>();
  private syncLogs: SyncLog[] = [];
  private dataFlows = new Map<string, DataFlow>();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeIntegrations();
  }

  private initializeIntegrations(): void {
    const integrationsList: Integration[] = [
      // Accounting
      {
        id: 'saga-accounting',
        name: 'SAGA Accounting',
        slug: 'saga',
        category: 'accounting',
        description: 'Romanian accounting software integration for invoices, inventory, and payroll',
        icon: 'saga-icon',
        website: 'https://saga.ro',
        features: ['Invoice sync', 'Inventory management', 'Payroll integration', 'SAF-T export'],
        authType: 'api_key',
        status: 'available',
        supportedActions: [
          { id: 'sync-invoices', name: 'Sync Invoices', description: 'Sync invoices to SAGA', inputSchema: {}, outputSchema: {} },
          { id: 'sync-inventory', name: 'Sync Inventory', description: 'Sync inventory items', inputSchema: {}, outputSchema: {} },
          { id: 'export-saft', name: 'Export SAF-T', description: 'Export SAF-T XML', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'invoice-created', name: 'Invoice Created', description: 'Triggered when invoice is created in SAGA', payloadSchema: {} },
        ],
        pricing: 'paid',
      },
      {
        id: 'quickbooks',
        name: 'QuickBooks',
        slug: 'quickbooks',
        category: 'accounting',
        description: 'Connect with QuickBooks Online for accounting sync',
        icon: 'quickbooks-icon',
        website: 'https://quickbooks.intuit.com',
        features: ['Invoice sync', 'Expense tracking', 'Reports', 'Bank feeds'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'create-invoice', name: 'Create Invoice', description: 'Create invoice in QuickBooks', inputSchema: {}, outputSchema: {} },
          { id: 'sync-customers', name: 'Sync Customers', description: 'Sync customer data', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'payment-received', name: 'Payment Received', description: 'Triggered on payment', payloadSchema: {} },
        ],
        requiredScopes: ['com.intuit.quickbooks.accounting'],
        pricing: 'paid',
      },
      {
        id: 'xero',
        name: 'Xero',
        slug: 'xero',
        category: 'accounting',
        description: 'Cloud accounting software for small businesses',
        icon: 'xero-icon',
        website: 'https://xero.com',
        features: ['Invoicing', 'Bank reconciliation', 'Payroll', 'Inventory'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'create-invoice', name: 'Create Invoice', description: 'Create invoice in Xero', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [],
        requiredScopes: ['accounting.transactions', 'accounting.contacts'],
        pricing: 'paid',
      },
      // Banking
      {
        id: 'romanian-banks',
        name: 'Romanian Banks (PSD2)',
        slug: 'romanian-banks',
        category: 'banking',
        description: 'Connect Romanian bank accounts via PSD2 Open Banking',
        icon: 'bank-icon',
        website: '',
        features: ['Account balance', 'Transaction history', 'Payment initiation'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'get-balance', name: 'Get Balance', description: 'Get account balance', inputSchema: {}, outputSchema: {} },
          { id: 'get-transactions', name: 'Get Transactions', description: 'Fetch transactions', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'new-transaction', name: 'New Transaction', description: 'Triggered on new bank transaction', payloadSchema: {} },
        ],
        pricing: 'free',
      },
      {
        id: 'stripe',
        name: 'Stripe',
        slug: 'stripe',
        category: 'payments',
        description: 'Payment processing and subscription management',
        icon: 'stripe-icon',
        website: 'https://stripe.com',
        features: ['Payment processing', 'Subscriptions', 'Invoicing', 'Connect'],
        authType: 'api_key',
        status: 'available',
        supportedActions: [
          { id: 'create-payment', name: 'Create Payment', description: 'Process payment', inputSchema: {}, outputSchema: {} },
          { id: 'create-subscription', name: 'Create Subscription', description: 'Create subscription', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'payment-succeeded', name: 'Payment Succeeded', description: 'Triggered on successful payment', payloadSchema: {} },
          { id: 'subscription-created', name: 'Subscription Created', description: 'Triggered on new subscription', payloadSchema: {} },
        ],
        pricing: 'freemium',
      },
      // CRM
      {
        id: 'salesforce',
        name: 'Salesforce',
        slug: 'salesforce',
        category: 'crm',
        description: 'Enterprise CRM platform integration',
        icon: 'salesforce-icon',
        website: 'https://salesforce.com',
        features: ['Contact sync', 'Lead management', 'Opportunity tracking', 'Reports'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'sync-contacts', name: 'Sync Contacts', description: 'Sync contacts to Salesforce', inputSchema: {}, outputSchema: {} },
          { id: 'create-lead', name: 'Create Lead', description: 'Create new lead', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'lead-converted', name: 'Lead Converted', description: 'Triggered when lead converts', payloadSchema: {} },
        ],
        requiredScopes: ['api', 'refresh_token'],
        pricing: 'paid',
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        slug: 'hubspot',
        category: 'crm',
        description: 'All-in-one CRM, marketing, and sales platform',
        icon: 'hubspot-icon',
        website: 'https://hubspot.com',
        features: ['Contact management', 'Email tracking', 'Deal pipeline', 'Marketing automation'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'sync-contacts', name: 'Sync Contacts', description: 'Sync contacts', inputSchema: {}, outputSchema: {} },
          { id: 'create-deal', name: 'Create Deal', description: 'Create deal', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'deal-won', name: 'Deal Won', description: 'Triggered when deal is won', payloadSchema: {} },
        ],
        requiredScopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
        pricing: 'freemium',
      },
      // E-commerce
      {
        id: 'shopify',
        name: 'Shopify',
        slug: 'shopify',
        category: 'ecommerce',
        description: 'E-commerce platform integration',
        icon: 'shopify-icon',
        website: 'https://shopify.com',
        features: ['Order sync', 'Product catalog', 'Inventory management', 'Customer data'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'sync-orders', name: 'Sync Orders', description: 'Import orders', inputSchema: {}, outputSchema: {} },
          { id: 'update-inventory', name: 'Update Inventory', description: 'Update stock levels', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'order-created', name: 'Order Created', description: 'Triggered on new order', payloadSchema: {} },
        ],
        requiredScopes: ['read_orders', 'read_products', 'write_inventory'],
        pricing: 'paid',
      },
      {
        id: 'woocommerce',
        name: 'WooCommerce',
        slug: 'woocommerce',
        category: 'ecommerce',
        description: 'WordPress e-commerce plugin integration',
        icon: 'woocommerce-icon',
        website: 'https://woocommerce.com',
        features: ['Order sync', 'Product management', 'Customer import'],
        authType: 'api_key',
        status: 'available',
        supportedActions: [
          { id: 'sync-orders', name: 'Sync Orders', description: 'Import WooCommerce orders', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'order-completed', name: 'Order Completed', description: 'Triggered on order completion', payloadSchema: {} },
        ],
        pricing: 'free',
      },
      // Email & Marketing
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        slug: 'mailchimp',
        category: 'email',
        description: 'Email marketing and automation platform',
        icon: 'mailchimp-icon',
        website: 'https://mailchimp.com',
        features: ['Email campaigns', 'Audience sync', 'Automation', 'Analytics'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'sync-contacts', name: 'Sync Contacts', description: 'Sync contacts to audience', inputSchema: {}, outputSchema: {} },
          { id: 'send-campaign', name: 'Send Campaign', description: 'Trigger email campaign', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'email-opened', name: 'Email Opened', description: 'Triggered when email is opened', payloadSchema: {} },
        ],
        pricing: 'freemium',
      },
      {
        id: 'sendgrid',
        name: 'SendGrid',
        slug: 'sendgrid',
        category: 'email',
        description: 'Transactional and marketing email service',
        icon: 'sendgrid-icon',
        website: 'https://sendgrid.com',
        features: ['Transactional email', 'Marketing campaigns', 'Email API', 'Analytics'],
        authType: 'api_key',
        status: 'available',
        supportedActions: [
          { id: 'send-email', name: 'Send Email', description: 'Send transactional email', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'email-delivered', name: 'Email Delivered', description: 'Triggered on delivery', payloadSchema: {} },
        ],
        pricing: 'freemium',
      },
      // Cloud Storage
      {
        id: 'google-drive',
        name: 'Google Drive',
        slug: 'google-drive',
        category: 'storage',
        description: 'Cloud storage and file management',
        icon: 'gdrive-icon',
        website: 'https://drive.google.com',
        features: ['File upload', 'Folder sync', 'Document backup', 'Sharing'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'upload-file', name: 'Upload File', description: 'Upload file to Drive', inputSchema: {}, outputSchema: {} },
          { id: 'backup-documents', name: 'Backup Documents', description: 'Backup to Drive', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [],
        requiredScopes: ['https://www.googleapis.com/auth/drive.file'],
        pricing: 'freemium',
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        slug: 'dropbox',
        category: 'storage',
        description: 'Cloud storage and collaboration',
        icon: 'dropbox-icon',
        website: 'https://dropbox.com',
        features: ['File sync', 'Backup', 'Team folders'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'upload-file', name: 'Upload File', description: 'Upload to Dropbox', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [],
        requiredScopes: ['files.content.write', 'files.content.read'],
        pricing: 'freemium',
      },
      // Communication
      {
        id: 'slack',
        name: 'Slack',
        slug: 'slack',
        category: 'communication',
        description: 'Team communication and notifications',
        icon: 'slack-icon',
        website: 'https://slack.com',
        features: ['Notifications', 'Channel messages', 'Bot integration'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'send-message', name: 'Send Message', description: 'Post message to channel', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [],
        requiredScopes: ['chat:write', 'channels:read'],
        pricing: 'freemium',
      },
      {
        id: 'microsoft-teams',
        name: 'Microsoft Teams',
        slug: 'ms-teams',
        category: 'communication',
        description: 'Microsoft Teams notifications and integration',
        icon: 'teams-icon',
        website: 'https://teams.microsoft.com',
        features: ['Channel notifications', 'Team messages'],
        authType: 'oauth2',
        status: 'available',
        supportedActions: [
          { id: 'send-message', name: 'Send Message', description: 'Post to Teams', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [],
        requiredScopes: ['ChannelMessage.Send'],
        pricing: 'freemium',
      },
      // Tax
      {
        id: 'anaf-efactura',
        name: 'ANAF e-Factura',
        slug: 'anaf-efactura',
        category: 'tax',
        description: 'Romanian tax authority e-Invoice system',
        icon: 'anaf-icon',
        website: 'https://www.anaf.ro',
        features: ['e-Factura submission', 'Status checking', 'Download responses'],
        authType: 'custom',
        status: 'available',
        supportedActions: [
          { id: 'submit-invoice', name: 'Submit Invoice', description: 'Submit to e-Factura', inputSchema: {}, outputSchema: {} },
          { id: 'check-status', name: 'Check Status', description: 'Check submission status', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [
          { id: 'invoice-accepted', name: 'Invoice Accepted', description: 'Triggered when ANAF accepts', payloadSchema: {} },
        ],
        pricing: 'free',
      },
      // Productivity
      {
        id: 'zapier',
        name: 'Zapier',
        slug: 'zapier',
        category: 'productivity',
        description: 'Connect to 5000+ apps via Zapier',
        icon: 'zapier-icon',
        website: 'https://zapier.com',
        features: ['Workflow automation', 'Multi-app triggers', 'Custom integrations'],
        authType: 'api_key',
        status: 'available',
        supportedActions: [
          { id: 'trigger-zap', name: 'Trigger Zap', description: 'Trigger a Zapier workflow', inputSchema: {}, outputSchema: {} },
        ],
        supportedTriggers: [],
        pricing: 'freemium',
      },
    ];

    for (const integration of integrationsList) {
      this.integrations.set(integration.id, integration);
    }

    this.logger.log(`Initialized ${this.integrations.size} integrations`);
  }

  // =================== CATALOG ===================

  async getIntegrations(filters?: {
    category?: IntegrationCategory;
    status?: Integration['status'];
    search?: string;
  }): Promise<Integration[]> {
    let integrations = Array.from(this.integrations.values());

    if (filters?.category) {
      integrations = integrations.filter(i => i.category === filters.category);
    }
    if (filters?.status) {
      integrations = integrations.filter(i => i.status === filters.status);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      integrations = integrations.filter(
        i =>
          i.name.toLowerCase().includes(search) ||
          i.description.toLowerCase().includes(search) ||
          i.features.some(f => f.toLowerCase().includes(search)),
      );
    }

    return integrations.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getIntegration(id: string): Promise<Integration | null> {
    return this.integrations.get(id) || null;
  }

  async getIntegrationBySlug(slug: string): Promise<Integration | null> {
    for (const integration of this.integrations.values()) {
      if (integration.slug === slug) {
        return integration;
      }
    }
    return null;
  }

  async getCategories(): Promise<Array<{ category: IntegrationCategory; count: number }>> {
    const counts = new Map<IntegrationCategory, number>();
    for (const integration of this.integrations.values()) {
      counts.set(integration.category, (counts.get(integration.category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  // =================== CONNECTIONS ===================

  async createConnection(params: {
    tenantId: string;
    integrationId: string;
    credentials: Record<string, any>;
    settings?: Record<string, any>;
    connectedBy: string;
  }): Promise<IntegrationConnection> {
    const integration = this.integrations.get(params.integrationId);
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const connection: IntegrationConnection = {
      id: connectionId,
      tenantId: params.tenantId,
      integrationId: params.integrationId,
      integrationName: integration.name,
      status: 'pending',
      credentials: params.credentials, // Should be encrypted in production
      settings: params.settings || {},
      syncStats: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
      },
      enabledActions: integration.supportedActions.map(a => a.id),
      enabledTriggers: integration.supportedTriggers.map(t => t.id),
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedBy: params.connectedBy,
    };

    this.connections.set(connectionId, connection);

    // Test connection
    const isValid = await this.testConnection(connectionId);
    connection.status = isValid ? 'active' : 'error';
    this.connections.set(connectionId, connection);

    this.eventEmitter.emit('integration.connected', { connection });
    this.logger.log(`Integration connected: ${integration.name} (${connectionId})`);

    return connection;
  }

  async updateConnection(
    id: string,
    updates: Partial<Pick<IntegrationConnection, 'credentials' | 'settings' | 'enabledActions' | 'enabledTriggers'>>,
  ): Promise<IntegrationConnection> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    Object.assign(connection, updates, { updatedAt: new Date() });
    this.connections.set(id, connection);

    return connection;
  }

  async disconnectIntegration(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    connection.status = 'inactive';
    this.connections.set(id, connection);

    this.eventEmitter.emit('integration.disconnected', { connectionId: id });
  }

  async deleteConnection(id: string): Promise<void> {
    this.connections.delete(id);
  }

  async testConnection(id: string): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // In production, this would test the actual connection
    // Simulating success for now
    return Math.random() > 0.1; // 90% success rate
  }

  async getConnections(tenantId: string): Promise<IntegrationConnection[]> {
    return Array.from(this.connections.values())
      .filter(c => c.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getConnection(id: string): Promise<IntegrationConnection | null> {
    return this.connections.get(id) || null;
  }

  // =================== SYNC ===================

  async triggerSync(params: {
    connectionId: string;
    type: 'manual' | 'scheduled';
    direction?: 'inbound' | 'outbound' | 'bidirectional';
  }): Promise<SyncLog> {
    const connection = this.connections.get(params.connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.status !== 'active') {
      throw new BadRequestException('Connection is not active');
    }

    const syncLog: SyncLog = {
      id: `sync-${Date.now()}`,
      connectionId: params.connectionId,
      tenantId: connection.tenantId,
      type: params.type,
      direction: params.direction || 'bidirectional',
      status: 'running',
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
    };

    this.syncLogs.push(syncLog);

    // Simulate sync process
    setTimeout(() => {
      const processed = Math.floor(Math.random() * 100) + 10;
      const failed = Math.floor(Math.random() * 5);

      syncLog.status = failed > 3 ? 'partial' : 'success';
      syncLog.completedAt = new Date();
      syncLog.recordsProcessed = processed;
      syncLog.recordsSucceeded = processed - failed;
      syncLog.recordsFailed = failed;

      connection.lastSyncAt = new Date();
      connection.lastSyncStatus = syncLog.status;
      connection.syncStats.totalSyncs++;
      if (syncLog.status === 'success') {
        connection.syncStats.successfulSyncs++;
      } else {
        connection.syncStats.failedSyncs++;
      }
      connection.syncStats.lastDataCount = processed;
      this.connections.set(params.connectionId, connection);

      this.eventEmitter.emit('sync.completed', { syncLog });
    }, 2000);

    return syncLog;
  }

  async getSyncLogs(filters?: {
    connectionId?: string;
    tenantId?: string;
    status?: SyncLog['status'];
    limit?: number;
  }): Promise<SyncLog[]> {
    let logs = [...this.syncLogs];

    if (filters?.connectionId) {
      logs = logs.filter(l => l.connectionId === filters.connectionId);
    }
    if (filters?.tenantId) {
      logs = logs.filter(l => l.tenantId === filters.tenantId);
    }
    if (filters?.status) {
      logs = logs.filter(l => l.status === filters.status);
    }

    logs = logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  // =================== DATA FLOWS ===================

  async createDataFlow(params: {
    connectionId: string;
    tenantId: string;
    name: string;
    description?: string;
    sourceEntity: string;
    targetEntity: string;
    mappings: FieldMapping[];
    transformations?: DataTransformation[];
    schedule?: string;
  }): Promise<DataFlow> {
    const connection = this.connections.get(params.connectionId);
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const dataFlow: DataFlow = {
      id: `flow-${Date.now()}`,
      connectionId: params.connectionId,
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      sourceEntity: params.sourceEntity,
      targetEntity: params.targetEntity,
      mappings: params.mappings,
      transformations: params.transformations,
      schedule: params.schedule,
      isActive: true,
      createdAt: new Date(),
    };

    this.dataFlows.set(dataFlow.id, dataFlow);
    return dataFlow;
  }

  async getDataFlows(connectionId: string): Promise<DataFlow[]> {
    return Array.from(this.dataFlows.values())
      .filter(f => f.connectionId === connectionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateDataFlow(
    id: string,
    updates: Partial<Pick<DataFlow, 'name' | 'mappings' | 'transformations' | 'schedule' | 'isActive'>>,
  ): Promise<DataFlow | null> {
    const flow = this.dataFlows.get(id);
    if (!flow) return null;

    Object.assign(flow, updates);
    this.dataFlows.set(id, flow);
    return flow;
  }

  async deleteDataFlow(id: string): Promise<void> {
    this.dataFlows.delete(id);
  }

  // =================== STATS ===================

  async getStats(tenantId?: string): Promise<{
    totalIntegrations: number;
    availableIntegrations: number;
    connectedIntegrations: number;
    activeConnections: number;
    totalSyncs: number;
    successfulSyncs: number;
    integrationsByCategory: Record<string, number>;
  }> {
    let connections = Array.from(this.connections.values());
    if (tenantId) {
      connections = connections.filter(c => c.tenantId === tenantId);
    }

    const integrationsByCategory: Record<string, number> = {};
    for (const integration of this.integrations.values()) {
      integrationsByCategory[integration.category] = (integrationsByCategory[integration.category] || 0) + 1;
    }

    return {
      totalIntegrations: this.integrations.size,
      availableIntegrations: Array.from(this.integrations.values()).filter(i => i.status === 'available').length,
      connectedIntegrations: connections.length,
      activeConnections: connections.filter(c => c.status === 'active').length,
      totalSyncs: connections.reduce((sum, c) => sum + c.syncStats.totalSyncs, 0),
      successfulSyncs: connections.reduce((sum, c) => sum + c.syncStats.successfulSyncs, 0),
      integrationsByCategory,
    };
  }
}
