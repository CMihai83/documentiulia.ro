import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Delivery Invoice Generation Service
 * Generates invoices for delivery services (German compliance - Rechnung).
 *
 * Features:
 * - Invoice generation from completed routes
 * - German VAT (MwSt) calculation: 19% standard, 7% reduced
 * - Sequential invoice numbering
 * - PDF invoice generation (HTML template)
 * - Invoice status tracking
 * - Customer invoice history
 *
 * Supports Munich delivery fleet billing to business customers.
 */

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface DeliveryInvoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  customerId: string;
  customerName: string;
  customerAddress: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  customerVatId: string | null;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  paymentTerms: string;
  bankDetails: BankDetails;
  createdAt: Date;
  paidAt: Date | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  routeId?: string;
  routeDate?: Date;
  deliveryCount?: number;
}

export interface BankDetails {
  bankName: string;
  iban: string;
  bic: string;
  accountHolder: string;
}

export interface CreateInvoiceDto {
  customerId: string;
  customerName: string;
  customerAddress: {
    street: string;
    postalCode: string;
    city: string;
    country?: string;
  };
  customerVatId?: string;
  routeIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  lineItems?: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  notes?: string;
  paymentTermsDays?: number;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  byStatus: Record<InvoiceStatus, number>;
  averagePaymentDays: number;
}

// German VAT rate
const GERMAN_VAT_RATE = 0.19; // 19% MwSt

// Default payment terms
const DEFAULT_PAYMENT_TERMS_DAYS = 14;

// Default bank details (would be configured per user in production)
const DEFAULT_BANK_DETAILS: BankDetails = {
  bankName: 'Deutsche Bank',
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX',
  accountHolder: 'DocumentIulia Logistics GmbH',
};

@Injectable()
export class DeliveryInvoiceService {
  private readonly logger = new Logger(DeliveryInvoiceService.name);

