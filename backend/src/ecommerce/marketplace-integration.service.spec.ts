import { Test, TestingModule } from '@nestjs/testing';
import {
  MarketplaceIntegrationService,
  MarketplacePlatform,
  MarketplaceRegion,
  MarketplaceCredentials,
  MarketplaceCategory,
  ListingShipping,
  ListingImage,
} from './marketplace-integration.service';

describe('MarketplaceIntegrationService', () => {
  let service: MarketplaceIntegrationService;

  const testCredentials: MarketplaceCredentials = {
    platform: 'emag',
    region: 'RO',
    sellerId: 'seller-123',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    sandboxMode: true,
  };

  const testCategory: MarketplaceCategory = {
    id: 'electronics_phones',
    name: 'Mobile Phones',
    path: ['Electronics', 'Mobile Phones'],
    requiredAttributes: ['brand', 'model'],
    optionalAttributes: ['color'],
  };

  const testShipping: ListingShipping = {
    weight: 0.5,
    weightUnit: 'kg',
    freeShipping: false,
    handlingTimeDays: 1,
    shippingMethods: [
      {
        id: 'standard',
        name: 'Standard Shipping',
        carrier: 'FanCourier',
        price: 15,
        currency: 'RON',
        estimatedDays: { min: 2, max: 5 },
        regions: ['RO'],
      },
    ],
  };

  const testImages: ListingImage[] = [
    { url: 'https://example.com/image1.jpg', isPrimary: true, order: 0 },
    { url: 'https://example.com/image2.jpg', isPrimary: false, order: 1 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceIntegrationService],
    }).compile();

    service = module.get<MarketplaceIntegrationService>(MarketplaceIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('account management', () => {
    it('should connect a marketplace account', () => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });

      expect(account.id).toBeDefined();
      expect(account.platform).toBe('emag');
      expect(account.region).toBe('RO');
      expect(account.sellerName).toBe('Test Seller');
      expect(account.status).toBe('active');
    });

    it('should get account by id', () => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });

      const retrieved = service.getAccount(account.id);
      expect(retrieved?.id).toBe(account.id);
    });

    it('should get accounts by tenant', () => {
      service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Seller 1',
      });
      service.connectAccount({
        tenantId: 'tenant-001',
        credentials: { ...testCredentials, platform: 'amazon_eu', region: 'DE' },
        sellerName: 'Seller 2',
      });

      const accounts = service.getAccountsByTenant('tenant-001');
      expect(accounts.length).toBe(2);
    });

    it('should get accounts by platform', () => {
      service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'eMAG Seller',
      });
      service.connectAccount({
        tenantId: 'tenant-001',
        credentials: { ...testCredentials, platform: 'amazon_eu', region: 'DE' },
        sellerName: 'Amazon Seller',
      });

      const emagAccounts = service.getAccountsByPlatform('tenant-001', 'emag');
      expect(emagAccounts.length).toBe(1);
      expect(emagAccounts[0].platform).toBe('emag');
    });

    it('should update account settings', () => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });

      const updated = service.updateAccountSettings(account.id, {
        autoSync: false,
        syncIntervalMinutes: 60,
      });

      expect(updated?.settings.autoSync).toBe(false);
      expect(updated?.settings.syncIntervalMinutes).toBe(60);
    });

    it('should update account status', () => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });

      const updated = service.updateAccountStatus(account.id, 'suspended');
      expect(updated?.status).toBe('suspended');
    });

    it('should disconnect account', () => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });

      const result = service.disconnectAccount(account.id);
      expect(result).toBe(true);

      const retrieved = service.getAccount(account.id);
      expect(retrieved).toBeNull();
    });

    it('should refresh account metrics', () => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });

      const metrics = service.refreshAccountMetrics(account.id);
      expect(metrics).toBeDefined();
      expect(metrics?.accountHealth).toBeDefined();
    });
  });

  describe('listing management', () => {
    let accountId: string;

    beforeEach(() => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });
      accountId = account.id;
    });

    it('should create a listing', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-001',
        title: 'Test Product with a Long Enough Title',
        description: 'This is a test product description that is long enough to pass validation requirements for marketplace listings.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
        ean: '1234567890123',
      });

      expect(listing.id).toBeDefined();
      expect(listing.sku).toBe('SKU-001');
      expect(listing.status).toBe('draft');
      expect(listing.platform).toBe('emag');
    });

    it('should validate listing and report errors', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-002',
        title: 'Short',
        description: 'Short',
        category: testCategory,
        price: { amount: 0, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: [],
      });

      expect(listing.validationErrors.length).toBeGreaterThan(0);
      expect(listing.validationErrors.some(e => e.code === 'TITLE_TOO_SHORT')).toBe(true);
      expect(listing.validationErrors.some(e => e.code === 'NO_IMAGES')).toBe(true);
    });

    it('should get listing by id', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-003',
        title: 'Test Product with a Long Enough Title',
        description: 'This is a test product description that is long enough to pass validation.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const retrieved = service.getListing(listing.id);
      expect(retrieved?.id).toBe(listing.id);
    });

    it('should get listings by account', () => {
      service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-1',
        sku: 'SKU-A',
        title: 'Product A with Long Title',
        description: 'Description for product A that is long enough for validation.',
        category: testCategory,
        price: { amount: 100, currency: 'RON' },
        inventory: { quantity: 50, fulfillmentType: 'merchant', leadTimeDays: 1, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });
      service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-2',
        sku: 'SKU-B',
        title: 'Product B with Long Title',
        description: 'Description for product B that is long enough for validation.',
        category: testCategory,
        price: { amount: 200, currency: 'RON' },
        inventory: { quantity: 30, fulfillmentType: 'merchant', leadTimeDays: 1, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const listings = service.getListingsByAccount(accountId);
      expect(listings.length).toBe(2);
    });

    it('should update listing', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-004',
        title: 'Original Title that is Long Enough',
        description: 'Original description that is long enough for validation requirements.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const updated = service.updateListing(listing.id, {
        title: 'Updated Title that is Long Enough',
      });

      expect(updated?.title).toBe('Updated Title that is Long Enough');
    });

    it('should update listing price', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-005',
        title: 'Test Product with Long Title',
        description: 'Test description that is long enough for validation.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const updated = service.updateListingPrice(listing.id, { amount: 249.99 });
      expect(updated?.price.amount).toBe(249.99);
    });

    it('should update listing inventory', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-006',
        title: 'Test Product with Long Title',
        description: 'Test description that is long enough for validation.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const updated = service.updateListingInventory(listing.id, 50, 5);
      expect(updated?.inventory.quantity).toBe(50);
      expect(updated?.inventory.reservedQuantity).toBe(5);
      expect(updated?.inventory.availableQuantity).toBe(45);
    });

    it('should publish listing', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-007',
        title: 'Test Product with Long Title',
        description: 'Test description that is long enough for validation requirements.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
        ean: '1234567890123',
      });

      const published = service.publishListing(listing.id);
      expect(published?.status).toBe('pending_review');
    });

    it('should pause listing', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-008',
        title: 'Test Product with Long Title',
        description: 'Test description that is long enough for validation.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const paused = service.pauseListing(listing.id);
      expect(paused?.status).toBe('paused');
    });

    it('should archive listing', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-009',
        title: 'Test Product with Long Title',
        description: 'Test description that is long enough for validation.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const archived = service.archiveListing(listing.id);
      expect(archived?.status).toBe('archived');
    });

    it('should delete listing', () => {
      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-123',
        sku: 'SKU-010',
        title: 'Test Product with Long Title',
        description: 'Test description that is long enough for validation.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const deleted = service.deleteListing(listing.id);
      expect(deleted).toBe(true);
    });
  });

  describe('bulk operations', () => {
    let accountId: string;

    beforeEach(() => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });
      accountId = account.id;
    });

    it('should bulk create listings', () => {
      const operation = service.bulkCreateListings({
        tenantId: 'tenant-001',
        accountId,
        listings: [
          {
            productId: 'prod-1',
            sku: 'BULK-1',
            title: 'Bulk Product 1 with Long Title',
            description: 'Description for bulk product 1 that is long enough.',
            category: testCategory,
            price: { amount: 100, currency: 'RON' },
            inventory: { quantity: 50, fulfillmentType: 'merchant', leadTimeDays: 1, trackInventory: true, allowBackorder: false },
            shipping: testShipping,
            images: testImages,
          },
          {
            productId: 'prod-2',
            sku: 'BULK-2',
            title: 'Bulk Product 2 with Long Title',
            description: 'Description for bulk product 2 that is long enough.',
            category: testCategory,
            price: { amount: 200, currency: 'RON' },
            inventory: { quantity: 30, fulfillmentType: 'merchant', leadTimeDays: 1, trackInventory: true, allowBackorder: false },
            shipping: testShipping,
            images: testImages,
          },
        ],
      });

      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('listing_create');
      expect(operation.totalItems).toBe(2);
      expect(operation.successCount).toBe(2);
      expect(operation.status).toBe('completed');
    });

    it('should bulk update prices', () => {
      const listing1 = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-1',
        sku: 'PRICE-1',
        title: 'Product for Price Update with Long Title',
        description: 'Description that is long enough for validation.',
        category: testCategory,
        price: { amount: 100, currency: 'RON' },
        inventory: { quantity: 50, fulfillmentType: 'merchant', leadTimeDays: 1, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const operation = service.bulkUpdatePrices({
        tenantId: 'tenant-001',
        updates: [
          { listingId: listing1.id, price: { amount: 89.99 } },
        ],
      });

      expect(operation.type).toBe('price_update');
      expect(operation.successCount).toBe(1);
    });

    it('should bulk update inventory', () => {
      const listing1 = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-1',
        sku: 'INV-1',
        title: 'Product for Inventory Update',
        description: 'Description that is long enough for validation.',
        category: testCategory,
        price: { amount: 100, currency: 'RON' },
        inventory: { quantity: 50, fulfillmentType: 'merchant', leadTimeDays: 1, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });

      const operation = service.bulkUpdateInventory({
        tenantId: 'tenant-001',
        updates: [
          { listingId: listing1.id, quantity: 75 },
        ],
      });

      expect(operation.type).toBe('inventory_update');
      expect(operation.successCount).toBe(1);
    });

    it('should get bulk operation by id', () => {
      const operation = service.bulkCreateListings({
        tenantId: 'tenant-001',
        accountId,
        listings: [],
      });

      const retrieved = service.getBulkOperation(operation.id);
      expect(retrieved?.id).toBe(operation.id);
    });
  });

  describe('order management', () => {
    let accountId: string;

    beforeEach(() => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });
      accountId = account.id;
    });

    it('should import an order', () => {
      const order = service.importOrder({
        tenantId: 'tenant-001',
        accountId,
        externalOrderId: 'ext-order-123',
        orderNumber: 'ORD-001',
        customer: {
          email: 'customer@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'Bucharest',
          postalCode: '010101',
          country: 'Romania',
          countryCode: 'RO',
          isResidential: true,
        },
        items: [
          {
            listingId: 'lst-1',
            externalItemId: 'item-1',
            sku: 'SKU-001',
            title: 'Test Product',
            quantity: 2,
            unitPrice: 149.99,
            totalPrice: 299.98,
            taxAmount: 56.99,
            discount: 0,
          },
        ],
        subtotal: 299.98,
        shippingCost: 15,
        taxAmount: 56.99,
        marketplaceFee: 35.99,
        paymentFee: 3.50,
        discountAmount: 0,
        total: 371.97,
        currency: 'RON',
        paymentMethod: 'card',
        shippingMethod: 'standard',
      });

      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBe('ORD-001');
      expect(order.status).toBe('pending');
      expect(order.platform).toBe('emag');
    });

    it('should get order by id', () => {
      const order = service.importOrder({
        tenantId: 'tenant-001',
        accountId,
        externalOrderId: 'ext-order-124',
        orderNumber: 'ORD-002',
        customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          addressLine1: '456 Test St',
          city: 'Cluj',
          postalCode: '400001',
          country: 'Romania',
          countryCode: 'RO',
          isResidential: true,
        },
        items: [],
        subtotal: 100,
        shippingCost: 10,
        taxAmount: 19,
        marketplaceFee: 12,
        paymentFee: 1,
        discountAmount: 0,
        total: 129,
        currency: 'RON',
        paymentMethod: 'card',
        shippingMethod: 'standard',
      });

      const retrieved = service.getOrder(order.id);
      expect(retrieved?.id).toBe(order.id);
    });

    it('should get order by external id', () => {
      service.importOrder({
        tenantId: 'tenant-001',
        accountId,
        externalOrderId: 'ext-unique-123',
        orderNumber: 'ORD-003',
        customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          addressLine1: '789 Another St',
          city: 'Timisoara',
          postalCode: '300001',
          country: 'Romania',
          countryCode: 'RO',
          isResidential: true,
        },
        items: [],
        subtotal: 200,
        shippingCost: 15,
        taxAmount: 38,
        marketplaceFee: 24,
        paymentFee: 2,
        discountAmount: 0,
        total: 255,
        currency: 'RON',
        paymentMethod: 'card',
        shippingMethod: 'express',
      });

      const retrieved = service.getOrderByExternalId(accountId, 'ext-unique-123');
      expect(retrieved?.externalOrderId).toBe('ext-unique-123');
    });

    it('should update order status', () => {
      const order = service.importOrder({
        tenantId: 'tenant-001',
        accountId,
        externalOrderId: 'ext-order-125',
        orderNumber: 'ORD-004',
        customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          addressLine1: '123 St',
          city: 'Iasi',
          postalCode: '700001',
          country: 'Romania',
          countryCode: 'RO',
          isResidential: true,
        },
        items: [],
        subtotal: 100,
        shippingCost: 10,
        taxAmount: 19,
        marketplaceFee: 12,
        paymentFee: 1,
        discountAmount: 0,
        total: 129,
        currency: 'RON',
        paymentMethod: 'card',
        shippingMethod: 'standard',
      });

      const updated = service.updateOrderStatus(order.id, 'processing');
      expect(updated?.status).toBe('processing');
    });

    it('should add tracking to order', () => {
      const order = service.importOrder({
        tenantId: 'tenant-001',
        accountId,
        externalOrderId: 'ext-order-126',
        orderNumber: 'ORD-005',
        customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          addressLine1: '123 St',
          city: 'Constanta',
          postalCode: '900001',
          country: 'Romania',
          countryCode: 'RO',
          isResidential: true,
        },
        items: [],
        subtotal: 100,
        shippingCost: 10,
        taxAmount: 19,
        marketplaceFee: 12,
        paymentFee: 1,
        discountAmount: 0,
        total: 129,
        currency: 'RON',
        paymentMethod: 'card',
        shippingMethod: 'standard',
      });

      const updated = service.addTracking(order.id, 'AWB123456789', 'FanCourier');
      expect(updated?.trackingNumber).toBe('AWB123456789');
      expect(updated?.carrier).toBe('FanCourier');
      expect(updated?.status).toBe('shipped');
    });

    it('should generate order invoice', () => {
      const order = service.importOrder({
        tenantId: 'tenant-001',
        accountId,
        externalOrderId: 'ext-order-127',
        orderNumber: 'ORD-006',
        customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          addressLine1: '123 St',
          city: 'Brasov',
          postalCode: '500001',
          country: 'Romania',
          countryCode: 'RO',
          isResidential: true,
        },
        items: [],
        subtotal: 100,
        shippingCost: 10,
        taxAmount: 19,
        marketplaceFee: 12,
        paymentFee: 1,
        discountAmount: 0,
        total: 129,
        currency: 'RON',
        paymentMethod: 'card',
        shippingMethod: 'standard',
      });

      const result = service.generateOrderInvoice(order.id);
      expect(result?.invoiceId).toBeDefined();
    });
  });

  describe('pricing rules', () => {
    it('should create a pricing rule', () => {
      const rule = service.createPricingRule({
        tenantId: 'tenant-001',
        name: 'Competitive Pricing',
        strategy: 'competitive',
        adjustments: [{ type: 'competitor_based', value: 1, reference: 'lowest_competitor' }],
        minMargin: 10,
        maxDiscount: 20,
      });

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Competitive Pricing');
      expect(rule.strategy).toBe('competitive');
      expect(rule.isActive).toBe(true);
    });

    it('should get pricing rule by id', () => {
      const rule = service.createPricingRule({
        tenantId: 'tenant-001',
        name: 'Test Rule',
        strategy: 'fixed',
        adjustments: [{ type: 'percentage', value: 10 }],
        minMargin: 5,
        maxDiscount: 15,
      });

      const retrieved = service.getPricingRule(rule.id);
      expect(retrieved?.id).toBe(rule.id);
    });

    it('should get pricing rules by tenant', () => {
      service.createPricingRule({
        tenantId: 'tenant-001',
        name: 'Rule 1',
        strategy: 'fixed',
        adjustments: [{ type: 'fixed', value: 5 }],
        minMargin: 5,
        maxDiscount: 10,
      });
      service.createPricingRule({
        tenantId: 'tenant-001',
        name: 'Rule 2',
        strategy: 'dynamic',
        adjustments: [{ type: 'percentage', value: -5 }],
        minMargin: 8,
        maxDiscount: 15,
      });

      const rules = service.getPricingRules('tenant-001');
      expect(rules.length).toBe(2);
    });

    it('should update pricing rule', () => {
      const rule = service.createPricingRule({
        tenantId: 'tenant-001',
        name: 'Original Name',
        strategy: 'fixed',
        adjustments: [{ type: 'fixed', value: 5 }],
        minMargin: 5,
        maxDiscount: 10,
      });

      const updated = service.updatePricingRule(rule.id, { name: 'Updated Name', isActive: false });
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.isActive).toBe(false);
    });

    it('should delete pricing rule', () => {
      const rule = service.createPricingRule({
        tenantId: 'tenant-001',
        name: 'To Delete',
        strategy: 'fixed',
        adjustments: [],
        minMargin: 5,
        maxDiscount: 10,
      });

      const deleted = service.deletePricingRule(rule.id);
      expect(deleted).toBe(true);
    });
  });

  describe('inventory sync', () => {
    let accountId: string;

    beforeEach(() => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });
      accountId = account.id;
    });

    it('should create inventory sync rule', () => {
      const rule = service.createInventorySyncRule({
        tenantId: 'tenant-001',
        name: 'Main Warehouse Sync',
        sourceWarehouseId: 'wh-001',
        targetAccounts: [accountId],
        stockBuffer: 5,
      });

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Main Warehouse Sync');
      expect(rule.stockBuffer).toBe(5);
    });

    it('should get inventory sync rule by id', () => {
      const rule = service.createInventorySyncRule({
        tenantId: 'tenant-001',
        name: 'Test Rule',
        sourceWarehouseId: 'wh-001',
        targetAccounts: [accountId],
      });

      const retrieved = service.getInventorySyncRule(rule.id);
      expect(retrieved?.id).toBe(rule.id);
    });

    it('should get inventory sync rules by tenant', () => {
      service.createInventorySyncRule({
        tenantId: 'tenant-001',
        name: 'Rule 1',
        sourceWarehouseId: 'wh-001',
        targetAccounts: [accountId],
      });

      const rules = service.getInventorySyncRules('tenant-001');
      expect(rules.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('competitor tracking', () => {
    let accountId: string;
    let listingId: string;

    beforeEach(() => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });
      accountId = account.id;

      const listing = service.createListing({
        tenantId: 'tenant-001',
        accountId,
        productId: 'prod-comp',
        sku: 'COMP-001',
        title: 'Product with Competitors',
        description: 'This product has competitors to track and analyze.',
        category: testCategory,
        price: { amount: 299.99, currency: 'RON' },
        inventory: { quantity: 100, fulfillmentType: 'merchant', leadTimeDays: 2, trackInventory: true, allowBackorder: false },
        shipping: testShipping,
        images: testImages,
      });
      listingId = listing.id;
    });

    it('should update competitor data', () => {
      const data = service.updateCompetitorData(listingId, [
        {
          sellerId: 'comp-1',
          sellerName: 'Competitor 1',
          price: 289.99,
          shippingPrice: 15,
          totalPrice: 304.99,
          fulfillmentType: 'merchant',
          rating: 4.5,
          reviewCount: 100,
          hasBuyBox: true,
          inStock: true,
        },
        {
          sellerId: 'comp-2',
          sellerName: 'Competitor 2',
          price: 279.99,
          shippingPrice: 20,
          totalPrice: 299.99,
          fulfillmentType: 'marketplace',
          rating: 4.8,
          reviewCount: 250,
          hasBuyBox: false,
          inStock: true,
        },
      ]);

      expect(data.listingId).toBe(listingId);
      expect(data.competitors.length).toBe(2);
    });

    it('should get competitor data', () => {
      service.updateCompetitorData(listingId, [
        {
          sellerId: 'comp-1',
          sellerName: 'Competitor',
          price: 280,
          shippingPrice: 15,
          totalPrice: 295,
          fulfillmentType: 'merchant',
          rating: 4.0,
          reviewCount: 50,
          hasBuyBox: false,
          inStock: true,
        },
      ]);

      const data = service.getCompetitorData(listingId);
      expect(data?.competitors.length).toBe(1);
    });

    it('should analyze competitors', () => {
      service.updateCompetitorData(listingId, [
        {
          sellerId: 'comp-1',
          sellerName: 'Competitor',
          price: 280,
          shippingPrice: 15,
          totalPrice: 295,
          fulfillmentType: 'merchant',
          rating: 4.0,
          reviewCount: 50,
          hasBuyBox: true,
          inStock: true,
        },
      ]);

      const analysis = service.analyzeCompetitors(listingId);
      expect(analysis).toBeDefined();
      expect(analysis?.recommendation).toBeDefined();
    });
  });

  describe('reports', () => {
    let accountId: string;

    beforeEach(() => {
      const account = service.connectAccount({
        tenantId: 'tenant-001',
        credentials: testCredentials,
        sellerName: 'Test Seller',
      });
      accountId = account.id;
    });

    it('should generate sales summary', () => {
      const report = service.generateSalesSummary({
        tenantId: 'tenant-001',
        period: {
          start: new Date(Date.now() - 30 * 86400000),
          end: new Date(),
        },
      });

      expect(report.id).toBeDefined();
      expect(report.type).toBe('sales_summary');
      expect(report.data.totalOrders).toBeDefined();
    });

    it('should generate fee breakdown', () => {
      const report = service.generateFeeBreakdown({
        tenantId: 'tenant-001',
        period: {
          start: new Date(Date.now() - 30 * 86400000),
          end: new Date(),
        },
      });

      expect(report.id).toBeDefined();
      expect(report.type).toBe('fee_breakdown');
      expect(report.data.totalFees).toBeDefined();
    });

    it('should generate performance metrics', () => {
      const report = service.generatePerformanceMetrics('tenant-001');

      expect(report.id).toBeDefined();
      expect(report.type).toBe('performance_metrics');
      expect(report.data.summary).toBeDefined();
    });

    it('should get report by id', () => {
      const report = service.generatePerformanceMetrics('tenant-001');

      const retrieved = service.getReport(report.id);
      expect(retrieved?.id).toBe(report.id);
    });

    it('should get reports by tenant', () => {
      service.generateSalesSummary({
        tenantId: 'tenant-001',
        period: { start: new Date(), end: new Date() },
      });

      const reports = service.getReports('tenant-001');
      expect(reports.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('platform info', () => {
    it('should get platform info', () => {
      const info = service.getPlatformInfo('emag');
      expect(info.name).toBe('eMAG');
      expect(info.regions).toContain('RO');
    });

    it('should get all platforms', () => {
      const platforms = service.getAllPlatforms();
      expect(platforms.length).toBeGreaterThan(0);
      expect(platforms.some(p => p.platform === 'emag')).toBe(true);
      expect(platforms.some(p => p.platform === 'amazon_eu')).toBe(true);
    });

    it('should get supported regions', () => {
      const regions = service.getSupportedRegions('amazon_eu');
      expect(regions).toContain('DE');
      expect(regions).toContain('FR');
    });

    it('should calculate fees', () => {
      const fees = service.calculateFees('emag', 100);
      expect(fees.percentage).toBe(12);
      expect(fees.total).toBe(12);
    });

    it('should get categories', () => {
      const categories = service.getCategories('emag');
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should search categories', () => {
      const results = service.searchCategories('emag', 'phone');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
