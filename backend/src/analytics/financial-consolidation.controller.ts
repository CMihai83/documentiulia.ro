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
  FinancialConsolidationService,
  EntityType,
  ConsolidationMethod,
  CurrencyTranslationMethod,
  ConsolidationStatus,
} from './financial-consolidation.service';

// =================== DTOs ===================

class CreateEntityDto {
  code: string;
  name: string;
  type: EntityType;
  parentEntityId?: string;
  ownershipPercentage: number;
  consolidationMethod: ConsolidationMethod;
  functionalCurrency: string;
  reportingCurrency: string;
  translationMethod: CurrencyTranslationMethod;
  fiscalYearEnd: string;
  country: string;
  taxId?: string;
  isActive?: boolean;
}

class UpdateEntityDto {
  name?: string;
  type?: EntityType;
  parentEntityId?: string;
  ownershipPercentage?: number;
  consolidationMethod?: ConsolidationMethod;
  functionalCurrency?: string;
  reportingCurrency?: string;
  translationMethod?: CurrencyTranslationMethod;
  fiscalYearEnd?: string;
  country?: string;
  taxId?: string;
  isActive?: boolean;
}

class CreatePeriodDto {
  name: string;
  year: number;
  period: number;
  periodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  startDate: string;
  endDate: string;
}

class CreateIntercompanyTransactionDto {
  periodId: string;
  sourceEntityId: string;
  targetEntityId: string;
  transactionType: string;
  accountCode: string;
  description: string;
  amount: number;
  currency: string;
  referenceNumber?: string;
}

class CreateEliminationDto {
  periodId: string;
  eliminationType: string;
  sourceEntityId: string;
  targetEntityId?: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  description: string;
}

class SubmitTrialBalanceDto {
  entityId: string;
  periodId: string;
  entries: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
}

class UpdatePeriodStatusDto {
  status: ConsolidationStatus;
}

class SetExchangeRateDto {
  fromCurrency: string;
  toCurrency: string;
  date: string;
  rate: number;
  rateType: 'SPOT' | 'AVERAGE' | 'HISTORICAL';
}

@Controller('consolidation')
@UseGuards(JwtAuthGuard)
export class FinancialConsolidationController {
  constructor(
    private readonly consolidationService: FinancialConsolidationService,
  ) {}

  // =================== ENTITY MANAGEMENT ===================

  @Post('entities')
  async createEntity(@Request() req: any, @Body() dto: CreateEntityDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.createEntity(tenantId, {
      ...dto,
      isActive: dto.isActive ?? true,
    });
  }

