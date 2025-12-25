import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Non-Conformance Types
export enum NCRStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  UNDER_INVESTIGATION = 'under_investigation',
  PENDING_DISPOSITION = 'pending_disposition',
  DISPOSITION_APPROVED = 'disposition_approved',
  IN_PROGRESS = 'in_progress',
  PENDING_VERIFICATION = 'pending_verification',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum NCRType {
  PRODUCT = 'product',
  PROCESS = 'process',
  SERVICE = 'service',
  SUPPLIER = 'supplier',
  CUSTOMER_COMPLAINT = 'customer_complaint',
  INTERNAL_AUDIT = 'internal_audit',
  EXTERNAL_AUDIT = 'external_audit',
  REGULATORY = 'regulatory',
}

export enum NCRSeverity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  OBSERVATION = 'observation',
}

export enum NCRSource {
  INSPECTION = 'inspection',
  PRODUCTION = 'production',
  CUSTOMER = 'customer',
  AUDIT = 'audit',
  SUPPLIER = 'supplier',
  EMPLOYEE = 'employee',
  MANAGEMENT_REVIEW = 'management_review',
}

export enum DispositionType {
  USE_AS_IS = 'use_as_is',
  REWORK = 'rework',
  REPAIR = 'repair',
  SCRAP = 'scrap',
  RETURN_TO_SUPPLIER = 'return_to_supplier',
  DOWNGRADE = 'downgrade',
  CONCESSION = 'concession',
  SORT_AND_SEGREGATE = 'sort_and_segregate',
}

