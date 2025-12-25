import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Quotation Types
export enum QuotationStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  RECEIVED = 'received',
  UNDER_REVIEW = 'under_review',
  SHORTLISTED = 'shortlisted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn',
}

export enum RFQStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  AWARDED = 'awarded',
  CANCELLED = 'cancelled',
}

export enum ComparisonCriteria {
  PRICE = 'price',
  QUALITY = 'quality',
  DELIVERY_TIME = 'delivery_time',
  PAYMENT_TERMS = 'payment_terms',
  WARRANTY = 'warranty',
  SUPPLIER_RATING = 'supplier_rating',
  PAST_PERFORMANCE = 'past_performance',
}

// Interfaces
export interface RFQLineItem {
  id: string;
  itemId?: string;
  description: string;
  specifications?: string;
  quantity: number;
  unitOfMeasure: string;
  targetUnitPrice?: number;
  targetTotalPrice?: number;
  deliveryDate?: Date;
  attachmentIds?: string[];
}

export interface RequestForQuotation {
  id: string;
  tenantId: string;
  rfqNumber: string;
  title: string;
  description?: string;
  requisitionId?: string;
  status: RFQStatus;
  lineItems: RFQLineItem[];
  invitedSupplierIds: string[];
  respondedSupplierIds: string[];
  deadline: Date;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  paymentTerms?: string;
  specialInstructions?: string;
  evaluationCriteria: EvaluationCriterion[];
  attachmentIds?: string[];
  createdBy: string;
  publishedAt?: Date;
  closedAt?: Date;
  awardedAt?: Date;
  awardedSupplierId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationCriterion {
  criterion: ComparisonCriteria;
  weight: number; // Percentage weight (0-100)
  description?: string;
}

export interface QuotationLineItem {
  id: string;
  rfqLineId: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  leadTimeDays?: number;
  warranty?: string;
  specifications?: string;
  alternativeOffered?: boolean;
  alternativeDescription?: string;
  notes?: string;
}

export interface SupplierQuotation {
  id: string;
  tenantId: string;
  quotationNumber: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  supplierEmail?: string;
  status: QuotationStatus;
  lineItems: QuotationLineItem[];
  totalAmount: number;
  currency: string;
  validUntil: Date;
  deliveryTerms?: string;
  paymentTerms?: string;
  shippingCost?: number;
  taxAmount?: number;
  grandTotal: number;
  warranty?: string;
  qualityCertifications?: string[];
  attachmentIds?: string[];
  notes?: string;
  internalNotes?: string;
  scores?: QuotationScores;
  ranking?: number;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationScores {
  priceScore: number;
  qualityScore: number;
  deliveryScore: number;
  paymentTermsScore: number;
  warrantyScore: number;
  supplierRatingScore: number;
  totalWeightedScore: number;
}

export interface QuotationComparison {
  rfqId: string;
  rfqTitle: string;
  evaluationCriteria: EvaluationCriterion[];
  quotations: QuotationComparisonItem[];
  bestByPrice: string;
  bestByDelivery: string;
  bestOverall: string;
  recommendation?: ComparisonRecommendation;
  comparisonDate: Date;
}

export interface QuotationComparisonItem {
  quotationId: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  currency: string;
  averageLeadTime: number;
  scores: QuotationScores;
  ranking: number;
  lineItemComparison: LineItemComparison[];
}

export interface LineItemComparison {
  rfqLineId: string;
  description: string;
  quotedPrice: number;
  marketBenchmark?: number;
  varianceFromBenchmark?: number;
  leadTimeDays: number;
  notes?: string;
}

export interface ComparisonRecommendation {
  recommendedSupplierId: string;
  recommendedSupplierName: string;
  reasons: string[];
  risks: string[];
  savings?: number;
  savingsPercentage?: number;
}

// DTOs
export interface CreateRFQDto {
  title: string;
  description?: string;
  requisitionId?: string;
  lineItems: Omit<RFQLineItem, 'id'>[];
  invitedSupplierIds: string[];
  deadline: Date;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  paymentTerms?: string;
  specialInstructions?: string;
  evaluationCriteria?: EvaluationCriterion[];
  attachmentIds?: string[];
  createdBy: string;
}

export interface CreateQuotationDto {
  rfqId: string;
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  supplierEmail?: string;
  lineItems: Omit<QuotationLineItem, 'id' | 'totalPrice'>[];
  validUntil: Date;
  deliveryTerms?: string;
  paymentTerms?: string;
  shippingCost?: number;
  taxAmount?: number;
  warranty?: string;
  qualityCertifications?: string[];
  attachmentIds?: string[];
  notes?: string;
}

export interface UpdateQuotationDto {
  lineItems?: Omit<QuotationLineItem, 'id' | 'totalPrice'>[];
  validUntil?: Date;
  deliveryTerms?: string;
  paymentTerms?: string;
  shippingCost?: number;
  taxAmount?: number;
  warranty?: string;
  qualityCertifications?: string[];
  notes?: string;
  internalNotes?: string;
}

export interface ScoreQuotationDto {
  priceScore: number;
  qualityScore: number;
  deliveryScore: number;
  paymentTermsScore?: number;
  warrantyScore?: number;
  supplierRatingScore?: number;
}

@Injectable()
export class SupplierQuotationsService {
  private rfqs = new Map<string, RequestForQuotation>();
  private quotations = new Map<string, SupplierQuotation>();
  private rfqCounter = new Map<string, number>();
  private quotationCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // RFQ Management
  async createRFQ(tenantId: string, dto: CreateRFQDto): Promise<RequestForQuotation> {
    const id = `rfq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const rfqNumber = await this.generateRFQNumber(tenantId);

    const lineItems: RFQLineItem[] = dto.lineItems.map((item, index) => ({
      ...item,
      id: `rfq_line_${index}_${Date.now()}`,
      targetTotalPrice: item.targetUnitPrice
        ? item.targetUnitPrice * item.quantity
        : undefined,
    }));

    const defaultCriteria: EvaluationCriterion[] = [
      { criterion: ComparisonCriteria.PRICE, weight: 40 },
      { criterion: ComparisonCriteria.QUALITY, weight: 25 },
      { criterion: ComparisonCriteria.DELIVERY_TIME, weight: 20 },
      { criterion: ComparisonCriteria.PAYMENT_TERMS, weight: 10 },
      { criterion: ComparisonCriteria.WARRANTY, weight: 5 },
    ];

    const rfq: RequestForQuotation = {
      id,
      tenantId,
      rfqNumber,
      title: dto.title,
      description: dto.description,
      requisitionId: dto.requisitionId,
      status: RFQStatus.DRAFT,
      lineItems,
      invitedSupplierIds: dto.invitedSupplierIds,
      respondedSupplierIds: [],
      deadline: new Date(dto.deadline),
      deliveryAddress: dto.deliveryAddress,
      deliveryInstructions: dto.deliveryInstructions,
      paymentTerms: dto.paymentTerms,
      specialInstructions: dto.specialInstructions,
      evaluationCriteria: dto.evaluationCriteria || defaultCriteria,
      attachmentIds: dto.attachmentIds || [],
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rfqs.set(id, rfq);

    this.eventEmitter.emit('rfq.created', {
      tenantId,
      rfqId: id,
      rfqNumber,
      supplierCount: dto.invitedSupplierIds.length,
    });

    return rfq;
  }

  async getRFQ(tenantId: string, rfqId: string): Promise<RequestForQuotation> {
    const rfq = this.rfqs.get(rfqId);

    if (!rfq || rfq.tenantId !== tenantId) {
      throw new NotFoundException(`RFQ ${rfqId} not found`);
    }

    return rfq;
  }

  async listRFQs(
    tenantId: string,
    filters?: {
      status?: RFQStatus;
      supplierId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<RequestForQuotation[]> {
    let rfqs = Array.from(this.rfqs.values()).filter((r) => r.tenantId === tenantId);

    if (filters?.status) {
      rfqs = rfqs.filter((r) => r.status === filters.status);
    }

    if (filters?.supplierId) {
      rfqs = rfqs.filter((r) => r.invitedSupplierIds.includes(filters.supplierId!));
    }

    if (filters?.dateFrom) {
      rfqs = rfqs.filter((r) => r.createdAt >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      rfqs = rfqs.filter((r) => r.createdAt <= filters.dateTo!);
    }

    return rfqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async publishRFQ(tenantId: string, rfqId: string): Promise<RequestForQuotation> {
    const rfq = await this.getRFQ(tenantId, rfqId);

    if (rfq.status !== RFQStatus.DRAFT) {
      throw new BadRequestException('Only draft RFQs can be published');
    }

    if (rfq.lineItems.length === 0) {
      throw new BadRequestException('RFQ must have at least one line item');
    }

    if (rfq.invitedSupplierIds.length === 0) {
      throw new BadRequestException('RFQ must have at least one invited supplier');
    }

    if (rfq.deadline <= new Date()) {
      throw new BadRequestException('RFQ deadline must be in the future');
    }

    rfq.status = RFQStatus.PUBLISHED;
    rfq.publishedAt = new Date();
    rfq.updatedAt = new Date();

    this.rfqs.set(rfqId, rfq);

    this.eventEmitter.emit('rfq.published', {
      tenantId,
      rfqId,
      supplierIds: rfq.invitedSupplierIds,
      deadline: rfq.deadline,
    });

    return rfq;
  }

  async closeRFQ(tenantId: string, rfqId: string): Promise<RequestForQuotation> {
    const rfq = await this.getRFQ(tenantId, rfqId);

    if (rfq.status !== RFQStatus.PUBLISHED) {
      throw new BadRequestException('Only published RFQs can be closed');
    }

    rfq.status = RFQStatus.CLOSED;
    rfq.closedAt = new Date();
    rfq.updatedAt = new Date();

    this.rfqs.set(rfqId, rfq);

    this.eventEmitter.emit('rfq.closed', {
      tenantId,
      rfqId,
      quotationCount: rfq.respondedSupplierIds.length,
    });

    return rfq;
  }

  async awardRFQ(
    tenantId: string,
    rfqId: string,
    supplierId: string,
  ): Promise<RequestForQuotation> {
    const rfq = await this.getRFQ(tenantId, rfqId);

    if (rfq.status !== RFQStatus.CLOSED) {
      throw new BadRequestException('Only closed RFQs can be awarded');
    }

    // Verify supplier has a quotation
    const quotations = await this.getQuotationsByRFQ(tenantId, rfqId);
    const supplierQuotation = quotations.find((q) => q.supplierId === supplierId);

    if (!supplierQuotation) {
      throw new BadRequestException('Selected supplier has no quotation for this RFQ');
    }

    rfq.status = RFQStatus.AWARDED;
    rfq.awardedAt = new Date();
    rfq.awardedSupplierId = supplierId;
    rfq.updatedAt = new Date();

    this.rfqs.set(rfqId, rfq);

    // Update quotation status
    supplierQuotation.status = QuotationStatus.ACCEPTED;
    supplierQuotation.updatedAt = new Date();
    this.quotations.set(supplierQuotation.id, supplierQuotation);

    // Reject other quotations
    for (const q of quotations) {
      if (q.id !== supplierQuotation.id && q.status !== QuotationStatus.WITHDRAWN) {
        q.status = QuotationStatus.REJECTED;
        q.updatedAt = new Date();
        this.quotations.set(q.id, q);
      }
    }

    this.eventEmitter.emit('rfq.awarded', {
      tenantId,
      rfqId,
      supplierId,
      quotationId: supplierQuotation.id,
      amount: supplierQuotation.grandTotal,
    });

    return rfq;
  }

  async cancelRFQ(
    tenantId: string,
    rfqId: string,
    reason?: string,
  ): Promise<RequestForQuotation> {
    const rfq = await this.getRFQ(tenantId, rfqId);

    if (rfq.status === RFQStatus.AWARDED) {
      throw new BadRequestException('Cannot cancel an awarded RFQ');
    }

    rfq.status = RFQStatus.CANCELLED;
    rfq.updatedAt = new Date();
    if (reason) {
      rfq.metadata = { ...rfq.metadata, cancellationReason: reason };
    }

    this.rfqs.set(rfqId, rfq);

    this.eventEmitter.emit('rfq.cancelled', {
      tenantId,
      rfqId,
      reason,
    });

    return rfq;
  }

  // Quotation Management
  async createQuotation(
    tenantId: string,
    dto: CreateQuotationDto,
  ): Promise<SupplierQuotation> {
    const rfq = await this.getRFQ(tenantId, dto.rfqId);

    if (rfq.status !== RFQStatus.PUBLISHED) {
      throw new BadRequestException('Can only submit quotations for published RFQs');
    }

    if (new Date() > rfq.deadline) {
      throw new BadRequestException('RFQ deadline has passed');
    }

    if (!rfq.invitedSupplierIds.includes(dto.supplierId)) {
      throw new BadRequestException('Supplier is not invited to this RFQ');
    }

    // Check for existing quotation from this supplier
    const existing = Array.from(this.quotations.values()).find(
      (q) =>
        q.tenantId === tenantId &&
        q.rfqId === dto.rfqId &&
        q.supplierId === dto.supplierId &&
        q.status !== QuotationStatus.WITHDRAWN,
    );

    if (existing) {
      throw new BadRequestException('Supplier already has a quotation for this RFQ');
    }

    const id = `quot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const quotationNumber = await this.generateQuotationNumber(tenantId);

    const lineItems: QuotationLineItem[] = dto.lineItems.map((item, index) => ({
      ...item,
      id: `quot_line_${index}_${Date.now()}`,
      totalPrice: this.calculateLineTotal(item),
    }));

    const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const grandTotal =
      totalAmount + (dto.shippingCost || 0) + (dto.taxAmount || 0);

    const quotation: SupplierQuotation = {
      id,
      tenantId,
      quotationNumber,
      rfqId: dto.rfqId,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      supplierContact: dto.supplierContact,
      supplierEmail: dto.supplierEmail,
      status: QuotationStatus.DRAFT,
      lineItems,
      totalAmount,
      currency: lineItems[0]?.currency || 'RON',
      validUntil: new Date(dto.validUntil),
      deliveryTerms: dto.deliveryTerms,
      paymentTerms: dto.paymentTerms,
      shippingCost: dto.shippingCost,
      taxAmount: dto.taxAmount,
      grandTotal,
      warranty: dto.warranty,
      qualityCertifications: dto.qualityCertifications,
      attachmentIds: dto.attachmentIds,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.quotations.set(id, quotation);

    this.eventEmitter.emit('quotation.created', {
      tenantId,
      quotationId: id,
      rfqId: dto.rfqId,
      supplierId: dto.supplierId,
    });

    return quotation;
  }

  async submitQuotation(
    tenantId: string,
    quotationId: string,
  ): Promise<SupplierQuotation> {
    const quotation = await this.getQuotation(tenantId, quotationId);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be submitted');
    }

    const rfq = await this.getRFQ(tenantId, quotation.rfqId);

    if (new Date() > rfq.deadline) {
      throw new BadRequestException('RFQ deadline has passed');
    }

    quotation.status = QuotationStatus.RECEIVED;
    quotation.submittedAt = new Date();
    quotation.updatedAt = new Date();

    this.quotations.set(quotationId, quotation);

    // Update RFQ respondedSupplierIds
    if (!rfq.respondedSupplierIds.includes(quotation.supplierId)) {
      rfq.respondedSupplierIds.push(quotation.supplierId);
      rfq.updatedAt = new Date();
      this.rfqs.set(rfq.id, rfq);
    }

    this.eventEmitter.emit('quotation.submitted', {
      tenantId,
      quotationId,
      rfqId: quotation.rfqId,
      supplierId: quotation.supplierId,
      amount: quotation.grandTotal,
    });

    return quotation;
  }

