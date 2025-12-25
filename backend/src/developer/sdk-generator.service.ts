import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * SDK Generator Service
 * Generate client SDKs for multiple programming languages
 *
 * Features:
 * - TypeScript/JavaScript SDK
 * - Python SDK
 * - PHP SDK
 * - OpenAPI spec generation
 * - Code samples generation
 */

// =================== TYPES ===================

export type SDKLanguage = 'typescript' | 'javascript' | 'python' | 'php' | 'csharp' | 'java' | 'go';
export type SDKFormat = 'npm' | 'pip' | 'composer' | 'nuget' | 'maven' | 'go-mod';

export interface SDKConfig {
  language: SDKLanguage;
  version: string;
  packageName: string;
  description: string;
  author: string;
  license: string;
  repository?: string;
  includeExamples: boolean;
  includeTests: boolean;
  minifyCode: boolean;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters: APIParameter[];
  requestBody?: APIRequestBody;
  responses: Record<string, APIResponse>;
  security: string[];
}

export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description?: string;
  example?: any;
}

export interface APIRequestBody {
  contentType: string;
  schema: Record<string, any>;
  required: boolean;
  example?: any;
}

export interface APIResponse {
  description: string;
  contentType?: string;
  schema?: Record<string, any>;
  example?: any;
}

export interface GeneratedSDK {
  id: string;
  language: SDKLanguage;
  version: string;
  packageName: string;
  files: Array<{ path: string; content: string }>;
  downloadUrl?: string;
  generatedAt: Date;
  size: number;
}

export interface CodeSample {
  language: SDKLanguage;
  endpoint: string;
  title: string;
  description: string;
  code: string;
}

// =================== SERVICE ===================

@Injectable()
export class SDKGeneratorService {
  private readonly logger = new Logger(SDKGeneratorService.name);

