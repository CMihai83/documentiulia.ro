import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Developer Portal Service
 * Central hub for API documentation, keys, and resources
 *
 * Features:
 * - API key management
 * - Documentation access
 * - Getting started guides
 * - Changelog and updates
 */

// =================== TYPES ===================

export interface APIKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  keyPrefix: string;
  permissions: APIPermission[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedIPs?: string[];
  allowedOrigins?: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  createdAt: Date;
  createdBy: string;
}

export type APIPermission =
  | 'invoices:read'
  | 'invoices:write'
  | 'partners:read'
  | 'partners:write'
  | 'ocr:process'
  | 'anaf:read'
  | 'anaf:submit'
  | 'reports:read'
  | 'reports:export'
  | 'webhooks:manage'
  | 'full_access';

export interface DocumentationSection {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  order: number;
  tags: string[];
  lastUpdated: Date;
}

export interface GettingStartedGuide {
  id: string;
  title: string;
  description: string;
  steps: GuideStep[];
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface GuideStep {
  order: number;
  title: string;
  description: string;
  code?: string;
  codeLanguage?: string;
  tip?: string;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  date: Date;
  type: 'feature' | 'improvement' | 'bugfix' | 'breaking' | 'deprecation';
  title: string;
  description: string;
  details?: string[];
  affectedEndpoints?: string[];
  migrationGuide?: string;
}

export interface DeveloperResource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'code_sample' | 'tutorial' | 'reference';
  url?: string;
  content?: string;
  language?: string;
  tags: string[];
  views: number;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class DeveloperPortalService {
  private readonly logger = new Logger(DeveloperPortalService.name);

  // Storage
  private apiKeys = new Map<string, APIKey>();
  private documentation: DocumentationSection[] = [];
  private guides: GettingStartedGuide[] = [];
  private changelog: ChangelogEntry[] = [];
  private resources: DeveloperResource[] = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDocumentation();
    this.initializeGuides();
    this.initializeChangelog();
    this.initializeResources();
  }

