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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { TemplateService } from './template.service';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/ocr.dto';
import { DocumentType } from '@prisma/client';

@ApiTags('templates')
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List all OCR templates' })
  @ApiQuery({ name: 'documentType', enum: DocumentType, required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  async findAll(
    @Query('documentType') documentType?: DocumentType,
    @Query('language') language?: string,
  ) {
    return this.templateService.findAll({ documentType, language });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific template' })
  @ApiResponse({ status: 200, description: 'Template retrieved' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create a new OCR template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  async create(@Body() dto: CreateTemplateDto, @Request() req: any) {
    return this.templateService.create(dto, req.user.id);
  }

  @Put(':id')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Update an OCR template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Cannot modify system templates' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an OCR template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete system templates' })
  async remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }

  @Post(':id/train')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Analyze corrections to improve template' })
  @ApiResponse({ status: 200, description: 'Training analysis complete' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async train(
    @Param('id') id: string,
    @Body() body: { applyChanges?: boolean } = {},
  ) {
    return this.templateService.trainFromCorrections(id, body.applyChanges);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Find best matching template for document text' })
  @ApiResponse({ status: 200, description: 'Best match found or null' })
  async autoMatch(@Body() body: { rawText: string }) {
    const templateId = await this.templateService.autoMatch(body.rawText);
    return { templateId };
  }

  @Post('seed-system')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Seed system templates (RO/DE invoices, receipts)' })
  @ApiResponse({ status: 200, description: 'System templates seeded' })
  async seedSystem() {
    await this.templateService.seedSystemTemplates();
    return { message: 'System templates seeded successfully' };
  }
}
