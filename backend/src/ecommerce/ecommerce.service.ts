import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Platform Types
export type EcommercePlatform = 'shopify' | 'woocommerce' | 'magento' | 'prestashop';

// Common Interfaces
export interface EcommerceCredentials {
  platform: EcommercePlatform;
  storeUrl: string;
  apiKey: string;
  apiSecret?: string;
  accessToken?: string;
  webhookSecret?: string;
}

export interface EcommerceStore {
  id: string;
  platform: EcommercePlatform;
  name: string;
  url: string;
  currency: string;
  timezone: string;
  connected: boolean;
  connectedAt: Date;
  lastSyncAt?: Date;
  settings: Record<string, any>;
}

export interface EcommerceProduct {
  id: string;
  externalId: string;
  platform: EcommercePlatform;
  storeId: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  inventory: number;
  category?: string;
  images: string[];
  variants: ProductVariant[];
  status: 'active' | 'draft' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  inventory: number;
  attributes: Record<string, string>;
}

export interface EcommerceOrder {
  id: string;
  externalId: string;
  platform: EcommercePlatform;
  storeId: string;
  orderNumber: string;
  status: OrderStatus;
  financialStatus: FinancialStatus;
  fulfillmentStatus: FulfillmentStatus;
  customer: OrderCustomer;
  lineItems: OrderLineItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type FinancialStatus = 'pending' | 'authorized' | 'paid' | 'partially_paid' | 'refunded' | 'voided';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked';

export interface OrderCustomer {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
}

export interface OrderLineItem {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  postalCode: string;
  country: string;
  countryCode: string;
  phone?: string;
}

export interface EcommerceCustomer {
  id: string;
  externalId: string;
  platform: EcommercePlatform;
  storeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  ordersCount: number;
  totalSpent: number;
  currency: string;
  tags: string[];
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  platform: EcommercePlatform;
  storeId: string;
  topic: string;
  payload: Record<string, any>;
  receivedAt: Date;
  processed: boolean;
  processedAt?: Date;
  error?: string;
}

export interface SyncResult {
  platform: EcommercePlatform;
  storeId: string;
  syncType: 'products' | 'orders' | 'customers' | 'inventory' | 'full';
  startedAt: Date;
  completedAt: Date;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  errors: string[];
}

export interface InventoryUpdate {
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  adjustment?: number; // for relative updates
}

// Platform Configurations
export const PLATFORM_CONFIGS: Record<EcommercePlatform, { name: string; apiVersion: string; rateLimit: number }> = {
  shopify: { name: 'Shopify', apiVersion: '2024-01', rateLimit: 40 },
  woocommerce: { name: 'WooCommerce', apiVersion: 'v3', rateLimit: 60 },
  magento: { name: 'Magento', apiVersion: 'V1', rateLimit: 30 },
  prestashop: { name: 'PrestaShop', apiVersion: '1.7', rateLimit: 30 },
};

@Injectable()
export class EcommerceService {
  private readonly logger = new Logger(EcommerceService.name);
  private stores: Map<string, EcommerceStore> = new Map();
  private products: Map<string, EcommerceProduct> = new Map();
  private orders: Map<string, EcommerceOrder> = new Map();
  private customers: Map<string, EcommerceCustomer> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();
  private credentials: Map<string, EcommerceCredentials> = new Map();

  constructor(private configService: ConfigService) {}

  // =================== STORE MANAGEMENT ===================

