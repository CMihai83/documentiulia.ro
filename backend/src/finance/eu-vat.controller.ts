import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  EuVatService,
  EUCountryVATRates,
  EUVATCalculation,
  VIESValidationResult,
  IntraCommunityTransaction,
} from './eu-vat.service';

class CalculateVATDto {
  countryCode: string;
  amount: number;
  rateType?: 'standard' | 'reduced' | 'super_reduced' | 'parking' | 'zero';
  reducedRateIndex?: number;
  isGross?: boolean;
}

class ValidateVATDto {
  vatNumber: string;
}

class IntraCommunityDto {
  sellerCountry: string;
  sellerVatNumber: string;
  buyerCountry: string;
  buyerVatNumber?: string;
  isB2B: boolean;
  isService: boolean;
}

class OSSCheckDto {
  homeCountry: string;
  salesByCountry: Record<string, number>;
}

class MultiCurrencyVATDto {
  countryCode: string;
  amount: number;
  sourceCurrency: string;
  exchangeRate: number;
  rateType?: 'standard' | 'reduced' | 'super_reduced' | 'parking' | 'zero';
}

@Controller('eu-vat')
export class EuVatController {
  constructor(private readonly euVatService: EuVatService) {}

  /**
   * Get all EU member states with VAT rates (public)
   */
  @Get('countries')
  getAllCountries(): EUCountryVATRates[] {
    return this.euVatService.getAllCountries();
  }

  /**
   * Get VAT rates for a specific EU country (public)
   */
  @Get('countries/:countryCode')
  async getCountryRates(@Param('countryCode') countryCode: string): Promise<EUCountryVATRates> {
    return await this.euVatService.getCountryRates(countryCode);
  }

  /**
   * Get Eurozone countries (EUR currency)
   */
  @Get('eurozone')
  getEurozoneCountries(): EUCountryVATRates[] {
    return this.euVatService.getEurozoneCountries();
  }

  /**
   * Get non-Eurozone EU countries
   */
  @Get('non-eurozone')
  getNonEurozoneCountries(): EUCountryVATRates[] {
    return this.euVatService.getNonEurozoneCountries();
  }

  /**
   * Get countries grouped by currency
   */
  @Get('by-currency')
  getCountriesByCurrency(): Record<string, string[]> {
    return this.euVatService.getCountriesByCurrency();
  }

  /**
   * Get VAT rates comparison across EU
   */
  @Get('comparison')
  getVATRatesComparison() {
    return this.euVatService.getVATRatesComparison();
  }

  /**
   * Calculate VAT for a specific country
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateVAT(@Body() dto: CalculateVATDto): Promise<EUVATCalculation> {
    return await this.euVatService.calculateVAT(
      dto.countryCode,
      dto.amount,
      dto.rateType || 'standard',
      dto.reducedRateIndex || 0,
      dto.isGross || false,
    );
  }

  /**
   * Validate VAT number format
   */
  @Get('validate/format/:vatNumber')
  async validateVATFormat(@Param('vatNumber') vatNumber: string) {
    return await this.euVatService.validateVATNumberFormat(vatNumber);
  }

  /**
   * Validate VAT number against VIES (requires auth)
   */
  @Post('validate/vies')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateVIES(@Body() dto: ValidateVATDto): Promise<VIESValidationResult> {
    return this.euVatService.validateVIES(dto.vatNumber);
  }

  /**
   * Determine VAT treatment for intra-community transaction
   */
  @Post('intra-community')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  determineIntraCommunityVAT(@Body() dto: IntraCommunityDto): IntraCommunityTransaction {
    return this.euVatService.determineIntraCommunityVAT(
      dto.sellerCountry,
      dto.sellerVatNumber,
      dto.buyerCountry,
      dto.buyerVatNumber || '',
      dto.isB2B,
      dto.isService,
    );
  }

  /**
   * Check OSS registration requirements
   */
  @Post('oss/check')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  checkOSSRequirement(@Body() dto: OSSCheckDto) {
    return this.euVatService.checkOSSRequirement(dto.homeCountry, dto.salesByCountry);
  }

  /**
   * Calculate VAT with currency conversion
   */
  @Post('calculate/multi-currency')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  calculateMultiCurrencyVAT(@Body() dto: MultiCurrencyVATDto) {
    return this.euVatService.calculateMultiCurrencyVAT(
      dto.countryCode,
      dto.amount,
      dto.sourceCurrency,
      dto.exchangeRate,
      dto.rateType || 'standard',
    );
  }

  /**
   * Get standard VAT rates ranked
   */
  @Get('rates/standard')
  getStandardRates() {
    const comparison = this.euVatService.getVATRatesComparison();
    return comparison.standardRates;
  }

  /**
   * Get countries with reduced rates
   */
  @Get('rates/reduced')
  getReducedRates() {
    const countries = this.euVatService.getAllCountries();
    return countries
      .filter((c) => c.reducedRates.length > 0)
      .map((c) => ({
        countryCode: c.countryCode,
        countryName: c.countryName,
        standardRate: c.standardRate,
        reducedRates: c.reducedRates,
        superReducedRate: c.superReducedRate,
        parkingRate: c.parkingRate,
      }));
  }

  /**
   * Get countries allowing zero-rated supplies
   */
  @Get('rates/zero-rated')
  getZeroRatedCountries() {
    const countries = this.euVatService.getAllCountries();
    return countries
      .filter((c) => c.zeroRated)
      .map((c) => ({
        countryCode: c.countryCode,
        countryName: c.countryName,
        zeroRated: c.zeroRated,
      }));
  }

  /**
   * Quick VAT calculation endpoint (GET for simple use)
   */
  @Get('quick-calc')
  async quickCalculate(
    @Query('country') countryCode: string,
    @Query('amount') amount: string,
    @Query('type') rateType: string = 'standard',
    @Query('gross') isGross: string = 'false',
  ): Promise<EUVATCalculation> {
    return await this.euVatService.calculateVAT(
      countryCode,
      parseFloat(amount),
      rateType as 'standard' | 'reduced' | 'super_reduced' | 'parking' | 'zero',
      0,
      isGross === 'true',
    );
  }
}
