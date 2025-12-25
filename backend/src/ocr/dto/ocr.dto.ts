import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum DocumentType {
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  CONTRACT = 'CONTRACT',
  OTHER = 'OTHER',
}

export enum OCRStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

export class BoundingBoxDto {
  @ApiProperty({ description: 'X position (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  x: number;

  @ApiProperty({ description: 'Y position (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  y: number;

  @ApiProperty({ description: 'Width (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  width: number;

  @ApiProperty({ description: 'Height (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  height: number;
}

export class ExtractedFieldDto {
  @ApiProperty({ description: 'Field name' })
  @IsString()
  fieldName: string;

  @ApiPropertyOptional({ description: 'Extracted value' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({ description: 'Confidence score 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Bounding box for the field' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BoundingBoxDto)
  boundingBox?: BoundingBoxDto;
}

export class ProcessOCRDto {
  @ApiPropertyOptional({ description: 'Template ID to use for extraction' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Document type hint', enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ description: 'Language hint (ro, en, de)', default: 'ro' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class BatchProcessOCRDto {
  @ApiProperty({ description: 'Document IDs to process' })
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];

  @ApiPropertyOptional({ description: 'Template ID for batch processing' })
  @IsOptional()
  @IsString()
  templateId?: string;
}

export class CorrectOCRDto {
  @ApiProperty({ description: 'Corrected fields' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectedFieldDto)
  corrections: CorrectedFieldDto[];

  @ApiPropertyOptional({ description: 'Save as template for future extractions' })
  @IsOptional()
  saveAsTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Template name if saving' })
  @IsOptional()
  @IsString()
  templateName?: string;
}

export class CorrectedFieldDto {
  @ApiProperty({ description: 'Field name' })
  @IsString()
  fieldName: string;

  @ApiProperty({ description: 'Original extracted value' })
  @IsOptional()
  @IsString()
  originalValue?: string;

  @ApiProperty({ description: 'Corrected value' })
  @IsString()
  correctedValue: string;
}

export class ExtractedInvoiceFieldsDto {
  [key: string]: ExtractedFieldDto | undefined;

  @ApiPropertyOptional()
  invoiceNumber?: ExtractedFieldDto;

  @ApiPropertyOptional()
  invoiceDate?: ExtractedFieldDto;

  @ApiPropertyOptional()
  dueDate?: ExtractedFieldDto;

  @ApiPropertyOptional()
  supplierName?: ExtractedFieldDto;

  @ApiPropertyOptional()
  supplierCui?: ExtractedFieldDto;

  @ApiPropertyOptional()
  supplierAddress?: ExtractedFieldDto;

  @ApiPropertyOptional()
  customerName?: ExtractedFieldDto;

  @ApiPropertyOptional()
  customerCui?: ExtractedFieldDto;

  @ApiPropertyOptional()
  customerAddress?: ExtractedFieldDto;

  @ApiPropertyOptional()
  netAmount?: ExtractedFieldDto;

  @ApiPropertyOptional()
  vatRate?: ExtractedFieldDto;

  @ApiPropertyOptional()
  vatAmount?: ExtractedFieldDto;

  @ApiPropertyOptional()
  grossAmount?: ExtractedFieldDto;

  @ApiPropertyOptional()
  currency?: ExtractedFieldDto;

  // Receipt specific
  @ApiPropertyOptional()
  receiptNumber?: ExtractedFieldDto;

  @ApiPropertyOptional()
  cashRegisterNo?: ExtractedFieldDto;

  // Contract specific
  @ApiPropertyOptional()
  contractNumber?: ExtractedFieldDto;

  @ApiPropertyOptional()
  effectiveDate?: ExtractedFieldDto;
}

export class OCRResultDto {
  @ApiProperty({ description: 'Document ID' })
  documentId: string;

  @ApiProperty({ description: 'Processing status', enum: OCRStatus })
  status: OCRStatus;

  @ApiPropertyOptional({ description: 'Template used' })
  templateId?: string;

  @ApiProperty({ description: 'Detected document type', enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty({ description: 'Overall confidence score' })
  overallConfidence: number;

  @ApiProperty({ description: 'Extracted fields' })
  fields: ExtractedInvoiceFieldsDto;

  @ApiPropertyOptional({ description: 'Raw OCR text' })
  rawText?: string;

  @ApiPropertyOptional({ description: 'Processing time in ms' })
  processingTimeMs?: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  errorMessage?: string;
}

export class ConvertToInvoiceDto {
  @ApiPropertyOptional({ description: 'Override extracted customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Override extracted partner ID' })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Create as draft invoice' })
  @IsOptional()
  asDraft?: boolean;
}

export class ZoneDto {
  @ApiProperty({ description: 'X position (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  x: number;

  @ApiProperty({ description: 'Y position (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  y: number;

  @ApiProperty({ description: 'Width (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  width: number;

  @ApiProperty({ description: 'Height (percentage)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  height: number;
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Document type', enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({ description: 'Language (ro, en, de)', default: 'ro' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Zone definitions for fields' })
  @IsOptional()
  zones?: Record<string, ZoneDto>;

  @ApiPropertyOptional({ description: 'Custom AI prompt' })
  @IsOptional()
  @IsString()
  aiPrompt?: string;

  @ApiPropertyOptional({ description: 'Regex patterns for auto-matching' })
  @IsOptional()
  matchPatterns?: Record<string, string>;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Document type', enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ description: 'Language (ro, en, de)' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Zone definitions for fields' })
  @IsOptional()
  zones?: Record<string, ZoneDto>;

  @ApiPropertyOptional({ description: 'Custom AI prompt' })
  @IsOptional()
  @IsString()
  aiPrompt?: string;

  @ApiPropertyOptional({ description: 'Regex patterns for auto-matching' })
  @IsOptional()
  matchPatterns?: Record<string, string>;
}
