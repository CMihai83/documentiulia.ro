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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TaxCodesService } from './tax-codes.service';
import { CreateTaxCodeDto, UpdateTaxCodeDto, TaxCodeFilterDto } from './dto/tax-code.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';

@ApiTags('Tax Codes')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/tax-codes')
export class TaxCodesController {
  constructor(private readonly taxCodesService: TaxCodesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tax code' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Tax code created' })
  @ApiResponse({ status: 409, description: 'Tax code already exists' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateTaxCodeDto,
  ) {
    return this.taxCodesService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tax codes for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Tax codes returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query() filters: TaxCodeFilterDto,
  ) {
    return this.taxCodesService.findAll(companyId, filters);
  }

  @Get('vat-summary')
  @ApiOperation({ summary: 'Get VAT rates summary' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'VAT summary returned' })
  async getVatSummary(@Param('companyId') companyId: string) {
    return this.taxCodesService.getVatSummary(companyId);
  }

  @Get('fiscal-compliance')
  @ApiOperation({ summary: 'Get 2026 fiscal compliance status' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Fiscal compliance status returned' })
  async getFiscalCompliance() {
    return this.taxCodesService.getFiscalComplianceStatus();
  }

  @Get('applicable-rate')
  @ApiOperation({ summary: 'Get applicable VAT rate for a transaction date' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Applicable rate returned' })
  async getApplicableRate(
    @Param('companyId') companyId: string,
    @Query('date') dateStr: string,
    @Query('type') rateType: 'standard' | 'reduced' | 'super-reduced' | 'zero' | 'exempt' = 'standard',
  ) {
    const transactionDate = dateStr ? new Date(dateStr) : new Date();
    const taxCode = await this.taxCodesService.getApplicableTaxCode(companyId, transactionDate, rateType);
    const rate = this.taxCodesService.getApplicableVatRate(transactionDate, rateType as 'standard' | 'reduced' | 'super-reduced');
    return {
      transactionDate,
      rateType,
      applicableRate: rate,
      taxCode,
      regime: transactionDate >= new Date('2025-08-01') ? '2026' : '2024',
    };
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize default Romanian tax codes' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Default tax codes initialized' })
  async initializeDefaults(@Param('companyId') companyId: string) {
    return this.taxCodesService.initializeDefaults(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tax code by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Tax code ID' })
  @ApiResponse({ status: 200, description: 'Tax code returned' })
  @ApiResponse({ status: 404, description: 'Tax code not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.taxCodesService.findOne(companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tax code' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Tax code ID' })
  @ApiResponse({ status: 200, description: 'Tax code updated' })
  @ApiResponse({ status: 404, description: 'Tax code not found' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxCodeDto,
  ) {
    return this.taxCodesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tax code' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Tax code ID' })
  @ApiResponse({ status: 200, description: 'Tax code deleted' })
  @ApiResponse({ status: 404, description: 'Tax code not found' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.taxCodesService.delete(companyId, id);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set tax code as default for its type' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Tax code ID' })
  @ApiResponse({ status: 200, description: 'Tax code set as default' })
  async setDefault(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.taxCodesService.setDefault(companyId, id);
  }
}
