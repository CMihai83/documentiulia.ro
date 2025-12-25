import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ContractAnalysisService,
  ContractType,
  ContractStatus,
} from './contract-analysis.service';

// =================== DTOs ===================

class AnalyzeContractDto {
  text: string;
  language?: 'RO' | 'EN';
  expectedType?: ContractType;
}

class UpdateContractStatusDto {
  status: ContractStatus;
}

class CreateTemplateDto {
  name: string;
  type: ContractType;
  language: 'RO' | 'EN';
  content: string;
  variables: Array<{
    name: string;
    description: string;
    type: 'TEXT' | 'DATE' | 'NUMBER' | 'CURRENCY' | 'PARTY';
    required: boolean;
    defaultValue?: string;
  }>;
  isActive?: boolean;
}

class GenerateFromTemplateDto {
  templateId: string;
  variables: Record<string, string>;
}

class CompareContractsDto {
  contractId1: string;
  contractId2: string;
}

@Controller('contract-analysis')
@UseGuards(JwtAuthGuard)
export class ContractAnalysisController {
  constructor(
    private readonly contractAnalysisService: ContractAnalysisService,
  ) {}

  // =================== CONTRACT ANALYSIS ===================

  @Post('analyze')
  async analyzeContract(@Request() req: any, @Body() dto: AnalyzeContractDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.analyzeContract(tenantId, dto.text, {
      language: dto.language,
      expectedType: dto.expectedType,
    });
  }

  // =================== CONTRACT CRUD ===================

  @Get('contracts')
  async getContracts(
    @Request() req: any,
    @Query('type') type?: ContractType,
    @Query('status') status?: ContractStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.getContracts(tenantId, {
      type,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('contracts/:id')
  async getContract(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.getContract(tenantId, id);
  }

  @Put('contracts/:id/status')
  async updateContractStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateContractStatusDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.updateContractStatus(tenantId, id, dto.status);
  }

  @Delete('contracts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContract(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    await this.contractAnalysisService.deleteContract(tenantId, id);
  }

  // =================== TEMPLATES ===================

  @Get('templates')
  async getTemplates(
    @Request() req: any,
    @Query('type') type?: ContractType,
    @Query('language') language?: 'RO' | 'EN',
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.getTemplates(tenantId, { type, language });
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.contractAnalysisService.getTemplate(id);
  }

  @Post('templates')
  async createTemplate(@Request() req: any, @Body() dto: CreateTemplateDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.createTemplate(tenantId, {
      ...dto,
      isActive: dto.isActive ?? true,
    });
  }

  @Post('generate')
  async generateFromTemplate(@Request() req: any, @Body() dto: GenerateFromTemplateDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const content = await this.contractAnalysisService.generateContractFromTemplate(
      tenantId,
      dto.templateId,
      dto.variables,
    );
    return { content };
  }

  // =================== COMPARISON ===================

  @Post('compare')
  async compareContracts(@Request() req: any, @Body() dto: CompareContractsDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.compareContracts(
      tenantId,
      dto.contractId1,
      dto.contractId2,
    );
  }

  // =================== ANALYTICS ===================

  @Get('stats')
  async getStats(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.contractAnalysisService.getContractStats(tenantId);
  }
}