  async connectStore(credentials: EcommerceCredentials): Promise<EcommerceStore> {
    this.validateCredentials(credentials);

    const storeId = `store_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Simulate API connection test
    const storeInfo = await this.fetchStoreInfo(credentials);

    const store: EcommerceStore = {
      id: storeId,
      platform: credentials.platform,
      name: storeInfo.name,
      url: credentials.storeUrl,
      currency: storeInfo.currency,
      timezone: storeInfo.timezone,
      connected: true,
      connectedAt: new Date(),
      settings: {},
    };

    this.stores.set(storeId, store);
    this.credentials.set(storeId, credentials);
    this.logger.log(`Store connected: ${storeId} (${credentials.platform})`);

    return store;
  }

  private validateCredentials(credentials: EcommerceCredentials): void {
    if (!credentials.storeUrl) {
      throw new BadRequestException('Store URL is required');
    }
    if (!credentials.apiKey) {
      throw new BadRequestException('API key is required');
    }
    if (!Object.keys(PLATFORM_CONFIGS).includes(credentials.platform)) {
      throw new BadRequestException(`Unsupported platform: ${credentials.platform}`);
    }
  }

  private async fetchStoreInfo(credentials: EcommerceCredentials): Promise<{ name: string; currency: string; timezone: string }> {
    // Simulate fetching store info from the platform API
    const names: Record<EcommercePlatform, string> = {
      shopify: 'My Shopify Store',
      woocommerce: 'My WooCommerce Store',
      magento: 'My Magento Store',
      prestashop: 'My PrestaShop Store',
    };

    return {
      name: names[credentials.platform],
      currency: 'EUR',
      timezone: 'Europe/Bucharest',
    };
  }

  async disconnectStore(storeId: string): Promise<boolean> {
    const store = this.stores.get(storeId);
    if (!store) return false;

    store.connected = false;
    this.stores.set(storeId, store);
    this.credentials.delete(storeId);
    this.logger.log(`Store disconnected: ${storeId}`);

    return true;
  }

  getStore(storeId: string): EcommerceStore | null {
    return this.stores.get(storeId) || null;
  }

  listStores(platform?: EcommercePlatform): EcommerceStore[] {
    let stores = Array.from(this.stores.values());
    if (platform) {
      stores = stores.filter((s) => s.platform === platform);
    }
    return stores;
  }

  async updateStoreSettings(storeId: string, settings: Record<string, any>): Promise<EcommerceStore> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new BadRequestException('Store not found');
    }

    store.settings = { ...store.settings, ...settings };
    this.stores.set(storeId, store);

    return store;
  }

  // =================== PRODUCT MANAGEMENT ===================

  async syncProducts(storeId: string): Promise<SyncResult> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new BadRequestException('Store not found');
    }

    const startedAt = new Date();
    const mockProducts = this.generateMockProducts(store);

    let created = 0;
    let updated = 0;

    for (const product of mockProducts) {
      const existing = Array.from(this.products.values()).find(
        (p) => p.externalId === product.externalId && p.storeId === storeId
      );

      if (existing) {
        this.products.set(existing.id, { ...existing, ...product, id: existing.id });
        updated++;
      } else {
        this.products.set(product.id, product);
        created++;
      }
    }

    store.lastSyncAt = new Date();
    this.stores.set(storeId, store);

    return {
      platform: store.platform,
      storeId,
      syncType: 'products',
      startedAt,
      completedAt: new Date(),
      itemsProcessed: mockProducts.length,
      itemsCreated: created,
      itemsUpdated: updated,
      itemsFailed: 0,
      errors: [],
    };
  }

  private generateMockProducts(store: EcommerceStore): EcommerceProduct[] {
    const products: EcommerceProduct[] = [];
    const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'];

    for (let i = 1; i <= 10; i++) {
      const productId = `prod_${store.id}_${i}`;
      products.push({
        id: productId,
        externalId: `ext_${i}`,
        platform: store.platform,
        storeId: store.id,
        sku: `SKU-${String(i).padStart(5, '0')}`,
        name: `Product ${i}`,
        description: `Description for product ${i}`,
        price: Math.floor(Math.random() * 1000) + 10,
        compareAtPrice: Math.floor(Math.random() * 1200) + 50,
        currency: store.currency,
        inventory: Math.floor(Math.random() * 100),
        category: categories[i % categories.length],
        images: [`https://example.com/products/${i}/image1.jpg`],
        variants: [
          {
            id: `var_${productId}_1`,
            sku: `SKU-${String(i).padStart(5, '0')}-S`,
            name: 'Small',
            price: Math.floor(Math.random() * 1000) + 10,
            inventory: Math.floor(Math.random() * 50),
            attributes: { size: 'S' },
          },
        ],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return products;
  }

  async getProduct(productId: string): Promise<EcommerceProduct | null> {
    return this.products.get(productId) || null;
  }

  async listProducts(
    storeId: string,
    options: { category?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ products: EcommerceProduct[]; total: number }> {
    let products = Array.from(this.products.values()).filter((p) => p.storeId === storeId);

    if (options.category) {
      products = products.filter((p) => p.category === options.category);
    }
    if (options.status) {
      products = products.filter((p) => p.status === options.status);
    }

    const total = products.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    products = products.slice(offset, offset + limit);

    return { products, total };
  }

  async createProduct(storeId: string, productData: Partial<EcommerceProduct>): Promise<EcommerceProduct> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new BadRequestException('Store not found');
    }

