import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { EfacturaService, EfacturaStatus, InvoiceTypeCode, PaymentMeansCode, VATCategoryCode } from './efactura.service';
import { SpvService } from './spv.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Sprint 13 - US-001 & US-002: e-Factura B2B Controller
 *
 * Comprehensive B2B e-Factura endpoints:
 * - UBL 2.1 XML generation with CIUS-RO compliance
 * - ANAF SPV submission and status tracking
 * - Validation feedback before submission
 * - B2B readiness check
 * - Credit note generation
 */
@ApiTags('efactura-b2b')
@ApiBearerAuth()
@Controller('efactura-b2b')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class EfacturaB2BController {
  constructor(
    private readonly efacturaService: EfacturaService,
    private readonly spvService: SpvService,
    private readonly prisma: PrismaService,
  ) {}

  // ===== US-001: e-Factura B2B XML Generation =====

  @Post('generate')
  @ApiOperation({
    summary: 'Generate e-Factura B2B UBL 2.1 XML',
    description: 'Generates CIUS-RO compliant UBL 2.1 XML for B2B invoices',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceId'],
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID from database' },
        userId: { type: 'string', description: 'User ID' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'XML generated successfully' })
  @ApiResponse({ status: 400, description: 'Validation errors' })
  async generateB2BXML(@Body() body: { invoiceId: string; userId: string }) {
    // Fetch invoice with all related data
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: body.invoiceId },
    });

    if (!invoice) {
      return {
        success: false,
        errors: ['Factura nu a fost găsită'],
      };
    }

    // Get user data for supplier info
    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!user) {
      return {
        success: false,
        errors: ['Utilizator negăsit'],
      };
    }

    // Build e-Factura invoice object
    const efacturaInvoice = this.buildEfacturaInvoice(invoice, user);

    // Validate before generating
    const validation = this.efacturaService.validateInvoice(efacturaInvoice);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map((e) => e.message),
        invoice: efacturaInvoice,
      };
    }

    // Generate B2B UBL XML
    const xml = this.efacturaService.generateB2BUBL(efacturaInvoice);

    return {
      success: true,
      xml,
      invoice: efacturaInvoice,
      validation: {
        valid: true,
        warnings: [],
      },
    };
  }

  @Get('preview/:invoiceId')
  @ApiOperation({
    summary: 'Preview e-Factura XML',
    description: 'Generate and preview the e-Factura XML without saving',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  async previewB2BXML(
    @Param('invoiceId') invoiceId: string,
    @Query('userId') userId: string,
  ) {
    const result = await this.generateB2BXML({ invoiceId, userId });

    if (!result.success) {
      return result;
    }

    // Format for preview
    const xml = result.xml || '';
    return {
      ...result,
      formatted: xml
        .replace(/></g, '>\n<')
        .split('\n')
        .map((line: string, i: number) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
        .join('\n'),
    };
  }

  @Get('download/:invoiceId')
  @ApiOperation({
    summary: 'Download e-Factura XML file',
    description: 'Generate and download the e-Factura XML as a file',
  })
  async downloadB2BXML(
    @Param('invoiceId') invoiceId: string,
    @Query('userId') userId: string,
    @Res() res: Response,
  ) {
    const result = await this.generateB2BXML({ invoiceId, userId });

    if (!result.success || !result.xml) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        errors: result.errors,
      });
      return;
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    const filename = `efactura_${invoice?.invoiceNumber || invoiceId}_${new Date().toISOString().split('T')[0]}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(result.xml, 'utf8'));
    res.send(result.xml);
  }

  // ===== US-002: e-Factura Submission via ANAF SPV =====

  @Post('submit')
  @ApiOperation({
    summary: 'Submit e-Factura to ANAF SPV',
    description: 'Generates and submits B2B e-Factura to ANAF SPV',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceId', 'userId'],
      properties: {
        invoiceId: { type: 'string' },
        userId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Submission initiated' })
  @ApiResponse({ status: 400, description: 'Submission failed' })
  async submitToSPV(@Body() body: { invoiceId: string; userId: string }) {
    // Generate XML first
    const genResult = await this.generateB2BXML(body);

    if (!genResult.success || !genResult.xml) {
      return {
        success: false,
        status: EfacturaStatus.ERROR,
        errors: genResult.errors || ['Nu s-a putut genera XML-ul'],
      };
    }

    // Get user CUI
    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!user?.cui) {
      return {
        success: false,
        status: EfacturaStatus.ERROR,
        errors: ['CUI utilizator lipsă - nu se poate face transmiterea'],
      };
    }

    try {
      // Submit via SPV service
      const submission = await this.spvService.submitEfactura(
        body.userId,
        genResult.xml,
        user.cui,
      );

      // Update invoice status
      await this.prisma.invoice.update({
        where: { id: body.invoiceId },
        data: {
          efacturaStatus: 'SUBMITTED',
          efacturaId: submission.uploadIndex,
          spvSubmitted: true,
          spvSubmittedAt: new Date(),
        },
      });

      return {
        success: true,
        uploadIndex: submission.uploadIndex,
        submissionId: submission.submissionId,
        status: EfacturaStatus.SUBMITTED,
        submittedAt: new Date().toISOString(),
        message: 'Factura a fost transmisă cu succes către ANAF SPV',
      };
    } catch (error: any) {
      return {
        success: false,
        status: EfacturaStatus.ERROR,
        errors: [error.message || 'Eroare la transmitere'],
      };
    }
  }

  @Get('status/:uploadIndex')
  @ApiOperation({
    summary: 'Check e-Factura submission status',
    description: 'Check the status of an e-Factura submission to ANAF',
  })
  @ApiParam({ name: 'uploadIndex', description: 'ANAF upload index' })
  @ApiQuery({ name: 'userId', required: true })
  async checkStatus(
    @Param('uploadIndex') uploadIndex: string,
    @Query('userId') userId: string,
  ) {
    try {
      const result = await this.spvService.checkEfacturaStatus(userId, uploadIndex);

      // Map ANAF status to our enum
      let status: EfacturaStatus;
      switch (result.status) {
        case 'ok':
          status = EfacturaStatus.ACCEPTED;
          break;
        case 'nok':
          status = EfacturaStatus.REJECTED;
          break;
        case 'in prelucrare':
          status = EfacturaStatus.PENDING;
          break;
        default:
          status = EfacturaStatus.SUBMITTED;
      }

      return {
        success: true,
        uploadIndex,
        status,
        anafStatus: result.status,
        downloadId: result.downloadId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Eroare la verificarea statusului',
      };
    }
  }

  // ===== US-004: Basic e-Factura Validation Feedback =====

  @Post('validate')
  @ApiOperation({
    summary: 'Validate e-Factura data',
    description: 'Pre-submission validation with specific error messages',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['invoiceId', 'userId'],
      properties: {
        invoiceId: { type: 'string' },
        userId: { type: 'string' },
      },
    },
  })
  async validateInvoice(@Body() body: { invoiceId: string; userId: string }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: body.invoiceId },
    });

    if (!invoice) {
      return {
        valid: false,
        errors: [{ field: 'invoice', code: 'NOT_FOUND', message: 'Factura nu a fost găsită' }],
        warnings: [],
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!user) {
      return {
        valid: false,
        errors: [{ field: 'user', code: 'NOT_FOUND', message: 'Utilizator negăsit' }],
        warnings: [],
      };
    }

    const efacturaInvoice = this.buildEfacturaInvoice(invoice, user);
    const validation = this.efacturaService.validateInvoice(efacturaInvoice);

    // Add field-level error details
    const errors = validation.errors.map((e) => ({
      field: e.field,
      code: e.code,
      message: e.message,
      suggestion: this.getSuggestion(e.field, e.code),
    }));

    const warnings: any[] = [];

    // Check for optional but recommended fields
    if (!invoice.dueDate) {
      warnings.push({
        field: 'dueDate',
        message: 'Data scadenței lipsă - recomandată pentru B2B',
      });
    }

    if (!(user as any).iban) {
      warnings.push({
        field: 'supplier.bankAccount',
        message: 'Cont IBAN lipsă - recomandat pentru plăți automate',
      });
    }

    if (!(invoice as any).partnerEmail) {
      warnings.push({
        field: 'customer.email',
        message: 'Email client lipsă - util pentru notificări',
      });
    }

    return {
      valid: validation.valid,
      errors,
      warnings,
      summary: {
        invoiceNumber: invoice.invoiceNumber,
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        readyForSubmission: validation.valid,
      },
    };
  }

  // ===== B2B Readiness & Compliance =====

  @Get('readiness/:userId')
  @ApiOperation({
    summary: 'Check B2B readiness',
    description: 'Validates company data against ANAF B2B requirements',
  })
  async checkB2BReadiness(@Param('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        ready: false,
        error: 'Utilizator negăsit',
      };
    }

    const readiness = this.efacturaService.checkB2BReadiness({
      cui: user.cui || '',
      name: user.company || '',
      address: user.address || '',
      city: (user as any).city || '',
      county: (user as any).county || '',
      postalCode: (user as any).postalCode || '',
      bankAccount: (user as any).iban || '',
      email: user.email || '',
      registrationNumber: (user as any).regCom || '',
    });

    return {
      ...readiness,
      user: {
        name: user.company,
        cui: user.cui,
      },
    };
  }

  @Get('compliance-calendar')
  @ApiOperation({
    summary: 'Get B2B compliance calendar',
    description: 'Returns B2B compliance deadlines and recommendations',
  })
  getComplianceCalendar() {
    return this.efacturaService.getB2BComplianceCalendar();
  }

  // ===== Credit Note Generation =====

  @Post('credit-note')
  @ApiOperation({
    summary: 'Generate credit note',
    description: 'Generate a credit note for an existing invoice',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['originalInvoiceId', 'creditNoteNumber', 'reason', 'userId'],
      properties: {
        originalInvoiceId: { type: 'string' },
        creditNoteNumber: { type: 'string' },
        reason: { type: 'string' },
        userId: { type: 'string' },
        linesToCredit: { type: 'array', items: { type: 'number' }, description: 'Optional: specific line indices to credit' },
      },
    },
  })
  async generateCreditNote(
    @Body() body: {
      originalInvoiceId: string;
      creditNoteNumber: string;
      reason: string;
      userId: string;
      linesToCredit?: number[];
    },
  ): Promise<any> {
    const originalInvoice = await this.prisma.invoice.findUnique({
      where: { id: body.originalInvoiceId },
    });

    if (!originalInvoice) {
      return {
        success: false,
        errors: ['Factura originală nu a fost găsită'],
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!user) {
      return {
        success: false,
        errors: ['Utilizator negăsit'],
      };
    }

    const efacturaInvoice = this.buildEfacturaInvoice(originalInvoice, user);

    const creditNote = this.efacturaService.generateCreditNote(
      efacturaInvoice,
      body.creditNoteNumber,
      body.reason,
      body.linesToCredit,
    );

    const xml = this.efacturaService.generateB2BUBL(creditNote);

    return {
      success: true,
      creditNote,
      xml,
      summary: {
        originalInvoice: originalInvoice.invoiceNumber,
        creditNoteNumber: body.creditNoteNumber,
        reason: body.reason,
        totalAmount: creditNote.totals.gross,
      },
    };
  }

  // ===== Invoice List with e-Factura Status =====

  @Get('invoices/:userId')
  @ApiOperation({
    summary: 'Get invoices with e-Factura status',
    description: 'List invoices with their e-Factura submission status',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by e-Factura status' })
  @ApiQuery({ name: 'period', required: false, description: 'Filter by period (YYYY-MM)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getInvoicesWithStatus(
    @Param('userId') userId: string,
    @Query('status') status?: string,
    @Query('period') period?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const where: any = { userId };

    if (status) {
      where.efacturaStatus = status;
    }

    if (period) {
      const [year, month] = period.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.invoiceDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        take: limit || 50,
        skip: offset || 0,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          partnerName: true,
          partnerCui: true,
          grossAmount: true,
          currency: true,
          type: true,
          efacturaStatus: true,
          efacturaId: true,
          spvSubmittedAt: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    // Calculate summary stats
    const stats = {
      total,
      pending: invoices.filter((i) => !i.efacturaStatus || i.efacturaStatus === 'DRAFT').length,
      submitted: invoices.filter((i) => i.efacturaStatus === 'SUBMITTED').length,
      accepted: invoices.filter((i) => i.efacturaStatus === 'ACCEPTED').length,
      rejected: invoices.filter((i) => i.efacturaStatus === 'REJECTED').length,
    };

    return {
      invoices,
      total,
      stats,
      pagination: {
        limit: limit || 50,
        offset: offset || 0,
        hasMore: (offset || 0) + invoices.length < total,
      },
    };
  }

  // ===== Dashboard =====

  @Get('dashboard/:userId')
  @ApiOperation({
    summary: 'Get e-Factura B2B dashboard',
    description: 'Comprehensive dashboard with status, stats, and compliance info',
  })
  async getDashboard(@Param('userId') userId: string) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      user,
      monthlyInvoices,
      pendingSubmissions,
      recentSubmissions,
      spvStatus,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.invoice.count({
        where: {
          userId,
          invoiceDate: { gte: startOfMonth, lte: endOfMonth },
          type: 'ISSUED',
        },
      }),
      this.prisma.invoice.count({
        where: {
          userId,
          type: 'ISSUED',
          OR: [
            { efacturaStatus: null },
            { efacturaStatus: 'DRAFT' },
          ],
        },
      }),
      this.prisma.spvSubmission.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
      this.spvService.getConnectionStatus(userId),
    ]);

    // Get readiness
    const readiness = user ? this.efacturaService.checkB2BReadiness({
      cui: user.cui || '',
      name: user.company || '',
      address: user.address || '',
    }) : { ready: false, complianceScore: 0 };

    // Get compliance calendar
    const calendar = this.efacturaService.getB2BComplianceCalendar();

    return {
      user: {
        company: user?.company,
        cui: user?.cui,
      },
      spvConnection: {
        connected: spvStatus.connected,
        features: spvStatus.features,
      },
      stats: {
        monthlyInvoices,
        pendingSubmissions,
        currentMonth,
      },
      readiness: {
        ready: readiness.ready,
        score: readiness.complianceScore,
        recommendations: (readiness as any).recommendations?.slice(0, 3) || [],
      },
      compliance: calendar,
      recentSubmissions: recentSubmissions.map((s) => ({
        id: s.id,
        uploadIndex: s.uploadIndex,
        status: s.status,
        submittedAt: s.submittedAt,
      })),
      alerts: this.generateAlerts(spvStatus, readiness, pendingSubmissions, calendar),
    };
  }

  // ===== Helper Methods =====

  private buildEfacturaInvoice(invoice: any, user: any): any {
    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate?.toISOString().split('T')[0],
      invoiceTypeCode: InvoiceTypeCode.STANDARD,
      supplier: {
        cui: user.cui || '',
        name: user.company || '',
        address: user.address || '',
        city: (user as any).city || '',
        county: (user as any).county || '',
        postalCode: (user as any).postalCode || '',
        country: 'RO',
        registrationNumber: (user as any).regCom || '',
        bankAccount: (user as any).iban || '',
        email: user.email || '',
      },
      customer: {
        cui: invoice.partnerCui || '',
        name: invoice.partnerName || '',
        address: invoice.partnerAddress || '',
        country: 'RO',
      },
      paymentMeans: user.iban ? {
        code: PaymentMeansCode.CREDIT_TRANSFER,
        iban: user.iban,
      } : undefined,
      lines: (invoice.items || []).map((item: any, index: number) => ({
        id: String(index + 1),
        description: item.description || 'Produs/Serviciu',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        vatRate: Number(item.vatRate) || 21,
        vatCategoryCode: VATCategoryCode.STANDARD,
        total: Number(item.total) || Number(item.quantity || 1) * Number(item.unitPrice || 0),
        unitCode: item.unit || 'C62',
      })),
      totals: {
        net: Number(invoice.netAmount) || 0,
        vat: Number(invoice.vatAmount) || 0,
        gross: Number(invoice.grossAmount) || 0,
      },
      currency: invoice.currency || 'RON',
    };
  }

  private getSuggestion(field: string, code: string): string {
    const suggestions: Record<string, string> = {
      'supplier.cui': 'Completați CUI-ul în setările companiei',
      'supplier.name': 'Completați denumirea companiei în setări',
      'supplier.address': 'Adăugați adresa completă a companiei',
      'customer.cui': 'Completați CUI-ul clientului pe factură',
      'customer.name': 'Adăugați numele/denumirea clientului',
      'customer.address': 'Adăugați adresa clientului',
      'lines': 'Adăugați cel puțin o linie pe factură',
      'totals.net': 'Verificați totalurile facturii',
      'invoiceNumber': 'Numărul facturii este obligatoriu',
      'invoiceDate': 'Data facturii este obligatorie',
    };

    return suggestions[field] || 'Verificați și completați câmpul';
  }

  private generateAlerts(
    spvStatus: any,
    readiness: any,
    pendingCount: number,
    calendar: any,
  ): { type: 'info' | 'warning' | 'error'; message: string }[] {
    const alerts: { type: 'info' | 'warning' | 'error'; message: string }[] = [];

    if (!spvStatus.connected) {
      alerts.push({
        type: 'error',
        message: 'Conexiune SPV inactivă. Reconectați-vă pentru a transmite facturi.',
      });
    }

    if (!readiness.ready) {
      alerts.push({
        type: 'warning',
        message: `Scor conformitate B2B: ${readiness.complianceScore}%. Completați datele companiei.`,
      });
    }

    if (pendingCount > 10) {
      alerts.push({
        type: 'warning',
        message: `${pendingCount} facturi în așteptare pentru transmitere e-Factura.`,
      });
    }

    if (calendar.currentPhase === 'Obligatoriu') {
      alerts.push({
        type: 'info',
        message: 'e-Factura B2B este obligatorie. Transmiteți toate facturile prin SPV.',
      });
    } else {
      alerts.push({
        type: 'info',
        message: calendar.nextDeadline,
      });
    }

    return alerts;
  }
}
