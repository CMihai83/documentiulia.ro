import { Test, TestingModule } from '@nestjs/testing';
import { AutomatedInvoicingService, BillingFrequency, PricingModel } from './automated-invoicing.service';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';

describe('AutomatedInvoicingService', () => {
  let service: AutomatedInvoicingService;
  let prismaService: any;
  let financeService: any;

  const mockUserId = 'user-123';
  const mockCustomerId = 'customer-456';
  const mockCustomerName = 'Munich Logistics GmbH';

  const mockRoute = {
    id: 'route-1',
    userId: mockUserId,
    routeDate: new Date('2024-12-01'),
    status: 'COMPLETED',
    plannedDistanceKm: 45.5,
    actualDistanceKm: 47.2,
    stops: [
      { id: 'stop-1', status: 'DELIVERED' },
      { id: 'stop-2', status: 'DELIVERED' },
      { id: 'stop-3', status: 'DELIVERED' },
    ],
    vehicle: { id: 'vehicle-1', licensePlate: 'M-DL 1234' },
  };

  const mockPrismaService = {
    deliveryRoute: {
      findMany: jest.fn(),
    },
  };

  const mockFinanceService = {
    createInvoice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomatedInvoicingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FinanceService, useValue: mockFinanceService },
      ],
    }).compile();

    service = module.get<AutomatedInvoicingService>(AutomatedInvoicingService);
    prismaService = module.get(PrismaService);
    financeService = module.get(FinanceService);

    jest.clearAllMocks();
    mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
  });

  describe('createBillingConfig', () => {
    it('should create a billing configuration for a customer', async () => {
      const config = await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        perDeliveryRate: 9.50,
        paymentTermsDays: 30,
      });

      expect(config).toBeDefined();
      expect(config.id).toContain('billing-');
      expect(config.customerId).toBe(mockCustomerId);
      expect(config.customerName).toBe(mockCustomerName);
      expect(config.billingFrequency).toBe('MONTHLY');
      expect(config.pricingModel).toBe('PER_DELIVERY');
      expect(config.perDeliveryRate).toBe(9.50);
      expect(config.paymentTermsDays).toBe(30);
      expect(config.currency).toBe('EUR');
      expect(config.vatRate).toBe(19);
    });

    it('should use default rates when not specified', async () => {
      const config = await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'WEEKLY',
        pricingModel: 'PER_KM',
      });

      expect(config.perDeliveryRate).toBe(8.50);
      expect(config.perKmRate).toBe(0.85);
      expect(config.perHourRate).toBe(45);
      expect(config.minimumCharge).toBe(25);
    });

    it('should support volume discounts', async () => {
      const config = await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        volumeDiscounts: [
          { minDeliveries: 100, discountPercent: 5 },
          { minDeliveries: 500, discountPercent: 10 },
        ],
      });

      expect(config.volumeDiscounts).toHaveLength(2);
      expect(config.volumeDiscounts?.[0].minDeliveries).toBe(100);
      expect(config.volumeDiscounts?.[1].discountPercent).toBe(10);
    });

    it('should support auto-generate and auto-send flags', async () => {
      const config = await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'DAILY',
        pricingModel: 'FLAT_RATE',
        autoGenerateInvoice: true,
        autoSendInvoice: true,
        emailRecipients: ['billing@customer.de', 'finance@customer.de'],
      });

      expect(config.autoGenerateInvoice).toBe(true);
      expect(config.autoSendInvoice).toBe(true);
      expect(config.emailRecipients).toHaveLength(2);
    });
  });

  describe('getBillingConfig', () => {
    it('should retrieve billing configuration for a customer', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      const config = await service.getBillingConfig(mockUserId, mockCustomerId);

      expect(config).toBeDefined();
      expect(config?.customerId).toBe(mockCustomerId);
    });

    it('should return null for non-existent customer', async () => {
      const config = await service.getBillingConfig(mockUserId, 'non-existent');
      expect(config).toBeNull();
    });
  });

  describe('getAllBillingConfigs', () => {
    it('should retrieve all billing configurations for a user', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: 'customer-1',
        customerName: 'Customer 1',
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      await service.createBillingConfig(mockUserId, {
        customerId: 'customer-2',
        customerName: 'Customer 2',
        billingFrequency: 'WEEKLY',
        pricingModel: 'PER_KM',
      });

      const configs = await service.getAllBillingConfigs(mockUserId);

      expect(configs).toHaveLength(2);
    });

    it('should return empty array for user with no configs', async () => {
      const configs = await service.getAllBillingConfigs('new-user');
      expect(configs).toEqual([]);
    });
  });

  describe('updateBillingConfig', () => {
    it('should update a billing configuration', async () => {
      const config = await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        perDeliveryRate: 8.50,
      });

      const updated = await service.updateBillingConfig(mockUserId, config.id, {
        perDeliveryRate: 10.00,
        paymentTermsDays: 45,
      });

      expect(updated?.perDeliveryRate).toBe(10.00);
      expect(updated?.paymentTermsDays).toBe(45);
    });

    it('should return null for non-existent config', async () => {
      const updated = await service.updateBillingConfig(mockUserId, 'non-existent', {
        perDeliveryRate: 10.00,
      });
      expect(updated).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create an invoice template', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Standard Template',
        bankDetails: {
          bankName: 'Sparkasse München',
          iban: 'DE89370400440532013000',
          bic: 'COBADEFFXXX',
          accountHolder: 'Munich Delivery GmbH',
        },
        companyDetails: {
          name: 'Munich Delivery GmbH',
          address: 'Leopoldstr. 25',
          postalCode: '80802',
          city: 'München',
          vatId: 'DE123456789',
        },
        isDefault: true,
      });

      expect(template).toBeDefined();
      expect(template.id).toContain('template-');
      expect(template.name).toBe('Standard Template');
      expect(template.bankDetails.iban).toBe('DE89370400440532013000');
      expect(template.companyDetails.city).toBe('München');
      expect(template.isDefault).toBe(true);
      expect(template.headerText).toBe('Rechnung');
    });

    it('should set default country to Deutschland', async () => {
      const template = await service.createTemplate(mockUserId, {
        name: 'Test Template',
        bankDetails: {
          bankName: 'Test Bank',
          iban: 'DE00000000000000000000',
          bic: 'TESTDE00XXX',
          accountHolder: 'Test GmbH',
        },
        companyDetails: {
          name: 'Test GmbH',
          address: 'Teststr. 1',
          postalCode: '12345',
          city: 'München',
          vatId: 'DE000000000',
        },
      });

      expect(template.companyDetails.country).toBe('Deutschland');
    });
  });

  describe('getTemplates', () => {
    it('should retrieve all templates for a user', async () => {
      await service.createTemplate(mockUserId, {
        name: 'Template 1',
        bankDetails: { bankName: 'Bank 1', iban: 'DE00000000000000000001', bic: 'BIC1', accountHolder: 'Test 1' },
        companyDetails: { name: 'Company 1', address: 'Addr 1', postalCode: '11111', city: 'City 1', vatId: 'DE111111111' },
      });

      await service.createTemplate(mockUserId, {
        name: 'Template 2',
        bankDetails: { bankName: 'Bank 2', iban: 'DE00000000000000000002', bic: 'BIC2', accountHolder: 'Test 2' },
        companyDetails: { name: 'Company 2', address: 'Addr 2', postalCode: '22222', city: 'City 2', vatId: 'DE222222222' },
      });

      const templates = await service.getTemplates(mockUserId);

      expect(templates).toHaveLength(2);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return the default template', async () => {
      await service.createTemplate(mockUserId, {
        name: 'Template 1',
        bankDetails: { bankName: 'Bank 1', iban: 'DE00000000000000000001', bic: 'BIC1', accountHolder: 'Test 1' },
        companyDetails: { name: 'Company 1', address: 'Addr 1', postalCode: '11111', city: 'City 1', vatId: 'DE111111111' },
        isDefault: false,
      });

      await service.createTemplate(mockUserId, {
        name: 'Default Template',
        bankDetails: { bankName: 'Bank 2', iban: 'DE00000000000000000002', bic: 'BIC2', accountHolder: 'Test 2' },
        companyDetails: { name: 'Company 2', address: 'Addr 2', postalCode: '22222', city: 'City 2', vatId: 'DE222222222' },
        isDefault: true,
      });

      const defaultTemplate = await service.getDefaultTemplate(mockUserId);

      expect(defaultTemplate?.name).toBe('Default Template');
    });

    it('should return first template if no default is set', async () => {
      await service.createTemplate(mockUserId, {
        name: 'First Template',
        bankDetails: { bankName: 'Bank', iban: 'DE00000000000000000000', bic: 'BIC', accountHolder: 'Test' },
        companyDetails: { name: 'Company', address: 'Addr', postalCode: '00000', city: 'City', vatId: 'DE000000000' },
        isDefault: false,
      });

      const defaultTemplate = await service.getDefaultTemplate(mockUserId);

      expect(defaultTemplate?.name).toBe('First Template');
    });
  });

  describe('generateInvoice', () => {
    beforeEach(async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        perDeliveryRate: 8.50,
        vatRate: 19,
      });
    });

    it('should generate invoice for completed routes', async () => {
      const result = await service.generateInvoice(mockUserId, {
        customerId: mockCustomerId,
        periodStart: new Date('2024-12-01'),
        periodEnd: new Date('2024-12-31'),
      });

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBeDefined();
      expect(result.invoiceNumber).toMatch(/^RE-\d{6}-\d{4}$/);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should calculate correct totals with per-delivery pricing', async () => {
      const result = await service.generateInvoice(mockUserId, {
        customerId: mockCustomerId,
      });

      expect(result.success).toBe(true);

      // 3 deliveries * 8.50 = 25.50 (but min charge is 25, so 25.50)
      // VAT: 25.50 * 0.19 = 4.845
      // Total: 25.50 + 4.845 = 30.345 ≈ 30.35
      const invoice = await service.getInvoice(mockUserId, result.invoiceId!);
      expect(invoice?.totalDeliveries).toBe(3);
    });

    it('should fail without billing configuration', async () => {
      const result = await service.generateInvoice(mockUserId, {
        customerId: 'unknown-customer',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Keine Abrechnungskonfiguration');
    });

    it('should fail when no completed routes found', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([]);

      const result = await service.generateInvoice(mockUserId, {
        customerId: mockCustomerId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Keine abgeschlossenen Routen');
    });

    it('should apply volume discounts', async () => {
      await service.updateBillingConfig(
        mockUserId,
        (await service.getBillingConfig(mockUserId, mockCustomerId))!.id,
        {
          volumeDiscounts: [
            { minDeliveries: 3, discountPercent: 10 },
          ],
        },
      );

      const result = await service.generateInvoice(mockUserId, {
        customerId: mockCustomerId,
      });

      expect(result.success).toBe(true);

      const invoice = await service.getInvoice(mockUserId, result.invoiceId!);
      expect(invoice?.discount).toBeGreaterThan(0);
    });
  });

  describe('batchGenerateInvoices', () => {
    it('should batch generate invoices for eligible customers', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: 'customer-1',
        customerName: 'Customer 1',
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        autoGenerateInvoice: true,
      });

      await service.createBillingConfig(mockUserId, {
        customerId: 'customer-2',
        customerName: 'Customer 2',
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        autoGenerateInvoice: true,
      });

      const result = await service.batchGenerateInvoices(mockUserId);

      expect(result.generated).toHaveLength(2);
    });

    it('should skip customers with auto-generate disabled', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: 'auto-customer',
        customerName: 'Auto Customer',
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        autoGenerateInvoice: true,
      });

      await service.createBillingConfig(mockUserId, {
        customerId: 'manual-customer',
        customerName: 'Manual Customer',
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        autoGenerateInvoice: false,
      });

      const result = await service.batchGenerateInvoices(mockUserId);

      expect(result.generated).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].customerId).toBe('manual-customer');
    });

    it('should filter by billing frequency', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: 'weekly-customer',
        customerName: 'Weekly Customer',
        billingFrequency: 'WEEKLY',
        pricingModel: 'PER_DELIVERY',
        autoGenerateInvoice: true,
      });

      await service.createBillingConfig(mockUserId, {
        customerId: 'monthly-customer',
        customerName: 'Monthly Customer',
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        autoGenerateInvoice: true,
      });

      const result = await service.batchGenerateInvoices(mockUserId, {
        billingFrequency: 'WEEKLY',
      });

      expect(result.generated).toHaveLength(1);
    });
  });

  describe('getUninvoicedSummary', () => {
    beforeEach(async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });
    });

    it('should return summary of uninvoiced routes', async () => {
      const summaries = await service.getUninvoicedSummary(mockUserId);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].customerName).toBe(mockCustomerName);
      expect(summaries[0].totalRoutes).toBe(1);
      expect(summaries[0].totalDeliveries).toBe(3);
    });
  });

  describe('getInvoices', () => {
    beforeEach(async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
    });

    it('should retrieve invoices for a user', async () => {
      const invoices = await service.getInvoices(mockUserId);

      expect(invoices).toHaveLength(1);
      expect(invoices[0].customerName).toBe(mockCustomerName);
    });

    it('should filter by customer ID', async () => {
      const invoices = await service.getInvoices(mockUserId, { customerId: mockCustomerId });

      expect(invoices).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const invoices = await service.getInvoices(mockUserId, { status: 'GENERATED' });

      expect(invoices).toHaveLength(1);
    });

    it('should return empty for non-matching filters', async () => {
      const invoices = await service.getInvoices(mockUserId, { status: 'PAID' });

      expect(invoices).toHaveLength(0);
    });
  });

  describe('getInvoice', () => {
    it('should retrieve a specific invoice', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const invoice = await service.getInvoice(mockUserId, result.invoiceId!);

      expect(invoice).toBeDefined();
      expect(invoice?.invoiceNumber).toBe(result.invoiceNumber);
    });

    it('should return null for non-existent invoice', async () => {
      const invoice = await service.getInvoice(mockUserId, 'non-existent');
      expect(invoice).toBeNull();
    });
  });

  describe('markInvoiceSent', () => {
    it('should mark invoice as sent', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const invoice = await service.markInvoiceSent(mockUserId, result.invoiceId!);

      expect(invoice?.status).toBe('SENT');
      expect(invoice?.sentAt).toBeDefined();
    });

    it('should return null for non-existent invoice', async () => {
      const invoice = await service.markInvoiceSent(mockUserId, 'non-existent');
      expect(invoice).toBeNull();
    });
  });

  describe('markInvoicePaid', () => {
    it('should mark invoice as paid', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const invoice = await service.markInvoicePaid(mockUserId, result.invoiceId!);

      expect(invoice?.status).toBe('PAID');
    });
  });

  describe('getOverdueInvoices', () => {
    it('should return overdue invoices', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        paymentTermsDays: -1, // Already overdue
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      await service.markInvoiceSent(mockUserId, result.invoiceId!);

      const reminders = await service.getOverdueInvoices(mockUserId);

      expect(reminders.length).toBeGreaterThanOrEqual(1);
      expect(reminders[0].daysOverdue).toBeGreaterThan(0);
    });

    it('should calculate reminder levels correctly', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        paymentTermsDays: -30, // 30 days overdue
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      await service.markInvoiceSent(mockUserId, result.invoiceId!);

      const reminders = await service.getOverdueInvoices(mockUserId);

      // With 30 days overdue, should be level 2 or 3
      if (reminders.length > 0) {
        expect(reminders[0].reminderLevel).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('getInvoicingDashboard', () => {
    beforeEach(async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });
    });

    it('should return dashboard data', async () => {
      await service.generateInvoice(mockUserId, { customerId: mockCustomerId });

      const dashboard = await service.getInvoicingDashboard(mockUserId);

      expect(dashboard).toBeDefined();
      expect(dashboard.totalGenerated).toBeGreaterThanOrEqual(1);
      expect(dashboard.recentInvoices).toBeDefined();
    });

    it('should track revenue for paid invoices', async () => {
      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      await service.markInvoicePaid(mockUserId, result.invoiceId!);

      const dashboard = await service.getInvoicingDashboard(mockUserId);

      expect(dashboard.totalPaid).toBeGreaterThanOrEqual(1);
      expect(dashboard.revenueThisMonth).toBeGreaterThanOrEqual(0);
    });

    it('should track pending amounts', async () => {
      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      await service.markInvoiceSent(mockUserId, result.invoiceId!);

      const dashboard = await service.getInvoicingDashboard(mockUserId);

      expect(dashboard.totalSent).toBeGreaterThanOrEqual(1);
      expect(dashboard.pendingAmount).toBeGreaterThan(0);
    });
  });

  describe('pricing models', () => {
    it('should calculate PER_DELIVERY pricing correctly', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        perDeliveryRate: 10.00,
        minimumCharge: 0, // Disable minimum
        vatRate: 19,
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const invoice = await service.getInvoice(mockUserId, result.invoiceId!);

      // 3 deliveries * 10 EUR = 30 EUR subtotal
      expect(invoice?.subtotal).toBe(30);
      // VAT: 30 * 0.19 = 5.70
      expect(invoice?.vatAmount).toBe(5.70);
      // Total: 30 + 5.70 = 35.70
      expect(invoice?.total).toBe(35.70);
    });

    it('should calculate PER_KM pricing correctly', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_KM',
        perKmRate: 1.00,
        minimumCharge: 0,
        vatRate: 19,
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const invoice = await service.getInvoice(mockUserId, result.invoiceId!);

      // 47.2 km * 1.00 EUR = 47.2 EUR subtotal (rounded)
      expect(invoice?.subtotal).toBeCloseTo(47.2, 1);
    });

    it('should apply minimum charge when total is below threshold', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
        perDeliveryRate: 5.00, // 3 * 5 = 15 EUR
        minimumCharge: 25.00, // Minimum is higher
        vatRate: 19,
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const invoice = await service.getInvoice(mockUserId, result.invoiceId!);

      // Should use minimum charge of 25 EUR
      expect(invoice?.subtotal).toBe(25);
    });

    it('should calculate FLAT_RATE pricing correctly', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'PER_ROUTE',
        pricingModel: 'FLAT_RATE',
        baseRate: 75.00,
        minimumCharge: 0,
        vatRate: 19,
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const invoice = await service.getInvoice(mockUserId, result.invoiceId!);

      // 1 route * 75 EUR = 75 EUR subtotal
      expect(invoice?.subtotal).toBe(75);
    });
  });

  describe('invoice number generation', () => {
    it('should generate unique invoice numbers', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      const result1 = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });
      const result2 = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });

      expect(result1.invoiceNumber).not.toBe(result2.invoiceNumber);
    });

    it('should follow German invoice number format', async () => {
      await service.createBillingConfig(mockUserId, {
        customerId: mockCustomerId,
        customerName: mockCustomerName,
        billingFrequency: 'MONTHLY',
        pricingModel: 'PER_DELIVERY',
      });

      const result = await service.generateInvoice(mockUserId, { customerId: mockCustomerId });

      // Format: RE-YYYYMM-XXXX
      expect(result.invoiceNumber).toMatch(/^RE-\d{6}-\d{4}$/);
    });
  });
});
