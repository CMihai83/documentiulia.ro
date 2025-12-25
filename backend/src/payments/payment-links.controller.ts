import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  PaymentLinksService,
  PaymentMethod,
  PaymentLink,
  EmbedWidget,
} from './payment-links.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Payment Links')
@Controller('payment-links')
export class PaymentLinksController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  // =================== AUTHENTICATED ENDPOINTS ===================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment link' })
  @ApiResponse({ status: 201, description: 'Payment link created' })
  async createPaymentLink(
    @Request() req: any,
    @Body() body: {
      type: PaymentLink['type'];
      amount: number;
      currency: string;
      title: string;
      description?: string;
      invoiceId?: string;
      reference?: string;
      customerEmail?: string;
      customerName?: string;
      expiresAt?: string;
      maxUses?: number;
      allowCustomAmount?: boolean;
      minAmount?: number;
      maxAmount?: number;
      suggestedAmounts?: number[];
      allowedPaymentMethods?: PaymentMethod[];
      redirectUrl?: string;
      webhookUrl?: string;
      branding?: {
        logoUrl?: string;
        primaryColor?: string;
        companyName?: string;
      };
    },
  ) {
    return this.paymentLinksService.createPaymentLink({
      tenantId: req.user.tenantId || req.user.id,
      type: body.type,
      amount: body.amount,
      currency: body.currency,
      title: body.title,
      description: body.description,
      invoiceId: body.invoiceId,
      reference: body.reference,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      maxUses: body.maxUses,
      allowCustomAmount: body.allowCustomAmount,
      minAmount: body.minAmount,
      maxAmount: body.maxAmount,
      suggestedAmounts: body.suggestedAmounts,
      allowedPaymentMethods: body.allowedPaymentMethods,
      redirectUrl: body.redirectUrl,
      webhookUrl: body.webhookUrl,
      branding: body.branding,
      createdBy: req.user.id,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payment links for tenant' })
  @ApiResponse({ status: 200, description: 'List of payment links' })
  async getPaymentLinks(@Request() req: any) {
    const links = await this.paymentLinksService.getPaymentLinksByTenant(
      req.user.tenantId || req.user.id,
    );
    return { links, total: links.length };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment link by ID' })
  @ApiResponse({ status: 200, description: 'Payment link details' })
  async getPaymentLink(@Param('id') id: string) {
    return this.paymentLinksService.getPaymentLink(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment link' })
  @ApiResponse({ status: 200, description: 'Payment link updated' })
  async updatePaymentLink(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      description?: string;
      amount?: number;
      isActive?: boolean;
      expiresAt?: string;
      maxUses?: number;
      redirectUrl?: string;
      webhookUrl?: string;
    },
  ) {
    return this.paymentLinksService.updatePaymentLink(id, {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete payment link' })
  @ApiResponse({ status: 200, description: 'Payment link deleted' })
  async deletePaymentLink(@Param('id') id: string) {
    return { success: await this.paymentLinksService.deleteLink(id) };
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate payment link' })
  @ApiResponse({ status: 200, description: 'Payment link deactivated' })
  async deactivatePaymentLink(@Param('id') id: string) {
    return { success: await this.paymentLinksService.deactivateLink(id) };
  }

  @Get(':id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for a link' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async getLinkPayments(@Param('id') id: string) {
    const payments = await this.paymentLinksService.getPaymentsByLink(id);
    return { payments, total: payments.length };
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment link statistics' })
  @ApiResponse({ status: 200, description: 'Link statistics' })
  async getLinkStats(@Param('id') id: string) {
    return this.paymentLinksService.getLinkStats(id);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code for payment link' })
  @ApiResponse({ status: 200, description: 'QR code SVG' })
  async getQRCode(@Param('id') id: string) {
    const qr = await this.paymentLinksService.generateQRCode(id);
    return { qrCode: qr };
  }

  // =================== EMBED WIDGETS ===================

  @Post(':id/widget')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create embed widget for payment link' })
  @ApiResponse({ status: 201, description: 'Widget created' })
  async createWidget(
    @Request() req: any,
    @Param('id') paymentLinkId: string,
    @Body() body: {
      type: EmbedWidget['type'];
      buttonText?: string;
      buttonColor?: string;
      buttonSize?: 'small' | 'medium' | 'large';
      width?: string;
      height?: string;
    },
  ) {
    return this.paymentLinksService.createEmbedWidget({
      tenantId: req.user.tenantId || req.user.id,
      paymentLinkId,
      type: body.type,
      buttonText: body.buttonText,
      buttonColor: body.buttonColor,
      buttonSize: body.buttonSize,
      width: body.width,
      height: body.height,
    });
  }

  @Get('widgets/:widgetId')
  @ApiOperation({ summary: 'Get widget by ID' })
  @ApiResponse({ status: 200, description: 'Widget details' })
  async getWidget(@Param('widgetId') widgetId: string) {
    return this.paymentLinksService.getWidget(widgetId);
  }

  // =================== INVOICE LINK ===================

  @Post('invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment link for invoice' })
  @ApiResponse({ status: 201, description: 'Invoice payment link created' })
  async createInvoiceLink(
    @Request() req: any,
    @Body() body: {
      invoiceId: string;
      invoiceNumber: string;
      amount: number;
      currency: string;
      customerEmail?: string;
      customerName?: string;
      dueDate?: string;
      companyName: string;
      companyCui?: string;
    },
  ) {
    return this.paymentLinksService.createInvoicePaymentLink({
      tenantId: req.user.tenantId || req.user.id,
      invoiceId: body.invoiceId,
      invoiceNumber: body.invoiceNumber,
      amount: body.amount,
      currency: body.currency,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      companyName: body.companyName,
      companyCui: body.companyCui,
      createdBy: req.user.id,
    });
  }

  // =================== PUBLIC ENDPOINTS ===================

  @Get('public/:shortCode')
  @ApiOperation({ summary: 'Access payment link (public)' })
  @ApiResponse({ status: 200, description: 'Payment link details' })
  async accessPublicLink(
    @Param('shortCode') shortCode: string,
    @Headers('x-visitor-id') visitorId?: string,
  ) {
    return this.paymentLinksService.accessPaymentLink(shortCode, visitorId);
  }

  @Post('public/:shortCode/pay')
  @ApiOperation({ summary: 'Initiate payment (public)' })
  @ApiResponse({ status: 201, description: 'Payment initiated' })
  async initiatePublicPayment(
    @Param('shortCode') shortCode: string,
    @Body() body: {
      amount: number;
      paymentMethod: PaymentMethod;
      customerEmail?: string;
      customerName?: string;
      customerPhone?: string;
      metadata?: Record<string, any>;
    },
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const { link } = await this.paymentLinksService.accessPaymentLink(shortCode);

    return this.paymentLinksService.initiatePayment({
      paymentLinkId: link.id,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      ipAddress: ip,
      userAgent: userAgent,
      metadata: body.metadata,
    });
  }

  @Post('payments/:paymentId/complete')
  @ApiOperation({ summary: 'Complete payment (webhook callback)' })
  @ApiResponse({ status: 200, description: 'Payment completed' })
  async completePayment(
    @Param('paymentId') paymentId: string,
    @Body() body: {
      transactionId: string;
      gatewayReference?: string;
    },
  ) {
    return this.paymentLinksService.completePayment(
      paymentId,
      body.transactionId,
      body.gatewayReference,
    );
  }

  @Post('payments/:paymentId/fail')
  @ApiOperation({ summary: 'Mark payment as failed (webhook callback)' })
  @ApiResponse({ status: 200, description: 'Payment marked as failed' })
  async failPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { reason?: string },
  ) {
    return this.paymentLinksService.failPayment(paymentId, body.reason);
  }
}