  async getQuotation(
    tenantId: string,
    quotationId: string,
  ): Promise<SupplierQuotation> {
    const quotation = this.quotations.get(quotationId);

    if (!quotation || quotation.tenantId !== tenantId) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    return quotation;
  }

  async getQuotationsByRFQ(
    tenantId: string,
    rfqId: string,
  ): Promise<SupplierQuotation[]> {
    return Array.from(this.quotations.values())
      .filter((q) => q.tenantId === tenantId && q.rfqId === rfqId)
      .sort((a, b) => a.grandTotal - b.grandTotal);
  }

  async getQuotationsBySupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<SupplierQuotation[]> {
    return Array.from(this.quotations.values())
      .filter((q) => q.tenantId === tenantId && q.supplierId === supplierId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateQuotation(
    tenantId: string,
    quotationId: string,
    dto: UpdateQuotationDto,
  ): Promise<SupplierQuotation> {
    const quotation = await this.getQuotation(tenantId, quotationId);

    if (
      quotation.status !== QuotationStatus.DRAFT &&
      quotation.status !== QuotationStatus.RECEIVED
    ) {
      throw new BadRequestException('Cannot update quotation in current status');
    }

    if (dto.lineItems) {
      quotation.lineItems = dto.lineItems.map((item, index) => ({
        ...item,
        id: `quot_line_${index}_${Date.now()}`,
        totalPrice: this.calculateLineTotal(item),
      }));
      quotation.totalAmount = quotation.lineItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );
      quotation.grandTotal =
        quotation.totalAmount +
        (dto.shippingCost ?? quotation.shippingCost ?? 0) +
        (dto.taxAmount ?? quotation.taxAmount ?? 0);
    }

    Object.assign(quotation, {
      ...dto,
      lineItems: quotation.lineItems,
      totalAmount: quotation.totalAmount,
      grandTotal: quotation.grandTotal,
      updatedAt: new Date(),
    });

    this.quotations.set(quotationId, quotation);

    return quotation;
  }

  async withdrawQuotation(
    tenantId: string,
    quotationId: string,
    reason?: string,
  ): Promise<SupplierQuotation> {
    const quotation = await this.getQuotation(tenantId, quotationId);

    if (
      quotation.status === QuotationStatus.ACCEPTED ||
      quotation.status === QuotationStatus.WITHDRAWN
    ) {
      throw new BadRequestException('Cannot withdraw quotation');
    }

    quotation.status = QuotationStatus.WITHDRAWN;
    quotation.updatedAt = new Date();
    if (reason) {
      quotation.metadata = { ...quotation.metadata, withdrawalReason: reason };
    }

    this.quotations.set(quotationId, quotation);

    this.eventEmitter.emit('quotation.withdrawn', {
      tenantId,
      quotationId,
      rfqId: quotation.rfqId,
      supplierId: quotation.supplierId,
      reason,
    });

    return quotation;
  }

  // Quotation Scoring & Comparison
  async scoreQuotation(
    tenantId: string,
    quotationId: string,
    dto: ScoreQuotationDto,
    reviewerId: string,
  ): Promise<SupplierQuotation> {
    const quotation = await this.getQuotation(tenantId, quotationId);
    const rfq = await this.getRFQ(tenantId, quotation.rfqId);

    // Calculate weighted score based on RFQ criteria
    const weights = new Map<ComparisonCriteria, number>();
    for (const criterion of rfq.evaluationCriteria) {
      weights.set(criterion.criterion, criterion.weight);
    }

    const priceWeight = weights.get(ComparisonCriteria.PRICE) || 0;
    const qualityWeight = weights.get(ComparisonCriteria.QUALITY) || 0;
    const deliveryWeight = weights.get(ComparisonCriteria.DELIVERY_TIME) || 0;
    const paymentWeight = weights.get(ComparisonCriteria.PAYMENT_TERMS) || 0;
    const warrantyWeight = weights.get(ComparisonCriteria.WARRANTY) || 0;
    const ratingWeight = weights.get(ComparisonCriteria.SUPPLIER_RATING) || 0;

    const totalWeightedScore =
      (dto.priceScore * priceWeight +
        dto.qualityScore * qualityWeight +
        dto.deliveryScore * deliveryWeight +
        (dto.paymentTermsScore || 0) * paymentWeight +
        (dto.warrantyScore || 0) * warrantyWeight +
        (dto.supplierRatingScore || 0) * ratingWeight) /
      100;

    quotation.scores = {
      priceScore: dto.priceScore,
      qualityScore: dto.qualityScore,
      deliveryScore: dto.deliveryScore,
      paymentTermsScore: dto.paymentTermsScore || 0,
      warrantyScore: dto.warrantyScore || 0,
      supplierRatingScore: dto.supplierRatingScore || 0,
      totalWeightedScore,
    };

    quotation.status = QuotationStatus.UNDER_REVIEW;
    quotation.reviewedAt = new Date();
    quotation.reviewedBy = reviewerId;
    quotation.updatedAt = new Date();

    this.quotations.set(quotationId, quotation);

    // Update rankings for all quotations in this RFQ
    await this.updateRankings(tenantId, quotation.rfqId);

    return quotation;
  }

  async compareQuotations(
    tenantId: string,
    rfqId: string,
  ): Promise<QuotationComparison> {
    const rfq = await this.getRFQ(tenantId, rfqId);
    const quotations = await this.getQuotationsByRFQ(tenantId, rfqId);

    const activeQuotations = quotations.filter(
      (q) =>
        q.status !== QuotationStatus.WITHDRAWN &&
        q.status !== QuotationStatus.REJECTED &&
        q.status !== QuotationStatus.EXPIRED,
    );

    if (activeQuotations.length === 0) {
      throw new BadRequestException('No active quotations to compare');
    }

    // Ensure all quotations are scored
    for (const q of activeQuotations) {
      if (!q.scores) {
        await this.autoScoreQuotation(tenantId, q, activeQuotations);
      }
    }

    // Build comparison items
    const comparisonItems: QuotationComparisonItem[] = activeQuotations.map((q) => ({
      quotationId: q.id,
      supplierId: q.supplierId,
      supplierName: q.supplierName,
      totalAmount: q.grandTotal,
      currency: q.currency,
      averageLeadTime: this.calculateAverageLeadTime(q),
      scores: q.scores!,
      ranking: q.ranking || 0,
      lineItemComparison: this.buildLineItemComparison(q, rfq),
    }));

    // Sort by ranking
    comparisonItems.sort((a, b) => a.ranking - b.ranking);

    // Find best by criteria
    const bestByPrice = this.findBestByCriteria(
      comparisonItems,
      (a, b) => a.totalAmount - b.totalAmount,
    );
    const bestByDelivery = this.findBestByCriteria(
      comparisonItems,
      (a, b) => a.averageLeadTime - b.averageLeadTime,
    );
    const bestOverall = comparisonItems[0]?.supplierId || '';

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      comparisonItems,
      activeQuotations,
      rfq,
    );

    return {
      rfqId,
      rfqTitle: rfq.title,
      evaluationCriteria: rfq.evaluationCriteria,
      quotations: comparisonItems,
      bestByPrice,
      bestByDelivery,
      bestOverall,
      recommendation,
      comparisonDate: new Date(),
    };
  }

