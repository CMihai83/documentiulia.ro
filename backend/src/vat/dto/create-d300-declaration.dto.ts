import { IsString, IsNumber, IsNotEmpty, IsOptional, IsEnum, IsDate, Min, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum VatRate {
  STANDARD = 'STANDARD', // 19% (sau 21% din august 2025)
  REDUCED = 'REDUCED', // 9% (sau 11% din august 2025)
  SPECIAL = 'SPECIAL', // 5%
  ZERO = 'ZERO', // 0%
  EXEMPT = 'EXEMPT', // Scutit
}

export enum VatOperationType {
  SALE = 'SALE', // Livrări de bunuri
  SERVICE = 'SERVICE', // Prestări de servicii
  INTRA_COMMUNITY = 'INTRA_COMMUNITY', // Operațiuni intracomunitare
  IMPORT = 'IMPORT', // Import
  EXPORT = 'EXPORT', // Export
  REVERSE_CHARGE = 'REVERSE_CHARGE', // Taxare inversă
}

/**
 * VAT Transaction DTO
 * Represents a single transaction for VAT reporting
 */
export class VatTransactionDto {
  @ApiProperty({ description: 'Tip operațiune', enum: VatOperationType })
  @IsEnum(VatOperationType)
  type: VatOperationType;

  @ApiProperty({ description: 'Bază impozabilă (RON)', example: 1000 })
  @IsNumber()
  @Min(0)
  taxableBase: number;

  @ApiProperty({ description: 'Cotă TVA', enum: VatRate })
  @IsEnum(VatRate)
  vatRate: VatRate;

  @ApiProperty({ description: 'Valoare TVA (RON)', example: 190 })
  @IsNumber()
  @Min(0)
  vatAmount: number;

  @ApiPropertyOptional({ description: 'Număr factură' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Dată factură' })
  @IsOptional()
  invoiceDate?: string;

  @ApiPropertyOptional({ description: 'CUI partener' })
  @IsString()
  @IsOptional()
  partnerCui?: string;

  @ApiPropertyOptional({ description: 'Denumire partener' })
  @IsString()
  @IsOptional()
  partnerName?: string;
}

/**
 * D300 Declaration DTO (Monthly VAT Return)
 *
 * Romanian VAT Return (Declarație informativă D300)
 * Filed monthly by all VAT-registered entities
 *
 * Key sections:
 * - Section A: VAT collected (output VAT)
 * - Section B: VAT deductible (input VAT)
 * - Section C: VAT payable or refundable
 * - Section D: Intra-community operations
 */
export class CreateD300DeclarationDto {
  @ApiProperty({ description: 'CUI declarant', example: 'RO12345678' })
  @IsString()
  @IsNotEmpty()
  cui: string;

  @ApiProperty({ description: 'Denumire firmă' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Luna raportare (1-12)', example: 12 })
  @IsNumber()
  @Min(1)
  month: number;

  @ApiProperty({ description: 'Anul raportare', example: 2025 })
  @IsNumber()
  @Min(2000)
  year: number;

  // ========================================================================
  // SECȚIUNEA A - TVA COLECTAT (Output VAT)
  // ========================================================================

  @ApiProperty({ description: 'Livrări/prestări impozabile - cotă 19%/21% - bază impozabilă', example: 50000 })
  @IsNumber()
  @Min(0)
  outputTaxableBase19: number;

  @ApiProperty({ description: 'Livrări/prestări impozabile - cotă 19%/21% - TVA colectat', example: 9500 })
  @IsNumber()
  @Min(0)
  outputVat19: number;

  @ApiProperty({ description: 'Livrări/prestări impozabile - cotă 9%/11% - bază impozabilă', example: 10000 })
  @IsNumber()
  @Min(0)
  outputTaxableBase9: number;

  @ApiProperty({ description: 'Livrări/prestări impozabile - cotă 9%/11% - TVA colectat', example: 900 })
  @IsNumber()
  @Min(0)
  outputVat9: number;

  @ApiProperty({ description: 'Livrări/prestări impozabile - cotă 5% - bază impozabilă', example: 5000 })
  @IsNumber()
  @Min(0)
  outputTaxableBase5: number;

  @ApiProperty({ description: 'Livrări/prestări impozabile - cotă 5% - TVA colectat', example: 250 })
  @IsNumber()
  @Min(0)
  outputVat5: number;

  @ApiProperty({ description: 'Livrări scutite cu drept de deducere - bază impozabilă', example: 0 })
  @IsNumber()
  @Min(0)
  exemptWithDeduction: number;

  @ApiProperty({ description: 'Livrări scutite fără drept de deducere - bază impozabilă', example: 0 })
  @IsNumber()
  @Min(0)
  exemptWithoutDeduction: number;

  @ApiProperty({ description: 'Operațiuni taxare inversă - bază impozabilă', example: 0 })
  @IsNumber()
  @Min(0)
  reverseChargeBase: number;

  @ApiProperty({ description: 'Livrări intracomunitare - bază impozabilă', example: 0 })
  @IsNumber()
  @Min(0)
  intraCommunityDeliveries: number;

  @ApiProperty({ description: 'Export - bază impozabilă', example: 0 })
  @IsNumber()
  @Min(0)
  exports: number;

  // ========================================================================
  // SECȚIUNEA B - TVA DEDUCTIBIL (Input VAT)
  // ========================================================================

  @ApiProperty({ description: 'Achiziții cu TVA deductibil - cotă 19%/21% - TVA', example: 5000 })
  @IsNumber()
  @Min(0)
  inputVat19: number;

  @ApiProperty({ description: 'Achiziții cu TVA deductibil - cotă 9%/11% - TVA', example: 500 })
  @IsNumber()
  @Min(0)
  inputVat9: number;

  @ApiProperty({ description: 'Achiziții cu TVA deductibil - cotă 5% - TVA', example: 100 })
  @IsNumber()
  @Min(0)
  inputVat5: number;

  @ApiProperty({ description: 'Import - TVA deductibil', example: 0 })
  @IsNumber()
  @Min(0)
  importVat: number;

  @ApiProperty({ description: 'Achiziții intracomunitare - bază impozabilă', example: 0 })
  @IsNumber()
  @Min(0)
  intraCommunityAcquisitionsBase: number;

  @ApiProperty({ description: 'Achiziții intracomunitare - TVA', example: 0 })
  @IsNumber()
  @Min(0)
  intraCommunityAcquisitionsVat: number;

  @ApiProperty({ description: 'Achiziții taxare inversă - TVA deductibil', example: 0 })
  @IsNumber()
  @Min(0)
  reverseChargeInputVat: number;

  // ========================================================================
  // SECȚIUNEA C - TVA DE PLATĂ/RECUPERAT
  // ========================================================================

  @ApiPropertyOptional({ description: 'TVA colectat total (calculat automat)' })
  @IsNumber()
  @IsOptional()
  totalOutputVat?: number;

  @ApiPropertyOptional({ description: 'TVA deductibil total (calculat automat)' })
  @IsNumber()
  @IsOptional()
  totalInputVat?: number;

  @ApiPropertyOptional({ description: 'TVA de plată (dacă pozitiv) / recuperat (dacă negativ) - calculat automat' })
  @IsNumber()
  @IsOptional()
  vatPayable?: number;

  // ========================================================================
  // SECȚIUNEA D - DETALII OPERAȚIUNI INTRACOMUNITARE
  // ========================================================================

  @ApiPropertyOptional({ description: 'Lista tranzacții intracomunitare', type: [VatTransactionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VatTransactionDto)
  @IsOptional()
  intraCommunityTransactions?: VatTransactionDto[];

  // ========================================================================
  // DATE ADIȚIONALE
  // ========================================================================

  @ApiPropertyOptional({ description: 'Observații' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Nume reprezentant legal' })
  @IsString()
  @IsOptional()
  legalRepresentativeName?: string;

  @ApiPropertyOptional({ description: 'CNP reprezentant legal' })
  @IsString()
  @IsOptional()
  legalRepresentativeCnp?: string;
}
