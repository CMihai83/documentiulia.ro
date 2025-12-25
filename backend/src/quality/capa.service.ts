import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// CAPA Types
export enum CAPAStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  INVESTIGATION = 'investigation',
  ACTION_PLANNING = 'action_planning',
  IMPLEMENTATION = 'implementation',
  VERIFICATION = 'verification',
  EFFECTIVENESS_CHECK = 'effectiveness_check',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum CAPAType {
  CORRECTIVE = 'corrective',
  PREVENTIVE = 'preventive',
  BOTH = 'both',
}

export enum CAPAPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum CAPASource {
  NCR = 'ncr',
  AUDIT = 'audit',
  CUSTOMER_COMPLAINT = 'customer_complaint',
  MANAGEMENT_REVIEW = 'management_review',
  PROCESS_DEVIATION = 'process_deviation',
  REGULATORY = 'regulatory',
  SUPPLIER = 'supplier',
  INTERNAL = 'internal',
  RISK_ASSESSMENT = 'risk_assessment',
}

export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum RootCauseMethod {
  FIVE_WHY = 'five_why',
  FISHBONE = 'fishbone',
  FAULT_TREE = 'fault_tree',
  FMEA = 'fmea',
  PARETO = 'pareto',
  OTHER = 'other',
}

// Interfaces
export interface CAPA {
  id: string;
  tenantId: string;
  capaNumber: string;
  status: CAPAStatus;
  type: CAPAType;
  priority: CAPAPriority;
  source: CAPASource;
  title: string;
  description: string;
  problemStatement: string;

  // Source references
  ncrId?: string;
  ncrNumber?: string;
  auditId?: string;
  auditFinding?: string;
  complaintId?: string;
  complaintNumber?: string;

  // Related entities
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  departmentId?: string;
  departmentName?: string;
  supplierId?: string;
  supplierName?: string;

  // People
  initiatedBy: string;
  initiatedByName: string;
  ownerId: string;
  ownerName: string;
  assignedTeam?: string[];

  // Root cause analysis
  rootCauseAnalysis?: RootCauseAnalysis;

  // Actions
  correctiveActions: CAPAAction[];
  preventiveActions: CAPAAction[];

  // Verification
  verification?: CAPAVerification;
  effectivenessCheck?: EffectivenessCheck;

  // Tracking
  targetDate?: Date;
  completedDate?: Date;
  closedDate?: Date;
  closedBy?: string;
  closedByName?: string;

  // Cost
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;

