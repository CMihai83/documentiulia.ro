import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VendorManagementService, Vendor } from './vendor-management.service';

// =================== TYPES ===================

export type OnboardingStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'on_hold';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending' | 'expired' | 'waived';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface OnboardingWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  vendorTypes?: string[];
  steps: OnboardingStep[];
  requiredDocuments: RequiredDocument[];
  complianceChecks: ComplianceCheck[];
  approvalRequired: boolean;
  approverRoles?: string[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  type: 'information' | 'documents' | 'compliance' | 'verification' | 'approval';
  isRequired: boolean;
  autoComplete?: boolean;
  completionCriteria?: string[];
}

export interface RequiredDocument {
  id: string;
  name: string;
  description?: string;
  documentType: string;
  isRequired: boolean;
  expirationRequired: boolean;
  verificationRequired: boolean;
}

export interface ComplianceCheck {
  id: string;
  name: string;
  description?: string;
  type: 'tax' | 'insurance' | 'license' | 'certification' | 'background' | 'financial' | 'custom';
  isRequired: boolean;
  externalVerification?: boolean;
  validityPeriodDays?: number;
}

export interface VendorOnboarding {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  workflowId: string;
  workflowName: string;
  status: OnboardingStatus;
  currentStepId?: string;
  currentStepOrder: number;
  stepProgress: StepProgress[];
  documentProgress: DocumentProgress[];
  complianceProgress: ComplianceProgress[];
  riskAssessment?: RiskAssessment;
  notes?: string;
  startedAt: Date;
  completedAt?: Date;
  completedBy?: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepProgress {
  stepId: string;
  stepName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export interface DocumentProgress {
  documentId: string;
  documentName: string;
  documentType: string;
  isRequired: boolean;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  uploadedDocumentId?: string;
  uploadedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface ComplianceProgress {
  checkId: string;
  checkName: string;
  checkType: string;
  isRequired: boolean;
  status: ComplianceStatus;
  verificationDate?: Date;
  expirationDate?: Date;
  verifiedBy?: string;
  notes?: string;
  attachments?: string[];
}

export interface RiskAssessment {
  id: string;
  vendorId: string;
  overallRisk: RiskLevel;
  riskScore: number;
  factors: RiskFactor[];
  recommendations?: string[];
  assessedBy: string;
  assessedAt: Date;
  nextReviewDate?: Date;
}

export interface RiskFactor {
  category: 'financial' | 'operational' | 'compliance' | 'reputational' | 'strategic';
  name: string;
  description?: string;
  weight: number;
  score: number;
  riskLevel: RiskLevel;
  mitigationActions?: string[];
}

export interface ComplianceRequirement {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  type: ComplianceCheck['type'];
  vendorTypes?: string[];
  isRequired: boolean;
  validityPeriodDays?: number;
  reminderDays?: number;
  verificationMethod?: string;
  documentationRequired?: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface VendorCompliance {
  id: string;
  vendorId: string;
  requirementId: string;
  requirementName: string;
  status: ComplianceStatus;
  verificationDate?: Date;
  expirationDate?: Date;
  verifiedBy?: string;
  verifiedByName?: string;
  documentIds?: string[];
  notes?: string;
  waiverReason?: string;
  waiverApprovedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class VendorOnboardingService {
  private workflows: Map<string, OnboardingWorkflow> = new Map();
  private onboardings: Map<string, VendorOnboarding> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private complianceRequirements: Map<string, ComplianceRequirement> = new Map();
  private vendorCompliance: Map<string, VendorCompliance> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private vendorService: VendorManagementService,
  ) {
    this.initializeDefaultWorkflow();
  }

  private initializeDefaultWorkflow(): void {
    const id = 'workflow-default';

    const workflow: OnboardingWorkflow = {
      id,
      tenantId: 'system',
      name: 'Standard Vendor Onboarding',
      description: 'Default onboarding workflow for all vendor types',
      steps: [
        {
          id: 'step-1',
          name: 'Basic Information',
          description: 'Collect vendor basic information and contact details',
          order: 1,
          type: 'information',
          isRequired: true,
          autoComplete: true,
        },
        {
          id: 'step-2',
          name: 'Document Collection',
          description: 'Upload required documents and certificates',
          order: 2,
          type: 'documents',
          isRequired: true,
        },
        {
          id: 'step-3',
          name: 'Compliance Verification',
          description: 'Verify compliance with regulations',
          order: 3,
          type: 'compliance',
          isRequired: true,
        },
        {
          id: 'step-4',
          name: 'Risk Assessment',
          description: 'Conduct risk assessment',
          order: 4,
          type: 'verification',
          isRequired: true,
        },
        {
          id: 'step-5',
          name: 'Final Approval',
          description: 'Review and approve vendor',
          order: 5,
          type: 'approval',
          isRequired: true,
        },
      ],
      requiredDocuments: [
        {
          id: 'doc-1',
          name: 'Business Registration',
          documentType: 'certificate',
          isRequired: true,
          expirationRequired: false,
          verificationRequired: true,
        },
        {
          id: 'doc-2',
          name: 'Tax Registration Certificate',
          documentType: 'tax_form',
          isRequired: true,
          expirationRequired: false,
          verificationRequired: true,
        },
        {
          id: 'doc-3',
          name: 'Insurance Certificate',
          documentType: 'insurance',
          isRequired: false,
          expirationRequired: true,
          verificationRequired: true,
        },
      ],
      complianceChecks: [
        {
          id: 'check-1',
          name: 'Tax Compliance',
          type: 'tax',
          isRequired: true,
          validityPeriodDays: 365,
        },
        {
          id: 'check-2',
          name: 'Business License',
          type: 'license',
          isRequired: true,
          validityPeriodDays: 365,
        },
      ],
      approvalRequired: true,
      isActive: true,
      isDefault: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(id, workflow);
  }

  // =================== WORKFLOWS ===================

  async createWorkflow(data: {
    tenantId: string;
    name: string;
    description?: string;
    vendorTypes?: string[];
    steps: Omit<OnboardingStep, 'id'>[];
    requiredDocuments: Omit<RequiredDocument, 'id'>[];
    complianceChecks: Omit<ComplianceCheck, 'id'>[];
    approvalRequired?: boolean;
    approverRoles?: string[];
    isDefault?: boolean;
    createdBy: string;
  }): Promise<OnboardingWorkflow> {
    const id = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Generate IDs
    const steps = data.steps.map((step, i) => ({
      ...step,
      id: `step-${Date.now()}-${i}`,
    }));

    const requiredDocuments = data.requiredDocuments.map((doc, i) => ({
      ...doc,
      id: `doc-${Date.now()}-${i}`,
    }));

    const complianceChecks = data.complianceChecks.map((check, i) => ({
      ...check,
      id: `check-${Date.now()}-${i}`,
    }));

    if (data.isDefault) {
      for (const wf of this.workflows.values()) {
        if (wf.tenantId === data.tenantId && wf.isDefault) {
          wf.isDefault = false;
        }
      }
    }

    const workflow: OnboardingWorkflow = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      vendorTypes: data.vendorTypes,
      steps,
      requiredDocuments,
      complianceChecks,
      approvalRequired: data.approvalRequired ?? true,
      approverRoles: data.approverRoles,
      isActive: true,
      isDefault: data.isDefault || false,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.workflows.set(id, workflow);

    return workflow;
  }

  async getWorkflow(id: string): Promise<OnboardingWorkflow | null> {
    return this.workflows.get(id) || null;
  }

  async getWorkflows(tenantId: string): Promise<OnboardingWorkflow[]> {
    return Array.from(this.workflows.values()).filter(
      (w) => (w.tenantId === tenantId || w.tenantId === 'system') && w.isActive,
    );
  }

  async getDefaultWorkflow(tenantId: string): Promise<OnboardingWorkflow | null> {
    return Array.from(this.workflows.values()).find(
      (w) => (w.tenantId === tenantId || w.tenantId === 'system') && w.isDefault && w.isActive,
    ) || null;
  }

  // =================== ONBOARDING ===================

  async startOnboarding(data: {
    tenantId: string;
    vendorId: string;
    workflowId?: string;
    createdBy: string;
  }): Promise<VendorOnboarding> {
    const vendor = await this.vendorService.getVendor(data.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    let workflow: OnboardingWorkflow | null = null;
    if (data.workflowId) {
      workflow = await this.getWorkflow(data.workflowId);
    }
    if (!workflow) {
      workflow = await this.getDefaultWorkflow(data.tenantId);
    }
    if (!workflow) {
      throw new Error('No onboarding workflow found');
    }

    const id = `onboarding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order);
    const firstStep = sortedSteps[0];

    // Initialize step progress
    const stepProgress: StepProgress[] = sortedSteps.map((step) => ({
      stepId: step.id,
      stepName: step.name,
      status: step.id === firstStep.id ? 'in_progress' : 'pending',
    }));

    // Initialize document progress
    const documentProgress: DocumentProgress[] = workflow.requiredDocuments.map((doc) => ({
      documentId: doc.id,
      documentName: doc.name,
      documentType: doc.documentType,
      isRequired: doc.isRequired,
      status: 'pending',
    }));

    // Initialize compliance progress
    const complianceProgress: ComplianceProgress[] = workflow.complianceChecks.map((check) => ({
      checkId: check.id,
      checkName: check.name,
      checkType: check.type,
      isRequired: check.isRequired,
      status: 'pending',
    }));

    const onboarding: VendorOnboarding = {
      id,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      vendorName: vendor.name,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'in_progress',
      currentStepId: firstStep.id,
      currentStepOrder: firstStep.order,
      stepProgress,
      documentProgress,
      complianceProgress,
      startedAt: now,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.onboardings.set(id, onboarding);

    this.eventEmitter.emit('vendor.onboarding_started', { onboarding, vendor });

    return onboarding;
  }

  async getOnboarding(id: string): Promise<VendorOnboarding | null> {
    return this.onboardings.get(id) || null;
  }

  async getVendorOnboarding(vendorId: string): Promise<VendorOnboarding | null> {
    return Array.from(this.onboardings.values()).find(
      (o) => o.vendorId === vendorId,
    ) || null;
  }

  async getOnboardings(
    tenantId: string,
    status?: OnboardingStatus,
  ): Promise<VendorOnboarding[]> {
    let onboardings = Array.from(this.onboardings.values()).filter(
      (o) => o.tenantId === tenantId,
    );

    if (status) {
      onboardings = onboardings.filter((o) => o.status === status);
    }

    return onboardings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async completeStep(
    onboardingId: string,
    stepId: string,
    completedBy: string,
    notes?: string,
  ): Promise<VendorOnboarding | null> {
    const onboarding = this.onboardings.get(onboardingId);
    if (!onboarding || onboarding.status !== 'in_progress') return null;

    const stepIndex = onboarding.stepProgress.findIndex((s) => s.stepId === stepId);
    if (stepIndex === -1) return null;

    // Mark step as completed
    onboarding.stepProgress[stepIndex].status = 'completed';
    onboarding.stepProgress[stepIndex].completedAt = new Date();
    onboarding.stepProgress[stepIndex].completedBy = completedBy;
    onboarding.stepProgress[stepIndex].notes = notes;

    // Find next step
    const workflow = await this.getWorkflow(onboarding.workflowId);
    if (!workflow) return null;

    const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order);
    const currentIndex = sortedSteps.findIndex((s) => s.id === stepId);
    const nextStep = sortedSteps[currentIndex + 1];

    if (nextStep) {
      onboarding.currentStepId = nextStep.id;
      onboarding.currentStepOrder = nextStep.order;

      const nextStepProgress = onboarding.stepProgress.find((s) => s.stepId === nextStep.id);
      if (nextStepProgress) {
        nextStepProgress.status = 'in_progress';
      }
    } else {
      // All steps completed
      onboarding.status = 'pending_review';
    }

    onboarding.updatedAt = new Date();
    this.onboardings.set(onboardingId, onboarding);

    this.eventEmitter.emit('vendor.onboarding_step_completed', { onboarding, stepId });

    return onboarding;
  }

  async updateDocumentProgress(
    onboardingId: string,
    documentId: string,
    status: DocumentProgress['status'],
    uploadedDocumentId?: string,
    verifiedBy?: string,
    rejectionReason?: string,
  ): Promise<VendorOnboarding | null> {
    const onboarding = this.onboardings.get(onboardingId);
    if (!onboarding) return null;

    const docIndex = onboarding.documentProgress.findIndex((d) => d.documentId === documentId);
    if (docIndex === -1) return null;

    const docProgress = onboarding.documentProgress[docIndex];
    docProgress.status = status;

    if (status === 'uploaded' && uploadedDocumentId) {
      docProgress.uploadedDocumentId = uploadedDocumentId;
      docProgress.uploadedAt = new Date();
    }

    if (status === 'verified' && verifiedBy) {
      docProgress.verifiedAt = new Date();
      docProgress.verifiedBy = verifiedBy;
    }

    if (status === 'rejected') {
      docProgress.rejectionReason = rejectionReason;
    }

    onboarding.updatedAt = new Date();
    this.onboardings.set(onboardingId, onboarding);

    return onboarding;
  }

  async updateComplianceProgress(
    onboardingId: string,
    checkId: string,
    status: ComplianceStatus,
    verifiedBy?: string,
    expirationDate?: Date,
    notes?: string,
  ): Promise<VendorOnboarding | null> {
    const onboarding = this.onboardings.get(onboardingId);
    if (!onboarding) return null;

    const checkIndex = onboarding.complianceProgress.findIndex((c) => c.checkId === checkId);
    if (checkIndex === -1) return null;

    const checkProgress = onboarding.complianceProgress[checkIndex];
    checkProgress.status = status;
    checkProgress.verificationDate = new Date();
    checkProgress.verifiedBy = verifiedBy;
    checkProgress.expirationDate = expirationDate;
    checkProgress.notes = notes;

    onboarding.updatedAt = new Date();
    this.onboardings.set(onboardingId, onboarding);

    return onboarding;
  }

  async approveOnboarding(
    onboardingId: string,
    approvedBy: string,
  ): Promise<VendorOnboarding | null> {
    const onboarding = this.onboardings.get(onboardingId);
    if (!onboarding || onboarding.status !== 'pending_review') return null;

    onboarding.status = 'approved';
    onboarding.completedAt = new Date();
    onboarding.completedBy = approvedBy;
    onboarding.updatedAt = new Date();

    this.onboardings.set(onboardingId, onboarding);

    // Approve the vendor
    await this.vendorService.approveVendor(
      onboarding.vendorId,
      approvedBy,
      '',
    );

    this.eventEmitter.emit('vendor.onboarding_approved', { onboarding });

    return onboarding;
  }

  async rejectOnboarding(
    onboardingId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<VendorOnboarding | null> {
    const onboarding = this.onboardings.get(onboardingId);
    if (!onboarding || !['in_progress', 'pending_review'].includes(onboarding.status)) {
      return null;
    }

    onboarding.status = 'rejected';
    onboarding.completedAt = new Date();
    onboarding.completedBy = rejectedBy;
    onboarding.rejectionReason = reason;
    onboarding.updatedAt = new Date();

    this.onboardings.set(onboardingId, onboarding);

    this.eventEmitter.emit('vendor.onboarding_rejected', { onboarding, reason });

    return onboarding;
  }

  // =================== RISK ASSESSMENT ===================

  async createRiskAssessment(data: {
    vendorId: string;
    factors: Omit<RiskFactor, 'riskLevel'>[];
    recommendations?: string[];
    assessedBy: string;
    nextReviewDate?: Date;
  }): Promise<RiskAssessment> {
    const id = `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate risk levels and overall score
    const factors: RiskFactor[] = data.factors.map((factor) => ({
      ...factor,
      riskLevel: this.calculateRiskLevel(factor.score),
    }));

    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const weightedScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);
    const riskScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) / 100 : 0;
    const overallRisk = this.calculateRiskLevel(riskScore);

    const assessment: RiskAssessment = {
      id,
      vendorId: data.vendorId,
      overallRisk,
      riskScore,
      factors,
      recommendations: data.recommendations,
      assessedBy: data.assessedBy,
      assessedAt: new Date(),
      nextReviewDate: data.nextReviewDate,
    };

    this.riskAssessments.set(id, assessment);

    // Update onboarding if exists
    const onboarding = await this.getVendorOnboarding(data.vendorId);
    if (onboarding) {
      onboarding.riskAssessment = assessment;
      onboarding.updatedAt = new Date();
      this.onboardings.set(onboarding.id, onboarding);
    }

    this.eventEmitter.emit('vendor.risk_assessed', { assessment });

    return assessment;
  }

  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  async getVendorRiskAssessment(vendorId: string): Promise<RiskAssessment | null> {
    return Array.from(this.riskAssessments.values())
      .filter((r) => r.vendorId === vendorId)
      .sort((a, b) => b.assessedAt.getTime() - a.assessedAt.getTime())[0] || null;
  }

  // =================== COMPLIANCE REQUIREMENTS ===================

  async createComplianceRequirement(data: {
    tenantId: string;
    name: string;
    description?: string;
    category: string;
    type: ComplianceCheck['type'];
    vendorTypes?: string[];
    isRequired?: boolean;
    validityPeriodDays?: number;
    reminderDays?: number;
    verificationMethod?: string;
    documentationRequired?: string[];
  }): Promise<ComplianceRequirement> {
    const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const requirement: ComplianceRequirement = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      type: data.type,
      vendorTypes: data.vendorTypes,
      isRequired: data.isRequired ?? true,
      validityPeriodDays: data.validityPeriodDays,
      reminderDays: data.reminderDays,
      verificationMethod: data.verificationMethod,
      documentationRequired: data.documentationRequired,
      isActive: true,
      createdAt: new Date(),
    };

    this.complianceRequirements.set(id, requirement);

    return requirement;
  }

  async getComplianceRequirements(
    tenantId: string,
    vendorType?: string,
  ): Promise<ComplianceRequirement[]> {
    let requirements = Array.from(this.complianceRequirements.values()).filter(
      (r) => r.tenantId === tenantId && r.isActive,
    );

    if (vendorType) {
      requirements = requirements.filter(
        (r) => !r.vendorTypes || r.vendorTypes.includes(vendorType),
      );
    }

    return requirements;
  }

  // =================== VENDOR COMPLIANCE ===================

  async recordVendorCompliance(data: {
    vendorId: string;
    requirementId: string;
    status: ComplianceStatus;
    expirationDate?: Date;
    verifiedBy?: string;
    verifiedByName?: string;
    documentIds?: string[];
    notes?: string;
  }): Promise<VendorCompliance> {
    const requirement = this.complianceRequirements.get(data.requirementId);
    const id = `compliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const compliance: VendorCompliance = {
      id,
      vendorId: data.vendorId,
      requirementId: data.requirementId,
      requirementName: requirement?.name || '',
      status: data.status,
      verificationDate: now,
      expirationDate: data.expirationDate,
      verifiedBy: data.verifiedBy,
      verifiedByName: data.verifiedByName,
      documentIds: data.documentIds,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    this.vendorCompliance.set(id, compliance);

    return compliance;
  }

  async getVendorComplianceStatus(vendorId: string): Promise<VendorCompliance[]> {
    return Array.from(this.vendorCompliance.values())
      .filter((c) => c.vendorId === vendorId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getExpiringCompliance(
    tenantId: string,
    daysAhead: number = 30,
  ): Promise<VendorCompliance[]> {
    const vendors = await this.vendorService.getVendors(tenantId, { status: 'active' });
    const vendorIds = new Set(vendors.vendors.map((v) => v.id));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return Array.from(this.vendorCompliance.values()).filter(
      (c) =>
        vendorIds.has(c.vendorId) &&
        c.status === 'compliant' &&
        c.expirationDate &&
        c.expirationDate <= cutoffDate,
    );
  }

  // =================== STATISTICS ===================

  async getOnboardingStatistics(tenantId: string): Promise<{
    totalOnboardings: number;
    byStatus: Record<string, number>;
    averageCompletionDays: number;
    pendingReview: number;
    inProgress: number;
    completedThisMonth: number;
    riskDistribution: Record<string, number>;
  }> {
    const onboardings = Array.from(this.onboardings.values()).filter(
      (o) => o.tenantId === tenantId,
    );

    const byStatus: Record<string, number> = {};
    let totalCompletionDays = 0;
    let completedCount = 0;
    const riskDistribution: Record<string, number> = {};

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    for (const onboarding of onboardings) {
      byStatus[onboarding.status] = (byStatus[onboarding.status] || 0) + 1;

      if (onboarding.status === 'approved' && onboarding.completedAt) {
        const days = Math.ceil(
          (onboarding.completedAt.getTime() - onboarding.startedAt.getTime()) /
          (1000 * 60 * 60 * 24),
        );
        totalCompletionDays += days;
        completedCount++;
      }

      if (onboarding.riskAssessment) {
        const risk = onboarding.riskAssessment.overallRisk;
        riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;
      }
    }

    const completedThisMonth = onboardings.filter(
      (o) => o.status === 'approved' && o.completedAt && o.completedAt >= thisMonth,
    ).length;

    return {
      totalOnboardings: onboardings.length,
      byStatus,
      averageCompletionDays: completedCount > 0
        ? Math.round(totalCompletionDays / completedCount)
        : 0,
      pendingReview: byStatus['pending_review'] || 0,
      inProgress: byStatus['in_progress'] || 0,
      completedThisMonth,
      riskDistribution,
    };
  }
}
