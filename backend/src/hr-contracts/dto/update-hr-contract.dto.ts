import { PartialType } from '@nestjs/swagger';
import { CreateHRContractDto } from './create-hr-contract.dto';
import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HRContractStatus } from '@prisma/client';

export class UpdateHRContractDto extends PartialType(CreateHRContractDto) {
  @ApiPropertyOptional({ enum: HRContractStatus, description: 'Contract status' })
  @IsOptional()
  @IsEnum(HRContractStatus)
  status?: HRContractStatus;
}

export class SignContractDto {
  @ApiPropertyOptional({ description: 'Signature URL/data' })
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Signer type: employee or employer' })
  @IsString()
  signerType: 'employee' | 'employer';
}

export class SubmitToRevisalDto {
  @ApiPropertyOptional({ description: 'Additional notes for REVISAL submission' })
  @IsOptional()
  @IsString()
  notes?: string;
}
