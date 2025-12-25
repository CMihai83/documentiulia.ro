import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUALLY = 'BIANNUALLY',
  ANNUALLY = 'ANNUALLY',
}

export interface RecurringInvoiceTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  partnerId: string;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate?: Date;
  nextRunDate: Date;
  lastRunDate?: Date;
  dayOfMonth?: number; // For monthly/quarterly/etc
  dayOfWeek?: number; // For weekly (0-6, Sunday-Saturday)
  isActive: boolean;
  autoSend: boolean;
  autoSubmitSpv: boolean;
  currency: string;
  vatRate: number;
  items: RecurringInvoiceItem[];
  notes?: string;
  paymentTermsDays: number;
  seriesName?: string;
  createdAt: Date;
  updatedAt: Date;
  generatedCount: number;
}

export interface RecurringInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  vatRate: number;
  discount?: number;
}

export interface CreateRecurringInvoiceDto {
  name: string;
  description?: string;
  partnerId: string;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate?: Date;
  dayOfMonth?: number;
  dayOfWeek?: number;
  autoSend?: boolean;
  autoSubmitSpv?: boolean;
  currency?: string;
  vatRate?: number;
  items: RecurringInvoiceItem[];
  notes?: string;
  paymentTermsDays?: number;
  seriesName?: string;
}

@Injectable()
export class RecurringInvoiceService {
  private readonly logger = new Logger(RecurringInvoiceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new recurring invoice template
   */
  async create(userId: string, dto: CreateRecurringInvoiceDto): Promise<RecurringInvoiceTemplate> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      throw new Error('Utilizatorul nu aparține unei organizații');
    }

    const organizationId = user.activeOrganizationId;

    // Calculate first run date
    const nextRunDate = this.calculateNextRunDate(
      new Date(dto.startDate),
      dto.frequency,
      dto.dayOfMonth,
      dto.dayOfWeek,
    );

