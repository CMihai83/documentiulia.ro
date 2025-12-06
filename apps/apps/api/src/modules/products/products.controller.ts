import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product/service' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 409, description: 'Product code already exists' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.create(companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products/services' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['PRODUCT', 'SERVICE'] })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Products returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('active') active?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findAll(companyId, user.id, {
      search,
      type,
      active: active !== undefined ? active === 'true' : undefined,
      page,
      limit,
    });
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Low stock products returned' })
  async getLowStock(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.getLowStockProducts(companyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product returned' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.findOne(companyId, id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.update(companyId, id, dto, user.id);
  }

  @Put(':id/stock')
  @ApiOperation({ summary: 'Update product stock' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock updated' })
  async updateStock(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @CurrentUser() user: any,
  ) {
    return this.productsService.updateStock(companyId, id, quantity, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product (or deactivate if used)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 204, description: 'Product deleted/deactivated' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.delete(companyId, id, user.id);
  }

  @Post('bulk-update-prices')
  @ApiOperation({ summary: 'Bulk update product prices' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Prices updated' })
  async bulkUpdatePrices(
    @Param('companyId') companyId: string,
    @Body() updates: { id: string; unitPrice: number }[],
    @CurrentUser() user: any,
  ) {
    return this.productsService.bulkUpdatePrices(companyId, updates, user.id);
  }
}