// Interfaces
export interface NonConformanceReport {
  id: string;
  tenantId: string;
  ncrNumber: string;
  status: NCRStatus;
  type: NCRType;
  severity: NCRSeverity;
  source: NCRSource;
  title: string;
  description: string;
  rootCause?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  quantity?: number;
  unitOfMeasure?: string;
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  inspectionId?: string;
  inspectionNumber?: string;
  processId?: string;
  processName?: string;
  locationId?: string;
  locationName?: string;
  departmentId?: string;
  departmentName?: string;
  detectedDate: Date;
  detectedBy: string;
  detectedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  disposition?: NCRDisposition;
  containmentActions: ContainmentAction[];
  attachmentIds?: string[];
  relatedNCRIds?: string[];
  capaId?: string;
  capaNumber?: string;
  cost?: number;
  currency?: string;
  dueDate?: Date;
  closedDate?: Date;
  closedBy?: string;
  closedByName?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: Date;
  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NCRDisposition {
  id: string;
  type: DispositionType;
  description: string;
  quantity: number;
  approvedBy: string;
  approvedByName: string;
  approvedAt: Date;
  implementedBy?: string;
  implementedByName?: string;
  implementedAt?: Date;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: Date;
  notes?: string;
}

export interface ContainmentAction {
  id: string;
  action: string;
  description?: string;
  assignedTo: string;
  assignedToName: string;
  dueDate?: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

// DTOs
export interface CreateNCRDto {
  type: NCRType;
  severity: NCRSeverity;
  source: NCRSource;
  title: string;
  description: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  quantity?: number;
  unitOfMeasure?: string;
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  inspectionId?: string;
  inspectionNumber?: string;
  processId?: string;
  processName?: string;
  locationId?: string;
  locationName?: string;
  departmentId?: string;
  departmentName?: string;
  detectedDate: Date;
  detectedBy: string;
  detectedByName: string;
  dueDate?: Date;
  tags?: string[];
  notes?: string;
}

export interface AddContainmentActionDto {
  action: string;
  description?: string;
  assignedTo: string;
  assignedToName: string;
  dueDate?: Date;
}

export interface SetDispositionDto {
  type: DispositionType;
  description: string;
  quantity: number;
  approvedBy: string;
  approvedByName: string;
  notes?: string;
}

export interface InvestigationDto {
  rootCause: string;
  findings?: string;
  investigatedBy: string;
  investigatedByName: string;
}

@Injectable()
export class NonConformanceService {
  private ncrs = new Map<string, NonConformanceReport>();
  private ncrCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // NCR Operations
  async createNCR(tenantId: string, dto: CreateNCRDto): Promise<NonConformanceReport> {
    const id = `ncr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ncrNumber = await this.generateNCRNumber(tenantId);

    const ncr: NonConformanceReport = {
      id,
      tenantId,
      ncrNumber,
      status: NCRStatus.DRAFT,
      type: dto.type,
      severity: dto.severity,
      source: dto.source,
      title: dto.title,
      description: dto.description,
      itemId: dto.itemId,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      lotNumber: dto.lotNumber,
      batchNumber: dto.batchNumber,
      serialNumbers: dto.serialNumbers,
      quantity: dto.quantity,
      unitOfMeasure: dto.unitOfMeasure,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      customerId: dto.customerId,
      customerName: dto.customerName,
      inspectionId: dto.inspectionId,
      inspectionNumber: dto.inspectionNumber,
      processId: dto.processId,
      processName: dto.processName,
      locationId: dto.locationId,
      locationName: dto.locationName,
      departmentId: dto.departmentId,
      departmentName: dto.departmentName,
      detectedDate: new Date(dto.detectedDate),
      detectedBy: dto.detectedBy,
      detectedByName: dto.detectedByName,
      containmentActions: [],
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      tags: dto.tags,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.ncrs.set(id, ncr);

    this.eventEmitter.emit('ncr.created', {
      tenantId,
      ncrId: id,
      type: dto.type,
      severity: dto.severity,
    });

    return ncr;
  }

  async openNCR(tenantId: string, ncrId: string): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status !== NCRStatus.DRAFT) {
      throw new BadRequestException('NCR is not in draft status');
    }

    ncr.status = NCRStatus.OPEN;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    this.eventEmitter.emit('ncr.opened', { tenantId, ncrId });

    return ncr;
  }

  async assignNCR(
    tenantId: string,
    ncrId: string,
    assignedTo: string,
    assignedToName: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    ncr.assignedTo = assignedTo;
    ncr.assignedToName = assignedToName;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    this.eventEmitter.emit('ncr.assigned', {
      tenantId,
      ncrId,
      assignedTo,
    });

    return ncr;
  }

  async addContainmentAction(
    tenantId: string,
    ncrId: string,
    dto: AddContainmentActionDto,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status === NCRStatus.CLOSED || ncr.status === NCRStatus.CANCELLED) {
      throw new BadRequestException('Cannot add actions to closed NCR');
    }

    const action: ContainmentAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      action: dto.action,
      description: dto.description,
      assignedTo: dto.assignedTo,
      assignedToName: dto.assignedToName,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: 'pending',
    };

    ncr.containmentActions.push(action);
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    return ncr;
  }

  async updateContainmentAction(
    tenantId: string,
    ncrId: string,
    actionId: string,
    status: ContainmentAction['status'],
    notes?: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    const action = ncr.containmentActions.find((a) => a.id === actionId);
    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    action.status = status;
    if (status === 'completed') {
      action.completedAt = new Date();
    }
    if (notes) {
      action.notes = notes;
    }

    ncr.updatedAt = new Date();
    this.ncrs.set(ncrId, ncr);

    return ncr;
  }

  async startInvestigation(tenantId: string, ncrId: string): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status !== NCRStatus.OPEN) {
      throw new BadRequestException('NCR must be open to start investigation');
    }

    ncr.status = NCRStatus.UNDER_INVESTIGATION;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    this.eventEmitter.emit('ncr.investigation_started', { tenantId, ncrId });

    return ncr;
  }

  async recordInvestigation(
    tenantId: string,
    ncrId: string,
    dto: InvestigationDto,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status !== NCRStatus.UNDER_INVESTIGATION) {
      throw new BadRequestException('NCR is not under investigation');
    }

    ncr.rootCause = dto.rootCause;
    ncr.metadata = {
      ...ncr.metadata,
      investigationFindings: dto.findings,
      investigatedBy: dto.investigatedBy,
      investigatedByName: dto.investigatedByName,
      investigatedAt: new Date(),
    };
    ncr.status = NCRStatus.PENDING_DISPOSITION;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    this.eventEmitter.emit('ncr.investigation_completed', {
      tenantId,
      ncrId,
      rootCause: dto.rootCause,
    });

    return ncr;
  }

  async setDisposition(
    tenantId: string,
    ncrId: string,
    dto: SetDispositionDto,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status !== NCRStatus.PENDING_DISPOSITION && ncr.status !== NCRStatus.UNDER_INVESTIGATION) {
      throw new BadRequestException('NCR is not ready for disposition');
    }

    const disposition: NCRDisposition = {
      id: `disp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: dto.type,
      description: dto.description,
      quantity: dto.quantity,
      approvedBy: dto.approvedBy,
      approvedByName: dto.approvedByName,
      approvedAt: new Date(),
      notes: dto.notes,
    };

