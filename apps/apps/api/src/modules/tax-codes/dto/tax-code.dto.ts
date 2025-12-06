import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TaxType {
  VAT_STANDARD = 'VAT_STANDARD',       // 19% (legacy) / transitional
  VAT_STANDARD_21 = 'VAT_STANDARD_21', // 21% - from Aug 2025
  VAT_REDUCED_9 = 'VAT_REDUCED_9',     // 9% - legacy
  VAT_REDUCED_11 = 'VAT_REDUCED_11',   // 11% - from Aug 2025
  VAT_REDUCED_5 = 'VAT_REDUCED_5',     // 5% - super-reduced
  VAT_ZERO = 'VAT_ZERO',
  VAT_EXEMPT = 'VAT_EXEMPT',
  INCOME_TAX = 'INCOME_TAX',
  SOCIAL_CONTRIB = 'SOCIAL_CONTRIB',
  DIVIDEND_TAX = 'DIVIDEND_TAX',       // 8% (legacy) / 10% from Jan 2026
}

export class CreateTaxCodeDto {
  @ApiProperty({ description: 'Tax code identifier' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Tax code name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Tax rate percentage' })
  @IsNumber()
  rate!: number;

  @ApiProperty({ enum: TaxType, description: 'Type of tax' })
  @IsEnum(TaxType)
  type!: TaxType;

  @ApiPropertyOptional({ description: 'SAF-T code for Romanian tax authority' })
  @IsOptional()
  @IsString()
  saftCode?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default tax code' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateTaxCodeDto {
  @ApiPropertyOptional({ description: 'Tax code name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tax rate percentage' })
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional({ enum: TaxType, description: 'Type of tax' })
  @IsOptional()
  @IsEnum(TaxType)
  type?: TaxType;

  @ApiPropertyOptional({ description: 'SAF-T code' })
  @IsOptional()
  @IsString()
  saftCode?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default tax code' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether the tax code is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TaxCodeFilterDto {
  @ApiPropertyOptional({ enum: TaxType })
  @IsOptional()
  @IsEnum(TaxType)
  type?: TaxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
