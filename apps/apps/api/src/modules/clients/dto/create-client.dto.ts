import { IsString, IsEnum, IsOptional, IsEmail, IsNumber, MaxLength, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty({ description: 'Client type', enum: ClientType })
  @IsEnum(ClientType)
  type!: ClientType;

  @ApiProperty({ description: 'Client name or company name', example: 'ABC Industries SRL' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'CUI/CIF for companies', example: 'RO12345678' })
  @IsOptional()
  @IsString()
  cui?: string;

  @ApiPropertyOptional({ description: 'Trade registry number', example: 'J40/1234/2020' })
  @IsOptional()
  @IsString()
  regCom?: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact email', example: 'contact@client.ro' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone', example: '+40 21 123 4567' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Address', example: 'Str. Industriei nr. 10' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'București' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'County', example: 'București' })
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'RO' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '010001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Bank name', example: 'Banca Transilvania' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account IBAN', example: 'RO49BTRL0301207123456789' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'Default payment terms in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPaymentTerms?: number;

  @ApiPropertyOptional({ description: 'Credit limit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

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
