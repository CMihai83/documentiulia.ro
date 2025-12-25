import { Injectable, Logger } from '@nestjs/common';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type MarketplacePlatform =
  | 'emag'           // Romania's largest marketplace
  | 'amazon_eu'      // Amazon Europe (DE, FR, IT, ES, NL, PL, SE)
  | 'allegro'        // Poland's largest marketplace
  | 'kaufland'       // Kaufland Global Marketplace
  | 'cdiscount'      // France
  | 'bol'            // Netherlands/Belgium
  | 'otto'           // Germany
  | 'zalando'        // Fashion marketplace
  | 'etsy'           // Handmade/vintage
  | 'ebay_eu';       // eBay Europe

export type MarketplaceRegion = 'RO' | 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'PL' | 'SE' | 'BE' | 'AT' | 'EU';

export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'rejected' | 'out_of_stock' | 'archived';
export type FulfillmentType = 'merchant' | 'marketplace' | 'dropship' | 'cross_dock';
export type PriceStrategy = 'fixed' | 'competitive' | 'dynamic' | 'map_compliant';

export interface MarketplaceCredentials {
  platform: MarketplacePlatform;
  region: MarketplaceRegion;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  webhookUrl?: string;
  sandboxMode: boolean;
}

export interface MarketplaceAccount {
  id: string;
  tenantId: string;
  platform: MarketplacePlatform;
  region: MarketplaceRegion;
  sellerId: string;
  sellerName: string;
  status: 'active' | 'suspended' | 'pending_verification' | 'inactive';
  credentials: Omit<MarketplaceCredentials, 'apiSecret'>;
  settings: MarketplaceSettings;
  metrics: AccountMetrics;
  connectedAt: Date;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceSettings {
  autoSync: boolean;
  syncIntervalMinutes: number;
  autoReprice: boolean;
  repriceStrategy: PriceStrategy;
  minPriceMargin: number;
  maxPriceDiscount: number;
  autoFulfill: boolean;
  fulfillmentType: FulfillmentType;
  stockBuffer: number;
  defaultShippingTemplateId?: string;
  returnPolicyId?: string;
  vatIncluded: boolean;
  defaultVatRate: number;
  autoGenerateInvoice: boolean;
  notifyOnNewOrder: boolean;
  notifyOnLowStock: boolean;
  lowStockThreshold: number;
}

export interface AccountMetrics {
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageRating: number;
  reviewCount: number;
  returnRate: number;
  lateShipmentRate: number;
  cancellationRate: number;
  buyBoxWinRate?: number;
  accountHealth: 'excellent' | 'good' | 'fair' | 'at_risk' | 'critical';
}

export interface MarketplaceListing {
  id: string;
  tenantId: string;
  accountId: string;
  platform: MarketplacePlatform;
  externalId: string;
  productId: string;
  sku: string;
  ean?: string;
  upc?: string;
  asin?: string;
  title: string;
  description: string;
  bulletPoints: string[];
  category: MarketplaceCategory;
  brand?: string;
  manufacturer?: string;
  price: ListingPrice;
  inventory: ListingInventory;
  shipping: ListingShipping;
  images: ListingImage[];
  attributes: Record<string, any>;
  variations?: ListingVariation[];
  status: ListingStatus;
  buyBoxOwner: boolean;
  competitorCount: number;
  lowestCompetitorPrice?: number;
  qualityScore?: number;
  validationErrors: ValidationError[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface ListingPrice {
  amount: number;
  currency: string;
  compareAtPrice?: number;
  costPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  vatRate: number;
  vatIncluded: boolean;
  promotionPrice?: number;
  promotionStartDate?: Date;
  promotionEndDate?: Date;
}

export interface ListingInventory {
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  warehouseId?: string;
  warehouseLocation?: string;
  fulfillmentType: FulfillmentType;
  leadTimeDays: number;
  restockDate?: Date;
  trackInventory: boolean;
  allowBackorder: boolean;
}

export interface ListingShipping {
  shippingTemplateId?: string;
  weight: number;
  weightUnit: 'kg' | 'g' | 'lb' | 'oz';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  shippingClass?: string;
  freeShipping: boolean;
  handlingTimeDays: number;
  shippingMethods: ShippingMethod[];
}

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  price: number;
  currency: string;
  estimatedDays: { min: number; max: number };
  regions: MarketplaceRegion[];
}

export interface ListingImage {
  url: string;
  isPrimary: boolean;
  altText?: string;
  order: number;
}

export interface ListingVariation {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  inventory: number;
  images?: string[];
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  path: string[];
  requiredAttributes: string[];
  optionalAttributes: string[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface MarketplaceOrder {
  id: string;
  tenantId: string;
  accountId: string;
  platform: MarketplacePlatform;
  externalOrderId: string;
  orderNumber: string;
  status: MarketplaceOrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: MarketplaceFulfillmentStatus;
  customer: MarketplaceCustomer;
  shippingAddress: MarketplaceAddress;
  billingAddress?: MarketplaceAddress;
  items: MarketplaceOrderItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  marketplaceFee: number;
  paymentFee: number;
  discountAmount: number;
  total: number;
  netProfit: number;
  currency: string;
  paymentMethod: string;
  shippingMethod: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  invoiceId?: string;
  invoiceGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export type MarketplaceOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_to_ship'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'partially_refunded' | 'refunded' | 'failed';
export type MarketplaceFulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'cancelled';

export interface MarketplaceCustomer {
  externalId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  vatNumber?: string;
  locale?: string;
}

export interface MarketplaceAddress {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryCode: string;
  phone?: string;
  isResidential: boolean;
}

export interface MarketplaceOrderItem {
  id: string;
  listingId: string;
  externalItemId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount: number;
  discount: number;
  fulfillmentStatus: MarketplaceFulfillmentStatus;
}

export interface PricingRule {
  id: string;
  tenantId: string;
  name: string;
  strategy: PriceStrategy;
  conditions: PricingCondition[];
  adjustments: PriceAdjustment[];
  minMargin: number;
  maxDiscount: number;
  roundingRule: 'none' | 'up' | 'down' | 'nearest';
  roundingPrecision: number;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingCondition {
  type: 'category' | 'brand' | 'sku' | 'price_range' | 'stock_level' | 'competitor_count';
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: any;
}

export interface PriceAdjustment {
  type: 'fixed' | 'percentage' | 'competitor_based' | 'cost_plus';
  value: number;
  reference?: 'lowest_competitor' | 'average_competitor' | 'buy_box';
}

export interface InventorySyncRule {
  id: string;
  tenantId: string;
  name: string;
  sourceWarehouseId: string;
  targetAccounts: string[];
  syncDirection: 'push' | 'pull' | 'bidirectional';
  stockBuffer: number;
  stockAllocationStrategy: 'equal' | 'proportional' | 'priority';
  priorities: { accountId: string; priority: number }[];
  isActive: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
}

export interface BulkOperation {
  id: string;
  tenantId: string;
  type: 'listing_create' | 'listing_update' | 'price_update' | 'inventory_update' | 'order_sync';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  errors: { itemId: string; error: string }[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface MarketplaceReport {
  id: string;
  tenantId: string;
  type: ReportType;
  period: { start: Date; end: Date };
  accounts: string[];
  data: any;
  generatedAt: Date;
}

export type ReportType =
  | 'sales_summary'
  | 'inventory_health'
  | 'pricing_analysis'
  | 'fee_breakdown'
  | 'performance_metrics'
  | 'buy_box_analysis'
  | 'competitor_analysis';

export interface CompetitorData {
  listingId: string;
  competitors: Competitor[];
  lastCheckedAt: Date;
}

export interface Competitor {
  sellerId: string;
  sellerName: string;
  price: number;
  shippingPrice: number;
  totalPrice: number;
  fulfillmentType: FulfillmentType;
  rating: number;
  reviewCount: number;
  hasBuyBox: boolean;
  inStock: boolean;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

@Injectable()
export class MarketplaceIntegrationService {
  private readonly logger = new Logger(MarketplaceIntegrationService.name);

  // In-memory storage (production would use PostgreSQL)
  private accounts: Map<string, MarketplaceAccount> = new Map();
  private listings: Map<string, MarketplaceListing> = new Map();
  private orders: Map<string, MarketplaceOrder> = new Map();
  private pricingRules: Map<string, PricingRule> = new Map();
  private inventoryRules: Map<string, InventorySyncRule> = new Map();
  private bulkOperations: Map<string, BulkOperation> = new Map();
  private reports: Map<string, MarketplaceReport> = new Map();
  private competitorData: Map<string, CompetitorData> = new Map();
  private categories: Map<string, MarketplaceCategory[]> = new Map();

  // Platform-specific configurations
  private platformConfigs: Record<MarketplacePlatform, {
    name: string;
    regions: MarketplaceRegion[];
    apiBaseUrl: string;
    feeStructure: { percentage: number; fixed: number };
    features: string[];
  }> = {
    emag: {
      name: 'eMAG',
      regions: ['RO'],
      apiBaseUrl: 'https://marketplace.emag.ro/api-3',
      feeStructure: { percentage: 12, fixed: 0 },
      features: ['genius_program', 'emag_fulfillment', 'flash_deals', 'sponsored_products'],
    },
    amazon_eu: {
      name: 'Amazon EU',
      regions: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE'],
      apiBaseUrl: 'https://sellingpartnerapi-eu.amazon.com',
      feeStructure: { percentage: 15, fixed: 0.3 },
      features: ['fba', 'prime', 'a_plus_content', 'brand_registry', 'vine', 'sponsored_products'],
    },
    allegro: {
      name: 'Allegro',
      regions: ['PL'],
      apiBaseUrl: 'https://api.allegro.pl',
      feeStructure: { percentage: 10, fixed: 0 },
      features: ['allegro_smart', 'promoted_offers', 'allegro_ads'],
    },
    kaufland: {
      name: 'Kaufland Global Marketplace',
      regions: ['DE', 'AT', 'PL'],
      apiBaseUrl: 'https://www.kaufland.de/api/v1',
      feeStructure: { percentage: 11, fixed: 0 },
      features: ['express_delivery', 'sponsored_products'],
    },
    cdiscount: {
      name: 'Cdiscount',
      regions: ['FR'],
      apiBaseUrl: 'https://api.cdiscount.com/marketplace',
      feeStructure: { percentage: 14, fixed: 0 },
      features: ['cdiscount_fulfillment', 'flash_sales'],
    },
    bol: {
      name: 'bol.com',
      regions: ['NL', 'BE'],
      apiBaseUrl: 'https://api.bol.com/retailer',
      feeStructure: { percentage: 10, fixed: 0 },
      features: ['lvb', 'select', 'sponsored_products'],
    },
    otto: {
      name: 'OTTO Market',
      regions: ['DE'],
      apiBaseUrl: 'https://api.otto.de/v1',
      feeStructure: { percentage: 15, fixed: 0 },
      features: ['otto_fulfillment', 'premium_listings'],
    },
    zalando: {
      name: 'Zalando',
      regions: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE', 'BE', 'AT'],
      apiBaseUrl: 'https://api.zalando.com/merchants',
      feeStructure: { percentage: 20, fixed: 0 },
      features: ['zfs', 'brand_shop', 'premium_placement'],
    },
    etsy: {
      name: 'Etsy',
      regions: ['EU'],
      apiBaseUrl: 'https://openapi.etsy.com/v3',
      feeStructure: { percentage: 6.5, fixed: 0.2 },
      features: ['etsy_ads', 'star_seller', 'offsite_ads'],
    },
    ebay_eu: {
      name: 'eBay Europe',
      regions: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'BE', 'AT'],
      apiBaseUrl: 'https://api.ebay.com',
      feeStructure: { percentage: 12.9, fixed: 0.3 },
      features: ['promoted_listings', 'ebay_fulfillment', 'global_shipping'],
    },
  };

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  connectAccount(params: {
    tenantId: string;
    credentials: MarketplaceCredentials;
    sellerName: string;
    settings?: Partial<MarketplaceSettings>;
  }): MarketplaceAccount {
    const account: MarketplaceAccount = {
      id: `mkt_acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      platform: params.credentials.platform,
      region: params.credentials.region,
      sellerId: params.credentials.sellerId,
      sellerName: params.sellerName,
      status: 'active',
      credentials: {
        platform: params.credentials.platform,
        region: params.credentials.region,
        sellerId: params.credentials.sellerId,
        apiKey: params.credentials.apiKey,
        accessToken: params.credentials.accessToken,
        refreshToken: params.credentials.refreshToken,
        tokenExpiresAt: params.credentials.tokenExpiresAt,
        webhookUrl: params.credentials.webhookUrl,
        sandboxMode: params.credentials.sandboxMode,
      },
      settings: {
        autoSync: true,
        syncIntervalMinutes: 30,
        autoReprice: false,
        repriceStrategy: 'fixed',
        minPriceMargin: 10,
        maxPriceDiscount: 20,
        autoFulfill: false,
        fulfillmentType: 'merchant',
        stockBuffer: 0,
        vatIncluded: true,
        defaultVatRate: 19,
        autoGenerateInvoice: true,
        notifyOnNewOrder: true,
        notifyOnLowStock: true,
        lowStockThreshold: 5,
        ...params.settings,
      },
      metrics: {
        totalListings: 0,
        activeListings: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        reviewCount: 0,
        returnRate: 0,
        lateShipmentRate: 0,
        cancellationRate: 0,
        accountHealth: 'good',
      },
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.accounts.set(account.id, account);
    this.logger.log(`Connected marketplace account: ${account.platform} (${account.sellerName})`);
    return account;
  }

  getAccount(accountId: string): MarketplaceAccount | null {
    return this.accounts.get(accountId) || null;
  }

  getAccountsByTenant(tenantId: string): MarketplaceAccount[] {
    return Array.from(this.accounts.values())
      .filter(a => a.tenantId === tenantId);
  }

  getAccountsByPlatform(tenantId: string, platform: MarketplacePlatform): MarketplaceAccount[] {
    return Array.from(this.accounts.values())
      .filter(a => a.tenantId === tenantId && a.platform === platform);
  }

  updateAccountSettings(accountId: string, settings: Partial<MarketplaceSettings>): MarketplaceAccount | null {
    const account = this.accounts.get(accountId);
    if (!account) return null;

    account.settings = { ...account.settings, ...settings };
    account.updatedAt = new Date();
    return account;
  }

  updateAccountStatus(accountId: string, status: MarketplaceAccount['status']): MarketplaceAccount | null {
    const account = this.accounts.get(accountId);
    if (!account) return null;

    account.status = status;
    account.updatedAt = new Date();
    return account;
  }

  disconnectAccount(accountId: string): boolean {
    return this.accounts.delete(accountId);
  }

  refreshAccountMetrics(accountId: string): AccountMetrics | null {
    const account = this.accounts.get(accountId);
    if (!account) return null;

    const accountListings = Array.from(this.listings.values())
      .filter(l => l.accountId === accountId);
    const accountOrders = Array.from(this.orders.values())
      .filter(o => o.accountId === accountId);

    account.metrics = {
      totalListings: accountListings.length,
      activeListings: accountListings.filter(l => l.status === 'active').length,
      totalOrders: accountOrders.length,
      pendingOrders: accountOrders.filter(o => o.status === 'pending' || o.status === 'processing').length,
      totalRevenue: accountOrders.reduce((sum, o) => sum + o.total, 0),
      averageRating: 4.5, // Would fetch from marketplace API
      reviewCount: accountOrders.length * 0.3, // Estimate
      returnRate: 2.5,
      lateShipmentRate: 1.2,
      cancellationRate: 0.8,
      buyBoxWinRate: account.platform === 'amazon_eu' ? 65 : undefined,
      accountHealth: this.calculateAccountHealth(account),
    };

    account.updatedAt = new Date();
    return account.metrics;
  }

  private calculateAccountHealth(account: MarketplaceAccount): AccountMetrics['accountHealth'] {
    const { returnRate, lateShipmentRate, cancellationRate } = account.metrics;
    const score = 100 - (returnRate * 2) - (lateShipmentRate * 3) - (cancellationRate * 2);

    if (score >= 95) return 'excellent';
    if (score >= 85) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 50) return 'at_risk';
    return 'critical';
  }

  // ==========================================================================
  // LISTING MANAGEMENT
  // ==========================================================================

  createListing(params: {
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
  }): MarketplaceListing {
    const account = this.accounts.get(params.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const listing: MarketplaceListing = {
      id: `mkt_lst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      accountId: params.accountId,
      platform: account.platform,
      externalId: '',
      productId: params.productId,
      sku: params.sku,
      ean: params.ean,
      upc: params.upc,
      title: params.title,
      description: params.description,
      bulletPoints: params.bulletPoints || [],
      category: params.category,
      brand: params.brand,
      manufacturer: params.manufacturer,
      price: {
        ...params.price,
        vatRate: account.settings.defaultVatRate,
        vatIncluded: account.settings.vatIncluded,
      },
      inventory: {
        ...params.inventory,
        reservedQuantity: 0,
        availableQuantity: params.inventory.quantity,
      },
      shipping: params.shipping,
      images: params.images,
      attributes: params.attributes || {},
      status: 'draft',
      buyBoxOwner: false,
      competitorCount: 0,
      validationErrors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate listing
    listing.validationErrors = this.validateListing(listing);

    this.listings.set(listing.id, listing);
    return listing;
  }

  getListing(listingId: string): MarketplaceListing | null {
    return this.listings.get(listingId) || null;
  }

  getListingsByAccount(accountId: string): MarketplaceListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.accountId === accountId);
  }

  getListingsByProduct(tenantId: string, productId: string): MarketplaceListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.tenantId === tenantId && l.productId === productId);
  }

  getListingsBySku(tenantId: string, sku: string): MarketplaceListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.tenantId === tenantId && l.sku === sku);
  }

  updateListing(listingId: string, updates: {
    title?: string;
    description?: string;
    bulletPoints?: string[];
    price?: Partial<ListingPrice>;
    shipping?: Partial<ListingShipping>;
    images?: ListingImage[];
    attributes?: Record<string, any>;
  }): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    if (updates.title) listing.title = updates.title;
    if (updates.description) listing.description = updates.description;
    if (updates.bulletPoints) listing.bulletPoints = updates.bulletPoints;
    if (updates.price) listing.price = { ...listing.price, ...updates.price };
    if (updates.shipping) listing.shipping = { ...listing.shipping, ...updates.shipping };
    if (updates.images) listing.images = updates.images;
    if (updates.attributes) listing.attributes = { ...listing.attributes, ...updates.attributes };

    listing.validationErrors = this.validateListing(listing);
    listing.updatedAt = new Date();

    return listing;
  }