  // References
  relatedCAPAIds?: string[];
  attachmentIds?: string[];
  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export interface RootCauseAnalysis {
  id: string;
  method: RootCauseMethod;
  rootCauses: string[];
  contributingFactors?: string[];
  analysis: string;
  analyzedBy: string;
  analyzedByName: string;
  analyzedAt: Date;
  fiveWhySteps?: string[];
  fishboneDiagram?: FishboneDiagram;
  attachmentIds?: string[];
}

export interface FishboneDiagram {
  problem: string;
  categories: {
    name: string;
    causes: string[];
  }[];
}

export interface CAPAAction {
  id: string;
  actionNumber: string;
  type: 'corrective' | 'preventive';
  description: string;
  expectedOutcome: string;
  status: ActionStatus;
  priority: CAPAPriority;
  assignedTo: string;
  assignedToName: string;
  dueDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  completedByName?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  verifiedByName?: string;
  evidenceRequired?: string;
  evidenceProvided?: string;
  notes?: string;
  attachmentIds?: string[];
}

export interface CAPAVerification {
  id: string;
  verifiedBy: string;
  verifiedByName: string;
  verifiedAt: Date;
  method: string;
  criteria: string;
  result: 'pass' | 'fail' | 'partial';
  findings?: string;
  notes?: string;
  attachmentIds?: string[];
}

export interface EffectivenessCheck {
  id: string;
  scheduledDate: Date;
  completedDate?: Date;
  checkedBy?: string;
  checkedByName?: string;
  method: string;
  criteria: string;
  result?: 'effective' | 'partially_effective' | 'not_effective';
  findings?: string;
  recurrenceCheck?: boolean;
  furtherActionRequired?: boolean;
  notes?: string;
  attachmentIds?: string[];
}

// DTOs
export interface CreateCAPADto {
  type: CAPAType;
  priority: CAPAPriority;
  source: CAPASource;
  title: string;
  description: string;
  problemStatement: string;
  ncrId?: string;
  ncrNumber?: string;
  auditId?: string;
  auditFinding?: string;
  complaintId?: string;
  complaintNumber?: string;
  productId?: string;
  productName?: string;
  processId?: string;
  processName?: string;
  departmentId?: string;
  departmentName?: string;
  supplierId?: string;
  supplierName?: string;
  initiatedBy: string;
  initiatedByName: string;
  ownerId: string;
  ownerName: string;
  targetDate?: Date;
  estimatedCost?: number;
  currency?: string;
  tags?: string[];
}

export interface RootCauseAnalysisDto {
  method: RootCauseMethod;
  rootCauses: string[];
  contributingFactors?: string[];
  analysis: string;
  analyzedBy: string;
  analyzedByName: string;
  fiveWhySteps?: string[];
  fishboneDiagram?: FishboneDiagram;
}

export interface AddActionDto {
  type: 'corrective' | 'preventive';
  description: string;
  expectedOutcome: string;
  priority: CAPAPriority;
  assignedTo: string;
  assignedToName: string;
  dueDate: Date;
  evidenceRequired?: string;
}

export interface CompleteActionDto {
  completedBy: string;
  completedByName: string;
  evidenceProvided?: string;
  notes?: string;
}

export interface VerifyActionDto {
  verifiedBy: string;
  verifiedByName: string;
  notes?: string;
}

export interface CAPAVerificationDto {
  verifiedBy: string;
  verifiedByName: string;
  method: string;
  criteria: string;
  result: 'pass' | 'fail' | 'partial';
  findings?: string;
  notes?: string;
}

export interface ScheduleEffectivenessCheckDto {
  scheduledDate: Date;
  method: string;
  criteria: string;
}

export interface CompleteEffectivenessCheckDto {
  checkedBy: string;
  checkedByName: string;
  result: 'effective' | 'partially_effective' | 'not_effective';
  findings?: string;
  recurrenceCheck: boolean;
  furtherActionRequired: boolean;
  notes?: string;
}

@Injectable()
export class CAPAService {
  private capas = new Map<string, CAPA>();
  private capaCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // CAPA Operations
  async createCAPA(tenantId: string, dto: CreateCAPADto): Promise<CAPA> {
    const id = `capa_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const capaNumber = await this.generateCAPANumber(tenantId);

    const capa: CAPA = {
      id,
      tenantId,
      capaNumber,
      status: CAPAStatus.DRAFT,
      type: dto.type,
      priority: dto.priority,
      source: dto.source,
      title: dto.title,
      description: dto.description,
      problemStatement: dto.problemStatement,
      ncrId: dto.ncrId,
      ncrNumber: dto.ncrNumber,
      auditId: dto.auditId,
      auditFinding: dto.auditFinding,
      complaintId: dto.complaintId,
      complaintNumber: dto.complaintNumber,
      productId: dto.productId,
      productName: dto.productName,
      processId: dto.processId,
      processName: dto.processName,
      departmentId: dto.departmentId,
      departmentName: dto.departmentName,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      initiatedBy: dto.initiatedBy,
      initiatedByName: dto.initiatedByName,
      ownerId: dto.ownerId,
      ownerName: dto.ownerName,
      correctiveActions: [],
      preventiveActions: [],
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      estimatedCost: dto.estimatedCost,
      currency: dto.currency,
      tags: dto.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.capas.set(id, capa);

    this.eventEmitter.emit('capa.created', {
      tenantId,
      capaId: id,
      type: dto.type,
      priority: dto.priority,
      source: dto.source,
    });

    return capa;
  }

  async openCAPA(tenantId: string, capaId: string): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status !== CAPAStatus.DRAFT) {
      throw new BadRequestException('CAPA is not in draft status');
    }

    capa.status = CAPAStatus.OPEN;
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.opened', { tenantId, capaId });

    return capa;
  }

  async startInvestigation(tenantId: string, capaId: string): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status !== CAPAStatus.OPEN) {
      throw new BadRequestException('CAPA must be open to start investigation');
    }

    capa.status = CAPAStatus.INVESTIGATION;
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.investigation_started', { tenantId, capaId });

    return capa;
  }

  async recordRootCauseAnalysis(
    tenantId: string,
    capaId: string,
    dto: RootCauseAnalysisDto,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status !== CAPAStatus.INVESTIGATION) {
      throw new BadRequestException('CAPA is not in investigation phase');
    }

    const rca: RootCauseAnalysis = {
      id: `rca_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      method: dto.method,
      rootCauses: dto.rootCauses,
      contributingFactors: dto.contributingFactors,
      analysis: dto.analysis,
      analyzedBy: dto.analyzedBy,
      analyzedByName: dto.analyzedByName,
      analyzedAt: new Date(),
      fiveWhySteps: dto.fiveWhySteps,
      fishboneDiagram: dto.fishboneDiagram,
    };

