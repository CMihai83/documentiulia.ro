import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ExecutiveSummaryService,
  SummaryPeriod,
  SummaryFormat,
  TemplateSectionConfig,
  SummaryTemplate,
  SummaryTheme,
  BrandingConfig,
} from './executive-summary.service';

@ApiTags('Business Intelligence - Executive Summaries')
@Controller('bi/summaries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExecutiveSummaryController {
  constructor(private readonly summaryService: ExecutiveSummaryService) {}

  // =================== SUMMARY GENERATION ===================

  @Post('generate')
  @ApiOperation({ summary: 'Generate executive summary' })
  @ApiResponse({ status: 201, description: 'Summary generated' })
  async generateSummary(
    @Request() req: any,
    @Body() body: {
      title?: string;
      period: SummaryPeriod;
      dateRange?: { start: string; end: string };
      templateId?: string;
      customSections?: TemplateSectionConfig[];
    },
  ) {
    return this.summaryService.generateSummary({
      tenantId: req.user.tenantId,
      title: body.title,
      period: body.period,
      dateRange: body.dateRange
        ? { start: new Date(body.dateRange.start), end: new Date(body.dateRange.end) }
        : undefined,
      templateId: body.templateId,
      customSections: body.customSections,
      generatedBy: req.user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get summaries' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Summaries list' })
  async getSummaries(
    @Request() req: any,
    @Query('period') period?: SummaryPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const summaries = await this.summaryService.getSummaries(req.user.tenantId, {
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { summaries, total: summaries.length };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get summary stats' })
  @ApiResponse({ status: 200, description: 'Summary statistics' })
  async getStats(@Request() req: any) {
    return this.summaryService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get summary details' })
  @ApiResponse({ status: 200, description: 'Summary details' })
  async getSummary(@Param('id') id: string) {
    const summary = await this.summaryService.getSummary(id);
    if (!summary) {
      return { error: 'Summary not found' };
    }
    return summary;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete summary' })
  @ApiResponse({ status: 200, description: 'Summary deleted' })
  async deleteSummary(@Param('id') id: string) {
    await this.summaryService.deleteSummary(id);
    return { success: true };
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export summary' })
  @ApiQuery({ name: 'format', required: true })
  @ApiResponse({ status: 200, description: 'Exported summary' })
  async exportSummary(
    @Param('id') id: string,
    @Query('format') format: SummaryFormat,
  ) {
    const content = await this.summaryService.exportSummary(id, format);
    if (!content) {
      return { error: 'Summary not found' };
    }
    return { format, content };
  }

  // =================== TEMPLATES ===================

  @Get('templates/list')
  @ApiOperation({ summary: 'Get summary templates' })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates() {
    const templates = await this.summaryService.getTemplates();
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.summaryService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Body() body: {
      name: string;
      description: string;
      sections: TemplateSectionConfig[];
      theme?: SummaryTheme;
      branding?: BrandingConfig;
      isDefault?: boolean;
    },
  ) {
    return this.summaryService.createTemplate(body);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: Partial<SummaryTemplate>,
  ) {
    const template = await this.summaryService.updateTemplate(id, body);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    await this.summaryService.deleteTemplate(id);
    return { success: true };
  }

  // =================== PREFERENCES ===================

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getPreferences(@Request() req: any) {
    const prefs = await this.summaryService.getPreferences(req.user.tenantId, req.user.id);
    if (!prefs) {
      return { preferences: null };
    }
    return { preferences: prefs };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Request() req: any,
    @Body() body: Partial<{
      defaultPeriod: SummaryPeriod;
      defaultFormat: SummaryFormat;
      defaultTemplateId: string;
      subscribedSections: string[];
      deliveryPreferences: {
        email?: boolean;
        slack?: boolean;
        inApp?: boolean;
      };
      schedule: {
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
      };
    }>,
  ) {
    return this.summaryService.updatePreferences(req.user.tenantId, req.user.id, body);
  }
}
