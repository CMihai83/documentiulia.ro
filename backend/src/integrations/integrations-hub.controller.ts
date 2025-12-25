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
  IntegrationsHubService,
  IntegrationCategory,
  FieldMapping,
  DataTransformation,
} from './integrations-hub.service';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationsHubController {
  constructor(private readonly integrationsService: IntegrationsHubService) {}

  // =================== CATALOG ===================

  @Get('catalog')
  @ApiOperation({ summary: 'Get integration catalog' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Integration catalog' })
  async getCatalog(
    @Query('category') category?: IntegrationCategory,
    @Query('status') status?: 'available' | 'coming_soon' | 'beta' | 'deprecated',
    @Query('search') search?: string,
  ) {
    const integrations = await this.integrationsService.getIntegrations({
      category,
      status,
      search,
    });
    return { integrations, total: integrations.length };
  }

  @Get('catalog/categories')
  @ApiOperation({ summary: 'Get integration categories' })
  @ApiResponse({ status: 200, description: 'Categories with counts' })
  async getCategories() {
    const categories = await this.integrationsService.getCategories();
    return { categories };
  }

  @Get('catalog/:id')
  @ApiOperation({ summary: 'Get integration details' })
  @ApiResponse({ status: 200, description: 'Integration details' })
  async getIntegration(@Param('id') id: string) {
    const integration = await this.integrationsService.getIntegration(id);
    if (!integration) {
      return { error: 'Integration not found' };
    }
    return integration;
  }

  @Get('catalog/slug/:slug')
  @ApiOperation({ summary: 'Get integration by slug' })
  @ApiResponse({ status: 200, description: 'Integration details' })
  async getIntegrationBySlug(@Param('slug') slug: string) {
    const integration = await this.integrationsService.getIntegrationBySlug(slug);
    if (!integration) {
      return { error: 'Integration not found' };
    }
    return integration;
  }

  // =================== CONNECTIONS ===================

  @Post('connections')
  @ApiOperation({ summary: 'Create integration connection' })
  @ApiResponse({ status: 201, description: 'Connection created' })
  async createConnection(
    @Request() req: any,
    @Body() body: {
      integrationId: string;
      credentials: Record<string, any>;
      settings?: Record<string, any>;
    },
  ) {
    return this.integrationsService.createConnection({
      tenantId: req.user.tenantId,
      connectedBy: req.user.id,
      ...body,
    });
  }

  @Get('connections')
  @ApiOperation({ summary: 'Get my connections' })
  @ApiResponse({ status: 200, description: 'Integration connections' })
  async getConnections(@Request() req: any) {
    const connections = await this.integrationsService.getConnections(req.user.tenantId);
    return { connections, total: connections.length };
  }

  @Get('connections/:id')
  @ApiOperation({ summary: 'Get connection details' })
  @ApiResponse({ status: 200, description: 'Connection details' })
  async getConnection(@Param('id') id: string) {
    const connection = await this.integrationsService.getConnection(id);
    if (!connection) {
      return { error: 'Connection not found' };
    }
    // Mask credentials
    return {
      ...connection,
      credentials: Object.keys(connection.credentials).reduce((acc, key) => {
        acc[key] = '***';
        return acc;
      }, {} as Record<string, string>),
    };
  }

  @Put('connections/:id')
  @ApiOperation({ summary: 'Update connection' })
  @ApiResponse({ status: 200, description: 'Connection updated' })
  async updateConnection(
    @Param('id') id: string,
    @Body() body: {
      credentials?: Record<string, any>;
      settings?: Record<string, any>;
      enabledActions?: string[];
      enabledTriggers?: string[];
    },
  ) {
    return this.integrationsService.updateConnection(id, body);
  }

  @Post('connections/:id/disconnect')
  @ApiOperation({ summary: 'Disconnect integration' })
  @ApiResponse({ status: 200, description: 'Integration disconnected' })
  async disconnectIntegration(@Param('id') id: string) {
    await this.integrationsService.disconnectIntegration(id);
    return { success: true };
  }

  @Delete('connections/:id')
  @ApiOperation({ summary: 'Delete connection' })
  @ApiResponse({ status: 200, description: 'Connection deleted' })
  async deleteConnection(@Param('id') id: string) {
    await this.integrationsService.deleteConnection(id);
    return { success: true };
  }

  @Post('connections/:id/test')
  @ApiOperation({ summary: 'Test connection' })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testConnection(@Param('id') id: string) {
    const success = await this.integrationsService.testConnection(id);
    return { success, message: success ? 'Connection successful' : 'Connection failed' };
  }

  // =================== SYNC ===================

  @Post('connections/:id/sync')
  @ApiOperation({ summary: 'Trigger sync' })
  @ApiResponse({ status: 200, description: 'Sync initiated' })
  async triggerSync(
    @Param('id') id: string,
    @Body() body: {
      direction?: 'inbound' | 'outbound' | 'bidirectional';
    },
  ) {
    return this.integrationsService.triggerSync({
      connectionId: id,
      type: 'manual',
      direction: body.direction,
    });
  }

  @Get('connections/:id/sync-logs')
  @ApiOperation({ summary: 'Get sync logs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Sync logs' })
  async getSyncLogs(
    @Param('id') id: string,
    @Query('status') status?: 'running' | 'success' | 'partial' | 'failed',
    @Query('limit') limit?: string,
  ) {
    const logs = await this.integrationsService.getSyncLogs({
      connectionId: id,
      status,
      limit: limit ? parseInt(limit) : 20,
    });
    return { logs, total: logs.length };
  }

  // =================== DATA FLOWS ===================

  @Post('connections/:id/flows')
  @ApiOperation({ summary: 'Create data flow' })
  @ApiResponse({ status: 201, description: 'Data flow created' })
  async createDataFlow(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      name: string;
      description?: string;
      sourceEntity: string;
      targetEntity: string;
      mappings: FieldMapping[];
      transformations?: DataTransformation[];
      schedule?: string;
    },
  ) {
    return this.integrationsService.createDataFlow({
      connectionId: id,
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('connections/:id/flows')
  @ApiOperation({ summary: 'Get data flows' })
  @ApiResponse({ status: 200, description: 'Data flows' })
  async getDataFlows(@Param('id') id: string) {
    const flows = await this.integrationsService.getDataFlows(id);
    return { flows, total: flows.length };
  }

  @Put('flows/:id')
  @ApiOperation({ summary: 'Update data flow' })
  @ApiResponse({ status: 200, description: 'Data flow updated' })
  async updateDataFlow(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      mappings?: FieldMapping[];
      transformations?: DataTransformation[];
      schedule?: string;
      isActive?: boolean;
    },
  ) {
    const flow = await this.integrationsService.updateDataFlow(id, body);
    if (!flow) {
      return { error: 'Data flow not found' };
    }
    return flow;
  }

  @Delete('flows/:id')
  @ApiOperation({ summary: 'Delete data flow' })
  @ApiResponse({ status: 200, description: 'Data flow deleted' })
  async deleteDataFlow(@Param('id') id: string) {
    await this.integrationsService.deleteDataFlow(id);
    return { success: true };
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get integration statistics' })
  @ApiResponse({ status: 200, description: 'Integration stats' })
  async getStats(@Request() req: any) {
    return this.integrationsService.getStats(req.user.tenantId);
  }
}