    ncr.disposition = disposition;
    ncr.status = NCRStatus.DISPOSITION_APPROVED;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    this.eventEmitter.emit('ncr.disposition_set', {
      tenantId,
      ncrId,
      dispositionType: dto.type,
    });

    return ncr;
  }

  async implementDisposition(
    tenantId: string,
    ncrId: string,
    implementedBy: string,
    implementedByName: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status !== NCRStatus.DISPOSITION_APPROVED) {
      throw new BadRequestException('Disposition must be approved first');
    }

    if (!ncr.disposition) {
      throw new BadRequestException('No disposition set');
    }

    ncr.disposition.implementedBy = implementedBy;
    ncr.disposition.implementedByName = implementedByName;
    ncr.disposition.implementedAt = new Date();
    ncr.status = NCRStatus.IN_PROGRESS;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    return ncr;
  }

  async requestVerification(tenantId: string, ncrId: string): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status !== NCRStatus.IN_PROGRESS) {
      throw new BadRequestException('NCR must be in progress');
    }

    ncr.status = NCRStatus.PENDING_VERIFICATION;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    return ncr;
  }

  async verifyAndClose(
    tenantId: string,
    ncrId: string,
    verifierId: string,
    verifierName: string,
    notes?: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status !== NCRStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('NCR is not pending verification');
    }

    ncr.verifiedBy = verifierId;
    ncr.verifiedByName = verifierName;
    ncr.verifiedAt = new Date();

    if (ncr.disposition) {
      ncr.disposition.verifiedBy = verifierId;
      ncr.disposition.verifiedByName = verifierName;
      ncr.disposition.verifiedAt = new Date();
    }

    ncr.status = NCRStatus.CLOSED;
    ncr.closedDate = new Date();
    ncr.closedBy = verifierId;
    ncr.closedByName = verifierName;
    if (notes) {
      ncr.notes = `${ncr.notes || ''}\nClosure notes: ${notes}`.trim();
    }
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    this.eventEmitter.emit('ncr.closed', {
      tenantId,
      ncrId,
      dispositionType: ncr.disposition?.type,
    });

    return ncr;
  }

  async cancelNCR(
    tenantId: string,
    ncrId: string,
    reason: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    if (ncr.status === NCRStatus.CLOSED) {
      throw new BadRequestException('Cannot cancel closed NCR');
    }

    ncr.status = NCRStatus.CANCELLED;
    ncr.metadata = { ...ncr.metadata, cancellationReason: reason };
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    this.eventEmitter.emit('ncr.cancelled', { tenantId, ncrId, reason });

    return ncr;
  }

  async linkToCAPA(
    tenantId: string,
    ncrId: string,
    capaId: string,
    capaNumber: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    ncr.capaId = capaId;
    ncr.capaNumber = capaNumber;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    return ncr;
  }

  async setCost(
    tenantId: string,
    ncrId: string,
    cost: number,
    currency: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.getNCR(tenantId, ncrId);

    ncr.cost = cost;
    ncr.currency = currency;
    ncr.updatedAt = new Date();

    this.ncrs.set(ncrId, ncr);

    return ncr;
  }

  async getNCR(tenantId: string, ncrId: string): Promise<NonConformanceReport> {
    const ncr = this.ncrs.get(ncrId);

    if (!ncr || ncr.tenantId !== tenantId) {
      throw new NotFoundException(`NCR ${ncrId} not found`);
    }

    return ncr;
  }

  async listNCRs(
    tenantId: string,
    filters: {
      status?: NCRStatus;
      type?: NCRType;
      severity?: NCRSeverity;
      source?: NCRSource;
      supplierId?: string;
      customerId?: string;
      itemId?: string;
      assignedTo?: string;
      dateFrom?: Date;
      dateTo?: Date;
      hasCAPA?: boolean;
    },
  ): Promise<NonConformanceReport[]> {
    let ncrs = Array.from(this.ncrs.values()).filter(
      (n) => n.tenantId === tenantId,
    );

    if (filters.status) {
      ncrs = ncrs.filter((n) => n.status === filters.status);
    }

    if (filters.type) {
      ncrs = ncrs.filter((n) => n.type === filters.type);
    }

    if (filters.severity) {
      ncrs = ncrs.filter((n) => n.severity === filters.severity);
    }

    if (filters.source) {
      ncrs = ncrs.filter((n) => n.source === filters.source);
    }

    if (filters.supplierId) {
      ncrs = ncrs.filter((n) => n.supplierId === filters.supplierId);
    }

    if (filters.customerId) {
      ncrs = ncrs.filter((n) => n.customerId === filters.customerId);
    }

    if (filters.itemId) {
      ncrs = ncrs.filter((n) => n.itemId === filters.itemId);
    }

    if (filters.assignedTo) {
      ncrs = ncrs.filter((n) => n.assignedTo === filters.assignedTo);
    }

    if (filters.dateFrom) {
      ncrs = ncrs.filter((n) => n.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      ncrs = ncrs.filter((n) => n.createdAt <= filters.dateTo!);
    }

    if (filters.hasCAPA !== undefined) {
      ncrs = ncrs.filter((n) =>
        filters.hasCAPA ? n.capaId != null : n.capaId == null,
      );
    }

    return ncrs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Analytics
  async getNCRMetrics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalNCRs: number;
    openNCRs: number;
    closedNCRs: number;
    averageResolutionTime: number;
    byType: Record<NCRType, number>;
    bySeverity: Record<NCRSeverity, number>;
    bySource: Record<NCRSource, number>;
    byDisposition: Record<DispositionType, number>;
    totalCost: number;
    topSuppliers: { supplierId: string; supplierName: string; count: number }[];
    topItems: { itemId: string; itemCode: string; count: number }[];
  }> {
    const ncrs = Array.from(this.ncrs.values()).filter(
      (n) =>
        n.tenantId === tenantId &&
        n.createdAt >= dateFrom &&
        n.createdAt <= dateTo,
    );

    const openNCRs = ncrs.filter(
      (n) => n.status !== NCRStatus.CLOSED && n.status !== NCRStatus.CANCELLED,
    );

    const closedNCRs = ncrs.filter((n) => n.status === NCRStatus.CLOSED);

    // Calculate average resolution time
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    for (const ncr of closedNCRs) {
      if (ncr.closedDate) {
        totalResolutionTime += ncr.closedDate.getTime() - ncr.createdAt.getTime();
        resolvedCount++;
      }
    }

    const byType: Record<NCRType, number> = {} as any;
    const bySeverity: Record<NCRSeverity, number> = {} as any;
    const bySource: Record<NCRSource, number> = {} as any;
    const byDisposition: Record<DispositionType, number> = {} as any;

    for (const type of Object.values(NCRType)) {
      byType[type] = 0;
    }
    for (const severity of Object.values(NCRSeverity)) {
      bySeverity[severity] = 0;
    }
    for (const source of Object.values(NCRSource)) {
      bySource[source] = 0;
    }
    for (const disp of Object.values(DispositionType)) {
      byDisposition[disp] = 0;
    }

    let totalCost = 0;
    const supplierCounts = new Map<string, { name: string; count: number }>();
    const itemCounts = new Map<string, { code: string; count: number }>();

    for (const ncr of ncrs) {
      byType[ncr.type]++;
      bySeverity[ncr.severity]++;
      bySource[ncr.source]++;

      if (ncr.disposition) {
        byDisposition[ncr.disposition.type]++;
      }

      if (ncr.cost) {
        totalCost += ncr.cost;
      }

      if (ncr.supplierId) {
        const existing = supplierCounts.get(ncr.supplierId) || {
          name: ncr.supplierName || '',
          count: 0,
        };
        existing.count++;
        supplierCounts.set(ncr.supplierId, existing);
      }

      if (ncr.itemId) {
        const existing = itemCounts.get(ncr.itemId) || {
          code: ncr.itemCode || '',
          count: 0,
        };
        existing.count++;
        itemCounts.set(ncr.itemId, existing);
      }
    }

    const topSuppliers = Array.from(supplierCounts.entries())
      .map(([supplierId, data]) => ({
        supplierId,
        supplierName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topItems = Array.from(itemCounts.entries())
      .map(([itemId, data]) => ({
        itemId,
        itemCode: data.code,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalNCRs: ncrs.length,
      openNCRs: openNCRs.length,
      closedNCRs: closedNCRs.length,
      averageResolutionTime:
        resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      byType,
      bySeverity,
      bySource,
      byDisposition,
      totalCost,
      topSuppliers,
      topItems,
    };
  }

  // Helper Methods
  private async generateNCRNumber(tenantId: string): Promise<string> {
    const counter = (this.ncrCounter.get(tenantId) || 0) + 1;
    this.ncrCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `NCR-${year}-${counter.toString().padStart(6, '0')}`;
  }
}