    capa.rootCauseAnalysis = rca;
    capa.status = CAPAStatus.ACTION_PLANNING;
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.rca_completed', {
      tenantId,
      capaId,
      method: dto.method,
      rootCauses: dto.rootCauses,
    });

    return capa;
  }

  async addAction(tenantId: string, capaId: string, dto: AddActionDto): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (
      capa.status !== CAPAStatus.ACTION_PLANNING &&
      capa.status !== CAPAStatus.IMPLEMENTATION
    ) {
      throw new BadRequestException('CAPA is not ready for actions');
    }

    const actionList =
      dto.type === 'corrective' ? capa.correctiveActions : capa.preventiveActions;
    const actionNumber = `${dto.type === 'corrective' ? 'CA' : 'PA'}-${
      actionList.length + 1
    }`;

    const action: CAPAAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      actionNumber,
      type: dto.type,
      description: dto.description,
      expectedOutcome: dto.expectedOutcome,
      status: ActionStatus.PENDING,
      priority: dto.priority,
      assignedTo: dto.assignedTo,
      assignedToName: dto.assignedToName,
      dueDate: new Date(dto.dueDate),
      evidenceRequired: dto.evidenceRequired,
    };

    if (dto.type === 'corrective') {
      capa.correctiveActions.push(action);
    } else {
      capa.preventiveActions.push(action);
    }

    capa.updatedAt = new Date();
    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.action_added', {
      tenantId,
      capaId,
      actionId: action.id,
      type: dto.type,
    });

    return capa;
  }

  async startImplementation(tenantId: string, capaId: string): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status !== CAPAStatus.ACTION_PLANNING) {
      throw new BadRequestException('CAPA is not in action planning phase');
    }

    const totalActions =
      capa.correctiveActions.length + capa.preventiveActions.length;
    if (totalActions === 0) {
      throw new BadRequestException('At least one action is required');
    }

    capa.status = CAPAStatus.IMPLEMENTATION;
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.implementation_started', { tenantId, capaId });

    return capa;
  }

  async startAction(
    tenantId: string,
    capaId: string,
    actionId: string,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);
    const action = this.findAction(capa, actionId);

    if (action.status !== ActionStatus.PENDING) {
      throw new BadRequestException('Action is not pending');
    }

    action.status = ActionStatus.IN_PROGRESS;
    action.startedAt = new Date();

    capa.updatedAt = new Date();
    this.capas.set(capaId, capa);

    return capa;
  }

  async completeAction(
    tenantId: string,
    capaId: string,
    actionId: string,
    dto: CompleteActionDto,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);
    const action = this.findAction(capa, actionId);

    if (action.status !== ActionStatus.IN_PROGRESS) {
      throw new BadRequestException('Action is not in progress');
    }

    action.status = ActionStatus.COMPLETED;
    action.completedAt = new Date();
    action.completedBy = dto.completedBy;
    action.completedByName = dto.completedByName;
    action.evidenceProvided = dto.evidenceProvided;
    if (dto.notes) {
      action.notes = dto.notes;
    }

    capa.updatedAt = new Date();
    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.action_completed', {
      tenantId,
      capaId,
      actionId,
    });

    return capa;
  }

  async verifyAction(
    tenantId: string,
    capaId: string,
    actionId: string,
    dto: VerifyActionDto,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);
    const action = this.findAction(capa, actionId);

    if (action.status !== ActionStatus.COMPLETED) {
      throw new BadRequestException('Action is not completed');
    }

    action.status = ActionStatus.VERIFIED;
    action.verifiedAt = new Date();
    action.verifiedBy = dto.verifiedBy;
    action.verifiedByName = dto.verifiedByName;
    if (dto.notes) {
      action.notes = action.notes
        ? `${action.notes}\nVerification: ${dto.notes}`
        : `Verification: ${dto.notes}`;
    }

    capa.updatedAt = new Date();
    this.capas.set(capaId, capa);

    // Check if all actions are verified
    const allActions = [...capa.correctiveActions, ...capa.preventiveActions];
    const allVerified = allActions.every(
      (a) => a.status === ActionStatus.VERIFIED || a.status === ActionStatus.CANCELLED,
    );

    if (allVerified && capa.status === CAPAStatus.IMPLEMENTATION) {
      capa.status = CAPAStatus.VERIFICATION;
      capa.completedDate = new Date();
      this.eventEmitter.emit('capa.ready_for_verification', { tenantId, capaId });
    }

    return capa;
  }

  async verifyCapa(
    tenantId: string,
    capaId: string,
    dto: CAPAVerificationDto,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status !== CAPAStatus.VERIFICATION) {
      throw new BadRequestException('CAPA is not ready for verification');
    }

    const verification: CAPAVerification = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      verifiedBy: dto.verifiedBy,
      verifiedByName: dto.verifiedByName,
      verifiedAt: new Date(),
      method: dto.method,
      criteria: dto.criteria,
      result: dto.result,
      findings: dto.findings,
      notes: dto.notes,
    };

    capa.verification = verification;

    if (dto.result === 'pass') {
      capa.status = CAPAStatus.EFFECTIVENESS_CHECK;
    } else if (dto.result === 'fail') {
      capa.status = CAPAStatus.ACTION_PLANNING;
      this.eventEmitter.emit('capa.verification_failed', {
        tenantId,
        capaId,
        findings: dto.findings,
      });
    }

    capa.updatedAt = new Date();
    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.verified', {
      tenantId,
      capaId,
      result: dto.result,
    });

    return capa;
  }

  async scheduleEffectivenessCheck(
    tenantId: string,
    capaId: string,
    dto: ScheduleEffectivenessCheckDto,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status !== CAPAStatus.EFFECTIVENESS_CHECK) {
      throw new BadRequestException('CAPA is not ready for effectiveness check');
    }

    const check: EffectivenessCheck = {
      id: `eff_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      scheduledDate: new Date(dto.scheduledDate),
      method: dto.method,
      criteria: dto.criteria,
    };

    capa.effectivenessCheck = check;
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.effectiveness_check_scheduled', {
      tenantId,
      capaId,
      scheduledDate: dto.scheduledDate,
    });

    return capa;
  }

  async completeEffectivenessCheck(
    tenantId: string,
    capaId: string,
    dto: CompleteEffectivenessCheckDto,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status !== CAPAStatus.EFFECTIVENESS_CHECK) {
      throw new BadRequestException('CAPA is not in effectiveness check phase');
    }

    if (!capa.effectivenessCheck) {
      throw new BadRequestException('No effectiveness check scheduled');
    }

    capa.effectivenessCheck.completedDate = new Date();
    capa.effectivenessCheck.checkedBy = dto.checkedBy;
    capa.effectivenessCheck.checkedByName = dto.checkedByName;
    capa.effectivenessCheck.result = dto.result;
    capa.effectivenessCheck.findings = dto.findings;
    capa.effectivenessCheck.recurrenceCheck = dto.recurrenceCheck;
    capa.effectivenessCheck.furtherActionRequired = dto.furtherActionRequired;
    capa.effectivenessCheck.notes = dto.notes;

    if (dto.result === 'effective' && !dto.furtherActionRequired) {
      capa.status = CAPAStatus.CLOSED;
      capa.closedDate = new Date();
      capa.closedBy = dto.checkedBy;
      capa.closedByName = dto.checkedByName;

      this.eventEmitter.emit('capa.closed', {
        tenantId,
        capaId,
        effectivenessResult: dto.result,
      });
    } else if (dto.furtherActionRequired) {
      capa.status = CAPAStatus.ACTION_PLANNING;
      this.eventEmitter.emit('capa.further_action_required', {
        tenantId,
        capaId,
        result: dto.result,
      });
    }

    capa.updatedAt = new Date();
    this.capas.set(capaId, capa);

    return capa;
  }

  async closeCAPA(
    tenantId: string,
    capaId: string,
    closedBy: string,
    closedByName: string,
    notes?: string,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (
      capa.status !== CAPAStatus.EFFECTIVENESS_CHECK &&
      capa.status !== CAPAStatus.VERIFICATION
    ) {
      throw new BadRequestException('CAPA cannot be closed in current status');
    }

    capa.status = CAPAStatus.CLOSED;
    capa.closedDate = new Date();
    capa.closedBy = closedBy;
    capa.closedByName = closedByName;
    if (notes) {
      capa.notes = capa.notes ? `${capa.notes}\nClosure: ${notes}` : notes;
    }
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.closed', { tenantId, capaId });

    return capa;
  }

  async cancelCAPA(
    tenantId: string,
    capaId: string,
    reason: string,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    if (capa.status === CAPAStatus.CLOSED) {
      throw new BadRequestException('Cannot cancel closed CAPA');
    }

    capa.status = CAPAStatus.CANCELLED;
    capa.metadata = { ...capa.metadata, cancellationReason: reason };
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    this.eventEmitter.emit('capa.cancelled', { tenantId, capaId, reason });

    return capa;
  }

  async setCost(
    tenantId: string,
    capaId: string,
    actualCost: number,
    currency: string,
  ): Promise<CAPA> {
    const capa = await this.getCAPA(tenantId, capaId);

    capa.actualCost = actualCost;
    capa.currency = currency;
    capa.updatedAt = new Date();

    this.capas.set(capaId, capa);

    return capa;
  }

  async getCAPA(tenantId: string, capaId: string): Promise<CAPA> {
    const capa = this.capas.get(capaId);

    if (!capa || capa.tenantId !== tenantId) {
      throw new NotFoundException(`CAPA ${capaId} not found`);
    }

    return capa;
  }

  async listCAPAs(
    tenantId: string,
    filters: {
      status?: CAPAStatus;
      type?: CAPAType;
      priority?: CAPAPriority;
      source?: CAPASource;
      ownerId?: string;
      ncrId?: string;
      supplierId?: string;
      productId?: string;
      processId?: string;
      departmentId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      overdue?: boolean;
    },
  ): Promise<CAPA[]> {
    let capas = Array.from(this.capas.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters.status) {
      capas = capas.filter((c) => c.status === filters.status);
    }

    if (filters.type) {
      capas = capas.filter((c) => c.type === filters.type);
    }

    if (filters.priority) {
      capas = capas.filter((c) => c.priority === filters.priority);
    }

    if (filters.source) {
      capas = capas.filter((c) => c.source === filters.source);
    }

    if (filters.ownerId) {
      capas = capas.filter((c) => c.ownerId === filters.ownerId);
    }

    if (filters.ncrId) {
      capas = capas.filter((c) => c.ncrId === filters.ncrId);
    }

    if (filters.supplierId) {
      capas = capas.filter((c) => c.supplierId === filters.supplierId);
    }

    if (filters.productId) {
      capas = capas.filter((c) => c.productId === filters.productId);
    }

    if (filters.processId) {
      capas = capas.filter((c) => c.processId === filters.processId);
    }

    if (filters.departmentId) {
      capas = capas.filter((c) => c.departmentId === filters.departmentId);
    }

    if (filters.dateFrom) {
      capas = capas.filter((c) => c.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      capas = capas.filter((c) => c.createdAt <= filters.dateTo!);
    }

    if (filters.overdue) {
      const now = new Date();
      capas = capas.filter(
        (c) =>
          c.targetDate &&
          c.targetDate < now &&
          c.status !== CAPAStatus.CLOSED &&
          c.status !== CAPAStatus.CANCELLED,
      );
    }

    return capas.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Analytics
  async getCAPAMetrics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalCAPAs: number;
    openCAPAs: number;
    closedCAPAs: number;
    overdueCAPAs: number;
    averageClosureTime: number;
    byType: Record<CAPAType, number>;
    byPriority: Record<CAPAPriority, number>;
    bySource: Record<CAPASource, number>;
    byStatus: Record<CAPAStatus, number>;
    actionMetrics: {
      totalActions: number;
      completedActions: number;
      overdueActions: number;
      averageCompletionTime: number;
    };
    effectivenessRate: number;
    estimatedCost: number;
    actualCost: number;
  }> {
    const capas = Array.from(this.capas.values()).filter(
      (c) =>
        c.tenantId === tenantId &&
        c.createdAt >= dateFrom &&
        c.createdAt <= dateTo,
    );

    const now = new Date();
    const openCAPAs = capas.filter(
      (c) => c.status !== CAPAStatus.CLOSED && c.status !== CAPAStatus.CANCELLED,
    );
    const closedCAPAs = capas.filter((c) => c.status === CAPAStatus.CLOSED);
    const overdueCAPAs = capas.filter(
      (c) =>
        c.targetDate &&
        c.targetDate < now &&
        c.status !== CAPAStatus.CLOSED &&
        c.status !== CAPAStatus.CANCELLED,
    );

    // Calculate average closure time
    let totalClosureTime = 0;
    let closedCount = 0;
    for (const capa of closedCAPAs) {
      if (capa.closedDate) {
        totalClosureTime += capa.closedDate.getTime() - capa.createdAt.getTime();
        closedCount++;
      }
    }

    // Initialize counts
    const byType: Record<CAPAType, number> = {} as any;
    const byPriority: Record<CAPAPriority, number> = {} as any;
    const bySource: Record<CAPASource, number> = {} as any;
    const byStatus: Record<CAPAStatus, number> = {} as any;

    for (const type of Object.values(CAPAType)) {
      byType[type] = 0;
    }
    for (const priority of Object.values(CAPAPriority)) {
      byPriority[priority] = 0;
    }
    for (const source of Object.values(CAPASource)) {
      bySource[source] = 0;
    }
    for (const status of Object.values(CAPAStatus)) {
      byStatus[status] = 0;
    }

    let totalActions = 0;
    let completedActions = 0;
    let overdueActions = 0;
    let totalActionCompletionTime = 0;
    let completedActionCount = 0;
    let effectiveCAPAs = 0;
    let checkedCAPAs = 0;
    let estimatedCost = 0;
    let actualCost = 0;

    for (const capa of capas) {
      byType[capa.type]++;
      byPriority[capa.priority]++;
      bySource[capa.source]++;
      byStatus[capa.status]++;

      const allActions = [...capa.correctiveActions, ...capa.preventiveActions];
      totalActions += allActions.length;

      for (const action of allActions) {
        if (
          action.status === ActionStatus.COMPLETED ||
          action.status === ActionStatus.VERIFIED
        ) {
          completedActions++;
          if (action.completedAt && action.startedAt) {
            totalActionCompletionTime +=
              action.completedAt.getTime() - action.startedAt.getTime();
            completedActionCount++;
          }
        }
        if (action.dueDate < now && action.status === ActionStatus.PENDING) {
          overdueActions++;
        }
      }

      if (capa.effectivenessCheck?.result) {
        checkedCAPAs++;
        if (capa.effectivenessCheck.result === 'effective') {
          effectiveCAPAs++;
        }
      }

      if (capa.estimatedCost) {
        estimatedCost += capa.estimatedCost;
      }
      if (capa.actualCost) {
        actualCost += capa.actualCost;
      }
    }

    return {
      totalCAPAs: capas.length,
      openCAPAs: openCAPAs.length,
      closedCAPAs: closedCAPAs.length,
      overdueCAPAs: overdueCAPAs.length,
      averageClosureTime: closedCount > 0 ? totalClosureTime / closedCount : 0,
      byType,
      byPriority,
      bySource,
      byStatus,
      actionMetrics: {
        totalActions,
        completedActions,
        overdueActions,
        averageCompletionTime:
          completedActionCount > 0
            ? totalActionCompletionTime / completedActionCount
            : 0,
      },
      effectivenessRate: checkedCAPAs > 0 ? (effectiveCAPAs / checkedCAPAs) * 100 : 0,
      estimatedCost,
      actualCost,
    };
  }

  // Helper Methods
  private async generateCAPANumber(tenantId: string): Promise<string> {
    const counter = (this.capaCounter.get(tenantId) || 0) + 1;
    this.capaCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `CAPA-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private findAction(capa: CAPA, actionId: string): CAPAAction {
    const action =
      capa.correctiveActions.find((a) => a.id === actionId) ||
      capa.preventiveActions.find((a) => a.id === actionId);

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    return action;
  }
}