  // API endpoints registry
  private endpoints: APIEndpoint[] = [];
  private generatedSDKs = new Map<string, GeneratedSDK>();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeEndpoints();
  }

  private initializeEndpoints(): void {
    // Core API endpoints
    this.endpoints = [
      // Auth
      {
        path: '/auth/login',
        method: 'POST',
        operationId: 'login',
        summary: 'Authenticate user',
        tags: ['Authentication'],
        parameters: [],
        requestBody: {
          contentType: 'application/json',
          required: true,
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
            },
            required: ['email', 'password'],
          },
        },
        responses: {
          '200': { description: 'Login successful', schema: { accessToken: 'string', refreshToken: 'string' } },
          '401': { description: 'Invalid credentials' },
        },
        security: [],
      },
      // Invoices
      {
        path: '/invoices',
        method: 'GET',
        operationId: 'listInvoices',
        summary: 'List all invoices',
        tags: ['Invoices'],
        parameters: [
          { name: 'page', in: 'query', required: false, type: 'integer', description: 'Page number' },
          { name: 'limit', in: 'query', required: false, type: 'integer', description: 'Items per page' },
          { name: 'status', in: 'query', required: false, type: 'string', description: 'Filter by status' },
        ],
        responses: {
          '200': { description: 'List of invoices' },
        },
        security: ['bearer'],
      },
      {
        path: '/invoices',
        method: 'POST',
        operationId: 'createInvoice',
        summary: 'Create a new invoice',
        tags: ['Invoices'],
        parameters: [],
        requestBody: {
          contentType: 'application/json',
          required: true,
          schema: {
            type: 'object',
            properties: {
              partnerName: { type: 'string' },
              partnerCui: { type: 'string' },
              items: { type: 'array' },
              currency: { type: 'string', default: 'RON' },
            },
          },
        },
        responses: {
          '201': { description: 'Invoice created' },
        },
        security: ['bearer'],
      },
      {
        path: '/invoices/{id}',
        method: 'GET',
        operationId: 'getInvoice',
        summary: 'Get invoice by ID',
        tags: ['Invoices'],
        parameters: [
          { name: 'id', in: 'path', required: true, type: 'string', description: 'Invoice ID' },
        ],
        responses: {
          '200': { description: 'Invoice details' },
          '404': { description: 'Invoice not found' },
        },
        security: ['bearer'],
      },
      // Partners
      {
        path: '/partners',
        method: 'GET',
        operationId: 'listPartners',
        summary: 'List all partners',
        tags: ['Partners'],
        parameters: [
          { name: 'type', in: 'query', required: false, type: 'string', description: 'Partner type (customer/supplier)' },
        ],
        responses: {
          '200': { description: 'List of partners' },
        },
        security: ['bearer'],
      },
      // OCR
      {
        path: '/ocr/process',
        method: 'POST',
        operationId: 'processDocument',
        summary: 'Process document with OCR',
        tags: ['OCR'],
        parameters: [],
        requestBody: {
          contentType: 'multipart/form-data',
          required: true,
          schema: {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary' },
              documentType: { type: 'string', enum: ['invoice', 'receipt', 'contract'] },
            },
          },
        },
        responses: {
          '200': { description: 'OCR result' },
        },
        security: ['bearer'],
      },
      // ANAF
      {
        path: '/anaf/efactura/submit',
        method: 'POST',
        operationId: 'submitEFactura',
        summary: 'Submit invoice to ANAF e-Factura',
        tags: ['ANAF'],
        parameters: [],
        requestBody: {
          contentType: 'application/json',
          required: true,
          schema: {
            type: 'object',
            properties: {
              invoiceId: { type: 'string' },
            },
          },
        },
        responses: {
          '200': { description: 'Submission result' },
        },
        security: ['bearer'],
      },
    ];

    this.logger.log(`Initialized ${this.endpoints.length} API endpoints for SDK generation`);
  }

  // =================== SDK GENERATION ===================

  async generateSDK(config: SDKConfig): Promise<GeneratedSDK> {
    this.logger.log(`Generating ${config.language} SDK v${config.version}`);

    let files: Array<{ path: string; content: string }> = [];

    switch (config.language) {
      case 'typescript':
        files = this.generateTypeScriptSDK(config);
        break;
      case 'javascript':
        files = this.generateJavaScriptSDK(config);
        break;
      case 'python':
        files = this.generatePythonSDK(config);
        break;
      case 'php':
        files = this.generatePHPSDK(config);
        break;
      default:
        files = this.generateTypeScriptSDK(config);
    }

    const sdk: GeneratedSDK = {
      id: `sdk-${config.language}-${Date.now()}`,
      language: config.language,
      version: config.version,
      packageName: config.packageName,
      files,
      generatedAt: new Date(),
      size: files.reduce((sum, f) => sum + f.content.length, 0),
    };

    this.generatedSDKs.set(sdk.id, sdk);

    this.eventEmitter.emit('sdk.generated', { sdk });

    return sdk;
  }

  private generateTypeScriptSDK(config: SDKConfig): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    // package.json
    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: config.packageName,
        version: config.version,
        description: config.description,
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        author: config.author,
        license: config.license,
        repository: config.repository,
        scripts: {
          build: 'tsc',
          test: 'jest',
        },
        dependencies: {
          axios: '^1.6.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
        },
      }, null, 2),
    });

    // tsconfig.json
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          declaration: true,
          outDir: './dist',
          strict: true,
          esModuleInterop: true,
        },
        include: ['src/**/*'],
      }, null, 2),
    });

    // Main client
    files.push({
      path: 'src/index.ts',
      content: this.generateTypeScriptClient(config),
    });

    // Types
    files.push({
      path: 'src/types.ts',
      content: this.generateTypeScriptTypes(),
    });

    // API modules
    files.push({
      path: 'src/api/invoices.ts',
      content: this.generateTypeScriptModule('Invoices', this.endpoints.filter(e => e.tags.includes('Invoices'))),
    });

    files.push({
      path: 'src/api/partners.ts',
      content: this.generateTypeScriptModule('Partners', this.endpoints.filter(e => e.tags.includes('Partners'))),
    });

    files.push({
      path: 'src/api/ocr.ts',
      content: this.generateTypeScriptModule('OCR', this.endpoints.filter(e => e.tags.includes('OCR'))),
    });

    // README
    files.push({
      path: 'README.md',
      content: this.generateReadme(config),
    });

    return files;
  }

  private generateTypeScriptClient(config: SDKConfig): string {
    return `/**
 * ${config.description}
 * @version ${config.version}
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { InvoicesAPI } from './api/invoices';
import { PartnersAPI } from './api/partners';
import { OCRAPI } from './api/ocr';

export interface ClientConfig {
  baseUrl?: string;
  apiKey?: string;
  accessToken?: string;
  timeout?: number;
}

export class DocumentIuliaClient {
  private client: AxiosInstance;
  private config: ClientConfig;

  public invoices: InvoicesAPI;
  public partners: PartnersAPI;
  public ocr: OCRAPI;

  constructor(config: ClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.documentiulia.ro/api/v1',
      timeout: config.timeout || 30000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        ...(this.config.accessToken && { 'Authorization': \`Bearer \${this.config.accessToken}\` }),
      },
    });

    // Initialize API modules
    this.invoices = new InvoicesAPI(this.client);
    this.partners = new PartnersAPI(this.client);
    this.ocr = new OCRAPI(this.client);
  }

  setAccessToken(token: string): void {
    this.config.accessToken = token;
    this.client.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      this.setAccessToken(response.data.accessToken);
    }
    return response.data;
  }
}

export default DocumentIuliaClient;
export * from './types';
`;
  }

  private generateTypeScriptTypes(): string {
    return `// Auto-generated types for DocumentIulia API

export interface Invoice {
  id: string;
  number: string;
  series: string;
  partnerName: string;
  partnerCui?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled';
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface Partner {
  id: string;
  name: string;
  cui?: string;
  regCom?: string;
  address?: string;
  city?: string;
  county?: string;
  country: string;
  email?: string;
  phone?: string;
  type: 'customer' | 'supplier' | 'both';
  isActive: boolean;
}

export interface OCRResult {
  documentType: string;
  confidence: number;
  extractedData: Record<string, any>;
  rawText: string;
  processedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface APIError {
  statusCode: number;
  message: string;
  error?: string;
}
`;
  }

  private generateTypeScriptModule(name: string, endpoints: APIEndpoint[]): string {
    const methods = endpoints.map(e => this.generateTypeScriptMethod(e)).join('\n\n');

    return `import { AxiosInstance } from 'axios';
import { Invoice, Partner, OCRResult, PaginatedResponse } from '../types';

export class ${name}API {
  constructor(private client: AxiosInstance) {}

${methods}
}
`;
  }

  private generateTypeScriptMethod(endpoint: APIEndpoint): string {
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');

    const params: string[] = pathParams.map(p => `${p.name}: ${this.tsType(p.type)}`);
    if (queryParams.length > 0) {
      params.push(`options?: { ${queryParams.map(p => `${p.name}?: ${this.tsType(p.type)}`).join('; ')} }`);
    }
    if (endpoint.requestBody) {
      params.push('data: any');
    }

    let path = endpoint.path;
    pathParams.forEach(p => {
      path = path.replace(`{${p.name}}`, `\${${p.name}}`);
    });

    const method = endpoint.method.toLowerCase();
    let body = '';
    if (method === 'get' || method === 'delete') {
      body = queryParams.length > 0
        ? `return this.client.${method}(\`${path}\`, { params: options });`
        : `return this.client.${method}(\`${path}\`);`;
    } else {
      body = `return this.client.${method}(\`${path}\`, data);`;
    }

    return `  /**
   * ${endpoint.summary}
   */
  async ${endpoint.operationId}(${params.join(', ')}): Promise<any> {
    const response = await ${body}
    return response.data;
  }`;
  }

  private tsType(type: string): string {
    switch (type) {
      case 'integer': return 'number';
      case 'boolean': return 'boolean';
      default: return 'string';
    }
  }

  private generateJavaScriptSDK(config: SDKConfig): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: config.packageName,
        version: config.version,
        description: config.description,
        main: 'index.js',
        author: config.author,
        license: config.license,
        dependencies: {
          axios: '^1.6.0',
        },
      }, null, 2),
    });

    files.push({
      path: 'index.js',
      content: `/**
 * ${config.description}
 * @version ${config.version}
 */

const axios = require('axios');

class DocumentIuliaClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://api.documentiulia.ro/api/v1';
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
    });

    this._setupInterceptors();
  }

  _setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = \`Bearer \${this.accessToken}\`;
      }
      if (this.apiKey) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      return config;
    });
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  // Authentication
  async login(email, password) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      this.setAccessToken(response.data.accessToken);
    }
    return response.data;
  }

  // Invoices
  async listInvoices(options = {}) {
    const response = await this.client.get('/invoices', { params: options });
    return response.data;
  }

  async createInvoice(data) {
    const response = await this.client.post('/invoices', data);
    return response.data;
  }

  async getInvoice(id) {
    const response = await this.client.get(\`/invoices/\${id}\`);
    return response.data;
  }

  // Partners
  async listPartners(options = {}) {
    const response = await this.client.get('/partners', { params: options });
    return response.data;
  }

  // OCR
  async processDocument(file, documentType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    const response = await this.client.post('/ocr/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

module.exports = DocumentIuliaClient;
`,
    });

    return files;
  }

  private generatePythonSDK(config: SDKConfig): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    files.push({
      path: 'setup.py',
      content: `from setuptools import setup, find_packages

setup(
    name="${config.packageName}",
    version="${config.version}",
    description="${config.description}",
    author="${config.author}",
    license="${config.license}",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
    ],
    python_requires=">=3.8",
)
`,
    });

    files.push({
      path: 'documentiulia/__init__.py',
      content: `"""
${config.description}
Version: ${config.version}
"""

from .client import DocumentIuliaClient

__version__ = "${config.version}"
__all__ = ["DocumentIuliaClient"]
`,
    });

    files.push({
      path: 'documentiulia/client.py',
      content: `"""
DocumentIulia API Client
"""

import requests
from typing import Optional, Dict, Any, List


class DocumentIuliaClient:
    """Main client for DocumentIulia API."""

    def __init__(
        self,
        base_url: str = "https://api.documentiulia.ro/api/v1",
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        timeout: int = 30,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.access_token = access_token
        self.timeout = timeout
        self.session = requests.Session()

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(
            method=method,
            url=url,
            headers=self._get_headers(),
            params=params,
            json=data,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()

    def set_access_token(self, token: str) -> None:
        self.access_token = token

    # Authentication
    def login(self, email: str, password: str) -> Dict[str, Any]:
        result = self._request("POST", "/auth/login", data={"email": email, "password": password})
        if "accessToken" in result:
            self.set_access_token(result["accessToken"])
        return result

    # Invoices
    def list_invoices(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        params = {"page": page, "limit": limit}
        if status:
            params["status"] = status
        return self._request("GET", "/invoices", params=params)

    def create_invoice(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/invoices", data=data)

    def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/invoices/{invoice_id}")

    # Partners
    def list_partners(self, partner_type: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if partner_type:
            params["type"] = partner_type
        return self._request("GET", "/partners", params=params)

    # OCR
    def process_document(self, file_path: str, document_type: str) -> Dict[str, Any]:
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {"documentType": document_type}
            response = self.session.post(
                f"{self.base_url}/ocr/process",
                headers={"Authorization": f"Bearer {self.access_token}"},
                files=files,
                data=data,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
`,
    });

    return files;
  }

  private generatePHPSDK(config: SDKConfig): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    files.push({
      path: 'composer.json',
      content: JSON.stringify({
        name: config.packageName,
        description: config.description,
        version: config.version,
        type: 'library',
        license: config.license,
        authors: [{ name: config.author }],
        require: {
          php: '>=8.0',
          'guzzlehttp/guzzle': '^7.0',
        },
        autoload: {
          'psr-4': {
            'DocumentIulia\\\\': 'src/',
          },
        },
      }, null, 2),
    });

    files.push({
      path: 'src/Client.php',
      content: `<?php

namespace DocumentIulia;

use GuzzleHttp\\Client as HttpClient;
use GuzzleHttp\\Exception\\GuzzleException;

/**
 * DocumentIulia API Client
 * @version ${config.version}
 */
class Client
{
    private HttpClient $httpClient;
    private string $baseUrl;
    private ?string $apiKey;
    private ?string $accessToken;

    public function __construct(array $config = [])
    {
        $this->baseUrl = $config['baseUrl'] ?? 'https://api.documentiulia.ro/api/v1';
        $this->apiKey = $config['apiKey'] ?? null;
        $this->accessToken = $config['accessToken'] ?? null;

        $this->httpClient = new HttpClient([
            'base_uri' => $this->baseUrl,
            'timeout' => $config['timeout'] ?? 30,
        ]);
    }

    public function setAccessToken(string $token): void
    {
        $this->accessToken = $token;
    }

    private function getHeaders(): array
    {
        $headers = ['Content-Type' => 'application/json'];
        if ($this->accessToken) {
            $headers['Authorization'] = 'Bearer ' . $this->accessToken;
        }
        if ($this->apiKey) {
            $headers['X-API-Key'] = $this->apiKey;
        }
        return $headers;
    }

    /**
     * Login and obtain access token
     */
    public function login(string $email, string $password): array
    {
        $response = $this->httpClient->post('/auth/login', [
            'headers' => $this->getHeaders(),
            'json' => ['email' => $email, 'password' => $password],
        ]);

        $data = json_decode($response->getBody()->getContents(), true);
        if (isset($data['accessToken'])) {
            $this->setAccessToken($data['accessToken']);
        }
        return $data;
    }

    /**
     * List invoices
     */
    public function listInvoices(array $options = []): array
    {
        $response = $this->httpClient->get('/invoices', [
            'headers' => $this->getHeaders(),
            'query' => $options,
        ]);

        return json_decode($response->getBody()->getContents(), true);
    }

    /**
     * Create invoice
     */
    public function createInvoice(array $data): array
    {
        $response = $this->httpClient->post('/invoices', [
            'headers' => $this->getHeaders(),
            'json' => $data,
        ]);

        return json_decode($response->getBody()->getContents(), true);
    }

    /**
     * Get invoice by ID
     */
    public function getInvoice(string $id): array
    {
        $response = $this->httpClient->get("/invoices/{$id}", [
            'headers' => $this->getHeaders(),
        ]);

        return json_decode($response->getBody()->getContents(), true);
    }

    /**
     * List partners
     */
    public function listPartners(?string $type = null): array
    {
        $query = $type ? ['type' => $type] : [];
        $response = $this->httpClient->get('/partners', [
            'headers' => $this->getHeaders(),
            'query' => $query,
        ]);

        return json_decode($response->getBody()->getContents(), true);
    }
}
`,
    });

    return files;
  }

  private generateReadme(config: SDKConfig): string {
    return `# ${config.packageName}

${config.description}

## Installation

\`\`\`bash
npm install ${config.packageName}
\`\`\`

## Quick Start

\`\`\`typescript
import { DocumentIuliaClient } from '${config.packageName}';

const client = new DocumentIuliaClient({
  apiKey: 'your-api-key',
});

// Login
await client.login('email@example.com', 'password');

// List invoices
const invoices = await client.invoices.listInvoices({ page: 1, limit: 20 });

// Create invoice
const newInvoice = await client.invoices.createInvoice({
  partnerName: 'Partner SRL',
  partnerCui: 'RO12345678',
  items: [
    { description: 'Service', quantity: 1, unitPrice: 100, vatRate: 19 }
  ],
});
\`\`\`

## API Reference

### Authentication
- \`login(email, password)\` - Authenticate and obtain access token

### Invoices
- \`invoices.listInvoices(options)\` - List all invoices
- \`invoices.createInvoice(data)\` - Create a new invoice
- \`invoices.getInvoice(id)\` - Get invoice by ID

### Partners
- \`partners.listPartners(options)\` - List all partners

### OCR
- \`ocr.processDocument(file, documentType)\` - Process document with OCR

## License

${config.license}
`;
  }

  // =================== CODE SAMPLES ===================

  async generateCodeSamples(endpoint: string): Promise<CodeSample[]> {
    const ep = this.endpoints.find(e => e.path === endpoint);
    if (!ep) return [];

    const samples: CodeSample[] = [];

    // TypeScript sample
    samples.push({
      language: 'typescript',
      endpoint,
      title: `${ep.summary} - TypeScript`,
      description: `Example of ${ep.operationId} in TypeScript`,
      code: this.generateTypescriptSample(ep),
    });

    // Python sample
    samples.push({
      language: 'python',
      endpoint,
      title: `${ep.summary} - Python`,
      description: `Example of ${ep.operationId} in Python`,
      code: this.generatePythonSample(ep),
    });

    // PHP sample
    samples.push({
      language: 'php',
      endpoint,
      title: `${ep.summary} - PHP`,
      description: `Example of ${ep.operationId} in PHP`,
      code: this.generatePHPSample(ep),
    });

    return samples;
  }

  private generateTypescriptSample(ep: APIEndpoint): string {
    return `import { DocumentIuliaClient } from 'documentiulia-sdk';

const client = new DocumentIuliaClient({
  apiKey: 'your-api-key',
});

// ${ep.summary}
const result = await client.${ep.operationId}();
console.log(result);`;
  }

  private generatePythonSample(ep: APIEndpoint): string {
    return `from documentiulia import DocumentIuliaClient

client = DocumentIuliaClient(api_key="your-api-key")

# ${ep.summary}
result = client.${this.toSnakeCase(ep.operationId)}()
print(result)`;
  }

  private generatePHPSample(ep: APIEndpoint): string {
    return `<?php
use DocumentIulia\\Client;

$client = new Client(['apiKey' => 'your-api-key']);

// ${ep.summary}
$result = $client->${ep.operationId}();
print_r($result);`;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // =================== OPENAPI SPEC ===================

  async generateOpenAPISpec(): Promise<Record<string, any>> {
    const paths: Record<string, any> = {};

    for (const ep of this.endpoints) {
      if (!paths[ep.path]) {
        paths[ep.path] = {};
      }

      paths[ep.path][ep.method.toLowerCase()] = {
        operationId: ep.operationId,
        summary: ep.summary,
        description: ep.description,
        tags: ep.tags,
        parameters: ep.parameters.map(p => ({
          name: p.name,
          in: p.in,
          required: p.required,
          schema: { type: p.type },
          description: p.description,
        })),
        ...(ep.requestBody && {
          requestBody: {
            required: ep.requestBody.required,
            content: {
              [ep.requestBody.contentType]: {
                schema: ep.requestBody.schema,
              },
            },
          },
        }),
        responses: Object.entries(ep.responses).reduce((acc, [code, resp]) => {
          acc[code] = { description: resp.description };
          return acc;
        }, {} as Record<string, any>),
        security: ep.security.map(s => ({ [s]: [] })),
      };
    }

    return {
      openapi: '3.0.3',
      info: {
        title: 'DocumentIulia API',
        description: 'AI-powered ERP/Accounting Platform API',
        version: '1.0.0',
        contact: {
          email: 'support@documentiulia.ro',
        },
      },
      servers: [
        { url: 'https://api.documentiulia.ro/api/v1', description: 'Production' },
        { url: 'http://localhost:3001/api/v1', description: 'Development' },
      ],
      paths,
      components: {
        securitySchemes: {
          bearer: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    };
  }

  // =================== QUERIES ===================

  async getGeneratedSDKs(): Promise<GeneratedSDK[]> {
    return Array.from(this.generatedSDKs.values());
  }

  async getSDK(id: string): Promise<GeneratedSDK | null> {
    return this.generatedSDKs.get(id) || null;
  }

  async getEndpoints(): Promise<APIEndpoint[]> {
    return this.endpoints;
  }

  async getSupportedLanguages(): Promise<Array<{ language: SDKLanguage; format: SDKFormat; name: string }>> {
    return [
      { language: 'typescript', format: 'npm', name: 'TypeScript' },
      { language: 'javascript', format: 'npm', name: 'JavaScript' },
      { language: 'python', format: 'pip', name: 'Python' },
      { language: 'php', format: 'composer', name: 'PHP' },
    ];
  }
}
