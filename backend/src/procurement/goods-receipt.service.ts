import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Goods Receipt Types
export enum GRStatus {
  DRAFT = 'draft',
  PENDING_INSPECTION = 'pending_inspection',
  INSPECTION_IN_PROGRESS = 'inspection_in_progress',
  INSPECTION_COMPLETED = 'inspection_completed',
  ACCEPTED = 'accepted',
  PARTIALLY_ACCEPTED = 'partially_accepted',
  REJECTED = 'rejected',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export enum InspectionResult {
  PENDING = 'pending',
  PASSED = 'passed',
  PASSED_WITH_DEVIATION = 'passed_with_deviation',
  FAILED = 'failed',
  WAIVED = 'waived',
}

export enum QualityCheckType {
  VISUAL = 'visual',
  DIMENSIONAL = 'dimensional',
  FUNCTIONAL = 'functional',
  DOCUMENTATION = 'documentation',
  SAMPLE_TEST = 'sample_test',
  FULL_TEST = 'full_test',
}

export enum DispositionAction {
  ACCEPT_TO_STOCK = 'accept_to_stock',
  RETURN_TO_SUPPLIER = 'return_to_supplier',
  REWORK = 'rework',
  SCRAP = 'scrap',
  HOLD_FOR_REVIEW = 'hold_for_review',
  ACCEPT_WITH_CONCESSION = 'accept_with_concession',
}

// Interfaces
export interface GRLineItem {
  id: string;
  lineNumber: number;
  poLineId: string;
  poLineNumber: number;
  itemId?: string;
  itemCode?: string;
  description: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalValue: number;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  expiryDate?: Date;
  manufacturingDate?: Date;
  storageLocation?: string;
  binLocation?: string;
  inspectionRequired: boolean;
  inspectionResult?: InspectionResult;
  inspectionNotes?: string;
  qualityChecks?: QualityCheck[];
  disposition?: DispositionAction;
  dispositionNotes?: string;
  deviations?: Deviation[];
  damageNotes?: string;
  packagingCondition?: 'good' | 'damaged' | 'missing';
  photos?: string[];
  certificates?: string[];
}

export interface QualityCheck {
  id: string;
  checkType: QualityCheckType;
  checkName: string;
  specification?: string;
  tolerance?: string;
  measuredValue?: string;
  result: InspectionResult;
  notes?: string;
  inspectedBy?: string;
  inspectedAt?: Date;
  attachmentIds?: string[];
}

export interface Deviation {
  id: string;
  type: 'quantity' | 'quality' | 'documentation' | 'delivery' | 'packaging';
  description: string;
  severity: 'minor' | 'major' | 'critical';
  action: DispositionAction;
  notes?: string;
  reportedBy: string;
  reportedAt: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface GoodsReceipt {
  id: string;
  tenantId: string;
  grNumber: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  status: GRStatus;
  lines: GRLineItem[];
  totalReceivedQuantity: number;
  totalAcceptedQuantity: number;
  totalRejectedQuantity: number;
  totalValue: number;
  receivedDate: Date;
  deliveryNoteNumber?: string;
  carrierName?: string;
  vehicleNumber?: string;
  driverName?: string;
  receivingDock?: string;
  warehouseId?: string;
  warehouseName?: string;
  inspectorId?: string;
  inspectorName?: string;
  inspectionStartedAt?: Date;
  inspectionCompletedAt?: Date;
  overallInspectionResult?: InspectionResult;
  qualityCertificates?: string[];
  packingListReceived: boolean;
  deliveryNoteReceived: boolean;
  invoiceReceived: boolean;
  attachmentIds?: string[];
  notes?: string;
  internalNotes?: string;
  postedToInventory: boolean;
  postedAt?: Date;
  postedBy?: string;
  returnRequestId?: string;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreateGoodsReceiptDto {
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  lines: CreateGRLineDto[];
  receivedDate: Date;
  deliveryNoteNumber?: string;
  carrierName?: string;
  vehicleNumber?: string;
  driverName?: string;
  receivingDock?: string;
  warehouseId?: string;
  warehouseName?: string;
  packingListReceived?: boolean;
  deliveryNoteReceived?: boolean;
  invoiceReceived?: boolean;
  notes?: string;
  createdBy: string;
}

export interface CreateGRLineDto {
  poLineId: string;
  poLineNumber: number;
  itemId?: string;
  itemCode?: string;
  description: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  expiryDate?: Date;
  manufacturingDate?: Date;
  storageLocation?: string;
  binLocation?: string;
  inspectionRequired?: boolean;
  packagingCondition?: 'good' | 'damaged' | 'missing';
  damageNotes?: string;
  photos?: string[];
  certificates?: string[];
}

export interface InspectionDto {
  lineId: string;
  qualityChecks: CreateQualityCheckDto[];
  overallResult: InspectionResult;
  notes?: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  deviations?: CreateDeviationDto[];
}

export interface CreateQualityCheckDto {
  checkType: QualityCheckType;
  checkName: string;
  specification?: string;
  tolerance?: string;
  measuredValue?: string;
  result: InspectionResult;
  notes?: string;
  attachmentIds?: string[];
}

export interface CreateDeviationDto {
  type: 'quantity' | 'quality' | 'documentation' | 'delivery' | 'packaging';
  description: string;
  severity: 'minor' | 'major' | 'critical';
  action: DispositionAction;
  notes?: string;
}

export interface DispositionDto {
  lineId: string;
  disposition: DispositionAction;
  acceptedQuantity: number;
  rejectedQuantity: number;
  notes?: string;
  returnReason?: string;
}

export interface GRSearchParams {
  status?: GRStatus;
  supplierId?: string;
  purchaseOrderId?: string;
  warehouseId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  inspectionResult?: InspectionResult;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class GoodsReceiptService {
  private goodsReceipts = new Map<string, GoodsReceipt>();
  private grCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Goods Receipt Management
  async createGoodsReceipt(
    tenantId: string,
    dto: CreateGoodsReceiptDto,
  ): Promise<GoodsReceipt> {
    const id = `gr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const grNumber = await this.generateGRNumber(tenantId);

    const lines: GRLineItem[] = dto.lines.map((line, index) => ({
      id: `gr_line_${index}_${Date.now()}`,
      lineNumber: index + 1,
      poLineId: line.poLineId,
      poLineNumber: line.poLineNumber,
      itemId: line.itemId,
      itemCode: line.itemCode,
      description: line.description,
      orderedQuantity: line.orderedQuantity,
      receivedQuantity: line.receivedQuantity,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      unitOfMeasure: line.unitOfMeasure,
      unitPrice: line.unitPrice,
      totalValue: line.receivedQuantity * line.unitPrice,
      lotNumber: line.lotNumber,
      batchNumber: line.batchNumber,
      serialNumbers: line.serialNumbers,
      expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
      manufacturingDate: line.manufacturingDate
        ? new Date(line.manufacturingDate)
        : undefined,
      storageLocation: line.storageLocation,
      binLocation: line.binLocation,
      inspectionRequired: line.inspectionRequired ?? true,
      packagingCondition: line.packagingCondition,
      damageNotes: line.damageNotes,
      photos: line.photos,
      certificates: line.certificates,
      qualityChecks: [],
      deviations: [],
    }));

    const totalReceivedQuantity = lines.reduce(
      (sum, line) => sum + line.receivedQuantity,
      0,
    );
    const totalValue = lines.reduce((sum, line) => sum + line.totalValue, 0);

    const goodsReceipt: GoodsReceipt = {
      id,
      tenantId,
      grNumber,
      purchaseOrderId: dto.purchaseOrderId,
      purchaseOrderNumber: dto.purchaseOrderNumber,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      status: GRStatus.DRAFT,
      lines,
      totalReceivedQuantity,
      totalAcceptedQuantity: 0,
      totalRejectedQuantity: 0,
      totalValue,
      receivedDate: new Date(dto.receivedDate),
      deliveryNoteNumber: dto.deliveryNoteNumber,
      carrierName: dto.carrierName,
      vehicleNumber: dto.vehicleNumber,
      driverName: dto.driverName,
      receivingDock: dto.receivingDock,
      warehouseId: dto.warehouseId,
      warehouseName: dto.warehouseName,
      packingListReceived: dto.packingListReceived ?? false,
      deliveryNoteReceived: dto.deliveryNoteReceived ?? false,
      invoiceReceived: dto.invoiceReceived ?? false,
      notes: dto.notes,
      postedToInventory: false,
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.goodsReceipts.set(id, goodsReceipt);

    this.eventEmitter.emit('goods_receipt.created', {
      tenantId,
      grId: id,
      grNumber,
      poId: dto.purchaseOrderId,
      supplierId: dto.supplierId,
      totalValue,
    });

    return goodsReceipt;
  }

  async getGoodsReceipt(
    tenantId: string,
    grId: string,
  ): Promise<GoodsReceipt> {
    const gr = this.goodsReceipts.get(grId);

    if (!gr || gr.tenantId !== tenantId) {
      throw new NotFoundException(`Goods receipt ${grId} not found`);
    }

    return gr;
  }

  async searchGoodsReceipts(
    tenantId: string,
    params: GRSearchParams,
  ): Promise<{ data: GoodsReceipt[]; total: number; page: number; limit: number }> {
    let receipts = Array.from(this.goodsReceipts.values()).filter(
      (gr) => gr.tenantId === tenantId,
    );

    if (params.status) {
      receipts = receipts.filter((gr) => gr.status === params.status);
    }

    if (params.supplierId) {
      receipts = receipts.filter((gr) => gr.supplierId === params.supplierId);
    }

    if (params.purchaseOrderId) {
      receipts = receipts.filter(
        (gr) => gr.purchaseOrderId === params.purchaseOrderId,
      );
    }

    if (params.warehouseId) {
      receipts = receipts.filter((gr) => gr.warehouseId === params.warehouseId);
    }

    if (params.dateFrom) {
      receipts = receipts.filter((gr) => gr.receivedDate >= params.dateFrom!);
    }

    if (params.dateTo) {
      receipts = receipts.filter((gr) => gr.receivedDate <= params.dateTo!);
    }

    if (params.inspectionResult) {
      receipts = receipts.filter(
        (gr) => gr.overallInspectionResult === params.inspectionResult,
      );
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      receipts = receipts.filter(
        (gr) =>
          gr.grNumber.toLowerCase().includes(searchLower) ||
          gr.purchaseOrderNumber.toLowerCase().includes(searchLower) ||
          gr.supplierName.toLowerCase().includes(searchLower),
      );
    }

    receipts.sort((a, b) => b.receivedDate.getTime() - a.receivedDate.getTime());

    const total = receipts.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;

    return {
      data: receipts.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
    };
  }

  // Inspection Workflow
  async startInspection(
    tenantId: string,
    grId: string,
    inspectorId: string,
    inspectorName: string,
  ): Promise<GoodsReceipt> {
    const gr = await this.getGoodsReceipt(tenantId, grId);

    if (gr.status !== GRStatus.DRAFT && gr.status !== GRStatus.PENDING_INSPECTION) {
      throw new BadRequestException('Cannot start inspection in current status');
    }

    const hasInspectionRequired = gr.lines.some((l) => l.inspectionRequired);

    if (!hasInspectionRequired) {
      // Auto-accept if no inspection required
      gr.status = GRStatus.ACCEPTED;
      gr.lines.forEach((line) => {
        line.acceptedQuantity = line.receivedQuantity;
        line.inspectionResult = InspectionResult.WAIVED;
      });
      gr.totalAcceptedQuantity = gr.totalReceivedQuantity;
      gr.overallInspectionResult = InspectionResult.WAIVED;
    } else {
      gr.status = GRStatus.INSPECTION_IN_PROGRESS;
      gr.inspectorId = inspectorId;
      gr.inspectorName = inspectorName;
      gr.inspectionStartedAt = new Date();
    }

    gr.updatedAt = new Date();
    this.goodsReceipts.set(grId, gr);

    this.eventEmitter.emit('goods_receipt.inspection_started', {
      tenantId,
      grId,
      inspectorId,
    });

    return gr;
  }

  async recordInspection(
    tenantId: string,
    grId: string,
    inspections: InspectionDto[],
    inspectorId: string,
  ): Promise<GoodsReceipt> {
    const gr = await this.getGoodsReceipt(tenantId, grId);

    if (gr.status !== GRStatus.INSPECTION_IN_PROGRESS) {
      throw new BadRequestException('Inspection not in progress');
    }

    for (const inspection of inspections) {
      const line = gr.lines.find((l) => l.id === inspection.lineId);
      if (!line) {
        throw new NotFoundException(`Line ${inspection.lineId} not found`);
      }

      // Validate quantities
      if (
        inspection.acceptedQuantity + inspection.rejectedQuantity !==
        line.receivedQuantity
      ) {
        throw new BadRequestException(
          `Accepted + Rejected must equal received quantity for line ${line.lineNumber}`,
        );
      }

      // Add quality checks
      line.qualityChecks = inspection.qualityChecks.map((check, index) => ({
        id: `qc_${index}_${Date.now()}`,
        checkType: check.checkType,
        checkName: check.checkName,
        specification: check.specification,
        tolerance: check.tolerance,
        measuredValue: check.measuredValue,
        result: check.result,
        notes: check.notes,
        inspectedBy: inspectorId,
        inspectedAt: new Date(),
        attachmentIds: check.attachmentIds,
      }));

      // Add deviations
      if (inspection.deviations) {
        line.deviations = inspection.deviations.map((dev, index) => ({
          id: `dev_${index}_${Date.now()}`,
          type: dev.type,
          description: dev.description,
          severity: dev.severity,
          action: dev.action,
          notes: dev.notes,
          reportedBy: inspectorId,
          reportedAt: new Date(),
        }));
      }

      line.inspectionResult = inspection.overallResult;
      line.inspectionNotes = inspection.notes;
      line.acceptedQuantity = inspection.acceptedQuantity;
      line.rejectedQuantity = inspection.rejectedQuantity;
    }

    // Update totals
    gr.totalAcceptedQuantity = gr.lines.reduce(
      (sum, line) => sum + line.acceptedQuantity,
      0,
    );
    gr.totalRejectedQuantity = gr.lines.reduce(
      (sum, line) => sum + line.rejectedQuantity,
      0,
    );

    gr.updatedAt = new Date();
    this.goodsReceipts.set(grId, gr);

    return gr;
  }

  async completeInspection(
    tenantId: string,
    grId: string,
    inspectorId: string,
  ): Promise<GoodsReceipt> {
    const gr = await this.getGoodsReceipt(tenantId, grId);

    if (gr.status !== GRStatus.INSPECTION_IN_PROGRESS) {
      throw new BadRequestException('Inspection not in progress');
    }

    // Verify all lines with inspection required have been inspected
    const uninspectedLines = gr.lines.filter(
      (l) => l.inspectionRequired && !l.inspectionResult,
    );

    if (uninspectedLines.length > 0) {
      throw new BadRequestException(
        `Lines ${uninspectedLines.map((l) => l.lineNumber).join(', ')} have not been inspected`,
      );
    }

    gr.status = GRStatus.INSPECTION_COMPLETED;
    gr.inspectionCompletedAt = new Date();

    // Determine overall result
    const allPassed = gr.lines.every(
      (l) =>
        !l.inspectionRequired ||
        l.inspectionResult === InspectionResult.PASSED ||
        l.inspectionResult === InspectionResult.WAIVED,
    );

    const allFailed = gr.lines.every(
      (l) => l.inspectionResult === InspectionResult.FAILED,
    );

    const hasDeviation = gr.lines.some(
      (l) => l.inspectionResult === InspectionResult.PASSED_WITH_DEVIATION,
    );

    if (allPassed && !hasDeviation) {
      gr.overallInspectionResult = InspectionResult.PASSED;
    } else if (allFailed) {
      gr.overallInspectionResult = InspectionResult.FAILED;
    } else {
      gr.overallInspectionResult = InspectionResult.PASSED_WITH_DEVIATION;
    }

    gr.updatedAt = new Date();
    this.goodsReceipts.set(grId, gr);

    this.eventEmitter.emit('goods_receipt.inspection_completed', {
      tenantId,
      grId,
      inspectorId,
      result: gr.overallInspectionResult,
    });

    return gr;
  }

  // Disposition
  async setDisposition(
    tenantId: string,
    grId: string,
    dispositions: DispositionDto[],
    userId: string,
  ): Promise<GoodsReceipt> {
    const gr = await this.getGoodsReceipt(tenantId, grId);

    if (gr.status !== GRStatus.INSPECTION_COMPLETED) {
      throw new BadRequestException('Inspection must be completed first');
    }

    for (const disp of dispositions) {
      const line = gr.lines.find((l) => l.id === disp.lineId);
      if (!line) {
        throw new NotFoundException(`Line ${disp.lineId} not found`);
      }

      // Validate quantities
      if (
        disp.acceptedQuantity + disp.rejectedQuantity !==
        line.receivedQuantity
      ) {
        throw new BadRequestException(
          `Disposition quantities must equal received quantity`,
        );
      }

      line.disposition = disp.disposition;
      line.dispositionNotes = disp.notes;
      line.acceptedQuantity = disp.acceptedQuantity;
      line.rejectedQuantity = disp.rejectedQuantity;
    }

    // Update totals
    gr.totalAcceptedQuantity = gr.lines.reduce(
      (sum, line) => sum + line.acceptedQuantity,
      0,
    );
    gr.totalRejectedQuantity = gr.lines.reduce(
      (sum, line) => sum + line.rejectedQuantity,
      0,
    );

    // Determine status
    if (gr.totalRejectedQuantity === gr.totalReceivedQuantity) {
      gr.status = GRStatus.REJECTED;
    } else if (gr.totalRejectedQuantity > 0) {
      gr.status = GRStatus.PARTIALLY_ACCEPTED;
    } else {
      gr.status = GRStatus.ACCEPTED;
    }

    gr.updatedAt = new Date();
    this.goodsReceipts.set(grId, gr);

    this.eventEmitter.emit('goods_receipt.disposition_set', {
      tenantId,
      grId,
      status: gr.status,
      acceptedQuantity: gr.totalAcceptedQuantity,
      rejectedQuantity: gr.totalRejectedQuantity,
    });

    return gr;
  }

  // Post to Inventory
  async postToInventory(
    tenantId: string,
    grId: string,
    userId: string,
  ): Promise<GoodsReceipt> {
    const gr = await this.getGoodsReceipt(tenantId, grId);

    const postableStatuses = [
      GRStatus.ACCEPTED,
      GRStatus.PARTIALLY_ACCEPTED,
    ];

    if (!postableStatuses.includes(gr.status)) {
      throw new BadRequestException('Cannot post to inventory in current status');
    }

    if (gr.postedToInventory) {
      throw new BadRequestException('Already posted to inventory');
    }

    gr.status = GRStatus.POSTED;
    gr.postedToInventory = true;
    gr.postedAt = new Date();
    gr.postedBy = userId;
    gr.updatedAt = new Date();

    this.goodsReceipts.set(grId, gr);

    this.eventEmitter.emit('goods_receipt.posted_to_inventory', {
      tenantId,
      grId,
      poId: gr.purchaseOrderId,
      lines: gr.lines.map((l) => ({
        itemId: l.itemId,
        itemCode: l.itemCode,
        quantity: l.acceptedQuantity,
        location: l.storageLocation,
        bin: l.binLocation,
        lot: l.lotNumber,
        batch: l.batchNumber,
      })),
    });

    return gr;
  }

  // Cancel
  async cancelGoodsReceipt(
    tenantId: string,
    grId: string,
    userId: string,
    reason: string,
  ): Promise<GoodsReceipt> {
    const gr = await this.getGoodsReceipt(tenantId, grId);

    if (gr.postedToInventory) {
      throw new BadRequestException('Cannot cancel posted goods receipt');
    }

    const nonCancellableStatuses = [
      GRStatus.POSTED,
      GRStatus.CANCELLED,
    ];

    if (nonCancellableStatuses.includes(gr.status)) {
      throw new BadRequestException('Cannot cancel in current status');
    }

    gr.status = GRStatus.CANCELLED;
    gr.metadata = {
      ...gr.metadata,
      cancelledBy: userId,
      cancelledAt: new Date(),
      cancellationReason: reason,
    };
    gr.updatedAt = new Date();

    this.goodsReceipts.set(grId, gr);

    this.eventEmitter.emit('goods_receipt.cancelled', {
      tenantId,
      grId,
      userId,
      reason,
    });

    return gr;
  }

  // Create Return Request
  async createReturnRequest(
    tenantId: string,
    grId: string,
    lineIds: string[],
    reason: string,
    userId: string,
  ): Promise<{ returnRequestId: string; goodsReceipt: GoodsReceipt }> {
    const gr = await this.getGoodsReceipt(tenantId, grId);

    const linesToReturn = gr.lines.filter(
      (l) =>
        lineIds.includes(l.id) &&
        l.rejectedQuantity > 0 &&
        l.disposition === DispositionAction.RETURN_TO_SUPPLIER,
    );

    if (linesToReturn.length === 0) {
      throw new BadRequestException('No valid lines to return');
    }

    const returnRequestId = `rr_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    gr.returnRequestId = returnRequestId;
    gr.updatedAt = new Date();
    this.goodsReceipts.set(grId, gr);

    this.eventEmitter.emit('goods_receipt.return_requested', {
      tenantId,
      grId,
      returnRequestId,
      supplierId: gr.supplierId,
      lines: linesToReturn.map((l) => ({
        lineId: l.id,
        itemCode: l.itemCode,
        description: l.description,
        quantity: l.rejectedQuantity,
        reason,
      })),
    });

    return { returnRequestId, goodsReceipt: gr };
  }

  // Get by PO
  async getGoodsReceiptsByPO(
    tenantId: string,
    purchaseOrderId: string,
  ): Promise<GoodsReceipt[]> {
    return Array.from(this.goodsReceipts.values())
      .filter(
        (gr) =>
          gr.tenantId === tenantId && gr.purchaseOrderId === purchaseOrderId,
      )
      .sort((a, b) => b.receivedDate.getTime() - a.receivedDate.getTime());
  }

  // Analytics
  async getGRAnalytics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalReceipts: number;
    totalValue: number;
    totalQuantityReceived: number;
    totalQuantityAccepted: number;
    totalQuantityRejected: number;
    acceptanceRate: number;
    byStatus: Record<GRStatus, number>;
    byInspectionResult: Record<InspectionResult, number>;
    averageInspectionTime: number;
    topRejectionReasons: { reason: string; count: number }[];
  }> {
    const receipts = Array.from(this.goodsReceipts.values()).filter(
      (gr) =>
        gr.tenantId === tenantId &&
        gr.receivedDate >= dateFrom &&
        gr.receivedDate <= dateTo,
    );

    const byStatus: Record<GRStatus, number> = {
      [GRStatus.DRAFT]: 0,
      [GRStatus.PENDING_INSPECTION]: 0,
      [GRStatus.INSPECTION_IN_PROGRESS]: 0,
      [GRStatus.INSPECTION_COMPLETED]: 0,
      [GRStatus.ACCEPTED]: 0,
      [GRStatus.PARTIALLY_ACCEPTED]: 0,
      [GRStatus.REJECTED]: 0,
      [GRStatus.POSTED]: 0,
      [GRStatus.CANCELLED]: 0,
    };

    const byInspectionResult: Record<InspectionResult, number> = {
      [InspectionResult.PENDING]: 0,
      [InspectionResult.PASSED]: 0,
      [InspectionResult.PASSED_WITH_DEVIATION]: 0,
      [InspectionResult.FAILED]: 0,
      [InspectionResult.WAIVED]: 0,
    };

    let totalValue = 0;
    let totalQuantityReceived = 0;
    let totalQuantityAccepted = 0;
    let totalQuantityRejected = 0;
    let totalInspectionTime = 0;
    let inspectionCount = 0;
    const rejectionReasons = new Map<string, number>();

    for (const gr of receipts) {
      byStatus[gr.status]++;
      totalValue += gr.totalValue;
      totalQuantityReceived += gr.totalReceivedQuantity;
      totalQuantityAccepted += gr.totalAcceptedQuantity;
      totalQuantityRejected += gr.totalRejectedQuantity;

      if (gr.overallInspectionResult) {
        byInspectionResult[gr.overallInspectionResult]++;
      }

      if (gr.inspectionStartedAt && gr.inspectionCompletedAt) {
        totalInspectionTime +=
          gr.inspectionCompletedAt.getTime() - gr.inspectionStartedAt.getTime();
        inspectionCount++;
      }

      // Collect rejection reasons from deviations
      for (const line of gr.lines) {
        if (line.deviations) {
          for (const dev of line.deviations) {
            if (dev.severity === 'critical' || dev.severity === 'major') {
              const count = rejectionReasons.get(dev.description) || 0;
              rejectionReasons.set(dev.description, count + 1);
            }
          }
        }
      }
    }

    const topRejectionReasons = Array.from(rejectionReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalReceipts: receipts.length,
      totalValue,
      totalQuantityReceived,
      totalQuantityAccepted,
      totalQuantityRejected,
      acceptanceRate:
        totalQuantityReceived > 0
          ? (totalQuantityAccepted / totalQuantityReceived) * 100
          : 0,
      byStatus,
      byInspectionResult,
      averageInspectionTime:
        inspectionCount > 0
          ? totalInspectionTime / inspectionCount / (1000 * 60) // Convert to minutes
          : 0,
      topRejectionReasons,
    };
  }

  // Helper Methods
  private async generateGRNumber(tenantId: string): Promise<string> {
    const counter = (this.grCounter.get(tenantId) || 0) + 1;
    this.grCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `GR-${year}-${counter.toString().padStart(6, '0')}`;
  }
}
