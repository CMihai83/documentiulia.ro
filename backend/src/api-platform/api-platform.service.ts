import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================
// OPENAPI TYPES
// ============================================

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components: OpenAPIComponents;
  security: OpenAPISecurityRequirement[];
  tags: OpenAPITag[];
}

export interface OpenAPIInfo {
  title: string;
  description: string;
  version: string;
  contact: {
    name: string;
    email: string;
    url: string;
  };
  license: {
    name: string;
    url: string;
  };
  termsOfService: string;
}

export interface OpenAPIServer {
  url: string;
  description: string;
  variables?: Record<string, { default: string; enum?: string[]; description?: string }>;
}

export interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
}

export interface OpenAPIOperation {
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurityRequirement[];
  deprecated?: boolean;
  'x-rate-limit'?: {
    requests: number;
    window: string;
  };
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description: string;
  required: boolean;
  schema: OpenAPISchema;
  example?: any;
}

export interface OpenAPIRequestBody {
  description: string;
  required: boolean;
  content: Record<string, { schema: OpenAPISchema; example?: any }>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: OpenAPISchema; example?: any }>;
  headers?: Record<string, { description: string; schema: OpenAPISchema }>;
}

export interface OpenAPISchema {
  type?: string;
  format?: string;
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  $ref?: string;
  enum?: any[];
  description?: string;
  example?: any;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: any;
}

export interface OpenAPIComponents {
  schemas: Record<string, OpenAPISchema>;
  securitySchemes: Record<string, OpenAPISecurityScheme>;
  parameters?: Record<string, OpenAPIParameter>;
  responses?: Record<string, OpenAPIResponse>;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: OpenAPIOAuthFlow;
    password?: OpenAPIOAuthFlow;
    clientCredentials?: OpenAPIOAuthFlow;
    authorizationCode?: OpenAPIOAuthFlow;
  };
  openIdConnectUrl?: string;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenAPISecurityRequirement {
  [key: string]: string[];
}

export interface OpenAPITag {
  name: string;
  description: string;
  externalDocs?: {
    description: string;
    url: string;
  };
}

// ============================================
// API VERSIONING TYPES
// ============================================

export interface APIVersion {
  version: string;
  status: 'current' | 'deprecated' | 'sunset';
  releaseDate: Date;
  sunsetDate?: Date;
  breaking_changes?: string[];
  changelog: ChangelogEntry[];
}

export interface ChangelogEntry {
  date: Date;
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  description: string;
  endpoints?: string[];
}

// ============================================
// RATE LIMITING TYPES
// ============================================

export interface RateLimitConfig {
  endpoint: string;
  method: string;
  requests: number;
  window: number; // seconds
  burst?: number;
  costPerRequest?: number;
  exemptRoles?: string[];
}

export interface RateLimitStatus {
  endpoint: string;
  clientId: string;
  remaining: number;
  reset: Date;
  limit: number;
  used: number;
}

export interface RateLimitBucket {
  clientId: string;
  endpoint: string;
  tokens: number;
  lastRefill: Date;
  requests: { timestamp: Date; cost: number }[];
}

// ============================================
// SDK TYPES
// ============================================

export interface SDKConfig {
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'go' | 'php' | 'ruby';
  packageName: string;
  version: string;
  author: string;
  repository: string;
  license: string;
}

export interface SDKMethod {
  name: string;
  description: string;
  parameters: SDKParameter[];
  returnType: string;
  endpoint: string;
  method: string;
  example: string;
}

export interface SDKParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface GeneratedSDK {
  language: string;
  files: { path: string; content: string }[];
  packageJson?: string;
  readme: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
  successCount: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  response?: {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };
  deliveredAt?: Date;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  nextRetry?: Date;
  error?: string;
  duration?: number;
}

export interface WebhookEvent {
  type: string;
  description: string;
  schema: OpenAPISchema;
  example: any;
}

@Injectable()
export class ApiPlatformService implements OnModuleInit {
  private readonly logger = new Logger(ApiPlatformService.name);

  // API Versions
  private readonly versions: Map<string, APIVersion> = new Map();
  private currentVersion = 'v1';

  // Rate Limiting
  private readonly rateLimitConfigs: Map<string, RateLimitConfig> = new Map();
  private readonly rateLimitBuckets: Map<string, RateLimitBucket> = new Map();

  // Webhooks
  private readonly webhooks: Map<string, WebhookEndpoint> = new Map();
  private readonly webhookDeliveries: Map<string, WebhookDelivery> = new Map();
  private readonly webhookEvents: Map<string, WebhookEvent> = new Map();

