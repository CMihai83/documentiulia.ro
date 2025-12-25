import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsEnum, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { SpvStatus, SpvMessageType, SpvMessageStatus, SpvSubmissionType, SpvSubmissionStatus } from '@prisma/client';

// ===== OAuth2 DTOs =====

export class SpvOAuthUrlDto {
  @ApiProperty({ description: 'ANAF OAuth2 authorization URL' })
  authUrl: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  state: string;
}

export class SpvOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from ANAF' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'State parameter for validation' })
  @IsString()
  @IsNotEmpty()
  state: string;
}

export class SpvTokenResponseDto {
  @ApiProperty({ description: 'Connection status' })
  status: SpvStatus;

  @ApiProperty({ description: 'Connected company CUI' })
  cui: string;

  @ApiProperty({ description: 'Token expiration time' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Last used timestamp' })
  lastUsedAt?: Date;

  @ApiPropertyOptional({ description: 'Available scopes' })
  scope?: string;
}

// ===== Connection Status DTOs =====

export class SpvConnectionStatusDto {
  @ApiProperty({ description: 'Whether SPV is connected' })
  connected: boolean;

  @ApiProperty({ description: 'Connection status' })
  status: SpvStatus;

  @ApiPropertyOptional({ description: 'Connected company CUI' })
  cui?: string;

  @ApiPropertyOptional({ description: 'Token expiration time' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Last successful API call' })
  lastUsedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Last error message if any' })
  lastError?: string | null;

  @ApiProperty({ description: 'Available features based on scope' })
  features: {
    efactura: boolean;
    saft: boolean;
    notifications: boolean;
  };
}

// ===== Message DTOs =====

export class SpvMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  messageId: string;

  @ApiProperty({ enum: SpvMessageType })
  messageType: SpvMessageType;

  @ApiProperty()
  subject: string;

  @ApiPropertyOptional()
  content?: string | null;

  @ApiProperty({ enum: SpvMessageStatus })
  status: SpvMessageStatus;

  @ApiPropertyOptional()
  relatedInvoice?: string | null;

  @ApiPropertyOptional()
  uploadIndex?: string | null;

  @ApiProperty()
  anafCreatedAt: Date;

  @ApiProperty()
  receivedAt: Date;
}

export class SpvMessagesListDto {
  @ApiProperty({ type: [SpvMessageDto] })
  messages: SpvMessageDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  unreadCount: number;
}

export class MarkMessageReadDto {
  @ApiProperty({ description: 'Message ID to mark as read' })
  @IsString()
  @IsNotEmpty()
  messageId: string;
}

// ===== Submission DTOs =====

export class SpvSubmissionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SpvSubmissionType })
  submissionType: SpvSubmissionType;

  @ApiProperty()
  uploadIndex: string;

  @ApiPropertyOptional()
  documentId?: string | null;

  @ApiPropertyOptional()
  period?: string | null;

  @ApiProperty({ enum: SpvSubmissionStatus })
  status: SpvSubmissionStatus;

  @ApiPropertyOptional()
  anafStatus?: string | null;

  @ApiProperty()
  submittedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;
}

export class SpvSubmissionsListDto {
  @ApiProperty({ type: [SpvSubmissionDto] })
  submissions: SpvSubmissionDto[];

  @ApiProperty()
  total: number;
}

export class SubmissionFilterDto {
  @ApiPropertyOptional({ enum: SpvSubmissionType })
  @IsOptional()
  @IsEnum(SpvSubmissionType)
  type?: SpvSubmissionType;

  @ApiPropertyOptional({ enum: SpvSubmissionStatus })
  @IsOptional()
  @IsEnum(SpvSubmissionStatus)
  status?: SpvSubmissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;
}

// ===== e-Factura Submission DTOs =====

export class SubmitEfacturaDto {
  @ApiProperty({ description: 'Invoice ID to submit' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;
}

export class EfacturaSubmissionResultDto {
  @ApiProperty({ description: 'ANAF upload index' })
  uploadIndex: string;

  @ApiProperty({ description: 'Submission status' })
  status: string;

  @ApiProperty({ description: 'Submission ID in our system' })
  submissionId: string;
}

// ===== SAF-T Submission DTOs =====

export class SubmitSaftDto {
  @ApiProperty({ description: 'SAF-T report period (YYYY-MM)' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiPropertyOptional({ description: 'Pre-generated XML content' })
  @IsOptional()
  @IsString()
  xml?: string;
}

export class SaftSubmissionResultDto {
  @ApiProperty({ description: 'ANAF reference number' })
  reference: string;

  @ApiProperty({ description: 'Submission status' })
  status: string;

  @ApiProperty({ description: 'Submission ID in our system' })
  submissionId: string;
}

// ===== Download DTOs =====

export class DownloadReceivedDto {
  @ApiPropertyOptional({ description: 'Number of days to look back (default 60)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  days?: number;
}

export class ReceivedEfacturaDto {
  @ApiProperty()
  uploadIndex: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  supplierName: string;

  @ApiProperty()
  supplierCui: string;

  @ApiProperty()
  issueDate: Date;

  @ApiProperty()
  grossAmount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ description: 'Whether already imported to our system' })
  imported: boolean;
}

export class ReceivedEfacturaListDto {
  @ApiProperty({ type: [ReceivedEfacturaDto] })
  invoices: ReceivedEfacturaDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  newCount: number;
}

// ===== SPV Dashboard Summary =====

export class SpvDashboardDto {
  @ApiProperty({ description: 'Connection status' })
  connection: SpvConnectionStatusDto;

  @ApiProperty({ description: 'Unread messages count' })
  unreadMessages: number;

  @ApiProperty({ description: 'Pending submissions count' })
  pendingSubmissions: number;

  @ApiProperty({ description: 'Recent submissions' })
  recentSubmissions: SpvSubmissionDto[];

  @ApiProperty({ description: 'Upcoming deadlines' })
  deadlines: {
    saftNextDeadline: Date;
    saftPeriod: string;
    daysRemaining: number;
  };
}
