import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VendorManagementService } from './vendor-management.service';

// =================== TYPES ===================

export type ContractStatus = 'draft' | 'pending_review' | 'pending_approval' | 'active' | 'expired' | 'terminated' | 'renewed';
export type ContractType = 'master_agreement' | 'service_agreement' | 'purchase_agreement' | 'nda' | 'sla' | 'amendment' | 'sow' | 'other';
export type RenewalType = 'auto' | 'manual' | 'none';

export interface VendorContract {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  contractNumber: string;
  name: string;
  description?: string;
  type: ContractType;
  status: ContractStatus;
  parentContractId?: string;
  effectiveDate: Date;
  expirationDate: Date;
  terminationDate?: Date;
  value?: number;
  currency: string;
  paymentTerms?: string;
  renewalType: RenewalType;
  renewalNoticeDays?: number;
  autoRenewalPeriodMonths?: number;
  terms: ContractTerm[];
  deliverables?: ContractDeliverable[];
  slaMetrics?: SLAMetric[];
  documents?: ContractDocument[];
  amendments?: ContractAmendment[];
  signatories: ContractSignatory[];
  approvalHistory: ApprovalEntry[];
  tags?: string[];
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractTerm {
  id: string;
  name: string;
  description: string;
  category: 'payment' | 'delivery' | 'warranty' | 'liability' | 'termination' | 'confidentiality' | 'other';
  isRequired: boolean;
  value?: string;
}

export interface ContractDeliverable {
  id: string;
  name: string;
  description?: string;
  dueDate?: Date;
  quantity?: number;
  unit?: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'accepted' | 'rejected';
  deliveredDate?: Date;
  acceptedBy?: string;
  notes?: string;
}

export interface SLAMetric {
  id: string;
  name: string;
  description?: string;
  targetValue: number;
  targetUnit: string;
  measurementFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  penaltyClause?: string;
  penaltyAmount?: number;
  currentPerformance?: number;
}

export interface ContractDocument {
  id: string;
  name: string;
  type: 'contract' | 'attachment' | 'amendment' | 'signed_copy';
  version: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ContractAmendment {
  id: string;
  amendmentNumber: string;
  description: string;
  effectiveDate: Date;
  changes: AmendmentChange[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface AmendmentChange {
  field: string;
  previousValue: any;
  newValue: any;
  reason?: string;
}

export interface ContractSignatory {
  id: string;
  name: string;
  title: string;
  email: string;
  organization: 'vendor' | 'company';
  signedAt?: Date;
  signatureUrl?: string;
}

export interface ApprovalEntry {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  actionBy: string;
  actionByName: string;
  actionAt: Date;
  comments?: string;
}

export interface ContractTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ContractType;
  content: string;
  variables: TemplateVariable[];
  defaultTerms: Omit<ContractTerm, 'id'>[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  isRequired: boolean;
}

// =================== SERVICE ===================

@Injectable()
export class VendorContractsService {
  private contracts: Map<string, VendorContract> = new Map();
  private templates: Map<string, ContractTemplate> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private vendorService: VendorManagementService,
  ) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const templates = [
      {
        name: 'Master Service Agreement',
        type: 'master_agreement' as ContractType,
        description: 'Standard master service agreement template',
      },
      {
        name: 'Non-Disclosure Agreement',
        type: 'nda' as ContractType,
        description: 'Standard NDA template',
      },
      {
        name: 'Service Level Agreement',
        type: 'sla' as ContractType,
        description: 'Standard SLA template',
      },
      {
        name: 'Purchase Order Agreement',
        type: 'purchase_agreement' as ContractType,
        description: 'Standard purchase agreement template',
      },
    ];

    for (const tpl of templates) {
      const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      this.templates.set(id, {
        id,
        tenantId: 'system',
        name: tpl.name,
        description: tpl.description,
        type: tpl.type,
        content: '',
        variables: [],
        defaultTerms: [],
        isActive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // =================== CONTRACTS ===================

  async createContract(data: {
    tenantId: string;
    vendorId: string;
    name: string;
    description?: string;
    type: ContractType;
    parentContractId?: string;
    effectiveDate: Date;
    expirationDate: Date;
    value?: number;
    currency?: string;
    paymentTerms?: string;
    renewalType?: RenewalType;
    renewalNoticeDays?: number;
    autoRenewalPeriodMonths?: number;
    terms?: Omit<ContractTerm, 'id'>[];
    deliverables?: Omit<ContractDeliverable, 'id'>[];
    slaMetrics?: Omit<SLAMetric, 'id'>[];
    signatories?: Omit<ContractSignatory, 'id'>[];
    tags?: string[];
    notes?: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<VendorContract> {
    const vendor = await this.vendorService.getVendor(data.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const id = `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const contractNumber = this.generateContractNumber(data.tenantId);
    const now = new Date();

    // Generate IDs for nested entities
    const terms: ContractTerm[] = (data.terms || []).map((term, i) => ({
      ...term,
      id: `term-${Date.now()}-${i}`,
    }));

    const deliverables: ContractDeliverable[] = (data.deliverables || []).map((d, i) => ({
      ...d,
      id: `deliverable-${Date.now()}-${i}`,
    }));

    const slaMetrics: SLAMetric[] = (data.slaMetrics || []).map((m, i) => ({
      ...m,
      id: `sla-${Date.now()}-${i}`,
    }));

    const signatories: ContractSignatory[] = (data.signatories || []).map((s, i) => ({
      ...s,
      id: `signatory-${Date.now()}-${i}`,
    }));

    const contract: VendorContract = {
      id,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      vendorName: vendor.name,
      contractNumber,
      name: data.name,
      description: data.description,
      type: data.type,
      status: 'draft',
      parentContractId: data.parentContractId,
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate,
      value: data.value,
      currency: data.currency || 'RON',
      paymentTerms: data.paymentTerms,
      renewalType: data.renewalType || 'manual',
      renewalNoticeDays: data.renewalNoticeDays,
      autoRenewalPeriodMonths: data.autoRenewalPeriodMonths,
      terms,
      deliverables,
      slaMetrics,
      documents: [],
      amendments: [],
      signatories,
      approvalHistory: [],
      tags: data.tags,
      notes: data.notes,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
    };

    this.contracts.set(id, contract);

    this.eventEmitter.emit('vendor.contract_created', { contract });

    return contract;
  }

  private generateContractNumber(tenantId: string): string {
    const contracts = Array.from(this.contracts.values()).filter(
      (c) => c.tenantId === tenantId,
    );
    const year = new Date().getFullYear();
    const nextNumber = contracts.length + 1;
    return `C${year}-${String(nextNumber).padStart(5, '0')}`;
  }

  async getContract(id: string): Promise<VendorContract | null> {
    return this.contracts.get(id) || null;
  }

  async getContracts(
    tenantId: string,
    filters?: {
      vendorId?: string;
      type?: ContractType;
      status?: ContractStatus;
      expiringWithinDays?: number;
      search?: string;
      limit?: number;
    },
  ): Promise<{ contracts: VendorContract[]; total: number }> {
    let contracts = Array.from(this.contracts.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters?.vendorId) {
      contracts = contracts.filter((c) => c.vendorId === filters.vendorId);
    }

    if (filters?.type) {
      contracts = contracts.filter((c) => c.type === filters.type);
    }

    if (filters?.status) {
      contracts = contracts.filter((c) => c.status === filters.status);
    }

    if (filters?.expiringWithinDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + filters.expiringWithinDays);
      contracts = contracts.filter(
        (c) => c.status === 'active' && c.expirationDate <= cutoff,
      );
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      contracts = contracts.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.contractNumber.toLowerCase().includes(search) ||
          c.vendorName.toLowerCase().includes(search),
      );
    }

    const total = contracts.length;
    contracts = contracts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      contracts = contracts.slice(0, filters.limit);
    }

    return { contracts, total };
  }

  async updateContract(
    id: string,
    updates: Partial<Omit<VendorContract, 'id' | 'tenantId' | 'vendorId' | 'contractNumber' | 'createdBy' | 'createdAt'>>,
  ): Promise<VendorContract | null> {
    const contract = this.contracts.get(id);
    if (!contract) return null;

    if (!['draft', 'pending_review'].includes(contract.status)) {
      throw new Error('Cannot modify contract in current status');
    }

    Object.assign(contract, updates, {
      id: contract.id,
      tenantId: contract.tenantId,
      vendorId: contract.vendorId,
      contractNumber: contract.contractNumber,
      createdBy: contract.createdBy,
      createdAt: contract.createdAt,
      updatedAt: new Date(),
    });

    this.contracts.set(id, contract);

    return contract;
  }

  async submitForApproval(
    id: string,
    submittedBy: string,
    submittedByName: string,
  ): Promise<VendorContract | null> {
    const contract = this.contracts.get(id);
    if (!contract || contract.status !== 'draft') return null;

    contract.status = 'pending_approval';
    contract.approvalHistory.push({
      id: `approval-${Date.now()}`,
      action: 'submitted',
      actionBy: submittedBy,
      actionByName: submittedByName,
      actionAt: new Date(),
    });
    contract.updatedAt = new Date();

    this.contracts.set(id, contract);

    this.eventEmitter.emit('vendor.contract_submitted', { contract });

    return contract;
  }

  async approveContract(
    id: string,
    approvedBy: string,
    approvedByName: string,
    comments?: string,
  ): Promise<VendorContract | null> {
    const contract = this.contracts.get(id);
    if (!contract || contract.status !== 'pending_approval') return null;

    contract.status = 'active';
    contract.approvalHistory.push({
      id: `approval-${Date.now()}`,
      action: 'approved',
      actionBy: approvedBy,
      actionByName: approvedByName,
      actionAt: new Date(),
      comments,
    });
    contract.updatedAt = new Date();

    this.contracts.set(id, contract);

    this.eventEmitter.emit('vendor.contract_approved', { contract });

    return contract;
  }

  async rejectContract(
    id: string,
    rejectedBy: string,
    rejectedByName: string,
    reason: string,
  ): Promise<VendorContract | null> {
    const contract = this.contracts.get(id);
    if (!contract || contract.status !== 'pending_approval') return null;

    contract.status = 'draft';
    contract.approvalHistory.push({
      id: `approval-${Date.now()}`,
      action: 'rejected',
      actionBy: rejectedBy,
      actionByName: rejectedByName,
      actionAt: new Date(),
      comments: reason,
    });
    contract.updatedAt = new Date();

    this.contracts.set(id, contract);

    return contract;
  }

  async terminateContract(
    id: string,
    terminationDate: Date,
    reason: string,
    terminatedBy: string,
  ): Promise<VendorContract | null> {
    const contract = this.contracts.get(id);
    if (!contract || contract.status !== 'active') return null;

    contract.status = 'terminated';
    contract.terminationDate = terminationDate;
    contract.notes = (contract.notes || '') + `\n\nTermination reason: ${reason}`;
    contract.updatedAt = new Date();

    this.contracts.set(id, contract);

    this.eventEmitter.emit('vendor.contract_terminated', { contract, reason, terminatedBy });

    return contract;
  }

  async renewContract(
    id: string,
    newExpirationDate: Date,
    renewedBy: string,
    renewedByName: string,
  ): Promise<VendorContract | null> {
    const contract = this.contracts.get(id);
    if (!contract || contract.status !== 'active') return null;

    const previousExpiration = contract.expirationDate;
    contract.expirationDate = newExpirationDate;
    contract.status = 'renewed';

    // Create amendment for renewal
    contract.amendments = contract.amendments || [];
    contract.amendments.push({
      id: `amendment-${Date.now()}`,
      amendmentNumber: `A${contract.amendments.length + 1}`,
      description: 'Contract renewal',
      effectiveDate: new Date(),
      changes: [{
        field: 'expirationDate',
        previousValue: previousExpiration,
        newValue: newExpirationDate,
        reason: 'Contract renewal',
      }],
      status: 'approved',
      approvedBy: renewedBy,
      approvedAt: new Date(),
      createdBy: renewedBy,
      createdAt: new Date(),
    });

    contract.updatedAt = new Date();
    this.contracts.set(id, contract);

    this.eventEmitter.emit('vendor.contract_renewed', { contract });

    return contract;
  }

  // =================== DELIVERABLES ===================

  async updateDeliverable(
    contractId: string,
    deliverableId: string,
    updates: Partial<ContractDeliverable>,
    updatedBy?: string,
  ): Promise<VendorContract | null> {
    const contract = this.contracts.get(contractId);
    if (!contract || !contract.deliverables) return null;

    const index = contract.deliverables.findIndex((d) => d.id === deliverableId);
    if (index === -1) return null;

    contract.deliverables[index] = {
      ...contract.deliverables[index],
      ...updates,
      id: deliverableId,
    };

    if (updates.status === 'accepted' && updatedBy) {
      contract.deliverables[index].acceptedBy = updatedBy;
    }

    contract.updatedAt = new Date();
    this.contracts.set(contractId, contract);

    return contract;
  }

  // =================== AMENDMENTS ===================

  async createAmendment(
    contractId: string,
    data: {
      description: string;
      effectiveDate: Date;
      changes: AmendmentChange[];
      createdBy: string;
    },
  ): Promise<ContractAmendment | null> {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.status !== 'active') return null;

    const amendmentNumber = `A${(contract.amendments?.length || 0) + 1}`;
    const amendment: ContractAmendment = {
      id: `amendment-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      amendmentNumber,
      description: data.description,
      effectiveDate: data.effectiveDate,
      changes: data.changes,
      status: 'draft',
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    contract.amendments = contract.amendments || [];
    contract.amendments.push(amendment);
    contract.updatedAt = new Date();

    this.contracts.set(contractId, contract);

    return amendment;
  }

  async approveAmendment(
    contractId: string,
    amendmentId: string,
    approvedBy: string,
  ): Promise<ContractAmendment | null> {
    const contract = this.contracts.get(contractId);
    if (!contract || !contract.amendments) return null;

    const index = contract.amendments.findIndex((a) => a.id === amendmentId);
    if (index === -1) return null;

    const amendment = contract.amendments[index];
    if (amendment.status !== 'pending') return null;

    amendment.status = 'approved';
    amendment.approvedBy = approvedBy;
    amendment.approvedAt = new Date();

    // Apply changes to contract
    for (const change of amendment.changes) {
      if (change.field in contract) {
        (contract as any)[change.field] = change.newValue;
      }
    }

    contract.updatedAt = new Date();
    this.contracts.set(contractId, contract);

    this.eventEmitter.emit('vendor.contract_amended', { contract, amendment });

    return amendment;
  }

  // =================== DOCUMENTS ===================

  async addDocument(
    contractId: string,
    data: {
      name: string;
      type: ContractDocument['type'];
      version: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      uploadedBy: string;
    },
  ): Promise<ContractDocument | null> {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;

    const document: ContractDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: data.name,
      type: data.type,
      version: data.version,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      uploadedBy: data.uploadedBy,
      uploadedAt: new Date(),
    };

    contract.documents = contract.documents || [];
    contract.documents.push(document);
    contract.updatedAt = new Date();

    this.contracts.set(contractId, contract);

    return document;
  }

  // =================== TEMPLATES ===================

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: ContractType;
    content: string;
    variables?: TemplateVariable[];
    defaultTerms?: Omit<ContractTerm, 'id'>[];
    createdBy: string;
  }): Promise<ContractTemplate> {
    const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const template: ContractTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      content: data.content,
      variables: data.variables || [],
      defaultTerms: data.defaultTerms || [],
      isActive: true,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, template);

    return template;
  }

  async getTemplates(tenantId: string, type?: ContractType): Promise<ContractTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      (t) => (t.tenantId === tenantId || t.tenantId === 'system') && t.isActive,
    );

    if (type) {
      templates = templates.filter((t) => t.type === type);
    }

    return templates;
  }

  async getTemplate(id: string): Promise<ContractTemplate | null> {
    return this.templates.get(id) || null;
  }

  // =================== EXPIRING CONTRACTS ===================

  async getExpiringContracts(
    tenantId: string,
    daysAhead: number = 30,
  ): Promise<VendorContract[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return Array.from(this.contracts.values()).filter(
      (c) =>
        c.tenantId === tenantId &&
        c.status === 'active' &&
        c.expirationDate <= cutoff,
    ).sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());
  }

  async checkForAutoRenewals(): Promise<VendorContract[]> {
    const renewedContracts: VendorContract[] = [];
    const now = new Date();

    for (const contract of this.contracts.values()) {
      if (
        contract.status === 'active' &&
        contract.renewalType === 'auto' &&
        contract.autoRenewalPeriodMonths
      ) {
        const renewalCheckDate = new Date(contract.expirationDate);
        renewalCheckDate.setDate(
          renewalCheckDate.getDate() - (contract.renewalNoticeDays || 30),
        );

        if (now >= renewalCheckDate && now < contract.expirationDate) {
          const newExpiration = new Date(contract.expirationDate);
          newExpiration.setMonth(
            newExpiration.getMonth() + contract.autoRenewalPeriodMonths,
          );

          await this.renewContract(
            contract.id,
            newExpiration,
            'system',
            'System Auto-Renewal',
          );
          renewedContracts.push(contract);
        }
      }
    }

    return renewedContracts;
  }

  // =================== STATISTICS ===================

  async getContractStatistics(tenantId: string): Promise<{
    totalContracts: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    totalValue: number;
    activeValue: number;
    expiringIn30Days: number;
    expiringIn90Days: number;
    averageContractDuration: number;
  }> {
    const contracts = Array.from(this.contracts.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalValue = 0;
    let activeValue = 0;
    let totalDuration = 0;
    let contractsWithDuration = 0;

    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    let expiringIn30Days = 0;
    let expiringIn90Days = 0;

    for (const contract of contracts) {
      byStatus[contract.status] = (byStatus[contract.status] || 0) + 1;
      byType[contract.type] = (byType[contract.type] || 0) + 1;

      if (contract.value) {
        totalValue += contract.value;
        if (contract.status === 'active') {
          activeValue += contract.value;
        }
      }

      if (contract.effectiveDate && contract.expirationDate) {
        const duration = Math.ceil(
          (contract.expirationDate.getTime() - contract.effectiveDate.getTime()) /
          (1000 * 60 * 60 * 24 * 30),
        );
        totalDuration += duration;
        contractsWithDuration++;
      }

      if (contract.status === 'active') {
        if (contract.expirationDate <= thirtyDays) expiringIn30Days++;
        else if (contract.expirationDate <= ninetyDays) expiringIn90Days++;
      }
    }

    return {
      totalContracts: contracts.length,
      byStatus,
      byType,
      totalValue,
      activeValue,
      expiringIn30Days,
      expiringIn90Days,
      averageContractDuration: contractsWithDuration > 0
        ? Math.round(totalDuration / contractsWithDuration)
        : 0,
    };
  }
}
