import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsDecimal, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { VehicleType, VehicleStatus, FuelType, RouteStatus, DeliveryStopStatus, DeliveryFailureReason, MaintenanceType } from '@prisma/client';

// Vehicle DTOs
export class CreateVehicleDto {
  @ApiProperty({ description: 'License plate (e.g., M-FL 1234 for Munich)', example: 'M-FL 1234' })
  @IsString()
  licensePlate: string;

  @ApiPropertyOptional({ description: 'Vehicle Identification Number' })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({ description: 'Vehicle make', example: 'Mercedes-Benz' })
  @IsString()
  make: string;

  @ApiProperty({ description: 'Vehicle model', example: 'Sprinter' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ description: 'Manufacturing year' })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ enum: VehicleType, default: 'VAN' })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiPropertyOptional({ description: 'Maximum payload in kg' })
  @IsOptional()
  @IsNumber()
  maxPayloadKg?: number;

  @ApiPropertyOptional({ description: 'Cargo volume in cubic meters' })
  @IsOptional()
  @IsNumber()
  cargoVolumeM3?: number;

  @ApiPropertyOptional({ enum: FuelType, default: 'DIESEL' })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({ description: 'Current mileage in km' })
  @IsOptional()
  @IsNumber()
  mileage?: number;

  @ApiPropertyOptional({ description: 'Next service date' })
  @IsOptional()
  @IsDateString()
  nextServiceDate?: string;

  @ApiPropertyOptional({ description: 'Insurance expiry date' })
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional({ description: 'German TÜV inspection expiry' })
  @IsOptional()
  @IsDateString()
  tuvExpiry?: string;

  @ApiPropertyOptional({ description: 'Assigned driver employee ID' })
  @IsOptional()
  @IsString()
  assignedDriverId?: string;

  @ApiPropertyOptional({ description: 'Monthly lease cost in EUR' })
  @IsOptional()
  @IsNumber()
  monthlyLeaseCost?: number;

  @ApiPropertyOptional({ description: 'Insurance cost in EUR' })
  @IsOptional()
  @IsNumber()
  insuranceCost?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVehicleDto extends CreateVehicleDto {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ description: 'Current latitude' })
  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @ApiPropertyOptional({ description: 'Current longitude' })
  @IsOptional()
  @IsNumber()
  currentLng?: number;
}

