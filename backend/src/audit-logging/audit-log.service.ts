import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'PRINT'
  | 'DOWNLOAD'
  | 'UPLOAD'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'CANCEL'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'SHARE'
  | 'SIGN'
  | 'VERIFY'
  | 'SEND'
  | 'SYNC'
  | 'CONFIGURE'
  | 'GRANT'
  | 'REVOKE'
  | 'FAILED_LOGIN'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET';

export type AuditCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'FINANCIAL'
  | 'COMPLIANCE'
  | 'SYSTEM'
  | 'USER_MANAGEMENT'
  | 'DOCUMENT'
  | 'INVOICE'
  | 'PAYMENT'
  | 'REPORT'
  | 'INTEGRATION'
  | 'SECURITY';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EntityType =
  | 'USER'
  | 'CUSTOMER'
  | 'INVOICE'
  | 'PAYMENT'
  | 'PRODUCT'
  | 'ORDER'
  | 'EMPLOYEE'
  | 'DOCUMENT'
  | 'REPORT'
  | 'SETTING'
  | 'PERMISSION'
  | 'ROLE'
  | 'ORGANIZATION'
  | 'TEMPLATE'
  | 'WORKFLOW'
  | 'INTEGRATION'
  | 'API_KEY'
  | 'EXPORT'
  | 'ANAF_SUBMISSION'
  | 'CONTRACT';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changedFields?: string[];
  metadata?: Record<string, any>;
  description: string;
  descriptionRo: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  requestId?: string;
}

export interface CreateAuditEntryDto {
  action: AuditAction;
  category: AuditCategory;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  description: string;
  descriptionRo: string;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
  requestId?: string;
}

export interface AuditSearchOptions {
  organizationId: string;
  action?: AuditAction;
  category?: AuditCategory;
  severity?: AuditSeverity;
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  success?: boolean;
  from?: Date;
  to?: Date;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'action' | 'severity';
  sortOrder?: 'ASC' | 'DESC';
}

export interface AuditStats {
  totalEntries: number;
  entriesByAction: Record<AuditAction, number>;
  entriesByCategory: Record<AuditCategory, number>;
  entriesBySeverity: Record<AuditSeverity, number>;
  entriesByUser: { userId: string; userName: string; count: number }[];
  entriesByEntity: { entityType: EntityType; count: number }[];
  failedActions: number;
  successRate: number;
  peakHour: number;
  averageResponseTime: number;
}

export interface ComplianceReport {
  organizationId: string;
  generatedAt: Date;
  period: { from: Date; to: Date };
  summary: {
    totalActions: number;
    dataAccessCount: number;
    dataModificationCount: number;
    securityEvents: number;
    complianceEvents: number;
  };
  userActivity: { userId: string; userName: string; actions: number; lastActive: Date }[];
  sensitiveDataAccess: AuditEntry[];
  failedLoginAttempts: AuditEntry[];
  permissionChanges: AuditEntry[];
  dataExports: AuditEntry[];
}

export interface RetentionPolicy {
  id: string;
  name: string;
  nameRo: string;
  category: AuditCategory;
  retentionDays: number;
  archiveAfterDays: number;
  deleteAfterDays: number;
  isActive: boolean;
}

