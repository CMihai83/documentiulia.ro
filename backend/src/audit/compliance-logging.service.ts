import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Types
export type ComplianceStandard = 'GDPR' | 'ANAF' | 'SOC2' | 'ISO27001' | 'PCIDSS';
export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';
export type RetentionAction = 'archive' | 'delete' | 'anonymize';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

// Interfaces
export interface ComplianceLog {
  id: string;
  tenantId: string;
  userId: string;
  sessionId?: string;
  timestamp: Date;
  standard: ComplianceStandard;
  category: string;
  action: string;
  resource: string;
  resourceId?: string;
  severity: LogSeverity;
  description: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'partial';
  previousHash?: string;
  hash: string;
}

export interface RetentionPolicy {
  id: string;
  tenantId: string;
  standard: ComplianceStandard;
  retentionDays: number;
  action: RetentionAction;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceAlert {
  id: string;
  tenantId: string;
  standard: ComplianceStandard;
  severity: LogSeverity;
  title: string;
  description: string;
  triggeredBy: string;
  triggerLogId: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface AlertRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  standard?: ComplianceStandard;
  severity?: LogSeverity;
  category?: string;
  action?: string;
  condition: AlertCondition;
  enabled: boolean;
  notifyUsers: string[];
  createdAt: Date;
}

export interface AlertCondition {
  type: 'threshold' | 'pattern' | 'frequency' | 'anomaly';
  threshold?: number;
  timeWindowMinutes?: number;
  pattern?: string;
}

export interface ComplianceReport {
  id: string;
  tenantId: string;
  standard: ComplianceStandard;
  period: { start: Date; end: Date };
  generatedAt: Date;
  generatedBy: string;
  summary: ComplianceReportSummary;
  findings: ComplianceFinding[];
  recommendations: string[];
}

export interface ComplianceReportSummary {
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  successRate: number;
  complianceScore: number;
  topCategories: { category: string; count: number }[];
  topActions: { action: string; count: number }[];
}

export interface ComplianceFinding {
  id: string;
  severity: LogSeverity;
  title: string;
  description: string;
  affectedResources: string[];
  recommendation: string;
  evidence: string[];
}

export interface LogIntegrityCheck {
  tenantId: string;
  checkedAt: Date;
  totalLogs: number;
  validLogs: number;
  invalidLogs: number;
  brokenChain: boolean;
  firstInvalidLogId?: string;
}

export interface ComplianceStats {
  totalLogs: number;
  logsByStandard: { standard: ComplianceStandard; count: number }[];
  logsBySeverity: { severity: LogSeverity; count: number }[];
  successRate: number;
  activeAlerts: number;
  retentionPolicies: number;
  logsNearRetention: number;
  lastIntegrityCheck?: Date;
}

@Injectable()
export class ComplianceLoggingService {
  private readonly logger = new Logger(ComplianceLoggingService.name);

  // In-memory storage
  private logs: Map<string, ComplianceLog> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private alerts: Map<string, ComplianceAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private reports: Map<string, ComplianceReport> = new Map();

  // ID counters
  private logIdCounter = 0;
  private policyIdCounter = 0;
  private alertIdCounter = 0;
  private ruleIdCounter = 0;
  private reportIdCounter = 0;

