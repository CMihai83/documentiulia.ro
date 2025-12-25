import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Supplier Quality Types
export enum SupplierQualificationStatus {
  PENDING = 'pending',
  UNDER_EVALUATION = 'under_evaluation',
  QUALIFIED = 'qualified',
  CONDITIONALLY_QUALIFIED = 'conditionally_qualified',
  ON_HOLD = 'on_hold',
  DISQUALIFIED = 'disqualified',
  EXPIRED = 'expired',
}

export enum SupplierRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum EvaluationCriteria {
  QUALITY = 'quality',
  DELIVERY = 'delivery',
  PRICE = 'price',
  SERVICE = 'service',
  TECHNICAL = 'technical',
  FINANCIAL = 'financial',
  COMPLIANCE = 'compliance',
  SUSTAINABILITY = 'sustainability',
}

export enum AuditType {
  INITIAL = 'initial',
  PERIODIC = 'periodic',
  SPECIAL = 'special',
  FOLLOW_UP = 'follow_up',
  SURVEILLANCE = 'surveillance',
}

export enum AuditResult {
  PASS = 'pass',
  CONDITIONAL = 'conditional',
  FAIL = 'fail',
}

// Interfaces
export interface SupplierQualification {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  status: SupplierQualificationStatus;
  riskLevel: SupplierRiskLevel;

  // Qualification details
  qualificationDate?: Date;
  expirationDate?: Date;
  qualifiedBy?: string;
  qualifiedByName?: string;

  // Categories
  approvedCategories: ApprovedCategory[];
  certifications: SupplierCertification[];

  // Evaluations
  evaluations: SupplierEvaluation[];
  overallScore: number;
  scoreBreakdown: Record<EvaluationCriteria, number>;

  // Audits
  audits: SupplierAudit[];
  lastAuditDate?: Date;
  nextAuditDate?: Date;

  // Performance tracking
  performanceMetrics: PerformanceMetrics;
  performanceHistory: PerformanceRecord[];

  // Issues
  activeNCRCount: number;
  activeCAPACount: number;
  ncrIds?: string[];
  capaIds?: string[];

