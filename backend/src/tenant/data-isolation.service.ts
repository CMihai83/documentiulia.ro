import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Types
export type IsolationLevel = 'strict' | 'standard' | 'relaxed';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type AccessType = 'read' | 'write' | 'delete' | 'export';

// Interfaces
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
  sessionId: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface IsolationPolicy {
  id: string;
  name: string;
  tenantId: string;
  level: IsolationLevel;
  dataClassifications: DataClassification[];
  encryptionRequired: boolean;
  auditRequired: boolean;
  retentionDays: number;
  allowedExportFormats: string[];
  ipWhitelist?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataAccessRule {
  id: string;
  policyId: string;
  resource: string;
  action: AccessType;
  conditions: AccessCondition[];
  allow: boolean;
  priority: number;
}

export interface AccessCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'contains' | 'matches';
  value: any;
}

export interface AccessAttempt {
  id: string;
  tenantId: string;
  userId: string;
  resource: string;
  action: AccessType;
  targetTenantId?: string;
  allowed: boolean;
  reason?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
  algorithm: string;
}

export interface TenantEncryptionKey {
  tenantId: string;
  keyId: string;
  version: number;
  algorithm: string;
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt?: Date;
  status: 'active' | 'rotated' | 'revoked';
}

export interface DataMaskingRule {
  id: string;
  tenantId: string;
  field: string;
  pattern: string;
  replacement: string;
  applyTo: string[];
}

export interface CrossTenantRequest {
  id: string;
  sourceTenantId: string;
  targetTenantId: string;
  resource: string;
  action: AccessType;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reason: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IsolationStats {
  totalAccessAttempts: number;
  allowedAttempts: number;
  deniedAttempts: number;
  crossTenantAttempts: number;
  encryptedRecords: number;
  maskedFields: number;
  activePolicies: number;
  pendingCrossTenantRequests: number;
}

@Injectable()
export class DataIsolationService {
  private readonly logger = new Logger(DataIsolationService.name);

  // In-memory storage
  private policies: Map<string, IsolationPolicy> = new Map();
  private accessRules: Map<string, DataAccessRule> = new Map();
  private accessLog: AccessAttempt[] = [];
  private encryptionKeys: Map<string, TenantEncryptionKey> = new Map();
  private maskingRules: Map<string, DataMaskingRule> = new Map();
  private crossTenantRequests: Map<string, CrossTenantRequest> = new Map();
  private tenantContexts: Map<string, TenantContext> = new Map();

  // ID counters
  private policyIdCounter = 0;
  private ruleIdCounter = 0;
  private attemptIdCounter = 0;
  private keyIdCounter = 0;
  private maskRuleIdCounter = 0;
  private requestIdCounter = 0;

  // Default encryption key for demo
  private readonly masterKey: Buffer;

