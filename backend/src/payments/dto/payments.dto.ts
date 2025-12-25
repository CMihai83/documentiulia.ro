import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  CASH = 'CASH',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

export enum PaymentRecordStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Invoice ID to record payment for' })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ description: 'Payment amount', example: 1000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paymentDate?: Date;

  @ApiPropertyOptional({ description: 'Payment reference (bank transfer ref, card last 4)' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Bank name for wire transfers' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account (IBAN)' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Payment status', enum: PaymentRecordStatus })
  @IsOptional()
  @IsEnum(PaymentRecordStatus)
  status?: PaymentRecordStatus;
}

export class UpdatePaymentDto {
  @ApiPropertyOptional({ description: 'Payment amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ description: 'Payment method', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paymentDate?: Date;

  @ApiPropertyOptional({ description: 'Payment reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account (IBAN)' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Payment status', enum: PaymentRecordStatus })
  @IsOptional()
  @IsEnum(PaymentRecordStatus)
  status?: PaymentRecordStatus;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ description: 'Invoice ID to filter by' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Payment method filter', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment status filter', enum: PaymentRecordStatus })
  @IsOptional()
  @IsEnum(PaymentRecordStatus)
  status?: PaymentRecordStatus;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class PaymentSummaryDto {
  @ApiProperty({ description: 'Total payments amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Number of payments' })
  count: number;

  @ApiProperty({ description: 'Payments by method' })
  byMethod: Record<string, number>;

  @ApiProperty({ description: 'Payments by status' })
  byStatus: Record<string, number>;
}
