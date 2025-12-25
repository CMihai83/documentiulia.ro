import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'CANCEL'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'PRINT'
  | 'EMAIL'
  | 'DOWNLOAD';

export type EntityType =
  | 'INVOICE'
  | 'CUSTOMER'
  | 'PRODUCT'
  | 'EMPLOYEE'
  | 'USER'
  | 'DOCUMENT'
  | 'TRANSACTION'
  | 'REPORT'
  | 'DECLARATION'
  | 'CONTRACT'
  | 'PAYMENT'
  | 'WORKFLOW'
  | 'SETTING'
  | 'ROLE'
  | 'PERMISSION';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  actionRo: string;
  entityType: EntityType;
  entityTypeRo: string;
  entityId: string;
  entityName?: string;
  userId: string;
  userName: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  changes?: FieldChange[];
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  severity: AuditSeverity;
  hash: string;
  previousHash?: string;
  tenantId?: string;
}

export interface FieldChange {
  field: string;
  fieldRo: string;
  oldValue: any;
  newValue: any;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  action?: AuditAction | AuditAction[];
  entityType?: EntityType | EntityType[];
  entityId?: string;
  userId?: string;
  severity?: AuditSeverity | AuditSeverity[];
  searchText?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditResult {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditConfig {
  retentionYears: number;
  enableHashing: boolean;
  enableAnonymization: boolean;
  criticalActions: AuditAction[];
  excludedFields: string[];
  maxEntriesPerQuery: number;
}

export interface AuditStats {
  totalEntries: number;
  entriesByAction: Record<AuditAction, number>;
  entriesByEntity: Record<EntityType, number>;
  entriesBySeverity: Record<AuditSeverity, number>;
  recentActivity: AuditEntry[];
  topUsers: Array<{ userId: string; userName: string; count: number }>;
}

export interface ComplianceReport {
  id: string;
  name: string;
  nameRo: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalActions: number;
    criticalActions: number;
    uniqueUsers: number;
    entitiesModified: number;
  };
  entries: AuditEntry[];
}

// Romanian translations for actions
const ACTION_TRANSLATIONS: Record<AuditAction, string> = {
  CREATE: 'Creare',
  READ: 'Citire',
  UPDATE: 'Actualizare',
  DELETE: 'Ștergere',
  LOGIN: 'Autentificare',
  LOGOUT: 'Deconectare',
  EXPORT: 'Export',
  IMPORT: 'Import',
  APPROVE: 'Aprobare',
  REJECT: 'Respingere',
  SUBMIT: 'Trimitere',
  CANCEL: 'Anulare',
  ARCHIVE: 'Arhivare',
  RESTORE: 'Restaurare',
  PRINT: 'Tipărire',
  EMAIL: 'Trimitere Email',
  DOWNLOAD: 'Descărcare',
};

// Romanian translations for entity types
const ENTITY_TRANSLATIONS: Record<EntityType, string> = {
  INVOICE: 'Factură',
  CUSTOMER: 'Client',
  PRODUCT: 'Produs',
  EMPLOYEE: 'Angajat',
  USER: 'Utilizator',
  DOCUMENT: 'Document',
  TRANSACTION: 'Tranzacție',
  REPORT: 'Raport',
  DECLARATION: 'Declarație',
  CONTRACT: 'Contract',
  PAYMENT: 'Plată',
  WORKFLOW: 'Flux de Lucru',
  SETTING: 'Setare',
  ROLE: 'Rol',
  PERMISSION: 'Permisiune',
};

@Injectable()
export class AuditTrailService implements OnModuleInit {
  private entries: Map<string, AuditEntry> = new Map();
  private lastHash: string = '';
  private config: AuditConfig = {
    retentionYears: 10, // Romanian tax law compliance
    enableHashing: true,
    enableAnonymization: true,
    criticalActions: ['DELETE', 'APPROVE', 'REJECT', 'SUBMIT'],
    excludedFields: ['password', 'token', 'secret', 'apiKey'],
    maxEntriesPerQuery: 1000,
  };

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize with empty chain
    this.lastHash = this.generateHash('GENESIS');
  }

