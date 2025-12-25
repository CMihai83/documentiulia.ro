import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoiceReminderService, ReminderSettings } from './invoice-reminder.service';
import { PrismaService } from '../prisma/prisma.service';

interface UpdateSettingsDto {
  enabled?: boolean;
  daysBeforeDue?: number[];
  daysAfterDue?: number[];
  includeInvoicePdf?: boolean;
  customMessage?: string;
}

interface SendReminderDto {
  customMessage?: string;
}

@ApiTags('Invoice Reminders')
@Controller('invoices/reminders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceReminderController {
  constructor(
    private readonly reminderService: InvoiceReminderService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get reminder settings for the user's organization
   */
  @Get('settings')
  @ApiOperation({ summary: 'Get invoice reminder settings' })
  @ApiResponse({ status: 200, description: 'Returns current reminder settings' })
  async getSettings(@Request() req: any) {
    const userId = req.user.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return {
        enabled: false,
        message: 'Nu aparții unei organizații',
      };
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.activeOrganizationId },
      select: { settings: true },
    });

    const settings = typeof org?.settings === 'string'
      ? JSON.parse(org.settings)
      : org?.settings || {};

    return {
      enabled: settings.invoiceReminders?.enabled ?? true,
      daysBeforeDue: settings.invoiceReminders?.daysBeforeDue ?? [7, 3, 1],
      daysAfterDue: settings.invoiceReminders?.daysAfterDue ?? [1, 7, 14, 30],
      includeInvoicePdf: settings.invoiceReminders?.includeInvoicePdf ?? true,
      customMessage: settings.invoiceReminders?.customMessage ?? '',
    };
  }

  /**
   * Update reminder settings
   */
  @Put('settings')
  @ApiOperation({ summary: 'Update invoice reminder settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @Request() req: any,
    @Body() dto: UpdateSettingsDto,
  ) {
    const userId = req.user.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return {
        success: false,
        message: 'Nu aparții unei organizații',
      };
    }

    const settings = await this.reminderService.updateReminderSettings(
      user.activeOrganizationId,
      userId,
      dto,
    );

    return {
      success: true,
      message: 'Setările au fost actualizate',
      settings,
    };
  }

  /**
   * Get reminder logs
   */
  @Get('logs')
  @ApiOperation({ summary: 'Get invoice reminder logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns reminder logs' })
  async getLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return { logs: [] };
    }

    const logs = await this.reminderService.getReminderLogs(
      user.activeOrganizationId,
      limit ? parseInt(limit) : 50,
    );

    // Enrich logs with invoice numbers
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: log.invoiceId },
          select: { invoiceNumber: true, partnerName: true },
        });

        return {
          ...log,
          invoiceNumber: invoice?.invoiceNumber || 'N/A',
          partnerName: invoice?.partnerName || 'N/A',
        };
      }),
    );

    return { logs: enrichedLogs };
  }

  /**
   * Get reminder statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get invoice reminder statistics' })
  @ApiResponse({ status: 200, description: 'Returns reminder statistics' })
  async getStats(@Request() req: any) {
    const userId = req.user.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return {
        totalSent: 0,
        sentToday: 0,
        sentThisWeek: 0,
        sentThisMonth: 0,
        failedCount: 0,
        byType: { before_due: 0, on_due: 0, after_due: 0 },
      };
    }

    return this.reminderService.getReminderStats(user.activeOrganizationId);
  }

  /**
   * Send a manual reminder for a specific invoice
   */
  @Post(':invoiceId/send')
  @ApiOperation({ summary: 'Send manual invoice reminder' })
  @ApiResponse({ status: 200, description: 'Reminder sent successfully' })
  async sendReminder(
    @Request() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SendReminderDto,
  ) {
    const userId = req.user.sub;
    return this.reminderService.sendManualReminder(invoiceId, userId, dto.customMessage);
  }

  /**
   * Get overdue invoices that need reminders
   */
  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue invoices needing reminders' })
  @ApiResponse({ status: 200, description: 'Returns list of overdue invoices' })
  async getOverdueInvoices(@Request() req: any) {
    const userId = req.user.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return { invoices: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId: user.activeOrganizationId,
        type: 'ISSUED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { lt: today },
      },
      include: {
        partner: {
          select: { name: true, email: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return {
      count: overdueInvoices.length,
      totalAmount: overdueInvoices.reduce(
        (sum, inv) => sum + (Number(inv.grossAmount) - Number(inv.paidAmount || 0)),
        0,
      ),
      invoices: overdueInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        partnerName: inv.partnerName,
        partnerEmail: inv.partner?.email,
        dueDate: inv.dueDate,
        daysOverdue: Math.ceil((today.getTime() - new Date(inv.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
        amount: Number(inv.grossAmount),
        paidAmount: Number(inv.paidAmount || 0),
        remainingAmount: Number(inv.grossAmount) - Number(inv.paidAmount || 0),
        currency: inv.currency,
      })),
    };
  }

  /**
   * Get upcoming due invoices
   */
  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming due invoices' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days ahead to look (default 7)' })
  @ApiResponse({ status: 200, description: 'Returns list of upcoming due invoices' })
  async getUpcomingDueInvoices(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    const userId = req.user.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) {
      return { invoices: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysAhead = days ? parseInt(days) : 7;
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const upcomingInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId: user.activeOrganizationId,
        type: 'ISSUED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        partner: {
          select: { name: true, email: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return {
      count: upcomingInvoices.length,
      totalAmount: upcomingInvoices.reduce(
        (sum, inv) => sum + (Number(inv.grossAmount) - Number(inv.paidAmount || 0)),
        0,
      ),
      invoices: upcomingInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        partnerName: inv.partnerName,
        partnerEmail: inv.partner?.email,
        dueDate: inv.dueDate,
        daysUntilDue: Math.ceil((new Date(inv.dueDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        amount: Number(inv.grossAmount),
        paidAmount: Number(inv.paidAmount || 0),
        remainingAmount: Number(inv.grossAmount) - Number(inv.paidAmount || 0),
        currency: inv.currency,
      })),
    };
  }
}
