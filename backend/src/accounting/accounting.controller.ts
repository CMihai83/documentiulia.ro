import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountingService } from './accounting.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('chart-of-accounts')
  @ApiOperation({ summary: 'Get Chart of Accounts with balances' })
  async getChartOfAccounts(@Request() req: any) {
    const accounts = await this.accountingService.getChartOfAccounts(req.user.sub);
    return {
      accounts,
      count: accounts.length,
    };
  }

  @Get('general-ledger')
  @ApiOperation({ summary: 'Get General Ledger (detailed account movements)' })
  @ApiQuery({ name: 'accountCode', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getGeneralLedger(
    @Request() req: any,
    @Query('accountCode') accountCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const entries = await this.accountingService.getGeneralLedger(req.user.sub, {
      accountCode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // Group by account
    const byAccount = entries.reduce((acc, entry) => {
      if (!acc[entry.accountCode]) {
        acc[entry.accountCode] = {
          accountCode: entry.accountCode,
          accountName: entry.accountName,
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
        };
      }
      acc[entry.accountCode].entries.push(entry);
      acc[entry.accountCode].totalDebit += entry.debit;
      acc[entry.accountCode].totalCredit += entry.credit;
      return acc;
    }, {} as Record<string, any>);

    return {
      entries,
      byAccount: Object.values(byAccount),
      count: entries.length,
    };
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'Get Journal Entries' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getJournalEntries(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const entries = await this.accountingService.getJournalEntries(req.user.sub, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });

    return {
      entries,
      count: entries.length,
    };
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get Trial Balance (Balanta de Verificare)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getTrialBalance(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const rows = await this.accountingService.getTrialBalance(req.user.sub, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    const totals = rows.reduce(
      (acc, row) => ({
        openingDebit: acc.openingDebit + row.openingDebit,
        openingCredit: acc.openingCredit + row.openingCredit,
        periodDebit: acc.periodDebit + row.periodDebit,
        periodCredit: acc.periodCredit + row.periodCredit,
        closingDebit: acc.closingDebit + row.closingDebit,
        closingCredit: acc.closingCredit + row.closingCredit,
      }),
      {
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      },
    );

    return {
      rows,
      totals,
      balanced: Math.abs(totals.closingDebit - totals.closingCredit) < 0.01,
      count: rows.length,
    };
  }

  @Get('statements/balance-sheet')
  @ApiOperation({ summary: 'Get Balance Sheet (Bilant)' })
  @ApiQuery({ name: 'asOfDate', required: false })
  async getBalanceSheet(
    @Request() req: any,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    return await this.accountingService.getBalanceSheet(req.user.sub, date);
  }

  @Get('statements/profit-loss')
  @ApiOperation({ summary: 'Get Profit & Loss Statement (Cont de Profit si Pierdere)' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getProfitLoss(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.accountingService.getProfitLoss(
      req.user.sub,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('statements/cash-flow')
  @ApiOperation({ summary: 'Get Cash Flow Statement' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getCashFlow(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.accountingService.getCashFlow(
      req.user.sub,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('export/trial-balance')
  @ApiOperation({ summary: 'Export Trial Balance to CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportTrialBalance(
    @Request() req: any,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const rows = await this.accountingService.getTrialBalance(req.user.sub, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    const csv = [
      'Cont,Denumire,Tip,Rulaj Debit,Rulaj Credit,Sold Final Debit,Sold Final Credit',
      ...rows.map(r =>
        `${r.accountCode},"${r.accountName}",${r.accountType},${r.periodDebit},${r.periodCredit},${r.closingDebit},${r.closingCredit}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="balanta_verificare.csv"');
    res.status(HttpStatus.OK).send(csv);
  }

  // =================== YEAR-END CLOSING WIZARD ===================

  @Post('year-end-closing/:year')
  @ApiOperation({ summary: 'Initiate year-end closing process (Inchidere An Fiscal)' })
  @ApiQuery({ name: 'year', description: 'Fiscal year to close (e.g., 2024)' })
  async initiateYearEndClosing(
    @Request() req: any,
    @Query('year') year: string,
  ) {
    const fiscalYear = parseInt(year, 10);
    if (isNaN(fiscalYear) || fiscalYear < 2000 || fiscalYear > new Date().getFullYear()) {
      return {
        error: 'Invalid fiscal year',
        message: 'Anul fiscal trebuie sa fie intre 2000 si anul curent',
      };
    }
    return this.accountingService.initiateYearEndClosing(req.user.sub, fiscalYear);
  }

  @Get('year-end-closing/:year/checklist')
  @ApiOperation({ summary: 'Get year-end closing checklist (Lista verificare inchidere an)' })
  async getYearEndChecklist(
    @Request() req: any,
    @Query('year') year: string,
  ) {
    const fiscalYear = parseInt(year, 10);
    if (isNaN(fiscalYear) || fiscalYear < 2000 || fiscalYear > new Date().getFullYear()) {
      return {
        error: 'Invalid fiscal year',
        message: 'Anul fiscal trebuie sa fie intre 2000 si anul curent',
      };
    }
    return this.accountingService.getYearEndChecklist(req.user.sub, fiscalYear);
  }

  @Get('year-end-closing/:year/preview')
  @ApiOperation({ summary: 'Preview year-end closing (all reports and entries without posting)' })
  async previewYearEndClosing(
    @Request() req: any,
    @Query('year') year: string,
  ) {
    const fiscalYear = parseInt(year, 10);
    if (isNaN(fiscalYear)) {
      return { error: 'Invalid year' };
    }

    // Get all the reports without posting
    const startDate = new Date(fiscalYear, 0, 1);
    const endDate = new Date(fiscalYear, 11, 31);

    const [trialBalance, profitLoss, balanceSheet, cashFlow] = await Promise.all([
      this.accountingService.getTrialBalance(req.user.sub, { startDate, endDate }),
      this.accountingService.getProfitLoss(req.user.sub, startDate, endDate),
      this.accountingService.getBalanceSheet(req.user.sub, endDate),
      this.accountingService.getCashFlow(req.user.sub, startDate, endDate),
    ]);

    return {
      fiscalYear,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      reports: {
        trialBalance: {
          accounts: trialBalance.length,
          totalDebit: trialBalance.reduce((s, r) => s + r.closingDebit, 0),
          totalCredit: trialBalance.reduce((s, r) => s + r.closingCredit, 0),
        },
        profitLoss: {
          revenue: profitLoss.data.revenues.total,
          expenses: profitLoss.data.expenses.total,
          netIncome: profitLoss.data.netIncome,
        },
        balanceSheet: {
          assets: balanceSheet.data.assets.total,
          liabilities: balanceSheet.data.liabilities.total,
          equity: balanceSheet.data.equity.total,
          balanced: balanceSheet.data.balanced,
        },
        cashFlow: {
          operating: cashFlow.data.operatingActivities.total,
          investing: cashFlow.data.investingActivities.total,
          financing: cashFlow.data.financingActivities.total,
          netChange: cashFlow.data.netCashChange,
        },
      },
      readyForClosing: balanceSheet.data.balanced,
    };
  }

  // =================== PROFIT MARGIN ANALYSIS ===================

  @Get('profit-margin')
  @ApiOperation({ summary: 'Get comprehensive profit margin analysis (Analiza marjei de profit)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['month', 'quarter', 'year'], description: 'Group trends by period' })
  @ApiQuery({ name: 'compareWithPrevious', required: false, type: Boolean, description: 'Compare with previous period' })
  async getProfitMarginAnalysis(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'month' | 'quarter' | 'year',
    @Query('compareWithPrevious') compareWithPrevious?: string,
  ) {
    return this.accountingService.getProfitMarginAnalysis(req.user.sub, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy: groupBy || 'month',
      compareWithPrevious: compareWithPrevious === 'true',
    });
  }

  @Get('contribution-margin')
  @ApiOperation({ summary: 'Get contribution margin analysis with break-even (Analiza marjei de contribuție)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  async getContributionMarginAnalysis(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getContributionMarginAnalysis(req.user.sub, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('financial-ratios')
  @ApiOperation({ summary: 'Get comprehensive financial ratios dashboard (Indicatori financiari)' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'Date for ratio calculation (YYYY-MM-DD)' })
  @ApiQuery({ name: 'compareWithPrevious', required: false, type: Boolean, description: 'Compare with previous year' })
  async getFinancialRatios(
    @Request() req: any,
    @Query('asOfDate') asOfDate?: string,
    @Query('compareWithPrevious') compareWithPrevious?: string,
  ) {
    return this.accountingService.getFinancialRatios(req.user.sub, {
      asOfDate: asOfDate ? new Date(asOfDate) : undefined,
      compareWithPrevious: compareWithPrevious === 'true',
    });
  }

  // =================== REVENUE RECOGNITION (IFRS 15) ===================

  @Post('deferred-revenue')
  @ApiOperation({ summary: 'Create deferred revenue record (Creare venit amânat)' })
  async createDeferredRevenue(
    @Request() req: any,
    @Body() data: {
      invoiceId: string;
      contractId?: string;
      customerId: string;
      customerName: string;
      totalAmount: number;
      currency: string;
      serviceStartDate: string;
      serviceEndDate: string;
      recognitionMethod: 'straight_line' | 'milestone' | 'percentage_completion' | 'point_in_time';
      description: string;
      accountCode?: string;
    },
  ) {
    return this.accountingService.createDeferredRevenue(req.user.sub, {
      ...data,
      serviceStartDate: new Date(data.serviceStartDate),
      serviceEndDate: new Date(data.serviceEndDate),
    });
  }

  @Post('revenue-recognition/process')
  @ApiOperation({ summary: 'Process revenue recognition for a period (Procesare recunoaștere venituri)' })
  @ApiQuery({ name: 'period', required: true, description: 'Period to process (YYYY-MM)' })
  async processRevenueRecognition(
    @Request() req: any,
    @Query('period') period: string,
  ) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return {
        error: 'Invalid period format',
        message: 'Perioada trebuie să fie în format YYYY-MM (ex: 2024-12)',
      };
    }
    return this.accountingService.processRevenueRecognition(req.user.sub, period);
  }

  @Get('deferred-revenue/summary')
  @ApiOperation({ summary: 'Get deferred revenue summary (Sumar venituri amânate)' })
  async getDeferredRevenueSummary(@Request() req: any) {
    return this.accountingService.getDeferredRevenueSummary(req.user.sub);
  }

  @Get('deferred-revenue')
  @ApiOperation({ summary: 'Get deferred revenue records (Lista venituri amânate)' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'fully_recognized', 'cancelled'] })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by service start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by service end date' })
  async getDeferredRevenueRecords(
    @Request() req: any,
    @Query('status') status?: 'active' | 'fully_recognized' | 'cancelled',
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getDeferredRevenueRecords(req.user.sub, {
      status,
      customerId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
