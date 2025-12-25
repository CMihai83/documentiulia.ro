import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';

export enum InvoiceTypeDto {
  ISSUED = 'ISSUED',
  RECEIVED = 'RECEIVED',
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Invoice number', example: 'INV-2025-001' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ description: 'Invoice date', example: '2025-01-15' })
  @IsDateString()
  invoiceDate: string;

  @ApiPropertyOptional({ description: 'Due date', example: '2025-02-15' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ enum: InvoiceTypeDto, description: 'Invoice type' })
  @IsEnum(InvoiceTypeDto)
  type: InvoiceTypeDto;

  @ApiProperty({ description: 'Partner/Customer name', example: 'Client Alpha SRL' })
  @IsString()
  partnerName: string;

  @ApiPropertyOptional({ description: 'Partner CUI (Romanian company ID)', example: 'RO12345678' })
  @IsString()
  @IsOptional()
  partnerCui?: string;

  @ApiPropertyOptional({ description: 'Partner address' })
  @IsString()
  @IsOptional()
  partnerAddress?: string;

  @ApiProperty({ description: 'Net amount (without VAT)', example: 10000 })
  @IsNumber()
  @Min(0)
  netAmount: number;

  @ApiProperty({ description: 'VAT rate per Legea 141/2025 (21% or 11%)', example: 21 })
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'RON' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange rate to base currency (auto-fetched if not provided)' })
  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Company base/functional currency', default: 'RON' })
  @IsString()
  @IsOptional()
  baseCurrency?: string;
}
