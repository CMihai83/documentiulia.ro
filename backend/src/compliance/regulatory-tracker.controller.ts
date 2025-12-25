import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { RegulatoryTrackerService, RegulatoryChange, TenantImpactAssessment } from './regulatory-tracker.service';

@Controller('compliance/regulatory')
export class RegulatoryTrackerController {
  constructor(private readonly regulatoryService: RegulatoryTrackerService) {}

  @Get('changes')
  async getChanges(
    @Query('category') category?: string,
    @Query('jurisdiction') jurisdiction?: string,
    @Query('status') status?: string,
    @Query('impactLevel') impactLevel?: string,
    @Query('effectiveAfter') effectiveAfter?: string,
    @Query('effectiveBefore') effectiveBefore?: string,
  ) {
    const changes = await this.regulatoryService.getChanges({
      category,
      jurisdiction,
      status,
      impactLevel,
      effectiveAfter: effectiveAfter ? new Date(effectiveAfter) : undefined,
      effectiveBefore: effectiveBefore ? new Date(effectiveBefore) : undefined,
    });

    return {
      success: true,
      data: { changes },
    };
  }

  @Post('changes')
  async addChange(
    @Body() body: Omit<RegulatoryChange, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    if (!body.title || !body.effectiveDate) {
      throw new BadRequestException('Title and effective date are required');
    }

    const change = await this.regulatoryService.addChange({
      ...body,
      publishedDate: new Date(body.publishedDate),
      effectiveDate: new Date(body.effectiveDate),
    });

    return {
      success: true,
      data: change,
    };
  }

  @Get('changes/:id')
  async getChange(@Param('id') id: string) {
    const change = await this.regulatoryService.getChange(id);
    if (!change) {
      throw new BadRequestException('Regulatory change not found');
    }

    return {
      success: true,
      data: change,
    };
  }

  @Put('changes/:id')
  async updateChange(
    @Param('id') id: string,
    @Body() body: Partial<Omit<RegulatoryChange, 'id' | 'createdAt'>>,
  ) {
    const change = await this.regulatoryService.updateChange(id, body);
    if (!change) {
      throw new BadRequestException('Regulatory change not found');
    }

    return {
      success: true,
      data: change,
    };
  }

  @Get('upcoming')
  async getUpcomingChanges(@Query('days') days?: string) {
    const changes = await this.regulatoryService.getUpcomingChanges(
      days ? parseInt(days) : 90,
    );

    return {
      success: true,
      data: { changes },
    };
  }

  @Get('search')
  async searchChanges(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }

    const changes = await this.regulatoryService.searchChanges(query);

    return {
      success: true,
      data: { changes },
    };
  }

  // Impact Assessments
  @Post('assessments')
  async assessImpact(
    @Request() req: any,
    @Body() body: {
      changeId: string;
      applicability: TenantImpactAssessment['applicability'];
      impactAreas: string[];
      complianceStatus: TenantImpactAssessment['complianceStatus'];
      requiredChanges: string[];
      estimatedEffort: TenantImpactAssessment['estimatedEffort'];
      targetComplianceDate?: string;
      notes?: string;
    },
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const userId = req.user?.id || 'system';

    if (!body.changeId) {
      throw new BadRequestException('Change ID is required');
    }

    const assessment = await this.regulatoryService.assessImpact(tenantId, body.changeId, {
      assessedBy: userId,
      applicability: body.applicability,
      impactAreas: body.impactAreas,
      complianceStatus: body.complianceStatus,
      requiredChanges: body.requiredChanges,
      estimatedEffort: body.estimatedEffort,
      targetComplianceDate: body.targetComplianceDate ? new Date(body.targetComplianceDate) : undefined,
      notes: body.notes,
    });

    return {
      success: true,
      data: assessment,
    };
  }

  @Get('assessments')
  async getAssessments(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const assessments = await this.regulatoryService.getAssessments(tenantId);

    return {
      success: true,
      data: { assessments },
    };
  }

  @Get('assessments/:changeId')
  async getAssessmentForChange(
    @Request() req: any,
    @Param('changeId') changeId: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const assessment = await this.regulatoryService.getAssessmentForChange(tenantId, changeId);

    return {
      success: true,
      data: assessment,
    };
  }

  // Alerts
  @Get('alerts')
  async getAlerts(
    @Request() req: any,
    @Query('unacknowledgedOnly') unacknowledgedOnly?: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const alerts = await this.regulatoryService.getAlerts(
      tenantId,
      unacknowledgedOnly === 'true',
    );

    return {
      success: true,
      data: { alerts },
    };
  }

  @Post('alerts/:id/acknowledge')
  async acknowledgeAlert(
    @Request() req: any,
    @Param('id') alertId: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const userId = req.user?.id || 'system';

    const alert = await this.regulatoryService.acknowledgeAlert(alertId, tenantId, userId);
    if (!alert) {
      throw new BadRequestException('Alert not found');
    }

    return {
      success: true,
      data: alert,
    };
  }

  // Reports
  @Get('gap-report')
  async getComplianceGapReport(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const report = await this.regulatoryService.getComplianceGapReport(tenantId);

    return {
      success: true,
      data: report,
    };
  }

  @Get('stats/jurisdiction')
  async getStatsByJurisdiction() {
    const stats = await this.regulatoryService.getStatsByJurisdiction();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('categories')
  async getCategories() {
    return {
      success: true,
      data: {
        categories: [
          { id: 'tax', name: 'Tax', description: 'Tax law changes' },
          { id: 'accounting', name: 'Accounting', description: 'Accounting standards' },
          { id: 'labor', name: 'Labor', description: 'Employment law' },
          { id: 'data_protection', name: 'Data Protection', description: 'Privacy regulations' },
          { id: 'corporate', name: 'Corporate', description: 'Corporate law' },
          { id: 'other', name: 'Other', description: 'Other regulations' },
        ],
        jurisdictions: [
          { id: 'RO', name: 'Romania' },
          { id: 'EU', name: 'European Union' },
          { id: 'US', name: 'United States' },
          { id: 'GLOBAL', name: 'Global' },
        ],
        impactLevels: [
          { id: 'low', name: 'Low', description: 'Minor changes, limited impact' },
          { id: 'medium', name: 'Medium', description: 'Moderate changes required' },
          { id: 'high', name: 'High', description: 'Significant changes needed' },
          { id: 'critical', name: 'Critical', description: 'Urgent action required' },
        ],
      },
    };
  }
}
