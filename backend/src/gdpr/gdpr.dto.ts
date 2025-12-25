import { IsString, IsBoolean, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DsrType {
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETION = 'DATA_DELETION',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_RECTIFICATION = 'DATA_RECTIFICATION',
  CONSENT_WITHDRAWAL = 'CONSENT_WITHDRAWAL',
}

export enum DsrStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum ConsentPurpose {
  ESSENTIAL = 'ESSENTIAL',
  ANALYTICS = 'ANALYTICS',
  MARKETING = 'MARKETING',
  PERSONALIZATION = 'PERSONALIZATION',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
}

export class CreateDsrRequestDto {
  @ApiProperty({ enum: DsrType })
  @IsEnum(DsrType)
  type: DsrType;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalDetails?: string;
}

export class UpdateDsrRequestDto {
  @ApiProperty({ enum: DsrStatus })
  @IsEnum(DsrStatus)
  status: DsrStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class UpdateConsentDto {
  @ApiProperty({ enum: ConsentPurpose })
  @IsEnum(ConsentPurpose)
  purpose: ConsentPurpose;

  @ApiProperty()
  @IsBoolean()
  granted: boolean;
}

export class DsrRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: DsrType })
  type: DsrType;

  @ApiProperty({ enum: DsrStatus })
  status: DsrStatus;

  @ApiProperty()
  reason: string;

  @ApiProperty({ required: false })
  additionalDetails?: string;

  @ApiProperty({ required: false })
  adminNotes?: string;

  @ApiProperty({ required: false })
  rejectionReason?: string;

  @ApiProperty({ required: false })
  processedBy?: string;

  @ApiProperty({ required: false })
  processedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ConsentRecordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ConsentPurpose })
  purpose: ConsentPurpose;

  @ApiProperty()
  granted: boolean;

  @ApiProperty()
  ipAddress?: string;

  @ApiProperty()
  userAgent?: string;

  @ApiProperty()
  timestamp: Date;
}

export class DataInventoryResponseDto {
  @ApiProperty()
  category: string;

  @ApiProperty({ type: [String] })
  dataTypes: string[];

  @ApiProperty()
  purpose: string;

  @ApiProperty()
  retention: string;

  @ApiProperty()
  legalBasis: string;
}

export class DataExportResponseDto {
  @ApiProperty()
  exportDate: string;

  @ApiProperty()
  gdprArticle: string;

  @ApiProperty()
  dataController: string;

  @ApiProperty()
  dataSubject: {
    id: string;
    email: string;
  };

  @ApiProperty()
  personalData: any;

  @ApiProperty()
  metadata: {
    format: string;
    version: string;
    charset: string;
  };
}
