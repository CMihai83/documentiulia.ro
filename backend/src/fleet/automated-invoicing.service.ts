import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';

/**
 * Automated Invoicing Service
 * Automatically generates invoices from completed delivery routes.
 *
 * Features:
 * - Automatic invoice generation for completed routes
 * - Batch invoicing by customer/period
 * - Billing rules and pricing tiers
 * - Recurring invoice schedules
 * - Invoice templates
 * - Auto-send functionality
 * - Payment reminder automation
 */

export type BillingFrequency = 'PER_ROUTE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type PricingModel = 'PER_DELIVERY' | 'PER_KM' | 'PER_HOUR' | 'FLAT_RATE' | 'TIERED';

export interface CustomerBillingConfig {
  id: string;
  customerId: string;
  customerName: string;
  billingFrequency: BillingFrequency;
  pricingModel: PricingModel;
  baseRate: number;
  perDeliveryRate?: number;
  perKmRate?: number;
  perHourRate?: number;
  minimumCharge?: number;
  volumeDiscounts?: VolumeDiscount[];
  paymentTermsDays: number;
  autoGenerateInvoice: boolean;
  autoSendInvoice: boolean;
  emailRecipients: string[];
  currency: string;
  vatRate: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VolumeDiscount {
  minDeliveries: number;
  discountPercent: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  userId: string;
  headerText: string;
  footerText: string;
  logoUrl?: string;
  primaryColor: string;
  bankDetails: {
    bankName: string;
    iban: string;
    bic: string;
    accountHolder: string;
  };
  companyDetails: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    vatId: string;
    registrationNumber: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  isDefault: boolean;
  createdAt: Date;
}

export interface GeneratedInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  periodStart: Date;
  periodEnd: Date;
  routeIds: string[];
  totalDeliveries: number;
  totalKm: number;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'PAID' | 'OVERDUE';
  generatedAt: Date;
  sentAt?: Date;
  dueDate: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  routeId?: string;
  routeDate?: Date;
}

export interface InvoiceGenerationResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  total?: number;
  error?: string;
}

export interface BillingPeriodSummary {
  customerId: string;
  customerName: string;
  periodStart: Date;
  periodEnd: Date;
  totalRoutes: number;
  totalDeliveries: number;
  totalKm: number;
  estimatedTotal: number;
  uninvoicedRoutes: string[];
}

export interface PaymentReminder {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  dueDate: Date;
  daysOverdue: number;
  amount: number;
  reminderLevel: 1 | 2 | 3;
  sentAt?: Date;
  nextReminderDate?: Date;
}

@Injectable()
export class AutomatedInvoicingService {
  private readonly logger = new Logger(AutomatedInvoicingService.name);

  // In-memory storage
  private billingConfigs: Map<string, CustomerBillingConfig[]> = new Map();
  private templates: Map<string, InvoiceTemplate[]> = new Map();
  private generatedInvoices: Map<string, GeneratedInvoice[]> = new Map();
  private configCounter = 0;
  private templateCounter = 0;
  private invoiceCounter = 0;

