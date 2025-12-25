import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryInvoiceService } from './delivery-invoice.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('DeliveryInvoiceService', () => {
  let service: DeliveryInvoiceService;
  let prisma: jest.Mocked<PrismaService>;

  const mockRoute = (options: Partial<any> = {}) => ({
    id: options.id || 'route-1',
    userId: 'user-1',
    routeName: options.routeName || 'Munich North Route',
    routeDate: options.routeDate || new Date('2025-12-05'),
    status: options.status || 'COMPLETED',
    deliveryZone: options.deliveryZone || 'Munich-Schwabing',
    actualDistanceKm: new Decimal(options.distanceKm || 45),
    stops: options.stops || [
      { id: 'stop-1', status: 'DELIVERED' },
      { id: 'stop-2', status: 'DELIVERED' },
      { id: 'stop-3', status: 'DELIVERED' },
    ],
  });

  beforeEach(async () => {
    const mockPrisma = {
      deliveryRoute: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryInvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DeliveryInvoiceService>(DeliveryInvoiceService);
    prisma = module.get(PrismaService);
  });

  describe('createInvoiceFromRoutes', () => {
    it('should create invoice from completed routes', async () => {
      (prisma.deliveryRoute.findFirst as jest.Mock).mockResolvedValue(mockRoute());

      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Max Mustermann GmbH',
        customerAddress: {
          street: 'Leopoldstraße 100',
          postalCode: '80802',
          city: 'München',
        },
        routeIds: ['route-1'],
      });

      expect(invoice.invoiceNumber).toMatch(/^RE-\d{4}-\d{5}$/);
      expect(invoice.customerName).toBe('Max Mustermann GmbH');
      expect(invoice.status).toBe('DRAFT');
      expect(invoice.lineItems.length).toBeGreaterThan(0);
      expect(invoice.vatRate).toBe(19);
      expect(invoice.total).toBeGreaterThan(0);
    });

    it('should calculate VAT correctly (19% MwSt)', async () => {
      (prisma.deliveryRoute.findFirst as jest.Mock).mockResolvedValue(mockRoute());

      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test GmbH',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        routeIds: ['route-1'],
      });

      const expectedVat = Math.round(invoice.subtotal * 0.19 * 100) / 100;
      expect(invoice.vatAmount).toBe(expectedVat);
      expect(invoice.total).toBe(
        Math.round((invoice.subtotal + invoice.vatAmount) * 100) / 100,
      );
    });

    it('should throw NotFoundException for non-existent route', async () => {
      (prisma.deliveryRoute.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createInvoiceFromRoutes('user-1', {
          customerId: 'customer-1',
          customerName: 'Test',
          customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
          routeIds: ['non-existent'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create invoice from date range', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ id: 'route-1' }),
        mockRoute({ id: 'route-2', routeDate: new Date('2025-12-06') }),
      ]);

      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test GmbH',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        dateFrom: new Date('2025-12-01'),
        dateTo: new Date('2025-12-08'),
      });

      expect(invoice.lineItems.length).toBeGreaterThan(0);
    });

    it('should create invoice with custom line items', async () => {
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test GmbH',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [
          { description: 'Express Delivery', quantity: 5, unitPrice: 10 },
          { description: 'Packaging', quantity: 10, unitPrice: 2 },
        ],
      });

      expect(invoice.lineItems.length).toBe(2);
      expect(invoice.subtotal).toBe(70); // 5*10 + 10*2
    });

    it('should throw BadRequestException for empty invoice', async () => {
      await expect(
        service.createInvoiceFromRoutes('user-1', {
          customerId: 'customer-1',
          customerName: 'Test',
          customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set correct payment terms', async () => {
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
        paymentTermsDays: 30,
      });

      const expectedDueDate = new Date(invoice.issueDate);
      expectedDueDate.setDate(expectedDueDate.getDate() + 30);

      expect(invoice.dueDate.toDateString()).toBe(expectedDueDate.toDateString());
      expect(invoice.paymentTerms).toContain('30');
    });
  });

  describe('getInvoices', () => {
    beforeEach(async () => {
      // Create test invoices
      await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Customer 1',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      });
      await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-2',
        customerName: 'Customer 2',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 200 }],
      });
    });

    it('should return all invoices for user', async () => {
      const invoices = await service.getInvoices('user-1');
      // Should have at least the invoices created in beforeEach
      expect(invoices.length).toBeGreaterThan(0);
    });

    it('should filter by customer ID', async () => {
      const invoices = await service.getInvoices('user-1', {
        customerId: 'customer-1',
      });
      expect(invoices.every(inv => inv.customerId === 'customer-1')).toBe(true);
    });

    it('should filter by status', async () => {
      const invoices = await service.getInvoices('user-1', { status: 'DRAFT' });
      expect(invoices.every(inv => inv.status === 'DRAFT')).toBe(true);
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by ID', async () => {
      const created = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      });

      const invoice = await service.getInvoice(created.id);
      expect(invoice.id).toBe(created.id);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(service.getInvoice('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateInvoiceStatus', () => {
    let invoiceId: string;

    beforeEach(async () => {
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      });
      invoiceId = invoice.id;
    });

    it('should update status to SENT', async () => {
      const updated = await service.markAsSent(invoiceId);
      expect(updated.status).toBe('SENT');
    });

    it('should update status to PAID and set paidAt', async () => {
      await service.markAsSent(invoiceId);
      const updated = await service.markAsPaid(invoiceId);
      expect(updated.status).toBe('PAID');
      expect(updated.paidAt).not.toBeNull();
    });

    it('should throw BadRequestException when updating cancelled invoice', async () => {
      await service.cancelInvoice(invoiceId);
      await expect(service.markAsSent(invoiceId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when updating paid invoice', async () => {
      await service.markAsSent(invoiceId);
      await service.markAsPaid(invoiceId);
      await expect(service.markAsSent(invoiceId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelInvoice', () => {
    it('should cancel invoice', async () => {
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      });

      const cancelled = await service.cancelInvoice(invoice.id, 'Customer request');
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.notes).toContain('Storniert');
    });

    it('should throw BadRequestException when cancelling paid invoice', async () => {
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      });
      await service.markAsSent(invoice.id);
      await service.markAsPaid(invoice.id);

      await expect(service.cancelInvoice(invoice.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkOverdueInvoices', () => {
    it('should mark overdue invoices', async () => {
      // Create invoice with past due date
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
        paymentTermsDays: -1, // Due yesterday
      });
      await service.markAsSent(invoice.id);

      const overdueCount = await service.checkOverdueInvoices('user-1');
      expect(overdueCount).toBeGreaterThanOrEqual(1);

      const updated = await service.getInvoice(invoice.id);
      expect(updated.status).toBe('OVERDUE');
    });
  });

  describe('getInvoiceSummary', () => {
    beforeEach(async () => {
      // Create various invoices
      const inv1 = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'c1',
        customerName: 'Test 1',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      });
      await service.markAsSent(inv1.id);
      await service.markAsPaid(inv1.id);

      const inv2 = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'c2',
        customerName: 'Test 2',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 200 }],
      });
      await service.markAsSent(inv2.id);
    });

    it('should return correct summary statistics', async () => {
      const summary = await service.getInvoiceSummary('user-1');

      // Just verify the structure and that we have some data
      expect(summary).toHaveProperty('totalInvoices');
      expect(summary).toHaveProperty('paidAmount');
      expect(summary).toHaveProperty('pendingAmount');
      expect(summary).toHaveProperty('byStatus');
      expect(summary.totalInvoices).toBeGreaterThan(0);
    });
  });

  describe('generateInvoiceHtml', () => {
    it('should generate valid HTML document', async () => {
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Max Mustermann GmbH',
        customerAddress: {
          street: 'Leopoldstraße 100',
          postalCode: '80802',
          city: 'München',
        },
        customerVatId: 'DE123456789',
        lineItems: [
          { description: 'Zustellungen Dezember', quantity: 100, unitPrice: 3.50 },
        ],
      });

      const html = await service.generateInvoiceHtml(invoice.id);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('RECHNUNG');
      expect(html).toContain(invoice.invoiceNumber);
      expect(html).toContain('Max Mustermann GmbH');
      expect(html).toContain('DE123456789');
      expect(html).toContain('MwSt');
      expect(html).toContain('Bankverbindung');
      expect(html).toContain('IBAN');
    });

    it('should include all line items', async () => {
      const invoice = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [
          { description: 'Delivery Service', quantity: 50, unitPrice: 5 },
          { description: 'Express Fee', quantity: 10, unitPrice: 10 },
        ],
      });

      const html = await service.generateInvoiceHtml(invoice.id);

      expect(html).toContain('Delivery Service');
      expect(html).toContain('Express Fee');
    });
  });

  describe('getCustomerInvoices', () => {
    beforeEach(async () => {
      const inv1 = await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      });
      await service.markAsSent(inv1.id);
      await service.markAsPaid(inv1.id);

      await service.createInvoiceFromRoutes('user-1', {
        customerId: 'customer-1',
        customerName: 'Test Customer',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        lineItems: [{ description: 'Test 2', quantity: 1, unitPrice: 200 }],
      });
    });

    it('should return customer invoice history', async () => {
      const result = await service.getCustomerInvoices('user-1', 'customer-1');

      expect(result.customer.id).toBe('customer-1');
      expect(result.invoices.length).toBeGreaterThan(0);
      expect(result.totalBilled).toBeGreaterThan(0);
      // At least some should be paid based on beforeEach
      expect(result).toHaveProperty('totalPaid');
    });
  });

  describe('getUnbilledRoutes', () => {
    it('should return unbilled completed routes', async () => {
      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ id: 'unbilled-1' }),
        mockRoute({ id: 'unbilled-2' }),
      ]);

      const unbilled = await service.getUnbilledRoutes('user-1');

      expect(unbilled.length).toBe(2);
      expect(unbilled[0]).toHaveProperty('routeId');
      expect(unbilled[0]).toHaveProperty('deliveryCount');
      expect(unbilled[0]).toHaveProperty('estimatedAmount');
    });

    it('should exclude already invoiced routes', async () => {
      // Create an invoice for a route
      (prisma.deliveryRoute.findFirst as jest.Mock).mockResolvedValue(
        mockRoute({ id: 'invoiced-route' }),
      );
      await service.createInvoiceFromRoutes('user-1', {
        customerId: 'c1',
        customerName: 'Test',
        customerAddress: { street: 'Test', postalCode: '80331', city: 'München' },
        routeIds: ['invoiced-route'],
      });

      (prisma.deliveryRoute.findMany as jest.Mock).mockResolvedValue([
        mockRoute({ id: 'invoiced-route' }),
        mockRoute({ id: 'unbilled-route' }),
      ]);

      const unbilled = await service.getUnbilledRoutes('user-1');

      expect(unbilled.some(r => r.routeId === 'invoiced-route')).toBe(false);
      expect(unbilled.some(r => r.routeId === 'unbilled-route')).toBe(true);
    });
  });
});
