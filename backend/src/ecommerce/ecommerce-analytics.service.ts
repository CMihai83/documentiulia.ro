import { Injectable, Logger, BadRequestException } from '@nestjs/common';

// ==================== Types & Interfaces ====================

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ComparisonPeriod = 'previous_period' | 'previous_year' | 'custom';
export type CustomerSegment = 'new' | 'returning' | 'vip' | 'at_risk' | 'churned' | 'loyal';
export type ProductStatus = 'best_seller' | 'rising' | 'stable' | 'declining' | 'slow_moving' | 'dead_stock';

// Sales Metrics
export interface SalesMetrics {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  itemsSold: number;
  refunds: number;
  refundRate: number;
  netRevenue: number;
  grossProfit: number;
  grossMargin: number;
}

// Time Series Data Point
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
}

// Sales Overview
export interface SalesOverview {
  tenantId: string;
  period: { start: Date; end: Date };
  metrics: SalesMetrics;
  comparison?: {
    period: { start: Date; end: Date };
    metrics: SalesMetrics;
    changes: {
      revenue: { value: number; percent: number };
      orders: { value: number; percent: number };
      averageOrderValue: { value: number; percent: number };
      itemsSold: { value: number; percent: number };
    };
  };
  timeSeries: {
    revenue: TimeSeriesDataPoint[];
    orders: TimeSeriesDataPoint[];
  };
  topProducts: ProductPerformance[];
  topCategories: CategoryPerformance[];
  salesByChannel: ChannelPerformance[];
}

// Product Performance
export interface ProductPerformance {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  averagePrice: number;
  refundRate: number;
  stockLevel: number;
  daysOfStock: number;
  status: ProductStatus;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  conversionRate: number;
  viewToCartRate: number;
  cartToOrderRate: number;
}

// Category Performance
export interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  productCount: number;
  unitsSold: number;
  revenue: number;
  averageOrderValue: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

// Channel Performance
export interface ChannelPerformance {
  channel: string;
  orders: number;
  revenue: number;
  averageOrderValue: number;
  percentOfTotal: number;
  conversionRate: number;
  newCustomers: number;
  returningCustomers: number;
}

// Customer Analytics
export interface CustomerAnalytics {
  tenantId: string;
  period: { start: Date; end: Date };
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageLifetimeValue: number;
    averageOrdersPerCustomer: number;
    customerRetentionRate: number;
    customerChurnRate: number;
    repeatPurchaseRate: number;
  };
  segments: CustomerSegmentData[];
  cohortAnalysis: CohortData[];
  rfmDistribution: RFMDistribution;
  acquisitionChannels: AcquisitionChannel[];
  geographicDistribution: GeographicData[];
}

// Customer Segment Data
export interface CustomerSegmentData {
  segment: CustomerSegment;
  count: number;
  percentOfTotal: number;
  revenue: number;
  averageOrderValue: number;
  averageOrders: number;
  averageLifetimeValue: number;
}

// Cohort Data
export interface CohortData {
  cohortMonth: string;
  customersAcquired: number;
  retentionByMonth: { month: number; retained: number; retentionRate: number }[];
  totalRevenue: number;
  averageLifetimeValue: number;
}

// RFM Distribution
export interface RFMDistribution {
  recency: { score: number; count: number; percent: number }[];
  frequency: { score: number; count: number; percent: number }[];
  monetary: { score: number; count: number; percent: number }[];
  segments: { name: string; count: number; percent: number; description: string }[];
}

// Acquisition Channel
export interface AcquisitionChannel {
  channel: string;
  customers: number;
  percentOfTotal: number;
  costPerAcquisition: number;
  lifetimeValue: number;
  roi: number;
}

// Geographic Data
export interface GeographicData {
  country: string;
  region?: string;
  city?: string;
  customers: number;
  orders: number;
  revenue: number;
  averageOrderValue: number;
}

// Inventory Analytics
export interface InventoryAnalytics {
  tenantId: string;
  asOfDate: Date;
  summary: {
    totalProducts: number;
    totalSKUs: number;
    totalValue: number;
    averageTurnoverRate: number;
    stockoutRate: number;
    overstockRate: number;
    deadStockValue: number;
  };
  stockLevels: StockLevelData[];
  turnoverAnalysis: TurnoverData[];
  reorderAlerts: ReorderAlert[];
  agingAnalysis: AgingData[];
}

// Stock Level Data
export interface StockLevelData {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  daysOfSupply: number;
  lastRestockDate?: Date;
}

// Turnover Data
export interface TurnoverData {
  productId: string;
  productName: string;
  turnoverRate: number;
  daysToSell: number;
  velocityCategory: 'fast' | 'medium' | 'slow' | 'dead';
  recommendedAction: string;
}

// Reorder Alert
export interface ReorderAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  estimatedStockoutDate?: Date;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// Aging Data
export interface AgingData {
  ageRange: string;
  productCount: number;
  totalValue: number;
  percentOfInventory: number;
}

// Conversion Funnel
export interface ConversionFunnel {
  tenantId: string;
  period: { start: Date; end: Date };
  stages: FunnelStage[];
  overallConversionRate: number;
  abandonmentRate: number;
  averageTimeToConvert: number;
  dropoffAnalysis: DropoffData[];
}

// Funnel Stage
export interface FunnelStage {
  name: string;
  visitors: number;
  conversionRate: number;
  dropoffRate: number;
  averageTime: number;
}

// Dropoff Data
export interface DropoffData {
  stage: string;
  reason: string;
  count: number;
  percentOfDropoffs: number;
}

// Marketing Analytics
export interface MarketingAnalytics {
  tenantId: string;
  period: { start: Date; end: Date };
  campaigns: CampaignPerformance[];
  promotions: PromotionPerformance[];
  emailMetrics: EmailMetrics;
  socialMetrics: SocialMetrics;
  attributionData: AttributionData[];
}

// Campaign Performance
export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  channel: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  conversionRate: number;
  cpc: number;
  cpa: number;
  roas: number;
  roi: number;
}

// Promotion Performance
export interface PromotionPerformance {
  promotionId: string;
  promotionName: string;
  type: 'discount' | 'coupon' | 'bundle' | 'free_shipping' | 'bogo';
  usageCount: number;
  totalDiscount: number;
  revenueGenerated: number;
  averageOrderValue: number;
  newCustomers: number;
  effectiveness: number;
}

