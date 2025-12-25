import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Quality Control Types
export enum InspectionType {
  INCOMING = 'incoming',
  IN_PROCESS = 'in_process',
  FINAL = 'final',
  RECEIVING = 'receiving',
  SHIPPING = 'shipping',
  PERIODIC = 'periodic',
  RANDOM = 'random',
  CUSTOMER_RETURN = 'customer_return',
}

export enum InspectionStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
}

export enum InspectionResult {
  PASS = 'pass',
  FAIL = 'fail',
  CONDITIONAL_PASS = 'conditional_pass',
  PENDING = 'pending',
}

export enum SamplingMethod {
  FULL = 'full',
  RANDOM = 'random',
  AQL = 'aql',
  SKIP_LOT = 'skip_lot',
  FIRST_ARTICLE = 'first_article',
}

export enum DefectSeverity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  COSMETIC = 'cosmetic',
}

export enum CheckType {
  VISUAL = 'visual',
  DIMENSIONAL = 'dimensional',
  FUNCTIONAL = 'functional',
  ELECTRICAL = 'electrical',
  CHEMICAL = 'chemical',
  DOCUMENTATION = 'documentation',
  PACKAGING = 'packaging',
  LABELING = 'labeling',
}

// Interfaces
export interface QualityInspection {
  id: string;
  tenantId: string;
  inspectionNumber: string;
  type: InspectionType;
  status: InspectionStatus;
  result: InspectionResult;
  referenceType: 'purchase_order' | 'production_order' | 'sales_order' | 'inventory' | 'other';
  referenceId: string;
  referenceNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  supplierId?: string;
  supplierName?: string;
  warehouseId?: string;
  warehouseName?: string;
  locationId?: string;
  samplingMethod: SamplingMethod;
  sampleSize: number;
  totalQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  acceptanceRate: number;
  checklistId?: string;
  checklistName?: string;
  checks: InspectionCheck[];
  defects: InspectionDefect[];
  totalDefects: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  plannedDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  inspectedBy?: string;
  inspectedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  attachmentIds?: string[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InspectionCheck {
  id: string;
  checkType: CheckType;
  checkName: string;
  description?: string;
  specification?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  unit?: string;
  actualValue?: string | number;
  result: InspectionResult;
  defectId?: string;
  notes?: string;
  imageIds?: string[];
  sequence: number;
}

export interface InspectionDefect {
  id: string;
  defectCode: string;
  defectName: string;
  severity: DefectSeverity;
  quantity: number;
  description: string;
  checkId?: string;
  rootCause?: string;
  imageIds?: string[];
  createdAt: Date;
}

export interface QualityChecklist {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  inspectionType: InspectionType;
  itemCategory?: string;
  supplierCategory?: string;
  checks: ChecklistItem[];
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItem {
  id: string;
  checkType: CheckType;
  checkName: string;
  description?: string;
  specification?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  unit?: string;
  isMandatory: boolean;
  isPassFail: boolean;
  sequence: number;
}

export interface DefectCode {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  severity: DefectSeverity;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreateInspectionDto {
  type: InspectionType;
  referenceType: QualityInspection['referenceType'];
  referenceId: string;
  referenceNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  supplierId?: string;
  supplierName?: string;
  warehouseId?: string;
  warehouseName?: string;
  locationId?: string;
  samplingMethod?: SamplingMethod;
  sampleSize: number;
  totalQuantity: number;
  checklistId?: string;
  checklistName?: string;
  plannedDate: Date;
  notes?: string;
}

export interface RecordCheckResultDto {
  checkId: string;
  actualValue?: string | number;
  result: InspectionResult;
  notes?: string;
  imageIds?: string[];
}

export interface RecordDefectDto {
  defectCode: string;
  defectName: string;
  severity: DefectSeverity;
  quantity: number;
  description: string;
  checkId?: string;
  rootCause?: string;
  imageIds?: string[];
}

export interface CompleteInspectionDto {
  passedQuantity: number;
  failedQuantity: number;
  inspectedBy: string;
  inspectedByName: string;
  notes?: string;
}

export interface CreateChecklistDto {
  code: string;
  name: string;
  description?: string;
  inspectionType: InspectionType;
  itemCategory?: string;
  supplierCategory?: string;
  checks: Omit<ChecklistItem, 'id'>[];
  createdBy: string;
}

export interface CreateDefectCodeDto {
  code: string;
  name: string;
  description?: string;
  severity: DefectSeverity;
  category: string;
}

@Injectable()
export class QualityControlService {
  private inspections = new Map<string, QualityInspection>();
  private checklists = new Map<string, QualityChecklist>();
  private defectCodes = new Map<string, DefectCode>();
  private inspectionCounter = new Map<string, number>();
  private checklistCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Inspection Operations
  async createInspection(
    tenantId: string,
    dto: CreateInspectionDto,
  ): Promise<QualityInspection> {
    const id = `insp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const inspectionNumber = await this.generateInspectionNumber(tenantId);

    // Get checklist if specified
    let checks: InspectionCheck[] = [];
    if (dto.checklistId) {
      const checklist = this.checklists.get(dto.checklistId);
      if (checklist && checklist.tenantId === tenantId) {
        checks = checklist.checks.map((item, index) => ({
          id: `check_${Date.now()}_${index}`,
          checkType: item.checkType,
          checkName: item.checkName,
          description: item.description,
          specification: item.specification,
          minValue: item.minValue,
          maxValue: item.maxValue,
          targetValue: item.targetValue,
          unit: item.unit,
          result: InspectionResult.PENDING,
          sequence: item.sequence,
        }));
      }
    }

    const inspection: QualityInspection = {
      id,
      tenantId,
      inspectionNumber,
      type: dto.type,
      status: InspectionStatus.PLANNED,
      result: InspectionResult.PENDING,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      referenceNumber: dto.referenceNumber,
      itemId: dto.itemId,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      lotNumber: dto.lotNumber,
      batchNumber: dto.batchNumber,
      serialNumbers: dto.serialNumbers,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      warehouseId: dto.warehouseId,
      warehouseName: dto.warehouseName,
      locationId: dto.locationId,
      samplingMethod: dto.samplingMethod || SamplingMethod.FULL,
      sampleSize: dto.sampleSize,
      totalQuantity: dto.totalQuantity,
      passedQuantity: 0,
      failedQuantity: 0,
      acceptanceRate: 0,
      checklistId: dto.checklistId,
      checklistName: dto.checklistName,
      checks,
      defects: [],
      totalDefects: 0,
      criticalDefects: 0,
      majorDefects: 0,
      minorDefects: 0,
      plannedDate: new Date(dto.plannedDate),
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.inspections.set(id, inspection);

    this.eventEmitter.emit('quality_inspection.created', {
      tenantId,
      inspectionId: id,
      type: dto.type,
      itemId: dto.itemId,
    });

    return inspection;
  }

  async startInspection(tenantId: string, inspectionId: string): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status !== InspectionStatus.PLANNED) {
      throw new BadRequestException('Inspection is not in planned status');
    }

    inspection.status = InspectionStatus.IN_PROGRESS;
    inspection.startedAt = new Date();
    inspection.updatedAt = new Date();

    this.inspections.set(inspectionId, inspection);

    this.eventEmitter.emit('quality_inspection.started', {
      tenantId,
      inspectionId,
    });

    return inspection;
  }

  async addCheck(
    tenantId: string,
    inspectionId: string,
    check: Omit<InspectionCheck, 'id' | 'result'>,
  ): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status !== InspectionStatus.PLANNED && inspection.status !== InspectionStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot add checks to this inspection');
    }

    const newCheck: InspectionCheck = {
      id: `check_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...check,
      result: InspectionResult.PENDING,
    };

    inspection.checks.push(newCheck);
    inspection.updatedAt = new Date();

    this.inspections.set(inspectionId, inspection);

    return inspection;
  }

  async recordCheckResult(
    tenantId: string,
    inspectionId: string,
    dto: RecordCheckResultDto,
  ): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status !== InspectionStatus.IN_PROGRESS) {
      throw new BadRequestException('Inspection must be in progress');
    }

    const check = inspection.checks.find((c) => c.id === dto.checkId);
    if (!check) {
      throw new NotFoundException(`Check ${dto.checkId} not found`);
    }

    check.actualValue = dto.actualValue;
    check.result = dto.result;
    check.notes = dto.notes;
    check.imageIds = dto.imageIds;

    inspection.updatedAt = new Date();
    this.inspections.set(inspectionId, inspection);

    return inspection;
  }

  async recordDefect(
    tenantId: string,
    inspectionId: string,
    dto: RecordDefectDto,
  ): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status !== InspectionStatus.IN_PROGRESS) {
      throw new BadRequestException('Inspection must be in progress');
    }