  updateListingPrice(listingId: string, price: Partial<ListingPrice>): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    listing.price = { ...listing.price, ...price };
    listing.updatedAt = new Date();

    return listing;
  }

  updateListingInventory(listingId: string, quantity: number, reserved = 0): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    listing.inventory.quantity = quantity;
    listing.inventory.reservedQuantity = reserved;
    listing.inventory.availableQuantity = quantity - reserved;

    if (listing.inventory.availableQuantity <= 0) {
      listing.status = 'out_of_stock';
    } else if (listing.status === 'out_of_stock') {
      listing.status = 'active';
    }

    listing.updatedAt = new Date();
    return listing;
  }

  publishListing(listingId: string): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    if (listing.validationErrors.some(e => e.severity === 'error')) {
      return listing;
    }

    listing.status = 'pending_review';
    listing.updatedAt = new Date();

    // Simulate marketplace review (in production, this would be async)
    setTimeout(() => {
      const l = this.listings.get(listingId);
      if (l && l.status === 'pending_review') {
        l.status = 'active';
        l.publishedAt = new Date();
        l.externalId = `ext_${listing.platform}_${Date.now()}`;
      }
    }, 1000);

    return listing;
  }

  pauseListing(listingId: string): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    listing.status = 'paused';
    listing.updatedAt = new Date();
    return listing;
  }

  archiveListing(listingId: string): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    listing.status = 'archived';
    listing.updatedAt = new Date();
    return listing;
  }

  deleteListing(listingId: string): boolean {
    return this.listings.delete(listingId);
  }

  private validateListing(listing: MarketplaceListing): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!listing.title || listing.title.length < 10) {
      errors.push({ field: 'title', code: 'TITLE_TOO_SHORT', message: 'Title must be at least 10 characters', severity: 'error' });
    }

    if (listing.title.length > 200) {
      errors.push({ field: 'title', code: 'TITLE_TOO_LONG', message: 'Title must not exceed 200 characters', severity: 'error' });
    }

    if (!listing.description || listing.description.length < 50) {
      errors.push({ field: 'description', code: 'DESCRIPTION_TOO_SHORT', message: 'Description must be at least 50 characters', severity: 'error' });
    }

    if (listing.images.length === 0) {
      errors.push({ field: 'images', code: 'NO_IMAGES', message: 'At least one image is required', severity: 'error' });
    }

    if (!listing.images.some(i => i.isPrimary)) {
      errors.push({ field: 'images', code: 'NO_PRIMARY_IMAGE', message: 'A primary image must be selected', severity: 'warning' });
    }

    if (listing.price.amount <= 0) {
      errors.push({ field: 'price', code: 'INVALID_PRICE', message: 'Price must be greater than 0', severity: 'error' });
    }

    if (!listing.ean && !listing.upc && listing.platform !== 'etsy') {
      errors.push({ field: 'ean', code: 'MISSING_IDENTIFIER', message: 'EAN or UPC is recommended', severity: 'warning' });
    }

    // Platform-specific validations
    if (listing.platform === 'amazon_eu' && listing.bulletPoints.length < 3) {
      errors.push({ field: 'bulletPoints', code: 'INSUFFICIENT_BULLET_POINTS', message: 'Amazon requires at least 3 bullet points', severity: 'warning' });
    }

    return errors;
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  bulkCreateListings(params: {
    tenantId: string;
    accountId: string;
    listings: Array<{
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
    }>;
  }): BulkOperation {
    const operation: BulkOperation = {
      id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      type: 'listing_create',
      status: 'processing',
      totalItems: params.listings.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
      startedAt: new Date(),
      createdAt: new Date(),
    };

    this.bulkOperations.set(operation.id, operation);

    // Process listings
    params.listings.forEach((listingData, index) => {
      try {
        this.createListing({
          tenantId: params.tenantId,
          accountId: params.accountId,
          productId: listingData.productId,
          sku: listingData.sku,
          title: listingData.title,
          description: listingData.description,
          bulletPoints: listingData.bulletPoints,
          category: listingData.category,
          brand: listingData.brand,
          manufacturer: listingData.manufacturer,
          price: listingData.price,
          inventory: listingData.inventory,
          shipping: listingData.shipping,
          images: listingData.images,
          attributes: listingData.attributes,
          ean: listingData.ean,
          upc: listingData.upc,
        });
        operation.successCount++;
      } catch (error: any) {
        operation.failureCount++;
        operation.errors.push({ itemId: `item_${index}`, error: error.message });
      }
      operation.processedItems++;
    });

    operation.status = operation.failureCount === 0 ? 'completed' :
                       operation.successCount === 0 ? 'failed' : 'partial';
    operation.completedAt = new Date();

    return operation;
  }

  bulkUpdatePrices(params: {
    tenantId: string;
    updates: Array<{ listingId: string; price: Partial<ListingPrice> }>;
  }): BulkOperation {
    const operation: BulkOperation = {
      id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      type: 'price_update',
      status: 'processing',
      totalItems: params.updates.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
      startedAt: new Date(),
      createdAt: new Date(),
    };

    this.bulkOperations.set(operation.id, operation);

    params.updates.forEach(update => {
      const result = this.updateListingPrice(update.listingId, update.price);
      if (result) {
        operation.successCount++;
      } else {
        operation.failureCount++;
        operation.errors.push({ itemId: update.listingId, error: 'Listing not found' });
      }
      operation.processedItems++;
    });

    operation.status = operation.failureCount === 0 ? 'completed' :
                       operation.successCount === 0 ? 'failed' : 'partial';
    operation.completedAt = new Date();

    return operation;
  }

  bulkUpdateInventory(params: {
    tenantId: string;
    updates: Array<{ listingId: string; quantity: number; reserved?: number }>;
  }): BulkOperation {
    const operation: BulkOperation = {
      id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      type: 'inventory_update',
      status: 'processing',
      totalItems: params.updates.length,
      processedItems: 0,
      successCount: 0,
      failureCount: 0,
      errors: [],
      startedAt: new Date(),
      createdAt: new Date(),
    };

    this.bulkOperations.set(operation.id, operation);

    params.updates.forEach(update => {
      const result = this.updateListingInventory(update.listingId, update.quantity, update.reserved);
      if (result) {
        operation.successCount++;
      } else {
        operation.failureCount++;
        operation.errors.push({ itemId: update.listingId, error: 'Listing not found' });
      }
      operation.processedItems++;
    });

    operation.status = operation.failureCount === 0 ? 'completed' :
                       operation.successCount === 0 ? 'failed' : 'partial';
    operation.completedAt = new Date();

    return operation;
  }

  getBulkOperation(operationId: string): BulkOperation | null {
    return this.bulkOperations.get(operationId) || null;
  }

  getBulkOperations(tenantId: string, limit = 20): BulkOperation[] {
    return Array.from(this.bulkOperations.values())
      .filter(op => op.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  importOrder(params: {
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
  }): MarketplaceOrder {
    const account = this.accounts.get(params.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const order: MarketplaceOrder = {
      id: `mkt_ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      accountId: params.accountId,
      platform: account.platform,
      externalOrderId: params.externalOrderId,
      orderNumber: params.orderNumber,
      status: 'pending',
      paymentStatus: 'captured',
      fulfillmentStatus: 'unfulfilled',
      customer: params.customer,
      shippingAddress: params.shippingAddress,
      billingAddress: params.billingAddress,
      items: params.items.map((item, i) => ({
        ...item,
        id: `item_${i}_${Date.now()}`,
        fulfillmentStatus: 'unfulfilled',
      })),
      subtotal: params.subtotal,
      shippingCost: params.shippingCost,
      taxAmount: params.taxAmount,
      marketplaceFee: params.marketplaceFee,
      paymentFee: params.paymentFee,
      discountAmount: params.discountAmount,
      total: params.total,
      netProfit: params.total - params.marketplaceFee - params.paymentFee - this.calculateCOGS(params.items),
      currency: params.currency,
      paymentMethod: params.paymentMethod,
      shippingMethod: params.shippingMethod,
      notes: params.notes,
      invoiceGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);

    // Reserve inventory
    params.items.forEach(item => {
      const listings = this.getListingsBySku(params.tenantId, item.sku);
      listings.forEach(listing => {
        if (listing.accountId === params.accountId) {
          listing.inventory.reservedQuantity += item.quantity;
          listing.inventory.availableQuantity -= item.quantity;
        }
      });
    });

    return order;
  }

  private calculateCOGS(items: Omit<MarketplaceOrderItem, 'id' | 'fulfillmentStatus'>[]): number {
    // Would calculate actual cost of goods sold from product data
    return items.reduce((sum, item) => sum + (item.unitPrice * 0.6 * item.quantity), 0);
  }

  getOrder(orderId: string): MarketplaceOrder | null {
    return this.orders.get(orderId) || null;
  }

  getOrderByExternalId(accountId: string, externalOrderId: string): MarketplaceOrder | null {
    return Array.from(this.orders.values())
      .find(o => o.accountId === accountId && o.externalOrderId === externalOrderId) || null;
  }

  getOrdersByAccount(accountId: string, status?: MarketplaceOrderStatus): MarketplaceOrder[] {
    let orders = Array.from(this.orders.values())
      .filter(o => o.accountId === accountId);

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getOrdersByTenant(tenantId: string, filters?: {
    status?: MarketplaceOrderStatus;
    platform?: MarketplacePlatform;
    startDate?: Date;
    endDate?: Date;
  }): MarketplaceOrder[] {
    let orders = Array.from(this.orders.values())
      .filter(o => o.tenantId === tenantId);

    if (filters?.status) {
      orders = orders.filter(o => o.status === filters.status);
    }

    if (filters?.platform) {
      orders = orders.filter(o => o.platform === filters.platform);
    }

    if (filters?.startDate) {
      orders = orders.filter(o => o.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      orders = orders.filter(o => o.createdAt <= filters.endDate!);
    }

    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateOrderStatus(orderId: string, status: MarketplaceOrderStatus): MarketplaceOrder | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date();

    if (status === 'shipped') {
      order.shippedAt = new Date();
      order.fulfillmentStatus = 'fulfilled';
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
    } else if (status === 'cancelled' || status === 'refunded') {
      // Release reserved inventory
      order.items.forEach(item => {
        const listings = this.getListingsBySku(order.tenantId, item.sku);
        listings.forEach(listing => {
          if (listing.accountId === order.accountId) {
            listing.inventory.reservedQuantity -= item.quantity;
            listing.inventory.availableQuantity += item.quantity;
          }
        });
      });
    }

    return order;
  }

  addTracking(orderId: string, trackingNumber: string, carrier: string): MarketplaceOrder | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    order.trackingNumber = trackingNumber;
    order.carrier = carrier;
    order.status = 'shipped';
    order.shippedAt = new Date();
    order.fulfillmentStatus = 'fulfilled';
    order.updatedAt = new Date();

    return order;
  }

  generateOrderInvoice(orderId: string): { invoiceId: string } | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    const invoiceId = `INV-MKT-${Date.now()}`;
    order.invoiceId = invoiceId;
    order.invoiceGenerated = true;
    order.updatedAt = new Date();

    return { invoiceId };
  }

  // ==========================================================================
  // PRICING RULES
  // ==========================================================================

  createPricingRule(params: {
    tenantId: string;
    name: string;
    strategy: PriceStrategy;
    conditions?: PricingCondition[];
    adjustments: PriceAdjustment[];
    minMargin: number;
    maxDiscount: number;
    roundingRule?: PricingRule['roundingRule'];
    roundingPrecision?: number;
    priority?: number;
  }): PricingRule {
    const rule: PricingRule = {
      id: `price_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      name: params.name,
      strategy: params.strategy,
      conditions: params.conditions || [],
      adjustments: params.adjustments,
      minMargin: params.minMargin,
      maxDiscount: params.maxDiscount,
      roundingRule: params.roundingRule || 'nearest',
      roundingPrecision: params.roundingPrecision || 2,
      isActive: true,
      priority: params.priority || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pricingRules.set(rule.id, rule);
    return rule;
  }

  getPricingRule(ruleId: string): PricingRule | null {
    return this.pricingRules.get(ruleId) || null;
  }

  getPricingRules(tenantId: string): PricingRule[] {
    return Array.from(this.pricingRules.values())
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => b.priority - a.priority);
  }

  updatePricingRule(ruleId: string, updates: Partial<Pick<PricingRule, 'name' | 'conditions' | 'adjustments' | 'minMargin' | 'maxDiscount' | 'isActive' | 'priority'>>): PricingRule | null {
    const rule = this.pricingRules.get(ruleId);
    if (!rule) return null;

    Object.assign(rule, updates);
    rule.updatedAt = new Date();
    return rule;
  }

  deletePricingRule(ruleId: string): boolean {
    return this.pricingRules.delete(ruleId);
  }

  applyPricingRule(listingId: string, ruleId: string): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    const rule = this.pricingRules.get(ruleId);
    if (!listing || !rule || !rule.isActive) return null;

    let newPrice = listing.price.amount;

    for (const adjustment of rule.adjustments) {
      switch (adjustment.type) {
        case 'fixed':
          newPrice += adjustment.value;
          break;
        case 'percentage':
          newPrice *= (1 + adjustment.value / 100);
          break;
        case 'competitor_based':
          if (listing.lowestCompetitorPrice) {
            newPrice = listing.lowestCompetitorPrice - adjustment.value;
          }
          break;
        case 'cost_plus':
          if (listing.price.costPrice) {
            newPrice = listing.price.costPrice * (1 + adjustment.value / 100);
          }
          break;
      }
    }

    // Apply constraints
    if (listing.price.costPrice) {
      const minPrice = listing.price.costPrice * (1 + rule.minMargin / 100);
      newPrice = Math.max(newPrice, minPrice);
    }

    if (listing.price.compareAtPrice) {
      const maxDiscount = listing.price.compareAtPrice * (1 - rule.maxDiscount / 100);
      newPrice = Math.max(newPrice, maxDiscount);
    }

    // Apply rounding
    newPrice = this.roundPrice(newPrice, rule.roundingRule, rule.roundingPrecision);

    listing.price.amount = newPrice;
    listing.updatedAt = new Date();

    return listing;
  }

  private roundPrice(price: number, rule: PricingRule['roundingRule'], precision: number): number {
    const multiplier = Math.pow(10, precision);
    switch (rule) {
      case 'up':
        return Math.ceil(price * multiplier) / multiplier;
      case 'down':
        return Math.floor(price * multiplier) / multiplier;
      case 'nearest':
        return Math.round(price * multiplier) / multiplier;
      default:
        return price;
    }
  }

  // ==========================================================================
  // INVENTORY SYNC
  // ==========================================================================

  createInventorySyncRule(params: {
    tenantId: string;
    name: string;
    sourceWarehouseId: string;
    targetAccounts: string[];
    syncDirection?: InventorySyncRule['syncDirection'];
    stockBuffer?: number;
    stockAllocationStrategy?: InventorySyncRule['stockAllocationStrategy'];
    priorities?: InventorySyncRule['priorities'];
  }): InventorySyncRule {
    const rule: InventorySyncRule = {
      id: `inv_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      name: params.name,
      sourceWarehouseId: params.sourceWarehouseId,
      targetAccounts: params.targetAccounts,
      syncDirection: params.syncDirection || 'push',
      stockBuffer: params.stockBuffer || 0,
      stockAllocationStrategy: params.stockAllocationStrategy || 'equal',
      priorities: params.priorities || [],
      isActive: true,
      createdAt: new Date(),
    };

    this.inventoryRules.set(rule.id, rule);
    return rule;
  }

  getInventorySyncRule(ruleId: string): InventorySyncRule | null {
    return this.inventoryRules.get(ruleId) || null;
  }

  getInventorySyncRules(tenantId: string): InventorySyncRule[] {
    return Array.from(this.inventoryRules.values())
      .filter(r => r.tenantId === tenantId);
  }

  executeInventorySync(ruleId: string, sourceStock: Map<string, number>): {
    synced: number;
    failed: number;
    details: { accountId: string; sku: string; quantity: number; success: boolean }[];
  } {
    const rule = this.inventoryRules.get(ruleId);
    if (!rule || !rule.isActive) {
      return { synced: 0, failed: 0, details: [] };
    }

    const details: { accountId: string; sku: string; quantity: number; success: boolean }[] = [];
    let synced = 0;
    let failed = 0;

    const availableStock = new Map<string, number>();
    sourceStock.forEach((qty, sku) => {
      availableStock.set(sku, Math.max(0, qty - rule.stockBuffer));
    });

    // Allocate stock based on strategy
    rule.targetAccounts.forEach(accountId => {
      const account = this.accounts.get(accountId);
      if (!account) return;

      const listings = this.getListingsByAccount(accountId);
      listings.forEach(listing => {
        const stockQty = availableStock.get(listing.sku);
        if (stockQty === undefined) return;

        let allocatedQty: number;
        switch (rule.stockAllocationStrategy) {
          case 'equal':
            allocatedQty = Math.floor(stockQty / rule.targetAccounts.length);
            break;
          case 'proportional':
            // Would calculate based on sales velocity
            allocatedQty = Math.floor(stockQty / rule.targetAccounts.length);
            break;
          case 'priority':
            const priority = rule.priorities.find(p => p.accountId === accountId);
            allocatedQty = priority ? Math.floor(stockQty * (priority.priority / 100)) : 0;
            break;
          default:
            allocatedQty = stockQty;
        }

        const result = this.updateListingInventory(listing.id, allocatedQty);
        if (result) {
          synced++;
          details.push({ accountId, sku: listing.sku, quantity: allocatedQty, success: true });
        } else {
          failed++;
          details.push({ accountId, sku: listing.sku, quantity: allocatedQty, success: false });
        }
      });
    });

    rule.lastSyncAt = new Date();
    return { synced, failed, details };
  }

  // ==========================================================================
  // COMPETITOR TRACKING
  // ==========================================================================

  updateCompetitorData(listingId: string, competitors: Competitor[]): CompetitorData {
    const data: CompetitorData = {
      listingId,
      competitors,
      lastCheckedAt: new Date(),
    };

    this.competitorData.set(listingId, data);

    // Update listing with competitor info
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.competitorCount = competitors.length;
      listing.lowestCompetitorPrice = Math.min(...competitors.map(c => c.totalPrice));
      listing.buyBoxOwner = competitors.some(c => c.hasBuyBox && c.sellerId === listing.accountId);
    }

    return data;
  }

  getCompetitorData(listingId: string): CompetitorData | null {
    return this.competitorData.get(listingId) || null;
  }

  analyzeCompetitors(listingId: string): {
    position: number;
    priceDifference: number;
    recommendation: string;
  } | null {
    const listing = this.listings.get(listingId);
    const compData = this.competitorData.get(listingId);
    if (!listing || !compData) return null;

    const sortedCompetitors = [...compData.competitors].sort((a, b) => a.totalPrice - b.totalPrice);
    const position = sortedCompetitors.findIndex(c => c.price === listing.price.amount) + 1;
    const lowestPrice = sortedCompetitors[0]?.totalPrice || listing.price.amount;
    const priceDifference = listing.price.amount - lowestPrice;

    let recommendation: string;
    if (position === 1) {
      recommendation = 'You have the lowest price. Monitor competitors for changes.';
    } else if (priceDifference < listing.price.amount * 0.05) {
      recommendation = 'Consider a small price reduction to become competitive.';
    } else {
      recommendation = 'Significant price gap. Review cost structure or focus on value differentiation.';
    }

    return { position: position || sortedCompetitors.length + 1, priceDifference, recommendation };
  }

  // ==========================================================================
  // REPORTS & ANALYTICS
  // ==========================================================================

  generateSalesSummary(params: {
    tenantId: string;
    accounts?: string[];
    period: { start: Date; end: Date };
  }): MarketplaceReport {
    const orders = this.getOrdersByTenant(params.tenantId, {
      startDate: params.period.start,
      endDate: params.period.end,
    }).filter(o => !params.accounts || params.accounts.includes(o.accountId));

    const byPlatform = new Map<MarketplacePlatform, {
      orders: number;
      revenue: number;
      fees: number;
      profit: number;
    }>();

    orders.forEach(order => {
      const existing = byPlatform.get(order.platform) || { orders: 0, revenue: 0, fees: 0, profit: 0 };
      existing.orders++;
      existing.revenue += order.total;
      existing.fees += order.marketplaceFee + order.paymentFee;
      existing.profit += order.netProfit;
      byPlatform.set(order.platform, existing);
    });

    const report: MarketplaceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      type: 'sales_summary',
      period: params.period,
      accounts: params.accounts || Array.from(this.accounts.values()).filter(a => a.tenantId === params.tenantId).map(a => a.id),
      data: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        totalFees: orders.reduce((sum, o) => sum + o.marketplaceFee + o.paymentFee, 0),
        totalProfit: orders.reduce((sum, o) => sum + o.netProfit, 0),
        averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
        byPlatform: Object.fromEntries(byPlatform),
        topProducts: this.getTopProducts(orders, 10),
      },
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  private getTopProducts(orders: MarketplaceOrder[], limit: number): { sku: string; title: string; quantity: number; revenue: number }[] {
    const productMap = new Map<string, { sku: string; title: string; quantity: number; revenue: number }>();

    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = productMap.get(item.sku) || { sku: item.sku, title: item.title, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        productMap.set(item.sku, existing);
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  generateFeeBreakdown(params: {
    tenantId: string;
    period: { start: Date; end: Date };
  }): MarketplaceReport {
    const orders = this.getOrdersByTenant(params.tenantId, {
      startDate: params.period.start,
      endDate: params.period.end,
    });

    const byPlatform = new Map<MarketplacePlatform, {
      marketplaceFees: number;
      paymentFees: number;
      totalFees: number;
      feePercentage: number;
    }>();

    orders.forEach(order => {
      const existing = byPlatform.get(order.platform) || { marketplaceFees: 0, paymentFees: 0, totalFees: 0, feePercentage: 0 };
      existing.marketplaceFees += order.marketplaceFee;
      existing.paymentFees += order.paymentFee;
      existing.totalFees += order.marketplaceFee + order.paymentFee;
      byPlatform.set(order.platform, existing);
    });

    // Calculate fee percentages
    byPlatform.forEach((data, platform) => {
      const platformOrders = orders.filter(o => o.platform === platform);
      const totalRevenue = platformOrders.reduce((sum, o) => sum + o.total, 0);
      data.feePercentage = totalRevenue > 0 ? (data.totalFees / totalRevenue) * 100 : 0;
    });

    const report: MarketplaceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      type: 'fee_breakdown',
      period: params.period,
      accounts: [],
      data: {
        totalMarketplaceFees: orders.reduce((sum, o) => sum + o.marketplaceFee, 0),
        totalPaymentFees: orders.reduce((sum, o) => sum + o.paymentFee, 0),
        totalFees: orders.reduce((sum, o) => sum + o.marketplaceFee + o.paymentFee, 0),
        byPlatform: Object.fromEntries(byPlatform),
      },
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  generatePerformanceMetrics(tenantId: string): MarketplaceReport {
    const accounts = this.getAccountsByTenant(tenantId);

    const report: MarketplaceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      type: 'performance_metrics',
      period: { start: new Date(), end: new Date() },
      accounts: accounts.map(a => a.id),
      data: {
        accounts: accounts.map(a => ({
          id: a.id,
          platform: a.platform,
          sellerName: a.sellerName,
          metrics: a.metrics,
        })),
        summary: {
          totalListings: accounts.reduce((sum, a) => sum + a.metrics.totalListings, 0),
          activeListings: accounts.reduce((sum, a) => sum + a.metrics.activeListings, 0),
          totalOrders: accounts.reduce((sum, a) => sum + a.metrics.totalOrders, 0),
          totalRevenue: accounts.reduce((sum, a) => sum + a.metrics.totalRevenue, 0),
          averageRating: accounts.length > 0 ? accounts.reduce((sum, a) => sum + a.metrics.averageRating, 0) / accounts.length : 0,
        },
      },
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  getReport(reportId: string): MarketplaceReport | null {
    return this.reports.get(reportId) || null;
  }

  getReports(tenantId: string, type?: ReportType): MarketplaceReport[] {
    let reports = Array.from(this.reports.values())
      .filter(r => r.tenantId === tenantId);

    if (type) {
      reports = reports.filter(r => r.type === type);
    }

    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  // ==========================================================================
  // CATEGORY MANAGEMENT
  // ==========================================================================

  getCategories(platform: MarketplacePlatform): MarketplaceCategory[] {
    return this.categories.get(platform) || this.getDefaultCategories(platform);
  }

  private getDefaultCategories(platform: MarketplacePlatform): MarketplaceCategory[] {
    // Return platform-specific category structure
    const commonCategories: MarketplaceCategory[] = [
      {
        id: 'electronics',
        name: 'Electronics',
        path: ['Electronics'],
        requiredAttributes: ['brand', 'model'],
        optionalAttributes: ['color', 'warranty'],
      },
      {
        id: 'electronics_phones',
        name: 'Mobile Phones',
        path: ['Electronics', 'Mobile Phones'],
        requiredAttributes: ['brand', 'model', 'storage', 'ram'],
        optionalAttributes: ['color', 'warranty', 'screen_size'],
      },
      {
        id: 'home_garden',
        name: 'Home & Garden',
        path: ['Home & Garden'],
        requiredAttributes: ['brand'],
        optionalAttributes: ['material', 'dimensions', 'color'],
      },
      {
        id: 'fashion',
        name: 'Fashion',
        path: ['Fashion'],
        requiredAttributes: ['brand', 'size', 'color'],
        optionalAttributes: ['material', 'gender', 'age_group'],
      },
    ];

    return commonCategories;
  }

  searchCategories(platform: MarketplacePlatform, query: string): MarketplaceCategory[] {
    const categories = this.getCategories(platform);
    const lowerQuery = query.toLowerCase();
    return categories.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.path.some(p => p.toLowerCase().includes(lowerQuery))
    );
  }

  // ==========================================================================
  // PLATFORM INFO
  // ==========================================================================

  getPlatformInfo(platform: MarketplacePlatform): typeof this.platformConfigs[MarketplacePlatform] {
    return this.platformConfigs[platform];
  }

  getAllPlatforms(): { platform: MarketplacePlatform; info: typeof this.platformConfigs[MarketplacePlatform] }[] {
    return Object.entries(this.platformConfigs).map(([platform, info]) => ({
      platform: platform as MarketplacePlatform,
      info,
    }));
  }

  getSupportedRegions(platform: MarketplacePlatform): MarketplaceRegion[] {
    return this.platformConfigs[platform]?.regions || [];
  }

  calculateFees(platform: MarketplacePlatform, amount: number): { percentage: number; fixed: number; total: number } {
    const config = this.platformConfigs[platform];
    const percentageFee = amount * (config.feeStructure.percentage / 100);
    const fixedFee = config.feeStructure.fixed;
    return {
      percentage: percentageFee,
      fixed: fixedFee,
      total: percentageFee + fixedFee,
    };
  }
}
