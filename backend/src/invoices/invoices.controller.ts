import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { BulkInvoiceEmailService, BulkEmailOptions } from './bulk-invoice-email.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, InvoiceStatusDto } from './dto/update-invoice.dto';
import { InvoiceType, InvoiceStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('invoices')
@Controller('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
    private readonly bulkEmailService: BulkInvoiceEmailService,
  ) {}

  // Helper to extract userId from JWT token with validation
  private getUserId(req: any): string {
    const userId = req.user?.id || req.user?.sub || req.auth?.userId;
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired token - user ID not found');
    }
    return userId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async create(
    @Req() req: any,
    @Body() dto: CreateInvoiceDto,
  ) {
    const userId = this.getUserId(req);

    // Normalize customer fields for backward compatibility
    const normalizedDto = { ...dto };

    // Handle customer_name alias
    if (normalizedDto.customer_name && !normalizedDto.partnerName) {
      normalizedDto.partnerName = normalizedDto.customer_name;
    }

    // If customer_id is provided, we could look up customer details from CRM
    // For now, just ensure partnerName is set
    if (normalizedDto.customer_id && !normalizedDto.partnerName) {
      // TODO: When Customer/CRM integration is ready, look up customer by ID
      // const customer = await this.contactsService.getContact(normalizedDto.customer_id);
      // if (customer) {
      //   normalizedDto.partnerName = customer.companyName || `${customer.firstName} ${customer.lastName}`;
      //   normalizedDto.partnerCui = customer.customFields?.cui;
      //   normalizedDto.partnerAddress = customer.address?.street;
      // }
      normalizedDto.partnerName = `Customer ${normalizedDto.customer_id}`;
    }

    // Ensure partnerName is set (required for invoice creation)
    if (!normalizedDto.partnerName) {
      throw new Error('Either partnerName, customer_name, or customer_id must be provided');
    }

    return this.invoicesService.create(userId, normalizedDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices with pagination and filters' })
  @ApiQuery({ name: 'type', enum: ['ISSUED', 'RECEIVED'], required: false })
  @ApiQuery({ name: 'status', enum: InvoiceStatusDto, required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.findAll(userId, {
      type: type as InvoiceType,
      status: status as InvoiceStatus,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get invoice summary for VAT calculation' })
  @ApiQuery({ name: 'period', required: false, description: 'Period in YYYY-MM format' })
  getSummary(
    @Req() req: any,
    @Query('period') period?: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.getSummary(userId, period);
  }

  /**
   * Get overdue invoices for dashboard widget
   */
  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue invoices for dashboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max number of invoices (default 10)' })
  @ApiResponse({ status: 200, description: 'Returns overdue invoices with summary' })
  async getOverdueInvoices(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.getOverdueInvoices(userId, limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice found' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOne(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiResponse({ status: 204, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  delete(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.delete(userId, id);
  }

  @Post(':id/submit-efactura')
  @ApiOperation({ summary: 'Submit invoice to e-Factura SPV' })
  @ApiResponse({ status: 200, description: 'Invoice submitted to SPV' })
  submitToEfactura(
    @Req() req: any,
    @Param('id') id: string,
    @Body('efacturaId') efacturaId: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.markAsSubmitted(userId, id, efacturaId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice as PDF' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async downloadPdf(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const userId = this.getUserId(req);
    const invoice = await this.invoicesService.findOne(userId, id);

    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      supplier: {
        name: invoice.user?.company || 'DocumentIulia.ro',
        cui: invoice.user?.cui || '',
        address: '',
      },
      customer: {
        name: invoice.partnerName,
        cui: invoice.partnerCui || undefined,
        address: invoice.partnerAddress || undefined,
      },
      items: [
        {
          description: 'Servicii conform factură',
          quantity: 1,
          unitPrice: Number(invoice.netAmount),
          vatRate: Number(invoice.vatRate),
          total: Number(invoice.netAmount),
        },
      ],
      totals: {
        netAmount: Number(invoice.netAmount),
        vatAmount: Number(invoice.vatAmount),
        grossAmount: Number(invoice.grossAmount),
      },
      currency: invoice.currency,
    };

    const pdfBuffer = await this.pdfService.generateInvoicePdf(pdfData);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  /**
   * Send multiple invoices via email in bulk
   */
  @Post('bulk-email')
  @ApiOperation({ summary: 'Send multiple invoices via email' })
  @ApiResponse({ status: 200, description: 'Bulk email results' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async sendBulkEmails(
    @Req() req: any,
    @Body() body: {
      invoiceIds: string[];
      subject?: string;
      message?: string;
      includeAttachment?: boolean;
      ccEmails?: string[];
      replyToEmail?: string;
    },
  ) {
    const userId = this.getUserId(req);
    const options: BulkEmailOptions = {
      subject: body.subject,
      message: body.message,
      includeAttachment: body.includeAttachment,
      ccEmails: body.ccEmails,
      replyToEmail: body.replyToEmail,
    };

    return this.bulkEmailService.sendBulkInvoiceEmails(
      userId,
      body.invoiceIds,
      options,
    );
  }

  /**
   * Check which invoices can receive emails
   */
  @Post('bulk-email/check')
  @ApiOperation({ summary: 'Check which invoices can receive emails' })
  @ApiResponse({ status: 200, description: 'Eligibility check results' })
  async checkBulkEmailEligibility(
    @Req() req: any,
    @Body() body: { invoiceIds: string[] },
  ) {
    const userId = this.getUserId(req);
    return this.bulkEmailService.getEligibleInvoices(userId, body.invoiceIds);
  }

  /**
   * Preview email before sending
   */
  @Get(':id/email-preview')
  @ApiOperation({ summary: 'Preview invoice email before sending' })
  @ApiQuery({ name: 'subject', required: false })
  @ApiQuery({ name: 'message', required: false })
  @ApiResponse({ status: 200, description: 'Email preview' })
  async previewEmail(
    @Req() req: any,
    @Param('id') id: string,
    @Query('subject') subject?: string,
    @Query('message') message?: string,
  ) {
    const userId = this.getUserId(req);
    return this.bulkEmailService.previewEmail(userId, id, { subject, message });
  }

  /**
   * Send single invoice via email
   */
  @Post(':id/send-email')
  @ApiOperation({ summary: 'Send single invoice via email' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  async sendSingleEmail(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      subject?: string;
      message?: string;
      includeAttachment?: boolean;
      ccEmails?: string[];
      replyToEmail?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.bulkEmailService.sendBulkInvoiceEmails(userId, [id], body);
  }

  /**
   * Batch update invoice status
   */
  @Post('batch-status')
  @ApiOperation({ summary: 'Update status for multiple invoices' })
  @ApiResponse({ status: 200, description: 'Batch status update results' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async batchUpdateStatus(
    @Req() req: any,
    @Body() body: {
      invoiceIds: string[];
      status: string;
      paymentDate?: string;
      notes?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.batchUpdateStatus(
      userId,
      body.invoiceIds,
      body.status as InvoiceStatus,
      {
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        notes: body.notes,
      },
    );
  }

  /**
   * Get available status transitions for an invoice
   */
  @Get(':id/status-transitions')
  @ApiOperation({ summary: 'Get available status transitions for an invoice' })
  @ApiResponse({ status: 200, description: 'Available transitions' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getAvailableStatusTransitions(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.getAvailableStatusTransitions(userId, id);
  }

  /**
   * Mark invoice as paid
   */
  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async markAsPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { paymentDate?: string },
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.markAsPaid(
      userId,
      id,
      body.paymentDate ? new Date(body.paymentDate) : undefined,
    );
  }

  // =================== SUPPLIER INVOICE MATCHING ===================

  /**
   * Get unmatched supplier invoices
   */
  @Get('supplier/unmatched')
  @ApiOperation({ summary: 'Get supplier invoices without partner link (Facturi furnizor neasociate)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'minAmount', required: false, type: Number })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Unmatched supplier invoices' })
  async getUnmatchedSupplierInvoices(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.getUnmatchedSupplierInvoices(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    });
  }

  /**
   * Find matching partners/payments for a supplier invoice
   */
  @Get(':id/supplier-matches')
  @ApiOperation({ summary: 'Find matching partners and payments for supplier invoice (Potriviri furnizor)' })
  @ApiResponse({ status: 200, description: 'Matching results with scores and recommendations' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findSupplierMatches(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.findSupplierMatches(userId, id);
  }

  /**
   * Link supplier invoice to a partner
   */
  @Post(':id/link-partner')
  @ApiOperation({ summary: 'Link supplier invoice to partner (Asociaza cu partener)' })
  @ApiResponse({ status: 200, description: 'Invoice linked to partner' })
  @ApiResponse({ status: 404, description: 'Invoice or partner not found' })
  async linkToPartner(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { partnerId: string },
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.linkToPartner(userId, id, body.partnerId);
  }

  /**
   * Link supplier invoice to a payment
   */
  @Post(':id/link-payment')
  @ApiOperation({ summary: 'Link supplier invoice to payment (Asociaza cu plata)' })
  @ApiResponse({ status: 200, description: 'Invoice linked to payment' })
  @ApiResponse({ status: 404, description: 'Invoice or payment not found' })
  async linkToPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { paymentId: string },
  ) {
    const userId = this.getUserId(req);
    return this.invoicesService.linkToPayment(userId, id, body.paymentId);
  }
}
