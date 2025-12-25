import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

/**
 * API Aliases Controller
 * Provides simplified API paths that map to the full paths
 */

@ApiTags('VAT')
@ApiBearerAuth()
@Controller('vat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class VatAliasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all VAT reports for current user' })
  async getVATReports(@Request() req: any) {
    return this.prisma.vATReport.findMany({
      where: { userId: req.user.sub },
      orderBy: { period: 'desc' },
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get VAT summary statistics' })
  async getVATSummary(@Request() req: any) {
    const reports = await this.prisma.vATReport.findMany({
      where: { userId: req.user.sub },
      orderBy: { period: 'desc' },
    });

    const totalCollected = reports.reduce((sum, r) => sum + Number(r.vatCollected), 0);
    const totalDeductible = reports.reduce((sum, r) => sum + Number(r.vatDeductible), 0);
    const totalPayable = reports.reduce((sum, r) => sum + Number(r.vatPayable), 0);

    return {
      totalCollected,
      totalDeductible,
      totalPayable,
      currentYear: new Date().getFullYear(),
    };
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate VAT - either for amount or period' })
  async calculateVAT(@Request() req: any, @Body() body: { period?: string; amount?: number; rate?: number; isGross?: boolean }) {
    const userId = req.user.sub;

    // If amount and rate provided, calculate VAT for that amount
    if (body.amount !== undefined && body.rate !== undefined) {
      const rate = body.rate;
      const amount = body.amount;
      const isGross = body.isGross || false;

      let netAmount: number;
      let vatAmount: number;
      let grossAmount: number;

      if (isGross) {
        grossAmount = amount;
        netAmount = amount / (1 + rate / 100);
        vatAmount = grossAmount - netAmount;
      } else {
        netAmount = amount;
        vatAmount = netAmount * (rate / 100);
        grossAmount = netAmount + vatAmount;
      }

      return {
        netAmount: Math.round(netAmount * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        grossAmount: Math.round(grossAmount * 100) / 100,
        rate,
        isGross,
        currency: 'RON',
      };
    }

    // Otherwise calculate VAT for a period
    const { period } = body;

    if (!period) {
      return {
        error: 'Either (amount, rate) or period is required',
        usage: {
          forAmount: { amount: 1000, rate: 19, isGross: false },
          forPeriod: { period: '2025-01' },
        },
      };
    }

    // Get invoices for the period
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const vatCollected = invoices
      .filter(i => i.type === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.vatAmount), 0);

    const vatDeductible = invoices
      .filter(i => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.vatAmount), 0);

    const vatPayable = vatCollected - vatDeductible;

    // Check if report exists
    const existingReport = await this.prisma.vATReport.findFirst({
      where: { userId, period },
    });

    if (existingReport) {
      // Update existing report
      return this.prisma.vATReport.update({
        where: { id: existingReport.id },
        data: {
          vatCollected,
          vatDeductible,
          vatPayable,
          status: 'DRAFT',
          updatedAt: new Date(),
        },
      });
    }

    // Create new report
    return this.prisma.vATReport.create({
      data: {
        userId,
        period,
        vatCollected,
        vatDeductible,
        vatPayable,
        vatRate: 21, // Default rate post-Aug 2025
        status: 'DRAFT',
      },
    });
  }

  @Post('submit/:id')
  @ApiOperation({ summary: 'Submit VAT report to ANAF' })
  async submitVATReport(@Request() req: any, @Param('id') id: string) {
    const report = await this.prisma.vATReport.findFirst({
      where: { id, userId: req.user.sub },
    });

    if (!report) {
      return { error: 'Report not found', statusCode: 404 };
    }

    // Update status to SUBMITTED
    const updated = await this.prisma.vATReport.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        anafRef: `ANAF-VAT-${Date.now()}`,
        updatedAt: new Date(),
      },
    });

    // Log the submission
    await this.prisma.auditLog.create({
      data: {
        userId: req.user.sub,
        action: 'VAT_REPORT_SUBMITTED',
        entity: 'VATReport',
        entityId: id,
        details: { period: report.period, vatPayable: report.vatPayable },
      },
    });

    return updated;
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Download VAT report PDF' })
  async downloadVATReport(@Request() req: any, @Param('id') id: string) {
    const report = await this.prisma.vATReport.findFirst({
      where: { id, userId: req.user.sub },
    });

    if (!report) {
      return { error: 'Report not found', statusCode: 404 };
    }

    // Return report data for PDF generation
    return {
      ...report,
      downloadUrl: `/api/v1/vat/export/${id}`,
      format: 'pdf',
    };
  }
}

