import { IsNumber, IsOptional, IsBoolean, IsString, Min, Max, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculateVATDto {
  @ApiProperty({ description: 'Amount to calculate VAT for', example: 1000 })
  @IsNumber()
  @Min(0, { message: 'Amount must be non-negative' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'VAT rate per Legea 141/2025',
    example: 21,
    enum: [0, 5, 11, 21],
  })
  @IsNumber()
  @IsIn([0, 5, 11, 21], { message: 'VAT rate must be 0, 5, 11, or 21 per Legea 141/2025' })
  @Type(() => Number)
  rate: number;

  @ApiPropertyOptional({
    description: 'Is the amount gross (including VAT)?',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isGross?: boolean;
}

export class VATCategoryDto {
  @ApiProperty({
    description: 'Product/service category for VAT rate determination',
    example: 'food',
  })
  @IsString()
  category: string;
}

export class CalculateVATReportDto {
  @ApiProperty({
    description: 'Period for VAT calculation (YYYY-MM format)',
    example: '2025-01',
  })
  @IsString()
  @IsDateString()
  period: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Partner/client name', example: 'SC Example SRL' })
  @IsString()
  partner: string;

  @ApiProperty({ description: 'CUI/VAT number of partner', example: 'RO12345678' })
  @IsString()
  partnerCUI: string;

  @ApiProperty({ description: 'Invoice number', example: 'INV-2025-001' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ description: 'Invoice date', example: '2025-01-15' })
  @IsDateString()
  invoiceDate: string;

  @ApiPropertyOptional({ description: 'Due date', example: '2025-02-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Net amount in RON', example: 1000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  netAmount: number;

  @ApiProperty({ description: 'VAT rate', example: 21 })
  @IsNumber()
  @IsIn([0, 5, 11, 21])
  @Type(() => Number)
  vatRate: number;

  @ApiProperty({
    description: 'Invoice type',
    enum: ['ISSUED', 'RECEIVED'],
    example: 'ISSUED',
  })
  @IsIn(['ISSUED', 'RECEIVED'])
  type: 'ISSUED' | 'RECEIVED';

  @ApiPropertyOptional({ description: 'Invoice description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class VATSubmitDto {
  @ApiProperty({ description: 'Report ID to submit' })
  @IsString()
  reportId: string;

  @ApiPropertyOptional({ description: 'ANAF SPV certificate password' })
  @IsOptional()
  @IsString()
  certificatePassword?: string;
}
