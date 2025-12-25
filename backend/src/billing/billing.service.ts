import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type PlanType = 'GRATUIT' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'DIRECT_DEBIT';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface Plan {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: PlanType;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
  isPopular: boolean;
}

export interface PlanFeature {
  name: string;
  nameRo: string;
  included: boolean;
  limit?: number;
}

export interface PlanLimits {
  invoices: number;
  customers: number;
  users: number;
  storage: number; // MB
  apiCalls: number;
  integrations: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndDate?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  subscriptionId?: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  items: InvoiceItem[];
  dueDate: Date;
  paidAt?: Date;
  issuedAt: Date;
  periodStart?: Date;
  periodEnd?: Date;
  notes?: string;
  notesRo?: string;
  createdAt: Date;
}

export interface InvoiceItem {
  description: string;
  descriptionRo: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface Usage {
  customerId: string;
  period: { start: Date; end: Date };
  invoicesCreated: number;
  customersAdded: number;
  storageUsed: number;
  apiCallsMade: number;
  lastUpdated: Date;
}

export interface BillingStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
}

// Romanian translations for plan types
const PLAN_TYPE_TRANSLATIONS: Record<PlanType, string> = {
  GRATUIT: 'Gratuit',
  PRO: 'Profesional',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
};

// Romanian translations for billing cycles
const BILLING_CYCLE_TRANSLATIONS: Record<BillingCycle, string> = {
  MONTHLY: 'Lunar',
  QUARTERLY: 'Trimestrial',
  YEARLY: 'Anual',
};

// Romanian translations for payment methods
const PAYMENT_METHOD_TRANSLATIONS: Record<PaymentMethod, string> = {
  CARD: 'Card Bancar',
  BANK_TRANSFER: 'Transfer Bancar',
  DIRECT_DEBIT: 'Debit Direct',
};

// Default pricing plans
const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan-gratuit',
    name: 'Free',
    nameRo: 'Gratuit',
    description: 'Basic features for individuals',
    descriptionRo: 'Funcționalități de bază pentru persoane fizice',
    type: 'GRATUIT',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'RON',
    features: [
      { name: 'Basic VAT Calculator', nameRo: 'Calculator TVA de Bază', included: true },
      { name: 'Up to 10 invoices/month', nameRo: 'Până la 10 facturi/lună', included: true, limit: 10 },
      { name: 'Basic OCR', nameRo: 'OCR de Bază', included: true },
      { name: 'Email Support', nameRo: 'Suport Email', included: true },
      { name: 'ANAF Integration', nameRo: 'Integrare ANAF', included: false },
      { name: 'API Access', nameRo: 'Acces API', included: false },
    ],
    limits: { invoices: 10, customers: 5, users: 1, storage: 100, apiCalls: 100, integrations: 0 },
    isActive: true,
    isPopular: false,
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    nameRo: 'Profesional',
    description: 'Advanced features for professionals',
    descriptionRo: 'Funcționalități avansate pentru profesioniști',
    type: 'PRO',
    priceMonthly: 49,
    priceYearly: 490,
    currency: 'RON',
    features: [
      { name: 'Advanced VAT Calculator', nameRo: 'Calculator TVA Avansat', included: true },
      { name: 'Unlimited invoices', nameRo: 'Facturi Nelimitate', included: true },
      { name: 'Advanced OCR', nameRo: 'OCR Avansat', included: true },
      { name: 'Priority Support', nameRo: 'Suport Prioritar', included: true },
      { name: 'ANAF Integration', nameRo: 'Integrare ANAF', included: true },
      { name: 'Basic API Access', nameRo: 'Acces API de Bază', included: true },
    ],
    limits: { invoices: -1, customers: 100, users: 3, storage: 5000, apiCalls: 10000, integrations: 2 },
    isActive: true,
    isPopular: true,
  },
  {
    id: 'plan-business',
    name: 'Business',
    nameRo: 'Business',
    description: 'Full features for businesses',
    descriptionRo: 'Funcționalități complete pentru afaceri',
    type: 'BUSINESS',
    priceMonthly: 149,
    priceYearly: 1490,
    currency: 'RON',
    features: [
      { name: 'All Pro features', nameRo: 'Toate funcționalitățile Pro', included: true },
      { name: 'Custom API Integration', nameRo: 'Integrare API Personalizată', included: true },
      { name: 'SAGA Integration', nameRo: 'Integrare SAGA', included: true },
      { name: 'Dedicated Support', nameRo: 'Suport Dedicat', included: true },
      { name: 'Multi-user access', nameRo: 'Acces Multi-utilizator', included: true },
      { name: 'Advanced Analytics', nameRo: 'Analiză Avansată', included: true },
    ],
    limits: { invoices: -1, customers: -1, users: 10, storage: 50000, apiCalls: 100000, integrations: 10 },
    isActive: true,
    isPopular: false,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    nameRo: 'Enterprise',
    description: 'Custom solutions for large organizations',
    descriptionRo: 'Soluții personalizate pentru organizații mari',
    type: 'ENTERPRISE',
    priceMonthly: 0, // Custom pricing
    priceYearly: 0,
    currency: 'RON',
    features: [
      { name: 'All Business features', nameRo: 'Toate funcționalitățile Business', included: true },
      { name: 'Custom Development', nameRo: 'Dezvoltare Personalizată', included: true },
      { name: 'SLA Guarantee', nameRo: 'Garanție SLA', included: true },
      { name: '24/7 Support', nameRo: 'Suport 24/7', included: true },
      { name: 'On-premise Option', nameRo: 'Opțiune On-premise', included: true },
      { name: 'Training', nameRo: 'Training', included: true },
    ],
    limits: { invoices: -1, customers: -1, users: -1, storage: -1, apiCalls: -1, integrations: -1 },
    isActive: true,
    isPopular: false,
  },
];

