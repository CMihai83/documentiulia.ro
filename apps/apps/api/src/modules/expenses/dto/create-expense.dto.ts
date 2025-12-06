import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsDateString, IsArray, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Expense description', example: 'Consumabile birou Q1 2024' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Expense category', enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiPropertyOptional({ description: 'Vendor name', example: 'Office Pro SRL' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Vendor CUI', example: 'RO12345678' })
  @IsOptional()
  @IsString()
  vendorCui?: string;

  @ApiProperty({ description: 'Amount (without VAT)', example: 450 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: 'VAT amount', example: 85.50, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount?: number;

  @ApiPropertyOptional({ description: 'VAT rate', example: 19, default: 19 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Is deductible', default: true })
  @IsOptional()
  @IsBoolean()
  isDeductible?: boolean;

  @ApiPropertyOptional({ description: 'Deductible percentage', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  deductiblePercent?: number;

  @ApiProperty({ description: 'Expense date', example: '2024-01-15' })
  @IsDateString()
  expenseDate!: string;

  @ApiPropertyOptional({ description: 'Payment method (cash, card, transfer)' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Is expense paid', default: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Supplier invoice number' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
