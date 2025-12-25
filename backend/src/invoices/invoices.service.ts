import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceType, InvoiceStatus } from '@prisma/client';
import { EfacturaService } from '../anaf/efactura.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { SagaService } from '../saga/saga.service';
import { MultiCurrencyService, CurrencyCode } from '../finance/multi-currency.service';
import { logAudit, AuditActions } from '../logging/winston.config';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly efacturaService: EfacturaService,
    private readonly notificationsService: NotificationsService,
    private readonly sagaService: SagaService,
    private readonly multiCurrencyService: MultiCurrencyService,
  ) {}

  async create(userId: string, dto: CreateInvoiceDto) {
    const vatAmount = (dto.netAmount * dto.vatRate) / 100;
    const grossAmount = dto.netAmount + vatAmount;
    const invoiceCurrency = (dto.currency || 'RON') as CurrencyCode;
    const baseCurrency = (dto.baseCurrency || 'RON') as CurrencyCode;

    // Calculate base currency amounts for multi-currency invoices
    let exchangeRate: number | null = null;
    let baseNetAmount: number | null = null;
    let baseVatAmount: number | null = null;
    let baseGrossAmount: number | null = null;

    if (invoiceCurrency !== baseCurrency) {
      // Get official BNR rate for ANAF compliance (Romanian fiscal regulations)
      const rateInfo = await this.multiCurrencyService.getRateForInvoice(
        invoiceCurrency,
        new Date(dto.invoiceDate),
      );
      exchangeRate = dto.exchangeRate || rateInfo.rate;

      // Convert amounts to base currency
      baseNetAmount = Math.round(dto.netAmount * exchangeRate * 100) / 100;
      baseVatAmount = Math.round(vatAmount * exchangeRate * 100) / 100;
      baseGrossAmount = Math.round(grossAmount * exchangeRate * 100) / 100;

      this.logger.log(
        `Multi-currency invoice: ${invoiceCurrency} → ${baseCurrency} @ ${exchangeRate} (source: ${rateInfo.source})`,
      );
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        userId,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        type: dto.type as InvoiceType,
        status: InvoiceStatus.DRAFT,
        partnerName: dto.partnerName,
        partnerCui: dto.partnerCui,
        partnerAddress: dto.partnerAddress,
        netAmount: dto.netAmount,
        vatRate: dto.vatRate,
        vatAmount,
        grossAmount,
        currency: invoiceCurrency,
        // Multi-currency fields
        exchangeRate,
        baseCurrency,
        baseNetAmount,
        baseVatAmount,
        baseGrossAmount,
      },
    });

    // Send email notification for new invoice
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await this.notificationsService.send({
          userId,
          type: NotificationType.INVOICE_CREATED,
          recipientEmail: user.email,
          recipientName: user.company || user.email,
          data: {
            invoiceNumber: invoice.invoiceNumber,
            partnerName: invoice.partnerName,
            grossAmount: Number(invoice.grossAmount),
            currency: invoice.currency,
            invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
          },
        });
        this.logger.log(`Invoice created notification sent for ${invoice.invoiceNumber}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send invoice created notification: ${error.message}`);
    }

    // Sync to SAGA v3.2 (non-blocking)
    this.syncToSaga(invoice, userId).catch((error) => {
      this.logger.warn(`SAGA sync failed for invoice ${invoice.id}: ${error.message}`);
    });

    return invoice;
  }

  // Helper method to sync invoice to SAGA v3.2
  private async syncToSaga(invoice: any, userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const sagaInvoice = {
        number: invoice.invoiceNumber,
        date: invoice.invoiceDate.toISOString().split('T')[0],
        partner: {
          name: invoice.partnerName,
          cui: invoice.partnerCui || '',
          address: invoice.partnerAddress || '',
        },
        lines: [
          {
            description: `Invoice ${invoice.invoiceNumber}`,
            quantity: 1,
            unitPrice: Number(invoice.netAmount),
            vatRate: Number(invoice.vatRate),
          },
        ],
        totals: {
          net: Number(invoice.netAmount),
          vat: Number(invoice.vatAmount),
          gross: Number(invoice.grossAmount),
        },
      };

      const result = await this.sagaService.syncInvoice(sagaInvoice);

      // Update invoice with SAGA ID and sync status
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { sagaId: result.sagaId, sagaSynced: true },
      });

      this.logger.log(`Invoice ${invoice.invoiceNumber} synced to SAGA: ${result.sagaId}`);

      // Audit log for SAGA sync
      logAudit('SAGA_SYNC', userId, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        sagaId: result.sagaId,
      });
    } catch (error) {
      this.logger.error(`SAGA sync error for invoice ${invoice.id}: ${error.message}`);
      // Don't throw - SAGA sync failure shouldn't block invoice creation
    }
  }

  async findAll(userId: string, options?: {
    type?: InvoiceType;
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (options?.type) {
      where.type = options.type;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.startDate || options?.endDate) {
      where.invoiceDate = {};
      if (options?.startDate) {
        where.invoiceDate.gte = options.startDate;
      }
      if (options?.endDate) {
        where.invoiceDate.lte = options.endDate;
      }
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        include: {
          document: {
            select: { id: true, filename: true, fileUrl: true },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        document: true,
        user: {
          select: { company: true, cui: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  async update(userId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findOne(userId, id);

    const updateData: any = { ...dto };

    // Recalculate VAT if amounts change
    if (dto.netAmount !== undefined || dto.vatRate !== undefined) {
      const invoice = await this.prisma.invoice.findUnique({ where: { id } });
      if (invoice) {
        const netAmount = dto.netAmount ?? Number(invoice.netAmount);
        const vatRate = dto.vatRate ?? Number(invoice.vatRate);
        updateData.vatAmount = (netAmount * vatRate) / 100;
        updateData.grossAmount = netAmount + updateData.vatAmount;
      }
    }

    if (dto.invoiceDate) {
      updateData.invoiceDate = new Date(dto.invoiceDate);
    }
    if (dto.dueDate) {
      updateData.dueDate = new Date(dto.dueDate);
    }
    if (dto.spvSubmitted) {
      updateData.spvSubmittedAt = new Date();
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    // Sync updated invoice to SAGA v3.2 (non-blocking)
    this.syncToSaga(updated, userId).catch((error) => {
      this.logger.warn(`SAGA sync failed for updated invoice ${id}: ${error.message}`);
    });

    return updated;
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  async getSummary(userId: string, period?: string) {
    const startOfMonth = period
      ? new Date(`${period}-01`)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

    const [issued, received] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: InvoiceType.ISSUED,
          invoiceDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { netAmount: true, vatAmount: true, grossAmount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: InvoiceType.RECEIVED,
          invoiceDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { netAmount: true, vatAmount: true, grossAmount: true },
        _count: true,
      }),
    ]);

    const vatCollected = Number(issued._sum.vatAmount || 0);
    const vatDeductible = Number(received._sum.vatAmount || 0);

    return {
      period: period || startOfMonth.toISOString().slice(0, 7),
      issued: {
        count: issued._count,
        netAmount: Number(issued._sum.netAmount || 0),
        vatAmount: vatCollected,
        grossAmount: Number(issued._sum.grossAmount || 0),
      },
      received: {
        count: received._count,
        netAmount: Number(received._sum.netAmount || 0),
        vatAmount: vatDeductible,
        grossAmount: Number(received._sum.grossAmount || 0),
      },
      vatSummary: {
        collected: vatCollected,
        deductible: vatDeductible,
        payable: vatCollected - vatDeductible,
      },
    };
  }

  async markAsSubmitted(userId: string, id: string, efacturaId: string) {
    await this.findOne(userId, id);
    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.SUBMITTED,
        efacturaId,
        efacturaStatus: 'SUBMITTED',
        spvSubmitted: true,
        spvSubmittedAt: new Date(),
      },
    });
  }

  // Auto-submit issued invoices to ANAF e-Factura when finalized
  async finalizeAndSubmit(userId: string, id: string) {
    const invoice = await this.findOne(userId, id);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.cui) {
      throw new NotFoundException('User CUI not configured');
    }

    if (invoice.type !== InvoiceType.ISSUED) {
      throw new Error('Only issued invoices can be submitted to e-Factura');
    }

    // Generate UBL XML
    const ublInvoice = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
      supplier: {
        cui: user.cui.replace('RO', ''),
        name: user.company || '',
        address: user.address || '', // Using User.address for e-Factura
      },
      customer: {
        cui: invoice.partnerCui?.replace('RO', '') || '',
        name: invoice.partnerName,
        address: invoice.partnerAddress || '',
      },
      lines: [
        {
          description: `Invoice ${invoice.invoiceNumber}`,
          quantity: 1,
          unitPrice: Number(invoice.netAmount),
          vatRate: Number(invoice.vatRate),
          total: Number(invoice.netAmount),
        },
      ],
      totals: {
        net: Number(invoice.netAmount),
        vat: Number(invoice.vatAmount),
        gross: Number(invoice.grossAmount),
      },
    };

    const xml = this.efacturaService.generateUBL(ublInvoice);

    try {
      // Submit to ANAF SPV
      const result = await this.efacturaService.submitToSPV(xml, user.cui);

      // Update invoice status
      const updated = await this.prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.SUBMITTED,
          efacturaId: result.uploadIndex,
          efacturaStatus: result.status,
          spvSubmitted: true,
          spvSubmittedAt: new Date(),
        },
      });

      // Audit log
      logAudit(AuditActions.EFACTURA_SUBMITTED, userId, {
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        uploadIndex: result.uploadIndex,
        partnerCui: invoice.partnerCui,
      });

      this.logger.log(`Invoice ${invoice.invoiceNumber} submitted to ANAF: ${result.uploadIndex}`);

      return {
        invoice: updated,
        efactura: result,
      };
    } catch (error) {
      this.logger.error(`Failed to submit invoice ${id} to ANAF`, error);

      await this.prisma.invoice.update({
        where: { id },
        data: {
          efacturaStatus: 'FAILED',
        },
      });

      throw error;
    }
  }

  // Check e-Factura status from ANAF
  async checkEfacturaStatus(userId: string, id: string) {
    const invoice = await this.findOne(userId, id);

    if (!invoice.efacturaId) {
      throw new NotFoundException('Invoice not submitted to e-Factura');
    }

    const status = await this.efacturaService.checkStatus(invoice.efacturaId);

    await this.prisma.invoice.update({
      where: { id },
      data: {
        efacturaStatus: status.status,
      },
    });

    return status;
  }

  // Mark invoice as paid with notification
  async markAsPaid(userId: string, id: string, paymentDate?: Date) {
    const invoice = await this.findOne(userId, id);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: paymentDate || new Date(),
      },
    });

    // Send payment confirmation notification
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await this.notificationsService.send({
          userId,
          type: NotificationType.INVOICE_PAID,
          recipientEmail: user.email,
          recipientName: user.company || user.email,
          data: {
            invoiceNumber: invoice.invoiceNumber,
            partnerName: invoice.partnerName,
            grossAmount: Number(invoice.grossAmount),
            currency: invoice.currency,
            paidDate: (paymentDate || new Date()).toISOString().split('T')[0],
          },
        });
        this.logger.log(`Invoice paid notification sent for ${invoice.invoiceNumber}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send invoice paid notification: ${error.message}`);
    }

    return updated;
  }

  // Get overdue invoices for a user with summary for dashboard widget
  async getOverdueInvoices(userId: string, limit: number = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all overdue invoices for summary
    const allOverdue = await this.prisma.invoice.findMany({
      where: {
        userId,
        status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.PENDING, InvoiceStatus.SUBMITTED, InvoiceStatus.APPROVED] },
        dueDate: { lt: today },
      },
      select: {
        id: true,
        grossAmount: true,
        currency: true,
        dueDate: true,
      },
    });

    // Calculate summary
    const totalAmount = allOverdue.reduce((sum, inv) => sum + Number(inv.grossAmount), 0);
    const currencies = [...new Set(allOverdue.map(inv => inv.currency))];

    // Calculate days overdue ranges
    const ranges = {
      under30: 0,
      between30And60: 0,
      between60And90: 0,
      over90: 0,
    };

    allOverdue.forEach(inv => {
      if (!inv.dueDate) return;
      const daysOverdue = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue < 30) ranges.under30++;
      else if (daysOverdue < 60) ranges.between30And60++;
      else if (daysOverdue < 90) ranges.between60And90++;
      else ranges.over90++;
    });

    // Get limited invoices for display
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.PENDING, InvoiceStatus.SUBMITTED, InvoiceStatus.APPROVED] },
        dueDate: { lt: today },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Add days overdue to each invoice
    const invoicesWithDays = invoices.map(inv => ({
      ...inv,
      daysOverdue: inv.dueDate
        ? Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      urgency: inv.dueDate
        ? this.getUrgencyLevel(Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 'low',
    }));

    return {
      summary: {
        totalCount: allOverdue.length,
        totalAmount,
        mainCurrency: currencies.includes('RON') ? 'RON' : currencies[0] || 'RON',
        currencies,
        ranges,
      },
      invoices: invoicesWithDays,
    };
  }

  private getUrgencyLevel(daysOverdue: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysOverdue < 7) return 'low';
    if (daysOverdue < 30) return 'medium';
    if (daysOverdue < 60) return 'high';
    return 'critical';
  }

  // Get invoices approaching due date (within 7 days)
  async getInvoicesNearingDue(userId: string, daysAhead = 7) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return this.prisma.invoice.findMany({
      where: {
        userId,
        status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SUBMITTED] },
        dueDate: {
          gte: today,
          lte: futureDate,
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Batch update invoice status
   * Allows updating multiple invoices to the same status in one operation
   */
  async batchUpdateStatus(
    userId: string,
    invoiceIds: string[],
    newStatus: InvoiceStatus,
    options?: {
      paymentDate?: Date;
      notes?: string;
    },
  ): Promise<{
    success: Array<{ id: string; invoiceNumber: string; previousStatus: string; newStatus: string }>;
    failed: Array<{ id: string; invoiceNumber?: string; error: string }>;
    summary: { total: number; updated: number; failed: number };
  }> {
    const success: Array<{ id: string; invoiceNumber: string; previousStatus: string; newStatus: string }> = [];
    const failed: Array<{ id: string; invoiceNumber?: string; error: string }> = [];

    // Validate the invoices belong to the user
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        userId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        type: true,
      },
    });

    const foundIds = invoices.map((inv) => inv.id);
    const notFoundIds = invoiceIds.filter((id) => !foundIds.includes(id));

    // Add not found invoices to failed list
    for (const id of notFoundIds) {
      failed.push({ id, error: 'Factura nu a fost gasita' });
    }

    // Process each invoice
    for (const invoice of invoices) {
      try {
        // Validate status transition
        const validTransition = this.validateStatusTransition(invoice.status, newStatus);
        if (!validTransition.valid) {
          failed.push({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: validTransition.error || 'Tranziție de status invalidă',
          });
          continue;
        }

        // Prepare update data
        const updateData: any = { status: newStatus };

        if (newStatus === InvoiceStatus.PAID && options?.paymentDate) {
          updateData.paidAt = options.paymentDate;
        } else if (newStatus === InvoiceStatus.PAID) {
          updateData.paidAt = new Date();
        }

        if (newStatus === InvoiceStatus.CANCELLED) {
          updateData.cancelledAt = new Date();
          if (options?.notes) {
            updateData.metadata = {
              cancellationReason: options.notes,
              cancelledAt: new Date().toISOString(),
            };
          }
        }

        // Update the invoice
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: updateData,
        });

        success.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          previousStatus: invoice.status,
          newStatus,
        });

        this.logger.log(
          `Invoice ${invoice.invoiceNumber} status updated: ${invoice.status} -> ${newStatus}`,
        );
      } catch (error: any) {
        this.logger.error(`Failed to update invoice ${invoice.id}: ${error.message}`);
        failed.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          error: error.message,
        });
      }
    }

    // Audit log for batch operation
    logAudit('BATCH_STATUS_UPDATE', userId, {
      invoiceIds,
      newStatus,
      successCount: success.length,
      failedCount: failed.length,
    });

    return {
      success,
      failed,
      summary: {
        total: invoiceIds.length,
        updated: success.length,
        failed: failed.length,
      },
    };
  }

  /**
   * Validate if a status transition is allowed
   */
  private validateStatusTransition(
    currentStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
  ): { valid: boolean; error?: string } {
    // Define valid transitions
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [
        InvoiceStatus.PENDING,
        InvoiceStatus.SUBMITTED,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.PENDING]: [
        InvoiceStatus.SUBMITTED,
        InvoiceStatus.APPROVED,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.SUBMITTED]: [
        InvoiceStatus.APPROVED,
        InvoiceStatus.PAID,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.APPROVED]: [
        InvoiceStatus.PAID,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.PAID]: [],
      [InvoiceStatus.CANCELLED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Nu se poate schimba statusul de la ${currentStatus} la ${newStatus}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get available status transitions for an invoice
   */
  async getAvailableStatusTransitions(userId: string, invoiceId: string) {
    const invoice = await this.findOne(userId, invoiceId);

    const validTransitions: Record<InvoiceStatus, Array<{ status: InvoiceStatus; label: string }>> = {
      [InvoiceStatus.DRAFT]: [
        { status: InvoiceStatus.PENDING, label: 'Trimite pentru aprobare' },
        { status: InvoiceStatus.SUBMITTED, label: 'Trimite la ANAF' },
        { status: InvoiceStatus.CANCELLED, label: 'Anuleaza' },
      ],
      [InvoiceStatus.PENDING]: [
        { status: InvoiceStatus.SUBMITTED, label: 'Trimite la ANAF' },
        { status: InvoiceStatus.APPROVED, label: 'Aproba' },
        { status: InvoiceStatus.CANCELLED, label: 'Anuleaza' },
      ],
      [InvoiceStatus.SUBMITTED]: [
        { status: InvoiceStatus.APPROVED, label: 'Aproba' },
        { status: InvoiceStatus.PAID, label: 'Marcheaza platita' },
        { status: InvoiceStatus.CANCELLED, label: 'Anuleaza' },
      ],
      [InvoiceStatus.APPROVED]: [
        { status: InvoiceStatus.PAID, label: 'Marcheaza platita' },
        { status: InvoiceStatus.CANCELLED, label: 'Anuleaza' },
      ],
      [InvoiceStatus.PAID]: [],
      [InvoiceStatus.CANCELLED]: [],
    };

    return {
      invoiceId: invoice.id,
      currentStatus: invoice.status,
      availableTransitions: validTransitions[invoice.status] || [],
    };
  }

  /**
   * Find matching suppliers/partners for a supplier invoice
   * Uses AI-powered matching based on CUI, name similarity, and transaction history
   */
  async findSupplierMatches(userId: string, invoiceId: string): Promise<{
    invoice: any;
    matches: {
      partners: Array<{
        partnerId: string;
        partnerName: string;
        partnerCui: string | null;
        matchScore: number;
        matchReason: string;
        transactionCount: number;
        lastTransaction?: Date;
      }>;
      purchaseOrders: Array<{
        orderId: string;
        orderNumber: string;
        amount: number;
        currency: string;
        matchScore: number;
        matchReason: string;
        orderDate: Date;
      }>;
      payments: Array<{
        paymentId: string;
        amount: number;
        currency: string;
        matchScore: number;
        matchReason: string;
        paymentDate: Date;
        reference?: string;
      }>;
      stockReceipts: Array<{
        receiptId: string;
        receiptNumber: string;
        amount: number;
        matchScore: number;
        matchReason: string;
        receiptDate: Date;
      }>;
    };
    recommendations: string[];
    bestMatch?: {
      type: 'partner' | 'purchaseOrder' | 'payment' | 'stockReceipt';
      id: string;
      name: string;
      score: number;
    };
  }> {
    const invoice = await this.findOne(userId, invoiceId);

    const matches = {
      partners: [] as any[],
      purchaseOrders: [] as any[],
      payments: [] as any[],
      stockReceipts: [] as any[],
    };
    const recommendations: string[] = [];

    // 1. Match by partner CUI (exact match)
    if (invoice.partnerCui) {
      const exactCuiMatch = await this.prisma.partner.findFirst({
        where: { userId, cui: invoice.partnerCui },
      });

      if (exactCuiMatch) {
        const transactionCount = await this.prisma.invoice.count({
          where: { userId, partnerCui: invoice.partnerCui },
        });
        const lastInvoice = await this.prisma.invoice.findFirst({
          where: { userId, partnerCui: invoice.partnerCui },
          orderBy: { invoiceDate: 'desc' },
        });

        matches.partners.push({
          partnerId: exactCuiMatch.id,
          partnerName: exactCuiMatch.name,
          partnerCui: exactCuiMatch.cui,
          matchScore: 100,
          matchReason: 'Potrivire exacta CUI',
          transactionCount,
          lastTransaction: lastInvoice?.invoiceDate,
        });
      }
    }

    // 2. Match by partner name (fuzzy)
    if (invoice.partnerName) {
      const nameWords = invoice.partnerName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const potentialPartners = await this.prisma.partner.findMany({
        where: {
          userId,
          id: { notIn: matches.partners.map(p => p.partnerId) },
        },
        take: 50,
      });

      for (const partner of potentialPartners) {
        const partnerWords = partner.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const commonWords = nameWords.filter(w => partnerWords.some(pw => pw.includes(w) || w.includes(pw)));

        if (commonWords.length > 0) {
          const score = Math.min(90, 40 + (commonWords.length / Math.max(nameWords.length, partnerWords.length)) * 50);
          const transactionCount = await this.prisma.invoice.count({
            where: { userId, partnerName: partner.name },
          });

          matches.partners.push({
            partnerId: partner.id,
            partnerName: partner.name,
            partnerCui: partner.cui,
            matchScore: Math.round(score),
            matchReason: `Nume similar: ${commonWords.join(', ')}`,
            transactionCount,
          });
        }
      }
    }

    // 3. Match with unmatched payments by amount
    const invoiceAmount = Number(invoice.grossAmount);
    const tolerance = invoiceAmount * 0.01; // 1% tolerance

    try {
      const unmatchedPayments = await this.prisma.$queryRaw<any[]>`
        SELECT id, amount, currency, "paymentDate", reference, description
        FROM "Payment"
        WHERE "userId" = ${userId}
        AND "invoiceId" IS NULL
        AND amount BETWEEN ${invoiceAmount - tolerance} AND ${invoiceAmount + tolerance}
        ORDER BY ABS(amount - ${invoiceAmount})
        LIMIT 5
      `;

      for (const payment of unmatchedPayments) {
        const amountDiff = Math.abs(Number(payment.amount) - invoiceAmount);
        const score = 100 - (amountDiff / invoiceAmount * 100);

        matches.payments.push({
          paymentId: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          matchScore: Math.round(score),
          matchReason: amountDiff === 0 ? 'Suma identica' : `Diferenta: ${amountDiff.toFixed(2)} ${invoice.currency}`,
          paymentDate: payment.paymentDate,
          reference: payment.reference,
        });
      }
    } catch {
      this.logger.warn('Payment matching query failed - table may not exist');
    }

    // 4. Match with stock movements (for inventory-related invoices)
    try {
      const recentMovements = await this.prisma.stockMovement.findMany({
        where: {
          createdBy: userId,
          type: 'IN',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        include: { product: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      for (const movement of recentMovements) {
        const movementAmount = Number(movement.quantity) * Number(movement.unitCost || 0);
        if (Math.abs(movementAmount - invoiceAmount) / invoiceAmount < 0.1) {
          matches.stockReceipts.push({
            receiptId: movement.id,
            receiptNumber: movement.reference || `SM-${movement.id.substring(0, 8)}`,
            amount: movementAmount,
            matchScore: 80,
            matchReason: `Receptie stoc ${movement.product?.name || 'produs'}`,
            receiptDate: movement.createdAt,
          });
        }
      }
    } catch {
      this.logger.warn('Stock movement matching failed - table may not exist');
    }

    // Generate recommendations
    if (matches.partners.length === 0) {
      recommendations.push('Nu s-a gasit niciun partener. Creati un partener nou pentru acest furnizor.');
    } else if (matches.partners.length === 1 && matches.partners[0].matchScore === 100) {
      recommendations.push(`Potrivire perfecta cu partenerul "${matches.partners[0].partnerName}". Se recomanda asocierea automata.`);
    } else if (matches.partners.length > 1) {
      recommendations.push(`${matches.partners.length} parteneri posibili gasiti. Verificati manual potrivirea corecta.`);
    }

    if (matches.payments.length > 0) {
      recommendations.push(`${matches.payments.length} plati neasociate cu sume similare. Verificati pentru reconciliere.`);
    }

    // Determine best match
    let bestMatch: any;
    const topPartner = matches.partners.sort((a, b) => b.matchScore - a.matchScore)[0];
    const topPayment = matches.payments.sort((a, b) => b.matchScore - a.matchScore)[0];

    if (topPartner?.matchScore >= 90) {
      bestMatch = {
        type: 'partner',
        id: topPartner.partnerId,
        name: topPartner.partnerName,
        score: topPartner.matchScore,
      };
    } else if (topPayment?.matchScore >= 95) {
      bestMatch = {
        type: 'payment',
        id: topPayment.paymentId,
        name: `Plata ${topPayment.reference || topPayment.paymentId.substring(0, 8)}`,
        score: topPayment.matchScore,
      };
    }

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        partnerName: invoice.partnerName,
        partnerCui: invoice.partnerCui,
        grossAmount: invoice.grossAmount,
        currency: invoice.currency,
        invoiceDate: invoice.invoiceDate,
      },
      matches,
      recommendations,
      bestMatch,
    };
  }

  /**
   * Link supplier invoice to partner
   */
  async linkToPartner(userId: string, invoiceId: string, partnerId: string): Promise<any> {
    const invoice = await this.findOne(userId, invoiceId);
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, userId },
    });

    if (!partner) {
      throw new NotFoundException('Partenerul nu a fost gasit');
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        partnerId: partnerId,
        partnerName: partner.name,
        partnerCui: partner.cui,
        partnerAddress: partner.address,
      },
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} linked to partner ${partner.name}`);

    return {
      success: true,
      invoice: updated,
      partner: {
        id: partner.id,
        name: partner.name,
        cui: partner.cui,
      },
    };
  }

  /**
   * Link supplier invoice to payment
   */
  async linkToPayment(userId: string, invoiceId: string, paymentId: string): Promise<any> {
    const invoice = await this.findOne(userId, invoiceId);

    try {
      const payment = await this.prisma.$queryRaw<any[]>`
        SELECT id, amount, currency, "paymentDate", reference
        FROM "Payment"
        WHERE id = ${paymentId} AND "userId" = ${userId}
        LIMIT 1
      `;

      if (!payment || payment.length === 0) {
        throw new NotFoundException('Plata nu a fost gasita');
      }

      await this.prisma.$executeRaw`
        UPDATE "Payment"
        SET "invoiceId" = ${invoiceId}, "updatedAt" = NOW()
        WHERE id = ${paymentId}
      `;

      // Update invoice status to PAID if amounts match
      const invoiceAmount = Number(invoice.grossAmount);
      const paymentAmount = Number(payment[0].amount);

      if (Math.abs(invoiceAmount - paymentAmount) < 0.01) {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: InvoiceStatus.PAID, paidAt: payment[0].paymentDate },
        });
      }

      this.logger.log(`Invoice ${invoice.invoiceNumber} linked to payment ${paymentId}`);

      return {
        success: true,
        invoiceId,
        paymentId,
        amountMatch: Math.abs(invoiceAmount - paymentAmount) < 0.01,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.warn(`Payment linking failed: ${error.message}`);
      throw new NotFoundException('Nu s-a putut face legatura cu plata');
    }
  }

  /**
   * Get unmatched supplier invoices (RECEIVED type without partner link)
   */
  async getUnmatchedSupplierInvoices(userId: string, options?: {
    limit?: number;
    offset?: number;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<{
    invoices: any[];
    total: number;
    summary: {
      totalUnmatched: number;
      totalAmount: number;
      oldestUnmatched?: Date;
    };
  }> {
    const { limit = 20, offset = 0, minAmount, maxAmount } = options || {};

    const where: any = {
      userId,
      type: InvoiceType.RECEIVED,
      partnerId: null,
    };

    if (minAmount !== undefined) {
      where.grossAmount = { ...where.grossAmount, gte: minAmount };
    }
    if (maxAmount !== undefined) {
      where.grossAmount = { ...where.grossAmount, lte: maxAmount };
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    // Get summary stats
    const allUnmatched = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: InvoiceType.RECEIVED,
        partnerId: null,
      },
      select: {
        grossAmount: true,
        invoiceDate: true,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    return {
      invoices,
      total,
      summary: {
        totalUnmatched: allUnmatched.length,
        totalAmount: allUnmatched.reduce((sum, inv) => sum + Number(inv.grossAmount), 0),
        oldestUnmatched: allUnmatched[0]?.invoiceDate,
      },
    };
  }
}
