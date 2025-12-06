import { IsString, IsBoolean, IsOptional, IsNumber, IsEmail, IsUrl, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name', example: 'Tech Solutions SRL' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'CUI/CIF (tax ID)', example: 'RO12345678' })
  @IsString()
  cui!: string;

  @ApiPropertyOptional({ description: 'Trade registry number', example: 'J40/1234/2020' })
  @IsOptional()
  @IsString()
  regCom?: string;

  @ApiPropertyOptional({ description: 'European Unique Identifier' })
  @IsOptional()
  @IsString()
  euid?: string;

  @ApiPropertyOptional({ description: 'Company address', example: 'Str. Victoriei nr. 100' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'București' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'County/State', example: 'București' })
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '010001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country code', default: 'RO' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Company email', example: 'contact@company.ro' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+40 21 123 4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL', example: 'https://company.ro' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Bank name', example: 'Banca Transilvania' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account IBAN', example: 'RO49BTRL0301207123456789' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'SWIFT/BIC code' })
  @IsOptional()
  @IsString()
  swift?: string;

  @ApiPropertyOptional({ description: 'Is VAT payer', default: false })
  @IsOptional()
  @IsBoolean()
  vatPayer?: boolean;

  @ApiPropertyOptional({ description: 'VAT number (RO + CUI)', example: 'RO12345678' })
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'VAT rate percentage', example: 19, default: 19 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;
}
