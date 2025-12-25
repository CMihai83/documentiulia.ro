import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  PaymentGatewayService,
  PaymentProvider,
  CreatePaymentIntentDto,
  DisputeReason,
  DisputeStatus,
} from './payment-gateway.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payment Gateway')
@Controller('payment-gateway')
export class PaymentGatewayController {
  constructor(private readonly paymentGatewayService: PaymentGatewayService) {}

  // =================== PUBLIC ENDPOINTS ===================

  @Get('providers')
  @ApiOperation({ summary: 'Get available payment providers' })
  @ApiResponse({ status: 200, description: 'List of available providers' })
  getProviders() {
    return {
      providers: this.paymentGatewayService.getAvailableProviders(),
    };
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get pricing plans' })
  @ApiResponse({ status: 200, description: 'Available pricing plans' })
  getPricingPlans() {
    return this.paymentGatewayService.getPricingPlans();
  }

  @Get('plans/:planId')
  @ApiOperation({ summary: 'Get a specific plan' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  getPlan(@Param('planId') planId: string) {
    const plan = this.paymentGatewayService.getPlan(planId);
    if (!plan) {
      return { error: 'Plan not found' };
    }
    return plan;
  }

  // =================== PAYMENT INTENTS ===================

  @Post('intents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['stripe', 'paypal'] },
        amount: { type: 'number' },
        currency: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  async createPaymentIntent(
    @Request() req: any,
    @Body('provider') provider: PaymentProvider,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentGatewayService.createPaymentIntent(provider, {
      ...dto,
      customerId: req.user.userId,
    });
  }

  @Post('intents/:intentId/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiResponse({ status: 200, description: 'Payment intent confirmed' })
  async confirmPaymentIntent(
    @Param('intentId') intentId: string,
    @Body('paymentMethodId') paymentMethodId?: string,
  ) {
    return this.paymentGatewayService.confirmPaymentIntent(intentId, paymentMethodId);
  }

  @Post('intents/:intentId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a payment intent' })
  @ApiResponse({ status: 200, description: 'Payment intent canceled' })
  async cancelPaymentIntent(@Param('intentId') intentId: string) {
    return this.paymentGatewayService.cancelPaymentIntent(intentId);
  }

  @Get('intents/:intentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a payment intent' })
  @ApiResponse({ status: 200, description: 'Payment intent details' })
  getPaymentIntent(@Param('intentId') intentId: string) {
    const intent = this.paymentGatewayService.getPaymentIntent(intentId);
    if (!intent) {
      return { error: 'Payment intent not found' };
    }
    return intent;
  }

  @Get('intents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment intents for current user' })
  @ApiResponse({ status: 200, description: 'List of payment intents' })
  listPaymentIntents(@Request() req: any) {
    return this.paymentGatewayService.listPaymentIntents(req.user.userId);
  }

  // =================== CHECKOUT SESSIONS ===================

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['stripe', 'paypal'] },
        amount: { type: 'number' },
        currency: { type: 'string' },
        successUrl: { type: 'string' },
        cancelUrl: { type: 'string' },
      },
    },
  })
  async createCheckoutSession(
    @Request() req: any,
    @Body('provider') provider: PaymentProvider,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
    @Body('successUrl') successUrl: string,
    @Body('cancelUrl') cancelUrl: string,
    @Body('metadata') metadata?: Record<string, string>,
  ) {
    return this.paymentGatewayService.createCheckoutSession(
      provider,
      amount,
      currency,
      successUrl,
      cancelUrl,
      req.user.userId,
      metadata,
    );
  }

  @Get('checkout/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session details' })
  getCheckoutSession(@Param('sessionId') sessionId: string) {
    const session = this.paymentGatewayService.getCheckoutSession(sessionId);
    if (!session) {
      return { error: 'Checkout session not found' };
    }
    return session;
  }

  // =================== PAYMENT METHODS ===================

  @Post('methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a payment method' })
  @ApiResponse({ status: 201, description: 'Payment method added' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['stripe', 'paypal'] },
        type: { type: 'string' },
        cardDetails: {
          type: 'object',
          properties: {
            brand: { type: 'string' },
            last4: { type: 'string' },
            expMonth: { type: 'number' },
            expYear: { type: 'number' },
          },
        },
      },
    },
  })
  async addPaymentMethod(
    @Request() req: any,
    @Body('provider') provider: PaymentProvider,
    @Body('type') type: string,
    @Body('cardDetails') cardDetails?: { brand: string; last4: string; expMonth: number; expYear: number },
  ) {
    return this.paymentGatewayService.addPaymentMethod(
      req.user.userId,
      provider,
      type,
      cardDetails,
    );
  }

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment methods' })
  @ApiResponse({ status: 200, description: 'List of payment methods' })
  listPaymentMethods(@Request() req: any) {
    return this.paymentGatewayService.listPaymentMethods(req.user.userId);
  }

  @Post('methods/:methodId/default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set default payment method' })
  @ApiResponse({ status: 200, description: 'Default payment method set' })
  setDefaultPaymentMethod(
    @Request() req: any,
    @Param('methodId') methodId: string,
  ) {
    const method = this.paymentGatewayService.setDefaultPaymentMethod(
      req.user.userId,
      methodId,
    );
    if (!method) {
      return { error: 'Payment method not found' };
    }
    return method;
  }

  @Delete('methods/:methodId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method removed' })
  removePaymentMethod(
    @Request() req: any,
    @Param('methodId') methodId: string,
  ) {
    const removed = this.paymentGatewayService.removePaymentMethod(
      req.user.userId,
      methodId,
    );
    return { success: removed };
  }

  // =================== SUBSCRIPTIONS ===================

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['stripe', 'paypal'] },
        planId: { type: 'string' },
        trialDays: { type: 'number' },
      },
    },
  })
  async createSubscription(
    @Request() req: any,
    @Body('provider') provider: PaymentProvider,
    @Body('planId') planId: string,
    @Body('trialDays') trialDays?: number,
  ) {
    return this.paymentGatewayService.createSubscription(
      provider,
      req.user.userId,
      planId,
      trialDays,
    );
  }

  @Get('subscriptions/current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription details' })
  getCurrentSubscription(@Request() req: any) {
    const subscription = this.paymentGatewayService.getSubscriptionForCustomer(req.user.userId);
    if (!subscription) {
      return { subscription: null, plan: 'gratuit' };
    }
    return subscription;
  }

  @Get('subscriptions/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  getSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = this.paymentGatewayService.getSubscription(subscriptionId);
    if (!subscription) {
      return { error: 'Subscription not found' };
    }
    return subscription;
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled' })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body('immediately') immediately?: boolean,
  ) {
    return this.paymentGatewayService.cancelSubscription(subscriptionId, immediately);
  }

  @Post('subscriptions/:subscriptionId/resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription resumed' })
  async resumeSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.paymentGatewayService.resumeSubscription(subscriptionId);
  }

  @Post('subscriptions/:subscriptionId/change-plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription plan changed' })
  async changeSubscriptionPlan(
    @Param('subscriptionId') subscriptionId: string,
    @Body('planId') planId: string,
  ) {
    return this.paymentGatewayService.changeSubscriptionPlan(subscriptionId, planId);
  }

  // =================== REFUNDS ===================

  @Post('refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a refund' })
  @ApiResponse({ status: 201, description: 'Refund created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: { type: 'string' },
        amount: { type: 'number' },
        reason: { type: 'string' },
      },
    },
  })
  async createRefund(
    @Body('paymentIntentId') paymentIntentId: string,
    @Body('amount') amount?: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentGatewayService.createRefund(paymentIntentId, amount, reason);
  }

  // =================== WEBHOOKS ===================

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() body: any,
  ) {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return this.paymentGatewayService.processWebhook('stripe', payload, signature || '');
  }

  @Post('webhooks/paypal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PayPal webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePayPalWebhook(
    @Headers('paypal-transmission-sig') signature: string,
    @Body() body: any,
  ) {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return this.paymentGatewayService.processWebhook('paypal', payload, signature || '');
  }

  // =================== ADMIN ENDPOINTS ===================

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Payment statistics' })
  getPaymentStats() {
    return this.paymentGatewayService.getPaymentStats();
  }

  @Get('provider/:provider/configured')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if provider is configured' })
  @ApiResponse({ status: 200, description: 'Provider configuration status' })
  isProviderConfigured(@Param('provider') provider: PaymentProvider) {
    return {
      provider,
      configured: this.paymentGatewayService.isProviderConfigured(provider),
    };
  }

  // =================== UTILITY ENDPOINTS ===================

  @Get('currency/convert')
  @ApiOperation({ summary: 'Convert amount to smallest currency unit' })
  @ApiResponse({ status: 200, description: 'Converted amount' })
  convertToSmallestUnit(
    @Query('amount') amount: string,
    @Query('currency') currency: string,
  ) {
    const amountNum = parseFloat(amount);
    return {
      original: amountNum,
      currency: currency.toUpperCase(),
      smallestUnit: this.paymentGatewayService.toSmallestUnit(amountNum, currency),
    };
  }

  // =================== PROVIDER INFO ===================

  @Get('providers/all')
  @ApiOperation({ summary: 'Get all payment provider information' })
  @ApiResponse({ status: 200, description: 'All provider information' })
  getAllProviderInfos() {
    return this.paymentGatewayService.getAllProviderInfos();
  }

  @Get('providers/:providerId/info')
  @ApiOperation({ summary: 'Get provider information by ID' })
  @ApiResponse({ status: 200, description: 'Provider information' })
  getProviderInfo(@Param('providerId') providerId: PaymentProvider) {
    const info = this.paymentGatewayService.getProviderInfo(providerId);
    if (!info) {
      return { error: 'Provider not found' };
    }
    return info;
  }

  @Get('providers/romanian')
  @ApiOperation({ summary: 'Get Romanian payment providers' })
  @ApiResponse({ status: 200, description: 'Romanian providers' })
  getRomanianProviders() {
    return this.paymentGatewayService.getRomanianProviders();
  }

  @Get('providers/by-country/:country')
  @ApiOperation({ summary: 'Get providers by country' })
  @ApiResponse({ status: 200, description: 'Providers by country' })
  getProvidersByCountry(@Param('country') country: string) {
    return this.paymentGatewayService.getProvidersByCountry(country);
  }

  @Get('providers/by-currency/:currency')
  @ApiOperation({ summary: 'Get providers supporting currency' })
  @ApiResponse({ status: 200, description: 'Providers by currency' })
  getProvidersByCurrency(@Param('currency') currency: string) {
    return this.paymentGatewayService.getProvidersByCurrency(currency);
  }

  @Get('providers/best')
  @ApiOperation({ summary: 'Get best provider for amount (lowest fees)' })
  @ApiResponse({ status: 200, description: 'Best provider recommendation' })
  getBestProvider(
    @Query('amount') amount: string,
    @Query('currency') currency: string,
  ) {
    const result = this.paymentGatewayService.getBestProvider(parseFloat(amount), currency);
    if (!result) {
      return { error: 'No suitable provider found' };
    }
    return result;
  }

  @Get('providers/:providerId/fees')
  @ApiOperation({ summary: 'Calculate fees for provider' })
  @ApiResponse({ status: 200, description: 'Fee calculation' })
  calculateFees(
    @Param('providerId') providerId: PaymentProvider,
    @Query('amount') amount: string,
  ) {
    const fees = this.paymentGatewayService.calculateFees(providerId, parseFloat(amount));
    if (!fees) {
      return { error: 'Provider not found' };
    }
    return fees;
  }

  // =================== DISPUTES ===================

  @Post('disputes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a dispute' })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: { type: 'string' },
        reason: { type: 'string', enum: ['fraudulent', 'duplicate', 'product_not_received', 'product_unacceptable', 'subscription_cancelled', 'unrecognized', 'other'] },
        amount: { type: 'number' },
      },
    },
  })
  async createDispute(
    @Body('paymentIntentId') paymentIntentId: string,
    @Body('reason') reason: DisputeReason,
    @Body('amount') amount?: number,
  ) {
    return this.paymentGatewayService.createDispute(paymentIntentId, reason, amount);
  }

  @Get('disputes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List disputes' })
  @ApiResponse({ status: 200, description: 'List of disputes' })
  listDisputes(@Query('status') status?: DisputeStatus) {
    return this.paymentGatewayService.listDisputes(status);
  }

  @Get('disputes/:disputeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiResponse({ status: 200, description: 'Dispute details' })
  getDispute(@Param('disputeId') disputeId: string) {
    const dispute = this.paymentGatewayService.getDispute(disputeId);
    if (!dispute) {
      return { error: 'Dispute not found' };
    }
    return dispute;
  }

  @Post('disputes/:disputeId/evidence')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit dispute evidence' })
  @ApiResponse({ status: 200, description: 'Evidence submitted' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customerCommunication: { type: 'string' },
        refundPolicy: { type: 'string' },
        receiptUrl: { type: 'string' },
        shippingDocumentation: { type: 'string' },
      },
    },
  })
  async submitDisputeEvidence(
    @Param('disputeId') disputeId: string,
    @Body() evidence: {
      customerCommunication?: string;
      refundPolicy?: string;
      receiptUrl?: string;
      shippingDocumentation?: string;
    },
  ) {
    return this.paymentGatewayService.submitDisputeEvidence(disputeId, evidence);
  }

  @Post('disputes/:disputeId/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve dispute (admin)' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body('won') won: boolean,
  ) {
    return this.paymentGatewayService.resolveDispute(disputeId, won);
  }

  // =================== INVOICES ===================

  @Post('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['stripe', 'paypal', 'netopia', 'euplatesc', 'mobilpay', 'bt_pay', 'ing_pay', 'revolut'] },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitAmount: { type: 'number' },
              amount: { type: 'number' },
            },
          },
        },
        currency: { type: 'string' },
        subscriptionId: { type: 'string' },
        dueDate: { type: 'string' },
      },
    },
  })
  async createInvoice(
    @Request() req: any,
    @Body('provider') provider: PaymentProvider,
    @Body('lines') lines: { description: string; quantity: number; unitAmount: number; amount: number }[],
    @Body('currency') currency: string,
    @Body('subscriptionId') subscriptionId?: string,
    @Body('dueDate') dueDate?: string,
  ) {
    return this.paymentGatewayService.createInvoice(
      provider,
      req.user.userId,
      lines,
      currency,
      subscriptionId,
      dueDate ? new Date(dueDate) : undefined,
    );
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List invoices for current user' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  listInvoices(
    @Request() req: any,
    @Query('status') status?: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible',
  ) {
    return this.paymentGatewayService.listInvoices(req.user.userId, status);
  }

  @Get('invoices/:invoiceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  getInvoice(@Param('invoiceId') invoiceId: string) {
    const invoice = this.paymentGatewayService.getInvoice(invoiceId);
    if (!invoice) {
      return { error: 'Invoice not found' };
    }
    return invoice;
  }

  @Post('invoices/:invoiceId/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice paid' })
  async payInvoice(
    @Param('invoiceId') invoiceId: string,
    @Body('paymentMethodId') paymentMethodId?: string,
  ) {
    return this.paymentGatewayService.payInvoice(invoiceId, paymentMethodId);
  }

  @Post('invoices/:invoiceId/void')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Void an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice voided' })
  async voidInvoice(@Param('invoiceId') invoiceId: string) {
    return this.paymentGatewayService.voidInvoice(invoiceId);
  }

  @Post('invoices/:invoiceId/tax')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add tax to invoice' })
  @ApiResponse({ status: 200, description: 'Tax added' })
  async addInvoiceTax(
    @Param('invoiceId') invoiceId: string,
    @Body('taxAmount') taxAmount: number,
  ) {
    return this.paymentGatewayService.addInvoiceTax(invoiceId, taxAmount);
  }

  // =================== REFUNDS (ENHANCED) ===================

  @Get('refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List refunds' })
  @ApiResponse({ status: 200, description: 'List of refunds' })
  listRefunds(@Query('paymentIntentId') paymentIntentId?: string) {
    return this.paymentGatewayService.listRefunds(paymentIntentId);
  }

  @Get('refunds/:refundId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get refund by ID' })
  @ApiResponse({ status: 200, description: 'Refund details' })
  getRefund(@Param('refundId') refundId: string) {
    const refund = this.paymentGatewayService.getRefund(refundId);
    if (!refund) {
      return { error: 'Refund not found' };
    }
    return refund;
  }

  // =================== ANALYTICS ===================

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment analytics' })
  @ApiResponse({ status: 200, description: 'Payment analytics' })
  getPaymentAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentGatewayService.getPaymentAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiResponse({ status: 200, description: 'Revenue report' })
  getRevenueReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.paymentGatewayService.getRevenueReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('analytics/subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription metrics' })
  @ApiResponse({ status: 200, description: 'Subscription metrics' })
  getSubscriptionMetrics() {
    return this.paymentGatewayService.getSubscriptionMetrics();
  }
}