    const defect: InspectionDefect = {
      id: `defect_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      defectCode: dto.defectCode,
      defectName: dto.defectName,
      severity: dto.severity,
      quantity: dto.quantity,
      description: dto.description,
      checkId: dto.checkId,
      rootCause: dto.rootCause,
      imageIds: dto.imageIds,
      createdAt: new Date(),
    };

    inspection.defects.push(defect);
    inspection.totalDefects += dto.quantity;

    switch (dto.severity) {
      case DefectSeverity.CRITICAL:
        inspection.criticalDefects += dto.quantity;
        break;
      case DefectSeverity.MAJOR:
        inspection.majorDefects += dto.quantity;
        break;
      case DefectSeverity.MINOR:
      case DefectSeverity.COSMETIC:
        inspection.minorDefects += dto.quantity;
        break;
    }

    // Link defect to check if specified
    if (dto.checkId) {
      const check = inspection.checks.find((c) => c.id === dto.checkId);
      if (check) {
        check.defectId = defect.id;
        if (check.result === InspectionResult.PENDING) {
          check.result = InspectionResult.FAIL;
        }
      }
    }

    inspection.updatedAt = new Date();
    this.inspections.set(inspectionId, inspection);

    this.eventEmitter.emit('quality_defect.recorded', {
      tenantId,
      inspectionId,
      defectId: defect.id,
      severity: dto.severity,
    });

    return inspection;
  }

  async completeInspection(
    tenantId: string,
    inspectionId: string,
    dto: CompleteInspectionDto,
  ): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status !== InspectionStatus.IN_PROGRESS) {
      throw new BadRequestException('Inspection must be in progress');
    }

    if (dto.passedQuantity + dto.failedQuantity > inspection.sampleSize) {
      throw new BadRequestException('Quantities exceed sample size');
    }

    inspection.passedQuantity = dto.passedQuantity;
    inspection.failedQuantity = dto.failedQuantity;
    inspection.acceptanceRate = inspection.sampleSize > 0
      ? (dto.passedQuantity / inspection.sampleSize) * 100
      : 0;

    inspection.inspectedBy = dto.inspectedBy;
    inspection.inspectedByName = dto.inspectedByName;
    inspection.completedAt = new Date();
    inspection.notes = dto.notes || inspection.notes;

    // Determine result
    if (inspection.criticalDefects > 0) {
      inspection.result = InspectionResult.FAIL;
    } else if (inspection.acceptanceRate >= 95) {
      inspection.result = InspectionResult.PASS;
    } else if (inspection.acceptanceRate >= 80) {
      inspection.result = InspectionResult.CONDITIONAL_PASS;
    } else {
      inspection.result = InspectionResult.FAIL;
    }

    inspection.status = InspectionStatus.PENDING_REVIEW;
    inspection.updatedAt = new Date();

    this.inspections.set(inspectionId, inspection);

    this.eventEmitter.emit('quality_inspection.completed', {
      tenantId,
      inspectionId,
      result: inspection.result,
      acceptanceRate: inspection.acceptanceRate,
    });

    return inspection;
  }

  async reviewInspection(
    tenantId: string,
    inspectionId: string,
    approved: boolean,
    reviewerId: string,
    reviewerName: string,
    notes?: string,
  ): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status !== InspectionStatus.PENDING_REVIEW) {
      throw new BadRequestException('Inspection is not pending review');
    }

    inspection.status = approved ? InspectionStatus.APPROVED : InspectionStatus.REJECTED;
    inspection.reviewedBy = reviewerId;
    inspection.reviewedByName = reviewerName;
    inspection.reviewedAt = new Date();
    inspection.reviewNotes = notes;
    inspection.updatedAt = new Date();

    this.inspections.set(inspectionId, inspection);

    this.eventEmitter.emit('quality_inspection.reviewed', {
      tenantId,
      inspectionId,
      approved,
      result: inspection.result,
    });

    return inspection;
  }

  async putOnHold(
    tenantId: string,
    inspectionId: string,
    reason: string,
  ): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status === InspectionStatus.APPROVED || inspection.status === InspectionStatus.CANCELLED) {
      throw new BadRequestException('Cannot put this inspection on hold');
    }

    inspection.status = InspectionStatus.ON_HOLD;
    inspection.metadata = { ...inspection.metadata, holdReason: reason };
    inspection.updatedAt = new Date();

    this.inspections.set(inspectionId, inspection);

    return inspection;
  }

  async releaseFromHold(tenantId: string, inspectionId: string): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status !== InspectionStatus.ON_HOLD) {
      throw new BadRequestException('Inspection is not on hold');
    }

    inspection.status = inspection.completedAt
      ? InspectionStatus.PENDING_REVIEW
      : InspectionStatus.IN_PROGRESS;
    inspection.updatedAt = new Date();

    this.inspections.set(inspectionId, inspection);

    return inspection;
  }

  async cancelInspection(
    tenantId: string,
    inspectionId: string,
    reason: string,
  ): Promise<QualityInspection> {
    const inspection = await this.getInspection(tenantId, inspectionId);

    if (inspection.status === InspectionStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel approved inspection');
    }

    inspection.status = InspectionStatus.CANCELLED;
    inspection.metadata = { ...inspection.metadata, cancellationReason: reason };
    inspection.updatedAt = new Date();

    this.inspections.set(inspectionId, inspection);

    this.eventEmitter.emit('quality_inspection.cancelled', {
      tenantId,
      inspectionId,
      reason,
    });

    return inspection;
  }

  async getInspection(tenantId: string, inspectionId: string): Promise<QualityInspection> {
    const inspection = this.inspections.get(inspectionId);

    if (!inspection || inspection.tenantId !== tenantId) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }

    return inspection;
  }

  async listInspections(
    tenantId: string,
    filters: {
      type?: InspectionType;
      status?: InspectionStatus;
      result?: InspectionResult;
      referenceType?: QualityInspection['referenceType'];
      referenceId?: string;
      itemId?: string;
      supplierId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<QualityInspection[]> {
    let inspections = Array.from(this.inspections.values()).filter(
      (i) => i.tenantId === tenantId,
    );

    if (filters.type) {
      inspections = inspections.filter((i) => i.type === filters.type);
    }

    if (filters.status) {
      inspections = inspections.filter((i) => i.status === filters.status);
    }

    if (filters.result) {
      inspections = inspections.filter((i) => i.result === filters.result);
    }

    if (filters.referenceType) {
      inspections = inspections.filter((i) => i.referenceType === filters.referenceType);
    }

    if (filters.referenceId) {
      inspections = inspections.filter((i) => i.referenceId === filters.referenceId);
    }

    if (filters.itemId) {
      inspections = inspections.filter((i) => i.itemId === filters.itemId);
    }

    if (filters.supplierId) {
      inspections = inspections.filter((i) => i.supplierId === filters.supplierId);
    }

    if (filters.dateFrom) {
      inspections = inspections.filter((i) => i.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      inspections = inspections.filter((i) => i.createdAt <= filters.dateTo!);
    }

    return inspections.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Checklist Operations
  async createChecklist(
    tenantId: string,
    dto: CreateChecklistDto,
  ): Promise<QualityChecklist> {
    const id = `chklist_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const checks: ChecklistItem[] = dto.checks.map((check, index) => ({
      id: `chkitem_${Date.now()}_${index}`,
      ...check,
      sequence: check.sequence || index + 1,
    }));

    const checklist: QualityChecklist = {
      id,
      tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      inspectionType: dto.inspectionType,
      itemCategory: dto.itemCategory,
      supplierCategory: dto.supplierCategory,
      checks,
      isActive: true,
      version: 1,
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.checklists.set(id, checklist);

    this.eventEmitter.emit('quality_checklist.created', {
      tenantId,
      checklistId: id,
      name: dto.name,
    });

    return checklist;
  }

  async getChecklist(tenantId: string, checklistId: string): Promise<QualityChecklist> {
    const checklist = this.checklists.get(checklistId);

    if (!checklist || checklist.tenantId !== tenantId) {
      throw new NotFoundException(`Checklist ${checklistId} not found`);
    }

    return checklist;
  }

  async listChecklists(
    tenantId: string,
    filters?: {
      inspectionType?: InspectionType;
      isActive?: boolean;
    },
  ): Promise<QualityChecklist[]> {
    let checklists = Array.from(this.checklists.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters?.inspectionType) {
      checklists = checklists.filter((c) => c.inspectionType === filters.inspectionType);
    }

    if (filters?.isActive !== undefined) {
      checklists = checklists.filter((c) => c.isActive === filters.isActive);
    }

    return checklists;
  }

  async updateChecklist(
    tenantId: string,
    checklistId: string,
    updates: Partial<CreateChecklistDto>,
  ): Promise<QualityChecklist> {
    const checklist = await this.getChecklist(tenantId, checklistId);

    if (updates.name) checklist.name = updates.name;
    if (updates.description !== undefined) checklist.description = updates.description;
    if (updates.inspectionType) checklist.inspectionType = updates.inspectionType;
    if (updates.itemCategory !== undefined) checklist.itemCategory = updates.itemCategory;
    if (updates.supplierCategory !== undefined) checklist.supplierCategory = updates.supplierCategory;
    if (updates.checks) {
      checklist.checks = updates.checks.map((check, index) => ({
        id: `chkitem_${Date.now()}_${index}`,
        ...check,
        sequence: check.sequence || index + 1,
      }));
      checklist.version++;
    }

    checklist.updatedAt = new Date();
    this.checklists.set(checklistId, checklist);

    return checklist;
  }

  async toggleChecklist(
    tenantId: string,
    checklistId: string,
    isActive: boolean,
  ): Promise<QualityChecklist> {
    const checklist = await this.getChecklist(tenantId, checklistId);

    checklist.isActive = isActive;
    checklist.updatedAt = new Date();

    this.checklists.set(checklistId, checklist);

    return checklist;
  }

  // Defect Code Operations
  async createDefectCode(
    tenantId: string,
    dto: CreateDefectCodeDto,
  ): Promise<DefectCode> {
    const id = `defcode_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const defectCode: DefectCode = {
      id,
      tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      severity: dto.severity,
      category: dto.category,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.defectCodes.set(id, defectCode);

    return defectCode;
  }

  async listDefectCodes(
    tenantId: string,
    filters?: {
      severity?: DefectSeverity;
      category?: string;
      isActive?: boolean;
    },
  ): Promise<DefectCode[]> {
    let codes = Array.from(this.defectCodes.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters?.severity) {
      codes = codes.filter((c) => c.severity === filters.severity);
    }

    if (filters?.category) {
      codes = codes.filter((c) => c.category === filters.category);
    }

    if (filters?.isActive !== undefined) {
      codes = codes.filter((c) => c.isActive === filters.isActive);
    }

    return codes;
  }

  // Analytics
  async getQualityMetrics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
    filters?: {
      supplierId?: string;
      itemId?: string;
    },
  ): Promise<{
    totalInspections: number;
    passRate: number;
    conditionalPassRate: number;
    failRate: number;
    byType: Record<InspectionType, { total: number; passRate: number }>;
    byResult: Record<InspectionResult, number>;
    totalDefects: number;
    defectsBySeverity: Record<DefectSeverity, number>;
    averageAcceptanceRate: number;
    topDefects: { code: string; name: string; count: number }[];
  }> {
    let inspections = Array.from(this.inspections.values()).filter(
      (i) =>
        i.tenantId === tenantId &&
        i.createdAt >= dateFrom &&
        i.createdAt <= dateTo &&
        (i.status === InspectionStatus.APPROVED || i.status === InspectionStatus.REJECTED),
    );

    if (filters?.supplierId) {
      inspections = inspections.filter((i) => i.supplierId === filters.supplierId);
    }

    if (filters?.itemId) {
      inspections = inspections.filter((i) => i.itemId === filters.itemId);
    }

    const totalInspections = inspections.length;
    const passCount = inspections.filter((i) => i.result === InspectionResult.PASS).length;
    const conditionalCount = inspections.filter((i) => i.result === InspectionResult.CONDITIONAL_PASS).length;
    const failCount = inspections.filter((i) => i.result === InspectionResult.FAIL).length;

    const byResult: Record<InspectionResult, number> = {
      [InspectionResult.PASS]: passCount,
      [InspectionResult.CONDITIONAL_PASS]: conditionalCount,
      [InspectionResult.FAIL]: failCount,
      [InspectionResult.PENDING]: 0,
    };

    const byType: Record<InspectionType, { total: number; passRate: number }> = {} as any;
    for (const type of Object.values(InspectionType)) {
      const typeInspections = inspections.filter((i) => i.type === type);
      const typePassCount = typeInspections.filter(
        (i) => i.result === InspectionResult.PASS || i.result === InspectionResult.CONDITIONAL_PASS,
      ).length;
      byType[type] = {
        total: typeInspections.length,
        passRate: typeInspections.length > 0 ? (typePassCount / typeInspections.length) * 100 : 0,
      };
    }

    const defectsBySeverity: Record<DefectSeverity, number> = {
      [DefectSeverity.CRITICAL]: 0,
      [DefectSeverity.MAJOR]: 0,
      [DefectSeverity.MINOR]: 0,
      [DefectSeverity.COSMETIC]: 0,
    };

    let totalDefects = 0;
    const defectCounts = new Map<string, { code: string; name: string; count: number }>();

    for (const inspection of inspections) {
      totalDefects += inspection.totalDefects;
      defectsBySeverity[DefectSeverity.CRITICAL] += inspection.criticalDefects;
      defectsBySeverity[DefectSeverity.MAJOR] += inspection.majorDefects;
      defectsBySeverity[DefectSeverity.MINOR] += inspection.minorDefects;

      for (const defect of inspection.defects) {
        const existing = defectCounts.get(defect.defectCode) || {
          code: defect.defectCode,
          name: defect.defectName,
          count: 0,
        };
        existing.count += defect.quantity;
        defectCounts.set(defect.defectCode, existing);
      }
    }

    const topDefects = Array.from(defectCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averageAcceptanceRate =
      totalInspections > 0
        ? inspections.reduce((sum, i) => sum + i.acceptanceRate, 0) / totalInspections
        : 0;

    return {
      totalInspections,
      passRate: totalInspections > 0 ? (passCount / totalInspections) * 100 : 0,
      conditionalPassRate: totalInspections > 0 ? (conditionalCount / totalInspections) * 100 : 0,
      failRate: totalInspections > 0 ? (failCount / totalInspections) * 100 : 0,
      byType,
      byResult,
      totalDefects,
      defectsBySeverity,
      averageAcceptanceRate,
      topDefects,
    };
  }

  // Helper Methods
  private async generateInspectionNumber(tenantId: string): Promise<string> {
    const counter = (this.inspectionCounter.get(tenantId) || 0) + 1;
    this.inspectionCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `QI-${year}-${counter.toString().padStart(6, '0')}`;
  }
}
