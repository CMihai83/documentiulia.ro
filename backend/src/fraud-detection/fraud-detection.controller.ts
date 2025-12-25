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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FraudDetectionService } from './fraud-detection.service';
import {
  FraudAlertDto,
  UpdateFraudAlertDto,
  TransactionAnalysisDto,
  FraudDashboardStatsDto,
  FraudAlertStatus,
  FraudDetectionRulesDto,
} from './fraud-detection.dto';
import { FraudRule } from './fraud-rules';

@ApiTags('fraud-detection')
@Controller('fraud-detection')
@ApiBearerAuth()
export class FraudDetectionController {
  constructor(private readonly fraudDetectionService: FraudDetectionService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze a transaction for potential fraud' })
  @ApiResponse({ status: 200, description: 'Transaction analyzed', type: [FraudAlertDto] })
  @HttpCode(HttpStatus.OK)
  async analyzeTransaction(
    @Body() transaction: TransactionAnalysisDto,
    @Request() req: any,
  ): Promise<FraudAlertDto[]> {
    // Override userId from authenticated request
    transaction.userId = req.user?.userId || transaction.userId;
    return this.fraudDetectionService.analyzeTransaction(transaction);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get fraud alerts for current user' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved', type: [FraudAlertDto] })
  @ApiQuery({ name: 'status', enum: FraudAlertStatus, required: false })
  async getAlerts(
    @Request() req: any,
    @Query('status') status?: FraudAlertStatus,
  ): Promise<FraudAlertDto[]> {
    const userId = req.user?.userId;
    return this.fraudDetectionService.getAlerts(userId, status);
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get a specific fraud alert' })
  @ApiResponse({ status: 200, description: 'Alert retrieved', type: FraudAlertDto })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async getAlert(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<FraudAlertDto | null> {
    const userId = req.user?.userId;
    const alerts = await this.fraudDetectionService.getAlerts(userId);
    return alerts.find(a => a.id === id) || null;
  }

  @Put('alerts/:id')
  @ApiOperation({ summary: 'Update fraud alert status' })
  @ApiResponse({ status: 200, description: 'Alert updated', type: FraudAlertDto })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async updateAlert(
    @Param('id') id: string,
    @Body() update: UpdateFraudAlertDto,
    @Request() req: any,
  ): Promise<FraudAlertDto> {
    const userId = req.user?.userId;
    return this.fraudDetectionService.updateAlert(id, userId, update);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get fraud detection dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved', type: FraudDashboardStatsDto })
  async getDashboardStats(@Request() req: any): Promise<FraudDashboardStatsDto> {
    const userId = req.user?.userId;
    return this.fraudDetectionService.getDashboardStats(userId);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get fraud detection rules' })
  @ApiResponse({ status: 200, description: 'Rules retrieved', type: [Object] })
  async getRules(): Promise<FraudRule[]> {
    return this.fraudDetectionService.getRules();
  }

  @Put('rules')
  @ApiOperation({ summary: 'Update fraud detection rules' })
  @ApiResponse({ status: 200, description: 'Rules updated' })
  @HttpCode(HttpStatus.OK)
  async updateRules(@Body() rules: Partial<FraudDetectionRulesDto>): Promise<{ success: boolean }> {
    this.fraudDetectionService.updateRules(rules);
    return { success: true };
  }

  @Post('alerts/:id/mark-false-positive')
  @ApiOperation({ summary: 'Mark an alert as false positive' })
  @ApiResponse({ status: 200, description: 'Alert marked as false positive', type: FraudAlertDto })
  @HttpCode(HttpStatus.OK)
  async markFalsePositive(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ): Promise<FraudAlertDto> {
    const userId = req.user?.userId;
    return this.fraudDetectionService.updateAlert(id, userId, {
      status: FraudAlertStatus.FALSE_POSITIVE,
      resolution: notes || 'Marked as false positive',
    });
  }

  @Post('alerts/:id/confirm')
  @ApiOperation({ summary: 'Confirm fraud alert' })
  @ApiResponse({ status: 200, description: 'Alert confirmed', type: FraudAlertDto })
  @HttpCode(HttpStatus.OK)
  async confirmAlert(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ): Promise<FraudAlertDto> {
    const userId = req.user?.userId;
    return this.fraudDetectionService.updateAlert(id, userId, {
      status: FraudAlertStatus.CONFIRMED,
      resolution: notes || 'Fraud confirmed',
    });
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve fraud alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved', type: FraudAlertDto })
  @HttpCode(HttpStatus.OK)
  async resolveAlert(
    @Param('id') id: string,
    @Body('resolution') resolution: string,
    @Request() req: any,
  ): Promise<FraudAlertDto> {
    const userId = req.user?.userId;
    return this.fraudDetectionService.updateAlert(id, userId, {
      status: FraudAlertStatus.RESOLVED,
      resolution: resolution || 'Resolved',
    });
  }
}
