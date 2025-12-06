import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VatService, VATCalculation } from './vat.service';
import { FinanceService } from './finance.service';

class CalculateVATDto {
  amount: number;
  rate: number;
  isGross?: boolean;
}

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly vatService: VatService,
    private readonly financeService: FinanceService,
  ) {}

  @Post('vat/calculate')
  @ApiOperation({ summary: 'Calculate VAT per Legea 141/2025' })
  calculateVAT(@Body() dto: CalculateVATDto): VATCalculation {
    return this.vatService.calculateVAT(dto.amount, dto.rate, dto.isGross);
  }

  @Get('vat/rate')
  @ApiOperation({ summary: 'Get applicable VAT rate for category' })
  getVATRate(@Query('category') category: string): { rate: number; law: string } {
    return {
      rate: this.vatService.getApplicableRate(category),
      law: 'Legea 141/2025',
    };
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get finance dashboard data' })
  async getDashboard(@Query('userId') userId: string) {
    return this.financeService.getDashboardData(userId);
  }
}