  // In-memory storage for invoices (in production, add to Prisma schema)
  private invoices: Map<string, DeliveryInvoice> = new Map();
  private invoiceCounter = 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate invoice number (German format: RE-YYYY-NNNNN)
   */
  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const number = ++this.invoiceCounter;
    return `RE-${year}-${number.toString().padStart(5, '0')}`;
  }

  /**
   * Create invoice from completed routes
   */
  async createInvoiceFromRoutes(
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<DeliveryInvoice> {
    this.logger.log(`Creating invoice for customer ${dto.customerName}`);

    const lineItems: InvoiceLineItem[] = [];

    // If route IDs provided, generate line items from routes
    if (dto.routeIds && dto.routeIds.length > 0) {
      for (const routeId of dto.routeIds) {
        const route = await this.prisma.deliveryRoute.findFirst({
          where: { id: routeId, userId, status: 'COMPLETED' },
          include: {
            stops: { where: { status: 'DELIVERED' } },
          },
        });

        if (!route) {
          throw new NotFoundException(`Route ${routeId} not found or not completed`);
        }

        const deliveryCount = route.stops.length;
        const distanceKm = route.actualDistanceKm?.toNumber() || 0;

        // Calculate price per delivery (example pricing)
        const pricePerDelivery = 3.50; // €3.50 per delivery
        const distanceCharge = distanceKm * 0.45; // €0.45 per km

        lineItems.push({
          description: `Zustellungen Route ${route.routeName} (${route.deliveryZone || 'München'})`,
          quantity: deliveryCount,
          unitPrice: pricePerDelivery,
          total: deliveryCount * pricePerDelivery,
          routeId: route.id,
          routeDate: route.routeDate,
          deliveryCount,
        });

        if (distanceKm > 0) {
          lineItems.push({
            description: `Kilometerkosten Route ${route.routeName}`,
            quantity: Math.round(distanceKm),
            unitPrice: 0.45,
            total: Math.round(distanceCharge * 100) / 100,
            routeId: route.id,
          });
        }
      }
    }

    // If date range provided, get all completed routes in range
    if (dto.dateFrom && dto.dateTo && (!dto.routeIds || dto.routeIds.length === 0)) {
      const routes = await this.prisma.deliveryRoute.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          routeDate: { gte: dto.dateFrom, lte: dto.dateTo },
        },
        include: {
          stops: { where: { status: 'DELIVERED' } },
        },
        orderBy: { routeDate: 'asc' },
      });

      for (const route of routes) {
        const deliveryCount = route.stops.length;
        const pricePerDelivery = 3.50;

        if (deliveryCount > 0) {
          lineItems.push({
            description: `Zustellungen ${route.routeDate.toLocaleDateString('de-DE')} - ${route.routeName}`,
            quantity: deliveryCount,
            unitPrice: pricePerDelivery,
            total: deliveryCount * pricePerDelivery,
            routeId: route.id,
            routeDate: route.routeDate,
            deliveryCount,
          });
        }
      }
    }

    // Add custom line items if provided
    if (dto.lineItems) {
      for (const item of dto.lineItems) {
        lineItems.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Math.round(item.quantity * item.unitPrice * 100) / 100,
        });
      }
    }

    if (lineItems.length === 0) {
      throw new BadRequestException('No billable items found for invoice');
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = Math.round(subtotal * GERMAN_VAT_RATE * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    const issueDate = new Date();
    const paymentTermsDays = dto.paymentTermsDays || DEFAULT_PAYMENT_TERMS_DAYS;
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    const invoice: DeliveryInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: this.generateInvoiceNumber(),
      userId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerAddress: {
        street: dto.customerAddress.street,
        postalCode: dto.customerAddress.postalCode,
        city: dto.customerAddress.city,
        country: dto.customerAddress.country || 'Deutschland',
      },
      customerVatId: dto.customerVatId || null,
      issueDate,
      dueDate,
      status: 'DRAFT',
      lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      vatRate: GERMAN_VAT_RATE * 100,
      vatAmount,
      total,
      currency: 'EUR',
      notes: dto.notes || null,
      paymentTerms: `Zahlbar innerhalb von ${paymentTermsDays} Tagen`,
      bankDetails: DEFAULT_BANK_DETAILS,
      createdAt: new Date(),
      paidAt: null,
    };

    this.invoices.set(invoice.id, invoice);
    this.logger.log(`Invoice ${invoice.invoiceNumber} created: €${total}`);

    return invoice;
  }

  /**
   * Get all invoices for a user
   */
  async getInvoices(
    userId: string,
    options: {
      status?: InvoiceStatus;
      customerId?: string;
      from?: Date;
      to?: Date;
    } = {},
  ): Promise<DeliveryInvoice[]> {
    let invoices = Array.from(this.invoices.values()).filter(
      inv => inv.userId === userId,
    );

    if (options.status) {
      invoices = invoices.filter(inv => inv.status === options.status);
    }
    if (options.customerId) {
      invoices = invoices.filter(inv => inv.customerId === options.customerId);
    }
    if (options.from) {
      invoices = invoices.filter(inv => inv.issueDate >= options.from!);
    }
    if (options.to) {
      invoices = invoices.filter(inv => inv.issueDate <= options.to!);
    }

    return invoices.sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime());
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<DeliveryInvoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    return invoice;
  }

  /**
   * Get invoice by number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<DeliveryInvoice> {
    const invoice = Array.from(this.invoices.values()).find(
      inv => inv.invoiceNumber === invoiceNumber,
    );
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
    }
    return invoice;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus,
  ): Promise<DeliveryInvoice> {
    const invoice = await this.getInvoice(invoiceId);

    // Validate status transitions
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update cancelled invoice');
    }
    if (invoice.status === 'PAID' && status !== 'CANCELLED') {
      throw new BadRequestException('Cannot change status of paid invoice');
    }

    invoice.status = status;
    if (status === 'PAID') {
      invoice.paidAt = new Date();
    }

    this.invoices.set(invoiceId, invoice);
    this.logger.log(`Invoice ${invoice.invoiceNumber} status updated to ${status}`);

    return invoice;
  }

  /**
   * Mark invoice as sent
   */
  async markAsSent(invoiceId: string): Promise<DeliveryInvoice> {
    return this.updateInvoiceStatus(invoiceId, 'SENT');
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string): Promise<DeliveryInvoice> {
    return this.updateInvoiceStatus(invoiceId, 'PAID');
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: string, reason?: string): Promise<DeliveryInvoice> {
    const invoice = await this.getInvoice(invoiceId);

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }

    invoice.status = 'CANCELLED';
    if (reason) {
      invoice.notes = `${invoice.notes || ''}\nStorniert: ${reason}`.trim();
    }

    this.invoices.set(invoiceId, invoice);
    this.logger.log(`Invoice ${invoice.invoiceNumber} cancelled`);

    return invoice;
  }

  /**
   * Check and update overdue invoices
   */
  async checkOverdueInvoices(userId: string): Promise<number> {
    const now = new Date();
    let overdueCount = 0;

    for (const invoice of this.invoices.values()) {
      if (
        invoice.userId === userId &&
        invoice.status === 'SENT' &&
        invoice.dueDate < now
      ) {
        invoice.status = 'OVERDUE';
        this.invoices.set(invoice.id, invoice);
        overdueCount++;
      }
    }

    return overdueCount;
  }

  /**
   * Get invoice summary statistics
   */
  async getInvoiceSummary(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<InvoiceSummary> {
    let invoices = Array.from(this.invoices.values()).filter(
      inv => inv.userId === userId,
    );

    if (from) {
      invoices = invoices.filter(inv => inv.issueDate >= from);
    }
    if (to) {
      invoices = invoices.filter(inv => inv.issueDate <= to);
    }

    const byStatus: Record<InvoiceStatus, number> = {
      DRAFT: 0,
      SENT: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    };

    let totalRevenue = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let totalPaymentDays = 0;
    let paidCount = 0;

    for (const invoice of invoices) {
      byStatus[invoice.status]++;

      if (invoice.status !== 'CANCELLED') {
        totalRevenue += invoice.total;
      }

      switch (invoice.status) {
        case 'PAID':
          paidAmount += invoice.total;
          if (invoice.paidAt) {
            const paymentDays = Math.floor(
              (invoice.paidAt.getTime() - invoice.issueDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            totalPaymentDays += paymentDays;
            paidCount++;
          }
          break;
        case 'SENT':
        case 'DRAFT':
          pendingAmount += invoice.total;
          break;
        case 'OVERDUE':
          overdueAmount += invoice.total;
          break;
      }
    }

    return {
      totalInvoices: invoices.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      byStatus,
      averagePaymentDays: paidCount > 0 ? Math.round(totalPaymentDays / paidCount) : 0,
    };
  }

  /**
   * Generate invoice HTML document (for PDF conversion)
   */
  async generateInvoiceHtml(invoiceId: string): Promise<string> {
    const invoice = await this.getInvoice(invoiceId);

    const lineItemsHtml = invoice.lineItems
      .map(
        (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.description}</td>
        <td class="right">${item.quantity}</td>
        <td class="right">€${item.unitPrice.toFixed(2)}</td>
        <td class="right">€${item.total.toFixed(2)}</td>
      </tr>
    `,
      )
      .join('');

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Rechnung ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .company-info {
      text-align: left;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-number {
      font-size: 20px;
      font-weight: bold;
    }
    .customer-section {
      margin-bottom: 30px;
    }
    .customer-name {
      font-weight: bold;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    .right { text-align: right; }
    .totals {
      width: 300px;
      margin-left: auto;
    }
    .totals td {
      padding: 8px;
    }
    .total-row {
      font-weight: bold;
      font-size: 14px;
      border-top: 2px solid #333;
    }
    .bank-details {
      margin-top: 40px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    .bank-details h3 {
      margin-top: 0;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    .status-${invoice.status.toLowerCase()} {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10px;
    }
    .status-draft { background: #fef3c7; color: #92400e; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .status-cancelled { background: #f3f4f6; color: #374151; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <div class="company-name">DocumentIulia Logistics</div>
      <div>Leopoldstraße 100</div>
      <div>80802 München</div>
      <div>Deutschland</div>
      <div>USt-IdNr.: DE123456789</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">RECHNUNG</div>
      <div>${invoice.invoiceNumber}</div>
      <div style="margin-top: 10px;">
        <span class="status-${invoice.status.toLowerCase()}">${invoice.status}</span>
      </div>
    </div>
  </div>

  <div class="customer-section">
    <div class="customer-name">${invoice.customerName}</div>
    <div>${invoice.customerAddress.street}</div>
    <div>${invoice.customerAddress.postalCode} ${invoice.customerAddress.city}</div>
    <div>${invoice.customerAddress.country}</div>
    ${invoice.customerVatId ? `<div>USt-IdNr.: ${invoice.customerVatId}</div>` : ''}
  </div>

  <table>
    <tr>
      <td><strong>Rechnungsdatum:</strong></td>
      <td>${invoice.issueDate.toLocaleDateString('de-DE')}</td>
      <td><strong>Fälligkeitsdatum:</strong></td>
      <td>${invoice.dueDate.toLocaleDateString('de-DE')}</td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">Pos.</th>
        <th>Beschreibung</th>
        <th class="right" style="width: 80px;">Menge</th>
        <th class="right" style="width: 100px;">Einzelpreis</th>
        <th class="right" style="width: 100px;">Gesamt</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Zwischensumme:</td>
      <td class="right">€${invoice.subtotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td>MwSt. (${invoice.vatRate}%):</td>
      <td class="right">€${invoice.vatAmount.toFixed(2)}</td>
    </tr>
    <tr class="total-row">
      <td>Gesamtbetrag:</td>
      <td class="right">€${invoice.total.toFixed(2)}</td>
    </tr>
  </table>

  <div class="bank-details">
    <h3>Bankverbindung</h3>
    <table style="border: none;">
      <tr><td style="border: none;"><strong>Bank:</strong></td><td style="border: none;">${invoice.bankDetails.bankName}</td></tr>
      <tr><td style="border: none;"><strong>IBAN:</strong></td><td style="border: none;">${invoice.bankDetails.iban}</td></tr>
      <tr><td style="border: none;"><strong>BIC:</strong></td><td style="border: none;">${invoice.bankDetails.bic}</td></tr>
      <tr><td style="border: none;"><strong>Kontoinhaber:</strong></td><td style="border: none;">${invoice.bankDetails.accountHolder}</td></tr>
    </table>
    <p><strong>Zahlungsbedingungen:</strong> ${invoice.paymentTerms}</p>
    <p>Bitte geben Sie bei der Zahlung die Rechnungsnummer <strong>${invoice.invoiceNumber}</strong> an.</p>
  </div>

  ${invoice.notes ? `<div style="margin-top: 20px;"><strong>Hinweise:</strong><br>${invoice.notes}</div>` : ''}

  <div class="footer">
    <p>DocumentIulia Logistics GmbH | Geschäftsführer: Max Mustermann | HRB 123456 Amtsgericht München</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get customer invoice history
   */
  async getCustomerInvoices(
    userId: string,
    customerId: string,
  ): Promise<{
    customer: { id: string; name: string };
    totalBilled: number;
    totalPaid: number;
    invoices: DeliveryInvoice[];
  }> {
    const invoices = await this.getInvoices(userId, { customerId });

    const totalBilled = invoices
      .filter(inv => inv.status !== 'CANCELLED')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalPaid = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.total, 0);

    return {
      customer: {
        id: customerId,
        name: invoices[0]?.customerName || 'Unknown',
      },
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      invoices,
    };
  }

  /**
   * Get unbilled routes for a period
   */
  async getUnbilledRoutes(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<Array<{
    routeId: string;
    routeName: string;
    routeDate: Date;
    deliveryCount: number;
    estimatedAmount: number;
  }>> {
    const where: any = {
      userId,
      status: 'COMPLETED',
    };

    if (from || to) {
      where.routeDate = {};
      if (from) where.routeDate.gte = from;
      if (to) where.routeDate.lte = to;
    }

    const routes = await this.prisma.deliveryRoute.findMany({
      where,
      include: {
        stops: { where: { status: 'DELIVERED' } },
      },
      orderBy: { routeDate: 'desc' },
    });

    // Get all invoiced route IDs
    const invoicedRouteIds = new Set<string>();
    for (const invoice of this.invoices.values()) {
      if (invoice.userId === userId && invoice.status !== 'CANCELLED') {
        for (const item of invoice.lineItems) {
          if (item.routeId) {
            invoicedRouteIds.add(item.routeId);
          }
        }
      }
    }

    // Filter to unbilled routes
    const unbilledRoutes = routes.filter(r => !invoicedRouteIds.has(r.id));

    return unbilledRoutes.map(route => ({
      routeId: route.id,
      routeName: route.routeName || `Route ${route.id.slice(-6)}`,
      routeDate: route.routeDate,
      deliveryCount: route.stops.length,
      estimatedAmount: route.stops.length * 3.50, // €3.50 per delivery
    }));
  }
}
