import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID, randomBytes, createHash } from 'crypto';

export type ApiKeyStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';

export type ApiKeyScope =
  | 'READ'
  | 'WRITE'
  | 'DELETE'
  | 'ADMIN'
  | 'INVOICES'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'REPORTS'
  | 'ANAF'
  | 'PAYMENTS'
  | 'WEBHOOKS';

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  keyHash: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  createdBy: string;
  createdByName: string;
  ipWhitelist: string[];
  rateLimit: number;
  rateLimitWindow: number;
  usageCount: number;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  expiresAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyUsage {
  id: string;
  apiKeyId: string;
  organizationId: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  statusCode: number;
  responseTimeMs: number;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
  timestamp: Date;
}

export interface CreateApiKeyDto {
  organizationId: string;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  scopes: ApiKeyScope[];
  createdBy: string;
  createdByName: string;
  ipWhitelist?: string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  reason?: string;
  reasonRo?: string;
}

export interface ApiKeyStatistics {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  revokedKeys: number;
  totalUsage: number;
  usageToday: number;
  usageThisMonth: number;
  topEndpoints: { endpoint: string; count: number }[];
  avgResponseTime: number;
  errorRate: number;
}

@Injectable()
export class ApiKeyService {
  private apiKeys: Map<string, ApiKey> = new Map();
  private usageLogs: Map<string, ApiKeyUsage[]> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async create(dto: CreateApiKeyDto): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
    // Generate secure API key
    const keyBytes = randomBytes(32);
    const plainTextKey = `dk_${keyBytes.toString('hex')}`;
    const keyPrefix = plainTextKey.substring(0, 10);
    const keyHash = this.hashKey(plainTextKey);

    const now = new Date();
    const apiKey: ApiKey = {
      id: randomUUID(),
      organizationId: dto.organizationId,
      name: dto.name,
      nameRo: dto.nameRo,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      keyHash,
      keyPrefix,
      scopes: dto.scopes,
      status: 'ACTIVE',
      createdBy: dto.createdBy,
      createdByName: dto.createdByName,
      ipWhitelist: dto.ipWhitelist || [],
      rateLimit: dto.rateLimit || 1000,
      rateLimitWindow: dto.rateLimitWindow || 3600000, // 1 hour default
      usageCount: 0,
      expiresAt: dto.expiresAt,
      metadata: dto.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.apiKeys.set(apiKey.id, apiKey);
    this.usageLogs.set(apiKey.id, []);
    this.eventEmitter.emit('apikey.created', { apiKey });

    return { apiKey, plainTextKey };
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async validate(
    plainTextKey: string,
    requiredScopes?: ApiKeyScope[],
    ipAddress?: string
  ): Promise<ApiKeyValidationResult> {
    const keyHash = this.hashKey(plainTextKey);

    // Find API key by hash
    let foundKey: ApiKey | undefined;
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.keyHash === keyHash) {
        foundKey = apiKey;
        break;
      }
    }

    if (!foundKey) {
      return { valid: false, reason: 'Invalid API key', reasonRo: 'Cheie API invalidă' };
    }

    // Check status
    if (foundKey.status !== 'ACTIVE') {
      return {
        valid: false,
        apiKey: foundKey,
        reason: `API key is ${foundKey.status.toLowerCase()}`,
        reasonRo: `Cheia API este ${this.translateStatus(foundKey.status)}`,
      };
    }

    // Check expiration
    if (foundKey.expiresAt && foundKey.expiresAt < new Date()) {
      foundKey.status = 'EXPIRED';
      this.apiKeys.set(foundKey.id, foundKey);
      return {
        valid: false,
        apiKey: foundKey,
        reason: 'API key has expired',
        reasonRo: 'Cheia API a expirat',
      };
    }

