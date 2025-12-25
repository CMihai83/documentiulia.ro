import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiProperty({ description: 'User password for verification' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class VerifyMfaSetupDto {
  @ApiProperty({ description: 'TOTP code from authenticator app' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'MFA secret (temporary, from setup)' })
  @IsString()
  @IsNotEmpty()
  secret: string;
}

export class VerifyMfaLoginDto {
  @ApiProperty({ description: 'TOTP code from authenticator app' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: 'Backup code (if using backup instead of TOTP)' })
  @IsString()
  @IsOptional()
  backupCode?: string;
}

export class DisableMfaDto {
  @ApiProperty({ description: 'User password for verification' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'TOTP code or backup code' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class RegenerateBackupCodesDto {
  @ApiProperty({ description: 'User password for verification' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'TOTP code for verification' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class MfaSetupResponseDto {
  @ApiProperty({ description: 'QR code data URL for authenticator app' })
  qrCode: string;

  @ApiProperty({ description: 'Secret key (manual entry)' })
  secret: string;

  @ApiProperty({ description: 'Backup URL for QR code' })
  backupUrl: string;
}

export class MfaStatusResponseDto {
  @ApiProperty({ description: 'Whether MFA is enabled' })
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Number of backup codes remaining' })
  backupCodesRemaining?: number;

  @ApiPropertyOptional({ description: 'When MFA was enabled' })
  enabledAt?: Date;
}

export class BackupCodesResponseDto {
  @ApiProperty({ description: 'Array of backup codes', type: [String] })
  backupCodes: string[];

  @ApiProperty({ description: 'Warning message about saving codes' })
  message: string;
}
