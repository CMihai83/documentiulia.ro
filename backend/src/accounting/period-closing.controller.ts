import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  PeriodClosingService,
  AccountingPeriod,
  PeriodClosingResult,
  ValidationResult,
} from './period-closing.service';

@ApiTags('Period Closing / Inchidere Perioada')
@ApiBearerAuth()
@Controller('accounting/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class PeriodClosingController {
  constructor(private readonly periodClosingService: PeriodClosingService) {}

  // ===== Period Management =====

  @Get(':userId')
  @ApiOperation({
    summary: 'Get all accounting periods',
    description: 'Retrieve all accounting periods for a user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
  @ApiResponse({ status: 200, description: 'List of periods' })
  async getPeriods(
    @Param('userId') userId: string,
    @Query('year') year?: number,
  ): Promise<AccountingPeriod[]> {
    return this.periodClosingService.getPeriods(userId, year);
  }

  @Get(':userId/:period')
  @ApiOperation({
    summary: 'Get period status',
    description: 'Get detailed status of a specific accounting period',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'period', description: 'Period in YYYY-MM format', example: '2025-01' })
  @ApiResponse({ status: 200, description: 'Period status' })
  async getPeriodStatus(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ): Promise<AccountingPeriod> {
    return this.periodClosingService.getPeriodStatus(userId, period);
  }

  @Get(':userId/:period/summary')
  @ApiOperation({
    summary: 'Get period summary',
    description: 'Get financial summary and validation status for a period',
  })
  @ApiResponse({ status: 200, description: 'Period summary' })
  async getPeriodSummary(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ) {
    return this.periodClosingService.getPeriodSummary(userId, period);
  }

  // ===== Validation =====

  @Get(':userId/:period/validate')
  @ApiOperation({
    summary: 'Validate period for closing',
    description: 'Run all validations before closing a period',
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validatePeriod(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ): Promise<ValidationResult> {
    return this.periodClosingService.validatePeriodForClosing(userId, period);
  }

  @Get(':userId/:period/checklist')
  @ApiOperation({
    summary: 'Get closing checklist',
    description: 'Get the pre-closing checklist with status for each item',
  })
  @ApiResponse({ status: 200, description: 'Closing checklist' })
  async getChecklist(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ) {
    return this.periodClosingService.getClosingChecklist(userId, period);
  }

  // ===== Closing Operations =====

  @Post(':userId/:period/close')
  @ApiOperation({
    summary: 'Close accounting period',
    description: 'Close an accounting period after validation',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        closedBy: { type: 'string', description: 'Name/ID of user closing the period' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Period closed successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @HttpCode(HttpStatus.OK)
  async closePeriod(
    @Param('userId') userId: string,
    @Param('period') period: string,
    @Body() body: { closedBy?: string },
  ): Promise<PeriodClosingResult> {
    return this.periodClosingService.closePeriod(userId, period, body.closedBy || userId);
  }

  @Post(':userId/:period/lock')
  @ApiOperation({
    summary: 'Lock accounting period',
    description: 'Permanently lock a closed period (prevents reopening)',
  })
  @ApiResponse({ status: 200, description: 'Period locked successfully' })
  @ApiResponse({ status: 400, description: 'Period not closed' })
  @HttpCode(HttpStatus.OK)
  async lockPeriod(
    @Param('userId') userId: string,
    @Param('period') period: string,
  ): Promise<AccountingPeriod> {
    return this.periodClosingService.lockPeriod(userId, period);
  }

  @Post(':userId/:period/reopen')
  @ApiOperation({
    summary: 'Reopen accounting period',
    description: 'Reopen a closed (not locked) period for corrections',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', description: 'Reason for reopening the period' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Period reopened successfully' })
  @ApiResponse({ status: 400, description: 'Period is locked' })
  @HttpCode(HttpStatus.OK)
  async reopenPeriod(
    @Param('userId') userId: string,
    @Param('period') period: string,
    @Body() body: { reason: string },
  ): Promise<AccountingPeriod> {
    return this.periodClosingService.reopenPeriod(userId, period, body.reason);
  }

  // ===== Dashboard =====

  @Get(':userId/dashboard')
  @ApiOperation({
    summary: 'Get period closing dashboard',
    description: 'Dashboard with current period status and upcoming closings',
  })
  async getDashboard(@Param('userId') userId: string) {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousPeriod = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const [currentSummary, previousSummary, allPeriods] = await Promise.all([
      this.periodClosingService.getPeriodSummary(userId, currentPeriod),
      this.periodClosingService.getPeriodSummary(userId, previousPeriod),
      this.periodClosingService.getPeriods(userId, now.getFullYear()),
    ]);

    // Calculate stats
    const closedPeriods = allPeriods.filter(p => p.status === 'CLOSED' || p.status === 'LOCKED');
    const openPeriods = allPeriods.filter(p => p.status === 'OPEN');

    // Generate alerts
    const alerts: { type: 'info' | 'warning' | 'error'; message: string }[] = [];

    if (previousSummary.period.status === 'OPEN') {
      const dayOfMonth = now.getDate();
      if (dayOfMonth > 20) {
        alerts.push({
          type: 'warning',
          message: `Perioada ${previousPeriod} inca deschisa. Inchideti pana la sfarsitul lunii.`,
        });
      } else {
        alerts.push({
          type: 'info',
          message: `Perioada ${previousPeriod} disponibila pentru inchidere.`,
        });
      }
    }

    const failedValidations = previousSummary.validation.checklist.filter(c => c.status === 'failed');
    if (failedValidations.length > 0) {
      alerts.push({
        type: 'error',
        message: `${failedValidations.length} validari esuate pentru ${previousPeriod}: ${failedValidations.map(f => f.name).join(', ')}`,
      });
    }

    return {
      currentPeriod: {
        periodCode: currentPeriod,
        ...currentSummary,
      },
      previousPeriod: {
        periodCode: previousPeriod,
        ...previousSummary,
      },
      stats: {
        totalPeriods: allPeriods.length,
        closedPeriods: closedPeriods.length,
        openPeriods: openPeriods.length,
      },
      alerts,
      recentPeriods: allPeriods.slice(0, 6).map(p => ({
        period: p.period,
        status: p.status,
        closedAt: p.closedAt,
      })),
    };
  }
}
