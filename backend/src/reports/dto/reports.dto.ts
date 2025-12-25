import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum ReportPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReportPeriod })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({ description: 'Currency (RON, EUR)' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class ProfitLossItemDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  previousAmount?: number;

  @ApiProperty()
  percentChange?: number;
}

export class ProfitLossReportDto {
  @ApiProperty()
  period: { start: string; end: string };

  @ApiProperty()
  currency: string;

  // Venituri (Revenue)
  @ApiProperty({ type: [ProfitLossItemDto] })
  revenue: ProfitLossItemDto[];

  @ApiProperty()
  totalRevenue: number;

  // Cheltuieli (Expenses)
  @ApiProperty({ type: [ProfitLossItemDto] })
  expenses: ProfitLossItemDto[];

  @ApiProperty()
  totalExpenses: number;

  // Profit brut (Gross Profit)
  @ApiProperty()
  grossProfit: number;

  // TVA
  @ApiProperty()
  vatCollected: number;

  @ApiProperty()
  vatDeductible: number;

  @ApiProperty()
  vatPayable: number;

  // Profit net (Net Profit)
  @ApiProperty()
  netProfit: number;

  @ApiProperty()
  profitMargin: number;

  // Comparison with previous period
  @ApiProperty()
  previousPeriod?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
  };
}

export class BalanceSheetItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  previousAmount?: number;
}

export class BalanceSheetReportDto {
  @ApiProperty()
  asOfDate: string;

  @ApiProperty()
  currency: string;

  // Active (Assets)
  @ApiProperty({ type: [BalanceSheetItemDto] })
  currentAssets: BalanceSheetItemDto[];

  @ApiProperty()
  totalCurrentAssets: number;

  @ApiProperty({ type: [BalanceSheetItemDto] })
  fixedAssets: BalanceSheetItemDto[];

  @ApiProperty()
  totalFixedAssets: number;

  @ApiProperty()
  totalAssets: number;

  // Pasive (Liabilities)
  @ApiProperty({ type: [BalanceSheetItemDto] })
  currentLiabilities: BalanceSheetItemDto[];

  @ApiProperty()
  totalCurrentLiabilities: number;

  @ApiProperty({ type: [BalanceSheetItemDto] })
  longTermLiabilities: BalanceSheetItemDto[];

  @ApiProperty()
  totalLongTermLiabilities: number;

  @ApiProperty()
  totalLiabilities: number;

  // Capitaluri proprii (Equity)
  @ApiProperty({ type: [BalanceSheetItemDto] })
  equity: BalanceSheetItemDto[];

  @ApiProperty()
  totalEquity: number;

  // Verificare bilant (Assets = Liabilities + Equity)
  @ApiProperty()
  isBalanced: boolean;
}

export class CashFlowReportDto {
  @ApiProperty()
  period: { start: string; end: string };

  @ApiProperty()
  currency: string;

  // Flux numerar din activitati operationale
  @ApiProperty()
  operatingActivities: {
    cashFromCustomers: number;
    cashToSuppliers: number;
    cashToEmployees: number;
    vatPaid: number;
    netOperating: number;
  };

  // Flux numerar din activitati de investitii
  @ApiProperty()
  investingActivities: {
    purchaseOfAssets: number;
    saleOfAssets: number;
    netInvesting: number;
  };

  // Flux numerar din activitati de finantare
  @ApiProperty()
  financingActivities: {
    loansReceived: number;
    loansRepaid: number;
    dividendsPaid: number;
    netFinancing: number;
  };

  @ApiProperty()
  netCashFlow: number;

  @ApiProperty()
  openingBalance: number;

  @ApiProperty()
  closingBalance: number;
}

export class TrendDataDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  expenses: number;

  @ApiProperty()
  profit: number;

  @ApiProperty()
  vatPayable: number;
}

export class FinancialSummaryDto {
  @ApiProperty()
  currentPeriod: {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
    invoicesIssued: number;
    invoicesReceived: number;
    paymentsPending: number;
    overdueAmount: number;
  };

  @ApiProperty()
  trends: TrendDataDto[];

  @ApiProperty()
  topCustomers: {
    name: string;
    cui: string;
    totalAmount: number;
    invoiceCount: number;
  }[];

  @ApiProperty()
  topSuppliers: {
    name: string;
    cui: string;
    totalAmount: number;
    invoiceCount: number;
  }[];
}