  // Hash chain tracking per tenant
  private lastLogHash: Map<string, string> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDefaultRetentionPolicies();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private initializeDefaultRetentionPolicies(): void {
    const defaultPolicies = [
      { standard: 'GDPR' as ComplianceStandard, retentionDays: 365 * 3, action: 'anonymize' as RetentionAction },
      { standard: 'ANAF' as ComplianceStandard, retentionDays: 365 * 10, action: 'archive' as RetentionAction },
      { standard: 'SOC2' as ComplianceStandard, retentionDays: 365 * 7, action: 'archive' as RetentionAction },
      { standard: 'ISO27001' as ComplianceStandard, retentionDays: 365 * 3, action: 'archive' as RetentionAction },
      { standard: 'PCIDSS' as ComplianceStandard, retentionDays: 365 * 1, action: 'delete' as RetentionAction },
    ];

    for (const policy of defaultPolicies) {
      const p: RetentionPolicy = {
        id: `retention-default-${policy.standard}`,
        tenantId: '*',
        standard: policy.standard,
        retentionDays: policy.retentionDays,
        action: policy.action,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.retentionPolicies.set(p.id, p);
    }

    this.logger.log('Initialized default retention policies');
  }

  // =================== LOGGING ===================

  async log(
    tenantId: string,
    userId: string,
    standard: ComplianceStandard,
    category: string,
    action: string,
    resource: string,
    details: {
      resourceId?: string;
      severity?: LogSeverity;
      description?: string;
      data?: Record<string, any>;
      outcome?: 'success' | 'failure' | 'partial';
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<ComplianceLog> {
    const previousHash = this.lastLogHash.get(tenantId);

    const logEntry: Omit<ComplianceLog, 'hash'> = {
      id: this.generateId('clog', ++this.logIdCounter),
      tenantId,
      userId,
      sessionId: details.sessionId,
      timestamp: new Date(),
      standard,
      category,
      action,
      resource,
      resourceId: details.resourceId,
      severity: details.severity || 'info',
      description: details.description || `${action} on ${resource}`,
      details: details.data || {},
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      outcome: details.outcome || 'success',
      previousHash,
    };

    // Calculate hash for integrity chain
    const hash = this.calculateHash(logEntry);
    const log: ComplianceLog = { ...logEntry, hash };

    this.logs.set(log.id, log);
    this.lastLogHash.set(tenantId, hash);

    // Check alert rules
    await this.checkAlertRules(log);

    this.logger.debug(`Compliance log: ${standard}/${category}/${action} for ${tenantId}`);
    return log;
  }

  private calculateHash(log: Omit<ComplianceLog, 'hash'>): string {
    const data = JSON.stringify({
      id: log.id,
      tenantId: log.tenantId,
      timestamp: log.timestamp.toISOString(),
      standard: log.standard,
      category: log.category,
      action: log.action,
      resource: log.resource,
      previousHash: log.previousHash,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async getLog(logId: string): Promise<ComplianceLog | null> {
    return this.logs.get(logId) || null;
  }

  async getLogs(
    tenantId: string,
    filters?: {
      standard?: ComplianceStandard;
      category?: string;
      action?: string;
      severity?: LogSeverity;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
    },
    limit: number = 100,
  ): Promise<ComplianceLog[]> {
    let logs = Array.from(this.logs.values())
      .filter(l => l.tenantId === tenantId);

    if (filters?.standard) {
      logs = logs.filter(l => l.standard === filters.standard);
    }
    if (filters?.category) {
      logs = logs.filter(l => l.category === filters.category);
    }
    if (filters?.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters?.severity) {
      logs = logs.filter(l => l.severity === filters.severity);
    }
    if (filters?.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    if (filters?.startDate) {
      logs = logs.filter(l => l.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      logs = logs.filter(l => l.timestamp <= filters.endDate!);
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // =================== GDPR SPECIFIC ===================

  async logDataAccess(
    tenantId: string,
    userId: string,
    resource: string,
    resourceId: string,
    accessType: 'view' | 'export' | 'modify' | 'delete',
    details?: Record<string, any>,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'GDPR', 'data_access', accessType, resource, {
      resourceId,
      description: `${accessType.toUpperCase()} access to ${resource}`,
      data: details,
    });
  }

  async logConsentChange(
    tenantId: string,
    userId: string,
    consentType: string,
    newValue: boolean,
    details?: Record<string, any>,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'GDPR', 'consent', newValue ? 'granted' : 'revoked', 'consent', {
      description: `Consent ${newValue ? 'granted' : 'revoked'} for ${consentType}`,
      data: { consentType, newValue, ...details },
    });
  }

  async logDataExport(
    tenantId: string,
    userId: string,
    requestedBy: string,
    dataTypes: string[],
    format: string,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'GDPR', 'data_portability', 'export', 'personal_data', {
      description: `Personal data export requested by ${requestedBy}`,
      data: { requestedBy, dataTypes, format },
    });
  }

  async logDataDeletion(
    tenantId: string,
    userId: string,
    resource: string,
    resourceId: string,
    reason: string,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'GDPR', 'right_to_erasure', 'delete', resource, {
      resourceId,
      description: `Data deletion: ${resource}`,
      data: { reason },
    });
  }

  // =================== ANAF SPECIFIC ===================

  async logDeclarationSubmission(
    tenantId: string,
    userId: string,
    declarationType: string,
    period: string,
    outcome: 'success' | 'failure' | 'partial',
    details?: Record<string, any>,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'ANAF', 'declaration', 'submit', declarationType, {
      description: `${declarationType} submission for ${period}`,
      data: { period, ...details },
      outcome,
      severity: outcome === 'failure' ? 'error' : 'info',
    });
  }

  async logEfacturaOperation(
    tenantId: string,
    userId: string,
    operation: 'upload' | 'download' | 'validate' | 'sign',
    invoiceNumber: string,
    outcome: 'success' | 'failure',
    details?: Record<string, any>,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'ANAF', 'efactura', operation, 'invoice', {
      resourceId: invoiceNumber,
      description: `e-Factura ${operation} for ${invoiceNumber}`,
      data: details,
      outcome,
    });
  }

  async logSaftGeneration(
    tenantId: string,
    userId: string,
    period: string,
    outcome: 'success' | 'failure',
    fileSize?: number,
    recordCount?: number,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'ANAF', 'saft', 'generate', 'D406', {
      description: `SAF-T D406 generation for ${period}`,
      data: { period, fileSize, recordCount },
      outcome,
    });
  }

  // =================== SECURITY LOGGING ===================

  async logAuthentication(
    tenantId: string,
    userId: string,
    outcome: 'success' | 'failure',
    method: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'SOC2', 'authentication', outcome === 'success' ? 'login' : 'login_failed', 'session', {
      description: `Authentication ${outcome} via ${method}`,
      data: { method, ...details },
      outcome,
      severity: outcome === 'failure' ? 'warning' : 'info',
      ipAddress,
      userAgent,
    });
  }

  async logPermissionChange(
    tenantId: string,
    userId: string,
    targetUserId: string,
    permission: string,
    action: 'grant' | 'revoke',
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'SOC2', 'access_control', action, 'permission', {
      resourceId: targetUserId,
      description: `Permission ${permission} ${action}ed for user ${targetUserId}`,
      data: { targetUserId, permission, action },
    });
  }

  async logSecurityIncident(
    tenantId: string,
    userId: string,
    incidentType: string,
    severity: LogSeverity,
    description: string,
    details?: Record<string, any>,
  ): Promise<ComplianceLog> {
    return this.log(tenantId, userId, 'SOC2', 'security_incident', incidentType, 'system', {
      description,
      data: details,
      severity,
      outcome: 'failure',
    });
  }

  // =================== RETENTION POLICIES ===================

  async createRetentionPolicy(
    tenantId: string,
    standard: ComplianceStandard,
    retentionDays: number,
    action: RetentionAction,
  ): Promise<RetentionPolicy> {
    const policy: RetentionPolicy = {
      id: this.generateId('retention', ++this.policyIdCounter),
      tenantId,
      standard,
      retentionDays,
      action,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.retentionPolicies.set(policy.id, policy);
    return policy;
  }

  async getRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    return Array.from(this.retentionPolicies.values())
      .filter(p => p.tenantId === tenantId || p.tenantId === '*');
  }

  async updateRetentionPolicy(
    policyId: string,
    updates: Partial<Omit<RetentionPolicy, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<RetentionPolicy | null> {
    const policy = this.retentionPolicies.get(policyId);
    if (!policy) return null;

    const updated = { ...policy, ...updates, updatedAt: new Date() };
    this.retentionPolicies.set(policyId, updated);
    return updated;
  }

  async applyRetentionPolicies(tenantId: string): Promise<{ archived: number; deleted: number; anonymized: number }> {
    const policies = await this.getRetentionPolicies(tenantId);
    const now = new Date();
    let archived = 0;
    let deleted = 0;
    let anonymized = 0;

    for (const policy of policies) {
      if (!policy.enabled) continue;

      const cutoffDate = new Date(now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000);

      const logsToProcess = Array.from(this.logs.values())
        .filter(l =>
          (l.tenantId === tenantId || policy.tenantId === '*') &&
          l.standard === policy.standard &&
          l.timestamp < cutoffDate
        );

      for (const log of logsToProcess) {
        switch (policy.action) {
          case 'delete':
            this.logs.delete(log.id);
            deleted++;
            break;
          case 'archive':
            // In production, would move to archive storage
            archived++;
            break;
          case 'anonymize':
            log.userId = 'anonymized';
            log.details = {};
            log.ipAddress = undefined;
            log.userAgent = undefined;
            this.logs.set(log.id, log);
            anonymized++;
            break;
        }
      }
    }

    this.logger.log(`Retention applied for ${tenantId}: ${archived} archived, ${deleted} deleted, ${anonymized} anonymized`);
    return { archived, deleted, anonymized };
  }

  // =================== ALERTS ===================

  async createAlertRule(
    tenantId: string,
    name: string,
    description: string,
    condition: AlertCondition,
    options?: {
      standard?: ComplianceStandard;
      severity?: LogSeverity;
      category?: string;
      action?: string;
      notifyUsers?: string[];
    },
  ): Promise<AlertRule> {
    const rule: AlertRule = {
      id: this.generateId('rule', ++this.ruleIdCounter),
      tenantId,
      name,
      description,
      standard: options?.standard,
      severity: options?.severity,
      category: options?.category,
      action: options?.action,
      condition,
      enabled: true,
      notifyUsers: options?.notifyUsers || [],
      createdAt: new Date(),
    };

    this.alertRules.set(rule.id, rule);
    return rule;
  }

  async getAlertRules(tenantId: string): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values())
      .filter(r => r.tenantId === tenantId);
  }

