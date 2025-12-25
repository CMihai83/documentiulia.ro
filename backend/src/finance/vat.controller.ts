import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpStatus,
  HttpCode,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VatService, VATRateInfo, VATCalculation } from './vat.service';
import { CalculateVATDto, VATCategoryDto } from './dto/vat.dto';
import { CacheInterceptor, CacheKey, CacheTTLDecorator, CacheTags } from '../cache/cache.interceptor';
import { CacheTTL } from '../cache/redis-cache.service';

@ApiTags('VAT / TVA')
@Controller('vat')
export class VatController {
  constructor(private readonly vatService: VatService) {}

  /**
   * Get all VAT rates per Legea 141/2025
   */
  @Get('rates')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('vat:rates')
  @CacheTTLDecorator(CacheTTL.HOUR) // 1 hour - VAT rates change rarely
  @CacheTags('vat', 'rates', 'compliance')
  @ApiOperation({
    summary: 'Get all VAT rates',
    description: 'Returns all VAT rates per Legea 141/2025 with legal references and categories',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Effective date (YYYY-MM-DD) for rate lookup. Defaults to current date.',
    example: '2025-08-01',
  })
  @ApiResponse({
    status: 200,
    description: 'VAT rates retrieved successfully',
  })
  getAllRates(@Query('date') date?: string): {
    rates: VATRateInfo[];
    effectiveDate: string;
    law: string;
    transition: {
      preAugust2025: { standard: number; reduced1: number; reduced2: number };
      postAugust2025: { standard: number; reduced1: number; reduced2: number };
    };
  } {
    const effectiveDate = date || new Date().toISOString().split('T')[0];
    const rates = this.vatService.getRatesForDate(effectiveDate);

    return {
      rates,
      effectiveDate,
      law: 'Legea 141/2025',
      transition: {
        preAugust2025: { standard: 19, reduced1: 9, reduced2: 5 },
        postAugust2025: { standard: 21, reduced1: 11, reduced2: 5 },
      },
    };
  }

  /**
   * Calculate VAT for an amount
   */
  @Post('calculate')
  @ApiOperation({
    summary: 'Calculate VAT',
    description: 'Calculate VAT amount for a given net or gross amount',
  })
  @ApiResponse({
    status: 200,
    description: 'VAT calculated successfully',
  })
  @HttpCode(HttpStatus.OK)
  calculateVAT(@Body() dto: CalculateVATDto): VATCalculation {
    return this.vatService.calculateVAT(dto.amount, dto.rate, dto.isGross);
  }

  /**
   * Get applicable VAT rate for a category
   */
  @Post('rate-for-category')
  @ApiOperation({
    summary: 'Get VAT rate for category',
    description: 'Determine the applicable VAT rate for a product/service category',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Effective date for rate determination',
    example: '2025-08-01',
  })
  @ApiResponse({
    status: 200,
    description: 'VAT rate determined successfully',
  })
  @HttpCode(HttpStatus.OK)
  getRateForCategory(
    @Body() dto: VATCategoryDto,
    @Query('date') date?: string,
  ): VATRateInfo {
    return this.vatService.getApplicableRateInfo(dto.category, date);
  }

  /**
   * Get all reverse charge categories
   */
  @Get('reverse-charge/categories')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('vat:reverse-charge:categories')
  @CacheTTLDecorator(CacheTTL.DAY) // 24 hours - categories rarely change
  @CacheTags('vat', 'reverse-charge', 'compliance')
  @ApiOperation({
    summary: 'Get reverse charge categories',
    description: 'List all categories that qualify for reverse charge (taxare inversă) per Legea 141/2025',
  })
  @ApiResponse({
    status: 200,
    description: 'Reverse charge categories list',
  })
  getReverseChargeCategories() {
    return {
      categories: this.vatService.getReverseChargeCategories(),
      law: 'Legea 141/2025 Art. 331',
      description: 'Taxare inversă - cumpărătorul raportează TVA în locul vânzătorului',
    };
  }

  /**
   * Check reverse charge applicability
   */
  @Post('reverse-charge')
  @ApiOperation({
    summary: 'Check reverse charge',
    description: 'Check if transaction qualifies for reverse charge (taxare inversă) per Legea 141/2025 Art. 331',
  })
  @ApiResponse({
    status: 200,
    description: 'Reverse charge status determined',
  })
  @HttpCode(HttpStatus.OK)
  checkReverseCharge(
    @Body()
    dto: {
      category: string;
      sellerIsRoVATPayer: boolean;
      buyerIsRoVATPayer: boolean;
      isIntraCommunity?: boolean;
      transactionValue?: number;
    },
  ) {
    return this.vatService.checkReverseCharge(
      dto.category,
      dto.sellerIsRoVATPayer,
      dto.buyerIsRoVATPayer,
      dto.isIntraCommunity,
      dto.transactionValue,
    );
  }

