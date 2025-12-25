import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Asset, AssetStatus } from './asset-management.service';

// =================== TYPES ===================

export type DisposalMethod = 'sale' | 'donation' | 'recycle' | 'scrap' | 'trade_in' | 'return_to_vendor' | 'write_off' | 'transfer';
export type DisposalStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type ApprovalLevel = 'manager' | 'finance' | 'executive' | 'board';

export interface DisposalRequest {
  id: string;
  tenantId: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  category: string;
  currentValue: number;
  method: DisposalMethod;
  reason: string;
  reasonDetails?: string;
  estimatedProceeds?: number;
  actualProceeds?: number;
  disposalDate?: Date;
  buyerId?: string;
  buyerName?: string;
  buyerContact?: string;
  certificateRequired: boolean;
  certificateNumber?: string;
  environmentalConsiderations?: string;
  dataWipeRequired: boolean;
  dataWipeCompleted: boolean;
  dataWipeCertificate?: string;
  attachments?: string[];
  notes?: string;
  status: DisposalStatus;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisposalApproval {
  id: string;
  disposalId: string;
  level: ApprovalLevel;
  approverId?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  comments?: string;
  requiredBy: Date;
}

export interface DisposalWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: {
    minValue?: number;
    maxValue?: number;
    categories?: string[];
    methods?: DisposalMethod[];
  };
  approvalLevels: Array<{
    level: ApprovalLevel;
    approvers: string[];
    requireAll: boolean;
    escalationDays?: number;
  }>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface DisposalCertificate {
  id: string;
  disposalId: string;
  type: 'destruction' | 'recycling' | 'donation' | 'sale' | 'data_wipe';
  certificateNumber: string;
  issueDate: Date;
  issuedBy: string;
  vendorName?: string;
  vendorCertification?: string;
  details: Record<string, any>;
  documentPath?: string;
  createdAt: Date;
}

export interface DisposalSummary {
  totalDisposals: number;
  byMethod: Record<DisposalMethod, number>;
  byStatus: Record<DisposalStatus, number>;
  totalOriginalValue: number;
  totalProceeds: number;
  netGainLoss: number;
  avgProcessingDays: number;
  pendingApprovals: number;
  completedThisYear: number;
  proceedsThisYear: number;
}

// =================== SERVICE ===================

@Injectable()
export class AssetDisposalService {
  private disposalRequests: Map<string, DisposalRequest> = new Map();
  private approvals: Map<string, DisposalApproval> = new Map();
  private workflows: Map<string, DisposalWorkflow> = new Map();
  private certificates: Map<string, DisposalCertificate> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleWorkflows();
  }

  private initializeSampleWorkflows(): void {
    // Default workflow for IT assets
    const itWorkflowId = `workflow-${Date.now()}-it`;
    this.workflows.set(itWorkflowId, {
      id: itWorkflowId,
      tenantId: 'system',
      name: 'IT Asset Disposal',
      description: 'Standard workflow for disposing IT equipment',
      conditions: {
        categories: ['it_hardware', 'software'],
      },
      approvalLevels: [
        {
          level: 'manager',
          approvers: [],
          requireAll: false,
          escalationDays: 3,
        },
        {
          level: 'finance',
          approvers: [],
          requireAll: false,
          escalationDays: 5,
        },
      ],
      isActive: true,
      createdBy: 'system',
      createdAt: new Date(),
    });

    // High-value asset workflow
    const highValueId = `workflow-${Date.now()}-hv`;
    this.workflows.set(highValueId, {
      id: highValueId,
      tenantId: 'system',
      name: 'High Value Asset Disposal',
      description: 'Workflow for assets over 50,000 RON',
      conditions: {
        minValue: 50000,
      },
      approvalLevels: [
        {
          level: 'manager',
          approvers: [],
          requireAll: false,
          escalationDays: 3,
        },
        {
          level: 'finance',
          approvers: [],
          requireAll: true,
          escalationDays: 5,
        },
        {
          level: 'executive',
          approvers: [],
          requireAll: false,
          escalationDays: 7,
        },
      ],
      isActive: true,
      createdBy: 'system',
      createdAt: new Date(),
    });
  }

