import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TaxComplianceService, TaxCalculationRequest } from './tax-compliance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Finance - Tax Compliance')
@Controller('finance/tax')
export class TaxComplianceController {
  constructor(private readonly taxService: TaxComplianceService) {}

  // =================== TAX CALCULATION ===================

  @Post('calculate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate tax for a transaction' })
  @ApiResponse({ status: 200, description: 'Tax calculation result' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        currency: { type: 'string' },
        sellerCountry: { type: 'string' },
        buyerCountry: { type: 'string' },
        buyerTaxNumber: { type: 'string' },
        transactionType: { type: 'string', enum: ['B2B', 'B2C', 'B2G'] },
        category: { type: 'string' },
        isDigitalService: { type: 'boolean' },
      },
      required: ['amount', 'currency', 'sellerCountry', 'buyerCountry', 'transactionType'],
    },
  })
  calculateTax(@Body() request: TaxCalculationRequest) {
    return this.taxService.calculateTax(request);
  }

  // =================== TAX NUMBER VALIDATION ===================

  @Post('validate-tax-number')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a VAT/Tax number' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateTaxNumber(
    @Body('taxNumber') taxNumber: string,
    @Body('country') country?: string,
  ) {
    return this.taxService.validateTaxNumber(taxNumber, country);
  }

  // =================== COUNTRY INFORMATION ===================

  @Get('countries')
  @ApiOperation({ summary: 'Get all supported countries' })
  @ApiResponse({ status: 200, description: 'List of supported countries' })
  getSupportedCountries() {
    return { countries: this.taxService.getSupportedCountries() };
  }

  @Get('countries/eu')
  @ApiOperation({ summary: 'Get EU member states' })
  @ApiResponse({ status: 200, description: 'List of EU countries' })
  getEUCountries() {
    return { countries: this.taxService.getEUCountries() };
  }

  @Get('countries/:code')
  @ApiOperation({ summary: 'Get country tax configuration' })
  @ApiResponse({ status: 200, description: 'Country tax configuration' })
  getCountryConfig(@Param('code') code: string) {
    const config = this.taxService.getCountryConfig(code.toUpperCase());
    if (!config) {
      return { error: 'Country not found', code };
    }
    return config;
  }

  @Get('countries/:code/rates')
  @ApiOperation({ summary: 'Get tax rates for a country' })
  @ApiResponse({ status: 200, description: 'Tax rates' })
  getTaxRates(@Param('code') code: string) {
    const rates = this.taxService.getTaxRates(code.toUpperCase());
    if (!rates) {
      return { error: 'Country not found', code };
    }
    return rates;
  }

  @Get('countries/:code/is-eu')
  @ApiOperation({ summary: 'Check if country is in EU' })
  @ApiResponse({ status: 200, description: 'EU membership status' })
  isEUCountry(@Param('code') code: string) {
    return {
      country: code.toUpperCase(),
      isEU: this.taxService.isEUCountry(code.toUpperCase()),
    };
  }

  // =================== EXEMPTIONS ===================

  @Get('exemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tax exemptions' })
  @ApiResponse({ status: 200, description: 'List of exemptions' })
  getExemptions() {
    return { exemptions: this.taxService.getExemptions() };
  }

  @Post('exemptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a tax exemption' })
  @ApiResponse({ status: 201, description: 'Exemption added' })
  addExemption(
    @Body() exemption: {
      type: 'category' | 'entity' | 'transaction' | 'threshold';
      country: string;
      description: string;
      conditions: Record<string, any>;
      validFrom: string;
      validTo?: string;
    },
  ) {
    return this.taxService.addExemption({
      ...exemption,
      validFrom: new Date(exemption.validFrom),
      validTo: exemption.validTo ? new Date(exemption.validTo) : undefined,
    });
  }

  @Delete('exemptions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a tax exemption' })
  @ApiResponse({ status: 200, description: 'Exemption removed' })
  removeExemption(@Param('id') id: string) {
    const removed = this.taxService.removeExemption(id);
    return { success: removed, id };
  }

  // =================== REPORTING ===================

  @Get('report/template/:country')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tax report template' })
  @ApiResponse({ status: 200, description: 'Report template' })
  getReportTemplate(
    @Param('country') country: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.taxService.generateReportTemplate(country.toUpperCase(), {
      start: new Date(startDate),
      end: new Date(endDate),
    });
  }

  @Get('oss/threshold')
  @ApiOperation({ summary: 'Get OSS threshold information' })
  @ApiResponse({ status: 200, description: 'OSS threshold info' })
  getOSSThreshold() {
    return this.taxService.getOSSThresholdInfo();
  }

  @Get('intrastat/threshold/:country')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Intrastat thresholds for a country' })
  @ApiResponse({ status: 200, description: 'Intrastat thresholds' })
  getIntrastatThreshold(@Param('country') country: string) {
    const threshold = this.taxService.getIntrastatThreshold(country.toUpperCase());
    if (!threshold) {
      return { error: 'No Intrastat info for country', country };
    }
    return threshold;
  }

  // =================== UTILITY ===================

  @Get('check-intra-eu')
  @ApiOperation({ summary: 'Check if transaction is intra-EU' })
  @ApiResponse({ status: 200, description: 'Intra-EU status' })
  checkIntraEU(
    @Query('sellerCountry') sellerCountry: string,
    @Query('buyerCountry') buyerCountry: string,
  ) {
    return {
      sellerCountry: sellerCountry.toUpperCase(),
      buyerCountry: buyerCountry.toUpperCase(),
      isIntraEU: this.taxService.isIntraEUTransaction(
        sellerCountry.toUpperCase(),
        buyerCountry.toUpperCase(),
      ),
    };
  }
}