  // OpenAPI cache
  private openAPISpec?: OpenAPISpec;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing API Platform Service');
    this.initializeVersions();
    this.initializeRateLimits();
    this.initializeWebhookEvents();
    this.generateOpenAPISpec();
  }

  // ============================================
  // OPENAPI SPEC GENERATION
  // ============================================

  generateOpenAPISpec(): OpenAPISpec {
    this.openAPISpec = {
      openapi: '3.0.3',
      info: {
        title: 'DocumentIulia API',
        description: 'Comprehensive API for DocumentIulia - AI-powered ERP/Accounting Platform for Romanian SMEs. Includes HR, HSE, Finance, Logistics, LMS, and Freelancer management.',
        version: this.currentVersion,
        contact: {
          name: 'DocumentIulia Support',
          email: 'api@documentiulia.ro',
          url: 'https://documentiulia.ro/support',
        },
        license: {
          name: 'Proprietary',
          url: 'https://documentiulia.ro/terms',
        },
        termsOfService: 'https://documentiulia.ro/terms',
      },
      servers: [
        {
          url: 'https://api.documentiulia.ro/v1',
          description: 'Production server',
        },
        {
          url: 'https://staging-api.documentiulia.ro/v1',
          description: 'Staging server',
        },
        {
          url: 'http://localhost:3000/api/v1',
          description: 'Local development',
        },
      ],
      paths: this.generatePaths(),
      components: this.generateComponents(),
      security: [{ BearerAuth: [] }],
      tags: this.generateTags(),
    };

    return this.openAPISpec;
  }

  private generatePaths(): Record<string, OpenAPIPathItem> {
    const paths: Record<string, OpenAPIPathItem> = {};

    // Finance endpoints
    paths['/finance/invoices'] = {
      get: {
        operationId: 'listInvoices',
        summary: 'List invoices',
        description: 'Retrieve a paginated list of invoices with optional filters',
        tags: ['Finance'],
        parameters: [
          { name: 'page', in: 'query', description: 'Page number', required: false, schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', description: 'Items per page', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'status', in: 'query', description: 'Filter by status', required: false, schema: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue'] } },
        ],
        responses: {
          '200': { description: 'List of invoices', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceList' } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
      post: {
        operationId: 'createInvoice',
        summary: 'Create invoice',
        description: 'Create a new invoice',
        tags: ['Finance'],
        requestBody: {
          description: 'Invoice data',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateInvoice' } } },
        },
        responses: {
          '201': { description: 'Invoice created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 50, window: '1m' },
      },
    };

    // HR endpoints
    paths['/hr/employees'] = {
      get: {
        operationId: 'listEmployees',
        summary: 'List employees',
        description: 'Retrieve a list of employees',
        tags: ['HR'],
        parameters: [
          { name: 'department', in: 'query', description: 'Filter by department', required: false, schema: { type: 'string' } },
          { name: 'status', in: 'query', description: 'Filter by status', required: false, schema: { type: 'string', enum: ['active', 'inactive', 'terminated'] } },
        ],
        responses: {
          '200': { description: 'List of employees', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeList' } } } },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
      post: {
        operationId: 'createEmployee',
        summary: 'Create employee',
        description: 'Onboard a new employee',
        tags: ['HR'],
        requestBody: {
          description: 'Employee data',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEmployee' } } },
        },
        responses: {
          '201': { description: 'Employee created' },
        },
        'x-rate-limit': { requests: 20, window: '1m' },
      },
    };

    // HSE endpoints
    paths['/hse/incidents'] = {
      get: {
        operationId: 'listIncidents',
        summary: 'List incidents',
        description: 'Retrieve HSE incidents',
        tags: ['HSE'],
        responses: {
          '200': { description: 'List of incidents' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
      post: {
        operationId: 'reportIncident',
        summary: 'Report incident',
        description: 'Report a new safety incident',
        tags: ['HSE'],
        requestBody: {
          description: 'Incident details',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateIncident' } } },
        },
        responses: {
          '201': { description: 'Incident reported' },
        },
        'x-rate-limit': { requests: 30, window: '1m' },
      },
    };

    // Logistics endpoints
    paths['/logistics/shipments'] = {
      get: {
        operationId: 'listShipments',
        summary: 'List shipments',
        description: 'Retrieve logistics shipments',
        tags: ['Logistics'],
        responses: {
          '200': { description: 'List of shipments' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // LMS endpoints
    paths['/lms/courses'] = {
      get: {
        operationId: 'listCourses',
        summary: 'List courses',
        description: 'Retrieve available courses',
        tags: ['LMS'],
        responses: {
          '200': { description: 'List of courses' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // Webhooks endpoints
    paths['/webhooks'] = {
      get: {
        operationId: 'listWebhooks',
        summary: 'List webhooks',
        description: 'Retrieve configured webhook endpoints',
        tags: ['Webhooks'],
        responses: {
          '200': { description: 'List of webhooks' },
        },
        'x-rate-limit': { requests: 50, window: '1m' },
      },
      post: {
        operationId: 'createWebhook',
        summary: 'Create webhook',
        description: 'Register a new webhook endpoint',
        tags: ['Webhooks'],
        requestBody: {
          description: 'Webhook configuration',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateWebhook' } } },
        },
        responses: {
          '201': { description: 'Webhook created' },
        },
        'x-rate-limit': { requests: 10, window: '1m' },
      },
    };

    // =================== PARTNER API ENDPOINTS ===================

    // Subscription Plans
    paths['/subscription/plans'] = {
      get: {
        operationId: 'getSubscriptionPlans',
        summary: 'Get subscription plans',
        description: 'Retrieve all available subscription plans (Gratuit, Pro, Business) with pricing in RON',
        tags: ['Partner API', 'Subscription'],
        security: [],
        responses: {
          '200': { description: 'List of subscription plans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PricingPlan' } } } } },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // AI Add-on Packages
    paths['/subscription/ai-packages'] = {
      get: {
        operationId: 'getAiAddOnPackages',
        summary: 'Get AI add-on packages',
        description: 'Retrieve all Premium AI add-on packages (AI Starter, AI Professional, AI Enterprise)',
        tags: ['Partner API', 'Subscription', 'AI'],
        security: [],
        responses: {
          '200': { description: 'List of AI add-on packages', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AiAddOnPackage' } } } } },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    paths['/subscription/ai-packages/{packageId}'] = {
      get: {
        operationId: 'getAiAddOnPackage',
        summary: 'Get specific AI package',
        description: 'Retrieve details for a specific AI add-on package',
        tags: ['Partner API', 'Subscription', 'AI'],
        security: [],
        parameters: [
          { name: 'packageId', in: 'path', description: 'AI package ID (ai-starter, ai-professional, ai-enterprise)', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'AI add-on package details', content: { 'application/json': { schema: { $ref: '#/components/schemas/AiAddOnPackage' } } } },
          '400': { description: 'Invalid package ID' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // AI Subscription Management
    paths['/subscription/ai-addon/subscribe'] = {
      post: {
        operationId: 'subscribeToAiAddOn',
        summary: 'Subscribe to AI add-on',
        description: 'Subscribe organization to a Premium AI add-on package',
        tags: ['Partner API', 'Subscription', 'AI'],
        requestBody: {
          description: 'AI subscription request',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiSubscriptionRequest' } } },
        },
        responses: {
          '200': { description: 'Successfully subscribed', content: { 'application/json': { schema: { $ref: '#/components/schemas/AiSubscriptionResponse' } } } },
          '400': { description: 'Invalid package or organization' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 10, window: '1m' },
      },
    };

    paths['/subscription/ai-addon'] = {
      get: {
        operationId: 'getAiAddOnSubscription',
        summary: 'Get AI subscription status',
        description: 'Get current AI add-on subscription for the organization',
        tags: ['Partner API', 'Subscription', 'AI'],
        responses: {
          '200': { description: 'Current AI subscription status', content: { 'application/json': { schema: { $ref: '#/components/schemas/AiSubscriptionStatus' } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
      delete: {
        operationId: 'cancelAiAddOn',
        summary: 'Cancel AI add-on',
        description: 'Cancel the AI add-on subscription (takes effect at end of billing cycle)',
        tags: ['Partner API', 'Subscription', 'AI'],
        responses: {
          '200': { description: 'Subscription cancelled' },
          '400': { description: 'No active subscription' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 5, window: '1m' },
      },
    };

    // AI Usage Statistics
    paths['/subscription/ai-usage'] = {
      get: {
        operationId: 'getAiUsageStats',
        summary: 'Get AI usage statistics',
        description: 'Retrieve AI feature usage statistics for the current billing period',
        tags: ['Partner API', 'Subscription', 'AI'],
        responses: {
          '200': { description: 'AI usage statistics', content: { 'application/json': { schema: { $ref: '#/components/schemas/AiUsageStats' } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // AI Feature Access Check
    paths['/subscription/ai-feature/check'] = {
      post: {
        operationId: 'checkAiFeatureAccess',
        summary: 'Check AI feature access',
        description: 'Check if organization has access to a specific AI feature',
        tags: ['Partner API', 'Subscription', 'AI'],
        requestBody: {
          description: 'Feature check request',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiFeatureCheckRequest' } } },
        },
        responses: {
          '200': { description: 'Feature access status', content: { 'application/json': { schema: { $ref: '#/components/schemas/AiFeatureAccessResponse' } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 200, window: '1m' },
      },
    };

    // Full Subscription Summary
    paths['/subscription/summary'] = {
      get: {
        operationId: 'getFullSubscriptionSummary',
        summary: 'Get full subscription summary',
        description: 'Get comprehensive subscription summary including base plan, AI add-on, usage, and recommendations',
        tags: ['Partner API', 'Subscription'],
        responses: {
          '200': { description: 'Full subscription summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubscriptionSummary' } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 50, window: '1m' },
      },
    };

    // ANAF Integration Endpoints (Partner)
    paths['/anaf/e-factura/validate'] = {
      post: {
        operationId: 'validateEFactura',
        summary: 'Validate e-Factura',
        description: 'Validate invoice XML against ANAF e-Factura schema before submission',
        tags: ['Partner API', 'ANAF'],
        requestBody: {
          description: 'e-Factura XML validation request',
          required: true,
          content: { 'application/xml': { schema: { type: 'string' } } },
        },
        responses: {
          '200': { description: 'Validation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationResult' } } } },
          '400': { description: 'Invalid XML format' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    paths['/anaf/saft-d406/generate'] = {
      post: {
        operationId: 'generateSaftD406',
        summary: 'Generate SAF-T D406',
        description: 'Generate SAF-T D406 monthly declaration XML for ANAF submission (Order 1783/2021)',
        tags: ['Partner API', 'ANAF'],
        requestBody: {
          description: 'SAF-T generation request',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SaftGenerationRequest' } } },
        },
        responses: {
          '200': { description: 'Generated SAF-T XML', content: { 'application/xml': { schema: { type: 'string' } } } },
          '400': { description: 'Invalid parameters' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 20, window: '1m' },
      },
    };

    // Analytics/Forecasting Partner API
    paths['/analytics/forecasting/dashboard'] = {
      get: {
        operationId: 'getForecastingDashboard',
        summary: 'Get forecasting dashboard',
        description: 'Retrieve comprehensive forecasting dashboard with revenue, expense, and cash flow predictions',
        tags: ['Partner API', 'Analytics'],
        responses: {
          '200': { description: 'Forecasting dashboard data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ForecastingDashboard' } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 50, window: '1m' },
      },
    };

    paths['/analytics/forecasting/dashboard/advanced'] = {
      get: {
        operationId: 'getAdvancedDashboard',
        summary: 'Get advanced analytics dashboard',
        description: 'Retrieve advanced analytics with Prophet-style decomposition and Monte Carlo simulations',
        tags: ['Partner API', 'Analytics', 'AI'],
        responses: {
          '200': { description: 'Advanced analytics data', content: { 'application/json': { schema: { $ref: '#/components/schemas/AdvancedDashboard' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Premium AI feature required' },
        },
        'x-rate-limit': { requests: 30, window: '1m' },
      },
    };

    // =================== PNRR/FUNDS INTEGRATION ENDPOINTS ===================

    // PNRR Programs (public listing)
    paths['/funds/pnrr/programs'] = {
      get: {
        operationId: 'getPnrrPrograms',
        summary: 'Get PNRR funding programs',
        description: 'Retrieve list of available PNRR (Planul Național de Redresare și Reziliență) funding programs for Romanian SMEs. €21.6B total allocation.',
        tags: ['Partner API', 'PNRR', 'Funds'],
        security: [],
        parameters: [
          { name: 'component', in: 'query', description: 'Filter by PNRR component (C1-C15)', required: false, schema: { type: 'string' } },
          { name: 'sector', in: 'query', description: 'Filter by business sector', required: false, schema: { type: 'string' } },
          { name: 'status', in: 'query', description: 'Filter by program status', required: false, schema: { type: 'string', enum: ['open', 'upcoming', 'closed', 'evaluation'] } },
        ],
        responses: {
          '200': { description: 'List of PNRR programs', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PnrrProgram' } } } } },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // PNRR Eligibility Scanner
    paths['/funds/pnrr/eligibility'] = {
      post: {
        operationId: 'checkPnrrEligibility',
        summary: 'Check PNRR eligibility',
        description: 'AI-powered eligibility scanner for PNRR funds. Analyzes company profile against program requirements.',
        tags: ['Partner API', 'PNRR', 'Funds', 'AI'],
        requestBody: {
          description: 'Company profile for eligibility check',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PnrrEligibilityRequest' } } },
        },
        responses: {
          '200': { description: 'Eligibility assessment result', content: { 'application/json': { schema: { $ref: '#/components/schemas/PnrrEligibilityResponse' } } } },
          '400': { description: 'Invalid company profile' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 20, window: '1m' },
      },
    };

    // PNRR Application
    paths['/funds/pnrr/applications'] = {
      get: {
        operationId: 'getPnrrApplications',
        summary: 'List PNRR applications',
        description: 'Retrieve organization PNRR funding applications and their status',
        tags: ['Partner API', 'PNRR', 'Funds'],
        parameters: [
          { name: 'status', in: 'query', description: 'Filter by application status', required: false, schema: { type: 'string', enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'contracted'] } },
        ],
        responses: {
          '200': { description: 'List of applications', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PnrrApplication' } } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 50, window: '1m' },
      },
      post: {
        operationId: 'createPnrrApplication',
        summary: 'Create PNRR application',
        description: 'Start a new PNRR funding application with AI-assisted form filling',
        tags: ['Partner API', 'PNRR', 'Funds'],
        requestBody: {
          description: 'Application data',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePnrrApplication' } } },
        },
        responses: {
          '201': { description: 'Application created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PnrrApplication' } } } },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 10, window: '1m' },
      },
    };

    // PNRR Application by ID
    paths['/funds/pnrr/applications/{applicationId}'] = {
      get: {
        operationId: 'getPnrrApplication',
        summary: 'Get PNRR application details',
        description: 'Retrieve detailed information about a specific PNRR application',
        tags: ['Partner API', 'PNRR', 'Funds'],
        parameters: [
          { name: 'applicationId', in: 'path', description: 'Application ID', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Application details', content: { 'application/json': { schema: { $ref: '#/components/schemas/PnrrApplicationDetail' } } } },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Application not found' },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // PNRR Subsidy Tracking
    paths['/funds/pnrr/subsidies'] = {
      get: {
        operationId: 'getPnrrSubsidies',
        summary: 'Track PNRR subsidies',
        description: 'Track received PNRR subsidies, disbursements, and compliance requirements',
        tags: ['Partner API', 'PNRR', 'Funds'],
        responses: {
          '200': { description: 'Subsidy tracking data', content: { 'application/json': { schema: { $ref: '#/components/schemas/PnrrSubsidyTracking' } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 50, window: '1m' },
      },
    };

    // PNRR Reporting (compliance)
    paths['/funds/pnrr/reports'] = {
      get: {
        operationId: 'getPnrrReports',
        summary: 'List PNRR reports',
        description: 'List compliance reports for PNRR funded projects',
        tags: ['Partner API', 'PNRR', 'Funds'],
        responses: {
          '200': { description: 'List of reports', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PnrrReport' } } } } },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 50, window: '1m' },
      },
      post: {
        operationId: 'generatePnrrReport',
        summary: 'Generate PNRR report',
        description: 'Generate compliance report for PNRR project (progress, financial, technical)',
        tags: ['Partner API', 'PNRR', 'Funds'],
        requestBody: {
          description: 'Report generation parameters',
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GeneratePnrrReport' } } },
        },
        responses: {
          '200': { description: 'Generated report', content: { 'application/json': { schema: { $ref: '#/components/schemas/PnrrReport' } } } },
          '400': { description: 'Invalid parameters' },
          '401': { description: 'Unauthorized' },
        },
        'x-rate-limit': { requests: 10, window: '1m' },
      },
    };

    // Cohesion Funds (EU Structural Funds)
    paths['/funds/cohesion/programs'] = {
      get: {
        operationId: 'getCohesionPrograms',
        summary: 'Get EU Cohesion Fund programs',
        description: 'Retrieve available EU Cohesion Fund / Structural Fund programs for Romania 2021-2027',
        tags: ['Partner API', 'Funds'],
        security: [],
        parameters: [
          { name: 'operationalProgram', in: 'query', description: 'Filter by Operational Program (POC, POCU, etc.)', required: false, schema: { type: 'string' } },
          { name: 'region', in: 'query', description: 'Filter by development region', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of cohesion programs', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CohesionProgram' } } } } },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    // AFIR (Agricultural Funds)
    paths['/funds/afir/measures'] = {
      get: {
        operationId: 'getAfirMeasures',
        summary: 'Get AFIR funding measures',
        description: 'Retrieve AFIR (Agenția pentru Finanțarea Investițiilor Rurale) funding measures for agricultural and rural development',
        tags: ['Partner API', 'Funds'],
        security: [],
        responses: {
          '200': { description: 'List of AFIR measures', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AfirMeasure' } } } } },
        },
        'x-rate-limit': { requests: 100, window: '1m' },
      },
    };

    return paths;
  }

  private generateComponents(): OpenAPIComponents {
    return {
      schemas: {
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            number: { type: 'string' },
            date: { type: 'string', format: 'date' },
            dueDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue'] },
            total: { type: 'number' },
            currency: { type: 'string' },
            customer: { $ref: '#/components/schemas/Customer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/InvoiceItem' } },
          },
          required: ['id', 'number', 'date', 'status', 'total'],
        },
        InvoiceList: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
        CreateInvoice: {
          type: 'object',
          properties: {
            customerId: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CreateInvoiceItem' } },
            dueDate: { type: 'string', format: 'date' },
            notes: { type: 'string' },
          },
          required: ['customerId', 'items'],
        },
        InvoiceItem: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number' },
            vatRate: { type: 'number' },
            total: { type: 'number' },
          },
        },
        CreateInvoiceItem: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number' },
            vatRate: { type: 'number' },
          },
          required: ['description', 'quantity', 'unitPrice'],
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            vatNumber: { type: 'string' },
            address: { type: 'string' },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            department: { type: 'string' },
            position: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'terminated'] },
            startDate: { type: 'string', format: 'date' },
          },
        },
        EmployeeList: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
        CreateEmployee: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            department: { type: 'string' },
            position: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
          },
          required: ['firstName', 'lastName', 'email', 'department', 'position'],
        },
        CreateIncident: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            severity: { type: 'string', enum: ['minor', 'moderate', 'major', 'critical'] },
            location: { type: 'string' },
            description: { type: 'string' },
            involvedPersons: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'severity', 'location', 'description'],
        },
        CreateWebhook: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
          },
          required: ['url', 'events'],
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },

        // =================== PARTNER API SCHEMAS ===================

        // Subscription & Pricing Schemas
        PricingPlan: {
          type: 'object',
          description: 'Subscription plan with pricing in RON',
          properties: {
            tier: { type: 'string', enum: ['Gratuit', 'Pro', 'Business'], description: 'Plan tier' },
            name: { type: 'string', description: 'Plan name in Romanian' },
            nameEn: { type: 'string', description: 'Plan name in English' },
            description: { type: 'string', description: 'Plan description in Romanian' },
            descriptionEn: { type: 'string', description: 'Plan description in English' },
            priceMonthly: { type: 'number', description: 'Monthly price in RON' },
            priceYearly: { type: 'number', description: 'Yearly price in RON (discounted)' },
            features: { type: 'array', items: { type: 'string' }, description: 'List of included features' },
            limits: { $ref: '#/components/schemas/PlanLimits' },
            recommended: { type: 'boolean', description: 'Whether this plan is recommended' },
          },
          required: ['tier', 'name', 'priceMonthly', 'features', 'limits'],
        },
        PlanLimits: {
          type: 'object',
          description: 'Resource limits for a subscription plan',
          properties: {
            invoices: { type: 'integer', description: 'Max invoices per month (-1 for unlimited)' },
            employees: { type: 'integer', description: 'Max employees (-1 for unlimited)' },
            storage: { type: 'string', description: 'Storage limit (e.g., "500MB", "5GB")' },
            apiCalls: { type: 'integer', description: 'Max API calls per month (-1 for unlimited)' },
            users: { type: 'integer', description: 'Max users (-1 for unlimited)' },
            aiFeatures: { type: 'boolean', description: 'Whether AI features are enabled' },
          },
        },

        // AI Add-on Package Schemas
        AiAddOnPackage: {
          type: 'object',
          description: 'Premium AI add-on subscription package',
          properties: {
            id: { type: 'string', description: 'Package identifier (ai-starter, ai-professional, ai-enterprise)' },
            name: { type: 'string', description: 'Package name in Romanian' },
            nameEn: { type: 'string', description: 'Package name in English' },
            description: { type: 'string', description: 'Package description in Romanian' },
            descriptionEn: { type: 'string', description: 'Package description in English' },
            priceMonthly: { type: 'number', description: 'Monthly price in RON' },
            priceYearly: { type: 'number', description: 'Yearly price in RON (discounted)' },
            features: { type: 'array', items: { $ref: '#/components/schemas/AiFeature' } },
            limits: { $ref: '#/components/schemas/AiLimits' },
            recommended: { type: 'boolean', description: 'Whether this package is recommended' },
          },
          required: ['id', 'name', 'priceMonthly', 'features', 'limits'],
        },
        AiFeature: {
          type: 'object',
          description: 'Individual AI feature within a package',
          properties: {
            key: { type: 'string', enum: ['contractAnalysis', 'forecasting', 'anomalyDetection', 'smartCategorization', 'grokAssistant', 'documentSummary'] },
            name: { type: 'string', description: 'Feature name in Romanian' },
            nameEn: { type: 'string', description: 'Feature name in English' },
            description: { type: 'string', description: 'Feature description' },
            enabled: { type: 'boolean', description: 'Whether feature is enabled in this package' },
          },
          required: ['key', 'name', 'enabled'],
        },
        AiLimits: {
          type: 'object',
          description: 'Usage limits for AI features',
          properties: {
            contractAnalysisPerMonth: { type: 'integer', description: 'Contract analyses per month' },
            forecastingQueriesPerMonth: { type: 'integer', description: 'Forecasting queries per month' },
            anomalyScansPerMonth: { type: 'integer', description: 'Anomaly detection scans per month' },
            grokQueriesPerMonth: { type: 'integer', description: 'Grok assistant queries per month' },
            documentSummariesPerMonth: { type: 'integer', description: 'Document summaries per month' },
          },
        },

        // AI Subscription Management Schemas
        AiSubscriptionRequest: {
          type: 'object',
          description: 'Request to subscribe to an AI add-on package',
          properties: {
            packageId: { type: 'string', description: 'AI package ID to subscribe to' },
            billingCycle: { type: 'string', enum: ['monthly', 'yearly'], description: 'Billing cycle preference' },
          },
          required: ['packageId'],
        },
        AiSubscriptionResponse: {
          type: 'object',
          description: 'Response after subscribing to AI add-on',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            subscription: {
              type: 'object',
              properties: {
                packageId: { type: 'string' },
                packageName: { type: 'string' },
                billingCycle: { type: 'string' },
                price: { type: 'number' },
                startDate: { type: 'string', format: 'date-time' },
                nextBillingDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        AiSubscriptionStatus: {
          type: 'object',
          description: 'Current AI subscription status',
          properties: {
            hasSubscription: { type: 'boolean' },
            packageId: { type: 'string', nullable: true },
            packageName: { type: 'string', nullable: true },
            billingCycle: { type: 'string', enum: ['monthly', 'yearly'], nullable: true },
            currentPeriodStart: { type: 'string', format: 'date-time', nullable: true },
            currentPeriodEnd: { type: 'string', format: 'date-time', nullable: true },
            cancelAtPeriodEnd: { type: 'boolean' },
            features: { type: 'array', items: { $ref: '#/components/schemas/AiFeature' } },
            limits: { $ref: '#/components/schemas/AiLimits' },
          },
        },

        // AI Usage Statistics Schema
        AiUsageStats: {
          type: 'object',
          description: 'AI feature usage statistics for current billing period',
          properties: {
            periodStart: { type: 'string', format: 'date-time' },
            periodEnd: { type: 'string', format: 'date-time' },
            usage: {
              type: 'object',
              properties: {
                contractAnalysis: { $ref: '#/components/schemas/UsageMetric' },
                forecasting: { $ref: '#/components/schemas/UsageMetric' },
                anomalyDetection: { $ref: '#/components/schemas/UsageMetric' },
                smartCategorization: { $ref: '#/components/schemas/UsageMetric' },
                grokAssistant: { $ref: '#/components/schemas/UsageMetric' },
                documentSummary: { $ref: '#/components/schemas/UsageMetric' },
              },
            },
            totalCost: { type: 'number', description: 'Total cost for usage in RON' },
          },
        },
        UsageMetric: {
          type: 'object',
          description: 'Usage metric for a single AI feature',
          properties: {
            used: { type: 'integer', description: 'Number of times feature was used' },
            limit: { type: 'integer', description: 'Maximum allowed uses (-1 for unlimited)' },
            remaining: { type: 'integer', description: 'Remaining uses' },
            percentUsed: { type: 'number', description: 'Percentage of limit used (0-100)' },
          },
        },

        // AI Feature Access Schema
        AiFeatureCheckRequest: {
          type: 'object',
          description: 'Request to check access to an AI feature',
          properties: {
            featureKey: { type: 'string', enum: ['contractAnalysis', 'forecasting', 'anomalyDetection', 'smartCategorization', 'grokAssistant', 'documentSummary'] },
          },
          required: ['featureKey'],
        },
        AiFeatureAccessResponse: {
          type: 'object',
          description: 'Response for AI feature access check',
          properties: {
            hasAccess: { type: 'boolean', description: 'Whether organization has access to the feature' },
            featureKey: { type: 'string' },
            reason: { type: 'string', description: 'Reason if access is denied' },
            usage: {
              type: 'object',
              properties: {
                used: { type: 'integer' },
                limit: { type: 'integer' },
                remaining: { type: 'integer' },
              },
            },
            upgradeOptions: { type: 'array', items: { type: 'string' }, description: 'Available upgrade packages' },
          },
        },

        // Full Subscription Summary Schema
        SubscriptionSummary: {
          type: 'object',
          description: 'Comprehensive subscription summary including base plan and AI add-on',
          properties: {
            organization: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            basePlan: { $ref: '#/components/schemas/PricingPlan' },
            aiAddOn: { $ref: '#/components/schemas/AiSubscriptionStatus' },
            totalMonthlyPrice: { type: 'number', description: 'Total monthly cost in RON' },
            usage: {
              type: 'object',
              properties: {
                base: { type: 'object', description: 'Base plan usage stats' },
                ai: { $ref: '#/components/schemas/AiUsageStats' },
              },
            },
            recommendations: { type: 'array', items: { type: 'string' }, description: 'Upgrade recommendations' },
          },
        },

        // ANAF Integration Schemas
        ValidationResult: {
          type: 'object',
          description: 'e-Factura XML validation result',
          properties: {
            valid: { type: 'boolean', description: 'Whether XML is valid' },
            errors: { type: 'array', items: { $ref: '#/components/schemas/ValidationError' } },
            warnings: { type: 'array', items: { $ref: '#/components/schemas/ValidationWarning' } },
            anafVersion: { type: 'string', description: 'ANAF schema version used for validation' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            path: { type: 'string', description: 'XPath to error location' },
            severity: { type: 'string', enum: ['error', 'critical'] },
          },
        },
        ValidationWarning: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            path: { type: 'string' },
            suggestion: { type: 'string' },
          },
        },
        SaftGenerationRequest: {
          type: 'object',
          description: 'Request to generate SAF-T D406 XML declaration',
          properties: {
            year: { type: 'integer', description: 'Tax year', example: 2025 },
            month: { type: 'integer', minimum: 1, maximum: 12, description: 'Tax month' },
            includeInvoices: { type: 'boolean', default: true },
            includePayments: { type: 'boolean', default: true },
            includeInventory: { type: 'boolean', default: false },
          },
          required: ['year', 'month'],
        },

        // Analytics/Forecasting Schemas
        ForecastingDashboard: {
          type: 'object',
          description: 'Forecasting dashboard data',
          properties: {
            period: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' },
              },
            },
            revenue: { $ref: '#/components/schemas/ForecastMetric' },
            expenses: { $ref: '#/components/schemas/ForecastMetric' },
            cashFlow: { $ref: '#/components/schemas/ForecastMetric' },
            alerts: { type: 'array', items: { $ref: '#/components/schemas/ForecastAlert' } },
          },
        },
        AdvancedDashboard: {
          type: 'object',
          description: 'Advanced analytics dashboard with Prophet-style decomposition',
          properties: {
            decomposition: {
              type: 'object',
              properties: {
                trend: { type: 'array', items: { type: 'number' } },
                seasonal: { type: 'array', items: { type: 'number' } },
                residual: { type: 'array', items: { type: 'number' } },
              },
            },
            monteCarloSimulations: {
              type: 'object',
              properties: {
                scenarios: { type: 'integer' },
                percentiles: {
                  type: 'object',
                  properties: {
                    p10: { type: 'number' },
                    p50: { type: 'number' },
                    p90: { type: 'number' },
                  },
                },
              },
            },
            anomalies: { type: 'array', items: { $ref: '#/components/schemas/Anomaly' } },
            correlations: { type: 'array', items: { $ref: '#/components/schemas/Correlation' } },
          },
        },
        ForecastMetric: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            forecast: { type: 'number' },
            change: { type: 'number', description: 'Percentage change' },
            confidence: { type: 'number', description: 'Confidence level (0-1)' },
            trend: { type: 'string', enum: ['up', 'down', 'stable'] },
            history: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, value: { type: 'number' } } } },
          },
        },
        ForecastAlert: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['warning', 'danger', 'info'] },
            metric: { type: 'string' },
            message: { type: 'string' },
            threshold: { type: 'number' },
            currentValue: { type: 'number' },
            suggestedAction: { type: 'string' },
          },
        },
        Anomaly: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            metric: { type: 'string' },
            expectedValue: { type: 'number' },
            actualValue: { type: 'number' },
            deviation: { type: 'number' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
        },
        Correlation: {
          type: 'object',
          properties: {
            metric1: { type: 'string' },
            metric2: { type: 'string' },
            coefficient: { type: 'number', minimum: -1, maximum: 1 },
            significance: { type: 'string', enum: ['weak', 'moderate', 'strong'] },
          },
        },

        // =================== PNRR/FUNDS SCHEMAS ===================

        // PNRR Program Schema
        PnrrProgram: {
          type: 'object',
          description: 'PNRR (Planul Național de Redresare și Reziliență) funding program',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', description: 'Program code (e.g., C9-I1, C7-R2)' },
            name: { type: 'string', description: 'Program name in Romanian' },
            nameEn: { type: 'string', description: 'Program name in English' },
            component: { type: 'string', description: 'PNRR Component (C1-C15)', example: 'C9 - Suport pentru sectorul privat' },
            description: { type: 'string' },
            totalBudget: { type: 'number', description: 'Total budget in EUR' },
            availableBudget: { type: 'number', description: 'Remaining available budget in EUR' },
            minGrant: { type: 'number', description: 'Minimum grant amount in EUR' },
            maxGrant: { type: 'number', description: 'Maximum grant amount in EUR' },
            cofinancingRate: { type: 'number', description: 'Required co-financing percentage (0-100)' },
            eligibleSectors: { type: 'array', items: { type: 'string' }, description: 'Eligible business sectors (CAEN codes)' },
            eligibleCompanyTypes: { type: 'array', items: { type: 'string' }, description: 'Eligible company types (micro, small, medium, large)' },
            applicationDeadline: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['open', 'upcoming', 'closed', 'evaluation'] },
            implementationPeriod: { type: 'integer', description: 'Maximum implementation period in months' },
            sustainability: { type: 'integer', description: 'Required sustainability period in years' },
            milestones: { type: 'array', items: { $ref: '#/components/schemas/PnrrMilestone' } },
            requiredDocuments: { type: 'array', items: { type: 'string' } },
            evaluationCriteria: { type: 'array', items: { $ref: '#/components/schemas/EvaluationCriterion' } },
          },
          required: ['id', 'code', 'name', 'component', 'status'],
        },
        PnrrMilestone: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            deadline: { type: 'string', format: 'date' },
            description: { type: 'string' },
            deliverables: { type: 'array', items: { type: 'string' } },
          },
        },
        EvaluationCriterion: {
          type: 'object',
          properties: {
            criterion: { type: 'string' },
            maxPoints: { type: 'integer' },
            weight: { type: 'number', description: 'Weight in final score (0-1)' },
          },
        },

        // PNRR Eligibility Schemas
        PnrrEligibilityRequest: {
          type: 'object',
          description: 'Company profile for PNRR eligibility assessment',
          properties: {
            cui: { type: 'string', description: 'CUI (Cod Unic de Identificare)' },
            caenCode: { type: 'string', description: 'Primary CAEN code' },
            secondaryCaenCodes: { type: 'array', items: { type: 'string' } },
            companyType: { type: 'string', enum: ['micro', 'small', 'medium', 'large'] },
            employees: { type: 'integer', description: 'Number of employees' },
            turnover: { type: 'number', description: 'Annual turnover in EUR' },
            totalAssets: { type: 'number', description: 'Total assets in EUR' },
            yearsInOperation: { type: 'integer' },
            region: { type: 'string', description: 'Development region' },
            county: { type: 'string', description: 'County (Județ)' },
            hasDebts: { type: 'boolean', description: 'Has overdue debts to state budget' },
            hasPreviousFunding: { type: 'boolean', description: 'Has received EU funding before' },
            projectDescription: { type: 'string', description: 'Brief project description' },
            requestedAmount: { type: 'number', description: 'Requested funding amount in EUR' },
            programCode: { type: 'string', description: 'Target PNRR program code (optional)' },
          },
          required: ['cui', 'caenCode', 'companyType', 'employees'],
        },
        PnrrEligibilityResponse: {
          type: 'object',
          description: 'PNRR eligibility assessment result',
          properties: {
            eligible: { type: 'boolean', description: 'Overall eligibility status' },
            score: { type: 'number', description: 'Eligibility score (0-100)' },
            matchedPrograms: { type: 'array', items: { $ref: '#/components/schemas/ProgramMatch' } },
            eligibilityCriteria: { type: 'array', items: { $ref: '#/components/schemas/CriterionResult' } },
            recommendations: { type: 'array', items: { type: 'string' }, description: 'AI recommendations for improving eligibility' },
            blockers: { type: 'array', items: { type: 'string' }, description: 'Issues that block eligibility' },
            warnings: { type: 'array', items: { type: 'string' }, description: 'Potential issues to address' },
          },
        },
        ProgramMatch: {
          type: 'object',
          properties: {
            programCode: { type: 'string' },
            programName: { type: 'string' },
            matchScore: { type: 'number', description: 'Match score (0-100)' },
            maxGrant: { type: 'number' },
            applicationDeadline: { type: 'string', format: 'date-time' },
          },
        },
        CriterionResult: {
          type: 'object',
          properties: {
            criterion: { type: 'string' },
            passed: { type: 'boolean' },
            details: { type: 'string' },
          },
        },

        // PNRR Application Schemas
        PnrrApplication: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            applicationNumber: { type: 'string', description: 'Unique application number' },
            programCode: { type: 'string' },
            programName: { type: 'string' },
            projectTitle: { type: 'string' },
            requestedAmount: { type: 'number' },
            status: { type: 'string', enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'contracted'] },
            submittedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            completionPercentage: { type: 'integer', description: 'Form completion percentage' },
          },
        },
        CreatePnrrApplication: {
          type: 'object',
          properties: {
            programCode: { type: 'string', description: 'Target PNRR program code' },
            projectTitle: { type: 'string' },
            projectDescription: { type: 'string' },
            requestedAmount: { type: 'number' },
            cofinancingAmount: { type: 'number' },
            implementationPeriod: { type: 'integer', description: 'Months' },
            objectives: { type: 'array', items: { type: 'string' } },
          },
          required: ['programCode', 'projectTitle', 'requestedAmount'],
        },
        PnrrApplicationDetail: {
          type: 'object',
          description: 'Detailed PNRR application with all sections',
          properties: {
            application: { $ref: '#/components/schemas/PnrrApplication' },
            program: { $ref: '#/components/schemas/PnrrProgram' },
            companyProfile: { type: 'object', description: 'Company information' },
            projectDetails: { type: 'object', description: 'Project description and objectives' },
            budget: { type: 'object', description: 'Budget breakdown' },
            timeline: { type: 'object', description: 'Implementation timeline' },
            documents: { type: 'array', items: { $ref: '#/components/schemas/ApplicationDocument' } },
            validationResults: { type: 'array', items: { $ref: '#/components/schemas/ValidationItem' } },
            auditTrail: { type: 'array', items: { $ref: '#/components/schemas/AuditEntry' } },
          },
        },
        ApplicationDocument: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'uploaded', 'verified', 'rejected'] },
            required: { type: 'boolean' },
            uploadedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        ValidationItem: {
          type: 'object',
          properties: {
            section: { type: 'string' },
            field: { type: 'string' },
            status: { type: 'string', enum: ['valid', 'warning', 'error'] },
            message: { type: 'string' },
          },
        },
        AuditEntry: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            performedBy: { type: 'string' },
            performedAt: { type: 'string', format: 'date-time' },
            details: { type: 'string' },
          },
        },

        // PNRR Subsidy Tracking Schema
        PnrrSubsidyTracking: {
          type: 'object',
          description: 'PNRR subsidy tracking and disbursement information',
          properties: {
            totalContracted: { type: 'number', description: 'Total contracted amount in EUR' },
            totalDisbursed: { type: 'number', description: 'Total disbursed amount in EUR' },
            totalRemaining: { type: 'number', description: 'Remaining amount to be disbursed in EUR' },
            subsidies: { type: 'array', items: { $ref: '#/components/schemas/SubsidyContract' } },
          },
        },
        SubsidyContract: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            contractNumber: { type: 'string' },
            programCode: { type: 'string' },
            projectTitle: { type: 'string' },
            contractedAmount: { type: 'number' },
            disbursedAmount: { type: 'number' },
            contractDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['active', 'completed', 'suspended', 'terminated'] },
            disbursements: { type: 'array', items: { $ref: '#/components/schemas/Disbursement' } },
            nextMilestone: { $ref: '#/components/schemas/PnrrMilestone' },
            complianceStatus: { type: 'string', enum: ['compliant', 'pending_review', 'non_compliant'] },
          },
        },
        Disbursement: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tranche: { type: 'integer' },
            amount: { type: 'number' },
            requestedDate: { type: 'string', format: 'date' },
            disbursedDate: { type: 'string', format: 'date', nullable: true },
            status: { type: 'string', enum: ['pending', 'approved', 'paid', 'rejected'] },
          },
        },

        // PNRR Report Schemas
        PnrrReport: {
          type: 'object',
          description: 'PNRR compliance/progress report',
          properties: {
            id: { type: 'string' },
            contractId: { type: 'string' },
            reportType: { type: 'string', enum: ['progress', 'financial', 'technical', 'final'] },
            period: { type: 'string', description: 'Reporting period' },
            status: { type: 'string', enum: ['draft', 'submitted', 'approved', 'requires_revision'] },
            submittedAt: { type: 'string', format: 'date-time', nullable: true },
            content: { type: 'object', description: 'Report content' },
            attachments: { type: 'array', items: { type: 'string' } },
          },
        },
        GeneratePnrrReport: {
          type: 'object',
          properties: {
            contractId: { type: 'string' },
            reportType: { type: 'string', enum: ['progress', 'financial', 'technical', 'final'] },
            periodStart: { type: 'string', format: 'date' },
            periodEnd: { type: 'string', format: 'date' },
            includeFinancials: { type: 'boolean', default: true },
            includeIndicators: { type: 'boolean', default: true },
          },
          required: ['contractId', 'reportType', 'periodStart', 'periodEnd'],
        },

        // Cohesion Program Schema
        CohesionProgram: {
          type: 'object',
          description: 'EU Cohesion Fund / Structural Fund program',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            name: { type: 'string' },
            operationalProgram: { type: 'string', description: 'Operational Program (POC, POCU, POR, etc.)' },
            description: { type: 'string' },
            totalBudget: { type: 'number' },
            fundType: { type: 'string', enum: ['ERDF', 'ESF', 'CF', 'EAFRD', 'EMFF'] },
            regions: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['open', 'upcoming', 'closed'] },
          },
        },

        // AFIR Measure Schema
        AfirMeasure: {
          type: 'object',
          description: 'AFIR (Agenția pentru Finanțarea Investițiilor Rurale) funding measure',
          properties: {
            id: { type: 'string' },
            code: { type: 'string', description: 'Measure code (e.g., 4.1, 6.1, 6.4)' },
            name: { type: 'string' },
            description: { type: 'string' },
            totalBudget: { type: 'number' },
            maxIntensity: { type: 'number', description: 'Maximum support intensity percentage' },
            eligibleBeneficiaries: { type: 'array', items: { type: 'string' } },
            eligibleActivities: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['open', 'upcoming', 'closed'] },
          },
        },
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token',
        },
        ApiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key for server-to-server communication',
        },
        OAuth2: {
          type: 'oauth2',
          description: 'OAuth 2.0 authorization',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://auth.documentiulia.ro/authorize',
              tokenUrl: 'https://auth.documentiulia.ro/token',
              scopes: {
                'read:invoices': 'Read invoices',
                'write:invoices': 'Create and update invoices',
                'read:employees': 'Read employee data',
                'write:employees': 'Manage employees',
                'read:incidents': 'Read HSE incidents',
                'write:incidents': 'Report incidents',
              },
            },
          },
        },
      },
    };
  }

  private generateTags(): OpenAPITag[] {
    return [
      { name: 'Finance', description: 'Invoice, payment, and financial management' },
      { name: 'HR', description: 'Human resources and employee management' },
      { name: 'HSE', description: 'Health, Safety, and Environment management' },
      { name: 'Logistics', description: 'Shipping, inventory, and supply chain' },
      { name: 'LMS', description: 'Learning management and courses' },
      { name: 'Freelancer', description: 'Freelancer and contractor management' },
      { name: 'Webhooks', description: 'Webhook configuration and management' },
      { name: 'API', description: 'API management and utilities' },
      // Partner API Tags
      {
        name: 'Partner API',
        description: 'Partner integration endpoints for subscription management, AI features, ANAF compliance, and analytics',
        externalDocs: {
          description: 'Partner API Documentation',
          url: 'https://documentiulia.ro/docs/partner-api',
        },
      },
      { name: 'Subscription', description: 'Subscription plans, upgrades, and billing management (Gratuit/Pro/Business tiers)' },
      { name: 'AI', description: 'Premium AI features: contract analysis, forecasting, anomaly detection, Grok assistant, document summarization' },
      { name: 'ANAF', description: 'Romanian tax authority integration: e-Factura, SAF-T D406, SPV compliance (Order 1783/2021, Legea 141/2025)' },
      { name: 'Analytics', description: 'Business intelligence: forecasting dashboards, trend analysis, Monte Carlo simulations' },
      // PNRR/Funds Tags
      {
        name: 'PNRR',
        description: 'Planul Național de Redresare și Reziliență (€21.6B) - eligibility scanning, application management, subsidy tracking, compliance reporting',
        externalDocs: {
          description: 'PNRR Official Portal',
          url: 'https://mfe.gov.ro/pnrr/',
        },
      },
      { name: 'Funds', description: 'EU funding programs: PNRR, Cohesion Funds (POC, POCU, POR), AFIR agricultural/rural development funds' },
    ];
  }

  getOpenAPISpec(): OpenAPISpec {
    if (!this.openAPISpec) {
      this.generateOpenAPISpec();
    }
    return this.openAPISpec!;
  }

  getOpenAPISpecAsJson(): string {
    return JSON.stringify(this.getOpenAPISpec(), null, 2);
  }

  getOpenAPISpecAsYaml(): string {
    const spec = this.getOpenAPISpec();
    return this.jsonToYaml(spec);
  }

  private jsonToYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}-\n${this.jsonToYaml(item, indent + 1)}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;

        if (typeof value === 'object') {
          yaml += `${spaces}${key}:\n${this.jsonToYaml(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
        }
      }
    }

    return yaml;
  }

  // ============================================
  // API VERSIONING
  // ============================================

  private initializeVersions(): void {
    this.versions.set('v1', {
      version: 'v1',
      status: 'current',
      releaseDate: new Date('2025-01-01'),
      changelog: [
        {
          date: new Date('2025-01-01'),
          type: 'added',
          description: 'Initial API release with Finance, HR, HSE, Logistics, LMS modules',
        },
        {
          date: new Date('2025-03-01'),
          type: 'added',
          description: 'Added Freelancer module endpoints',
          endpoints: ['/freelancer/*'],
        },
        {
          date: new Date('2025-06-01'),
          type: 'added',
          description: 'Added Integration and Microservices endpoints',
          endpoints: ['/integration/*', '/microservices/*'],
        },
      ],
    });
  }

  getApiVersion(version: string): APIVersion | undefined {
    return this.versions.get(version);
  }

  getAllApiVersions(): APIVersion[] {
    return Array.from(this.versions.values());
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  createApiVersion(version: Omit<APIVersion, 'changelog'>): APIVersion {
    const fullVersion: APIVersion = {
      ...version,
      changelog: [],
    };

    this.versions.set(version.version, fullVersion);
    return fullVersion;
  }

  deprecateVersion(version: string, sunsetDate: Date): boolean {
    const apiVersion = this.versions.get(version);
    if (!apiVersion) return false;

    apiVersion.status = 'deprecated';
    apiVersion.sunsetDate = sunsetDate;

    return true;
  }

  addChangelogEntry(version: string, entry: Omit<ChangelogEntry, 'date'>): boolean {
    const apiVersion = this.versions.get(version);
    if (!apiVersion) return false;

    apiVersion.changelog.push({
      ...entry,
      date: new Date(),
    });

    return true;
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  private initializeRateLimits(): void {
    const defaultLimits: RateLimitConfig[] = [
      { endpoint: '/finance/*', method: 'GET', requests: 100, window: 60, burst: 20 },
      { endpoint: '/finance/*', method: 'POST', requests: 50, window: 60 },
      { endpoint: '/hr/*', method: 'GET', requests: 100, window: 60 },
      { endpoint: '/hr/*', method: 'POST', requests: 20, window: 60 },
      { endpoint: '/hse/*', method: 'GET', requests: 100, window: 60 },
      { endpoint: '/hse/*', method: 'POST', requests: 30, window: 60 },
      { endpoint: '/logistics/*', method: 'GET', requests: 100, window: 60 },
      { endpoint: '/lms/*', method: 'GET', requests: 100, window: 60 },
      { endpoint: '/webhooks/*', method: 'GET', requests: 50, window: 60 },
      { endpoint: '/webhooks/*', method: 'POST', requests: 10, window: 60 },
    ];

    for (const config of defaultLimits) {
      const key = `${config.method}:${config.endpoint}`;
      this.rateLimitConfigs.set(key, config);
    }
  }

  configureRateLimit(config: RateLimitConfig): void {
    const key = `${config.method}:${config.endpoint}`;
    this.rateLimitConfigs.set(key, config);
  }

  getRateLimitConfig(method: string, endpoint: string): RateLimitConfig | undefined {
    // Try exact match first
    const exactKey = `${method}:${endpoint}`;
    if (this.rateLimitConfigs.has(exactKey)) {
      return this.rateLimitConfigs.get(exactKey);
    }

    // Try wildcard match
    for (const [key, config] of this.rateLimitConfigs) {
      const [configMethod, configEndpoint] = key.split(':');
      if (configMethod !== method) continue;

      const pattern = configEndpoint.replace(/\*/g, '.*');
      if (new RegExp(`^${pattern}$`).test(endpoint)) {
        return config;
      }
    }

    return undefined;
  }

  getAllRateLimitConfigs(): RateLimitConfig[] {
    return Array.from(this.rateLimitConfigs.values());
  }

  checkRateLimit(clientId: string, method: string, endpoint: string): RateLimitStatus {
    const config = this.getRateLimitConfig(method, endpoint);
    if (!config) {
      return {
        endpoint,
        clientId,
        remaining: Infinity,
        reset: new Date(Date.now() + 60000),
        limit: Infinity,
        used: 0,
      };
    }

    const bucketKey = `${clientId}:${method}:${endpoint}`;
    let bucket = this.rateLimitBuckets.get(bucketKey);

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.window * 1000);

    if (!bucket) {
      bucket = {
        clientId,
        endpoint,
        tokens: config.requests,
        lastRefill: now,
        requests: [],
      };
      this.rateLimitBuckets.set(bucketKey, bucket);
    }

    // Remove old requests outside window
    bucket.requests = bucket.requests.filter(r => r.timestamp >= windowStart);

    const used = bucket.requests.reduce((sum, r) => sum + r.cost, 0);
    const remaining = Math.max(0, config.requests - used);

    return {
      endpoint,
      clientId,
      remaining,
      reset: new Date(now.getTime() + config.window * 1000),
      limit: config.requests,
      used,
    };
  }

  consumeRateLimit(clientId: string, method: string, endpoint: string, cost: number = 1): boolean {
    const status = this.checkRateLimit(clientId, method, endpoint);

    if (status.remaining < cost) {
      return false;
    }

    const bucketKey = `${clientId}:${method}:${endpoint}`;
    const bucket = this.rateLimitBuckets.get(bucketKey)!;

    bucket.requests.push({ timestamp: new Date(), cost });

    return true;
  }

  resetRateLimit(clientId: string, endpoint?: string): void {
    if (endpoint) {
      for (const key of this.rateLimitBuckets.keys()) {
        if (key.startsWith(clientId) && key.includes(endpoint)) {
          this.rateLimitBuckets.delete(key);
        }
      }
    } else {
      for (const key of this.rateLimitBuckets.keys()) {
        if (key.startsWith(clientId)) {
          this.rateLimitBuckets.delete(key);
        }
      }
    }
  }

  // ============================================
  // SDK GENERATION
  // ============================================

  generateSDK(config: SDKConfig): GeneratedSDK {
    const spec = this.getOpenAPISpec();

    switch (config.language) {
      case 'typescript':
        return this.generateTypeScriptSDK(config, spec);
      case 'python':
        return this.generatePythonSDK(config, spec);
      default:
        return this.generateTypeScriptSDK(config, spec);
    }
  }

  private generateTypeScriptSDK(config: SDKConfig, spec: OpenAPISpec): GeneratedSDK {
    const clientCode = `
// ${config.packageName} - TypeScript SDK for DocumentIulia API
// Version: ${config.version}
// Generated: ${new Date().toISOString()}

export interface DocumentIuliaConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  timeout?: number;
}

export class DocumentIuliaClient {
  private config: DocumentIuliaConfig;

  constructor(config: DocumentIuliaConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  private async request<T>(method: string, path: string, options?: {
    body?: any;
    query?: Record<string, string>;
  }): Promise<T> {
    const url = new URL(path, this.config.baseUrl);

    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.accessToken) {
      headers['Authorization'] = \`Bearer \${this.config.accessToken}\`;
    } else if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(\`API error: \${response.status}\`);
    }

    return response.json();
  }

  // Finance Module
  finance = {
    listInvoices: (params?: { page?: number; limit?: number; status?: string }) =>
      this.request<any>('GET', '/finance/invoices', { query: params as any }),

    createInvoice: (data: any) =>
      this.request<any>('POST', '/finance/invoices', { body: data }),

    getInvoice: (id: string) =>
      this.request<any>('GET', \`/finance/invoices/\${id}\`),
  };

  // HR Module
  hr = {
    listEmployees: (params?: { department?: string; status?: string }) =>
      this.request<any>('GET', '/hr/employees', { query: params as any }),

    createEmployee: (data: any) =>
      this.request<any>('POST', '/hr/employees', { body: data }),

    getEmployee: (id: string) =>
      this.request<any>('GET', \`/hr/employees/\${id}\`),
  };

  // HSE Module
  hse = {
    listIncidents: () =>
      this.request<any>('GET', '/hse/incidents'),

    reportIncident: (data: any) =>
      this.request<any>('POST', '/hse/incidents', { body: data }),
  };

  // Logistics Module
  logistics = {
    listShipments: () =>
      this.request<any>('GET', '/logistics/shipments'),
  };

  // LMS Module
  lms = {
    listCourses: () =>
      this.request<any>('GET', '/lms/courses'),
  };

  // Webhooks
  webhooks = {
    list: () =>
      this.request<any>('GET', '/webhooks'),

    create: (data: { url: string; events: string[] }) =>
      this.request<any>('POST', '/webhooks', { body: data }),
  };
}

export default DocumentIuliaClient;
`;

    const typesCode = `
// Type definitions for ${config.packageName}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  total: number;
  currency: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  status: 'active' | 'inactive' | 'terminated';
  startDate: string;
}

export interface Incident {
  id: string;
  type: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  location: string;
  description: string;
  status: string;
  reportedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
`;

    const packageJson = JSON.stringify({
      name: config.packageName,
      version: config.version,
      description: 'TypeScript SDK for DocumentIulia API',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      author: config.author,
      license: config.license,
      repository: config.repository,
      keywords: ['documentiulia', 'api', 'sdk', 'erp', 'accounting'],
      dependencies: {},
      devDependencies: {
        typescript: '^5.0.0',
      },
    }, null, 2);

    const readme = `# ${config.packageName}

TypeScript SDK for DocumentIulia API

## Installation

\`\`\`bash
npm install ${config.packageName}
\`\`\`

## Usage

\`\`\`typescript
import DocumentIuliaClient from '${config.packageName}';

const client = new DocumentIuliaClient({
  baseUrl: 'https://api.documentiulia.ro/v1',
  accessToken: 'your-access-token',
});

// List invoices
const invoices = await client.finance.listInvoices({ status: 'paid' });

// Create employee
const employee = await client.hr.createEmployee({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  department: 'Engineering',
  position: 'Developer',
});
\`\`\`

## License

${config.license}
`;

    return {
      language: 'typescript',
      files: [
        { path: 'src/index.ts', content: clientCode },
        { path: 'src/types.ts', content: typesCode },
      ],
      packageJson,
      readme,
    };
  }

  private generatePythonSDK(config: SDKConfig, spec: OpenAPISpec): GeneratedSDK {
    const clientCode = `
# ${config.packageName} - Python SDK for DocumentIulia API
# Version: ${config.version}
# Generated: ${new Date().toISOString()}

import requests
from typing import Optional, Dict, Any, List

class DocumentIuliaClient:
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        timeout: int = 30
    ):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.access_token = access_token
        self.timeout = timeout

        self.finance = FinanceModule(self)
        self.hr = HRModule(self)
        self.hse = HSEModule(self)
        self.logistics = LogisticsModule(self)
        self.lms = LMSModule(self)
        self.webhooks = WebhooksModule(self)

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Any:
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json"}

        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        elif self.api_key:
            headers["X-API-Key"] = self.api_key

        response = requests.request(
            method,
            url,
            headers=headers,
            params=params,
            json=data,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()


class FinanceModule:
    def __init__(self, client: DocumentIuliaClient):
        self.client = client

    def list_invoices(
        self,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        status: Optional[str] = None
    ) -> Dict:
        params = {}
        if page: params['page'] = page
        if limit: params['limit'] = limit
        if status: params['status'] = status
        return self.client._request('GET', '/finance/invoices', params=params)

    def create_invoice(self, data: Dict) -> Dict:
        return self.client._request('POST', '/finance/invoices', data=data)


class HRModule:
    def __init__(self, client: DocumentIuliaClient):
        self.client = client

    def list_employees(
        self,
        department: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict:
        params = {}
        if department: params['department'] = department
        if status: params['status'] = status
        return self.client._request('GET', '/hr/employees', params=params)

    def create_employee(self, data: Dict) -> Dict:
        return self.client._request('POST', '/hr/employees', data=data)


class HSEModule:
    def __init__(self, client: DocumentIuliaClient):
        self.client = client

    def list_incidents(self) -> Dict:
        return self.client._request('GET', '/hse/incidents')

    def report_incident(self, data: Dict) -> Dict:
        return self.client._request('POST', '/hse/incidents', data=data)


class LogisticsModule:
    def __init__(self, client: DocumentIuliaClient):
        self.client = client

    def list_shipments(self) -> Dict:
        return self.client._request('GET', '/logistics/shipments')


class LMSModule:
    def __init__(self, client: DocumentIuliaClient):
        self.client = client

    def list_courses(self) -> Dict:
        return self.client._request('GET', '/lms/courses')


class WebhooksModule:
    def __init__(self, client: DocumentIuliaClient):
        self.client = client

    def list(self) -> Dict:
        return self.client._request('GET', '/webhooks')

    def create(self, url: str, events: List[str]) -> Dict:
        return self.client._request('POST', '/webhooks', data={'url': url, 'events': events})
`;

    const readme = `# ${config.packageName}

Python SDK for DocumentIulia API

## Installation

\`\`\`bash
pip install ${config.packageName}
\`\`\`

## Usage

\`\`\`python
from documentiulia import DocumentIuliaClient

client = DocumentIuliaClient(
    base_url='https://api.documentiulia.ro/v1',
    access_token='your-access-token'
)

# List invoices
invoices = client.finance.list_invoices(status='paid')

# Create employee
employee = client.hr.create_employee({
    'firstName': 'John',
    'lastName': 'Doe',
    'email': 'john@example.com',
    'department': 'Engineering',
    'position': 'Developer',
})
\`\`\`

## License

${config.license}
`;

    return {
      language: 'python',
      files: [
        { path: 'documentiulia/__init__.py', content: clientCode },
      ],
      readme,
    };
  }

  getSupportedSDKLanguages(): string[] {
    return ['typescript', 'javascript', 'python', 'java', 'csharp', 'go', 'php', 'ruby'];
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  private initializeWebhookEvents(): void {
    const events: WebhookEvent[] = [
      {
        type: 'invoice.created',
        description: 'Fired when a new invoice is created',
        schema: { $ref: '#/components/schemas/Invoice' },
        example: { id: 'inv-123', number: 'INV-2025-001', total: 1000 },
      },
      {
        type: 'invoice.paid',
        description: 'Fired when an invoice is marked as paid',
        schema: { $ref: '#/components/schemas/Invoice' },
        example: { id: 'inv-123', status: 'paid', paidAt: '2025-01-15' },
      },
      {
        type: 'employee.created',
        description: 'Fired when a new employee is onboarded',
        schema: { $ref: '#/components/schemas/Employee' },
        example: { id: 'emp-123', firstName: 'John', lastName: 'Doe' },
      },
      {
        type: 'employee.terminated',
        description: 'Fired when an employee is terminated',
        schema: { $ref: '#/components/schemas/Employee' },
        example: { id: 'emp-123', status: 'terminated' },
      },
      {
        type: 'incident.reported',
        description: 'Fired when a safety incident is reported',
        schema: { $ref: '#/components/schemas/Incident' },
        example: { id: 'inc-123', severity: 'major', type: 'injury' },
      },
      {
        type: 'shipment.delivered',
        description: 'Fired when a shipment is delivered',
        schema: { type: 'object' },
        example: { id: 'ship-123', status: 'delivered' },
      },
      {
        type: 'course.completed',
        description: 'Fired when an employee completes a course',
        schema: { type: 'object' },
        example: { employeeId: 'emp-123', courseId: 'course-456', score: 85 },
      },
    ];

    for (const event of events) {
      this.webhookEvents.set(event.type, event);
    }
  }

  createWebhook(data: Omit<WebhookEndpoint, 'id' | 'secret' | 'createdAt' | 'updatedAt' | 'failureCount' | 'successCount'>): WebhookEndpoint {
    const id = this.generateId();
    const secret = this.generateWebhookSecret();

    const webhook: WebhookEndpoint = {
      ...data,
      id,
      secret,
      createdAt: new Date(),
      updatedAt: new Date(),
      failureCount: 0,
      successCount: 0,
    };

    this.webhooks.set(id, webhook);
    return webhook;
  }

  getWebhook(id: string): WebhookEndpoint | undefined {
    return this.webhooks.get(id);
  }

  getAllWebhooks(): WebhookEndpoint[] {
    return Array.from(this.webhooks.values());
  }

  updateWebhook(id: string, updates: Partial<WebhookEndpoint>): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;

    Object.assign(webhook, updates, { updatedAt: new Date() });
    return true;
  }

  deleteWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  regenerateWebhookSecret(id: string): string | undefined {
    const webhook = this.webhooks.get(id);
    if (!webhook) return undefined;

    webhook.secret = this.generateWebhookSecret();
    webhook.updatedAt = new Date();
    return webhook.secret;
  }

  async triggerWebhook(eventType: string, payload: Record<string, any>): Promise<WebhookDelivery[]> {
    const deliveries: WebhookDelivery[] = [];

    for (const webhook of this.webhooks.values()) {
      if (!webhook.enabled) continue;
      if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) continue;

      const delivery: WebhookDelivery = {
        id: this.generateId(),
        webhookId: webhook.id,
        event: eventType,
        payload,
        status: 'pending',
        attempts: 0,
      };

      this.webhookDeliveries.set(delivery.id, delivery);

      // Simulate delivery
      try {
        delivery.attempts++;
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        delivery.duration = Math.floor(Math.random() * 500) + 100;
        delivery.response = {
          statusCode: 200,
          body: '{"success": true}',
          headers: { 'content-type': 'application/json' },
        };

        webhook.successCount++;
        webhook.lastTriggeredAt = new Date();
      } catch (error) {
        delivery.status = 'failed';
        delivery.error = error instanceof Error ? error.message : 'Unknown error';
        webhook.failureCount++;
      }

      deliveries.push(delivery);
    }

    return deliveries;
  }

  getWebhookDeliveries(webhookId?: string): WebhookDelivery[] {
    const deliveries = Array.from(this.webhookDeliveries.values());
    return webhookId ? deliveries.filter(d => d.webhookId === webhookId) : deliveries;
  }

  retryWebhookDelivery(deliveryId: string): boolean {
    const delivery = this.webhookDeliveries.get(deliveryId);
    if (!delivery || delivery.status === 'delivered') return false;

    delivery.status = 'retrying';
    delivery.attempts++;
    delivery.nextRetry = undefined;

    // Simulate retry
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();

    const webhook = this.webhooks.get(delivery.webhookId);
    if (webhook) {
      webhook.successCount++;
    }

    return true;
  }

  getWebhookEvents(): WebhookEvent[] {
    return Array.from(this.webhookEvents.values());
  }

  private generateWebhookSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getApiPlatformStatus(): {
    version: string;
    spec: { paths: number; schemas: number };
    rateLimits: number;
    webhooks: { total: number; enabled: number };
    sdkLanguages: number;
  } {
    const spec = this.getOpenAPISpec();

    return {
      version: this.currentVersion,
      spec: {
        paths: Object.keys(spec.paths).length,
        schemas: Object.keys(spec.components.schemas).length,
      },
      rateLimits: this.rateLimitConfigs.size,
      webhooks: {
        total: this.webhooks.size,
        enabled: Array.from(this.webhooks.values()).filter(w => w.enabled).length,
      },
      sdkLanguages: this.getSupportedSDKLanguages().length,
    };
  }
}