  private initializeDocumentation(): void {
    this.documentation = [
      {
        id: 'doc-auth',
        title: 'Authentication',
        slug: 'authentication',
        category: 'Getting Started',
        order: 1,
        tags: ['auth', 'security', 'api-keys'],
        lastUpdated: new Date(),
        content: `
# Authentication

DocumentIulia API uses API keys and JWT tokens for authentication.

## API Keys

API keys are used for server-to-server communication. Include your API key in the request header:

\`\`\`
X-API-Key: your_api_key_here
\`\`\`

## JWT Tokens

For user-facing applications, use JWT tokens obtained from the login endpoint:

\`\`\`
Authorization: Bearer your_jwt_token
\`\`\`

## Security Best Practices

- Never expose API keys in client-side code
- Rotate keys periodically
- Use IP allowlists for production keys
- Use the minimum required permissions
        `,
      },
      {
        id: 'doc-invoices',
        title: 'Invoices API',
        slug: 'invoices',
        category: 'API Reference',
        order: 10,
        tags: ['invoices', 'billing', 'e-factura'],
        lastUpdated: new Date(),
        content: `
# Invoices API

Create, manage, and submit invoices to ANAF e-Factura.

## Endpoints

### List Invoices
\`GET /api/v1/invoices\`

Query parameters:
- \`page\` - Page number (default: 1)
- \`limit\` - Items per page (default: 20)
- \`status\` - Filter by status (draft, issued, sent, paid)

### Create Invoice
\`POST /api/v1/invoices\`

Request body:
\`\`\`json
{
  "partnerName": "Partner SRL",
  "partnerCui": "RO12345678",
  "items": [
    {
      "description": "Service",
      "quantity": 1,
      "unitPrice": 1000,
      "vatRate": 19
    }
  ]
}
\`\`\`

### Submit to e-Factura
\`POST /api/v1/anaf/efactura/submit\`

Submits the invoice to ANAF e-Factura system.
        `,
      },
      {
        id: 'doc-partners',
        title: 'Partners API',
        slug: 'partners',
        category: 'API Reference',
        order: 11,
        tags: ['partners', 'customers', 'suppliers'],
        lastUpdated: new Date(),
        content: `
# Partners API

Manage business partners (customers and suppliers).

## Endpoints

### List Partners
\`GET /api/v1/partners\`

### Create Partner
\`POST /api/v1/partners\`

### Get Partner
\`GET /api/v1/partners/{id}\`

### Update Partner
\`PUT /api/v1/partners/{id}\`

### Delete Partner
\`DELETE /api/v1/partners/{id}\`
        `,
      },
      {
        id: 'doc-ocr',
        title: 'OCR API',
        slug: 'ocr',
        category: 'API Reference',
        order: 12,
        tags: ['ocr', 'document-processing', 'ai'],
        lastUpdated: new Date(),
        content: `
# OCR API

Extract data from documents using AI-powered OCR.

## Process Document
\`POST /api/v1/ocr/process\`

Upload a document (PDF, image) and extract structured data.

### Supported Document Types
- invoice
- receipt
- contract

### Response
\`\`\`json
{
  "documentType": "invoice",
  "confidence": 0.95,
  "extractedData": {
    "invoiceNumber": "001",
    "issueDate": "2025-01-15",
    "totalAmount": 1190
  }
}
\`\`\`
        `,
      },
      {
        id: 'doc-webhooks',
        title: 'Webhooks',
        slug: 'webhooks',
        category: 'Integration',
        order: 20,
        tags: ['webhooks', 'events', 'notifications'],
        lastUpdated: new Date(),
        content: `
# Webhooks

Receive real-time notifications when events occur.

## Available Events

- \`invoice.created\` - New invoice created
- \`invoice.issued\` - Invoice issued
- \`invoice.paid\` - Invoice marked as paid
- \`partner.created\` - New partner added
- \`ocr.completed\` - OCR processing finished
- \`anaf.efactura.submitted\` - e-Factura submitted

## Webhook Security

All webhooks include a signature header for verification:

\`\`\`
X-Webhook-Signature: sha256=...
\`\`\`

Verify the signature using your webhook secret.
        `,
      },
      {
        id: 'doc-errors',
        title: 'Error Handling',
        slug: 'errors',
        category: 'Getting Started',
        order: 3,
        tags: ['errors', 'troubleshooting'],
        lastUpdated: new Date(),
        content: `
# Error Handling

## Error Response Format

\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
\`\`\`

## Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Contact support |

## Rate Limiting

Default limits: 100 requests/minute, 10,000 requests/day.
Rate limit headers included in responses.
        `,
      },
    ];

    this.logger.log(`Initialized ${this.documentation.length} documentation sections`);
  }

