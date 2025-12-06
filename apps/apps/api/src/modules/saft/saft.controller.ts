import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SaftService } from './saft.service';
import { SaftExportDto, SaftValidationResultDto } from './dto/saft-export.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('SAF-T D406')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/saft')
export class SaftController {
  constructor(private readonly saftService: SaftService) {}

  @Post('export')
  @ApiOperation({
    summary: 'Generate SAF-T D406 XML export',
    description: 'Generates Romanian SAF-T D406 compliant XML file for ANAF submission',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiProduces('application/xml')
  @ApiResponse({
    status: 200,
    description: 'SAF-T XML file generated successfully',
    content: {
      'application/xml': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date range or missing data' })
  @ApiResponse({ status: 403, description: 'No access to company' })
  async exportSaftXml(
    @Param('companyId') companyId: string,
    @Body() dto: SaftExportDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const xml = await this.saftService.generateSaftXml(companyId, dto, user.id);

    const filename = `SAFT_D406_${new Date().toISOString().split('T')[0]}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate SAF-T data before export',
    description: 'Checks data completeness and compliance before generating export',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: SaftValidationResultDto,
  })
  @ApiResponse({ status: 403, description: 'No access to company' })
  async validateSaftData(
    @Param('companyId') companyId: string,
    @Body() dto: SaftExportDto,
    @CurrentUser() user: any,
  ): Promise<SaftValidationResultDto> {
    return this.saftService.validateSaftData(companyId, dto, user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get SAF-T export history',
    description: 'Returns list of previous SAF-T exports for the company',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Export history' })
  async getExportHistory(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.saftService.getExportHistory(companyId, user.id);
  }

  @Get('preview')
  @ApiOperation({
    summary: 'Preview SAF-T export data',
    description: 'Returns summary of data that will be included in the export',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Export preview data' })
  async previewExport(
    @Param('companyId') companyId: string,
    @Body() dto: SaftExportDto,
    @CurrentUser() user: any,
  ) {
    const validation = await this.saftService.validateSaftData(companyId, dto, user.id);
    return {
      ...validation,
      period: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      canExport: validation.isValid,
    };
  }
}