  // =================== DISPOSAL REQUESTS ===================

  async createDisposalRequest(data: {
    tenantId: string;
    asset: Asset;
    method: DisposalMethod;
    reason: string;
    reasonDetails?: string;
    estimatedProceeds?: number;
    disposalDate?: Date;
    buyerId?: string;
    buyerName?: string;
    buyerContact?: string;
    environmentalConsiderations?: string;
    notes?: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<DisposalRequest> {
    const id = `disposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Determine if data wipe is required (IT equipment)
    const dataWipeRequired = ['it_hardware', 'software'].includes(data.asset.category);

    // Determine if certificate is required
    const certificateRequired = ['recycle', 'scrap', 'donation'].includes(data.method);

    const request: DisposalRequest = {
      id,
      tenantId: data.tenantId,
      assetId: data.asset.id,
      assetTag: data.asset.assetTag,
      assetName: data.asset.name,
      category: data.asset.category,
      currentValue: data.asset.currentValue || 0,
      method: data.method,
      reason: data.reason,
      reasonDetails: data.reasonDetails,
      estimatedProceeds: data.estimatedProceeds,
      disposalDate: data.disposalDate,
      buyerId: data.buyerId,
      buyerName: data.buyerName,
      buyerContact: data.buyerContact,
      certificateRequired,
      dataWipeRequired,
      dataWipeCompleted: false,
      environmentalConsiderations: data.environmentalConsiderations,
      notes: data.notes,
      status: 'draft',
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
    };

    this.disposalRequests.set(id, request);

    this.eventEmitter.emit('disposal.request_created', { request });

    return request;
  }

  async getDisposalRequest(id: string): Promise<DisposalRequest | null> {
    return this.disposalRequests.get(id) || null;
  }

  async getDisposalRequests(
    tenantId: string,
    filters?: {
      status?: DisposalStatus;
      method?: DisposalMethod;
      assetId?: string;
      createdBy?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<DisposalRequest[]> {
    let requests = Array.from(this.disposalRequests.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.status) {
      requests = requests.filter((r) => r.status === filters.status);
    }

    if (filters?.method) {
      requests = requests.filter((r) => r.method === filters.method);
    }

    if (filters?.assetId) {
      requests = requests.filter((r) => r.assetId === filters.assetId);
    }

    if (filters?.createdBy) {
      requests = requests.filter((r) => r.createdBy === filters.createdBy);
    }

    if (filters?.startDate) {
      requests = requests.filter((r) => r.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      requests = requests.filter((r) => r.createdAt <= filters.endDate!);
    }

    requests = requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      requests = requests.slice(0, filters.limit);
    }

    return requests;
  }

  async updateDisposalRequest(
    id: string,
    data: Partial<DisposalRequest>,
  ): Promise<DisposalRequest | null> {
    const request = this.disposalRequests.get(id);
    if (!request) return null;

    // Only allow updates in draft or pending_approval status
    if (!['draft', 'pending_approval'].includes(request.status)) {
      throw new Error('Cannot update disposal request in current status');
    }

    const updated: DisposalRequest = {
      ...request,
      ...data,
      id: request.id,
      tenantId: request.tenantId,
      assetId: request.assetId,
      assetTag: request.assetTag,
      assetName: request.assetName,
      createdBy: request.createdBy,
      createdAt: request.createdAt,
      updatedAt: new Date(),
    };

    this.disposalRequests.set(id, updated);

    return updated;
  }

  async submitForApproval(id: string): Promise<DisposalRequest | null> {
    const request = this.disposalRequests.get(id);
    if (!request || request.status !== 'draft') return null;

    // Find applicable workflow
    const workflow = await this.findApplicableWorkflow(request);

    if (workflow) {
      // Create approval records
      for (const level of workflow.approvalLevels) {
        const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const requiredBy = new Date();
        requiredBy.setDate(requiredBy.getDate() + (level.escalationDays || 7));

        this.approvals.set(approvalId, {
          id: approvalId,
          disposalId: id,
          level: level.level,
          status: 'pending',
          requiredBy,
        });
      }
    }

    request.status = 'pending_approval';
    request.updatedAt = new Date();

    this.disposalRequests.set(id, request);

    this.eventEmitter.emit('disposal.submitted_for_approval', { request });

    return request;
  }

  private async findApplicableWorkflow(request: DisposalRequest): Promise<DisposalWorkflow | null> {
    const workflows = Array.from(this.workflows.values()).filter(
      (w) => (w.tenantId === request.tenantId || w.tenantId === 'system') && w.isActive,
    );

    for (const workflow of workflows) {
      const { conditions } = workflow;

      // Check value conditions
      if (conditions.minValue && request.currentValue < conditions.minValue) continue;
      if (conditions.maxValue && request.currentValue > conditions.maxValue) continue;

      // Check category conditions
      if (conditions.categories && !conditions.categories.includes(request.category)) continue;

      // Check method conditions
      if (conditions.methods && !conditions.methods.includes(request.method)) continue;

      return workflow;
    }

    return null;
  }

  // =================== APPROVALS ===================

  async getDisposalApprovals(disposalId: string): Promise<DisposalApproval[]> {
    return Array.from(this.approvals.values())
      .filter((a) => a.disposalId === disposalId)
      .sort((a, b) => {
        const levelOrder = { manager: 1, finance: 2, executive: 3, board: 4 };
        return levelOrder[a.level] - levelOrder[b.level];
      });
  }

  async approveDisposal(
    disposalId: string,
    data: {
      approverId: string;
      approverName: string;
      comments?: string;
    },
  ): Promise<DisposalApproval | null> {
    const approvals = await this.getDisposalApprovals(disposalId);
    const pendingApproval = approvals.find((a) => a.status === 'pending');

    if (!pendingApproval) return null;

    pendingApproval.status = 'approved';
    pendingApproval.approverId = data.approverId;
    pendingApproval.approverName = data.approverName;
    pendingApproval.approvedAt = new Date();
    pendingApproval.comments = data.comments;

    this.approvals.set(pendingApproval.id, pendingApproval);

    // Check if all approvals are complete
    const updatedApprovals = await this.getDisposalApprovals(disposalId);
    const allApproved = updatedApprovals.every((a) => a.status === 'approved');

    if (allApproved) {
      const request = this.disposalRequests.get(disposalId);
      if (request) {
        request.status = 'approved';
        request.updatedAt = new Date();
        this.disposalRequests.set(disposalId, request);

        this.eventEmitter.emit('disposal.approved', { request });
      }
    }

    return pendingApproval;
  }

  async rejectDisposal(
    disposalId: string,
    data: {
      approverId: string;
      approverName: string;
      comments: string;
    },
  ): Promise<DisposalApproval | null> {
    const approvals = await this.getDisposalApprovals(disposalId);
    const pendingApproval = approvals.find((a) => a.status === 'pending');

    if (!pendingApproval) return null;

    pendingApproval.status = 'rejected';
    pendingApproval.approverId = data.approverId;
    pendingApproval.approverName = data.approverName;
    pendingApproval.approvedAt = new Date();
    pendingApproval.comments = data.comments;

    this.approvals.set(pendingApproval.id, pendingApproval);

    // Update disposal request status
    const request = this.disposalRequests.get(disposalId);
    if (request) {
      request.status = 'rejected';
      request.updatedAt = new Date();
      this.disposalRequests.set(disposalId, request);

      this.eventEmitter.emit('disposal.rejected', { request, reason: data.comments });
    }

    return pendingApproval;
  }

  async getPendingApprovals(
    tenantId: string,
    approverId: string,
  ): Promise<Array<{ request: DisposalRequest; approval: DisposalApproval }>> {
    const result: Array<{ request: DisposalRequest; approval: DisposalApproval }> = [];

    for (const request of this.disposalRequests.values()) {
      if (request.tenantId !== tenantId || request.status !== 'pending_approval') continue;

      const approvals = await this.getDisposalApprovals(request.id);
      const pendingApproval = approvals.find((a) => a.status === 'pending');

      if (pendingApproval) {
        result.push({ request, approval: pendingApproval });
      }
    }

    return result;
  }

  // =================== DISPOSAL EXECUTION ===================

  async startDisposal(disposalId: string): Promise<DisposalRequest | null> {
    const request = this.disposalRequests.get(disposalId);
    if (!request || request.status !== 'approved') return null;

    request.status = 'in_progress';
    request.updatedAt = new Date();

    this.disposalRequests.set(disposalId, request);

    this.eventEmitter.emit('disposal.started', { request });

    return request;
  }

  async recordDataWipe(
    disposalId: string,
    data: {
      certificateNumber: string;
      wipedBy: string;
      wipeMethod: string;
      documentPath?: string;
    },
  ): Promise<DisposalRequest | null> {
    const request = this.disposalRequests.get(disposalId);
    if (!request) return null;

    request.dataWipeCompleted = true;
    request.dataWipeCertificate = data.certificateNumber;
    request.updatedAt = new Date();

    this.disposalRequests.set(disposalId, request);

    // Create certificate record
    const certId = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.certificates.set(certId, {
      id: certId,
      disposalId,
      type: 'data_wipe',
      certificateNumber: data.certificateNumber,
      issueDate: new Date(),
      issuedBy: data.wipedBy,
      details: { wipeMethod: data.wipeMethod },
      documentPath: data.documentPath,
      createdAt: new Date(),
    });

    this.eventEmitter.emit('disposal.data_wipe_completed', { request });

    return request;
  }

  async completeDisposal(
    disposalId: string,
    data: {
      actualProceeds?: number;
      certificateNumber?: string;
      buyerId?: string;
      buyerName?: string;
      notes?: string;
      completedBy: string;
    },
  ): Promise<DisposalRequest | null> {
    const request = this.disposalRequests.get(disposalId);
    if (!request || !['approved', 'in_progress'].includes(request.status)) return null;

    // Check if data wipe is required but not completed
    if (request.dataWipeRequired && !request.dataWipeCompleted) {
      throw new Error('Data wipe must be completed before disposal');
    }

    request.status = 'completed';
    request.actualProceeds = data.actualProceeds;
    request.certificateNumber = data.certificateNumber;
    request.disposalDate = new Date();
    if (data.buyerId) request.buyerId = data.buyerId;
    if (data.buyerName) request.buyerName = data.buyerName;
    if (data.notes) request.notes = request.notes ? `${request.notes}\n${data.notes}` : data.notes;
    request.updatedAt = new Date();

    this.disposalRequests.set(disposalId, request);

    // Create disposal certificate if required
    if (request.certificateRequired && data.certificateNumber) {
      const certId = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let certType: DisposalCertificate['type'] = 'destruction';
      if (request.method === 'recycle') certType = 'recycling';
      if (request.method === 'donation') certType = 'donation';
      if (request.method === 'sale') certType = 'sale';

      this.certificates.set(certId, {
        id: certId,
        disposalId,
        type: certType,
        certificateNumber: data.certificateNumber,
        issueDate: new Date(),
        issuedBy: data.completedBy,
        details: {
          method: request.method,
          assetTag: request.assetTag,
          assetName: request.assetName,
          proceeds: data.actualProceeds,
        },
        createdAt: new Date(),
      });
    }

    this.eventEmitter.emit('disposal.completed', {
      request,
      gainLoss: (data.actualProceeds || 0) - request.currentValue,
    });

    return request;
  }

  async cancelDisposal(
    disposalId: string,
    reason: string,
  ): Promise<DisposalRequest | null> {
    const request = this.disposalRequests.get(disposalId);
    if (!request || request.status === 'completed') return null;

    request.status = 'cancelled';
    request.notes = request.notes
      ? `${request.notes}\n\nCancellation reason: ${reason}`
      : `Cancellation reason: ${reason}`;
    request.updatedAt = new Date();

    this.disposalRequests.set(disposalId, request);

    this.eventEmitter.emit('disposal.cancelled', { request, reason });

    return request;
  }

  // =================== WORKFLOWS ===================

  async createWorkflow(data: {
    tenantId: string;
    name: string;
    description?: string;
    conditions: DisposalWorkflow['conditions'];
    approvalLevels: DisposalWorkflow['approvalLevels'];
    createdBy: string;
  }): Promise<DisposalWorkflow> {
    const id = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const workflow: DisposalWorkflow = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      conditions: data.conditions,
      approvalLevels: data.approvalLevels,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.workflows.set(id, workflow);

    return workflow;
  }

  async getWorkflows(tenantId: string): Promise<DisposalWorkflow[]> {
    return Array.from(this.workflows.values()).filter(
      (w) => w.tenantId === tenantId || w.tenantId === 'system',
    );
  }

  async updateWorkflow(
    id: string,
    data: Partial<DisposalWorkflow>,
  ): Promise<DisposalWorkflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;

    const updated: DisposalWorkflow = {
      ...workflow,
      ...data,
      id: workflow.id,
      tenantId: workflow.tenantId,
      createdBy: workflow.createdBy,
      createdAt: workflow.createdAt,
    };

    this.workflows.set(id, updated);

    return updated;
  }

  // =================== CERTIFICATES ===================

  async getDisposalCertificates(disposalId: string): Promise<DisposalCertificate[]> {
    return Array.from(this.certificates.values())
      .filter((c) => c.disposalId === disposalId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== STATISTICS ===================

  async getDisposalSummary(tenantId: string): Promise<DisposalSummary> {
    const requests = Array.from(this.disposalRequests.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    const byMethod: Record<DisposalMethod, number> = {
      sale: 0,
      donation: 0,
      recycle: 0,
      scrap: 0,
      trade_in: 0,
      return_to_vendor: 0,
      write_off: 0,
      transfer: 0,
    };

    const byStatus: Record<DisposalStatus, number> = {
      draft: 0,
      pending_approval: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    let totalOriginalValue = 0;
    let totalProceeds = 0;
    let totalProcessingDays = 0;
    let completedCount = 0;

    const currentYear = new Date().getFullYear();
    let completedThisYear = 0;
    let proceedsThisYear = 0;

    for (const request of requests) {
      byMethod[request.method]++;
      byStatus[request.status]++;
      totalOriginalValue += request.currentValue;

      if (request.status === 'completed') {
        totalProceeds += request.actualProceeds || 0;
        completedCount++;

        const processingDays = request.disposalDate
          ? Math.ceil((request.disposalDate.getTime() - request.createdAt.getTime()) / (24 * 60 * 60 * 1000))
          : 0;
        totalProcessingDays += processingDays;

        if (request.disposalDate?.getFullYear() === currentYear) {
          completedThisYear++;
          proceedsThisYear += request.actualProceeds || 0;
        }
      }
    }

    const pendingApprovals = requests.filter((r) => r.status === 'pending_approval').length;

    return {
      totalDisposals: requests.length,
      byMethod,
      byStatus,
      totalOriginalValue,
      totalProceeds,
      netGainLoss: totalProceeds - totalOriginalValue,
      avgProcessingDays: completedCount > 0 ? Math.round(totalProcessingDays / completedCount) : 0,
      pendingApprovals,
      completedThisYear,
      proceedsThisYear,
    };
  }
}
