import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Account name', example: 'Main Business Account' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Bank name', example: 'BCR' })
  @IsString()
  bankName!: string;

  @ApiProperty({ description: 'IBAN', example: 'RO49AAAA1B31007593840000' })
  @IsString()
  iban!: string;

  @ApiPropertyOptional({ description: 'SWIFT/BIC code' })
  @IsOptional()
  @IsString()
  swift?: string;

  @ApiPropertyOptional({ description: 'Account currency', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Initial balance' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  balance?: number;

  @ApiPropertyOptional({ description: 'Is default account', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBankAccountDto extends PartialType(CreateBankAccountDto) {}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Transaction date' })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({ description: 'Value date' })
  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @ApiProperty({ description: 'Transaction description' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Transaction type', enum: TransactionType })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @ApiPropertyOptional({ description: 'Is reconciled', default: false })
  @IsOptional()
  @IsBoolean()
  isReconciled?: boolean;
}

export class TransactionFilterDto {
  @ApiPropertyOptional({ description: 'Filter by type', enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Filter by reconciled status' })
  @IsOptional()
  @IsBoolean()
  isReconciled?: boolean;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
