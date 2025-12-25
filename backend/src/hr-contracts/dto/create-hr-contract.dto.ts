import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HRContractType } from '@prisma/client';

export class CreateHRContractDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employeeId: string;

  @ApiProperty({ enum: HRContractType, description: 'Contract type' })
  @IsEnum(HRContractType)
  type: HRContractType;

  @ApiProperty({ description: 'Contract start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Contract end date (for fixed-term)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Probation period end date' })
  @IsOptional()
  @IsDateString()
  probationEnd?: string;

  @ApiProperty({ description: 'Monthly salary amount' })
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'RON' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Weekly work hours', default: 40 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(48)
  workHours?: number;

  @ApiProperty({ description: 'Job position/title' })
  @IsString()
  position: string;

  @ApiPropertyOptional({ description: 'Department name' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Non-compete clause included', default: false })
  @IsOptional()
  @IsBoolean()
  nonCompete?: boolean;

  @ApiPropertyOptional({ description: 'Telework enabled', default: false })
  @IsOptional()
  @IsBoolean()
  telework?: boolean;

  @ApiPropertyOptional({ description: 'Number of telework days per week' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  teleworkDays?: number;

  @ApiPropertyOptional({ description: 'Contract template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;
}
