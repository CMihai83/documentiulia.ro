import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ReconciliationService,
  ReconciliationResult,
  AgingReport,
} from './reconciliation.service';

/**
 * Sprint 14 - US-001: Reconciliation Controller
 *
 * REST API endpoints for invoice reconciliation:
 * - POST /reconciliation/run - Run automatic reconciliation
 * - POST /reconciliation/manual-match - Manual invoice-payment matching
 * - GET /reconciliation/aging - Aging report
 * - GET /reconciliation/history - Reconciliation history
 * - GET /reconciliation/metrics - Payment performance metrics
 * - GET /reconciliation/dso - Days Sales Outstanding
 */
@Controller('api/finance/reconciliation')
@UseGuards(JwtAuthGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * Run automatic reconciliation for invoices and payments
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runReconciliation(
    @Req() req: any,
    @Body()
    body: {
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ReconciliationResult> {
    const userId = req.auth.userId;
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;

    return this.reconciliationService.runReconciliation(
      userId,
      startDate,
      endDate,
    );
  }

  /**
   * Manually match an invoice with a payment
   */
  @Post('manual-match')
  @HttpCode(HttpStatus.OK)
  async manualMatch(
    @Req() req: any,
    @Body()
    body: {
      invoiceId: string;
      paymentId: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.auth.userId;
    return this.reconciliationService.manualMatch(
      userId,
      body.invoiceId,
      body.paymentId,
    );
  }

  /**
   * Get aging report for outstanding invoices
   */
  @Get('aging')
  async getAgingReport(@Req() req: any): Promise<AgingReport> {
    const userId = req.auth.userId;
    return this.reconciliationService.getAgingReport(userId);
  }

  /**
   * Get reconciliation history
   */
  @Get('history')
  async getReconciliationHistory(
    @Req() req: any,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const userId = req.auth.userId;
    return this.reconciliationService.getReconciliationHistory(
      userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get payment performance metrics (DSO, collection rate, etc.)
   */
  @Get('metrics')
  async getPaymentMetrics(
    @Req() req: any,
  ): Promise<{
    dso: number;
    collectionRate: number;
    avgPaymentDelay: number;
    onTimePaymentRate: number;
  }> {
    const userId = req.auth.userId;
    return this.reconciliationService.getPaymentMetrics(userId);
  }

  /**
   * Get Days Sales Outstanding (DSO)
   */
  @Get('dso')
  async getDSO(
    @Req() req: any,
    @Query('days') days?: string,
  ): Promise<{ dso: number; days: number }> {
    const userId = req.auth.userId;
    const daysNum = days ? parseInt(days, 10) : 90;
    const dso = await this.reconciliationService.calculateDSO(userId, daysNum);
    return { dso, days: daysNum };
  }

  /**
   * Get collection rate
   */
  @Get('collection-rate')
  async getCollectionRate(
    @Req() req: any,
    @Query('days') days?: string,
  ): Promise<{ rate: number; days: number }> {
    const userId = req.auth.userId;
    const daysNum = days ? parseInt(days, 10) : 90;
    const rate = await this.reconciliationService.getCollectionRate(
      userId,
      daysNum,
    );
    return { rate, days: daysNum };
  }
}
