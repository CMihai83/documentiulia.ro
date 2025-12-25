import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface RetentionPolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  documentTypes: string[];
  retentionPeriod: number; // days
  retentionUnit: 'days' | 'months' | 'years';
  action: 'archive' | 'delete' | 'legal_hold' | 'notify';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  legalBasis?: string;
  jurisdiction?: string;
  exemptions?: string[];
  notifyBefore?: number; // days before action
  notifyRecipients?: string[];
}

export interface DocumentRetentionRecord {
  id: string;
  documentId: string;
  documentType: string;
  documentName: string;
  tenantId: string;
  createdAt: Date;
  retentionEndDate: Date;
  policyId: string;
  status: 'active' | 'pending_action' | 'archived' | 'deleted' | 'legal_hold';
  actionTakenAt?: Date;
  actionTakenBy?: string;
  legalHoldReason?: string;
  metadata?: Record<string, any>;
}

export interface RetentionAction {
  id: string;
  documentId: string;
  policyId: string;
  action: 'archive' | 'delete' | 'legal_hold' | 'notify';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  scheduledFor: Date;
  executedAt?: Date;
  executedBy?: string;
  reason?: string;
  error?: string;
}

export interface LegalHold {
  id: string;
  tenantId: string;
  name: string;
  reason: string;
  caseReference?: string;
  documentIds: string[];
  createdAt: Date;
  createdBy: string;
  releasedAt?: Date;
  releasedBy?: string;
  status: 'active' | 'released';
}

@Injectable()
export class DocumentRetentionService {
  private readonly logger = new Logger(DocumentRetentionService.name);

  // In-memory storage for demo
  private policies: Map<string, RetentionPolicy> = new Map();
  private retentionRecords: Map<string, DocumentRetentionRecord[]> = new Map();
  private pendingActions: Map<string, RetentionAction> = new Map();
  private legalHolds: Map<string, LegalHold> = new Map();

  // Default policies based on Romanian/EU regulations
  private readonly defaultPolicies: Partial<RetentionPolicy>[] = [
    {
      name: 'Invoices & Receipts',
      documentTypes: ['invoice', 'receipt', 'credit_note', 'debit_note'],
      retentionPeriod: 10,
      retentionUnit: 'years',
      action: 'archive',
      legalBasis: 'Romanian Fiscal Code Art. 25, EU Directive 2006/112/EC',
      jurisdiction: 'RO',
    },
    {
      name: 'Accounting Records',
      documentTypes: ['ledger', 'journal', 'balance_sheet', 'trial_balance'],
      retentionPeriod: 10,
      retentionUnit: 'years',
      action: 'archive',
      legalBasis: 'Romanian Accounting Law 82/1991',
      jurisdiction: 'RO',
    },
    {
      name: 'Tax Declarations',
      documentTypes: ['vat_return', 'd406', 'd300', 'd390', 'efactura'],
      retentionPeriod: 10,
      retentionUnit: 'years',
      action: 'archive',
      legalBasis: 'ANAF Order 1783/2021, Fiscal Procedure Code',
      jurisdiction: 'RO',
    },
    {
      name: 'Employee Records',
      documentTypes: ['employment_contract', 'payslip', 'tax_form', 'timesheet'],
      retentionPeriod: 75,
      retentionUnit: 'years',
      action: 'archive',
      legalBasis: 'Romanian Labor Code, GDPR Art. 17(3)',
      jurisdiction: 'RO',
    },
    {
      name: 'GDPR Personal Data',
      documentTypes: ['consent_form', 'dsr_request', 'personal_data_export'],
      retentionPeriod: 5,
      retentionUnit: 'years',
      action: 'delete',
      legalBasis: 'GDPR Art. 17, Art. 5(1)(e)',
      jurisdiction: 'EU',
    },
    {
      name: 'Client Contracts',
      documentTypes: ['contract', 'amendment', 'termination'],
      retentionPeriod: 10,
      retentionUnit: 'years',
      action: 'archive',
      legalBasis: 'Romanian Civil Code, Statute of Limitations',
      jurisdiction: 'RO',
    },
    {
      name: 'Audit Reports',
      documentTypes: ['audit_report', 'internal_audit', 'external_audit'],
      retentionPeriod: 10,
      retentionUnit: 'years',
      action: 'archive',
      legalBasis: 'SOC 2, ISO 27001',
      jurisdiction: 'GLOBAL',
    },
  ];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const tenantId = 'tenant_demo';

