import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FraudAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum FraudAlertStatus {
  PENDING = 'PENDING',
  INVESTIGATING = 'INVESTIGATING',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  CONFIRMED = 'CONFIRMED',
  RESOLVED = 'RESOLVED',
}

export enum FraudAlertType {
  UNUSUAL_AMOUNT = 'UNUSUAL_AMOUNT',
  SUSPICIOUS_TIMING = 'SUSPICIOUS_TIMING',
  DUPLICATE_INVOICE = 'DUPLICATE_INVOICE',
  VENDOR_ANOMALY = 'VENDOR_ANOMALY',
  GEOGRAPHIC_INCONSISTENCY = 'GEOGRAPHIC_INCONSISTENCY',
  RAPID_SUCCESSION = 'RAPID_SUCCESSION',
  AMOUNT_ROUNDING = 'AMOUNT_ROUNDING',
  UNUSUAL_VENDOR = 'UNUSUAL_VENDOR',
  SPLIT_TRANSACTION = 'SPLIT_TRANSACTION',
  WEEKEND_ACTIVITY = 'WEEKEND_ACTIVITY',
  AFTER_HOURS = 'AFTER_HOURS',
  VELOCITY_ANOMALY = 'VELOCITY_ANOMALY',
}

export class FraudAlertDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: FraudAlertType })
  @IsEnum(FraudAlertType)
  type: FraudAlertType;

  @ApiProperty({ enum: FraudAlertSeverity })
  @IsEnum(FraudAlertSeverity)
  severity: FraudAlertSeverity;

  @ApiProperty({ enum: FraudAlertStatus })
  @IsEnum(FraudAlertStatus)
  status: FraudAlertStatus;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  riskScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty()
  metadata: Record<string, any>;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  detectedAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resolvedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class CreateFraudAlertDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: FraudAlertType })
  @IsEnum(FraudAlertType)
  type: FraudAlertType;

  @ApiProperty({ enum: FraudAlertSeverity })
  @IsEnum(FraudAlertSeverity)
  severity: FraudAlertSeverity;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  riskScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty()
  metadata: Record<string, any>;
}

export class UpdateFraudAlertDto {
  @ApiPropertyOptional({ enum: FraudAlertStatus })
  @IsOptional()
  @IsEnum(FraudAlertStatus)
  status?: FraudAlertStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class FraudDetectionRulesDto {
  @ApiProperty()
  @IsNumber()
  unusualAmountThreshold: number;

  @ApiProperty()
  @IsNumber()
  rapidSuccessionMinutes: number;

  @ApiProperty()
  @IsNumber()
  velocityThreshold: number;

  @ApiProperty()
  @IsNumber()
  duplicateWindowHours: number;

  @ApiProperty()
  @IsArray()
  trustedVendors: string[];

  @ApiProperty()
  @IsArray()
  blockedVendors: string[];

  @ApiProperty()
  enableAfterHoursDetection: boolean;

  @ApiProperty()
  enableWeekendDetection: boolean;

  @ApiProperty()
  enableGeographicChecks: boolean;
}

export class TransactionAnalysisDto {
  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty()
  metadata: Record<string, any>;
}

export class FraudDashboardStatsDto {
  @ApiProperty()
  totalAlerts: number;

  @ApiProperty()
  criticalAlerts: number;

  @ApiProperty()
  pendingAlerts: number;

  @ApiProperty()
  resolvedAlerts: number;

  @ApiProperty()
  falsePositiveRate: number;

  @ApiProperty()
  averageRiskScore: number;

  @ApiProperty()
  alertsByType: Record<string, number>;

  @ApiProperty()
  alertsBySeverity: Record<string, number>;

  @ApiProperty()
  riskTrend: Array<{ date: string; score: number }>;
}

export class FraudReportDto {
  @ApiProperty()
  @IsString()
  alertId: string;

  @ApiProperty()
  @IsString()
  reportedBy: string;

  @ApiProperty()
  @IsString()
  notes: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
