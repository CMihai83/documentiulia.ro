import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete' | 'export' | 'import'
  | 'login' | 'logout' | 'password_change' | 'permission_change'
  | 'data_access' | 'data_export' | 'consent_given' | 'consent_revoked'
  | 'retention_applied' | 'archive' | 'restore';

export type AuditCategory =
  | 'authentication' | 'authorization' | 'data' | 'system' | 'compliance' | 'financial';

export type ComplianceFramework = 'GDPR' | 'SOC2' | 'ISO27001' | 'ANAF' | 'PCI_DSS';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

// Interfaces
export interface AuditEntry {
  id: string;
  tenantId: string;
  userId?: string;
  userName?: string;
  action: AuditAction;
  category: AuditCategory;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changes?: FieldChange[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity: SeverityLevel;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
  complianceFlags?: ComplianceFramework[];
  timestamp: Date;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  sensitive: boolean;
}

export interface DataAccessLog {
  id: string;
  tenantId: string;
  userId: string;
  dataType: string;
  dataIds: string[];
  accessType: 'view' | 'download' | 'export' | 'print';
  purpose?: string;
  legalBasis?: string;
  sensitiveData: boolean;
  timestamp: Date;
}

export interface ConsentRecord {
  id: string;
  tenantId: string;
  subjectId: string;
  subjectType: 'customer' | 'employee' | 'vendor';
  consentType: string;
  version: string;
  givenAt: Date;
  revokedAt?: Date;
  method: 'explicit' | 'implied' | 'opt_out';
  proof?: string;
  metadata?: Record<string, any>;
}

export interface RetentionPolicy {
  id: string;
  tenantId: string;
  name: string;
  dataType: string;
  retentionDays: number;
  archiveDays?: number;
  deletionDays: number;
  legalBasis: string;
  exceptions: string[];
  lastApplied?: Date;
  createdAt: Date;
}

export interface ComplianceReport {
  id: string;
  tenantId: string;
  framework: ComplianceFramework;
  reportType: 'audit' | 'access' | 'consent' | 'retention' | 'breach';
  dateRange: { start: Date; end: Date };
  generatedAt: Date;
  generatedBy: string;
  summary: ComplianceSummary;
  entries: AuditEntry[];
}

export interface ComplianceSummary {
  totalEvents: number;
  byAction: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  failedActions: number;
  sensitiveDataAccesses: number;
  complianceScore?: number;
}

export interface AuditQuery {
  tenantId?: string;
  userId?: string;
  action?: AuditAction;
  category?: AuditCategory;
  resourceType?: string;
  resourceId?: string;
  severity?: SeverityLevel;
  success?: boolean;
  fromDate?: Date;
  toDate?: Date;
  complianceFramework?: ComplianceFramework;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  // Storage
  private auditEntries: Map<string, AuditEntry> = new Map();
  private dataAccessLogs: Map<string, DataAccessLog> = new Map();
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();

  // Counters
  private auditIdCounter = 0;
  private accessIdCounter = 0;
  private consentIdCounter = 0;
  private policyIdCounter = 0;
  private reportIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.logger.log('Audit Trail & Compliance Service initialized');
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  // =================== AUDIT LOGGING ===================

  async logAction(
    tenantId: string,
    action: AuditAction,
    category: AuditCategory,
    resourceType: string,
    options: {
      userId?: string;
      userName?: string;
      resourceId?: string;
      resourceName?: string;
      oldValue?: Record<string, any>;
      newValue?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      severity?: SeverityLevel;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
      complianceFlags?: ComplianceFramework[];
    },
  ): Promise<AuditEntry> {
    const changes = this.calculateChanges(options.oldValue, options.newValue);

    const entry: AuditEntry = {
      id: this.generateId('aud', ++this.auditIdCounter),
      tenantId,
      userId: options.userId,
      userName: options.userName,
      action,
      category,
      resourceType,
      resourceId: options.resourceId,
      resourceName: options.resourceName,
      oldValue: options.oldValue,
      newValue: options.newValue,
      changes,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      sessionId: options.sessionId,
      severity: options.severity || this.determineSeverity(action, category),
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      metadata: options.metadata,
      complianceFlags: options.complianceFlags,
      timestamp: new Date(),
    };

    this.auditEntries.set(entry.id, entry);
    this.logger.debug(`Audit: ${action} on ${resourceType} by ${options.userId || 'system'}`);
    return entry;
  }

