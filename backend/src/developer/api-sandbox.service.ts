import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * API Sandbox Service
 * Isolated testing environment for API development
 *
 * Features:
 * - Isolated sandbox environments
 * - Mock data generation
 * - Request/response recording
 * - Reset and cleanup
 */

// =================== TYPES ===================

export interface SandboxEnvironment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  baseUrl: string;
  apiKey: string;
  status: 'active' | 'paused' | 'expired';
  mockData: SandboxMockData;
  settings: SandboxSettings;
  usage: SandboxUsage;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt?: Date;
}

export interface SandboxMockData {
  invoices: MockInvoice[];
  partners: MockPartner[];
  products: MockProduct[];
  documents: MockDocument[];
}

export interface MockInvoice {
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
  vatRate: number;
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
}

export interface MockPartner {
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
}

export interface MockProduct {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unitPrice: number;
  vatRate: number;
  unit: string;
  stock: number;
}

export interface MockDocument {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'contract' | 'other';
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface SandboxSettings {
  responseDelay: number; // ms
  errorRate: number; // 0-100%
  rateLimitRequests: number;
  rateLimitWindow: number; // seconds
  enableMockOCR: boolean;
  enableMockANAF: boolean;
  mockOCRConfidence: number; // 0-100%
}

export interface SandboxUsage {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequest?: {
    endpoint: string;
    method: string;
    status: number;
    timestamp: Date;
  };
}

export interface SandboxRequest {
  id: string;
  sandboxId: string;
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
  duration: number;
  timestamp: Date;
}

// =================== SERVICE ===================

@Injectable()
export class APISandboxService {
  private readonly logger = new Logger(APISandboxService.name);

  // Storage
  private sandboxes = new Map<string, SandboxEnvironment>();
  private requests = new Map<string, SandboxRequest[]>();

  // Limits
  private readonly maxSandboxesPerTenant = 3;
  private readonly defaultExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== SANDBOX MANAGEMENT ===================

  async createSandbox(params: {
    tenantId: string;
    name: string;
    description?: string;
    settings?: Partial<SandboxSettings>;
    expireInDays?: number;
  }): Promise<SandboxEnvironment> {
    // Check sandbox limit
    const existingSandboxes = await this.getSandboxes(params.tenantId);
    if (existingSandboxes.length >= this.maxSandboxesPerTenant) {
      throw new BadRequestException(
        `Maximum ${this.maxSandboxesPerTenant} sandboxes per tenant allowed`,
      );
    }

    const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const apiKey = this.generateApiKey();

    const sandbox: SandboxEnvironment = {
      id: sandboxId,
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      baseUrl: `https://sandbox.documentiulia.ro/api/v1/${sandboxId}`,
      apiKey,
      status: 'active',
      mockData: this.generateMockData(),
      settings: {
        responseDelay: params.settings?.responseDelay ?? 100,
        errorRate: params.settings?.errorRate ?? 0,
        rateLimitRequests: params.settings?.rateLimitRequests ?? 100,
        rateLimitWindow: params.settings?.rateLimitWindow ?? 60,
        enableMockOCR: params.settings?.enableMockOCR ?? true,
        enableMockANAF: params.settings?.enableMockANAF ?? true,
        mockOCRConfidence: params.settings?.mockOCRConfidence ?? 95,
      },
      usage: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (params.expireInDays || 7) * 24 * 60 * 60 * 1000),
    };

    this.sandboxes.set(sandboxId, sandbox);
    this.requests.set(sandboxId, []);

    this.eventEmitter.emit('sandbox.created', { sandbox });
    this.logger.log(`Sandbox created: ${sandbox.name} (${sandboxId})`);

    return sandbox;
  }

