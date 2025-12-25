import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  MarketplaceIntegrationService,
  MarketplaceAccount,
  MarketplaceListing,
  MarketplaceOrder,
  MarketplaceOrderStatus,
  PricingRule,
  InventorySyncRule,
  BulkOperation,
  MarketplaceReport,
  MarketplaceCredentials,
  MarketplaceSettings,
  MarketplaceCategory,
  ListingPrice,
  ListingInventory,
  ListingShipping,
  ListingImage,
  MarketplaceCustomer,
  MarketplaceAddress,
  MarketplaceOrderItem,
  PricingCondition,
  PriceAdjustment,
  PriceStrategy,
  Competitor,
  MarketplacePlatform,
  ReportType,
  AccountMetrics,
  CompetitorData,
} from './marketplace-integration.service';

// ============================================================================
// DTOs
// ============================================================================

class ConnectAccountDto {
  tenantId: string;
  credentials: MarketplaceCredentials;
  sellerName: string;
  settings?: Partial<MarketplaceSettings>;
}

class UpdateAccountSettingsDto {
  settings: Partial<MarketplaceSettings>;
}

class CreateListingDto {
  tenantId: string;
  accountId: string;
  productId: string;
  sku: string;
  title: string;
  description: string;
  bulletPoints?: string[];
  category: MarketplaceCategory;
  brand?: string;
  manufacturer?: string;
  price: Omit<ListingPrice, 'vatRate' | 'vatIncluded'>;
  inventory: Omit<ListingInventory, 'reservedQuantity' | 'availableQuantity'>;
  shipping: ListingShipping;
  images: ListingImage[];
  attributes?: Record<string, any>;
  ean?: string;
  upc?: string;
}

class UpdateListingDto {
  title?: string;
  description?: string;
  bulletPoints?: string[];
  price?: Partial<ListingPrice>;
  shipping?: Partial<ListingShipping>;
  images?: ListingImage[];
  attributes?: Record<string, any>;
}

class UpdateListingPriceDto {
  price: Partial<ListingPrice>;
}

class UpdateListingInventoryDto {
  quantity: number;
  reserved?: number;
}

class BulkCreateListingsDto {
  tenantId: string;
  accountId: string;
  listings: Array<Omit<CreateListingDto, 'tenantId' | 'accountId'>>;
}

class BulkUpdatePricesDto {
  tenantId: string;
  updates: Array<{ listingId: string; price: Partial<ListingPrice> }>;
}

class BulkUpdateInventoryDto {
  tenantId: string;
  updates: Array<{ listingId: string; quantity: number; reserved?: number }>;
}

class ImportOrderDto {
  tenantId: string;
  accountId: string;
  externalOrderId: string;
  orderNumber: string;
  customer: MarketplaceCustomer;
  shippingAddress: MarketplaceAddress;
  billingAddress?: MarketplaceAddress;
  items: Omit<MarketplaceOrderItem, 'id' | 'fulfillmentStatus'>[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  marketplaceFee: number;
  paymentFee: number;
  discountAmount: number;
  total: number;
  currency: string;
  paymentMethod: string;
  shippingMethod: string;
  notes?: string;
}

class AddTrackingDto {
  trackingNumber: string;
  carrier: string;
}

class CreatePricingRuleDto {
  tenantId: string;
  name: string;
  strategy: PriceStrategy;
  conditions?: PricingCondition[];
  adjustments: PriceAdjustment[];
  minMargin: number;
  maxDiscount: number;
  roundingRule?: 'none' | 'up' | 'down' | 'nearest';
  roundingPrecision?: number;
  priority?: number;
}

class UpdatePricingRuleDto {
  name?: string;
  conditions?: PricingCondition[];
  adjustments?: PriceAdjustment[];
  minMargin?: number;
  maxDiscount?: number;
  isActive?: boolean;
  priority?: number;
}

class CreateInventorySyncRuleDto {
  tenantId: string;
  name: string;
  sourceWarehouseId: string;
  targetAccounts: string[];
  syncDirection?: 'push' | 'pull' | 'bidirectional';
  stockBuffer?: number;
  stockAllocationStrategy?: 'equal' | 'proportional' | 'priority';
  priorities?: { accountId: string; priority: number }[];
}

class ExecuteInventorySyncDto {
  sourceStock: Record<string, number>;
}

class UpdateCompetitorDataDto {
  competitors: Competitor[];
}

class GenerateSalesSummaryDto {
  tenantId: string;
  accounts?: string[];
  startDate: string;
  endDate: string;
}

class GenerateFeeBreakdownDto {
  tenantId: string;
  startDate: string;
  endDate: string;
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller('marketplace')
export class MarketplaceIntegrationController {
  constructor(private readonly marketplaceService: MarketplaceIntegrationService) {}

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  @Post('accounts')
  connectAccount(@Body() dto: ConnectAccountDto): MarketplaceAccount {
    return this.marketplaceService.connectAccount(dto);
  }

