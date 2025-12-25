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
  BadRequestException,
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
  RealtimeDashboardService,
  Dashboard,
  DashboardWidget,
  TimeRange,
} from './realtime-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Dashboard - Real-time Analytics')
@Controller('dashboard/realtime')
export class RealtimeDashboardController {
  constructor(private readonly dashboardService: RealtimeDashboardService) {}

  // =================== DASHBOARD CRUD ===================

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all dashboards' })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiResponse({ status: 200, description: 'List of dashboards' })
  async listDashboards(@Query('ownerId') ownerId?: string) {
    return { dashboards: await this.dashboardService.listDashboards(ownerId) };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiResponse({ status: 200, description: 'Dashboard details' })
  async getDashboard(@Param('id') id: string) {
    const dashboard = await this.dashboardService.getDashboard(id);
    if (!dashboard) {
      throw new BadRequestException('Dashboard not found');
    }
    return dashboard;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        ownerId: { type: 'string' },
        isPublic: { type: 'boolean' },
        layout: { type: 'string', enum: ['grid', 'freeform'] },
        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
        timeRange: { type: 'string' },
        autoRefresh: { type: 'boolean' },
        refreshInterval: { type: 'number' },
      },
      required: ['name', 'ownerId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createDashboard(
    @Body()
    data: {
      name: string;
      description?: string;
      ownerId: string;
      isPublic?: boolean;
      layout?: 'grid' | 'freeform';
      theme?: 'light' | 'dark' | 'system';
      timeRange?: TimeRange;
      autoRefresh?: boolean;
      refreshInterval?: number;
    },
  ) {
    return this.dashboardService.createDashboard({
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      isPublic: data.isPublic ?? false,
      isDefault: false,
      widgets: [],
      layout: data.layout || 'grid',
      gridColumns: 12,
      theme: data.theme || 'system',
      timeRange: data.timeRange || '7d',
      autoRefresh: data.autoRefresh ?? true,
      refreshInterval: (data.refreshInterval as any) || 60,
      filters: [],
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async updateDashboard(
    @Param('id') id: string,
    @Body() updates: Partial<Dashboard>,
  ) {
    const dashboard = await this.dashboardService.updateDashboard(id, updates);
    if (!dashboard) {
      throw new BadRequestException('Dashboard not found');
    }
    return dashboard;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async deleteDashboard(@Param('id') id: string) {
    const success = await this.dashboardService.deleteDashboard(id);
    return { success, id };
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate a dashboard' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { newOwnerId: { type: 'string' } },
      required: ['newOwnerId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Dashboard duplicated' })
  async duplicateDashboard(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    const dashboard = await this.dashboardService.duplicateDashboard(id, newOwnerId);
    if (!dashboard) {
      throw new BadRequestException('Dashboard not found');
    }
    return dashboard;
  }

  // =================== WIDGET MANAGEMENT ===================

  @Post(':dashboardId/widgets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a widget to dashboard' })
  @ApiResponse({ status: 201, description: 'Widget added' })
  async addWidget(
    @Param('dashboardId') dashboardId: string,
    @Body() widget: Omit<DashboardWidget, 'id'>,
  ) {
    const result = await this.dashboardService.addWidget(dashboardId, widget);
    if (!result) {
      throw new BadRequestException('Dashboard not found');
    }
    return result;
  }

  @Put(':dashboardId/widgets/:widgetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a widget' })
  @ApiResponse({ status: 200, description: 'Widget updated' })
  async updateWidget(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Body() updates: Partial<DashboardWidget>,
  ) {
    const result = await this.dashboardService.updateWidget(dashboardId, widgetId, updates);
    if (!result) {
      throw new BadRequestException('Dashboard or widget not found');
    }
    return result;
  }

  @Delete(':dashboardId/widgets/:widgetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a widget' })
  @ApiResponse({ status: 200, description: 'Widget removed' })
  async removeWidget(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
  ) {
    const success = await this.dashboardService.removeWidget(dashboardId, widgetId);
    return { success, widgetId };
  }

  @Put(':dashboardId/widgets/positions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update widget positions' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        positions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              w: { type: 'number' },
              h: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Positions updated' })
  async updateWidgetPositions(
    @Param('dashboardId') dashboardId: string,
    @Body('positions') positions: Array<{ id: string; x: number; y: number; w: number; h: number }>,
  ) {
    const success = await this.dashboardService.updateWidgetPositions(dashboardId, positions);
    return { success };
  }

  // =================== DATA FETCHING ===================

  @Get('widgets/:widgetId/data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get widget data' })
  @ApiQuery({ name: 'timeRange', required: false })
  @ApiResponse({ status: 200, description: 'Widget data' })
  async getWidgetData(
    @Param('widgetId') widgetId: string,
    @Query('timeRange') timeRange?: TimeRange,
  ) {
    return { data: await this.dashboardService.getWidgetData(widgetId, timeRange) };
  }

  @Get('metrics/realtime')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get real-time metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics' })
  async getRealtimeMetrics() {
    return this.dashboardService.getRealtimeMetrics();
  }

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get dashboard templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  getTemplates() {
    return { templates: this.dashboardService.getTemplates() };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  getTemplate(@Param('templateId') templateId: string) {
    const template = this.dashboardService.getTemplate(templateId);
    if (!template) {
      throw new BadRequestException('Template not found');
    }
    return template;
  }

  @Post('templates/:templateId/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create dashboard from template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ownerId: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['ownerId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Dashboard created from template' })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body('ownerId') ownerId: string,
    @Body('name') name?: string,
  ) {
    const dashboard = await this.dashboardService.createFromTemplate(templateId, ownerId, name);
    if (!dashboard) {
      throw new BadRequestException('Template not found');
    }
    return dashboard;
  }

  // =================== FILTERS ===================

  @Post(':dashboardId/filters')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a filter to dashboard' })
  @ApiResponse({ status: 201, description: 'Filter added' })
  async addFilter(
    @Param('dashboardId') dashboardId: string,
    @Body()
    filter: {
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
      value: any;
      label: string;
    },
  ) {
    const result = await this.dashboardService.addFilter(dashboardId, filter);
    if (!result) {
      throw new BadRequestException('Dashboard not found');
    }
    return result;
  }

  @Delete(':dashboardId/filters/:filterId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a filter' })
  @ApiResponse({ status: 200, description: 'Filter removed' })
  async removeFilter(
    @Param('dashboardId') dashboardId: string,
    @Param('filterId') filterId: string,
  ) {
    const success = await this.dashboardService.removeFilter(dashboardId, filterId);
    return { success, filterId };
  }

  // =================== REALTIME SUBSCRIPTIONS ===================

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to real-time updates' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { connectionId: { type: 'string' } },
      required: ['connectionId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Subscribed' })
  subscribeToUpdates(@Body('connectionId') connectionId: string) {
    this.dashboardService.subscribeToRealtimeUpdates(connectionId);
    return { success: true, connectionId };
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from real-time updates' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { connectionId: { type: 'string' } },
      required: ['connectionId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  unsubscribeFromUpdates(@Body('connectionId') connectionId: string) {
    this.dashboardService.unsubscribeFromRealtimeUpdates(connectionId);
    return { success: true, connectionId };
  }

  @Get('connections/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active connections count' })
  @ApiResponse({ status: 200, description: 'Active connections' })
  getActiveConnections() {
    return { activeConnections: this.dashboardService.getActiveConnections() };
  }

  // =================== EXPORT / IMPORT ===================

  @Get(':id/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export dashboard' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'pdf'] })
  @ApiResponse({ status: 200, description: 'Exported dashboard' })
  async exportDashboard(
    @Param('id') id: string,
    @Query('format') format: 'json' | 'pdf' = 'json',
  ) {
    try {
      return await this.dashboardService.exportDashboard(id, format);
    } catch (error) {
      throw new BadRequestException('Export failed');
    }
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import dashboard from JSON' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jsonData: { type: 'string' },
        ownerId: { type: 'string' },
      },
      required: ['jsonData', 'ownerId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Dashboard imported' })
  async importDashboard(
    @Body('jsonData') jsonData: string,
    @Body('ownerId') ownerId: string,
  ) {
    try {
      return await this.dashboardService.importDashboard(jsonData, ownerId);
    } catch (error) {
      throw new BadRequestException('Import failed: Invalid JSON');
    }
  }
}
