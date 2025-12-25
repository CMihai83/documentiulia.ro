import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsBoolean, Min, Max } from 'class-validator';

export enum InvoiceStatusDto {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUBMITTED = 'SUBMITTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Invoice date' })
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: InvoiceStatusDto, description: 'Invoice status' })
  @IsEnum(InvoiceStatusDto)
  @IsOptional()
  status?: InvoiceStatusDto;

  @ApiPropertyOptional({ description: 'Partner/Customer name' })
  @IsString()
  @IsOptional()
  partnerName?: string;

  @ApiPropertyOptional({ description: 'Partner CUI' })
  @IsString()
  @IsOptional()
  partnerCui?: string;

  @ApiPropertyOptional({ description: 'Partner address' })
  @IsString()
  @IsOptional()
  partnerAddress?: string;

  @ApiPropertyOptional({ description: 'Net amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  netAmount?: number;

  @ApiPropertyOptional({ description: 'VAT rate' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  vatRate?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'SPV submitted flag' })
  @IsBoolean()
  @IsOptional()
  spvSubmitted?: boolean;
}