  // Configuration
  configure(config: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...config };
    this.eventEmitter.emit('audit.configured', { config: this.config });
  }

  getConfig(): AuditConfig {
    return { ...this.config };
  }

  // Core Audit Operations
  async log(
    action: AuditAction,
    entityType: EntityType,
    entityId: string,
    userId: string,
    userName: string,
    options: {
      entityName?: string;
      userRole?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      changes?: FieldChange[];
      previousValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
      tenantId?: string;
    } = {},
  ): Promise<AuditEntry> {
    const timestamp = new Date();
    const severity = this.determineSeverity(action, entityType);

    // Sanitize sensitive data
    const sanitizedChanges = options.changes
      ? this.sanitizeChanges(options.changes)
      : undefined;
    const sanitizedPrevious = options.previousValue
      ? this.sanitizeObject(options.previousValue)
      : undefined;
    const sanitizedNew = options.newValue
      ? this.sanitizeObject(options.newValue)
      : undefined;

    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp,
      action,
      actionRo: ACTION_TRANSLATIONS[action],
      entityType,
      entityTypeRo: ENTITY_TRANSLATIONS[entityType],
      entityId,
      entityName: options.entityName,
      userId,
      userName,
      userRole: options.userRole,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      sessionId: options.sessionId,
      changes: sanitizedChanges,
      previousValue: sanitizedPrevious,
      newValue: sanitizedNew,
      metadata: options.metadata,
      severity,
      hash: '',
      previousHash: this.lastHash,
      tenantId: options.tenantId,
    };

    // Generate tamper-proof hash
    if (this.config.enableHashing) {
      entry.hash = this.generateEntryHash(entry);
      this.lastHash = entry.hash;
    }

    this.entries.set(entry.id, entry);

    this.eventEmitter.emit('audit.logged', {
      entryId: entry.id,
      action,
      entityType,
      entityId,
      severity,
    });

    // Emit critical action alert
    if (this.config.criticalActions.includes(action)) {
      this.eventEmitter.emit('audit.critical', {
        entry,
        message: `Critical action: ${action} on ${entityType} ${entityId}`,
        messageRo: `Acțiune critică: ${ACTION_TRANSLATIONS[action]} pe ${ENTITY_TRANSLATIONS[entityType]} ${entityId}`,
      });
    }

    return entry;
  }

  async logCreate(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    userId: string,
    userName: string,
    newValue: any,
    options?: { ipAddress?: string; tenantId?: string },
  ): Promise<AuditEntry> {
    return this.log('CREATE', entityType, entityId, userId, userName, {
      entityName,
      newValue,
      ...options,
    });
  }

  async logUpdate(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    userId: string,
    userName: string,
    changes: FieldChange[],
    options?: { ipAddress?: string; tenantId?: string },
  ): Promise<AuditEntry> {
    return this.log('UPDATE', entityType, entityId, userId, userName, {
      entityName,
      changes,
      ...options,
    });
  }

  async logDelete(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    userId: string,
    userName: string,
    previousValue: any,
    options?: { ipAddress?: string; tenantId?: string },
  ): Promise<AuditEntry> {
    return this.log('DELETE', entityType, entityId, userId, userName, {
      entityName,
      previousValue,
      ...options,
    });
  }

  async logLogin(
    userId: string,
    userName: string,
    options: { ipAddress?: string; userAgent?: string; sessionId?: string; success?: boolean },
  ): Promise<AuditEntry> {
    return this.log('LOGIN', 'USER', userId, userId, userName, {
      ...options,
      metadata: { success: options.success ?? true },
    });
  }

  async logLogout(
    userId: string,
    userName: string,
    options?: { ipAddress?: string; sessionId?: string },
  ): Promise<AuditEntry> {
    return this.log('LOGOUT', 'USER', userId, userId, userName, options);
  }

  async logApproval(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    userId: string,
    userName: string,
    approved: boolean,
    comment?: string,
    options?: { ipAddress?: string; tenantId?: string },
  ): Promise<AuditEntry> {
    return this.log(approved ? 'APPROVE' : 'REJECT', entityType, entityId, userId, userName, {
      entityName,
      metadata: { approved, comment },
      ...options,
    });
  }

  async logExport(
    entityType: EntityType,
    userId: string,
    userName: string,
    recordCount: number,
    format: string,
    options?: { ipAddress?: string; tenantId?: string },
  ): Promise<AuditEntry> {
    return this.log('EXPORT', entityType, 'BULK', userId, userName, {
      metadata: { recordCount, format },
      ...options,
    });
  }

  async logImport(
    entityType: EntityType,
    userId: string,
    userName: string,
    recordCount: number,
    successCount: number,
    errorCount: number,
    options?: { ipAddress?: string; tenantId?: string },
  ): Promise<AuditEntry> {
    return this.log('IMPORT', entityType, 'BULK', userId, userName, {
      metadata: { recordCount, successCount, errorCount },
      ...options,
    });
  }

  // Query Operations
  async query(query: AuditQuery): Promise<AuditResult> {
    let results = Array.from(this.entries.values());

    // Apply filters
    if (query.startDate) {
      results = results.filter((e) => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter((e) => e.timestamp <= query.endDate!);
    }
    if (query.action) {
      const actions = Array.isArray(query.action) ? query.action : [query.action];
      results = results.filter((e) => actions.includes(e.action));
    }
    if (query.entityType) {
      const types = Array.isArray(query.entityType) ? query.entityType : [query.entityType];
      results = results.filter((e) => types.includes(e.entityType));
    }
    if (query.entityId) {
      results = results.filter((e) => e.entityId === query.entityId);
    }
    if (query.userId) {
      results = results.filter((e) => e.userId === query.userId);
    }
    if (query.severity) {
      const severities = Array.isArray(query.severity) ? query.severity : [query.severity];
      results = results.filter((e) => severities.includes(e.severity));
    }
    if (query.searchText) {
      const search = query.searchText.toLowerCase();
      results = results.filter(
        (e) =>
          e.entityName?.toLowerCase().includes(search) ||
          e.userName.toLowerCase().includes(search) ||
          e.actionRo.toLowerCase().includes(search) ||
          e.entityTypeRo.toLowerCase().includes(search),
      );
    }

    // Sort
    const sortField = query.sortField || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    results.sort((a, b) => {
      const aVal = a[sortField as keyof AuditEntry];
      const bVal = b[sortField as keyof AuditEntry];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 50, this.config.maxEntriesPerQuery);
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = results.slice(startIndex, startIndex + pageSize);

    return {
      entries: paginatedResults,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getEntry(id: string): Promise<AuditEntry | undefined> {
    return this.entries.get(id);
  }

  async getEntityHistory(entityType: EntityType, entityId: string): Promise<AuditEntry[]> {
    const result = await this.query({ entityType, entityId, sortOrder: 'desc' });
    return result.entries;
  }

  async getUserActivity(userId: string, limit: number = 100): Promise<AuditEntry[]> {
    const result = await this.query({ userId, pageSize: limit, sortOrder: 'desc' });
    return result.entries;
  }

  // Integrity Verification
  async verifyIntegrity(startId?: string, endId?: string): Promise<{
    valid: boolean;
    checkedCount: number;
    invalidEntries: string[];
  }> {
    const entries = Array.from(this.entries.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    let checking = !startId;
    let previousHash = this.generateHash('GENESIS'); // Initialize with genesis hash
    const invalidEntries: string[] = [];
    let checkedCount = 0;

    for (const entry of entries) {
      if (!checking && entry.id === startId) {
        checking = true;
      }

      if (checking) {
        checkedCount++;

        // Verify hash chain - compare directly without double-hashing
        if (entry.previousHash !== previousHash) {
          invalidEntries.push(entry.id);
        }

        // Verify entry hash
        const calculatedHash = this.generateEntryHash(entry);
        if (entry.hash !== calculatedHash) {
          invalidEntries.push(entry.id);
        }

        previousHash = entry.hash;

        if (entry.id === endId) {
          break;
        }
      }
    }

    return {
      valid: invalidEntries.length === 0,
      checkedCount,
      invalidEntries,
    };
  }

  // Compliance Reports
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    name?: string,
  ): Promise<ComplianceReport> {
    const result = await this.query({ startDate, endDate, pageSize: this.config.maxEntriesPerQuery });

    const uniqueUsers = new Set(result.entries.map((e) => e.userId));
    const uniqueEntities = new Set(result.entries.map((e) => `${e.entityType}:${e.entityId}`));
    const criticalCount = result.entries.filter((e) =>
      this.config.criticalActions.includes(e.action),
    ).length;

    return {
      id: this.generateId(),
      name: name || 'Compliance Report',
      nameRo: name || 'Raport Conformitate',
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary: {
        totalActions: result.total,
        criticalActions: criticalCount,
        uniqueUsers: uniqueUsers.size,
        entitiesModified: uniqueEntities.size,
      },
      entries: result.entries,
    };
  }

  async generateANAFAuditReport(year: number, month?: number): Promise<ComplianceReport> {
    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = month
      ? new Date(year, month, 0)
      : new Date(year, 11, 31);

    const result = await this.query({
      startDate,
      endDate,
      entityType: ['INVOICE', 'DECLARATION', 'TRANSACTION', 'PAYMENT'],
      pageSize: this.config.maxEntriesPerQuery,
    });

    return {
      id: this.generateId(),
      name: `ANAF Audit Report ${year}${month ? `-${month}` : ''}`,
      nameRo: `Raport Audit ANAF ${year}${month ? `-${String(month).padStart(2, '0')}` : ''}`,
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary: {
        totalActions: result.total,
        criticalActions: result.entries.filter((e) =>
          this.config.criticalActions.includes(e.action),
        ).length,
        uniqueUsers: new Set(result.entries.map((e) => e.userId)).size,
        entitiesModified: new Set(result.entries.map((e) => `${e.entityType}:${e.entityId}`)).size,
      },
      entries: result.entries,
    };
  }

  // Statistics
  getStats(): AuditStats {
    const entries = Array.from(this.entries.values());

    const entriesByAction: Record<AuditAction, number> = {} as Record<AuditAction, number>;
    const entriesByEntity: Record<EntityType, number> = {} as Record<EntityType, number>;
    const entriesBySeverity: Record<AuditSeverity, number> = {
      INFO: 0,
      WARNING: 0,
      CRITICAL: 0,
    };
    const userCounts: Map<string, { userId: string; userName: string; count: number }> = new Map();

    for (const entry of entries) {
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
      entriesByEntity[entry.entityType] = (entriesByEntity[entry.entityType] || 0) + 1;
      entriesBySeverity[entry.severity]++;

      const userKey = entry.userId;
      const existing = userCounts.get(userKey);
      if (existing) {
        existing.count++;
      } else {
        userCounts.set(userKey, { userId: entry.userId, userName: entry.userName, count: 1 });
      }
    }

    const topUsers = Array.from(userCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentActivity = entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalEntries: entries.length,
      entriesByAction,
      entriesByEntity,
      entriesBySeverity,
      recentActivity,
      topUsers,
    };
  }

  // Data Retention
  async purgeOldEntries(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - this.config.retentionYears);

    let purgedCount = 0;
    const entriesToDelete: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.timestamp < cutoffDate) {
        entriesToDelete.push(id);
      }
    }

    for (const id of entriesToDelete) {
      this.entries.delete(id);
      purgedCount++;
    }

    if (purgedCount > 0) {
      this.eventEmitter.emit('audit.purged', {
        count: purgedCount,
        cutoffDate,
        retentionYears: this.config.retentionYears,
      });
    }

    return purgedCount;
  }

  // Anonymization for GDPR
  async anonymizeUser(userId: string): Promise<number> {
    if (!this.config.enableAnonymization) {
      throw new Error('Anonymization is disabled');
    }

    let anonymizedCount = 0;
    const anonymizedId = this.generateHash(userId).substring(0, 16);
    const anonymizedName = 'Utilizator Anonim';

    for (const entry of this.entries.values()) {
      if (entry.userId === userId) {
        entry.userId = anonymizedId;
        entry.userName = anonymizedName;
        entry.ipAddress = undefined;
        entry.userAgent = undefined;
        anonymizedCount++;
      }
    }

    this.eventEmitter.emit('audit.anonymized', {
      originalUserId: userId,
      anonymizedId,
      count: anonymizedCount,
    });

    return anonymizedCount;
  }

  // Export
  async exportToJson(query: AuditQuery): Promise<string> {
    const result = await this.query(query);
    return JSON.stringify(result.entries, null, 2);
  }

  async exportToCsv(query: AuditQuery): Promise<string> {
    const result = await this.query(query);
    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Action (RO)',
      'Entity Type',
      'Entity Type (RO)',
      'Entity ID',
      'Entity Name',
      'User ID',
      'User Name',
      'IP Address',
      'Severity',
    ];

    const rows = result.entries.map((e) => [
      e.id,
      e.timestamp.toISOString(),
      e.action,
      e.actionRo,
      e.entityType,
      e.entityTypeRo,
      e.entityId,
      e.entityName || '',
      e.userId,
      e.userName,
      e.ipAddress || '',
      e.severity,
    ]);

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  }

  // Helpers
  private determineSeverity(action: AuditAction, entityType: EntityType): AuditSeverity {
    if (this.config.criticalActions.includes(action)) {
      return 'CRITICAL';
    }

    if (
      action === 'UPDATE' &&
      ['SETTING', 'ROLE', 'PERMISSION', 'USER'].includes(entityType)
    ) {
      return 'WARNING';
    }

    return 'INFO';
  }

  private sanitizeChanges(changes: FieldChange[]): FieldChange[] {
    return changes.map((change) => ({
      ...change,
      oldValue: this.config.excludedFields.includes(change.field.toLowerCase())
        ? '[REDACTED]'
        : change.oldValue,
      newValue: this.config.excludedFields.includes(change.field.toLowerCase())
        ? '[REDACTED]'
        : change.newValue,
    }));
  }

  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: any = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.config.excludedFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private generateEntryHash(entry: AuditEntry): string {
    const data = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      userId: entry.userId,
      previousHash: entry.previousHash,
    });
    return this.generateHash(data);
  }

  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
