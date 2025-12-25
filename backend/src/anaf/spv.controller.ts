import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { SpvService } from './spv.service';
import { SaftService } from './saft.service';
import { EfacturaService } from './efactura.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SpvOAuthUrlDto,
  SpvOAuthCallbackDto,
  SpvConnectionStatusDto,
  SpvMessagesListDto,
  SpvSubmissionsListDto,
  SpvDashboardDto,
  SubmissionFilterDto,
  SubmitEfacturaDto,
  EfacturaSubmissionResultDto,
  SubmitSaftDto,
  SaftSubmissionResultDto,
  DownloadReceivedDto,
  ReceivedEfacturaListDto,
  MarkMessageReadDto,
} from './dto/spv.dto';

// Extended Request with user from JWT
interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    cui?: string;
    role: UserRole;
  };
}

@ApiTags('spv')
@Controller('spv')
export class SpvController {
  constructor(
    private readonly spvService: SpvService,
    private readonly saftService: SaftService,
    private readonly efacturaService: EfacturaService,
    private readonly prisma: PrismaService,
  ) {}

  // ===== OAuth2 Endpoints =====

  @Get('oauth/authorize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ANAF SPV OAuth2 authorization URL' })
  @ApiResponse({ status: 200, type: SpvOAuthUrlDto })
  async getOAuthUrl(@Req() req: AuthRequest): Promise<SpvOAuthUrlDto> {
    // Get user's company CUI
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cui: true },
    });

    if (!user?.cui) {
      throw new Error('No CUI configured for this user. Please update your company profile first.');
    }

    return this.spvService.getAuthorizationUrl(req.user.userId, user.cui);
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle ANAF OAuth2 callback' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.spvService.handleOAuthCallback(code, state);

      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || 'https://documentiulia.ro';
      res.redirect(`${frontendUrl}/dashboard/settings?spv=connected`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://documentiulia.ro';
      res.redirect(`${frontendUrl}/dashboard/settings?spv=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect from ANAF SPV' })
  async disconnect(@Req() req: AuthRequest): Promise<{ success: boolean }> {
    await this.spvService.disconnect(req.user.userId);
    return { success: true };
  }

  // ===== Connection Status =====

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SPV connection status' })
  @ApiResponse({ status: 200, type: SpvConnectionStatusDto })
  async getConnectionStatus(@Req() req: AuthRequest): Promise<SpvConnectionStatusDto> {
    return this.spvService.getConnectionStatus(req.user.userId);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SPV dashboard summary' })
  @ApiResponse({ status: 200, type: SpvDashboardDto })
  async getDashboard(@Req() req: AuthRequest): Promise<SpvDashboardDto> {
    return this.spvService.getDashboard(req.user.userId);
  }

  // ===== e-Factura Operations =====

  @Post('efactura/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit e-Factura to ANAF SPV' })
  @ApiResponse({ status: 200, type: EfacturaSubmissionResultDto })
  async submitEfactura(
    @Req() req: AuthRequest,
    @Body() body: SubmitEfacturaDto,
  ): Promise<EfacturaSubmissionResultDto> {
    // Get invoice and generate UBL XML
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: body.invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.userId !== req.user.userId) {
      throw new Error('Unauthorized to submit this invoice');
    }

    // Get user's CUI
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cui: true, company: true },
    });

    if (!user?.cui) {
      throw new Error('No CUI configured. Please update company profile.');
    }

    // Generate UBL XML
    const xml = this.efacturaService.generateUBL({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate?.toISOString().split('T')[0],
      supplier: {
        cui: user.cui,
        name: user.company || '',
        address: '',
      },
      customer: {
        cui: invoice.partnerCui || '',
        name: invoice.partnerName,
        address: invoice.partnerAddress || '',
      },
      lines: [
        {
          description: 'Invoice items',
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
    });

    // Submit to SPV
    const result = await this.spvService.submitEfactura(req.user.userId, xml, user.cui);

    // Update invoice status
    await this.prisma.invoice.update({
      where: { id: body.invoiceId },
      data: {
        efacturaId: result.uploadIndex,
        efacturaStatus: 'SUBMITTED',
        spvSubmitted: true,
        spvSubmittedAt: new Date(),
      },
    });

    return {
      uploadIndex: result.uploadIndex,
      status: 'SUBMITTED',
      submissionId: result.submissionId,
    };
  }

  @Get('efactura/status/:uploadIndex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check e-Factura submission status' })
  async checkEfacturaStatus(
    @Req() req: AuthRequest,
    @Param('uploadIndex') uploadIndex: string,
  ) {
    return this.spvService.checkEfacturaStatus(req.user.userId, uploadIndex);
  }

  @Get('efactura/received')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download received e-Facturi from ANAF' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async downloadReceived(
    @Req() req: AuthRequest,
    @Query() query: DownloadReceivedDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cui: true },
    });

    if (!user?.cui) {
      throw new Error('No CUI configured');
    }

    return this.spvService.downloadReceivedEfacturi(
      req.user.userId,
      user.cui,
      query.days || 60,
    );
  }

  // ===== SAF-T Operations =====

  @Post('saft/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit SAF-T D406 to ANAF SPV' })
  @ApiResponse({ status: 200, type: SaftSubmissionResultDto })
  async submitSaft(
    @Req() req: AuthRequest,
    @Body() body: SubmitSaftDto,
  ): Promise<SaftSubmissionResultDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cui: true },
    });

    if (!user?.cui) {
      throw new Error('No CUI configured');
    }

    // Generate or use provided XML
    let xml = body.xml;
    if (!xml) {
      xml = await this.saftService.generateD406(req.user.userId, body.period);
    }

    // Validate XML size (ANAF max 20MB)
    const validation = this.saftService.validateXmlSize(xml);
    if (!validation.valid) {
      throw new Error(`SAF-T XML exceeds ANAF size limit: ${validation.sizeMB} MB`);
    }

    const result = await this.spvService.submitSaft(
      req.user.userId,
      xml,
      user.cui,
      body.period,
    );

    return {
      reference: result.reference,
      status: 'SUBMITTED',
      submissionId: result.submissionId,
    };
  }

  // ===== Messages =====

  @Get('messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SPV messages/notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, type: SpvMessagesListDto })
  async getMessages(
    @Req() req: AuthRequest,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<SpvMessagesListDto> {
    return this.spvService.getMessages(req.user.userId, limit || 50, offset || 0);
  }

  @Post('messages/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark message as read' })
  async markMessageRead(
    @Req() req: AuthRequest,
    @Body() body: MarkMessageReadDto,
  ): Promise<{ success: boolean }> {
    await this.spvService.markMessageRead(req.user.userId, body.messageId);
    return { success: true };
  }

  // ===== Submissions History =====

  @Get('submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get submission history' })
  @ApiResponse({ status: 200, type: SpvSubmissionsListDto })
  async getSubmissions(
    @Req() req: AuthRequest,
    @Query() filters: SubmissionFilterDto,
  ): Promise<SpvSubmissionsListDto> {
    return this.spvService.getSubmissions(req.user.userId, filters);
  }

  @Post('submissions/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a failed submission' })
  async retrySubmission(
    @Req() req: AuthRequest,
    @Param('id') submissionId: string,
  ): Promise<{ success: boolean }> {
    // Get submission
    const submission = await this.prisma.spvSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.userId !== req.user.userId) {
      throw new Error('Submission not found');
    }

    if (submission.status !== 'ERROR' && submission.status !== 'REJECTED') {
      throw new Error('Can only retry failed submissions');
    }

    // Update retry count
    await this.prisma.spvSubmission.update({
      where: { id: submissionId },
      data: {
        retryCount: submission.retryCount + 1,
        status: 'PENDING',
        lastCheckedAt: new Date(),
        errorMessage: null,
      },
    });

    return { success: true };
  }

  // ===== Deadlines =====

  @Get('deadlines')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ANAF submission deadlines' })
  @ApiQuery({ name: 'companyType', required: false, enum: ['small', 'large', 'non-resident'] })
  getDeadlines(@Query('companyType') companyType?: 'small' | 'large' | 'non-resident') {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    const daysRemaining = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      saft: {
        frequency: companyType === 'large' ? 'quarterly' : 'monthly',
        nextDeadline: nextMonth,
        currentPeriod: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        daysRemaining,
        // Pilot period per Order 1783/2021
        pilotPeriod: {
          start: new Date('2025-09-01'),
          end: new Date('2026-08-31'),
        },
        gracePeriodMonths: 6,
      },
      efactura: {
        b2bMandatory: new Date('2026-07-01'), // Mid-2026
        currentStatus: 'voluntary',
        daysUntilMandatory: Math.ceil(
          (new Date('2026-07-01').getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      },
    };
  }
}