@Injectable()
export class AuditLogService {
  private entries: Map<string, AuditEntry> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultPolicies();
  }

  private generateId(prefix: string): string {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: RetentionPolicy[] = [
      { id: 'pol-auth', name: 'Authentication Logs', nameRo: 'Jurnale Autentificare', category: 'AUTHENTICATION', retentionDays: 365, archiveAfterDays: 90, deleteAfterDays: 2555, isActive: true },
      { id: 'pol-financial', name: 'Financial Logs', nameRo: 'Jurnale Financiare', category: 'FINANCIAL', retentionDays: 3650, archiveAfterDays: 365, deleteAfterDays: 3650, isActive: true },
      { id: 'pol-compliance', name: 'Compliance Logs', nameRo: 'Jurnale Conformitate', category: 'COMPLIANCE', retentionDays: 3650, archiveAfterDays: 365, deleteAfterDays: 3650, isActive: true },
      { id: 'pol-security', name: 'Security Logs', nameRo: 'Jurnale Securitate', category: 'SECURITY', retentionDays: 1825, archiveAfterDays: 365, deleteAfterDays: 1825, isActive: true },
      { id: 'pol-data', name: 'Data Access Logs', nameRo: 'Jurnale Acces Date', category: 'DATA_ACCESS', retentionDays: 365, archiveAfterDays: 90, deleteAfterDays: 730, isActive: true },
    ];

    for (const policy of defaultPolicies) {
      this.retentionPolicies.set(policy.id, policy);
    }
  }

  private determineSeverity(action: AuditAction, category: AuditCategory, success: boolean): AuditSeverity {
    if (!success) {
      if (['LOGIN', 'FAILED_LOGIN'].includes(action)) return 'HIGH';
      if (category === 'SECURITY') return 'CRITICAL';
      return 'MEDIUM';
    }

    if (['FAILED_LOGIN', 'PASSWORD_RESET', 'GRANT', 'REVOKE'].includes(action)) return 'HIGH';
    if (['DELETE', 'ARCHIVE', 'CONFIGURE'].includes(action)) return 'MEDIUM';
    if (category === 'FINANCIAL' || category === 'COMPLIANCE') return 'MEDIUM';
    return 'LOW';
  }

  async log(dto: CreateAuditEntryDto): Promise<AuditEntry> {
    const success = dto.success !== false;
    const severity = this.determineSeverity(dto.action, dto.category, success);

    const entry: AuditEntry = {
      id: this.generateId('audit'),
      timestamp: new Date(),
      action: dto.action,
      category: dto.category,
      severity,
      entityType: dto.entityType,
      entityId: dto.entityId,
      entityName: dto.entityName,
      userId: dto.userId,
      userName: dto.userName,
      userEmail: dto.userEmail,
      userRole: dto.userRole,
      organizationId: dto.organizationId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      sessionId: dto.sessionId,
      oldValue: dto.oldValue,
      newValue: dto.newValue,
      changedFields: this.getChangedFields(dto.oldValue, dto.newValue),
      metadata: dto.metadata,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      success,
      errorMessage: dto.errorMessage,
      duration: dto.duration,
      requestId: dto.requestId,
    };

    this.entries.set(entry.id, entry);
    this.eventEmitter.emit('audit.logged', { entry });

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      this.eventEmitter.emit('audit.alert', { entry });
    }

    return entry;
  }

  private getChangedFields(oldValue?: Record<string, any>, newValue?: Record<string, any>): string[] | undefined {
    if (!oldValue || !newValue) return undefined;

    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

    for (const key of allKeys) {
      if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        changed.push(key);
      }
    }

    return changed.length > 0 ? changed : undefined;
  }

  async logLogin(userId: string, userName: string, organizationId: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): Promise<AuditEntry> {
    return this.log({
      action: success ? 'LOGIN' : 'FAILED_LOGIN',
      category: 'AUTHENTICATION',
      entityType: 'USER',
      entityId: userId,
      userId,
      userName,
      organizationId,
      ipAddress,
      userAgent,
      description: success ? 'User logged in' : 'Failed login attempt',
      descriptionRo: success ? 'Utilizator autentificat' : 'Încercare de autentificare eșuată',
      success,
      errorMessage,
    });
  }

  async logLogout(userId: string, userName: string, organizationId: string, sessionId?: string): Promise<AuditEntry> {
    return this.log({
      action: 'LOGOUT',
      category: 'AUTHENTICATION',
      entityType: 'USER',
      entityId: userId,
      userId,
      userName,
      organizationId,
      sessionId,
      description: 'User logged out',
      descriptionRo: 'Utilizator deconectat',
      success: true,
    });
  }

  async logCreate(entityType: EntityType, entityId: string, entityName: string, userId: string, userName: string, organizationId: string, newValue?: Record<string, any>, category?: AuditCategory): Promise<AuditEntry> {
    return this.log({
      action: 'CREATE',
      category: category || 'DATA_MODIFICATION',
      entityType,
      entityId,
      entityName,
      userId,
      userName,
      organizationId,
      newValue,
      description: 'Created ' + entityType.toLowerCase() + ': ' + entityName,
      descriptionRo: 'Creat ' + this.translateEntityType(entityType) + ': ' + entityName,
      success: true,
    });
  }

  async logUpdate(entityType: EntityType, entityId: string, entityName: string, userId: string, userName: string, organizationId: string, oldValue?: Record<string, any>, newValue?: Record<string, any>, category?: AuditCategory): Promise<AuditEntry> {
    return this.log({
      action: 'UPDATE',
      category: category || 'DATA_MODIFICATION',
      entityType,
      entityId,
      entityName,
      userId,
      userName,
      organizationId,
      oldValue,
      newValue,
      description: 'Updated ' + entityType.toLowerCase() + ': ' + entityName,
      descriptionRo: 'Actualizat ' + this.translateEntityType(entityType) + ': ' + entityName,
      success: true,
    });
  }

  async logDelete(entityType: EntityType, entityId: string, entityName: string, userId: string, userName: string, organizationId: string, oldValue?: Record<string, any>, category?: AuditCategory): Promise<AuditEntry> {
    return this.log({
      action: 'DELETE',
      category: category || 'DATA_MODIFICATION',
      entityType,
      entityId,
      entityName,
      userId,
      userName,
      organizationId,
      oldValue,
      description: 'Deleted ' + entityType.toLowerCase() + ': ' + entityName,
      descriptionRo: 'Șters ' + this.translateEntityType(entityType) + ': ' + entityName,
      success: true,
    });
  }

  async logExport(entityType: EntityType, userId: string, userName: string, organizationId: string, recordCount: number, format: string): Promise<AuditEntry> {
    return this.log({
      action: 'EXPORT',
      category: 'DATA_ACCESS',
      entityType,
      entityId: 'export-' + Date.now(),
      userId,
      userName,
      organizationId,
      metadata: { recordCount, format },
      description: 'Exported ' + recordCount + ' ' + entityType.toLowerCase() + ' records to ' + format,
      descriptionRo: 'Exportat ' + recordCount + ' înregistrări ' + this.translateEntityType(entityType) + ' în ' + format,
      success: true,
    });
  }

  async logANAFSubmission(documentType: string, documentId: string, userId: string, userName: string, organizationId: string, success: boolean, indexNumber?: string, errorMessage?: string): Promise<AuditEntry> {
    return this.log({
      action: 'SUBMIT',
      category: 'COMPLIANCE',
      entityType: 'ANAF_SUBMISSION',
      entityId: documentId,
      entityName: documentType + ' - ' + documentId,
      userId,
      userName,
      organizationId,
      metadata: { documentType, indexNumber },
      description: 'Submitted ' + documentType + ' to ANAF',
      descriptionRo: 'Depus ' + documentType + ' la ANAF',
      success,
      errorMessage,
    });
  }

  async logPermissionChange(targetUserId: string, targetUserName: string, permission: string, action: 'GRANT' | 'REVOKE', userId: string, userName: string, organizationId: string): Promise<AuditEntry> {
    return this.log({
      action,
      category: 'AUTHORIZATION',
      entityType: 'PERMISSION',
      entityId: targetUserId,
      entityName: permission,
      userId,
      userName,
      organizationId,
      metadata: { targetUserId, targetUserName, permission },
      description: action + ' permission ' + permission + ' for ' + targetUserName,
      descriptionRo: (action === 'GRANT' ? 'Acordat' : 'Revocat') + ' permisiunea ' + permission + ' pentru ' + targetUserName,
      success: true,
    });
  }

  async logPasswordChange(userId: string, userName: string, organizationId: string, isReset: boolean): Promise<AuditEntry> {
    return this.log({
      action: isReset ? 'PASSWORD_RESET' : 'PASSWORD_CHANGE',
      category: 'SECURITY',
      entityType: 'USER',
      entityId: userId,
      userId,
      userName,
      organizationId,
      description: isReset ? 'Password reset' : 'Password changed',
      descriptionRo: isReset ? 'Parolă resetată' : 'Parolă schimbată',
      success: true,
    });
  }

  private translateEntityType(entityType: EntityType): string {
    const translations: Record<EntityType, string> = {
      USER: 'utilizator',
      CUSTOMER: 'client',
      INVOICE: 'factură',
      PAYMENT: 'plată',
      PRODUCT: 'produs',
      ORDER: 'comandă',
      EMPLOYEE: 'angajat',
      DOCUMENT: 'document',
      REPORT: 'raport',
      SETTING: 'setare',
      PERMISSION: 'permisiune',
      ROLE: 'rol',
      ORGANIZATION: 'organizație',
      TEMPLATE: 'șablon',
      WORKFLOW: 'flux de lucru',
      INTEGRATION: 'integrare',
      API_KEY: 'cheie API',
      EXPORT: 'export',
      ANAF_SUBMISSION: 'depunere ANAF',
      CONTRACT: 'contract',
    };
    return translations[entityType] || entityType.toLowerCase();
  }

  async getEntry(entryId: string): Promise<AuditEntry | null> {
    return this.entries.get(entryId) || null;
  }

  async search(options: AuditSearchOptions): Promise<{ entries: AuditEntry[]; total: number }> {
    let entries = Array.from(this.entries.values())
      .filter(e => e.organizationId === options.organizationId);

    if (options.action) {
      entries = entries.filter(e => e.action === options.action);
    }
    if (options.category) {
      entries = entries.filter(e => e.category === options.category);
    }
    if (options.severity) {
      entries = entries.filter(e => e.severity === options.severity);
    }
    if (options.entityType) {
      entries = entries.filter(e => e.entityType === options.entityType);
    }
    if (options.entityId) {
      entries = entries.filter(e => e.entityId === options.entityId);
    }
    if (options.userId) {
      entries = entries.filter(e => e.userId === options.userId);
    }
    if (options.success !== undefined) {
      entries = entries.filter(e => e.success === options.success);
    }
    if (options.from) {
      entries = entries.filter(e => e.timestamp >= options.from!);
    }
    if (options.to) {
      entries = entries.filter(e => e.timestamp <= options.to!);
    }
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      entries = entries.filter(e =>
        e.description.toLowerCase().includes(term) ||
        e.descriptionRo.toLowerCase().includes(term) ||
        e.userName.toLowerCase().includes(term) ||
        (e.entityName && e.entityName.toLowerCase().includes(term))
      );
    }

    // Sort
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'DESC';
    entries.sort((a, b) => {
      let aVal: string | number | Date = a[sortBy] as string | number | Date;
      let bVal: string | number | Date = b[sortBy] as string | number | Date;
      if (sortBy === 'timestamp') {
        aVal = a.timestamp.getTime();
        bVal = b.timestamp.getTime();
      }
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'ASC' ? comparison : -comparison;
    });

    const total = entries.length;
    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;

    return {
      entries: entries.slice(start, start + limit),
      total,
    };
  }

  async getEntityHistory(entityType: EntityType, entityId: string, organizationId: string): Promise<AuditEntry[]> {
    return Array.from(this.entries.values())
      .filter(e =>
        e.organizationId === organizationId &&
        e.entityType === entityType &&
        e.entityId === entityId
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getUserActivity(userId: string, organizationId: string, from?: Date, to?: Date): Promise<AuditEntry[]> {
    let entries = Array.from(this.entries.values())
      .filter(e => e.organizationId === organizationId && e.userId === userId);

    if (from) entries = entries.filter(e => e.timestamp >= from);
    if (to) entries = entries.filter(e => e.timestamp <= to);

    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getStats(organizationId: string, from?: Date, to?: Date): Promise<AuditStats> {
    let entries = Array.from(this.entries.values())
      .filter(e => e.organizationId === organizationId);

    if (from) entries = entries.filter(e => e.timestamp >= from);
    if (to) entries = entries.filter(e => e.timestamp <= to);

    const entriesByAction: Record<AuditAction, number> = {} as any;
    const entriesByCategory: Record<AuditCategory, number> = {} as any;
    const entriesBySeverity: Record<AuditSeverity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const userCounts: Record<string, { userId: string; userName: string; count: number }> = {};
    const entityCounts: Record<EntityType, number> = {} as any;
    const hourCounts: Record<number, number> = {};

    for (const entry of entries) {
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
      entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1;
      entriesBySeverity[entry.severity]++;
      entityCounts[entry.entityType] = (entityCounts[entry.entityType] || 0) + 1;

      if (!userCounts[entry.userId]) {
        userCounts[entry.userId] = { userId: entry.userId, userName: entry.userName, count: 0 };
      }
      userCounts[entry.userId].count++;

      const hour = entry.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const failedActions = entries.filter(e => !e.success).length;
    const durations = entries.filter(e => e.duration !== undefined).map(e => e.duration!);

    let peakHour = 0;
    let peakCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > peakCount) {
        peakCount = count;
        peakHour = parseInt(hour);
      }
    }

    return {
      totalEntries: entries.length,
      entriesByAction,
      entriesByCategory,
      entriesBySeverity,
      entriesByUser: Object.values(userCounts).sort((a, b) => b.count - a.count).slice(0, 10),
      entriesByEntity: Object.entries(entityCounts).map(([type, count]) => ({ entityType: type as EntityType, count })).sort((a, b) => b.count - a.count),
      failedActions,
      successRate: entries.length > 0 ? ((entries.length - failedActions) / entries.length) * 100 : 100,
      peakHour,
      averageResponseTime: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    };
  }

  async generateComplianceReport(organizationId: string, from: Date, to: Date): Promise<ComplianceReport> {
    const entries = Array.from(this.entries.values())
      .filter(e => e.organizationId === organizationId && e.timestamp >= from && e.timestamp <= to);

    const dataAccessEntries = entries.filter(e => e.category === 'DATA_ACCESS');
    const dataModificationEntries = entries.filter(e => e.category === 'DATA_MODIFICATION');
    const securityEntries = entries.filter(e => e.category === 'SECURITY' || e.category === 'AUTHENTICATION');
    const complianceEntries = entries.filter(e => e.category === 'COMPLIANCE');

    const userActivity: Record<string, { userId: string; userName: string; actions: number; lastActive: Date }> = {};
    for (const entry of entries) {
      if (!userActivity[entry.userId]) {
        userActivity[entry.userId] = { userId: entry.userId, userName: entry.userName, actions: 0, lastActive: entry.timestamp };
      }
      userActivity[entry.userId].actions++;
      if (entry.timestamp > userActivity[entry.userId].lastActive) {
        userActivity[entry.userId].lastActive = entry.timestamp;
      }
    }

    const sensitiveDataAccess = entries.filter(e =>
      (e.category === 'DATA_ACCESS' || e.category === 'DATA_MODIFICATION') &&
      ['EMPLOYEE', 'PAYMENT', 'CONTRACT'].includes(e.entityType)
    );

    const failedLoginAttempts = entries.filter(e => e.action === 'FAILED_LOGIN');
    const permissionChanges = entries.filter(e => ['GRANT', 'REVOKE'].includes(e.action));
    const dataExports = entries.filter(e => e.action === 'EXPORT');

    return {
      organizationId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalActions: entries.length,
        dataAccessCount: dataAccessEntries.length,
        dataModificationCount: dataModificationEntries.length,
        securityEvents: securityEntries.length,
        complianceEvents: complianceEntries.length,
      },
      userActivity: Object.values(userActivity).sort((a, b) => b.actions - a.actions),
      sensitiveDataAccess,
      failedLoginAttempts,
      permissionChanges,
      dataExports,
    };
  }

  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    return Array.from(this.retentionPolicies.values());
  }

  async updateRetentionPolicy(policyId: string, updates: Partial<RetentionPolicy>): Promise<RetentionPolicy> {
    const policy = this.retentionPolicies.get(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    const updated = { ...policy, ...updates };
    this.retentionPolicies.set(policyId, updated);
    this.eventEmitter.emit('audit.policy.updated', { policy: updated });
    return updated;
  }

  async applyRetentionPolicies(): Promise<{ archived: number; deleted: number }> {
    const now = new Date();
    let archived = 0;
    let deleted = 0;

    for (const [id, entry] of this.entries) {
      const policy = Array.from(this.retentionPolicies.values())
        .find(p => p.category === entry.category && p.isActive);

      if (policy) {
        const entryAge = (now.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);

        if (entryAge > policy.deleteAfterDays) {
          this.entries.delete(id);
          deleted++;
        } else if (entryAge > policy.archiveAfterDays) {
          // In production, would move to archive storage
          archived++;
        }
      }
    }

    this.eventEmitter.emit('audit.retention.applied', { archived, deleted });
    return { archived, deleted };
  }

  async getActions(): Promise<{ action: AuditAction; name: string; nameRo: string }[]> {
    return [
      { action: 'CREATE', name: 'Create', nameRo: 'Creare' },
      { action: 'READ', name: 'Read', nameRo: 'Citire' },
      { action: 'UPDATE', name: 'Update', nameRo: 'Actualizare' },
      { action: 'DELETE', name: 'Delete', nameRo: 'Ștergere' },
      { action: 'LOGIN', name: 'Login', nameRo: 'Autentificare' },
      { action: 'LOGOUT', name: 'Logout', nameRo: 'Deconectare' },
      { action: 'EXPORT', name: 'Export', nameRo: 'Export' },
      { action: 'IMPORT', name: 'Import', nameRo: 'Import' },
      { action: 'PRINT', name: 'Print', nameRo: 'Tipărire' },
      { action: 'DOWNLOAD', name: 'Download', nameRo: 'Descărcare' },
      { action: 'UPLOAD', name: 'Upload', nameRo: 'Încărcare' },
      { action: 'APPROVE', name: 'Approve', nameRo: 'Aprobare' },
      { action: 'REJECT', name: 'Reject', nameRo: 'Respingere' },
      { action: 'SUBMIT', name: 'Submit', nameRo: 'Depunere' },
      { action: 'CANCEL', name: 'Cancel', nameRo: 'Anulare' },
      { action: 'ARCHIVE', name: 'Archive', nameRo: 'Arhivare' },
      { action: 'RESTORE', name: 'Restore', nameRo: 'Restaurare' },
      { action: 'SHARE', name: 'Share', nameRo: 'Partajare' },
      { action: 'SIGN', name: 'Sign', nameRo: 'Semnare' },
      { action: 'VERIFY', name: 'Verify', nameRo: 'Verificare' },
      { action: 'SEND', name: 'Send', nameRo: 'Trimitere' },
      { action: 'SYNC', name: 'Sync', nameRo: 'Sincronizare' },
      { action: 'CONFIGURE', name: 'Configure', nameRo: 'Configurare' },
      { action: 'GRANT', name: 'Grant Permission', nameRo: 'Acordare Permisiune' },
      { action: 'REVOKE', name: 'Revoke Permission', nameRo: 'Revocare Permisiune' },
      { action: 'FAILED_LOGIN', name: 'Failed Login', nameRo: 'Autentificare Eșuată' },
      { action: 'PASSWORD_CHANGE', name: 'Password Change', nameRo: 'Schimbare Parolă' },
      { action: 'PASSWORD_RESET', name: 'Password Reset', nameRo: 'Resetare Parolă' },
    ];
  }

  async getCategories(): Promise<{ category: AuditCategory; name: string; nameRo: string }[]> {
    return [
      { category: 'AUTHENTICATION', name: 'Authentication', nameRo: 'Autentificare' },
      { category: 'AUTHORIZATION', name: 'Authorization', nameRo: 'Autorizare' },
      { category: 'DATA_ACCESS', name: 'Data Access', nameRo: 'Acces Date' },
      { category: 'DATA_MODIFICATION', name: 'Data Modification', nameRo: 'Modificare Date' },
      { category: 'FINANCIAL', name: 'Financial', nameRo: 'Financiar' },
      { category: 'COMPLIANCE', name: 'Compliance', nameRo: 'Conformitate' },
      { category: 'SYSTEM', name: 'System', nameRo: 'Sistem' },
      { category: 'USER_MANAGEMENT', name: 'User Management', nameRo: 'Gestionare Utilizatori' },
      { category: 'DOCUMENT', name: 'Document', nameRo: 'Document' },
      { category: 'INVOICE', name: 'Invoice', nameRo: 'Factură' },
      { category: 'PAYMENT', name: 'Payment', nameRo: 'Plată' },
      { category: 'REPORT', name: 'Report', nameRo: 'Raport' },
      { category: 'INTEGRATION', name: 'Integration', nameRo: 'Integrare' },
      { category: 'SECURITY', name: 'Security', nameRo: 'Securitate' },
    ];
  }

  async getEntityTypes(): Promise<{ type: EntityType; name: string; nameRo: string }[]> {
    return [
      { type: 'USER', name: 'User', nameRo: 'Utilizator' },
      { type: 'CUSTOMER', name: 'Customer', nameRo: 'Client' },
      { type: 'INVOICE', name: 'Invoice', nameRo: 'Factură' },
      { type: 'PAYMENT', name: 'Payment', nameRo: 'Plată' },
      { type: 'PRODUCT', name: 'Product', nameRo: 'Produs' },
      { type: 'ORDER', name: 'Order', nameRo: 'Comandă' },
      { type: 'EMPLOYEE', name: 'Employee', nameRo: 'Angajat' },
      { type: 'DOCUMENT', name: 'Document', nameRo: 'Document' },
      { type: 'REPORT', name: 'Report', nameRo: 'Raport' },
      { type: 'SETTING', name: 'Setting', nameRo: 'Setare' },
      { type: 'PERMISSION', name: 'Permission', nameRo: 'Permisiune' },
      { type: 'ROLE', name: 'Role', nameRo: 'Rol' },
      { type: 'ORGANIZATION', name: 'Organization', nameRo: 'Organizație' },
      { type: 'TEMPLATE', name: 'Template', nameRo: 'Șablon' },
      { type: 'WORKFLOW', name: 'Workflow', nameRo: 'Flux de Lucru' },
      { type: 'INTEGRATION', name: 'Integration', nameRo: 'Integrare' },
      { type: 'API_KEY', name: 'API Key', nameRo: 'Cheie API' },
      { type: 'EXPORT', name: 'Export', nameRo: 'Export' },
      { type: 'ANAF_SUBMISSION', name: 'ANAF Submission', nameRo: 'Depunere ANAF' },
      { type: 'CONTRACT', name: 'Contract', nameRo: 'Contract' },
    ];
  }
}