  // Conditions
  conditions?: string[];
  notes?: string;
  attachmentIds?: string[];
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovedCategory {
  categoryId: string;
  categoryName: string;
  approvedDate: Date;
  approvedBy: string;
  approvedByName: string;
  specifications?: string;
  restrictions?: string;
}

export interface SupplierCertification {
  certificationId: string;
  certificationType: string;
  certificateNumber: string;
  issuingBody: string;
  issueDate: Date;
  expiryDate: Date;
  verified: boolean;
  verifiedDate?: Date;
  verifiedBy?: string;
  attachmentId?: string;
}

export interface SupplierEvaluation {
  id: string;
  evaluationDate: Date;
  evaluatedBy: string;
  evaluatedByName: string;
  period: string;
  scores: Record<EvaluationCriteria, number>;
  overallScore: number;
  comments?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  attachmentIds?: string[];
}

export interface SupplierAudit {
  id: string;
  auditNumber: string;
  type: AuditType;
  scheduledDate: Date;
  actualDate?: Date;
  auditorId: string;
  auditorName: string;
  auditTeam?: string[];
  scope: string;
  checklist?: AuditChecklistItem[];
  findings: AuditFinding[];
  result?: AuditResult;
  score?: number;
  reportFileId?: string;
  capaRequired: boolean;
  capaId?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

export interface AuditChecklistItem {
  id: string;
  category: string;
  question: string;
  requirement?: string;
  score?: number;
  maxScore: number;
  evidence?: string;
  notes?: string;
}

export interface AuditFinding {
  id: string;
  type: 'observation' | 'minor' | 'major' | 'critical';
  description: string;
  clause?: string;
  evidence?: string;
  correctiveActionRequired: boolean;
  dueDate?: Date;
  status: 'open' | 'closed' | 'verified';
}

export interface PerformanceMetrics {
  qualityRate: number;
  onTimeDeliveryRate: number;
  defectRate: number;
  responseTime: number;
  complianceRate: number;
  returnRate: number;
  totalOrders: number;
  totalDefects: number;
  totalReturns: number;
  totalLateDeliveries: number;
  lastUpdated: Date;
}

export interface PerformanceRecord {
  period: string;
  qualityRate: number;
  onTimeDeliveryRate: number;
  defectRate: number;
  ordersCount: number;
  defectsCount: number;
  lateDeliveriesCount: number;
  recordedAt: Date;
}

// DTOs
export interface CreateSupplierQualificationDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  riskLevel?: SupplierRiskLevel;
  notes?: string;
}

export interface AddApprovedCategoryDto {
  categoryId: string;
  categoryName: string;
  approvedBy: string;
  approvedByName: string;
  specifications?: string;
  restrictions?: string;
}

export interface AddCertificationDto {
  certificationType: string;
  certificateNumber: string;
  issuingBody: string;
  issueDate: Date;
  expiryDate: Date;
  attachmentId?: string;
}

export interface CreateEvaluationDto {
  evaluatedBy: string;
  evaluatedByName: string;
  period: string;
  scores: Record<EvaluationCriteria, number>;
  comments?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

export interface ScheduleAuditDto {
  type: AuditType;
  scheduledDate: Date;
  auditorId: string;
  auditorName: string;
  auditTeam?: string[];
  scope: string;
  checklist?: Omit<AuditChecklistItem, 'id' | 'score' | 'evidence' | 'notes'>[];
}

export interface CompleteAuditDto {
  actualDate: Date;
  result: AuditResult;
  score?: number;
  findings: Omit<AuditFinding, 'id' | 'status'>[];
  checklistResults?: { itemId: string; score: number; evidence?: string; notes?: string }[];
  capaRequired: boolean;
  reportFileId?: string;
  notes?: string;
}

export interface RecordPerformanceDto {
  period: string;
  ordersCount: number;
  defectsCount: number;
  lateDeliveriesCount: number;
  returnsCount?: number;
}

@Injectable()
export class SupplierQualityService {
  private qualifications = new Map<string, SupplierQualification>();
  private auditCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Qualification Operations
  async createSupplierQualification(
    tenantId: string,
    dto: CreateSupplierQualificationDto,
  ): Promise<SupplierQualification> {
    const id = `squal_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const qualification: SupplierQualification = {
      id,
      tenantId,
      supplierId: dto.supplierId,
      supplierCode: dto.supplierCode,
      supplierName: dto.supplierName,
      status: SupplierQualificationStatus.PENDING,
      riskLevel: dto.riskLevel || SupplierRiskLevel.MEDIUM,
      approvedCategories: [],
      certifications: [],
      evaluations: [],
      overallScore: 0,
      scoreBreakdown: {
        [EvaluationCriteria.QUALITY]: 0,
        [EvaluationCriteria.DELIVERY]: 0,
        [EvaluationCriteria.PRICE]: 0,
        [EvaluationCriteria.SERVICE]: 0,
        [EvaluationCriteria.TECHNICAL]: 0,
        [EvaluationCriteria.FINANCIAL]: 0,
        [EvaluationCriteria.COMPLIANCE]: 0,
        [EvaluationCriteria.SUSTAINABILITY]: 0,
      },
      audits: [],
      performanceMetrics: {
        qualityRate: 0,
        onTimeDeliveryRate: 0,
        defectRate: 0,
        responseTime: 0,
        complianceRate: 0,
        returnRate: 0,
        totalOrders: 0,
        totalDefects: 0,
        totalReturns: 0,
        totalLateDeliveries: 0,
        lastUpdated: new Date(),
      },
      performanceHistory: [],
      activeNCRCount: 0,
      activeCAPACount: 0,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.qualifications.set(id, qualification);

    this.eventEmitter.emit('supplier.qualification.created', {
      tenantId,
      qualificationId: id,
      supplierId: dto.supplierId,
    });

    return qualification;
  }

  async startEvaluation(tenantId: string, qualificationId: string): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    if (qualification.status !== SupplierQualificationStatus.PENDING) {
      throw new BadRequestException('Supplier must be in pending status');
    }

    qualification.status = SupplierQualificationStatus.UNDER_EVALUATION;
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  async qualifySupplier(
    tenantId: string,
    qualificationId: string,
    qualifiedBy: string,
    qualifiedByName: string,
    expirationDate?: Date,
    conditions?: string[],
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    if (
      qualification.status !== SupplierQualificationStatus.UNDER_EVALUATION &&
      qualification.status !== SupplierQualificationStatus.CONDITIONALLY_QUALIFIED &&
      qualification.status !== SupplierQualificationStatus.ON_HOLD
    ) {
      throw new BadRequestException('Supplier cannot be qualified from current status');
    }

    qualification.status = conditions?.length
      ? SupplierQualificationStatus.CONDITIONALLY_QUALIFIED
      : SupplierQualificationStatus.QUALIFIED;
    qualification.qualificationDate = new Date();
    qualification.qualifiedBy = qualifiedBy;
    qualification.qualifiedByName = qualifiedByName;
    qualification.expirationDate = expirationDate;
    qualification.conditions = conditions;
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    this.eventEmitter.emit('supplier.qualification.qualified', {
      tenantId,
      qualificationId,
      supplierId: qualification.supplierId,
      conditional: !!conditions?.length,
    });

    return qualification;
  }

  async putOnHold(
    tenantId: string,
    qualificationId: string,
    reason: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    qualification.status = SupplierQualificationStatus.ON_HOLD;
    qualification.metadata = { ...qualification.metadata, holdReason: reason };
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    this.eventEmitter.emit('supplier.qualification.on_hold', {
      tenantId,
      qualificationId,
      reason,
    });

    return qualification;
  }

  async disqualifySupplier(
    tenantId: string,
    qualificationId: string,
    reason: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    qualification.status = SupplierQualificationStatus.DISQUALIFIED;
    qualification.metadata = { ...qualification.metadata, disqualificationReason: reason };
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    this.eventEmitter.emit('supplier.qualification.disqualified', {
      tenantId,
      qualificationId,
      supplierId: qualification.supplierId,
      reason,
    });

    return qualification;
  }

  async setRiskLevel(
    tenantId: string,
    qualificationId: string,
    riskLevel: SupplierRiskLevel,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    const previousLevel = qualification.riskLevel;
    qualification.riskLevel = riskLevel;
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    if (riskLevel !== previousLevel) {
      this.eventEmitter.emit('supplier.risk_level_changed', {
        tenantId,
        qualificationId,
        supplierId: qualification.supplierId,
        previousLevel,
        newLevel: riskLevel,
      });
    }

    return qualification;
  }

  // Category Management
  async addApprovedCategory(
    tenantId: string,
    qualificationId: string,
    dto: AddApprovedCategoryDto,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    const existingCategory = qualification.approvedCategories.find(
      (c) => c.categoryId === dto.categoryId,
    );

    if (existingCategory) {
      throw new BadRequestException('Category already approved');
    }

    qualification.approvedCategories.push({
      categoryId: dto.categoryId,
      categoryName: dto.categoryName,
      approvedDate: new Date(),
      approvedBy: dto.approvedBy,
      approvedByName: dto.approvedByName,
      specifications: dto.specifications,
      restrictions: dto.restrictions,
    });

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  async removeApprovedCategory(
    tenantId: string,
    qualificationId: string,
    categoryId: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    qualification.approvedCategories = qualification.approvedCategories.filter(
      (c) => c.categoryId !== categoryId,
    );

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  // Certification Management
  async addCertification(
    tenantId: string,
    qualificationId: string,
    dto: AddCertificationDto,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    qualification.certifications.push({
      certificationId: `scert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      certificationType: dto.certificationType,
      certificateNumber: dto.certificateNumber,
      issuingBody: dto.issuingBody,
      issueDate: new Date(dto.issueDate),
      expiryDate: new Date(dto.expiryDate),
      verified: false,
      attachmentId: dto.attachmentId,
    });

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  async verifyCertification(
    tenantId: string,
    qualificationId: string,
    certificationId: string,
    verifiedBy: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    const certification = qualification.certifications.find(
      (c) => c.certificationId === certificationId,
    );

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    certification.verified = true;
    certification.verifiedDate = new Date();
    certification.verifiedBy = verifiedBy;

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  // Evaluation Management
  async createEvaluation(
    tenantId: string,
    qualificationId: string,
    dto: CreateEvaluationDto,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    // Calculate overall score
    const scoreValues = Object.values(dto.scores);
    const overallScore =
      scoreValues.length > 0
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        : 0;

    const evaluation: SupplierEvaluation = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      evaluationDate: new Date(),
      evaluatedBy: dto.evaluatedBy,
      evaluatedByName: dto.evaluatedByName,
      period: dto.period,
      scores: dto.scores,
      overallScore,
      comments: dto.comments,
      strengths: dto.strengths,
      weaknesses: dto.weaknesses,
      recommendations: dto.recommendations,
    };

    qualification.evaluations.push(evaluation);

    // Update score breakdown
    for (const [criteria, score] of Object.entries(dto.scores)) {
      qualification.scoreBreakdown[criteria as EvaluationCriteria] = score;
    }
    qualification.overallScore = overallScore;

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    this.eventEmitter.emit('supplier.evaluation.completed', {
      tenantId,
      qualificationId,
      supplierId: qualification.supplierId,
      overallScore,
    });

    return qualification;
  }