  async deleteAlertRule(ruleId: string): Promise<boolean> {
    return this.alertRules.delete(ruleId);
  }

  private async checkAlertRules(log: ComplianceLog): Promise<void> {
    const rules = await this.getAlertRules(log.tenantId);

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.standard && rule.standard !== log.standard) continue;
      if (rule.severity && rule.severity !== log.severity) continue;
      if (rule.category && rule.category !== log.category) continue;
      if (rule.action && rule.action !== log.action) continue;

      const triggered = await this.evaluateCondition(rule.condition, log);
      if (triggered) {
        await this.createAlert(log.tenantId, rule, log);
      }
    }
  }

  private async evaluateCondition(condition: AlertCondition, log: ComplianceLog): Promise<boolean> {
    switch (condition.type) {
      case 'threshold':
        // Check if threshold exceeded (e.g., too many failures)
        if (log.severity === 'critical' || log.severity === 'error') {
          const recentLogs = Array.from(this.logs.values())
            .filter(l =>
              l.tenantId === log.tenantId &&
              l.timestamp > new Date(Date.now() - (condition.timeWindowMinutes || 60) * 60000)
            );
          return recentLogs.length >= (condition.threshold || 10);
        }
        return false;

      case 'pattern':
        // Check if log matches pattern
        if (condition.pattern) {
          const regex = new RegExp(condition.pattern);
          return regex.test(log.description) || regex.test(log.action);
        }
        return false;

      case 'frequency':
        // Check if event frequency exceeds threshold
        const windowStart = new Date(Date.now() - (condition.timeWindowMinutes || 5) * 60000);
        const similarLogs = Array.from(this.logs.values())
          .filter(l =>
            l.tenantId === log.tenantId &&
            l.category === log.category &&
            l.action === log.action &&
            l.timestamp > windowStart
          );
        return similarLogs.length >= (condition.threshold || 5);

      default:
        return false;
    }
  }

  private async createAlert(tenantId: string, rule: AlertRule, log: ComplianceLog): Promise<ComplianceAlert> {
    const alert: ComplianceAlert = {
      id: this.generateId('alert', ++this.alertIdCounter),
      tenantId,
      standard: log.standard,
      severity: log.severity,
      title: rule.name,
      description: `Alert triggered: ${rule.description}`,
      triggeredBy: rule.id,
      triggerLogId: log.id,
      status: 'active',
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);
    this.logger.warn(`Compliance alert created: ${alert.title}`);
    return alert;
  }

  async getAlerts(tenantId: string, status?: AlertStatus): Promise<ComplianceAlert[]> {
    let alerts = Array.from(this.alerts.values())
      .filter(a => a.tenantId === tenantId);

    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<ComplianceAlert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    this.alerts.set(alertId, alert);
    return alert;
  }

  async resolveAlert(alertId: string, userId: string): Promise<ComplianceAlert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    this.alerts.set(alertId, alert);
    return alert;
  }

  // =================== INTEGRITY VERIFICATION ===================

  async verifyLogIntegrity(tenantId: string): Promise<LogIntegrityCheck> {
    const logs = Array.from(this.logs.values())
      .filter(l => l.tenantId === tenantId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let validLogs = 0;
    let invalidLogs = 0;
    let brokenChain = false;
    let firstInvalidLogId: string | undefined;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const expectedHash = this.calculateHash({
        id: log.id,
        tenantId: log.tenantId,
        userId: log.userId,
        sessionId: log.sessionId,
        timestamp: log.timestamp,
        standard: log.standard,
        category: log.category,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        severity: log.severity,
        description: log.description,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        outcome: log.outcome,
        previousHash: log.previousHash,
      });

      if (log.hash !== expectedHash) {
        invalidLogs++;
        if (!firstInvalidLogId) {
          firstInvalidLogId = log.id;
          brokenChain = true;
        }
      } else {
        validLogs++;
      }

      // Check chain
      if (i > 0 && log.previousHash !== logs[i - 1].hash) {
        brokenChain = true;
        if (!firstInvalidLogId) {
          firstInvalidLogId = log.id;
        }
      }
    }

    return {
      tenantId,
      checkedAt: new Date(),
      totalLogs: logs.length,
      validLogs,
      invalidLogs,
      brokenChain,
      firstInvalidLogId,
    };
  }

  // =================== REPORTS ===================

  async generateComplianceReport(
    tenantId: string,
    standard: ComplianceStandard,
    period: { start: Date; end: Date },
    generatedBy: string,
  ): Promise<ComplianceReport> {
    const logs = await this.getLogs(tenantId, {
      standard,
      startDate: period.start,
      endDate: period.end,
    }, 10000);

    const totalEvents = logs.length;
    const criticalEvents = logs.filter(l => l.severity === 'critical').length;
    const warningEvents = logs.filter(l => l.severity === 'warning').length;
    const successfulEvents = logs.filter(l => l.outcome === 'success').length;

    // Count by category
    const categoryMap = new Map<string, number>();
    logs.forEach(l => {
      categoryMap.set(l.category, (categoryMap.get(l.category) || 0) + 1);
    });

    // Count by action
    const actionMap = new Map<string, number>();
    logs.forEach(l => {
      actionMap.set(l.action, (actionMap.get(l.action) || 0) + 1);
    });

    const findings: ComplianceFinding[] = [];

    // Generate findings based on patterns
    if (criticalEvents > 0) {
      findings.push({
        id: `finding-${Date.now()}-1`,
        severity: 'critical',
        title: 'Critical Events Detected',
        description: `${criticalEvents} critical events occurred during the period`,
        affectedResources: logs.filter(l => l.severity === 'critical').map(l => l.resource),
        recommendation: 'Review and address all critical events immediately',
        evidence: logs.filter(l => l.severity === 'critical').slice(0, 5).map(l => l.id),
      });
    }

    const failureRate = totalEvents > 0 ? (totalEvents - successfulEvents) / totalEvents : 0;
    if (failureRate > 0.1) {
      findings.push({
        id: `finding-${Date.now()}-2`,
        severity: 'warning',
        title: 'High Failure Rate',
        description: `${(failureRate * 100).toFixed(1)}% of operations failed`,
        affectedResources: [],
        recommendation: 'Investigate root causes of failures',
        evidence: [],
      });
    }

    const report: ComplianceReport = {
      id: this.generateId('report', ++this.reportIdCounter),
      tenantId,
      standard,
      period,
      generatedAt: new Date(),
      generatedBy,
      summary: {
        totalEvents,
        criticalEvents,
        warningEvents,
        successRate: totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 100,
        complianceScore: this.calculateComplianceScore(logs),
        topCategories: Array.from(categoryMap.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topActions: Array.from(actionMap.entries())
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      },
      findings,
      recommendations: this.generateRecommendations(standard, findings),
    };

    this.reports.set(report.id, report);
    return report;
  }

  private calculateComplianceScore(logs: ComplianceLog[]): number {
    if (logs.length === 0) return 100;

    let score = 100;

    // Deduct for critical events
    const criticalCount = logs.filter(l => l.severity === 'critical').length;
    score -= criticalCount * 10;

    // Deduct for errors
    const errorCount = logs.filter(l => l.severity === 'error').length;
    score -= errorCount * 5;

    // Deduct for failures
    const failureCount = logs.filter(l => l.outcome === 'failure').length;
    score -= (failureCount / logs.length) * 20;

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(standard: ComplianceStandard, findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = [];

    if (findings.some(f => f.severity === 'critical')) {
      recommendations.push('Address all critical findings immediately');
    }

    switch (standard) {
      case 'GDPR':
        recommendations.push('Ensure all data access is properly logged');
        recommendations.push('Verify consent management processes');
        break;
      case 'ANAF':
        recommendations.push('Verify all declarations are submitted on time');
        recommendations.push('Ensure e-Factura integration is functioning');
        break;
      case 'SOC2':
        recommendations.push('Review access controls regularly');
        recommendations.push('Monitor for security incidents');
        break;
    }

    return recommendations;
  }

  async getReports(tenantId: string, standard?: ComplianceStandard): Promise<ComplianceReport[]> {
    let reports = Array.from(this.reports.values())
      .filter(r => r.tenantId === tenantId);

    if (standard) {
      reports = reports.filter(r => r.standard === standard);
    }

    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  // =================== STATISTICS ===================

  async getComplianceStats(tenantId: string): Promise<ComplianceStats> {
    const logs = Array.from(this.logs.values())
      .filter(l => l.tenantId === tenantId);

    const standardMap = new Map<ComplianceStandard, number>();
    const severityMap = new Map<LogSeverity, number>();

    logs.forEach(l => {
      standardMap.set(l.standard, (standardMap.get(l.standard) || 0) + 1);
      severityMap.set(l.severity, (severityMap.get(l.severity) || 0) + 1);
    });

    const successCount = logs.filter(l => l.outcome === 'success').length;
    const activeAlerts = Array.from(this.alerts.values())
      .filter(a => a.tenantId === tenantId && a.status === 'active').length;

    return {
      totalLogs: logs.length,
      logsByStandard: Array.from(standardMap.entries())
        .map(([standard, count]) => ({ standard, count })),
      logsBySeverity: Array.from(severityMap.entries())
        .map(([severity, count]) => ({ severity, count })),
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 100,
      activeAlerts,
      retentionPolicies: Array.from(this.retentionPolicies.values())
        .filter(p => p.tenantId === tenantId || p.tenantId === '*').length,
      logsNearRetention: 0, // Would calculate based on retention policies
    };
  }

  // =================== EXPORT ===================

  async exportLogs(
    tenantId: string,
    standard: ComplianceStandard,
    period: { start: Date; end: Date },
    format: 'json' | 'csv',
  ): Promise<{ data: string; filename: string }> {
    const logs = await this.getLogs(tenantId, {
      standard,
      startDate: period.start,
      endDate: period.end,
    }, 100000);

    const filename = `compliance_${standard}_${period.start.toISOString().split('T')[0]}_${period.end.toISOString().split('T')[0]}.${format}`;

    if (format === 'json') {
      return { data: JSON.stringify(logs, null, 2), filename };
    }

    // CSV format
    const headers = ['id', 'timestamp', 'standard', 'category', 'action', 'resource', 'severity', 'outcome', 'description'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp.toISOString(),
      l.standard,
      l.category,
      l.action,
      l.resource,
      l.severity,
      l.outcome,
      `"${l.description.replace(/"/g, '""')}"`,
    ].join(','));

    return { data: [headers.join(','), ...rows].join('\n'), filename };
  }

  getComplianceStandards(): ComplianceStandard[] {
    return ['GDPR', 'ANAF', 'SOC2', 'ISO27001', 'PCIDSS'];
  }

  getLogSeverities(): LogSeverity[] {
    return ['info', 'warning', 'error', 'critical'];
  }
}
