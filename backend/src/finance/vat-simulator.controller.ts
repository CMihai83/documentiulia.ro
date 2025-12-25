/**
 * VAT Simulator Controller
 * API endpoints for VAT rate change simulation
 * Sprint 26 - Grok Backlog
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VatSimulatorService, VatSimulationResult, VatSimulationInput } from './vat-simulator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

class VatSimulationDto {
  monthlyRevenue: number;
  revenueBreakdown: {
    standardRate: number;
    reducedRate: number;
    specialRate: number;
  };
  monthlyExpenses: number;
  expenseBreakdown: {
    standardRate: number;
    reducedRate: number;
    specialRate: number;
    exempt: number;
  };
  isMicro?: boolean;
}

@ApiTags('VAT Simulator')
@Controller('finance/vat-simulator')
export class VatSimulatorController {
  constructor(private readonly vatSimulatorService: VatSimulatorService) {}

  @Public()
  @Get('rates')
  @ApiOperation({ summary: 'Get current and future VAT rates' })
  @ApiResponse({ status: 200, description: 'VAT rate information' })
  getVatRates() {
    return this.vatSimulatorService.getVatRates();
  }

  @Public()
  @Get('presets')
  @ApiOperation({ summary: 'Get industry presets for simulation' })
  @ApiResponse({ status: 200, description: 'List of industry presets' })
  getPresets() {
    return this.vatSimulatorService.getIndustryPresets();
  }

  @Post('simulate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate VAT impact for Aug 2025 changes' })
  @ApiBody({ type: VatSimulationDto })
  @ApiResponse({ status: 200, description: 'Simulation results' })
  async simulate(@Body() dto: VatSimulationDto): Promise<VatSimulationResult> {
    return this.vatSimulatorService.simulateVatChange(dto);
  }

  @Get('simulate-from-invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate VAT impact based on actual invoice data' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to analyze (default 6)' })
  @ApiResponse({ status: 200, description: 'Simulation results based on historical data' })
  async simulateFromInvoices(
    @Request() req: { user: { activeOrganizationId?: string } },
    @Query('months') months?: string,
  ): Promise<VatSimulationResult | { error: string; message: string }> {
    const organizationId = req.user.activeOrganizationId;
    if (!organizationId) {
      return {
        error: 'No organization selected',
        message: 'Selectați o organizație pentru a utiliza datele din facturi',
      };
    }
    return this.vatSimulatorService.simulateFromInvoices(
      organizationId,
      months ? parseInt(months) : 6,
    );
  }
}
