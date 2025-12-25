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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  DashboardBuilderService,
  WidgetType,
  DashboardVisibility,
  WidgetConfig,
  DashboardLayout,
  DashboardTheme,
} from './dashboard-builder.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dashboard Builder')
@Controller('dashboard-builder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardBuilderController {
  constructor(private readonly builderService: DashboardBuilderService) {}

  // =================== DASHBOARDS ===================

  @Post('dashboards')
  @ApiOperation({ summary: 'Create dashboard' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        ownerId: { type: 'string' },
        description: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'team', 'organization', 'public'] },
        isDefault: { type: 'boolean' },
      },
      required: ['tenantId', 'name', 'ownerId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createDashboard(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('ownerId') ownerId: string,
    @Body('description') description?: string,
    @Body('visibility') visibility?: DashboardVisibility,
    @Body('layout') layout?: Partial<DashboardLayout>,
    @Body('theme') theme?: DashboardTheme,
    @Body('isDefault') isDefault?: boolean,
  ) {
    return this.builderService.createDashboard(tenantId, name, ownerId, {
      description,
      visibility,
      layout,
      theme,
      isDefault,
    });
  }

  @Get('dashboards/:dashboardId')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiResponse({ status: 200, description: 'Dashboard details' })
  async getDashboard(@Param('dashboardId') dashboardId: string) {
    const dashboard = await this.builderService.getDashboard(dashboardId);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  @Get('dashboards/tenant/:tenantId')
  @ApiOperation({ summary: 'Get dashboards for tenant' })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'visibility', required: false })
  @ApiQuery({ name: 'isDefault', required: false })
  @ApiResponse({ status: 200, description: 'List of dashboards' })
  async getDashboards(
    @Param('tenantId') tenantId: string,
    @Query('ownerId') ownerId?: string,
    @Query('visibility') visibility?: DashboardVisibility,
    @Query('isDefault') isDefault?: string,
  ) {
    return {
      dashboards: await this.builderService.getDashboards(tenantId, {
        ownerId,
        visibility,
        isDefault: isDefault ? isDefault === 'true' : undefined,
      }),
    };
  }

  @Get('dashboards/accessible/:tenantId/:userId')
  @ApiOperation({ summary: 'Get accessible dashboards for user' })
  @ApiResponse({ status: 200, description: 'List of accessible dashboards' })
  async getAccessibleDashboards(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return {
      dashboards: await this.builderService.getAccessibleDashboards(tenantId, userId),
    };
  }

  @Put('dashboards/:dashboardId')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async updateDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body() updates: Record<string, any>,
  ) {
    const dashboard = await this.builderService.updateDashboard(dashboardId, updates);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  @Delete('dashboards/:dashboardId')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async deleteDashboard(@Param('dashboardId') dashboardId: string) {
    const success = await this.builderService.deleteDashboard(dashboardId);
    return { success };
  }

  @Post('dashboards/:dashboardId/duplicate')
  @ApiOperation({ summary: 'Duplicate dashboard' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newName: { type: 'string' },
        userId: { type: 'string' },
      },
      required: ['newName', 'userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Dashboard duplicated' })
  async duplicateDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body('newName') newName: string,
    @Body('userId') userId: string,
  ) {
    const dashboard = await this.builderService.duplicateDashboard(dashboardId, newName, userId);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  @Post('dashboards/:dashboardId/set-default')
  @ApiOperation({ summary: 'Set as default dashboard' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Default set' })
  async setDefaultDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body('userId') userId: string,
  ) {
    const dashboard = await this.builderService.setDefaultDashboard(dashboardId, userId);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  @Post('dashboards/:dashboardId/share')
  @ApiOperation({ summary: 'Share dashboard' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userIds: { type: 'array', items: { type: 'string' } } },
      required: ['userIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Dashboard shared' })
  async shareDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body('userIds') userIds: string[],
  ) {
    const dashboard = await this.builderService.shareDashboard(dashboardId, userIds);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  @Delete('dashboards/:dashboardId/share/:userId')
  @ApiOperation({ summary: 'Unshare dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard unshared' })
  async unshareDashboard(
    @Param('dashboardId') dashboardId: string,
    @Param('userId') userId: string,
  ) {
    const dashboard = await this.builderService.unshareDashboard(dashboardId, userId);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  // =================== WIDGETS ===================

  @Post('widgets')
  @ApiOperation({ summary: 'Create widget' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string' },
        config: { type: 'object' },
        createdBy: { type: 'string' },
      },
      required: ['tenantId', 'name', 'type', 'config', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Widget created' })
  async createWidget(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('type') type: WidgetType,
    @Body('config') config: WidgetConfig,
    @Body('createdBy') createdBy: string,
  ) {
    return this.builderService.createWidget(tenantId, name, type, config, createdBy);
  }

  @Get('widgets/:widgetId')
  @ApiOperation({ summary: 'Get widget by ID' })
  @ApiResponse({ status: 200, description: 'Widget details' })
  async getWidget(@Param('widgetId') widgetId: string) {
    const widget = await this.builderService.getWidget(widgetId);
    if (!widget) return { error: 'Widget not found' };
    return widget;
  }

  @Get('widgets/tenant/:tenantId')
  @ApiOperation({ summary: 'Get widgets for tenant' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'List of widgets' })
  async getWidgets(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: WidgetType,
  ) {
    return { widgets: await this.builderService.getWidgets(tenantId, type) };
  }

  @Put('widgets/:widgetId')
  @ApiOperation({ summary: 'Update widget' })
  @ApiResponse({ status: 200, description: 'Widget updated' })
  async updateWidget(
    @Param('widgetId') widgetId: string,
    @Body() updates: Record<string, any>,
  ) {
    const widget = await this.builderService.updateWidget(widgetId, updates);
    if (!widget) return { error: 'Widget not found' };
    return widget;
  }

  @Delete('widgets/:widgetId')
  @ApiOperation({ summary: 'Delete widget' })
  @ApiResponse({ status: 200, description: 'Widget deleted' })
  async deleteWidget(@Param('widgetId') widgetId: string) {
    const success = await this.builderService.deleteWidget(widgetId);
    return { success };
  }

  @Post('widgets/from-template')
  @ApiOperation({ summary: 'Create widget from template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        templateId: { type: 'string' },
        name: { type: 'string' },
        customConfig: { type: 'object' },
        createdBy: { type: 'string' },
      },
      required: ['tenantId', 'templateId', 'name', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Widget created from template' })
  async createWidgetFromTemplate(
    @Body('tenantId') tenantId: string,
    @Body('templateId') templateId: string,
    @Body('name') name: string,
    @Body('customConfig') customConfig: Partial<WidgetConfig>,
    @Body('createdBy') createdBy: string,
  ) {
    const widget = await this.builderService.createWidgetFromTemplate(
      tenantId,
      templateId,
      name,
      customConfig || {},
      createdBy,
    );
    if (!widget) return { error: 'Template not found' };
    return widget;
  }

  // =================== LAYOUT ===================

  @Post('dashboards/:dashboardId/widgets')
  @ApiOperation({ summary: 'Add widget to dashboard' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        widgetId: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['widgetId', 'x', 'y', 'width', 'height'],
    },
  })
  @ApiResponse({ status: 200, description: 'Widget added to dashboard' })
  async addWidgetToDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body('widgetId') widgetId: string,
    @Body('x') x: number,
    @Body('y') y: number,
    @Body('width') width: number,
    @Body('height') height: number,
  ) {
    const dashboard = await this.builderService.addWidgetToDashboard(
      dashboardId,
      widgetId,
      { x, y, width, height },
    );
    if (!dashboard) return { error: 'Dashboard or widget not found' };
    return dashboard;
  }

  @Delete('dashboards/:dashboardId/widgets/:widgetId')
  @ApiOperation({ summary: 'Remove widget from dashboard' })
  @ApiResponse({ status: 200, description: 'Widget removed from dashboard' })
  async removeWidgetFromDashboard(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
  ) {
    const dashboard = await this.builderService.removeWidgetFromDashboard(dashboardId, widgetId);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  @Put('dashboards/:dashboardId/widgets/:widgetId/position')
  @ApiOperation({ summary: 'Update widget position' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Widget position updated' })
  async updateWidgetPosition(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Body('x') x?: number,
    @Body('y') y?: number,
    @Body('width') width?: number,
    @Body('height') height?: number,
  ) {
    const dashboard = await this.builderService.updateWidgetPosition(
      dashboardId,
      widgetId,
      { x, y, width, height },
    );
    if (!dashboard) return { error: 'Dashboard or widget not found' };
    return dashboard;
  }

  @Put('dashboards/:dashboardId/layout')
  @ApiOperation({ summary: 'Update dashboard layout' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        columns: { type: 'number' },
        rows: { type: 'number' },
        widgets: { type: 'array' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Layout updated' })
  async updateLayout(
    @Param('dashboardId') dashboardId: string,
    @Body() layout: DashboardLayout,
  ) {
    const dashboard = await this.builderService.updateLayout(dashboardId, layout);
    if (!dashboard) return { error: 'Dashboard not found' };
    return dashboard;
  }

  // =================== WIDGET DATA ===================

  @Get('widgets/:widgetId/data')
  @ApiOperation({ summary: 'Get widget data' })
  @ApiResponse({ status: 200, description: 'Widget data' })
  async getWidgetData(@Param('widgetId') widgetId: string) {
    const data = await this.builderService.getWidgetData(widgetId);
    if (!data) return { error: 'Widget not found' };
    return data;
  }

  @Post('widgets/:widgetId/refresh')
  @ApiOperation({ summary: 'Refresh widget data' })
  @ApiResponse({ status: 200, description: 'Widget data refreshed' })
  async refreshWidgetData(@Param('widgetId') widgetId: string) {
    const data = await this.builderService.refreshWidgetData(widgetId);
    if (!data) return { error: 'Widget not found' };
    return data;
  }

  // =================== TEMPLATES ===================

  @Get('templates/widgets')
  @ApiOperation({ summary: 'Get widget templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'List of widget templates' })
  async getWidgetTemplates(@Query('category') category?: string) {
    return { templates: await this.builderService.getWidgetTemplates(category) };
  }

  @Get('templates/widgets/:templateId')
  @ApiOperation({ summary: 'Get widget template by ID' })
  @ApiResponse({ status: 200, description: 'Widget template' })
  async getWidgetTemplate(@Param('templateId') templateId: string) {
    const template = await this.builderService.getWidgetTemplate(templateId);
    if (!template) return { error: 'Template not found' };
    return template;
  }

  @Post('templates/widgets')
  @ApiOperation({ summary: 'Create widget template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        defaultConfig: { type: 'object' },
      },
      required: ['name', 'description', 'type', 'category', 'defaultConfig'],
    },
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createWidgetTemplate(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('type') type: WidgetType,
    @Body('category') category: string,
    @Body('defaultConfig') defaultConfig: Partial<WidgetConfig>,
  ) {
    return this.builderService.createWidgetTemplate(name, description, type, category, defaultConfig);
  }

  @Get('templates/dashboards')
  @ApiOperation({ summary: 'Get dashboard templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'List of dashboard templates' })
  async getDashboardTemplates(@Query('category') category?: string) {
    return { templates: await this.builderService.getDashboardTemplates(category) };
  }

  @Post('dashboards/from-template')
  @ApiOperation({ summary: 'Create dashboard from template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
        tenantId: { type: 'string' },
        name: { type: 'string' },
        userId: { type: 'string' },
      },
      required: ['templateId', 'tenantId', 'name', 'userId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Dashboard created from template' })
  async createDashboardFromTemplate(
    @Body('templateId') templateId: string,
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('userId') userId: string,
  ) {
    const dashboard = await this.builderService.createDashboardFromTemplate(
      templateId,
      tenantId,
      name,
      userId,
    );
    if (!dashboard) return { error: 'Template not found' };
    return dashboard;
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.builderService.getDashboardStats(tenantId) };
  }

  // =================== METADATA ===================

  @Get('metadata/widget-types')
  @ApiOperation({ summary: 'Get widget types' })
  async getWidgetTypes() {
    return { types: this.builderService.getWidgetTypes() };
  }

  @Get('metadata/chart-types')
  @ApiOperation({ summary: 'Get chart types' })
  async getChartTypes() {
    return { types: this.builderService.getChartTypes() };
  }

  @Get('metadata/data-sources')
  @ApiOperation({ summary: 'Get data sources' })
  async getDataSources() {
    return { sources: this.builderService.getDataSources() };
  }

  @Get('metadata/refresh-intervals')
  @ApiOperation({ summary: 'Get refresh intervals' })
  async getRefreshIntervals() {
    return { intervals: this.builderService.getRefreshIntervals() };
  }

  @Get('metadata/visibility-options')
  @ApiOperation({ summary: 'Get visibility options' })
  async getVisibilityOptions() {
    return { options: this.builderService.getVisibilityOptions() };
  }
}
