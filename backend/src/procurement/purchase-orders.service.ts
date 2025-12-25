import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Purchase Order Types
export enum POStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT_TO_SUPPLIER = 'sent_to_supplier',
  ACKNOWLEDGED = 'acknowledged',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  INVOICED = 'invoiced',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum POLineStatus {
  OPEN = 'open',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  CANCELLED = 'cancelled',
}

export enum PaymentTerms {
  IMMEDIATE = 'immediate',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_45 = 'net_45',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
  COD = 'cod',
  ADVANCE = 'advance',
  MILESTONE = 'milestone',
}

export enum DeliveryTerms {
  EXW = 'exw', // Ex Works
  FCA = 'fca', // Free Carrier
  CPT = 'cpt', // Carriage Paid To
  CIP = 'cip', // Carriage and Insurance Paid To
  DAP = 'dap', // Delivered at Place
  DPU = 'dpu', // Delivered at Place Unloaded
  DDP = 'ddp', // Delivered Duty Paid
}

// Interfaces
export interface POLineItem {
  id: string;
  lineNumber: number;
  itemId?: string;
  itemCode?: string;
  description: string;
  specifications?: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  lineTotal: number;
  taxRate: number;
  taxAmount: number;
  lineTotalWithTax: number;
  currency: string;
  requestedDeliveryDate?: Date;
  promisedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  receivedQuantity: number;
  remainingQuantity: number;
  status: POLineStatus;
  requisitionLineId?: string;
  quotationLineId?: string;
  costCenter?: string;
  projectCode?: string;
  glAccount?: string;
  notes?: string;
}