@Injectable()
export class BillingService implements OnModuleInit {
  private plans: Map<string, Plan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private payments: Map<string, Payment> = new Map();
  private usage: Map<string, Usage> = new Map();
  private invoiceCounter = 1000;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    for (const plan of DEFAULT_PLANS) {
      this.plans.set(plan.id, plan);
    }
  }

  // Plan Management
  async getPlan(planId: string): Promise<Plan | undefined> {
    return this.plans.get(planId);
  }

  async listPlans(includeInactive: boolean = false): Promise<Plan[]> {
    let plans = Array.from(this.plans.values());
    if (!includeInactive) {
      plans = plans.filter((p) => p.isActive);
    }
    return plans;
  }

  async getPopularPlan(): Promise<Plan | undefined> {
    return Array.from(this.plans.values()).find((p) => p.isPopular);
  }

  async createPlan(
    name: string,
    nameRo: string,
    type: PlanType,
    priceMonthly: number,
    priceYearly: number,
    features: PlanFeature[],
    limits: PlanLimits,
    options: {
      description?: string;
      descriptionRo?: string;
      isPopular?: boolean;
    } = {},
  ): Promise<Plan> {
    const plan: Plan = {
      id: this.generateId('plan'),
      name,
      nameRo,
      description: options.description || '',
      descriptionRo: options.descriptionRo || '',
      type,
      priceMonthly,
      priceYearly,
      currency: 'RON',
      features,
      limits,
      isActive: true,
      isPopular: options.isPopular || false,
    };

    this.plans.set(plan.id, plan);

    this.eventEmitter.emit('plan.created', {
      planId: plan.id,
      name: plan.name,
      priceMonthly: plan.priceMonthly,
    });

    return plan;
  }

  async updatePlan(planId: string, updates: Partial<Omit<Plan, 'id'>>): Promise<Plan> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const updated: Plan = { ...plan, ...updates };
    this.plans.set(planId, updated);

    return updated;
  }

  // Subscription Management
  async createSubscription(
    customerId: string,
    planId: string,
    billingCycle: BillingCycle,
    options: {
      trialDays?: number;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<Subscription> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, billingCycle);

    const subscription: Subscription = {
      id: this.generateId('sub'),
      customerId,
      planId,
      status: options.trialDays ? 'TRIALING' : 'ACTIVE',
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndDate: options.trialDays
        ? new Date(now.getTime() + options.trialDays * 24 * 60 * 60 * 1000)
        : undefined,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata,
    };

    this.subscriptions.set(subscription.id, subscription);

    // Initialize usage tracking
    this.usage.set(customerId, {
      customerId,
      period: { start: now, end: periodEnd },
      invoicesCreated: 0,
      customersAdded: 0,
      storageUsed: 0,
      apiCallsMade: 0,
      lastUpdated: now,
    });

    this.eventEmitter.emit('subscription.created', {
      subscriptionId: subscription.id,
      customerId,
      planId,
      status: subscription.status,
    });

    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(subscriptionId);
  }

  async getCustomerSubscription(customerId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (s) => s.customerId === customerId && s.status !== 'CANCELLED' && s.status !== 'EXPIRED',
    );
  }

  async listSubscriptions(status?: SubscriptionStatus): Promise<Subscription[]> {
    let subscriptions = Array.from(this.subscriptions.values());
    if (status) {
      subscriptions = subscriptions.filter((s) => s.status === status);
    }
    return subscriptions;
  }

  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (immediate) {
      subscription.status = 'CANCELLED';
      subscription.cancelledAt = new Date();
    } else {
      subscription.cancelAtPeriodEnd = true;
    }
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscriptionId, subscription);

    this.eventEmitter.emit('subscription.cancelled', {
      subscriptionId,
      immediate,
    });

    return subscription;
  }

  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    subscription.status = 'PAUSED';
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscriptionId, subscription);

    return subscription;
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    subscription.status = 'ACTIVE';
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscriptionId, subscription);

    return subscription;
  }

  async upgradePlan(subscriptionId: string, newPlanId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const newPlan = this.plans.get(newPlanId);
    if (!newPlan) {
      throw new Error(`Plan not found: ${newPlanId}`);
    }

    const oldPlanId = subscription.planId;
    subscription.planId = newPlanId;
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscriptionId, subscription);

    this.eventEmitter.emit('subscription.upgraded', {
      subscriptionId,
      oldPlanId,
      newPlanId,
    });

    return subscription;
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    switch (cycle) {
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'YEARLY':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }

  // Invoice Management
  async createInvoice(
    customerId: string,
    items: InvoiceItem[],
    options: {
      subscriptionId?: string;
      taxRate?: number;
      dueDate?: Date;
      notes?: string;
      notesRo?: string;
      periodStart?: Date;
      periodEnd?: Date;
    } = {},
  ): Promise<Invoice> {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = options.taxRate ?? 19; // Romanian VAT
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const invoice: Invoice = {
      id: this.generateId('inv'),
      number: `FV-${new Date().getFullYear()}-${String(++this.invoiceCounter).padStart(5, '0')}`,
      customerId,
      subscriptionId: options.subscriptionId,
      status: 'DRAFT',
      currency: 'RON',
      subtotal,
      tax,
      taxRate,
      total,
      items,
      dueDate: options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      issuedAt: new Date(),
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
      notes: options.notes,
      notesRo: options.notesRo,
      createdAt: new Date(),
    };

    this.invoices.set(invoice.id, invoice);

    this.eventEmitter.emit('invoice.created', {
      invoiceId: invoice.id,
      number: invoice.number,
      total: invoice.total,
    });

    return invoice;
  }

  async getInvoice(invoiceId: string): Promise<Invoice | undefined> {
    return this.invoices.get(invoiceId);
  }

  async listInvoices(options: {
    customerId?: string;
    status?: InvoiceStatus;
    limit?: number;
  } = {}): Promise<Invoice[]> {
    let invoices = Array.from(this.invoices.values());

    if (options.customerId) {
      invoices = invoices.filter((i) => i.customerId === options.customerId);
    }
    if (options.status) {
      invoices = invoices.filter((i) => i.status === options.status);
    }

    invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options.limit) {
      invoices = invoices.slice(0, options.limit);
    }

    return invoices;
  }

  async sendInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    invoice.status = 'SENT';
    this.invoices.set(invoiceId, invoice);

    this.eventEmitter.emit('invoice.sent', {
      invoiceId,
      number: invoice.number,
    });

    return invoice;
  }

  async markInvoicePaid(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    invoice.status = 'PAID';
    invoice.paidAt = new Date();
    this.invoices.set(invoiceId, invoice);

    this.eventEmitter.emit('invoice.paid', {
      invoiceId,
      number: invoice.number,
      amount: invoice.total,
    });

    return invoice;
  }

  async cancelInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    invoice.status = 'CANCELLED';
    this.invoices.set(invoiceId, invoice);

    return invoice;
  }

  // Payment Processing
  async createPayment(
    invoiceId: string,
    method: PaymentMethod,
    options: {
      transactionId?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<Payment> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const payment: Payment = {
      id: this.generateId('pay'),
      invoiceId,
      customerId: invoice.customerId,
      amount: invoice.total,
      currency: invoice.currency,
      method,
      status: 'PENDING',
      transactionId: options.transactionId,
      createdAt: new Date(),
      metadata: options.metadata,
    };

    this.payments.set(payment.id, payment);

    this.eventEmitter.emit('payment.created', {
      paymentId: payment.id,
      invoiceId,
      amount: payment.amount,
    });

    return payment;
  }

  async processPayment(paymentId: string): Promise<Payment> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    payment.status = 'PROCESSING';
    this.payments.set(paymentId, payment);

    // Simulate payment processing
    payment.status = 'COMPLETED';
    payment.processedAt = new Date();
    this.payments.set(paymentId, payment);

    // Mark invoice as paid
    await this.markInvoicePaid(payment.invoiceId);

    this.eventEmitter.emit('payment.completed', {
      paymentId,
      amount: payment.amount,
    });

    return payment;
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.status !== 'COMPLETED') {
      throw new Error('Can only refund completed payments');
    }

    payment.status = 'REFUNDED';
    this.payments.set(paymentId, payment);

    // Update invoice
    const invoice = this.invoices.get(payment.invoiceId);
    if (invoice) {
      invoice.status = 'REFUNDED';
      this.invoices.set(payment.invoiceId, invoice);
    }

    this.eventEmitter.emit('payment.refunded', {
      paymentId,
      amount: payment.amount,
    });

    return payment;
  }

  async getPayment(paymentId: string): Promise<Payment | undefined> {
    return this.payments.get(paymentId);
  }

  async listPayments(customerId?: string): Promise<Payment[]> {
    let payments = Array.from(this.payments.values());
    if (customerId) {
      payments = payments.filter((p) => p.customerId === customerId);
    }
    return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Usage Tracking
  async getUsage(customerId: string): Promise<Usage | undefined> {
    return this.usage.get(customerId);
  }

  async trackUsage(
    customerId: string,
    metric: 'invoices' | 'customers' | 'storage' | 'apiCalls',
    amount: number = 1,
  ): Promise<Usage> {
    let usage = this.usage.get(customerId);
    if (!usage) {
      usage = {
        customerId,
        period: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        invoicesCreated: 0,
        customersAdded: 0,
        storageUsed: 0,
        apiCallsMade: 0,
        lastUpdated: new Date(),
      };
    }

    switch (metric) {
      case 'invoices':
        usage.invoicesCreated += amount;
        break;
      case 'customers':
        usage.customersAdded += amount;
        break;
      case 'storage':
        usage.storageUsed += amount;
        break;
      case 'apiCalls':
        usage.apiCallsMade += amount;
        break;
    }

    usage.lastUpdated = new Date();
    this.usage.set(customerId, usage);

    return usage;
  }

  async checkUsageLimit(customerId: string, metric: keyof PlanLimits): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
  }> {
    const subscription = await this.getCustomerSubscription(customerId);
    if (!subscription) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const plan = this.plans.get(subscription.planId);
    if (!plan) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const usage = this.usage.get(customerId);
    const limit = plan.limits[metric];

    let current = 0;
    if (usage) {
      switch (metric) {
        case 'invoices':
          current = usage.invoicesCreated;
          break;
        case 'customers':
          current = usage.customersAdded;
          break;
        case 'storage':
          current = usage.storageUsed;
          break;
        case 'apiCalls':
          current = usage.apiCallsMade;
          break;
        default:
          current = 0;
      }
    }

    // -1 means unlimited
    const allowed = limit === -1 || current < limit;

    return { allowed, current, limit };
  }

  // Statistics
  async getStats(): Promise<BillingStats> {
    const subscriptions = Array.from(this.subscriptions.values());
    const invoices = Array.from(this.invoices.values());
    const payments = Array.from(this.payments.values()).filter((p) => p.status === 'COMPLETED');

    const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE').length;
    const trialSubscriptions = subscriptions.filter((s) => s.status === 'TRIALING').length;

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate MRR
    let mrr = 0;
    for (const sub of subscriptions.filter((s) => s.status === 'ACTIVE')) {
      const plan = this.plans.get(sub.planId);
      if (plan) {
        switch (sub.billingCycle) {
          case 'MONTHLY':
            mrr += plan.priceMonthly;
            break;
          case 'QUARTERLY':
            mrr += plan.priceMonthly; // Approximate
            break;
          case 'YEARLY':
            mrr += plan.priceYearly / 12;
            break;
        }
      }
    }

    const cancelledLastMonth = subscriptions.filter(
      (s) =>
        s.status === 'CANCELLED' &&
        s.cancelledAt &&
        s.cancelledAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    ).length;

    const churnRate =
      activeSubscriptions > 0 ? (cancelledLastMonth / (activeSubscriptions + cancelledLastMonth)) * 100 : 0;

    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

    return {
      totalRevenue,
      monthlyRecurringRevenue: mrr,
      activeSubscriptions,
      trialSubscriptions,
      churnRate,
      averageRevenuePerUser: arpu,
    };
  }

  // Romanian Localization
  getPlanTypeName(type: PlanType): string {
    return PLAN_TYPE_TRANSLATIONS[type];
  }

  getBillingCycleName(cycle: BillingCycle): string {
    return BILLING_CYCLE_TRANSLATIONS[cycle];
  }

  getPaymentMethodName(method: PaymentMethod): string {
    return PAYMENT_METHOD_TRANSLATIONS[method];
  }

  getAllPlanTypes(): Array<{ type: PlanType; name: string; nameRo: string }> {
    return (Object.keys(PLAN_TYPE_TRANSLATIONS) as PlanType[]).map((type) => ({
      type,
      name: type,
      nameRo: PLAN_TYPE_TRANSLATIONS[type],
    }));
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
