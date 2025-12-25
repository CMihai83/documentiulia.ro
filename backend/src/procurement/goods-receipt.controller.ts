import {
  Controller,
  Get,
  Post,
  Put,
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
  GoodsReceiptService,
  GoodsReceipt,
  CreateGoodsReceiptDto,
  InspectionDto,
  DispositionDto,
  GRSearchParams,
  GRStatus,
  InspectionResult,
} from './goods-receipt.service';

@ApiTags('Goods Receipt & Inspection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement/goods-receipts')
export class GoodsReceiptController {
  constructor(private readonly grService: GoodsReceiptService) {}

  // Goods Receipt Management
  @Post()
  @ApiOperation({ summary: 'Create a new goods receipt' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Goods receipt created successfully',
  })
  async createGoodsReceipt(
    @Request() req: any,
    @Body() dto: CreateGoodsReceiptDto,
  ): Promise<GoodsReceipt> {
    return this.grService.createGoodsReceipt(req.user.tenantId, {
      ...dto,
      createdBy: req.user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Search and list goods receipts' })
  @ApiQuery({ name: 'status', enum: GRStatus, required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'inspectionResult', enum: InspectionResult, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of goods receipts',
  })
  async searchGoodsReceipts(
    @Request() req: any,
    @Query('status') status?: GRStatus,
    @Query('supplierId') supplierId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('inspectionResult') inspectionResult?: InspectionResult,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: GoodsReceipt[]; total: number; page: number; limit: number }> {
    const params: GRSearchParams = {
      status,
      supplierId,
      purchaseOrderId,
      warehouseId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      inspectionResult,
      search,
      page,
      limit,
    };

    return this.grService.searchGoodsReceipts(req.user.tenantId, params);
  }

  @Get('by-po/:purchaseOrderId')
  @ApiOperation({ summary: 'Get goods receipts for a purchase order' })
  @ApiParam({ name: 'purchaseOrderId', description: 'Purchase Order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of goods receipts for PO',
  })
  async getGoodsReceiptsByPO(
    @Request() req: any,
    @Param('purchaseOrderId') purchaseOrderId: string,
  ): Promise<GoodsReceipt[]> {
    return this.grService.getGoodsReceiptsByPO(
      req.user.tenantId,
      purchaseOrderId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get goods receipt details' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goods receipt details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Goods receipt not found',
  })
  async getGoodsReceipt(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<GoodsReceipt> {
    return this.grService.getGoodsReceipt(req.user.tenantId, id);
  }

  // Inspection Workflow
  @Post(':id/start-inspection')
  @ApiOperation({ summary: 'Start inspection process' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection started',
  })
  async startInspection(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<GoodsReceipt> {
    return this.grService.startInspection(
      req.user.tenantId,
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
  }

  @Post(':id/record-inspection')
  @ApiOperation({ summary: 'Record inspection results for line items' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection recorded',
  })
  async recordInspection(
    @Request() req: any,
    @Param('id') id: string,
    @Body('inspections') inspections: InspectionDto[],
  ): Promise<GoodsReceipt> {
    return this.grService.recordInspection(
      req.user.tenantId,
      id,
      inspections,
      req.user.id,
    );
  }

  @Post(':id/complete-inspection')
  @ApiOperation({ summary: 'Complete the inspection process' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection completed',
  })
  async completeInspection(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<GoodsReceipt> {
    return this.grService.completeInspection(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  // Disposition
  @Post(':id/disposition')
  @ApiOperation({ summary: 'Set disposition for inspected items' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disposition set',
  })
  async setDisposition(
    @Request() req: any,
    @Param('id') id: string,
    @Body('dispositions') dispositions: DispositionDto[],
  ): Promise<GoodsReceipt> {
    return this.grService.setDisposition(
      req.user.tenantId,
      id,
      dispositions,
      req.user.id,
    );
  }

  // Inventory Posting
  @Post(':id/post')
  @ApiOperation({ summary: 'Post goods receipt to inventory' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Posted to inventory',
  })
  async postToInventory(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<GoodsReceipt> {
    return this.grService.postToInventory(req.user.tenantId, id, req.user.id);
  }

  // Cancel
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a goods receipt' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goods receipt cancelled',
  })
  async cancelGoodsReceipt(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<GoodsReceipt> {
    return this.grService.cancelGoodsReceipt(
      req.user.tenantId,
      id,
      req.user.id,
      reason,
    );
  }

  // Return Request
  @Post(':id/return-request')
  @ApiOperation({ summary: 'Create a return request for rejected items' })
  @ApiParam({ name: 'id', description: 'Goods Receipt ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return request created',
  })
  async createReturnRequest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { lineIds: string[]; reason: string },
  ): Promise<{ returnRequestId: string; goodsReceipt: GoodsReceipt }> {
    return this.grService.createReturnRequest(
      req.user.tenantId,
      id,
      body.lineIds,
      body.reason,
      req.user.id,
    );
  }

  // Analytics
  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get goods receipt analytics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goods receipt analytics',
  })
  async getGRAnalytics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<{
    totalReceipts: number;
    totalValue: number;
    totalQuantityReceived: number;
    totalQuantityAccepted: number;
    totalQuantityRejected: number;
    acceptanceRate: number;
    averageInspectionTime: number;
  }> {
    return this.grService.getGRAnalytics(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}
