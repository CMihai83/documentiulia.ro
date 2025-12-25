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
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WarehouseService, ValuationMethod } from './warehouse.service';

@ApiTags('Warehouse Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ==================== WAREHOUSE CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully' })
  async createWarehouse(
    @Request() req: any,
    @Body() data: {
      code: string;
      name: string;
      type: string;
      address: {
        street: string;
        city: string;
        county: string;
        postalCode: string;
        country: string;
      };
      manager?: string;
      phone?: string;
      email?: string;
      capacity?: number;
      capacityUnit?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.createWarehouse(userId, {
      ...data,
      type: data.type as any,
      isActive: true,
    } as any);
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiResponse({ status: 200, description: 'Warehouses retrieved successfully' })
  async getWarehouses(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getWarehouses(userId, {
      type,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':warehouseId')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse retrieved successfully' })
  async getWarehouse(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getWarehouse(userId, warehouseId);
  }

  @Put(':warehouseId')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully' })
  async updateWarehouse(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Body() data: any,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.updateWarehouse(userId, warehouseId, data);
  }

  @Delete(':warehouseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a warehouse' })
  @ApiResponse({ status: 204, description: 'Warehouse deleted successfully' })
  async deleteWarehouse(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    await this.warehouseService.deleteWarehouse(userId, warehouseId);
  }

  // ==================== LOCATIONS ====================

  @Post(':warehouseId/locations')
  @ApiOperation({ summary: 'Create a location within a warehouse' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  async createLocation(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Body() data: any,
  ) {
    return this.warehouseService.createLocation(warehouseId, data);
  }

  @Get(':warehouseId/locations')
  @ApiOperation({ summary: 'Get all locations in a warehouse' })
  @ApiResponse({ status: 200, description: 'Locations retrieved successfully' })
  async getLocations(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('type') type?: string,
    @Query('zone') zone?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getLocations(userId, warehouseId, { type, zone });
  }

  @Put(':warehouseId/locations/:locationId')
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateLocation(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Param('locationId') locationId: string,
    @Body() data: any,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.updateLocation(userId, locationId, data);
  }

  // ==================== PRODUCTS ====================

  @Post('products')
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async createProduct(
    @Request() req: any,
    @Body() data: {
      sku: string;
      name: string;
      description?: string;
      category?: string;
      unit: string;
      barcode?: string;
      weight?: number;
      weightUnit?: string;
      dimensions?: { length: number; width: number; height: number; unit: string };
      minStockLevel?: number;
      maxStockLevel?: number;
      reorderPoint?: number;
      reorderQuantity?: number;
      valuationMethod?: ValuationMethod;
      standardCost?: number;
      isActive?: boolean;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.createProduct(userId, {
      ...data,
      unitOfMeasure: data.unit as any,
      vatRate: 19,
      isActive: data.isActive ?? true,
    } as any);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async getProducts(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getProducts(userId, {
      category,
      search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  async getProduct(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getProduct(userId, productId);
  }

  @Put('products/:productId')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async updateProduct(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() data: any,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.updateProduct(userId, productId, data);
  }

  // ==================== STOCK LEVELS ====================

  @Get('stock')
  @ApiOperation({ summary: 'Get stock levels across all warehouses' })
  @ApiResponse({ status: 200, description: 'Stock levels retrieved successfully' })
  async getStockLevels(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getStockLevels(userId, { warehouseId, productId, status });
  }

  @Get('stock/product/:productId')
  @ApiOperation({ summary: 'Get stock level for a specific product across all warehouses' })
  @ApiResponse({ status: 200, description: 'Product stock levels retrieved successfully' })
  async getProductStockLevels(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getProductStockLevels(userId, productId);
  }

  @Get('stock/warehouse/:warehouseId')
  @ApiOperation({ summary: 'Get all stock levels in a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse stock levels retrieved successfully' })
  async getWarehouseStockLevels(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getWarehouseStockLevels(userId, warehouseId);
  }

  @Get('stock/low')
  @ApiOperation({ summary: 'Get products with low stock levels' })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved successfully' })
  async getLowStockProducts(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getLowStockProducts(userId);
  }

  // ==================== STOCK MOVEMENTS ====================

  @Post('movements/receive')
  @ApiOperation({ summary: 'Receive stock into warehouse (goods receipt)' })
  @ApiResponse({ status: 201, description: 'Stock received successfully' })
  async receiveStock(
    @Request() req: any,
    @Body() data: {
      warehouseId: string;
      locationId?: string;
      productId: string;
      quantity: number;
      unitCost: number;
      reference?: string;
      sourceDocument?: string;
      batchNumber?: string;
      expiryDate?: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.receiveStock(userId, userId, data);
  }

  @Post('movements/issue')
  @ApiOperation({ summary: 'Issue stock from warehouse (goods issue)' })
  @ApiResponse({ status: 201, description: 'Stock issued successfully' })
  async issueStock(
    @Request() req: any,
    @Body() data: {
      warehouseId: string;
      locationId?: string;
      productId: string;
      quantity: number;
      reference?: string;
      destinationDocument?: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.issueStock(userId, userId, data);
  }

  @Post('movements/transfer')
  @ApiOperation({ summary: 'Transfer stock between warehouses or locations' })
  @ApiResponse({ status: 201, description: 'Stock transferred successfully' })
  async transferStock(
    @Request() req: any,
    @Body() data: {
      fromWarehouseId: string;
      fromLocationId?: string;
      toWarehouseId: string;
      toLocationId?: string;
      productId: string;
      quantity: number;
      reference?: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.transferStock(userId, {
      productId: data.productId,
      sourceWarehouseId: data.fromWarehouseId,
      sourceLocationId: data.fromLocationId,
      destinationWarehouseId: data.toWarehouseId,
      destinationLocationId: data.toLocationId,
      quantity: data.quantity,
      reference: data.reference,
    });
  }

  @Post('movements/adjust')
  @ApiOperation({ summary: 'Adjust stock quantity (inventory adjustment)' })
  @ApiResponse({ status: 201, description: 'Stock adjusted successfully' })
  async adjustStock(
    @Request() req: any,
    @Body() data: {
      warehouseId: string;
      locationId?: string;
      productId: string;
      adjustmentQuantity: number;
      reason: string;
      reference?: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    const stockLevels = await this.warehouseService.getStockLevels(userId, {
      warehouseId: data.warehouseId,
      productId: data.productId,
    });
    const currentQty = stockLevels.reduce((sum, s) => sum + s.quantity, 0);

    return this.warehouseService.adjustStock(userId, {
      productId: data.productId,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      newQuantity: currentQty + data.adjustmentQuantity,
      reason: data.reason,
      reference: data.reference,
    });
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiResponse({ status: 200, description: 'Movements retrieved successfully' })
  async getMovements(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getMovements(userId, {
      warehouseId,
      productId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ==================== RESERVATIONS ====================

  @Post('reservations')
  @ApiOperation({ summary: 'Create a stock reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  async createReservation(
    @Request() req: any,
    @Body() data: {
      warehouseId: string;
      productId: string;
      quantity: number;
      reference: string;
      expiresAt?: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.createReservation(userId, userId, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }

  @Get('reservations')
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiResponse({ status: 200, description: 'Reservations retrieved successfully' })
  async getReservations(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getReservations(userId, { warehouseId, productId, status });
  }

  @Post('reservations/:reservationId/fulfill')
  @ApiOperation({ summary: 'Fulfill a reservation (issue reserved stock)' })
  @ApiResponse({ status: 200, description: 'Reservation fulfilled successfully' })
  async fulfillReservation(
    @Request() req: any,
    @Param('reservationId') reservationId: string,
  ) {
    return this.warehouseService.fulfillReservation(reservationId);
  }

  @Delete('reservations/:reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({ status: 204, description: 'Reservation cancelled successfully' })
  async cancelReservation(
    @Request() req: any,
    @Param('reservationId') reservationId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    await this.warehouseService.cancelReservation(userId, reservationId);
  }

  // ==================== STOCK COUNTS ====================

  @Post('counts')
  @ApiOperation({ summary: 'Create a stock count (inventory count)' })
  @ApiResponse({ status: 201, description: 'Stock count created successfully' })
  async createStockCount(
    @Request() req: any,
    @Body() data: {
      warehouseId: string;
      type: 'FULL' | 'CYCLE' | 'SPOT';
      scheduledDate: string;
      productIds?: string[];
      locationIds?: string[];
      notes?: string;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.createStockCount(userId, data.warehouseId, data.type);
  }

  @Get('counts')
  @ApiOperation({ summary: 'Get all stock counts' })
  @ApiResponse({ status: 200, description: 'Stock counts retrieved successfully' })
  async getStockCounts(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getStockCounts(userId, { warehouseId, status });
  }

  @Get('counts/:countId')
  @ApiOperation({ summary: 'Get stock count details' })
  @ApiResponse({ status: 200, description: 'Stock count retrieved successfully' })
  async getStockCount(
    @Request() req: any,
    @Param('countId') countId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getStockCount(userId, countId);
  }

  @Post('counts/:countId/start')
  @ApiOperation({ summary: 'Start a stock count' })
  @ApiResponse({ status: 200, description: 'Stock count started successfully' })
  async startStockCount(
    @Request() req: any,
    @Param('countId') countId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.startStockCount(userId, userId, countId);
  }

  @Post('counts/:countId/record')
  @ApiOperation({ summary: 'Record counted quantities' })
  @ApiResponse({ status: 200, description: 'Counts recorded successfully' })
  async recordStockCount(
    @Request() req: any,
    @Param('countId') countId: string,
    @Body() data: {
      items: Array<{
        productId: string;
        locationId?: string;
        countedQuantity: number;
        notes?: string;
      }>;
    },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.recordStockCount(userId, userId, countId, data.items);
  }

  @Post('counts/:countId/complete')
  @ApiOperation({ summary: 'Complete a stock count and generate variances' })
  @ApiResponse({ status: 200, description: 'Stock count completed successfully' })
  async completeStockCount(
    @Request() req: any,
    @Param('countId') countId: string,
    @Body() data: { applyAdjustments: boolean },
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.completeStockCount(countId, data.applyAdjustments, userId);
  }

  // ==================== VALUATION ====================

  @Get('valuation')
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @ApiResponse({ status: 200, description: 'Valuation report retrieved successfully' })
  async getInventoryValuation(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getInventoryValuation(userId, warehouseId);
  }

  @Get('valuation/product/:productId')
  @ApiOperation({ summary: 'Get product valuation details' })
  @ApiResponse({ status: 200, description: 'Product valuation retrieved successfully' })
  async getProductValuation(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getProductValuation(userId, productId);
  }

  // ==================== ANALYTICS ====================

  @Get('analytics/turnover')
  @ApiOperation({ summary: 'Get inventory turnover analysis' })
  @ApiResponse({ status: 200, description: 'Turnover analysis retrieved successfully' })
  async getInventoryTurnover(
    @Request() req: any,
    @Query('period') period?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getInventoryTurnover(userId, parseInt(period || '30', 10));
  }

  @Get('analytics/abc')
  @ApiOperation({ summary: 'Get ABC analysis of products' })
  @ApiResponse({ status: 200, description: 'ABC analysis retrieved successfully' })
  async getABCAnalysis(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getABCAnalysis(userId);
  }

  @Get('analytics/aging')
  @ApiOperation({ summary: 'Get inventory aging report' })
  @ApiResponse({ status: 200, description: 'Aging report retrieved successfully' })
  async getInventoryAging(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getInventoryAging(userId);
  }

  // ==================== REPORTS ====================

  @Get('reports/stock-status')
  @ApiOperation({ summary: 'Get stock status report' })
  @ApiResponse({ status: 200, description: 'Stock status report retrieved successfully' })
  async getStockStatusReport(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getStockStatusReport(userId, warehouseId);
  }

  @Get('reports/movement-summary')
  @ApiOperation({ summary: 'Get movement summary report' })
  @ApiResponse({ status: 200, description: 'Movement summary retrieved successfully' })
  async getMovementSummary(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getMovementSummary(userId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      warehouseId,
    });
  }

  // ==================== SAGA INTEGRATION ====================

  @Post('sync/saga')
  @ApiOperation({ summary: 'Sync inventory with SAGA' })
  @ApiResponse({ status: 200, description: 'SAGA sync completed successfully' })
  async syncWithSaga(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.syncWithSaga(userId);
  }

  @Get('sync/saga/status')
  @ApiOperation({ summary: 'Get SAGA sync status' })
  @ApiResponse({ status: 200, description: 'SAGA sync status retrieved successfully' })
  async getSagaSyncStatus(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id || 'anonymous';
    return this.warehouseService.getSagaSyncStatus(userId);
  }
}
