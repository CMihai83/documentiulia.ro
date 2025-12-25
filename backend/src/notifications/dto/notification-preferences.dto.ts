import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EmailPreferencesDto {
  @ApiProperty({ description: 'Receive invoice payment reminders', default: true })
  @IsBoolean()
  @IsOptional()
  invoiceReminders?: boolean;

  @ApiProperty({ description: 'Receive overdue invoice alerts', default: true })
  @IsBoolean()
  @IsOptional()
  overdueAlerts?: boolean;

  @ApiProperty({ description: 'Receive compliance deadline notifications', default: true })
  @IsBoolean()
  @IsOptional()
  complianceDeadlines?: boolean;

  @ApiProperty({ description: 'Receive weekly summary reports', default: true })
  @IsBoolean()
  @IsOptional()
  weeklyReports?: boolean;

  @ApiProperty({ description: 'Receive system alerts and updates', default: true })
  @IsBoolean()
  @IsOptional()
  systemAlerts?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: EmailPreferencesDto, description: 'Email notification preferences' })
  @ValidateNested()
  @Type(() => EmailPreferencesDto)
  @IsOptional()
  email?: EmailPreferencesDto;
}

export interface NotificationPreferences {
  email: {
    invoiceReminders: boolean;
    overdueAlerts: boolean;
    complianceDeadlines: boolean;
    weeklyReports: boolean;
    systemAlerts: boolean;
  };
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: {
    invoiceReminders: true,
    overdueAlerts: true,
    complianceDeadlines: true,
    weeklyReports: true,
    systemAlerts: true,
  },
};