    const template = await this.prisma.recurringInvoice.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        partnerId: dto.partnerId,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextRunDate,
        dayOfMonth: dto.dayOfMonth,
        dayOfWeek: dto.dayOfWeek,
        isActive: true,
        autoSend: dto.autoSend ?? false,
        autoSubmitSpv: dto.autoSubmitSpv ?? false,
        currency: dto.currency || 'RON',
        vatRate: dto.vatRate || 19,
        items: JSON.stringify(dto.items),
        notes: dto.notes,
        paymentTermsDays: dto.paymentTermsDays || 30,
        seriesName: dto.seriesName,
        generatedCount: 0,
      },
    });

    return this.mapToTemplate(template);
  }

  /**
   * Update recurring invoice template
   */
  async update(id: string, userId: string, dto: Partial<CreateRecurringInvoiceDto>): Promise<RecurringInvoiceTemplate> {
    const template = await this.prisma.recurringInvoice.findFirst({
      where: { id },
      include: { organization: { include: { members: true } } },
    });

    if (!template) {
      throw new Error('Șablonul nu a fost găsit');
    }

    const isOwner = template.organization.members.some(m => m.userId === userId);
    if (!isOwner) {
      throw new Error('Nu aveți permisiunea să modificați acest șablon');
    }

    const updateData: any = { ...dto };

    // Recalculate next run date if schedule changed
    if (dto.startDate || dto.frequency || dto.dayOfMonth || dto.dayOfWeek) {
      updateData.nextRunDate = this.calculateNextRunDate(
        dto.startDate ? new Date(dto.startDate) : template.startDate,
        dto.frequency || (template.frequency as RecurrenceFrequency),
        dto.dayOfMonth ?? template.dayOfMonth ?? undefined,
        dto.dayOfWeek ?? template.dayOfWeek ?? undefined,
      );
    }

    if (dto.items) {
      updateData.items = JSON.stringify(dto.items);
    }

    const updated = await this.prisma.recurringInvoice.update({
      where: { id },
      data: updateData,
    });

    return this.mapToTemplate(updated);
  }

  /**
   * Delete recurring invoice template
   */
  async delete(id: string, userId: string): Promise<void> {
    const template = await this.prisma.recurringInvoice.findFirst({
      where: { id },
      include: { organization: { include: { members: true } } },
    });

    if (!template) {
      throw new Error('Șablonul nu a fost găsit');
    }

    const isOwner = template.organization.members.some(m => m.userId === userId);
    if (!isOwner) {
      throw new Error('Nu aveți permisiunea să ștergeți acest șablon');
    }

    await this.prisma.recurringInvoice.delete({ where: { id } });
  }

  /**
   * Get all recurring invoice templates for user's organization
   */
  async findAll(userId: string, includeInactive = false): Promise<RecurringInvoiceTemplate[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return [];
    }

    const templates = await this.prisma.recurringInvoice.findMany({
      where: {
        organizationId: user.activeOrganizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: { partner: true },
      orderBy: { nextRunDate: 'asc' },
    });

    return templates.map(t => this.mapToTemplate(t));
  }

  /**
   * Get single recurring invoice template
   */
  async findOne(id: string): Promise<RecurringInvoiceTemplate | null> {
    const template = await this.prisma.recurringInvoice.findUnique({
      where: { id },
      include: { partner: true },
    });

    return template ? this.mapToTemplate(template) : null;
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string, userId: string): Promise<RecurringInvoiceTemplate> {
    const template = await this.prisma.recurringInvoice.findFirst({
      where: { id },
      include: { organization: { include: { members: true } } },
    });

    if (!template) {
      throw new Error('Șablonul nu a fost găsit');
    }

    const isOwner = template.organization.members.some(m => m.userId === userId);
    if (!isOwner) {
      throw new Error('Nu aveți permisiunea să modificați acest șablon');
    }

    const updated = await this.prisma.recurringInvoice.update({
      where: { id },
      data: { isActive: !template.isActive },
    });

    return this.mapToTemplate(updated);
  }

  /**
   * Manually trigger invoice generation for a template
   */
  async generateInvoiceNow(id: string, userId: string): Promise<any> {
    const template = await this.findOne(id);
    if (!template) {
      throw new Error('Șablonul nu a fost găsit');
    }

    return this.generateInvoiceFromTemplate(template);
  }

  /**
   * Cron job: Process due recurring invoices
   * Runs every day at 6:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processRecurringInvoices(): Promise<void> {
    this.logger.log('Processing recurring invoices...');

    const now = new Date();
    const dueTemplates = await this.prisma.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextRunDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: { partner: true },
    });

    this.logger.log(`Found ${dueTemplates.length} due recurring invoices`);

    for (const template of dueTemplates) {
      try {
        const mappedTemplate = this.mapToTemplate(template);
        await this.generateInvoiceFromTemplate(mappedTemplate);

        // Update next run date
        const nextRunDate = this.calculateNextRunDate(
          now,
          template.frequency as RecurrenceFrequency,
          template.dayOfMonth ?? undefined,
          template.dayOfWeek ?? undefined,
        );

        await this.prisma.recurringInvoice.update({
          where: { id: template.id },
          data: {
            lastRunDate: now,
            nextRunDate,
            generatedCount: { increment: 1 },
          },
        });

        this.logger.log(`Generated invoice from template: ${template.name}`);
      } catch (error: any) {
        this.logger.error(`Failed to generate invoice from template ${template.id}: ${error.message}`);
      }
    }
  }

  /**
   * Generate an invoice from a template
   */
  private async generateInvoiceFromTemplate(template: RecurringInvoiceTemplate): Promise<any> {
    const items = template.items || [];
    const netAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const vatAmount = netAmount * (template.vatRate / 100);
    const grossAmount = netAmount + vatAmount;

    // Get partner info for partnerName
    const partner = await this.prisma.partner.findUnique({
      where: { id: template.partnerId },
    });

    if (!partner) {
      throw new Error(`Partenerul ${template.partnerId} nu a fost găsit`);
    }

    // Get a userId from organization members (owner/admin)
    const orgMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: template.organizationId,
        role: { in: ['OWNER', 'ADMIN'] },
        isActive: true,
      },
      select: { userId: true },
    });

    if (!orgMember) {
      throw new Error(`Nu există utilizatori activi în organizația ${template.organizationId}`);
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: {
        organizationId: template.organizationId,
        invoiceDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });

    const invoiceNumber = `${template.seriesName || 'REC'}${year}-${String(count + 1).padStart(5, '0')}`;

    // Calculate due date
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + template.paymentTermsDays);

    // Create the invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        userId: orgMember.userId,
        organizationId: template.organizationId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        type: 'ISSUED',
        status: template.autoSend ? 'PENDING' : 'DRAFT',
        partnerName: partner.name,
        partnerCui: partner.cui,
        partnerAddress: partner.address,
        partnerId: template.partnerId,
        currency: template.currency,
        netAmount,
        vatAmount,
        grossAmount,
        vatRate: template.vatRate,
        notes: template.notes,
        paymentStatus: 'UNPAID',
        isRecurring: true,
        recurringInvoiceId: template.id,
        items: {
          create: items.map((item, index) => ({
            lineNumber: index + 1,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            netAmount: item.quantity * item.unitPrice,
            vatAmount: item.quantity * item.unitPrice * (item.vatRate / 100),
            grossAmount: item.quantity * item.unitPrice * (1 + item.vatRate / 100),
            discount: item.discount || 0,
          })),
        },
      },
      include: { items: true, partner: true },
    });

    this.logger.log(`Created recurring invoice: ${invoiceNumber}`);

    // TODO: If autoSubmitSpv is enabled, submit to SPV
    // TODO: If autoSend is enabled, send via email

    return invoice;
  }

  /**
   * Calculate the next run date based on frequency
   */
  private calculateNextRunDate(
    fromDate: Date,
    frequency: RecurrenceFrequency,
    dayOfMonth?: number,
    dayOfWeek?: number,
  ): Date {
    const result = new Date(fromDate);
    const now = new Date();

    // If fromDate is in the past, start from today
    if (result < now) {
      result.setTime(now.getTime());
    }

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        result.setDate(result.getDate() + 1);
        break;

      case RecurrenceFrequency.WEEKLY:
        result.setDate(result.getDate() + 7);
        if (dayOfWeek !== undefined) {
          const currentDay = result.getDay();
          const daysUntil = (dayOfWeek - currentDay + 7) % 7;
          result.setDate(result.getDate() + daysUntil);
        }
        break;

      case RecurrenceFrequency.BIWEEKLY:
        result.setDate(result.getDate() + 14);
        break;

      case RecurrenceFrequency.MONTHLY:
        result.setMonth(result.getMonth() + 1);
        if (dayOfMonth) {
          result.setDate(Math.min(dayOfMonth, this.getDaysInMonth(result)));
        }
        break;

      case RecurrenceFrequency.QUARTERLY:
        result.setMonth(result.getMonth() + 3);
        if (dayOfMonth) {
          result.setDate(Math.min(dayOfMonth, this.getDaysInMonth(result)));
        }
        break;

      case RecurrenceFrequency.BIANNUALLY:
        result.setMonth(result.getMonth() + 6);
        if (dayOfMonth) {
          result.setDate(Math.min(dayOfMonth, this.getDaysInMonth(result)));
        }
        break;

      case RecurrenceFrequency.ANNUALLY:
        result.setFullYear(result.getFullYear() + 1);
        break;
    }

    // Set time to 6:00 AM
    result.setHours(6, 0, 0, 0);

    return result;
  }

  /**
   * Get days in a specific month
   */
  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * Map Prisma record to template interface
   */
  private mapToTemplate(record: any): RecurringInvoiceTemplate {
    return {
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      description: record.description,
      partnerId: record.partnerId,
      frequency: record.frequency as RecurrenceFrequency,
      startDate: record.startDate,
      endDate: record.endDate,
      nextRunDate: record.nextRunDate,
      lastRunDate: record.lastRunDate,
      dayOfMonth: record.dayOfMonth,
      dayOfWeek: record.dayOfWeek,
      isActive: record.isActive,
      autoSend: record.autoSend,
      autoSubmitSpv: record.autoSubmitSpv,
      currency: record.currency,
      vatRate: record.vatRate,
      items: typeof record.items === 'string' ? JSON.parse(record.items) : record.items || [],
      notes: record.notes,
      paymentTermsDays: record.paymentTermsDays,
      seriesName: record.seriesName,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      generatedCount: record.generatedCount,
    };
  }

  /**
   * Get upcoming scheduled invoices (next 30 days)
   */
  async getUpcoming(userId: string): Promise<RecurringInvoiceTemplate[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return [];
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const templates = await this.prisma.recurringInvoice.findMany({
      where: {
        organizationId: user.activeOrganizationId,
        isActive: true,
        nextRunDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
      include: { partner: true },
      orderBy: { nextRunDate: 'asc' },
    });

    return templates.map(t => this.mapToTemplate(t));
  }

  /**
   * Get generated invoices from a template
   */
  async getGeneratedInvoices(templateId: string): Promise<any[]> {
    return this.prisma.invoice.findMany({
      where: { recurringInvoiceId: templateId },
      include: { partner: true },
      orderBy: { invoiceDate: 'desc' },
      take: 10,
    });
  }
}