    const productId = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const product: EcommerceProduct = {
      id: productId,
      externalId: `ext_${productId}`,
      platform: store.platform,
      storeId,
      sku: productData.sku || `SKU-${Date.now()}`,
      name: productData.name || 'New Product',
      description: productData.description,
      price: productData.price || 0,
      compareAtPrice: productData.compareAtPrice,
      currency: store.currency,
      inventory: productData.inventory || 0,
      category: productData.category,
      images: productData.images || [],
      variants: productData.variants || [],
      status: productData.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(productId, product);
    this.logger.log(`Product created: ${productId}`);

    return product;
  }

  async updateProduct(productId: string, updates: Partial<EcommerceProduct>): Promise<EcommerceProduct> {
    const product = this.products.get(productId);
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const updatedProduct = {
      ...product,
      ...updates,
      id: productId,
      updatedAt: new Date(),
    };

    this.products.set(productId, updatedProduct);

    return updatedProduct;
  }

  async deleteProduct(productId: string): Promise<boolean> {
    return this.products.delete(productId);
  }

  // =================== INVENTORY MANAGEMENT ===================

  async updateInventory(storeId: string, updates: InventoryUpdate[]): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const update of updates) {
      const product = Array.from(this.products.values()).find(
        (p) => p.storeId === storeId && (p.id === update.productId || p.sku === update.sku)
      );

      if (product) {
        if (update.adjustment !== undefined) {
          product.inventory += update.adjustment;
        } else {
          product.inventory = update.quantity;
        }
        product.updatedAt = new Date();
        this.products.set(product.id, product);
        updated++;
      } else {
        failed++;
      }
    }

