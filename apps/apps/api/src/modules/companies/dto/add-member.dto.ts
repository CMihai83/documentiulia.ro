import { IsString, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CompanyRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({ description: 'Member email address', example: 'member@company.ro' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Member role',
    enum: CompanyRole,
    example: CompanyRole.ACCOUNTANT
  })
  @IsEnum(CompanyRole)
  role!: CompanyRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for member',
    enum: CompanyRole,
    example: CompanyRole.ADMIN
  })
  @IsEnum(CompanyRole)
  role!: CompanyRole;
}
