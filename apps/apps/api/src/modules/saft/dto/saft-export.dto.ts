import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SaftExportType {
  FULL = 'FULL',
  INVOICES = 'INVOICES',
  GENERAL_LEDGER = 'GENERAL_LEDGER',
  PAYMENTS = 'PAYMENTS',
}

export class SaftExportDto {
  @ApiProperty({ description: 'Start date for export period' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date for export period' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: SaftExportType, default: SaftExportType.FULL })
  @IsOptional()
  @IsEnum(SaftExportType)
  exportType?: SaftExportType;

  @ApiPropertyOptional({ description: 'Declaration ID for D406 submission' })
  @IsOptional()
  @IsString()
  declarationId?: string;
}

export class SaftValidationResultDto {
  isValid!: boolean;
  errors!: string[];
  warnings!: string[];
  summary!: {
    totalInvoices: number;
    totalVatAmount: number;
    totalAmount: number;
    period: string;
  };
}