  @Get('entities')
  async getEntities(
    @Request() req: any,
    @Query('type') type?: EntityType,
    @Query('isActive') isActive?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getEntities(tenantId, {
      type,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('entities/hierarchy')
  async getEntityHierarchy(
    @Request() req: any,
    @Query('rootEntityId') rootEntityId?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getEntityHierarchy(tenantId, rootEntityId);
  }

  @Get('entities/:id')
  async getEntity(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getEntity(tenantId, id);
  }

  @Put('entities/:id')
  async updateEntity(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEntityDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.updateEntity(tenantId, id, dto);
  }

  @Delete('entities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEntity(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    await this.consolidationService.deleteEntity(tenantId, id);
  }

  // =================== PERIOD MANAGEMENT ===================

  @Post('periods')
  async createPeriod(@Request() req: any, @Body() dto: CreatePeriodDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.createPeriod(tenantId, {
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }

  @Get('periods')
  async getPeriods(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('status') status?: ConsolidationStatus,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getPeriods(tenantId, {
      year: year ? parseInt(year) : undefined,
      status,
    });
  }

  @Get('periods/:id')
  async getPeriod(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getPeriod(tenantId, id);
  }

  @Put('periods/:id/status')
  async updatePeriodStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePeriodStatusDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const userId = req.user?.sub || req.user?.id || 'system';
    return this.consolidationService.updatePeriodStatus(tenantId, id, dto.status, userId);
  }

  @Post('periods/:id/lock')
  async lockPeriod(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const userId = req.user?.sub || req.user?.id || 'system';
    return this.consolidationService.lockPeriod(tenantId, id, userId);
  }

  @Post('periods/:id/unlock')
  async unlockPeriod(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.unlockPeriod(tenantId, id);
  }

  // =================== INTERCOMPANY TRANSACTIONS ===================

  @Post('intercompany')
  async createIntercompanyTransaction(
    @Request() req: any,
    @Body() dto: CreateIntercompanyTransactionDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.recordIntercompanyTransaction(tenantId, dto as any);
  }

  @Get('intercompany')
  async getIntercompanyTransactions(
    @Request() req: any,
    @Query('periodId') periodId?: string,
    @Query('entityId') entityId?: string,
    @Query('matched') matched?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    // Service expects periodId as string, filter results client-side if needed
    const transactions = await this.consolidationService.getIntercompanyTransactions(
      tenantId,
      periodId || '',
    );
    // Filter by entity if provided
    if (entityId) {
      return transactions.filter(
        (t: any) => t.sourceEntityId === entityId || t.targetEntityId === entityId,
      );
    }
    // Filter by matched status if provided
    if (matched !== undefined) {
      const isMatched = matched === 'true';
      return transactions.filter((t: any) => (t.status === 'MATCHED') === isMatched);
    }
    return transactions;
  }

  @Post('intercompany/match/:periodId')
  async matchIntercompanyTransactions(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.matchIntercompanyTransactions(tenantId, periodId);
  }

  @Get('intercompany/exceptions/:periodId')
  async getIntercompanyExceptions(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const result = await this.consolidationService.matchIntercompanyTransactions(tenantId, periodId);
    return result.exceptions;
  }

  // =================== ELIMINATIONS ===================

  @Post('eliminations')
  async createElimination(
    @Request() req: any,
    @Body() dto: CreateEliminationDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const userId = req.user?.sub || req.user?.id || 'system';
    return this.consolidationService.createEliminationEntry(tenantId, userId, dto as any);
  }

  @Get('eliminations')
  async getEliminations(
    @Request() req: any,
    @Query('periodId') periodId?: string,
    @Query('type') type?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    // Get all eliminations and filter
    const eliminations = await this.consolidationService.getEliminationEntries(
      tenantId,
      periodId || '',
    );
    if (type) {
      return eliminations.filter((e: any) => e.eliminationType === type);
    }
    return eliminations;
  }

  @Post('eliminations/auto-generate/:periodId')
  async generateAutomaticEliminations(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.generateAutomaticEliminations(tenantId, periodId);
  }

  @Delete('eliminations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteElimination(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    await this.consolidationService.deleteEliminationEntry(tenantId, id);
  }

  // =================== TRIAL BALANCE ===================

  @Post('trial-balance')
  async submitTrialBalance(
    @Request() req: any,
    @Body() dto: SubmitTrialBalanceDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.submitTrialBalance(tenantId, dto);
  }

  @Get('trial-balance/:entityId/:periodId')
  async getTrialBalance(
    @Request() req: any,
    @Param('entityId') entityId: string,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getTrialBalance(tenantId, entityId, periodId);
  }

  @Post('trial-balance/:entityId/:periodId/translate')
  async translateTrialBalance(
    @Request() req: any,
    @Param('entityId') entityId: string,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.translateTrialBalance(tenantId, entityId, periodId);
  }

  // =================== EXCHANGE RATES ===================

  @Post('exchange-rates')
  async setExchangeRate(@Request() req: any, @Body() dto: SetExchangeRateDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.setExchangeRate(tenantId, {
      ...dto,
      date: new Date(dto.date),
    });
  }

  @Get('exchange-rates')
  async getExchangeRates(
    @Request() req: any,
    @Query('fromCurrency') fromCurrency?: string,
    @Query('toCurrency') toCurrency?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getExchangeRates(tenantId, {
      fromCurrency,
      toCurrency,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // =================== CONSOLIDATION EXECUTION ===================

  @Post('run/:periodId')
  async runConsolidation(@Request() req: any, @Param('periodId') periodId: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const userId = req.user?.sub || req.user?.id || 'system';
    return this.consolidationService.runConsolidation(tenantId, periodId, userId);
  }

  @Get('status/:periodId')
  async getConsolidationStatus(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getConsolidationStatus(tenantId, periodId);
  }

  // =================== CONSOLIDATED STATEMENTS ===================

  @Get('statements/balance-sheet/:periodId')
  async getConsolidatedBalanceSheet(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.generateConsolidatedBalanceSheet(tenantId, periodId);
  }

  @Get('statements/income/:periodId')
  async getConsolidatedIncomeStatement(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.generateConsolidatedIncomeStatement(tenantId, periodId);
  }

  @Get('statements/cash-flow/:periodId')
  async getConsolidatedCashFlow(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.generateConsolidatedCashFlow(tenantId, periodId);
  }

  // =================== MINORITY INTEREST ===================

  @Get('minority-interest/:periodId')
  async getMinorityInterest(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.calculateMinorityInterest(tenantId, periodId);
  }

  // =================== AUDIT & RECONCILIATION ===================

  @Get('audit-trail/:periodId')
  async getAuditTrail(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getAuditTrail(tenantId, periodId);
  }

  @Get('reconciliation/:periodId')
  async getReconciliationReport(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getReconciliationReport(tenantId, periodId);
  }

  // =================== REPORTS & ANALYTICS ===================

  @Get('reports/entity-summary/:periodId')
  async getEntitySummary(
    @Request() req: any,
    @Param('periodId') periodId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getEntityContributionReport(tenantId, periodId);
  }

  @Get('reports/comparison')
  async getPeriodComparison(
    @Request() req: any,
    @Query('periodId1') periodId1: string,
    @Query('periodId2') periodId2: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getPeriodComparison(tenantId, periodId1, periodId2);
  }

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.consolidationService.getConsolidationDashboard(tenantId);
  }
}
