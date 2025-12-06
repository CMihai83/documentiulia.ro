import { IsString, IsOptional, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EfacturaStatus } from '@prisma/client';

export class UpdateEfacturaConfigDto {
  @ApiPropertyOptional({ description: 'Enable e-Factura integration' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Auto-upload invoices to ANAF' })
  @IsOptional()
  @IsBoolean()
  autoUpload?: boolean;

  @ApiPropertyOptional({ description: 'Auto-download invoices from ANAF' })
  @IsOptional()
  @IsBoolean()
  autoDownload?: boolean;

  @ApiPropertyOptional({ description: 'Certificate file path' })
  @IsOptional()
  @IsString()
  certificateFile?: string;

  @ApiPropertyOptional({ description: 'Certificate password (will be encrypted)' })
  @IsOptional()
  @IsString()
  certificatePassword?: string;
}

export class SendToAnafDto {
  @ApiProperty({ description: 'Invoice ID to send' })
  @IsUUID()
  invoiceId!: string;
}

export class AnafStatusDto {
  @ApiProperty({ description: 'ANAF upload ID' })
  @IsString()
  uploadId!: string;
}

export class UpdateInvoiceEfacturaDto {
  @ApiPropertyOptional({ description: 'e-Factura status', enum: EfacturaStatus })
  @IsOptional()
  @IsEnum(EfacturaStatus)
  efacturaStatus?: EfacturaStatus;

  @ApiPropertyOptional({ description: 'ANAF index ID' })
  @IsOptional()
  @IsString()
  efacturaIndexId?: string;

  @ApiPropertyOptional({ description: 'ANAF upload ID' })
  @IsOptional()
  @IsString()
  efacturaUploadId?: string;

  @ApiPropertyOptional({ description: 'e-Factura XML content' })
  @IsOptional()
  @IsString()
  efacturaXml?: string;
}