  async shortlistQuotation(
    tenantId: string,
    quotationId: string,
  ): Promise<SupplierQuotation> {
    const quotation = await this.getQuotation(tenantId, quotationId);

    if (quotation.status === QuotationStatus.WITHDRAWN) {
      throw new BadRequestException('Cannot shortlist withdrawn quotation');
    }

    quotation.status = QuotationStatus.SHORTLISTED;
    quotation.updatedAt = new Date();

    this.quotations.set(quotationId, quotation);

    this.eventEmitter.emit('quotation.shortlisted', {
      tenantId,
      quotationId,
      rfqId: quotation.rfqId,
      supplierId: quotation.supplierId,
    });

    return quotation;
  }

  // Private Helper Methods
  private async generateRFQNumber(tenantId: string): Promise<string> {
    const counter = (this.rfqCounter.get(tenantId) || 0) + 1;
    this.rfqCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `RFQ-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private async generateQuotationNumber(tenantId: string): Promise<string> {
    const counter = (this.quotationCounter.get(tenantId) || 0) + 1;
    this.quotationCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `QT-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private calculateLineTotal(item: Omit<QuotationLineItem, 'id' | 'totalPrice'>): number {
    let total = item.unitPrice * item.quantity;

    if (item.discount) {
      if (item.discountType === 'percentage') {
        total = total * (1 - item.discount / 100);
      } else {
        total = total - item.discount;
      }
    }

    return Math.max(0, total);
  }

  private calculateAverageLeadTime(quotation: SupplierQuotation): number {
    const leadTimes = quotation.lineItems
      .filter((item) => item.leadTimeDays !== undefined)
      .map((item) => item.leadTimeDays!);

    if (leadTimes.length === 0) return 0;

    return leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length;
  }

  private async autoScoreQuotation(
    tenantId: string,
    quotation: SupplierQuotation,
    allQuotations: SupplierQuotation[],
  ): Promise<void> {
    // Auto-calculate scores based on relative position
    const prices = allQuotations.map((q) => q.grandTotal);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const leadTimes = allQuotations.map((q) => this.calculateAverageLeadTime(q));
    const minLeadTime = Math.min(...leadTimes);
    const maxLeadTime = Math.max(...leadTimes);
    const leadTimeRange = maxLeadTime - minLeadTime || 1;

    // Price score: lower is better (normalized to 0-100)
    const priceScore =
      100 - ((quotation.grandTotal - minPrice) / priceRange) * 100;

    // Delivery score: lower lead time is better
    const avgLeadTime = this.calculateAverageLeadTime(quotation);
    const deliveryScore =
      leadTimeRange > 0
        ? 100 - ((avgLeadTime - minLeadTime) / leadTimeRange) * 100
        : 100;

    // Default scores for other criteria
    const qualityScore = quotation.qualityCertifications?.length ? 80 : 60;
    const warrantyScore = quotation.warranty ? 70 : 50;
    const paymentTermsScore = 70;
    const supplierRatingScore = 70;

    await this.scoreQuotation(
      tenantId,
      quotation.id,
      {
        priceScore: Math.round(priceScore),
        qualityScore,
        deliveryScore: Math.round(deliveryScore),
        paymentTermsScore,
        warrantyScore,
        supplierRatingScore,
      },
      'system',
    );
  }

  private async updateRankings(tenantId: string, rfqId: string): Promise<void> {
    const quotations = await this.getQuotationsByRFQ(tenantId, rfqId);

    const scoredQuotations = quotations
      .filter((q) => q.scores)
      .sort((a, b) => b.scores!.totalWeightedScore - a.scores!.totalWeightedScore);

    scoredQuotations.forEach((q, index) => {
      q.ranking = index + 1;
      this.quotations.set(q.id, q);
    });
  }

  private buildLineItemComparison(
    quotation: SupplierQuotation,
    rfq: RequestForQuotation,
  ): LineItemComparison[] {
    return quotation.lineItems.map((item) => {
      const rfqLine = rfq.lineItems.find((l) => l.id === item.rfqLineId);

      return {
        rfqLineId: item.rfqLineId,
        description: item.description,
        quotedPrice: item.totalPrice,
        marketBenchmark: rfqLine?.targetTotalPrice,
        varianceFromBenchmark: rfqLine?.targetTotalPrice
          ? ((item.totalPrice - rfqLine.targetTotalPrice) / rfqLine.targetTotalPrice) * 100
          : undefined,
        leadTimeDays: item.leadTimeDays || 0,
        notes: item.notes,
      };
    });
  }

  private findBestByCriteria(
    items: QuotationComparisonItem[],
    compareFn: (a: QuotationComparisonItem, b: QuotationComparisonItem) => number,
  ): string {
    if (items.length === 0) return '';
    const sorted = [...items].sort(compareFn);
    return sorted[0].supplierId;
  }

  private generateRecommendation(
    comparisonItems: QuotationComparisonItem[],
    quotations: SupplierQuotation[],
    rfq: RequestForQuotation,
  ): ComparisonRecommendation | undefined {
    if (comparisonItems.length === 0) return undefined;

    const best = comparisonItems[0];
    const bestQuotation = quotations.find((q) => q.id === best.quotationId);

    if (!bestQuotation) return undefined;

    const reasons: string[] = [];
    const risks: string[] = [];

    // Analyze why this is recommended
    if (best.ranking === 1) {
      reasons.push('Highest weighted score across all evaluation criteria');
    }

    if (best.totalAmount === Math.min(...comparisonItems.map((c) => c.totalAmount))) {
      reasons.push('Lowest total price among all quotations');
    }

    if (best.averageLeadTime === Math.min(...comparisonItems.map((c) => c.averageLeadTime))) {
      reasons.push('Fastest delivery time');
    }

    if (best.scores.qualityScore >= 80) {
      reasons.push('High quality score based on certifications');
    }

    // Identify risks
    if (best.averageLeadTime > 30) {
      risks.push('Lead time exceeds 30 days');
    }

    if (bestQuotation.validUntil <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      risks.push('Quotation expires within 7 days');
    }

    if (!bestQuotation.qualityCertifications?.length) {
      risks.push('No quality certifications provided');
    }

    // Calculate potential savings
    const targetTotal = rfq.lineItems.reduce(
      (sum, item) => sum + (item.targetTotalPrice || 0),
      0,
    );
    const savings = targetTotal > 0 ? targetTotal - best.totalAmount : 0;
    const savingsPercentage = targetTotal > 0 ? (savings / targetTotal) * 100 : 0;

    return {
      recommendedSupplierId: best.supplierId,
      recommendedSupplierName: best.supplierName,
      reasons,
      risks,
      savings: savings > 0 ? savings : undefined,
      savingsPercentage: savingsPercentage > 0 ? savingsPercentage : undefined,
    };
  }

  // Analytics
  async getQuotationAnalytics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalRFQs: number;
    totalQuotations: number;
    averageQuotationsPerRFQ: number;
    averageResponseRate: number;
    totalValue: number;
    averageLeadTime: number;
    byStatus: Record<QuotationStatus, number>;
  }> {
    const rfqs = Array.from(this.rfqs.values()).filter(
      (r) =>
        r.tenantId === tenantId &&
        r.createdAt >= dateFrom &&
        r.createdAt <= dateTo,
    );

    const quotations = Array.from(this.quotations.values()).filter(
      (q) =>
        q.tenantId === tenantId &&
        q.createdAt >= dateFrom &&
        q.createdAt <= dateTo,
    );

    const byStatus: Record<QuotationStatus, number> = {
      [QuotationStatus.DRAFT]: 0,
      [QuotationStatus.SENT]: 0,
      [QuotationStatus.RECEIVED]: 0,
      [QuotationStatus.UNDER_REVIEW]: 0,
      [QuotationStatus.SHORTLISTED]: 0,
      [QuotationStatus.ACCEPTED]: 0,
      [QuotationStatus.REJECTED]: 0,
      [QuotationStatus.EXPIRED]: 0,
      [QuotationStatus.WITHDRAWN]: 0,
    };

    let totalValue = 0;
    let totalLeadTime = 0;
    let leadTimeCount = 0;

    for (const q of quotations) {
      byStatus[q.status]++;
      totalValue += q.grandTotal;

      const avgLead = this.calculateAverageLeadTime(q);
      if (avgLead > 0) {
        totalLeadTime += avgLead;
        leadTimeCount++;
      }
    }

    const totalInvited = rfqs.reduce(
      (sum, r) => sum + r.invitedSupplierIds.length,
      0,
    );
    const totalResponded = rfqs.reduce(
      (sum, r) => sum + r.respondedSupplierIds.length,
      0,
    );

    return {
      totalRFQs: rfqs.length,
      totalQuotations: quotations.length,
      averageQuotationsPerRFQ:
        rfqs.length > 0 ? quotations.length / rfqs.length : 0,
      averageResponseRate:
        totalInvited > 0 ? (totalResponded / totalInvited) * 100 : 0,
      totalValue,
      averageLeadTime: leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0,
      byStatus,
    };
  }
}