  @Get('accounts/:accountId')
  getAccount(@Param('accountId') accountId: string): MarketplaceAccount | null {
    return this.marketplaceService.getAccount(accountId);
  }

  @Get('accounts/tenant/:tenantId')
  getAccountsByTenant(@Param('tenantId') tenantId: string): MarketplaceAccount[] {
    return this.marketplaceService.getAccountsByTenant(tenantId);
  }

  @Get('accounts/tenant/:tenantId/platform/:platform')
  getAccountsByPlatform(
    @Param('tenantId') tenantId: string,
    @Param('platform') platform: MarketplacePlatform,
  ): MarketplaceAccount[] {
    return this.marketplaceService.getAccountsByPlatform(tenantId, platform);
  }

  @Put('accounts/:accountId/settings')
  updateAccountSettings(
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountSettingsDto,
  ): MarketplaceAccount | null {
    return this.marketplaceService.updateAccountSettings(accountId, dto.settings);
  }

  @Put('accounts/:accountId/status')
  updateAccountStatus(
    @Param('accountId') accountId: string,
    @Body('status') status: MarketplaceAccount['status'],
  ): MarketplaceAccount | null {
    return this.marketplaceService.updateAccountStatus(accountId, status);
  }

  @Delete('accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectAccount(@Param('accountId') accountId: string): void {
    this.marketplaceService.disconnectAccount(accountId);
  }

  @Post('accounts/:accountId/refresh-metrics')
  refreshAccountMetrics(@Param('accountId') accountId: string): AccountMetrics | null {
    return this.marketplaceService.refreshAccountMetrics(accountId);
  }

  // ==========================================================================
  // LISTING MANAGEMENT
  // ==========================================================================

  @Post('listings')
  createListing(@Body() dto: CreateListingDto): MarketplaceListing {
    return this.marketplaceService.createListing(dto);
  }

  @Get('listings/:listingId')
  getListing(@Param('listingId') listingId: string): MarketplaceListing | null {
    return this.marketplaceService.getListing(listingId);
  }

  @Get('listings/account/:accountId')
  getListingsByAccount(@Param('accountId') accountId: string): MarketplaceListing[] {
    return this.marketplaceService.getListingsByAccount(accountId);
  }

  @Get('listings/tenant/:tenantId/product/:productId')
  getListingsByProduct(
    @Param('tenantId') tenantId: string,
    @Param('productId') productId: string,
  ): MarketplaceListing[] {
    return this.marketplaceService.getListingsByProduct(tenantId, productId);
  }

  @Get('listings/tenant/:tenantId/sku/:sku')
  getListingsBySku(
    @Param('tenantId') tenantId: string,
    @Param('sku') sku: string,
  ): MarketplaceListing[] {
    return this.marketplaceService.getListingsBySku(tenantId, sku);
  }

  @Put('listings/:listingId')
  updateListing(
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingDto,
  ): MarketplaceListing | null {
    return this.marketplaceService.updateListing(listingId, dto);
  }

  @Put('listings/:listingId/price')
  updateListingPrice(
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingPriceDto,
  ): MarketplaceListing | null {
    return this.marketplaceService.updateListingPrice(listingId, dto.price);
  }

  @Put('listings/:listingId/inventory')
  updateListingInventory(
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingInventoryDto,
  ): MarketplaceListing | null {
    return this.marketplaceService.updateListingInventory(listingId, dto.quantity, dto.reserved);
  }

  @Post('listings/:listingId/publish')
  publishListing(@Param('listingId') listingId: string): MarketplaceListing | null {
    return this.marketplaceService.publishListing(listingId);
  }

  @Post('listings/:listingId/pause')
  pauseListing(@Param('listingId') listingId: string): MarketplaceListing | null {
    return this.marketplaceService.pauseListing(listingId);
  }

  @Post('listings/:listingId/archive')
  archiveListing(@Param('listingId') listingId: string): MarketplaceListing | null {
    return this.marketplaceService.archiveListing(listingId);
  }