@ApiTags('SAF-T')
@ApiBearerAuth()
@Controller('saft')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class SaftAliasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all SAF-T reports for current user' })
  async getSAFTReports(@Request() req: any) {
    return this.prisma.sAFTReport.findMany({
      where: { userId: req.user.sub },
      orderBy: { period: 'desc' },
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get SAF-T compliance summary' })
  async getSAFTSummary(@Request() req: any) {
    const reports = await this.prisma.sAFTReport.findMany({
      where: { userId: req.user.sub },
      orderBy: { period: 'desc' },
    });

    return {
      reports,
      summary: {
        totalReports: reports.length,
        submitted: reports.filter(r => r.status === 'SUBMITTED').length,
        draft: reports.filter(r => r.status === 'DRAFT').length,
        validated: reports.filter(r => r.validated).length,
      },
    };
  }
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class DashboardAliasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats(@Request() req: any) {
    const userId = req.user.sub;

    const [
      invoiceCount,
      documentCount,
      partnerCount,
      employeeCount,
      recentInvoices,
      vatReports,
      spvSubmissions,
    ] = await Promise.all([
      this.prisma.invoice.count({ where: { userId } }),
      this.prisma.document.count({ where: { userId } }),
      this.prisma.partner.count({ where: { userId } }),
      this.prisma.employee.count({ where: { userId } }),
      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          partnerName: true,
          grossAmount: true,
          status: true,
          type: true,
          invoiceDate: true,
        },
      }),
      this.prisma.vATReport.findMany({
        where: { userId },
        orderBy: { period: 'desc' },
        take: 4,
      }),
      this.prisma.spvSubmission.count({
        where: { userId, status: 'ACCEPTED' },
      }),
    ]);

    // Calculate totals
    const invoices = await this.prisma.invoice.findMany({
      where: { userId },
      select: { type: true, grossAmount: true, status: true },
    });

    const totalRevenue = invoices
      .filter(i => i.type === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    const totalExpenses = invoices
      .filter(i => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    const pendingInvoices = invoices.filter(i => i.status === 'PENDING').length;
    const paidInvoices = invoices.filter(i => i.status === 'PAID').length;

    return {
      counts: {
        invoices: invoiceCount,
        documents: documentCount,
        partners: partnerCount,
        employees: employeeCount,
        spvAccepted: spvSubmissions,
      },
      financials: {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        currency: 'RON',
      },
      invoiceStats: {
        pending: pendingInvoices,
        paid: paidInvoices,
        total: invoiceCount,
      },
      recentInvoices,
      vatReports,
    };
  }
}

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class AiQueryController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('query')
  @ApiOperation({ summary: 'Query AI about Romanian accounting/tax (alias for /ai/ask)' })
  async queryAI(@Request() req: any, @Body() body: { question: string }) {
    // Store the query
    const query = await this.prisma.aIQuery.create({
      data: {
        userId: req.user.sub,
        question: body.question,
        answer: 'Processing...',
        model: 'grok-2-latest',
        tokens: 0,
        latencyMs: 0,
      },
    });

    // For now, return a placeholder - the full Grok integration is in AiService
    return {
      id: query.id,
      question: body.question,
      answer: 'Întrebare înregistrată. Pentru răspunsuri complete, utilizați endpoint-ul /ai/ask cu userId.',
      hint: 'Use POST /api/v1/ai/ask with { userId, question } for full Grok AI response',
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get AI query history for current user' })
  async getAIHistory(@Request() req: any) {
    return this.prisma.aIQuery.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs for current user' })
  async getAuditLogs(@Request() req: any, @Query('limit') limit?: string) {
    return this.prisma.auditLog.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
    });
  }
}

@ApiTags('e-Factura')
@ApiBearerAuth()
@Controller('efactura')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class EfacturaAliasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get e-Factura submission status and statistics' })
  async getEfacturaStatus(@Request() req: any) {
    const userId = req.user.sub;

    // Get all SPV submissions for the user
    const submissions = await this.prisma.spvSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        documentId: true,
        documentType: true,
        status: true,
        anafStatus: true,
        anafMessages: true,
        uploadIndex: true,
        submittedAt: true,
        completedAt: true,
      },
    });

    // Calculate statistics
    const stats = {
      total: submissions.length,
      pending: submissions.filter(s => s.status === 'PENDING').length,
      submitted: submissions.filter(s => s.status === 'PROCESSING').length,
      accepted: submissions.filter(s => s.status === 'ACCEPTED').length,
      rejected: submissions.filter(s => s.status === 'REJECTED').length,
      errors: submissions.filter(s => s.status === 'ERROR').length,
    };

    // Get invoice details for recent submissions
    const recentWithInvoices = await Promise.all(
      submissions.slice(0, 10).map(async (sub) => {
        const invoice = sub.documentId && sub.documentType === 'invoice'
          ? await this.prisma.invoice.findUnique({
              where: { id: sub.documentId },
              select: { invoiceNumber: true, partnerName: true, grossAmount: true },
            })
          : null;
        return {
          id: sub.id,
          invoiceNumber: invoice?.invoiceNumber || sub.uploadIndex || 'N/A',
          status: sub.status.toLowerCase(),
          submittedAt: sub.submittedAt.toISOString(),
          anafStatus: sub.anafStatus,
          anafMessages: sub.anafMessages,
        };
      })
    );

    return {
      items: recentWithInvoices,
      stats,
    };
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get pending e-Factura queue' })
  async getEfacturaQueue(@Request() req: any) {
    const userId = req.user.sub;

    // Get invoices that haven't been submitted yet (status DRAFT or PENDING)
    const pendingInvoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'DRAFT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        invoiceNumber: true,
        partnerName: true,
        grossAmount: true,
        invoiceDate: true,
        status: true,
      },
    });

    return {
      queue: pendingInvoices,
      count: pendingInvoices.length,
    };
  }
}

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class SettingsAliasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('user')
  @ApiOperation({ summary: 'Get current user settings' })
  async getUserSettings(@Request() req: any) {
    const userId = req.user.sub;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        cui: true,
        address: true,
        notificationPreferences: true,
        language: true,
        tier: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return { error: 'User not found' };
    }

    return {
      user,
      preferences: {
        notifications: user.notificationPreferences || {},
        language: user.language || 'ro',
        timezone: 'Europe/Bucharest', // Default timezone
      },
    };
  }

  @Post('user')
  @ApiOperation({ summary: 'Update current user settings' })
  async updateUserSettings(
    @Request() req: any,
    @Body() body: {
      name?: string;
      company?: string;
      address?: string;
      language?: string;
      cui?: string;
    },
  ) {
    const userId = req.user.sub;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        company: body.company,
        address: body.address,
        language: body.language,
        cui: body.cui,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        address: true,
        language: true,
        cui: true,
      },
    });

    // Log the settings update
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'SETTINGS_UPDATED',
        entity: 'User',
        entityId: userId,
        details: body,
      },
    });

    return {
      success: true,
      user: updatedUser,
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile (alias for /settings/user)' })
  async getUserProfile(@Request() req: any) {
    return this.getUserSettings(req);
  }
}
