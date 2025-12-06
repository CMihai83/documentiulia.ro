import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentType {
  INVOICE_PDF = 'INVOICE_PDF',
  RECEIPT = 'RECEIPT',
  CONTRACT = 'CONTRACT',
  REPORT = 'REPORT',
  EFACTURA_XML = 'EFACTURA_XML',
  SAFT_XML = 'SAFT_XML',
  OTHER = 'OTHER',
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'File URL' })
  @IsString()
  fileUrl!: string;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  fileName!: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize!: number;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType!: string;

  @ApiPropertyOptional({ enum: DocumentType, default: DocumentType.OTHER })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ description: 'Related invoice ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Related expense ID' })
  @IsOptional()
  @IsString()
  expenseId?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ description: 'Related invoice ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Related expense ID' })
  @IsOptional()
  @IsString()
  expenseId?: string;
}

export class DocumentFilterDto {
  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ description: 'Invoice ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Expense ID' })
  @IsOptional()
  @IsString()
  expenseId?: string;

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
