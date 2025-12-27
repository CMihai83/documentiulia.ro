import { IsString, IsNumber, IsNotEmpty, IsOptional, IsEnum, Min, Max, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum Quarter {
  Q1 = 1,
  Q2 = 2,
  Q3 = 3,
  Q4 = 4,
}

/**
 * EU Transaction DTO
 * Represents a single EU transaction for quarterly VAT reporting
 */
export class EuTransactionDto {
  @ApiProperty({ description: 'Cod țară UE (format ISO)', example: 'DE' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ description: 'Cod TVA intracomunitar al partenerului', example: 'DE123456789' })
  @IsString()
  @IsNotEmpty()
  partnerVatId: string;

  @ApiProperty({ description: 'Denumire partener' })
  @IsString()
  @IsNotEmpty()
  partnerName: string;

  @ApiProperty({ description: 'Tip operațiune', enum: ['DELIVERY', 'ACQUISITION', 'SERVICE'] })
  @IsEnum(['DELIVERY', 'ACQUISITION', 'SERVICE'])
  operationType: 'DELIVERY' | 'ACQUISITION' | 'SERVICE';

  @ApiProperty({ description: 'Valoare totală (fără TVA)', example: 10000 })
  @IsNumber()
  @Min(0)
  totalValue: number;

  @ApiProperty({ description: 'Valoare TVA (pentru achiziții)', example: 1900 })
  @IsNumber()
  @Min(0)
  vatAmount: number;

  @ApiPropertyOptional({ description: 'Număr facturi' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  invoiceCount?: number;
}

/**
 * D394 Quarterly Declaration DTO (Quarterly VAT Summary)
 *
 * Romanian Quarterly VAT Return (Declarație trimestrială D394)
 * Filed quarterly by VAT-registered entities
 * Reports intra-community acquisitions and deliveries
 *
 * Key sections:
 * - Section 1: Intra-community acquisitions by member state
 * - Section 2: Intra-community deliveries by member state
 * - Section 3: Services provided/received from EU
 * - Section 4: Quarterly adjustments and corrections
 */
export class CreateD394DeclarationDto {
  @ApiProperty({ description: 'CUI declarant', example: 'RO12345678' })
  @IsString()
  @IsNotEmpty()
  cui: string;

  @ApiProperty({ description: 'Denumire firmă' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Trimestru raportare (1-4)', example: 4, enum: Quarter })
  @IsEnum(Quarter)
  quarter: Quarter;

  @ApiProperty({ description: 'Anul raportare', example: 2025 })
  @IsNumber()
  @Min(2000)
  year: number;

  // ========================================================================
  // SECȚIUNEA 1 - ACHIZIȚII INTRACOMUNITARE
  // Intra-community Acquisitions by Member State
  // ========================================================================

  @ApiProperty({
    description: 'Lista achiziții intracomunitare pe țări',
    type: [EuTransactionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EuTransactionDto)
  acquisitions: EuTransactionDto[];

  @ApiProperty({ description: 'Total achiziții intracomunitare - bază impozabilă', example: 50000 })
  @IsNumber()
  @Min(0)
  totalAcquisitionsBase: number;

  @ApiProperty({ description: 'Total achiziții intracomunitare - TVA datorat', example: 10500 })
  @IsNumber()
  @Min(0)
  totalAcquisitionsVat: number;

  // ========================================================================
  // SECȚIUNEA 2 - LIVRĂRI INTRACOMUNITARE
  // Intra-community Deliveries by Member State
  // ========================================================================

  @ApiProperty({
    description: 'Lista livrări intracomunitare pe țări',
    type: [EuTransactionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EuTransactionDto)
  deliveries: EuTransactionDto[];

  @ApiProperty({ description: 'Total livrări intracomunitare - valoare', example: 100000 })
  @IsNumber()
  @Min(0)
  totalDeliveriesValue: number;

  // ========================================================================
  // SECȚIUNEA 3 - PRESTĂRI/ACHIZIȚII SERVICII UE
  // Services Provided/Received from EU
  // ========================================================================

  @ApiProperty({
    description: 'Lista prestări servicii către UE',
    type: [EuTransactionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EuTransactionDto)
  @IsOptional()
  servicesProvided?: EuTransactionDto[];

  @ApiProperty({ description: 'Total servicii prestate către UE', example: 20000 })
  @IsNumber()
  @Min(0)
  totalServicesProvidedValue: number;

  @ApiProperty({
    description: 'Lista achiziții servicii din UE',
    type: [EuTransactionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EuTransactionDto)
  @IsOptional()
  servicesReceived?: EuTransactionDto[];

  @ApiProperty({ description: 'Total servicii achiziționate din UE - bază', example: 15000 })
  @IsNumber()
  @Min(0)
  totalServicesReceivedBase: number;

  @ApiProperty({ description: 'Total servicii achiziționate din UE - TVA', example: 3150 })
  @IsNumber()
  @Min(0)
  totalServicesReceivedVat: number;

  // ========================================================================
  // SECȚIUNEA 4 - OPERAȚIUNI TRIUNGHIULARE
  // Triangular Operations (EU trade involving 3 countries)
  // ========================================================================

  @ApiPropertyOptional({ description: 'Operațiuni triunghiulare - simplificare', example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  triangularSimplification?: number;

  @ApiPropertyOptional({ description: 'Operațiuni triunghiulare - livrări', example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  triangularDeliveries?: number;

  @ApiPropertyOptional({ description: 'Operațiuni triunghiulare - achiziții', example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  triangularAcquisitions?: number;

  // ========================================================================
  // SECȚIUNEA 5 - CORECȚII ȘI AJUSTĂRI
  // Corrections and Adjustments
  // ========================================================================

  @ApiPropertyOptional({ description: 'Corecții achiziții intracomunitare - bază', example: 0 })
  @IsNumber()
  @IsOptional()
  acquisitionsCorrectionsBase?: number;

  @ApiPropertyOptional({ description: 'Corecții achiziții intracomunitare - TVA', example: 0 })
  @IsNumber()
  @IsOptional()
  acquisitionsCorrectionsVat?: number;

  @ApiPropertyOptional({ description: 'Corecții livrări intracomunitare - valoare', example: 0 })
  @IsNumber()
  @IsOptional()
  deliveriesCorrectionsValue?: number;

  @ApiPropertyOptional({ description: 'Corecții servicii prestate - valoare', example: 0 })
  @IsNumber()
  @IsOptional()
  servicesProvidedCorrectionsValue?: number;

  @ApiPropertyOptional({ description: 'Corecții servicii primite - bază', example: 0 })
  @IsNumber()
  @IsOptional()
  servicesReceivedCorrectionsBase?: number;

  @ApiPropertyOptional({ description: 'Corecții servicii primite - TVA', example: 0 })
  @IsNumber()
  @IsOptional()
  servicesReceivedCorrectionsVat?: number;

  // ========================================================================
  // SECȚIUNEA 6 - REFERINȚE LA DECLARAȚII D300
  // References to Monthly D300 Declarations
  // ========================================================================

  @ApiPropertyOptional({
    description: 'IDs declarații D300 din trimestru',
    type: [String],
    example: ['d300-2025-01-uuid', 'd300-2025-02-uuid', 'd300-2025-03-uuid'],
  })
  @IsArray()
  @IsOptional()
  monthlyD300Ids?: string[];

  @ApiPropertyOptional({ description: 'Verificare concordanță cu D300 lunare' })
  @IsOptional()
  isReconciled?: boolean;

  // ========================================================================
  // SECȚIUNEA 7 - VALIDĂRI VIES
  // VIES (VAT Information Exchange System) Validations
  // ========================================================================

  @ApiPropertyOptional({ description: 'Toate codurile TVA UE au fost validate în VIES' })
  @IsOptional()
  viesValidated?: boolean;

  @ApiPropertyOptional({ description: 'Data ultimei validări VIES' })
  @IsOptional()
  viesValidationDate?: string;

  @ApiPropertyOptional({
    description: 'Coduri TVA invalide detectate în VIES',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  invalidVatIds?: string[];

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

  @ApiPropertyOptional({ description: 'Declarație rectificativă' })
  @IsOptional()
  isAmendment?: boolean;

  @ApiPropertyOptional({ description: 'Număr declarație originală (dacă rectificativă)' })
  @IsString()
  @IsOptional()
  originalDeclarationNumber?: string;
}
