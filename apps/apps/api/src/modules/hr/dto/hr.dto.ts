/**
 * HR Intelligence DTOs - Incantation for AI-powered recruitment & performance
 * Enchanting the hiring process with bias-free matching and 360 reviews
 */

import { IsString, IsEmail, IsOptional, IsNumber, IsArray, IsEnum, IsBoolean, IsDateString, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== ENUMS ====================

export enum CandidateStatus {
  NEW = 'new',
  SCREENING = 'screening',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

export enum JobType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
}

export enum PerformanceRating {
  EXCEPTIONAL = 5,
  EXCEEDS = 4,
  MEETS = 3,
  NEEDS_IMPROVEMENT = 2,
  UNSATISFACTORY = 1,
}

// ==================== CANDIDATE DTOs ====================

export class CreateCandidateDto {
  @ApiProperty({ example: 'Maria Popescu' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'maria.popescu@email.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+40 722 123 456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Senior Accountant' })
  @IsString()
  position!: string;

  @ApiPropertyOptional({ example: ['SAF-T', 'e-Factura', 'Excel'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'Master Contabilitate, ASE Bucuresti' })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/maria-popescu' })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cvUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'job-uuid-123' })
  @IsString()
  jobId!: string;
}

export class UpdateCandidateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: CandidateStatus })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  matchScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewFeedback?: string;
}

export class CandidateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  position!: string;

  @ApiProperty()
  skills!: string[];

  @ApiProperty()
  experienceYears!: number;

  @ApiProperty()
  education!: string;

  @ApiProperty({ enum: CandidateStatus })
  status!: CandidateStatus;

  @ApiProperty({ description: 'AI-calculated match score (0-100)' })
  matchScore!: number;

  @ApiProperty()
  appliedAt!: Date;

  @ApiProperty()
  linkedinUrl!: string;

  @ApiProperty()
  cvUrl!: string;

  @ApiProperty()
  notes!: string;
}

// ==================== JOB POSTING DTOs ====================

export class SalaryRangeDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  min!: number;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0)
  max!: number;

  @ApiPropertyOptional({ example: 'RON', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateJobDto {
  @ApiProperty({ example: 'Senior Accountant - SAF-T Specialist' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Contabilitate' })
  @IsString()
  department!: string;

  @ApiProperty({ example: 'Bucuresti / Remote' })
  @IsString()
  location!: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  type!: JobType;

  @ApiProperty({ type: SalaryRangeDto })
  @ValidateNested()
  @Type(() => SalaryRangeDto)
  salary!: SalaryRangeDto;

  @ApiProperty({ example: 'Cautam un contabil senior cu experienta in SAF-T D406...' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: ['5+ ani experienta', 'Certificare CECCAR'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ example: ['Remote hybrid', 'Training platit'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ enum: JobStatus, default: JobStatus.DRAFT })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

export class UpdateJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({ type: SalaryRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SalaryRangeDto)
  salary?: SalaryRangeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

// ==================== EMPLOYEE DTOs ====================

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Ana Georgescu' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'ana.georgescu@company.ro' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Contabilitate' })
  @IsString()
  department!: string;

  @ApiProperty({ example: 'Senior Accountant' })
  @IsString()
  position!: string;

  @ApiProperty({ example: '2022-03-15' })
  @IsDateString()
  hireDate!: string;

  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  wellnessScore?: number;
}

// ==================== PERFORMANCE DTOs ====================

export class GoalDto {
  @ApiProperty({ example: 'SAF-T D406 Certification' })
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 75 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class CreatePerformanceReviewDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  reviewerId!: string;

  @ApiProperty({ enum: PerformanceRating })
  @IsEnum(PerformanceRating)
  rating!: PerformanceRating;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ type: [GoalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalDto)
  goals?: GoalDto[];

  @ApiProperty({ example: 'Q4 2025' })
  @IsString()
  period!: string;
}

// ==================== WELLNESS DTOs ====================

export class WellnessSurveyDto {
  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  workLifeBalance!: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  @Max(5)
  jobSatisfaction!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  @Max(5)
  stressLevel!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  teamCollaboration!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class WellnessResponseDto {
  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  overallScore!: number;

  @ApiProperty()
  workLifeBalance!: number;

  @ApiProperty()
  jobSatisfaction!: number;

  @ApiProperty()
  stressLevel!: number;

  @ApiProperty()
  teamCollaboration!: number;

  @ApiProperty()
  lastSurveyDate!: Date;

  @ApiProperty()
  trend!: 'improving' | 'stable' | 'declining';
}

// ==================== ATS MATCHING DTOs ====================

export class ATSMatchRequestDto {
  @ApiProperty()
  @IsString()
  jobId!: string;

  @ApiPropertyOptional({ example: 80, description: 'Minimum match score threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ example: true, description: 'Enable bias-free matching' })
  @IsOptional()
  @IsBoolean()
  biasFree?: boolean;
}

export class ATSMatchResultDto {
  @ApiProperty()
  candidateId!: string;

  @ApiProperty()
  candidateName!: string;

  @ApiProperty({ description: 'AI-calculated match score (0-100)' })
  matchScore!: number;

  @ApiProperty({ description: 'Matched skills from job requirements' })
  matchedSkills!: string[];

  @ApiProperty({ description: 'Missing skills from job requirements' })
  missingSkills!: string[];

  @ApiProperty({ description: 'AI-generated recommendation' })
  recommendation!: string;

  @ApiProperty({ description: 'Bias audit passed' })
  biasAuditPassed!: boolean;
}

// ==================== ANALYTICS DTOs ====================

export class HRAnalyticsDto {
  @ApiProperty()
  totalEmployees!: number;

  @ApiProperty()
  openPositions!: number;

  @ApiProperty()
  totalCandidates!: number;

  @ApiProperty()
  averageTimeToHire!: number;

  @ApiProperty()
  averageMatchScore!: number;

  @ApiProperty()
  averageWellnessScore!: number;

  @ApiProperty()
  averagePerformanceScore!: number;

  @ApiProperty()
  turnoverRate!: number;

  @ApiProperty({ type: Object, description: 'Candidates per status' })
  candidatesByStatus!: Record<CandidateStatus, number>;

  @ApiProperty({ type: Object, description: 'Employees per department' })
  employeesByDepartment!: Record<string, number>;
}
