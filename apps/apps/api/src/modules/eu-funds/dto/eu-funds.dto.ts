/**
 * EU Funds DTOs - Grant aura manifestation
 * Enchanting PNRR, Cohesion, and InvestEU access for Romanian SMBs
 */

import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsBoolean, IsDateString, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== ENUMS ====================

export enum FundSource {
  PNRR = 'pnrr',
  COHESION = 'cohesion',
  INVESTEU = 'investeu',
  HORIZON = 'horizon',
  DIGITAL = 'digital',
}

export enum ProgramStatus {
  OPEN = 'open',
  UPCOMING = 'upcoming',
  CLOSED = 'closed',
}

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONTRACTED = 'contracted',
}

export enum CompanySize {
  MICRO = 'micro',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export enum Sector {
  RETAIL = 'retail',
  SERVICES = 'services',
  MANUFACTURING = 'manufacturing',
  IT = 'it',
  TOURISM = 'tourism',
  CONSTRUCTION = 'construction',
  TRANSPORT = 'transport',
  AGRICULTURE = 'agriculture',
  ENERGY = 'energy',
  HEALTH = 'health',
}

// ==================== COMPANY PROFILE DTOs ====================

export class CompanyProfileDto {
  @ApiProperty({ example: 'SC Exemplu SRL' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'RO12345678' })
  @IsString()
  cui!: string;

  @ApiProperty({ enum: Sector })
  @IsEnum(Sector)
  sector!: Sector;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(1)
  employees!: number;

  @ApiProperty({ example: 500000, description: 'Annual revenue in EUR' })
  @IsNumber()
  @Min(0)
  revenue!: number;

  @ApiProperty({ example: 2018 })
  @IsNumber()
  @Min(1990)
  @Max(2025)
  founded!: number;

  @ApiProperty({ example: 'Bucuresti' })
  @IsString()
  location!: string;

  @ApiPropertyOptional({ example: ['ISO 9001', 'GDPR Compliant'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasAnafCertificate?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasTaxDebts?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  profitableLast2Years?: boolean;
}

// ==================== FUNDING PROGRAM DTOs ====================

export class FundingProgramDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'PNRR - Digitalizare IMM' })
  name!: string;

  @ApiProperty({ enum: FundSource })
  source!: FundSource;

  @ApiProperty({ example: 500000000 })
  totalBudget!: number;

  @ApiProperty({ example: 320000000 })
  availableBudget!: number;

  @ApiProperty({ example: '2025-06-30' })
  deadline!: string;

  @ApiProperty({ example: 25000 })
  minFunding!: number;

  @ApiProperty({ example: 100000 })
  maxFunding!: number;

  @ApiProperty({ example: 10, description: 'Co-financing percentage required' })
  cofinancing!: number;

  @ApiProperty({ example: ['IMM', 'Minim 2 ani activitate'] })
  eligibility!: string[];

  @ApiProperty({ example: ['Retail', 'Servicii', 'IT'] })
  sectors!: string[];

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ProgramStatus })
  status!: ProgramStatus;

  @ApiProperty({ example: 68 })
  successRate!: number;

  @ApiProperty({ example: ['CUI', 'Bilant', 'Plan de afaceri'] })
  documentsRequired!: string[];
}

// ==================== ELIGIBILITY DTOs ====================

export class EligibilityCheckDto {
  @ApiProperty({ type: CompanyProfileDto })
  @ValidateNested()
  @Type(() => CompanyProfileDto)
  companyProfile!: CompanyProfileDto;

  @ApiPropertyOptional({ enum: FundSource })
  @IsOptional()
  @IsEnum(FundSource)
  fundSource?: FundSource;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  requestedAmount?: number;
}

export class EligibilityResultDto {
  @ApiProperty()
  programId!: string;

  @ApiProperty()
  programName!: string;

  @ApiProperty({ description: 'AI-calculated eligibility score (0-100)' })
  score!: number;

