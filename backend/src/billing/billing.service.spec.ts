import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BillingService,
  Plan,
  Subscription,
  Invoice,
  Payment,
  PlanType,
  BillingCycle,
  PaymentMethod,
  PlanFeature,
  PlanLimits,
} from './billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let eventEmitter: EventEmitter2;
  const emittedEvents: Array<{ event: string; payload: any }> = [];

  beforeEach(async () => {
    emittedEvents.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn((event: string, payload: any) => {
              emittedEvents.push({ event, payload });
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    await service.onModuleInit();
  });

  describe('Plan Management', () => {
    it('should initialize with default plans', async () => {
      const plans = await service.listPlans();
      expect(plans.length).toBe(4);
    });

    it('should get plan by ID', async () => {
      const plan = await service.getPlan('plan-gratuit');
      expect(plan).toBeDefined();
      expect(plan?.name).toBe('Free');
      expect(plan?.nameRo).toBe('Gratuit');
    });

    it('should return undefined for non-existent plan', async () => {
      const plan = await service.getPlan('non-existent');
      expect(plan).toBeUndefined();
    });

    it('should list only active plans by default', async () => {
      const plans = await service.listPlans();
      expect(plans.every((p) => p.isActive)).toBe(true);
    });

    it('should include inactive plans when requested', async () => {
      await service.updatePlan('plan-gratuit', { isActive: false });
      const activePlans = await service.listPlans(false);
      const allPlans = await service.listPlans(true);
      expect(allPlans.length).toBe(activePlans.length + 1);
    });

    it('should get popular plan', async () => {
      const popular = await service.getPopularPlan();
      expect(popular).toBeDefined();
      expect(popular?.type).toBe('PRO');
      expect(popular?.isPopular).toBe(true);
    });

    it('should create new plan', async () => {
      const features: PlanFeature[] = [
        { name: 'Test Feature', nameRo: 'Funcționalitate Test', included: true },
      ];
      const limits: PlanLimits = {
        invoices: 50,
        customers: 50,
        users: 5,
        storage: 1000,
        apiCalls: 5000,
        integrations: 5,
      };

      const plan = await service.createPlan(
        'Startup',
        'Startup',
        'PRO',
        29,
        290,
        features,
        limits,
        { description: 'For startups', descriptionRo: 'Pentru startup-uri' },
      );

      expect(plan.id).toMatch(/^plan-/);
      expect(plan.name).toBe('Startup');
      expect(plan.priceMonthly).toBe(29);
      expect(plan.currency).toBe('RON');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'plan.created' }),
      );
    });

    it('should update plan', async () => {
      const updated = await service.updatePlan('plan-pro', {
        priceMonthly: 59,
        priceYearly: 590,
      });

      expect(updated.priceMonthly).toBe(59);
      expect(updated.priceYearly).toBe(590);
    });

    it('should throw error when updating non-existent plan', async () => {
      await expect(
        service.updatePlan('non-existent', { priceMonthly: 100 }),
      ).rejects.toThrow('Plan not found');
    });

    it('should have correct Free plan limits', async () => {
      const plan = await service.getPlan('plan-gratuit');
      expect(plan?.limits.invoices).toBe(10);
      expect(plan?.limits.customers).toBe(5);
      expect(plan?.limits.users).toBe(1);
    });

    it('should have unlimited features for Pro plan', async () => {
      const plan = await service.getPlan('plan-pro');
      expect(plan?.limits.invoices).toBe(-1); // unlimited
      expect(plan?.priceMonthly).toBe(49);
      expect(plan?.priceYearly).toBe(490);
    });

    it('should have ANAF integration feature for Pro', async () => {
      const plan = await service.getPlan('plan-pro');
      const anafFeature = plan?.features.find((f) => f.name === 'ANAF Integration');
      expect(anafFeature?.included).toBe(true);
    });

    it('should NOT have ANAF integration for Free plan', async () => {
      const plan = await service.getPlan('plan-gratuit');
      const anafFeature = plan?.features.find((f) => f.name === 'ANAF Integration');
      expect(anafFeature?.included).toBe(false);
    });

    it('should have SAGA integration for Business plan', async () => {
      const plan = await service.getPlan('plan-business');
      const sagaFeature = plan?.features.find((f) => f.name === 'SAGA Integration');
      expect(sagaFeature?.included).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    it('should create subscription', async () => {
      const subscription = await service.createSubscription(
        'cust-1',
        'plan-pro',
        'MONTHLY',
      );

      expect(subscription.id).toMatch(/^sub-/);
      expect(subscription.customerId).toBe('cust-1');
      expect(subscription.planId).toBe('plan-pro');
      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.billingCycle).toBe('MONTHLY');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'subscription.created' }),
      );
    });

    it('should create subscription with trial period', async () => {
      const subscription = await service.createSubscription(
        'cust-2',
        'plan-pro',
        'MONTHLY',
        { trialDays: 14 },
      );

      expect(subscription.status).toBe('TRIALING');
      expect(subscription.trialEndDate).toBeDefined();
      const trialEnd = subscription.trialEndDate!.getTime();
      const expectedEnd = Date.now() + 14 * 24 * 60 * 60 * 1000;
      expect(Math.abs(trialEnd - expectedEnd)).toBeLessThan(1000);
    });

    it('should calculate monthly period end correctly', async () => {
      const subscription = await service.createSubscription(
        'cust-3',
        'plan-pro',
        'MONTHLY',
      );

      const start = subscription.currentPeriodStart;
      const end = subscription.currentPeriodEnd;
      const expectedEnd = new Date(start);
      expectedEnd.setMonth(expectedEnd.getMonth() + 1);

      expect(end.getMonth()).toBe(expectedEnd.getMonth());
    });

    it('should calculate quarterly period end correctly', async () => {
      const subscription = await service.createSubscription(
        'cust-4',
        'plan-pro',
        'QUARTERLY',
      );

      const start = subscription.currentPeriodStart;
      const end = subscription.currentPeriodEnd;
      const expectedMonth = (start.getMonth() + 3) % 12;

      expect(end.getMonth()).toBe(expectedMonth);
    });

    it('should calculate yearly period end correctly', async () => {
      const subscription = await service.createSubscription(
        'cust-5',
        'plan-pro',
        'YEARLY',
      );

      const start = subscription.currentPeriodStart;
      const end = subscription.currentPeriodEnd;

      expect(end.getFullYear()).toBe(start.getFullYear() + 1);
    });

    it('should throw error for non-existent plan', async () => {
      await expect(
        service.createSubscription('cust-6', 'non-existent', 'MONTHLY'),
      ).rejects.toThrow('Plan not found');
    });

    it('should get subscription by ID', async () => {
      const created = await service.createSubscription('cust-7', 'plan-pro', 'MONTHLY');
      const retrieved = await service.getSubscription(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.customerId).toBe('cust-7');
    });

    it('should get customer subscription', async () => {
      await service.createSubscription('cust-8', 'plan-business', 'YEARLY');
      const subscription = await service.getCustomerSubscription('cust-8');

      expect(subscription).toBeDefined();
      expect(subscription?.planId).toBe('plan-business');
    });

    it('should not return cancelled subscription for customer', async () => {
      const sub = await service.createSubscription('cust-9', 'plan-pro', 'MONTHLY');
      await service.cancelSubscription(sub.id, true);

      const active = await service.getCustomerSubscription('cust-9');
      expect(active).toBeUndefined();
    });

    it('should list subscriptions by status', async () => {
      await service.createSubscription('cust-10', 'plan-pro', 'MONTHLY');
      await service.createSubscription('cust-11', 'plan-pro', 'MONTHLY', { trialDays: 14 });

      const active = await service.listSubscriptions('ACTIVE');
      const trialing = await service.listSubscriptions('TRIALING');

      expect(active.length).toBeGreaterThan(0);
      expect(trialing.length).toBeGreaterThan(0);
      expect(active.every((s) => s.status === 'ACTIVE')).toBe(true);
      expect(trialing.every((s) => s.status === 'TRIALING')).toBe(true);
    });

    it('should cancel subscription immediately', async () => {
      const sub = await service.createSubscription('cust-12', 'plan-pro', 'MONTHLY');
      const cancelled = await service.cancelSubscription(sub.id, true);

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelledAt).toBeDefined();
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'subscription.cancelled' }),
      );
    });

    it('should cancel subscription at period end', async () => {
      const sub = await service.createSubscription('cust-13', 'plan-pro', 'MONTHLY');
      const cancelled = await service.cancelSubscription(sub.id, false);

      expect(cancelled.status).toBe('ACTIVE'); // Still active until period end
      expect(cancelled.cancelAtPeriodEnd).toBe(true);
    });

    it('should pause subscription', async () => {
      const sub = await service.createSubscription('cust-14', 'plan-pro', 'MONTHLY');
      const paused = await service.pauseSubscription(sub.id);

      expect(paused.status).toBe('PAUSED');
    });

    it('should resume subscription', async () => {
      const sub = await service.createSubscription('cust-15', 'plan-pro', 'MONTHLY');
      await service.pauseSubscription(sub.id);
      const resumed = await service.resumeSubscription(sub.id);

      expect(resumed.status).toBe('ACTIVE');
    });

    it('should upgrade plan', async () => {
      const sub = await service.createSubscription('cust-16', 'plan-pro', 'MONTHLY');
      const upgraded = await service.upgradePlan(sub.id, 'plan-business');

      expect(upgraded.planId).toBe('plan-business');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'subscription.upgraded' }),
      );
    });

    it('should throw error when upgrading non-existent subscription', async () => {
      await expect(
        service.upgradePlan('non-existent', 'plan-business'),
      ).rejects.toThrow('Subscription not found');
    });

    it('should throw error when upgrading to non-existent plan', async () => {
      const sub = await service.createSubscription('cust-17', 'plan-pro', 'MONTHLY');
      await expect(
        service.upgradePlan(sub.id, 'non-existent'),
      ).rejects.toThrow('Plan not found');
    });

    it('should include metadata in subscription', async () => {
      const sub = await service.createSubscription(
        'cust-18',
        'plan-pro',
        'MONTHLY',
        { metadata: { source: 'referral', discount: '10%' } },
      );

      expect(sub.metadata?.source).toBe('referral');
      expect(sub.metadata?.discount).toBe('10%');
    });
  });

  describe('Invoice Management', () => {
    it('should create invoice', async () => {
      const items = [
        {
          description: 'Pro Subscription - Monthly',
          descriptionRo: 'Abonament Profesional - Lunar',
          quantity: 1,
          unitPrice: 49,
          amount: 49,
        },
      ];

      const invoice = await service.createInvoice('cust-1', items);

      expect(invoice.id).toMatch(/^inv-/);
      expect(invoice.number).toMatch(/^FV-\d{4}-\d{5}$/);
      expect(invoice.subtotal).toBe(49);
      expect(invoice.taxRate).toBe(19);
      expect(invoice.tax).toBe(9.31);
      expect(invoice.total).toBe(58.31);
      expect(invoice.currency).toBe('RON');
      expect(invoice.status).toBe('DRAFT');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'invoice.created' }),
      );
    });

    it('should calculate VAT at 19% by default', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
      ];

      const invoice = await service.createInvoice('cust-2', items);

      expect(invoice.subtotal).toBe(100);
      expect(invoice.taxRate).toBe(19);
      expect(invoice.tax).toBe(19);
      expect(invoice.total).toBe(119);
    });

    it('should use custom tax rate when specified', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
      ];

      const invoice = await service.createInvoice('cust-3', items, { taxRate: 9 });

      expect(invoice.tax).toBe(9);
      expect(invoice.total).toBe(109);
    });

    it('should calculate total for multiple items', async () => {
      const items = [
        { description: 'Item 1', descriptionRo: 'Articol 1', quantity: 2, unitPrice: 50, amount: 100 },
        { description: 'Item 2', descriptionRo: 'Articol 2', quantity: 1, unitPrice: 30, amount: 30 },
      ];

      const invoice = await service.createInvoice('cust-4', items);

      expect(invoice.subtotal).toBe(130);
      expect(invoice.tax).toBe(24.7); // 19% of 130
      expect(invoice.total).toBe(154.7);
    });

    it('should set default due date to 30 days', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];

      const invoice = await service.createInvoice('cust-5', items);
      const expectedDue = Date.now() + 30 * 24 * 60 * 60 * 1000;

      expect(Math.abs(invoice.dueDate.getTime() - expectedDue)).toBeLessThan(1000);
    });

    it('should use custom due date when specified', async () => {
      const customDue = new Date('2025-12-31');
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];

      const invoice = await service.createInvoice('cust-6', items, { dueDate: customDue });

      expect(invoice.dueDate).toEqual(customDue);
    });

    it('should get invoice by ID', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      const created = await service.createInvoice('cust-7', items);
      const retrieved = await service.getInvoice(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.number).toBe(created.number);
    });

    it('should list invoices by customer', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      await service.createInvoice('cust-8', items);
      await service.createInvoice('cust-8', items);
      await service.createInvoice('cust-9', items);

      const invoices = await service.listInvoices({ customerId: 'cust-8' });

      expect(invoices.length).toBe(2);
      expect(invoices.every((i) => i.customerId === 'cust-8')).toBe(true);
    });

    it('should list invoices by status', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      const inv1 = await service.createInvoice('cust-10', items);
      await service.createInvoice('cust-11', items);
      await service.sendInvoice(inv1.id);

      const sent = await service.listInvoices({ status: 'SENT' });
      const draft = await service.listInvoices({ status: 'DRAFT' });

      expect(sent.length).toBe(1);
      expect(draft.length).toBeGreaterThan(0);
    });

    it('should limit invoice list', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      for (let i = 0; i < 5; i++) {
        await service.createInvoice('cust-12', items);
      }

      const invoices = await service.listInvoices({ customerId: 'cust-12', limit: 3 });

      expect(invoices.length).toBe(3);
    });

    it('should sort invoices by date descending', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      await service.createInvoice('cust-13', items);
      await new Promise((r) => setTimeout(r, 10));
      await service.createInvoice('cust-13', items);

      const invoices = await service.listInvoices({ customerId: 'cust-13' });

      expect(invoices[0].createdAt.getTime()).toBeGreaterThan(invoices[1].createdAt.getTime());
    });

    it('should send invoice', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      const invoice = await service.createInvoice('cust-14', items);
      const sent = await service.sendInvoice(invoice.id);

      expect(sent.status).toBe('SENT');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'invoice.sent' }),
      );
    });

    it('should throw error when sending non-existent invoice', async () => {
      await expect(service.sendInvoice('non-existent')).rejects.toThrow('Invoice not found');
    });

    it('should mark invoice as paid', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      const invoice = await service.createInvoice('cust-15', items);
      const paid = await service.markInvoicePaid(invoice.id);

      expect(paid.status).toBe('PAID');
      expect(paid.paidAt).toBeDefined();
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'invoice.paid' }),
      );
    });

    it('should cancel invoice', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      const invoice = await service.createInvoice('cust-16', items);
      const cancelled = await service.cancelInvoice(invoice.id);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should include subscription ID in invoice', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      const invoice = await service.createInvoice('cust-17', items, {
        subscriptionId: 'sub-123',
      });

      expect(invoice.subscriptionId).toBe('sub-123');
    });

    it('should include billing period in invoice', async () => {
      const periodStart = new Date('2025-12-01');
      const periodEnd = new Date('2025-12-31');
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];

      const invoice = await service.createInvoice('cust-18', items, {
        periodStart,
        periodEnd,
      });

      expect(invoice.periodStart).toEqual(periodStart);
      expect(invoice.periodEnd).toEqual(periodEnd);
    });

    it('should include notes in both languages', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];

      const invoice = await service.createInvoice('cust-19', items, {
        notes: 'Thank you for your business',
        notesRo: 'Vă mulțumim pentru colaborare',
      });

      expect(invoice.notes).toBe('Thank you for your business');
      expect(invoice.notesRo).toBe('Vă mulțumim pentru colaborare');
    });
  });

  describe('Payment Processing', () => {
    let invoiceId: string;

    beforeEach(async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
      ];
      const invoice = await service.createInvoice('cust-pay-1', items);
      invoiceId = invoice.id;
    });

    it('should create payment', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD');

      expect(payment.id).toMatch(/^pay-/);
      expect(payment.invoiceId).toBe(invoiceId);
      expect(payment.amount).toBe(119); // 100 + 19% VAT
      expect(payment.currency).toBe('RON');
      expect(payment.method).toBe('CARD');
      expect(payment.status).toBe('PENDING');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'payment.created' }),
      );
    });

    it('should create payment with bank transfer', async () => {
      const payment = await service.createPayment(invoiceId, 'BANK_TRANSFER');

      expect(payment.method).toBe('BANK_TRANSFER');
    });

    it('should create payment with direct debit', async () => {
      const payment = await service.createPayment(invoiceId, 'DIRECT_DEBIT');

      expect(payment.method).toBe('DIRECT_DEBIT');
    });

    it('should include transaction ID', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD', {
        transactionId: 'tx-12345',
      });

      expect(payment.transactionId).toBe('tx-12345');
    });

    it('should include metadata', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD', {
        metadata: { gateway: 'stripe', processor: 'visa' },
      });

      expect(payment.metadata?.gateway).toBe('stripe');
    });

    it('should throw error for non-existent invoice', async () => {
      await expect(
        service.createPayment('non-existent', 'CARD'),
      ).rejects.toThrow('Invoice not found');
    });

    it('should process payment', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD');
      const processed = await service.processPayment(payment.id);

      expect(processed.status).toBe('COMPLETED');
      expect(processed.processedAt).toBeDefined();
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'payment.completed' }),
      );
    });

    it('should mark invoice as paid when payment is processed', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD');
      await service.processPayment(payment.id);

      const invoice = await service.getInvoice(invoiceId);
      expect(invoice?.status).toBe('PAID');
    });

    it('should throw error when processing non-existent payment', async () => {
      await expect(service.processPayment('non-existent')).rejects.toThrow('Payment not found');
    });

    it('should refund payment', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD');
      await service.processPayment(payment.id);
      const refunded = await service.refundPayment(payment.id);

      expect(refunded.status).toBe('REFUNDED');
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'payment.refunded' }),
      );
    });

    it('should update invoice to refunded status', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD');
      await service.processPayment(payment.id);
      await service.refundPayment(payment.id);

      const invoice = await service.getInvoice(invoiceId);
      expect(invoice?.status).toBe('REFUNDED');
    });

    it('should throw error when refunding non-completed payment', async () => {
      const payment = await service.createPayment(invoiceId, 'CARD');

      await expect(service.refundPayment(payment.id)).rejects.toThrow(
        'Can only refund completed payments',
      );
    });

    it('should get payment by ID', async () => {
      const created = await service.createPayment(invoiceId, 'CARD');
      const retrieved = await service.getPayment(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should list payments by customer', async () => {
      await service.createPayment(invoiceId, 'CARD');

      const items2 = [
        { description: 'Test 2', descriptionRo: 'Test 2', quantity: 1, unitPrice: 50, amount: 50 },
      ];
      const invoice2 = await service.createInvoice('cust-pay-1', items2);
      await service.createPayment(invoice2.id, 'BANK_TRANSFER');

      const payments = await service.listPayments('cust-pay-1');

      expect(payments.length).toBe(2);
    });

    it('should sort payments by date descending', async () => {
      await service.createPayment(invoiceId, 'CARD');
      await new Promise((r) => setTimeout(r, 10));

      const items2 = [
        { description: 'Test 2', descriptionRo: 'Test 2', quantity: 1, unitPrice: 50, amount: 50 },
      ];
      const invoice2 = await service.createInvoice('cust-pay-1', items2);
      await service.createPayment(invoice2.id, 'CARD');

      const payments = await service.listPayments('cust-pay-1');

      expect(payments[0].createdAt.getTime()).toBeGreaterThan(payments[1].createdAt.getTime());
    });
  });

  describe('Usage Tracking', () => {
    beforeEach(async () => {
      await service.createSubscription('cust-usage-1', 'plan-gratuit', 'MONTHLY');
    });

    it('should initialize usage when subscription is created', async () => {
      const usage = await service.getUsage('cust-usage-1');

      expect(usage).toBeDefined();
      expect(usage?.invoicesCreated).toBe(0);
      expect(usage?.customersAdded).toBe(0);
      expect(usage?.storageUsed).toBe(0);
      expect(usage?.apiCallsMade).toBe(0);
    });

    it('should track invoice usage', async () => {
      await service.trackUsage('cust-usage-1', 'invoices', 1);
      const usage = await service.getUsage('cust-usage-1');

      expect(usage?.invoicesCreated).toBe(1);
    });

    it('should track customer usage', async () => {
      await service.trackUsage('cust-usage-1', 'customers', 3);
      const usage = await service.getUsage('cust-usage-1');

      expect(usage?.customersAdded).toBe(3);
    });

    it('should track storage usage', async () => {
      await service.trackUsage('cust-usage-1', 'storage', 50);
      const usage = await service.getUsage('cust-usage-1');

      expect(usage?.storageUsed).toBe(50);
    });

    it('should track API calls usage', async () => {
      await service.trackUsage('cust-usage-1', 'apiCalls', 10);
      const usage = await service.getUsage('cust-usage-1');

      expect(usage?.apiCallsMade).toBe(10);
    });

    it('should accumulate usage', async () => {
      await service.trackUsage('cust-usage-1', 'invoices', 3);
      await service.trackUsage('cust-usage-1', 'invoices', 2);
      const usage = await service.getUsage('cust-usage-1');

      expect(usage?.invoicesCreated).toBe(5);
    });

    it('should update lastUpdated timestamp', async () => {
      const before = await service.getUsage('cust-usage-1');
      await new Promise((r) => setTimeout(r, 10));
      await service.trackUsage('cust-usage-1', 'invoices', 1);
      const after = await service.getUsage('cust-usage-1');

      expect(after!.lastUpdated.getTime()).toBeGreaterThanOrEqual(before!.lastUpdated.getTime());
    });

    it('should create usage if not exists', async () => {
      const usage = await service.trackUsage('new-customer', 'invoices', 1);

      expect(usage).toBeDefined();
      expect(usage.invoicesCreated).toBe(1);
    });

    it('should check usage limit - within limit', async () => {
      await service.trackUsage('cust-usage-1', 'invoices', 5);
      const check = await service.checkUsageLimit('cust-usage-1', 'invoices');

      expect(check.allowed).toBe(true);
      expect(check.current).toBe(5);
      expect(check.limit).toBe(10); // Free plan limit
    });

    it('should check usage limit - at limit', async () => {
      await service.trackUsage('cust-usage-1', 'invoices', 10);
      const check = await service.checkUsageLimit('cust-usage-1', 'invoices');

      expect(check.allowed).toBe(false);
      expect(check.current).toBe(10);
      expect(check.limit).toBe(10);
    });

    it('should check usage limit - over limit', async () => {
      await service.trackUsage('cust-usage-1', 'invoices', 11);
      const check = await service.checkUsageLimit('cust-usage-1', 'invoices');

      expect(check.allowed).toBe(false);
    });

    it('should allow unlimited usage for Pro plan', async () => {
      await service.createSubscription('cust-usage-pro', 'plan-pro', 'MONTHLY');
      await service.trackUsage('cust-usage-pro', 'invoices', 1000);
      const check = await service.checkUsageLimit('cust-usage-pro', 'invoices');

      expect(check.allowed).toBe(true);
      expect(check.limit).toBe(-1); // unlimited
    });

    it('should return not allowed for customer without subscription', async () => {
      const check = await service.checkUsageLimit('no-subscription', 'invoices');

      expect(check.allowed).toBe(false);
      expect(check.limit).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return billing stats', async () => {
      const stats = await service.getStats();

      expect(stats).toHaveProperty('totalRevenue');
      expect(stats).toHaveProperty('monthlyRecurringRevenue');
      expect(stats).toHaveProperty('activeSubscriptions');
      expect(stats).toHaveProperty('trialSubscriptions');
      expect(stats).toHaveProperty('churnRate');
      expect(stats).toHaveProperty('averageRevenuePerUser');
    });

    it('should calculate total revenue from completed payments', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
      ];
      const invoice = await service.createInvoice('cust-stats-1', items);
      const payment = await service.createPayment(invoice.id, 'CARD');
      await service.processPayment(payment.id);

      const stats = await service.getStats();

      expect(stats.totalRevenue).toBe(119); // 100 + 19% VAT
    });

    it('should count active subscriptions', async () => {
      await service.createSubscription('cust-stats-2', 'plan-pro', 'MONTHLY');
      await service.createSubscription('cust-stats-3', 'plan-business', 'YEARLY');

      const stats = await service.getStats();

      expect(stats.activeSubscriptions).toBeGreaterThanOrEqual(2);
    });

    it('should count trial subscriptions', async () => {
      await service.createSubscription('cust-stats-4', 'plan-pro', 'MONTHLY', { trialDays: 14 });

      const stats = await service.getStats();

      expect(stats.trialSubscriptions).toBeGreaterThanOrEqual(1);
    });

    it('should calculate MRR for monthly subscriptions', async () => {
      await service.createSubscription('cust-stats-5', 'plan-pro', 'MONTHLY');

      const stats = await service.getStats();

      expect(stats.monthlyRecurringRevenue).toBeGreaterThanOrEqual(49);
    });

    it('should calculate MRR for yearly subscriptions', async () => {
      await service.createSubscription('cust-stats-6', 'plan-pro', 'YEARLY');

      const stats = await service.getStats();

      // Yearly 490 RON / 12 months = ~40.83 RON/month
      expect(stats.monthlyRecurringRevenue).toBeGreaterThan(0);
    });

    it('should calculate ARPU', async () => {
      await service.createSubscription('cust-stats-7', 'plan-pro', 'MONTHLY');
      await service.createSubscription('cust-stats-8', 'plan-business', 'MONTHLY');

      const stats = await service.getStats();

      // Average of 49 + 149 = 99 RON
      expect(stats.averageRevenuePerUser).toBeGreaterThan(0);
    });

    it('should calculate churn rate', async () => {
      await service.createSubscription('cust-stats-9', 'plan-pro', 'MONTHLY');
      const sub = await service.createSubscription('cust-stats-10', 'plan-pro', 'MONTHLY');
      await service.cancelSubscription(sub.id, true);

      const stats = await service.getStats();

      expect(stats.churnRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Romanian Localization', () => {
    it('should translate plan types', () => {
      expect(service.getPlanTypeName('GRATUIT')).toBe('Gratuit');
      expect(service.getPlanTypeName('PRO')).toBe('Profesional');
      expect(service.getPlanTypeName('BUSINESS')).toBe('Business');
      expect(service.getPlanTypeName('ENTERPRISE')).toBe('Enterprise');
    });

    it('should translate billing cycles', () => {
      expect(service.getBillingCycleName('MONTHLY')).toBe('Lunar');
      expect(service.getBillingCycleName('QUARTERLY')).toBe('Trimestrial');
      expect(service.getBillingCycleName('YEARLY')).toBe('Anual');
    });

    it('should translate payment methods', () => {
      expect(service.getPaymentMethodName('CARD')).toBe('Card Bancar');
      expect(service.getPaymentMethodName('BANK_TRANSFER')).toBe('Transfer Bancar');
      expect(service.getPaymentMethodName('DIRECT_DEBIT')).toBe('Debit Direct');
    });

    it('should get all plan types with translations', () => {
      const planTypes = service.getAllPlanTypes();

      expect(planTypes).toHaveLength(4);
      expect(planTypes).toContainEqual({
        type: 'GRATUIT',
        name: 'GRATUIT',
        nameRo: 'Gratuit',
      });
      expect(planTypes).toContainEqual({
        type: 'PRO',
        name: 'PRO',
        nameRo: 'Profesional',
      });
    });

    it('should have Romanian descriptions for all default plans', async () => {
      const plans = await service.listPlans();

      for (const plan of plans) {
        expect(plan.nameRo).toBeTruthy();
        expect(plan.descriptionRo).toBeTruthy();
        expect(plan.features.every((f) => f.nameRo)).toBe(true);
      }
    });

    it('should use Romanian diacritics correctly', async () => {
      const plan = await service.getPlan('plan-gratuit');

      expect(plan?.descriptionRo).toContain('ă'); // funcționalități
      expect(plan?.descriptionRo).toContain('ț'); // funcționalități
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full subscription lifecycle', async () => {
      // Create subscription with trial
      const sub = await service.createSubscription('cust-lifecycle', 'plan-pro', 'MONTHLY', {
        trialDays: 14,
      });
      expect(sub.status).toBe('TRIALING');

      // Resume to active (simulating trial end)
      await service.resumeSubscription(sub.id);
      const active = await service.getSubscription(sub.id);
      expect(active?.status).toBe('ACTIVE');

      // Upgrade to business
      await service.upgradePlan(sub.id, 'plan-business');
      const upgraded = await service.getSubscription(sub.id);
      expect(upgraded?.planId).toBe('plan-business');

      // Pause subscription
      await service.pauseSubscription(sub.id);
      const paused = await service.getSubscription(sub.id);
      expect(paused?.status).toBe('PAUSED');

      // Resume
      await service.resumeSubscription(sub.id);

      // Cancel at period end
      await service.cancelSubscription(sub.id, false);
      const cancelPending = await service.getSubscription(sub.id);
      expect(cancelPending?.cancelAtPeriodEnd).toBe(true);
      expect(cancelPending?.status).toBe('ACTIVE');
    });

    it('should handle full invoice and payment flow', async () => {
      // Create subscription
      await service.createSubscription('cust-invoice-flow', 'plan-pro', 'MONTHLY');

      // Create invoice
      const items = [
        {
          description: 'Pro Subscription',
          descriptionRo: 'Abonament Profesional',
          quantity: 1,
          unitPrice: 49,
          amount: 49,
        },
      ];
      const invoice = await service.createInvoice('cust-invoice-flow', items, {
        subscriptionId: 'sub-123',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      expect(invoice.status).toBe('DRAFT');

      // Send invoice
      await service.sendInvoice(invoice.id);
      const sent = await service.getInvoice(invoice.id);
      expect(sent?.status).toBe('SENT');

      // Create and process payment
      const payment = await service.createPayment(invoice.id, 'CARD', {
        transactionId: 'tx-stripe-123',
      });
      expect(payment.status).toBe('PENDING');

      await service.processPayment(payment.id);
      const processedPayment = await service.getPayment(payment.id);
      expect(processedPayment?.status).toBe('COMPLETED');

      // Verify invoice is paid
      const paidInvoice = await service.getInvoice(invoice.id);
      expect(paidInvoice?.status).toBe('PAID');
      expect(paidInvoice?.paidAt).toBeDefined();
    });

    it('should handle refund flow', async () => {
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 100, amount: 100 },
      ];
      const invoice = await service.createInvoice('cust-refund', items);
      const payment = await service.createPayment(invoice.id, 'CARD');
      await service.processPayment(payment.id);

      // Verify paid
      let inv = await service.getInvoice(invoice.id);
      expect(inv?.status).toBe('PAID');

      // Refund
      await service.refundPayment(payment.id);

      // Verify refunded
      inv = await service.getInvoice(invoice.id);
      expect(inv?.status).toBe('REFUNDED');

      const pay = await service.getPayment(payment.id);
      expect(pay?.status).toBe('REFUNDED');
    });

    it('should track usage and enforce limits', async () => {
      // Create free subscription
      await service.createSubscription('cust-limits', 'plan-gratuit', 'MONTHLY');

      // Track usage within limits
      for (let i = 0; i < 9; i++) {
        await service.trackUsage('cust-limits', 'invoices', 1);
      }

      let check = await service.checkUsageLimit('cust-limits', 'invoices');
      expect(check.allowed).toBe(true);
      expect(check.current).toBe(9);

      // Hit the limit
      await service.trackUsage('cust-limits', 'invoices', 1);
      check = await service.checkUsageLimit('cust-limits', 'invoices');
      expect(check.allowed).toBe(false);
      expect(check.current).toBe(10);
      expect(check.limit).toBe(10);
    });

    it('should emit all relevant events', async () => {
      emittedEvents.length = 0;

      // Create subscription
      await service.createSubscription('cust-events', 'plan-pro', 'MONTHLY');

      // Create and process invoice/payment
      const items = [
        { description: 'Test', descriptionRo: 'Test', quantity: 1, unitPrice: 49, amount: 49 },
      ];
      const invoice = await service.createInvoice('cust-events', items);
      await service.sendInvoice(invoice.id);
      const payment = await service.createPayment(invoice.id, 'CARD');
      await service.processPayment(payment.id);

      const eventNames = emittedEvents.map((e) => e.event);
      expect(eventNames).toContain('subscription.created');
      expect(eventNames).toContain('invoice.created');
      expect(eventNames).toContain('invoice.sent');
      expect(eventNames).toContain('payment.created');
      expect(eventNames).toContain('payment.completed');
      expect(eventNames).toContain('invoice.paid');
    });
  });
});
