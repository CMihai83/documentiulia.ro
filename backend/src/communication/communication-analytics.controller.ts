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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CommunicationAnalyticsService,
  ChannelType,
  ABTestResult,
} from './communication-analytics.service';

@ApiTags('Communication - Analytics')
@Controller('communication/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunicationAnalyticsController {
  constructor(private readonly analyticsService: CommunicationAnalyticsService) {}

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard analytics' })
  async getDashboardStats(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const period = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

    return this.analyticsService.getDashboardStats(req.user.tenantId, period);
  }

  // =================== CAMPAIGNS ===================

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign analytics' })
  @ApiResponse({ status: 200, description: 'Campaign analytics' })
  async getCampaignAnalytics(@Param('id') id: string) {
    const analytics = await this.analyticsService.getCampaignAnalytics(id);
    if (!analytics) {
      return { error: 'Campaign analytics not found' };
    }
    return analytics;
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update campaign analytics' })
  @ApiResponse({ status: 200, description: 'Campaign analytics updated' })
  async updateCampaignAnalytics(
    @Param('id') id: string,
    @Body() body: {
      campaignName?: string;
      channel?: ChannelType;
      stats?: {
        targeted?: number;
        sent?: number;
        delivered?: number;
        opened?: number;
        clicked?: number;
        bounced?: number;
        failed?: number;
        unsubscribed?: number;
      };
    },
  ) {
    // Build update data, merging stats if provided
    const updateData: any = {};
    if (body.campaignName) updateData.campaignName = body.campaignName;
    if (body.channel) updateData.channel = body.channel;
    if (body.stats) {
      // Stats will be merged with existing in the service
      updateData.stats = body.stats;
    }
    return this.analyticsService.updateCampaignAnalytics(id, updateData);
  }

  @Post('campaigns/compare')
  @ApiOperation({ summary: 'Compare campaigns' })
  @ApiResponse({ status: 200, description: 'Campaign comparison' })
  async compareCampaigns(@Body() body: { campaignIds: string[] }) {
    return this.analyticsService.getCampaignComparison(body.campaignIds);
  }

  // =================== TEMPLATES ===================

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template analytics' })
  @ApiResponse({ status: 200, description: 'Template analytics' })
  async getTemplateAnalytics(@Param('id') id: string) {
    const analytics = await this.analyticsService.getTemplateAnalytics(id);
    if (!analytics) {
      return { error: 'Template analytics not found' };
    }
    return analytics;
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update template analytics' })
  @ApiResponse({ status: 200, description: 'Template analytics updated' })
  async updateTemplateAnalytics(
    @Param('id') id: string,
    @Body() body: {
      templateName?: string;
      channel?: ChannelType;
      usageCount?: number;
      stats?: {
        sent?: number;
        delivered?: number;
        opened?: number;
        clicked?: number;
        bounced?: number;
      };
    },
  ) {
    // Build update data, merging stats if provided
    const updateData: any = {};
    if (body.templateName) updateData.templateName = body.templateName;
    if (body.channel) updateData.channel = body.channel;
    if (body.usageCount !== undefined) updateData.usageCount = body.usageCount;
    if (body.stats) {
      // Stats will be merged with existing in the service
      updateData.stats = body.stats;
    }
    return this.analyticsService.updateTemplateAnalytics(id, updateData);
  }

  @Get('templates/top')
  @ApiOperation({ summary: 'Get top performing templates' })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top templates' })
  async getTopTemplates(
    @Request() req: any,
    @Query('channel') channel?: ChannelType,
    @Query('limit') limit?: string,
  ) {
    const templates = await this.analyticsService.getTopTemplates(
      req.user.tenantId,
      channel,
      limit ? parseInt(limit) : undefined,
    );
    return { templates, total: templates.length };
  }

  // =================== RECIPIENTS ===================

  @Get('recipients/:id')
  @ApiOperation({ summary: 'Get recipient analytics' })
  @ApiResponse({ status: 200, description: 'Recipient analytics' })
  async getRecipientAnalytics(@Param('id') id: string) {
    const analytics = await this.analyticsService.getRecipientAnalytics(id);
    if (!analytics) {
      return { error: 'Recipient analytics not found' };
    }
    return analytics;
  }

  @Post('recipients/:id/engagement')
  @ApiOperation({ summary: 'Update recipient engagement' })
  @ApiResponse({ status: 200, description: 'Engagement updated' })
  async updateRecipientEngagement(
    @Param('id') id: string,
    @Body() body: {
      channel: ChannelType;
      action: 'received' | 'opened' | 'clicked';
    },
  ) {
    await this.analyticsService.updateRecipientEngagement(id, body.channel, body.action);
    return { success: true };
  }

  @Get('recipients/top-engaged')
  @ApiOperation({ summary: 'Get top engaged recipients' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top engaged recipients' })
  async getTopEngagedRecipients(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const recipients = await this.analyticsService.getTopEngagedRecipients(
      req.user.tenantId,
      limit ? parseInt(limit) : 10,
    );
    return { recipients, total: recipients.length };
  }

  // =================== DELIVERY REPORTS ===================

  @Post('reports/delivery')
  @ApiOperation({ summary: 'Generate delivery report' })
  @ApiResponse({ status: 201, description: 'Delivery report generated' })
  async generateDeliveryReport(
    @Request() req: any,
    @Body() body: { startDate: string; endDate: string },
  ) {
    return this.analyticsService.generateDeliveryReport(req.user.tenantId, {
      start: new Date(body.startDate),
      end: new Date(body.endDate),
    });
  }

  @Get('reports/delivery')
  @ApiOperation({ summary: 'Get delivery reports' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Delivery reports' })
  async getDeliveryReports(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const reports = await this.analyticsService.getDeliveryReports(
      req.user.tenantId,
      limit ? parseInt(limit) : undefined,
    );
    return { reports, total: reports.length };
  }

  // =================== A/B TESTING ===================

  @Post('ab-tests')
  @ApiOperation({ summary: 'Create A/B test' })
  @ApiResponse({ status: 201, description: 'A/B test created' })
  async createABTest(
    @Request() req: any,
    @Body() body: {
      testName: string;
      channel: ChannelType;
      variants: Array<{ id: string; name: string }>;
    },
  ) {
    return this.analyticsService.createABTest({
      tenantId: req.user.tenantId,
      testName: body.testName,
      channel: body.channel,
      variants: body.variants,
    });
  }

  @Get('ab-tests')
  @ApiOperation({ summary: 'Get A/B tests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'A/B tests list' })
  async getABTests(
    @Request() req: any,
    @Query('status') status?: ABTestResult['status'],
  ) {
    const tests = await this.analyticsService.getABTests(req.user.tenantId, status);
    return { tests, total: tests.length };
  }

  @Put('ab-tests/:testId/variants/:variantId')
  @ApiOperation({ summary: 'Update A/B test variant' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  async updateABTestVariant(
    @Param('testId') testId: string,
    @Param('variantId') variantId: string,
    @Body() body: {
      sent?: number;
      delivered?: number;
      opened?: number;
      clicked?: number;
    },
  ) {
    const test = await this.analyticsService.updateABTestVariant(testId, variantId, body);
    if (!test) {
      return { error: 'A/B test or variant not found' };
    }
    return test;
  }

  @Post('ab-tests/:id/complete')
  @ApiOperation({ summary: 'Complete A/B test' })
  @ApiResponse({ status: 200, description: 'A/B test completed' })
  async completeABTest(@Param('id') id: string) {
    const test = await this.analyticsService.completeABTest(id);
    if (!test) {
      return { error: 'A/B test not found' };
    }
    return test;
  }

  // =================== EXPORT ===================

  @Get('export')
  @ApiOperation({ summary: 'Export analytics' })
  @ApiQuery({ name: 'type', required: true })
  @ApiQuery({ name: 'format', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Export data' })
  async exportAnalytics(
    @Request() req: any,
    @Res() res: Response,
    @Query('type') type: 'dashboard' | 'campaigns' | 'templates' | 'recipients',
    @Query('format') format?: 'json' | 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const period = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

    const result = await this.analyticsService.exportAnalytics(
      req.user.tenantId,
      type,
      format || 'json',
      period,
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }
}