  private initializeGuides(): void {
    this.guides = [
      {
        id: 'guide-quickstart',
        title: 'Quick Start',
        description: 'Get started with DocumentIulia API in 5 minutes',
        estimatedTime: '5 minutes',
        difficulty: 'beginner',
        tags: ['quickstart', 'setup'],
        steps: [
          {
            order: 1,
            title: 'Get your API key',
            description: 'Create an API key from the Developer Portal',
            tip: 'Use a descriptive name for your API key',
          },
          {
            order: 2,
            title: 'Install the SDK',
            description: 'Install the official SDK for your language',
            code: 'npm install documentiulia-sdk',
            codeLanguage: 'bash',
          },
          {
            order: 3,
            title: 'Initialize the client',
            description: 'Create a client instance with your API key',
            code: `import { DocumentIuliaClient } from 'documentiulia-sdk';

const client = new DocumentIuliaClient({
  apiKey: 'your_api_key'
});`,
            codeLanguage: 'typescript',
          },
          {
            order: 4,
            title: 'Make your first request',
            description: 'List your invoices',
            code: `const invoices = await client.invoices.list();
console.log(invoices);`,
            codeLanguage: 'typescript',
          },
        ],
      },
      {
        id: 'guide-efactura',
        title: 'e-Factura Integration',
        description: 'Submit invoices to ANAF e-Factura system',
        estimatedTime: '15 minutes',
        difficulty: 'intermediate',
        tags: ['anaf', 'e-factura', 'romania'],
        steps: [
          {
            order: 1,
            title: 'Configure ANAF credentials',
            description: 'Add your ANAF SPV credentials in Settings',
          },
          {
            order: 2,
            title: 'Create an invoice',
            description: 'Create an invoice with all required fields',
            code: `const invoice = await client.invoices.create({
  partnerName: 'Partner SRL',
  partnerCui: 'RO12345678',
  items: [{
    description: 'Consulting services',
    quantity: 10,
    unitPrice: 100,
    vatRate: 19
  }]
});`,
            codeLanguage: 'typescript',
          },
          {
            order: 3,
            title: 'Submit to e-Factura',
            description: 'Submit the invoice to ANAF',
            code: `const result = await client.anaf.submitEFactura(invoice.id);
console.log('Index incarcare:', result.indexIncarcare);`,
            codeLanguage: 'typescript',
          },
          {
            order: 4,
            title: 'Check submission status',
            description: 'Monitor the submission status',
            code: `const status = await client.anaf.getStatus(result.indexIncarcare);`,
            codeLanguage: 'typescript',
          },
        ],
      },
      {
        id: 'guide-webhooks',
        title: 'Setting up Webhooks',
        description: 'Receive real-time event notifications',
        estimatedTime: '10 minutes',
        difficulty: 'intermediate',
        tags: ['webhooks', 'events'],
        steps: [
          {
            order: 1,
            title: 'Create webhook endpoint',
            description: 'Create an endpoint in Developer Portal',
          },
          {
            order: 2,
            title: 'Implement webhook handler',
            description: 'Create a route to receive webhooks',
            code: `app.post('/webhooks/documentiulia', (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  // Verify signature
  if (!verifySignature(req.body, signature, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }

  // Handle event
  const { event, data } = req.body;
  console.log('Received event:', event, data);

  res.status(200).send('OK');
});`,
            codeLanguage: 'typescript',
          },
          {
            order: 3,
            title: 'Test your webhook',
            description: 'Use the webhook tester to send test events',
          },
        ],
      },
    ];

    this.logger.log(`Initialized ${this.guides.length} getting started guides`);
  }

  private initializeChangelog(): void {
    this.changelog = [
      {
        id: 'changelog-1.5.0',
        version: '1.5.0',
        date: new Date('2025-01-15'),
        type: 'feature',
        title: 'Developer Portal & SDK Generator',
        description: 'New developer tools for API integration',
        details: [
          'SDK generation for TypeScript, Python, PHP',
          'Interactive API sandbox',
          'Webhook testing tools',
          'Improved documentation',
        ],
      },
      {
        id: 'changelog-1.4.0',
        version: '1.4.0',
        date: new Date('2025-01-01'),
        type: 'feature',
        title: 'Multi-language Support',
        description: 'Platform now supports 5 languages',
        details: [
          'Added German (DE) support',
          'Added French (FR) support',
          'Added Spanish (ES) support',
          'Improved translation system',
        ],
      },
      {
        id: 'changelog-1.3.0',
        version: '1.3.0',
        date: new Date('2024-12-15'),
        type: 'improvement',
        title: 'Performance Improvements',
        description: 'Significant performance optimizations',
        details: [
          '40% faster invoice processing',
          'Reduced API response times',
          'Improved caching',
        ],
      },
      {
        id: 'changelog-1.2.0',
        version: '1.2.0',
        date: new Date('2024-12-01'),
        type: 'feature',
        title: 'e-Factura B2B Support',
        description: 'Full support for ANAF e-Factura B2B',
        details: [
          'B2B invoice submission',
          'Automatic status checking',
          'Error handling improvements',
        ],
        affectedEndpoints: ['/anaf/efactura/submit', '/anaf/efactura/status'],
      },
    ];

    this.logger.log(`Initialized ${this.changelog.length} changelog entries`);
  }

