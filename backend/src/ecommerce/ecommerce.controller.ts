import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  EcommerceService,
  EcommercePlatform,
  EcommerceCredentials,
  OrderStatus,
  InventoryUpdate,
} from './ecommerce.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('E-commerce - Platform Integrations')
@Controller('ecommerce')
export class EcommerceController {
  constructor(private readonly ecommerceService: EcommerceService) {}

  // =================== PLATFORM INFO ===================

  @Get('platforms')
  @ApiOperation({ summary: 'Get supported e-commerce platforms' })
  @ApiResponse({ status: 200, description: 'List of supported platforms' })
  getSupportedPlatforms() {
    return { platforms: this.ecommerceService.getSupportedPlatforms() };
  }

  @Get('platforms/:platform')
  @ApiOperation({ summary: 'Get platform configuration' })
  @ApiResponse({ status: 200, description: 'Platform configuration' })
  getPlatformConfig(@Param('platform') platform: EcommercePlatform) {
    const config = this.ecommerceService.getPlatformConfig(platform);
    if (!config) {
      throw new BadRequestException('Platform not supported');
    }
    return config;
  }

  // =================== STORE MANAGEMENT ===================

  @Post('stores/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect an e-commerce store' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['shopify', 'woocommerce', 'magento', 'prestashop'] },
        storeUrl: { type: 'string' },
        apiKey: { type: 'string' },
        apiSecret: { type: 'string' },
        accessToken: { type: 'string' },
        webhookSecret: { type: 'string' },
      },
      required: ['platform', 'storeUrl', 'apiKey'],
    },
  })
  @ApiResponse({ status: 201, description: 'Store connected successfully' })
  async connectStore(@Body() credentials: EcommerceCredentials) {
    return this.ecommerceService.connectStore(credentials);
  }

  @Post('stores/:storeId/disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect a store' })
  @ApiResponse({ status: 200, description: 'Store disconnected' })
  async disconnectStore(@Param('storeId') storeId: string) {
    const success = await this.ecommerceService.disconnectStore(storeId);
    return { success, storeId };
  }

  @Get('stores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List connected stores' })
  @ApiQuery({ name: 'platform', required: false })
  @ApiResponse({ status: 200, description: 'List of stores' })
  listStores(@Query('platform') platform?: EcommercePlatform) {
    return { stores: this.ecommerceService.listStores(platform) };
  }

  @Get('stores/:storeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get store details' })
  @ApiResponse({ status: 200, description: 'Store details' })
  getStore(@Param('storeId') storeId: string) {
    const store = this.ecommerceService.getStore(storeId);
    if (!store) {
      throw new BadRequestException('Store not found');
    }
    return store;
  }

  @Put('stores/:storeId/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store settings' })
  @ApiResponse({ status: 200, description: 'Store settings updated' })
  async updateStoreSettings(
    @Param('storeId') storeId: string,
    @Body() settings: Record<string, any>,
  ) {
    return this.ecommerceService.updateStoreSettings(storeId, settings);
  }

  // =================== PRODUCT MANAGEMENT ===================

  @Post('stores/:storeId/products/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync products from store' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async syncProducts(@Param('storeId') storeId: string) {
    return this.ecommerceService.syncProducts(storeId);
  }

  @Get('stores/:storeId/products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'List of products' })
  async listProducts(
    @Param('storeId') storeId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ecommerceService.listProducts(storeId, {
      category,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  async getProduct(@Param('productId') productId: string) {
    const product = await this.ecommerceService.getProduct(productId);
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    return product;
  }

  @Post('stores/:storeId/products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(
    @Param('storeId') storeId: string,
    @Body()
    productData: {
      sku?: string;
      name: string;
      description?: string;
      price: number;
      compareAtPrice?: number;
      inventory?: number;
      category?: string;
      images?: string[];
    },
  ) {
    return this.ecommerceService.createProduct(storeId, productData);
  }

  @Put('products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async updateProduct(
    @Param('productId') productId: string,
    @Body() updates: Record<string, any>,
  ) {
    return this.ecommerceService.updateProduct(productId, updates);
  }

  @Delete('products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async deleteProduct(@Param('productId') productId: string) {
    const success = await this.ecommerceService.deleteProduct(productId);
    return { success, productId };
  }

  // =================== INVENTORY MANAGEMENT ===================

  @Put('stores/:storeId/inventory')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update inventory levels' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              sku: { type: 'string' },
              quantity: { type: 'number' },
              adjustment: { type: 'number' },
            },
          },
        },
      },
      required: ['updates'],
    },
  })
  @ApiResponse({ status: 200, description: 'Inventory updated' })
  async updateInventory(
    @Param('storeId') storeId: string,
    @Body('updates') updates: InventoryUpdate[],
  ) {
    return this.ecommerceService.updateInventory(storeId, updates);
  }

  @Get('stores/:storeId/inventory')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory levels' })
  @ApiResponse({ status: 200, description: 'Inventory levels' })
  async getInventoryLevels(@Param('storeId') storeId: string) {
    return { inventory: await this.ecommerceService.getInventoryLevels(storeId) };
  }

  @Get('stores/:storeId/inventory/low-stock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get low stock products' })
  @ApiQuery({ name: 'threshold', required: false })
  @ApiResponse({ status: 200, description: 'Low stock products' })
  async getLowStockProducts(
    @Param('storeId') storeId: string,
    @Query('threshold') threshold?: string,
  ) {
    return {
      products: await this.ecommerceService.getLowStockProducts(
        storeId,
        threshold ? parseInt(threshold, 10) : 10,
      ),
    };
  }

  // =================== ORDER MANAGEMENT ===================

  @Post('stores/:storeId/orders/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync orders from store' })
  @ApiQuery({ name: 'since', required: false })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async syncOrders(
    @Param('storeId') storeId: string,
    @Query('since') since?: string,
  ) {
    return this.ecommerceService.syncOrders(
      storeId,
      since ? new Date(since) : undefined,
    );
  }

  @Get('stores/:storeId/orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'since', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async listOrders(
    @Param('storeId') storeId: string,
    @Query('status') status?: OrderStatus,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ecommerceService.listOrders(storeId, {
      status,
      since: since ? new Date(since) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.ecommerceService.getOrder(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    return order;
  }

  @Put('orders/:orderId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { status: { type: 'string' } },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ecommerceService.updateOrderStatus(orderId, status);
  }

  @Post('orders/:orderId/fulfill')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fulfill an order' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { trackingNumber: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Order fulfilled' })
  async fulfillOrder(
    @Param('orderId') orderId: string,
    @Body('trackingNumber') trackingNumber?: string,
  ) {
    return this.ecommerceService.fulfillOrder(orderId, trackingNumber);
  }

  @Post('orders/:orderId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { reason: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body('reason') reason?: string,
  ) {
    return this.ecommerceService.cancelOrder(orderId, reason);
  }

  @Post('orders/:orderId/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create invoice from order' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoiceFromOrder(@Param('orderId') orderId: string) {
    return this.ecommerceService.createInvoiceFromOrder(orderId);
  }

  // =================== CUSTOMER MANAGEMENT ===================

  @Post('stores/:storeId/customers/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync customers from store' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async syncCustomers(@Param('storeId') storeId: string) {
    return this.ecommerceService.syncCustomers(storeId);
  }

  @Get('stores/:storeId/customers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List customers' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'List of customers' })
  async listCustomers(
    @Param('storeId') storeId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ecommerceService.listCustomers(storeId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('stores/:storeId/customers/search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search customers' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchCustomers(
    @Param('storeId') storeId: string,
    @Query('q') query: string,
  ) {
    return { customers: await this.ecommerceService.searchCustomers(storeId, query) };
  }

  @Get('customers/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer details' })
  async getCustomer(@Param('customerId') customerId: string) {
    const customer = await this.ecommerceService.getCustomer(customerId);
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
    return customer;
  }

  // =================== WEBHOOKS ===================

  @Post('stores/:storeId/webhooks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a webhook' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        url: { type: 'string' },
      },
      required: ['topic', 'url'],
    },
  })
  @ApiResponse({ status: 201, description: 'Webhook registered' })
  async registerWebhook(
    @Param('storeId') storeId: string,
    @Body('topic') topic: string,
    @Body('url') url: string,
  ) {
    return this.ecommerceService.registerWebhook(storeId, topic, url);
  }

  @Post('webhooks/:platform/:storeId')
  @ApiOperation({ summary: 'Process incoming webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async processWebhook(
    @Param('platform') platform: EcommercePlatform,
    @Param('storeId') storeId: string,
    @Headers('x-shopify-hmac-sha256') shopifySignature: string,
    @Headers('x-wc-webhook-signature') wooSignature: string,
    @Query('topic') topic: string,
    @Body() payload: Record<string, any>,
  ) {
    const signature = shopifySignature || wooSignature;
    return this.ecommerceService.processWebhook(platform, storeId, topic, payload, signature);
  }

  // =================== ANALYTICS ===================

  @Get('stores/:storeId/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get store analytics' })
  @ApiResponse({ status: 200, description: 'Store analytics' })
  async getStoreAnalytics(@Param('storeId') storeId: string) {
    return this.ecommerceService.getStoreAnalytics(storeId);
  }
}
