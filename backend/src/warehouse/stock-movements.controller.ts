import {
  Controller,
  Get,
  Post,
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
  StockMovementsService,
  StockMovement,
  StockTransfer,
  CreateMovementDto,
  CreateTransferDto,
  ShipTransferDto,
  ReceiveTransferDto,
  MovementType,
  MovementStatus,
  TransferStatus,
} from './stock-movements.service';

@ApiTags('Stock Movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly movementsService: StockMovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a stock movement' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Movement created successfully',
  })
  async createMovement(
    @Request() req: any,
    @Body() dto: CreateMovementDto,
  ): Promise<StockMovement> {
    return this.movementsService.createMovement(req.user.tenantId, dto);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a pending movement' })
  @ApiParam({ name: 'id', description: 'Movement ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movement executed successfully',
  })
  async executeMovement(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<StockMovement> {
    return this.movementsService.executeMovement(req.user.tenantId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a movement' })
  @ApiParam({ name: 'id', description: 'Movement ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movement cancelled',
  })
  async cancelMovement(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<StockMovement> {
    return this.movementsService.cancelMovement(req.user.tenantId, id, reason);
  }

  @Get()
  @ApiOperation({ summary: 'Search stock movements' })
  @ApiQuery({ name: 'type', enum: MovementType, required: false })
  @ApiQuery({ name: 'status', enum: MovementStatus, required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiQuery({ name: 'referenceType', required: false })
  @ApiQuery({ name: 'referenceId', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of movements',
  })
  async searchMovements(
    @Request() req: any,
    @Query('type') type?: MovementType,
    @Query('status') status?: MovementStatus,
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
    @Query('locationId') locationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('referenceType') referenceType?: string,
    @Query('referenceId') referenceId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: StockMovement[]; total: number; page: number; limit: number }> {
    return this.movementsService.searchMovements(req.user.tenantId, {
      type,
      status,
      warehouseId,
      itemId,
      locationId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      referenceType,
      referenceId,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movement details' })
  @ApiParam({ name: 'id', description: 'Movement ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movement details',
  })
  async getMovement(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<StockMovement> {
    return this.movementsService.getMovement(req.user.tenantId, id);
  }

  @Get('item/:itemId/history')
  @ApiOperation({ summary: 'Get movement history for an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movement history',
  })
  async getMovementHistory(
    @Request() req: any,
    @Param('itemId') itemId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('limit') limit?: number,
  ): Promise<StockMovement[]> {
    return this.movementsService.getMovementHistory(
      req.user.tenantId,
      itemId,
      warehouseId,
      limit,
    );
  }

  @Get('warehouse/:warehouseId/analytics')
  @ApiOperation({ summary: 'Get movement analytics for warehouse' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movement analytics',
  })
  async getMovementAnalytics(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.movementsService.getMovementAnalytics(
      req.user.tenantId,
      warehouseId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}

@ApiTags('Stock Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly movementsService: StockMovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a stock transfer' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transfer created successfully',
  })
  async createTransfer(
    @Request() req: any,
    @Body() dto: CreateTransferDto,
  ): Promise<StockTransfer> {
    return this.movementsService.createTransfer(req.user.tenantId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a transfer for processing' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer submitted',
  })
  async submitTransfer(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<StockTransfer> {
    return this.movementsService.submitTransfer(req.user.tenantId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a transfer' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer approved',
  })
  async approveTransfer(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<StockTransfer> {
    return this.movementsService.approveTransfer(
      req.user.tenantId,
      id,
      req.user.userId,
    );
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Ship a transfer' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer shipped',
  })
  async shipTransfer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ShipTransferDto,
  ): Promise<StockTransfer> {
    return this.movementsService.shipTransfer(req.user.tenantId, id, dto);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive a transfer' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer received',
  })
  async receiveTransfer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReceiveTransferDto,
  ): Promise<StockTransfer> {
    return this.movementsService.receiveTransfer(req.user.tenantId, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a transfer' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer cancelled',
  })
  async cancelTransfer(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<StockTransfer> {
    return this.movementsService.cancelTransfer(req.user.tenantId, id, reason);
  }

  @Get()
  @ApiOperation({ summary: 'Search stock transfers' })
  @ApiQuery({ name: 'status', enum: TransferStatus, required: false })
  @ApiQuery({ name: 'fromWarehouseId', required: false })
  @ApiQuery({ name: 'toWarehouseId', required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of transfers',
  })
  async searchTransfers(
    @Request() req: any,
    @Query('status') status?: TransferStatus,
    @Query('fromWarehouseId') fromWarehouseId?: string,
    @Query('toWarehouseId') toWarehouseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: StockTransfer[]; total: number; page: number; limit: number }> {
    return this.movementsService.searchTransfers(req.user.tenantId, {
      status,
      fromWarehouseId,
      toWarehouseId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer details' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer details',
  })
  async getTransfer(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<StockTransfer> {
    return this.movementsService.getTransfer(req.user.tenantId, id);
  }
}
