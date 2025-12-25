import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnafStatusService } from './anaf-status.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Compliance - ANAF Status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance/anaf-status')
export class AnafStatusController {
  constructor(private readonly anafStatusService: AnafStatusService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive ANAF compliance overview' })
  async getOverview(@Request() req: any) {
    return await this.anafStatusService.getComplianceOverview(req.user.sub);
  }

  @Get('submissions')
  @ApiOperation({ summary: 'Get all ANAF submissions' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type: EFACTURA, SAFT, D112, D394, REVISAL' })
  @ApiQuery({ name: 'limit', required: false })
  async getSubmissions(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const submissions = await this.anafStatusService.getAllSubmissions(
      req.user.sub,
      {
        type: type?.toUpperCase(),
        limit: limit ? parseInt(limit) : undefined,
      },
    );

    return {
      submissions,
      count: submissions.length,
    };
  }

  @Get('deadlines')
  @ApiOperation({ summary: 'Get upcoming compliance deadlines' })
  async getDeadlines(@Request() req: any) {
    const deadlines = await this.anafStatusService.getUpcomingDeadlines(req.user.sub);

    const urgent = deadlines.filter(d => d.priority === 'HIGH');
    const upcoming = deadlines.filter(d => d.priority !== 'HIGH');

    return {
      urgent,
      upcoming,
      total: deadlines.length,
    };
  }

  @Get('submission/:id')
  @ApiOperation({ summary: 'Get status of a specific submission' })
  async getSubmissionStatus(
    @Request() req: any,
    @Param('id') submissionId: string,
  ) {
    const status = await this.anafStatusService.checkSubmissionStatus(
      req.user.sub,
      submissionId,
    );

    if (!status) {
      return {
        success: false,
        message: 'Submission not found',
      };
    }

    return {
      success: true,
      submission: status,
    };
  }

  @Post('resubmit')
  @ApiOperation({ summary: 'Resubmit a failed submission' })
  async resubmit(
    @Request() req: any,
    @Body() body: {
      submissionId: string;
      xmlContent?: string;
    },
  ) {
    try {
      const result = await this.anafStatusService.resubmit(
        req.user.sub,
        body.submissionId,
        body.xmlContent || '',
      );

      return result;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get compliance calendar for the month' })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'month', required: false })
  async getCalendar(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    // Generate calendar events for the month
    const events = [
      {
        date: `${targetYear}-${String(targetMonth).padStart(2, '0')}-25`,
        type: 'DEADLINE',
        title: 'D112 - Declaratie contributii',
        description: 'Termen limita depunere D112',
      },
      {
        date: `${targetYear}-${String(targetMonth).padStart(2, '0')}-25`,
        type: 'DEADLINE',
        title: 'D394 - Declaratie TVA',
        description: 'Termen limita depunere D394',
      },
      {
        date: `${targetYear}-${String(targetMonth).padStart(2, '0')}-25`,
        type: 'DEADLINE',
        title: 'SAF-T D406',
        description: 'Termen limita raportare SAF-T',
      },
    ];

    // Add previous submissions as completed events
    const submissions = await this.anafStatusService.getAllSubmissions(req.user.sub, {
      limit: 10,
    });

    submissions.forEach(sub => {
      const subDate = new Date(sub.submittedAt);
      if (
        subDate.getFullYear() === targetYear &&
        subDate.getMonth() + 1 === targetMonth
      ) {
        events.push({
          date: subDate.toISOString().split('T')[0],
          type: 'SUBMISSION',
          title: `${sub.type} depus`,
          description: `Status: ${sub.status}`,
        });
      }
    });

    return {
      year: targetYear,
      month: targetMonth,
      events: events.sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get compliance dashboard data' })
  async getDashboard(@Request() req: any) {
    const overview = await this.anafStatusService.getComplianceOverview(req.user.sub);
    const deadlines = await this.anafStatusService.getUpcomingDeadlines(req.user.sub);
    const recentSubmissions = await this.anafStatusService.getAllSubmissions(
      req.user.sub,
      { limit: 5 },
    );

    const complianceScore = this.calculateComplianceScore(overview, deadlines);

    return {
      overview,
      deadlines: deadlines.slice(0, 5),
      recentSubmissions,
      complianceScore,
      alerts: deadlines.filter(d => d.priority === 'HIGH').length,
    };
  }

  private calculateComplianceScore(overview: any, deadlines: any[]): number {
    let score = 100;

    // Deduct for pending deadlines
    const urgentDeadlines = deadlines.filter(d => d.priority === 'HIGH');
    score -= urgentDeadlines.length * 10;

    // Deduct for rejected submissions
    score -= overview.efactura.rejected * 5;

    // Deduct for pending REVISAL changes
    if (overview.revisal.pendingChanges > 0) {
      score -= Math.min(overview.revisal.pendingChanges * 5, 20);
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }
}
