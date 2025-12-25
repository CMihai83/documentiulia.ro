import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type InvoiceStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod =
  | 'bank_transfer'
  | 'check'
  | 'wire'
  | 'ach'
  | 'credit_card'
  | 'virtual_card'
  | 'other';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed';

export type CreditNoteType = 'return' | 'discount' | 'correction' | 'overpayment' | 'other';

// =================== INTERFACES ===================

export interface VendorInvoice {
  id: string;
  tenantId: string;
  vendorId: string;
  invoiceNumber: string;
  externalReference?: string;
  purchaseOrderId?: string;
  contractId?: string;
  status: InvoiceStatus;
  invoiceDate: Date;
  dueDate: Date;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  lineItems: InvoiceLineItem[];
  taxBreakdown: TaxBreakdown[];
  attachments: InvoiceAttachment[];
  paymentTerms?: string;
  bankDetails?: BankDetails;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: Date;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  taxRate?: number;
  taxAmount: number;
  discountPercent?: number;
  discountAmount: number;
  totalAmount: number;
  costCenterId?: string;
  accountCode?: string;
  purchaseOrderLineId?: string;
}

export interface TaxBreakdown {
  taxType: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface InvoiceAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  swift?: string;
  accountHolderName: string;
}

export interface VendorPayment {
  id: string;
  tenantId: string;
  vendorId: string;
  invoiceIds: string[];
  paymentNumber: string;
  status: PaymentStatus;
  method: PaymentMethod;
  currency: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  exchangeRate?: number;
  originalCurrency?: string;
  originalAmount?: number;
  bankDetails?: BankDetails;
  referenceNumber?: string;
  transactionId?: string;
  scheduledDate?: Date;
  processedDate?: Date;
  completedDate?: Date;
  failureReason?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentBatch {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed';
  paymentIds: string[];
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  scheduledDate?: Date;
  processedDate?: Date;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceApproval {
  id: string;
  invoiceId: string;
  stepNumber: number;
  status: ApprovalStatus;
  approverId: string;
  approverName: string;
  approverRole: string;
  amountThreshold?: number;
  approvedAt?: Date;
  comments?: string;
  delegatedFrom?: string;
  createdAt: Date;
}

export interface PaymentDispute {
  id: string;
  tenantId: string;
  vendorId: string;
  invoiceId?: string;
  paymentId?: string;
  status: DisputeStatus;
  reason: string;
  description: string;
  disputedAmount: number;
  resolution?: string;
  resolvedAmount?: number;
  attachments: InvoiceAttachment[];
  comments: DisputeComment[];
  raisedBy: string;
  raisedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisputeComment {
  id: string;
  content: string;
  fromVendor: boolean;
  authorId: string;
  authorName: string;
  attachments: InvoiceAttachment[];
  createdAt: Date;
}

export interface CreditNote {
  id: string;
  tenantId: string;
  vendorId: string;
  creditNoteNumber: string;
  relatedInvoiceId?: string;
  type: CreditNoteType;
  status: 'draft' | 'issued' | 'applied' | 'cancelled';
  currency: string;
  amount: number;
  appliedAmount: number;
  remainingAmount: number;
  reason: string;
  lineItems: CreditNoteLineItem[];
  appliedToInvoices: AppliedCredit[];
  issueDate: Date;
  expiryDate?: Date;
  issuedBy: string;
  issuedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditNoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface AppliedCredit {
  invoiceId: string;
  amount: number;
  appliedAt: Date;
  appliedBy: string;
}

export interface PaymentSchedule {
  id: string;
  tenantId: string;
  vendorId: string;
  name: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  paymentMethod: PaymentMethod;
  minimumAmount?: number;
  maximumAmount?: number;
  autoApprove: boolean;
  autoApproveThreshold?: number;
  isActive: boolean;
  lastRunDate?: Date;
  nextRunDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRemittance {
  id: string;
  paymentId: string;
  vendorId: string;
  remittanceNumber: string;
  sentDate: Date;
  deliveryMethod: 'email' | 'portal' | 'mail' | 'fax';
  recipientEmail?: string;
  invoiceDetails: RemittanceInvoiceDetail[];
  totalAmount: number;
  sentBy: string;
  createdAt: Date;
}

export interface RemittanceInvoiceDetail {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceAmount: number;
  paidAmount: number;
  discountAmount: number;
}

export interface VendorPaymentSummary {
  vendorId: string;
  vendorName: string;
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  averagePaymentDays: number;
  availableCredits: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
}

@Injectable()
export class VendorPaymentsService {
  private invoices: Map<string, VendorInvoice> = new Map();
  private payments: Map<string, VendorPayment> = new Map();
  private paymentBatches: Map<string, PaymentBatch> = new Map();
  private invoiceApprovals: Map<string, InvoiceApproval[]> = new Map();
  private disputes: Map<string, PaymentDispute> = new Map();
  private creditNotes: Map<string, CreditNote> = new Map();
  private paymentSchedules: Map<string, PaymentSchedule> = new Map();
  private remittances: Map<string, PaymentRemittance> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== INVOICES ===================

  async createInvoice(data: {
    tenantId: string;
    vendorId: string;
    invoiceNumber: string;
    externalReference?: string;
    purchaseOrderId?: string;
    contractId?: string;
    invoiceDate: Date;
    dueDate: Date;
    currency?: string;
    lineItems: Omit<InvoiceLineItem, 'id' | 'taxAmount' | 'discountAmount' | 'totalAmount'>[];
    taxBreakdown?: TaxBreakdown[];
    attachments?: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>[];
    paymentTerms?: string;
    bankDetails?: BankDetails;
    notes?: string;
    tags?: string[];
    submittedBy: string;
    submittedByName: string;
  }): Promise<VendorInvoice> {
    // Check for duplicate invoice number
    const existing = Array.from(this.invoices.values()).find(
      i => i.vendorId === data.vendorId && i.invoiceNumber === data.invoiceNumber
    );
    if (existing) {
      throw new Error('Invoice with this number already exists for this vendor');
    }

    // Calculate line item totals
    const lineItems: InvoiceLineItem[] = data.lineItems.map((item, index) => {
      const baseAmount = item.quantity * item.unitPrice;
      const discountAmount = item.discountPercent ? baseAmount * (item.discountPercent / 100) : 0;
      const taxableAmount = baseAmount - discountAmount;
      const taxAmount = item.taxRate ? taxableAmount * (item.taxRate / 100) : 0;
      const totalAmount = taxableAmount + taxAmount;

      return {
        ...item,
        id: `invli_${Date.now()}_${index}`,
        taxAmount,
        discountAmount,
        totalAmount,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = lineItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal - discountAmount + taxAmount;

    const invoice: VendorInvoice = {
      id: `vinv_${Date.now()}`,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      invoiceNumber: data.invoiceNumber,
      externalReference: data.externalReference,
      purchaseOrderId: data.purchaseOrderId,
      contractId: data.contractId,
      status: 'draft',
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      currency: data.currency || 'RON',
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      lineItems,
      taxBreakdown: data.taxBreakdown || [],
      attachments: (data.attachments || []).map((a, i) => ({
        ...a,
        id: `invatt_${Date.now()}_${i}`,
        uploadedAt: new Date(),
      })),
      paymentTerms: data.paymentTerms,
      bankDetails: data.bankDetails,
      submittedBy: data.submittedBy,
      submittedByName: data.submittedByName,
      submittedAt: new Date(),
      notes: data.notes,
      tags: data.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.invoices.set(invoice.id, invoice);
    this.eventEmitter.emit('vendor_payment.invoice_created', { invoice });

    return invoice;
  }

  async getInvoice(id: string): Promise<VendorInvoice | null> {
    return this.invoices.get(id) || null;
  }

  async getInvoices(
    tenantId: string,
    options?: {
      vendorId?: string;
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
      overdue?: boolean;
      search?: string;
      limit?: number;
    }
  ): Promise<VendorInvoice[]> {
    let invoices = Array.from(this.invoices.values())
      .filter(i => i.tenantId === tenantId);

    if (options?.vendorId) {
      invoices = invoices.filter(i => i.vendorId === options.vendorId);
    }
    if (options?.status) {
      invoices = invoices.filter(i => i.status === options.status);
    }
    if (options?.startDate) {
      invoices = invoices.filter(i => i.invoiceDate >= options.startDate!);
    }
    if (options?.endDate) {
      invoices = invoices.filter(i => i.invoiceDate <= options.endDate!);
    }
    if (options?.overdue) {
      const now = new Date();
      invoices = invoices.filter(i =>
        i.dueDate < now &&
        i.balanceDue > 0 &&
        !['paid', 'cancelled'].includes(i.status)
      );
    }
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      invoices = invoices.filter(i =>
        i.invoiceNumber.toLowerCase().includes(searchLower) ||
        i.externalReference?.toLowerCase().includes(searchLower)
      );
    }

    invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      invoices = invoices.slice(0, options.limit);
    }

    return invoices;
  }

  async submitInvoice(id: string): Promise<VendorInvoice | null> {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.status !== 'draft') return null;

    invoice.status = 'submitted';
    invoice.submittedAt = new Date();
    invoice.updatedAt = new Date();
    this.invoices.set(id, invoice);

    this.eventEmitter.emit('vendor_payment.invoice_submitted', { invoice });
    return invoice;
  }

  async reviewInvoice(
    id: string,
    reviewedBy: string,
    reviewedByName: string
  ): Promise<VendorInvoice | null> {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.status !== 'submitted') return null;

    invoice.status = 'under_review';
    invoice.reviewedBy = reviewedBy;
    invoice.reviewedByName = reviewedByName;
    invoice.reviewedAt = new Date();
    invoice.updatedAt = new Date();
    this.invoices.set(id, invoice);

    return invoice;
  }

  async approveInvoice(
    id: string,
    approvedBy: string,
    approvedByName: string
  ): Promise<VendorInvoice | null> {
    const invoice = this.invoices.get(id);
    if (!invoice || !['submitted', 'under_review'].includes(invoice.status)) return null;

    invoice.status = 'approved';
    invoice.approvedBy = approvedBy;
    invoice.approvedByName = approvedByName;
    invoice.approvedAt = new Date();
    invoice.updatedAt = new Date();
    this.invoices.set(id, invoice);

    this.eventEmitter.emit('vendor_payment.invoice_approved', { invoice });
    return invoice;
  }

  async rejectInvoice(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<VendorInvoice | null> {
    const invoice = this.invoices.get(id);
    if (!invoice || !['submitted', 'under_review'].includes(invoice.status)) return null;

    invoice.status = 'rejected';
    invoice.rejectionReason = reason;
    invoice.reviewedBy = rejectedBy;
    invoice.reviewedAt = new Date();
    invoice.updatedAt = new Date();
    this.invoices.set(id, invoice);

    this.eventEmitter.emit('vendor_payment.invoice_rejected', { invoice, reason });
    return invoice;
  }

  async scheduleInvoicePayment(
    id: string,
    scheduledDate: Date
  ): Promise<VendorInvoice | null> {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.status !== 'approved') return null;

    invoice.status = 'scheduled';
    invoice.updatedAt = new Date();
    this.invoices.set(id, invoice);

    return invoice;
  }

  async updateInvoicePayment(
    id: string,
    paidAmount: number
  ): Promise<VendorInvoice | null> {
    const invoice = this.invoices.get(id);
    if (!invoice) return null;

    invoice.paidAmount += paidAmount;
    invoice.balanceDue = invoice.totalAmount - invoice.paidAmount;

    if (invoice.balanceDue <= 0) {
      invoice.status = 'paid';
      invoice.balanceDue = 0;
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partially_paid';
    }

    invoice.updatedAt = new Date();
    this.invoices.set(id, invoice);

    return invoice;
  }

  async checkOverdueInvoices(tenantId: string): Promise<VendorInvoice[]> {
    const now = new Date();
    const overdueInvoices: VendorInvoice[] = [];

    for (const invoice of this.invoices.values()) {
      if (
        invoice.tenantId === tenantId &&
        invoice.dueDate < now &&
        invoice.balanceDue > 0 &&
        !['paid', 'cancelled', 'overdue'].includes(invoice.status)
      ) {
        invoice.status = 'overdue';
        invoice.updatedAt = new Date();
        this.invoices.set(invoice.id, invoice);
        overdueInvoices.push(invoice);

        this.eventEmitter.emit('vendor_payment.invoice_overdue', { invoice });
      }
    }

    return overdueInvoices;
  }

  // =================== PAYMENTS ===================

  async createPayment(data: {
    tenantId: string;
    vendorId: string;
    invoiceIds: string[];
    method: PaymentMethod;
    currency?: string;
    amount: number;
    feeAmount?: number;
    exchangeRate?: number;
    originalCurrency?: string;
    originalAmount?: number;
    bankDetails?: BankDetails;
    referenceNumber?: string;
    scheduledDate?: Date;
    notes?: string;
    createdBy: string;
    createdByName: string;
  }): Promise<VendorPayment> {
    const payment: VendorPayment = {
      id: `vpay_${Date.now()}`,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      invoiceIds: data.invoiceIds,
      paymentNumber: `PAY-${Date.now().toString().slice(-8)}`,
      status: 'pending',
      method: data.method,
      currency: data.currency || 'RON',
      amount: data.amount,
      feeAmount: data.feeAmount || 0,
      netAmount: data.amount - (data.feeAmount || 0),
      exchangeRate: data.exchangeRate,
      originalCurrency: data.originalCurrency,
      originalAmount: data.originalAmount,
      bankDetails: data.bankDetails,
      referenceNumber: data.referenceNumber,
      scheduledDate: data.scheduledDate,
      notes: data.notes,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.payments.set(payment.id, payment);
    this.eventEmitter.emit('vendor_payment.payment_created', { payment });

    return payment;
  }

  async getPayment(id: string): Promise<VendorPayment | null> {
    return this.payments.get(id) || null;
  }

  async getPayments(
    tenantId: string,
    options?: {
      vendorId?: string;
      status?: PaymentStatus;
      method?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<VendorPayment[]> {
    let payments = Array.from(this.payments.values())
      .filter(p => p.tenantId === tenantId);

    if (options?.vendorId) {
      payments = payments.filter(p => p.vendorId === options.vendorId);
    }
    if (options?.status) {
      payments = payments.filter(p => p.status === options.status);
    }
    if (options?.method) {
      payments = payments.filter(p => p.method === options.method);
    }
    if (options?.startDate) {
      payments = payments.filter(p => p.createdAt >= options.startDate!);
    }
    if (options?.endDate) {
      payments = payments.filter(p => p.createdAt <= options.endDate!);
    }

    payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      payments = payments.slice(0, options.limit);
    }

    return payments;
  }

  async approvePayment(
    id: string,
    approvedBy: string,
    approvedByName: string
  ): Promise<VendorPayment | null> {
    const payment = this.payments.get(id);
    if (!payment || payment.status !== 'pending') return null;

    payment.status = 'processing';
    payment.approvedBy = approvedBy;
    payment.approvedByName = approvedByName;
    payment.approvedAt = new Date();
    payment.updatedAt = new Date();
    this.payments.set(id, payment);

    this.eventEmitter.emit('vendor_payment.payment_approved', { payment });
    return payment;
  }

  async processPayment(id: string, transactionId?: string): Promise<VendorPayment | null> {
    const payment = this.payments.get(id);
    if (!payment || payment.status !== 'processing') return null;

    payment.processedDate = new Date();
    payment.transactionId = transactionId;
    payment.updatedAt = new Date();
    this.payments.set(id, payment);

    return payment;
  }

  async completePayment(id: string): Promise<VendorPayment | null> {
    const payment = this.payments.get(id);
    if (!payment || payment.status !== 'processing') return null;

    payment.status = 'completed';
    payment.completedDate = new Date();
    payment.updatedAt = new Date();
    this.payments.set(id, payment);

    // Update invoices
    for (const invoiceId of payment.invoiceIds) {
      await this.updateInvoicePayment(invoiceId, payment.amount / payment.invoiceIds.length);
    }

    this.eventEmitter.emit('vendor_payment.payment_completed', { payment });
    return payment;
  }

  async failPayment(id: string, reason: string): Promise<VendorPayment | null> {
    const payment = this.payments.get(id);
    if (!payment || payment.status !== 'processing') return null;

    payment.status = 'failed';
    payment.failureReason = reason;
    payment.updatedAt = new Date();
    this.payments.set(id, payment);

    this.eventEmitter.emit('vendor_payment.payment_failed', { payment, reason });
    return payment;
  }

  async cancelPayment(id: string): Promise<VendorPayment | null> {
    const payment = this.payments.get(id);
    if (!payment || !['pending', 'processing'].includes(payment.status)) return null;

    payment.status = 'cancelled';
    payment.updatedAt = new Date();
    this.payments.set(id, payment);

    return payment;
  }

  // =================== PAYMENT BATCHES ===================

  async createPaymentBatch(data: {
    tenantId: string;
    name: string;
    description?: string;
    paymentIds: string[];
    paymentMethod: PaymentMethod;
    scheduledDate?: Date;
    createdBy: string;
    createdByName: string;
  }): Promise<PaymentBatch> {
    const payments = data.paymentIds
      .map(id => this.payments.get(id))
      .filter((p): p is VendorPayment => p !== undefined);

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const currencies = new Set(payments.map(p => p.currency));

    if (currencies.size > 1) {
      throw new Error('All payments in a batch must have the same currency');
    }

    const batch: PaymentBatch = {
      id: `pbatch_${Date.now()}`,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      status: 'draft',
      paymentIds: data.paymentIds,
      totalAmount,
      currency: payments[0]?.currency || 'RON',
      paymentMethod: data.paymentMethod,
      scheduledDate: data.scheduledDate,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.paymentBatches.set(batch.id, batch);
    return batch;
  }

  async getPaymentBatch(id: string): Promise<PaymentBatch | null> {
    return this.paymentBatches.get(id) || null;
  }

  async getPaymentBatches(
    tenantId: string,
    options?: {
      status?: PaymentBatch['status'];
      limit?: number;
    }
  ): Promise<PaymentBatch[]> {
    let batches = Array.from(this.paymentBatches.values())
      .filter(b => b.tenantId === tenantId);

    if (options?.status) {
      batches = batches.filter(b => b.status === options.status);
    }

    batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      batches = batches.slice(0, options.limit);
    }

    return batches;
  }

  async submitBatchForApproval(id: string): Promise<PaymentBatch | null> {
    const batch = this.paymentBatches.get(id);
    if (!batch || batch.status !== 'draft') return null;

    batch.status = 'pending_approval';
    batch.updatedAt = new Date();
    this.paymentBatches.set(id, batch);

    return batch;
  }

  async approveBatch(
    id: string,
    approvedBy: string,
    approvedByName: string
  ): Promise<PaymentBatch | null> {
    const batch = this.paymentBatches.get(id);
    if (!batch || batch.status !== 'pending_approval') return null;

    batch.status = 'approved';
    batch.approvedBy = approvedBy;
    batch.approvedByName = approvedByName;
    batch.approvedAt = new Date();
    batch.updatedAt = new Date();
    this.paymentBatches.set(id, batch);

    // Approve all payments in batch
    for (const paymentId of batch.paymentIds) {
      await this.approvePayment(paymentId, approvedBy, approvedByName);
    }

    return batch;
  }

  async processBatch(id: string): Promise<PaymentBatch | null> {
    const batch = this.paymentBatches.get(id);
    if (!batch || batch.status !== 'approved') return null;

    batch.status = 'processing';
    batch.processedDate = new Date();
    batch.updatedAt = new Date();
    this.paymentBatches.set(id, batch);

    return batch;
  }

  async completeBatch(id: string): Promise<PaymentBatch | null> {
    const batch = this.paymentBatches.get(id);
    if (!batch || batch.status !== 'processing') return null;

    batch.status = 'completed';
    batch.updatedAt = new Date();
    this.paymentBatches.set(id, batch);

    // Complete all payments
    for (const paymentId of batch.paymentIds) {
      await this.completePayment(paymentId);
    }

    return batch;
  }

  // =================== DISPUTES ===================

  async createDispute(data: {
    tenantId: string;
    vendorId: string;
    invoiceId?: string;
    paymentId?: string;
    reason: string;
    description: string;
    disputedAmount: number;
    attachments?: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>[];
    raisedBy: string;
    raisedByName: string;
  }): Promise<PaymentDispute> {
    const dispute: PaymentDispute = {
      id: `disp_${Date.now()}`,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      invoiceId: data.invoiceId,
      paymentId: data.paymentId,
      status: 'open',
      reason: data.reason,
      description: data.description,
      disputedAmount: data.disputedAmount,
      attachments: (data.attachments || []).map((a, i) => ({
        ...a,
        id: `dispatt_${Date.now()}_${i}`,
        uploadedAt: new Date(),
      })),
      comments: [],
      raisedBy: data.raisedBy,
      raisedByName: data.raisedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.disputes.set(dispute.id, dispute);
    this.eventEmitter.emit('vendor_payment.dispute_created', { dispute });

    return dispute;
  }

  async getDispute(id: string): Promise<PaymentDispute | null> {
    return this.disputes.get(id) || null;
  }

  async getDisputes(
    tenantId: string,
    options?: {
      vendorId?: string;
      status?: DisputeStatus;
      limit?: number;
    }
  ): Promise<PaymentDispute[]> {
    let disputes = Array.from(this.disputes.values())
      .filter(d => d.tenantId === tenantId);

    if (options?.vendorId) {
      disputes = disputes.filter(d => d.vendorId === options.vendorId);
    }
    if (options?.status) {
      disputes = disputes.filter(d => d.status === options.status);
    }

    disputes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      disputes = disputes.slice(0, options.limit);
    }

    return disputes;
  }

  async assignDispute(
    id: string,
    assignedTo: string,
    assignedToName: string
  ): Promise<PaymentDispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute) return null;

    dispute.status = 'under_review';
    dispute.assignedTo = assignedTo;
    dispute.assignedToName = assignedToName;
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);

    return dispute;
  }

  async addDisputeComment(
    id: string,
    comment: {
      content: string;
      fromVendor: boolean;
      authorId: string;
      authorName: string;
      attachments?: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>[];
    }
  ): Promise<PaymentDispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute) return null;

    const newComment: DisputeComment = {
      id: `dcmt_${Date.now()}`,
      content: comment.content,
      fromVendor: comment.fromVendor,
      authorId: comment.authorId,
      authorName: comment.authorName,
      attachments: (comment.attachments || []).map((a, i) => ({
        ...a,
        id: `dcmtatt_${Date.now()}_${i}`,
        uploadedAt: new Date(),
      })),
      createdAt: new Date(),
    };

    dispute.comments.push(newComment);
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);

    return dispute;
  }

  async resolveDispute(
    id: string,
    resolution: string,
    resolvedAmount: number,
    resolvedBy: string,
    resolvedByName: string
  ): Promise<PaymentDispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute || dispute.status === 'closed') return null;

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedAmount = resolvedAmount;
    dispute.resolvedBy = resolvedBy;
    dispute.resolvedByName = resolvedByName;
    dispute.resolvedAt = new Date();
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);

    this.eventEmitter.emit('vendor_payment.dispute_resolved', { dispute });
    return dispute;
  }

  async closeDispute(id: string): Promise<PaymentDispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute || dispute.status !== 'resolved') return null;

    dispute.status = 'closed';
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);

    return dispute;
  }

  // =================== CREDIT NOTES ===================

  async createCreditNote(data: {
    tenantId: string;
    vendorId: string;
    relatedInvoiceId?: string;
    type: CreditNoteType;
    amount: number;
    currency?: string;
    reason: string;
    lineItems?: Omit<CreditNoteLineItem, 'id'>[];
    expiryDate?: Date;
    issuedBy: string;
    issuedByName: string;
  }): Promise<CreditNote> {
    const creditNote: CreditNote = {
      id: `cn_${Date.now()}`,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      creditNoteNumber: `CN-${Date.now().toString().slice(-8)}`,
      relatedInvoiceId: data.relatedInvoiceId,
      type: data.type,
      status: 'draft',
      currency: data.currency || 'RON',
      amount: data.amount,
      appliedAmount: 0,
      remainingAmount: data.amount,
      reason: data.reason,
      lineItems: (data.lineItems || []).map((item, i) => ({
        ...item,
        id: `cnli_${Date.now()}_${i}`,
      })),
      appliedToInvoices: [],
      issueDate: new Date(),
      expiryDate: data.expiryDate,
      issuedBy: data.issuedBy,
      issuedByName: data.issuedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.creditNotes.set(creditNote.id, creditNote);
    return creditNote;
  }

  async getCreditNote(id: string): Promise<CreditNote | null> {
    return this.creditNotes.get(id) || null;
  }

  async getVendorCreditNotes(
    vendorId: string,
    options?: {
      status?: CreditNote['status'];
      limit?: number;
    }
  ): Promise<CreditNote[]> {
    let creditNotes = Array.from(this.creditNotes.values())
      .filter(cn => cn.vendorId === vendorId);

    if (options?.status) {
      creditNotes = creditNotes.filter(cn => cn.status === options.status);
    }

    creditNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      creditNotes = creditNotes.slice(0, options.limit);
    }

    return creditNotes;
  }

  async issueCreditNote(id: string): Promise<CreditNote | null> {
    const creditNote = this.creditNotes.get(id);
    if (!creditNote || creditNote.status !== 'draft') return null;

    creditNote.status = 'issued';
    creditNote.updatedAt = new Date();
    this.creditNotes.set(id, creditNote);

    this.eventEmitter.emit('vendor_payment.credit_note_issued', { creditNote });
    return creditNote;
  }

  async applyCreditNote(
    id: string,
    invoiceId: string,
    amount: number,
    appliedBy: string
  ): Promise<CreditNote | null> {
    const creditNote = this.creditNotes.get(id);
    if (!creditNote || creditNote.status !== 'issued' || creditNote.remainingAmount < amount) {
      return null;
    }

    creditNote.appliedToInvoices.push({
      invoiceId,
      amount,
      appliedAt: new Date(),
      appliedBy,
    });
    creditNote.appliedAmount += amount;
    creditNote.remainingAmount -= amount;

    if (creditNote.remainingAmount <= 0) {
      creditNote.status = 'applied';
    }

    creditNote.updatedAt = new Date();
    this.creditNotes.set(id, creditNote);

    // Update invoice
    await this.updateInvoicePayment(invoiceId, amount);

    return creditNote;
  }

  // =================== PAYMENT SCHEDULES ===================

  async createPaymentSchedule(data: {
    tenantId: string;
    vendorId: string;
    name: string;
    frequency: PaymentSchedule['frequency'];
    dayOfWeek?: number;
    dayOfMonth?: number;
    paymentMethod: PaymentMethod;
    minimumAmount?: number;
    maximumAmount?: number;
    autoApprove?: boolean;
    autoApproveThreshold?: number;
    createdBy: string;
  }): Promise<PaymentSchedule> {
    const schedule: PaymentSchedule = {
      id: `psched_${Date.now()}`,
      tenantId: data.tenantId,
      vendorId: data.vendorId,
      name: data.name,
      frequency: data.frequency,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      paymentMethod: data.paymentMethod,
      minimumAmount: data.minimumAmount,
      maximumAmount: data.maximumAmount,
      autoApprove: data.autoApprove || false,
      autoApproveThreshold: data.autoApproveThreshold,
      isActive: true,
      nextRunDate: this.calculateNextRunDate(data.frequency, data.dayOfWeek, data.dayOfMonth),
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.paymentSchedules.set(schedule.id, schedule);
    return schedule;
  }

  private calculateNextRunDate(
    frequency: PaymentSchedule['frequency'],
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'weekly':
        const targetDay = dayOfWeek || 5; // Friday default
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
        next.setDate(now.getDate() + daysUntil);
        break;
      case 'biweekly':
        const biweeklyTarget = dayOfWeek || 5;
        const biweeklyDays = ((biweeklyTarget - now.getDay() + 7) % 7 || 7) + 7;
        next.setDate(now.getDate() + biweeklyDays);
        break;
      case 'monthly':
        const monthlyDay = dayOfMonth || 25;
        next.setMonth(now.getMonth() + 1);
        next.setDate(monthlyDay);
        break;
      case 'quarterly':
        const quarterlyDay = dayOfMonth || 25;
        next.setMonth(now.getMonth() + 3);
        next.setDate(quarterlyDay);
        break;
    }

    return next;
  }

  async getPaymentSchedule(id: string): Promise<PaymentSchedule | null> {
    return this.paymentSchedules.get(id) || null;
  }

  async getVendorPaymentSchedules(vendorId: string): Promise<PaymentSchedule[]> {
    return Array.from(this.paymentSchedules.values())
      .filter(s => s.vendorId === vendorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePaymentSchedule(
    id: string,
    updates: Partial<Pick<PaymentSchedule, 'name' | 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'paymentMethod' | 'minimumAmount' | 'maximumAmount' | 'autoApprove' | 'autoApproveThreshold' | 'isActive'>>
  ): Promise<PaymentSchedule | null> {
    const schedule = this.paymentSchedules.get(id);
    if (!schedule) return null;

    Object.assign(schedule, updates, { updatedAt: new Date() });

    if (updates.frequency || updates.dayOfWeek || updates.dayOfMonth) {
      schedule.nextRunDate = this.calculateNextRunDate(
        schedule.frequency,
        schedule.dayOfWeek,
        schedule.dayOfMonth
      );
    }

    this.paymentSchedules.set(id, schedule);
    return schedule;
  }

  // =================== REMITTANCES ===================

  async createRemittance(data: {
    paymentId: string;
    vendorId: string;
    deliveryMethod: PaymentRemittance['deliveryMethod'];
    recipientEmail?: string;
    invoiceDetails: RemittanceInvoiceDetail[];
    sentBy: string;
  }): Promise<PaymentRemittance> {
    const payment = this.payments.get(data.paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const remittance: PaymentRemittance = {
      id: `rem_${Date.now()}`,
      paymentId: data.paymentId,
      vendorId: data.vendorId,
      remittanceNumber: `REM-${Date.now().toString().slice(-8)}`,
      sentDate: new Date(),
      deliveryMethod: data.deliveryMethod,
      recipientEmail: data.recipientEmail,
      invoiceDetails: data.invoiceDetails,
      totalAmount: payment.amount,
      sentBy: data.sentBy,
      createdAt: new Date(),
    };

    this.remittances.set(remittance.id, remittance);
    this.eventEmitter.emit('vendor_payment.remittance_sent', { remittance });

    return remittance;
  }

  async getRemittance(id: string): Promise<PaymentRemittance | null> {
    return this.remittances.get(id) || null;
  }

  async getPaymentRemittances(paymentId: string): Promise<PaymentRemittance[]> {
    return Array.from(this.remittances.values())
      .filter(r => r.paymentId === paymentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== SUMMARY & STATISTICS ===================

  async getVendorPaymentSummary(vendorId: string): Promise<VendorPaymentSummary> {
    const invoices = Array.from(this.invoices.values())
      .filter(i => i.vendorId === vendorId);
    const payments = Array.from(this.payments.values())
      .filter(p => p.vendorId === vendorId && p.status === 'completed');
    const creditNotes = Array.from(this.creditNotes.values())
      .filter(cn => cn.vendorId === vendorId && cn.status === 'issued');

    const now = new Date();
    const overdueInvoices = invoices.filter(
      i => i.dueDate < now && i.balanceDue > 0 && !['paid', 'cancelled'].includes(i.status)
    );

    const completedPayments = payments.filter(p => p.completedDate);
    const avgPaymentDays = completedPayments.length > 0
      ? completedPayments.reduce((sum, p) => {
          const invoice = invoices.find(i => p.invoiceIds.includes(i.id));
          if (invoice && p.completedDate) {
            return sum + Math.floor((p.completedDate.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          return sum;
        }, 0) / completedPayments.length
      : 0;

    const lastPayment = payments[0];

    return {
      vendorId,
      vendorName: '', // Would be populated from vendor service
      totalInvoices: invoices.length,
      totalInvoiceAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
      totalPaidAmount: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
      totalOutstanding: invoices.reduce((sum, i) => sum + i.balanceDue, 0),
      overdueAmount: overdueInvoices.reduce((sum, i) => sum + i.balanceDue, 0),
      overdueCount: overdueInvoices.length,
      averagePaymentDays: Math.round(avgPaymentDays),
      availableCredits: creditNotes.reduce((sum, cn) => sum + cn.remainingAmount, 0),
      lastPaymentDate: lastPayment?.completedDate,
      lastPaymentAmount: lastPayment?.amount,
    };
  }

  async getPaymentStatistics(tenantId: string): Promise<{
    totalInvoices: number;
    pendingInvoices: number;
    approvedInvoices: number;
    overdueInvoices: number;
    totalInvoiceAmount: number;
    totalPaidAmount: number;
    totalOutstanding: number;
    overdueAmount: number;
    totalPayments: number;
    pendingPayments: number;
    completedPayments: number;
    totalPaymentAmount: number;
    openDisputes: number;
    averagePaymentTime: number;
    paymentsByMethod: { method: string; count: number; amount: number }[];
    invoicesByStatus: { status: string; count: number; amount: number }[];
  }> {
    const invoices = Array.from(this.invoices.values())
      .filter(i => i.tenantId === tenantId);
    const payments = Array.from(this.payments.values())
      .filter(p => p.tenantId === tenantId);
    const disputes = Array.from(this.disputes.values())
      .filter(d => d.tenantId === tenantId);

    const now = new Date();
    const overdueInvoices = invoices.filter(
      i => i.dueDate < now && i.balanceDue > 0 && !['paid', 'cancelled'].includes(i.status)
    );

    // Calculate average payment time
    const completedPayments = payments.filter(p => p.status === 'completed' && p.completedDate);
    const avgPaymentTime = completedPayments.length > 0
      ? completedPayments.reduce((sum, p) => {
          return sum + (p.completedDate!.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / completedPayments.length
      : 0;

    // Group by method
    const methodGroups = payments.reduce((acc, p) => {
      if (!acc[p.method]) {
        acc[p.method] = { count: 0, amount: 0 };
      }
      acc[p.method].count++;
      acc[p.method].amount += p.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    // Group by status
    const statusGroups = invoices.reduce((acc, i) => {
      if (!acc[i.status]) {
        acc[i.status] = { count: 0, amount: 0 };
      }
      acc[i.status].count++;
      acc[i.status].amount += i.totalAmount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return {
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter(i => ['submitted', 'under_review'].includes(i.status)).length,
      approvedInvoices: invoices.filter(i => i.status === 'approved').length,
      overdueInvoices: overdueInvoices.length,
      totalInvoiceAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
      totalPaidAmount: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
      totalOutstanding: invoices.reduce((sum, i) => sum + i.balanceDue, 0),
      overdueAmount: overdueInvoices.reduce((sum, i) => sum + i.balanceDue, 0),
      totalPayments: payments.length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      completedPayments: completedPayments.length,
      totalPaymentAmount: completedPayments.reduce((sum, p) => sum + p.amount, 0),
      openDisputes: disputes.filter(d => !['resolved', 'closed'].includes(d.status)).length,
      averagePaymentTime: Math.round(avgPaymentTime * 10) / 10,
      paymentsByMethod: Object.entries(methodGroups).map(([method, data]) => ({
        method,
        ...data,
      })),
      invoicesByStatus: Object.entries(statusGroups).map(([status, data]) => ({
        status,
        ...data,
      })),
    };
  }
}
