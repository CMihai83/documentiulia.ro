import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Payment Gateway Service
 * Integrates with multiple payment providers for comprehensive payment processing
 *
 * Features:
 * - Multi-provider support (Stripe, PayPal, Romanian providers)
 * - Payment intents and checkout sessions
 * - Webhook handling for payment events
 * - Subscription management with invoicing
 * - Refund processing
 * - Payment method storage
 * - Dispute management
 * - Comprehensive analytics
 */

// =================== TYPES & INTERFACES ===================

export type PaymentProvider = 'stripe' | 'paypal' | 'netopia' | 'euplatesc' | 'mobilpay' | 'bt_pay' | 'ing_pay' | 'revolut' | 'gpay' | 'apple_pay';
export type PaymentIntentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';

export interface PaymentGatewayConfig {
  provider: PaymentProvider;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  sandbox: boolean;
}

export interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}

export interface PaymentIntent {
  id: string;
  provider: PaymentProvider;
  providerId: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  clientSecret?: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckoutSession {
  id: string;
  provider: PaymentProvider;
  providerId: string;
  url: string;
  amount: number;
  currency: string;
  status: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}

export interface PaymentMethod {
  id: string;
  provider: PaymentProvider;
  providerId: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  provider: PaymentProvider;
  providerId: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  createdAt: Date;
}

export interface RefundResult {
  id: string;
  provider: PaymentProvider;
  providerId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  provider: PaymentProvider;
  type: string;
  data: Record<string, any>;
  processedAt?: Date;
}

export type DisputeStatus = 'needs_response' | 'under_review' | 'won' | 'lost';
export type DisputeReason = 'fraudulent' | 'duplicate' | 'product_not_received' | 'product_unacceptable' | 'subscription_cancelled' | 'unrecognized' | 'other';

export interface Dispute {
  id: string;
  provider: PaymentProvider;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: DisputeStatus;
  reason: DisputeReason;
  evidence?: {
    customerCommunication?: string;
    refundPolicy?: string;
    receiptUrl?: string;
    shippingDocumentation?: string;
  };
  evidenceDueBy: Date;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Invoice {
  id: string;
  provider: PaymentProvider;
  customerId: string;
  subscriptionId?: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  amountPaid: number;
  currency: string;
  lines: {
    description: string;
    quantity: number;
    unitAmount: number;
    amount: number;
  }[];
  tax?: number;
  dueDate: Date;
  paidAt?: Date;
  hostedUrl?: string;
  pdfUrl?: string;
  createdAt: Date;
}

export interface ProviderInfo {
  id: PaymentProvider;
  name: string;
  country: string;
  supportedCurrencies: string[];
  supportedMethods: string[];
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  features: {
    subscriptions: boolean;
    refunds: boolean;
    disputes: boolean;
    '3dSecure': boolean;
    saveCards: boolean;
  };
  minAmount: number;
  maxAmount: number;
  settlementDays: number;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  averageTransactionValue: number;
  byProvider: Record<PaymentProvider, {
    revenue: number;
    transactions: number;
    fees: number;
  }>;
  byMethod: Record<string, {
    count: number;
    amount: number;
  }>;
  byCurrency: Record<string, {
    count: number;
    amount: number;
  }>;
  dailyVolume: {
    date: string;
    amount: number;
    count: number;
  }[];
  refundRate: number;
  disputeRate: number;
  mrr: number;
  arr: number;
}

// =================== PRICING PLANS ===================

export const PRICING_PLANS = {
  gratuit: {
    id: 'plan_gratuit',
    name: 'Gratuit',
    price: 0,
    currency: 'RON',
    interval: 'month',
    features: ['Basic VAT calculations', '5 invoices/month', 'OCR (10 pages/month)'],
  },
  pro: {
    id: 'plan_pro',
    name: 'Pro',
    price: 49,
    currency: 'RON',
    interval: 'month',
    features: ['Unlimited invoices', 'Full HR module', 'OCR (100 pages/month)', 'Email support'],
  },
  business: {
    id: 'plan_business',
    name: 'Business',
    price: 149,
    currency: 'RON',
    interval: 'month',
    features: ['Everything in Pro', 'Custom API access', 'SAGA integration', 'Priority support', 'Multi-user'],
  },
};

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  // In-memory storage for demo (in production, use database)
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private checkoutSessions: Map<string, CheckoutSession> = new Map();
  private paymentMethods: Map<string, PaymentMethod[]> = new Map(); // customerId -> methods
  private subscriptions: Map<string, Subscription> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private refunds: Map<string, RefundResult> = new Map();

  // Provider configurations
  private stripeConfig: PaymentGatewayConfig | null = null;
  private paypalConfig: PaymentGatewayConfig | null = null;

  // Provider information for Romanian and international providers
  private providerInfos: Map<PaymentProvider, ProviderInfo> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeProviders();
    this.initializeProviderInfos();
  }