  // Default pricing (Munich delivery rates)
  private readonly DEFAULT_RATES = {
    PER_DELIVERY: 8.50, // EUR per delivery
    PER_KM: 0.85, // EUR per km
    PER_HOUR: 45, // EUR per hour
    MINIMUM_CHARGE: 25, // EUR minimum per route
    VAT_RATE: 19, // German MwSt
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

  // =================== BILLING CONFIGURATION ===================

  /**
   * Create billing configuration for a customer
   */
  async createBillingConfig(
    userId: string,
    config: {
      customerId: string;
      customerName: string;
      billingFrequency: BillingFrequency;
      pricingModel: PricingModel;
      baseRate?: number;
      perDeliveryRate?: number;
      perKmRate?: number;
      perHourRate?: number;
      minimumCharge?: number;
      volumeDiscounts?: VolumeDiscount[];
      paymentTermsDays?: number;
      autoGenerateInvoice?: boolean;
      autoSendInvoice?: boolean;
      emailRecipients?: string[];
      vatRate?: number;
      notes?: string;
    },
  ): Promise<CustomerBillingConfig> {
    const id = `billing-${++this.configCounter}-${Date.now()}`;

    const billingConfig: CustomerBillingConfig = {
      id,
      customerId: config.customerId,
      customerName: config.customerName,
      billingFrequency: config.billingFrequency,
      pricingModel: config.pricingModel,
      baseRate: config.baseRate || this.getDefaultRate(config.pricingModel),
      perDeliveryRate: config.perDeliveryRate || this.DEFAULT_RATES.PER_DELIVERY,
      perKmRate: config.perKmRate || this.DEFAULT_RATES.PER_KM,
      perHourRate: config.perHourRate || this.DEFAULT_RATES.PER_HOUR,
      minimumCharge: config.minimumCharge || this.DEFAULT_RATES.MINIMUM_CHARGE,
      volumeDiscounts: config.volumeDiscounts || [],
      paymentTermsDays: config.paymentTermsDays || 14,
      autoGenerateInvoice: config.autoGenerateInvoice ?? true,
      autoSendInvoice: config.autoSendInvoice ?? false,
      emailRecipients: config.emailRecipients || [],
      currency: 'EUR',
      vatRate: config.vatRate || this.DEFAULT_RATES.VAT_RATE,
      notes: config.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userConfigs = this.billingConfigs.get(userId) || [];
    userConfigs.push(billingConfig);
    this.billingConfigs.set(userId, userConfigs);

    this.logger.log(`Billing config created for customer ${config.customerName}: ${id}`);

    return billingConfig;
  }

  /**
   * Get billing configuration for a customer
   */
  async getBillingConfig(
    userId: string,
    customerId: string,
  ): Promise<CustomerBillingConfig | null> {
    const configs = this.billingConfigs.get(userId) || [];
    return configs.find(c => c.customerId === customerId) || null;
  }

  /**
   * Get all billing configurations
   */
  async getAllBillingConfigs(userId: string): Promise<CustomerBillingConfig[]> {
    return this.billingConfigs.get(userId) || [];
  }

  /**
   * Update billing configuration
   */
  async updateBillingConfig(
    userId: string,
    configId: string,
    updates: Partial<CustomerBillingConfig>,
  ): Promise<CustomerBillingConfig | null> {
    const configs = this.billingConfigs.get(userId) || [];
    const config = configs.find(c => c.id === configId);

    if (!config) return null;

    Object.assign(config, updates, { updatedAt: new Date() });
    return config;
  }

  // =================== INVOICE TEMPLATES ===================

  /**
   * Create an invoice template
   */
  async createTemplate(
    userId: string,
    template: {
      name: string;
      headerText?: string;
      footerText?: string;
      logoUrl?: string;
      primaryColor?: string;
      bankDetails: {
        bankName: string;
        iban: string;
        bic: string;
        accountHolder: string;
      };
      companyDetails: {
        name: string;
        address: string;
        postalCode: string;
        city: string;
        country?: string;
        vatId: string;
        registrationNumber?: string;
        phone?: string;
        email?: string;
        website?: string;
      };
      isDefault?: boolean;
    },
  ): Promise<InvoiceTemplate> {
    const id = `template-${++this.templateCounter}-${Date.now()}`;

    // If this is default, unset other defaults
    if (template.isDefault) {
      const userTemplates = this.templates.get(userId) || [];
      userTemplates.forEach(t => (t.isDefault = false));
    }

    const invoiceTemplate: InvoiceTemplate = {
      id,
      name: template.name,
      userId,
      headerText: template.headerText || 'Rechnung',
      footerText: template.footerText || 'Vielen Dank für Ihren Auftrag!',
      logoUrl: template.logoUrl,
      primaryColor: template.primaryColor || '#1a56db',
      bankDetails: template.bankDetails,
      companyDetails: {
        ...template.companyDetails,
        country: template.companyDetails.country || 'Deutschland',
        registrationNumber: template.companyDetails.registrationNumber || '',
      },
      isDefault: template.isDefault ?? false,
      createdAt: new Date(),
    };

    const userTemplates = this.templates.get(userId) || [];
    userTemplates.push(invoiceTemplate);
    this.templates.set(userId, userTemplates);

    return invoiceTemplate;
  }

  /**
   * Get templates
   */
  async getTemplates(userId: string): Promise<InvoiceTemplate[]> {
    return this.templates.get(userId) || [];
  }

  /**
   * Get default template
   */
  async getDefaultTemplate(userId: string): Promise<InvoiceTemplate | null> {
    const templates = this.templates.get(userId) || [];
    return templates.find(t => t.isDefault) || templates[0] || null;
  }

  // =================== AUTOMATIC INVOICE GENERATION ===================

  /**
   * Generate invoice for completed routes
   */
  async generateInvoice(
    userId: string,
    params: {
      customerId: string;
      routeIds?: string[];
      periodStart?: Date;
      periodEnd?: Date;
      templateId?: string;
    },
  ): Promise<InvoiceGenerationResult> {
    try {
      // Get billing config
      const billingConfig = await this.getBillingConfig(userId, params.customerId);
      if (!billingConfig) {
        return { success: false, error: 'Keine Abrechnungskonfiguration für diesen Kunden' };
      }

      // Get routes for invoicing
      const periodStart = params.periodStart || this.getDefaultPeriodStart(billingConfig.billingFrequency);
      const periodEnd = params.periodEnd || new Date();

      const routes = await this.prisma.deliveryRoute.findMany({
        where: {
          userId,
          id: params.routeIds ? { in: params.routeIds } : undefined,
          routeDate: { gte: periodStart, lte: periodEnd },
          status: 'COMPLETED',
        },
        include: { stops: true, vehicle: true },
      });

      if (routes.length === 0) {
        return { success: false, error: 'Keine abgeschlossenen Routen im Zeitraum' };
      }

      // Calculate line items and totals
      const lineItems = this.calculateLineItems(routes, billingConfig);
      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

      // Apply volume discounts
      const totalDeliveries = routes.reduce((sum, r) => sum + r.stops.length, 0);
      const discount = this.calculateVolumeDiscount(subtotal, totalDeliveries, billingConfig.volumeDiscounts || []);

      const discountedSubtotal = subtotal - discount;
      const vatAmount = discountedSubtotal * (billingConfig.vatRate / 100);
      const total = discountedSubtotal + vatAmount;

      // Generate invoice number
      const invoiceNumber = this.generateInvoiceNumber(userId);

      // Create invoice
      const invoice: GeneratedInvoice = {
        id: `inv-${++this.invoiceCounter}-${Date.now()}`,
        invoiceNumber,
        customerId: params.customerId,
        customerName: billingConfig.customerName,
        periodStart,
        periodEnd,
        routeIds: routes.map(r => r.id),
        totalDeliveries,
        totalKm: routes.reduce((sum, r) => sum + Number(r.actualDistanceKm || r.plannedDistanceKm || 0), 0),
        lineItems,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        vatRate: billingConfig.vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency: billingConfig.currency,
        status: 'GENERATED',
        generatedAt: new Date(),
        dueDate: new Date(Date.now() + billingConfig.paymentTermsDays * 24 * 60 * 60 * 1000),
      };

      // Store invoice
      const userInvoices = this.generatedInvoices.get(userId) || [];
      userInvoices.push(invoice);
      this.generatedInvoices.set(userId, userInvoices);

      this.logger.log(`Invoice ${invoiceNumber} generated for ${billingConfig.customerName}: ${total} EUR`);

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceNumber,
        total,
      };
    } catch (error) {
      this.logger.error(`Invoice generation failed: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Batch generate invoices for all eligible customers
   */
  async batchGenerateInvoices(
    userId: string,
    options?: {
      billingFrequency?: BillingFrequency;
      periodEnd?: Date;
    },
  ): Promise<{
    generated: InvoiceGenerationResult[];
    skipped: { customerId: string; reason: string }[];
  }> {
    const configs = await this.getAllBillingConfigs(userId);
    const generated: InvoiceGenerationResult[] = [];
    const skipped: { customerId: string; reason: string }[] = [];

    for (const config of configs) {
      if (options?.billingFrequency && config.billingFrequency !== options.billingFrequency) {
        continue;
      }

      if (!config.autoGenerateInvoice) {
        skipped.push({ customerId: config.customerId, reason: 'Auto-generation disabled' });
        continue;
      }

      const result = await this.generateInvoice(userId, {
        customerId: config.customerId,
        periodEnd: options?.periodEnd,
      });

      if (result.success) {
        generated.push(result);
      } else {
        skipped.push({ customerId: config.customerId, reason: result.error || 'Unknown error' });
      }
    }

    return { generated, skipped };
  }

  /**
   * Get uninvoiced routes summary by customer
   */
  async getUninvoicedSummary(
    userId: string,
    options?: { from?: Date; to?: Date },
  ): Promise<BillingPeriodSummary[]> {
    const from = options?.from || new Date(new Date().setDate(1)); // First of month
    const to = options?.to || new Date();

    // Get all completed routes
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
        status: 'COMPLETED',
      },
      include: { stops: true },
    });

    // Get already invoiced route IDs
    const invoicedRouteIds = new Set<string>();
    const userInvoices = this.generatedInvoices.get(userId) || [];
    userInvoices.forEach(inv => inv.routeIds.forEach(id => invoicedRouteIds.add(id)));

    // Filter uninvoiced routes
    const uninvoicedRoutes = routes.filter(r => !invoicedRouteIds.has(r.id));

    // Group by customer (using placeholder customer grouping)
    const configs = await this.getAllBillingConfigs(userId);
    const summaries: BillingPeriodSummary[] = [];

    for (const config of configs) {
      const customerRoutes = uninvoicedRoutes; // In real impl, filter by customer

      if (customerRoutes.length === 0) continue;

      const totalDeliveries = customerRoutes.reduce((sum, r) => sum + r.stops.length, 0);
      const totalKm = customerRoutes.reduce((sum, r) => sum + Number(r.actualDistanceKm || r.plannedDistanceKm || 0), 0);

      summaries.push({
        customerId: config.customerId,
        customerName: config.customerName,
        periodStart: from,
        periodEnd: to,
        totalRoutes: customerRoutes.length,
        totalDeliveries,
        totalKm: Math.round(totalKm),
        estimatedTotal: this.estimateTotal(customerRoutes, config),
        uninvoicedRoutes: customerRoutes.map(r => r.id),
      });
    }

    return summaries;
  }

  // =================== INVOICE MANAGEMENT ===================

  /**
   * Get generated invoices
   */
  async getInvoices(
    userId: string,
    options?: {
      customerId?: string;
      status?: GeneratedInvoice['status'];
      from?: Date;
      to?: Date;
    },
  ): Promise<GeneratedInvoice[]> {
    let invoices = this.generatedInvoices.get(userId) || [];

    if (options?.customerId) {
      invoices = invoices.filter(i => i.customerId === options.customerId);
    }
    if (options?.status) {
      invoices = invoices.filter(i => i.status === options.status);
    }
    if (options?.from) {
      invoices = invoices.filter(i => i.generatedAt >= options.from!);
    }
    if (options?.to) {
      invoices = invoices.filter(i => i.generatedAt <= options.to!);
    }

    return invoices.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(userId: string, invoiceId: string): Promise<GeneratedInvoice | null> {
    const invoices = this.generatedInvoices.get(userId) || [];
    return invoices.find(i => i.id === invoiceId) || null;
  }

  /**
   * Mark invoice as sent
   */
  async markInvoiceSent(userId: string, invoiceId: string): Promise<GeneratedInvoice | null> {
    const invoice = await this.getInvoice(userId, invoiceId);
    if (!invoice) return null;

    invoice.status = 'SENT';
    invoice.sentAt = new Date();
    return invoice;
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(userId: string, invoiceId: string): Promise<GeneratedInvoice | null> {
    const invoice = await this.getInvoice(userId, invoiceId);
    if (!invoice) return null;

    invoice.status = 'PAID';
    return invoice;
  }

  // =================== PAYMENT REMINDERS ===================

  /**
   * Get overdue invoices for reminders
   */
  async getOverdueInvoices(userId: string): Promise<PaymentReminder[]> {
    const invoices = await this.getInvoices(userId, { status: 'SENT' });
    const now = new Date();
    const reminders: PaymentReminder[] = [];

    for (const invoice of invoices) {
      if (invoice.dueDate < now) {
        const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000));

        let reminderLevel: 1 | 2 | 3 = 1;
        if (daysOverdue > 14) reminderLevel = 2;
        if (daysOverdue > 30) reminderLevel = 3;

        reminders.push({
          id: `reminder-${invoice.id}`,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          dueDate: invoice.dueDate,
          daysOverdue,
          amount: invoice.total,
          reminderLevel,
          nextReminderDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        });

        // Update invoice status
        invoice.status = 'OVERDUE';
      }
    }

    return reminders.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  // =================== REPORTING ===================

  /**
   * Get invoicing dashboard
   */
  async getInvoicingDashboard(userId: string): Promise<{
    totalGenerated: number;
    totalSent: number;
    totalPaid: number;
    totalOverdue: number;
    revenueThisMonth: number;
    pendingAmount: number;
    overdueAmount: number;
    recentInvoices: GeneratedInvoice[];
    upcomingReminders: PaymentReminder[];
  }> {
    const invoices = await this.getInvoices(userId);
    const reminders = await this.getOverdueInvoices(userId);

    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    return {
      totalGenerated: invoices.length,
      totalSent: invoices.filter(i => i.status === 'SENT' || i.status === 'PAID' || i.status === 'OVERDUE').length,
      totalPaid: invoices.filter(i => i.status === 'PAID').length,
      totalOverdue: invoices.filter(i => i.status === 'OVERDUE').length,
      revenueThisMonth: invoices
        .filter(i => i.status === 'PAID' && i.generatedAt >= thisMonth)
        .reduce((sum, i) => sum + i.total, 0),
      pendingAmount: invoices
        .filter(i => i.status === 'SENT')
        .reduce((sum, i) => sum + i.total, 0),
      overdueAmount: invoices
        .filter(i => i.status === 'OVERDUE')
        .reduce((sum, i) => sum + i.total, 0),
      recentInvoices: invoices.slice(0, 5),
      upcomingReminders: reminders.slice(0, 5),
    };
  }

  // =================== PRIVATE HELPERS ===================

  private getDefaultRate(model: PricingModel): number {
    switch (model) {
      case 'PER_DELIVERY':
        return this.DEFAULT_RATES.PER_DELIVERY;
      case 'PER_KM':
        return this.DEFAULT_RATES.PER_KM;
      case 'PER_HOUR':
        return this.DEFAULT_RATES.PER_HOUR;
      case 'FLAT_RATE':
        return 100;
      case 'TIERED':
        return this.DEFAULT_RATES.PER_DELIVERY;
      default:
        return this.DEFAULT_RATES.PER_DELIVERY;
    }
  }

  private getDefaultPeriodStart(frequency: BillingFrequency): Date {
    const now = new Date();
    switch (frequency) {
      case 'PER_ROUTE':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      case 'DAILY':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'WEEKLY':
        const dayOfWeek = now.getDay();
        return new Date(now.setDate(now.getDate() - dayOfWeek));
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  private calculateLineItems(routes: any[], config: CustomerBillingConfig): InvoiceLineItem[] {
    const items: InvoiceLineItem[] = [];

    for (const route of routes) {
      const deliveryCount = route.stops?.length || 0;
      const distanceKm = Number(route.actualDistanceKm || route.plannedDistanceKm || 0);

      let total = 0;
      let description = '';
      let quantity = 0;
      let unit = '';
      let unitPrice = 0;

      switch (config.pricingModel) {
        case 'PER_DELIVERY':
          quantity = deliveryCount;
          unit = 'Zustellungen';
          unitPrice = config.perDeliveryRate || this.DEFAULT_RATES.PER_DELIVERY;
          total = quantity * unitPrice;
          description = `Zustellungen Route ${route.routeDate?.toISOString().slice(0, 10) || 'N/A'}`;
          break;

        case 'PER_KM':
          quantity = Math.round(distanceKm * 10) / 10;
          unit = 'km';
          unitPrice = config.perKmRate || this.DEFAULT_RATES.PER_KM;
          total = quantity * unitPrice;
          description = `Fahrstrecke Route ${route.routeDate?.toISOString().slice(0, 10) || 'N/A'}`;
          break;

        case 'FLAT_RATE':
          quantity = 1;
          unit = 'Route';
          unitPrice = config.baseRate;
          total = unitPrice;
          description = `Pauschalpreis Route ${route.routeDate?.toISOString().slice(0, 10) || 'N/A'}`;
          break;

        default:
          quantity = deliveryCount;
          unit = 'Zustellungen';
          unitPrice = config.perDeliveryRate || this.DEFAULT_RATES.PER_DELIVERY;
          total = quantity * unitPrice;
          description = `Lieferservice ${route.routeDate?.toISOString().slice(0, 10) || 'N/A'}`;
      }

      // Apply minimum charge
      if (config.minimumCharge && total < config.minimumCharge) {
        total = config.minimumCharge;
        description += ' (Mindestgebühr)';
      }

      items.push({
        description,
        quantity,
        unit,
        unitPrice: Math.round(unitPrice * 100) / 100,
        total: Math.round(total * 100) / 100,
        routeId: route.id,
        routeDate: route.routeDate,
      });
    }

    return items;
  }

  private calculateVolumeDiscount(
    subtotal: number,
    totalDeliveries: number,
    discounts: VolumeDiscount[],
  ): number {
    if (discounts.length === 0) return 0;

    // Sort discounts by minDeliveries descending
    const sortedDiscounts = [...discounts].sort((a, b) => b.minDeliveries - a.minDeliveries);

    // Find applicable discount
    const applicableDiscount = sortedDiscounts.find(d => totalDeliveries >= d.minDeliveries);

    if (!applicableDiscount) return 0;

    return subtotal * (applicableDiscount.discountPercent / 100);
  }

  private estimateTotal(routes: any[], config: CustomerBillingConfig): number {
    const items = this.calculateLineItems(routes, config);
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalDeliveries = routes.reduce((sum, r) => sum + (r.stops?.length || 0), 0);
    const discount = this.calculateVolumeDiscount(subtotal, totalDeliveries, config.volumeDiscounts || []);
    const discountedSubtotal = subtotal - discount;
    const vatAmount = discountedSubtotal * (config.vatRate / 100);
    return Math.round((discountedSubtotal + vatAmount) * 100) / 100;
  }

  private generateInvoiceNumber(userId: string): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = String(++this.invoiceCounter).padStart(4, '0');
    return `RE-${year}${month}-${sequence}`;
  }
}
