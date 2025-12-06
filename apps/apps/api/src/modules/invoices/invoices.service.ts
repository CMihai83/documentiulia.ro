import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceFilterDto } from './dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateInvoiceDto) {
    // Generate invoice number
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { companyId, series: dto.series },
      orderBy: { number: 'desc' },
    });

    const number = (lastInvoice?.number || 0) + 1;
    const invoiceNumber = `${dto.series}-${new Date().getFullYear()}-${String(number).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let vatAmount = 0;

    const itemsWithTotals = dto.items.map((item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unitPrice);
      const itemVat = itemSubtotal * (Number(item.vatRate) / 100);
      subtotal += itemSubtotal;
      vatAmount += itemVat;

      return {
        ...item,
        subtotal: itemSubtotal,
        vatAmount: itemVat,
        total: itemSubtotal + itemVat,
      };
    });

    const total = subtotal + vatAmount - (dto.discount || 0);

    // Create invoice with items
    return this.prisma.invoice.create({
      data: {
        companyId,
        clientId: dto.clientId,
        type: dto.type || 'STANDARD',
        series: dto.series,
        number,
        invoiceNumber,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        currency: dto.currency || 'RON',
        exchangeRate: dto.exchangeRate || 1,
        subtotal,
        vatAmount,
        discount: dto.discount || 0,
        total,
        subtotalRon: subtotal * (dto.exchangeRate || 1),
        vatAmountRon: vatAmount * (dto.exchangeRate || 1),
        totalRon: total * (dto.exchangeRate || 1),
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        status: 'DRAFT',
        items: {
          create: itemsWithTotals.map((item, index) => ({
            productId: item.productId,
            description: item.description,
            unit: item.unit || 'buc',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            vatAmount: item.vatAmount,
            discount: item.discount || 0,
            subtotal: item.subtotal,
            total: item.total,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: true,
        client: true,
      },
    });
  }

  async findAll(companyId: string, filters: InvoiceFilterDto) {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(filters.status && { status: filters.status }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.startDate && {
        issueDate: {
          gte: new Date(filters.startDate),
          ...(filters.endDate && { lte: new Date(filters.endDate) }),
        },
      }),
      ...(filters.search && {
        OR: [
          { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
          { client: { name: { contains: filters.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, cui: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { issueDate: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 20,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page: Math.floor((filters.skip || 0) / (filters.take || 20)) + 1,
        pageSize: filters.take || 20,
        pageCount: Math.ceil(total / (filters.take || 20)),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        client: true,
        payments: true,
        documents: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Factura nu a fost găsită');
    }

    return invoice;
  }

  async update(companyId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(companyId, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Doar facturile ciornă pot fi modificate');
    }

    // Recalculate totals if items changed
    let updateData: any = { ...dto };

    if (dto.items) {
      let subtotal = 0;
      let vatAmount = 0;

      const itemsWithTotals = dto.items.map((item) => {
        const itemSubtotal = Number(item.quantity) * Number(item.unitPrice);
        const itemVat = itemSubtotal * (Number(item.vatRate) / 100);
        subtotal += itemSubtotal;
        vatAmount += itemVat;

        return {
          ...item,
          subtotal: itemSubtotal,
          vatAmount: itemVat,
          total: itemSubtotal + itemVat,
        };
      });

      const total = subtotal + vatAmount - (dto.discount || invoice.discount.toNumber());

      updateData = {
        ...updateData,
        subtotal,
        vatAmount,
        total,
        subtotalRon: subtotal * (dto.exchangeRate || invoice.exchangeRate.toNumber()),
        vatAmountRon: vatAmount * (dto.exchangeRate || invoice.exchangeRate.toNumber()),
        totalRon: total * (dto.exchangeRate || invoice.exchangeRate.toNumber()),
      };

      // Delete existing items and create new ones
      await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

      return this.prisma.invoice.update({
        where: { id },
        data: {
          ...updateData,
          items: {
            create: itemsWithTotals.map((item, index) => ({
              productId: item.productId,
              description: item.description,
              unit: item.unit || 'buc',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
              vatAmount: item.vatAmount,
              discount: item.discount || 0,
              subtotal: item.subtotal,
              total: item.total,
              sortOrder: index,
            })),
          },
        },
        include: { items: true, client: true },
      });
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { items: true, client: true },
    });
  }

  async delete(companyId: string, id: string) {
    const invoice = await this.findOne(companyId, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Doar facturile ciornă pot fi șterse');
    }

    await this.prisma.invoice.delete({ where: { id } });
    return { message: 'Factura a fost ștearsă' };
  }

  async markAsSent(companyId: string, id: string) {
    const invoice = await this.findOne(companyId, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Factura a fost deja trimisă');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async markAsPaid(companyId: string, id: string, amount?: number) {
    const invoice = await this.findOne(companyId, id);
    const payAmount = amount || invoice.total.toNumber();
    const newPaidAmount = invoice.paidAmount.toNumber() + payAmount;

    const paymentStatus: PaymentStatus =
      newPaidAmount >= invoice.total.toNumber() ? 'PAID' : 'PARTIALLY_PAID';

    const status: InvoiceStatus =
      paymentStatus === 'PAID' ? 'PAID' : 'PARTIALLY_PAID';

    await this.prisma.payment.create({
      data: {
        invoiceId: id,
        amount: payAmount,
        currency: invoice.currency,
        paymentDate: new Date(),
        method: 'transfer',
      },
    });

    return this.prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus,
        status,
        paidAmount: newPaidAmount,
        paidAt: paymentStatus === 'PAID' ? new Date() : null,
      },
    });
  }

  async getDashboardStats(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthlyRevenue, yearlyRevenue, outstandingAmount, overdueCount] = await Promise.all([
      // Monthly revenue
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: { totalRon: true },
      }),

      // Yearly revenue
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          status: 'PAID',
          paidAt: { gte: startOfYear },
        },
        _sum: { totalRon: true },
      }),

      // Outstanding amount
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        },
        _sum: { totalRon: true },
      }),

      // Overdue count
      this.prisma.invoice.count({
        where: {
          companyId,
          status: 'OVERDUE',
        },
      }),
    ]);

    return {
      monthlyRevenue: monthlyRevenue._sum.totalRon?.toNumber() || 0,
      yearlyRevenue: yearlyRevenue._sum.totalRon?.toNumber() || 0,
      outstandingAmount: outstandingAmount._sum.totalRon?.toNumber() || 0,
      overdueCount,
    };
  }
}
