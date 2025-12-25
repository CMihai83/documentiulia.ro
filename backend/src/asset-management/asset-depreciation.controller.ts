import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetDepreciationService } from './asset-depreciation.service';
import { AssetManagementService, DepreciationMethod } from './asset-management.service';

@ApiTags('Asset Management - Depreciation')
@Controller('assets/depreciation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssetDepreciationController {
  constructor(
    private readonly depreciationService: AssetDepreciationService,
    private readonly assetService: AssetManagementService,
  ) {}

  // =================== SCHEDULES ===================

  @Post(':assetId/schedule')
  @ApiOperation({ summary: 'Create depreciation schedule for asset' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(
    @Request() req: any,
    @Param('assetId') assetId: string,
  ) {
    const asset = await this.assetService.getAsset(assetId);
    if (!asset) {
      return { error: 'Asset not found' };
    }

    try {
      return await this.depreciationService.createDepreciationSchedule(
        asset,
        req.user.tenantId,
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':assetId/schedule')
  @ApiOperation({ summary: 'Get depreciation schedule for asset' })
  @ApiResponse({ status: 200, description: 'Depreciation schedule' })
  async getSchedule(@Param('assetId') assetId: string) {
    const schedule = await this.depreciationService.getDepreciationSchedule(assetId);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Get all depreciation schedules' })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Schedules list' })
  async getSchedules(
    @Request() req: any,
    @Query('method') method?: DepreciationMethod,
    @Query('status') status?: 'active' | 'completed' | 'paused',
    @Query('limit') limit?: string,
  ) {
    const schedules = await this.depreciationService.getDepreciationSchedules(
      req.user.tenantId,
      {
        method,
        status,
        limit: limit ? parseInt(limit) : undefined,
      },
    );
    return { schedules, total: schedules.length };
  }

  // =================== ENTRIES ===================

  @Post('schedules/:scheduleId/entries/:period/post')
  @ApiOperation({ summary: 'Post depreciation entry' })
  @ApiResponse({ status: 200, description: 'Entry posted' })
  async postEntry(
    @Request() req: any,
    @Param('scheduleId') scheduleId: string,
    @Param('period') period: string,
  ) {
    const entry = await this.depreciationService.postDepreciationEntry(
      scheduleId,
      period,
      req.user.id,
    );
    if (!entry) {
      return { error: 'Schedule or entry not found' };
    }
    return entry;
  }

  @Put('schedules/:scheduleId/entries/:period/adjust')
  @ApiOperation({ summary: 'Adjust depreciation entry' })
  @ApiResponse({ status: 200, description: 'Entry adjusted' })
  async adjustEntry(
    @Request() req: any,
    @Param('scheduleId') scheduleId: string,
    @Param('period') period: string,
    @Body() body: {
      newAmount: number;
      reason: string;
    },
  ) {
    const entry = await this.depreciationService.adjustDepreciationEntry(
      scheduleId,
      period,
      {
        newAmount: body.newAmount,
        reason: body.reason,
        adjustedBy: req.user.id,
      },
    );
    if (!entry) {
      return { error: 'Schedule or entry not found' };
    }
    return entry;
  }

  // =================== CALCULATIONS ===================

  @Get(':assetId/book-value')
  @ApiOperation({ summary: 'Calculate current book value' })
  @ApiResponse({ status: 200, description: 'Current book value' })
  async getCurrentBookValue(@Param('assetId') assetId: string) {
    const asset = await this.assetService.getAsset(assetId);
    if (!asset) {
      return { error: 'Asset not found' };
    }

    const bookValue = this.depreciationService.calculateCurrentBookValue(asset);
    return {
      assetId,
      assetName: asset.name,
      purchasePrice: asset.purchasePrice,
      currentBookValue: Math.round(bookValue * 100) / 100,
      accumulatedDepreciation: Math.round(((asset.purchasePrice || 0) - bookValue) * 100) / 100,
    };
  }

  // =================== SUMMARY & REPORTS ===================

  @Get('summary')
  @ApiOperation({ summary: 'Get depreciation summary' })
  @ApiResponse({ status: 200, description: 'Depreciation summary' })
  async getSummary(@Request() req: any) {
    return this.depreciationService.getDepreciationSummary(req.user.tenantId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate depreciation report' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Depreciation report' })
  async generateReport(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.depreciationService.generateDepreciationReport(req.user.tenantId, {
      year: parseInt(year),
      month: month ? parseInt(month) : undefined,
    });
  }

  @Get('status-breakdown')
  @ApiOperation({ summary: 'Get assets by depreciation status' })
  @ApiResponse({ status: 200, description: 'Assets by status' })
  async getStatusBreakdown(@Request() req: any) {
    return this.depreciationService.getAssetsByDepreciationStatus(req.user.tenantId);
  }

  // =================== VALUATION ===================

  @Get(':assetId/valuation')
  @ApiOperation({ summary: 'Get asset valuation' })
  @ApiResponse({ status: 200, description: 'Asset valuation' })
  async getValuation(@Param('assetId') assetId: string) {
    const valuation = await this.depreciationService.getAssetValuation(assetId);
    if (!valuation) {
      return { error: 'Valuation not found' };
    }
    return valuation;
  }

  @Post(':assetId/revalue')
  @ApiOperation({ summary: 'Revalue asset' })
  @ApiResponse({ status: 200, description: 'Asset revalued' })
  async revalueAsset(
    @Request() req: any,
    @Param('assetId') assetId: string,
    @Body() body: {
      newValue: number;
      reason: string;
    },
  ) {
    const asset = await this.assetService.getAsset(assetId);
    if (!asset) {
      return { error: 'Asset not found' };
    }

    return this.depreciationService.revalueAsset(asset, {
      newValue: body.newValue,
      reason: body.reason,
      adjustedBy: req.user.id,
    });
  }
}
