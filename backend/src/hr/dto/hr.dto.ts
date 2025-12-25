import {
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  Min,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Employee first name', example: 'Ion' })
  @IsString()
  @Length(2, 100)
  firstName: string;

  @ApiProperty({ description: 'Employee last name', example: 'Popescu' })
  @IsString()
  @Length(2, 100)
  lastName: string;

  @ApiProperty({ description: 'Employee email', example: 'ion.popescu@example.ro' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'CNP (Romanian personal ID - 13 digits)',
    example: '1800101123456',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-8]\d{12}$/, { message: 'Invalid CNP format' })
  cnp?: string;

  @ApiProperty({ description: 'Job position', example: 'Contabil' })
  @IsString()
  position: string;

  @ApiPropertyOptional({ description: 'Department', example: 'Financiar' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Hire date', example: '2025-01-15' })
  @IsDateString()
  hireDate: string;

  @ApiProperty({ description: 'Gross monthly salary in RON', example: 5000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salary: number;

  @ApiProperty({
    description: 'Contract type',
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
    example: 'FULL_TIME',
  })
  @IsIn(['FULL_TIME', 'PART_TIME', 'CONTRACT'])
  contractType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'Employee first name' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Employee last name' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Employee email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Job position' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Gross monthly salary in RON' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salary?: number;

  @ApiPropertyOptional({
    description: 'Employee status',
    enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'],
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'TERMINATED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export class GeneratePayrollDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employeeId: string;

  @ApiProperty({
    description: 'Period for payroll calculation (YYYY-MM format)',
    example: '2025-01',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period: string;
}

export class ProcessPayrollDto {
  @ApiProperty({ description: 'User ID for company' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Period for payroll processing (YYYY-MM format)',
    example: '2025-01',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period: string;
}

export class UpdatePayrollStatusDto {
  @ApiProperty({
    description: 'New payroll status',
    enum: ['PENDING', 'PROCESSED', 'PAID'],
    example: 'PAID',
  })
  @IsIn(['PENDING', 'PROCESSED', 'PAID'])
  status: 'PENDING' | 'PROCESSED' | 'PAID';
}
