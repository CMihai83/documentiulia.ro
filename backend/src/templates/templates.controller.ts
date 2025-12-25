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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  DocumentTemplateService,
  TemplateType,
  OutputFormat,
  TemplateStatus,
} from './document-template.service';

@ApiTags('Document Templates')
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly templateService: DocumentTemplateService) {}

  // =================== TEMPLATE CRUD ===================

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  getTemplates(
    @Request() req: any,
    @Query('type') type?: TemplateType,
    @Query('status') status?: TemplateStatus,
  ) {
    return this.templateService.getAllTemplates({
      tenantId: req.user.organizationId || req.user.sub,
      type,
      status,
    });
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system templates' })
  @ApiResponse({ status: 200, description: 'List of system templates' })
  getSystemTemplates() {
    return this.templateService.getAllTemplates({ isSystem: true });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  getTemplate(@Param('id') id: string) {
    try {
      return this.templateService.getTemplate(id);
    } catch {
      return { error: 'Template not found' };
    }
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      nameRo: string;
      description: string;
      descriptionRo: string;
      type: TemplateType;
      content: {
        header?: string;
        body: string;
        footer?: string;
        language: 'RO' | 'EN' | 'BILINGUAL';
      };
      variables: Array<{
        name: string;
        label: string;
        labelRo: string;
        type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'LIST' | 'OBJECT';
        required: boolean;
        defaultValue?: any;
      }>;
      sections: Array<{
        id: string;
        name: string;
        nameRo: string;
        type: 'STATIC' | 'CONDITIONAL' | 'REPEATABLE' | 'OPTIONAL';
        content: string;
        order: number;
        isVisible: boolean;
      }>;
      outputFormats: OutputFormat[];
      styling: {
        fontFamily: string;
        fontSize: number;
        primaryColor: string;
        secondaryColor: string;
      };
    },
  ) {
    return this.templateService.createTemplate({
      ...body,
      createdBy: req.user.sub,
      tenantId: req.user.organizationId || req.user.sub,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updates: {
      name?: string;
      nameRo?: string;
      description?: string;
      descriptionRo?: string;
      content?: {
        header?: string;
        body: string;
        footer?: string;
        language?: 'RO' | 'EN' | 'BILINGUAL';
      };
      variables?: Array<{
        name: string;
        label: string;
        labelRo: string;
        type: string;
        required: boolean;
        defaultValue?: any;
      }>;
      styling?: Record<string, any>;
      status?: TemplateStatus;
    },
  ) {
    return this.templateService.updateTemplate(id, updates as any, req.user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return { success: true };
  }

  // =================== TEMPLATE OPERATIONS ===================

  @Post(':id/publish')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish a template' })
  @ApiResponse({ status: 200, description: 'Template published' })
  publishTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { changelog?: string },
  ) {
    return this.templateService.publishTemplate(id, body.changelog || 'Published', req.user.sub);
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Archive a template' })
  @ApiResponse({ status: 200, description: 'Template archived' })
  archiveTemplate(@Request() req: any, @Param('id') id: string) {
    return this.templateService.updateTemplate(id, { status: 'ARCHIVED' }, req.user.sub);
  }

  @Post(':id/versions/:version/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore template to specific version' })
  @ApiResponse({ status: 200, description: 'Template restored' })
  restoreVersion(
    @Request() req: any,
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.templateService.restoreVersion(id, parseInt(version), req.user.sub);
  }

  // =================== CONFIGURATION ===================

  @Get('config/types')
  @ApiOperation({ summary: 'Get template types' })
  @ApiResponse({ status: 200, description: 'List of template types' })
  getTypes() {
    return [
      { value: 'INVOICE', label: 'Invoice', labelRo: 'Factură' },
      { value: 'CONTRACT', label: 'Contract', labelRo: 'Contract' },
      { value: 'REPORT', label: 'Report', labelRo: 'Raport' },
      { value: 'LETTER', label: 'Letter', labelRo: 'Scrisoare' },
      { value: 'RECEIPT', label: 'Receipt', labelRo: 'Chitanță' },
      { value: 'QUOTE', label: 'Quote', labelRo: 'Ofertă' },
      { value: 'ORDER', label: 'Order', labelRo: 'Comandă' },
      { value: 'CERTIFICATE', label: 'Certificate', labelRo: 'Certificat' },
      { value: 'CUSTOM', label: 'Custom', labelRo: 'Personalizat' },
    ];
  }

  @Get('config/formats')
  @ApiOperation({ summary: 'Get output formats' })
  @ApiResponse({ status: 200, description: 'List of output formats' })
  getFormats() {
    return [
      { value: 'PDF', label: 'PDF', description: 'Portable Document Format' },
      { value: 'DOCX', label: 'Word', description: 'Microsoft Word Document' },
      { value: 'HTML', label: 'HTML', description: 'Web Page' },
      { value: 'TXT', label: 'Text', description: 'Plain Text' },
      { value: 'XML', label: 'XML', description: 'XML Format' },
    ];
  }

  @Get('config/statuses')
  @ApiOperation({ summary: 'Get template statuses' })
  @ApiResponse({ status: 200, description: 'List of statuses' })
  getStatuses() {
    return [
      { value: 'DRAFT', label: 'Draft', labelRo: 'Ciornă' },
      { value: 'ACTIVE', label: 'Active', labelRo: 'Activ' },
      { value: 'ARCHIVED', label: 'Archived', labelRo: 'Arhivat' },
      { value: 'DEPRECATED', label: 'Deprecated', labelRo: 'Depreciat' },
    ];
  }

  @Get('config/variable-types')
  @ApiOperation({ summary: 'Get variable types' })
  @ApiResponse({ status: 200, description: 'List of variable types' })
  getVariableTypes() {
    return [
      { value: 'STRING', label: 'Text', labelRo: 'Text' },
      { value: 'NUMBER', label: 'Number', labelRo: 'Număr' },
      { value: 'DATE', label: 'Date', labelRo: 'Dată' },
      { value: 'CURRENCY', label: 'Currency', labelRo: 'Monedă' },
      { value: 'BOOLEAN', label: 'Yes/No', labelRo: 'Da/Nu' },
      { value: 'IMAGE', label: 'Image', labelRo: 'Imagine' },
      { value: 'LIST', label: 'List', labelRo: 'Listă' },
      { value: 'OBJECT', label: 'Object', labelRo: 'Obiect' },
    ];
  }
}