export interface POAmendment {
  id: string;
  amendmentNumber: number;
  timestamp: Date;
  userId: string;
  userName: string;
  changeType: 'quantity' | 'price' | 'delivery_date' | 'terms' | 'cancel_line' | 'add_line';
  lineId?: string;
  previousValue: any;
  newValue: any;
  reason: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  revision: number;
  title: string;
  description?: string;
  status: POStatus;
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  supplierTaxId?: string;
  buyerCompany: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  buyerContact?: string;
  buyerEmail?: string;
  lines: POLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  shippingCost: number;
  otherCharges: number;
  grandTotal: number;
  currency: string;
  paymentTerms: PaymentTerms;
  paymentDueDate?: Date;
  deliveryTerms: DeliveryTerms;
  deliveryAddress: string;
  deliveryInstructions?: string;
  requestedDeliveryDate?: Date;
  promisedDeliveryDate?: Date;
  requisitionId?: string;
  quotationId?: string;
  rfqId?: string;
  contractId?: string;
  budgetId?: string;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  sentToSupplierAt?: Date;
  acknowledgedAt?: Date;
  amendments: POAmendment[];
  attachmentIds?: string[];
  internalNotes?: string;
  supplierNotes?: string;
  termsAndConditions?: string;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreatePODto {
  title: string;
  description?: string;
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  supplierTaxId?: string;
  buyerCompany: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  buyerContact?: string;
  buyerEmail?: string;
  lines: CreatePOLineDto[];
  currency?: string;
  paymentTerms?: PaymentTerms;
  deliveryTerms?: DeliveryTerms;
  deliveryAddress: string;
  deliveryInstructions?: string;
  requestedDeliveryDate?: Date;
  requisitionId?: string;
  quotationId?: string;
  rfqId?: string;
  contractId?: string;
  budgetId?: string;
  shippingCost?: number;
  otherCharges?: number;
  approvalRequired?: boolean;
  internalNotes?: string;
  supplierNotes?: string;
  termsAndConditions?: string;
  attachmentIds?: string[];
  createdBy: string;
}

export interface CreatePOLineDto {
  itemId?: string;
  itemCode?: string;
  description: string;
  specifications?: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  taxRate?: number;
  requestedDeliveryDate?: Date;
  requisitionLineId?: string;
  quotationLineId?: string;
  costCenter?: string;
  projectCode?: string;
  glAccount?: string;
  notes?: string;
}

export interface UpdatePODto {
  title?: string;
  description?: string;
  supplierContact?: string;
  supplierEmail?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  requestedDeliveryDate?: Date;
  paymentTerms?: PaymentTerms;
  deliveryTerms?: DeliveryTerms;
  shippingCost?: number;
  otherCharges?: number;
  internalNotes?: string;
  supplierNotes?: string;
  termsAndConditions?: string;
}

export interface AmendPOLineDto {
  lineId: string;
  changeType: 'quantity' | 'price' | 'delivery_date' | 'cancel';
  newValue?: any;
  reason: string;
}

export interface POSearchParams {
  status?: POStatus;
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  requisitionId?: string;
  page?: number;
  limit?: number;
}

export interface POReceiptDto {
  lineId: string;
  receivedQuantity: number;
  receivedDate: Date;
  inspectionStatus?: 'pending' | 'passed' | 'failed';
  inspectionNotes?: string;
  goodsReceiptId?: string;
}

@Injectable()
export class PurchaseOrdersService {
  private purchaseOrders = new Map<string, PurchaseOrder>();
  private poCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // PO Management
  async createPurchaseOrder(
    tenantId: string,
    dto: CreatePODto,
  ): Promise<PurchaseOrder> {
    const id = `po_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const poNumber = await this.generatePONumber(tenantId);

    const lines: POLineItem[] = dto.lines.map((line, index) => {
      const lineTotal = this.calculateLineTotal(line);
      const taxRate = line.taxRate ?? 19; // Default Romanian VAT
      const taxAmount = lineTotal * (taxRate / 100);

      return {
        id: `po_line_${index}_${Date.now()}`,
        lineNumber: index + 1,
        itemId: line.itemId,
        itemCode: line.itemCode,
        description: line.description,
        specifications: line.specifications,
        quantity: line.quantity,
        unitOfMeasure: line.unitOfMeasure,
        unitPrice: line.unitPrice,
        discount: line.discount,
        discountType: line.discountType,
        lineTotal,
        taxRate,
        taxAmount,
        lineTotalWithTax: lineTotal + taxAmount,
        currency: dto.currency || 'RON',
        requestedDeliveryDate: line.requestedDeliveryDate
          ? new Date(line.requestedDeliveryDate)
          : undefined,
        receivedQuantity: 0,
        remainingQuantity: line.quantity,
        status: POLineStatus.OPEN,
        requisitionLineId: line.requisitionLineId,
        quotationLineId: line.quotationLineId,
        costCenter: line.costCenter,
        projectCode: line.projectCode,
        glAccount: line.glAccount,
        notes: line.notes,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalDiscount = this.calculateTotalDiscount(dto.lines);
    const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const shippingCost = dto.shippingCost || 0;
    const otherCharges = dto.otherCharges || 0;
    const grandTotal = subtotal + totalTax + shippingCost + otherCharges;

    const purchaseOrder: PurchaseOrder = {
      id,
      tenantId,
      poNumber,
      revision: 0,
      title: dto.title,
      description: dto.description,
      status: POStatus.DRAFT,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      supplierContact: dto.supplierContact,
      supplierEmail: dto.supplierEmail,
      supplierAddress: dto.supplierAddress,
      supplierTaxId: dto.supplierTaxId,
      buyerCompany: dto.buyerCompany,
      buyerAddress: dto.buyerAddress,
      buyerTaxId: dto.buyerTaxId,
      buyerContact: dto.buyerContact,
      buyerEmail: dto.buyerEmail,
      lines,
      subtotal,
      totalDiscount,
      totalTax,
      shippingCost,
      otherCharges,
      grandTotal,
      currency: dto.currency || 'RON',
      paymentTerms: dto.paymentTerms || PaymentTerms.NET_30,
      deliveryTerms: dto.deliveryTerms || DeliveryTerms.DAP,
      deliveryAddress: dto.deliveryAddress,
      deliveryInstructions: dto.deliveryInstructions,
      requestedDeliveryDate: dto.requestedDeliveryDate
        ? new Date(dto.requestedDeliveryDate)
        : undefined,
      requisitionId: dto.requisitionId,
      quotationId: dto.quotationId,
      rfqId: dto.rfqId,
      contractId: dto.contractId,
      budgetId: dto.budgetId,
      approvalRequired: dto.approvalRequired ?? true,
      amendments: [],
      attachmentIds: dto.attachmentIds || [],
      internalNotes: dto.internalNotes,
      supplierNotes: dto.supplierNotes,
      termsAndConditions: dto.termsAndConditions,
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.purchaseOrders.set(id, purchaseOrder);

    this.eventEmitter.emit('purchase_order.created', {
      tenantId,
      poId: id,
      poNumber,
      supplierId: dto.supplierId,
      grandTotal,
    });

    return purchaseOrder;
  }

  async getPurchaseOrder(
    tenantId: string,
    poId: string,
  ): Promise<PurchaseOrder> {
    const po = this.purchaseOrders.get(poId);

    if (!po || po.tenantId !== tenantId) {
      throw new NotFoundException(`Purchase order ${poId} not found`);
    }

    return po;
  }

  async searchPurchaseOrders(
    tenantId: string,
    params: POSearchParams,
  ): Promise<{ data: PurchaseOrder[]; total: number; page: number; limit: number }> {
    let orders = Array.from(this.purchaseOrders.values()).filter(
      (po) => po.tenantId === tenantId,
    );

    if (params.status) {
      orders = orders.filter((po) => po.status === params.status);
    }

    if (params.supplierId) {
      orders = orders.filter((po) => po.supplierId === params.supplierId);
    }

    if (params.dateFrom) {
      orders = orders.filter((po) => po.createdAt >= params.dateFrom!);
    }

    if (params.dateTo) {
      orders = orders.filter((po) => po.createdAt <= params.dateTo!);
    }

    if (params.minAmount !== undefined) {
      orders = orders.filter((po) => po.grandTotal >= params.minAmount!);
    }

    if (params.maxAmount !== undefined) {
      orders = orders.filter((po) => po.grandTotal <= params.maxAmount!);
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      orders = orders.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(searchLower) ||
          po.title.toLowerCase().includes(searchLower) ||
          po.supplierName.toLowerCase().includes(searchLower),
      );
    }

    if (params.requisitionId) {
      orders = orders.filter((po) => po.requisitionId === params.requisitionId);
    }

    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = orders.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;

    return {
      data: orders.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
    };
  }

  async updatePurchaseOrder(
    tenantId: string,
    poId: string,
    dto: UpdatePODto,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Only draft POs can be updated directly');
    }

    Object.assign(po, {
      ...dto,
      shippingCost: dto.shippingCost ?? po.shippingCost,
      otherCharges: dto.otherCharges ?? po.otherCharges,
      updatedAt: new Date(),
    });

    // Recalculate grand total if shipping/charges changed
    po.grandTotal =
      po.subtotal + po.totalTax + po.shippingCost + po.otherCharges;

    this.purchaseOrders.set(poId, po);

    return po;
  }

  async addLineItem(
    tenantId: string,
    poId: string,
    lineDto: CreatePOLineDto,
    userId: string,
    userName: string,
    reason: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status === POStatus.CLOSED || po.status === POStatus.CANCELLED) {
      throw new BadRequestException('Cannot add lines to closed/cancelled PO');
    }

    const lineTotal = this.calculateLineTotal(lineDto);
    const taxRate = lineDto.taxRate ?? 19;
    const taxAmount = lineTotal * (taxRate / 100);

    const newLine: POLineItem = {
      id: `po_line_${po.lines.length}_${Date.now()}`,
      lineNumber: po.lines.length + 1,
      itemId: lineDto.itemId,
      itemCode: lineDto.itemCode,
      description: lineDto.description,
      specifications: lineDto.specifications,
      quantity: lineDto.quantity,
      unitOfMeasure: lineDto.unitOfMeasure,
      unitPrice: lineDto.unitPrice,
      discount: lineDto.discount,
      discountType: lineDto.discountType,
      lineTotal,
      taxRate,
      taxAmount,
      lineTotalWithTax: lineTotal + taxAmount,
      currency: po.currency,
      requestedDeliveryDate: lineDto.requestedDeliveryDate
        ? new Date(lineDto.requestedDeliveryDate)
        : undefined,
      receivedQuantity: 0,
      remainingQuantity: lineDto.quantity,
      status: POLineStatus.OPEN,
      requisitionLineId: lineDto.requisitionLineId,
      quotationLineId: lineDto.quotationLineId,
      costCenter: lineDto.costCenter,
      projectCode: lineDto.projectCode,
      glAccount: lineDto.glAccount,
      notes: lineDto.notes,
    };

    po.lines.push(newLine);

    // Record amendment
    const amendment: POAmendment = {
      id: `amend_${Date.now()}`,
      amendmentNumber: po.amendments.length + 1,
      timestamp: new Date(),
      userId,
      userName,
      changeType: 'add_line',
      lineId: newLine.id,
      previousValue: null,
      newValue: newLine,
      reason,
      approved: po.status === POStatus.DRAFT,
    };

    po.amendments.push(amendment);
    po.revision++;

    // Recalculate totals
    this.recalculateTotals(po);

    po.updatedAt = new Date();
    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.amended', {
      tenantId,
      poId,
      amendmentType: 'add_line',
      newTotal: po.grandTotal,
    });

    return po;
  }

  async amendLine(
    tenantId: string,
    poId: string,
    dto: AmendPOLineDto,
    userId: string,
    userName: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status === POStatus.CLOSED || po.status === POStatus.CANCELLED) {
      throw new BadRequestException('Cannot amend closed/cancelled PO');
    }

    const line = po.lines.find((l) => l.id === dto.lineId);
    if (!line) {
      throw new NotFoundException(`Line ${dto.lineId} not found`);
    }

    let previousValue: any;
    let newValue: any = dto.newValue;

    switch (dto.changeType) {
      case 'quantity':
        previousValue = line.quantity;
        if (dto.newValue < line.receivedQuantity) {
          throw new BadRequestException(
            'New quantity cannot be less than received quantity',
          );
        }
        line.quantity = dto.newValue;
        line.remainingQuantity = dto.newValue - line.receivedQuantity;
        line.lineTotal = this.calculateLineTotal({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          discountType: line.discountType,
        });
        line.taxAmount = line.lineTotal * (line.taxRate / 100);
        line.lineTotalWithTax = line.lineTotal + line.taxAmount;
        break;

      case 'price':
        previousValue = line.unitPrice;
        line.unitPrice = dto.newValue;
        line.lineTotal = this.calculateLineTotal({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          discountType: line.discountType,
        });
        line.taxAmount = line.lineTotal * (line.taxRate / 100);
        line.lineTotalWithTax = line.lineTotal + line.taxAmount;
        break;

      case 'delivery_date':
        previousValue = line.promisedDeliveryDate;
        line.promisedDeliveryDate = new Date(dto.newValue);
        break;

      case 'cancel':
        if (line.receivedQuantity > 0) {
          throw new BadRequestException(
            'Cannot cancel line with received quantity',
          );
        }
        previousValue = line.status;
        newValue = POLineStatus.CANCELLED;
        line.status = POLineStatus.CANCELLED;
        line.remainingQuantity = 0;
        break;
    }

    // Record amendment
    const amendment: POAmendment = {
      id: `amend_${Date.now()}`,
      amendmentNumber: po.amendments.length + 1,
      timestamp: new Date(),
      userId,
      userName,
      changeType: dto.changeType === 'cancel' ? 'cancel_line' : dto.changeType,
      lineId: dto.lineId,
      previousValue,
      newValue,
      reason: dto.reason,
      approved: po.status === POStatus.DRAFT,
    };

    po.amendments.push(amendment);
    po.revision++;

    // Recalculate totals
    this.recalculateTotals(po);

    po.updatedAt = new Date();
    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.amended', {
      tenantId,
      poId,
      amendmentType: dto.changeType,
      lineId: dto.lineId,
    });

    return po;
  }

  // Status Transitions
  async submitForApproval(
    tenantId: string,
    poId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Only draft POs can be submitted');
    }

    if (po.lines.length === 0) {
      throw new BadRequestException('PO must have at least one line item');
    }

    if (!po.approvalRequired) {
      po.status = POStatus.APPROVED;
      po.approvedAt = new Date();
    } else {
      po.status = POStatus.PENDING_APPROVAL;
    }

    po.updatedAt = new Date();
    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.submitted', {
      tenantId,
      poId,
      requiresApproval: po.approvalRequired,
      grandTotal: po.grandTotal,
    });

    return po;
  }

  async approvePurchaseOrder(
    tenantId: string,
    poId: string,
    approverId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status !== POStatus.PENDING_APPROVAL) {
      throw new BadRequestException('PO is not pending approval');
    }

    po.status = POStatus.APPROVED;
    po.approvedBy = approverId;
    po.approvedAt = new Date();
    po.updatedAt = new Date();

    // Approve any pending amendments
    for (const amendment of po.amendments) {
      if (!amendment.approved) {
        amendment.approved = true;
        amendment.approvedBy = approverId;
        amendment.approvedAt = new Date();
      }
    }

    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.approved', {
      tenantId,
      poId,
      approverId,
      grandTotal: po.grandTotal,
    });

    return po;
  }

  async rejectPurchaseOrder(
    tenantId: string,
    poId: string,
    rejecterId: string,
    reason: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status !== POStatus.PENDING_APPROVAL) {
      throw new BadRequestException('PO is not pending approval');
    }

    po.status = POStatus.DRAFT;
    po.metadata = {
      ...po.metadata,
      rejectionReason: reason,
      rejectedBy: rejecterId,
      rejectedAt: new Date(),
    };
    po.updatedAt = new Date();

    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.rejected', {
      tenantId,
      poId,
      rejecterId,
      reason,
    });

    return po;
  }

  async sendToSupplier(
    tenantId: string,
    poId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status !== POStatus.APPROVED) {
      throw new BadRequestException('PO must be approved before sending');
    }

    po.status = POStatus.SENT_TO_SUPPLIER;
    po.sentToSupplierAt = new Date();
    po.updatedAt = new Date();

    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.sent', {
      tenantId,
      poId,
      supplierId: po.supplierId,
      supplierEmail: po.supplierEmail,
    });

    return po;
  }

  async acknowledgeBySupplier(
    tenantId: string,
    poId: string,
    promisedDeliveryDate?: Date,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status !== POStatus.SENT_TO_SUPPLIER) {
      throw new BadRequestException('PO has not been sent to supplier');
    }

    po.status = POStatus.ACKNOWLEDGED;
    po.acknowledgedAt = new Date();
    if (promisedDeliveryDate) {
      po.promisedDeliveryDate = promisedDeliveryDate;
    }
    po.updatedAt = new Date();

    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.acknowledged', {
      tenantId,
      poId,
      supplierId: po.supplierId,
      promisedDeliveryDate,
    });

    return po;
  }

  // Receipt Processing
  async recordReceipt(
    tenantId: string,
    poId: string,
    receipts: POReceiptDto[],
    userId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    const validStatuses = [
      POStatus.ACKNOWLEDGED,
      POStatus.PARTIALLY_RECEIVED,
      POStatus.SENT_TO_SUPPLIER,
    ];

    if (!validStatuses.includes(po.status)) {
      throw new BadRequestException('PO is not in a receivable status');
    }

    for (const receipt of receipts) {
      const line = po.lines.find((l) => l.id === receipt.lineId);
      if (!line) {
        throw new NotFoundException(`Line ${receipt.lineId} not found`);
      }

      if (line.status === POLineStatus.CANCELLED) {
        throw new BadRequestException(`Line ${receipt.lineId} is cancelled`);
      }

      if (receipt.receivedQuantity > line.remainingQuantity) {
        throw new BadRequestException(
          `Received quantity exceeds remaining quantity for line ${receipt.lineId}`,
        );
      }

      line.receivedQuantity += receipt.receivedQuantity;
      line.remainingQuantity -= receipt.receivedQuantity;
      line.actualDeliveryDate = receipt.receivedDate;

      if (line.remainingQuantity === 0) {
        line.status = POLineStatus.FULLY_RECEIVED;
      } else if (line.receivedQuantity > 0) {
        line.status = POLineStatus.PARTIALLY_RECEIVED;
      }
    }

    // Update PO status based on lines
    const activeLines = po.lines.filter(
      (l) => l.status !== POLineStatus.CANCELLED,
    );
    const fullyReceived = activeLines.every(
      (l) => l.status === POLineStatus.FULLY_RECEIVED,
    );
    const partiallyReceived = activeLines.some(
      (l) =>
        l.status === POLineStatus.PARTIALLY_RECEIVED ||
        l.status === POLineStatus.FULLY_RECEIVED,
    );

    if (fullyReceived) {
      po.status = POStatus.FULLY_RECEIVED;
    } else if (partiallyReceived) {
      po.status = POStatus.PARTIALLY_RECEIVED;
    }

    po.updatedAt = new Date();
    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.receipt_recorded', {
      tenantId,
      poId,
      receipts,
      userId,
      poStatus: po.status,
    });

    return po;
  }

  // Invoice & Close
  async markAsInvoiced(
    tenantId: string,
    poId: string,
    invoiceId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    if (po.status !== POStatus.FULLY_RECEIVED) {
      throw new BadRequestException(
        'PO must be fully received before invoicing',
      );
    }

    po.status = POStatus.INVOICED;
    po.metadata = { ...po.metadata, invoiceId };
    po.updatedAt = new Date();

    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.invoiced', {
      tenantId,
      poId,
      invoiceId,
    });

    return po;
  }

  async closePurchaseOrder(
    tenantId: string,
    poId: string,
    userId: string,
    reason?: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    const closableStatuses = [
      POStatus.INVOICED,
      POStatus.FULLY_RECEIVED,
      POStatus.PARTIALLY_RECEIVED,
    ];

    if (!closableStatuses.includes(po.status)) {
      throw new BadRequestException('PO cannot be closed in current status');
    }

    po.status = POStatus.CLOSED;
    po.metadata = {
      ...po.metadata,
      closedBy: userId,
      closedAt: new Date(),
      closeReason: reason,
    };
    po.updatedAt = new Date();

    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.closed', {
      tenantId,
      poId,
      userId,
    });

    return po;
  }

  async cancelPurchaseOrder(
    tenantId: string,
    poId: string,
    userId: string,
    reason: string,
  ): Promise<PurchaseOrder> {
    const po = await this.getPurchaseOrder(tenantId, poId);

    const nonCancellableStatuses = [
      POStatus.FULLY_RECEIVED,
      POStatus.INVOICED,
      POStatus.CLOSED,
      POStatus.CANCELLED,
    ];

    if (nonCancellableStatuses.includes(po.status)) {
      throw new BadRequestException('PO cannot be cancelled in current status');
    }

    // Check if any items received
    const hasReceipts = po.lines.some((l) => l.receivedQuantity > 0);
    if (hasReceipts) {
      throw new BadRequestException(
        'Cannot cancel PO with received items. Close instead.',
      );
    }

    po.status = POStatus.CANCELLED;
    po.metadata = {
      ...po.metadata,
      cancelledBy: userId,
      cancelledAt: new Date(),
      cancellationReason: reason,
    };
    po.updatedAt = new Date();

    // Cancel all lines
    for (const line of po.lines) {
      line.status = POLineStatus.CANCELLED;
      line.remainingQuantity = 0;
    }

    this.purchaseOrders.set(poId, po);

    this.eventEmitter.emit('purchase_order.cancelled', {
      tenantId,
      poId,
      userId,
      reason,
    });

    return po;
  }

  // Helper Methods
  private async generatePONumber(tenantId: string): Promise<string> {
    const counter = (this.poCounter.get(tenantId) || 0) + 1;
    this.poCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `PO-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private calculateLineTotal(line: {
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 'percentage' | 'amount';
  }): number {
    let total = line.quantity * line.unitPrice;

    if (line.discount) {
      if (line.discountType === 'percentage') {
        total = total * (1 - line.discount / 100);
      } else {
        total = total - line.discount;
      }
    }

    return Math.max(0, total);
  }

  private calculateTotalDiscount(lines: CreatePOLineDto[]): number {
    let totalDiscount = 0;

    for (const line of lines) {
      if (line.discount) {
        const lineGross = line.quantity * line.unitPrice;
        if (line.discountType === 'percentage') {
          totalDiscount += lineGross * (line.discount / 100);
        } else {
          totalDiscount += line.discount;
        }
      }
    }

    return totalDiscount;
  }

  private recalculateTotals(po: PurchaseOrder): void {
    const activeLines = po.lines.filter(
      (l) => l.status !== POLineStatus.CANCELLED,
    );

    po.subtotal = activeLines.reduce((sum, line) => sum + line.lineTotal, 0);
    po.totalTax = activeLines.reduce((sum, line) => sum + line.taxAmount, 0);
    po.grandTotal =
      po.subtotal + po.totalTax + po.shippingCost + po.otherCharges;
  }

  // Analytics
  async getPOAnalytics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalPOs: number;
    totalValue: number;
    averageValue: number;
    byStatus: Record<POStatus, number>;
    bySupplier: { supplierId: string; supplierName: string; count: number; value: number }[];
    averageLeadTime: number;
    onTimeDeliveryRate: number;
  }> {
    const orders = Array.from(this.purchaseOrders.values()).filter(
      (po) =>
        po.tenantId === tenantId &&
        po.createdAt >= dateFrom &&
        po.createdAt <= dateTo,
    );

    const byStatus: Record<POStatus, number> = {
      [POStatus.DRAFT]: 0,
      [POStatus.PENDING_APPROVAL]: 0,
      [POStatus.APPROVED]: 0,
      [POStatus.SENT_TO_SUPPLIER]: 0,
      [POStatus.ACKNOWLEDGED]: 0,
      [POStatus.PARTIALLY_RECEIVED]: 0,
      [POStatus.FULLY_RECEIVED]: 0,
      [POStatus.INVOICED]: 0,
      [POStatus.CLOSED]: 0,
      [POStatus.CANCELLED]: 0,
    };

    const supplierMap = new Map<
      string,
      { supplierId: string; supplierName: string; count: number; value: number }
    >();

    let totalValue = 0;
    let totalLeadTime = 0;
    let leadTimeCount = 0;
    let onTimeCount = 0;
    let deliveredCount = 0;

    for (const po of orders) {
      byStatus[po.status]++;
      totalValue += po.grandTotal;

      const supplierData = supplierMap.get(po.supplierId) || {
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        count: 0,
        value: 0,
      };
      supplierData.count++;
      supplierData.value += po.grandTotal;
      supplierMap.set(po.supplierId, supplierData);

      // Calculate lead time for received orders
      if (
        po.status === POStatus.FULLY_RECEIVED ||
        po.status === POStatus.INVOICED ||
        po.status === POStatus.CLOSED
      ) {
        deliveredCount++;

        const receivedLines = po.lines.filter(
          (l) => l.actualDeliveryDate && l.requestedDeliveryDate,
        );

        for (const line of receivedLines) {
          const leadTime = Math.floor(
            (line.actualDeliveryDate!.getTime() - po.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          totalLeadTime += leadTime;
          leadTimeCount++;

          if (line.actualDeliveryDate! <= line.requestedDeliveryDate!) {
            onTimeCount++;
          }
        }
      }
    }

    return {
      totalPOs: orders.length,
      totalValue,
      averageValue: orders.length > 0 ? totalValue / orders.length : 0,
      byStatus,
      bySupplier: Array.from(supplierMap.values()).sort(
        (a, b) => b.value - a.value,
      ),
      averageLeadTime: leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0,
      onTimeDeliveryRate:
        deliveredCount > 0 ? (onTimeCount / deliveredCount) * 100 : 0,
    };
  }

  // Get POs by Supplier
  async getPurchaseOrdersBySupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values())
      .filter((po) => po.tenantId === tenantId && po.supplierId === supplierId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Duplicate/Copy PO
  async duplicatePurchaseOrder(
    tenantId: string,
    poId: string,
    createdBy: string,
  ): Promise<PurchaseOrder> {
    const original = await this.getPurchaseOrder(tenantId, poId);

    const dto: CreatePODto = {
      title: `Copy of ${original.title}`,
      description: original.description,
      supplierId: original.supplierId,
      supplierName: original.supplierName,
      supplierContact: original.supplierContact,
      supplierEmail: original.supplierEmail,
      supplierAddress: original.supplierAddress,
      supplierTaxId: original.supplierTaxId,
      buyerCompany: original.buyerCompany,
      buyerAddress: original.buyerAddress,
      buyerTaxId: original.buyerTaxId,
      buyerContact: original.buyerContact,
      buyerEmail: original.buyerEmail,
      lines: original.lines.map((line) => ({
        itemId: line.itemId,
        itemCode: line.itemCode,
        description: line.description,
        specifications: line.specifications,
        quantity: line.quantity,
        unitOfMeasure: line.unitOfMeasure,
        unitPrice: line.unitPrice,
        discount: line.discount,
        discountType: line.discountType,
        taxRate: line.taxRate,
        costCenter: line.costCenter,
        projectCode: line.projectCode,
        glAccount: line.glAccount,
        notes: line.notes,
      })),
      currency: original.currency,
      paymentTerms: original.paymentTerms,
      deliveryTerms: original.deliveryTerms,
      deliveryAddress: original.deliveryAddress,
      deliveryInstructions: original.deliveryInstructions,
      shippingCost: original.shippingCost,
      otherCharges: original.otherCharges,
      approvalRequired: original.approvalRequired,
      internalNotes: original.internalNotes,
      termsAndConditions: original.termsAndConditions,
      createdBy,
    };

    return this.createPurchaseOrder(tenantId, dto);
  }
}