    // Check IP whitelist
    if (foundKey.ipWhitelist.length > 0 && ipAddress) {
      if (!foundKey.ipWhitelist.includes(ipAddress) && !this.matchesIpPattern(ipAddress, foundKey.ipWhitelist)) {
        return {
          valid: false,
          apiKey: foundKey,
          reason: 'IP address not allowed',
          reasonRo: 'Adresa IP nu este permisă',
        };
      }
    }

    // Check scopes
    if (requiredScopes && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every(s => foundKey!.scopes.includes(s) || foundKey!.scopes.includes('ADMIN'));
      if (!hasAllScopes) {
        return {
          valid: false,
          apiKey: foundKey,
          reason: 'Insufficient permissions',
          reasonRo: 'Permisiuni insuficiente',
        };
      }
    }

    // Check rate limit
    const rateLimitResult = await this.checkRateLimit(foundKey);
    if (!rateLimitResult.allowed) {
      return {
        valid: false,
        apiKey: foundKey,
        reason: 'Rate limit exceeded',
        reasonRo: 'Limita de rată depășită',
      };
    }

    // Update usage
    foundKey.usageCount++;
    foundKey.lastUsedAt = new Date();
    foundKey.lastUsedIp = ipAddress;
    this.apiKeys.set(foundKey.id, foundKey);