  @Delete('listings/:listingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteListing(@Param('listingId') listingId: string): void {
    this.marketplaceService.deleteListing(listingId);
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  @Post('bulk/listings')
  bulkCreateListings(@Body() dto: BulkCreateListingsDto): BulkOperation {
    return this.marketplaceService.bulkCreateListings(dto);
  }

  @Post('bulk/prices')
  bulkUpdatePrices(@Body() dto: BulkUpdatePricesDto): BulkOperation {
    return this.marketplaceService.bulkUpdatePrices(dto);
  }

  @Post('bulk/inventory')
  bulkUpdateInventory(@Body() dto: BulkUpdateInventoryDto): BulkOperation {
    return this.marketplaceService.bulkUpdateInventory(dto);
  }

  @Get('bulk/:operationId')
  getBulkOperation(@Param('operationId') operationId: string): BulkOperation | null {
    return this.marketplaceService.getBulkOperation(operationId);
  }

  @Get('bulk/tenant/:tenantId')
  getBulkOperations(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ): BulkOperation[] {
    return this.marketplaceService.getBulkOperations(tenantId, limit);
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  @Post('orders')
  importOrder(@Body() dto: ImportOrderDto): MarketplaceOrder {
    return this.marketplaceService.importOrder(dto);
  }

  @Get('orders/:orderId')
  getOrder(@Param('orderId') orderId: string): MarketplaceOrder | null {
    return this.marketplaceService.getOrder(orderId);
  }

  @Get('orders/external/:accountId/:externalOrderId')
  getOrderByExternalId(
    @Param('accountId') accountId: string,
    @Param('externalOrderId') externalOrderId: string,
  ): MarketplaceOrder | null {
    return this.marketplaceService.getOrderByExternalId(accountId, externalOrderId);
  }

  @Get('orders/account/:accountId')
  getOrdersByAccount(
    @Param('accountId') accountId: string,
    @Query('status') status?: MarketplaceOrderStatus,
  ): MarketplaceOrder[] {
    return this.marketplaceService.getOrdersByAccount(accountId, status);
  }

  @Get('orders/tenant/:tenantId')
  getOrdersByTenant(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: MarketplaceOrderStatus,
    @Query('platform') platform?: MarketplacePlatform,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): MarketplaceOrder[] {
    return this.marketplaceService.getOrdersByTenant(tenantId, {
      status,
      platform,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Put('orders/:orderId/status')
  updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: MarketplaceOrderStatus,
  ): MarketplaceOrder | null {
    return this.marketplaceService.updateOrderStatus(orderId, status);
  }

  @Post('orders/:orderId/tracking')
  addTracking(
    @Param('orderId') orderId: string,
    @Body() dto: AddTrackingDto,
  ): MarketplaceOrder | null {
    return this.marketplaceService.addTracking(orderId, dto.trackingNumber, dto.carrier);
  }

  @Post('orders/:orderId/invoice')
  generateOrderInvoice(@Param('orderId') orderId: string): { invoiceId: string } | null {
    return this.marketplaceService.generateOrderInvoice(orderId);
  }

  // ==========================================================================
  // PRICING RULES
  // ==========================================================================

  @Post('pricing-rules')
  createPricingRule(@Body() dto: CreatePricingRuleDto): PricingRule {
    return this.marketplaceService.createPricingRule(dto);
  }

  @Get('pricing-rules/:ruleId')
  getPricingRule(@Param('ruleId') ruleId: string): PricingRule | null {
    return this.marketplaceService.getPricingRule(ruleId);
  }

  @Get('pricing-rules/tenant/:tenantId')
  getPricingRules(@Param('tenantId') tenantId: string): PricingRule[] {
    return this.marketplaceService.getPricingRules(tenantId);
  }

  @Put('pricing-rules/:ruleId')
  updatePricingRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdatePricingRuleDto,
  ): PricingRule | null {
    return this.marketplaceService.updatePricingRule(ruleId, dto);
  }

  @Delete('pricing-rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePricingRule(@Param('ruleId') ruleId: string): void {
    this.marketplaceService.deletePricingRule(ruleId);
  }

  @Post('pricing-rules/:ruleId/apply/:listingId')
  applyPricingRule(
    @Param('ruleId') ruleId: string,
    @Param('listingId') listingId: string,
  ): MarketplaceListing | null {
    return this.marketplaceService.applyPricingRule(listingId, ruleId);
  }

  // ==========================================================================
  // INVENTORY SYNC
  // ==========================================================================

  @Post('inventory-sync-rules')
  createInventorySyncRule(@Body() dto: CreateInventorySyncRuleDto): InventorySyncRule {
    return this.marketplaceService.createInventorySyncRule(dto);
  }

  @Get('inventory-sync-rules/:ruleId')
  getInventorySyncRule(@Param('ruleId') ruleId: string): InventorySyncRule | null {
    return this.marketplaceService.getInventorySyncRule(ruleId);
  }

  @Get('inventory-sync-rules/tenant/:tenantId')
  getInventorySyncRules(@Param('tenantId') tenantId: string): InventorySyncRule[] {
    return this.marketplaceService.getInventorySyncRules(tenantId);
  }

  @Post('inventory-sync-rules/:ruleId/execute')
  executeInventorySync(
    @Param('ruleId') ruleId: string,
    @Body() dto: ExecuteInventorySyncDto,
  ): { synced: number; failed: number; details: any[] } {
    const sourceStock = new Map(Object.entries(dto.sourceStock));
    return this.marketplaceService.executeInventorySync(ruleId, sourceStock);
  }

  // ==========================================================================
  // COMPETITOR TRACKING
  // ==========================================================================

  @Put('listings/:listingId/competitors')
  updateCompetitorData(
    @Param('listingId') listingId: string,
    @Body() dto: UpdateCompetitorDataDto,
  ): CompetitorData {
    return this.marketplaceService.updateCompetitorData(listingId, dto.competitors);
  }

  @Get('listings/:listingId/competitors')
  getCompetitorData(@Param('listingId') listingId: string): CompetitorData | null {
    return this.marketplaceService.getCompetitorData(listingId);
  }

  @Get('listings/:listingId/competitor-analysis')
  analyzeCompetitors(@Param('listingId') listingId: string): {
    position: number;
    priceDifference: number;
    recommendation: string;
  } | null {
    return this.marketplaceService.analyzeCompetitors(listingId);
  }

  // ==========================================================================
  // REPORTS & ANALYTICS
  // ==========================================================================

  @Post('reports/sales-summary')
  generateSalesSummary(@Body() dto: GenerateSalesSummaryDto): MarketplaceReport {
    return this.marketplaceService.generateSalesSummary({
      tenantId: dto.tenantId,
      accounts: dto.accounts,
      period: {
        start: new Date(dto.startDate),
        end: new Date(dto.endDate),
      },
    });
  }

  @Post('reports/fee-breakdown')
  generateFeeBreakdown(@Body() dto: GenerateFeeBreakdownDto): MarketplaceReport {
    return this.marketplaceService.generateFeeBreakdown({
      tenantId: dto.tenantId,
      period: {
        start: new Date(dto.startDate),
        end: new Date(dto.endDate),
      },
    });
  }

  @Get('reports/performance/:tenantId')
  generatePerformanceMetrics(@Param('tenantId') tenantId: string): MarketplaceReport {
    return this.marketplaceService.generatePerformanceMetrics(tenantId);
  }

  @Get('reports/:reportId')
  getReport(@Param('reportId') reportId: string): MarketplaceReport | null {
    return this.marketplaceService.getReport(reportId);
  }

  @Get('reports/tenant/:tenantId')
  getReports(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: ReportType,
  ): MarketplaceReport[] {
    return this.marketplaceService.getReports(tenantId, type);
  }

  // ==========================================================================
  // CATEGORY & PLATFORM INFO
  // ==========================================================================

  @Get('categories/:platform')
  getCategories(@Param('platform') platform: MarketplacePlatform): MarketplaceCategory[] {
    return this.marketplaceService.getCategories(platform);
  }

  @Get('categories/:platform/search')
  searchCategories(
    @Param('platform') platform: MarketplacePlatform,
    @Query('q') query: string,
  ): MarketplaceCategory[] {
    return this.marketplaceService.searchCategories(platform, query);
  }

  @Get('platforms')
  getAllPlatforms(): { platform: MarketplacePlatform; info: any }[] {
    return this.marketplaceService.getAllPlatforms();
  }

  @Get('platforms/:platform')
  getPlatformInfo(@Param('platform') platform: MarketplacePlatform): any {
    return this.marketplaceService.getPlatformInfo(platform);
  }

  @Get('platforms/:platform/regions')
  getSupportedRegions(@Param('platform') platform: MarketplacePlatform): string[] {
    return this.marketplaceService.getSupportedRegions(platform);
  }

  @Get('platforms/:platform/fees')
  calculateFees(
    @Param('platform') platform: MarketplacePlatform,
    @Query('amount') amount: number,
  ): { percentage: number; fixed: number; total: number } {
    return this.marketplaceService.calculateFees(platform, amount);
  }
}
