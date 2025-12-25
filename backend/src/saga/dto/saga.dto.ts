import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SagaPartnerDto {
  @ApiProperty({ description: 'Partner name', example: 'SC Exemplu SRL' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Partner CUI', example: 'RO12345678' })
  @IsString()
  cui: string;

  @ApiPropertyOptional({ description: 'Partner address' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class SagaInvoiceLineDto {
  @ApiProperty({ description: 'Line description', example: 'Servicii consultanta IT' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Quantity', example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit price in RON', example: 500 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ description: 'VAT rate percentage', example: 21 })
  @IsNumber()
  vatRate: number;
}

export class SagaInvoiceTotalsDto {
  @ApiProperty({ description: 'Net amount in RON' })
  @IsNumber()
  net: number;

  @ApiProperty({ description: 'VAT amount in RON' })
  @IsNumber()
  vat: number;

  @ApiProperty({ description: 'Gross amount in RON' })
  @IsNumber()
  gross: number;
}

export class SyncInvoiceDto {
  @ApiPropertyOptional({ description: 'Invoice ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Invoice number', example: 'FAC-2025-0001' })
  @IsString()
  number: string;

  @ApiProperty({ description: 'Invoice date', example: '2025-01-15' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'Partner details' })
  @ValidateNested()
  @Type(() => SagaPartnerDto)
  partner: SagaPartnerDto;

  @ApiProperty({ description: 'Invoice lines', type: [SagaInvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SagaInvoiceLineDto)
  lines: SagaInvoiceLineDto[];

  @ApiProperty({ description: 'Invoice totals' })
  @ValidateNested()
  @Type(() => SagaInvoiceTotalsDto)
  totals: SagaInvoiceTotalsDto;
}

export class SagaPayrollDto {
  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Gross salary in RON' })
  @IsNumber()
  grossSalary: number;

  @ApiProperty({ description: 'CAS contribution (25%)' })
  @IsNumber()
  cas: number;

  @ApiProperty({ description: 'CASS contribution (10%)' })
  @IsNumber()
  cass: number;

  @ApiProperty({ description: 'Income tax (10%)' })
  @IsNumber()
  incomeTax: number;

  @ApiProperty({ description: 'Net salary in RON' })
  @IsNumber()
  netSalary: number;
}

export class SagaInventoryDto {
  @ApiProperty({ description: 'Product code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Quantity in stock' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit price in RON' })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ description: 'VAT rate percentage' })
  @IsNumber()
  vatRate: number;
}

export class SagaConnectionStatusDto {
  @ApiProperty({ description: 'Connection status', example: true })
  connected: boolean;

  @ApiProperty({ description: 'SAGA API version', example: 'v3.2' })
  apiVersion: string;

  @ApiProperty({ description: 'Last sync timestamp' })
  lastSync: string | null;

  @ApiPropertyOptional({ description: 'Error message if not connected' })
  error?: string;
}

export class ValidateSaftDto {
  @ApiProperty({ description: 'SAF-T XML content' })
  @IsString()
  xml: string;
}