  /**
   * Validate Romanian VAT number (CUI/CIF)
   */
  @Post('validate-cui')
  @ApiOperation({
    summary: 'Validate CUI/CIF',
    description: 'Validate Romanian VAT number format and checksum',
  })
  @ApiResponse({
    status: 200,
    description: 'CUI validation result',
  })
  @HttpCode(HttpStatus.OK)
  validateCUI(@Body() dto: { vatNumber: string }) {
    return this.vatService.validateRomanianVATNumber(dto.vatNumber);
  }

  /**
   * Calculate hospitality/tourism VAT (mixed rates)
   */
  @Post('hospitality')
  @ApiOperation({
    summary: 'Calculate hospitality VAT',
    description: 'Calculate mixed VAT rates for hotel/restaurant services',
  })
  @ApiResponse({
    status: 200,
    description: 'Hospitality VAT calculated',
  })
  @HttpCode(HttpStatus.OK)
  calculateHospitalityVAT(
    @Body()
    dto: {
      accommodationAmount: number;
      foodAmount: number;
      otherServicesAmount: number;
    },
  ) {
    return this.vatService.calculateHospitalityVAT(
      dto.accommodationAmount,
      dto.foodAmount,
      dto.otherServicesAmount,
    );
  }

  /**
   * Calculate construction sector VAT with reverse charge
   */
  @Post('construction')
  @ApiOperation({
    summary: 'Calculate construction VAT',
    description: 'Calculate construction sector VAT with automatic reverse charge detection',
  })
  @ApiResponse({
    status: 200,
    description: 'Construction VAT calculated',
  })
  @HttpCode(HttpStatus.OK)
  calculateConstructionVAT(
    @Body()
    dto: {
      materialAmount: number;
      laborAmount: number;
      buyerIsVATPayer: boolean;
    },
  ) {
    return this.vatService.calculateConstructionVAT(
      dto.materialAmount,
      dto.laborAmount,
      dto.buyerIsVATPayer,
    );
  }

  /**
   * Calculate VAT payable/recoverable
   */
  @Post('payable')
  @ApiOperation({
    summary: 'Calculate VAT payable',
    description: 'Calculate net VAT payable or recoverable for a period',
  })
  @ApiResponse({
    status: 200,
    description: 'VAT payable calculated',
  })
  @HttpCode(HttpStatus.OK)
  calculateVATPayable(
    @Body()
    dto: {
      collected: number;
      deductible: number;
    },
  ) {
    return this.vatService.calculateVATPayable(dto.collected, dto.deductible);
  }

  /**
   * Calculate pro-rata deduction for mixed activities
   */
  @Post('pro-rata')
  @ApiOperation({
    summary: 'Calculate pro-rata deduction',
    description: 'Calculate pro-rata VAT deduction for entities with mixed taxable/exempt activities',
  })
  @ApiResponse({
    status: 200,
    description: 'Pro-rata deduction calculated',
  })
  @HttpCode(HttpStatus.OK)
  calculateProRataDeduction(
    @Body()
    dto: {
      taxableRevenue: number;
      exemptRevenue: number;
      totalInputVAT: number;
    },
  ) {
    return this.vatService.calculateProRataDeduction(
      dto.taxableRevenue,
      dto.exemptRevenue,
      dto.totalInputVAT,
    );
  }

  /**
   * Get Legea 141/2025 transition info
   */
  @Get('transition-info')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('vat:transition-info')
  @CacheTTLDecorator(CacheTTL.DAY) // 24 hours - static information
  @CacheTags('vat', 'transition', 'compliance')
  @ApiOperation({
    summary: 'Get VAT transition info',
    description: 'Get information about the Legea 141/2025 VAT rate transition',
  })
  @ApiResponse({
    status: 200,
    description: 'Transition info retrieved',
  })
  getTransitionInfo() {
    return {
      law: 'Legea 141/2025',
      effectiveDate: '2025-08-01',
      changes: [
        {
          rateType: 'Standard (Cota standard)',
          before: '19%',
          after: '21%',
          categories: 'Bunuri și servicii generale',
        },
        {
          rateType: 'Reduced 1 (Cota redusă 1)',
          before: '9%',
          after: '11%',
          categories: 'Alimente, medicamente, cărți, ziare, cazare, restaurante',
        },
        {
          rateType: 'Reduced 2 (Cota redusă 2)',
          before: '5%',
          after: '5%',
          categories: 'Locuințe sociale, evenimente culturale, proteze (neschimbat)',
        },
      ],
      importantDates: [
        { date: '2025-01-01', description: 'SAF-T D406 mandatory monthly submission' },
        { date: '2025-08-01', description: 'New VAT rates effective' },
        { date: '2025-09-01', description: 'SAF-T pilot grace period starts (6 months)' },
        { date: '2026-03-01', description: 'SAF-T pilot grace period ends' },
        { date: '2026-06-01', description: 'e-Factura B2B mandatory (mid-2026)' },
      ],
      reverseChargeCategories: [
        'Construcții (Art. 331)',
        'Deșeuri metalice',
        'Cereale și plante tehnice',
        'Certificate CO2',
        'Lemn și produse din lemn',
        'Electronice (telefoane, tablete, laptopuri)',
      ],
    };
  }
}
