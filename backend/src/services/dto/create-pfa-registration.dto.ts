import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PfaActivityType {
  PRODUCTION = 'PRODUCTION', // Producție
  SERVICES = 'SERVICES', // Prestări servicii
  COMMERCE = 'COMMERCE', // Comerț
  MIXED = 'MIXED', // Activități mixte
}

export class PfaActivityDto {
  @ApiProperty({ description: 'Cod CAEN', example: '6201' })
  @IsString()
  @IsNotEmpty()
  caenCode: string;

  @ApiProperty({ description: 'Descriere activitate' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Este activitate principală?', default: false })
  @IsOptional()
  isPrimary?: boolean;
}

export class CreatePfaRegistrationDto {
  @ApiProperty({ description: 'Nume complet persoană fizică', example: 'Popescu Ion' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ description: 'CNP', example: '1234567890123' })
  @IsString()
  @MinLength(13)
  @MaxLength(13)
  cnp: string;

  @ApiProperty({ description: 'Serie și număr carte de identitate', example: 'AB123456' })
  @IsString()
  @IsNotEmpty()
  idCardNumber: string;

  @ApiProperty({ description: 'Eliberat de', example: 'SPCEP Sector 1' })
  @IsString()
  @IsNotEmpty()
  idCardIssuedBy: string;

  @ApiProperty({ description: 'Data eliberării (ISO 8601)', example: '2020-01-15' })
  @IsString()
  @IsNotEmpty()
  idCardIssuedDate: string;

  @ApiProperty({ description: 'Județ domiciliu', example: 'București' })
  @IsString()
  @IsNotEmpty()
  county: string;

  @ApiProperty({ description: 'Oraș domiciliu', example: 'București' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ description: 'Sector (dacă e București)', example: '1' })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiProperty({ description: 'Strada', example: 'Calea Victoriei' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'Număr', example: '123' })
  @IsString()
  @IsNotEmpty()
  streetNumber: string;

  @ApiPropertyOptional({ description: 'Bloc' })
  @IsString()
  @IsOptional()
  building?: string;

  @ApiPropertyOptional({ description: 'Scară' })
  @IsString()
  @IsOptional()
  staircase?: string;

  @ApiPropertyOptional({ description: 'Etaj' })
  @IsString()
  @IsOptional()
  floor?: string;

  @ApiPropertyOptional({ description: 'Apartament' })
  @IsString()
  @IsOptional()
  apartment?: string;

  @ApiProperty({ description: 'Cod poștal', example: '010101' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Telefon', example: '+40721234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Denumire comercială PFA (opțional)', example: 'Web Design Services' })
  @IsString()
  @IsOptional()
  tradeName?: string;

  @ApiProperty({ description: 'Tip activitate', enum: PfaActivityType })
  @IsEnum(PfaActivityType)
  activityType: PfaActivityType;

  @ApiProperty({ description: 'Activități CAEN', type: [PfaActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PfaActivityDto)
  activities: PfaActivityDto[];

  @ApiProperty({ description: 'Descriere detaliată activitate principală' })
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(1000)
  activityDescription: string;

  @ApiProperty({ description: 'Adresa unde se desfășoară activitatea (dacă diferită de domiciliu)' })
  @IsString()
  @IsOptional()
  businessAddress?: string;

  @ApiProperty({ description: 'Are nevoie de spațiu comercial înregistrat?', default: false })
  @IsBoolean()
  @IsOptional()
  needsCommercialSpace?: boolean;

  @ApiProperty({ description: 'Număr aproximativ de angajați preconizați', default: 0 })
  @IsOptional()
  expectedEmployees?: number;

  @ApiPropertyOptional({ description: 'Observații speciale' })
  @IsString()
  @IsOptional()
  notes?: string;
}
