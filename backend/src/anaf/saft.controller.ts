import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SaftD406MonthlyService } from './saft-d406-monthly.service';
import { SaftService } from './saft.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * SAF-T Controller - Alias for saft-d406 controller
 * Provides simplified routes at /saft for backwards compatibility
 */
@ApiTags('saft')
@ApiBearerAuth()
@Controller('saft')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class SaftController {
  constructor(
    private readonly saftD406Service: SaftD406MonthlyService,
    private readonly saftService: SaftService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get SAF-T submission status overview',
    description: 'Returns general SAF-T submission status and compliance info',
  })
  @ApiResponse({ status: 200, description: 'SAF-T status retrieved successfully' })
  async getStatus() {
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
      status: 'active',
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
        law: 'Order 1783/2021, Legea 141/2025',
      },
      endpoints: {
        generate: '/api/v1/saft-d406/generate',
        validate: '/api/v1/saft-d406/validate',
        submit: '/api/v1/saft-d406/submit',
        deadlines: '/api/v1/saft-d406/deadlines',
      },
    };
  }

  @Get('deadlines')
  @ApiOperation({
    summary: 'Get ANAF SAF-T submission deadlines',
    description: 'Returns key deadlines per Order 1783/2021',
  })
  async getDeadlines() {
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
      timeline: [
        { date: '2025-01-01', event: 'Început obligație lunară pentru IMM/nerezidenți', status: 'active' },
        { date: '2025-09-01', event: 'Început perioadă pilot pentru mari contribuabili', status: 'upcoming' },
        { date: '2026-08-31', event: 'Sfârșit perioadă pilot', status: 'upcoming' },
        { date: '2027-02-28', event: 'Sfârșit perioadă grație (6 luni)', status: 'upcoming' },
      ],
    };
  }

  @Get('compliance/:userId/:period')
  @ApiOperation({
    summary: 'Get SAF-T compliance status for a period',
    description: 'Check compliance status for a specific user and period',
  })
  async getComplianceStatus(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ) {
    return this.saftService.getComplianceStatus(userId, period);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate SAF-T data',
    description: 'Validates all data for SAF-T without generating XML',
  })
  async validateSaft(
    @Body() body: { userId: string; period: string },
  ) {
    const result = await this.saftService.validateSAFT(body.userId, body.period);
    return {
      valid: result.valid,
      errors: result.errors.map((e) => `${e.code}: ${e.message}`),
      warnings: result.warnings.map((w) => `${w.code}: ${w.message}`),
      summary: result.summary,
    };
  }
}