    return { updated, failed };
  }

  async getInventoryLevels(storeId: string): Promise<Array<{ productId: string; sku: string; inventory: number }>> {
    const products = Array.from(this.products.values()).filter((p) => p.storeId === storeId);
    return products.map((p) => ({
      productId: p.id,
      sku: p.sku,
      inventory: p.inventory,
    }));
  }

  async getLowStockProducts(storeId: string, threshold = 10): Promise<EcommerceProduct[]> {
    return Array.from(this.products.values()).filter(
      (p) => p.storeId === storeId && p.inventory <= threshold
    );
  }

  // =================== ORDER MANAGEMENT ===================

  async syncOrders(storeId: string, since?: Date): Promise<SyncResult> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new BadRequestException('Store not found');
    }

    const startedAt = new Date();
    const mockOrders = this.generateMockOrders(store);

    let created = 0;
    let updated = 0;

    for (const order of mockOrders) {
      const existing = Array.from(this.orders.values()).find(
        (o) => o.externalId === order.externalId && o.storeId === storeId
      );

      if (existing) {
        this.orders.set(existing.id, { ...existing, ...order, id: existing.id });
        updated++;
      } else {
        this.orders.set(order.id, order);
        created++;
      }
    }

    return {
      platform: store.platform,
      storeId,
      syncType: 'orders',
      startedAt,
      completedAt: new Date(),
      itemsProcessed: mockOrders.length,
      itemsCreated: created,
      itemsUpdated: updated,
      itemsFailed: 0,
      errors: [],
    };
  }

  private generateMockOrders(store: EcommerceStore): EcommerceOrder[] {
    const orders: EcommerceOrder[] = [];
    const statuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

    for (let i = 1; i <= 5; i++) {
      const orderId = `ord_${store.id}_${i}`;
      const subtotal = Math.floor(Math.random() * 500) + 50;
      const tax = Math.floor(subtotal * 0.19);
      const shipping = 15;

      orders.push({
        id: orderId,
        externalId: `ext_ord_${i}`,
        platform: store.platform,
        storeId: store.id,
        orderNumber: `#100${i}`,
        status: statuses[i % statuses.length],
        financialStatus: 'paid',
        fulfillmentStatus: i > 3 ? 'fulfilled' : 'unfulfilled',
        customer: {
          email: `customer${i}@example.com`,
          firstName: `Ion`,
          lastName: `Popescu`,
          phone: '+40721234567',
        },
        lineItems: [
          {
            id: `item_${orderId}_1`,
            productId: `prod_${store.id}_${i}`,
            sku: `SKU-${String(i).padStart(5, '0')}`,
            name: `Product ${i}`,
            quantity: Math.floor(Math.random() * 3) + 1,
            price: subtotal,
            discount: 0,
            tax,
            total: subtotal + tax,
          },
        ],
        shippingAddress: {
          firstName: 'Ion',
          lastName: 'Popescu',
          address1: 'Str. Victoriei 123',
          city: 'București',
          postalCode: '010101',
          country: 'Romania',
          countryCode: 'RO',
        },
        billingAddress: {
          firstName: 'Ion',
          lastName: 'Popescu',
          address1: 'Str. Victoriei 123',
          city: 'București',
          postalCode: '010101',
          country: 'Romania',
          countryCode: 'RO',
        },
        subtotal,
        shippingCost: shipping,
        taxAmount: tax,
        discountAmount: 0,
        total: subtotal + tax + shipping,
        currency: store.currency,
        paymentMethod: 'card',
        tags: [],
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
    }

    return orders;
  }

  async getOrder(orderId: string): Promise<EcommerceOrder | null> {
    return this.orders.get(orderId) || null;
  }

  async listOrders(
    storeId: string,
    options: { status?: OrderStatus; since?: Date; limit?: number; offset?: number } = {}
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    let orders = Array.from(this.orders.values()).filter((o) => o.storeId === storeId);

    if (options.status) {
      orders = orders.filter((o) => o.status === options.status);
    }
    if (options.since) {
      orders = orders.filter((o) => o.createdAt >= options.since!);
    }

    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = orders.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    orders = orders.slice(offset, offset + limit);

    return { orders, total };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<EcommerceOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    order.status = status;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);

    return order;
  }

  async fulfillOrder(orderId: string, trackingNumber?: string): Promise<EcommerceOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    order.fulfillmentStatus = 'fulfilled';
    order.status = 'shipped';
    order.updatedAt = new Date();
    if (trackingNumber) {
      order.notes = `Tracking: ${trackingNumber}`;
    }
    this.orders.set(orderId, order);

    return order;
  }

  async cancelOrder(orderId: string, reason?: string): Promise<EcommerceOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    order.status = 'cancelled';
    order.financialStatus = 'voided';
    order.updatedAt = new Date();
    if (reason) {
      order.notes = `Cancelled: ${reason}`;
    }
    this.orders.set(orderId, order);

    return order;
  }

  // =================== CUSTOMER MANAGEMENT ===================

  async syncCustomers(storeId: string): Promise<SyncResult> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new BadRequestException('Store not found');
    }

    const startedAt = new Date();
    const mockCustomers = this.generateMockCustomers(store);

    let created = 0;

    for (const customer of mockCustomers) {
      const existing = Array.from(this.customers.values()).find(
        (c) => c.email === customer.email && c.storeId === storeId
      );

      if (!existing) {
        this.customers.set(customer.id, customer);
        created++;
      }
    }

    return {
      platform: store.platform,
      storeId,
      syncType: 'customers',
      startedAt,
      completedAt: new Date(),
      itemsProcessed: mockCustomers.length,
      itemsCreated: created,
      itemsUpdated: 0,
      itemsFailed: 0,
      errors: [],
    };
  }

  private generateMockCustomers(store: EcommerceStore): EcommerceCustomer[] {
    const customers: EcommerceCustomer[] = [];
    const firstNames = ['Ion', 'Maria', 'Andrei', 'Elena', 'Alexandru'];
    const lastNames = ['Popescu', 'Ionescu', 'Popa', 'Dumitru', 'Stan'];

    for (let i = 1; i <= 5; i++) {
      const customerId = `cust_${store.id}_${i}`;
      customers.push({
        id: customerId,
        externalId: `ext_cust_${i}`,
        platform: store.platform,
        storeId: store.id,
        email: `customer${i}@example.com`,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        phone: `+4072${String(i).padStart(7, '0')}`,
        ordersCount: Math.floor(Math.random() * 10),
        totalSpent: Math.floor(Math.random() * 5000),
        currency: store.currency,
        tags: [],
        addresses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return customers;
  }

  async getCustomer(customerId: string): Promise<EcommerceCustomer | null> {
    return this.customers.get(customerId) || null;
  }

  async listCustomers(
    storeId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ customers: EcommerceCustomer[]; total: number }> {
    let customers = Array.from(this.customers.values()).filter((c) => c.storeId === storeId);

    const total = customers.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    customers = customers.slice(offset, offset + limit);

    return { customers, total };
  }

  async searchCustomers(storeId: string, query: string): Promise<EcommerceCustomer[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.customers.values()).filter(
      (c) =>
        c.storeId === storeId &&
        (c.email.toLowerCase().includes(lowerQuery) ||
          c.firstName.toLowerCase().includes(lowerQuery) ||
          c.lastName.toLowerCase().includes(lowerQuery))
    );
  }

  // =================== WEBHOOKS ===================

  async registerWebhook(storeId: string, topic: string, url: string): Promise<{ id: string; topic: string }> {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new BadRequestException('Store not found');
    }

    const webhookId = `webhook_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.logger.log(`Webhook registered: ${webhookId} for ${topic}`);

    return { id: webhookId, topic };
  }

  async processWebhook(
    platform: EcommercePlatform,
    storeId: string,
    topic: string,
    payload: Record<string, any>,
    signature?: string
  ): Promise<WebhookEvent> {
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const event: WebhookEvent = {
      id: eventId,
      platform,
      storeId,
      topic,
      payload,
      receivedAt: new Date(),
      processed: false,
    };

    // Verify webhook signature
    if (signature) {
      const isValid = this.verifyWebhookSignature(storeId, payload, signature);
      if (!isValid) {
        event.error = 'Invalid signature';
        this.webhookEvents.set(eventId, event);
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Process based on topic
    await this.handleWebhookEvent(event);
    event.processed = true;
    event.processedAt = new Date();

    this.webhookEvents.set(eventId, event);
    this.logger.log(`Webhook processed: ${eventId} (${topic})`);

    return event;
  }

  private verifyWebhookSignature(storeId: string, payload: Record<string, any>, signature: string): boolean {
    const credentials = this.credentials.get(storeId);
    if (!credentials?.webhookSecret) return true; // No secret configured

    const expected = crypto
      .createHmac('sha256', credentials.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expected;
  }

  private async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    // Handle different webhook topics
    switch (event.topic) {
      case 'orders/create':
      case 'orders/updated':
        await this.syncOrders(event.storeId);
        break;
      case 'products/create':
      case 'products/update':
        await this.syncProducts(event.storeId);
        break;
      case 'inventory_levels/update':
        // Handle inventory update
        break;
      default:
        this.logger.log(`Unhandled webhook topic: ${event.topic}`);
    }
  }

  // =================== ANALYTICS ===================

  async getStoreAnalytics(storeId: string): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalCustomers: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    topProducts: Array<{ productId: string; name: string; quantity: number }>;
  }> {
    const products = Array.from(this.products.values()).filter((p) => p.storeId === storeId);
    const orders = Array.from(this.orders.values()).filter((o) => o.storeId === storeId);
    const customers = Array.from(this.customers.values()).filter((c) => c.storeId === storeId);

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const ordersByStatus: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };

    for (const order of orders) {
      ordersByStatus[order.status]++;
    }

    // Calculate top products
    const productSales: Map<string, { name: string; quantity: number }> = new Map();
    for (const order of orders) {
      for (const item of order.lineItems) {
        const current = productSales.get(item.productId) || { name: item.name, quantity: 0 };
        current.quantity += item.quantity;
        productSales.set(item.productId, current);
      }
    }

    const topProducts = Array.from(productSales.entries())
      .map(([productId, { name, quantity }]) => ({ productId, name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalCustomers: customers.length,
      totalRevenue,
      averageOrderValue,
      ordersByStatus,
      topProducts,
    };
  }

  // =================== INVOICE INTEGRATION ===================

  async createInvoiceFromOrder(orderId: string): Promise<{
    invoiceId: string;
    orderId: string;
    total: number;
    status: string;
  }> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    return {
      invoiceId,
      orderId,
      total: order.total,
      status: 'created',
    };
  }

  // =================== PLATFORM INFO ===================

  getSupportedPlatforms(): Array<{ id: EcommercePlatform; name: string; apiVersion: string }> {
    return Object.entries(PLATFORM_CONFIGS).map(([id, config]) => ({
      id: id as EcommercePlatform,
      name: config.name,
      apiVersion: config.apiVersion,
    }));
  }

  getPlatformConfig(platform: EcommercePlatform): { name: string; apiVersion: string; rateLimit: number } | null {
    return PLATFORM_CONFIGS[platform] || null;
  }
}