  private calculateChanges(
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>,
  ): FieldChange[] | undefined {
    if (!oldValue || !newValue) return undefined;

    const changes: FieldChange[] = [];
    const sensitiveFields = ['password', 'secret', 'token', 'ssn', 'cnp', 'salary'];

    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

    for (const key of allKeys) {
      const old = oldValue[key];
      const curr = newValue[key];

      if (JSON.stringify(old) !== JSON.stringify(curr)) {
        const sensitive = sensitiveFields.some(f => key.toLowerCase().includes(f));
        changes.push({
          field: key,
          oldValue: sensitive ? '[REDACTED]' : old,
          newValue: sensitive ? '[REDACTED]' : curr,
          sensitive,
        });
      }
    }

    return changes.length > 0 ? changes : undefined;
  }

  private determineSeverity(action: AuditAction, category: AuditCategory): SeverityLevel {
    if (category === 'authentication' && action === 'login') return 'low';
    if (action === 'delete') return 'high';
    if (action === 'permission_change') return 'high';
    if (category === 'financial') return 'medium';
    if (action === 'data_export') return 'medium';
    return 'low';
  }

  async getAuditEntry(entryId: string): Promise<AuditEntry | null> {
    return this.auditEntries.get(entryId) || null;
  }

  async queryAuditLog(query: AuditQuery): Promise<AuditEntry[]> {
    let entries = Array.from(this.auditEntries.values());

    if (query.tenantId) {
      entries = entries.filter(e => e.tenantId === query.tenantId);
    }
    if (query.userId) {
      entries = entries.filter(e => e.userId === query.userId);
    }
    if (query.action) {
      entries = entries.filter(e => e.action === query.action);
    }
    if (query.category) {
      entries = entries.filter(e => e.category === query.category);
    }
    if (query.resourceType) {
      entries = entries.filter(e => e.resourceType === query.resourceType);
    }
    if (query.resourceId) {
      entries = entries.filter(e => e.resourceId === query.resourceId);
    }
    if (query.severity) {
      entries = entries.filter(e => e.severity === query.severity);
    }
    if (query.success !== undefined) {
      entries = entries.filter(e => e.success === query.success);
    }
    if (query.fromDate) {
      entries = entries.filter(e => e.timestamp >= query.fromDate!);
    }
    if (query.toDate) {
      entries = entries.filter(e => e.timestamp <= query.toDate!);
    }
    if (query.complianceFramework) {
      entries = entries.filter(e =>
        e.complianceFlags?.includes(query.complianceFramework!),
      );
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (query.offset) {
      entries = entries.slice(query.offset);
    }
    if (query.limit) {
      entries = entries.slice(0, query.limit);
    }

    return entries;
  }

  // =================== DATA ACCESS LOGGING ===================

  async logDataAccess(
    tenantId: string,
    userId: string,
    dataType: string,
    dataIds: string[],
    accessType: 'view' | 'download' | 'export' | 'print',
    options?: {
      purpose?: string;
      legalBasis?: string;
      sensitiveData?: boolean;
    },
  ): Promise<DataAccessLog> {
    const log: DataAccessLog = {
      id: this.generateId('dal', ++this.accessIdCounter),
      tenantId,
      userId,
      dataType,
      dataIds,
      accessType,
      purpose: options?.purpose,
      legalBasis: options?.legalBasis,
      sensitiveData: options?.sensitiveData ?? false,
      timestamp: new Date(),
    };

    this.dataAccessLogs.set(log.id, log);

    // Also create audit entry for compliance
    await this.logAction(tenantId, 'data_access', 'compliance', dataType, {
      userId,
      resourceId: dataIds.join(','),
      metadata: { accessType, dataCount: dataIds.length },
      complianceFlags: ['GDPR'],
      severity: options?.sensitiveData ? 'high' : 'low',
    });

    return log;
  }

  async getDataAccessLogs(
    tenantId: string,
    options?: {
      userId?: string;
      dataType?: string;
      fromDate?: Date;
      toDate?: Date;
      sensitiveOnly?: boolean;
      limit?: number;
    },
  ): Promise<DataAccessLog[]> {
    let logs = Array.from(this.dataAccessLogs.values())
      .filter(l => l.tenantId === tenantId);

    if (options?.userId) {
      logs = logs.filter(l => l.userId === options.userId);
    }
    if (options?.dataType) {
      logs = logs.filter(l => l.dataType === options.dataType);
    }
    if (options?.fromDate) {
      logs = logs.filter(l => l.timestamp >= options.fromDate!);
    }
    if (options?.toDate) {
      logs = logs.filter(l => l.timestamp <= options.toDate!);
    }
    if (options?.sensitiveOnly) {
      logs = logs.filter(l => l.sensitiveData);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  // =================== CONSENT MANAGEMENT ===================

  async recordConsent(
    tenantId: string,
    subjectId: string,
    subjectType: 'customer' | 'employee' | 'vendor',
    consentType: string,
    version: string,
    method: 'explicit' | 'implied' | 'opt_out',
    options?: {
      proof?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      id: this.generateId('cns', ++this.consentIdCounter),
      tenantId,
      subjectId,
      subjectType,
      consentType,
      version,
      givenAt: new Date(),
      method,
      proof: options?.proof,
      metadata: options?.metadata,
    };

    this.consentRecords.set(record.id, record);

    await this.logAction(tenantId, 'consent_given', 'compliance', 'consent', {
      resourceId: record.id,
      metadata: { subjectId, consentType, method },
      complianceFlags: ['GDPR'],
    });

    return record;
  }

  async revokeConsent(consentId: string): Promise<ConsentRecord | null> {
    const record = this.consentRecords.get(consentId);
    if (!record || record.revokedAt) return null;

    record.revokedAt = new Date();
    this.consentRecords.set(consentId, record);

    await this.logAction(record.tenantId, 'consent_revoked', 'compliance', 'consent', {
      resourceId: consentId,
      metadata: { subjectId: record.subjectId, consentType: record.consentType },
      complianceFlags: ['GDPR'],
    });

    return record;
  }

  async getConsentRecords(
    tenantId: string,
    options?: {
      subjectId?: string;
      consentType?: string;
      activeOnly?: boolean;
    },
  ): Promise<ConsentRecord[]> {
    let records = Array.from(this.consentRecords.values())
      .filter(r => r.tenantId === tenantId);

    if (options?.subjectId) {
      records = records.filter(r => r.subjectId === options.subjectId);
    }
    if (options?.consentType) {
      records = records.filter(r => r.consentType === options.consentType);
    }
    if (options?.activeOnly) {
      records = records.filter(r => !r.revokedAt);
    }

    return records.sort((a, b) => b.givenAt.getTime() - a.givenAt.getTime());
  }

  async checkConsent(
    tenantId: string,
    subjectId: string,
    consentType: string,
  ): Promise<{ hasConsent: boolean; record?: ConsentRecord }> {
    const records = await this.getConsentRecords(tenantId, {
      subjectId,
      consentType,
      activeOnly: true,
    });

    const active = records.find(r => !r.revokedAt);
    return {
      hasConsent: !!active,
      record: active,
    };
  }

  // =================== RETENTION POLICIES ===================

  async createRetentionPolicy(
    tenantId: string,
    name: string,
    dataType: string,
    retentionDays: number,
    deletionDays: number,
    legalBasis: string,
    options?: {
      archiveDays?: number;
      exceptions?: string[];
    },
  ): Promise<RetentionPolicy> {
    const policy: RetentionPolicy = {
      id: this.generateId('rp', ++this.policyIdCounter),
      tenantId,
      name,
      dataType,
      retentionDays,
      archiveDays: options?.archiveDays,
      deletionDays,
      legalBasis,
      exceptions: options?.exceptions || [],
      createdAt: new Date(),
    };

    this.retentionPolicies.set(policy.id, policy);
    return policy;
  }

  async getRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    return Array.from(this.retentionPolicies.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => a.dataType.localeCompare(b.dataType));
  }

  async applyRetentionPolicy(policyId: string): Promise<{
    policy: RetentionPolicy;
    archived: number;
    deleted: number;
  } | null> {
    const policy = this.retentionPolicies.get(policyId);
    if (!policy) return null;

    // Simulate retention application
    const archived = Math.floor(Math.random() * 100);
    const deleted = Math.floor(Math.random() * 50);

    policy.lastApplied = new Date();
    this.retentionPolicies.set(policyId, policy);

    await this.logAction(policy.tenantId, 'retention_applied', 'compliance', 'retention', {
      resourceId: policyId,
      metadata: { dataType: policy.dataType, archived, deleted },
      complianceFlags: ['GDPR'],
    });

    return { policy, archived, deleted };
  }

  // =================== COMPLIANCE REPORTING ===================

  async generateComplianceReport(
    tenantId: string,
    framework: ComplianceFramework,
    reportType: 'audit' | 'access' | 'consent' | 'retention' | 'breach',
    dateRange: { start: Date; end: Date },
    generatedBy: string,
  ): Promise<ComplianceReport> {
    const entries = await this.queryAuditLog({
      tenantId,
      fromDate: dateRange.start,
      toDate: dateRange.end,
      complianceFramework: framework,
    });

    const summary = this.calculateSummary(entries);

    const report: ComplianceReport = {
      id: this.generateId('rpt', ++this.reportIdCounter),
      tenantId,
      framework,
      reportType,
      dateRange,
      generatedAt: new Date(),
      generatedBy,
      summary,
      entries,
    };

    await this.logAction(tenantId, 'export', 'compliance', 'compliance_report', {
      userId: generatedBy,
      resourceId: report.id,
      metadata: { framework, reportType },
      complianceFlags: [framework],
    });

    return report;
  }

  private calculateSummary(entries: AuditEntry[]): ComplianceSummary {
    const summary: ComplianceSummary = {
      totalEvents: entries.length,
      byAction: {},
      byCategory: {},
      bySeverity: {},
      failedActions: 0,
      sensitiveDataAccesses: 0,
    };

    for (const entry of entries) {
      summary.byAction[entry.action] = (summary.byAction[entry.action] || 0) + 1;
      summary.byCategory[entry.category] = (summary.byCategory[entry.category] || 0) + 1;
      summary.bySeverity[entry.severity] = (summary.bySeverity[entry.severity] || 0) + 1;

      if (!entry.success) summary.failedActions++;
      if (entry.action === 'data_access' && entry.severity === 'high') {
        summary.sensitiveDataAccesses++;
      }
    }

    // Calculate compliance score (simplified)
    const failureRate = entries.length > 0 ? summary.failedActions / entries.length : 0;
    summary.complianceScore = Math.round((1 - failureRate) * 100);

    return summary;
  }

  // =================== USER ACTIVITY ===================

  async getUserActivity(
    tenantId: string,
    userId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    },
  ): Promise<AuditEntry[]> {
    return this.queryAuditLog({
      tenantId,
      userId,
      fromDate: options?.fromDate,
      toDate: options?.toDate,
      limit: options?.limit,
    });
  }

  async getResourceHistory(
    tenantId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<AuditEntry[]> {
    return this.queryAuditLog({
      tenantId,
      resourceType,
      resourceId,
    });
  }

  // =================== METADATA ===================

  getAuditActions(): AuditAction[] {
    return [
      'create', 'read', 'update', 'delete', 'export', 'import',
      'login', 'logout', 'password_change', 'permission_change',
      'data_access', 'data_export', 'consent_given', 'consent_revoked',
      'retention_applied', 'archive', 'restore',
    ];
  }

  getAuditCategories(): AuditCategory[] {
    return ['authentication', 'authorization', 'data', 'system', 'compliance', 'financial'];
  }

  getComplianceFrameworks(): ComplianceFramework[] {
    return ['GDPR', 'SOC2', 'ISO27001', 'ANAF', 'PCI_DSS'];
  }

  getSeverityLevels(): SeverityLevel[] {
    return ['low', 'medium', 'high', 'critical'];
  }
}
