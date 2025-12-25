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
  PurchaseOrdersService,
  PurchaseOrder,
  CreatePODto,
  UpdatePODto,
  CreatePOLineDto,
  AmendPOLineDto,
  POReceiptDto,
  POSearchParams,
  POStatus,
} from './purchase-orders.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  // PO Management
  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Purchase order created successfully',
  })
  async createPurchaseOrder(
    @Request() req: any,
    @Body() dto: CreatePODto,
  ): Promise<PurchaseOrder> {
    return this.poService.createPurchaseOrder(req.user.tenantId, {
      ...dto,
      createdBy: req.user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Search and list purchase orders' })
  @ApiQuery({ name: 'status', enum: POStatus, required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'minAmount', type: Number, required: false })
  @ApiQuery({ name: 'maxAmount', type: Number, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'requisitionId', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of purchase orders',
  })
  async searchPurchaseOrders(
    @Request() req: any,
    @Query('status') status?: POStatus,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('search') search?: string,
    @Query('requisitionId') requisitionId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const params: POSearchParams = {
      status,
      supplierId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      minAmount,
      maxAmount,
      search,
      requisitionId,
      page,
      limit,
    };

    return this.poService.searchPurchaseOrders(req.user.tenantId, params);
  }

  @Get('by-supplier/:supplierId')
  @ApiOperation({ summary: 'Get purchase orders by supplier' })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of supplier purchase orders',
  })
  async getPurchaseOrdersBySupplier(
    @Request() req: any,
    @Param('supplierId') supplierId: string,
  ): Promise<PurchaseOrder[]> {
    return this.poService.getPurchaseOrdersBySupplier(
      req.user.tenantId,
      supplierId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order details' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Purchase order not found',
  })
  async getPurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.poService.getPurchaseOrder(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order updated successfully',
  })
  async updatePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePODto,
  ): Promise<PurchaseOrder> {
    return this.poService.updatePurchaseOrder(req.user.tenantId, id, dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID to duplicate' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Purchase order duplicated successfully',
  })
  async duplicatePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.poService.duplicatePurchaseOrder(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  // Line Management
  @Post(':id/lines')
  @ApiOperation({ summary: 'Add a line item to purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Line item added successfully',
  })
  async addLineItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { line: CreatePOLineDto; reason: string },
  ): Promise<PurchaseOrder> {
    return this.poService.addLineItem(
      req.user.tenantId,
      id,
      body.line,
      req.user.id,
      req.user.name || req.user.email,
      body.reason,
    );
  }

  @Put(':id/lines/:lineId')
  @ApiOperation({ summary: 'Amend a line item' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiParam({ name: 'lineId', description: 'Line item ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Line item amended successfully',
  })
  async amendLineItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: Omit<AmendPOLineDto, 'lineId'>,
  ): Promise<PurchaseOrder> {
    return this.poService.amendLine(
      req.user.tenantId,
      id,
      { ...dto, lineId },
      req.user.id,
      req.user.name || req.user.email,
    );
  }

  // Status Transitions
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit purchase order for approval' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order submitted for approval',
  })
  async submitForApproval(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.poService.submitForApproval(req.user.tenantId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order approved',
  })
  async approvePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.poService.approvePurchaseOrder(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order rejected',
  })
  async rejectPurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<PurchaseOrder> {
    return this.poService.rejectPurchaseOrder(
      req.user.tenantId,
      id,
      req.user.id,
      reason,
    );
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send purchase order to supplier' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order sent to supplier',
  })
  async sendToSupplier(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.poService.sendToSupplier(req.user.tenantId, id);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge purchase order (supplier action)' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order acknowledged',
  })
  async acknowledgePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('promisedDeliveryDate') promisedDeliveryDate?: string,
  ): Promise<PurchaseOrder> {
    return this.poService.acknowledgeBySupplier(
      req.user.tenantId,
      id,
      promisedDeliveryDate ? new Date(promisedDeliveryDate) : undefined,
    );
  }

  // Receipt Processing
  @Post(':id/receive')
  @ApiOperation({ summary: 'Record goods receipt against purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Receipt recorded successfully',
  })
  async recordReceipt(
    @Request() req: any,
    @Param('id') id: string,
    @Body('receipts') receipts: POReceiptDto[],
  ): Promise<PurchaseOrder> {
    return this.poService.recordReceipt(
      req.user.tenantId,
      id,
      receipts,
      req.user.id,
    );
  }

  // Invoice & Close
  @Post(':id/invoice')
  @ApiOperation({ summary: 'Mark purchase order as invoiced' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order marked as invoiced',
  })
  async markAsInvoiced(
    @Request() req: any,
    @Param('id') id: string,
    @Body('invoiceId') invoiceId: string,
  ): Promise<PurchaseOrder> {
    return this.poService.markAsInvoiced(req.user.tenantId, id, invoiceId);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order closed',
  })
  async closePurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<PurchaseOrder> {
    return this.poService.closePurchaseOrder(
      req.user.tenantId,
      id,
      req.user.id,
      reason,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order cancelled',
  })
  async cancelPurchaseOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<PurchaseOrder> {
    return this.poService.cancelPurchaseOrder(
      req.user.tenantId,
      id,
      req.user.id,
      reason,
    );
  }

  // Analytics
  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get purchase order analytics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase order analytics',
  })
  async getPOAnalytics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<{
    totalPOs: number;
    totalValue: number;
    averageValue: number;
    byStatus: Record<POStatus, number>;
    bySupplier: { supplierId: string; supplierName: string; count: number; value: number }[];
    averageLeadTime: number;
    onTimeDeliveryRate: number;
  }> {
    return this.poService.getPOAnalytics(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}