  private initializeResources(): void {
    this.resources = [
      {
        id: 'res-postman',
        title: 'Postman Collection',
        description: 'Import our Postman collection for easy API testing',
        type: 'reference',
        url: 'https://api.documentiulia.ro/postman-collection.json',
        tags: ['postman', 'testing'],
        views: 0,
        createdAt: new Date(),
      },
      {
        id: 'res-openapi',
        title: 'OpenAPI Specification',
        description: 'Complete OpenAPI 3.0 specification',
        type: 'reference',
        url: '/developer/sdk/openapi',
        tags: ['openapi', 'swagger'],
        views: 0,
        createdAt: new Date(),
      },
      {
        id: 'res-video-intro',
        title: 'API Introduction Video',
        description: 'Getting started with DocumentIulia API',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=example',
        tags: ['video', 'tutorial', 'beginner'],
        views: 0,
        createdAt: new Date(),
      },
    ];

    this.logger.log(`Initialized ${this.resources.length} developer resources`);
  }

  // =================== API KEY MANAGEMENT ===================

  async createAPIKey(params: {
    tenantId: string;
    name: string;
    permissions: APIPermission[];
    rateLimit?: { requestsPerMinute: number; requestsPerDay: number };
    allowedIPs?: string[];
    allowedOrigins?: string[];
    expiresInDays?: number;
    createdBy: string;
  }): Promise<APIKey> {
    const keyId = `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const keyValue = this.generateAPIKey();
    const keyPrefix = keyValue.substring(0, 8);

    const apiKey: APIKey = {
      id: keyId,
      tenantId: params.tenantId,
      name: params.name,
      key: keyValue,
      keyPrefix,
      permissions: params.permissions,
      rateLimit: params.rateLimit || { requestsPerMinute: 100, requestsPerDay: 10000 },
      allowedIPs: params.allowedIPs,
      allowedOrigins: params.allowedOrigins,
      isActive: true,
      expiresAt: params.expiresInDays
        ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      usageCount: 0,
      createdAt: new Date(),
      createdBy: params.createdBy,
    };

    this.apiKeys.set(keyId, apiKey);
    this.eventEmitter.emit('apikey.created', { apiKey: { ...apiKey, key: keyPrefix + '...' } });

    this.logger.log(`API key created: ${params.name} (${keyId})`);

    return apiKey;
  }

  async revokeAPIKey(id: string): Promise<void> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    apiKey.isActive = false;
    this.apiKeys.set(id, apiKey);

    this.eventEmitter.emit('apikey.revoked', { apiKeyId: id });
  }

  async updateAPIKey(
    id: string,
    updates: Partial<Pick<APIKey, 'name' | 'permissions' | 'rateLimit' | 'allowedIPs' | 'allowedOrigins'>>,
  ): Promise<APIKey> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    Object.assign(apiKey, updates);
    this.apiKeys.set(id, apiKey);

    return { ...apiKey, key: apiKey.keyPrefix + '...' };
  }

  async validateAPIKey(key: string): Promise<{ valid: boolean; apiKey?: APIKey; error?: string }> {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.key === key) {
        if (!apiKey.isActive) {
          return { valid: false, error: 'API key is revoked' };
        }
        if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
          return { valid: false, error: 'API key has expired' };
        }

        // Update usage
        apiKey.lastUsedAt = new Date();
        apiKey.usageCount++;
        this.apiKeys.set(apiKey.id, apiKey);

        return { valid: true, apiKey };
      }
    }
    return { valid: false, error: 'Invalid API key' };
  }

  private generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'di_';
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  async getAPIKeys(tenantId: string): Promise<APIKey[]> {
    const keys = Array.from(this.apiKeys.values())
      .filter(k => k.tenantId === tenantId)
      .map(k => ({ ...k, key: k.keyPrefix + '...' })); // Mask the key

    return keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAPIKey(id: string): Promise<APIKey | null> {
    const key = this.apiKeys.get(id);
    if (!key) return null;
    return { ...key, key: key.keyPrefix + '...' };
  }

  // =================== DOCUMENTATION ===================

  async getDocumentation(): Promise<DocumentationSection[]> {
    return this.documentation.sort((a, b) => a.order - b.order);
  }

  async getDocumentationBySlug(slug: string): Promise<DocumentationSection | null> {
    return this.documentation.find(d => d.slug === slug) || null;
  }

  async getDocumentationByCategory(): Promise<Record<string, DocumentationSection[]>> {
    const byCategory: Record<string, DocumentationSection[]> = {};
    for (const doc of this.documentation) {
      if (!byCategory[doc.category]) {
        byCategory[doc.category] = [];
      }
      byCategory[doc.category].push(doc);
    }
    return byCategory;
  }

  async searchDocumentation(query: string): Promise<DocumentationSection[]> {
    const lowerQuery = query.toLowerCase();
    return this.documentation.filter(
      d =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.content.toLowerCase().includes(lowerQuery) ||
        d.tags.some(t => t.toLowerCase().includes(lowerQuery)),
    );
  }

  // =================== GUIDES ===================

  async getGuides(): Promise<GettingStartedGuide[]> {
    return this.guides;
  }

  async getGuide(id: string): Promise<GettingStartedGuide | null> {
    return this.guides.find(g => g.id === id) || null;
  }

  async getGuidesByDifficulty(difficulty: GettingStartedGuide['difficulty']): Promise<GettingStartedGuide[]> {
    return this.guides.filter(g => g.difficulty === difficulty);
  }

  // =================== CHANGELOG ===================

  async getChangelog(limit?: number): Promise<ChangelogEntry[]> {
    const sorted = this.changelog.sort((a, b) => b.date.getTime() - a.date.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async getChangelogByVersion(version: string): Promise<ChangelogEntry | null> {
    return this.changelog.find(c => c.version === version) || null;
  }

  async getChangelogByType(type: ChangelogEntry['type']): Promise<ChangelogEntry[]> {
    return this.changelog.filter(c => c.type === type);
  }

  // =================== RESOURCES ===================

  async getResources(): Promise<DeveloperResource[]> {
    return this.resources;
  }

  async getResourcesByType(type: DeveloperResource['type']): Promise<DeveloperResource[]> {
    return this.resources.filter(r => r.type === type);
  }

  async trackResourceView(id: string): Promise<void> {
    const resource = this.resources.find(r => r.id === id);
    if (resource) {
      resource.views++;
    }
  }

  // =================== PORTAL OVERVIEW ===================

  async getPortalOverview(tenantId: string): Promise<{
    apiKeys: { total: number; active: number };
    documentation: { sections: number; categories: number };
    guides: { total: number };
    changelog: { latestVersion: string; latestDate: Date };
  }> {
    const keys = Array.from(this.apiKeys.values()).filter(k => k.tenantId === tenantId);
    const categories = new Set(this.documentation.map(d => d.category));
    const latestChangelog = this.changelog.sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    return {
      apiKeys: {
        total: keys.length,
        active: keys.filter(k => k.isActive).length,
      },
      documentation: {
        sections: this.documentation.length,
        categories: categories.size,
      },
      guides: {
        total: this.guides.length,
      },
      changelog: {
        latestVersion: latestChangelog?.version || '1.0.0',
        latestDate: latestChangelog?.date || new Date(),
      },
    };
  }

  // =================== AVAILABLE PERMISSIONS ===================

  getAvailablePermissions(): Array<{ permission: APIPermission; description: string; category: string }> {
    return [
      { permission: 'invoices:read', description: 'Read invoices', category: 'Invoices' },
      { permission: 'invoices:write', description: 'Create and update invoices', category: 'Invoices' },
      { permission: 'partners:read', description: 'Read partners', category: 'Partners' },
      { permission: 'partners:write', description: 'Create and update partners', category: 'Partners' },
      { permission: 'ocr:process', description: 'Process documents with OCR', category: 'OCR' },
      { permission: 'anaf:read', description: 'Read ANAF submission status', category: 'ANAF' },
      { permission: 'anaf:submit', description: 'Submit to ANAF e-Factura', category: 'ANAF' },
      { permission: 'reports:read', description: 'View reports', category: 'Reports' },
      { permission: 'reports:export', description: 'Export reports', category: 'Reports' },
      { permission: 'webhooks:manage', description: 'Manage webhook endpoints', category: 'Webhooks' },
      { permission: 'full_access', description: 'Full API access', category: 'Admin' },
    ];
  }
}
