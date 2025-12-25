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
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SaftD406MonthlyService, D406GenerationResult, D406SubmissionResult } from './saft-d406-monthly.service';
import { SaftService } from './saft.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CacheInterceptor, CacheKey, CacheTTLDecorator, CacheTags, UserScopedCache } from '../cache/cache.interceptor';
import { CacheTTL } from '../cache/redis-cache.service';

/**
 * SAFT-001 & SAFT-002: SAF-T D406 Monthly Controller
 *
 * REST API endpoints for SAF-T D406 generation and submission
 * per Order 1783/2021 - Monthly submission starting January 2025
 */
@ApiTags('saft-d406')
@ApiBearerAuth()
@Controller('saft-d406')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class SaftD406Controller {
  constructor(
    private readonly saftD406Service: SaftD406MonthlyService,
    private readonly saftService: SaftService,
  ) {}

  // ===== Generation Endpoints =====

  @Post('generate')
  @ApiOperation({
    summary: 'Generate SAF-T D406 Monthly XML',
    description: 'Generates SAF-T D406 XML per Order 1783/2021 for a specific period',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'period'],
      properties: {
        userId: { type: 'string', description: 'User ID' },
        period: { type: 'string', example: '2025-01', description: 'Period in YYYY-MM format' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'D406 generated successfully' })
  @ApiResponse({ status: 400, description: 'Validation errors' })
  async generateD406(
    @Body() body: { userId: string; period: string },
  ): Promise<D406GenerationResult> {
    return this.saftD406Service.generateMonthlyD406(body.userId, body.period);
  }

  @Get('preview/:userId/:period')
  @ApiOperation({
    summary: 'Preview SAF-T D406 XML',
    description: 'Generate and preview the SAF-T D406 XML without saving',
  })
  @ApiResponse({ status: 200, description: 'XML preview' })
  async previewD406(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ): Promise<{ xml: string; formatted: string }> {
    return this.saftD406Service.previewXML(userId, period);
  }

  @Get('download/:userId/:period')
  @ApiOperation({
    summary: 'Download SAF-T D406 XML file',
    description: 'Generate and download the SAF-T D406 XML as a file',
  })
  async downloadD406(
    @Param('userId') userId: string,
    @Param('period') period: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.saftD406Service.generateMonthlyD406(userId, period);

    if (!result.success || !result.xml) {
      res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        errors: result.validation.errors,
      });
      return;
    }

    const filename = `SAF-T_D406_${period}_${new Date().toISOString().split('T')[0]}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(result.xml, 'utf8'));
    res.send(result.xml);
  }

  // ===== Validation Endpoints =====

  @Post('validate')
  @ApiOperation({
    summary: 'Validate SAF-T D406 data',
    description: 'Validates all data for SAF-T D406 without generating XML',
  })
  async validateD406(
    @Body() body: { userId: string; period: string },
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    summary: any;
  }> {
    const result = await this.saftService.validateSAFT(body.userId, body.period);
    return {
      valid: result.valid,
      errors: result.errors.map((e) => `${e.code}: ${e.message}`),
      warnings: result.warnings.map((w) => `${w.code}: ${w.message}`),
      summary: result.summary,
    };
  }

  @Post('validate-xml')
  @ApiOperation({
    summary: 'Validate raw SAF-T D406 XML',
    description: 'Validates a raw SAF-T D406 XML string against ANAF schema and business rules',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['xml'],
      properties: {
        xml: { type: 'string', description: 'SAF-T D406 XML content' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  @ApiResponse({ status: 400, description: 'Invalid XML' })
  async validateXml(
    @Body() body: { xml: string },
  ): Promise<{
    valid: boolean;
    errors: Array<{ path: string; message: string; code: string }>;
    warnings: string[];
    compliance: {
      order1783: boolean;
      legea141: boolean;
    };
  }> {
    // Import validator dynamically to avoid circular deps
    const { SaftValidatorService } = await import('./saft-validator.service');
    const validator = new SaftValidatorService();
    const result = validator.validate(body.xml);

    return {
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      compliance: {
        order1783: result.valid, // Order 1783/2021 compliant if valid
        legea141: result.valid,  // Legea 141/2025 VAT rates checked
      },
    };
  }

  @Get('checklist/:userId/:period')
  @ApiOperation({
    summary: 'Get pre-submission checklist',
    description: 'Returns a checklist of items to verify before submission',
  })
  async getChecklist(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ) {
    return this.saftService.getPreSubmissionChecklist(userId, period);
  }

  // ===== Submission Endpoints =====

  @Post('submit')
  @ApiOperation({
    summary: 'Submit SAF-T D406 to ANAF',
    description: 'Generates and submits SAF-T D406 to ANAF SPV',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'period'],
      properties: {
        userId: { type: 'string' },
        period: { type: 'string', example: '2025-01' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Submission initiated' })
  @ApiResponse({ status: 400, description: 'Submission failed' })
  async submitD406(
    @Body() body: { userId: string; period: string },
  ): Promise<D406SubmissionResult> {
    return this.saftD406Service.submitToANAF(body.userId, body.period);
  }

  @Get('submission-status/:userId/:reference')
  @ApiOperation({
    summary: 'Check submission status',
    description: 'Check the status of a SAF-T D406 submission to ANAF',
  })
  async getSubmissionStatus(
    @Param('userId') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.saftD406Service.getSubmissionStatus(userId, reference);
  }

  // ===== Compliance Endpoints =====

  @Get('compliance/:userId/:period')
  @ApiOperation({
    summary: 'Get compliance status',
    description: 'Check compliance status for a specific period',
  })
  async getComplianceStatus(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ) {
    return this.saftService.getComplianceStatus(userId, period);
  }

  @Get('calendar/:userId')
  @ApiOperation({
    summary: 'Get compliance calendar',
    description: 'Get compliance calendar with deadlines for multiple periods',
  })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default 12)' })
  async getComplianceCalendar(
    @Param('userId') userId: string,
    @Query('months') months?: number,
  ) {
    return this.saftService.getComplianceCalendar(userId, months || 12);
  }

  // ===== Report History =====

  @Get('reports/:userId')
  @ApiOperation({
    summary: 'Get D406 reports history',
    description: 'List all SAF-T D406 reports for a user',
  })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getReports(
    @Param('userId') userId: string,
    @Query('year') year?: number,
  ) {
    return this.saftD406Service.getReports(userId, year);
  }

  // ===== Deadlines Endpoint =====

  @Get('deadlines')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('saft-d406:deadlines')
  @CacheTTLDecorator(CacheTTL.HOUR) // 1 hour - deadlines computed daily
  @CacheTags('saft', 'd406', 'deadlines', 'compliance')
  @ApiOperation({
    summary: 'Get ANAF D406 submission deadlines',
    description: 'Returns key deadlines per Order 1783/2021',
  })
  getDeadlines() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Monthly deadline: 25th of the following month
    const nextDeadline = new Date(
      currentMonth === 11 ? currentYear + 1 : currentYear,
      currentMonth === 11 ? 0 : currentMonth + 1,
      25,
    );

    const daysUntilDeadline = Math.ceil(
      (nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Grace period for pilot (Sept 2025 - Aug 2026)
    const gracePeriodStart = new Date(2025, 8, 1);
    const gracePeriodEnd = new Date(2027, 1, 28);
    const isGracePeriod = now >= gracePeriodStart && now <= gracePeriodEnd;

    return {
      currentPeriod: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      nextDeadline,
      daysUntilDeadline,
      isOverdue: daysUntilDeadline < 0,
      gracePeriod: {
        active: isGracePeriod,
        start: gracePeriodStart,
        end: gracePeriodEnd,
        description: 'Perioada pilot Sept 2025 - Aug 2026 cu 6 luni grație',
      },
      requirements: {
        format: 'XML per SAF-T RO 2.0',
        maxFileSize: '500MB',
        encoding: 'UTF-8',
        submission: 'ANAF SPV portal sau API',
      },
      timeline: [
        { date: '2025-01-01', event: 'Început obligație lunară pentru IMM/nerezidenți', status: 'active' },
        { date: '2025-09-01', event: 'Început perioadă pilot pentru mari contribuabili', status: 'upcoming' },
        { date: '2026-08-31', event: 'Sfârșit perioadă pilot', status: 'upcoming' },
        { date: '2027-02-28', event: 'Sfârșit perioadă grație (6 luni)', status: 'upcoming' },
      ],
    };
  }

  // ===== Dashboard Endpoint =====

  @Get('dashboard/:userId')
  @ApiOperation({
    summary: 'Get D406 dashboard',
    description: 'Comprehensive dashboard with compliance status, recent submissions, and deadlines',
  })
  async getDashboard(@Param('userId') userId: string) {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousPeriod = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`;

    const [currentCompliance, previousCompliance, reports, checklist] = await Promise.all([
      this.saftService.getComplianceStatus(userId, currentPeriod),
      this.saftService.getComplianceStatus(userId, previousPeriod),
      this.saftD406Service.getReports(userId),
      this.saftService.getPreSubmissionChecklist(userId, previousPeriod),
    ]);

    // Count submissions by status
    const submissionStats = {
      draft: reports.filter((r) => r.status === 'DRAFT').length,
      submitted: reports.filter((r) => r.status === 'SUBMITTED').length,
      accepted: reports.filter((r) => r.status === 'ACCEPTED').length,
      rejected: reports.filter((r) => r.status === 'REJECTED').length,
    };

    return {
      currentPeriod: {
        period: currentPeriod,
        compliance: currentCompliance,
      },
      previousPeriod: {
        period: previousPeriod,
        compliance: previousCompliance,
        checklist,
      },
      submissionStats,
      recentReports: reports.slice(0, 5),
      deadlines: this.getDeadlines(),
      alerts: this.generateAlerts(currentCompliance, previousCompliance, checklist),
    };
  }

  /**
   * Generate alerts based on compliance status
   */
  private generateAlerts(
    currentCompliance: any,
    previousCompliance: any,
    checklist: any,
  ): { type: 'info' | 'warning' | 'error'; message: string }[] {
    const alerts: { type: 'info' | 'warning' | 'error'; message: string }[] = [];

    // Check previous period
    if (previousCompliance.periodStatus === 'pending') {
      if (previousCompliance.daysUntilDeadline < 0) {
        if (previousCompliance.gracePeriodActive) {
          alerts.push({
            type: 'warning',
            message: `SAF-T D406 pentru perioada anterioară este întârziat. Sunteți în perioada de grație.`,
          });
        } else {
          alerts.push({
            type: 'error',
            message: `SAF-T D406 pentru perioada anterioară este ÎNTÂRZIAT! Depuneți urgent.`,
          });
        }
      } else if (previousCompliance.daysUntilDeadline <= 5) {
        alerts.push({
          type: 'warning',
          message: `Termen limită în ${previousCompliance.daysUntilDeadline} zile pentru SAF-T D406.`,
        });
      }
    }

    // Check checklist
    if (!checklist.ready) {
      const errorItems = checklist.checklist.filter((c: any) => c.status === 'error');
      if (errorItems.length > 0) {
        alerts.push({
          type: 'error',
          message: `${errorItems.length} probleme de rezolvat înainte de depunere: ${errorItems.map((e: any) => e.item).join(', ')}`,
        });
      }
    }

    // Grace period info
    if (previousCompliance.gracePeriodActive) {
      alerts.push({
        type: 'info',
        message: 'Perioada pilot activă (Sept 2025 - Aug 2026) - fără penalități pentru întârzieri.',
      });
    }

    return alerts;
  }
}