  // Audit Management
  async scheduleAudit(
    tenantId: string,
    qualificationId: string,
    dto: ScheduleAuditDto,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);
    const auditNumber = await this.generateAuditNumber(tenantId);

    const checklist: AuditChecklistItem[] | undefined = dto.checklist?.map((item) => ({
      ...item,
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    }));

    const audit: SupplierAudit = {
      id: `saud_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      auditNumber,
      type: dto.type,
      scheduledDate: new Date(dto.scheduledDate),
      auditorId: dto.auditorId,
      auditorName: dto.auditorName,
      auditTeam: dto.auditTeam,
      scope: dto.scope,
      checklist,
      findings: [],
      capaRequired: false,
      status: 'scheduled',
    };

    qualification.audits.push(audit);
    qualification.nextAuditDate = new Date(dto.scheduledDate);
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    this.eventEmitter.emit('supplier.audit.scheduled', {
      tenantId,
      qualificationId,
      auditId: audit.id,
      scheduledDate: dto.scheduledDate,
    });

    return qualification;
  }

  async startAudit(
    tenantId: string,
    qualificationId: string,
    auditId: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);
    const audit = qualification.audits.find((a) => a.id === auditId);

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    if (audit.status !== 'scheduled') {
      throw new BadRequestException('Audit is not scheduled');
    }

    audit.status = 'in_progress';
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  async completeAudit(
    tenantId: string,
    qualificationId: string,
    auditId: string,
    dto: CompleteAuditDto,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);
    const audit = qualification.audits.find((a) => a.id === auditId);

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    if (audit.status !== 'in_progress') {
      throw new BadRequestException('Audit is not in progress');
    }

    audit.actualDate = new Date(dto.actualDate);
    audit.result = dto.result;
    audit.score = dto.score;
    audit.capaRequired = dto.capaRequired;
    audit.reportFileId = dto.reportFileId;
    audit.notes = dto.notes;
    audit.status = 'completed';

    // Add findings
    audit.findings = dto.findings.map((f) => ({
      ...f,
      id: `find_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: 'open',
    }));

    // Update checklist results
    if (dto.checklistResults && audit.checklist) {
      for (const result of dto.checklistResults) {
        const item = audit.checklist.find((c) => c.id === result.itemId);
        if (item) {
          item.score = result.score;
          item.evidence = result.evidence;
          item.notes = result.notes;
        }
      }
    }

    qualification.lastAuditDate = audit.actualDate;
    qualification.updatedAt = new Date();

    // Update status based on audit result
    if (dto.result === AuditResult.FAIL) {
      qualification.status = SupplierQualificationStatus.ON_HOLD;
    }

    this.qualifications.set(qualificationId, qualification);

    this.eventEmitter.emit('supplier.audit.completed', {
      tenantId,
      qualificationId,
      auditId,
      result: dto.result,
      capaRequired: dto.capaRequired,
    });

    return qualification;
  }

  async cancelAudit(
    tenantId: string,
    qualificationId: string,
    auditId: string,
    reason: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);
    const audit = qualification.audits.find((a) => a.id === auditId);

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    if (audit.status === 'completed') {
      throw new BadRequestException('Cannot cancel completed audit');
    }

    audit.status = 'cancelled';
    audit.notes = reason;
    qualification.updatedAt = new Date();

    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  // Performance Management
  async recordPerformance(
    tenantId: string,
    qualificationId: string,
    dto: RecordPerformanceDto,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    const qualityRate =
      dto.ordersCount > 0
        ? ((dto.ordersCount - dto.defectsCount) / dto.ordersCount) * 100
        : 0;

    const onTimeDeliveryRate =
      dto.ordersCount > 0
        ? ((dto.ordersCount - dto.lateDeliveriesCount) / dto.ordersCount) * 100
        : 0;

    const defectRate =
      dto.ordersCount > 0 ? (dto.defectsCount / dto.ordersCount) * 100 : 0;

    const record: PerformanceRecord = {
      period: dto.period,
      qualityRate,
      onTimeDeliveryRate,
      defectRate,
      ordersCount: dto.ordersCount,
      defectsCount: dto.defectsCount,
      lateDeliveriesCount: dto.lateDeliveriesCount,
      recordedAt: new Date(),
    };

    qualification.performanceHistory.push(record);

    // Update cumulative metrics
    const metrics = qualification.performanceMetrics;
    metrics.totalOrders += dto.ordersCount;
    metrics.totalDefects += dto.defectsCount;
    metrics.totalLateDeliveries += dto.lateDeliveriesCount;
    metrics.totalReturns += dto.returnsCount || 0;

    metrics.qualityRate =
      metrics.totalOrders > 0
        ? ((metrics.totalOrders - metrics.totalDefects) / metrics.totalOrders) * 100
        : 0;

    metrics.onTimeDeliveryRate =
      metrics.totalOrders > 0
        ? ((metrics.totalOrders - metrics.totalLateDeliveries) / metrics.totalOrders) * 100
        : 0;

    metrics.defectRate =
      metrics.totalOrders > 0
        ? (metrics.totalDefects / metrics.totalOrders) * 100
        : 0;

    metrics.returnRate =
      metrics.totalOrders > 0
        ? (metrics.totalReturns / metrics.totalOrders) * 100
        : 0;

    metrics.lastUpdated = new Date();

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    // Check if performance triggers risk level change
    this.checkPerformanceThresholds(qualification);

    this.eventEmitter.emit('supplier.performance.recorded', {
      tenantId,
      qualificationId,
      supplierId: qualification.supplierId,
      qualityRate,
      onTimeDeliveryRate,
    });

    return qualification;
  }

  async linkNCR(
    tenantId: string,
    qualificationId: string,
    ncrId: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    if (!qualification.ncrIds) {
      qualification.ncrIds = [];
    }

    if (!qualification.ncrIds.includes(ncrId)) {
      qualification.ncrIds.push(ncrId);
      qualification.activeNCRCount++;
    }

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  async linkCAPA(
    tenantId: string,
    qualificationId: string,
    capaId: string,
  ): Promise<SupplierQualification> {
    const qualification = await this.getSupplierQualification(tenantId, qualificationId);

    if (!qualification.capaIds) {
      qualification.capaIds = [];
    }

    if (!qualification.capaIds.includes(capaId)) {
      qualification.capaIds.push(capaId);
      qualification.activeCAPACount++;
    }

    qualification.updatedAt = new Date();
    this.qualifications.set(qualificationId, qualification);

    return qualification;
  }

  async getSupplierQualification(
    tenantId: string,
    qualificationId: string,
  ): Promise<SupplierQualification> {
    const qualification = this.qualifications.get(qualificationId);

    if (!qualification || qualification.tenantId !== tenantId) {
      throw new NotFoundException(`Qualification ${qualificationId} not found`);
    }

    return qualification;
  }

  async getBySupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<SupplierQualification | null> {
    const qualifications = Array.from(this.qualifications.values());
    return (
      qualifications.find(
        (q) => q.tenantId === tenantId && q.supplierId === supplierId,
      ) || null
    );
  }

  async listSupplierQualifications(
    tenantId: string,
    filters: {
      status?: SupplierQualificationStatus;
      riskLevel?: SupplierRiskLevel;
      categoryId?: string;
      minScore?: number;
      maxScore?: number;
      expiringWithin?: number;
      auditDueWithin?: number;
    },
  ): Promise<SupplierQualification[]> {
    let qualifications = Array.from(this.qualifications.values()).filter(
      (q) => q.tenantId === tenantId,
    );

    if (filters.status) {
      qualifications = qualifications.filter((q) => q.status === filters.status);
    }

    if (filters.riskLevel) {
      qualifications = qualifications.filter((q) => q.riskLevel === filters.riskLevel);
    }

    if (filters.categoryId) {
      qualifications = qualifications.filter((q) =>
        q.approvedCategories.some((c) => c.categoryId === filters.categoryId),
      );
    }

    if (filters.minScore !== undefined) {
      qualifications = qualifications.filter((q) => q.overallScore >= filters.minScore!);
    }

    if (filters.maxScore !== undefined) {
      qualifications = qualifications.filter((q) => q.overallScore <= filters.maxScore!);
    }

    if (filters.expiringWithin) {
      const cutoff = new Date(
        Date.now() + filters.expiringWithin * 24 * 60 * 60 * 1000,
      );
      qualifications = qualifications.filter(
        (q) => q.expirationDate && q.expirationDate <= cutoff,
      );
    }

    if (filters.auditDueWithin) {
      const cutoff = new Date(
        Date.now() + filters.auditDueWithin * 24 * 60 * 60 * 1000,
      );
      qualifications = qualifications.filter(
        (q) => q.nextAuditDate && q.nextAuditDate <= cutoff,
      );
    }

    return qualifications.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Analytics
  async getSupplierQualityMetrics(
    tenantId: string,
  ): Promise<{
    totalSuppliers: number;
    byStatus: Record<SupplierQualificationStatus, number>;
    byRiskLevel: Record<SupplierRiskLevel, number>;
    averageScore: number;
    averageQualityRate: number;
    averageOnTimeDelivery: number;
    suppliersRequiringAudit: number;
    suppliersExpiringSoon: number;
  }> {
    const qualifications = Array.from(this.qualifications.values()).filter(
      (q) => q.tenantId === tenantId,
    );

    const byStatus: Record<SupplierQualificationStatus, number> = {} as any;
    const byRiskLevel: Record<SupplierRiskLevel, number> = {} as any;

    for (const status of Object.values(SupplierQualificationStatus)) {
      byStatus[status] = 0;
    }
    for (const risk of Object.values(SupplierRiskLevel)) {
      byRiskLevel[risk] = 0;
    }

    let totalScore = 0;
    let totalQualityRate = 0;
    let totalOnTimeDelivery = 0;
    let suppliersWithMetrics = 0;
    let suppliersRequiringAudit = 0;
    let suppliersExpiringSoon = 0;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const qual of qualifications) {
      byStatus[qual.status]++;
      byRiskLevel[qual.riskLevel]++;

      if (qual.overallScore > 0) {
        totalScore += qual.overallScore;
      }

      if (qual.performanceMetrics.qualityRate > 0) {
        totalQualityRate += qual.performanceMetrics.qualityRate;
        totalOnTimeDelivery += qual.performanceMetrics.onTimeDeliveryRate;
        suppliersWithMetrics++;
      }

      if (qual.nextAuditDate && qual.nextAuditDate <= thirtyDaysFromNow) {
        suppliersRequiringAudit++;
      }

      if (qual.expirationDate && qual.expirationDate <= thirtyDaysFromNow) {
        suppliersExpiringSoon++;
      }
    }

    return {
      totalSuppliers: qualifications.length,
      byStatus,
      byRiskLevel,
      averageScore:
        qualifications.length > 0 ? totalScore / qualifications.length : 0,
      averageQualityRate:
        suppliersWithMetrics > 0 ? totalQualityRate / suppliersWithMetrics : 0,
      averageOnTimeDelivery:
        suppliersWithMetrics > 0 ? totalOnTimeDelivery / suppliersWithMetrics : 0,
      suppliersRequiringAudit,
      suppliersExpiringSoon,
    };
  }

  // Helper Methods
  private async generateAuditNumber(tenantId: string): Promise<string> {
    const counter = (this.auditCounter.get(tenantId) || 0) + 1;
    this.auditCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `SA-${year}-${counter.toString().padStart(5, '0')}`;
  }

  private checkPerformanceThresholds(qualification: SupplierQualification): void {
    const metrics = qualification.performanceMetrics;
    let newRiskLevel = qualification.riskLevel;

    // Critical thresholds
    if (metrics.qualityRate < 90 || metrics.onTimeDeliveryRate < 85) {
      newRiskLevel = SupplierRiskLevel.CRITICAL;
    } else if (metrics.qualityRate < 95 || metrics.onTimeDeliveryRate < 90) {
      newRiskLevel = SupplierRiskLevel.HIGH;
    } else if (metrics.qualityRate < 98 || metrics.onTimeDeliveryRate < 95) {
      newRiskLevel = SupplierRiskLevel.MEDIUM;
    } else {
      newRiskLevel = SupplierRiskLevel.LOW;
    }

    if (newRiskLevel !== qualification.riskLevel) {
      this.eventEmitter.emit('supplier.risk_level_changed', {
        tenantId: qualification.tenantId,
        qualificationId: qualification.id,
        supplierId: qualification.supplierId,
        previousLevel: qualification.riskLevel,
        newLevel: newRiskLevel,
        reason: 'Performance threshold breach',
      });
      qualification.riskLevel = newRiskLevel;
    }
  }
}