export class VehicleLocationUpdateDto {
  @ApiProperty({ description: 'Latitude', example: 48.1351 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 11.5820 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

// Delivery Route DTOs
export class CreateDeliveryRouteDto {
  @ApiPropertyOptional({ description: 'Route name', example: 'Munich North - AM Route' })
  @IsOptional()
  @IsString()
  routeName?: string;

  @ApiProperty({ description: 'Route date (YYYY-MM-DD)' })
  @IsDateString()
  routeDate: string;

  @ApiProperty({ description: 'Vehicle ID' })
  @IsString()
  vehicleId: string;

  @ApiPropertyOptional({ description: 'Driver employee ID' })
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional({ description: 'Planned distance in km' })
  @IsOptional()
  @IsNumber()
  plannedDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Delivery zone', example: 'Munich-Schwabing' })
  @IsOptional()
  @IsString()
  deliveryZone?: string;
}

export class UpdateDeliveryRouteDto extends CreateDeliveryRouteDto {
  @ApiPropertyOptional({ enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @ApiPropertyOptional({ description: 'Actual distance traveled in km' })
  @IsOptional()
  @IsNumber()
  actualDistanceKm?: number;
}

// Delivery Stop DTOs
export class CreateDeliveryStopDto {
  @ApiProperty({ description: 'Route ID' })
  @IsString()
  routeId: string;

  @ApiProperty({ description: 'Stop order in sequence' })
  @IsNumber()
  stopOrder: number;

  @ApiProperty({ description: 'Recipient name' })
  @IsString()
  recipientName: string;

  @ApiProperty({ description: 'Street address' })
  @IsString()
  streetAddress: string;

  @ApiProperty({ description: 'German postal code', example: '80333' })
  @IsString()
  postalCode: string;

  @ApiPropertyOptional({ description: 'City', default: 'München' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Number of parcels', default: 1 })
  @IsOptional()
  @IsNumber()
  parcelCount?: number;

  @ApiPropertyOptional({ description: 'Tracking numbers', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackingNumbers?: string[];

  @ApiPropertyOptional({ description: 'Delivery notes' })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiPropertyOptional({ description: 'Recipient phone' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({ description: 'Preferred time window' })
  @IsOptional()
  @IsString()
  preferredTimeWindow?: string;
}

export class UpdateDeliveryStopDto {
  @ApiPropertyOptional({ enum: DeliveryStopStatus })
  @IsOptional()
  @IsEnum(DeliveryStopStatus)
  status?: DeliveryStopStatus;

  @ApiPropertyOptional({ description: 'Base64 encoded signature' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Photo URL of delivery proof' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ enum: DeliveryFailureReason })
  @IsOptional()
  @IsEnum(DeliveryFailureReason)
  failureReason?: DeliveryFailureReason;

  @ApiPropertyOptional({ description: 'Additional failure notes' })
  @IsOptional()
  @IsString()
  failureNotes?: string;
}

// Fuel Log DTOs
export class CreateFuelLogDto {
  @ApiProperty({ description: 'Vehicle ID' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ description: 'Driver employee ID' })
  @IsString()
  driverId: string;

  @ApiProperty({ description: 'Fuel date' })
  @IsDateString()
  fuelDate: string;

  @ApiProperty({ description: 'Liters of fuel' })
  @IsNumber()
  liters: number;

  @ApiProperty({ description: 'Price per liter in EUR' })
  @IsNumber()
  pricePerLiter: number;

  @ApiProperty({ description: 'Total cost in EUR' })
  @IsNumber()
  totalCost: number;

  @ApiProperty({ description: 'Odometer reading in km' })
  @IsNumber()
  odometerReading: number;

  @ApiPropertyOptional({ description: 'Station name' })
  @IsOptional()
  @IsString()
  stationName?: string;

  @ApiPropertyOptional({ description: 'Receipt number' })
  @IsOptional()
  @IsString()
  receiptNumber?: string;
}

// Maintenance Log DTOs
export class CreateMaintenanceLogDto {
  @ApiProperty({ description: 'Vehicle ID' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiProperty({ description: 'Maintenance date' })
  @IsDateString()
  maintenanceDate: string;

  @ApiProperty({ description: 'Description of work performed' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cost in EUR' })
  @IsNumber()
  cost: number;

  @ApiProperty({ description: 'Odometer reading in km' })
  @IsNumber()
  odometerReading: number;

  @ApiPropertyOptional({ description: 'Service provider name' })
  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Next maintenance date' })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({ description: 'Next maintenance odometer' })
  @IsOptional()
  @IsNumber()
  nextMaintenanceOdometer?: number;
}

// Response DTOs
export class VehicleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  licensePlate: string;

  @ApiProperty()
  make: string;

  @ApiProperty()
  model: string;

  @ApiProperty({ enum: VehicleStatus })
  status: VehicleStatus;

  @ApiPropertyOptional()
  currentLat?: number;

  @ApiPropertyOptional()
  currentLng?: number;

  @ApiPropertyOptional()
  lastLocationAt?: Date;

  @ApiPropertyOptional()
  mileage?: number;

  @ApiPropertyOptional()
  assignedDriverId?: string;
}

export class FleetSummaryDto {
  @ApiProperty()
  totalVehicles: number;

  @ApiProperty()
  availableVehicles: number;

  @ApiProperty()
  inUseVehicles: number;

  @ApiProperty()
  maintenanceVehicles: number;

  @ApiProperty()
  todayRoutes: number;

  @ApiProperty()
  todayDeliveries: number;

  @ApiProperty()
  todayCompletedDeliveries: number;

  @ApiProperty()
  todayFailedDeliveries: number;

  @ApiProperty()
  monthlyFuelCost: number;

  @ApiProperty()
  monthlyMaintenanceCost: number;
}

export class RouteProgressDto {
  @ApiProperty()
  routeId: string;

  @ApiProperty()
  routeName: string;

  @ApiProperty()
  driverName: string;

  @ApiProperty()
  vehiclePlate: string;

  @ApiProperty()
  totalStops: number;

  @ApiProperty()
  completedStops: number;

  @ApiProperty()
  pendingStops: number;

  @ApiProperty()
  failedStops: number;

  @ApiProperty({ enum: RouteStatus })
  status: RouteStatus;

  @ApiPropertyOptional()
  currentLat?: number;

  @ApiPropertyOptional()
  currentLng?: number;
}
