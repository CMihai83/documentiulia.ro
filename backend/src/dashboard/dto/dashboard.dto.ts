import { ApiProperty } from '@nestjs/swagger';

export class CashFlowItemDto {
  @ApiProperty({ description: 'Month name', example: 'Ian' })
  month: string;

  @ApiProperty({ description: 'Total income for the month', example: 45000 })
  income: number;

  @ApiProperty({ description: 'Total expenses for the month', example: 32000 })
  expenses: number;
}

export class VatSummaryItemDto {
  @ApiProperty({ description: 'VAT category name', example: 'TVA Colectat' })
  name: string;

  @ApiProperty({ description: 'VAT amount', example: 12600 })
  value: number;

  @ApiProperty({ description: 'Display color', example: '#3b82f6' })
  color: string;
}

export class ComplianceStatusItemDto {
  @ApiProperty({ description: 'Compliance item name', example: 'SAF-T D406' })
  name: string;

  @ApiProperty({ description: 'Status', enum: ['ok', 'pending', 'error'] })
  status: 'ok' | 'pending' | 'error';

  @ApiProperty({ description: 'Date of last update', example: '2025-01-15' })
  date: string;
}

export class RecentActivityItemDto {
  @ApiProperty({ description: 'Activity type', example: 'invoice' })
  type: 'invoice' | 'document' | 'audit' | 'payment';

  @ApiProperty({ description: 'Activity title', example: 'Invoice FV-2025-0042 created' })
  title: string;

  @ApiProperty({ description: 'Activity description', example: 'Client ABC SRL - 1,500 RON' })
  description: string;

  @ApiProperty({ description: 'Activity timestamp', example: '2025-12-07T10:30:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Related entity ID', required: false })
  entityId?: string;

  @ApiProperty({ description: 'Icon color', example: 'blue' })
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export class InvoiceStatusCountDto {
  @ApiProperty({ description: 'Invoice status', example: 'PAID' })
  status: string;

  @ApiProperty({ description: 'Count of invoices', example: 15 })
  count: number;

  @ApiProperty({ description: 'Display color', example: '#22c55e' })
  color: string;
}

export class DashboardSummaryDto {
  @ApiProperty({ type: [CashFlowItemDto], description: 'Monthly cash flow data' })
  cashFlow: CashFlowItemDto[];

  @ApiProperty({ type: [VatSummaryItemDto], description: 'VAT summary breakdown' })
  vatSummary: VatSummaryItemDto[];

  @ApiProperty({ type: [ComplianceStatusItemDto], description: 'Compliance status items' })
  complianceStatus: ComplianceStatusItemDto[];

  @ApiProperty({ type: [RecentActivityItemDto], description: 'Recent activity timeline' })
  recentActivity: RecentActivityItemDto[];

  @ApiProperty({ type: [InvoiceStatusCountDto], description: 'Invoice status breakdown' })
  invoiceStatusBreakdown: InvoiceStatusCountDto[];

  @ApiProperty({ description: 'Total income for period', example: 328000 })
  totalIncome: number;

  @ApiProperty({ description: 'Total expenses for period', example: 222000 })
  totalExpenses: number;

  @ApiProperty({ description: 'Total VAT collected', example: 12600 })
  vatCollected: number;

  @ApiProperty({ description: 'Total VAT deductible', example: 8400 })
  vatDeductible: number;

  @ApiProperty({ description: 'Total VAT payable', example: 4200 })
  vatPayable: number;

  @ApiProperty({ description: 'Total invoices count', example: 42 })
  invoiceCount: number;

  @ApiProperty({ description: 'Pending invoices count', example: 5 })
  pendingInvoices: number;
}
