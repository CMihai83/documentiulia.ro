import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { DynamicVATService, VATCategory, VATRateType } from './dynamic-vat.service';

@ApiTags('VAT Dynamic')
@Controller('vat/dynamic')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DynamicVATController {
  constructor(private readonly vatService: DynamicVATService) {}

  // =================== VAT CALCULATION ===================

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate VAT for a transaction' })
  @ApiResponse({ status: 200, description: 'VAT calculation result' })
  calculateVAT(
    @Body() body: {
      netAmount: number;
      country: string;
      category: VATCategory;
      transactionDate?: string;
      isB2B?: boolean;
      buyerCountry?: string;
      buyerVATNumber?: string;
    },
  ) {
    return this.vatService.calculateVAT(body.netAmount, body.country, body.category, {
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : undefined,
      isB2B: body.isB2B,
      buyerCountry: body.buyerCountry,
      buyerVATNumber: body.buyerVATNumber,
    });
  }

  @Post('calculate-from-gross')
  @ApiOperation({ summary: 'Calculate VAT from gross amount (reverse calculation)' })
  @ApiResponse({ status: 200, description: 'VAT calculation result' })
  calculateVATFromGross(
    @Body() body: {
      grossAmount: number;
      country: string;
      category: VATCategory;
      transactionDate?: string;
    },
  ) {
    return this.vatService.calculateVATFromGross(
      body.grossAmount,
      body.country,
      body.category,
      body.transactionDate ? new Date(body.transactionDate) : undefined,
    );
  }

  // =================== VAT RATES ===================

  @Get('rates/:country')
  @ApiOperation({ summary: 'Get all VAT rates for a country' })
  @ApiResponse({ status: 200, description: 'List of VAT rates' })
  getCountryRates(@Param('country') country: string) {
    return this.vatService.getCountryRates(country.toUpperCase());
  }

  @Get('rate')
  @ApiOperation({ summary: 'Get applicable VAT rate for transaction' })
  @ApiQuery({ name: 'country', required: true })
  @ApiQuery({ name: 'category', required: true, enum: VATCategory })
  @ApiQuery({ name: 'date', required: false })
  @ApiResponse({ status: 200, description: 'Applicable VAT rate' })
  getApplicableRate(
    @Query('country') country: string,
    @Query('category') category: VATCategory,
    @Query('date') date?: string,
  ) {
    const rate = this.vatService.getApplicableRate(
      country.toUpperCase(),
      category,
      date ? new Date(date) : undefined,
    );
    return rate || { error: 'No applicable rate found' };
  }

  @Get('standard-rate/:country')
  @ApiOperation({ summary: 'Get standard VAT rate for a country' })
  @ApiResponse({ status: 200, description: 'Standard VAT rate' })
  getStandardRate(
    @Param('country') country: string,
    @Query('date') date?: string,
  ) {
    const rate = this.vatService.getStandardRate(
      country.toUpperCase(),
      date ? new Date(date) : undefined,
    );
    return rate || { error: 'No standard rate found' };
  }

  @Put('rates/:rateId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a VAT rate (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated VAT rate' })
  updateVATRate(
    @Param('rateId') rateId: string,
    @Body() updates: {
      rate?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      legalReference?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) {
    const updatedRate = this.vatService.updateVATRate(rateId, {
      ...updates,
      effectiveFrom: updates.effectiveFrom ? new Date(updates.effectiveFrom) : undefined,
      effectiveTo: updates.effectiveTo ? new Date(updates.effectiveTo) : undefined,
    });
    return updatedRate || { error: 'Rate not found' };
  }

  // =================== COUNTRY CONFIG ===================

  @Get('countries')
  @ApiOperation({ summary: 'Get all EU country VAT configurations' })
  @ApiResponse({ status: 200, description: 'List of country configs' })
  getAllCountryConfigs() {
    return this.vatService.getAllCountryConfigs();
  }

  @Get('countries/:country')
  @ApiOperation({ summary: 'Get VAT configuration for a country' })
  @ApiResponse({ status: 200, description: 'Country VAT config' })
  getCountryConfig(@Param('country') country: string) {
    const config = this.vatService.getCountryConfig(country.toUpperCase());
    return config || { error: 'Country not found' };
  }

  @Get('countries/:country/is-eu')
  @ApiOperation({ summary: 'Check if country is EU member' })
  @ApiResponse({ status: 200, description: 'EU membership status' })
  isEUCountry(@Param('country') country: string) {
    return {
      country: country.toUpperCase(),
      isEU: this.vatService.isEUCountry(country.toUpperCase()),
    };
  }

  // =================== VAT NUMBER VALIDATION ===================

  @Get('validate-number/:vatNumber')
  @ApiOperation({ summary: 'Validate VAT number format' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  validateVATNumberFormat(@Param('vatNumber') vatNumber: string) {
    return this.vatService.validateVATNumberFormat(vatNumber);
  }

  // =================== CATEGORIES ===================

  @Get('categories')
  @ApiOperation({ summary: 'Get all VAT categories' })
  @ApiResponse({ status: 200, description: 'List of VAT categories' })
  getCategories() {
    return Object.entries(VATCategory).map(([key, value]) => ({
      key,
      value,
      nameRo: this.getCategoryNameRo(value),
    }));
  }

  @Get('rate-types')
  @ApiOperation({ summary: 'Get all VAT rate types' })
  @ApiResponse({ status: 200, description: 'List of VAT rate types' })
  getRateTypes() {
    return Object.entries(VATRateType).map(([key, value]) => ({
      key,
      value,
      nameRo: this.getRateTypeNameRo(value),
    }));
  }

  private getCategoryNameRo(category: VATCategory): string {
    const translations: Record<VATCategory, string> = {
      [VATCategory.GENERAL_GOODS]: 'Bunuri Generale',
      [VATCategory.FOOD_BEVERAGES]: 'Alimente și Băuturi',
      [VATCategory.BOOKS_PUBLICATIONS]: 'Cărți și Publicații',
      [VATCategory.MEDICAL_PHARMA]: 'Medicamente și Produse Farmaceutice',
      [VATCategory.ACCOMMODATION]: 'Cazare',
      [VATCategory.TRANSPORT]: 'Transport',
      [VATCategory.CULTURAL_EVENTS]: 'Evenimente Culturale',
      [VATCategory.AGRICULTURAL]: 'Produse Agricole',
      [VATCategory.CONSTRUCTION]: 'Construcții',
      [VATCategory.DIGITAL_SERVICES]: 'Servicii Digitale',
      [VATCategory.FINANCIAL_SERVICES]: 'Servicii Financiare',
      [VATCategory.EDUCATION]: 'Educație',
      [VATCategory.EXPORTS]: 'Exporturi',
      [VATCategory.INTRA_EU_B2B]: 'Tranzacții Intra-UE B2B',
    };
    return translations[category] || category;
  }

  private getRateTypeNameRo(type: VATRateType): string {
    const translations: Record<VATRateType, string> = {
      [VATRateType.STANDARD]: 'Standard',
      [VATRateType.REDUCED]: 'Redusă',
      [VATRateType.SUPER_REDUCED]: 'Super Redusă',
      [VATRateType.ZERO]: 'Zero',
      [VATRateType.EXEMPT]: 'Scutit',
      [VATRateType.REVERSE_CHARGE]: 'Taxare Inversă',
    };
    return translations[type] || type;
  }
}
