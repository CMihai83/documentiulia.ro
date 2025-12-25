import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type AuditAction =
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE'
  | 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET'
  | 'EXPORT' | 'IMPORT' | 'PRINT' | 'DOWNLOAD'
  | 'APPROVE' | 'REJECT' | 'SUBMIT' | 'SIGN'
  | 'SEND' | 'CANCEL' | 'VOID';

export type AuditEntity =
  | 'USER' | 'CLIENT' | 'INVOICE' | 'PRODUCT' | 'EMPLOYEE' | 'DOCUMENT'
  | 'TRANSACTION' | 'PAYMENT' | 'REPORT' | 'SETTING' | 'WEBHOOK' | 'TEMPLATE'
  | 'ANAF_SUBMISSION' | 'SAGA_SYNC' | 'MIGRATION' | 'NOTIFICATION';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';
export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'PARTIAL';

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName?: string;
  severity: AuditSeverity;
  status: AuditStatus;
  description: string;
  descriptionRo: string;
  changes?: DataChange[];
  metadata: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: Date;
  retentionUntil: Date;
}

export interface DataChange {
  field: string;
  fieldLabel: string;
  fieldLabelRo: string;
  oldValue: any;
  newValue: any;
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED';
}

export interface AuditMetadata {
  source: 'UI' | 'API' | 'SYSTEM' | 'INTEGRATION' | 'CRON';
  module: string;
  correlationId?: string;
  duration?: number;
  errorMessage?: string;
  errorCode?: string;
  additionalInfo?: Record<string, any>;
}

