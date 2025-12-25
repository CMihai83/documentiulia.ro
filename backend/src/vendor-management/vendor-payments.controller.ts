import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  VendorPaymentsService,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  DisputeStatus,
  CreditNoteType,
  InvoiceLineItem,
  TaxBreakdown,
  InvoiceAttachment,
  BankDetails,
  CreditNoteLineItem,
  RemittanceInvoiceDetail,
} from './vendor-payments.service';

@ApiTags('Vendor Management - Payments')
@Controller('vendors/payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorPaymentsController {
  constructor(private readonly paymentsService: VendorPaymentsService) {}

  // =================== INVOICES ===================

  @Post('invoices')
  @ApiOperation({ summary: 'Create vendor invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoice(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      invoiceNumber: string;
      externalReference?: string;
      purchaseOrderId?: string;
      contractId?: string;
      invoiceDate: string;
      dueDate: string;
      currency?: string;
      lineItems: Omit<InvoiceLineItem, 'id' | 'taxAmount' | 'discountAmount' | 'totalAmount'>[];
      taxBreakdown?: TaxBreakdown[];
      attachments?: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>[];
      paymentTerms?: string;
      bankDetails?: BankDetails;
      notes?: string;
      tags?: string[];
    },
  ) {
    try {
      return await this.paymentsService.createInvoice({
        tenantId: req.user.tenantId,
        vendorId: body.vendorId,
        invoiceNumber: body.invoiceNumber,
        externalReference: body.externalReference,
        purchaseOrderId: body.purchaseOrderId,
        contractId: body.contractId,
        invoiceDate: new Date(body.invoiceDate),
        dueDate: new Date(body.dueDate),
        currency: body.currency,
        lineItems: body.lineItems,
        taxBreakdown: body.taxBreakdown,
        attachments: body.attachments,
        paymentTerms: body.paymentTerms,
        bankDetails: body.bankDetails,
        notes: body.notes,
        tags: body.tags,
        submittedBy: req.user.id,
        submittedByName: req.user.name || req.user.email,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get invoices' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'overdue', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Invoices list' })
  async getInvoices(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('overdue') overdue?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const invoices = await this.paymentsService.getInvoices(req.user.tenantId, {
      vendorId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      overdue: overdue === 'true',
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { invoices, total: invoices.length };
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  async getInvoice(@Param('id') id: string) {
    const invoice = await this.paymentsService.getInvoice(id);
    if (!invoice) {
      return { error: 'Invoice not found' };
    }
    return invoice;
  }

  @Post('invoices/:id/submit')
  @ApiOperation({ summary: 'Submit invoice' })
  @ApiResponse({ status: 200, description: 'Invoice submitted' })
  async submitInvoice(@Param('id') id: string) {
    const invoice = await this.paymentsService.submitInvoice(id);
    if (!invoice) {
      return { error: 'Invoice not found or not in draft status' };
    }
    return invoice;
  }

  @Post('invoices/:id/review')
  @ApiOperation({ summary: 'Start invoice review' })
  @ApiResponse({ status: 200, description: 'Invoice under review' })
  async reviewInvoice(@Request() req: any, @Param('id') id: string) {
    const invoice = await this.paymentsService.reviewInvoice(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!invoice) {
      return { error: 'Invoice not found or not submitted' };
    }
    return invoice;
  }

  @Post('invoices/:id/approve')
  @ApiOperation({ summary: 'Approve invoice' })
  @ApiResponse({ status: 200, description: 'Invoice approved' })
  async approveInvoice(@Request() req: any, @Param('id') id: string) {
    const invoice = await this.paymentsService.approveInvoice(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!invoice) {
      return { error: 'Invoice not found or cannot be approved' };
    }
    return invoice;
  }

  @Post('invoices/:id/reject')
  @ApiOperation({ summary: 'Reject invoice' })
  @ApiResponse({ status: 200, description: 'Invoice rejected' })
  async rejectInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const invoice = await this.paymentsService.rejectInvoice(id, req.user.id, body.reason);
    if (!invoice) {
      return { error: 'Invoice not found or cannot be rejected' };
    }
    return invoice;
  }

  @Post('invoices/:id/schedule')
  @ApiOperation({ summary: 'Schedule invoice payment' })
  @ApiResponse({ status: 200, description: 'Payment scheduled' })
  async scheduleInvoicePayment(
    @Param('id') id: string,
    @Body() body: { scheduledDate: string },
  ) {
    const invoice = await this.paymentsService.scheduleInvoicePayment(
      id,
      new Date(body.scheduledDate),
    );
    if (!invoice) {
      return { error: 'Invoice not found or not approved' };
    }
    return invoice;
  }

  @Post('invoices/check-overdue')
  @ApiOperation({ summary: 'Check and mark overdue invoices' })
  @ApiResponse({ status: 200, description: 'Overdue invoices checked' })
  async checkOverdueInvoices(@Request() req: any) {
    const overdueInvoices = await this.paymentsService.checkOverdueInvoices(req.user.tenantId);
    return { overdueInvoices, count: overdueInvoices.length };
  }

  // =================== PAYMENTS ===================

  @Post()
  @ApiOperation({ summary: 'Create payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  async createPayment(
    @Request() req: any,
    @Body() body: {
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
      scheduledDate?: string;
      notes?: string;
    },
  ) {
    return this.paymentsService.createPayment({
      tenantId: req.user.tenantId,
      vendorId: body.vendorId,
      invoiceIds: body.invoiceIds,
      method: body.method,
      currency: body.currency,
      amount: body.amount,
      feeAmount: body.feeAmount,
      exchangeRate: body.exchangeRate,
      originalCurrency: body.originalCurrency,
      originalAmount: body.originalAmount,
      bankDetails: body.bankDetails,
      referenceNumber: body.referenceNumber,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      notes: body.notes,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.email,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get payments' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Payments list' })
  async getPayments(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: PaymentMethod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const payments = await this.paymentsService.getPayments(req.user.tenantId, {
      vendorId,
      status,
      method,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { payments, total: payments.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async getPayment(@Param('id') id: string) {
    const payment = await this.paymentsService.getPayment(id);
    if (!payment) {
      return { error: 'Payment not found' };
    }
    return payment;
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve payment' })
  @ApiResponse({ status: 200, description: 'Payment approved' })
  async approvePayment(@Request() req: any, @Param('id') id: string) {
    const payment = await this.paymentsService.approvePayment(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!payment) {
      return { error: 'Payment not found or not pending' };
    }
    return payment;
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Process payment' })
  @ApiResponse({ status: 200, description: 'Payment processing' })
  async processPayment(
    @Param('id') id: string,
    @Body() body: { transactionId?: string },
  ) {
    const payment = await this.paymentsService.processPayment(id, body.transactionId);
    if (!payment) {
      return { error: 'Payment not found or not approved' };
    }
    return payment;
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete payment' })
  @ApiResponse({ status: 200, description: 'Payment completed' })
  async completePayment(@Param('id') id: string) {
    const payment = await this.paymentsService.completePayment(id);
    if (!payment) {
      return { error: 'Payment not found or not processing' };
    }
    return payment;
  }

  @Post(':id/fail')
  @ApiOperation({ summary: 'Mark payment as failed' })
  @ApiResponse({ status: 200, description: 'Payment failed' })
  async failPayment(@Param('id') id: string, @Body() body: { reason: string }) {
    const payment = await this.paymentsService.failPayment(id, body.reason);
    if (!payment) {
      return { error: 'Payment not found or not processing' };
    }
    return payment;
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled' })
  async cancelPayment(@Param('id') id: string) {
    const payment = await this.paymentsService.cancelPayment(id);
    if (!payment) {
      return { error: 'Payment not found or cannot be cancelled' };
    }
    return payment;
  }

  // =================== PAYMENT BATCHES ===================

  @Post('batches')
  @ApiOperation({ summary: 'Create payment batch' })
  @ApiResponse({ status: 201, description: 'Batch created' })
  async createPaymentBatch(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      paymentIds: string[];
      paymentMethod: PaymentMethod;
      scheduledDate?: string;
    },
  ) {
    try {
      return await this.paymentsService.createPaymentBatch({
        tenantId: req.user.tenantId,
        name: body.name,
        description: body.description,
        paymentIds: body.paymentIds,
        paymentMethod: body.paymentMethod,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        createdBy: req.user.id,
        createdByName: req.user.name || req.user.email,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('batches/list')
  @ApiOperation({ summary: 'Get payment batches' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Batches list' })
  async getPaymentBatches(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const batches = await this.paymentsService.getPaymentBatches(req.user.tenantId, {
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { batches, total: batches.length };
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch by ID' })
  @ApiResponse({ status: 200, description: 'Batch details' })
  async getPaymentBatch(@Param('id') id: string) {
    const batch = await this.paymentsService.getPaymentBatch(id);
    if (!batch) {
      return { error: 'Batch not found' };
    }
    return batch;
  }

  @Post('batches/:id/submit')
  @ApiOperation({ summary: 'Submit batch for approval' })
  @ApiResponse({ status: 200, description: 'Batch submitted' })
  async submitBatchForApproval(@Param('id') id: string) {
    const batch = await this.paymentsService.submitBatchForApproval(id);
    if (!batch) {
      return { error: 'Batch not found or not in draft status' };
    }
    return batch;
  }

  @Post('batches/:id/approve')
  @ApiOperation({ summary: 'Approve batch' })
  @ApiResponse({ status: 200, description: 'Batch approved' })
  async approveBatch(@Request() req: any, @Param('id') id: string) {
    const batch = await this.paymentsService.approveBatch(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!batch) {
      return { error: 'Batch not found or not pending approval' };
    }
    return batch;
  }

  @Post('batches/:id/process')
  @ApiOperation({ summary: 'Process batch' })
  @ApiResponse({ status: 200, description: 'Batch processing' })
  async processBatch(@Param('id') id: string) {
    const batch = await this.paymentsService.processBatch(id);
    if (!batch) {
      return { error: 'Batch not found or not approved' };
    }
    return batch;
  }

  @Post('batches/:id/complete')
  @ApiOperation({ summary: 'Complete batch' })
  @ApiResponse({ status: 200, description: 'Batch completed' })
  async completeBatch(@Param('id') id: string) {
    const batch = await this.paymentsService.completeBatch(id);
    if (!batch) {
      return { error: 'Batch not found or not processing' };
    }
    return batch;
  }

  // =================== DISPUTES ===================

  @Post('disputes')
  @ApiOperation({ summary: 'Create payment dispute' })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  async createDispute(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      invoiceId?: string;
      paymentId?: string;
      reason: string;
      description: string;
      disputedAmount: number;
      attachments?: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>[];
    },
  ) {
    return this.paymentsService.createDispute({
      tenantId: req.user.tenantId,
      vendorId: body.vendorId,
      invoiceId: body.invoiceId,
      paymentId: body.paymentId,
      reason: body.reason,
      description: body.description,
      disputedAmount: body.disputedAmount,
      attachments: body.attachments,
      raisedBy: req.user.id,
      raisedByName: req.user.name || req.user.email,
    });
  }

  @Get('disputes/list')
  @ApiOperation({ summary: 'Get disputes' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Disputes list' })
  async getDisputes(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: DisputeStatus,
    @Query('limit') limit?: string,
  ) {
    const disputes = await this.paymentsService.getDisputes(req.user.tenantId, {
      vendorId,
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { disputes, total: disputes.length };
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiResponse({ status: 200, description: 'Dispute details' })
  async getDispute(@Param('id') id: string) {
    const dispute = await this.paymentsService.getDispute(id);
    if (!dispute) {
      return { error: 'Dispute not found' };
    }
    return dispute;
  }

  @Post('disputes/:id/assign')
  @ApiOperation({ summary: 'Assign dispute' })
  @ApiResponse({ status: 200, description: 'Dispute assigned' })
  async assignDispute(
    @Param('id') id: string,
    @Body() body: { assignedTo: string; assignedToName: string },
  ) {
    const dispute = await this.paymentsService.assignDispute(
      id,
      body.assignedTo,
      body.assignedToName,
    );
    if (!dispute) {
      return { error: 'Dispute not found' };
    }
    return dispute;
  }

  @Post('disputes/:id/comments')
  @ApiOperation({ summary: 'Add dispute comment' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addDisputeComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      content: string;
      fromVendor: boolean;
      attachments?: Omit<InvoiceAttachment, 'id' | 'uploadedAt'>[];
    },
  ) {
    const dispute = await this.paymentsService.addDisputeComment(id, {
      content: body.content,
      fromVendor: body.fromVendor,
      authorId: req.user.id,
      authorName: req.user.name || req.user.email,
      attachments: body.attachments,
    });
    if (!dispute) {
      return { error: 'Dispute not found' };
    }
    return dispute;
  }

  @Post('disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve dispute' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  async resolveDispute(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { resolution: string; resolvedAmount: number },
  ) {
    const dispute = await this.paymentsService.resolveDispute(
      id,
      body.resolution,
      body.resolvedAmount,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!dispute) {
      return { error: 'Dispute not found or already closed' };
    }
    return dispute;
  }

  @Post('disputes/:id/close')
  @ApiOperation({ summary: 'Close dispute' })
  @ApiResponse({ status: 200, description: 'Dispute closed' })
  async closeDispute(@Param('id') id: string) {
    const dispute = await this.paymentsService.closeDispute(id);
    if (!dispute) {
      return { error: 'Dispute not found or not resolved' };
    }
    return dispute;
  }

  // =================== CREDIT NOTES ===================

  @Post('credit-notes')
  @ApiOperation({ summary: 'Create credit note' })
  @ApiResponse({ status: 201, description: 'Credit note created' })
  async createCreditNote(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      relatedInvoiceId?: string;
      type: CreditNoteType;
      amount: number;
      currency?: string;
      reason: string;
      lineItems?: Omit<CreditNoteLineItem, 'id'>[];
      expiryDate?: string;
    },
  ) {
    return this.paymentsService.createCreditNote({
      tenantId: req.user.tenantId,
      vendorId: body.vendorId,
      relatedInvoiceId: body.relatedInvoiceId,
      type: body.type,
      amount: body.amount,
      currency: body.currency,
      reason: body.reason,
      lineItems: body.lineItems,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      issuedBy: req.user.id,
      issuedByName: req.user.name || req.user.email,
    });
  }

  @Get('credit-notes/:id')
  @ApiOperation({ summary: 'Get credit note by ID' })
  @ApiResponse({ status: 200, description: 'Credit note details' })
  async getCreditNote(@Param('id') id: string) {
    const creditNote = await this.paymentsService.getCreditNote(id);
    if (!creditNote) {
      return { error: 'Credit note not found' };
    }
    return creditNote;
  }

  @Get('vendor/:vendorId/credit-notes')
  @ApiOperation({ summary: 'Get vendor credit notes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor credit notes list' })
  async getVendorCreditNotes(
    @Param('vendorId') vendorId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const creditNotes = await this.paymentsService.getVendorCreditNotes(vendorId, {
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { creditNotes, total: creditNotes.length };
  }

  @Post('credit-notes/:id/issue')
  @ApiOperation({ summary: 'Issue credit note' })
  @ApiResponse({ status: 200, description: 'Credit note issued' })
  async issueCreditNote(@Param('id') id: string) {
    const creditNote = await this.paymentsService.issueCreditNote(id);
    if (!creditNote) {
      return { error: 'Credit note not found or not in draft status' };
    }
    return creditNote;
  }

  @Post('credit-notes/:id/apply')
  @ApiOperation({ summary: 'Apply credit note to invoice' })
  @ApiResponse({ status: 200, description: 'Credit note applied' })
  async applyCreditNote(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { invoiceId: string; amount: number },
  ) {
    const creditNote = await this.paymentsService.applyCreditNote(
      id,
      body.invoiceId,
      body.amount,
      req.user.id,
    );
    if (!creditNote) {
      return { error: 'Credit note not found, not issued, or insufficient amount' };
    }
    return creditNote;
  }

  // =================== PAYMENT SCHEDULES ===================

  @Post('schedules')
  @ApiOperation({ summary: 'Create payment schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createPaymentSchedule(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      name: string;
      frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      paymentMethod: PaymentMethod;
      minimumAmount?: number;
      maximumAmount?: number;
      autoApprove?: boolean;
      autoApproveThreshold?: number;
    },
  ) {
    return this.paymentsService.createPaymentSchedule({
      tenantId: req.user.tenantId,
      vendorId: body.vendorId,
      name: body.name,
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      paymentMethod: body.paymentMethod,
      minimumAmount: body.minimumAmount,
      maximumAmount: body.maximumAmount,
      autoApprove: body.autoApprove,
      autoApproveThreshold: body.autoApproveThreshold,
      createdBy: req.user.id,
    });
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: 'Get payment schedule by ID' })
  @ApiResponse({ status: 200, description: 'Schedule details' })
  async getPaymentSchedule(@Param('id') id: string) {
    const schedule = await this.paymentsService.getPaymentSchedule(id);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Get('vendor/:vendorId/schedules')
  @ApiOperation({ summary: 'Get vendor payment schedules' })
  @ApiResponse({ status: 200, description: 'Vendor schedules list' })
  async getVendorPaymentSchedules(@Param('vendorId') vendorId: string) {
    const schedules = await this.paymentsService.getVendorPaymentSchedules(vendorId);
    return { schedules, total: schedules.length };
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: 'Update payment schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updatePaymentSchedule(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      paymentMethod?: PaymentMethod;
      minimumAmount?: number;
      maximumAmount?: number;
      autoApprove?: boolean;
      autoApproveThreshold?: number;
      isActive?: boolean;
    },
  ) {
    const schedule = await this.paymentsService.updatePaymentSchedule(id, body);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  // =================== REMITTANCES ===================

  @Post('remittances')
  @ApiOperation({ summary: 'Create payment remittance' })
  @ApiResponse({ status: 201, description: 'Remittance created' })
  async createRemittance(
    @Request() req: any,
    @Body() body: {
      paymentId: string;
      vendorId: string;
      deliveryMethod: 'email' | 'portal' | 'mail' | 'fax';
      recipientEmail?: string;
      invoiceDetails: RemittanceInvoiceDetail[];
    },
  ) {
    try {
      return await this.paymentsService.createRemittance({
        paymentId: body.paymentId,
        vendorId: body.vendorId,
        deliveryMethod: body.deliveryMethod,
        recipientEmail: body.recipientEmail,
        invoiceDetails: body.invoiceDetails,
        sentBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('remittances/:id')
  @ApiOperation({ summary: 'Get remittance by ID' })
  @ApiResponse({ status: 200, description: 'Remittance details' })
  async getRemittance(@Param('id') id: string) {
    const remittance = await this.paymentsService.getRemittance(id);
    if (!remittance) {
      return { error: 'Remittance not found' };
    }
    return remittance;
  }

  @Get(':paymentId/remittances')
  @ApiOperation({ summary: 'Get payment remittances' })
  @ApiResponse({ status: 200, description: 'Payment remittances list' })
  async getPaymentRemittances(@Param('paymentId') paymentId: string) {
    const remittances = await this.paymentsService.getPaymentRemittances(paymentId);
    return { remittances, total: remittances.length };
  }

  // =================== SUMMARY & STATISTICS ===================

  @Get('vendor/:vendorId/summary')
  @ApiOperation({ summary: 'Get vendor payment summary' })
  @ApiResponse({ status: 200, description: 'Vendor payment summary' })
  async getVendorPaymentSummary(@Param('vendorId') vendorId: string) {
    return this.paymentsService.getVendorPaymentSummary(vendorId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Payment statistics' })
  async getStatistics(@Request() req: any) {
    return this.paymentsService.getPaymentStatistics(req.user.tenantId);
  }
}
