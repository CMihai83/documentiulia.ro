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
  DataVisualizationService,
  ChartCategory,
  DatasetSource,
  DatasetSchema,
  RefreshConfig,
  VisualizationConfig,
  VisualizationStyling,
  InteractionConfig,
  Annotation,
  FilterConfig,
} from './data-visualization.service';

@ApiTags('Business Intelligence - Visualizations')
@Controller('bi/visualizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataVisualizationController {
  constructor(private readonly vizService: DataVisualizationService) {}

  // =================== CHART TYPES ===================

  @Get('chart-types')
  @ApiOperation({ summary: 'Get available chart types' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Chart types list' })
  async getChartTypes(@Query('category') category?: ChartCategory) {
    const chartTypes = await this.vizService.getChartTypes(category);
    return { chartTypes, total: chartTypes.length };
  }

  @Get('chart-types/:id')
  @ApiOperation({ summary: 'Get chart type details' })
  @ApiResponse({ status: 200, description: 'Chart type details' })
  async getChartType(@Param('id') id: string) {
    const chartType = await this.vizService.getChartType(id);
    if (!chartType) {
      return { error: 'Chart type not found' };
    }
    return chartType;
  }

  @Post('recommend-chart')
  @ApiOperation({ summary: 'Get chart recommendations' })
  @ApiResponse({ status: 200, description: 'Recommended charts' })
  async recommendChart(
    @Body() body: {
      dimensionCount: number;
      measureCount: number;
      dataTypes: string[];
      preferredCategory?: ChartCategory;
    },
  ) {
    const recommendations = await this.vizService.recommendChartType(body);
    return { recommendations, total: recommendations.length };
  }

  // =================== DATASETS ===================

  @Post('datasets')
  @ApiOperation({ summary: 'Create dataset' })
  @ApiResponse({ status: 201, description: 'Dataset created' })
  async createDataset(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      source: DatasetSource;
      schema: DatasetSchema;
      refreshConfig?: RefreshConfig;
    },
  ) {
    return this.vizService.createDataset({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('datasets')
  @ApiOperation({ summary: 'Get datasets' })
  @ApiResponse({ status: 200, description: 'Datasets list' })
  async getDatasets(@Request() req: any) {
    const datasets = await this.vizService.getDatasets(req.user.tenantId);
    return { datasets, total: datasets.length };
  }

  @Get('datasets/:id')
  @ApiOperation({ summary: 'Get dataset details' })
  @ApiResponse({ status: 200, description: 'Dataset details' })
  async getDataset(@Param('id') id: string) {
    const dataset = await this.vizService.getDataset(id);
    if (!dataset) {
      return { error: 'Dataset not found' };
    }
    return dataset;
  }

  @Put('datasets/:id')
  @ApiOperation({ summary: 'Update dataset' })
  @ApiResponse({ status: 200, description: 'Dataset updated' })
  async updateDataset(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      source: DatasetSource;
      schema: DatasetSchema;
      refreshConfig: RefreshConfig;
    }>,
  ) {
    const dataset = await this.vizService.updateDataset(id, body);
    if (!dataset) {
      return { error: 'Dataset not found' };
    }
    return dataset;
  }

  @Delete('datasets/:id')
  @ApiOperation({ summary: 'Delete dataset' })
  @ApiResponse({ status: 200, description: 'Dataset deleted' })
  async deleteDataset(@Param('id') id: string) {
    await this.vizService.deleteDataset(id);
    return { success: true };
  }

  @Post('datasets/:id/refresh')
  @ApiOperation({ summary: 'Refresh dataset' })
  @ApiResponse({ status: 200, description: 'Dataset refreshed' })
  async refreshDataset(@Param('id') id: string) {
    const dataset = await this.vizService.refreshDataset(id);
    if (!dataset) {
      return { error: 'Dataset not found' };
    }
    return dataset;
  }

  // =================== VISUALIZATIONS ===================

  @Post()
  @ApiOperation({ summary: 'Create visualization' })
  @ApiResponse({ status: 201, description: 'Visualization created' })
  async createVisualization(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      chartType: string;
      datasetId: string;
      config: VisualizationConfig;
      styling?: Partial<VisualizationStyling>;
      interactions?: Partial<InteractionConfig>;
    },
  ) {
    return this.vizService.createVisualization({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get visualizations' })
  @ApiQuery({ name: 'chartType', required: false })
  @ApiQuery({ name: 'datasetId', required: false })
  @ApiResponse({ status: 200, description: 'Visualizations list' })
  async getVisualizations(
    @Request() req: any,
    @Query('chartType') chartType?: string,
    @Query('datasetId') datasetId?: string,
  ) {
    const visualizations = await this.vizService.getVisualizations(req.user.tenantId, {
      chartType,
      datasetId,
    });
    return { visualizations, total: visualizations.length };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get visualization stats' })
  @ApiResponse({ status: 200, description: 'Visualization statistics' })
  async getStats(@Request() req: any) {
    return this.vizService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get visualization details' })
  @ApiResponse({ status: 200, description: 'Visualization details' })
  async getVisualization(@Param('id') id: string) {
    const visualization = await this.vizService.getVisualization(id);
    if (!visualization) {
      return { error: 'Visualization not found' };
    }
    return visualization;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update visualization' })
  @ApiResponse({ status: 200, description: 'Visualization updated' })
  async updateVisualization(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      chartType: string;
      config: VisualizationConfig;
      styling: VisualizationStyling;
      interactions: InteractionConfig;
      annotations: Annotation[];
    }>,
  ) {
    const visualization = await this.vizService.updateVisualization(id, body);
    if (!visualization) {
      return { error: 'Visualization not found' };
    }
    return visualization;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete visualization' })
  @ApiResponse({ status: 200, description: 'Visualization deleted' })
  async deleteVisualization(@Param('id') id: string) {
    await this.vizService.deleteVisualization(id);
    return { success: true };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate visualization' })
  @ApiResponse({ status: 201, description: 'Visualization duplicated' })
  async duplicateVisualization(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const visualization = await this.vizService.duplicateVisualization(id, body.name, req.user.id);
    if (!visualization) {
      return { error: 'Visualization not found' };
    }
    return visualization;
  }

  // =================== RENDERING ===================

  @Post(':id/render')
  @ApiOperation({ summary: 'Render visualization' })
  @ApiResponse({ status: 200, description: 'Rendered visualization data' })
  async renderVisualization(
    @Param('id') id: string,
    @Body() body?: { filters?: FilterConfig[] },
  ) {
    const output = await this.vizService.renderVisualization(id, body?.filters);
    if (!output) {
      return { error: 'Visualization not found' };
    }
    return output;
  }

  // =================== PUBLIC SHARING ===================

  @Post(':id/public-link')
  @ApiOperation({ summary: 'Generate public link' })
  @ApiResponse({ status: 200, description: 'Public link generated' })
  async generatePublicLink(@Param('id') id: string) {
    const link = await this.vizService.generatePublicLink(id);
    if (!link) {
      return { error: 'Visualization not found' };
    }
    return { link };
  }

  @Delete(':id/public-link')
  @ApiOperation({ summary: 'Revoke public link' })
  @ApiResponse({ status: 200, description: 'Public link revoked' })
  async revokePublicLink(@Param('id') id: string) {
    await this.vizService.revokePublicLink(id);
    return { success: true };
  }
}
