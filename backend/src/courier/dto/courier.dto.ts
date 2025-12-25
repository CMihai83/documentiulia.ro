import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CourierProvider {
  DPD = 'DPD',
  GLS = 'GLS',
  DHL = 'DHL',
  UPS = 'UPS',
  HERMES = 'HERMES',
}

// =================== TRACKING DTOs ===================

export class TrackingEvent {
  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  location?: string;
}

export class TrackingLocation {
  @ApiProperty()
  city: string;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  lat?: number;

  @ApiPropertyOptional()
  lng?: number;
}

export class TrackingResult {
  @ApiProperty()
  trackingNumber: string;

  @ApiProperty({ enum: CourierProvider })
  provider: CourierProvider;

  @ApiProperty()
  status: string;

  @ApiProperty()
  statusDescription: string;

  @ApiPropertyOptional()
  estimatedDelivery?: Date;

  @ApiProperty()
  lastUpdate: Date;

  @ApiPropertyOptional({ type: TrackingLocation })
  location?: TrackingLocation;

  @ApiProperty({ type: [TrackingEvent] })
  events: TrackingEvent[];
}

export class TrackParcelDto {
  @ApiProperty({ description: 'Tracking number' })
  @IsString()
  trackingNumber: string;

  @ApiProperty({ enum: CourierProvider, description: 'Courier provider' })
  @IsEnum(CourierProvider)
  provider: CourierProvider;
}

// =================== SHIPMENT DTOs ===================

export class AddressDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiPropertyOptional({ default: 'DE' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ParcelDto {
  @ApiProperty({ description: 'Weight in kg' })
  @IsNumber()
  weight: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reference?: string;
}

export class DPDShipmentRequest {
  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  sender: AddressDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  recipient: AddressDto;

  @ApiProperty({ type: [ParcelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelDto)
  parcels: ParcelDto[];

  @ApiPropertyOptional({ description: 'Service type: CLASSIC, EXPRESS, etc.' })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  pickupDate?: string;
}

export class GLSShipmentRequest {
  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  sender: AddressDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  recipient: AddressDto;

  @ApiProperty({ type: [ParcelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelDto)
  parcels: ParcelDto[];

  @ApiPropertyOptional({ description: 'Product type: PARCEL, EXPRESS, etc.' })
  @IsString()
  @IsOptional()
  product?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  references?: string[];
}

export class ShipmentCreateRequest {
  @ApiProperty({ enum: CourierProvider })
  @IsEnum(CourierProvider)
  provider: CourierProvider;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  sender: AddressDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  recipient: AddressDto;

  @ApiProperty({ type: [ParcelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelDto)
  parcels: ParcelDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  service?: string;
}

export class ShipmentCreateResult {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  trackingNumber: string;

  @ApiProperty({ enum: CourierProvider })
  provider: CourierProvider;

  @ApiPropertyOptional()
  labelUrl?: string;

  @ApiPropertyOptional()
  shipmentId?: string;

  @ApiPropertyOptional()
  error?: string;
}

// =================== SUBCONTRACTOR DTOs ===================

export class ImportDeliveriesDto {
  @ApiProperty({ enum: CourierProvider })
  @IsEnum(CourierProvider)
  provider: CourierProvider;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  dateTo: string;
}

export class DeliverySummaryDto {
  @ApiProperty()
  totalDeliveries: number;

  @ApiProperty()
  successfulDeliveries: number;

  @ApiProperty()
  failedDeliveries: number;

  @ApiProperty()
  totalRevenue: number;
}

export class GetDeliverySummaryDto {
  @ApiProperty({ enum: CourierProvider })
  @IsEnum(CourierProvider)
  provider: CourierProvider;

  @ApiProperty({ description: 'Month (YYYY-MM)' })
  @IsString()
  month: string;
}

// =================== CREDENTIALS ===================

export class CourierCredentials {
  @ApiProperty({ enum: CourierProvider })
  @IsEnum(CourierProvider)
  provider: CourierProvider;

  @ApiProperty()
  @IsString()
  apiKey: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;
}