  @ApiProperty({ description: 'Matched eligibility criteria' })
  matchedCriteria!: string[];

  @ApiProperty({ description: 'Missing eligibility criteria' })
  missingCriteria!: string[];

  @ApiProperty({ description: 'Estimated funding amount' })
  estimatedFunding!: number;

  @ApiProperty({ description: 'AI-generated recommendation' })
  recommendation!: string;

  @ApiProperty({ description: 'Required documents for this program' })
  documentsRequired!: string[];

  @ApiProperty({ description: 'Days until deadline' })
  daysUntilDeadline!: number;
}

// ==================== APPLICATION DTOs ====================

export class CreateApplicationDto {
  @ApiProperty()
  @IsString()
  programId!: string;

  @ApiProperty({ type: CompanyProfileDto })
  @ValidateNested()
  @Type(() => CompanyProfileDto)
  companyProfile!: CompanyProfileDto;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1000)
  requestedAmount!: number;

  @ApiProperty({ example: 'Implementare sistem ERP pentru digitalizare procese' })
  @IsString()
  projectDescription!: string;

  @ApiPropertyOptional({ example: ['ERP', 'CRM', 'e-Commerce'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectObjectives?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  newJobsCreated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cofinancingAmount?: number;
}

export class UpdateApplicationDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectObjectives?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  newJobsCreated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class ApplicationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  programId!: string;

  @ApiProperty()
  programName!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiProperty()
  requestedAmount!: number;

  @ApiProperty()
  projectDescription!: string;

  @ApiProperty()
  eligibilityScore!: number;

  @ApiProperty()
  submittedAt!: Date;

  @ApiProperty()
  lastUpdated!: Date;

  @ApiProperty({ description: 'Current milestone in the process' })
  currentMilestone!: string;

  @ApiProperty({ description: 'Next action required' })
  nextAction!: string;
}

// ==================== MILESTONE DTOs ====================

export class MilestoneDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Depunere dosare' })
  name!: string;

  @ApiProperty({ example: '2025-06-30' })
  date!: string;

  @ApiProperty({ enum: ['completed', 'current', 'upcoming'] })
  status!: 'completed' | 'current' | 'upcoming';

  @ApiPropertyOptional()
  description?: string;
}

export class UpdateMilestoneDto {
  @ApiProperty({ enum: ['completed', 'current', 'upcoming'] })
  @IsString()
  status!: 'completed' | 'current' | 'upcoming';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ==================== ANALYTICS DTOs ====================

export class FundsAnalyticsDto {
  @ApiProperty({ description: 'Total available funding across all programs' })
  totalAvailableFunding!: number;

  @ApiProperty({ description: 'Number of open programs' })
  openPrograms!: number;

  @ApiProperty({ description: 'Number of applications submitted' })
  applicationsSubmitted!: number;

  @ApiProperty({ description: 'Total funding requested' })
  totalFundingRequested!: number;

  @ApiProperty({ description: 'Total funding approved' })
  totalFundingApproved!: number;

  @ApiProperty({ description: 'Average success rate' })
  averageSuccessRate!: number;

  @ApiProperty({ type: Object, description: 'Applications by status' })
  applicationsByStatus!: Record<ApplicationStatus, number>;

  @ApiProperty({ type: Object, description: 'Funding by source' })
  fundingBySource!: Record<FundSource, number>;

  @ApiProperty({ description: 'Upcoming deadlines' })
  upcomingDeadlines!: { programName: string; deadline: string; daysLeft: number }[];
}

// ==================== INVESTEU VOUCHER DTOs ====================

export class InvestEUVoucherDto {
  @ApiProperty({ example: 'Voucher Digitalizare' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(1000)
  @Max(50000)
  amount!: number;

  @ApiProperty({ example: 'Achizitie software ERP' })
  @IsString()
  purpose!: string;

  @ApiPropertyOptional({ example: ['Oferta furnizor', 'Specificatii tehnice'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportingDocuments?: string[];
}
