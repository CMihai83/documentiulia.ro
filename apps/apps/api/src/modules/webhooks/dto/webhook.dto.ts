import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';

export enum WebhookEvent {
  // Invoice events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_OVERDUE = 'invoice.overdue',
  INVOICE_CANCELLED = 'invoice.cancelled',

  // e-Factura events
  EFACTURA_SUBMITTED = 'efactura.submitted',
  EFACTURA_VALIDATED = 'efactura.validated',
  EFACTURA_REJECTED = 'efactura.rejected',

  // Expense events
  EXPENSE_CREATED = 'expense.created',
  EXPENSE_APPROVED = 'expense.approved',

  // Receipt events
  RECEIPT_UPLOADED = 'receipt.uploaded',
  RECEIPT_PROCESSED = 'receipt.processed',

  // Client events
  CLIENT_CREATED = 'client.created',
  CLIENT_UPDATED = 'client.updated',

  // Payment events
  PAYMENT_RECEIVED = 'payment.received',

  // Fiscal alerts
  FISCAL_DEADLINE = 'fiscal.deadline',
  FISCAL_LAW_CHANGE = 'fiscal.law_change',

  // Anomaly detection
  ANOMALY_DETECTED = 'anomaly.detected',
}

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook name', example: 'Invoice Notifications' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Webhook URL (Zapier, Make, custom)', example: 'https://hooks.zapier.com/...' })
  @IsUrl()
  url!: string;

  @ApiProperty({ description: 'Events to subscribe to', enum: WebhookEvent, isArray: true })
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events!: WebhookEvent[];

  @ApiPropertyOptional({ description: 'Secret for signature verification' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'Enable webhook', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Webhook name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Events to subscribe to', enum: WebhookEvent, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events?: WebhookEvent[];

  @ApiPropertyOptional({ description: 'Enable/disable webhook' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface WebhookPayloadDto {
  event: WebhookEvent;
  timestamp: string;
  companyId: string;
  data: Record<string, unknown>;
}

export interface WebhookLogDto {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  statusCode: number;
  response: string;
  success: boolean;
  createdAt: Date;
}
