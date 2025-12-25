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
  DashboardBuilderService,
  DashboardLayout,
  DashboardTheme,
  GlobalFilter,
  DashboardVariable,
  WidgetType,
  Widget,
  DataSource,
  WidgetConfig,
  WidgetStyling,
  WidgetInteraction,
  DrillDownConfig,
  DashboardPermission,
} from './dashboard-builder.service';

@ApiTags('Business Intelligence - Dashboards')
@Controller('bi/dashboards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardBuilderController {
  constructor(private readonly dashboardService: DashboardBuilderService) {}

  // =================== DASHBOARDS ===================

  @Post()
  @ApiOperation({ summary: 'Create dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createDashboard(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      layout?: DashboardLayout;
      theme?: DashboardTheme;
      isDefault?: boolean;
      templateId?: string;
    },
  ) {
    return this.dashboardService.createDashboard({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get dashboards' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiResponse({ status: 200, description: 'Dashboards list' })
  async getDashboards(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    const dashboards = await this.dashboardService.getDashboards(req.user.tenantId, {
      category,
      tag,
      userId: req.user.id,
    });
    return { dashboards, total: dashboards.length };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get dashboard templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(@Query('category') category?: string) {
    const templates = await this.dashboardService.getTemplates(category);
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.dashboardService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard details' })
  @ApiResponse({ status: 200, description: 'Dashboard details' })
  async getDashboard(@Param('id') id: string) {
    const dashboard = await this.dashboardService.getDashboard(id);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get dashboard by slug' })
  @ApiResponse({ status: 200, description: 'Dashboard details' })
  async getDashboardBySlug(
    @Request() req: any,
    @Param('slug') slug: string,
  ) {
    const dashboard = await this.dashboardService.getDashboardBySlug(req.user.tenantId, slug);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async updateDashboard(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      layout: DashboardLayout;
      theme: DashboardTheme;
      filters: GlobalFilter[];
      variables: DashboardVariable[];
      isDefault: boolean;
      isPublic: boolean;
      tags: string[];
      category: string;
      refreshInterval: number;
    }>,
  ) {
    const dashboard = await this.dashboardService.updateDashboard(id, body);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async deleteDashboard(@Param('id') id: string) {
    await this.dashboardService.deleteDashboard(id);
    return { success: true };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard duplicated' })
  async duplicateDashboard(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const dashboard = await this.dashboardService.duplicateDashboard(id, body.name, req.user.id);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Post(':id/public-link')
  @ApiOperation({ summary: 'Generate public link' })
  @ApiResponse({ status: 200, description: 'Public link generated' })
  async generatePublicLink(@Param('id') id: string) {
    const link = await this.dashboardService.generatePublicLink(id);
    if (!link) {
      return { error: 'Dashboard not found' };
    }
    return { link };
  }

  @Delete(':id/public-link')
  @ApiOperation({ summary: 'Revoke public link' })
  @ApiResponse({ status: 200, description: 'Public link revoked' })
  async revokePublicLink(@Param('id') id: string) {
    await this.dashboardService.revokePublicLink(id);
    return { success: true };
  }

  @Post(':id/refresh')
  @ApiOperation({ summary: 'Refresh dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data refreshed' })
  async refreshDashboard(@Param('id') id: string) {
    const data = await this.dashboardService.refreshDashboard(id);
    return { data };
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard export' })
  async exportDashboard(@Param('id') id: string) {
    const data = await this.dashboardService.exportDashboard(id);
    if (!data) {
      return { error: 'Dashboard not found' };
    }
    return data;
  }

  @Post('import')
  @ApiOperation({ summary: 'Import dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard imported' })
  async importDashboard(
    @Request() req: any,
    @Body() body: { data: any },
  ) {
    return this.dashboardService.importDashboard(req.user.tenantId, req.user.id, body.data);
  }

  @Post(':id/template')
  @ApiOperation({ summary: 'Create template from dashboard' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplateFromDashboard(
    @Param('id') id: string,
    @Body() body: {
      name: string;
      description: string;
      category: string;
    },
  ) {
    const template = await this.dashboardService.createTemplateFromDashboard(id, body);
    if (!template) {
      return { error: 'Dashboard not found' };
    }
    return template;
  }

  // =================== WIDGETS ===================

  @Post(':dashboardId/widgets')
  @ApiOperation({ summary: 'Add widget to dashboard' })
  @ApiResponse({ status: 201, description: 'Widget added' })
  async addWidget(
    @Param('dashboardId') dashboardId: string,
    @Body() body: {
      type: WidgetType;
      title: string;
      description?: string;
      position: Widget['position'];
      dataSource: DataSource;
      config: WidgetConfig;
      styling?: WidgetStyling;
      interactions?: WidgetInteraction[];
      drillDown?: DrillDownConfig;
      refreshInterval?: number;
    },
  ) {
    const widget = await this.dashboardService.addWidget(dashboardId, body);
    if (!widget) {
      return { error: 'Dashboard not found' };
    }
    return widget;
  }

  @Get('widgets/:id')
  @ApiOperation({ summary: 'Get widget details' })
  @ApiResponse({ status: 200, description: 'Widget details' })
  async getWidget(@Param('id') id: string) {
    const widget = await this.dashboardService.getWidget(id);
    if (!widget) {
      return { error: 'Widget not found' };
    }
    return widget;
  }

  @Put('widgets/:id')
  @ApiOperation({ summary: 'Update widget' })
  @ApiResponse({ status: 200, description: 'Widget updated' })
  async updateWidget(
    @Param('id') id: string,
    @Body() body: Partial<{
      title: string;
      description: string;
      position: Widget['position'];
      dataSource: DataSource;
      config: WidgetConfig;
      styling: WidgetStyling;
      interactions: WidgetInteraction[];
      drillDown: DrillDownConfig;
      refreshInterval: number;
    }>,
  ) {
    const widget = await this.dashboardService.updateWidget(id, body);
    if (!widget) {
      return { error: 'Widget not found' };
    }
    return widget;
  }

  @Delete('widgets/:id')
  @ApiOperation({ summary: 'Remove widget' })
  @ApiResponse({ status: 200, description: 'Widget removed' })
  async removeWidget(@Param('id') id: string) {
    await this.dashboardService.removeWidget(id);
    return { success: true };
  }

  @Post('widgets/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate widget' })
  @ApiResponse({ status: 201, description: 'Widget duplicated' })
  async duplicateWidget(@Param('id') id: string) {
    const widget = await this.dashboardService.duplicateWidget(id);
    if (!widget) {
      return { error: 'Widget not found' };
    }
    return widget;
  }

  @Put('widgets/:id/move')
  @ApiOperation({ summary: 'Move widget' })
  @ApiResponse({ status: 200, description: 'Widget moved' })
  async moveWidget(
    @Param('id') id: string,
    @Body() body: Widget['position'],
  ) {
    const widget = await this.dashboardService.moveWidget(id, body);
    if (!widget) {
      return { error: 'Widget not found' };
    }
    return widget;
  }

  @Put('widgets/:id/resize')
  @ApiOperation({ summary: 'Resize widget' })
  @ApiResponse({ status: 200, description: 'Widget resized' })
  async resizeWidget(
    @Param('id') id: string,
    @Body() body: { width: number; height: number },
  ) {
    const widget = await this.dashboardService.resizeWidget(id, body.width, body.height);
    if (!widget) {
      return { error: 'Widget not found' };
    }
    return widget;
  }

  @Get('widgets/:id/data')
  @ApiOperation({ summary: 'Fetch widget data' })
  @ApiResponse({ status: 200, description: 'Widget data' })
  async fetchWidgetData(
    @Param('id') id: string,
    @Query() filters: Record<string, any>,
  ) {
    const data = await this.dashboardService.fetchWidgetData(id, filters);
    return { data };
  }

  // =================== PERMISSIONS ===================

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Set dashboard permission' })
  @ApiResponse({ status: 200, description: 'Permission set' })
  async setPermission(
    @Param('id') id: string,
    @Body() body: DashboardPermission,
  ) {
    await this.dashboardService.setPermission(id, body);
    return { success: true };
  }

  @Delete(':id/permissions')
  @ApiOperation({ summary: 'Remove dashboard permission' })
  @ApiResponse({ status: 200, description: 'Permission removed' })
  async removePermission(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    @Query('roleId') roleId?: string,
  ) {
    await this.dashboardService.removePermission(id, userId, roleId);
    return { success: true };
  }

  @Get(':id/permissions/check')
  @ApiOperation({ summary: 'Check permission' })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  async checkPermission(
    @Request() req: any,
    @Param('id') id: string,
    @Query('level') level: 'view' | 'edit' | 'admin',
  ) {
    const hasPermission = await this.dashboardService.checkPermission(id, req.user.id, level);
    return { hasPermission };
  }
}
