import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import {
  PaymentGatewayService,
  PRICING_PLANS,
  PaymentProvider,
} from './payment-gateway.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentGatewayService', () => {
  let service: PaymentGatewayService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_mock',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
        STRIPE_WEBHOOK_SECRET: 'whsec_mock',
        STRIPE_MODE: 'test',
        PAYPAL_CLIENT_ID: 'paypal_client_mock',
        PAYPAL_SECRET: 'paypal_secret_mock',
        PAYPAL_WEBHOOK_ID: 'paypal_webhook_mock',
        PAYPAL_MODE: 'sandbox',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentGatewayService>(PaymentGatewayService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Stripe provider', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toContain('stripe');
    });

    it('should initialize PayPal provider', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toContain('paypal');
    });

    it('should report Stripe as configured', () => {
      expect(service.isProviderConfigured('stripe')).toBe(true);
    });

    it('should report PayPal as configured', () => {
      expect(service.isProviderConfigured('paypal')).toBe(true);
    });
  });

  describe('payment intents', () => {
    it('should create a payment intent with Stripe', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 4900,
        currency: 'RON',
        description: 'Pro Plan Subscription',
      });

      expect(intent).toBeDefined();
      expect(intent.id).toMatch(/^pi_/);
      expect(intent.provider).toBe('stripe');
      expect(intent.amount).toBe(4900);
      expect(intent.currency).toBe('RON');
      expect(intent.status).toBe('pending');
      expect(intent.clientSecret).toBeDefined();
    });

    it('should create a payment intent with PayPal', async () => {
      const intent = await service.createPaymentIntent('paypal', {
        amount: 14900,
        currency: 'RON',
        customerId: 'customer_123',
      });

      expect(intent.provider).toBe('paypal');
      expect(intent.customerId).toBe('customer_123');
    });

    it('should confirm a payment intent', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 1000,
        currency: 'EUR',
      });

      const confirmed = await service.confirmPaymentIntent(intent.id, 'pm_card_visa');

      expect(['succeeded', 'failed']).toContain(confirmed.status);
      expect(confirmed.paymentMethodId).toBe('pm_card_visa');
    });

    it('should throw when confirming non-existent intent', async () => {
      await expect(
        service.confirmPaymentIntent('pi_nonexistent', 'pm_test')
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel a pending payment intent', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 500,
        currency: 'USD',
      });

      const canceled = await service.cancelPaymentIntent(intent.id);

      expect(canceled.status).toBe('canceled');
    });

    it('should throw when canceling a succeeded payment', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 100,
        currency: 'USD',
      });

      // Force success status
      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }

      await expect(service.cancelPaymentIntent(intent.id)).rejects.toThrow(
        'Cannot cancel a succeeded payment'
      );
    });

    it('should get a payment intent by ID', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 2500,
        currency: 'RON',
      });

      const retrieved = service.getPaymentIntent(intent.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(intent.id);
    });

    it('should return null for non-existent intent', () => {
      const retrieved = service.getPaymentIntent('pi_nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should list payment intents for a customer', async () => {
      const customerId = 'cust_test_list';

      await service.createPaymentIntent('stripe', {
        amount: 100,
        currency: 'RON',
        customerId,
      });

      await service.createPaymentIntent('stripe', {
        amount: 200,
        currency: 'RON',
        customerId,
      });

      const intents = service.listPaymentIntents(customerId);

      expect(intents).toHaveLength(2);
      const amounts = intents.map(i => i.amount).sort((a, b) => a - b);
      expect(amounts).toEqual([100, 200]);
    });
  });

  describe('checkout sessions', () => {
    it('should create a checkout session', async () => {
      const session = await service.createCheckoutSession(
        'stripe',
        4900,
        'RON',
        'https://example.com/success',
        'https://example.com/cancel',
        'customer_123'
      );

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^cs_/);
      expect(session.provider).toBe('stripe');
      expect(session.url).toContain('checkout.stripe.com');
      expect(session.amount).toBe(4900);
      expect(session.status).toBe('open');
      expect(session.successUrl).toBe('https://example.com/success');
      expect(session.cancelUrl).toBe('https://example.com/cancel');
    });

    it('should get a checkout session', async () => {
      const session = await service.createCheckoutSession(
        'paypal',
        14900,
        'RON',
        'https://example.com/success',
        'https://example.com/cancel'
      );

      const retrieved = service.getCheckoutSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should complete a checkout session', async () => {
      const session = await service.createCheckoutSession(
        'stripe',
        4900,
        'RON',
        'https://example.com/success',
        'https://example.com/cancel'
      );

      const completed = await service.completeCheckoutSession(session.id);

      expect(completed.status).toBe('complete');
    });

    it('should throw for non-existent checkout session', async () => {
      await expect(
        service.completeCheckoutSession('cs_nonexistent')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('payment methods', () => {
    const customerId = 'cust_payment_methods';

    it('should add a payment method', async () => {
      const method = await service.addPaymentMethod(
        customerId,
        'stripe',
        'card',
        { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 }
      );

      expect(method).toBeDefined();
      expect(method.id).toMatch(/^pm_/);
      expect(method.type).toBe('card');
      expect(method.card?.brand).toBe('visa');
      expect(method.card?.last4).toBe('4242');
      expect(method.isDefault).toBe(true); // First method is default
    });

    it('should mark second method as non-default', async () => {
      const cust = 'cust_two_methods';

      await service.addPaymentMethod(cust, 'stripe', 'card');
      const second = await service.addPaymentMethod(cust, 'stripe', 'card');

      expect(second.isDefault).toBe(false);
    });

    it('should list payment methods', async () => {
      const cust = 'cust_list_methods';

      await service.addPaymentMethod(cust, 'stripe', 'card');
      await service.addPaymentMethod(cust, 'paypal', 'paypal');

      const methods = service.listPaymentMethods(cust);

      expect(methods).toHaveLength(2);
    });

    it('should return empty array for customer without methods', () => {
      const methods = service.listPaymentMethods('cust_no_methods');
      expect(methods).toHaveLength(0);
    });

    it('should set default payment method', async () => {
      const cust = 'cust_default_method';

      await service.addPaymentMethod(cust, 'stripe', 'card');
      const second = await service.addPaymentMethod(cust, 'stripe', 'card');

      const updated = service.setDefaultPaymentMethod(cust, second.id);

      expect(updated?.isDefault).toBe(true);

      const methods = service.listPaymentMethods(cust);
      const defaultCount = methods.filter(m => m.isDefault).length;
      expect(defaultCount).toBe(1);
    });

    it('should return null when setting default for non-existent method', () => {
      const result = service.setDefaultPaymentMethod('cust_test', 'pm_nonexistent');
      expect(result).toBeNull();
    });

    it('should remove a payment method', async () => {
      const cust = 'cust_remove_method';

      const method = await service.addPaymentMethod(cust, 'stripe', 'card');
      const removed = service.removePaymentMethod(cust, method.id);

      expect(removed).toBe(true);
      expect(service.listPaymentMethods(cust)).toHaveLength(0);
    });

    it('should return false when removing non-existent method', () => {
      const removed = service.removePaymentMethod('cust_test', 'pm_nonexistent');
      expect(removed).toBe(false);
    });

    it('should set new default when removing current default', async () => {
      const cust = 'cust_remove_default';

      const first = await service.addPaymentMethod(cust, 'stripe', 'card');
      await service.addPaymentMethod(cust, 'stripe', 'card');

      service.removePaymentMethod(cust, first.id);

      const methods = service.listPaymentMethods(cust);
      expect(methods).toHaveLength(1);
      expect(methods[0].isDefault).toBe(true);
    });
  });

  describe('subscriptions', () => {
    const customerId = 'cust_subscriptions';

    it('should create a subscription', async () => {
      const subscription = await service.createSubscription(
        'stripe',
        customerId,
        'plan_pro'
      );

      expect(subscription).toBeDefined();
      expect(subscription.id).toMatch(/^sub_/);
      expect(subscription.provider).toBe('stripe');
      expect(subscription.customerId).toBe(customerId);
      expect(subscription.planId).toBe('plan_pro');
      expect(subscription.status).toBe('active');
      expect(subscription.cancelAtPeriodEnd).toBe(false);
    });

    it('should create a subscription with trial', async () => {
      const subscription = await service.createSubscription(
        'stripe',
        'cust_trial',
        'plan_business',
        14
      );

      expect(subscription.status).toBe('trialing');
      expect(subscription.trialEnd).toBeDefined();
    });

    it('should get subscription by ID', async () => {
      const subscription = await service.createSubscription(
        'stripe',
        'cust_get_sub',
        'plan_pro'
      );

      const retrieved = service.getSubscription(subscription.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(subscription.id);
    });

    it('should return null for non-existent subscription', () => {
      const retrieved = service.getSubscription('sub_nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should get subscription for customer', async () => {
      const cust = 'cust_get_by_customer';

      await service.createSubscription('stripe', cust, 'plan_pro');

      const subscription = service.getSubscriptionForCustomer(cust);

      expect(subscription).toBeDefined();
      expect(subscription?.customerId).toBe(cust);
    });

    it('should cancel subscription at period end', async () => {
      const subscription = await service.createSubscription(
        'stripe',
        'cust_cancel_end',
        'plan_pro'
      );

      const canceled = await service.cancelSubscription(subscription.id, false);

      expect(canceled.cancelAtPeriodEnd).toBe(true);
      expect(canceled.status).toBe('active');
    });

    it('should cancel subscription immediately', async () => {
      const subscription = await service.createSubscription(
        'stripe',
        'cust_cancel_now',
        'plan_pro'
      );

      const canceled = await service.cancelSubscription(subscription.id, true);

      expect(canceled.status).toBe('canceled');
    });

    it('should throw when canceling non-existent subscription', async () => {
      await expect(
        service.cancelSubscription('sub_nonexistent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should resume a subscription scheduled for cancellation', async () => {
      const subscription = await service.createSubscription(
        'stripe',
        'cust_resume',
        'plan_pro'
      );

      await service.cancelSubscription(subscription.id, false);
      const resumed = await service.resumeSubscription(subscription.id);

      expect(resumed.status).toBe('active');
      expect(resumed.cancelAtPeriodEnd).toBe(false);
    });

    it('should throw when resuming non-existent subscription', async () => {
      await expect(
        service.resumeSubscription('sub_nonexistent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should change subscription plan', async () => {
      const subscription = await service.createSubscription(
        'stripe',
        'cust_change_plan',
        'plan_pro'
      );

      const changed = await service.changeSubscriptionPlan(
        subscription.id,
        'plan_business'
      );

      expect(changed.planId).toBe('plan_business');
    });

    it('should throw when changing plan on non-existent subscription', async () => {
      await expect(
        service.changeSubscriptionPlan('sub_nonexistent', 'plan_pro')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refunds', () => {
    it('should create a full refund', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 4900,
        currency: 'RON',
      });

      // Set status to succeeded for refund
      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }

      const refund = await service.createRefund(intent.id);

      expect(refund).toBeDefined();
      expect(refund.id).toMatch(/^re_/);
      expect(refund.amount).toBe(4900);
      expect(refund.status).toBe('succeeded');

      // Check intent is marked as refunded
      const updatedIntent = service.getPaymentIntent(intent.id);
      expect(updatedIntent?.status).toBe('refunded');
    });

    it('should create a partial refund', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 10000,
        currency: 'RON',
      });

      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }

      const refund = await service.createRefund(intent.id, 5000, 'customer request');

      expect(refund.amount).toBe(5000);
      expect(refund.reason).toBe('customer request');

      // Partial refund shouldn't mark intent as refunded
      const updatedIntent = service.getPaymentIntent(intent.id);
      expect(updatedIntent?.status).toBe('succeeded');
    });

    it('should throw when refunding non-existent payment', async () => {
      await expect(
        service.createRefund('pi_nonexistent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when refunding non-succeeded payment', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 1000,
        currency: 'RON',
      });

      await expect(
        service.createRefund(intent.id)
      ).rejects.toThrow('Can only refund succeeded payments');
    });

    it('should throw when refund amount exceeds payment', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 1000,
        currency: 'RON',
      });

      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }

      await expect(
        service.createRefund(intent.id, 2000)
      ).rejects.toThrow('Refund amount exceeds payment amount');
    });
  });

  describe('webhooks', () => {
    it('should process a Stripe webhook', async () => {
      const payload = JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      });

      const event = await service.processWebhook('stripe', payload, 'sig_test');

      expect(event).toBeDefined();
      expect(event.id).toMatch(/^evt_/);
      expect(event.provider).toBe('stripe');
      expect(event.type).toBe('payment_intent.succeeded');
      expect(event.processedAt).toBeDefined();
    });

    it('should process a PayPal webhook', async () => {
      const payload = JSON.stringify({
        type: 'customer.subscription.updated',
        data: { subscription_id: 'sub_test' },
      });

      const event = await service.processWebhook('paypal', payload, 'sig_test');

      expect(event.provider).toBe('paypal');
      expect(event.type).toBe('customer.subscription.updated');
    });

    it('should handle unknown event types', async () => {
      const payload = JSON.stringify({
        type: 'unknown.event.type',
        data: {},
      });

      const event = await service.processWebhook('stripe', payload, 'sig_test');

      expect(event.type).toBe('unknown.event.type');
    });
  });

  describe('pricing plans', () => {
    it('should return all pricing plans', () => {
      const plans = service.getPricingPlans();

      expect(plans.gratuit).toBeDefined();
      expect(plans.pro).toBeDefined();
      expect(plans.business).toBeDefined();
    });

    it('should return correct plan prices', () => {
      const plans = service.getPricingPlans();

      expect(plans.gratuit.price).toBe(0);
      expect(plans.pro.price).toBe(49);
      expect(plans.business.price).toBe(149);
    });

    it('should get plan by ID', () => {
      const plan = service.getPlan('plan_pro');

      expect(plan).toBeDefined();
      expect(plan?.name).toBe('Pro');
      expect(plan?.price).toBe(49);
    });

    it('should return null for non-existent plan', () => {
      const plan = service.getPlan('plan_nonexistent');
      expect(plan).toBeNull();
    });

    it('should have features for each plan', () => {
      const plans = service.getPricingPlans();

      expect(plans.gratuit.features.length).toBeGreaterThan(0);
      expect(plans.pro.features.length).toBeGreaterThan(0);
      expect(plans.business.features.length).toBeGreaterThan(0);
    });
  });

  describe('payment statistics', () => {
    beforeEach(async () => {
      // Create some test data
      const intent1 = await service.createPaymentIntent('stripe', {
        amount: 4900,
        currency: 'RON',
      });
      const intent2 = await service.createPaymentIntent('paypal', {
        amount: 14900,
        currency: 'RON',
      });

      // Set statuses
      const i1 = service.getPaymentIntent(intent1.id);
      const i2 = service.getPaymentIntent(intent2.id);
      if (i1) (i1 as any).status = 'succeeded';
      if (i2) (i2 as any).status = 'succeeded';

      await service.createSubscription('stripe', 'cust_stats', 'plan_pro');
    });

    it('should return payment statistics', () => {
      const stats = service.getPaymentStats();

      expect(stats).toBeDefined();
      expect(stats.totalPaymentIntents).toBeGreaterThanOrEqual(2);
      expect(stats.successfulPayments).toBeGreaterThanOrEqual(2);
      expect(stats.totalRevenue).toBeGreaterThanOrEqual(19800);
      expect(stats.activeSubscriptions).toBeGreaterThanOrEqual(1);
    });

    it('should include provider breakdown', () => {
      const stats = service.getPaymentStats();

      expect(stats.byProvider.stripe).toBeDefined();
      expect(stats.byProvider.paypal).toBeDefined();
    });
  });

  describe('currency unit conversion', () => {
    it('should convert to smallest unit for standard currencies', () => {
      expect(service.toSmallestUnit(49.00, 'RON')).toBe(4900);
      expect(service.toSmallestUnit(99.99, 'EUR')).toBe(9999);
      expect(service.toSmallestUnit(149.00, 'USD')).toBe(14900);
    });

    it('should handle zero-decimal currencies', () => {
      expect(service.toSmallestUnit(1000, 'JPY')).toBe(1000);
      expect(service.toSmallestUnit(5000, 'KRW')).toBe(5000);
      expect(service.toSmallestUnit(100000, 'VND')).toBe(100000);
    });

    it('should convert from smallest unit for standard currencies', () => {
      expect(service.fromSmallestUnit(4900, 'RON')).toBe(49);
      expect(service.fromSmallestUnit(9999, 'EUR')).toBe(99.99);
      expect(service.fromSmallestUnit(14900, 'USD')).toBe(149);
    });

    it('should handle zero-decimal currencies in reverse', () => {
      expect(service.fromSmallestUnit(1000, 'JPY')).toBe(1000);
      expect(service.fromSmallestUnit(5000, 'KRW')).toBe(5000);
    });

    it('should round to nearest integer', () => {
      expect(service.toSmallestUnit(49.999, 'RON')).toBe(5000);
      expect(service.toSmallestUnit(49.001, 'RON')).toBe(4900);
    });
  });

  describe('provider info', () => {
    it('should return all provider infos', () => {
      const providers = service.getAllProviderInfos();
      expect(providers.length).toBe(10);
    });

    it('should get provider info by ID', () => {
      const stripe = service.getProviderInfo('stripe');
      expect(stripe).toBeDefined();
      expect(stripe?.name).toBe('Stripe');
      expect(stripe?.supportedCurrencies).toContain('EUR');
    });

    it('should return null for non-existent provider', () => {
      const result = service.getProviderInfo('nonexistent' as any);
      expect(result).toBeNull();
    });

    it('should get Romanian providers', () => {
      const romanian = service.getRomanianProviders();
      expect(romanian.length).toBeGreaterThan(0);
      const ids = romanian.map(p => p.id);
      expect(ids).toContain('netopia');
      expect(ids).toContain('euplatesc');
      expect(ids).toContain('mobilpay');
      expect(ids).toContain('bt_pay');
      expect(ids).toContain('ing_pay');
    });

    it('should get providers by country', () => {
      const romanian = service.getProvidersByCountry('Romania');
      expect(romanian.some(p => p.id === 'netopia')).toBe(true);
    });

    it('should include international providers for any country', () => {
      const providers = service.getProvidersByCountry('Romania');
      expect(providers.some(p => p.id === 'stripe')).toBe(true);
      expect(providers.some(p => p.id === 'paypal')).toBe(true);
    });

    it('should get providers by currency', () => {
      const ronProviders = service.getProvidersByCurrency('RON');
      expect(ronProviders.length).toBeGreaterThan(0);
      expect(ronProviders.every(p => p.supportedCurrencies.includes('RON'))).toBe(true);
    });

    it('should get best provider for amount', () => {
      const result = service.getBestProvider(10000, 'EUR');
      expect(result).toBeDefined();
      expect(result?.provider).toBeDefined();
      expect(result?.estimatedFee).toBeDefined();
    });

    it('should return null when no provider supports currency', () => {
      const result = service.getBestProvider(1000, 'XYZ');
      expect(result).toBeNull();
    });

    it('should calculate fees for provider', () => {
      const fees = service.calculateFees('stripe', 10000);
      expect(fees).toBeDefined();
      expect(fees?.percentage).toBeGreaterThan(0);
      expect(fees?.fixed).toBe(0.25);
      expect(fees?.total).toBe(Math.round(10000 * 1.4 / 100 + 0.25));
    });

    it('should return null for fees of non-existent provider', () => {
      const fees = service.calculateFees('nonexistent' as any, 1000);
      expect(fees).toBeNull();
    });
  });

  describe('disputes', () => {
    let paymentIntentId: string;

    beforeEach(async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 5000,
        currency: 'RON',
      });
      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }
      paymentIntentId = intent.id;
    });

    it('should create a dispute', async () => {
      const dispute = await service.createDispute(paymentIntentId, 'fraudulent');

      expect(dispute).toBeDefined();
      expect(dispute.id).toMatch(/^disp_/);
      expect(dispute.paymentIntentId).toBe(paymentIntentId);
      expect(dispute.reason).toBe('fraudulent');
      expect(dispute.status).toBe('needs_response');
    });

    it('should create dispute with custom amount', async () => {
      const dispute = await service.createDispute(paymentIntentId, 'duplicate', 2500);
      expect(dispute.amount).toBe(2500);
    });

    it('should throw when disputing non-existent payment', async () => {
      await expect(
        service.createDispute('pi_nonexistent', 'fraudulent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when disputing non-succeeded payment', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 1000,
        currency: 'RON',
      });

      await expect(
        service.createDispute(intent.id, 'fraudulent')
      ).rejects.toThrow('Can only dispute succeeded payments');
    });

    it('should get dispute by ID', async () => {
      const dispute = await service.createDispute(paymentIntentId, 'fraudulent');
      const retrieved = service.getDispute(dispute.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(dispute.id);
    });

    it('should return null for non-existent dispute', () => {
      const result = service.getDispute('disp_nonexistent');
      expect(result).toBeNull();
    });

    it('should list all disputes', async () => {
      await service.createDispute(paymentIntentId, 'fraudulent');

      const disputes = service.listDisputes();
      expect(disputes.length).toBeGreaterThan(0);
    });

    it('should list disputes by status', async () => {
      await service.createDispute(paymentIntentId, 'fraudulent');

      const needsResponse = service.listDisputes('needs_response');
      expect(needsResponse.length).toBeGreaterThan(0);
      expect(needsResponse.every(d => d.status === 'needs_response')).toBe(true);
    });

    it('should submit dispute evidence', async () => {
      const dispute = await service.createDispute(paymentIntentId, 'fraudulent');

      const updated = await service.submitDisputeEvidence(dispute.id, {
        customerCommunication: 'Email thread',
        receiptUrl: 'https://example.com/receipt',
      });

      expect(updated.status).toBe('under_review');
      expect(updated.evidence).toBeDefined();
      expect(updated.evidence?.customerCommunication).toBe('Email thread');
    });

    it('should throw when submitting evidence for resolved dispute', async () => {
      const dispute = await service.createDispute(paymentIntentId, 'fraudulent');
      await service.resolveDispute(dispute.id, true);

      await expect(
        service.submitDisputeEvidence(dispute.id, {})
      ).rejects.toThrow('Cannot submit evidence for this dispute');
    });

    it('should resolve dispute as won', async () => {
      const dispute = await service.createDispute(paymentIntentId, 'fraudulent');

      const resolved = await service.resolveDispute(dispute.id, true);

      expect(resolved.status).toBe('won');
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should resolve dispute as lost and refund', async () => {
      const dispute = await service.createDispute(paymentIntentId, 'fraudulent');

      const resolved = await service.resolveDispute(dispute.id, false);

      expect(resolved.status).toBe('lost');

      const intent = service.getPaymentIntent(paymentIntentId);
      expect(intent?.status).toBe('refunded');
    });
  });

  describe('invoices', () => {
    const customerId = 'cust_invoices';

    it('should create an invoice', async () => {
      const invoice = await service.createInvoice(
        'stripe',
        customerId,
        [{ description: 'Pro Plan', quantity: 1, unitAmount: 4900, amount: 4900 }],
        'RON'
      );

      expect(invoice).toBeDefined();
      expect(invoice.id).toMatch(/^inv_/);
      expect(invoice.number).toMatch(/^INV-/);
      expect(invoice.status).toBe('open');
      expect(invoice.amount).toBe(4900);
      expect(invoice.customerId).toBe(customerId);
    });

    it('should create invoice with subscription ID', async () => {
      const invoice = await service.createInvoice(
        'stripe',
        customerId,
        [{ description: 'Monthly', quantity: 1, unitAmount: 4900, amount: 4900 }],
        'RON',
        'sub_123'
      );

      expect(invoice.subscriptionId).toBe('sub_123');
    });

    it('should create invoice with custom due date', async () => {
      const dueDate = new Date('2025-12-31');
      const invoice = await service.createInvoice(
        'stripe',
        customerId,
        [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }],
        'RON',
        undefined,
        dueDate
      );

      expect(invoice.dueDate.getTime()).toBe(dueDate.getTime());
    });

    it('should get invoice by ID', async () => {
      const invoice = await service.createInvoice(
        'stripe',
        customerId,
        [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }],
        'RON'
      );

      const retrieved = service.getInvoice(invoice.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(invoice.id);
    });

    it('should return null for non-existent invoice', () => {
      const result = service.getInvoice('inv_nonexistent');
      expect(result).toBeNull();
    });

    it('should list invoices for customer', async () => {
      const cust = 'cust_list_invoices';
      await service.createInvoice('stripe', cust, [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }], 'RON');
      await service.createInvoice('stripe', cust, [{ description: 'Test 2', quantity: 1, unitAmount: 2000, amount: 2000 }], 'RON');

      const invoices = service.listInvoices(cust);
      expect(invoices.length).toBe(2);
    });

    it('should filter invoices by status', async () => {
      const cust = 'cust_filter_invoices';
      const invoice = await service.createInvoice('stripe', cust, [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }], 'RON');

      const openInvoices = service.listInvoices(cust, 'open');
      expect(openInvoices.length).toBeGreaterThan(0);
      expect(openInvoices.every(i => i.status === 'open')).toBe(true);
    });

    it('should pay an invoice', async () => {
      const invoice = await service.createInvoice(
        'stripe',
        customerId,
        [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }],
        'RON'
      );

      const paid = await service.payInvoice(invoice.id);

      // Note: Payment might fail randomly (90% success rate)
      if (paid.status === 'paid') {
        expect(paid.amountPaid).toBe(1000);
        expect(paid.paidAt).toBeDefined();
      }
    });

    it('should throw when paying non-existent invoice', async () => {
      await expect(
        service.payInvoice('inv_nonexistent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should void an invoice', async () => {
      const invoice = await service.createInvoice(
        'stripe',
        customerId,
        [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }],
        'RON'
      );

      const voided = await service.voidInvoice(invoice.id);
      expect(voided.status).toBe('void');
    });

    it('should throw when voiding paid invoice', async () => {
      const invoice = await service.createInvoice(
        'stripe',
        'cust_void_test',
        [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }],
        'RON'
      );

      // Force paid status
      const retrieved = service.getInvoice(invoice.id);
      if (retrieved) {
        (retrieved as any).status = 'paid';
      }

      await expect(
        service.voidInvoice(invoice.id)
      ).rejects.toThrow('Cannot void a paid invoice');
    });

    it('should add tax to invoice', async () => {
      const invoice = await service.createInvoice(
        'stripe',
        customerId,
        [{ description: 'Test', quantity: 1, unitAmount: 1000, amount: 1000 }],
        'RON'
      );

      const updated = await service.addInvoiceTax(invoice.id, 190);
      expect(updated.tax).toBe(190);
      expect(updated.amount).toBe(1190);
    });
  });

  describe('refunds enhanced', () => {
    it('should list all refunds', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 5000,
        currency: 'RON',
      });
      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }

      await service.createRefund(intent.id, 2500);

      const refunds = service.listRefunds();
      expect(refunds.length).toBeGreaterThan(0);
    });

    it('should filter refunds by payment intent', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 5000,
        currency: 'RON',
      });
      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }

      await service.createRefund(intent.id);

      const refunds = service.listRefunds(intent.id);
      expect(refunds.every(r => r.paymentIntentId === intent.id)).toBe(true);
    });

    it('should get refund by ID', async () => {
      const intent = await service.createPaymentIntent('stripe', {
        amount: 5000,
        currency: 'RON',
      });
      const retrieved = service.getPaymentIntent(intent.id);
      if (retrieved) {
        (retrieved as any).status = 'succeeded';
      }

      const refund = await service.createRefund(intent.id);
      const fetchedRefund = service.getRefund(refund.id);

      expect(fetchedRefund).toBeDefined();
      expect(fetchedRefund?.id).toBe(refund.id);
    });

    it('should return null for non-existent refund', () => {
      const result = service.getRefund('re_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      // Create test data
      const intent1 = await service.createPaymentIntent('stripe', {
        amount: 4900,
        currency: 'RON',
      });
      const intent2 = await service.createPaymentIntent('paypal', {
        amount: 14900,
        currency: 'EUR',
      });

      const i1 = service.getPaymentIntent(intent1.id);
      const i2 = service.getPaymentIntent(intent2.id);
      if (i1) (i1 as any).status = 'succeeded';
      if (i2) (i2 as any).status = 'succeeded';

      await service.createSubscription('stripe', 'cust_analytics', 'plan_pro');
    });

    it('should get payment analytics', () => {
      const analytics = service.getPaymentAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalRevenue).toBeGreaterThan(0);
      expect(analytics.totalTransactions).toBeGreaterThan(0);
      expect(analytics.successRate).toBeGreaterThanOrEqual(0);
      expect(analytics.byProvider).toBeDefined();
      expect(analytics.byCurrency).toBeDefined();
    });

    it('should filter analytics by date range', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date();

      const analytics = service.getPaymentAnalytics(startDate, endDate);
      expect(analytics).toBeDefined();
    });

    it('should include MRR and ARR', () => {
      const analytics = service.getPaymentAnalytics();

      expect(analytics.mrr).toBeDefined();
      expect(analytics.arr).toBe(analytics.mrr * 12);
    });

    it('should get revenue report', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date();

      const report = service.getRevenueReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.grossRevenue).toBeGreaterThanOrEqual(0);
      expect(report.netRevenue).toBeDefined();
      expect(report.totalFees).toBeDefined();
      expect(report.byMonth).toBeDefined();
    });

    it('should get subscription metrics', () => {
      const metrics = service.getSubscriptionMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalSubscriptions).toBeGreaterThanOrEqual(0);
      expect(metrics.mrr).toBeDefined();
      expect(metrics.arr).toBe(metrics.mrr * 12);
      expect(metrics.byPlan).toBeDefined();
    });
  });
});