  constructor(private configService: ConfigService) {
    // In production, this would come from a secure key management service
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY') ||
      crypto.randomBytes(32).toString('hex');
    this.masterKey = Buffer.from(keyHex.substring(0, 64), 'hex');

    this.initializeDefaults();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private initializeDefaults(): void {
    // Create default isolation policy
    const defaultPolicy: IsolationPolicy = {
      id: 'policy-default',
      name: 'Default Isolation Policy',
      tenantId: '*',
      level: 'standard',
      dataClassifications: ['public', 'internal', 'confidential'],
      encryptionRequired: true,
      auditRequired: true,
      retentionDays: 365,
      allowedExportFormats: ['csv', 'json', 'xlsx'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(defaultPolicy.id, defaultPolicy);
    this.logger.log('Initialized default isolation policy');
  }

  // =================== TENANT CONTEXT ===================

  setTenantContext(context: TenantContext): void {
    this.tenantContexts.set(context.sessionId, context);
    this.logger.debug(`Set tenant context for session ${context.sessionId}`);
  }

  getTenantContext(sessionId: string): TenantContext | null {
    return this.tenantContexts.get(sessionId) || null;
  }

  clearTenantContext(sessionId: string): void {
    this.tenantContexts.delete(sessionId);
  }

  validateTenantContext(sessionId: string, expectedTenantId: string): boolean {
    const context = this.getTenantContext(sessionId);
    if (!context) return false;
    return context.tenantId === expectedTenantId;
  }

  // =================== ISOLATION POLICIES ===================

  async createPolicy(
    name: string,
    tenantId: string,
    level: IsolationLevel,
    options?: {
      dataClassifications?: DataClassification[];
      encryptionRequired?: boolean;
      auditRequired?: boolean;
      retentionDays?: number;
      allowedExportFormats?: string[];
      ipWhitelist?: string[];
    },
  ): Promise<IsolationPolicy> {
    const policy: IsolationPolicy = {
      id: this.generateId('policy', ++this.policyIdCounter),
      name,
      tenantId,
      level,
      dataClassifications: options?.dataClassifications || ['public', 'internal'],
      encryptionRequired: options?.encryptionRequired ?? true,
      auditRequired: options?.auditRequired ?? true,
      retentionDays: options?.retentionDays || 365,
      allowedExportFormats: options?.allowedExportFormats || ['csv', 'json'],
      ipWhitelist: options?.ipWhitelist,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policy.id, policy);
    this.logger.log(`Created isolation policy: ${name} for tenant ${tenantId}`);
    return policy;
  }

  async getPolicy(policyId: string): Promise<IsolationPolicy | null> {
    return this.policies.get(policyId) || null;
  }

  async getTenantPolicy(tenantId: string): Promise<IsolationPolicy | null> {
    // Find tenant-specific policy or return default
    for (const policy of this.policies.values()) {
      if (policy.tenantId === tenantId) {
        return policy;
      }
    }
    return this.policies.get('policy-default') || null;
  }

  async updatePolicy(
    policyId: string,
    updates: Partial<Omit<IsolationPolicy, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<IsolationPolicy | null> {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    const updated: IsolationPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updated);
    return updated;
  }

  async deletePolicy(policyId: string): Promise<boolean> {
    if (policyId === 'policy-default') return false;
    return this.policies.delete(policyId);
  }

  // =================== ACCESS RULES ===================

  async createAccessRule(
    policyId: string,
    resource: string,
    action: AccessType,
    allow: boolean,
    conditions?: AccessCondition[],
    priority?: number,
  ): Promise<DataAccessRule> {
    const rule: DataAccessRule = {
      id: this.generateId('rule', ++this.ruleIdCounter),
      policyId,
      resource,
      action,
      conditions: conditions || [],
      allow,
      priority: priority || 1,
    };

    this.accessRules.set(rule.id, rule);
    return rule;
  }

  async getAccessRules(policyId: string): Promise<DataAccessRule[]> {
    return Array.from(this.accessRules.values())
      .filter(r => r.policyId === policyId)
      .sort((a, b) => b.priority - a.priority);
  }

  async deleteAccessRule(ruleId: string): Promise<boolean> {
    return this.accessRules.delete(ruleId);
  }

  // =================== ACCESS CONTROL ===================

  async checkAccess(
    tenantId: string,
    userId: string,
    resource: string,
    action: AccessType,
    targetTenantId?: string,
    ipAddress?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get tenant policy
    const policy = await this.getTenantPolicy(tenantId);
    if (!policy) {
      return { allowed: false, reason: 'No isolation policy found' };
    }

    // Check IP whitelist if configured
    if (policy.ipWhitelist && policy.ipWhitelist.length > 0 && ipAddress) {
      if (!policy.ipWhitelist.includes(ipAddress)) {
        await this.logAccessAttempt(tenantId, userId, resource, action, false, 'IP not whitelisted', targetTenantId, ipAddress);
        return { allowed: false, reason: 'IP not whitelisted' };
      }
    }

    // Check cross-tenant access
    if (targetTenantId && targetTenantId !== tenantId) {
      const crossTenantResult = await this.checkCrossTenantAccess(
        tenantId,
        targetTenantId,
        resource,
        action,
        userId,
      );
      await this.logAccessAttempt(tenantId, userId, resource, action, crossTenantResult.allowed, crossTenantResult.reason, targetTenantId, ipAddress);
      return crossTenantResult;
    }

    // Check access rules
    const rules = await this.getAccessRules(policy.id);
    for (const rule of rules) {
      if (this.matchesRule(resource, action, rule)) {
        const result = { allowed: rule.allow, reason: rule.allow ? undefined : 'Access denied by rule' };
        await this.logAccessAttempt(tenantId, userId, resource, action, result.allowed, result.reason, targetTenantId, ipAddress);
        return result;
      }
    }

    // Default: allow for same tenant
    await this.logAccessAttempt(tenantId, userId, resource, action, true, undefined, targetTenantId, ipAddress);
    return { allowed: true };
  }

  private matchesRule(resource: string, action: AccessType, rule: DataAccessRule): boolean {
    // Check resource pattern
    const resourcePattern = rule.resource.replace('*', '.*');
    const resourceRegex = new RegExp(`^${resourcePattern}$`);
    if (!resourceRegex.test(resource)) return false;

    // Check action
    if (rule.action !== action) return false;

    return true;
  }

  private async checkCrossTenantAccess(
    sourceTenantId: string,
    targetTenantId: string,
    resource: string,
    action: AccessType,
    userId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check for approved cross-tenant request
    for (const request of this.crossTenantRequests.values()) {
      if (
        request.sourceTenantId === sourceTenantId &&
        request.targetTenantId === targetTenantId &&
        request.resource === resource &&
        request.action === action &&
        request.status === 'approved' &&
        request.expiresAt > new Date()
      ) {
        return { allowed: true };
      }
    }

    // Strict isolation: deny cross-tenant access by default
    return {
      allowed: false,
      reason: 'Cross-tenant access not permitted without approval',
    };
  }

  private async logAccessAttempt(
    tenantId: string,
    userId: string,
    resource: string,
    action: AccessType,
    allowed: boolean,
    reason?: string,
    targetTenantId?: string,
    ipAddress?: string,
  ): Promise<void> {
    const attempt: AccessAttempt = {
      id: this.generateId('attempt', ++this.attemptIdCounter),
      tenantId,
      userId,
      resource,
      action,
      targetTenantId,
      allowed,
      reason,
      ipAddress,
      timestamp: new Date(),
    };

    this.accessLog.push(attempt);

    // Keep only last 10000 entries
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-10000);
    }

    if (!allowed) {
      this.logger.warn(`Access denied: ${userId} attempted ${action} on ${resource} (${reason})`);
    }
  }

  async getAccessLog(tenantId: string, limit: number = 100): Promise<AccessAttempt[]> {
    return this.accessLog
      .filter(a => a.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // =================== CROSS-TENANT REQUESTS ===================

  async requestCrossTenantAccess(
    sourceTenantId: string,
    targetTenantId: string,
    resource: string,
    action: AccessType,
    requestedBy: string,
    reason: string,
    expirationHours: number = 24,
  ): Promise<CrossTenantRequest> {
    const request: CrossTenantRequest = {
      id: this.generateId('xreq', ++this.requestIdCounter),
      sourceTenantId,
      targetTenantId,
      resource,
      action,
      requestedBy,
      status: 'pending',
      reason,
      expiresAt: new Date(Date.now() + expirationHours * 3600000),
      createdAt: new Date(),
    };

    this.crossTenantRequests.set(request.id, request);
    this.logger.log(`Cross-tenant access requested: ${sourceTenantId} -> ${targetTenantId} for ${resource}`);
    return request;
  }

  async approveCrossTenantRequest(requestId: string, approvedBy: string): Promise<CrossTenantRequest | null> {
    const request = this.crossTenantRequests.get(requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'approved';
    request.approvedBy = approvedBy;
    this.crossTenantRequests.set(requestId, request);

    this.logger.log(`Cross-tenant request ${requestId} approved by ${approvedBy}`);
    return request;
  }

  async rejectCrossTenantRequest(requestId: string, approvedBy: string): Promise<CrossTenantRequest | null> {
    const request = this.crossTenantRequests.get(requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'rejected';
    request.approvedBy = approvedBy;
    this.crossTenantRequests.set(requestId, request);

    return request;
  }

  async getPendingCrossTenantRequests(targetTenantId: string): Promise<CrossTenantRequest[]> {
    return Array.from(this.crossTenantRequests.values())
      .filter(r => r.targetTenantId === targetTenantId && r.status === 'pending');
  }

  // =================== DATA ENCRYPTION ===================

  async createEncryptionKey(tenantId: string): Promise<TenantEncryptionKey> {
    const key: TenantEncryptionKey = {
      tenantId,
      keyId: this.generateId('key', ++this.keyIdCounter),
      version: 1,
      algorithm: 'aes-256-gcm',
      createdAt: new Date(),
      status: 'active',
    };

    this.encryptionKeys.set(key.keyId, key);
    this.logger.log(`Created encryption key for tenant ${tenantId}`);
    return key;
  }

  async getEncryptionKey(tenantId: string): Promise<TenantEncryptionKey | null> {
    for (const key of this.encryptionKeys.values()) {
      if (key.tenantId === tenantId && key.status === 'active') {
        return key;
      }
    }
    return null;
  }

  async rotateEncryptionKey(tenantId: string): Promise<TenantEncryptionKey | null> {
    const currentKey = await this.getEncryptionKey(tenantId);
    if (currentKey) {
      currentKey.status = 'rotated';
      currentKey.rotatedAt = new Date();
      this.encryptionKeys.set(currentKey.keyId, currentKey);
    }

    // Create new key
    const newKey = await this.createEncryptionKey(tenantId);
    newKey.version = currentKey ? currentKey.version + 1 : 1;
    this.encryptionKeys.set(newKey.keyId, newKey);

    return newKey;
  }

  encryptData(tenantId: string, data: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let ciphertext = cipher.update(data, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      keyVersion: 1,
      algorithm: 'aes-256-gcm',
    };
  }

  decryptData(tenantId: string, encrypted: EncryptedData): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const tag = Buffer.from(encrypted.tag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // =================== DATA MASKING ===================

  async createMaskingRule(
    tenantId: string,
    field: string,
    pattern: string,
    replacement: string,
    applyTo: string[],
  ): Promise<DataMaskingRule> {
    const rule: DataMaskingRule = {
      id: this.generateId('mask', ++this.maskRuleIdCounter),
      tenantId,
      field,
      pattern,
      replacement,
      applyTo,
    };

    this.maskingRules.set(rule.id, rule);
    return rule;
  }

  async getMaskingRules(tenantId: string): Promise<DataMaskingRule[]> {
    return Array.from(this.maskingRules.values())
      .filter(r => r.tenantId === tenantId);
  }

  async deleteMaskingRule(ruleId: string): Promise<boolean> {
    return this.maskingRules.delete(ruleId);
  }

  applyMasking(tenantId: string, data: Record<string, any>, context: string): Record<string, any> {
    const rules = Array.from(this.maskingRules.values())
      .filter(r => r.tenantId === tenantId && r.applyTo.includes(context));

    const masked = { ...data };

    for (const rule of rules) {
      if (masked[rule.field] !== undefined) {
        const value = String(masked[rule.field]);
        const regex = new RegExp(rule.pattern, 'g');
        masked[rule.field] = value.replace(regex, rule.replacement);
      }
    }

    return masked;
  }

  // Common masking patterns
  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }

  maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return '***-***-' + digits.slice(-4);
  }

  maskCUI(cui: string): string {
    if (cui.length < 4) return '***';
    return cui.slice(0, 2) + '***' + cui.slice(-2);
  }

  maskIBAN(iban: string): string {
    if (iban.length < 8) return '***';
    return iban.slice(0, 4) + '****' + iban.slice(-4);
  }

  // =================== ROW-LEVEL SECURITY ===================

  buildTenantFilter(tenantId: string): Record<string, any> {
    return {
      OR: [
        { tenantId },
        { organizationId: tenantId },
        { userId: tenantId },
      ],
    };
  }

  validateTenantOwnership(record: any, tenantId: string): boolean {
    if (!record) return false;
    return (
      record.tenantId === tenantId ||
      record.organizationId === tenantId ||
      record.userId === tenantId
    );
  }

  enforceRowLevelSecurity<T extends Record<string, any>>(
    records: T[],
    tenantId: string,
    tenantField: string = 'tenantId',
  ): T[] {
    return records.filter(record => {
      const recordTenantId = record[tenantField];
      return recordTenantId === tenantId;
    });
  }

  // =================== DATA EXPORT COMPLIANCE ===================

  async validateExportPermission(
    tenantId: string,
    userId: string,
    format: string,
    dataClassification: DataClassification,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const policy = await this.getTenantPolicy(tenantId);
    if (!policy) {
      return { allowed: false, reason: 'No policy found' };
    }

    // Check if format is allowed
    if (!policy.allowedExportFormats.includes(format)) {
      return { allowed: false, reason: `Export format ${format} not allowed` };
    }

    // Check data classification
    if (!policy.dataClassifications.includes(dataClassification)) {
      return { allowed: false, reason: `Cannot export ${dataClassification} data` };
    }

    // Restricted data requires special handling
    if (dataClassification === 'restricted') {
      return { allowed: false, reason: 'Restricted data cannot be exported' };
    }

    return { allowed: true };
  }

  // =================== STATISTICS ===================

  async getIsolationStats(tenantId: string): Promise<IsolationStats> {
    const tenantAttempts = this.accessLog.filter(a => a.tenantId === tenantId);

    return {
      totalAccessAttempts: tenantAttempts.length,
      allowedAttempts: tenantAttempts.filter(a => a.allowed).length,
      deniedAttempts: tenantAttempts.filter(a => !a.allowed).length,
      crossTenantAttempts: tenantAttempts.filter(a => a.targetTenantId && a.targetTenantId !== tenantId).length,
      encryptedRecords: 0, // Would track in production
      maskedFields: Array.from(this.maskingRules.values()).filter(r => r.tenantId === tenantId).length,
      activePolicies: Array.from(this.policies.values()).filter(p => p.tenantId === tenantId || p.tenantId === '*').length,
      pendingCrossTenantRequests: Array.from(this.crossTenantRequests.values())
        .filter(r => r.targetTenantId === tenantId && r.status === 'pending').length,
    };
  }

  // =================== UTILITY METHODS ===================

  getIsolationLevels(): IsolationLevel[] {
    return ['strict', 'standard', 'relaxed'];
  }

  getDataClassifications(): DataClassification[] {
    return ['public', 'internal', 'confidential', 'restricted'];
  }

  getAccessTypes(): AccessType[] {
    return ['read', 'write', 'delete', 'export'];
  }
}