// Email Metrics
export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenue: number;
}

// Social Metrics
export interface SocialMetrics {
  platforms: {
    platform: string;
    followers: number;
    engagement: number;
    reach: number;
    clicks: number;
    conversions: number;
  }[];
  totalReach: number;
  totalEngagement: number;
  socialRevenue: number;
}

// Attribution Data
export interface AttributionData {
  channel: string;
  firstTouch: { conversions: number; revenue: number };
  lastTouch: { conversions: number; revenue: number };
  linear: { conversions: number; revenue: number };
  timeDecay: { conversions: number; revenue: number };
}

// Real-time Metrics
export interface RealtimeMetrics {
  tenantId: string;
  timestamp: Date;
  activeVisitors: number;
  ordersLastHour: number;
  revenueLastHour: number;
  cartAbandonsLastHour: number;
  topProductsNow: { productId: string; productName: string; views: number }[];
  activePromotions: { promotionId: string; name: string; usageCount: number }[];
  recentOrders: { orderId: string; amount: number; timestamp: Date }[];
  alerts: { type: string; message: string; severity: 'info' | 'warning' | 'critical' }[];
}

// Dashboard Widget
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'funnel' | 'gauge';
  title: string;
  data: any;
  config: {
    refreshInterval?: number;
    comparison?: boolean;
    drilldown?: boolean;
  };
}

// Report Configuration
export interface ReportConfig {
  id: string;
  tenantId: string;
  name: string;
  type: 'sales' | 'products' | 'customers' | 'inventory' | 'marketing' | 'custom';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
  };
  filters: Record<string, any>;
  columns: string[];
  createdAt: Date;
}

// Order for analytics
interface AnalyticsOrder {
  id: string;
  tenantId: string;
  customerId: string;
  channel: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
  items: { productId: string; sku: string; category: string; quantity: number; price: number }[];
  refundAmount: number;
  createdAt: Date;
}

// Customer for analytics
interface AnalyticsCustomer {
  id: string;
  tenantId: string;
  email: string;
  segment: CustomerSegment;
  firstOrderDate: Date;
  lastOrderDate: Date;
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  country: string;
  city?: string;
  acquisitionChannel: string;
  rfmScore: { recency: number; frequency: number; monetary: number };
  createdAt: Date;
}

// Product for analytics
interface AnalyticsProduct {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stockLevel: number;
  views: number;
  cartAdds: number;
  purchases: number;
  refunds: number;
  createdAt: Date;
}

@Injectable()
export class EcommerceAnalyticsService {
  private readonly logger = new Logger(EcommerceAnalyticsService.name);

  // In-memory stores (in production, these would come from database/data warehouse)
  private orders: Map<string, AnalyticsOrder> = new Map();
  private customers: Map<string, AnalyticsCustomer> = new Map();
  private products: Map<string, AnalyticsProduct> = new Map();
  private reports: Map<string, ReportConfig> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Initialize with sample data for demonstration
    const tenantId = 'demo_tenant';
    const now = new Date();

