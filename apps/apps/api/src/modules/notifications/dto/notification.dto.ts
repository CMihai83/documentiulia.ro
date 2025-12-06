import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  INVOICE_SENT = 'invoice_sent',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_OVERDUE = 'invoice_overdue',
  PAYMENT_RECEIVED = 'payment_received',
  EXPENSE_APPROVED = 'expense_approved',
  RECEIPT_PROCESSED = 'receipt_processed',
  EFACTURA_STATUS = 'efactura_status',
  SYSTEM_ALERT = 'system_alert',
  REMINDER = 'reminder',
}

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ description: 'Link to related resource' })
  @IsOptional()
  @IsString()
  link?: string;
}

export class NotificationFilterDto {
  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Filter by type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class NotificationCountDto {
  unreadCount!: number;
  totalCount!: number;
}
