import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber, IsEnum, MinLength, MaxLength, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CompanyType {
  SRL = 'SRL', // Societate cu Răspundere Limitată
  SRL_D = 'SRL-D', // SRL cu asociat unic
  SA = 'SA', // Societate pe Acțiuni
  SCS = 'SCS', // Societate în Comandită Simplă
  SCA = 'SCA', // Societate în Comandită pe Acțiuni
  SNC = 'SNC', // Societate în Nume Colectiv
}

export enum ShareholderType {
  INDIVIDUAL = 'INDIVIDUAL', // Persoană fizică
  COMPANY = 'COMPANY', // Persoană juridică
}

export class ShareholderDto {
  @ApiProperty({ description: 'Tip asociat', enum: ShareholderType })
  @IsEnum(ShareholderType)
  type: ShareholderType;

  @ApiProperty({ description: 'Nume complet / Denumire societate' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'CNP (pentru persoană fizică)' })
  @IsString()
  @IsOptional()
  cnp?: string;

  @ApiPropertyOptional({ description: 'CUI (pentru persoană juridică)' })
  @IsString()
  @IsOptional()
  cui?: string;

  @ApiProperty({ description: 'Adresă domiciliu / sediu' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Telefon' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Număr de acțiuni / părți sociale' })
  @IsNumber()
  @Min(1)
  shares: number;

  @ApiProperty({ description: 'Valoare totală aport (RON)' })
  @IsNumber()
  @Min(1)
  contribution: number;

  @ApiProperty({ description: 'Procent deținut (%)' })
  @IsNumber()
  @Min(0.01)
  @Max(100)
  percentage: number;
}

export class AdministratorDto {
  @ApiProperty({ description: 'Nume complet administrator' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'CNP administrator' })
  @IsString()
  @MinLength(13)
  @MaxLength(13)
  cnp: string;

  @ApiProperty({ description: 'Adresă domiciliu' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Telefon' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Este administrator unic?', default: false })
  @IsOptional()
  isSoleAdministrator?: boolean;
}

export class CompanyActivityDto {
  @ApiProperty({ description: 'Cod CAEN principal', example: '6201' })
  @IsString()
  @IsNotEmpty()
  caenCode: string;

  @ApiProperty({ description: 'Descriere activitate CAEN' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Este activitate principală?', default: false })
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateSrlRegistrationDto {
  @ApiProperty({ description: 'Tip societate', enum: CompanyType, default: CompanyType.SRL })
  @IsEnum(CompanyType)
  companyType: CompanyType;

  @ApiProperty({ description: 'Denumire societate (fără formă juridică)', example: 'TechInnovation' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  companyName: string;

  @ApiPropertyOptional({ description: 'Denumire alternativă 1' })
  @IsString()
  @IsOptional()
  alternativeName1?: string;

  @ApiPropertyOptional({ description: 'Denumire alternativă 2' })
  @IsString()
  @IsOptional()
  alternativeName2?: string;

  @ApiProperty({ description: 'Județ sediu social', example: 'București' })
  @IsString()
  @IsNotEmpty()
  county: string;

  @ApiProperty({ description: 'Oraș sediu social', example: 'București' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Sector (dacă e București)', example: '1' })
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

  @ApiProperty({ description: 'Capital social (RON)', example: 200, minimum: 200 })
  @IsNumber()
  @Min(200) // Minimum capital social pentru SRL în România
  shareCapital: number;

  @ApiProperty({ description: 'Număr total acțiuni / părți sociale', example: 200 })
  @IsNumber()
  @Min(1)
  totalShares: number;

  @ApiProperty({ description: 'Valoare nominală per acțiune (RON)', example: 1 })
  @IsNumber()
  @Min(0.01)
  shareNominalValue: number;

  @ApiProperty({ description: 'Lista asociați / acționari', type: [ShareholderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShareholderDto)
  shareholders: ShareholderDto[];

  @ApiProperty({ description: 'Lista administratori', type: [AdministratorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdministratorDto)
  administrators: AdministratorDto[];

  @ApiProperty({ description: 'Activități CAEN', type: [CompanyActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyActivityDto)
  activities: CompanyActivityDto[];

  @ApiProperty({ description: 'Obiect de activitate principal (descriere detaliată)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(2000)
  businessPurpose: string;

  @ApiPropertyOptional({ description: 'Durata societății (ani)', example: 99 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(99)
  companyDuration?: number;

  @ApiPropertyOptional({ description: 'Observații speciale' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Email de contact pentru procesare' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ description: 'Telefon de contact pentru procesare' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;
}
