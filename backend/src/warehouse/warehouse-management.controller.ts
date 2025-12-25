import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  WarehouseManagementService,
  Warehouse,
  Zone,
  Location,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateZoneDto,
  CreateLocationDto,
  BulkCreateLocationsDto,
  WarehouseStatus,
  WarehouseType,
  LocationType,
  StorageClass,
  InventoryItem,
} from './warehouse-management.service';

@ApiTags('Warehouse Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse')
export class WarehouseManagementController {
  constructor(private readonly warehouseService: WarehouseManagementService) {}

  // Warehouse Operations
  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Warehouse created successfully',
  })
  async createWarehouse(
    @Request() req: any,
    @Body() dto: CreateWarehouseDto,
  ): Promise<Warehouse> {
    return this.warehouseService.createWarehouse(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  @ApiQuery({ name: 'status', enum: WarehouseStatus, required: false })
  @ApiQuery({ name: 'type', enum: WarehouseType, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of warehouses',
  })
  async listWarehouses(
    @Request() req: any,
    @Query('status') status?: WarehouseStatus,
    @Query('type') type?: WarehouseType,
  ): Promise<Warehouse[]> {
    return this.warehouseService.listWarehouses(req.user.tenantId, {
      status,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse details' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse details',
  })
  async getWarehouse(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<Warehouse> {
    return this.warehouseService.getWarehouse(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse updated successfully',
  })
  async updateWarehouse(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    return this.warehouseService.updateWarehouse(req.user.tenantId, id, dto);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a warehouse' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse deactivated',
  })
  async deactivateWarehouse(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<Warehouse> {
    return this.warehouseService.deactivateWarehouse(
      req.user.tenantId,
      id,
      reason,
    );
  }

  @Get(':id/utilization')
  @ApiOperation({ summary: 'Get warehouse utilization analytics' })
  @ApiParam({ name: 'id', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse utilization data',
  })
  async getWarehouseUtilization(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.warehouseService.getWarehouseUtilization(req.user.tenantId, id);
  }

  // Zone Operations
  @Post(':warehouseId/zones')
  @ApiOperation({ summary: 'Create a zone in warehouse' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Zone created successfully',
  })
  async createZone(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: CreateZoneDto,
  ): Promise<Zone> {
    return this.warehouseService.createZone(req.user.tenantId, warehouseId, dto);
  }

  @Get(':warehouseId/zones')
  @ApiOperation({ summary: 'List zones in warehouse' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of zones',
  })
  async listZones(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
  ): Promise<Zone[]> {
    return this.warehouseService.listZones(req.user.tenantId, warehouseId);
  }

  @Get('zones/:zoneId')
  @ApiOperation({ summary: 'Get zone details' })
  @ApiParam({ name: 'zoneId', description: 'Zone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone details',
  })
  async getZone(@Request() req: any, @Param('zoneId') zoneId: string): Promise<Zone> {
    return this.warehouseService.getZone(req.user.tenantId, zoneId);
  }

  @Put('zones/:zoneId')
  @ApiOperation({ summary: 'Update a zone' })
  @ApiParam({ name: 'zoneId', description: 'Zone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone updated successfully',
  })
  async updateZone(
    @Request() req: any,
    @Param('zoneId') zoneId: string,
    @Body() dto: Partial<CreateZoneDto>,
  ): Promise<Zone> {
    return this.warehouseService.updateZone(req.user.tenantId, zoneId, dto);
  }

  @Post('zones/:zoneId/deactivate')
  @ApiOperation({ summary: 'Deactivate a zone' })
  @ApiParam({ name: 'zoneId', description: 'Zone ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone deactivated',
  })
  async deactivateZone(
    @Request() req: any,
    @Param('zoneId') zoneId: string,
  ): Promise<Zone> {
    return this.warehouseService.deactivateZone(req.user.tenantId, zoneId);
  }

  // Location Operations
  @Post('zones/:zoneId/locations')
  @ApiOperation({ summary: 'Create a location in zone' })
  @ApiParam({ name: 'zoneId', description: 'Zone ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Location created successfully',
  })
  async createLocation(
    @Request() req: any,
    @Param('zoneId') zoneId: string,
    @Body() dto: CreateLocationDto,
  ): Promise<Location> {
    return this.warehouseService.createLocation(req.user.tenantId, zoneId, dto);
  }

  @Post('zones/:zoneId/locations/bulk')
  @ApiOperation({ summary: 'Bulk create locations in zone' })
  @ApiParam({ name: 'zoneId', description: 'Zone ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Locations created successfully',
  })
  async bulkCreateLocations(
    @Request() req: any,
    @Param('zoneId') zoneId: string,
    @Body() dto: BulkCreateLocationsDto,
  ): Promise<Location[]> {
    return this.warehouseService.bulkCreateLocations(
      req.user.tenantId,
      zoneId,
      dto,
    );
  }

  @Get(':warehouseId/locations')
  @ApiOperation({ summary: 'List locations in warehouse' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'type', enum: LocationType, required: false })
  @ApiQuery({ name: 'storageClass', enum: StorageClass, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'hasInventory', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of locations',
  })
  async listLocations(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('zoneId') zoneId?: string,
    @Query('type') type?: LocationType,
    @Query('storageClass') storageClass?: StorageClass,
    @Query('isActive') isActive?: boolean,
    @Query('hasInventory') hasInventory?: boolean,
  ): Promise<Location[]> {
    return this.warehouseService.listLocations(req.user.tenantId, warehouseId, {
      zoneId,
      type,
      storageClass,
      isActive,
      hasInventory,
    });
  }

  @Get('locations/:locationId')
  @ApiOperation({ summary: 'Get location details' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location details',
  })
  async getLocation(
    @Request() req: any,
    @Param('locationId') locationId: string,
  ): Promise<Location> {
    return this.warehouseService.getLocation(req.user.tenantId, locationId);
  }

  @Get('locations/barcode/:barcode')
  @ApiOperation({ summary: 'Get location by barcode' })
  @ApiParam({ name: 'barcode', description: 'Location barcode' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location details',
  })
  async getLocationByBarcode(
    @Request() req: any,
    @Param('barcode') barcode: string,
  ): Promise<Location> {
    return this.warehouseService.getLocationByBarcode(req.user.tenantId, barcode);
  }

  @Post('locations/:locationId/block')
  @ApiOperation({ summary: 'Block a location' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location blocked',
  })
  async blockLocation(
    @Request() req: any,
    @Param('locationId') locationId: string,
    @Body('reason') reason: string,
  ): Promise<Location> {
    return this.warehouseService.blockLocation(
      req.user.tenantId,
      locationId,
      reason,
    );
  }

  @Post('locations/:locationId/unblock')
  @ApiOperation({ summary: 'Unblock a location' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location unblocked',
  })
  async unblockLocation(
    @Request() req: any,
    @Param('locationId') locationId: string,
  ): Promise<Location> {
    return this.warehouseService.unblockLocation(req.user.tenantId, locationId);
  }

  // Inventory at Location
  @Post('locations/:locationId/inventory')
  @ApiOperation({ summary: 'Add inventory to location' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory added',
  })
  async addInventoryToLocation(
    @Request() req: any,
    @Param('locationId') locationId: string,
    @Body() item: Omit<InventoryItem, 'id' | 'locationId' | 'availableQuantity'>,
  ): Promise<Location> {
    return this.warehouseService.addInventoryToLocation(
      req.user.tenantId,
      locationId,
      item,
    );
  }

  @Delete('locations/:locationId/inventory/:inventoryItemId')
  @ApiOperation({ summary: 'Remove inventory from location' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'inventoryItemId', description: 'Inventory Item ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory removed',
  })
  async removeInventoryFromLocation(
    @Request() req: any,
    @Param('locationId') locationId: string,
    @Param('inventoryItemId') inventoryItemId: string,
    @Body('quantity') quantity: number,
  ): Promise<Location> {
    return this.warehouseService.removeInventoryFromLocation(
      req.user.tenantId,
      locationId,
      inventoryItemId,
      quantity,
    );
  }

  // Putaway Suggestion
  @Get(':warehouseId/putaway-locations')
  @ApiOperation({ summary: 'Find putaway locations for item' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'itemId', required: true })
  @ApiQuery({ name: 'storageClass', enum: StorageClass, required: false })
  @ApiQuery({ name: 'quantity', type: Number, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suggested putaway locations',
  })
  async findPutawayLocation(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('itemId') itemId: string,
    @Query('storageClass') storageClass: StorageClass = StorageClass.GENERAL,
    @Query('quantity') quantity: number,
  ): Promise<Location[]> {
    return this.warehouseService.findPutawayLocation(
      req.user.tenantId,
      warehouseId,
      itemId,
      storageClass,
      quantity,
    );
  }
}