    // Sample products
    const sampleProducts: AnalyticsProduct[] = [
      { id: 'prod_1', tenantId, name: 'Laptop Pro 15', sku: 'LP15-001', category: 'Electronics', price: 4999, cost: 3500, stockLevel: 45, views: 12500, cartAdds: 890, purchases: 234, refunds: 12, createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000) },
      { id: 'prod_2', tenantId, name: 'Wireless Mouse', sku: 'WM-001', category: 'Accessories', price: 149, cost: 45, stockLevel: 520, views: 8900, cartAdds: 1200, purchases: 678, refunds: 23, createdAt: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000) },
      { id: 'prod_3', tenantId, name: 'USB-C Hub', sku: 'UCH-001', category: 'Accessories', price: 249, cost: 85, stockLevel: 180, views: 6700, cartAdds: 890, purchases: 445, refunds: 18, createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000) },
      { id: 'prod_4', tenantId, name: 'Monitor 27"', sku: 'MON27-001', category: 'Electronics', price: 1899, cost: 1200, stockLevel: 28, views: 5600, cartAdds: 420, purchases: 156, refunds: 8, createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
      { id: 'prod_5', tenantId, name: 'Mechanical Keyboard', sku: 'MK-001', category: 'Accessories', price: 449, cost: 180, stockLevel: 95, views: 7800, cartAdds: 650, purchases: 312, refunds: 15, createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
    ];

    sampleProducts.forEach(p => this.products.set(p.id, p));

    // Sample customers
    const segments: CustomerSegment[] = ['new', 'returning', 'vip', 'loyal', 'at_risk'];
    const channels = ['organic', 'paid_search', 'social', 'email', 'referral'];
    const countries = ['RO', 'DE', 'FR', 'IT', 'ES'];

    for (let i = 1; i <= 50; i++) {
      const customer: AnalyticsCustomer = {
        id: `cust_${i}`,
        tenantId,
        email: `customer${i}@example.com`,
        segment: segments[Math.floor(Math.random() * segments.length)],
        firstOrderDate: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastOrderDate: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        orderCount: Math.floor(Math.random() * 20) + 1,
        totalSpent: Math.floor(Math.random() * 10000) + 100,
        averageOrderValue: 0,
        country: countries[Math.floor(Math.random() * countries.length)],
        acquisitionChannel: channels[Math.floor(Math.random() * channels.length)],
        rfmScore: {
          recency: Math.floor(Math.random() * 5) + 1,
          frequency: Math.floor(Math.random() * 5) + 1,
          monetary: Math.floor(Math.random() * 5) + 1,
        },
        createdAt: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      };
      customer.averageOrderValue = customer.totalSpent / customer.orderCount;
      this.customers.set(customer.id, customer);
    }

    // Sample orders
    const orderChannels = ['website', 'mobile_app', 'marketplace', 'social'];
    const statuses = ['completed', 'completed', 'completed', 'refunded', 'cancelled'];

    for (let i = 1; i <= 200; i++) {
      const customerId = `cust_${Math.floor(Math.random() * 50) + 1}`;
      const productIndices = [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)];
      const items = productIndices.map(idx => {
        const prod = sampleProducts[idx];
        return {
          productId: prod.id,
          sku: prod.sku,
          category: prod.category,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: prod.price,
        };
      });

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discount = Math.random() > 0.7 ? subtotal * 0.1 : 0;
      const shipping = subtotal > 500 ? 0 : 25;
      const tax = (subtotal - discount) * 0.19;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const order: AnalyticsOrder = {
        id: `order_${i}`,
        tenantId,
        customerId,
        channel: orderChannels[Math.floor(Math.random() * orderChannels.length)],
        status,
        subtotal,
        discount,
        shipping,
        tax,
        total: subtotal - discount + shipping + tax,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        items,
        refundAmount: status === 'refunded' ? subtotal : 0,
        createdAt: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      };

      this.orders.set(order.id, order);
    }

    this.logger.log(`Initialized sample data: ${this.products.size} products, ${this.customers.size} customers, ${this.orders.size} orders`);
  }

  // ==================== Sales Analytics ====================

  getSalesOverview(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity = 'day',
    comparisonPeriod?: ComparisonPeriod,
  ): SalesOverview {
    const orders = this.getOrdersInPeriod(tenantId, startDate, endDate);
    const metrics = this.calculateSalesMetrics(orders);

    // Time series
    const timeSeries = this.generateTimeSeries(orders, startDate, endDate, granularity);

    // Top products
    const topProducts = this.getTopProducts(tenantId, startDate, endDate, 10);

    // Top categories
    const topCategories = this.getTopCategories(tenantId, startDate, endDate, 5);

    // Sales by channel
    const salesByChannel = this.getSalesByChannel(orders);

    let comparison;
    if (comparisonPeriod) {
      const compPeriod = this.getComparisonPeriod(startDate, endDate, comparisonPeriod);
      const compOrders = this.getOrdersInPeriod(tenantId, compPeriod.start, compPeriod.end);
      const compMetrics = this.calculateSalesMetrics(compOrders);

      comparison = {
        period: compPeriod,
        metrics: compMetrics,
        changes: {
          revenue: this.calculateChange(metrics.revenue, compMetrics.revenue),
          orders: this.calculateChange(metrics.orders, compMetrics.orders),
          averageOrderValue: this.calculateChange(metrics.averageOrderValue, compMetrics.averageOrderValue),
          itemsSold: this.calculateChange(metrics.itemsSold, compMetrics.itemsSold),
        },
      };
    }

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      metrics,
      comparison,
      timeSeries,
      topProducts,
      topCategories,
      salesByChannel,
    };
  }

  private getOrdersInPeriod(tenantId: string, startDate: Date, endDate: Date): AnalyticsOrder[] {
    return Array.from(this.orders.values())
      .filter(o => o.tenantId === tenantId && o.createdAt >= startDate && o.createdAt <= endDate);
  }

  private calculateSalesMetrics(orders: AnalyticsOrder[]): SalesMetrics {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const refundedOrders = orders.filter(o => o.status === 'refunded');

    const revenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const refunds = refundedOrders.reduce((sum, o) => sum + o.refundAmount, 0);
    const itemsSold = completedOrders.reduce((sum, o) => sum + o.itemCount, 0);

    // Calculate gross profit (simplified)
    const totalCost = completedOrders.reduce((sum, o) => {
      return sum + o.items.reduce((isum, item) => {
        const product = this.products.get(item.productId);
        return isum + (product?.cost || item.price * 0.6) * item.quantity;
      }, 0);
    }, 0);

    const grossProfit = revenue - totalCost;

    return {
      revenue: Math.round(revenue * 100) / 100,
      orders: completedOrders.length,
      averageOrderValue: completedOrders.length > 0 ? Math.round((revenue / completedOrders.length) * 100) / 100 : 0,
      itemsSold,
      refunds: Math.round(refunds * 100) / 100,
      refundRate: orders.length > 0 ? Math.round((refundedOrders.length / orders.length) * 10000) / 100 : 0,
      netRevenue: Math.round((revenue - refunds) * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
    };
  }

  private generateTimeSeries(
    orders: AnalyticsOrder[],
    startDate: Date,
    endDate: Date,
    granularity: TimeGranularity,
  ): { revenue: TimeSeriesDataPoint[]; orders: TimeSeriesDataPoint[] } {
    const revenuePoints: TimeSeriesDataPoint[] = [];
    const orderPoints: TimeSeriesDataPoint[] = [];

    const interval = this.getIntervalMs(granularity);
    let current = new Date(startDate);

    while (current <= endDate) {
      const periodEnd = new Date(current.getTime() + interval);
      const periodOrders = orders.filter(o =>
        o.createdAt >= current && o.createdAt < periodEnd && o.status === 'completed'
      );

      const revenue = periodOrders.reduce((sum, o) => sum + o.total, 0);

      revenuePoints.push({
        timestamp: new Date(current),
        value: Math.round(revenue * 100) / 100,
      });

      orderPoints.push({
        timestamp: new Date(current),
        value: periodOrders.length,
      });

      current = periodEnd;
    }

    return { revenue: revenuePoints, orders: orderPoints };
  }

  private getIntervalMs(granularity: TimeGranularity): number {
    const intervals: Record<TimeGranularity, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    return intervals[granularity];
  }

  private getComparisonPeriod(
    startDate: Date,
    endDate: Date,
    comparisonPeriod: ComparisonPeriod,
  ): { start: Date; end: Date } {
    const duration = endDate.getTime() - startDate.getTime();

    if (comparisonPeriod === 'previous_period') {
      return {
        start: new Date(startDate.getTime() - duration),
        end: new Date(startDate.getTime() - 1),
      };
    } else if (comparisonPeriod === 'previous_year') {
      return {
        start: new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate()),
        end: new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate()),
      };
    }

    return { start: startDate, end: endDate };
  }

  private calculateChange(current: number, previous: number): { value: number; percent: number } {
    const value = current - previous;
    const percent = previous !== 0 ? Math.round((value / previous) * 10000) / 100 : 0;
    return { value: Math.round(value * 100) / 100, percent };
  }

  // ==================== Product Analytics ====================

  getTopProducts(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): ProductPerformance[] {
    const orders = this.getOrdersInPeriod(tenantId, startDate, endDate)
      .filter(o => o.status === 'completed');

    // Aggregate product sales
    const productSales = new Map<string, { units: number; revenue: number; refunds: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = productSales.get(item.productId) || { units: 0, revenue: 0, refunds: 0 };
        existing.units += item.quantity;
        existing.revenue += item.price * item.quantity;
        productSales.set(item.productId, existing);
      }
    }

    // Build product performance
    const performances: ProductPerformance[] = [];

    for (const [productId, sales] of productSales) {
      const product = this.products.get(productId);
      if (!product) continue;

      const avgPrice = sales.units > 0 ? sales.revenue / sales.units : 0;
      const conversionRate = product.views > 0 ? (product.purchases / product.views) * 100 : 0;
      const viewToCartRate = product.views > 0 ? (product.cartAdds / product.views) * 100 : 0;
      const cartToOrderRate = product.cartAdds > 0 ? (product.purchases / product.cartAdds) * 100 : 0;

      // Determine status based on sales velocity
      let status: ProductStatus = 'stable';
      const dailySales = sales.units / ((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

      if (dailySales > 5) status = 'best_seller';
      else if (dailySales > 2) status = 'rising';
      else if (dailySales > 0.5) status = 'stable';
      else if (dailySales > 0.1) status = 'declining';
      else if (dailySales > 0) status = 'slow_moving';
      else status = 'dead_stock';

      const daysOfStock = dailySales > 0 ? Math.round(product.stockLevel / dailySales) : 999;

      performances.push({
        productId,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        unitsSold: sales.units,
        revenue: Math.round(sales.revenue * 100) / 100,
        averagePrice: Math.round(avgPrice * 100) / 100,
        refundRate: product.purchases > 0 ? Math.round((product.refunds / product.purchases) * 10000) / 100 : 0,
        stockLevel: product.stockLevel,
        daysOfStock,
        status,
        trend: dailySales > 1 ? 'up' : dailySales > 0.3 ? 'stable' : 'down',
        trendPercent: Math.round((dailySales - 1) * 100),
        conversionRate: Math.round(conversionRate * 100) / 100,
        viewToCartRate: Math.round(viewToCartRate * 100) / 100,
        cartToOrderRate: Math.round(cartToOrderRate * 100) / 100,
      });
    }

    return performances
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  getProductPerformance(tenantId: string, productId: string, startDate: Date, endDate: Date): ProductPerformance | undefined {
    const products = this.getTopProducts(tenantId, startDate, endDate, 1000);
    return products.find(p => p.productId === productId);
  }

  getTopCategories(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): CategoryPerformance[] {
    const orders = this.getOrdersInPeriod(tenantId, startDate, endDate)
      .filter(o => o.status === 'completed');

    const categorySales = new Map<string, { units: number; revenue: number; orders: Set<string> }>();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = categorySales.get(item.category) || { units: 0, revenue: 0, orders: new Set() };
        existing.units += item.quantity;
        existing.revenue += item.price * item.quantity;
        existing.orders.add(order.id);
        categorySales.set(item.category, existing);
      }
    }

    const totalRevenue = Array.from(categorySales.values()).reduce((sum, c) => sum + c.revenue, 0);

    const performances: CategoryPerformance[] = [];

    for (const [category, sales] of categorySales) {
      const productCount = Array.from(this.products.values())
        .filter(p => p.tenantId === tenantId && p.category === category).length;

      performances.push({
        categoryId: category.toLowerCase().replace(/\s+/g, '_'),
        categoryName: category,
        productCount,
        unitsSold: sales.units,
        revenue: Math.round(sales.revenue * 100) / 100,
        averageOrderValue: sales.orders.size > 0 ? Math.round((sales.revenue / sales.orders.size) * 100) / 100 : 0,
        percentOfTotal: totalRevenue > 0 ? Math.round((sales.revenue / totalRevenue) * 10000) / 100 : 0,
        trend: 'stable',
        trendPercent: 0,
      });
    }

    return performances
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  private getSalesByChannel(orders: AnalyticsOrder[]): ChannelPerformance[] {
    const channelData = new Map<string, { orders: number; revenue: number; customers: Set<string>; newCustomers: Set<string> }>();

    for (const order of orders.filter(o => o.status === 'completed')) {
      const existing = channelData.get(order.channel) || { orders: 0, revenue: 0, customers: new Set(), newCustomers: new Set() };
      existing.orders++;
      existing.revenue += order.total;
      existing.customers.add(order.customerId);

      const customer = this.customers.get(order.customerId);
      if (customer && customer.orderCount === 1) {
        existing.newCustomers.add(order.customerId);
      }

      channelData.set(order.channel, existing);
    }

    const totalRevenue = Array.from(channelData.values()).reduce((sum, c) => sum + c.revenue, 0);

    return Array.from(channelData.entries()).map(([channel, data]) => ({
      channel,
      orders: data.orders,
      revenue: Math.round(data.revenue * 100) / 100,
      averageOrderValue: data.orders > 0 ? Math.round((data.revenue / data.orders) * 100) / 100 : 0,
      percentOfTotal: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 10000) / 100 : 0,
      conversionRate: 0, // Would need visitor data
      newCustomers: data.newCustomers.size,
      returningCustomers: data.customers.size - data.newCustomers.size,
    }));
  }

  // ==================== Customer Analytics ====================

  getCustomerAnalytics(tenantId: string, startDate: Date, endDate: Date): CustomerAnalytics {
    const customers = Array.from(this.customers.values())
      .filter(c => c.tenantId === tenantId);

    const orders = this.getOrdersInPeriod(tenantId, startDate, endDate);

    // Calculate summary metrics
    const newCustomers = customers.filter(c => c.firstOrderDate >= startDate && c.firstOrderDate <= endDate);
    const returningCustomers = customers.filter(c =>
      c.firstOrderDate < startDate && c.lastOrderDate >= startDate
    );

    const totalLTV = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgLTV = customers.length > 0 ? totalLTV / customers.length : 0;
    const avgOrders = customers.length > 0 ? customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length : 0;

    // Retention rate (simplified)
    const retentionRate = customers.length > 0 ? (returningCustomers.length / customers.length) * 100 : 0;
    const churnRate = 100 - retentionRate;

    // Repeat purchase rate
    const repeatCustomers = customers.filter(c => c.orderCount > 1);
    const repeatPurchaseRate = customers.length > 0 ? (repeatCustomers.length / customers.length) * 100 : 0;

    // Segments
    const segments = this.calculateSegments(customers);

    // Cohort analysis
    const cohortAnalysis = this.calculateCohorts(customers);

    // RFM Distribution
    const rfmDistribution = this.calculateRFMDistribution(customers);

    // Acquisition channels
    const acquisitionChannels = this.calculateAcquisitionChannels(customers);

    // Geographic distribution
    const geographicDistribution = this.calculateGeographicDistribution(customers);

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      summary: {
        totalCustomers: customers.length,
        newCustomers: newCustomers.length,
        returningCustomers: returningCustomers.length,
        averageLifetimeValue: Math.round(avgLTV * 100) / 100,
        averageOrdersPerCustomer: Math.round(avgOrders * 100) / 100,
        customerRetentionRate: Math.round(retentionRate * 100) / 100,
        customerChurnRate: Math.round(churnRate * 100) / 100,
        repeatPurchaseRate: Math.round(repeatPurchaseRate * 100) / 100,
      },
      segments,
      cohortAnalysis,
      rfmDistribution,
      acquisitionChannels,
      geographicDistribution,
    };
  }

  private calculateSegments(customers: AnalyticsCustomer[]): CustomerSegmentData[] {
    const segmentGroups = new Map<CustomerSegment, AnalyticsCustomer[]>();

    for (const customer of customers) {
      const existing = segmentGroups.get(customer.segment) || [];
      existing.push(customer);
      segmentGroups.set(customer.segment, existing);
    }

    return Array.from(segmentGroups.entries()).map(([segment, custs]) => ({
      segment,
      count: custs.length,
      percentOfTotal: customers.length > 0 ? Math.round((custs.length / customers.length) * 10000) / 100 : 0,
      revenue: Math.round(custs.reduce((sum, c) => sum + c.totalSpent, 0) * 100) / 100,
      averageOrderValue: custs.length > 0 ? Math.round((custs.reduce((sum, c) => sum + c.averageOrderValue, 0) / custs.length) * 100) / 100 : 0,
      averageOrders: custs.length > 0 ? Math.round((custs.reduce((sum, c) => sum + c.orderCount, 0) / custs.length) * 100) / 100 : 0,
      averageLifetimeValue: custs.length > 0 ? Math.round((custs.reduce((sum, c) => sum + c.totalSpent, 0) / custs.length) * 100) / 100 : 0,
    }));
  }

  private calculateCohorts(customers: AnalyticsCustomer[]): CohortData[] {
    const cohorts = new Map<string, AnalyticsCustomer[]>();

    for (const customer of customers) {
      const cohortKey = `${customer.firstOrderDate.getFullYear()}-${String(customer.firstOrderDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = cohorts.get(cohortKey) || [];
      existing.push(customer);
      cohorts.set(cohortKey, existing);
    }

    return Array.from(cohorts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, custs]) => ({
        cohortMonth: month,
        customersAcquired: custs.length,
        retentionByMonth: [
          { month: 1, retained: Math.floor(custs.length * 0.6), retentionRate: 60 },
          { month: 2, retained: Math.floor(custs.length * 0.45), retentionRate: 45 },
          { month: 3, retained: Math.floor(custs.length * 0.35), retentionRate: 35 },
        ],
        totalRevenue: Math.round(custs.reduce((sum, c) => sum + c.totalSpent, 0) * 100) / 100,
        averageLifetimeValue: custs.length > 0 ? Math.round((custs.reduce((sum, c) => sum + c.totalSpent, 0) / custs.length) * 100) / 100 : 0,
      }));
  }

  private calculateRFMDistribution(customers: AnalyticsCustomer[]): RFMDistribution {
    const recencyDist = new Map<number, number>();
    const frequencyDist = new Map<number, number>();
    const monetaryDist = new Map<number, number>();

    for (const customer of customers) {
      recencyDist.set(customer.rfmScore.recency, (recencyDist.get(customer.rfmScore.recency) || 0) + 1);
      frequencyDist.set(customer.rfmScore.frequency, (frequencyDist.get(customer.rfmScore.frequency) || 0) + 1);
      monetaryDist.set(customer.rfmScore.monetary, (monetaryDist.get(customer.rfmScore.monetary) || 0) + 1);
    }

    const toDistArray = (dist: Map<number, number>) =>
      Array.from(dist.entries())
        .sort(([a], [b]) => a - b)
        .map(([score, count]) => ({
          score,
          count,
          percent: customers.length > 0 ? Math.round((count / customers.length) * 10000) / 100 : 0,
        }));

    return {
      recency: toDistArray(recencyDist),
      frequency: toDistArray(frequencyDist),
      monetary: toDistArray(monetaryDist),
      segments: [
        { name: 'Champions', count: Math.floor(customers.length * 0.15), percent: 15, description: 'High value, recent, frequent buyers' },
        { name: 'Loyal Customers', count: Math.floor(customers.length * 0.20), percent: 20, description: 'Regular buyers with good LTV' },
        { name: 'Potential Loyalists', count: Math.floor(customers.length * 0.18), percent: 18, description: 'Recent buyers with growth potential' },
        { name: 'At Risk', count: Math.floor(customers.length * 0.12), percent: 12, description: 'Haven\'t purchased recently' },
        { name: 'Hibernating', count: Math.floor(customers.length * 0.25), percent: 25, description: 'Long time since last purchase' },
        { name: 'New Customers', count: Math.floor(customers.length * 0.10), percent: 10, description: 'First-time buyers' },
      ],
    };
  }

  private calculateAcquisitionChannels(customers: AnalyticsCustomer[]): AcquisitionChannel[] {
    const channelData = new Map<string, { customers: number; ltv: number }>();

    for (const customer of customers) {
      const existing = channelData.get(customer.acquisitionChannel) || { customers: 0, ltv: 0 };
      existing.customers++;
      existing.ltv += customer.totalSpent;
      channelData.set(customer.acquisitionChannel, existing);
    }

    return Array.from(channelData.entries()).map(([channel, data]) => ({
      channel,
      customers: data.customers,
      percentOfTotal: customers.length > 0 ? Math.round((data.customers / customers.length) * 10000) / 100 : 0,
      costPerAcquisition: Math.round(Math.random() * 30 + 10), // Simulated
      lifetimeValue: data.customers > 0 ? Math.round((data.ltv / data.customers) * 100) / 100 : 0,
      roi: Math.round(Math.random() * 300 + 100), // Simulated ROI %
    }));
  }

  private calculateGeographicDistribution(customers: AnalyticsCustomer[]): GeographicData[] {
    const geoData = new Map<string, { customers: number; orders: number; revenue: number }>();

    for (const customer of customers) {
      const existing = geoData.get(customer.country) || { customers: 0, orders: 0, revenue: 0 };
      existing.customers++;
      existing.orders += customer.orderCount;
      existing.revenue += customer.totalSpent;
      geoData.set(customer.country, existing);
    }

    return Array.from(geoData.entries()).map(([country, data]) => ({
      country,
      customers: data.customers,
      orders: data.orders,
      revenue: Math.round(data.revenue * 100) / 100,
      averageOrderValue: data.orders > 0 ? Math.round((data.revenue / data.orders) * 100) / 100 : 0,
    }));
  }

  // ==================== Inventory Analytics ====================

  getInventoryAnalytics(tenantId: string): InventoryAnalytics {
    const products = Array.from(this.products.values())
      .filter(p => p.tenantId === tenantId);

    const totalValue = products.reduce((sum, p) => sum + p.stockLevel * p.cost, 0);

    // Stock levels
    const stockLevels: StockLevelData[] = products.map(p => {
      const dailySales = p.purchases / 90; // Assuming 90-day period
      const daysOfSupply = dailySales > 0 ? Math.round(p.stockLevel / dailySales) : 999;

      let status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' = 'in_stock';
      if (p.stockLevel === 0) status = 'out_of_stock';
      else if (daysOfSupply < 7) status = 'low_stock';
      else if (daysOfSupply > 90) status = 'overstock';

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: p.stockLevel,
        reservedStock: Math.floor(p.stockLevel * 0.1),
        availableStock: Math.floor(p.stockLevel * 0.9),
        reorderPoint: Math.max(10, Math.ceil(dailySales * 14)), // 2 weeks supply
        reorderQuantity: Math.max(20, Math.ceil(dailySales * 30)), // 1 month supply
        status,
        daysOfSupply,
      };
    });

    // Turnover analysis
    const turnoverAnalysis: TurnoverData[] = products.map(p => {
      const turnoverRate = p.stockLevel > 0 ? (p.purchases * 4) / p.stockLevel : 0; // Annualized
      const daysToSell = turnoverRate > 0 ? Math.round(365 / turnoverRate) : 999;

      let velocityCategory: 'fast' | 'medium' | 'slow' | 'dead' = 'medium';
      if (turnoverRate > 12) velocityCategory = 'fast';
      else if (turnoverRate > 4) velocityCategory = 'medium';
      else if (turnoverRate > 1) velocityCategory = 'slow';
      else velocityCategory = 'dead';

      let recommendedAction = 'Maintain current inventory levels';
      if (velocityCategory === 'fast') recommendedAction = 'Increase stock levels';
      else if (velocityCategory === 'slow') recommendedAction = 'Consider promotions to increase sales';
      else if (velocityCategory === 'dead') recommendedAction = 'Liquidate or discontinue';

      return {
        productId: p.id,
        productName: p.name,
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        daysToSell,
        velocityCategory,
        recommendedAction,
      };
    });

    // Reorder alerts
    const reorderAlerts: ReorderAlert[] = stockLevels
      .filter(s => s.status === 'low_stock' || s.status === 'out_of_stock')
      .map(s => ({
        productId: s.productId,
        productName: s.productName,
        sku: s.sku,
        currentStock: s.currentStock,
        reorderPoint: s.reorderPoint,
        suggestedQuantity: s.reorderQuantity,
        estimatedStockoutDate: s.daysOfSupply < 999 ? new Date(Date.now() + s.daysOfSupply * 24 * 60 * 60 * 1000) : undefined,
        priority: s.status === 'out_of_stock' ? 'critical' : s.daysOfSupply < 3 ? 'high' : 'medium',
      }));

    // Aging analysis
    const agingAnalysis: AgingData[] = [
      { ageRange: '0-30 days', productCount: Math.floor(products.length * 0.4), totalValue: totalValue * 0.35, percentOfInventory: 35 },
      { ageRange: '31-60 days', productCount: Math.floor(products.length * 0.25), totalValue: totalValue * 0.25, percentOfInventory: 25 },
      { ageRange: '61-90 days', productCount: Math.floor(products.length * 0.2), totalValue: totalValue * 0.20, percentOfInventory: 20 },
      { ageRange: '90+ days', productCount: Math.floor(products.length * 0.15), totalValue: totalValue * 0.20, percentOfInventory: 20 },
    ];

    const outOfStock = stockLevels.filter(s => s.status === 'out_of_stock').length;
    const overstock = stockLevels.filter(s => s.status === 'overstock').length;
    const deadStock = turnoverAnalysis.filter(t => t.velocityCategory === 'dead');
    const deadStockValue = deadStock.reduce((sum, d) => {
      const product = products.find(p => p.id === d.productId);
      return sum + (product ? product.stockLevel * product.cost : 0);
    }, 0);

    return {
      tenantId,
      asOfDate: new Date(),
      summary: {
        totalProducts: products.length,
        totalSKUs: products.length,
        totalValue: Math.round(totalValue * 100) / 100,
        averageTurnoverRate: turnoverAnalysis.length > 0 ?
          Math.round((turnoverAnalysis.reduce((sum, t) => sum + t.turnoverRate, 0) / turnoverAnalysis.length) * 100) / 100 : 0,
        stockoutRate: products.length > 0 ? Math.round((outOfStock / products.length) * 10000) / 100 : 0,
        overstockRate: products.length > 0 ? Math.round((overstock / products.length) * 10000) / 100 : 0,
        deadStockValue: Math.round(deadStockValue * 100) / 100,
      },
      stockLevels,
      turnoverAnalysis,
      reorderAlerts,
      agingAnalysis,
    };
  }

  // ==================== Conversion Funnel ====================

  getConversionFunnel(tenantId: string, startDate: Date, endDate: Date): ConversionFunnel {
    // Simulated funnel data
    const totalVisitors = 50000;

    const stages: FunnelStage[] = [
      { name: 'Site Visitors', visitors: totalVisitors, conversionRate: 100, dropoffRate: 0, averageTime: 0 },
      { name: 'Product Views', visitors: Math.floor(totalVisitors * 0.65), conversionRate: 65, dropoffRate: 35, averageTime: 45 },
      { name: 'Add to Cart', visitors: Math.floor(totalVisitors * 0.25), conversionRate: 38.5, dropoffRate: 61.5, averageTime: 120 },
      { name: 'Checkout Started', visitors: Math.floor(totalVisitors * 0.12), conversionRate: 48, dropoffRate: 52, averageTime: 180 },
      { name: 'Payment Entered', visitors: Math.floor(totalVisitors * 0.08), conversionRate: 66.7, dropoffRate: 33.3, averageTime: 90 },
      { name: 'Order Completed', visitors: Math.floor(totalVisitors * 0.035), conversionRate: 43.8, dropoffRate: 56.2, averageTime: 30 },
    ];

    const dropoffAnalysis: DropoffData[] = [
      { stage: 'Product Views', reason: 'No interest in products', count: 8500, percentOfDropoffs: 48.6 },
      { stage: 'Product Views', reason: 'Price too high', count: 5500, percentOfDropoffs: 31.4 },
      { stage: 'Product Views', reason: 'Out of stock', count: 3500, percentOfDropoffs: 20.0 },
      { stage: 'Add to Cart', reason: 'Just browsing', count: 6000, percentOfDropoffs: 30.0 },
      { stage: 'Add to Cart', reason: 'Shipping costs', count: 8000, percentOfDropoffs: 40.0 },
      { stage: 'Add to Cart', reason: 'Found cheaper elsewhere', count: 6000, percentOfDropoffs: 30.0 },
      { stage: 'Checkout Started', reason: 'Required account creation', count: 2000, percentOfDropoffs: 33.3 },
      { stage: 'Checkout Started', reason: 'Complex checkout', count: 2500, percentOfDropoffs: 41.7 },
      { stage: 'Checkout Started', reason: 'Payment issues', count: 1500, percentOfDropoffs: 25.0 },
    ];

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      stages,
      overallConversionRate: 3.5,
      abandonmentRate: 72, // Cart abandonment
      averageTimeToConvert: 465, // seconds
      dropoffAnalysis,
    };
  }

  // ==================== Marketing Analytics ====================

  getMarketingAnalytics(tenantId: string, startDate: Date, endDate: Date): MarketingAnalytics {
    const campaigns: CampaignPerformance[] = [
      {
        campaignId: 'camp_1',
        campaignName: 'Black Friday Sale',
        channel: 'email',
        spend: 500,
        impressions: 25000,
        clicks: 3500,
        conversions: 245,
        revenue: 24500,
        ctr: 14,
        conversionRate: 7,
        cpc: 0.14,
        cpa: 2.04,
        roas: 49,
        roi: 4800,
      },
      {
        campaignId: 'camp_2',
        campaignName: 'Google Ads - Electronics',
        channel: 'paid_search',
        spend: 2500,
        impressions: 150000,
        clicks: 4500,
        conversions: 180,
        revenue: 18000,
        ctr: 3,
        conversionRate: 4,
        cpc: 0.56,
        cpa: 13.89,
        roas: 7.2,
        roi: 620,
      },
      {
        campaignId: 'camp_3',
        campaignName: 'Facebook Retargeting',
        channel: 'social',
        spend: 1200,
        impressions: 80000,
        clicks: 2400,
        conversions: 96,
        revenue: 9600,
        ctr: 3,
        conversionRate: 4,
        cpc: 0.50,
        cpa: 12.50,
        roas: 8,
        roi: 700,
      },
    ];

    const promotions: PromotionPerformance[] = [
      { promotionId: 'promo_1', promotionName: '20% OFF Everything', type: 'discount', usageCount: 450, totalDiscount: 4500, revenueGenerated: 22500, averageOrderValue: 50, newCustomers: 120, effectiveness: 85 },
      { promotionId: 'promo_2', promotionName: 'Free Shipping over 200 RON', type: 'free_shipping', usageCount: 890, totalDiscount: 2670, revenueGenerated: 44500, averageOrderValue: 280, newCustomers: 200, effectiveness: 92 },
      { promotionId: 'promo_3', promotionName: 'Welcome10', type: 'coupon', usageCount: 230, totalDiscount: 1150, revenueGenerated: 11500, averageOrderValue: 50, newCustomers: 230, effectiveness: 78 },
    ];

    const emailMetrics: EmailMetrics = {
      sent: 25000,
      delivered: 24500,
      opened: 6125,
      clicked: 1225,
      converted: 245,
      unsubscribed: 50,
      deliveryRate: 98,
      openRate: 25,
      clickRate: 20,
      conversionRate: 20,
      revenue: 24500,
    };

    const socialMetrics: SocialMetrics = {
      platforms: [
        { platform: 'Facebook', followers: 15000, engagement: 4.5, reach: 45000, clicks: 1200, conversions: 60 },
        { platform: 'Instagram', followers: 12000, engagement: 6.2, reach: 38000, clicks: 900, conversions: 45 },
        { platform: 'LinkedIn', followers: 5000, engagement: 2.1, reach: 12000, clicks: 300, conversions: 15 },
      ],
      totalReach: 95000,
      totalEngagement: 4.27,
      socialRevenue: 12000,
    };

    const attributionData: AttributionData[] = [
      { channel: 'Organic Search', firstTouch: { conversions: 150, revenue: 15000 }, lastTouch: { conversions: 120, revenue: 12000 }, linear: { conversions: 135, revenue: 13500 }, timeDecay: { conversions: 140, revenue: 14000 } },
      { channel: 'Paid Search', firstTouch: { conversions: 100, revenue: 10000 }, lastTouch: { conversions: 130, revenue: 13000 }, linear: { conversions: 115, revenue: 11500 }, timeDecay: { conversions: 125, revenue: 12500 } },
      { channel: 'Social', firstTouch: { conversions: 80, revenue: 8000 }, lastTouch: { conversions: 60, revenue: 6000 }, linear: { conversions: 70, revenue: 7000 }, timeDecay: { conversions: 65, revenue: 6500 } },
      { channel: 'Email', firstTouch: { conversions: 50, revenue: 5000 }, lastTouch: { conversions: 90, revenue: 9000 }, linear: { conversions: 70, revenue: 7000 }, timeDecay: { conversions: 80, revenue: 8000 } },
      { channel: 'Direct', firstTouch: { conversions: 70, revenue: 7000 }, lastTouch: { conversions: 100, revenue: 10000 }, linear: { conversions: 85, revenue: 8500 }, timeDecay: { conversions: 90, revenue: 9000 } },
    ];

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      campaigns,
      promotions,
      emailMetrics,
      socialMetrics,
      attributionData,
    };
  }

  // ==================== Real-time Metrics ====================

  getRealtimeMetrics(tenantId: string): RealtimeMetrics {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentOrders = Array.from(this.orders.values())
      .filter(o => o.tenantId === tenantId && o.createdAt >= hourAgo)
      .slice(0, 10)
      .map(o => ({ orderId: o.id, amount: o.total, timestamp: o.createdAt }));

    return {
      tenantId,
      timestamp: now,
      activeVisitors: Math.floor(Math.random() * 200) + 50,
      ordersLastHour: recentOrders.length || Math.floor(Math.random() * 20) + 5,
      revenueLastHour: recentOrders.reduce((sum, o) => sum + o.amount, 0) || Math.floor(Math.random() * 10000) + 1000,
      cartAbandonsLastHour: Math.floor(Math.random() * 30) + 10,
      topProductsNow: [
        { productId: 'prod_1', productName: 'Laptop Pro 15', views: Math.floor(Math.random() * 50) + 20 },
        { productId: 'prod_2', productName: 'Wireless Mouse', views: Math.floor(Math.random() * 40) + 15 },
        { productId: 'prod_3', productName: 'USB-C Hub', views: Math.floor(Math.random() * 30) + 10 },
      ],
      activePromotions: [
        { promotionId: 'promo_1', name: '20% OFF Everything', usageCount: Math.floor(Math.random() * 10) + 2 },
        { promotionId: 'promo_2', name: 'Free Shipping', usageCount: Math.floor(Math.random() * 15) + 5 },
      ],
      recentOrders,
      alerts: [
        { type: 'low_stock', message: 'Monitor 27" stock below threshold', severity: 'warning' },
        { type: 'high_traffic', message: 'Traffic spike detected - 50% above average', severity: 'info' },
      ],
    };
  }

  // ==================== Reports ====================

  createReport(params: {
    tenantId: string;
    name: string;
    type: ReportConfig['type'];
    schedule?: ReportConfig['schedule'];
    filters?: Record<string, any>;
    columns?: string[];
  }): ReportConfig {
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const report: ReportConfig = {
      id,
      tenantId: params.tenantId,
      name: params.name,
      type: params.type,
      schedule: params.schedule,
      filters: params.filters || {},
      columns: params.columns || [],
      createdAt: new Date(),
    };

    this.reports.set(id, report);
    this.logger.log(`Created report ${id}: ${params.name}`);

    return report;
  }

  getReport(reportId: string): ReportConfig | undefined {
    return this.reports.get(reportId);
  }

  getReportsByTenant(tenantId: string): ReportConfig[] {
    return Array.from(this.reports.values())
      .filter(r => r.tenantId === tenantId);
  }

  deleteReport(reportId: string): boolean {
    return this.reports.delete(reportId);
  }

  // ==================== Dashboard Widgets ====================

  getDashboardWidgets(tenantId: string, startDate: Date, endDate: Date): DashboardWidget[] {
    const salesOverview = this.getSalesOverview(tenantId, startDate, endDate, 'day', 'previous_period');

    return [
      {
        id: 'widget_revenue',
        type: 'metric',
        title: 'Total Revenue',
        data: {
          value: salesOverview.metrics.revenue,
          change: salesOverview.comparison?.changes.revenue,
          currency: 'RON',
        },
        config: { comparison: true },
      },
      {
        id: 'widget_orders',
        type: 'metric',
        title: 'Total Orders',
        data: {
          value: salesOverview.metrics.orders,
          change: salesOverview.comparison?.changes.orders,
        },
        config: { comparison: true },
      },
      {
        id: 'widget_aov',
        type: 'metric',
        title: 'Average Order Value',
        data: {
          value: salesOverview.metrics.averageOrderValue,
          change: salesOverview.comparison?.changes.averageOrderValue,
          currency: 'RON',
        },
        config: { comparison: true },
      },
      {
        id: 'widget_revenue_chart',
        type: 'chart',
        title: 'Revenue Trend',
        data: salesOverview.timeSeries.revenue,
        config: { refreshInterval: 300 },
      },
      {
        id: 'widget_top_products',
        type: 'table',
        title: 'Top Products',
        data: salesOverview.topProducts.slice(0, 5),
        config: { drilldown: true },
      },
      {
        id: 'widget_channels',
        type: 'chart',
        title: 'Sales by Channel',
        data: salesOverview.salesByChannel,
        config: {},
      },
    ];
  }

  // ==================== Export ====================

  exportData(
    tenantId: string,
    dataType: 'sales' | 'products' | 'customers' | 'orders',
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv',
  ): { data: any; filename: string } {
    let data: any[];
    let filename: string;

    switch (dataType) {
      case 'sales':
        data = [this.getSalesOverview(tenantId, startDate, endDate)];
        filename = `sales_${tenantId}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
        break;
      case 'products':
        data = this.getTopProducts(tenantId, startDate, endDate, 1000);
        filename = `products_${tenantId}_${startDate.toISOString().split('T')[0]}`;
        break;
      case 'customers':
        data = [this.getCustomerAnalytics(tenantId, startDate, endDate)];
        filename = `customers_${tenantId}_${startDate.toISOString().split('T')[0]}`;
        break;
      case 'orders':
        data = this.getOrdersInPeriod(tenantId, startDate, endDate);
        filename = `orders_${tenantId}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
        break;
      default:
        throw new BadRequestException('Invalid data type');
    }

    return {
      data: format === 'json' ? data : this.convertToCsv(data),
      filename: `${filename}.${format}`,
    };
  }

  private convertToCsv(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(h => {
        const val = item[h];
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