  // =================== INITIALIZATION ===================

  private initializeProviders(): void {
    // Initialize Stripe
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripeConfig = {
        provider: 'stripe',
        apiKey: this.config.get<string>('STRIPE_PUBLISHABLE_KEY') || '',
        secretKey: stripeKey,
        webhookSecret: this.config.get<string>('STRIPE_WEBHOOK_SECRET') || '',
        sandbox: this.config.get<string>('STRIPE_MODE') !== 'live',
      };
      this.logger.log('Stripe payment gateway initialized');
    }

    // Initialize PayPal
    const paypalClientId = this.config.get<string>('PAYPAL_CLIENT_ID');
    if (paypalClientId) {
      this.paypalConfig = {
        provider: 'paypal',
        apiKey: paypalClientId,
        secretKey: this.config.get<string>('PAYPAL_SECRET') || '',
        webhookSecret: this.config.get<string>('PAYPAL_WEBHOOK_ID') || '',
        sandbox: this.config.get<string>('PAYPAL_MODE') !== 'live',
      };
      this.logger.log('PayPal payment gateway initialized');
    }
  }

  private initializeProviderInfos(): void {
    const providers: ProviderInfo[] = [
      {
        id: 'stripe',
        name: 'Stripe',
        country: 'International',
        supportedCurrencies: ['EUR', 'USD', 'GBP', 'RON', 'PLN', 'CZK', 'HUF'],
        supportedMethods: ['card', 'bank_transfer', 'wallet', 'sepa', 'klarna'],
        fees: { percentage: 1.4, fixed: 0.25, currency: 'EUR' },
        features: { subscriptions: true, refunds: true, disputes: true, '3dSecure': true, saveCards: true },
        minAmount: 50,
        maxAmount: 99999999,
        settlementDays: 7,
      },
      {
        id: 'paypal',
        name: 'PayPal',
        country: 'International',
        supportedCurrencies: ['EUR', 'USD', 'GBP', 'RON', 'PLN'],
        supportedMethods: ['wallet', 'card', 'bank_transfer'],
        fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' },
        features: { subscriptions: true, refunds: true, disputes: true, '3dSecure': false, saveCards: false },
        minAmount: 100,
        maxAmount: 1000000000,
        settlementDays: 3,
      },
      {
        id: 'netopia',
        name: 'Netopia Payments',
        country: 'Romania',
        supportedCurrencies: ['RON', 'EUR'],
        supportedMethods: ['card', 'bank_transfer', 'sms'],
        fees: { percentage: 1.5, fixed: 0.15, currency: 'RON' },
        features: { subscriptions: true, refunds: true, disputes: false, '3dSecure': true, saveCards: true },
        minAmount: 100,
        maxAmount: 10000000,
        settlementDays: 2,
      },
      {
        id: 'euplatesc',
        name: 'EuPlătesc',
        country: 'Romania',
        supportedCurrencies: ['RON', 'EUR', 'USD'],
        supportedMethods: ['card', 'bank_transfer'],
        fees: { percentage: 1.8, fixed: 0.10, currency: 'RON' },
        features: { subscriptions: false, refunds: true, disputes: false, '3dSecure': true, saveCards: false },
        minAmount: 100,
        maxAmount: 5000000,
        settlementDays: 3,
      },
      {
        id: 'mobilpay',
        name: 'mobilPay',
        country: 'Romania',
        supportedCurrencies: ['RON', 'EUR'],
        supportedMethods: ['card', 'wallet', 'sms'],
        fees: { percentage: 1.5, fixed: 0.20, currency: 'RON' },
        features: { subscriptions: true, refunds: true, disputes: false, '3dSecure': true, saveCards: true },
        minAmount: 100,
        maxAmount: 10000000,
        settlementDays: 2,
      },
      {
        id: 'bt_pay',
        name: 'BT Pay',
        country: 'Romania',
        supportedCurrencies: ['RON', 'EUR'],
        supportedMethods: ['card', 'bank_transfer', 'wallet'],
        fees: { percentage: 1.2, fixed: 0.10, currency: 'RON' },
        features: { subscriptions: false, refunds: true, disputes: false, '3dSecure': true, saveCards: true },
        minAmount: 100,
        maxAmount: 50000000,
        settlementDays: 1,
      },
      {
        id: 'ing_pay',
        name: 'ING Pay',
        country: 'Romania',
        supportedCurrencies: ['RON', 'EUR'],
        supportedMethods: ['card', 'bank_transfer'],
        fees: { percentage: 1.3, fixed: 0.15, currency: 'RON' },
        features: { subscriptions: false, refunds: true, disputes: false, '3dSecure': true, saveCards: false },
        minAmount: 100,
        maxAmount: 50000000,
        settlementDays: 1,
      },
      {
        id: 'revolut',
        name: 'Revolut Business',
        country: 'International',
        supportedCurrencies: ['EUR', 'USD', 'GBP', 'RON', 'PLN', 'CZK', 'HUF', 'BGN'],
        supportedMethods: ['card', 'bank_transfer', 'wallet'],
        fees: { percentage: 1.0, fixed: 0.20, currency: 'EUR' },
        features: { subscriptions: false, refunds: true, disputes: true, '3dSecure': true, saveCards: true },
        minAmount: 100,
        maxAmount: 50000000,
        settlementDays: 1,
      },
      {
        id: 'gpay',
        name: 'Google Pay',
        country: 'International',
        supportedCurrencies: ['EUR', 'USD', 'GBP', 'RON', 'PLN'],
        supportedMethods: ['wallet'],
        fees: { percentage: 0, fixed: 0, currency: 'EUR' },
        features: { subscriptions: false, refunds: true, disputes: false, '3dSecure': true, saveCards: false },
        minAmount: 0,
        maxAmount: 99999999,
        settlementDays: 0,
      },
      {
        id: 'apple_pay',
        name: 'Apple Pay',
        country: 'International',
        supportedCurrencies: ['EUR', 'USD', 'GBP', 'RON', 'PLN'],
        supportedMethods: ['wallet'],
        fees: { percentage: 0, fixed: 0, currency: 'EUR' },
        features: { subscriptions: false, refunds: true, disputes: false, '3dSecure': true, saveCards: false },
        minAmount: 0,
        maxAmount: 99999999,
        settlementDays: 0,
      },
    ];

    providers.forEach(p => this.providerInfos.set(p.id, p));
    this.logger.log(`Initialized ${this.providerInfos.size} payment providers`);
  }

  // =================== PAYMENT INTENTS ===================

  /**
   * Create a payment intent (Stripe-style)
   */
  async createPaymentIntent(
    provider: PaymentProvider,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntent> {
    const id = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const providerId = `${provider}_${id}`;

    const intent: PaymentIntent = {
      id,
      provider,
      providerId,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      status: 'pending',
      clientSecret: `${id}_secret_${Math.random().toString(36).substr(2, 16)}`,
      customerId: dto.customerId,
      description: dto.description,
      metadata: dto.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.paymentIntents.set(id, intent);
    this.logger.log(`Payment intent created: ${id} - ${dto.amount} ${dto.currency}`);

    return intent;
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    intentId: string,
    paymentMethodId?: string,
  ): Promise<PaymentIntent> {
    const intent = this.paymentIntents.get(intentId);
    if (!intent) {
      throw new BadRequestException('Payment intent not found');
    }

    // Simulate payment processing
    const isSuccessful = Math.random() > 0.1; // 90% success rate for demo

    intent.status = isSuccessful ? 'succeeded' : 'failed';
    intent.paymentMethodId = paymentMethodId;
    intent.updatedAt = new Date();

    this.paymentIntents.set(intentId, intent);
    this.logger.log(`Payment intent ${intentId} ${intent.status}`);

    return intent;
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(intentId: string): Promise<PaymentIntent> {
    const intent = this.paymentIntents.get(intentId);
    if (!intent) {
      throw new BadRequestException('Payment intent not found');
    }

    if (intent.status === 'succeeded') {
      throw new BadRequestException('Cannot cancel a succeeded payment');
    }

    intent.status = 'canceled';
    intent.updatedAt = new Date();

    this.paymentIntents.set(intentId, intent);
    this.logger.log(`Payment intent ${intentId} canceled`);

    return intent;
  }

  /**
   * Get payment intent by ID
   */
  getPaymentIntent(intentId: string): PaymentIntent | null {
    return this.paymentIntents.get(intentId) || null;
  }

  /**
   * List payment intents for a customer
   */
  listPaymentIntents(customerId: string): PaymentIntent[] {
    return Array.from(this.paymentIntents.values())
      .filter((pi) => pi.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== CHECKOUT SESSIONS ===================

  /**
   * Create a checkout session (hosted payment page)
   */
  async createCheckoutSession(
    provider: PaymentProvider,
    amount: number,
    currency: string,
    successUrl: string,
    cancelUrl: string,
    customerId?: string,
    metadata?: Record<string, string>,
  ): Promise<CheckoutSession> {
    const id = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const providerId = `${provider}_${id}`;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30-minute expiry

    const session: CheckoutSession = {
      id,
      provider,
      providerId,
      url: `https://checkout.${provider}.com/${id}`, // Mock URL
      amount,
      currency: currency.toUpperCase(),
      status: 'open',
      customerId,
      successUrl,
      cancelUrl,
      expiresAt,
    };

    this.checkoutSessions.set(id, session);
    this.logger.log(`Checkout session created: ${id}`);

    return session;
  }

  /**
   * Get checkout session by ID
   */
  getCheckoutSession(sessionId: string): CheckoutSession | null {
    return this.checkoutSessions.get(sessionId) || null;
  }

  /**
   * Complete a checkout session (called after successful payment)
   */
  async completeCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const session = this.checkoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('Checkout session not found');
    }

    session.status = 'complete';
    this.checkoutSessions.set(sessionId, session);

    return session;
  }

  // =================== PAYMENT METHODS ===================

  /**
   * Add a payment method for a customer
   */
  async addPaymentMethod(
    customerId: string,
    provider: PaymentProvider,
    type: string,
    cardDetails?: { brand: string; last4: string; expMonth: number; expYear: number },
  ): Promise<PaymentMethod> {
    const id = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const providerId = `${provider}_${id}`;

    const existingMethods = this.paymentMethods.get(customerId) || [];
    const isFirst = existingMethods.length === 0;

    const method: PaymentMethod = {
      id,
      provider,
      providerId,
      type,
      card: cardDetails,
      isDefault: isFirst, // First method is default
      createdAt: new Date(),
    };

    existingMethods.push(method);
    this.paymentMethods.set(customerId, existingMethods);

    this.logger.log(`Payment method ${id} added for customer ${customerId}`);

    return method;
  }

  /**
   * List payment methods for a customer
   */
  listPaymentMethods(customerId: string): PaymentMethod[] {
    return this.paymentMethods.get(customerId) || [];
  }

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod(customerId: string, methodId: string): PaymentMethod | null {
    const methods = this.paymentMethods.get(customerId);
    if (!methods) return null;

    const method = methods.find((m) => m.id === methodId);
    if (!method) return null;

    // Update all methods
    methods.forEach((m) => {
      m.isDefault = m.id === methodId;
    });

    this.paymentMethods.set(customerId, methods);

    return method;
  }

  /**
   * Remove a payment method
   */
  removePaymentMethod(customerId: string, methodId: string): boolean {
    const methods = this.paymentMethods.get(customerId);
    if (!methods) return false;

    const index = methods.findIndex((m) => m.id === methodId);
    if (index === -1) return false;

    methods.splice(index, 1);

    // If removed method was default, set first remaining as default
    if (methods.length > 0 && !methods.some((m) => m.isDefault)) {
      methods[0].isDefault = true;
    }

    this.paymentMethods.set(customerId, methods);

    return true;
  }

  // =================== SUBSCRIPTIONS ===================

  /**
   * Create a subscription
   */
  async createSubscription(
    provider: PaymentProvider,
    customerId: string,
    planId: string,
    trialDays?: number,
  ): Promise<Subscription> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const providerId = `${provider}_${id}`;

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let trialEnd: Date | undefined;
    if (trialDays && trialDays > 0) {
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + trialDays);
    }

    const subscription: Subscription = {
      id,
      provider,
      providerId,
      customerId,
      planId,
      status: trialEnd ? 'trialing' : 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      trialEnd,
      createdAt: now,
    };

    this.subscriptions.set(id, subscription);
    this.logger.log(`Subscription ${id} created for customer ${customerId}`);

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): Subscription | null {
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Get subscription for a customer
   */
  getSubscriptionForCustomer(customerId: string): Subscription | null {
    return Array.from(this.subscriptions.values())
      .find((s) => s.customerId === customerId && s.status !== 'canceled') || null;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false,
  ): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    if (cancelImmediately) {
      subscription.status = 'canceled';
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    this.subscriptions.set(subscriptionId, subscription);
    this.logger.log(`Subscription ${subscriptionId} ${cancelImmediately ? 'canceled' : 'scheduled for cancellation'}`);

    return subscription;
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    if (subscription.status !== 'paused' && !subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not paused or scheduled for cancellation');
    }

    subscription.status = 'active';
    subscription.cancelAtPeriodEnd = false;

    this.subscriptions.set(subscriptionId, subscription);
    this.logger.log(`Subscription ${subscriptionId} resumed`);

    return subscription;
  }

  /**
   * Change subscription plan
   */
  async changeSubscriptionPlan(
    subscriptionId: string,
    newPlanId: string,
  ): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    subscription.planId = newPlanId;
    this.subscriptions.set(subscriptionId, subscription);

    this.logger.log(`Subscription ${subscriptionId} changed to plan ${newPlanId}`);

    return subscription;
  }

  // =================== REFUNDS ===================

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundResult> {
    const intent = this.paymentIntents.get(paymentIntentId);
    if (!intent) {
      throw new BadRequestException('Payment intent not found');
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Can only refund succeeded payments');
    }

    const refundAmount = amount || intent.amount;
    if (refundAmount > intent.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    const id = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const providerId = `${intent.provider}_${id}`;

    // Update payment intent status if full refund
    if (refundAmount === intent.amount) {
      intent.status = 'refunded';
      this.paymentIntents.set(paymentIntentId, intent);
    }

    const refund: RefundResult = {
      id,
      provider: intent.provider,
      providerId,
      paymentIntentId,
      amount: refundAmount,
      currency: intent.currency,
      status: 'succeeded',
      reason,
      createdAt: new Date(),
    };

    // Store the refund
    this.refunds.set(id, refund);

    this.logger.log(`Refund ${id} created for payment ${paymentIntentId} - Amount: ${refundAmount}`);

    return refund;
  }

  // =================== WEBHOOKS ===================

  /**
   * Process webhook event
   */
  async processWebhook(
    provider: PaymentProvider,
    payload: string,
    signature: string,
  ): Promise<WebhookEvent> {
    // In production, verify signature using provider SDK
    const eventData = JSON.parse(payload);

    const event: WebhookEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      type: eventData.type || 'unknown',
      data: eventData,
      processedAt: new Date(),
    };

    this.webhookEvents.set(event.id, event);

    // Handle specific event types
    await this.handleWebhookEvent(event);

    this.logger.log(`Webhook event processed: ${event.type}`);

    return event;
  }

  /**
   * Handle specific webhook events
   */
  private async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Update payment intent status
        break;
      case 'payment_intent.failed':
        // Handle failed payment
        break;
      case 'customer.subscription.updated':
        // Update subscription status
        break;
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        break;
      case 'invoice.payment_failed':
        // Handle failed subscription payment
        break;
      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  }

  // =================== UTILITY METHODS ===================

  /**
   * Get available payment providers
   */
  getAvailableProviders(): PaymentProvider[] {
    const providers: PaymentProvider[] = [];
    if (this.stripeConfig) providers.push('stripe');
    if (this.paypalConfig) providers.push('paypal');
    return providers;
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(provider: PaymentProvider): boolean {
    if (provider === 'stripe') return !!this.stripeConfig;
    if (provider === 'paypal') return !!this.paypalConfig;
    return false;
  }

  /**
   * Get pricing plans
   */
  getPricingPlans(): typeof PRICING_PLANS {
    return PRICING_PLANS;
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): typeof PRICING_PLANS.gratuit | null {
    const plans = Object.values(PRICING_PLANS);
    return plans.find((p) => p.id === planId) || null;
  }

  /**
   * Get payment statistics
   */
  getPaymentStats(): {
    totalPaymentIntents: number;
    successfulPayments: number;
    failedPayments: number;
    totalRevenue: number;
    activeSubscriptions: number;
    byProvider: Partial<Record<PaymentProvider, number>>;
  } {
    const intents = Array.from(this.paymentIntents.values());
    const subs = Array.from(this.subscriptions.values());

    const successful = intents.filter((pi) => pi.status === 'succeeded');

    // Build provider stats
    const byProvider: Partial<Record<PaymentProvider, number>> = {};
    for (const provider of this.providerInfos.keys()) {
      byProvider[provider] = intents.filter((pi) => pi.provider === provider).length;
    }

    return {
      totalPaymentIntents: intents.length,
      successfulPayments: successful.length,
      failedPayments: intents.filter((pi) => pi.status === 'failed').length,
      totalRevenue: successful.reduce((sum, pi) => sum + pi.amount, 0),
      activeSubscriptions: subs.filter((s) => s.status === 'active' || s.status === 'trialing').length,
      byProvider,
    };
  }

  /**
   * Convert amount to smallest currency unit (cents)
   */
  toSmallestUnit(amount: number, currency: string): number {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }

  /**
   * Convert from smallest currency unit
   */
  fromSmallestUnit(amount: number, currency: string): number {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return amount;
    }
    return amount / 100;
  }

  // =================== PROVIDER INFO ===================

  /**
   * Get all provider information
   */
  getAllProviderInfos(): ProviderInfo[] {
    return Array.from(this.providerInfos.values());
  }

  /**
   * Get provider information by ID
   */
  getProviderInfo(providerId: PaymentProvider): ProviderInfo | null {
    return this.providerInfos.get(providerId) || null;
  }

  /**
   * Get providers by country
   */
  getProvidersByCountry(country: string): ProviderInfo[] {
    return Array.from(this.providerInfos.values())
      .filter(p => p.country.toLowerCase() === country.toLowerCase() || p.country === 'International');
  }

  /**
   * Get Romanian payment providers
   */
  getRomanianProviders(): ProviderInfo[] {
    return this.getProvidersByCountry('Romania');
  }

  /**
   * Get providers supporting a currency
   */
  getProvidersByCurrency(currency: string): ProviderInfo[] {
    return Array.from(this.providerInfos.values())
      .filter(p => p.supportedCurrencies.includes(currency.toUpperCase()));
  }

  /**
   * Get best provider for amount (lowest fees)
   */
  getBestProvider(amount: number, currency: string): { provider: ProviderInfo; estimatedFee: number } | null {
    const providers = this.getProvidersByCurrency(currency)
      .filter(p => amount >= p.minAmount && amount <= p.maxAmount);

    if (providers.length === 0) return null;

    const withFees = providers.map(p => ({
      provider: p,
      estimatedFee: Math.round((amount * p.fees.percentage / 100) + p.fees.fixed),
    }));

    withFees.sort((a, b) => a.estimatedFee - b.estimatedFee);
    return withFees[0];
  }

  /**
   * Calculate fees for a provider
   */
  calculateFees(providerId: PaymentProvider, amount: number): { percentage: number; fixed: number; total: number } | null {
    const provider = this.providerInfos.get(providerId);
    if (!provider) return null;

    const percentageFee = amount * provider.fees.percentage / 100;
    const fixedFee = provider.fees.fixed;
    const total = Math.round(percentageFee + fixedFee);

    return { percentage: Math.round(percentageFee), fixed: fixedFee, total };
  }

  // =================== DISPUTES ===================

  /**
   * Create a dispute
   */
  async createDispute(
    paymentIntentId: string,
    reason: DisputeReason,
    amount?: number,
  ): Promise<Dispute> {
    const intent = this.paymentIntents.get(paymentIntentId);
    if (!intent) {
      throw new BadRequestException('Payment intent not found');
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Can only dispute succeeded payments');
    }

    const providerInfo = this.providerInfos.get(intent.provider);
    if (providerInfo && !providerInfo.features.disputes) {
      throw new BadRequestException(`Provider ${intent.provider} does not support disputes`);
    }

    const id = `disp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const evidenceDueBy = new Date();
    evidenceDueBy.setDate(evidenceDueBy.getDate() + 7);

    const dispute: Dispute = {
      id,
      provider: intent.provider,
      paymentIntentId,
      amount: amount || intent.amount,
      currency: intent.currency,
      status: 'needs_response',
      reason,
      evidenceDueBy,
      createdAt: new Date(),
    };

    this.disputes.set(id, dispute);
    this.logger.log(`Dispute ${id} created for payment ${paymentIntentId}`);

    return dispute;
  }

  /**
   * Get dispute by ID
   */
  getDispute(disputeId: string): Dispute | null {
    return this.disputes.get(disputeId) || null;
  }

  /**
   * List all disputes
   */
  listDisputes(status?: DisputeStatus): Dispute[] {
    let disputes = Array.from(this.disputes.values());
    if (status) {
      disputes = disputes.filter(d => d.status === status);
    }
    return disputes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Submit dispute evidence
   */
  async submitDisputeEvidence(
    disputeId: string,
    evidence: Dispute['evidence'],
  ): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new BadRequestException('Dispute not found');
    }

    if (dispute.status !== 'needs_response') {
      throw new BadRequestException('Cannot submit evidence for this dispute');
    }

    dispute.evidence = evidence;
    dispute.status = 'under_review';
    this.disputes.set(disputeId, dispute);

    this.logger.log(`Evidence submitted for dispute ${disputeId}`);

    return dispute;
  }

  /**
   * Resolve dispute (admin action - simulates provider decision)
   */
  async resolveDispute(disputeId: string, won: boolean): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new BadRequestException('Dispute not found');
    }

    dispute.status = won ? 'won' : 'lost';
    dispute.resolvedAt = new Date();
    this.disputes.set(disputeId, dispute);

    // If lost, refund the amount
    if (!won) {
      const intent = this.paymentIntents.get(dispute.paymentIntentId);
      if (intent) {
        intent.status = 'refunded';
        this.paymentIntents.set(dispute.paymentIntentId, intent);
      }
    }

    this.logger.log(`Dispute ${disputeId} resolved: ${dispute.status}`);

    return dispute;
  }

  // =================== INVOICES ===================

  /**
   * Create an invoice
   */
  async createInvoice(
    provider: PaymentProvider,
    customerId: string,
    lines: Invoice['lines'],
    currency: string,
    subscriptionId?: string,
    dueDate?: Date,
  ): Promise<Invoice> {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const number = `INV-${new Date().getFullYear()}-${String(this.invoices.size + 1).padStart(6, '0')}`;

    const amount = lines.reduce((sum, line) => sum + line.amount, 0);
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);

    const invoice: Invoice = {
      id,
      provider,
      customerId,
      subscriptionId,
      number,
      status: 'open',
      amount,
      amountPaid: 0,
      currency: currency.toUpperCase(),
      lines,
      dueDate: dueDate || defaultDueDate,
      hostedUrl: `https://invoices.documentiulia.ro/${id}`,
      pdfUrl: `https://invoices.documentiulia.ro/${id}/pdf`,
      createdAt: new Date(),
    };

    this.invoices.set(id, invoice);
    this.logger.log(`Invoice ${number} created for customer ${customerId}`);

    return invoice;
  }

  /**
   * Get invoice by ID
   */
  getInvoice(invoiceId: string): Invoice | null {
    return this.invoices.get(invoiceId) || null;
  }

  /**
   * List invoices for a customer
   */
  listInvoices(customerId: string, status?: Invoice['status']): Invoice[] {
    let invoices = Array.from(this.invoices.values())
      .filter(i => i.customerId === customerId);

    if (status) {
      invoices = invoices.filter(i => i.status === status);
    }

    return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Pay an invoice
   */
  async payInvoice(invoiceId: string, paymentMethodId?: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (invoice.status !== 'open') {
      throw new BadRequestException('Invoice is not open');
    }

    // Create payment intent for invoice
    const intent = await this.createPaymentIntent(invoice.provider, {
      amount: invoice.amount - invoice.amountPaid,
      currency: invoice.currency,
      customerId: invoice.customerId,
      description: `Payment for invoice ${invoice.number}`,
      metadata: { invoiceId: invoice.id },
    });

    // Confirm payment
    const confirmedIntent = await this.confirmPaymentIntent(intent.id, paymentMethodId);

    if (confirmedIntent.status === 'succeeded') {
      invoice.status = 'paid';
      invoice.amountPaid = invoice.amount;
      invoice.paidAt = new Date();
      this.invoices.set(invoiceId, invoice);
      this.logger.log(`Invoice ${invoice.number} paid`);
    }

    return invoice;
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Cannot void a paid invoice');
    }

    invoice.status = 'void';
    this.invoices.set(invoiceId, invoice);

    this.logger.log(`Invoice ${invoice.number} voided`);

    return invoice;
  }

  /**
   * Add tax to invoice
   */
  async addInvoiceTax(invoiceId: string, taxAmount: number): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (invoice.status !== 'open' && invoice.status !== 'draft') {
      throw new BadRequestException('Cannot modify this invoice');
    }

    invoice.tax = taxAmount;
    invoice.amount = invoice.lines.reduce((sum, l) => sum + l.amount, 0) + taxAmount;
    this.invoices.set(invoiceId, invoice);

    return invoice;
  }

  // =================== REFUNDS (ENHANCED) ===================

  /**
   * List refunds
   */
  listRefunds(paymentIntentId?: string): RefundResult[] {
    let refunds = Array.from(this.refunds.values());
    if (paymentIntentId) {
      refunds = refunds.filter(r => r.paymentIntentId === paymentIntentId);
    }
    return refunds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get refund by ID
   */
  getRefund(refundId: string): RefundResult | null {
    return this.refunds.get(refundId) || null;
  }

  // =================== ANALYTICS ===================

  /**
   * Get comprehensive payment analytics
   */
  getPaymentAnalytics(startDate?: Date, endDate?: Date): PaymentAnalytics {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    const intents = Array.from(this.paymentIntents.values())
      .filter(i => i.createdAt >= start && i.createdAt <= end);
    const subs = Array.from(this.subscriptions.values());
    const refundsArr = Array.from(this.refunds.values())
      .filter(r => r.createdAt >= start && r.createdAt <= end);
    const disputesArr = Array.from(this.disputes.values())
      .filter(d => d.createdAt >= start && d.createdAt <= end);

    const successful = intents.filter(i => i.status === 'succeeded');
    const totalRevenue = successful.reduce((sum, i) => sum + i.amount, 0);
    const totalRefunds = refundsArr.reduce((sum, r) => sum + r.amount, 0);

    // By provider
    const byProvider: PaymentAnalytics['byProvider'] = {} as PaymentAnalytics['byProvider'];
    for (const provider of this.providerInfos.keys()) {
      const providerIntents = successful.filter(i => i.provider === provider);
      const providerInfo = this.providerInfos.get(provider)!;
      const revenue = providerIntents.reduce((sum, i) => sum + i.amount, 0);
      const fees = providerIntents.reduce((sum, i) => {
        const fee = (i.amount * providerInfo.fees.percentage / 100) + providerInfo.fees.fixed;
        return sum + Math.round(fee);
      }, 0);

      byProvider[provider] = {
        revenue,
        transactions: providerIntents.length,
        fees,
      };
    }

    // By method
    const byMethod: PaymentAnalytics['byMethod'] = {};
    const methods = [...new Set(intents.map(i => i.paymentMethodId || 'unknown'))];
    for (const method of methods) {
      const methodIntents = successful.filter(i => (i.paymentMethodId || 'unknown') === method);
      byMethod[method] = {
        count: methodIntents.length,
        amount: methodIntents.reduce((sum, i) => sum + i.amount, 0),
      };
    }

    // By currency
    const byCurrency: PaymentAnalytics['byCurrency'] = {};
    const currencies = [...new Set(intents.map(i => i.currency))];
    for (const currency of currencies) {
      const currencyIntents = successful.filter(i => i.currency === currency);
      byCurrency[currency] = {
        count: currencyIntents.length,
        amount: currencyIntents.reduce((sum, i) => sum + i.amount, 0),
      };
    }

    // Daily volume
    const dailyVolume: PaymentAnalytics['dailyVolume'] = [];
    const dayMap = new Map<string, { amount: number; count: number }>();
    for (const intent of successful) {
      const dateStr = intent.createdAt.toISOString().split('T')[0];
      const existing = dayMap.get(dateStr) || { amount: 0, count: 0 };
      existing.amount += intent.amount;
      existing.count += 1;
      dayMap.set(dateStr, existing);
    }
    for (const [date, data] of Array.from(dayMap.entries()).sort()) {
      dailyVolume.push({ date, ...data });
    }

    // MRR calculation
    const activeSubs = subs.filter(s => s.status === 'active' || s.status === 'trialing');
    let mrr = 0;
    for (const sub of activeSubs) {
      const plan = this.getPlan(sub.planId);
      if (plan) {
        mrr += plan.price;
      }
    }

    return {
      totalRevenue,
      totalTransactions: intents.length,
      successRate: intents.length > 0 ? (successful.length / intents.length) * 100 : 0,
      averageTransactionValue: successful.length > 0 ? totalRevenue / successful.length : 0,
      byProvider,
      byMethod,
      byCurrency,
      dailyVolume,
      refundRate: totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0,
      disputeRate: successful.length > 0 ? (disputesArr.length / successful.length) * 100 : 0,
      mrr,
      arr: mrr * 12,
    };
  }

  /**
   * Get revenue report
   */
  getRevenueReport(startDate: Date, endDate: Date): {
    grossRevenue: number;
    netRevenue: number;
    totalFees: number;
    totalRefunds: number;
    totalDisputes: number;
    byMonth: { month: string; gross: number; net: number; fees: number }[];
  } {
    const intents = Array.from(this.paymentIntents.values())
      .filter(i => i.status === 'succeeded' && i.createdAt >= startDate && i.createdAt <= endDate);
    const refundsArr = Array.from(this.refunds.values())
      .filter(r => r.createdAt >= startDate && r.createdAt <= endDate);
    const disputesArr = Array.from(this.disputes.values())
      .filter(d => d.status === 'lost' && d.createdAt >= startDate && d.createdAt <= endDate);

    const grossRevenue = intents.reduce((sum, i) => sum + i.amount, 0);
    const totalRefunds = refundsArr.reduce((sum, r) => sum + r.amount, 0);
    const totalDisputes = disputesArr.reduce((sum, d) => sum + d.amount, 0);

    // Calculate fees
    let totalFees = 0;
    for (const intent of intents) {
      const providerInfo = this.providerInfos.get(intent.provider);
      if (providerInfo) {
        totalFees += Math.round((intent.amount * providerInfo.fees.percentage / 100) + providerInfo.fees.fixed);
      }
    }

    const netRevenue = grossRevenue - totalFees - totalRefunds - totalDisputes;

    // By month
    const byMonth: { month: string; gross: number; net: number; fees: number }[] = [];
    const monthMap = new Map<string, { gross: number; fees: number }>();

    for (const intent of intents) {
      const monthStr = intent.createdAt.toISOString().slice(0, 7);
      const existing = monthMap.get(monthStr) || { gross: 0, fees: 0 };
      existing.gross += intent.amount;

      const providerInfo = this.providerInfos.get(intent.provider);
      if (providerInfo) {
        existing.fees += Math.round((intent.amount * providerInfo.fees.percentage / 100) + providerInfo.fees.fixed);
      }

      monthMap.set(monthStr, existing);
    }

    for (const [month, data] of Array.from(monthMap.entries()).sort()) {
      byMonth.push({
        month,
        gross: data.gross,
        fees: data.fees,
        net: data.gross - data.fees,
      });
    }

    return {
      grossRevenue,
      netRevenue,
      totalFees,
      totalRefunds,
      totalDisputes,
      byMonth,
    };
  }

  /**
   * Get subscription metrics
   */
  getSubscriptionMetrics(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    canceledSubscriptions: number;
    churnRate: number;
    mrr: number;
    arr: number;
    byPlan: Record<string, number>;
  } {
    const subs = Array.from(this.subscriptions.values());
    const active = subs.filter(s => s.status === 'active');
    const trialing = subs.filter(s => s.status === 'trialing');
    const canceled = subs.filter(s => s.status === 'canceled');

    let mrr = 0;
    const byPlan: Record<string, number> = {};

    for (const sub of [...active, ...trialing]) {
      const plan = this.getPlan(sub.planId);
      if (plan) {
        mrr += plan.price;
        byPlan[plan.name] = (byPlan[plan.name] || 0) + 1;
      }
    }

    const churnRate = subs.length > 0 ? (canceled.length / subs.length) * 100 : 0;

    return {
      totalSubscriptions: subs.length,
      activeSubscriptions: active.length,
      trialingSubscriptions: trialing.length,
      canceledSubscriptions: canceled.length,
      churnRate,
      mrr,
      arr: mrr * 12,
      byPlan,
    };
  }
}
