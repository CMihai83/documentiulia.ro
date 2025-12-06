import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ description: 'Product type', enum: ProductType })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiProperty({ description: 'Product name', example: 'Dezvoltare Software' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit (SKU)', example: 'PROD-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ description: 'Unit price', example: 150 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'ora', default: 'buc' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ description: 'VAT rate percentage', example: 19, default: 19 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({ description: 'Is VAT exempt', default: false })
  @IsOptional()
  @IsBoolean()
  vatExempt?: boolean;

  @ApiPropertyOptional({ description: 'Track inventory', default: false })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Stock quantity', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'Low stock alert threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockAlert?: number;

  @ApiPropertyOptional({ description: 'NC code for SAF-T' })
  @IsOptional()
  @IsString()
  ncCode?: string;

  @ApiPropertyOptional({ description: 'Is product active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
