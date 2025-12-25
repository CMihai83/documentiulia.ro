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
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  InventoryService,
  InventoryCategory,
  MovementType,
  AlertType,
  AlertSeverity,
  QualityStatus,
  ValuationMethod,
  CycleCountStatus,
  CycleCountType,
  RFIDTagType,
  RFIDStatus,
  WarehouseType,
  ZoneType,
  LocationType,
  ReviewFrequency,
  CreateItemDto,
  CreateWarehouseDto,
  CreateZoneDto,
  CreateLocationDto,
  CreateBatchDto,
  StockReceiptDto,
  StockIssueDto,
} from './inventory.service';

// Inventory Management Controller
// Real-time tracking, RFID/QR scanning, warehouse management, stock alerts
// Batch/lot tracking, inventory valuation, cycle counting

@Controller('logistics/inventory')
@UseGuards(ThrottlerGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // =================== INVENTORY ITEMS ===================

  @Post('items')
  async createItem(@Body() dto: CreateItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Get('items')
  async getItems(
    @Query('category') category?: InventoryCategory,
    @Query('warehouseId') warehouseId?: string,
    @Query('zoneId') zoneId?: string,
    @Query('isActive', new DefaultValuePipe(true), ParseBoolPipe) isActive?: boolean,
    @Query('lowStock', new DefaultValuePipe(false), ParseBoolPipe) lowStock?: boolean,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getItems({
      category,
      warehouseId,
      zoneId,
      isActive,
      lowStock,
      search,
    });
  }

  @Get('items/:id')
  async getItemById(@Param('id') id: string) {
    return this.inventoryService.getItemById(id);
  }

  @Get('items/sku/:sku')
  async getItemBySku(@Param('sku') sku: string) {
    return this.inventoryService.getItemBySku(sku);
  }

  @Get('items/barcode/:barcode')
  async getItemByBarcode(@Param('barcode') barcode: string) {
    return this.inventoryService.getItemByBarcode(barcode);
  }

  @Put('items/:id')
  async updateItem(@Param('id') id: string, @Body() dto: Partial<CreateItemDto>) {
    return this.inventoryService.updateItem(id, dto);
  }

  @Delete('items/:id')
  async deactivateItem(@Param('id') id: string) {
    return this.inventoryService.deactivateItem(id);
  }

  // =================== WAREHOUSES ===================

  @Post('warehouses')
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('warehouses')
  async getWarehouses(
    @Query('isActive', new DefaultValuePipe(true), ParseBoolPipe) isActive?: boolean,
    @Query('type') type?: WarehouseType,
  ) {
    return this.inventoryService.getWarehouses({ isActive, type });
  }

  @Get('warehouses/:id')
  async getWarehouseById(@Param('id') id: string) {
    return this.inventoryService.getWarehouseById(id);
  }

  // =================== ZONES ===================

  @Post('zones')
  async createZone(@Body() dto: CreateZoneDto) {
    return this.inventoryService.createZone(dto);
  }

  @Get('zones')
  async getZones(@Query('warehouseId') warehouseId: string) {
    return this.inventoryService.getZones(warehouseId);
  }

  @Get('zones/:id')
  async getZoneById(@Param('id') id: string) {
    return this.inventoryService.getZoneById(id);
  }

  // =================== LOCATIONS ===================

  @Post('locations')
  async createLocation(@Body() dto: CreateLocationDto) {
    return this.inventoryService.createLocation(dto);
  }

  @Get('locations')
  async getLocations(@Query('zoneId') zoneId?: string) {
    return this.inventoryService.getLocations(zoneId);
  }

  @Get('locations/:id')
  async getLocationById(@Param('id') id: string) {
    return this.inventoryService.getLocationById(id);
  }

  @Post('locations/:id/block')
  async blockLocation(@Param('id') id: string, @Body('reason') reason: string) {
    return this.inventoryService.blockLocation(id, reason);
  }

  @Post('locations/:id/unblock')
  async unblockLocation(@Param('id') id: string) {
    return this.inventoryService.unblockLocation(id);
  }

  // =================== BATCHES ===================

  @Post('batches')
  async createBatch(@Body() dto: CreateBatchDto) {
    return this.inventoryService.createBatch(dto);
  }

  @Get('batches')
  async getBatches(
    @Query('itemId') itemId?: string,
    @Query('status') status?: QualityStatus,
  ) {
    return this.inventoryService.getBatches(itemId, status);
  }

  @Get('batches/expiring')
  async getExpiringBatches(
    @Query('daysAhead', new DefaultValuePipe(30), ParseIntPipe) daysAhead: number,
  ) {
    return this.inventoryService.getExpiringBatches(daysAhead);
  }

  @Get('batches/:id')
  async getBatchById(@Param('id') id: string) {
    return this.inventoryService.getBatchById(id);
  }

  @Put('batches/:id/quality')
  async updateBatchQualityStatus(
    @Param('id') id: string,
    @Body('status') status: QualityStatus,
    @Body('notes') notes?: string,
  ) {
    return this.inventoryService.updateBatchQualityStatus(id, status, notes);
  }

  // =================== SERIAL NUMBERS ===================

  @Post('serial-numbers')
  async registerSerialNumber(
    @Body('itemId') itemId: string,
    @Body('serialNumber') serialNumber: string,
    @Body('batchId') batchId?: string,
  ) {
    return this.inventoryService.registerSerialNumber(itemId, serialNumber, batchId);
  }

  @Get('serial-numbers')
  async getSerialNumbers(@Query('itemId') itemId: string) {
    return this.inventoryService.getSerialNumbers(itemId);
  }

  @Put('serial-numbers/:serialNumber/status')
  async updateSerialNumberStatus(
    @Param('serialNumber') serialNumber: string,
    @Body('status') status: string,
    @Body('customerId') customerId?: string,
  ) {
    return this.inventoryService.updateSerialNumberStatus(
      serialNumber,
      status as any,
      customerId,
    );
  }

  // =================== RFID ===================

  @Post('rfid/tags')
  async registerRFIDTag(
    @Body('tagId') tagId: string,
    @Body('type') type: RFIDTagType,
    @Body('referenceId') referenceId: string,
  ) {
    return this.inventoryService.registerRFIDTag(tagId, type, referenceId);
  }

  @Get('rfid/tags')
  async getRFIDTags(
    @Query('type') type?: RFIDTagType,
    @Query('status') status?: RFIDStatus,
  ) {
    return this.inventoryService.getRFIDTags({ type, status });
  }

  @Get('rfid/tags/:tagId')
  async getRFIDTagByTagId(@Param('tagId') tagId: string) {
    return this.inventoryService.getRFIDTagByTagId(tagId);
  }

  @Post('rfid/read')
  async processRFIDRead(
    @Body('readerId') readerId: string,
    @Body('tagId') tagId: string,
    @Body('antennaId') antennaId: number,
    @Body('rssi') rssi: number,
  ) {
    return this.inventoryService.processRFIDRead(readerId, tagId, antennaId, rssi);
  }

  @Get('rfid/readers')
  async getRFIDReaders(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getRFIDReaders(warehouseId);
  }

  @Get('rfid/readers/:id')
  async getRFIDReaderById(@Param('id') id: string) {
    return this.inventoryService.getRFIDReaderById(id);
  }

  @Put('rfid/readers/:id/status')
  async updateReaderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.inventoryService.updateReaderStatus(id, status as any);
  }

  // =================== QR CODE ===================

  @Post('qr/generate')
  async generateQRCode(
    @Body('type') type: string,
    @Body('referenceId') referenceId: string,
    @Body('additionalData') additionalData?: Record<string, any>,
  ) {
    return {
      code: this.inventoryService.generateQRCode(type as any, referenceId, additionalData),
    };
  }

  @Get('qr/:code')
  async getQRCodeData(@Param('code') code: string) {
    return this.inventoryService.getQRCodeData(code);
  }

  @Post('qr/:code/scan')
  async processQRScan(@Param('code') code: string) {
    return this.inventoryService.processQRScan(code);
  }

  // =================== STOCK MOVEMENTS ===================

  @Post('stock/receive')
  async receiveStock(@Body() dto: StockReceiptDto) {
    return this.inventoryService.receiveStock(dto);
  }

  @Post('stock/issue')
  async issueStock(@Body() dto: StockIssueDto) {
    return this.inventoryService.issueStock(dto);
  }

  @Post('stock/transfer')
  async transferStock(
    @Body('itemId') itemId: string,
    @Body('quantity') quantity: number,
    @Body('fromLocationId') fromLocationId: string,
    @Body('toLocationId') toLocationId: string,
    @Body('batchId') batchId?: string,
    @Body('notes') notes?: string,
  ) {
    return this.inventoryService.transferStock(
      itemId,
      quantity,
      fromLocationId,
      toLocationId,
      batchId,
      notes,
    );
  }

  @Post('stock/adjust')
  async adjustStock(
    @Body('itemId') itemId: string,
    @Body('quantity') quantity: number,
    @Body('reason') reason: string,
    @Body('batchId') batchId?: string,
  ) {
    return this.inventoryService.adjustStock(itemId, quantity, reason, batchId);
  }

  @Get('stock/movements')
  async getMovements(
    @Query('itemId') itemId?: string,
    @Query('type') type?: MovementType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.inventoryService.getMovements({
      itemId,
      type,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  // =================== ALERTS ===================

  @Get('alerts')
  async getAlerts(
    @Query('itemId') itemId?: string,
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
    @Query('acknowledged', new DefaultValuePipe(undefined)) acknowledged?: string,
    @Query('resolved', new DefaultValuePipe(undefined)) resolved?: string,
  ) {
    return this.inventoryService.getAlerts({
      itemId,
      type,
      severity,
      acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    });
  }

  @Post('alerts/:id/acknowledge')
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.inventoryService.acknowledgeAlert(id, userId);
  }

  @Post('alerts/:id/resolve')
  async resolveAlert(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.inventoryService.resolveAlert(id, userId);
  }

  // =================== REORDER ===================

  @Post('reorder/rules')
  async createReorderRule(
    @Body() data: {
      itemId: string;
      isEnabled: boolean;
      reorderPoint: number;
      reorderQuantity: number;
      maxOrderQuantity?: number;
      preferredSupplierId?: string;
      leadTimeDays: number;
      safetyStockDays: number;
      reviewFrequency: ReviewFrequency;
    },
  ) {
    return this.inventoryService.createReorderRule(data);
  }

  @Get('reorder/rules')
  async getReorderRules(@Query('itemId') itemId?: string) {
    return this.inventoryService.getReorderRules(itemId);
  }

  @Put('reorder/rules/:id')
  async updateReorderRule(
    @Param('id') id: string,
    @Body() updates: any,
  ) {
    return this.inventoryService.updateReorderRule(id, updates);
  }

  @Get('reorder/suggestions')
  async getReorderSuggestions() {
    return this.inventoryService.getReorderSuggestions();
  }

  // =================== VALUATION ===================

  @Get('valuation/:itemId')
  async calculateValuation(
    @Param('itemId') itemId: string,
    @Query('method', new DefaultValuePipe('WEIGHTED_AVERAGE')) method: ValuationMethod,
  ) {
    return this.inventoryService.calculateValuation(itemId, method);
  }

  @Get('valuation/total')
  async getTotalInventoryValue(
    @Query('method', new DefaultValuePipe('WEIGHTED_AVERAGE')) method: ValuationMethod,
  ) {
    return this.inventoryService.getTotalInventoryValue(method);
  }

  // =================== CYCLE COUNT ===================

  @Post('cycle-count')
  async createCycleCount(
    @Body() data: {
      warehouseId: string;
      zoneId?: string;
      type: CycleCountType;
      scheduledDate: string;
      assignedTo: string[];
      itemIds?: string[];
    },
  ) {
    return this.inventoryService.createCycleCount({
      ...data,
      scheduledDate: new Date(data.scheduledDate),
    });
  }

  @Get('cycle-count')
  async getCycleCounts(
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: CycleCountStatus,
  ) {
    return this.inventoryService.getCycleCounts({ warehouseId, status });
  }

  @Post('cycle-count/:id/start')
  async startCycleCount(@Param('id') id: string) {
    return this.inventoryService.startCycleCount(id);
  }

  @Post('cycle-count/:id/record')
  async recordCount(
    @Param('id') id: string,
    @Body('itemId') itemId: string,
    @Body('countedQuantity') countedQuantity: number,
    @Body('countedBy') countedBy: string,
    @Body('notes') notes?: string,
  ) {
    return this.inventoryService.recordCount(id, itemId, countedQuantity, countedBy, notes);
  }

  @Post('cycle-count/:id/complete')
  async completeCycleCount(
    @Param('id') id: string,
    @Query('adjustInventory', new DefaultValuePipe(true), ParseBoolPipe) adjustInventory: boolean,
  ) {
    return this.inventoryService.completeCycleCount(id, adjustInventory);
  }

  // =================== REPORTS ===================

  @Get('reports/summary')
  async getInventorySummary(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getInventorySummary(warehouseId);
  }

  @Get('reports/movements')
  async getStockMovementReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getStockMovementReport(
      new Date(fromDate),
      new Date(toDate),
      itemId,
    );
  }

  @Get('reports/slow-moving')
  async getSlowMovingItems(
    @Query('daysSinceLastMovement', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    return this.inventoryService.getSlowMovingItems(days);
  }

  @Get('reports/dead-stock')
  async getDeadStock(
    @Query('daysSinceLastMovement', new DefaultValuePipe(365), ParseIntPipe) days: number,
  ) {
    return this.inventoryService.getDeadStock(days);
  }
}