export interface AuditQuery {
  tenantId?: string;
  userId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  entityId?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditPolicy {
  id: string;
  name: string;
  nameRo: string;
  entity: AuditEntity;
  actions: AuditAction[];
  retentionDays: number;
  severity: AuditSeverity;
  alertEnabled: boolean;
  alertRecipients: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditReport {
  id: string;
  name: string;
  nameRo: string;
  tenantId: string;
  type: 'ACTIVITY' | 'COMPLIANCE' | 'SECURITY' | 'DATA_ACCESS';
  period: { start: Date; end: Date };
  filters: Partial<AuditQuery>;
  generatedAt: Date;
  generatedBy: string;
  summary: AuditReportSummary;
  entries: AuditEntry[];
}

export interface AuditReportSummary {
  totalEntries: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byUser: { userId: string; userName: string; count: number }[];
  topEntities: { entityId: string; entityName: string; count: number }[];
}

export interface AuditStats {
  totalEntries: number;
  entriesLast24h: number;
  entriesLast7d: number;
  entriesLast30d: number;
  byAction: Record<AuditAction, number>;
  byEntity: Record<AuditEntity, number>;
  bySeverity: Record<AuditSeverity, number>;
  securityEvents: number;
  failedActions: number;
}

export interface CreateAuditEntryDto {
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  description: string;
  descriptionRo: string;
  changes?: DataChange[];
  metadata?: Partial<AuditMetadata>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

@Injectable()
export class AuditTrailService {
  private entries = new Map<string, AuditEntry>();
  private policies = new Map<string, AuditPolicy>();
  private reports = new Map<string, AuditReport>();

  private readonly defaultRetentionDays = 3650; // 10 years for Romanian tax compliance

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<AuditPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Financial Records',
        nameRo: 'Înregistrări Financiare',
        entity: 'INVOICE',
        actions: ['CREATE', 'UPDATE', 'DELETE', 'VOID', 'SIGN'],
        retentionDays: 3650,
        severity: 'CRITICAL',
        alertEnabled: true,
        alertRecipients: ['admin@company.ro'],
        isActive: true,
      },
      {
        name: 'User Authentication',
        nameRo: 'Autentificare Utilizatori',
        entity: 'USER',
        actions: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET'],
        retentionDays: 365,
        severity: 'SECURITY',
        alertEnabled: true,
        alertRecipients: ['security@company.ro'],
        isActive: true,
      },
      {
        name: 'ANAF Submissions',
        nameRo: 'Depuneri ANAF',
        entity: 'ANAF_SUBMISSION',
        actions: ['CREATE', 'SUBMIT', 'APPROVE', 'REJECT'],
        retentionDays: 3650,
        severity: 'CRITICAL',
        alertEnabled: true,
        alertRecipients: ['accounting@company.ro'],
        isActive: true,
      },
      {
        name: 'Data Export',
        nameRo: 'Export Date',
        entity: 'DOCUMENT',
        actions: ['EXPORT', 'DOWNLOAD', 'PRINT'],
        retentionDays: 1825,
        severity: 'WARNING',
        alertEnabled: false,
        alertRecipients: [],
        isActive: true,
      },
      {
        name: 'Client Data',
        nameRo: 'Date Clienți',
        entity: 'CLIENT',
        actions: ['CREATE', 'UPDATE', 'DELETE', 'ARCHIVE'],
        retentionDays: 3650,
        severity: 'INFO',
        alertEnabled: false,
        alertRecipients: [],
        isActive: true,
      },
    ];

    defaultPolicies.forEach((policy) => {
      const id = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.policies.set(id, {
        ...policy,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  // Logging
  log(dto: CreateAuditEntryDto): AuditEntry {
    const policy = this.findMatchingPolicy(dto.entity, dto.action);
    const retentionDays = policy?.retentionDays || this.defaultRetentionDays;

    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId: dto.tenantId,
      userId: dto.userId,
      userName: dto.userName,
      userEmail: dto.userEmail,
      userRole: dto.userRole,
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId,
      entityName: dto.entityName,
      severity: dto.severity || policy?.severity || 'INFO',
      status: dto.status || 'SUCCESS',
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      changes: dto.changes,
      metadata: {
        source: dto.metadata?.source || 'API',
        module: dto.metadata?.module || dto.entity.toLowerCase(),
        correlationId: dto.metadata?.correlationId,
        duration: dto.metadata?.duration,
        errorMessage: dto.metadata?.errorMessage,
        errorCode: dto.metadata?.errorCode,
        additionalInfo: dto.metadata?.additionalInfo,
      },
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      sessionId: dto.sessionId,
      requestId: dto.requestId,
      timestamp: new Date(),
      retentionUntil: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
    };

    this.entries.set(entry.id, entry);

    // Send alerts if policy requires
    if (policy?.alertEnabled && policy.alertRecipients.length > 0) {
      this.sendAlert(entry, policy);
    }

    this.eventEmitter.emit('audit.entry.created', { entryId: entry.id, severity: entry.severity });
    return entry;
  }

  logCreate(tenantId: string, userId: string, userName: string, userEmail: string, userRole: string, entity: AuditEntity, entityId: string, entityName: string, metadata?: Partial<AuditMetadata>): AuditEntry {
    return this.log({
      tenantId, userId, userName, userEmail, userRole,
      action: 'CREATE',
      entity, entityId, entityName,
      description: `Created ${entity.toLowerCase()} "${entityName}"`,
      descriptionRo: `S-a creat ${this.getEntityNameRo(entity)} "${entityName}"`,
      metadata,
    });
  }

  logUpdate(tenantId: string, userId: string, userName: string, userEmail: string, userRole: string, entity: AuditEntity, entityId: string, entityName: string, changes: DataChange[], metadata?: Partial<AuditMetadata>): AuditEntry {
    return this.log({
      tenantId, userId, userName, userEmail, userRole,
      action: 'UPDATE',
      entity, entityId, entityName, changes,
      description: `Updated ${entity.toLowerCase()} "${entityName}" (${changes.length} field(s) changed)`,
      descriptionRo: `S-a actualizat ${this.getEntityNameRo(entity)} "${entityName}" (${changes.length} câmp(uri) modificat(e))`,
      metadata,
    });
  }

  logDelete(tenantId: string, userId: string, userName: string, userEmail: string, userRole: string, entity: AuditEntity, entityId: string, entityName: string, metadata?: Partial<AuditMetadata>): AuditEntry {
    return this.log({
      tenantId, userId, userName, userEmail, userRole,
      action: 'DELETE',
      entity, entityId, entityName,
      severity: 'WARNING',
      description: `Deleted ${entity.toLowerCase()} "${entityName}"`,
      descriptionRo: `S-a șters ${this.getEntityNameRo(entity)} "${entityName}"`,
      metadata,
    });
  }

  logLogin(tenantId: string, userId: string, userName: string, userEmail: string, userRole: string, success: boolean, ipAddress?: string, userAgent?: string): AuditEntry {
    return this.log({
      tenantId, userId, userName, userEmail, userRole,
      action: 'LOGIN',
      entity: 'USER',
      entityId: userId,
      entityName: userName,
      severity: success ? 'INFO' : 'SECURITY',
      status: success ? 'SUCCESS' : 'FAILURE',
      description: success ? `User "${userName}" logged in` : `Failed login attempt for "${userName}"`,
      descriptionRo: success ? `Utilizatorul "${userName}" s-a autentificat` : `Încercare eșuată de autentificare pentru "${userName}"`,
      ipAddress, userAgent,
    });
  }

  logExport(tenantId: string, userId: string, userName: string, userEmail: string, userRole: string, entity: AuditEntity, entityId: string, format: string, metadata?: Partial<AuditMetadata>): AuditEntry {
    return this.log({
      tenantId, userId, userName, userEmail, userRole,
      action: 'EXPORT',
      entity, entityId,
      severity: 'WARNING',
      description: `Exported ${entity.toLowerCase()} data to ${format}`,
      descriptionRo: `S-au exportat datele ${this.getEntityNameRo(entity)} în format ${format}`,
      metadata,
    });
  }

  logANAFSubmission(tenantId: string, userId: string, userName: string, userEmail: string, userRole: string, submissionId: string, declarationType: string, success: boolean, errorMessage?: string): AuditEntry {
    return this.log({
      tenantId, userId, userName, userEmail, userRole,
      action: 'SUBMIT',
      entity: 'ANAF_SUBMISSION',
      entityId: submissionId,
      entityName: declarationType,
      severity: 'CRITICAL',
      status: success ? 'SUCCESS' : 'FAILURE',
      description: success ? `ANAF ${declarationType} submitted successfully` : `ANAF ${declarationType} submission failed`,
      descriptionRo: success ? `Depunere ANAF ${declarationType} reușită` : `Depunere ANAF ${declarationType} eșuată`,
      metadata: { source: 'INTEGRATION', module: 'anaf', errorMessage },
    });
  }

  private getEntityNameRo(entity: AuditEntity): string {
    const names: Record<AuditEntity, string> = {
      USER: 'utilizatorul',
      CLIENT: 'clientul',
      INVOICE: 'factura',
      PRODUCT: 'produsul',
      EMPLOYEE: 'angajatul',
      DOCUMENT: 'documentul',
      TRANSACTION: 'tranzacția',
      PAYMENT: 'plata',
      REPORT: 'raportul',
      SETTING: 'setarea',
      WEBHOOK: 'webhook-ul',
      TEMPLATE: 'șablonul',
      ANAF_SUBMISSION: 'depunerea ANAF',
      SAGA_SYNC: 'sincronizarea SAGA',
      MIGRATION: 'migrarea',
      NOTIFICATION: 'notificarea',
    };
    return names[entity] || entity.toLowerCase();
  }

  private findMatchingPolicy(entity: AuditEntity, action: AuditAction): AuditPolicy | undefined {
    for (const policy of this.policies.values()) {
      if (policy.isActive && policy.entity === entity && policy.actions.includes(action)) {
        return policy;
      }
    }
    return undefined;
  }

  private sendAlert(entry: AuditEntry, policy: AuditPolicy): void {
    this.eventEmitter.emit('audit.alert', {
      entryId: entry.id,
      policyId: policy.id,
      recipients: policy.alertRecipients,
      severity: entry.severity,
    });
  }

  // Querying
  getEntry(entryId: string): AuditEntry {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new NotFoundException(`Audit entry ${entryId} not found`);
    }
    return entry;
  }

  query(query: AuditQuery): AuditQueryResult {
    let results = Array.from(this.entries.values());

    // Apply filters
    if (query.tenantId) {
      results = results.filter((e) => e.tenantId === query.tenantId);
    }
    if (query.userId) {
      results = results.filter((e) => e.userId === query.userId);
    }
    if (query.action) {
      results = results.filter((e) => e.action === query.action);
    }
    if (query.entity) {
      results = results.filter((e) => e.entity === query.entity);
    }
    if (query.entityId) {
      results = results.filter((e) => e.entityId === query.entityId);
    }
    if (query.severity) {
      results = results.filter((e) => e.severity === query.severity);
    }
    if (query.status) {
      results = results.filter((e) => e.status === query.status);
    }
    if (query.startDate) {
      results = results.filter((e) => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter((e) => e.timestamp <= query.endDate!);
    }
    if (query.searchTerm) {
      const term = query.searchTerm.toLowerCase();
      results = results.filter((e) =>
        e.description.toLowerCase().includes(term) ||
        e.descriptionRo.toLowerCase().includes(term) ||
        e.userName.toLowerCase().includes(term) ||
        e.entityName?.toLowerCase().includes(term) ||
        e.entityId.toLowerCase().includes(term)
      );
    }

    // Sort
    const sortField = query.sortField || 'timestamp';
    const sortOrder = query.sortOrder || 'DESC';
    results.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'ASC' ? cmp : -cmp;
    });

    // Paginate
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    results = results.slice(startIndex, startIndex + pageSize);

    return { entries: results, total, page, pageSize, totalPages };
  }

  getEntityHistory(entity: AuditEntity, entityId: string, limit: number = 50): AuditEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.entity === entity && e.entityId === entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getUserActivity(userId: string, days: number = 30): AuditEntry[] {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.entries.values())
      .filter((e) => e.userId === userId && e.timestamp >= since)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getSecurityEvents(tenantId: string, days: number = 7): AuditEntry[] {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.entries.values())
      .filter((e) => e.tenantId === tenantId && e.severity === 'SECURITY' && e.timestamp >= since)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Policies
  getPolicy(policyId: string): AuditPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} not found`);
    }
    return policy;
  }

  getPolicies(filters?: { entity?: AuditEntity; active?: boolean }): AuditPolicy[] {
    let policies = Array.from(this.policies.values());

    if (filters?.entity) {
      policies = policies.filter((p) => p.entity === filters.entity);
    }
    if (filters?.active !== undefined) {
      policies = policies.filter((p) => p.isActive === filters.active);
    }

    return policies;
  }

  createPolicy(policy: Omit<AuditPolicy, 'id' | 'createdAt' | 'updatedAt'>): AuditPolicy {
    const newPolicy: AuditPolicy = {
      ...policy,
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(newPolicy.id, newPolicy);
    this.eventEmitter.emit('audit.policy.created', { policyId: newPolicy.id });
    return newPolicy;
  }

  updatePolicy(policyId: string, updates: Partial<AuditPolicy>): AuditPolicy {
    const policy = this.getPolicy(policyId);

    const updated: AuditPolicy = {
      ...policy,
      ...updates,
      id: policy.id,
      createdAt: policy.createdAt,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updated);
    return updated;
  }

  deletePolicy(policyId: string): void {
    if (!this.policies.has(policyId)) {
      throw new NotFoundException(`Policy ${policyId} not found`);
    }
    this.policies.delete(policyId);
    this.eventEmitter.emit('audit.policy.deleted', { policyId });
  }

  // Reports
  generateReport(
    tenantId: string,
    name: string,
    nameRo: string,
    type: 'ACTIVITY' | 'COMPLIANCE' | 'SECURITY' | 'DATA_ACCESS',
    period: { start: Date; end: Date },
    filters: Partial<AuditQuery>,
    generatedBy: string,
  ): AuditReport {
    const query: AuditQuery = {
      ...filters,
      tenantId,
      startDate: period.start,
      endDate: period.end,
      pageSize: 10000, // Get all entries for report
    };

    const { entries } = this.query(query);

    // Generate summary
    const byAction: Record<string, number> = {};
    const byEntity: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const userCounts = new Map<string, { userId: string; userName: string; count: number }>();
    const entityCounts = new Map<string, { entityId: string; entityName: string; count: number }>();

    entries.forEach((entry) => {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      byEntity[entry.entity] = (byEntity[entry.entity] || 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;

      const userKey = entry.userId;
      const existing = userCounts.get(userKey);
      if (existing) {
        existing.count++;
      } else {
        userCounts.set(userKey, { userId: entry.userId, userName: entry.userName, count: 1 });
      }

      if (entry.entityId && entry.entityName) {
        const entityKey = `${entry.entity}-${entry.entityId}`;
        const existingEntity = entityCounts.get(entityKey);
        if (existingEntity) {
          existingEntity.count++;
        } else {
          entityCounts.set(entityKey, { entityId: entry.entityId, entityName: entry.entityName, count: 1 });
        }
      }
    });

    const report: AuditReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      nameRo,
      tenantId,
      type,
      period,
      filters,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        totalEntries: entries.length,
        byAction,
        byEntity,
        bySeverity,
        byStatus,
        byUser: Array.from(userCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10),
        topEntities: Array.from(entityCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10),
      },
      entries,
    };

    this.reports.set(report.id, report);
    this.eventEmitter.emit('audit.report.generated', { reportId: report.id });
    return report;
  }

  getReport(reportId: string): AuditReport {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    return report;
  }

  getReports(tenantId: string): AuditReport[] {
    return Array.from(this.reports.values())
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  // Statistics
  getStats(tenantId?: string): AuditStats {
    let entries = Array.from(this.entries.values());

    if (tenantId) {
      entries = entries.filter((e) => e.tenantId === tenantId);
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const byAction: Record<AuditAction, number> = {} as any;
    const byEntity: Record<AuditEntity, number> = {} as any;
    const bySeverity: Record<AuditSeverity, number> = { INFO: 0, WARNING: 0, CRITICAL: 0, SECURITY: 0 };

    let entriesLast24h = 0;
    let entriesLast7d = 0;
    let entriesLast30d = 0;
    let securityEvents = 0;
    let failedActions = 0;

    entries.forEach((entry) => {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      byEntity[entry.entity] = (byEntity[entry.entity] || 0) + 1;
      bySeverity[entry.severity]++;

      const age = now - entry.timestamp.getTime();
      if (age <= day) entriesLast24h++;
      if (age <= 7 * day) entriesLast7d++;
      if (age <= 30 * day) entriesLast30d++;

      if (entry.severity === 'SECURITY') securityEvents++;
      if (entry.status === 'FAILURE') failedActions++;
    });

    return {
      totalEntries: entries.length,
      entriesLast24h,
      entriesLast7d,
      entriesLast30d,
      byAction,
      byEntity,
      bySeverity,
      securityEvents,
      failedActions,
    };
  }

  // Cleanup
  cleanupExpiredEntries(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, entry] of this.entries.entries()) {
      if (entry.retentionUntil < now) {
        this.entries.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.eventEmitter.emit('audit.cleanup.completed', { cleanedCount: cleaned });
    }

    return cleaned;
  }

  // Compliance
  getComplianceStatus(tenantId: string): {
    compliant: boolean;
    issues: { type: string; message: string; messageRo: string }[];
    retentionCompliance: boolean;
    criticalEventsCovered: boolean;
  } {
    const policies = this.getPolicies({ active: true });
    const issues: { type: string; message: string; messageRo: string }[] = [];

    // Check if financial records have proper retention
    const financialPolicy = policies.find((p) => p.entity === 'INVOICE');
    const retentionCompliance = financialPolicy ? financialPolicy.retentionDays >= 3650 : false;

    if (!retentionCompliance) {
      issues.push({
        type: 'RETENTION',
        message: 'Financial records must be retained for at least 10 years',
        messageRo: 'Înregistrările financiare trebuie păstrate cel puțin 10 ani',
      });
    }

    // Check if critical events are audited
    const criticalEntities: AuditEntity[] = ['INVOICE', 'PAYMENT', 'ANAF_SUBMISSION'];
    const criticalEventsCovered = criticalEntities.every((entity) =>
      policies.some((p) => p.entity === entity && p.isActive)
    );

    if (!criticalEventsCovered) {
      issues.push({
        type: 'COVERAGE',
        message: 'Critical financial events must be audited',
        messageRo: 'Evenimentele financiare critice trebuie auditate',
      });
    }

    return {
      compliant: issues.length === 0,
      issues,
      retentionCompliance,
      criticalEventsCovered,
    };
  }

  // Available actions and entities
  getAvailableActions(): { action: AuditAction; label: string; labelRo: string }[] {
    return [
      { action: 'CREATE', label: 'Create', labelRo: 'Creare' },
      { action: 'READ', label: 'Read', labelRo: 'Citire' },
      { action: 'UPDATE', label: 'Update', labelRo: 'Actualizare' },
      { action: 'DELETE', label: 'Delete', labelRo: 'Ștergere' },
      { action: 'ARCHIVE', label: 'Archive', labelRo: 'Arhivare' },
      { action: 'RESTORE', label: 'Restore', labelRo: 'Restaurare' },
      { action: 'LOGIN', label: 'Login', labelRo: 'Autentificare' },
      { action: 'LOGOUT', label: 'Logout', labelRo: 'Deconectare' },
      { action: 'PASSWORD_CHANGE', label: 'Password Change', labelRo: 'Schimbare Parolă' },
      { action: 'PASSWORD_RESET', label: 'Password Reset', labelRo: 'Resetare Parolă' },
      { action: 'EXPORT', label: 'Export', labelRo: 'Export' },
      { action: 'IMPORT', label: 'Import', labelRo: 'Import' },
      { action: 'PRINT', label: 'Print', labelRo: 'Tipărire' },
      { action: 'DOWNLOAD', label: 'Download', labelRo: 'Descărcare' },
      { action: 'APPROVE', label: 'Approve', labelRo: 'Aprobare' },
      { action: 'REJECT', label: 'Reject', labelRo: 'Respingere' },
      { action: 'SUBMIT', label: 'Submit', labelRo: 'Depunere' },
      { action: 'SIGN', label: 'Sign', labelRo: 'Semnare' },
      { action: 'SEND', label: 'Send', labelRo: 'Trimitere' },
      { action: 'CANCEL', label: 'Cancel', labelRo: 'Anulare' },
      { action: 'VOID', label: 'Void', labelRo: 'Anulare Factură' },
    ];
  }

  getAvailableEntities(): { entity: AuditEntity; label: string; labelRo: string }[] {
    return [
      { entity: 'USER', label: 'User', labelRo: 'Utilizator' },
      { entity: 'CLIENT', label: 'Client', labelRo: 'Client' },
      { entity: 'INVOICE', label: 'Invoice', labelRo: 'Factură' },
      { entity: 'PRODUCT', label: 'Product', labelRo: 'Produs' },
      { entity: 'EMPLOYEE', label: 'Employee', labelRo: 'Angajat' },
      { entity: 'DOCUMENT', label: 'Document', labelRo: 'Document' },
      { entity: 'TRANSACTION', label: 'Transaction', labelRo: 'Tranzacție' },
      { entity: 'PAYMENT', label: 'Payment', labelRo: 'Plată' },
      { entity: 'REPORT', label: 'Report', labelRo: 'Raport' },
      { entity: 'SETTING', label: 'Setting', labelRo: 'Setare' },
      { entity: 'WEBHOOK', label: 'Webhook', labelRo: 'Webhook' },
      { entity: 'TEMPLATE', label: 'Template', labelRo: 'Șablon' },
      { entity: 'ANAF_SUBMISSION', label: 'ANAF Submission', labelRo: 'Depunere ANAF' },
      { entity: 'SAGA_SYNC', label: 'SAGA Sync', labelRo: 'Sincronizare SAGA' },
      { entity: 'MIGRATION', label: 'Migration', labelRo: 'Migrare' },
      { entity: 'NOTIFICATION', label: 'Notification', labelRo: 'Notificare' },
    ];
  }
}
