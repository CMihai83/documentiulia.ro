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
  AutomationTemplatesService,
  TemplateCategory,
  TemplateComplexity,
  TemplateVariable,
  TemplateStep,
} from './automation-templates.service';

@ApiTags('Automation - Templates')
@Controller('automation/templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationTemplatesController {
  constructor(private readonly templateService: AutomationTemplatesService) {}

  // =================== TEMPLATES ===================

  @Get()
  @ApiOperation({ summary: 'Get automation templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'complexity', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeSystem', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('category') category?: TemplateCategory,
    @Query('complexity') complexity?: TemplateComplexity,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('includeSystem') includeSystem?: string,
  ) {
    const templates = await this.templateService.getTemplates(req.user.tenantId, {
      category,
      complexity,
      tag,
      search,
      includeSystem: includeSystem !== 'false',
    });
    return { templates, total: templates.length };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get template categories' })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories() {
    const categories = await this.templateService.getCategories();
    return { categories };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get template stats' })
  @ApiResponse({ status: 200, description: 'Template statistics' })
  async getStats(@Request() req: any) {
    return this.templateService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.templateService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post()
  @ApiOperation({ summary: 'Create custom template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description: string;
      category: TemplateCategory;
      complexity?: TemplateComplexity;
      tags?: string[];
      icon?: string;
      variables: TemplateVariable[];
      steps: TemplateStep[];
      estimatedTime?: string;
      isPublic?: boolean;
    },
  ) {
    return this.templateService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      category: TemplateCategory;
      complexity: TemplateComplexity;
      tags: string[];
      icon: string;
      variables: TemplateVariable[];
      steps: TemplateStep[];
      estimatedTime: string;
      isPublic: boolean;
    }>,
  ) {
    const template = await this.templateService.updateTemplate(id, body);
    if (!template) {
      return { error: 'Template not found or is a system template' };
    }
    return template;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return { success: true };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate template' })
  @ApiResponse({ status: 201, description: 'Template duplicated' })
  async duplicateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const template = await this.templateService.duplicateTemplate(
      id,
      body.name,
      req.user.tenantId,
      req.user.id,
    );
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview template with variables' })
  @ApiResponse({ status: 200, description: 'Template preview' })
  async previewTemplate(
    @Param('id') id: string,
    @Body() body: { variables: Record<string, any> },
  ) {
    try {
      return await this.templateService.previewTemplate(id, body.variables);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Rate template' })
  @ApiResponse({ status: 200, description: 'Template rated' })
  async rateTemplate(
    @Param('id') id: string,
    @Body() body: { rating: number },
  ) {
    if (body.rating < 1 || body.rating > 5) {
      return { error: 'Rating must be between 1 and 5' };
    }
    const template = await this.templateService.rateTemplate(id, body.rating);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== INSTANCES ===================

  @Post('instances')
  @ApiOperation({ summary: 'Create template instance' })
  @ApiResponse({ status: 201, description: 'Instance created' })
  async createInstance(
    @Request() req: any,
    @Body() body: {
      templateId: string;
      name: string;
      description?: string;
      variables: Record<string, any>;
    },
  ) {
    try {
      return await this.templateService.createInstance({
        templateId: body.templateId,
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        name: body.name,
        description: body.description,
        variables: body.variables,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('instances')
  @ApiOperation({ summary: 'Get template instances' })
  @ApiQuery({ name: 'templateId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Instances list' })
  async getInstances(
    @Request() req: any,
    @Query('templateId') templateId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const instances = await this.templateService.getInstances(req.user.tenantId, {
      templateId,
      status: status as any,
      search,
    });
    return { instances, total: instances.length };
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get instance details' })
  @ApiResponse({ status: 200, description: 'Instance details' })
  async getInstance(@Param('id') id: string) {
    const instance = await this.templateService.getInstance(id);
    if (!instance) {
      return { error: 'Instance not found' };
    }
    return instance;
  }

  @Put('instances/:id')
  @ApiOperation({ summary: 'Update instance' })
  @ApiResponse({ status: 200, description: 'Instance updated' })
  async updateInstance(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      variables: Record<string, any>;
    }>,
  ) {
    const instance = await this.templateService.updateInstance(id, body);
    if (!instance) {
      return { error: 'Instance not found' };
    }
    return instance;
  }

  @Delete('instances/:id')
  @ApiOperation({ summary: 'Delete instance' })
  @ApiResponse({ status: 200, description: 'Instance deleted' })
  async deleteInstance(@Param('id') id: string) {
    await this.templateService.deleteInstance(id);
    return { success: true };
  }

  @Post('instances/:id/activate')
  @ApiOperation({ summary: 'Activate instance' })
  @ApiResponse({ status: 200, description: 'Instance activated' })
  async activateInstance(@Param('id') id: string) {
    const instance = await this.templateService.activateInstance(id);
    if (!instance) {
      return { error: 'Instance not found' };
    }
    return instance;
  }

  @Post('instances/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate instance' })
  @ApiResponse({ status: 200, description: 'Instance deactivated' })
  async deactivateInstance(@Param('id') id: string) {
    const instance = await this.templateService.deactivateInstance(id);
    if (!instance) {
      return { error: 'Instance not found' };
    }
    return instance;
  }
}