  async updateSandbox(
    id: string,
    updates: {
      name?: string;
      description?: string;
      settings?: Partial<SandboxSettings>;
      status?: 'active' | 'paused';
    },
  ): Promise<SandboxEnvironment> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) {
      throw new NotFoundException('Sandbox not found');
    }

    if (updates.settings) {
      sandbox.settings = { ...sandbox.settings, ...updates.settings };
    }
    if (updates.name) sandbox.name = updates.name;
    if (updates.description !== undefined) sandbox.description = updates.description;
    if (updates.status) sandbox.status = updates.status;

    this.sandboxes.set(id, sandbox);
    return sandbox;
  }

  async deleteSandbox(id: string): Promise<void> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) {
      throw new NotFoundException('Sandbox not found');
    }

    this.sandboxes.delete(id);
    this.requests.delete(id);

    this.eventEmitter.emit('sandbox.deleted', { sandboxId: id });
  }

  async resetSandbox(id: string): Promise<SandboxEnvironment> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) {
      throw new NotFoundException('Sandbox not found');
    }

    sandbox.mockData = this.generateMockData();
    sandbox.usage = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
    };
    sandbox.lastActivityAt = undefined;

    this.sandboxes.set(id, sandbox);
    this.requests.set(id, []);

    this.eventEmitter.emit('sandbox.reset', { sandboxId: id });

    return sandbox;
  }

  async regenerateApiKey(id: string): Promise<{ apiKey: string }> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) {
      throw new NotFoundException('Sandbox not found');
    }

    sandbox.apiKey = this.generateApiKey();
    this.sandboxes.set(id, sandbox);

    return { apiKey: sandbox.apiKey };
  }

  private generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sb_';
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  // =================== MOCK DATA GENERATION ===================

  private generateMockData(): SandboxMockData {
    return {
      invoices: this.generateMockInvoices(10),
      partners: this.generateMockPartners(20),
      products: this.generateMockProducts(15),
      documents: this.generateMockDocuments(5),
    };
  }

  private generateMockInvoices(count: number): MockInvoice[] {
    const invoices: MockInvoice[] = [];
    const statuses: MockInvoice['status'][] = ['draft', 'issued', 'sent', 'paid', 'cancelled'];

    for (let i = 0; i < count; i++) {
      const netAmount = Math.floor(Math.random() * 10000) + 100;
      const vatRate = Math.random() > 0.5 ? 19 : 9;
      const vatAmount = Math.round(netAmount * vatRate / 100);

      invoices.push({
        id: `inv-sandbox-${i + 1}`,
        number: String(i + 1).padStart(4, '0'),
        series: 'SB',
        partnerName: `Test Partner ${i + 1} SRL`,
        partnerCui: `RO${12345678 + i}`,
        issueDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'RON',
        netAmount,
        vatAmount,
        grossAmount: netAmount + vatAmount,
        vatRate,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        items: [
          {
            description: `Service item ${i + 1}`,
            quantity: Math.floor(Math.random() * 10) + 1,
            unitPrice: Math.floor(Math.random() * 500) + 50,
            vatRate,
          },
        ],
      });
    }

    return invoices;
  }

  private generateMockPartners(count: number): MockPartner[] {
    const partners: MockPartner[] = [];
    const types: MockPartner['type'][] = ['customer', 'supplier', 'both'];
    const counties = ['București', 'Cluj', 'Timișoara', 'Iași', 'Brașov', 'Constanța'];

    for (let i = 0; i < count; i++) {
      partners.push({
        id: `partner-sandbox-${i + 1}`,
        name: `Test Company ${i + 1} SRL`,
        cui: i % 3 === 0 ? `RO${12345678 + i}` : undefined,
        regCom: i % 3 === 0 ? `J40/${1000 + i}/2020` : undefined,
        address: `Strada Test nr. ${i + 1}`,
        city: counties[i % counties.length],
        county: counties[i % counties.length],
        country: 'Romania',
        email: `contact@company${i + 1}.test`,
        phone: `+40 7${String(i).padStart(8, '0')}`,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    return partners;
  }

  private generateMockProducts(count: number): MockProduct[] {
    const products: MockProduct[] = [];
    const categories = ['Software', 'Services', 'Hardware', 'Consulting', 'Support'];
    const units = ['buc', 'ora', 'luna', 'proiect'];

    for (let i = 0; i < count; i++) {
      products.push({
        id: `prod-sandbox-${i + 1}`,
        code: `PROD${String(i + 1).padStart(3, '0')}`,
        name: `Test Product ${i + 1}`,
        description: `Description for test product ${i + 1}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        unitPrice: Math.floor(Math.random() * 1000) + 50,
        vatRate: Math.random() > 0.3 ? 19 : 9,
        unit: units[Math.floor(Math.random() * units.length)],
        stock: Math.floor(Math.random() * 100),
      });
    }

    return products;
  }

  private generateMockDocuments(count: number): MockDocument[] {
    const documents: MockDocument[] = [];
    const types: MockDocument['type'][] = ['invoice', 'receipt', 'contract', 'other'];

    for (let i = 0; i < count; i++) {
      documents.push({
        id: `doc-sandbox-${i + 1}`,
        name: `Test Document ${i + 1}.pdf`,
        type: types[Math.floor(Math.random() * types.length)],
        size: Math.floor(Math.random() * 1000000) + 10000,
        mimeType: 'application/pdf',
        uploadedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return documents;
  }

  // =================== REQUEST HANDLING ===================

  async handleRequest(params: {
    sandboxId: string;
    method: string;
    endpoint: string;
    headers: Record<string, string>;
    query?: Record<string, any>;
    body?: any;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    body: any;
  }> {
    const sandbox = this.sandboxes.get(params.sandboxId);
    if (!sandbox) {
      throw new NotFoundException('Sandbox not found');
    }

    if (sandbox.status !== 'active') {
      return {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Sandbox is not active' },
      };
    }

    if (new Date() > sandbox.expiresAt) {
      sandbox.status = 'expired';
      this.sandboxes.set(params.sandboxId, sandbox);
      return {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Sandbox has expired' },
      };
    }

    // Simulate response delay
    if (sandbox.settings.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, sandbox.settings.responseDelay));
    }

    // Simulate random errors
    if (sandbox.settings.errorRate > 0 && Math.random() * 100 < sandbox.settings.errorRate) {
      const errorResponse = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Simulated server error' },
      };
      this.recordRequest(params, errorResponse, sandbox);
      return errorResponse;
    }

    // Route request
    const response = this.routeRequest(sandbox, params.method, params.endpoint, params.query, params.body);
    this.recordRequest(params, response, sandbox);

    return response;
  }

  private routeRequest(
    sandbox: SandboxEnvironment,
    method: string,
    endpoint: string,
    query?: Record<string, any>,
    body?: any,
  ): { status: number; headers: Record<string, string>; body: any } {
    const headers = { 'Content-Type': 'application/json' };

    // Invoices
    if (endpoint.match(/^\/invoices\/?$/) && method === 'GET') {
      return { status: 200, headers, body: { data: sandbox.mockData.invoices, total: sandbox.mockData.invoices.length } };
    }
    if (endpoint.match(/^\/invoices\/[\w-]+$/) && method === 'GET') {
      const id = endpoint.split('/')[2];
      const invoice = sandbox.mockData.invoices.find(i => i.id === id);
      if (!invoice) {
        return { status: 404, headers, body: { error: 'Invoice not found' } };
      }
      return { status: 200, headers, body: invoice };
    }
    if (endpoint.match(/^\/invoices\/?$/) && method === 'POST') {
      const newInvoice: MockInvoice = {
        id: `inv-sandbox-${Date.now()}`,
        number: String(sandbox.mockData.invoices.length + 1).padStart(4, '0'),
        series: 'SB',
        ...body,
        status: 'draft',
      };
      sandbox.mockData.invoices.push(newInvoice);
      return { status: 201, headers, body: newInvoice };
    }

    // Partners
    if (endpoint.match(/^\/partners\/?$/) && method === 'GET') {
      return { status: 200, headers, body: { data: sandbox.mockData.partners, total: sandbox.mockData.partners.length } };
    }
    if (endpoint.match(/^\/partners\/[\w-]+$/) && method === 'GET') {
      const id = endpoint.split('/')[2];
      const partner = sandbox.mockData.partners.find(p => p.id === id);
      if (!partner) {
        return { status: 404, headers, body: { error: 'Partner not found' } };
      }
      return { status: 200, headers, body: partner };
    }

    // Products
    if (endpoint.match(/^\/products\/?$/) && method === 'GET') {
      return { status: 200, headers, body: { data: sandbox.mockData.products, total: sandbox.mockData.products.length } };
    }

    // OCR
    if (endpoint.match(/^\/ocr\/process/) && method === 'POST' && sandbox.settings.enableMockOCR) {
      return {
        status: 200,
        headers,
        body: {
          documentType: 'invoice',
          confidence: sandbox.settings.mockOCRConfidence / 100,
          extractedData: {
            invoiceNumber: 'DOC-0001',
            issueDate: new Date().toISOString().split('T')[0],
            partnerName: 'Extracted Partner SRL',
            totalAmount: 1190,
            vatAmount: 190,
          },
          processedAt: new Date().toISOString(),
        },
      };
    }

    // ANAF
    if (endpoint.match(/^\/anaf\/efactura\/submit/) && method === 'POST' && sandbox.settings.enableMockANAF) {
      return {
        status: 200,
        headers,
        body: {
          success: true,
          indexIncarcare: `MOCK-${Date.now()}`,
          stare: 'ok',
          message: 'Invoice submitted successfully (sandbox)',
        },
      };
    }

    // Default 404
    return { status: 404, headers, body: { error: 'Endpoint not found' } };
  }

  private recordRequest(
    params: {
      sandboxId: string;
      method: string;
      endpoint: string;
      headers: Record<string, string>;
      query?: Record<string, any>;
      body?: any;
    },
    response: { status: number; headers: Record<string, string>; body: any },
    sandbox: SandboxEnvironment,
  ): void {
    const request: SandboxRequest = {
      id: `req-${Date.now()}`,
      sandboxId: params.sandboxId,
      method: params.method,
      endpoint: params.endpoint,
      headers: params.headers,
      query: params.query,
      body: params.body,
      response,
      duration: sandbox.settings.responseDelay,
      timestamp: new Date(),
    };

    const requests = this.requests.get(params.sandboxId) || [];
    requests.push(request);

    // Keep only last 100 requests
    if (requests.length > 100) {
      requests.shift();
    }
    this.requests.set(params.sandboxId, requests);

    // Update usage stats
    sandbox.usage.totalRequests++;
    if (response.status >= 200 && response.status < 400) {
      sandbox.usage.successfulRequests++;
    } else {
      sandbox.usage.failedRequests++;
    }
    sandbox.usage.lastRequest = {
      endpoint: params.endpoint,
      method: params.method,
      status: response.status,
      timestamp: new Date(),
    };
    sandbox.lastActivityAt = new Date();
    this.sandboxes.set(params.sandboxId, sandbox);
  }

  // =================== QUERIES ===================

  async getSandboxes(tenantId?: string): Promise<SandboxEnvironment[]> {
    let sandboxes = Array.from(this.sandboxes.values());
    if (tenantId) {
      sandboxes = sandboxes.filter(s => s.tenantId === tenantId);
    }
    return sandboxes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSandbox(id: string): Promise<SandboxEnvironment | null> {
    return this.sandboxes.get(id) || null;
  }

  async getSandboxByApiKey(apiKey: string): Promise<SandboxEnvironment | null> {
    for (const sandbox of this.sandboxes.values()) {
      if (sandbox.apiKey === apiKey) {
        return sandbox;
      }
    }
    return null;
  }

  async getRequestHistory(sandboxId: string, limit?: number): Promise<SandboxRequest[]> {
    const requests = this.requests.get(sandboxId) || [];
    const sorted = requests.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // =================== MOCK DATA MANAGEMENT ===================

  async addMockInvoice(sandboxId: string, invoice: Partial<MockInvoice>): Promise<MockInvoice> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new NotFoundException('Sandbox not found');
    }

    const newInvoice: MockInvoice = {
      id: `inv-custom-${Date.now()}`,
      number: String(sandbox.mockData.invoices.length + 1).padStart(4, '0'),
      series: 'SB',
      partnerName: invoice.partnerName || 'Custom Partner',
      issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: invoice.currency || 'RON',
      netAmount: invoice.netAmount || 1000,
      vatAmount: invoice.vatAmount || 190,
      grossAmount: invoice.grossAmount || 1190,
      vatRate: invoice.vatRate || 19,
      status: invoice.status || 'draft',
      items: invoice.items || [],
      ...invoice,
    };

    sandbox.mockData.invoices.push(newInvoice);
    this.sandboxes.set(sandboxId, sandbox);

    return newInvoice;
  }

  async addMockPartner(sandboxId: string, partner: Partial<MockPartner>): Promise<MockPartner> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new NotFoundException('Sandbox not found');
    }

    const newPartner: MockPartner = {
      id: `partner-custom-${Date.now()}`,
      name: partner.name || 'Custom Partner',
      country: partner.country || 'Romania',
      type: partner.type || 'customer',
      ...partner,
    };

    sandbox.mockData.partners.push(newPartner);
    this.sandboxes.set(sandboxId, sandbox);

    return newPartner;
  }

  // =================== STATS ===================

  async getStats(tenantId?: string): Promise<{
    totalSandboxes: number;
    activeSandboxes: number;
    totalRequests: number;
    successRate: number;
  }> {
    let sandboxes = Array.from(this.sandboxes.values());
    if (tenantId) {
      sandboxes = sandboxes.filter(s => s.tenantId === tenantId);
    }

    const totalRequests = sandboxes.reduce((sum, s) => sum + s.usage.totalRequests, 0);
    const successfulRequests = sandboxes.reduce((sum, s) => sum + s.usage.successfulRequests, 0);

    return {
      totalSandboxes: sandboxes.length,
      activeSandboxes: sandboxes.filter(s => s.status === 'active').length,
      totalRequests,
      successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
    };
  }
}