    return { valid: true, apiKey: foundKey };
  }

  private translateStatus(status: ApiKeyStatus): string {
    const translations: Record<ApiKeyStatus, string> = {
      ACTIVE: 'activă',
      INACTIVE: 'inactivă',
      EXPIRED: 'expirată',
      REVOKED: 'revocată',
    };
    return translations[status];
  }

  private matchesIpPattern(ip: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
        if (regex.test(ip)) return true;
      }
      if (pattern.includes('/')) {
        // CIDR notation - simplified check
        const [network] = pattern.split('/');
        if (ip.startsWith(network.replace(/\.0$/, ''))) return true;
      }
    }
    return false;
  }

  private async checkRateLimit(apiKey: ApiKey): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = new Date();
    const counterKey = apiKey.id;
    let counter = this.rateLimitCounters.get(counterKey);

    if (!counter || now > counter.resetAt) {
      counter = {
        count: 0,
        resetAt: new Date(now.getTime() + apiKey.rateLimitWindow),
      };
    }

    const allowed = counter.count < apiKey.rateLimit;
    if (allowed) {
      counter.count++;
      this.rateLimitCounters.set(counterKey, counter);
    }

    return {
      allowed,
      remaining: Math.max(0, apiKey.rateLimit - counter.count),
      resetAt: counter.resetAt,
    };
  }

  async getById(id: string): Promise<ApiKey | null> {
    return this.apiKeys.get(id) || null;
  }

  async getByOrganization(organizationId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(k => k.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(
    id: string,
    updates: Partial<Pick<ApiKey, 'name' | 'nameRo' | 'description' | 'descriptionRo' | 'scopes' | 'ipWhitelist' | 'rateLimit' | 'rateLimitWindow' | 'expiresAt' | 'metadata'>>
  ): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    const updated: ApiKey = {
      ...apiKey,
      ...updates,
      updatedAt: new Date(),
    };

    this.apiKeys.set(id, updated);
    this.eventEmitter.emit('apikey.updated', { apiKey: updated });
    return updated;
  }

  async activate(id: string): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    if (apiKey.status === 'REVOKED') {
      throw new Error('Cannot activate revoked API key');
    }

    apiKey.status = 'ACTIVE';
    apiKey.updatedAt = new Date();
    this.apiKeys.set(id, apiKey);
    this.eventEmitter.emit('apikey.activated', { apiKey });
    return apiKey;
  }

  async deactivate(id: string): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.status = 'INACTIVE';
    apiKey.updatedAt = new Date();
    this.apiKeys.set(id, apiKey);
    this.eventEmitter.emit('apikey.deactivated', { apiKey });
    return apiKey;
  }

  async revoke(id: string): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.status = 'REVOKED';
    apiKey.updatedAt = new Date();
    this.apiKeys.set(id, apiKey);
    this.eventEmitter.emit('apikey.revoked', { apiKey });
    return apiKey;
  }

  async delete(id: string): Promise<void> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    this.apiKeys.delete(id);
    this.usageLogs.delete(id);
    this.rateLimitCounters.delete(id);
    this.eventEmitter.emit('apikey.deleted', { apiKeyId: id });
  }

  async regenerate(id: string): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
    const existing = this.apiKeys.get(id);
    if (!existing) {
      throw new Error('API key not found');
    }

    // Generate new key
    const keyBytes = randomBytes(32);
    const plainTextKey = `dk_${keyBytes.toString('hex')}`;
    const keyPrefix = plainTextKey.substring(0, 10);
    const keyHash = this.hashKey(plainTextKey);

    existing.keyHash = keyHash;
    existing.keyPrefix = keyPrefix;
    existing.status = 'ACTIVE';
    existing.usageCount = 0;
    existing.lastUsedAt = undefined;
    existing.lastUsedIp = undefined;
    existing.updatedAt = new Date();

    this.apiKeys.set(id, existing);
    this.rateLimitCounters.delete(id);
    this.eventEmitter.emit('apikey.regenerated', { apiKey: existing });

    return { apiKey: existing, plainTextKey };
  }

  // Usage logging
  async logUsage(
    apiKeyId: string,
    usage: Omit<ApiKeyUsage, 'id' | 'apiKeyId' | 'organizationId' | 'timestamp'>
  ): Promise<ApiKeyUsage> {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    const log: ApiKeyUsage = {
      id: randomUUID(),
      apiKeyId,
      organizationId: apiKey.organizationId,
      ...usage,
      timestamp: new Date(),
    };

    const logs = this.usageLogs.get(apiKeyId) || [];
    logs.push(log);
    this.usageLogs.set(apiKeyId, logs);

    this.eventEmitter.emit('apikey.usage', { usage: log });
    return log;
  }

  async getUsage(
    apiKeyId: string,
    options?: { from?: Date; to?: Date; limit?: number }
  ): Promise<ApiKeyUsage[]> {
    let logs = this.usageLogs.get(apiKeyId) || [];

    if (options?.from) {
      logs = logs.filter(l => l.timestamp >= options.from!);
    }

    if (options?.to) {
      logs = logs.filter(l => l.timestamp <= options.to!);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  async getOrganizationUsage(
    organizationId: string,
    options?: { from?: Date; to?: Date }
  ): Promise<ApiKeyUsage[]> {
    const allLogs: ApiKeyUsage[] = [];

    for (const logs of this.usageLogs.values()) {
      for (const log of logs) {
        if (log.organizationId === organizationId) {
          if (options?.from && log.timestamp < options.from) continue;
          if (options?.to && log.timestamp > options.to) continue;
          allLogs.push(log);
        }
      }
    }

    return allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Statistics
  async getStatistics(organizationId: string): Promise<ApiKeyStatistics> {
    const keys = await this.getByOrganization(organizationId);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalUsage = 0;
    let usageToday = 0;
    let usageThisMonth = 0;
    const endpointCounts: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let errorCount = 0;

    for (const key of keys) {
      const logs = this.usageLogs.get(key.id) || [];
      totalUsage += logs.length;

      for (const log of logs) {
        if (log.timestamp >= startOfDay) usageToday++;
        if (log.timestamp >= startOfMonth) usageThisMonth++;

        endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
        totalResponseTime += log.responseTimeMs;
        responseTimeCount++;

        if (log.statusCode >= 400) errorCount++;
      }
    }

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.status === 'ACTIVE').length,
      expiredKeys: keys.filter(k => k.status === 'EXPIRED').length,
      revokedKeys: keys.filter(k => k.status === 'REVOKED').length,
      totalUsage,
      usageToday,
      usageThisMonth,
      topEndpoints: Object.entries(endpointCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      avgResponseTime: responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0,
      errorRate: totalUsage > 0 ? (errorCount / totalUsage) * 100 : 0,
    };
  }

  // Cleanup expired keys
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [id, apiKey] of this.apiKeys) {
      if (apiKey.expiresAt && apiKey.expiresAt < now && apiKey.status === 'ACTIVE') {
        apiKey.status = 'EXPIRED';
        apiKey.updatedAt = now;
        this.apiKeys.set(id, apiKey);
        count++;
      }
    }

    if (count > 0) {
      this.eventEmitter.emit('apikey.cleanup', { expiredCount: count });
    }

    return count;
  }

  // Metadata
  async getScopes(): Promise<{ scope: ApiKeyScope; name: string; nameRo: string; description: string; descriptionRo: string }[]> {
    return [
      { scope: 'READ', name: 'Read', nameRo: 'Citire', description: 'Read-only access', descriptionRo: 'Acces doar pentru citire' },
      { scope: 'WRITE', name: 'Write', nameRo: 'Scriere', description: 'Create and update access', descriptionRo: 'Acces pentru creare și actualizare' },
      { scope: 'DELETE', name: 'Delete', nameRo: 'Ștergere', description: 'Delete access', descriptionRo: 'Acces pentru ștergere' },
      { scope: 'ADMIN', name: 'Admin', nameRo: 'Administrator', description: 'Full administrative access', descriptionRo: 'Acces administrativ complet' },
      { scope: 'INVOICES', name: 'Invoices', nameRo: 'Facturi', description: 'Invoice management', descriptionRo: 'Gestionare facturi' },
      { scope: 'CUSTOMERS', name: 'Customers', nameRo: 'Clienți', description: 'Customer management', descriptionRo: 'Gestionare clienți' },
      { scope: 'PRODUCTS', name: 'Products', nameRo: 'Produse', description: 'Product management', descriptionRo: 'Gestionare produse' },
      { scope: 'REPORTS', name: 'Reports', nameRo: 'Rapoarte', description: 'Report access', descriptionRo: 'Acces rapoarte' },
      { scope: 'ANAF', name: 'ANAF', nameRo: 'ANAF', description: 'ANAF integration access', descriptionRo: 'Acces integrare ANAF' },
      { scope: 'PAYMENTS', name: 'Payments', nameRo: 'Plăți', description: 'Payment processing', descriptionRo: 'Procesare plăți' },
      { scope: 'WEBHOOKS', name: 'Webhooks', nameRo: 'Webhook-uri', description: 'Webhook management', descriptionRo: 'Gestionare webhook-uri' },
    ];
  }

  async getStatuses(): Promise<{ status: ApiKeyStatus; name: string; nameRo: string }[]> {
    return [
      { status: 'ACTIVE', name: 'Active', nameRo: 'Activă' },
      { status: 'INACTIVE', name: 'Inactive', nameRo: 'Inactivă' },
      { status: 'EXPIRED', name: 'Expired', nameRo: 'Expirată' },
      { status: 'REVOKED', name: 'Revoked', nameRo: 'Revocată' },
    ];
  }

  // Audit
  async getAuditLog(organizationId: string, limit: number = 100): Promise<{
    action: string;
    apiKeyId: string;
    apiKeyName: string;
    performedBy?: string;
    timestamp: Date;
    details?: Record<string, any>;
  }[]> {
    // In a real implementation, this would pull from an audit log store
    // For now, return recent usage as a proxy
    const usage = await this.getOrganizationUsage(organizationId);
    return usage.slice(0, limit).map(u => ({
      action: 'API_CALL',
      apiKeyId: u.apiKeyId,
      apiKeyName: this.apiKeys.get(u.apiKeyId)?.name || 'Unknown',
      timestamp: u.timestamp,
      details: {
        endpoint: u.endpoint,
        method: u.method,
        statusCode: u.statusCode,
      },
    }));
  }
}
