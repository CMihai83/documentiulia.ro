import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { EcommerceService, PLATFORM_CONFIGS } from './ecommerce.service';

describe('EcommerceService', () => {
  let service: EcommerceService;
  let storeId: string;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EcommerceService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EcommerceService>(EcommerceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have platform configurations', () => {
      expect(PLATFORM_CONFIGS.shopify).toBeDefined();
      expect(PLATFORM_CONFIGS.woocommerce).toBeDefined();
    });
  });

  describe('platform info', () => {
    it('should return supported platforms', () => {
      const platforms = service.getSupportedPlatforms();
      expect(platforms.length).toBe(4);
      expect(platforms.some((p) => p.id === 'shopify')).toBe(true);
      expect(platforms.some((p) => p.id === 'woocommerce')).toBe(true);
    });

    it('should get platform config', () => {
      const config = service.getPlatformConfig('shopify');
      expect(config).toBeDefined();
      expect(config?.name).toBe('Shopify');
    });

    it('should return null for unknown platform', () => {
      const config = service.getPlatformConfig('unknown' as any);
      expect(config).toBeNull();
    });
  });

  describe('store management', () => {
    it('should connect a Shopify store', async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://mystore.myshopify.com',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });

      expect(store.id).toBeDefined();
      expect(store.platform).toBe('shopify');
      expect(store.connected).toBe(true);
      storeId = store.id;
    });

    it('should connect a WooCommerce store', async () => {
      const store = await service.connectStore({
        platform: 'woocommerce',
        storeUrl: 'https://mystore.com',
        apiKey: 'ck_test_key',
        apiSecret: 'cs_test_secret',
      });

      expect(store.id).toBeDefined();
      expect(store.platform).toBe('woocommerce');
    });

    it('should throw for missing store URL', async () => {
      await expect(
        service.connectStore({
          platform: 'shopify',
          storeUrl: '',
          apiKey: 'test-key',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for missing API key', async () => {
      await expect(
        service.connectStore({
          platform: 'shopify',
          storeUrl: 'https://test.com',
          apiKey: '',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for unsupported platform', async () => {
      await expect(
        service.connectStore({
          platform: 'invalid' as any,
          storeUrl: 'https://test.com',
          apiKey: 'test-key',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should disconnect a store', async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://test.myshopify.com',
        apiKey: 'test-key',
      });

      const result = await service.disconnectStore(store.id);
      expect(result).toBe(true);

      const disconnectedStore = service.getStore(store.id);
      expect(disconnectedStore?.connected).toBe(false);
    });

    it('should list stores', async () => {
      await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://store1.myshopify.com',
        apiKey: 'key1',
      });
      await service.connectStore({
        platform: 'woocommerce',
        storeUrl: 'https://store2.com',
        apiKey: 'key2',
      });

      const allStores = service.listStores();
      expect(allStores.length).toBeGreaterThanOrEqual(2);

      const shopifyStores = service.listStores('shopify');
      expect(shopifyStores.every((s) => s.platform === 'shopify')).toBe(true);
    });

    it('should update store settings', async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://test.myshopify.com',
        apiKey: 'key',
      });

      const updated = await service.updateStoreSettings(store.id, {
        autoSync: true,
        syncInterval: 3600,
      });

      expect(updated.settings.autoSync).toBe(true);
      expect(updated.settings.syncInterval).toBe(3600);
    });
  });

  describe('product management', () => {
    beforeEach(async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://products.myshopify.com',
        apiKey: 'key',
      });
      storeId = store.id;
    });

    it('should sync products', async () => {
      const result = await service.syncProducts(storeId);

      expect(result.syncType).toBe('products');
      expect(result.itemsProcessed).toBeGreaterThan(0);
      expect(result.completedAt).toBeDefined();
    });

    it('should list products', async () => {
      await service.syncProducts(storeId);
      const { products, total } = await service.listProducts(storeId);

      expect(products.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
    });

    it('should filter products by category', async () => {
      await service.syncProducts(storeId);
      const { products } = await service.listProducts(storeId, { category: 'Electronics' });

      expect(products.every((p) => p.category === 'Electronics')).toBe(true);
    });

    it('should create a product', async () => {
      const product = await service.createProduct(storeId, {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        inventory: 50,
      });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.storeId).toBe(storeId);
    });

    it('should update a product', async () => {
      const product = await service.createProduct(storeId, {
        name: 'Original Name',
        price: 50,
      });

      const updated = await service.updateProduct(product.id, {
        name: 'Updated Name',
        price: 75,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.price).toBe(75);
    });

    it('should delete a product', async () => {
      const product = await service.createProduct(storeId, { name: 'To Delete' });
      const result = await service.deleteProduct(product.id);

      expect(result).toBe(true);
      expect(await service.getProduct(product.id)).toBeNull();
    });
  });

  describe('inventory management', () => {
    beforeEach(async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://inventory.myshopify.com',
        apiKey: 'key',
      });
      storeId = store.id;
      await service.syncProducts(storeId);
    });

    it('should update inventory levels', async () => {
      const { products } = await service.listProducts(storeId, { limit: 1 });
      const product = products[0];

      const result = await service.updateInventory(storeId, [
        { productId: product.id, sku: product.sku, quantity: 100 },
      ]);

      expect(result.updated).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should adjust inventory', async () => {
      const { products } = await service.listProducts(storeId, { limit: 1 });
      const product = products[0];
      const originalInventory = product.inventory;

      await service.updateInventory(storeId, [
        { productId: product.id, sku: product.sku, quantity: 0, adjustment: 10 },
      ]);

      const updated = await service.getProduct(product.id);
      expect(updated?.inventory).toBe(originalInventory + 10);
    });

    it('should get inventory levels', async () => {
      const inventory = await service.getInventoryLevels(storeId);
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0].productId).toBeDefined();
      expect(inventory[0].sku).toBeDefined();
    });

    it('should get low stock products', async () => {
      // Create a low stock product
      await service.createProduct(storeId, {
        name: 'Low Stock Item',
        inventory: 5,
      });

      const lowStock = await service.getLowStockProducts(storeId, 10);
      expect(lowStock.some((p) => p.inventory <= 10)).toBe(true);
    });
  });

  describe('order management', () => {
    beforeEach(async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://orders.myshopify.com',
        apiKey: 'key',
      });
      storeId = store.id;
      await service.syncOrders(storeId);
    });

    it('should sync orders', async () => {
      const result = await service.syncOrders(storeId);

      expect(result.syncType).toBe('orders');
      expect(result.itemsProcessed).toBeGreaterThan(0);
    });

    it('should list orders', async () => {
      const { orders, total } = await service.listOrders(storeId);

      expect(orders.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
    });

    it('should filter orders by status', async () => {
      const { orders } = await service.listOrders(storeId, { status: 'pending' });

      expect(orders.every((o) => o.status === 'pending')).toBe(true);
    });

    it('should get order by ID', async () => {
      const { orders } = await service.listOrders(storeId, { limit: 1 });
      const order = await service.getOrder(orders[0].id);

      expect(order).toBeDefined();
      expect(order?.lineItems.length).toBeGreaterThan(0);
    });

    it('should update order status', async () => {
      const { orders } = await service.listOrders(storeId, { limit: 1 });
      const updated = await service.updateOrderStatus(orders[0].id, 'processing');

      expect(updated.status).toBe('processing');
    });

    it('should fulfill an order', async () => {
      const { orders } = await service.listOrders(storeId, { limit: 1 });
      const fulfilled = await service.fulfillOrder(orders[0].id, 'TRACK123');

      expect(fulfilled.fulfillmentStatus).toBe('fulfilled');
      expect(fulfilled.status).toBe('shipped');
    });

    it('should cancel an order', async () => {
      const { orders } = await service.listOrders(storeId, { limit: 1 });
      const cancelled = await service.cancelOrder(orders[0].id, 'Customer request');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.financialStatus).toBe('voided');
    });

    it('should create invoice from order', async () => {
      const { orders } = await service.listOrders(storeId, { limit: 1 });
      const invoice = await service.createInvoiceFromOrder(orders[0].id);

      expect(invoice.invoiceId).toBeDefined();
      expect(invoice.orderId).toBe(orders[0].id);
    });
  });

  describe('customer management', () => {
    beforeEach(async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://customers.myshopify.com',
        apiKey: 'key',
      });
      storeId = store.id;
      await service.syncCustomers(storeId);
    });

    it('should sync customers', async () => {
      const result = await service.syncCustomers(storeId);

      expect(result.syncType).toBe('customers');
      expect(result.itemsProcessed).toBeGreaterThan(0);
    });

    it('should list customers', async () => {
      const { customers, total } = await service.listCustomers(storeId);

      expect(customers.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
    });

    it('should get customer by ID', async () => {
      const { customers } = await service.listCustomers(storeId, { limit: 1 });
      const customer = await service.getCustomer(customers[0].id);

      expect(customer).toBeDefined();
      expect(customer?.email).toBeDefined();
    });

    it('should search customers', async () => {
      const results = await service.searchCustomers(storeId, 'customer1');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search customers by name', async () => {
      const results = await service.searchCustomers(storeId, 'Ion');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('webhooks', () => {
    beforeEach(async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://webhooks.myshopify.com',
        apiKey: 'key',
        webhookSecret: 'webhook-secret',
      });
      storeId = store.id;
    });

    it('should register a webhook', async () => {
      const webhook = await service.registerWebhook(
        storeId,
        'orders/create',
        'https://myapp.com/webhooks/orders'
      );

      expect(webhook.id).toBeDefined();
      expect(webhook.topic).toBe('orders/create');
    });

    it('should process a webhook event', async () => {
      const event = await service.processWebhook(
        'shopify',
        storeId,
        'orders/create',
        { order_id: '123', total: 100 }
      );

      expect(event.id).toBeDefined();
      expect(event.processed).toBe(true);
    });

    it('should throw for invalid webhook signature', async () => {
      await expect(
        service.processWebhook(
          'shopify',
          storeId,
          'orders/create',
          { order_id: '123' },
          'invalid-signature'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      const store = await service.connectStore({
        platform: 'shopify',
        storeUrl: 'https://analytics.myshopify.com',
        apiKey: 'key',
      });
      storeId = store.id;
      await service.syncProducts(storeId);
      await service.syncOrders(storeId);
      await service.syncCustomers(storeId);
    });

    it('should return store analytics', async () => {
      const analytics = await service.getStoreAnalytics(storeId);

      expect(analytics.totalProducts).toBeGreaterThan(0);
      expect(analytics.totalOrders).toBeGreaterThan(0);
      expect(analytics.totalCustomers).toBeGreaterThan(0);
      expect(analytics.ordersByStatus).toBeDefined();
    });

    it('should calculate average order value', async () => {
      const analytics = await service.getStoreAnalytics(storeId);

      expect(analytics.averageOrderValue).toBeGreaterThan(0);
    });

    it('should return top products', async () => {
      const analytics = await service.getStoreAnalytics(storeId);

      expect(analytics.topProducts).toBeDefined();
      expect(Array.isArray(analytics.topProducts)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw for store not found', async () => {
      await expect(service.syncProducts('nonexistent')).rejects.toThrow(BadRequestException);
    });

    it('should throw for product not found', async () => {
      await expect(service.updateProduct('nonexistent', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw for order not found', async () => {
      await expect(service.updateOrderStatus('nonexistent', 'processing')).rejects.toThrow(BadRequestException);
    });

    it('should return null for unknown customer', async () => {
      const customer = await service.getCustomer('nonexistent');
      expect(customer).toBeNull();
    });
  });
});
