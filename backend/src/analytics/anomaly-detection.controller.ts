import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AnomalyDetectionService,
  AnomalyType,
  RiskLevel,
  AnomalyStatus,
  EntityType,
  Transaction,
  RuleCondition,
} from './anomaly-detection.service';

// =================== DTOs ===================

class CreateRuleDto {
  name: string;
  description: string;
  entityType: EntityType;
  anomalyType: AnomalyType;
  conditions: RuleCondition[];
  riskLevel: RiskLevel;
  isActive: boolean;
}

class UpdateRuleDto {
  name?: string;
  description?: string;
  conditions?: RuleCondition[];
  riskLevel?: RiskLevel;
  isActive?: boolean;
}

class UpdateAnomalyStatusDto {
  status: AnomalyStatus;
  notes?: string;
}

class DetectAnomaliesDto {
  transactions: Array<{
    id: string;
    entityType: EntityType;
    amount: number;
    currency: string;
    date: string;
    vendorId?: string;
    customerId?: string;
    description?: string;
    category?: string;
    accountCode?: string;
    metadata?: Record<string, any>;
  }>;
}

class LoadTransactionsDto {
  entityType: EntityType;
  transactions: Array<{
    id: string;
    amount: number;
    currency: string;
    date: string;
    vendorId?: string;
    customerId?: string;
    description?: string;
    category?: string;
    accountCode?: string;
    metadata?: Record<string, any>;
  }>;
}

@Controller('anomaly-detection')
@UseGuards(JwtAuthGuard)
export class AnomalyDetectionController {
  constructor(
    private readonly anomalyDetectionService: AnomalyDetectionService,
  ) {}

  // =================== ANOMALY DETECTION ===================

  @Post('detect')
  async detectAnomalies(
    @Request() req: any,
    @Body() dto: DetectAnomaliesDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const transactions: Transaction[] = dto.transactions.map(t => ({
      ...t,
      tenantId,
      date: new Date(t.date),
    }));
    return this.anomalyDetectionService.detectAnomalies(tenantId, transactions);
  }

  @Post('batch/:entityType')
  async runBatchDetection(
    @Request() req: any,
    @Param('entityType') entityType: EntityType,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.runBatchDetection(tenantId, entityType);
  }

  @Post('transactions')
  async loadTransactions(
    @Request() req: any,
    @Body() dto: LoadTransactionsDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const transactions: Transaction[] = dto.transactions.map(t => ({
      ...t,
      tenantId,
      entityType: dto.entityType,
      date: new Date(t.date),
    }));
    const count = await this.anomalyDetectionService.loadTransactions(
      tenantId,
      dto.entityType,
      transactions,
    );
    return { loaded: count };
  }

  // =================== ANOMALY MANAGEMENT ===================

  @Get('anomalies')
  async getAnomalies(
    @Request() req: any,
    @Query('entityType') entityType?: EntityType,
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('status') status?: AnomalyStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.getAnomalies(tenantId, {
      entityType,
      riskLevel,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('anomalies/:id')
  async getAnomaly(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.getAnomaly(tenantId, id);
  }

  @Put('anomalies/:id/status')
  async updateAnomalyStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAnomalyStatusDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const userId = req.user?.sub || req.user?.id || 'system';
    return this.anomalyDetectionService.updateAnomalyStatus(
      tenantId,
      id,
      dto.status,
      userId,
      dto.notes,
    );
  }

  // =================== RULES MANAGEMENT ===================

  @Post('rules')
  async createRule(@Request() req: any, @Body() dto: CreateRuleDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.createRule(tenantId, dto);
  }

  @Get('rules')
  async getRules(
    @Request() req: any,
    @Query('entityType') entityType?: EntityType,
    @Query('isActive') isActive?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.getRules(tenantId, {
      entityType,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Put('rules/:id')
  async updateRule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.updateRule(tenantId, id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    await this.anomalyDetectionService.deleteRule(tenantId, id);
  }

  // =================== ANALYTICS ===================

  @Get('stats')
  async getStats(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.getAnomalyStats(tenantId);
  }

  @Get('risk-profile/:entityType/:entityId')
  async getRiskProfile(
    @Request() req: any,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.getRiskProfile(
      tenantId,
      entityType,
      entityId,
    );
  }

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.anomalyDetectionService.getDashboard(tenantId);
  }
}
