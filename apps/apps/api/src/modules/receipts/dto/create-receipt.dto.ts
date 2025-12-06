import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OcrStatus } from '@prisma/client';

export class CreateReceiptDto {
  @ApiProperty({ description: 'File URL in storage' })
  @IsString()
  fileUrl!: string;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  fileName!: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize!: number;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType!: string;

  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Receipt date' })
  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @ApiPropertyOptional({ description: 'Total amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total?: number;

  @ApiPropertyOptional({ description: 'VAT amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount?: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateReceiptOcrDto {
  @ApiPropertyOptional({ description: 'OCR status', enum: OcrStatus })
  @IsOptional()
  @IsEnum(OcrStatus)
  ocrStatus?: OcrStatus;

  @ApiPropertyOptional({ description: 'OCR confidence score 0-100' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ocrConfidence?: number;

  @ApiPropertyOptional({ description: 'Raw OCR data as JSON' })
  @IsOptional()
  @IsObject()
  ocrRawData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Extracted line items as JSON' })
  @IsOptional()
  @IsObject()
  ocrItems?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Extracted vendor name' })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Extracted total amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total?: number;

  @ApiPropertyOptional({ description: 'Extracted VAT amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount?: number;

  @ApiPropertyOptional({ description: 'Extracted date' })
  @IsOptional()
  @IsDateString()
  receiptDate?: string;
}

export class LinkReceiptToExpenseDto {
  @ApiProperty({ description: 'Expense ID to link' })
  @IsString()
  expenseId!: string;
}
