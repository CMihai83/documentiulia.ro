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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, StockMovementType, StockAlertType, StockAlertStatus } from '@prisma/client';
import { InventoryService, CreateProductDto, UpdateProductDto, StockAdjustmentDto } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // =================== PRODUCTS ===================

  @Post('products')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async createProduct(@Request() req: any, @Body() dto: CreateProductDto) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.createProduct(userId, dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products with filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProducts(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');

    return this.inventoryService.getProducts(userId, {
      category,
      search,
      lowStockOnly: lowStockOnly === 'true',
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  async getProduct(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.getProduct(userId, id);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.updateProduct(userId, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.deleteProduct(userId, id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get product categories' })
  async getCategories(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.getCategories(userId);
  }

  // =================== STOCK MANAGEMENT ===================

  @Post('stock/adjust')
  @ApiOperation({ summary: 'Adjust stock levels' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully' })
  async adjustStock(@Request() req: any, @Body() dto: StockAdjustmentDto) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.adjustStock(userId, dto);
  }

  @Post('stock/receive')
  @ApiOperation({ summary: 'Receive stock (stock in)' })
  async receiveStock(
    @Request() req: any,
    @Body() body: {
      productId: string;
      quantity: number;
      reference?: string;
      unitCost?: number;
      notes?: string;
    },
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');

    return this.inventoryService.adjustStock(userId, {
      productId: body.productId,
      quantity: body.quantity,
      type: StockMovementType.IN,
      reference: body.reference,
      referenceType: 'RECEIPT',
      unitCost: body.unitCost,
      notes: body.notes,
    });
  }

  @Post('stock/dispatch')
  @ApiOperation({ summary: 'Dispatch stock (stock out)' })
  async dispatchStock(
    @Request() req: any,
    @Body() body: {
      productId: string;
      quantity: number;
      reference?: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');

    return this.inventoryService.adjustStock(userId, {
      productId: body.productId,
      quantity: body.quantity,
      type: StockMovementType.OUT,
      reference: body.reference,
      referenceType: 'DISPATCH',
      notes: body.notes,
    });
  }

  @Get('stock/movements/:productId')
  @ApiOperation({ summary: 'Get stock movements for a product' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', required: false, enum: StockMovementType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getStockMovements(
    @Param('productId') productId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: StockMovementType,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getStockMovements(productId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // =================== STOCK ALERTS ===================

  @Get('alerts')
  @ApiOperation({ summary: 'Get all stock alerts' })
  @ApiQuery({ name: 'type', required: false, enum: StockAlertType })
  @ApiQuery({ name: 'status', required: false, enum: StockAlertStatus })
  async getStockAlerts(
    @Request() req: any,
    @Query('type') type?: StockAlertType,
    @Query('status') status?: StockAlertStatus,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.getStockAlerts(userId, { type, status });
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a stock alert' })
  async acknowledgeAlert(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.acknowledgeAlert(id, userId);
  }

  @Post('alerts/check')
  @ApiOperation({ summary: 'Run stock alert check for all products' })
  async runAlertCheck(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.runStockAlertCheck(userId);
  }

  // =================== DASHBOARD ===================

  @Get('summary')
  @ApiOperation({ summary: 'Get inventory summary for dashboard' })
  async getStockSummary(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID required');
    return this.inventoryService.getStockSummary(userId);
  }
}