    for (const policy of this.defaultPolicies) {
      const id = `policy_${crypto.randomBytes(8).toString('hex')}`;
      const fullPolicy: RetentionPolicy = {
        id,
        tenantId,
        name: policy.name!,
        description: `Default retention policy for ${policy.name}`,
        documentTypes: policy.documentTypes!,
        retentionPeriod: policy.retentionPeriod!,
        retentionUnit: policy.retentionUnit!,
        action: policy.action!,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        legalBasis: policy.legalBasis,
        jurisdiction: policy.jurisdiction,
        notifyBefore: 30,
      };

      this.policies.set(id, fullPolicy);
    }
  }

  async createPolicy(
    tenantId: string,
    params: Omit<RetentionPolicy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<RetentionPolicy> {
    const id = `policy_${crypto.randomBytes(12).toString('hex')}`;

    const policy: RetentionPolicy = {
      id,
      tenantId,
      ...params,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(id, policy);

    this.eventEmitter.emit('retention.policy.created', { tenantId, policy });

    return policy;
  }

  async updatePolicy(
    policyId: string,
    updates: Partial<Omit<RetentionPolicy, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<RetentionPolicy | null> {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    const updated = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updated);

    return updated;
  }

  async deletePolicy(policyId: string): Promise<boolean> {
    return this.policies.delete(policyId);
  }

  async getPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    return Array.from(this.policies.values())
      .filter(p => p.tenantId === tenantId);
  }

  async getPolicy(policyId: string): Promise<RetentionPolicy | null> {
    return this.policies.get(policyId) || null;
  }

  async getPoliciesForDocumentType(tenantId: string, documentType: string): Promise<RetentionPolicy[]> {
    return Array.from(this.policies.values())
      .filter(p => p.tenantId === tenantId && p.documentTypes.includes(documentType));
  }

  async assignDocument(
    documentId: string,
    documentType: string,
    documentName: string,
    tenantId: string,
    policyId?: string,
  ): Promise<DocumentRetentionRecord> {
    // Find applicable policy
    let policy: RetentionPolicy | undefined;

    if (policyId) {
      policy = this.policies.get(policyId);
    } else {
      const policies = await this.getPoliciesForDocumentType(tenantId, documentType);
      policy = policies.find(p => p.isActive);
    }

    if (!policy) {
      throw new Error(`No retention policy found for document type: ${documentType}`);
    }

    // Calculate retention end date
    const createdAt = new Date();
    let retentionEndDate: Date;

    switch (policy.retentionUnit) {
      case 'years':
        retentionEndDate = new Date(createdAt);
        retentionEndDate.setFullYear(retentionEndDate.getFullYear() + policy.retentionPeriod);
        break;
      case 'months':
        retentionEndDate = new Date(createdAt);
        retentionEndDate.setMonth(retentionEndDate.getMonth() + policy.retentionPeriod);
        break;
      case 'days':
      default:
        retentionEndDate = new Date(createdAt.getTime() + policy.retentionPeriod * 24 * 60 * 60 * 1000);
    }

    const record: DocumentRetentionRecord = {
      id: `ret_${crypto.randomBytes(12).toString('hex')}`,
      documentId,
      documentType,
      documentName,
      tenantId,
      createdAt,
      retentionEndDate,
      policyId: policy.id,
      status: 'active',
    };

    // Store record
    const tenantRecords = this.retentionRecords.get(tenantId) || [];
    tenantRecords.push(record);
    this.retentionRecords.set(tenantId, tenantRecords);

    // Schedule notification if configured
    if (policy.notifyBefore) {
      const notifyDate = new Date(retentionEndDate.getTime() - policy.notifyBefore * 24 * 60 * 60 * 1000);
      if (notifyDate > new Date()) {
        this.scheduleAction(record.id, policy.id, 'notify', notifyDate);
      }
    }

    // Schedule retention action
    this.scheduleAction(record.id, policy.id, policy.action, retentionEndDate);

    return record;
  }

  private scheduleAction(
    documentId: string,
    policyId: string,
    action: RetentionAction['action'],
    scheduledFor: Date,
  ): void {
    const actionId = `action_${crypto.randomBytes(8).toString('hex')}`;

    const retentionAction: RetentionAction = {
      id: actionId,
      documentId,
      policyId,
      action,
      status: 'pending',
      scheduledFor,
    };

    this.pendingActions.set(actionId, retentionAction);
  }

  async createLegalHold(
    tenantId: string,
    params: {
      name: string;
      reason: string;
      caseReference?: string;
      documentIds: string[];
      createdBy: string;
    },
  ): Promise<LegalHold> {
    const holdId = `hold_${crypto.randomBytes(12).toString('hex')}`;

    const hold: LegalHold = {
      id: holdId,
      tenantId,
      name: params.name,
      reason: params.reason,
      caseReference: params.caseReference,
      documentIds: params.documentIds,
      createdAt: new Date(),
      createdBy: params.createdBy,
      status: 'active',
    };

    this.legalHolds.set(holdId, hold);

    // Update document records
    const tenantRecords = this.retentionRecords.get(tenantId) || [];
    for (const record of tenantRecords) {
      if (params.documentIds.includes(record.documentId)) {
        record.status = 'legal_hold';
        record.legalHoldReason = params.reason;

        // Cancel pending actions
        for (const [actionId, action] of this.pendingActions) {
          if (action.documentId === record.documentId && action.status === 'pending') {
            action.status = 'cancelled';
            action.reason = `Legal hold applied: ${params.reason}`;
          }
        }
      }
    }

    this.eventEmitter.emit('retention.legal_hold.created', { tenantId, hold });

    return hold;
  }

  async releaseLegalHold(holdId: string, releasedBy: string): Promise<LegalHold | null> {
    const hold = this.legalHolds.get(holdId);
    if (!hold) return null;

    hold.status = 'released';
    hold.releasedAt = new Date();
    hold.releasedBy = releasedBy;

    // Update document records back to active
    const tenantRecords = this.retentionRecords.get(hold.tenantId) || [];
    for (const record of tenantRecords) {
      if (hold.documentIds.includes(record.documentId) && record.status === 'legal_hold') {
        record.status = 'active';
        record.legalHoldReason = undefined;
      }
    }

    this.eventEmitter.emit('retention.legal_hold.released', { holdId, releasedBy });

    return hold;
  }

  async getLegalHolds(tenantId: string): Promise<LegalHold[]> {
    return Array.from(this.legalHolds.values())
      .filter(h => h.tenantId === tenantId);
  }

  async getRetentionRecords(
    tenantId: string,
    filters?: {
      status?: string;
      documentType?: string;
      expiringWithin?: number; // days
    },
  ): Promise<DocumentRetentionRecord[]> {
    let records = this.retentionRecords.get(tenantId) || [];

    if (filters?.status) {
      records = records.filter(r => r.status === filters.status);
    }

    if (filters?.documentType) {
      records = records.filter(r => r.documentType === filters.documentType);
    }

    if (filters?.expiringWithin) {
      const cutoff = new Date(Date.now() + filters.expiringWithin * 24 * 60 * 60 * 1000);
      records = records.filter(r => r.retentionEndDate <= cutoff);
    }

    return records;
  }

  async getRetentionStats(tenantId: string): Promise<{
    totalDocuments: number;
    byStatus: Record<string, number>;
    byDocumentType: Record<string, number>;
    expiringThisMonth: number;
    expiringThisQuarter: number;
    legalHoldsActive: number;
    averageRetentionYears: number;
  }> {
    const records = this.retentionRecords.get(tenantId) || [];
    const holds = await this.getLegalHolds(tenantId);

    const byStatus: Record<string, number> = {};
    const byDocumentType: Record<string, number> = {};

    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    let expiringThisMonth = 0;
    let expiringThisQuarter = 0;
    let totalRetentionDays = 0;

    for (const record of records) {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      byDocumentType[record.documentType] = (byDocumentType[record.documentType] || 0) + 1;

      if (record.retentionEndDate <= monthEnd) expiringThisMonth++;
      if (record.retentionEndDate <= quarterEnd) expiringThisQuarter++;

      totalRetentionDays += (record.retentionEndDate.getTime() - record.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    }

    return {
      totalDocuments: records.length,
      byStatus,
      byDocumentType,
      expiringThisMonth,
      expiringThisQuarter,
      legalHoldsActive: holds.filter(h => h.status === 'active').length,
      averageRetentionYears: records.length > 0
        ? Math.round(totalRetentionDays / records.length / 365 * 10) / 10
        : 0,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRetentionActions(): Promise<void> {
    this.logger.log('Processing scheduled retention actions...');

    const now = new Date();

    for (const [actionId, action] of this.pendingActions) {
      if (action.status === 'pending' && action.scheduledFor <= now) {
        try {
          // Execute action
          switch (action.action) {
            case 'notify':
              this.eventEmitter.emit('retention.notification', {
                documentId: action.documentId,
                policyId: action.policyId,
                message: 'Document retention period ending soon',
              });
              break;

            case 'archive':
              // In production, would move to archive storage
              this.logger.log(`Archiving document ${action.documentId}`);
              break;

            case 'delete':
              // In production, would securely delete
              this.logger.log(`Deleting document ${action.documentId}`);
              break;
          }

          action.status = 'completed';
          action.executedAt = new Date();

          this.logger.log(`Completed retention action ${actionId}: ${action.action}`);

        } catch (error: any) {
          action.status = 'failed';
          action.error = error.message;
          this.logger.error(`Failed retention action ${actionId}: ${error.message}`);
        }
      }
    }
  }

  async getComplianceReport(tenantId: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
    policyViolations: number;
    unassignedDocuments: number;
    overdueActions: number;
  }> {
    const policies = await this.getPolicies(tenantId);
    const records = this.retentionRecords.get(tenantId) || [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for active policies
    const activePolicies = policies.filter(p => p.isActive);
    if (activePolicies.length === 0) {
      issues.push('No active retention policies configured');
      recommendations.push('Configure retention policies for all document types');
    }

    // Check for required document types
    const coveredTypes = new Set(activePolicies.flatMap(p => p.documentTypes));
    const requiredTypes = ['invoice', 'receipt', 'contract', 'employment_contract', 'vat_return'];
    const missingTypes = requiredTypes.filter(t => !coveredTypes.has(t));

    if (missingTypes.length > 0) {
      issues.push(`Missing retention policies for: ${missingTypes.join(', ')}`);
    }

    // Check for overdue actions
    const overdueActions = Array.from(this.pendingActions.values())
      .filter(a => a.status === 'pending' && a.scheduledFor < new Date())
      .length;

    if (overdueActions > 0) {
      issues.push(`${overdueActions} overdue retention actions`);
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
      policyViolations: issues.length,
      unassignedDocuments: 0, // Would calculate in production
      overdueActions,
    };
  }
}
